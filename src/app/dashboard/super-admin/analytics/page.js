'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity, Building2, CalendarCheck, UserPlus, Pill as PillIcon, IndianRupee, Moon, RefreshCcw, Download, Flame,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { toast } from 'sonner'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getPlatformAnalytics } from '@/actions/platform'
import { SUBSCRIPTION_STATUS } from '@/lib/finance/subscriptions'
import { toCsv, downloadCsv, dateStamp } from '@/lib/utils/csv-export'
import {
  money, fmtDate, timeAgo, StatCard, Panel, EmptyState, BarList, Pill, OptionSelect, ChartTooltip,
} from '@/components/finance/shared'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
]
const SORTS = [
  { value: 'score', label: 'Most active' },
  { value: 'least', label: 'Least active' },
  { value: 'collected', label: 'Most collected' },
  { value: 'appointments', label: 'Most appointments' },
  { value: 'last', label: 'Quiet longest' },
]

/** How lively a hospital is, from its activity in the range relative to the busiest. */
function activityLevel(score, top) {
  if (score === 0) return { label: 'No activity', tone: 'slate' }
  const r = score / Math.max(top, 1)
  if (r >= 0.5) return { label: 'High', tone: 'emerald' }
  if (r >= 0.15) return { label: 'Medium', tone: 'blue' }
  return { label: 'Low', tone: 'amber' }
}

