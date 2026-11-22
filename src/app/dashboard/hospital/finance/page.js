'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus, ArrowDownLeft, ArrowUpRight, Banknote, Receipt,
  Percent, Tag, Users, Package, Download, Search, LayoutDashboard, AlertTriangle, RefreshCcw,
  ChevronDown, PackagePlus, HandCoins,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { toast } from 'sonner'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getFinanceOverview } from '@/actions/finance'
import { toCsv, downloadCsv, dateStamp } from '@/lib/utils/csv-export'
import {
  money, moneyShort, titleCase, fmtDate, fmtDateTime, StatCard, Panel, EmptyState, BarList, Pill,
  OptionSelect, ChartTooltip,
} from '@/components/finance/shared'
import { LedgerTable, TransactionDialog, CollectPaymentDialog } from '@/components/finance/LedgerParts'
import { AddInventoryDialog } from '@/app/dashboard/hospital/inventory/add-inventory-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const RANGES = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const PAYROLL_STATUS = {
  paid: { label: 'Paid', tone: 'emerald' },
  partial: { label: 'Part paid', tone: 'amber' },
  unpaid: { label: 'Not paid', tone: 'rose' },
  no_salary: { label: 'No salary set', tone: 'slate' },
}

const INVOICE_STATUS = {
  paid: { label: 'Paid', tone: 'emerald' },
  partially_paid: { label: 'Part paid', tone: 'amber' },
  unpaid: { label: 'Unpaid', tone: 'rose' },
}

