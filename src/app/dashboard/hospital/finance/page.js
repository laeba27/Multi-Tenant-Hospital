'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Banknote,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  getFinanceOverview, createFinanceTransaction, deleteFinanceTransaction,
} from '@/actions/finance'

const INCOMING_CATEGORIES = ['fund', 'banking', 'donation', 'grant', 'other']
const OUTGOING_CATEGORIES = ['salary', 'investment', 'utilities', 'supplies', 'other']
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other']

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const today = () => new Date().toISOString().slice(0, 10)

export default function FinancePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialogDir, setDialogDir] = useState(null) // 'incoming' | 'outgoing' | null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFinanceOverview()
      setData(res)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const s = data?.summary

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track money coming in and going out of your hospital.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Incoming" value={money(s?.totalIncoming)}
            icon={TrendingUp} color="text-emerald-600 bg-emerald-50"
            sub={`Patients ${money(s?.patientIncome)} · Other ${money(s?.manualIncoming)}`}
          />
          <SummaryCard
            label="Total Outgoing" value={money(s?.totalOutgoing)}
            icon={TrendingDown} color="text-rose-600 bg-rose-50"
          />
          <SummaryCard
            label="Net Balance" value={money(s?.net)}
            icon={Wallet}
            color={(s?.net ?? 0) >= 0 ? 'text-indigo-600 bg-indigo-50' : 'text-rose-600 bg-rose-50'}
          />
          <SummaryCard
            label="Outstanding Dues" value={money(s?.outstandingDue)}
            icon={Banknote} color="text-amber-600 bg-amber-50"
            sub="Unpaid patient invoices"
          />
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList>
            <TabsTrigger value="incoming" className="gap-1.5">
              <ArrowDownLeft className="h-4 w-4" /> Incoming
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-1.5">
              <ArrowUpRight className="h-4 w-4" /> Outgoing
            </TabsTrigger>
          </TabsList>

          {/* ===== INCOMING ===== */}
          <TabsContent value="incoming" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Patient Appointment Income (auto)</p>
                <p className="text-xl font-bold text-emerald-700">{money(data?.patientIncome)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Calculated from paid patient invoices.
                </p>
              </div>
              <Button onClick={() => setDialogDir('incoming')}>
                <Plus className="h-4 w-4" /> Add Incoming
              </Button>
            </div>

            <LedgerTable
              loading={loading}
              rows={data?.incoming || []}
              direction="incoming"
              emptyHint="No manual incoming entries yet."
              onDeleted={load}
            />
          </TabsContent>

          {/* ===== OUTGOING ===== */}
          <TabsContent value="outgoing" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setDialogDir('outgoing')}>
                <Plus className="h-4 w-4" /> Add Outgoing
              </Button>
            </div>
            <LedgerTable
              loading={loading}
              rows={data?.outgoing || []}
              direction="outgoing"
              emptyHint="No outgoing entries yet. Record salaries, investments, utilities and more."
              onDeleted={load}
            />
          </TabsContent>
        </Tabs>
      </div>

      <TransactionDialog
        direction={dialogDir}
        onClose={() => setDialogDir(null)}
        onCreated={load}
      />
    </DashboardLayout>
  )
}

function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className={`inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function LedgerTable({ loading, rows, direction, emptyHint, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null)

  const remove = async (id) => {
    setDeletingId(id)
    const res = await deleteFinanceTransaction(id)
    setDeletingId(null)
    if (!res.success) { toast.error(res.error || 'Failed to delete'); return }
    toast.success('Entry removed')
    onDeleted()
  }

  if (loading) return <p className="text-sm text-gray-400 px-1">Loading…</p>

  if (!rows.length) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
        {emptyHint}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>{direction === 'outgoing' ? 'Paid To' : 'Received From'}</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-[13px] text-gray-600 whitespace-nowrap">
                {t.transaction_date ? format(new Date(t.transaction_date), 'dd MMM yyyy') : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-[11px]">{t.category}</Badge>
              </TableCell>
              <TableCell className="text-[13px] text-gray-800">
                {t.party || '—'}
                {t.notes && <span className="block text-[11px] text-gray-400">{t.notes}</span>}
              </TableCell>
              <TableCell className="text-[13px] text-gray-600 capitalize">
                {t.payment_method ? t.payment_method.replace('_', ' ') : '—'}
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${direction === 'outgoing' ? 'text-rose-600' : 'text-emerald-600'}`}
              >
                {direction === 'outgoing' ? '-' : '+'}{money(t.amount)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-600"
                  disabled={deletingId === t.id}
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const EMPTY_FORM = {
  category: '', party: '', amount: '', payment_method: '', reference: '', notes: '', transaction_date: '',
}

function TransactionDialog({ direction, onClose, onCreated }) {
  const open = direction !== null
  const isOut = direction === 'outgoing'
  const categories = isOut ? OUTGOING_CATEGORIES : INCOMING_CATEGORIES
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Reset form whenever a fresh dialog opens.
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, category: categories[0], transaction_date: today() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, direction])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSaving(true)
    const res = await createFinanceTransaction({ ...form, direction })
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
          <DialogTitle>{isOut ? 'Record Outgoing Payment' : 'Record Incoming Money'}</DialogTitle>
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

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">
              {isOut ? 'Paid To' : 'Received From'}
            </Label>
            <Input
              value={form.party} onChange={(e) => set('party', e.target.value)}
              placeholder={isOut ? 'e.g. Dr. Mehta (salary), ABC Suppliers' : 'e.g. Donor name, Bank'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Date</Label>
              <Input
                type="date" value={form.transaction_date}
                onChange={(e) => set('transaction_date', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
                <SelectTrigger className="h-9 text-[13px] capitalize">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Reference / Cheque No.</Label>
            <Input
              value={form.reference} onChange={(e) => set('reference', e.target.value)}
              placeholder="Optional reference"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Notes</Label>
            <Textarea
              value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Optional notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
