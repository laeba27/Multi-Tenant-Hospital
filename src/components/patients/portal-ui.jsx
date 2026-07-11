'use client'

import {
  Building2, CalendarDays, MapPin, Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const STATUS_BADGE = {
  pending_confirmation: 'bg-amber-100 text-amber-800 border border-amber-200',
  scheduled: 'bg-blue-100 text-blue-800 border border-blue-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-rose-100 text-rose-800 border border-rose-200',
  'no-show': 'bg-amber-100 text-amber-800 border border-amber-200',
  no_show: 'bg-amber-100 text-amber-800 border border-amber-200',
}

export const STATUS_LABEL = {
  pending_confirmation: 'Awaiting confirmation',
  scheduled: 'Confirmed',
}

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Split appointments into upcoming vs past, using the same rule everywhere. */
export function splitAppointments(appointments) {
  const today = new Date().toISOString().split('T')[0]
  const upcoming = []
  const past = []
  for (const a of appointments) {
    if ((a.appointment_date || '') >= today && a.status !== 'cancelled') upcoming.push(a)
    else past.push(a)
  }
  return { upcoming: upcoming.reverse(), past }
}

export function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-gray-400">{children}</p>
}

export function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

export function Info({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <span className="text-gray-500">{label}:</span>
      <span className={`text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}

export function AppointmentRow({ a, onCancel }) {
  const badge = STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-700 border border-gray-200'
  const label = STATUS_LABEL[a.status] || (a.status || 'scheduled').replace('_', ' ')
  const isPending = a.status === 'pending_confirmation'
  const due = Number(a.amount_due) || 0
  const unpaid = due > 0 && a.payment_status !== 'paid'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center shrink-0">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{fmtDate(a.appointment_date)}</p>
          <span className="text-xs text-gray-500">{a.appointment_slot}</span>
          <Badge className={`text-[10px] uppercase ${badge}`}>{label}</Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {a.hospital?.name || a.hospital_id}
          </span>
          {a.doctor?.name && (
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />Dr. {a.doctor.name}
            </span>
          )}
          {a.department?.name && <span>· {a.department.name}</span>}
        </p>

        {isPending && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-2">
            The hospital will confirm this shortly. You&apos;ll be notified once it&apos;s approved.
          </p>
        )}

        {unpaid && (
          <p className="text-xs text-gray-600 mt-1.5">
            <span className="font-semibold text-gray-900">{money(due)}</span> payable at the
            reception counter. We don&apos;t take online payments yet.
          </p>
        )}

        {a.status === 'cancelled' && a.cancellation_reason && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1.5 mt-2">
            {a.cancellation_reason}
          </p>
        )}
      </div>

      {isPending && onCancel && (
        <button
          type="button"
          onClick={() => onCancel(a)}
          className="text-xs text-gray-500 hover:text-rose-600 shrink-0 underline"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

export function HospitalCard({ record }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-slate-50/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {record.hospital?.name || record.hospital_id}
        </p>
        {record.is_active === false && (
          <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Inactive</Badge>
        )}
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
        <MapPin className="h-3 w-3" />
        {[record.hospital?.city, record.hospital?.state].filter(Boolean).join(', ') || '—'}
      </p>
      <p className="text-[11px] font-mono text-gray-400 mt-1">
        Patient No: {record.registration_no}
      </p>
    </div>
  )
}
