import Link from 'next/link'
import { getDoctorDashboard } from '@/actions/doctor-dashboard'
import {
  CalendarClock,
  ClipboardList,
  Users,
  Pill,
  Bell,
  ArrowRight,
  Plus,
  ChartBar,
} from 'lucide-react'

export const metadata = {
  title: 'Doctor Dashboard - Hospital Management Portal',
  description: 'Doctor dashboard',
}

const NOTICE_DOT = {
  urgent: 'bg-rose-500',
  schedule: 'bg-amber-500',
  policy: 'bg-blue-500',
  event: 'bg-violet-500',
  general: 'bg-emerald-500',
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default async function DoctorPage() {
  const { doctor, stats, recentPatients, notices } = await getDoctorDashboard()

  const statCards = [
    { label: "Today's Patients", value: stats.todayPatients, sub: 'Scheduled today', icon: CalendarClock, color: 'indigo' },
    { label: 'Pending', value: stats.pending, sub: 'Awaiting prescription', icon: ClipboardList, color: 'amber' },
    { label: 'Total Patients', value: stats.totalPatients, sub: 'Under your care', icon: Users, color: 'emerald' },
    { label: 'Prescriptions', value: stats.prescriptionsThisMonth, sub: 'This month', icon: Pill, color: 'violet' },
  ]

  const colorMap = {
    indigo: { bar: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
    amber: { bar: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    emerald: { bar: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    violet: { bar: 'border-violet-500', text: 'text-violet-600', bg: 'bg-violet-50' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, Dr. {doctor.name?.split(' ')[0] || ''}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {doctor.specialization || 'General practice'} · Here&apos;s your overview
          </p>
        </div>
        <Link
          href="/dashboard/doctor/analytics"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <ChartBar className="h-4 w-4" /> View analytics
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon
          const col = colorMap[c.color]
          return (
            <div key={c.label} className={`bg-white rounded-xl shadow-sm border-l-4 ${col.bar} p-5 flex items-center justify-between`}>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-3xl font-bold ${col.text} mt-1`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
              <span className={`rounded-full p-3 ${col.bg} ${col.text}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent patients */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Patients</h2>
            <Link href="/dashboard/doctor/patients" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No recent consultations yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPatients.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/doctor/patients?highlight=${p.registrationNo || p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[12px] font-semibold shrink-0">
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate capitalize">
                      {p.type}{p.reason ? ` · ${p.reason}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{fmtDate(p.lastVisit)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 inline-flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-indigo-600" /> Notices
            </h2>
            <Link href="/dashboard/doctor/notifications" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {notices.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No notices.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {notices.map((n) => (
                <div key={n.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${NOTICE_DOT[n.category] || NOTICE_DOT.general}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {n.title}
                        {n.is_pinned && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-600">Pinned</span>}
                      </p>
                      {n.body && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{fmtDate(n.published_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction href="/dashboard/doctor/appointments" icon={CalendarClock} label="Appointments" desc="View today's schedule" />
          <QuickAction href="/dashboard/doctor/prescriptions" icon={Pill} label="Templates" desc="Manage prescription templates" />
          <QuickAction href="/dashboard/doctor/patients" icon={Users} label="Patients" desc="Browse patient history" />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label, desc }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
    >
      <span className="rounded-lg bg-indigo-50 text-indigo-600 p-2">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <Plus className="h-4 w-4 text-gray-300 ml-auto" />
    </Link>
  )
}
