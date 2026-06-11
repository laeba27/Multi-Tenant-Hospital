'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  FileText,
  Pill,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getDoctorPatientDetail } from '@/actions/doctor-patients'

const APPT_TYPE_LABEL = {
  consultation: 'Consultation',
  treatment: 'Treatment',
  both: 'Consultation + Treatment',
}

function apptTypeLabel(type) {
  if (!type) return '—'
  return APPT_TYPE_LABEL[String(type).toLowerCase()] || String(type).replace(/\b\w/g, (c) => c.toUpperCase())
}

const RX_BADGE = {
  draft: 'bg-sky-50 text-sky-700 border border-sky-200',
  issued: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  amended: 'bg-violet-50 text-violet-700 border border-violet-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export function DoctorPatientsView({ patients = [], initialDetail = null, initialHighlight = null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState(
    initialHighlight || patients[0]?.registrationNo || null
  )
  const [detail, setDetail] = useState(initialDetail)
  const [isLoading, startLoad] = useTransition()

  // Load detail when selection changes (and we don't already have it).
  useEffect(() => {
    if (!selectedKey) return
    if (detail?.patient?.registrationNo === selectedKey || detail?.patient?.id === selectedKey) return
    startLoad(async () => {
      const d = await getDoctorPatientDetail(selectedKey)
      setDetail(d)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey])

  const selectPatient = (patient) => {
    const key = patient.registrationNo || patient.id
    setSelectedKey(key)
    // Reflect selection in the URL without a full navigation.
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('highlight', key)
    router.replace(`/dashboard/doctor/patients?${sp.toString()}`, { scroll: false })
  }

  const filtered = patients.filter((p) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.registrationNo || '').toLowerCase().includes(q) ||
      (p.mobile || '').includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-indigo-600" />
            My Patients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {patients.length} patient{patients.length === 1 ? '' : 's'} treated · click a patient to view their history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* LEFT: patient list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-180px)]">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, phone…"
                className="pl-8 h-9 text-[13px] border-slate-200"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No patients found.</div>
            ) : (
              filtered.map((p) => {
                const key = p.registrationNo || p.id
                const active = key === selectedKey
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-gray-50 transition-colors',
                      active ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold',
                        active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500 font-mono truncate">{p.registrationNo || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <Pill className="h-3 w-3" />
                        {p.prescriptionCount}
                      </span>
                      <ChevronRight className={cn('h-4 w-4', active ? 'text-indigo-500' : 'text-gray-300')} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT: detail */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-400">Loading patient…</div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center text-gray-400">
              <User className="h-10 w-10 mb-2 text-gray-300" />
              <p className="text-sm">Select a patient to view their prescriptions and history.</p>
            </div>
          ) : (
            <PatientDetail detail={detail} />
          )}
        </div>
      </div>
    </div>
  )
}

function PatientDetail({ detail }) {
  const { patient, appointments, prescriptions } = detail
  const ageSex = [patient.age ? `${patient.age} yrs` : '', patient.gender].filter(Boolean).join(' / ')
  const address = [patient.address, patient.city, patient.state, patient.pincode].filter(Boolean).join(', ')

  const [viewRx, setViewRx] = useState(null)

  // Map appointment id -> type so each prescription can show its visit type.
  const apptTypeById = {}
  appointments.forEach((a) => {
    apptTypeById[a.id] = a.type
  })

  return (
    <div>
      {/* Patient header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
            <p className="text-[12px] font-mono text-gray-500">{patient.registrationNo}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-gray-600">
              {ageSex && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{ageSex}</span>}
              {patient.mobile && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.mobile}</span>}
              {patient.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{patient.email}</span>}
              {address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{address}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Stat icon={CalendarDays} label="Appointments" value={appointments.length} />
          <Stat icon={FileText} label="Prescriptions" value={prescriptions.length} />
        </div>
      </div>

      <div className="p-5 space-y-6 max-h-[calc(100vh-340px)] overflow-y-auto">
        {/* Prescriptions */}
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-700 flex items-center gap-1.5 mb-3">
            <Pill className="h-4 w-4 text-indigo-600" /> Prescriptions
          </h3>
          {prescriptions.length === 0 ? (
            <p className="text-[13px] text-gray-400">No prescriptions yet.</p>
          ) : (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Prescribed</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Follow-up</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx.id} className="border-t border-gray-50 hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {fmtDate(rx.issuedAt || rx.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {apptTypeLabel(apptTypeById[rx.appointmentId])}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {rx.followUpDate ? fmtDate(rx.followUpDate) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          className={cn(
                            'text-[10px] uppercase tracking-wide font-semibold',
                            RX_BADGE[rx.status] || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {rx.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[12px] text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => setViewRx(rx)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Appointments */}
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-700 flex items-center gap-1.5 mb-3">
            <ClipboardList className="h-4 w-4 text-indigo-600" /> Appointment History
          </h3>
          {appointments.length === 0 ? (
            <p className="text-[13px] text-gray-400">No appointments.</p>
          ) : (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-50 last:border-b-0 text-[13px]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{fmtDate(a.date)} {a.slot ? `· ${a.slot}` : ''}</p>
                    <p className="text-[12px] text-gray-500 truncate">
                      <span className="font-medium text-gray-600">{apptTypeLabel(a.type)}</span>
                      {a.department ? ` · ${a.department}` : ''}{a.reason ? ` — ${a.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[11px] capitalize">{a.status || 'scheduled'}</Badge>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-indigo-700 text-[12px]">
                      <Link href={`/dashboard/doctor/appointments/${a.id}/prescribe`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Prescription view modal */}
      <Dialog open={!!viewRx} onOpenChange={(open) => !open && setViewRx(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-indigo-600" />
              Prescription
              {viewRx && (
                <Badge
                  className={cn(
                    'text-[10px] uppercase tracking-wide font-semibold',
                    RX_BADGE[viewRx.status] || 'bg-slate-100 text-slate-600'
                  )}
                >
                  {viewRx.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewRx && (
            <PrescriptionDetail rx={viewRx} type={apptTypeLabel(apptTypeById[viewRx.appointmentId])} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <Icon className="h-4 w-4 text-indigo-600" />
      <div>
        <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function PrescriptionDetail({ rx, type }) {
  const items = rx.values.filter((v) => v.rendered)

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="grid grid-cols-3 gap-2">
        <MetaCell label="Prescribed" value={fmtDate(rx.issuedAt || rx.createdAt)} />
        <MetaCell label="Type" value={type} />
        <MetaCell label="Follow-up" value={rx.followUpDate ? fmtDate(rx.followUpDate) : '—'} />
      </div>

      {/* Field values as a clean table */}
      {items.length === 0 ? (
        <p className="text-[13px] text-gray-400">No recorded details.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              {items.map((v, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-3 py-2 text-gray-500 w-2/5 align-top">{v.label}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 align-top">{v.rendered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rx.appointmentId && (
        <div className="flex justify-end pt-1">
          <Button asChild size="sm" variant="outline" className="h-8 text-[12px] text-indigo-700 border-indigo-200 hover:bg-indigo-50">
            <Link href={`/dashboard/doctor/appointments/${rx.appointmentId}/prescribe`}>Open in editor</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function MetaCell({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
