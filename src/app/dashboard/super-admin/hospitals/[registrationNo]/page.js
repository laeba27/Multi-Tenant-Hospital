'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  ArrowLeft, Users, UserCog, Stethoscope, CalendarCheck, Layers, ShieldCheck,
  Mail, Phone, MapPin, BadgeCheck, Building2, RefreshCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getHospitalAnalyticsForSuperAdmin } from '@/actions/super-admin'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const STATUS_BADGE = {
  active: 'bg-green-100 text-green-800 border border-green-200',
  approved: 'bg-green-100 text-green-800 border border-green-200',
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  suspended: 'bg-rose-100 text-rose-800 border border-rose-200',
}

export default function HospitalAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const registrationNo = decodeURIComponent(params.registrationNo || '')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    const res = await getHospitalAnalyticsForSuperAdmin(registrationNo)
    if (!res.success) {
      toast.error(res.error || 'Failed to load analytics')
      setData(null)
    } else {
      setData(res.data)
    }
    setLoading(false)
  }

  useEffect(() => { if (registrationNo) load() }, [registrationNo])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/super-admin/hospitals')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-indigo-600" />
                {data?.hospital?.name || 'Hospital'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">{registrationNo}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-sm text-gray-400">
            Loading analytics…
          </div>
        ) : !data ? (
          <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-sm text-gray-400">
            No data available for this hospital.
          </div>
        ) : (
          <AnalyticsContent data={data} />
        )}
      </div>
    </DashboardLayout>
  )
}

function AnalyticsContent({ data }) {
  const { hospital, totals, staffByRole, apptByType, apptByStatus, byDepartment, monthly } = data

  const kpis = [
    { label: 'Hospital Admins', value: totals.admins, icon: ShieldCheck, color: 'text-rose-600 bg-rose-50' },
    { label: 'Total Staff', value: totals.staff, icon: UserCog, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Doctors', value: totals.doctors, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
    { label: 'Patients', value: totals.patients, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Appointments', value: totals.appointments, icon: CalendarCheck, color: 'text-violet-600 bg-violet-50' },
    { label: 'Departments', value: totals.departments, icon: Layers, color: 'text-amber-600 bg-amber-50' },
  ]

  const statusKey = (hospital.account_status || '').trim().toLowerCase()

  return (
    <div className="space-y-6">
      {/* Hospital info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Hospital Details</h3>
          {hospital.account_status && (
            <Badge className={STATUS_BADGE[statusKey] || 'bg-gray-100 text-gray-700 border border-gray-200'}>
              {hospital.account_status}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Info icon={UserCog} label="Administrator" value={hospital.administrator_name} />
          <Info icon={Mail} label="Email" value={hospital.email} />
          <Info icon={Phone} label="Phone" value={hospital.phone} />
          <Info icon={MapPin} label="Location" value={[hospital.city, hospital.state].filter(Boolean).join(', ')} />
          <Info icon={BadgeCheck} label="License" value={hospital.license_number} />
          <Info icon={Building2} label="Registered" value={hospital.created_at ? new Date(hospital.created_at).toLocaleDateString() : '—'} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p>
      <p className="text-[13px] font-semibold text-gray-900 mt-0.5 truncate">{value || '—'}</p>
    </div>
  )
}
