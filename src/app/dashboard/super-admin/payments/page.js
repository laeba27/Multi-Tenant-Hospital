'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IndianRupee, CalendarClock, AlertTriangle, CheckCircle2, Search, RefreshCcw, Plus, Settings2,
  History, Trash2, Download, Building2,
} from 'lucide-react'
import { toast } from 'sonner'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  getSubscriptionsOverview, saveHospitalSubscription, recordSubscriptionPayment, deleteSubscriptionPayment,
} from '@/actions/platform'
import { BILLING_CYCLES, SUBSCRIPTION_STATUS, periodFor } from '@/lib/finance/subscriptions'
import { toCsv, downloadCsv, dateStamp } from '@/lib/utils/csv-export'
import {
  money, titleCase, fmtDate, StatCard, Panel, EmptyState, Pill, OptionSelect,
} from '@/components/finance/shared'

const METHODS = ['bank_transfer', 'upi', 'cash', 'cheque', 'card', 'other']
const FILTERS = [
  { value: 'all', label: 'All hospitals' },
  { value: 'attention', label: 'Due or overdue' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid up' },
  { value: 'no_plan', label: 'No plan' },
  { value: 'inactive', label: 'Paused / cancelled' },
]
const ORDER = { overdue: 0, due: 1, paid: 2, no_plan: 3, paused: 4, cancelled: 5 }

export default function SuperAdminPaymentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [planFor, setPlanFor] = useState(null)
  const [payFor, setPayFor] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSubscriptionsOverview()
    if (!res.success) toast.error(res.error || 'Could not load payments')
    else setData(res)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Keep an open history dialog in step with fresh data.
  useEffect(() => {
    if (historyFor && data) setHistoryFor(data.rows.find((r) => r.hospitalId === historyFor.hospitalId) || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const rows = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    return data.rows
      .filter((r) => {
        const st = r.standing.status
        if (filter === 'attention' && !['due', 'overdue'].includes(st)) return false
        if (filter === 'inactive' && !['paused', 'cancelled'].includes(st)) return false
        if (!['all', 'attention', 'inactive'].includes(filter) && st !== filter) return false
        return !needle || [r.name, r.hospitalId, r.city, r.contact].some((v) => String(v || '').toLowerCase().includes(needle))
      })
      .sort((a, b) => ORDER[a.standing.status] - ORDER[b.standing.status] || b.standing.amountOwed - a.standing.amountOwed || a.name.localeCompare(b.name))
  }, [data, q, filter])

  const s = data?.summary

  const exportRows = () => {
    if (!rows.length) { toast.info('Nothing to export'); return }
    downloadCsv(`hospital-subscriptions-${dateStamp()}.csv`, toCsv([
      ['Hospital', 'ID', 'City', 'Contact', 'Plan', 'Fee', 'Cycle', 'Status', 'Paid through', 'Next due', 'Days late', 'Amount owed', 'Total paid', 'Last payment'],
      ...rows.map((r) => [
        r.name, r.hospitalId, r.city, r.contact, r.plan?.plan_name || '', r.plan?.amount ?? '', r.plan ? BILLING_CYCLES[r.plan.billing_cycle]?.label : '',
        SUBSCRIPTION_STATUS[r.standing.status].label, r.standing.paidThrough || '', r.standing.nextDue || '', r.standing.daysLate,
        r.standing.amountOwed, r.standing.totalPaid, r.standing.lastPayment?.paid_on || '',
      ]),
    ]))
  }

  return (
    <DashboardLayout showHeader>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hospital Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              What each hospital pays for the portal, and who has paid, who is due and who is overdue.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportRows}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading} aria-label="Refresh">
              <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        {!data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl border border-gray-100 bg-white animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Collected this month" value={money(s.collectedThisMonth)} icon={IndianRupee} tone="emerald" sub={`${money(s.collectedAllTime)} all time`} />
              <StatCard label="Expected per month" value={money(s.expectedMonthly)} icon={CalendarClock} tone="blue" sub="All active plans, per month" />
              <StatCard label="Owed to you" value={money(s.outstanding)} icon={AlertTriangle} tone={s.outstanding > 0 ? 'rose' : 'emerald'}
                sub={`${s.overdue} overdue · ${s.due} due`} />
              <StatCard label="Paid up" value={`${s.paid} / ${data.rows.length}`} icon={CheckCircle2} tone="indigo"
                sub={`${s.noPlan} without a plan${s.inactive ? ` · ${s.inactive} paused/cancelled` : ''}`} />
            </div>

            <Panel bodyClassName="p-0">
              <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hospital, ID, city, email…" className="pl-8 h-9 text-[13px]" />
                </div>
                <OptionSelect value={filter} onChange={setFilter} options={FILTERS} className="sm:w-48" />
              </div>
              {rows.length === 0 ? (
                <div className="p-4"><EmptyState>No hospitals match.</EmptyState></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Hospital</TableHead>
                      <TableHead className="hidden md:table-cell">Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Paid through</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Owed</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => <HospitalRow key={r.hospitalId} row={r} onPlan={setPlanFor} onPay={setPayFor} onHistory={setHistoryFor} />)}
                  </TableBody>
                </Table>
              )}
            </Panel>
            <p className="text-[11px] text-gray-400">
              A hospital is paid up until the end of the last period it paid for. After that it&apos;s due, and overdue once the plan&apos;s grace days pass.
            </p>
          </>
        )}
      </div>

      <PlanDialog row={planFor} today={data?.today} onClose={() => setPlanFor(null)} onSaved={load} />
      <PaymentDialog row={payFor} today={data?.today} onClose={() => setPayFor(null)} onSaved={load} />
      <HistoryDialog row={historyFor} onClose={() => setHistoryFor(null)} onChanged={load} />
    </DashboardLayout>
  )
}

