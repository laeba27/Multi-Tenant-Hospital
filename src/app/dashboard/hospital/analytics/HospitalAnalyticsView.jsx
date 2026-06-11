'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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
} from 'lucide-react'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function HospitalAnalyticsView({ data }) {
  const { hospital, totals, staffByRole, apptByType, apptByStatus, byDepartment, monthly } = data

  const kpis = [
    { label: 'Total Staff', value: totals.staff, icon: UserCog, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Doctors', value: totals.doctors, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
    { label: 'Patients', value: totals.patients, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Appointments', value: totals.appointments, icon: CalendarCheck, color: 'text-violet-600 bg-violet-50' },
    { label: 'Departments', value: totals.departments, icon: Layers, color: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">{hospital.name} · hospital overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <span className={`inline-flex rounded-lg p-2 ${k.color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <ChartCard title="Appointment Activity (last 6 months)" empty={monthly.every((m) => !m.appointments)}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
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

function ChartCard({ title, children, empty }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
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
