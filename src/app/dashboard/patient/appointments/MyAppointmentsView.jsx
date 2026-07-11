'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, Plus, Hourglass } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getMyAppointments, cancelMyAppointmentRequest } from '@/actions/patients'
import { Section, Empty, AppointmentRow, splitAppointments } from '@/components/patients/portal-ui'

export default function MyAppointmentsView() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const appts = await getMyAppointments()
    if (appts.success) setAppointments(appts.appointments)
    else toast.error(appts.error || 'Failed to load appointments')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Requests the hospital hasn't confirmed yet get their own section. They are
  // not appointments, and listing them under "Upcoming" would imply they are
  // settled.
  const { pending, upcoming, past } = useMemo(() => {
    const pending = appointments.filter((a) => a.status === 'pending_confirmation')
    const rest = appointments.filter((a) => a.status !== 'pending_confirmation')
    return { pending, ...splitAppointments(rest) }
  }, [appointments])

  const handleCancel = async (appointment) => {
    const res = await cancelMyAppointmentRequest(appointment.id)
    if (!res.success) {
      toast.error(res.error || 'Could not cancel that request')
      return
    }
    toast.success(res.message || 'Booking request cancelled')
    await load()
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your appointments…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Across every hospital you are registered at.
          </p>
        </div>
        <Link href="/dashboard/patient/book">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Book Appointment
          </Button>
        </Link>
      </div>

      {pending.length > 0 && (
        <Section title={`Awaiting Confirmation (${pending.length})`} icon={Hourglass}>
          <div className="space-y-2">
            {pending.map((a) => (
              <AppointmentRow key={a.id} a={a} onCancel={handleCancel} />
            ))}
          </div>
        </Section>
      )}

      <Section title={`Upcoming (${upcoming.length})`} icon={CalendarDays}>
        {upcoming.length === 0 ? (
          <Empty>No upcoming appointments.</Empty>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => <AppointmentRow key={a.id} a={a} />)}
          </div>
        )}
      </Section>

      <Section title={`Past (${past.length})`} icon={Clock}>
        {past.length === 0 ? (
          <Empty>No past appointments.</Empty>
        ) : (
          <div className="space-y-2">
            {past.map((a) => <AppointmentRow key={a.id} a={a} />)}
          </div>
        )}
      </Section>

    </div>
  )
}
