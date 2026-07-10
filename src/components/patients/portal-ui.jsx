'use client'

import {
  Building2, CalendarDays, MapPin, Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const STATUS_BADGE = {
  scheduled: 'bg-blue-100 text-blue-800 border border-blue-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-rose-100 text-rose-800 border border-rose-200',
  'no-show': 'bg-amber-100 text-amber-800 border border-amber-200',
  no_show: 'bg-amber-100 text-amber-800 border border-amber-200',
}

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

export function AppointmentRow({ a }) {
  const badge = STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-700 border border-gray-200'
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center shrink-0">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{fmtDate(a.appointment_date)}</p>
          <span className="text-xs text-gray-500">{a.appointment_slot}</span>
          <Badge className={`text-[10px] uppercase ${badge}`}>
            {(a.status || 'scheduled').replace('_', ' ')}
          </Badge>
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
      </div>
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
