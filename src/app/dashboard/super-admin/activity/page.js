'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck, CalendarX, UserPlus, Pill as PillIcon, Receipt, IndianRupee, ArrowLeftRight, UserCog,
  TriangleAlert, Building2, CreditCard, RefreshCcw, Download, Search, History,
} from 'lucide-react'
import { toast } from 'sonner'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getActivityLog } from '@/actions/platform'
import { toCsv, downloadCsv, dateStamp } from '@/lib/utils/csv-export'
import { titleCase, fmtDateTime, timeAgo, Panel, EmptyState, OptionSelect } from '@/components/finance/shared'
import { cn } from '@/lib/utils'

const RANGES = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

const TYPE_STYLE = {
  appointment_booked: { icon: CalendarCheck, cls: 'bg-blue-50 text-blue-600' },
  appointment_cancelled: { icon: CalendarX, cls: 'bg-rose-50 text-rose-600' },
  patient_registered: { icon: UserPlus, cls: 'bg-cyan-50 text-cyan-600' },
  prescription_issued: { icon: PillIcon, cls: 'bg-violet-50 text-violet-600' },
  invoice_raised: { icon: Receipt, cls: 'bg-amber-50 text-amber-600' },
  payment_received: { icon: IndianRupee, cls: 'bg-emerald-50 text-emerald-600' },
  ledger_entry: { icon: ArrowLeftRight, cls: 'bg-slate-100 text-slate-600' },
  staff_added: { icon: UserCog, cls: 'bg-indigo-50 text-indigo-600' },
  issue_reported: { icon: TriangleAlert, cls: 'bg-orange-50 text-orange-600' },
  hospital_registered: { icon: Building2, cls: 'bg-indigo-50 text-indigo-600' },
  subscription_payment: { icon: CreditCard, cls: 'bg-emerald-50 text-emerald-600' },
}

/** "Today", "Yesterday" or the date, in India time, for grouping. */
function dayLabel(iso) {
  const ist = (d) => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10)
  const day = ist(iso)
  const today = ist(Date.now())
  const yesterday = ist(Date.now() - 86400000)
  if (day === today) return 'Today'
  if (day === yesterday) return 'Yesterday'
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ActivityLogPage() {
  const [days, setDays] = useState('7')
  const [hospitalId, setHospitalId] = useState('all')
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getActivityLog({
      days: Number(days),
      hospitalId: hospitalId === 'all' ? '' : hospitalId,
      type: type === 'all' ? '' : type,
      limit: 1000,
    })
    if (!res.success) toast.error(res.error || 'Could not load the activity log')
    else setData(res)
    setLoading(false)
  }, [days, hospitalId, type])
  useEffect(() => { load() }, [load])

  const events = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = data?.events || []
    return needle
      ? list.filter((e) => [e.title, e.detail, e.hospitalName, e.actor?.name].some((v) => String(v || '').toLowerCase().includes(needle)))
      : list
  }, [data, q])

  const groups = useMemo(() => {
    const m = new Map()
    for (const e of events) {
      const k = dayLabel(e.at)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(e)
    }
    return [...m.entries()]
  }, [events])

  const exportCsv = () => {
    if (!events.length) { toast.info('Nothing to export'); return }
    downloadCsv(`activity-log-${dateStamp()}.csv`, toCsv([
      ['Time (IST)', 'Hospital', 'Type', 'What happened', 'Details', 'By', 'Role'],
      ...events.map((e) => [fmtDateTime(e.at), e.hospitalName, data.types.find((t) => t.value === e.type)?.label || e.type, e.title, e.detail || '', e.actor?.name || '', e.actor?.role ? titleCase(e.actor.role) : '']),
    ]))
  }

  return (
    <DashboardLayout showHeader>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="h-6 w-6 text-indigo-600" /> Activity Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">Everything that happened across every hospital, newest first, with who did it and when.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading} aria-label="Refresh">
              <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, invoices…" className="pl-8 h-9 text-[13px] bg-white" />
          </div>
          <OptionSelect value={days} onChange={setDays} options={RANGES} />
          <OptionSelect value={hospitalId} onChange={setHospitalId}
            options={[{ value: 'all', label: 'All hospitals' }, ...(data?.hospitals || []).map((h) => ({ value: h.id, label: h.name }))]} />
          <OptionSelect value={type} onChange={setType}
            options={[{ value: 'all', label: 'Everything' }, ...(data?.types || [])]} />
        </div>

        <Panel
          title={data ? `${events.length} event${events.length === 1 ? '' : 's'}` : 'Loading…'}
          hint={data && data.total > data.events.length ? `Showing the latest ${data.events.length} of ${data.total}. Narrow the filters to see older ones.` : 'Times are India time'}
          bodyClassName="p-0"
        >
          {!data ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-gray-50 animate-pulse" />)}</div>
          ) : events.length === 0 ? (
            <div className="p-4"><EmptyState>Nothing happened that matches these filters.</EmptyState></div>
          ) : (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              {groups.map(([label, list]) => (
                <div key={label}>
                  <div className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-y border-gray-100">
                    {label} <span className="text-slate-400 font-normal normal-case">· {list.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {list.map((e) => {
                      const st = TYPE_STYLE[e.type] || TYPE_STYLE.ledger_entry
                      const Icon = st.icon
                      return (
                        <li key={e.id} className="px-4 py-2.5 flex items-start gap-3">
                          <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', st.cls)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-gray-900 wrap-anywhere">{e.title}</p>
                            <p className="text-[11px] text-gray-500 wrap-anywhere">
                              <span className="font-medium text-gray-600">{e.hospitalName}</span>
                              {e.detail ? ` · ${e.detail}` : ''}
                              {e.actor?.name ? ` · by ${e.actor.name}${e.actor.role ? ` (${titleCase(e.actor.role)})` : ''}` : ''}
                            </p>
                          </div>
                          <time dateTime={e.at} title={fmtDateTime(e.at)} className="shrink-0 text-right text-[11px] text-gray-400 tabular-nums">
                            {new Date(e.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                            <span className="block">{timeAgo(e.at)}</span>
                          </time>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  )
}
