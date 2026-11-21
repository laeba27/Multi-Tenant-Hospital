'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ArrowRight, Check, X, HelpCircle, Phone } from 'lucide-react'
import { getTodayFollowUps } from '@/actions/follow-ups'
import { cn } from '@/lib/utils'

/**
 * "Follow-ups today" on the doctor and reception dashboards.
 *
 *   variant="reception"  how many are due today, per doctor
 *   variant="doctor"     the doctor's own patients due today
 *
 * Each patient's answer to "are you coming?" is shown next to them.
 */
export default function TodayFollowUpsCard({ variant = 'reception', href }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTodayFollowUps().then((res) => {
      if (cancelled) return
      if (res.success) setData(res)
      else setError(res.error || 'Could not load follow-ups')
    })
    return () => { cancelled = true }
  }, [])

  const totals = data?.totals

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-600" />
          Follow-ups today
          {totals && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">{totals.total}</span>
          )}
        </h2>
        <Link href={href} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 shrink-0">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">{error}</p>
      ) : !data ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
      ) : totals.total === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">No follow-ups due today.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 px-4 sm:px-5 pt-3">
            <Chip icon={Check} className="bg-green-50 text-green-700 border-green-200">{totals.coming} coming</Chip>
            <Chip icon={X} className="bg-rose-50 text-rose-700 border-rose-200">{totals.notComing} not coming</Chip>
            <Chip icon={HelpCircle} className="bg-gray-50 text-gray-600 border-gray-200">{totals.noReply} no reply</Chip>
          </div>
          {variant === 'reception' ? <ByDoctor rows={data.byDoctor} /> : <PatientList items={data.items} />}
        </>
      )}
    </div>
  )
}

function Chip({ icon: Icon, className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', className)}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  )
}

function ByDoctor({ rows }) {
  return (
    <div className="divide-y divide-gray-50 mt-2">
      {rows.map((r) => (
        <div key={r.doctor?.id || 'none'} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 wrap-anywhere">
              {r.doctor ? `Dr. ${r.doctor.name.replace(/^dr\.?\s+/i, '')}` : 'No doctor'}
            </p>
            <p className="text-xs text-gray-500">
              {[
                r.coming && `${r.coming} coming`,
                r.notComing && `${r.notComing} not coming`,
                r.noReply && `${r.noReply} no reply`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className="text-xl font-bold text-indigo-600 shrink-0">{r.total}</span>
        </div>
      ))}
    </div>
  )
}

const RESPONSE = {
  coming: { label: 'Coming', className: 'bg-green-100 text-green-800' },
  not_coming: { label: 'Not coming', className: 'bg-rose-100 text-rose-800' },
}

function PatientList({ items }) {
  return (
    <div className="divide-y divide-gray-50 mt-2">
      {items.slice(0, 8).map((f) => {
        const r = RESPONSE[f.response?.value]
        return (
          <div key={f.key} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 wrap-anywhere">{f.patient.name}</p>
              <p className="text-xs text-gray-500 wrap-anywhere">
                {f.status === 'visited'
                  ? 'Visited'
                  : f.appointment
                    ? `Booked${f.appointment.slot ? ` · ${f.appointment.slot}` : ''}`
                    : 'Not booked'}
                {f.response?.note && <> · {f.response.note}</>}
              </p>
              {f.patient.mobile && (
                <a href={`tel:${f.patient.mobile}`} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <Phone className="h-3 w-3" /> {f.patient.mobile}
                </a>
              )}
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', r?.className || 'bg-gray-100 text-gray-600')}>
              {r?.label || 'No reply'}
            </span>
          </div>
        )
      })}
      {items.length > 8 && (
        <p className="px-5 py-2.5 text-xs text-gray-500">and {items.length - 8} more</p>
      )}
    </div>
  )
}
