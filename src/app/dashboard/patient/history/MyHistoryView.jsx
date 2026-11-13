'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Stethoscope, Clock, Pill, Receipt, FileText, Loader2, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { getMyVisitHistory, getMyInvoice } from '@/actions/patients'
import { getMyPrescriptionDocument } from '@/actions/prescriptions'
import { InvoiceView } from '@/components/invoices/InvoiceView'
import {
  PrescriptionPreviewModal,
  buildPreviewSections,
} from '@/components/prescriptions/AppointmentCustomPrescriptionComposer'
import {
  Empty, STATUS_BADGE, STATUS_LABEL, money, fmtDate,
} from '@/components/patients/portal-ui'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'past', label: 'Past visits' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'cancelled', label: 'Cancelled' },
]

const INVOICE_STATUS = {
  paid: 'bg-green-100 text-green-800 border border-green-200',
  partial: 'bg-amber-100 text-amber-800 border border-amber-200',
  unpaid: 'bg-rose-100 text-rose-800 border border-rose-200',
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function tabFor(visit, today) {
  if (visit.status === 'cancelled') return 'cancelled'
  return (visit.appointment_date || '') >= today && visit.status !== 'completed' ? 'upcoming' : 'past'
}

export default function MyHistoryView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('past')
  const [hospital, setHospital] = useState('all')

  // Open documents
  const [invoiceDoc, setInvoiceDoc] = useState(null) // { invoice, hospital }
  const [rxDoc, setRxDoc] = useState(null) // getMyPrescriptionDocument result
  const [opening, setOpening] = useState(null) // id being loaded

  useEffect(() => {
    let cancelled = false
    getMyVisitHistory().then((res) => {
      if (cancelled) return
      if (res.success) setData(res)
      else toast.error(res.error || 'Failed to load your history')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const today = todayIso()
  const visits = data?.visits || []

  const hospitals = useMemo(() => {
    const map = new Map()
    for (const v of visits) map.set(v.hospital_id, v.hospital?.name || v.hospital_id)
    for (const p of data?.otherPrescriptions || []) map.set(p.hospital_id, p.hospital?.name || p.hospital_id)
    return [...map.entries()].map(([id, name]) => ({ id, name: String(name).trim() }))
  }, [visits, data])

  const counts = useMemo(() => {
    const c = { past: 0, upcoming: 0, cancelled: 0 }
    for (const v of visits) if (hospital === 'all' || v.hospital_id === hospital) c[tabFor(v, today)]++
    return c
  }, [visits, hospital, today])

  const shown = useMemo(() => {
    const list = visits.filter(
      (v) => tabFor(v, today) === tab && (hospital === 'all' || v.hospital_id === hospital)
    )
    // Upcoming reads soonest first; history reads newest first.
    return tab === 'upcoming'
      ? [...list].sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || ''))
      : list
  }, [visits, tab, hospital, today])

  const otherRx = (data?.otherPrescriptions || []).filter((p) => hospital === 'all' || p.hospital_id === hospital)
  const otherInv = (data?.otherInvoices || []).filter((i) => hospital === 'all' || i.hospital_id === hospital)

  const openInvoice = async (id) => {
    setOpening(id)
    const res = await getMyInvoice(id)
    setOpening(null)
    if (!res.success) { toast.error(res.error || 'Could not open the invoice'); return }
    setInvoiceDoc(res)
  }

  const openPrescription = async (id) => {
    setOpening(id)
    const res = await getMyPrescriptionDocument(id)
    setOpening(null)
    if (!res.success) { toast.error(res.error || 'Could not open the prescription'); return }
    setRxDoc(res)
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your history…</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every visit, with its prescription and invoice. Open any of them to view, print or download.
        </p>
      </div>

      {/* Tabs + hospital filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 sm:inline-grid sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t.label} <span className="text-gray-400">({counts[t.value]})</span>
            </button>
          ))}
        </div>
        {hospitals.length > 1 && (
          <Select value={hospital} onValueChange={setHospital}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All hospitals</SelectItem>
              {hospitals.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Visits */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <Empty>
            {tab === 'past' ? 'No past visits yet.' : tab === 'upcoming' ? 'No upcoming appointments.' : 'No cancelled appointments.'}
          </Empty>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((v) => (
            <VisitCard
              key={v.id}
              visit={v}
              opening={opening}
              onOpenInvoice={openInvoice}
              onOpenPrescription={openPrescription}
            />
          ))}
        </div>
      )}

      {/* Documents not attached to a visit */}
      {(otherRx.length > 0 || otherInv.length > 0) && tab === 'past' && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" /> Other documents
          </h2>
          {otherRx.map((p) => (
            <PrescriptionLine key={p.id} p={p} opening={opening} onOpen={openPrescription} showHospital />
          ))}
          {otherInv.map((i) => (
            <InvoiceLine key={i.id} inv={i} opening={opening} onOpen={openInvoice} />
          ))}
        </div>
      )}

      {/* Invoice viewer */}
      <Dialog open={Boolean(invoiceDoc)} onOpenChange={(o) => !o && setInvoiceDoc(null)}>
        {invoiceDoc && (
          <DialogContent fullScreenOnMobile className="sm:max-w-4xl h-[85vh] flex flex-col overflow-hidden p-0 sm:p-0">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 pr-12">
              <DialogTitle className="text-left text-base sm:text-lg break-all">
                Invoice {invoiceDoc.invoice.id}
              </DialogTitle>
            </DialogHeader>
            <div className="px-3 sm:px-6 pb-4 sm:pb-6 flex-1 overflow-y-auto min-h-0">
              <InvoiceView
                invoice={invoiceDoc.invoice}
                hospital={invoiceDoc.hospital}
                patient={invoiceDoc.invoice.patients}
                onClose={() => setInvoiceDoc(null)}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Prescription viewer (same document the doctor issued) */}
      {rxDoc && (
        <PrescriptionPreviewModal
          title="Prescription"
          onClose={() => setRxDoc(null)}
          previewSections={buildPreviewSections(rxDoc.template, rxDoc.rows)}
          hospital={rxDoc.hospital}
          doctor={rxDoc.doctor}
          patient={rxDoc.patient}
          appointment={rxDoc.appointment}
          appointmentId={rxDoc.appointmentId}
          issuedAt={rxDoc.issuedAt}
          allowShare={false}
        />
      )}
    </div>
  )
}

