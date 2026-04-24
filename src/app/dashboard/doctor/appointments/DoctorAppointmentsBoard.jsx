'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseISO, isToday, isAfter, startOfDay, format } from 'date-fns'
import { toast } from 'sonner'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CalendarDays, ClipboardList, RefreshCw, Trash2, UserRound } from 'lucide-react'
import { rescheduleAppointment, deleteAppointment } from '@/actions/appointments'
import { cn } from '@/lib/utils'

const STATUS_META = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
  rescheduled: { label: 'Rescheduled', className: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
  checked_in: { label: 'Checked In', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
  prescribed: { label: 'Prescribed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
}

const SUMMARY_CARDS = [
  {
    id: 'total',
    label: 'Total Appointments',
    icon: CalendarDays,
    accent: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 'today',
    label: 'Today',
    icon: ClipboardList,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'upcoming',
    label: 'Upcoming',
    icon: RefreshCw,
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'prescribed',
    label: 'Prescribed',
    icon: UserRound,
    accent: 'bg-purple-50 text-purple-700',
  },
]

function getPatientProfile(appointment) {
  const patientRecord = appointment?.patients
  const profile = patientRecord?.profile || patientRecord?.profiles || null
  return {
    id: patientRecord?.id,
    registrationNo: patientRecord?.registration_no || profile?.registration_no,
    name: profile?.name || 'Unknown patient',
    email: profile?.email,
    mobile: profile?.mobile,
  }
}

function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: status ? status.replace('_', ' ') : 'Unknown',
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
  }
}

function formatAppointmentDate(dateInput) {
  if (!dateInput) return '—'
  try {
    const date = parseISO(dateInput)
    if (Number.isNaN(date)) return '—'
    return format(date, 'EEE, dd MMM yyyy')
  } catch (_err) {
    return dateInput
  }
}

function categorizeAppointments(appointments) {
  const todayStart = startOfDay(new Date())
  const today = []
  const upcoming = []
  const prescribed = []

  appointments.forEach((appointment) => {
    const status = appointment.status || 'scheduled'

    if (status === 'prescribed' || status === 'completed') {
      prescribed.push(appointment)
    }

    if (!appointment.appointment_date) {
      return
    }

    let appointmentDate
    try {
      appointmentDate = parseISO(appointment.appointment_date)
    } catch (_error) {
      appointmentDate = null
    }

    if (!appointmentDate || Number.isNaN(appointmentDate)) return

    if (isToday(appointmentDate)) {
      today.push(appointment)
    } else if (isAfter(appointmentDate, todayStart) && status !== 'prescribed') {
      upcoming.push(appointment)
    }
  })

  return { today, upcoming, prescribed }
}