export default function SuperAdminAnalyticsPage() {
  const [days, setDays] = useState('30')
  const [sort, setSort] = useState('score')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getPlatformAnalytics({ days: Number(days) })
    if (!res.success) toast.error(res.error || 'Could not load analytics')
    else setData(res)
    setLoading(false)
  }, [days])
  useEffect(() => { load() }, [load])

  const top = data ? Math.max(...data.rows.map((r) => r.score), 1) : 1
  const rows = useMemo(() => {
    if (!data) return []
    const list = [...data.rows]
    const by = {
      score: (a, b) => b.score - a.score,
      least: (a, b) => a.score - b.score,
      collected: (a, b) => b.collected - a.collected,
      appointments: (a, b) => b.appointments - a.appointments,
      last: (a, b) => String(a.lastActivity || '').localeCompare(String(b.lastActivity || '')),
    }[sort]
    return list.sort((a, b) => by(a, b) || a.name.localeCompare(b.name))
  }, [data, sort])

  const fmtKey = (k) => {
    if (!data) return k
    if (data.mode === 'month') {
      const [y, m] = k.split('-').map(Number)
      return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    }
    return (data.mode === 'week' ? 'Wk of ' : '') + fmtDate(k, { day: 'numeric', month: 'short' })
  }

  const t = data?.totals
  const busiest = data?.rows.filter((r) => r.score > 0).slice(0, 5) || []
  const quiet = data ? [...data.rows].sort((a, b) => a.score - b.score || String(a.lastActivity || '').localeCompare(String(b.lastActivity || ''))).slice(0, 5) : []

  const exportCsv = () => {
    if (!rows.length) return
    downloadCsv(`hospital-activity-${days}d-${dateStamp()}.csv`, toCsv([
      ['Hospital', 'ID', 'Activity', 'Appointments', 'Cancelled', 'New patients', 'Prescriptions', 'Invoices', 'Billed', 'Collected', 'Staff', 'Doctors', 'Patients', 'Last activity', 'Admin last sign-in', 'Subscription'],
      ...rows.map((r) => [r.name, r.hospitalId, r.score, r.appointments, r.cancelled, r.newPatients, r.prescriptions, r.invoices, r.billed, r.collected, r.staff, r.doctors, r.patients, r.lastActivity || '', r.adminLastSignIn || '', SUBSCRIPTION_STATUS[r.subscription]?.label || '']),
    ]))
  }

  return (
    <DashboardLayout showHeader>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Which hospitals are busy, which are quiet, and how the platform is growing.</p>
          </div>
          <div className="flex gap-2">
            <OptionSelect value={days} onChange={setDays} options={RANGES} className="w-40" />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading} aria-label="Refresh">
              <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        {!data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl border border-gray-100 bg-white animate-pulse" />)}
          </div>
        ) : (
          <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatCard label="Active hospitals" value={`${t.activeHospitals} / ${t.hospitals}`} icon={Building2} tone="indigo" sub={`${t.quietHospitals} with no activity`} className="col-span-2 lg:col-span-1" />
              <StatCard label="Appointments booked" value={t.appointments} icon={CalendarCheck} tone="blue" />
              <StatCard label="New patients" value={t.newPatients} icon={UserPlus} tone="cyan" />
              <StatCard label="Prescriptions" value={t.prescriptions} icon={PillIcon} tone="violet" />
              <StatCard label="Patients billed" value={money(t.billed)} icon={IndianRupee} tone="amber" />
              <StatCard label="Collected by hospitals" value={money(t.collected)} icon={IndianRupee} tone="emerald" />
            </div>

            <Panel title="Activity across the platform" hint={data.mode === 'day' ? 'Day by day' : data.mode === 'week' ? 'Week by week' : 'Month by month'} bodyClassName="px-2 sm:px-4">
              {data.trend.every((b) => !b.appointments && !b.prescriptions && !b.patients && !b.payments) ? (
                <EmptyState>No activity in this period.</EmptyState>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="key" tickFormatter={fmtKey} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={16} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip content={<ChartTooltip formatLabel={fmtKey} formatValue={(v) => v} />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="appointments" name="Appointments" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="patients" name="New patients" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="prescriptions" name="Prescriptions" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Line dataKey="payments" name="Patient payments" type="monotone" stroke="#10b981" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Panel title="Busiest hospitals" hint="Appointments, patients, prescriptions, invoices and payments">
                <BarList tone="emerald" format={(v) => `${v}`} empty="No hospital had activity in this period."
                  rows={busiest.map((r) => ({ label: r.name, value: r.score, sub: `${r.appointments} appts · ${money(r.collected)} collected` }))} />
              </Panel>
              <Panel title="Quietest hospitals" hint="Least activity first">
                <ul className="space-y-2.5">
                  {quiet.map((r) => (
                    <li key={r.hospitalId} className="flex items-start gap-2 text-[13px]">
                      <Moon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-gray-800">{r.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {r.score} action{r.score === 1 ? '' : 's'} · last activity {r.lastActivity ? timeAgo(r.lastActivity) : 'none in 6+ months'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="What's happening" hint="Events in this period, by type">
                <BarList tone="blue" format={(v) => `${v}`} rows={data.byType.map((x) => ({ label: x.label, value: x.count }))} />
                <Link href="/dashboard/super-admin/activity" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:underline">
                  <Activity className="h-3.5 w-3.5" /> Open the activity log
                </Link>
              </Panel>
            </div>

            <Panel
              title="Every hospital"
              hint="Activity is everything a hospital did in this period, counted together"
              bodyClassName="p-0"
              action={
                <div className="flex gap-2">
                  <OptionSelect value={sort} onChange={setSort} options={SORTS} className="w-44" />
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV</Button>
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Hospital</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Appts</TableHead>
                    <TableHead className="hidden md:table-cell text-right">New patients</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Rx</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Collected</TableHead>
                    <TableHead className="hidden lg:table-cell">Last activity</TableHead>
                    <TableHead className="hidden xl:table-cell">Admin signed in</TableHead>
                    <TableHead className="hidden md:table-cell pr-4">Subscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const lvl = activityLevel(r.score, top)
                    const sub = SUBSCRIPTION_STATUS[r.subscription]
                    return (
                      <TableRow key={r.hospitalId}>
                        <TableCell className="pl-4 whitespace-normal min-w-40">
                          <Link href={`/dashboard/super-admin/hospitals/${encodeURIComponent(r.hospitalId)}`} className="text-[13px] font-semibold text-gray-900 hover:text-indigo-700">
                            {r.name}
                          </Link>
                          <p className="text-[11px] text-gray-400">{r.staff} staff · {r.doctors} doctor{r.doctors === 1 ? '' : 's'} · {r.patients} patients</p>
                          <p className="lg:hidden text-[11px] text-gray-500">Last activity {r.lastActivity ? timeAgo(r.lastActivity) : '—'}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Pill tone={lvl.tone}>{lvl.label === 'High' && <Flame className="h-3 w-3 mr-0.5" />}{lvl.label}</Pill>
                          <span className="block text-[11px] text-gray-400 mt-0.5 tabular-nums">{r.score} action{r.score === 1 ? '' : 's'}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums text-gray-700">
                          {r.appointments}{r.cancelled ? <span className="block text-[11px] text-rose-500">{r.cancelled} cancelled</span> : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums text-gray-700">{r.newPatients}</TableCell>
                        <TableCell className="hidden lg:table-cell text-right tabular-nums text-gray-700">{r.prescriptions}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">{money(r.collected)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-[12px] text-gray-600 whitespace-nowrap">{r.lastActivity ? timeAgo(r.lastActivity) : <span className="text-gray-400">None in 6+ months</span>}</TableCell>
                        <TableCell className="hidden xl:table-cell text-[12px] text-gray-600 whitespace-nowrap">{r.adminLastSignIn ? timeAgo(r.adminLastSignIn) : <span className="text-gray-400">Never</span>}</TableCell>
                        <TableCell className="hidden md:table-cell pr-4"><Pill tone={sub?.tone}>{sub?.label}</Pill></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Panel>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