function VisitCard({ visit: v, opening, onOpenInvoice, onOpenPrescription }) {
  const date = v.appointment_date ? new Date(`${v.appointment_date}T00:00:00`) : null
  const badge = STATUS_BADGE[v.status] || 'bg-gray-100 text-gray-700 border border-gray-200'
  const label = STATUS_LABEL[v.status] || (v.status || 'scheduled').replace('_', ' ')
  const isCancelled = v.status === 'cancelled'

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
        {/* Date block */}
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
          {date ? (
            <>
              <span className="text-[10px] sm:text-xs font-semibold uppercase">
                {date.toLocaleDateString('en-IN', { month: 'short' })}
              </span>
              <span className="text-lg sm:text-xl font-bold leading-none">{date.getDate()}</span>
              <span className="text-[10px] text-indigo-500">{date.getFullYear()}</span>
            </>
          ) : '—'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm sm:text-base font-semibold text-gray-900 wrap-anywhere">
              {v.doctor?.name ? `Dr. ${v.doctor.name.trim()}` : 'Appointment'}
            </p>
            <Badge className={`text-[10px] uppercase ${badge}`}>{label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />{(v.hospital?.name || v.hospital_id || '').trim()}
            </span>
            {v.department?.name && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />{v.department.name}
              </span>
            )}
            {v.appointment_slot && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{v.appointment_slot}</span>
            )}
            {v.appointment_type && <span className="capitalize">{v.appointment_type}</span>}
          </p>
          {v.reason && <p className="mt-1 text-xs text-gray-600 wrap-anywhere">Reason: {v.reason}</p>}
          {isCancelled && v.cancellation_reason && (
            <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1.5 wrap-anywhere">
              {v.cancellation_reason}
            </p>
          )}
        </div>
      </div>

      {!isCancelled && (
        <div className="border-t border-gray-100 bg-slate-50/60 px-3 py-2 sm:px-4 space-y-1.5">
          {v.prescriptions.length > 0 ? (
            v.prescriptions.map((p) => (
              <PrescriptionLine key={p.id} p={p} opening={opening} onOpen={onOpenPrescription} />
            ))
          ) : (
            <DocMissing icon={Pill} text="No prescription for this visit yet" />
          )}
          {v.invoices.length > 0 ? (
            v.invoices.map((i) => <InvoiceLine key={i.id} inv={i} opening={opening} onOpen={onOpenInvoice} />)
          ) : (
            <DocMissing icon={Receipt} text="No invoice for this visit yet" />
          )}
        </div>
      )}
    </div>
  )
}

function DocMissing({ icon: Icon, text }) {
  return (
    <p className="flex items-center gap-2 py-1 text-xs text-gray-400">
      <Icon className="h-3.5 w-3.5" /> {text}
    </p>
  )
}

function OpenButton({ busy, onClick, label }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={busy} className="h-8 shrink-0 gap-1.5 bg-white">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}

function PrescriptionLine({ p, opening, onOpen, showHospital = false }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <Pill className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          Prescription
          {p.status === 'amended' && (
            <Badge className="ml-2 text-[10px] uppercase bg-amber-100 text-amber-800 border border-amber-200">Amended</Badge>
          )}
        </p>
        <p className="text-xs text-gray-500 wrap-anywhere">
          Issued {fmtDate(p.issued_at || p.created_at)}
          {p.follow_up_date && <> · <span className="text-indigo-600">Follow-up {fmtDate(p.follow_up_date)}</span></>}
          {showHospital && p.hospital?.name && <> · {p.hospital.name.trim()}</>}
          {showHospital && p.doctor?.name && <> · Dr. {p.doctor.name.trim()}</>}
        </p>
      </div>
      <OpenButton busy={opening === p.id} onClick={() => onOpen(p.id)} label="View" />
    </div>
  )
}

function InvoiceLine({ inv, opening, onOpen }) {
  const status = inv.payment_status || 'unpaid'
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Receipt className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
          <span className="font-mono">{inv.id}</span>
          <Badge className={`text-[10px] uppercase ${INVOICE_STATUS[status] || INVOICE_STATUS.unpaid}`}>{status}</Badge>
        </p>
        <p className="text-xs text-gray-500">
          {money(inv.total_amount)} total
          {Number(inv.due_amount) > 0 && <> · <span className="text-rose-600">{money(inv.due_amount)} due</span></>}
          {' · '}{fmtDate(inv.created_at)}
        </p>
      </div>
      <OpenButton busy={opening === inv.id} onClick={() => onOpen(inv.id)} label="View" />
    </div>
  )
}
