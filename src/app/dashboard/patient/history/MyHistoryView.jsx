'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Pill, Building2, Stethoscope, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { getMyAppointments, getMyPrescriptionHistory } from '@/actions/patients'
import {
  Section, Empty, AppointmentRow, splitAppointments, fmtDate,
} from '@/components/patients/portal-ui'

export default function MyHistoryView() {
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyAppointments(), getMyPrescriptionHistory()]).then(([appts, rx]) => {
      if (cancelled) return
      if (appts.success) setAppointments(appts.appointments)
      else toast.error(appts.error || 'Failed to load your history')
      // Prescriptions fail softly -- an empty list is better than a dead page.
      if (rx.success) setPrescriptions(rx.prescriptions)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const { past } = useMemo(() => splitAppointments(appointments), [appointments])

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your history…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your past visits and the prescriptions your doctors have issued.
        </p>
      </div>

      <Section title={`Prescriptions (${prescriptions.length})`} icon={Pill}>
        {prescriptions.length === 0 ? (
          <Empty>No prescriptions have been issued to you yet.</Empty>
        ) : (
          <div className="space-y-2">
            {prescriptions.map((p) => <PrescriptionRow key={p.id} p={p} />)}
          </div>
        )}
      </Section>

      <Section title={`Past Visits (${past.length})`} icon={Clock}>
        {past.length === 0 ? (
          <Empty>No past visits yet.</Empty>
        ) : (
          <div className="space-y-2">
            {past.map((a) => <AppointmentRow key={a.id} a={a} />)}
          </div>
        )}
      </Section>
    </div>
  )
}

function PrescriptionRow({ p }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Pill className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">
            {fmtDate(p.issued_at || p.created_at)}
          </p>
          {p.status === 'amended' && (
            <Badge className="text-[10px] uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Amended
            </Badge>
          )}
        </div>

        {p.clinical_summary && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.clinical_summary}</p>
        )}

        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {p.hospital?.name || p.hospital_id}
          </span>
          {p.doctor?.name && (
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />Dr. {p.doctor.name}
            </span>
          )}
          {p.follow_up_date && (
            <span className="flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />Follow-up {fmtDate(p.follow_up_date)}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
