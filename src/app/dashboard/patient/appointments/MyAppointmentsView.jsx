'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getMyAppointments } from '@/actions/patients'
import { Section, Empty, AppointmentRow, splitAppointments } from '@/components/patients/portal-ui'
import BookAppointmentDialog from './BookAppointmentDialog'

export default function MyAppointmentsView() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBook, setShowBook] = useState(false)

  const load = async () => {
    const appts = await getMyAppointments()
    if (appts.success) setAppointments(appts.appointments)
    else toast.error(appts.error || 'Failed to load appointments')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { upcoming, past } = useMemo(() => splitAppointments(appointments), [appointments])

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
        <Button
          onClick={() => setShowBook(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </Button>
      </div>

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

      <BookAppointmentDialog
        open={showBook}
        onClose={() => setShowBook(false)}
        onBooked={() => { setShowBook(false); load() }}
      />
    </div>
  )
}
