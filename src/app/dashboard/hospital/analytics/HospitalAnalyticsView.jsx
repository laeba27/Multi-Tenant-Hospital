'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Users,
  UserCog,
  Stethoscope,
  CalendarCheck,
  Layers,
  IndianRupee,
  Wallet,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toCsv, downloadCsv, dateStamp } from '@/lib/utils/csv-export'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

export function HospitalAnalyticsView({ data }) {
  const {
    hospital,
    totals,
    trends,
    rates,
    staffByRole,
    apptByType,
    apptByStatus,
    byDepartment,
    monthly,
    topDoctors,
    paymentMix,
    generatedAt,
  } = data

  const handleExport = () => {
    const rows = []
    const push = (...cells) => rows.push(cells)

    push(`${hospital.name} - Analytics Report`)
    if (hospital.registration_no) push('Hospital registration', hospital.registration_no)
    push('Generated', new Date(generatedAt).toLocaleString('en-IN'))
    push()

    push('SUMMARY')
    push('Metric', 'Value')
    push('Total staff', totals.staff)
    push('Doctors', totals.doctors)
    push('Patients', totals.patients)
    push('Appointments', totals.appointments)
    push('Departments', totals.departments)
    push('Revenue billed (INR)', totals.revenue)
    push('Amount collected (INR)', totals.collected)
    push('Outstanding (INR)', totals.outstanding)
    push()

    push('RATES (%)')
    push('Metric', 'Value')
    push('Completion rate', rates.completion)
    push('Cancellation rate', rates.cancellation)
    push('No-show rate', rates.noShow)
    push('Collection rate', rates.collection)
    push()

    push('MONTHLY TREND')
    push('Month', 'Appointments', 'Completed', 'New patients', 'Revenue billed', 'Collected')
    for (const m of monthly) {
      push(m.label, m.appointments, m.completed, m.newPatients, m.revenue, m.collected)
    }
    push()

    const section = (title, list, valueHeader = 'Count') => {
      if (!list?.length) return
      push(title)
      push('Name', valueHeader)
      for (const item of list) push(item.name, item.value)
      push()
    }

    section('STAFF BY ROLE', staffByRole, 'Staff')
    section('APPOINTMENTS BY STATUS', apptByStatus, 'Appointments')
    section('APPOINTMENTS BY TYPE', apptByType, 'Appointments')
    section('APPOINTMENTS BY DEPARTMENT', byDepartment, 'Appointments')
    section('BUSIEST DOCTORS', topDoctors, 'Appointments')
    section('INVOICES BY PAYMENT STATUS', paymentMix, 'Invoices')

    const safeName = (hospital.name || 'hospital').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    downloadCsv(`${safeName}-analytics-${dateStamp()}.csv`, toCsv(rows))
  }

  const kpis = [
    { label: 'Total Staff', value: totals.staff, icon: UserCog, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Doctors', value: totals.doctors, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
    {
      label: 'Patients',
      value: totals.patients,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50',
      trend: trends.newPatients,
      trendLabel: 'new this month',
    },
    {
      label: 'Appointments',
      value: totals.appointments,
      icon: CalendarCheck,
      color: 'text-violet-600 bg-violet-50',
      trend: trends.appointments,
      trendLabel: 'vs last month',
    },
    { label: 'Departments', value: totals.departments, icon: Layers, color: 'text-amber-600 bg-amber-50' },
  ]

  const money = [
    {
      label: 'Revenue Billed',
      value: inr(totals.revenue),
      icon: IndianRupee,
      color: 'text-emerald-600 bg-emerald-50',
      trend: trends.revenue,
      trendLabel: 'vs last month',
    },
    {
      label: 'Collected',
      value: inr(totals.collected),
      icon: Wallet,
      color: 'text-sky-600 bg-sky-50',
      hint: `${rates.collection}% of billed`,
    },
    {
      label: 'Outstanding',
      value: inr(totals.outstanding),
      icon: AlertCircle,
      color: 'text-rose-600 bg-rose-50',
      hint: totals.outstanding > 0 ? 'awaiting payment' : 'all settled',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">{hospital.name} · hospital overview</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Download report
        </Button>
      </div>

      {/* Money first: it is the question an admin opens this page to answer. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {money.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} compact />
        ))}
      </div>

      {/* Operational rates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RateCard label="Completion rate" value={rates.completion} good="high" />
        <RateCard label="Collection rate" value={rates.collection} good="high" />
        <RateCard label="Cancellation rate" value={rates.cancellation} good="low" />
        <RateCard label="No-show rate" value={rates.noShow} good="low" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend -- billed against collected, so a widening gap between
            the two lines reads as a collection problem at a glance. */}
        <ChartCard
          title="Revenue Trend (last 12 months)"
          subtitle="Billed vs collected"
          empty={monthly.every((m) => !m.revenue)}
          wide
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
              />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Billed" fill="#c7d2fe" stroke="#6366f1" strokeWidth={2} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Growth */}
        <ChartCard
          title="Growth (last 12 months)"
          subtitle="Appointments, completions and new patients"
          empty={monthly.every((m) => !m.appointments && !m.newPatients)}
          wide
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="newPatients" name="New patients" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Busiest doctors */}
        <ChartCard title="Busiest Doctors" empty={topDoctors.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topDoctors} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" name="Appointments" fill="#06b6d4" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Staff by role */}
        <ChartCard title="Staff by Role" empty={staffByRole.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={staffByRole} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} className="capitalize" />
              <Tooltip />
              <Bar dataKey="value" name="Staff" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Appointment status */}
        <ChartCard title="Appointments by Status" empty={apptByStatus.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={apptByStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} className="capitalize" />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Appointments" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment mix */}
        <ChartCard title="Invoices by Payment Status" empty={paymentMix.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={paymentMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {paymentMix.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Appointment type */}
        <ChartCard title="Appointment Types" empty={apptByType.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={apptByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {apptByType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Appointments by department */}
        <ChartCard title="Appointments by Department" empty={byDepartment.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDepartment} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} className="capitalize" />
              <Tooltip />
              <Bar dataKey="value" name="Appointments" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

/** KPI tile, with an optional month-over-month delta. */
function StatCard({ label, value, icon: Icon, color, trend, trendLabel, hint, compact }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className={`inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className={`font-bold text-gray-900 mt-2 ${compact ? 'text-2xl' : 'text-xl'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {trend !== undefined && trend !== null && <TrendPill value={trend} label={trendLabel} />}
      {trend === null && trendLabel && (
        <p className="text-[11px] text-gray-400 mt-1.5">No prior month to compare</p>
      )}
      {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  )
}

/** Up/down/flat delta. Direction is coloured, not just signed. */
function TrendPill({ value, label }) {
  const up = value > 0
  const flat = value === 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const tone = flat ? 'text-gray-500' : up ? 'text-emerald-600' : 'text-rose-600'

  return (
    <p className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {value}%
      {label && <span className="font-normal text-gray-400">{label}</span>}
    </p>
  )
}

/**
 * A rate with a bar. `good` says which direction is healthy, so a high
 * cancellation rate reads red while a high completion rate reads green.
 */
function RateCard({ label, value, good }) {
  const healthy = good === 'high' ? value >= 60 : value <= 15
  const tone = healthy ? 'bg-emerald-500' : value === 0 ? 'bg-gray-300' : 'bg-amber-500'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}%</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children, empty, wide }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {empty ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
          Not enough data yet.
        </div>
      ) : (
        children
      )}
    </div>
  )
}
