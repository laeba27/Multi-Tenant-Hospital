'use client'

/**
 * Small building blocks shared by the hospital Finance page and the
 * super-admin Payments / Analytics / Activity pages, so they read as one
 * system: same money format, cards, period picker and bar lists.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export const money = (n, { decimals = 0 } = {}) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals || 0,
  })}`

/** ₹1.2L / ₹3.4Cr for chart axes. */
export const moneyShort = (n) => {
  const v = Number(n || 0)
  const a = Math.abs(v)
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`
  return `₹${Math.round(v)}`
}

export const titleCase = (s) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—'
  const s = String(d)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s)
  return Number.isNaN(date.getTime()) ? s : date.toLocaleDateString('en-IN', opts)
}

export function fmtDateTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

/** "5 min ago", "3 days ago", or the date once it's over a month. */
export function timeAgo(ts) {
  if (!ts) return 'Never'
  const ms = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(ms)) return '—'
  const m = Math.round(ms / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 31) return `${d} day${d === 1 ? '' : 's'} ago`
  return fmtDate(ts)
}

const TONES = {
  emerald: 'text-emerald-600 bg-emerald-50',
  rose: 'text-rose-600 bg-rose-50',
  amber: 'text-amber-600 bg-amber-50',
  blue: 'text-blue-600 bg-blue-50',
  indigo: 'text-indigo-600 bg-indigo-50',
  violet: 'text-violet-600 bg-violet-50',
  slate: 'text-slate-600 bg-slate-100',
  cyan: 'text-cyan-600 bg-cyan-50',
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'slate', change, invertChange = false, className }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4 min-w-0', className)}>
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className={cn('inline-flex rounded-lg p-2', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : <span />}
        <ChangeChip change={change} invert={invertChange} />
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 mt-2 wrap-anywhere tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1 wrap-anywhere">{sub}</p>}
    </div>
  )
}

/** +12% / -8% versus the previous period. `invert` for costs, where up is bad. */
export function ChangeChip({ change, invert = false }) {
  if (change === null || change === undefined) return null
  const up = change > 0
  const flat = change === 0
  const good = flat ? null : invert ? !up : up
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span
      title="Compared with the previous period"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        good === null ? 'bg-slate-100 text-slate-500' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}{change}%
    </span>
  )
}

export function Panel({ title, hint, action, children, className, bodyClassName }) {
  return (
    <section className={cn('bg-white rounded-xl border border-gray-100 shadow-sm min-w-0 flex flex-col', className)}>
      {(title || action) && (
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
            {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-4 flex-1 min-w-0', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({ children, className }) {
  return (
    <div className={cn('rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400', className)}>
      {children}
    </div>
  )
}

const BAR_COLORS = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
}

/**
 * A ranked list with proportional bars: readable on a phone, unlike a pie.
 * rows: [{ label, value, sub? }]
 */
export function BarList({ rows, format = money, tone = 'blue', empty = 'Nothing in this period.', max }) {
  if (!rows?.length) return <EmptyState className="p-6">{empty}</EmptyState>
  const top = max ?? Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const total = rows.reduce((s, r) => s + Math.abs(r.value), 0)
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-gray-700" title={r.label}>{r.label}</span>
            <span className="shrink-0 font-semibold text-gray-900 tabular-nums">
              {format(r.value)}
              {total > 0 && (
                <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                  {Math.round((Math.abs(r.value) / total) * 100)}%
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full', BAR_COLORS[r.tone || tone])}
              style={{ width: `${Math.max((Math.abs(r.value) / top) * 100, 2)}%` }}
            />
          </div>
          {r.sub && <p className="text-[11px] text-gray-400 mt-0.5">{r.sub}</p>}
        </li>
      ))}
    </ul>
  )
}

const PILL_TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function Pill({ tone = 'slate', children, className }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', PILL_TONES[tone], className)}>
      {children}
    </span>
  )
}

export function OptionSelect({ value, onChange, options, className, placeholder }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('h-9 text-[13px] bg-white', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Shared recharts tooltip, so every chart's hover card looks the same. */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue = money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-gray-900 mb-1">{formatLabel ? formatLabel(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-gray-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold text-gray-900 tabular-nums">{formatValue(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