export default function FinancePage() {
  const [range, setRange] = useState('this_month')
  const [payrollMonth, setPayrollMonth] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null) // { direction, preset }
  const [collect, setCollect] = useState(null) // { invoiceId } | null
  const [stockOpen, setStockOpen] = useState(false)
  const [tab, setTab] = useState('overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFinanceOverview({ range, payrollMonth: payrollMonth || null })
      if (!res.success) toast.error(res.error || 'Failed to load finance data')
      else setData(res)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [range, payrollMonth])

  useEffect(() => { load() }, [load])

  const s = data?.summary
  const ch = data?.previous?.change || {}
  const rangeText = data?.range
    ? data.range.from ? `${fmtDate(data.range.from)} – ${fmtDate(data.range.to)}` : `Up to ${fmtDate(data.range.to)}`
    : ''

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Finance</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Collections, dues, expenses, payroll and stock value{rangeText ? ` · ${rangeText}` : ''}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OptionSelect value={range} onChange={setRange} options={RANGES} className="w-40" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700" disabled={!data}>
                  <Plus className="h-4 w-4" /> Add <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setCollect({ invoiceId: null })} className="gap-2">
                  <HandCoins className="h-4 w-4 text-emerald-600" /> Patient payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialog({ direction: 'incoming' })} className="gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-cyan-600" /> Money received
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialog({ direction: 'outgoing' })} className="gap-2">
                  <ArrowUpRight className="h-4 w-4 text-rose-600" /> Money paid out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialog({ direction: 'outgoing', preset: { category: 'salary' } })} className="gap-2">
                  <Users className="h-4 w-4 text-indigo-600" /> Salary payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStockOpen(true)} className="gap-2" disabled={!data?.hospital?.id}>
                  <PackagePlus className="h-4 w-4 text-violet-600" /> Stock item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={load} aria-label="Refresh" disabled={loading}>
              <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        {!data && loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-gray-100 bg-white animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <EmptyState>Couldn&apos;t load finance data. Try refreshing.</EmptyState>
        ) : (
          <>
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <StatCard label="Collected from patients" value={money(s.collected)} icon={TrendingUp} tone="emerald"
                change={ch.collected} sub={`${s.payments} payment${s.payments === 1 ? '' : 's'} received`} />
              <StatCard label="Billed to patients" value={money(s.billed)} icon={Receipt} tone="blue"
                change={ch.billed} sub={`${s.invoices} invoice${s.invoices === 1 ? '' : 's'} · avg ${money(s.avgInvoice)}`} />
              <StatCard label="Other income" value={money(s.otherIncome)} icon={ArrowDownLeft} tone="cyan"
                sub="Funds, loans, donations, grants" />
              <StatCard label="Expenses" value={money(s.expenses)} icon={TrendingDown} tone="rose"
                change={ch.expenses} invertChange sub="Salaries, supplies, utilities…" />
              <StatCard label="Net balance" value={money(s.net)} icon={Wallet} tone={s.net >= 0 ? 'indigo' : 'rose'}
                change={ch.net} sub="Collected + other income − expenses" />
              <StatCard label="Outstanding dues" value={money(s.outstanding)} icon={Banknote} tone="amber"
                sub={`${s.unpaidInvoices} invoice${s.unpaidInvoices === 1 ? '' : 's'} not fully paid (all time)`} />
              <StatCard label="Collection rate" value={s.collectionRate === null ? '—' : `${s.collectionRate}%`} icon={Percent}
                tone={s.collectionRate === null || s.collectionRate >= 90 ? 'emerald' : s.collectionRate >= 70 ? 'amber' : 'rose'}
                sub="Of this period's bills, how much is paid" />
              <StatCard label="Discounts given" value={money(s.discounts)} icon={Tag} tone="violet"
                sub="On this period's invoices" />
            </div>
            {data.previous && (
              <p className="text-[11px] text-gray-400 -mt-2">
                Percentages compare with {fmtDate(data.previous.from)} – {fmtDate(data.previous.to)}.
              </p>
            )}

            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <div className="overflow-x-auto -mx-1 px-1 pb-1">
                <TabsList className="w-max">
                  <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
                  <TabsTrigger value="payments" className="gap-1.5"><Receipt className="h-4 w-4" /> Payments</TabsTrigger>
                  <TabsTrigger value="dues" className="gap-1.5">
                    <Banknote className="h-4 w-4" /> Dues
                    {data.dues.rows.length > 0 && <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">{data.dues.rows.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="ledger" className="gap-1.5"><ArrowUpRight className="h-4 w-4" /> Income &amp; expenses</TabsTrigger>
                  <TabsTrigger value="payroll" className="gap-1.5">
                    <Users className="h-4 w-4" /> Payroll
                    {data.payroll.counts.unpaid + data.payroll.counts.partial > 0 && (
                      <span className="ml-0.5 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">{data.payroll.counts.unpaid + data.payroll.counts.partial}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="gap-1.5"><Package className="h-4 w-4" /> Stock value</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4 mt-3">
                <OverviewTab data={data} />
              </TabsContent>
              <TabsContent value="payments" className="mt-3">
                <PaymentsTab data={data} onRecord={() => setCollect({ invoiceId: null })} />
              </TabsContent>
              <TabsContent value="dues" className="mt-3">
                <DuesTab data={data} onCollect={(invoiceId) => setCollect({ invoiceId })} />
              </TabsContent>
              <TabsContent value="ledger" className="mt-3">
                <LedgerTab data={data} onAdd={(direction) => setDialog({ direction })} onChanged={load} />
              </TabsContent>
              <TabsContent value="payroll" className="mt-3">
                <PayrollTab
                  data={data}
                  month={payrollMonth || data.payroll.month}
                  onMonth={setPayrollMonth}
                  onAddSalary={() => setDialog({ direction: 'outgoing', preset: { category: 'salary' } })}
                  onPay={(row) => setDialog({
                    direction: 'outgoing',
                    preset: { category: 'salary', staff_id: row.staffId, party: row.name, amount: row.balance || row.salary || '', notes: `Salary for ${monthLabel(data.payroll.month)}` },
                  })}
                />
              </TabsContent>
              <TabsContent value="inventory" className="mt-3">
                <InventoryTab data={data} onAdd={() => setStockOpen(true)} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <TransactionDialog
        direction={dialog?.direction ?? null}
        preset={dialog?.preset || null}
        staffOptions={data?.staffOptions || []}
        onClose={() => setDialog(null)}
        onCreated={load}
      />
      <CollectPaymentDialog
        open={Boolean(collect)}
        dues={data?.dues?.rows || []}
        invoiceId={collect?.invoiceId || null}
        onClose={() => setCollect(null)}
        onSaved={load}
      />
      {data?.hospital?.id && (
        <AddInventoryDialog
          open={stockOpen}
          onOpenChange={setStockOpen}
          hospitalId={data.hospital.id}
          departments={data.departments || []}
          onSuccess={load}
        />
      )}
    </DashboardLayout>
  )
}

function monthLabel(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function exportCsv(name, header, rows) {
  if (!rows.length) { toast.info('Nothing to export'); return }
  downloadCsv(`${name}-${dateStamp()}.csv`, toCsv([header, ...rows]))
}

/* ------------------------------------------------------------------ */

function OverviewTab({ data }) {
  const { trend, breakdown, range } = data
  const daily = range.granularity === 'day'
  const fmtKey = (k) => (daily ? fmtDate(k, { day: 'numeric', month: 'short' }) : monthLabel(k))
  const hasTrend = trend.some((t) => t.collected || t.expenses || t.otherIncome || t.billed)

  return (
    <>
      <Panel
        title="Money in and out"
        hint={daily ? 'Day by day' : 'Month by month'}
        bodyClassName="px-2 sm:px-4"
      >
        {!hasTrend ? (
          <EmptyState>No money moved in this period.</EmptyState>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="key" tickFormatter={fmtKey} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<ChartTooltip formatLabel={fmtKey} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collected" name="Collected" stackId="in" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={36} />
                <Bar dataKey="otherIncome" name="Other income" stackId="in" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Line dataKey="billed" name="Billed" type="monotone" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Billed by service" hint="After discounts and tax">
          <BarList rows={breakdown.bySource.map((x) => ({ label: x.name, value: x.amount, tone: x.name === 'Treatments' ? 'violet' : x.name === 'Consultations' ? 'blue' : 'slate' }))} />
        </Panel>
        <Panel title="Top treatments" hint="By amount billed">
          <BarList
            tone="violet"
            rows={breakdown.byTreatment.map((t) => ({ label: t.name, value: t.amount, sub: `${t.count} time${t.count === 1 ? '' : 's'}` }))}
            empty="No treatments billed in this period."
          />
        </Panel>
        <Panel title="How patients paid">
          <BarList
            tone="emerald"
            rows={breakdown.byMethod.map((m) => ({ label: titleCase(m.method).replace('Upi', 'UPI'), value: m.amount, sub: `${m.count} payment${m.count === 1 ? '' : 's'}` }))}
            empty="No payments in this period."
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="By doctor" hint="What each doctor's appointments billed, and what's still unpaid">
          {breakdown.byDoctor.length === 0 ? <EmptyState className="p-6">No invoices in this period.</EmptyState> : (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-gray-400">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-semibold">Doctor</th>
                    <th className="px-2 py-2 text-right font-semibold">Invoices</th>
                    <th className="px-2 py-2 text-right font-semibold">Billed</th>
                    <th className="px-2 py-2 text-right font-semibold">Collected</th>
                    <th className="px-4 py-2 text-right font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.byDoctor.map((d) => (
                    <tr key={d.name}>
                      <td className="px-4 py-2 text-gray-800">{d.name}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-600">{d.invoices}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-900">{money(d.billed)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-emerald-700">{money(d.collected)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${d.due > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>{money(d.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="grid grid-cols-1 gap-4">
          <Panel title="By department">
            <BarList tone="blue" rows={breakdown.byDepartment.map((d) => ({ label: String(d.name).trim(), value: d.amount }))} empty="No invoices in this period." />
          </Panel>
          <Panel title="Where the money went" hint="Expenses by category">
            <BarList tone="rose" rows={breakdown.expensesByCategory.map((c) => ({ label: titleCase(c.category), value: c.amount }))} empty="No expenses recorded in this period." />
          </Panel>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

function PaymentsTab({ data, onRecord }) {
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('all')
  const methods = useMemo(() => [...new Set(data.paymentLog.map((p) => p.method))], [data.paymentLog])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.paymentLog.filter((p) =>
      (method === 'all' || p.method === method) &&
      (!needle || [p.patientName, p.invoiceId, p.reference, p.receivedBy].some((v) => String(v || '').toLowerCase().includes(needle)))
    )
  }, [data.paymentLog, q, method])
  const total = rows.reduce((s, p) => s + p.amount, 0)

  return (
    <Panel
      title="Payments received"
      hint={`${rows.length} payment${rows.length === 1 ? '' : 's'} · ${money(total, { decimals: 2 })}`}
      action={
        <div className="flex gap-2">
        <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={onRecord}>
          <Plus className="h-3.5 w-3.5" /> Record payment
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => exportCsv('payments', ['Date & time', 'Patient', 'Invoice', 'Method', 'Reference', 'Received by', 'Amount'],
          rows.map((p) => [fmtDateTime(p.at), p.patientName, p.invoiceId, titleCase(p.method), p.reference, p.receivedBy || '', p.amount]))}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        </div>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, invoice, reference, staff…" className="pl-8 h-9 text-[13px]" />
        </div>
        <OptionSelect value={method} onChange={setMethod} className="sm:w-40"
          options={[{ value: 'all', label: 'All methods' }, ...methods.map((m) => ({ value: m, label: titleCase(m).replace('Upi', 'UPI') }))]} />
      </div>
      {rows.length === 0 ? <EmptyState>No payments match.</EmptyState> : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden lg:table-cell">Received by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-[12px] text-gray-600 whitespace-nowrap">{fmtDateTime(p.at)}</TableCell>
                  <TableCell className="text-[13px] whitespace-normal min-w-32">
                    <span className="text-gray-900">{p.patientName}</span>
                    <span className="block text-[11px] text-gray-400 font-mono">{p.invoiceId}{p.reference ? ` · Ref ${p.reference}` : ''}</span>
                    <span className="md:hidden text-[11px] text-gray-500">{titleCase(p.method).replace('Upi', 'UPI')}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[13px] text-gray-600">{titleCase(p.method).replace('Upi', 'UPI')}</TableCell>
                  <TableCell className="hidden lg:table-cell text-[12px] text-gray-500">{p.receivedBy || '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">{money(p.amount, { decimals: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

function DuesTab({ data, onCollect }) {
  const { dues } = data
  const buckets = [
    { key: '0-30', label: 'Up to 30 days', tone: 'amber' },
    { key: '31-60', label: '31–60 days', tone: 'amber' },
    { key: '61-90', label: '61–90 days', tone: 'rose' },
    { key: '90+', label: 'Over 90 days', tone: 'rose' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <StatCard key={b.key} label={`Owed for ${b.label.toLowerCase()}`} value={money(dues.aging[b.key], { decimals: 2 })} tone={b.tone} icon={b.tone === 'rose' ? AlertTriangle : Banknote} />
        ))}
      </div>
      <Panel
        title="Patients who still owe"
        hint={`${dues.rows.length} invoice${dues.rows.length === 1 ? '' : 's'} · ${money(dues.total, { decimals: 2 })} in total · oldest first`}
        action={
          <div className="flex gap-2">
          <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onCollect(null)} disabled={!dues.rows.length}>
            <Plus className="h-3.5 w-3.5" /> Record payment
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => exportCsv('dues', ['Patient', 'Patient ID', 'Mobile', 'Invoice', 'Doctor', 'Invoice date', 'Days', 'Total', 'Paid', 'Due'],
            dues.rows.map((d) => [d.patientName, d.patientId, d.mobile, d.invoiceId, d.doctor || '', d.date, d.ageDays, d.total, d.paid, d.due]))}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          </div>
        }
      >
        {dues.rows.length === 0 ? <EmptyState>Nobody owes anything. Every invoice is paid in full.</EmptyState> : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Waiting</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Total</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dues.rows.map((d) => (
                  <TableRow key={d.invoiceId}>
                    <TableCell className="text-[13px] whitespace-normal min-w-32">
                      <span className="text-gray-900 font-medium">{d.patientName}</span>
                      <span className="block text-[11px] text-gray-400">{[d.mobile, d.doctor].filter(Boolean).join(' · ')}</span>
                      <span className="sm:hidden text-[11px] text-gray-500">{d.ageDays} days · {d.invoiceId}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[12px] text-gray-600">
                      <span className="font-mono">{d.invoiceId}</span>
                      <span className="block text-[11px] text-gray-400">{fmtDate(d.date)}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Pill tone={d.ageDays > 60 ? 'rose' : 'amber'}>{d.ageDays} day{d.ageDays === 1 ? '' : 's'}</Pill>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-gray-600">{money(d.total, { decimals: 2 })}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-emerald-700">{money(d.paid, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-amber-700 whitespace-nowrap">{money(d.due, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => onCollect(d.invoiceId)}>Collect</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          Dues are shown for all time, whatever period is selected. Use Collect to record a payment against an invoice.
        </p>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LedgerTab({ data, onAdd, onChanged }) {
  const [side, setSide] = useState('outgoing')
  const rows = side === 'outgoing' ? data.outgoing : data.incoming
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Expenses by category" action={<Button size="sm" className="h-8 gap-1.5 bg-rose-600 hover:bg-rose-700" onClick={() => onAdd('outgoing')}><Plus className="h-3.5 w-3.5" /> Money out</Button>}>
          <BarList tone="rose" rows={data.breakdown.expensesByCategory.map((c) => ({ label: titleCase(c.category), value: c.amount }))} empty="No expenses in this period." />
        </Panel>
        <Panel title="Other income by category" action={<Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onAdd('incoming')}><Plus className="h-3.5 w-3.5" /> Money in</Button>}>
          <BarList tone="emerald" rows={data.breakdown.incomeByCategory.map((c) => ({ label: titleCase(c.category), value: c.amount }))} empty="No other income in this period." />
        </Panel>
      </div>
      <Panel
        title={side === 'outgoing' ? 'Money paid out' : 'Money received (not from patients)'}
        hint={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} in this period`}
        action={
          <div className="flex gap-2">
            <OptionSelect value={side} onChange={setSide} className="w-36"
              options={[{ value: 'outgoing', label: 'Money out' }, { value: 'incoming', label: 'Money in' }]} />
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => exportCsv(side === 'outgoing' ? 'expenses' : 'other-income',
              ['Date', 'Category', 'Party', 'Staff', 'Method', 'Reference', 'Notes', 'Recorded by', 'Amount'],
              rows.map((t) => [t.transaction_date, t.category, t.party || '', t.staff_name || '', t.payment_method || '', t.reference || '', t.notes || '', t.created_by_name || '', t.amount]))}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        }
      >
        <LedgerTable
          rows={rows}
          direction={side}
          emptyHint={side === 'outgoing' ? 'No money paid out in this period. Record salaries, supplies, utilities and more.' : 'No other income in this period.'}
          onDeleted={onChanged}
        />
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PayrollTab({ data, month, onMonth, onPay, onAddSalary }) {
  const p = data.payroll
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-[13px] text-gray-600" htmlFor="payroll-month">Month</label>
        <Input id="payroll-month" type="month" value={month} onChange={(e) => onMonth(e.target.value)} className="h-9 w-44 text-[13px]" />
        <p className="text-[11px] text-gray-400 sm:ml-2 flex-1">Salaries come from each staff member&apos;s profile. Pay one to mark it paid.</p>
        <Button size="sm" className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={onAddSalary}>
          <Plus className="h-3.5 w-3.5" /> Salary payment
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Monthly salary bill" value={money(p.monthlyBill)} icon={Users} tone="blue" sub="Active staff with a salary set" />
        <StatCard label={`Paid in ${monthLabel(p.month)}`} value={money(p.paid)} icon={TrendingDown} tone="emerald"
          sub={p.paid - p.paidToStaff > 0 ? `${money(p.paid - p.paidToStaff)} not linked to a staff member` : null} />
        <StatCard label="Still to pay" value={money(p.pending)} icon={AlertTriangle} tone={p.pending > 0 ? 'rose' : 'emerald'} />
        <StatCard label="Staff paid" value={`${p.counts.paid} / ${p.counts.paid + p.counts.partial + p.counts.unpaid}`} icon={Wallet} tone="indigo"
          sub={p.counts.partial ? `${p.counts.partial} part paid` : null} />
      </div>
      <Panel
        title={`Salaries for ${monthLabel(p.month)}`}
        action={
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => exportCsv(`payroll-${p.month}`, ['Staff', 'Role', 'Department', 'Salary', 'Paid', 'Balance', 'Status'],
            p.rows.map((r) => [r.name, r.role, r.department, r.salary, r.paid, r.balance, PAYROLL_STATUS[r.status].label]))}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        {p.rows.length === 0 ? <EmptyState>No staff yet.</EmptyState> : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Salary</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.rows.map((r) => {
                  const st = PAYROLL_STATUS[r.status]
                  return (
                    <TableRow key={r.staffId}>
                      <TableCell className="text-[13px] whitespace-normal min-w-32">
                        <span className="text-gray-900 font-medium">{r.name}</span>
                        <span className="block text-[11px] text-gray-400">{[titleCase(r.role), String(r.department).trim()].filter(Boolean).join(' · ')}</span>
                        <span className="sm:hidden text-[11px] text-gray-500">{money(r.paid)} of {money(r.salary)}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums text-gray-700">{r.salary ? money(r.salary) : '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums text-emerald-700">{money(r.paid)}</TableCell>
                      <TableCell>
                        <Pill tone={st.tone}>{st.label}</Pill>
                        {r.status === 'partial' && <span className="block text-[11px] text-gray-400 mt-0.5">{money(r.balance)} left</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status !== 'paid' && r.active && (
                          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => onPay(r)}>Pay</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {p.unlinked.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-3">
            {p.unlinked.length} salary entr{p.unlinked.length === 1 ? 'y' : 'ies'} this month ({money(p.paid - p.paidToStaff)}) didn&apos;t name a staff member, so
            they aren&apos;t counted against anyone above: {p.unlinked.map((u) => u.party || 'unnamed').join(', ')}.
          </p>
        )}
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function InventoryTab({ data, onAdd }) {
  const inv = data.inventory
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Stock value" value={money(inv.totalValue)} icon={Package} tone="blue" sub={`${inv.items} item${inv.items === 1 ? '' : 's'} · quantity × purchase price`} />
        <StatCard label="Bought in this period" value={money(inv.purchasedInRange)} icon={TrendingDown} tone="violet" sub="By purchase date" />
        <StatCard label="Low on stock" value={inv.lowStock} icon={AlertTriangle} tone={inv.lowStock ? 'amber' : 'emerald'} sub="At or below the minimum" />
        <StatCard label="Expired / expiring" value={`${inv.expired} / ${inv.expiringSoon}`} icon={AlertTriangle} tone={inv.expired ? 'rose' : inv.expiringSoon ? 'amber' : 'emerald'} sub="Expired · within 30 days" />
      </div>
      <Panel
        title="Items by value"
        hint="Edit or remove items on the Inventory page"
        action={
          <Button size="sm" className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={onAdd} disabled={!data.hospital?.id}>
            <Plus className="h-3.5 w-3.5" /> Add stock item
          </Button>
        }
      >
        {inv.rows.length === 0 ? <EmptyState>No inventory items yet.</EmptyState> : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Quantity</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Unit price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-[13px] whitespace-normal min-w-32">
                      <span className="text-gray-900 font-medium">{i.name}</span>
                      <span className="block text-[11px] text-gray-400">{[i.code, i.supplier, i.expiryDate && `Expires ${fmtDate(i.expiryDate)}`].filter(Boolean).join(' · ')}</span>
                      <span className="flex flex-wrap gap-1 mt-1">
                        {i.lowStock && <Pill tone="amber">Low stock</Pill>}
                        {i.expired && <Pill tone="rose">Expired</Pill>}
                        {i.expiringSoon && <Pill tone="amber">Expiring soon</Pill>}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums text-gray-700">{i.quantity} {i.unit}</TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-gray-600">{money(i.unitPrice, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{money(i.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  )
}
