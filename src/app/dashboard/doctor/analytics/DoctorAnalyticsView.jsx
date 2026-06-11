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
  CalendarCheck,
  Pill,
  Stethoscope,
  Activity,
  Building2,
  UserCog,
  Layers,
} from 'lucide-react'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function DoctorAnalyticsView({ data }) {
  const { doctor, totals, byType, byStatus, monthly, hospital } = data

  const kpis = [
    { label: 'Patients', value: totals.patients, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Appointments', value: totals.appointments, icon: CalendarCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Prescriptions', value: totals.prescriptions, icon: Pill, color: 'text-violet-600 bg-violet-50' },
    { label: 'Consultations', value: totals.consultations, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
    { label: 'Treatments', value: totals.treatments, icon: Activity, color: 'text-amber-600 bg-amber-50' },
  ]

  const hospitalKpis = [
    { label: 'Doctors', value: hospital.doctors, icon: UserCog, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total Staff', value: hospital.totalStaff, icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Departments', value: hospital.departments, icon: Layers, color: 'text-violet-600 bg-violet-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Dr. {doctor.name} · {doctor.specialization || 'General practice'}
        </p>
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
        <ChartCard title="Activity (last 6 months)" empty={monthly.every((m) => !m.appointments && !m.prescriptions)}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="prescriptions" name="Prescriptions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Appointment type */}
        <ChartCard title="Appointment Types" empty={byType.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {byType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Appointment status */}
        <ChartCard title="Appointments by Status" empty={byStatus.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Appointments" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hospital staff by role */}
        <ChartCard title="Hospital Staff by Role" empty={hospital.byRole.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hospital.byRole} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} className="capitalize" />
              <Tooltip />
              <Bar dataKey="value" name="Staff" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Hospital overview */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Hospital Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {hospitalKpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <span className={`inline-flex rounded-lg p-2.5 ${k.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-500">{k.label}</p>
                </div>
              </div>
            )
          })}
        </div>
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
