import Link from 'next/link'
import {
  UserPlus,
  CalendarCheck,
  Clock,
  IndianRupee,
  Users2,
  Building2,
  BarChart3,
  Megaphone,
  Pin,
  UserStar,
  CreditCard,
  ClipboardPlus,
  ArrowRight,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getHospitalDashboardSummary } from '@/actions/hospital-dashboard'

export const metadata = {
  title: 'Hospital Admin Dashboard',
  description: 'Hospital administrator dashboard',
}

const CATEGORY_STYLE = {
  urgent: 'bg-rose-100 text-rose-800',
  health_alert: 'bg-rose-100 text-rose-800',
  closure: 'bg-amber-100 text-amber-800',
  advisory: 'bg-amber-100 text-amber-800',
  schedule: 'bg-blue-100 text-blue-800',
  policy: 'bg-purple-100 text-purple-800',
  event: 'bg-emerald-100 text-emerald-800',
  general: 'bg-gray-100 text-gray-700',
}

const QUICK_LINKS = [
  { icon: UserPlus, label: 'New Registration', hint: 'Register a patient & book', href: '/dashboard/hospital/patient-management', accent: 'text-indigo-600 bg-indigo-50' },
  { icon: UserStar, label: 'Manage Staff', hint: 'Doctors, nurses & desk', href: '/dashboard/hospital/staff', accent: 'text-blue-600 bg-blue-50' },
  { icon: Building2, label: 'View Departments', hint: 'Departments & units', href: '/dashboard/hospital/departments', accent: 'text-emerald-600 bg-emerald-50' },
  { icon: BarChart3, label: 'View Reports', hint: 'Analytics & trends', href: '/dashboard/hospital/analytics', accent: 'text-purple-600 bg-purple-50' },
  { icon: Megaphone, label: 'Post an Update', hint: 'Notify staff & patients', href: '/dashboard/hospital/updates', accent: 'text-amber-600 bg-amber-50' },
  { icon: CreditCard, label: 'Billing & Finance', hint: 'Invoices & payments', href: '/dashboard/hospital/finance', accent: 'text-rose-600 bg-rose-50' },
  { icon: ClipboardPlus, label: 'Treatments', hint: 'Catalog & pricing', href: '/dashboard/hospital/treatments', accent: 'text-teal-600 bg-teal-50' },
  { icon: Users2, label: 'Patients', hint: 'All registered patients', href: '/dashboard/hospital/patient-management', accent: 'text-slate-600 bg-slate-50' },
]

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

export default async function HospitalAdminPage() {
  const data = await getHospitalDashboardSummary()
  const { today, totals, notices, hospital } = data

  const stats = [
    {
      icon: UserPlus,
      label: 'Registered today',
      value: today.patientsRegistered,
      sub: `${totals.patients} total`,
      accent: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: CalendarCheck,
      label: "Today's appointments",
      value: today.appointments,
      sub: 'scheduled for today',
      accent: 'text-blue-600 bg-blue-50',
    },
    {
      icon: Clock,
      label: 'Awaiting approval',
      value: today.pendingRequests,
      sub: 'patient booking requests',
      accent: today.pendingRequests > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50',
      href: today.pendingRequests > 0 ? '/dashboard/hospital/patient-management?tab=requests' : null,
    },
    {
      icon: IndianRupee,
      label: 'Collected today',
      value: `₹${Number(today.revenue).toLocaleString('en-IN')}`,
      sub: 'payments received',
      accent: 'text-emerald-600 bg-emerald-50',
    },
  ]

  return (
    <DashboardLayout roleLabel="Hospital Administrator" showHeader>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{hospital.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening at your hospital today.
          </p>
        </div>

        {/* Today at a glance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const card = (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${s.accent}`}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            )
            return s.href ? (
              <Link key={s.label} href={s.href} className="block hover:opacity-90 transition">
                {card}
              </Link>
            ) : (
              <div key={s.label}>{card}</div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick links */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="rounded-lg border border-gray-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition group"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${l.accent}`}
                  >
                    <l.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{l.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{l.hint}</p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
              <Stat label="Patients" value={totals.patients} />
              <Stat label="Staff" value={totals.staff} />
              <Stat label="Departments" value={totals.departments} />
            </div>
          </div>

          {/* Notices */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-indigo-600" />
                Quick Updates
              </h2>
              <Link
                href="/dashboard/hospital/updates"
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {notices.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No updates running</p>
                <Link
                  href="/dashboard/hospital/updates"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                >
                  Post one
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {n.is_pinned && <Pin className="h-3 w-3 text-indigo-600 shrink-0" />}
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                    </div>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                          CATEGORY_STYLE[n.category] || CATEGORY_STYLE.general
                        }`}
                      >
                        {(n.category || 'general').replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400">{fmtDate(n.published_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
