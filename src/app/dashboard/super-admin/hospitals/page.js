'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Mail, Phone, MapPin, User, BadgeCheck, Ban, Plus, Building2, RefreshCcw, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  getSuperAdminDashboardData,
  approveHospitalRegistration,
  setHospitalAccess,
  requestHospitalDetails,
  createHospital,
} from '@/actions/super-admin'

function normalizeStatus(s) { return (s || '').trim().toLowerCase() }
function hospitalState(h) {
  const s = normalizeStatus(h.account_status)
  const access = h.admin_profile?.access_granted === true
  if (s === 'suspended') return 'suspended'
  if (['active', 'approved'].includes(s) && access) return 'active'
  return 'pending'
}
const STATE_BADGE = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-200', dot: 'bg-green-500' },
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border border-amber-200', dot: 'bg-amber-500' },
  suspended: { label: 'Suspended', cls: 'bg-rose-100 text-rose-800 border border-rose-200', dot: 'bg-rose-500' },
}
function initials(n) {
  return (n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function HospitalsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [hospitals, setHospitals] = useState([])
  const [query, setQuery] = useState('')
  const [selectedReg, setSelectedReg] = useState(searchParams.get('highlight') || null)
  const [busy, setBusy] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    const res = await getSuperAdminDashboardData('')
    if (!res.success) {
      toast.error(res.error || 'Failed to load')
    } else {
      setHospitals(res.data.hospitals)
      setSelectedReg((prev) => prev || res.data.hospitals[0]?.registration_no || null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return hospitals
    const q = query.toLowerCase()
    return hospitals.filter((h) =>
      h.name?.toLowerCase().includes(q) ||
      h.registration_no?.toLowerCase().includes(q) ||
      (h.admin_profile?.email || h.email || '').toLowerCase().includes(q) ||
      (h.city || '').toLowerCase().includes(q)
    )
  }, [hospitals, query])

  const selected = hospitals.find((h) => h.registration_no === selectedReg) || null

  const doApprove = async (regNo) => {
    setBusy(regNo)
    const r = await approveHospitalRegistration(regNo)
    r.success ? toast.success(r.message || 'Approved') : toast.error(r.error || 'Failed')
    await load(); setBusy('')
  }
  const doToggle = async (h) => {
    const grant = hospitalState(h) !== 'active'
    if (!grant && !window.confirm(`Suspend ${h.name}? Admins lose portal access.`)) return
    setBusy(h.registration_no)
    const r = await setHospitalAccess(h.registration_no, grant)
    r.success ? toast.success(r.message || 'Updated') : toast.error(r.error || 'Failed')
    await load(); setBusy('')
  }
  const doRequest = async (regNo) => {
    const note = window.prompt('Details to request from hospital admin:', 'Please share any missing registration/legal details.')
    if (note === null) return
    setBusy(regNo)
    const r = await requestHospitalDetails(regNo, note)
    r.success ? toast.success(r.message || 'Email sent') : toast.error(r.error || 'Failed')
    setBusy('')
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" /> Hospitals
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{hospitals.length} registered · approve, suspend, or add new</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Hospital</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* List */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-8 h-9 text-[13px]" />
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={load}><RefreshCcw className="h-4 w-4" /></Button>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {loading ? (
                <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">No hospitals.</p>
              ) : filtered.map((h) => {
                const badge = STATE_BADGE[hospitalState(h)]
                const active = h.registration_no === selectedReg
                return (
                  <button key={h.registration_no} onClick={() => setSelectedReg(h.registration_no)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-gray-50', active ? 'bg-indigo-50' : 'hover:bg-slate-50')}>
                    <div className={cn('h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-[12px] font-semibold', active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600')}>{initials(h.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{h.name}</p>
                      <p className="text-[11px] text-gray-500 font-mono truncate">{h.registration_no}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', badge.cls)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />{badge.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Select a hospital.</div>
            ) : (
              <HospitalDetail hospital={selected} busy={busy === selected.registration_no}
                onApprove={() => doApprove(selected.registration_no)} onToggle={() => doToggle(selected)} onRequest={() => doRequest(selected.registration_no)}
                onView={() => router.push(`/dashboard/super-admin/hospitals/${encodeURIComponent(selected.registration_no)}`)} />
            )}
          </div>
        </div>
      </div>

      <CreateHospitalDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </DashboardLayout>
  )
}

export default function HospitalsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-600">Loading hospitals...</p>
          </div>
        </DashboardLayout>
      }
    >
      <HospitalsPageContent />
    </Suspense>
  )
}

function HospitalDetail({ hospital, busy, onApprove, onToggle, onRequest, onView }) {
  const state = hospitalState(hospital)
  const badge = STATE_BADGE[state]
  const admin = hospital.admin_profile
  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0">{initials(hospital.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{hospital.name}</h2>
            <Badge className={badge.cls}>{badge.label}</Badge>
          </div>
          <p className="text-xs font-mono text-gray-500">{hospital.registration_no}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        <Info icon={User} label="Administrator" value={hospital.administrator_name} />
        <Info icon={Mail} label="Email" value={admin?.email || hospital.email} />
        <Info icon={Phone} label="Phone" value={hospital.phone} />
        <Info icon={MapPin} label="Location" value={[hospital.city, hospital.state].filter(Boolean).join(', ')} />
        <Info icon={BadgeCheck} label="License" value={hospital.license_number} />
        <Info icon={Building2} label="Registered" value={hospital.created_at ? new Date(hospital.created_at).toLocaleDateString() : '—'} />
      </div>

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 flex-wrap">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={onView}><BarChart3 className="h-4 w-4" /> View Analytics</Button>
        <Button variant="outline" size="sm" onClick={onRequest} disabled={busy}><Mail className="h-4 w-4" /> Request Details</Button>
        {state === 'pending' ? (
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove} disabled={busy}><BadgeCheck className="h-4 w-4" /> {busy ? 'Approving…' : 'Approve'}</Button>
        ) : state === 'active' ? (
          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={onToggle} disabled={busy}><Ban className="h-4 w-4" /> {busy ? 'Updating…' : 'Suspend'}</Button>
        ) : (
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={onToggle} disabled={busy}><BadgeCheck className="h-4 w-4" /> {busy ? 'Updating…' : 'Restore access'}</Button>
        )}
      </div>
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

function CreateHospitalDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    hospitalName: '', licenseNumber: '', adminName: '', email: '', password: '',
    phone: '', address: '', city: '', state: '', postalCode: '', autoApprove: true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createHospital(form)
    setSaving(false)
    if (!res.success) { toast.error(res.error || 'Failed'); return }
    toast.success(res.message || 'Hospital created')
    onClose()
    setForm({ hospitalName: '', licenseNumber: '', adminName: '', email: '', password: '', phone: '', address: '', city: '', state: '', postalCode: '', autoApprove: true })
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Hospital</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Hospital name *"><Input value={form.hospitalName} onChange={set('hospitalName')} required /></Field>
          <Field label="License number *"><Input value={form.licenseNumber} onChange={set('licenseNumber')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admin name"><Input value={form.adminName} onChange={set('adminName')} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admin email *"><Input type="email" value={form.email} onChange={set('email')} required /></Field>
            <Field label="Password *"><Input type="password" value={form.password} onChange={set('password')} required /></Field>
          </div>
          <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><Input value={form.state} onChange={set('state')} /></Field>
            <Field label="Postal"><Input value={form.postalCode} onChange={set('postalCode')} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.autoApprove} onChange={(e) => setForm((p) => ({ ...p, autoApprove: e.target.checked }))} className="accent-indigo-600" />
            Approve immediately (grant portal access)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Hospital'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  )
}