function AppointmentRow({ appointment, onReschedule, onDelete, onViewProfile }) {
  const patient = getPatientProfile(appointment)
  const statusMeta = getStatusMeta(appointment.status)

  return (
    <div className="grid grid-cols-12 items-center gap-4 border-b border-gray-100 py-4 last:border-b-0">
      <div className="col-span-4">
        <p className="font-semibold text-gray-900">{patient.name}</p>
        <p className="text-sm text-gray-500">{patient.registrationNo || '—'}</p>
      </div>
      <div className="col-span-3">
        <p className="text-sm font-medium text-gray-900">{formatAppointmentDate(appointment.appointment_date)}</p>
        <p className="text-sm text-gray-500">{appointment.appointment_slot || '—'}</p>
      </div>
      <div className="col-span-2">
        <Badge className={cn('capitalize', statusMeta.className)}>{statusMeta.label}</Badge>
      </div>
      <div className="col-span-3 flex items-center gap-2 justify-end">
        <Button
          asChild
          variant="outline"
          className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
        >
          <Link href={`/dashboard/doctor/appointments/new?appointmentId=${appointment.id}`}>
            Prescribe
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="border border-gray-200">
              Manage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewProfile(patient)}>
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReschedule(appointment)}>
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600" onClick={() => onDelete(appointment)}>
              Delete appointment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function DoctorAppointmentsBoard({ appointments = [] }) {
  const router = useRouter()
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlot, setRescheduleSlot] = useState('')
  const [profileDialog, setProfileDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isRescheduling, startReschedule] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  useEffect(() => {
    if (rescheduleTarget) {
      setRescheduleDate(rescheduleTarget.appointment_date || '')
      setRescheduleSlot(rescheduleTarget.appointment_slot || '')
    }
  }, [rescheduleTarget])

  const categorized = useMemo(() => categorizeAppointments(appointments), [appointments])
  const summary = useMemo(() => ({
    total: appointments.length,
    today: categorized.today.length,
    upcoming: categorized.upcoming.length,
    prescribed: categorized.prescribed.length,
  }), [appointments.length, categorized])

  const handleReschedule = () => {
    if (!rescheduleTarget) return
    if (!rescheduleDate || !rescheduleSlot) {
      toast.error('Select the new date and time slot')
      return
    }

    startReschedule(async () => {
      try {
        await rescheduleAppointment({
          appointmentId: rescheduleTarget.id,
          newDate: rescheduleDate,
          newSlot: rescheduleSlot,
        })
        toast.success('Appointment rescheduled')
        setRescheduleTarget(null)
        router.refresh()
      } catch (error) {
        toast.error(error.message || 'Failed to reschedule appointment')
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    startDelete(async () => {
      try {
        await deleteAppointment(deleteTarget.id)
        toast.success('Appointment deleted')
        setDeleteTarget(null)
        router.refresh()
      } catch (error) {
        toast.error(error.message || 'Failed to delete appointment')
      }
    })
  }

  const renderAppointments = (items) => {
    if (!items?.length) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          No appointments to display in this tab.
        </div>
      )
    }

    return (
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span className="col-span-4">Patient</span>
          <span className="col-span-3">Date & Time</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-3 text-right">Actions</span>
        </div>
        {items.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            onReschedule={setRescheduleTarget}
            onDelete={setDeleteTarget}
            onViewProfile={setProfileDialog}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((card) => {
          const value = summary[card.id] ?? 0
          const Icon = card.icon
          return (
            <Card key={card.id} className="border border-gray-100 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <span className={cn('rounded-full p-3', card.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">Patient Appointment List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Today ({summary.today})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({summary.upcoming})</TabsTrigger>
              <TabsTrigger value="prescribed">Prescribed ({summary.prescribed})</TabsTrigger>
              <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-6">
              {renderAppointments(categorized.today)}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-6">
              {renderAppointments(categorized.upcoming)}
            </TabsContent>
            <TabsContent value="prescribed" className="mt-6">
              {renderAppointments(categorized.prescribed)}
            </TabsContent>
            <TabsContent value="all" className="mt-6">
              {renderAppointments(appointments)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
            <DialogDescription>
              Select the new appointment date and preferred time slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Appointment date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-slot">Preferred slot</Label>
              <Input
                id="reschedule-slot"
                placeholder="HH:MM"
                value={rescheduleSlot}
                onChange={(event) => setRescheduleSlot(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={isRescheduling}>
              {isRescheduling ? 'Updating...' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileDialog} onOpenChange={(open) => !open && setProfileDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient profile</DialogTitle>
            <DialogDescription>
              Quick view of the patient details linked to this appointment.
            </DialogDescription>
          </DialogHeader>
          {profileDialog && (
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase text-gray-500">Full name</p>
                <p className="text-base font-semibold text-gray-900">{profileDialog.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">Registration</p>
                  <p>{profileDialog.registrationNo || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Mobile</p>
                  <p>{profileDialog.mobile || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Email</p>
                <p>{profileDialog.email || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(null)}>
              Close
            </Button>
            {profileDialog && (
              <Button asChild>
                <Link href={`/dashboard/doctor/patients?highlight=${profileDialog.id}`}>
                  Open patient record
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The appointment record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
