'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { createFinanceTransaction, deleteFinanceTransaction, collectInvoicePayment } from '@/actions/finance'
import { money, fmtDate, titleCase, EmptyState } from '@/components/finance/shared'

export const INCOMING_CATEGORIES = ['fund', 'banking', 'donation', 'grant', 'other']
export const OUTGOING_CATEGORIES = ['salary', 'investment', 'utilities', 'supplies', 'other']
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other']

const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)

export function LedgerTable({ rows, direction, emptyHint, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const remove = async (id) => {
    setDeletingId(id)
    const res = await deleteFinanceTransaction(id)
    setDeletingId(null)
    setConfirmId(null)
    if (!res.success) { toast.error(res.error || 'Failed to delete'); return }
    toast.success('Entry removed')
    onDeleted()
  }

  if (!rows.length) return <EmptyState>{emptyHint}</EmptyState>

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>{direction === 'outgoing' ? 'Paid to' : 'Received from'}</TableHead>
            <TableHead className="hidden md:table-cell">Method</TableHead>
            <TableHead className="hidden lg:table-cell">Recorded by</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-[13px] text-gray-600 whitespace-nowrap">{fmtDate(t.transaction_date)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-[11px]">{t.category}</Badge>
              </TableCell>
              <TableCell className="text-[13px] text-gray-800 min-w-32 whitespace-normal">
                {t.party || t.staff_name || '—'}
                {t.reference && <span className="block text-[11px] text-gray-400">Ref: {t.reference}</span>}
                {t.notes && <span className="block text-[11px] text-gray-400">{t.notes}</span>}
              </TableCell>
              <TableCell className="hidden md:table-cell text-[13px] text-gray-600">
                {t.payment_method ? titleCase(t.payment_method) : '—'}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-[12px] text-gray-500">{t.created_by_name || '—'}</TableCell>
              <TableCell className={`text-right font-semibold whitespace-nowrap tabular-nums ${direction === 'outgoing' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {direction === 'outgoing' ? '−' : '+'}{money(t.amount, { decimals: 2 })}
              </TableCell>
              <TableCell>
                {confirmId === t.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" disabled={deletingId === t.id} onClick={() => remove(t.id)}>
                      {deletingId === t.id ? '…' : 'Delete'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setConfirmId(null)}>No</Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-600"
                    aria-label="Delete entry" onClick={() => setConfirmId(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const EMPTY_FORM = {
  category: '', party: '', amount: '', payment_method: '', reference: '', notes: '', transaction_date: '', staff_id: '',
}

/**
 * Record money in or out. `preset` pre-fills it, e.g. paying one staff
 * member's salary from the Payroll tab: { category: 'salary', staff_id, amount }.
 */
export function TransactionDialog({ direction, preset = null, staffOptions = [], onClose, onCreated }) {
  const open = direction !== null
  const isOut = direction === 'outgoing'
  const categories = isOut ? OUTGOING_CATEGORIES : INCOMING_CATEGORIES
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        category: categories[0],
        transaction_date: todayIst(),
        ...(preset || {}),
        amount: preset?.amount ? String(preset.amount) : '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, direction, preset])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const isSalary = isOut && form.category === 'salary'

  const pickStaff = (id) => {
    const s = staffOptions.find((x) => x.id === id)
    setForm((p) => ({
      ...p,
      staff_id: id,
      party: s?.name || p.party,
      amount: p.amount || (s?.salary ? String(s.salary) : ''),
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSaving(true)
    const res = await createFinanceTransaction({ ...form, staff_id: isSalary ? form.staff_id || null : null, direction })
    setSaving(false)
    if (!res.success) { toast.error(res.error || 'Failed to save'); return }
    toast.success(isOut ? 'Outgoing entry recorded' : 'Incoming entry recorded')
    onClose()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isOut ? 'Record money paid out' : 'Record money received'}</DialogTitle>
          <DialogDescription>
            {isOut
              ? 'Salaries, supplies, utilities, rent or anything else the hospital pays for.'
              : 'Money that did not come from a patient invoice: funds, loans, donations, grants.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="h-9 text-[13px] capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Amount (₹) *</Label>
              <Input
                type="number" min="0" step="0.01" value={form.amount}
                onChange={(e) => set('amount', e.target.value)} required placeholder="0.00"
              />
            </div>
          </div>

          {isSalary && staffOptions.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Staff member</Label>
              <Select value={form.staff_id || ''} onValueChange={pickStaff}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Who is this salary for?" /></SelectTrigger>
                <SelectContent>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[13px]">
                      {s.name}{s.role ? ` · ${titleCase(s.role)}` : ''}{s.salary ? ` · ${money(s.salary)}/month` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400">Linking the staff member marks them as paid on the Payroll tab.</p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">{isOut ? 'Paid to' : 'Received from'}</Label>
            <Input
              value={form.party} onChange={(e) => set('party', e.target.value)}
              placeholder={isOut ? 'e.g. ABC Suppliers, Electricity board' : 'e.g. Donor name, Bank'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Date</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => set('transaction_date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Payment method</Label>
              <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{titleCase(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Reference / cheque no.</Label>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Optional" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Take a payment against an unpaid invoice. `dues` is the Finance page's list
 * of invoices still owing; `invoiceId` pre-selects one (the Dues tab's
 * Collect button).
 */
export function CollectPaymentDialog({ open, dues = [], invoiceId = null, onClose, onSaved }) {
  const [form, setForm] = useState({ invoiceId: '', amount: '', method: 'cash', reference: '', paidOn: '' })
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const pre = dues.find((d) => d.invoiceId === invoiceId)
    setQ('')
    setForm({
      invoiceId: pre?.invoiceId || '',
      amount: pre ? String(Math.round(pre.due * 100) / 100) : '',
      method: 'cash',
      reference: '',
      paidOn: todayIst(),
    })
  }, [open, invoiceId, dues])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const selected = dues.find((d) => d.invoiceId === form.invoiceId) || null
  const needle = q.trim().toLowerCase()
  const options = dues.filter((d) => !needle || [d.patientName, d.invoiceId, d.mobile, d.patientId].some((v) => String(v || '').toLowerCase().includes(needle)))

  const pick = (d) => setForm((f) => ({ ...f, invoiceId: d.invoiceId, amount: String(Math.round(d.due * 100) / 100) }))

  const submit = async (e) => {
    e.preventDefault()
    if (!selected) { toast.error('Choose the invoice being paid'); return }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) { toast.error('Enter the amount received'); return }
    if (amount > selected.due + 0.01) { toast.error(`Only ${money(selected.due, { decimals: 2 })} is due on this invoice`); return }
    setSaving(true)
    const res = await collectInvoicePayment({ invoiceId: selected.invoiceId, amount, method: form.method, reference: form.reference, paidOn: form.paidOn })
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.due > 0 ? `Payment recorded · ${money(res.due, { decimals: 2 })} still due` : 'Payment recorded · invoice fully paid')
    onClose()
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record patient payment</DialogTitle>
          <DialogDescription>Money a patient paid against an invoice that is still due.</DialogDescription>
        </DialogHeader>
        {dues.length === 0 ? (
          <div className="space-y-3">
            <EmptyState>Every invoice is paid in full. New invoices are raised from appointments at the reception Billing desk.</EmptyState>
            <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Invoice *</Label>
              {selected ? (
                <div className="flex items-start justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
                  <div className="min-w-0 text-[13px]">
                    <p className="font-semibold text-gray-900">{selected.patientName}</p>
                    <p className="text-[11px] text-gray-500">
                      <span className="font-mono">{selected.invoiceId}</span> · {fmtDate(selected.date)} · total {money(selected.total, { decimals: 2 })}, paid {money(selected.paid, { decimals: 2 })}
                    </p>
                    <p className="text-[12px] font-semibold text-amber-700 mt-0.5">{money(selected.due, { decimals: 2 })} due</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => set('invoiceId', '')}>Change</Button>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200">
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, invoice, mobile…" className="h-9 text-[13px] border-0 border-b rounded-b-none focus-visible:ring-0" autoFocus />
                  <ul className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {options.length === 0 && <li className="px-3 py-3 text-[12px] text-gray-400">No unpaid invoice matches.</li>}
                    {options.map((d) => (
                      <li key={d.invoiceId}>
                        <button type="button" onClick={() => pick(d)} className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-[13px] text-gray-900 truncate">{d.patientName}</span>
                            <span className="block text-[11px] text-gray-400"><span className="font-mono">{d.invoiceId}</span> · {d.ageDays} days</span>
                          </span>
                          <span className="shrink-0 text-[12px] font-semibold text-amber-700 tabular-nums">{money(d.due, { decimals: 2 })}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Amount received (₹) *</Label>
                <Input type="number" min="0.01" step="0.01" max={selected ? selected.due : undefined} required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Method</Label>
                <Select value={form.method} onValueChange={(v) => set('method', v)}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'].map((m) => (
                      <SelectItem key={m} value={m}>{titleCase(m).replace('Upi', 'UPI')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Paid on</Label>
                <Input type="date" max={todayIst()} value={form.paidOn} onChange={(e) => set('paidOn', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Reference / UPI ID</Label>
                <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving || !selected} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Saving…' : 'Record payment'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