function HospitalRow({ row, onPlan, onPay, onHistory }) {
  const st = SUBSCRIPTION_STATUS[row.standing.status]
  const { standing, plan } = row
  return (
    <TableRow>
      <TableCell className="pl-4 whitespace-normal min-w-40">
        <p className="text-[13px] font-semibold text-gray-900">{row.name}</p>
        <p className="text-[11px] text-gray-400"><span className="font-mono">{row.hospitalId}</span>{row.city ? ` · ${row.city}` : ''}</p>
        {plan && <p className="md:hidden text-[11px] text-gray-500">{money(plan.amount)} {BILLING_CYCLES[plan.billing_cycle]?.label.toLowerCase()}</p>}
      </TableCell>
      <TableCell className="hidden md:table-cell text-[13px]">
        {plan ? (
          <>
            <span className="text-gray-900">{plan.plan_name}</span>
            <span className="block text-[11px] text-gray-500">{money(plan.amount)} · {BILLING_CYCLES[plan.billing_cycle]?.label}</span>
          </>
        ) : <span className="text-gray-400">—</span>}
      </TableCell>
      <TableCell className="whitespace-normal">
        <Pill tone={st.tone}>{st.label}</Pill>
        {['due', 'overdue'].includes(standing.status) && (
          <span className="block text-[11px] text-gray-500 mt-0.5">
            {standing.daysLate === 0 ? 'Due today' : `${standing.daysLate} day${standing.daysLate === 1 ? '' : 's'} late`}
          </span>
        )}
        {standing.status === 'paid' && standing.nextDue && (
          <span className="block text-[11px] text-gray-400 mt-0.5">Next due {fmtDate(standing.nextDue)}</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-[12px] text-gray-600">
        {standing.paidThrough ? fmtDate(standing.paidThrough) : plan ? 'Nothing paid yet' : '—'}
        {standing.lastPayment && <span className="block text-[11px] text-gray-400">Last paid {fmtDate(standing.lastPayment.paid_on)}</span>}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-right tabular-nums whitespace-nowrap">
        {standing.amountOwed > 0 ? (
          <>
            <span className="font-semibold text-rose-700">{money(standing.amountOwed)}</span>
            <span className="block text-[11px] text-gray-400">{standing.cyclesOwed} period{standing.cyclesOwed === 1 ? '' : 's'}</span>
          </>
        ) : <span className="text-gray-400">—</span>}
      </TableCell>
      <TableCell className="text-right pr-4">
        <div className="flex justify-end gap-1">
          {plan && !['paused', 'cancelled'].includes(plan.status) && (
            <Button size="sm" className="h-8 gap-1 text-[12px] bg-emerald-600 hover:bg-emerald-700" onClick={() => onPay(row)}>
              <Plus className="h-3.5 w-3.5" /> Payment
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1 text-[12px]" onClick={() => onPlan(row)} title={plan ? 'Edit plan' : 'Set plan'}>
            <Settings2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{plan ? 'Plan' : 'Set plan'}</span>
          </Button>
          {row.payments.length > 0 && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onHistory(row)} aria-label="Payment history" title="Payment history">
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function PlanDialog({ row, today, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!row) return
    const p = row.plan
    setForm({
      planName: p?.plan_name || 'Standard',
      amount: p ? String(p.amount) : '',
      billingCycle: p?.billing_cycle || 'monthly',
      startDate: p?.start_date || (today ? `${today.slice(0, 7)}-01` : ''),
      graceDays: String(p?.grace_days ?? 7),
      status: p?.status || 'active',
      notes: p?.notes || '',
    })
  }, [row, today])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await saveHospitalSubscription({ hospitalId: row.hospitalId, ...form, amount: Number(form.amount), graceDays: Number(form.graceDays) })
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(`Plan saved for ${row.name}`)
    onClose()
    onSaved()
  }

  return (
    <Dialog open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-600" /> {row?.plan ? 'Edit plan' : 'Set plan'}</DialogTitle>
          <DialogDescription>{row?.name} · {row?.hospitalId}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan name"><Input value={form.planName || ''} onChange={(e) => set('planName', e.target.value)} placeholder="e.g. Standard" /></Field>
            <Field label="Fee (₹) *"><Input type="number" min="0" step="0.01" required value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} placeholder="e.g. 2000" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billed">
              <OptionSelect value={form.billingCycle || 'monthly'} onChange={(v) => set('billingCycle', v)}
                options={Object.entries(BILLING_CYCLES).map(([value, c]) => ({ value, label: c.label }))} />
            </Field>
            <Field label="Billing starts" hint="The first period begins on this date.">
              <Input type="date" required value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grace days" hint="Days after the due date before it counts as overdue.">
              <Input type="number" min="0" max="90" value={form.graceDays || '0'} onChange={(e) => set('graceDays', e.target.value)} />
            </Field>
            <Field label="Status">
              <OptionSelect value={form.status || 'active'} onChange={(v) => set('status', v)}
                options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused (not billing)' }, { value: 'cancelled', label: 'Cancelled' }]} />
            </Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Optional, e.g. discounted first year" /></Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDialog({ row, today, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!row?.plan) return
    const cycles = Math.max(row.standing.cyclesOwed, 1)
    setForm({
      cycles: String(cycles),
      amount: String(Number(row.plan.amount) * cycles),
      paidOn: today || '',
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: '',
    })
  }, [row, today])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const cycles = Math.min(Math.max(parseInt(form.cycles, 10) || 1, 1), 24)
  const period = row?.plan && row.standing.nextDue ? periodFor(row.standing.nextDue, row.plan.billing_cycle, cycles) : null

  const setCycles = (v) => {
    const n = Math.min(Math.max(parseInt(v, 10) || 1, 1), 24)
    setForm((f) => ({ ...f, cycles: v, amount: String(Number(row.plan.amount) * n) }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await recordSubscriptionPayment({ hospitalId: row.hospitalId, ...form, cycles, amount: Number(form.amount) })
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(`Payment recorded · covers ${fmtDate(res.periodStart)} – ${fmtDate(res.periodEnd)}`)
    onClose()
    onSaved()
  }

  return (
    <Dialog open={Boolean(row?.plan)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {row?.name} · {row?.plan && `${money(row.plan.amount)} ${BILLING_CYCLES[row.plan.billing_cycle]?.label.toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Periods paid for" hint={row?.standing.cyclesOwed > 1 ? `${row.standing.cyclesOwed} are unpaid` : null}>
              <Input type="number" min="1" max="24" value={form.cycles || '1'} onChange={(e) => setCycles(e.target.value)} />
            </Field>
            <Field label="Amount received (₹) *">
              <Input type="number" min="0.01" step="0.01" required value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} />
            </Field>
          </div>
          {period && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
              Covers <strong>{fmtDate(period.start)}</strong> to <strong>{fmtDate(period.end)}</strong>. The hospital will be paid up until then.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid on"><Input type="date" value={form.paidOn || ''} onChange={(e) => set('paidOn', e.target.value)} /></Field>
            <Field label="Method">
              <OptionSelect value={form.paymentMethod || 'bank_transfer'} onChange={(v) => set('paymentMethod', v)}
                options={METHODS.map((m) => ({ value: m, label: titleCase(m).replace('Upi', 'UPI') }))} />
            </Field>
          </div>
          <Field label="Reference / transaction ID"><Input value={form.reference || ''} onChange={(e) => set('reference', e.target.value)} placeholder="Optional" /></Field>
          <Field label="Notes"><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" /></Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Saving…' : 'Record payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDialog({ row, onClose, onChanged }) {
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)
  const remove = async (id) => {
    setBusy(true)
    const res = await deleteSubscriptionPayment(id)
    setBusy(false)
    setConfirmId(null)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Payment removed')
    onChanged()
  }
  return (
    <Dialog open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment history</DialogTitle>
          <DialogDescription>{row?.name} · {money(row?.standing.totalPaid)} paid in total</DialogDescription>
        </DialogHeader>
        {!row?.payments.length ? <EmptyState>No payments yet.</EmptyState> : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Covers</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-[12px] whitespace-normal">
                      {fmtDate(p.paid_on)}
                      <span className="block text-[11px] text-gray-400">
                        {[p.payment_method && titleCase(p.payment_method).replace('Upi', 'UPI'), p.reference, p.recorded_by_name && `by ${p.recorded_by_name}`].filter(Boolean).join(' · ')}
                      </span>
                      {p.notes && <span className="block text-[11px] text-gray-400">{p.notes}</span>}
                    </TableCell>
                    <TableCell className="text-[12px] text-gray-600 whitespace-normal">{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">{money(p.amount, { decimals: 2 })}</TableCell>
                    <TableCell>
                      {confirmId === p.id ? (
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => remove(p.id)}>Delete</Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-rose-600" aria-label="Delete payment" onClick={() => setConfirmId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
