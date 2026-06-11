'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Search,
  ShieldCheck,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getSuperAdminDashboardData,
  getGlobalNotices,
} from '@/actions/super-admin'

function normalizeStatus(status) {
  return (status || '').trim().toLowerCase()
}

function hospitalState(hospital) {
  const s = normalizeStatus(hospital.account_status)
  const access = hospital.admin_profile?.access_granted === true
  if (s === 'suspended') return 'suspended'
  if (['active', 'approved'].includes(s) && access) return 'active'
  return 'pending'
}

const STATE_BADGE = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-200', dot: 'bg-green-500' },
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border border-amber-200', dot: 'bg-amber-500' },
  suspended: { label: 'Suspended', cls: 'bg-rose-100 text-rose-800 border border-rose-200', dot: 'bg-rose-500' },
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

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const [dashboardData, setDashboardData] = useState({
    stats: { totalHospitals: 0, pendingHospitals: 0, approvedHospitals: 0, totalSuperAdmins: 0 },
    hospitals: [],
    pendingApprovalHospitals: [],
  })
  const [notices, setNotices] = useState([])

  const loadDashboardData = async () => {
    const [dashResult, noticesResult] = await Promise.all([
      getSuperAdminDashboardData(''),
      getGlobalNotices(),
    ])

    if (!dashResult.success) {
      toast.error(dashResult.error || 'Failed to load dashboard data')
    } else {
      setDashboardData(dashResult.data)
    }
    setNotices(noticesResult?.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const filtered = useMemo(() => {
    const list = dashboardData.hospitals
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.registration_no?.toLowerCase().includes(q) ||
        (h.admin_profile?.email || h.email || '').toLowerCase().includes(q) ||
        (h.city || '').toLowerCase().includes(q)
    )
  }, [dashboardData.hospitals, query])

  const statCards = [
    { label: 'Total Hospitals', value: dashboardData.stats.totalHospitals, icon: Building2, color: 'text-indigo-600' },
    { label: 'Pending', value: dashboardData.stats.pendingHospitals, icon: Clock3, color: 'text-amber-600' },
    { label: 'Approved', value: dashboardData.stats.approvedHospitals, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Super Admins', value: dashboardData.stats.totalSuperAdmins, icon: ShieldCheck, color: 'text-blue-600' },
  ]

  if (loading) {
    return (
      <DashboardLayout showHeader>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading super admin dashboard…</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout showHeader>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage hospital registrations, control portal access, and review notices.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((c) => {
            const Icon = c.icon
            return (
              <Card key={c.label}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{c.value}</p>
                  </div>
                  <Icon className={cn('h-6 w-6', c.color)} />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Master-detail: hospitals (left) + notices (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* LEFT — hospital list + manage */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search hospital, ID, email, city…"
                  className="pl-8 h-9 text-[13px]"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={loadDashboardData}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[560px]">
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">No hospitals found.</p>
              ) : (
                filtered.map((h) => {
                  const state = hospitalState(h)
                  const badge = STATE_BADGE[state]
                  return (
                    <Link
                      key={h.registration_no}
                      href={`/dashboard/super-admin/hospitals?highlight=${h.registration_no}`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-gray-50 transition-colors hover:bg-slate-50"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-[12px] font-semibold bg-slate-200 text-slate-600">
                        {initials(h.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{h.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono truncate">{h.registration_no}</p>
                      </div>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', badge.cls)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
                        {badge.label}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT — global notices feed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Notices</h2>
              <span className="text-[11px] text-gray-400 ml-auto">across all hospitals</span>
            </div>
            <div className="overflow-y-auto max-h-[560px] divide-y divide-gray-50">
              {notices.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">No notices.</p>
              ) : (
                notices.map((n) => (
                  <div key={n.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', NOTICE_DOT[n.category] || NOTICE_DOT.general)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 leading-snug">
                          {n.title}
                          {n.is_pinned && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-600">Pinned</span>}
                        </p>
                        {n.body && <p className="text-[12px] text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {n.hospital_name} · {fmtDate(n.published_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
