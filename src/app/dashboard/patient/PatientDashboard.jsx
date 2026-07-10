'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2, CalendarDays, Phone, Mail, ShieldAlert, KeyRound,
  Clock, BadgeCheck, ArrowRight, CalendarPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { getMyHospitalRecords, getMyAppointments, changeMyPassword } from '@/actions/patients'
import QuickUpdates from '@/components/patients/QuickUpdates'
import EmergencyContacts from '@/components/patients/EmergencyContacts'
import WelcomeGuide from '@/components/patients/WelcomeGuide'
import BookAppointmentDialog from './appointments/BookAppointmentDialog'
import {
  Section, Empty, Stat, Info, AppointmentRow, HospitalCard, splitAppointments,
} from '@/components/patients/portal-ui'

export default function PatientDashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState([])
  const [appointments, setAppointments] = useState([])
  const [mustChange, setMustChange] = useState(false)
  const [showPwDialog, setShowPwDialog] = useState(false)
  const [showBook, setShowBook] = useState(false)

  const load = async () => {
    setLoading(true)
    const [hosp, appts] = await Promise.all([getMyHospitalRecords(), getMyAppointments()])
    if (hosp.success) {
      setProfile(hosp.profile)
      setRecords(hosp.records)
      setMustChange(hosp.mustChangePassword)
    } else {
      toast.error(hosp.error || 'Failed to load your records')
    }
    if (appts.success) setAppointments(appts.appointments)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments])

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your dashboard…</div>
  }

  return (
    <div className="space-y-6">
      {/* Change-password advisory banner */}
      {mustChange && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Please change your password</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Your account uses your phone number as a temporary password. For your security,
              set a new password now.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 shrink-0"
            onClick={() => setShowPwDialog(true)}
          >
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        </div>
      )}

      {/* First-run guide */}
      <WelcomeGuide />

      {/* Book an appointment */}
      <Button
        onClick={() => setShowBook(true)}
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold"
      >
        <CalendarPlus className="h-5 w-5" /> Book Appointment
      </Button>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Building2} label="Hospitals" value={records.length} color="text-indigo-600 bg-indigo-50" />
        <Stat icon={CalendarDays} label="Upcoming" value={upcoming.length} color="text-blue-600 bg-blue-50" />
        <Stat icon={Clock} label="Past Visits" value={past.length} color="text-violet-600 bg-violet-50" />
      </div>

      {/* Upcoming appointments + emergency contacts, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Upcoming Appointments"
          icon={CalendarDays}
          action={<SeeAll href="/dashboard/patient/appointments" />}
        >
          {upcoming.length === 0 ? (
            <Empty>No upcoming appointments.</Empty>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 4).map((a) => <AppointmentRow key={a.id} a={a} />)}
            </div>
          )}
        </Section>

        <EmergencyContacts hospitals={records} />
      </div>

      {/* Health advisories and announcements */}
      <QuickUpdates limit={5} />

      {/* My hospitals */}
      <Section title="My Hospitals" icon={Building2} action={<SeeAll href="/dashboard/patient/hospitals" />}>
        {records.length === 0 ? (
          <Empty>You are not registered at any hospital yet. Book an appointment to get started.</Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {records.slice(0, 4).map((r) => <HospitalCard key={r.id} record={r} />)}
          </div>
        )}
      </Section>

      <Section title="Recent Visits" icon={Clock} action={<SeeAll href="/dashboard/patient/history" />}>
        {past.length === 0 ? (
          <Empty>No past appointments.</Empty>
        ) : (
          <div className="space-y-2">
            {past.slice(0, 3).map((a) => <AppointmentRow key={a.id} a={a} />)}
          </div>
        )}
      </Section>

      {/* Profile & security */}
      <Section title="Profile & Security" icon={BadgeCheck}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Info icon={Phone} label="Phone" value={profile?.mobile} />
            <Info icon={Mail} label="Email" value={profile?.email} />
            <Info icon={BadgeCheck} label="Patient ID" value={profile?.registration_no} mono />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPwDialog(true)}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        </div>
      </Section>

      <BookAppointmentDialog
        open={showBook}
        onClose={() => setShowBook(false)}
        onBooked={() => { setShowBook(false); load() }}
      />

      <ChangePasswordDialog
        open={showPwDialog}
        onClose={() => setShowPwDialog(false)}
        onChanged={() => { setMustChange(false); setShowPwDialog(false) }}
      />
    </div>
  )
}

function SeeAll({ href }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
    >
      See all <ArrowRight className="h-3 w-3" />
    </Link>
  )
}

function ChangePasswordDialog({ open, onClose, onChanged }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    if (pw !== confirm) { toast.error('Passwords do not match.'); return }
    setSaving(true)
    const res = await changeMyPassword(pw)
    setSaving(false)
    if (res.success) {
      toast.success(res.message || 'Password updated')
      setPw(''); setConfirm('')
      onChanged()
    } else {
      toast.error(res.error || 'Failed to update password')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">New Password</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Confirm Password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update Password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
