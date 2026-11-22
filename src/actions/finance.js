'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { todayInIndia } from '@/lib/cron/followUpReminders'
import { buildInvoiceLineItems } from '@/lib/invoices/lineItems'

async function getActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()

  return { supabase, profile }
}

const INCOMING_CATEGORIES = ['fund', 'banking', 'donation', 'grant', 'other']
const OUTGOING_CATEGORIES = ['salary', 'investment', 'utilities', 'supplies', 'other']
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other']

const DAY = 86400000
const IST_OFFSET_MS = 330 * 60 * 1000
const num = (v) => Number(v || 0)
/** The India calendar date of a timestamp ('YYYY-MM-DD'). */
const istDate = (ts) => {
  if (!ts) return null
  const s = String(ts)
  const ms = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? Date.parse(s) : Date.parse(`${s.replace(' ', 'T')}Z`)
  return Number.isFinite(ms) ? new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10) : null
}
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY)
const monthStart = (d) => `${d.slice(0, 7)}-01`
const monthEnd = (d) => {
  const [y, m] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
const shiftMonth = (d, n) => {
  const [y, m] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10)
}
const doctorLabel = (name) => {
  const n = String(name || '').trim().replace(/^dr\.?\s+/i, '')
  return n ? `Dr. ${n}` : 'No doctor'
}

/** { from, to, label, prevFrom, prevTo } for a range preset, India dates. */
function resolveRange(preset, today) {
  switch (preset) {
    case 'last_month': {
      const from = shiftMonth(today, -1)
      const to = monthEnd(from)
      const prevFrom = shiftMonth(today, -2)
      return { key: preset, from, to, label: 'Last month', prevFrom, prevTo: monthEnd(prevFrom) }
    }
    case 'last_3_months': {
      const from = shiftMonth(today, -2)
      const span = daysBetween(from, today) + 1
      return { key: preset, from, to: today, label: 'Last 3 months', prevFrom: addDays(from, -span), prevTo: addDays(from, -1) }
    }
    case 'this_year': {
      const from = `${today.slice(0, 4)}-01-01`
      const prevFrom = `${Number(today.slice(0, 4)) - 1}-01-01`
      return { key: preset, from, to: today, label: 'This year', prevFrom, prevTo: addDays(prevFrom, daysBetween(from, today)) }
    }
    case 'all':
      return { key: preset, from: null, to: today, label: 'All time', prevFrom: null, prevTo: null }
    case 'this_month':
    default: {
      const from = monthStart(today)
      const prevFrom = shiftMonth(today, -1)
      // Compare like with like: the 1st to the same day of last month.
      const prevTo = [addDays(prevFrom, daysBetween(from, today)), monthEnd(prevFrom)].sort()[0]
      return { key: 'this_month', from, to: today, label: 'This month', prevFrom, prevTo }
    }
  }
}

const within = (d, from, to) => Boolean(d) && (!from || d >= from) && (!to || d <= to)
const pctChange = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)

/**
 * Everything the hospital admin's Finance page shows, for one period:
 * collections, billing, dues, expenses, payroll and inventory value.
 *
 * Reads with the service role after checking the caller is this hospital's
 * admin; every query is scoped to that hospital.
 */
export async function getFinanceOverview({ range = 'this_month', payrollMonth = null } = {}) {
  const { profile } = await getActor()
  if (!profile || profile.role !== 'hospital_admin' || !profile.hospital_id) {
    return { success: false, error: 'Only hospital admins can see finance.' }
  }

  try {
    const svc = createServiceRoleClient()
    const hospitalId = profile.hospital_id
    const today = todayInIndia()
    const r = resolveRange(range, today)
    const pMonth = /^\d{4}-\d{2}$/.test(String(payrollMonth || '')) ? payrollMonth : today.slice(0, 7)

    const { data: hospital } = await svc
      .from('hospitals').select('id, name').eq('registration_no', hospitalId).single()

    const must = (res, what) => {
      if (res.error) throw new Error(`Could not read ${what}: ${res.error.message}`)
      return res.data || []
    }

    const [invoices, payments, ledger, staff, departments, inventory] = await Promise.all([
      svc.from('invoices')
        .select('id, patient_id, appointment_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, due_amount, payment_status, notes, created_at')
        .eq('hospital_id', hospitalId).then((x) => must(x, 'invoices')),
      svc.from('invoice_payments')
        .select('id, invoice_id, payment_method, amount, reference_id, paid_at, created_by')
        .eq('hospital_id', hospitalId).order('paid_at', { ascending: false }).then((x) => must(x, 'payments')),
      svc.from('finance_transactions')
        .select('*').eq('hospital_id', hospitalId)
        .order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
        .then((x) => must(x, 'finance entries')),
      svc.from('staff')
        .select('id, name, role, salary, is_active, department_id, employee_registration_no, joining_date')
        .eq('hospital_id', hospitalId).then((x) => must(x, 'staff')),
      hospital?.id
        ? svc.from('departments').select('id, name').eq('hospital_id', hospital.id).then((x) => must(x, 'departments'))
        : [],
      hospital?.id
        ? svc.from('inventory')
          .select('id, item_name, item_code, category, quantity, minimum_quantity, unit, purchase_price, supplier_name, purchase_date, expiry_date, is_active')
          .eq('hospital_id', hospital.id).then((x) => must(x, 'inventory'))
        : [],
    ])

    const apptIds = [...new Set(invoices.map((i) => i.appointment_id).filter(Boolean))]
    const patientIds = [...new Set(invoices.map((i) => i.patient_id).filter(Boolean))]
    const actorIds = [...new Set([...payments.map((p) => p.created_by), ...ledger.map((l) => l.created_by)].filter(Boolean))]
    const [appts, patients, actors] = await Promise.all([
      apptIds.length
        ? svc.from('appointments')
          .select('id, doctor_id, department_id, appointment_type, consultation_fee_snapshot, treatment_details, appointment_date')
          .in('id', apptIds).then((x) => must(x, 'appointments'))
        : [],
      patientIds.length
        ? svc.from('patients').select('id, profile:profiles!profile_id(name, mobile)').in('id', patientIds).then((x) => must(x, 'patients'))
        : [],
      actorIds.length ? svc.from('profiles').select('id, name').in('id', actorIds).then((x) => must(x, 'profiles')) : [],
    ])

    const apptBy = Object.fromEntries(appts.map((a) => [a.id, a]))
    const staffBy = Object.fromEntries(staff.map((s) => [s.id, s]))
    const deptBy = Object.fromEntries(departments.map((d) => [d.id, d.name]))
    const patientBy = Object.fromEntries(patients.map((p) => [p.id, { name: p.profile?.name?.trim() || p.id, mobile: p.profile?.mobile || '' }]))
    const actorName = Object.fromEntries(actors.map((a) => [a.id, String(a.name || '').trim()]))
    const invoiceBy = Object.fromEntries(invoices.map((i) => [i.id, i]))

    const invDate = (i) => istDate(i.created_at)
    const payDate = (p) => istDate(p.paid_at)
    const invInRange = invoices.filter((i) => within(invDate(i), r.from, r.to))
    const payInRange = payments.filter((p) => within(payDate(p), r.from, r.to))
    const ledInRange = ledger.filter((l) => within(l.transaction_date, r.from, r.to))
    const incoming = ledInRange.filter((l) => l.direction === 'incoming')
    const outgoing = ledInRange.filter((l) => l.direction === 'outgoing')

    const sum = (rows, f) => rows.reduce((s, x) => s + num(f(x)), 0)
    const collected = sum(payInRange, (p) => p.amount)
    const billed = sum(invInRange, (i) => i.total_amount)
    const billedPaid = sum(invInRange, (i) => i.paid_amount)
    const otherIncome = sum(incoming, (l) => l.amount)
    const expenses = sum(outgoing, (l) => l.amount)
    const outstanding = sum(invoices, (i) => i.due_amount)
    const discounts = sum(invInRange, (i) => i.discount_amount)

    let previous = null
    if (r.prevFrom) {
      const pc = sum(payments.filter((p) => within(payDate(p), r.prevFrom, r.prevTo)), (p) => p.amount)
      const pb = sum(invoices.filter((i) => within(invDate(i), r.prevFrom, r.prevTo)), (i) => i.total_amount)
      const pe = sum(ledger.filter((l) => l.direction === 'outgoing' && within(l.transaction_date, r.prevFrom, r.prevTo)), (l) => l.amount)
      const po = sum(ledger.filter((l) => l.direction === 'incoming' && within(l.transaction_date, r.prevFrom, r.prevTo)), (l) => l.amount)
      previous = {
        from: r.prevFrom, to: r.prevTo,
        collected: pc, billed: pb, expenses: pe,
        change: {
          collected: pctChange(collected, pc),
          billed: pctChange(billed, pb),
          expenses: pctChange(expenses, pe),
          net: pctChange(collected + otherIncome - expenses, pc + po - pe),
        },
      }
    }

    /* ---- Trend: daily for a month or less, otherwise monthly ---- */
    const earliest = [
      ...invoices.map(invDate), ...payments.map(payDate), ...ledger.map((l) => l.transaction_date),
    ].filter(Boolean).sort()[0] || today
    const tFrom = r.from || monthStart(earliest)
    const daily = daysBetween(tFrom, r.to) <= 31
    const trendMap = new Map()
    if (daily) {
      for (let d = tFrom; d <= r.to; d = addDays(d, 1)) trendMap.set(d, { key: d, collected: 0, otherIncome: 0, expenses: 0, billed: 0 })
    } else {
      for (let m = monthStart(tFrom); m <= r.to; m = shiftMonth(m, 1)) trendMap.set(m.slice(0, 7), { key: m.slice(0, 7), collected: 0, otherIncome: 0, expenses: 0, billed: 0 })
    }
    const tk = (d) => (daily ? d : d.slice(0, 7))
    for (const p of payInRange) { const b = trendMap.get(tk(payDate(p))); if (b) b.collected += num(p.amount) }
    for (const i of invInRange) { const b = trendMap.get(tk(invDate(i))); if (b) b.billed += num(i.total_amount) }
    for (const l of ledInRange) {
      const b = trendMap.get(tk(l.transaction_date))
      if (!b) continue
      if (l.direction === 'incoming') b.otherIncome += num(l.amount)
      else b.expenses += num(l.amount)
    }

    /* ---- What was billed: by service, treatment, doctor, department ---- */
    const bySource = { Consultations: 0, Treatments: 0, 'Other charges': 0 }
    const byTreatment = new Map()
    const byDoctor = new Map()
    const byDepartment = new Map()
    for (const inv of invInRange) {
      const appt = apptBy[inv.appointment_id] || null
      const doctor = appt?.doctor_id ? staffBy[appt.doctor_id] : null
      // Split what was actually billed (after discount and tax) across the
      // invoice's line items in proportion, so the split adds up to `billed`.
      // Manual invoices carry only a total (subtotal 0): "Other charges".
      const subtotal = num(inv.subtotal)
      const total = num(inv.total_amount)
      const items = subtotal > 0
        ? buildInvoiceLineItems(inv, appt ? { ...appt, doctor_name: doctor?.name } : null)
        : []
      const scale = subtotal > 0 ? total / subtotal : 0
      if (!items.length) bySource['Other charges'] += total
      for (const it of items) {
        const amount = it.amount * scale
        if (it.label === 'Consultation Fee') bySource.Consultations += amount
        else if (appt && Array.isArray(appt.treatment_details) && appt.treatment_details.some((t) => (t?.name || 'Treatment') === it.label)) {
          bySource.Treatments += amount
          const name = String(it.label).trim()
          const key = name.toLowerCase()
          const row = byTreatment.get(key) || { name, count: 0, amount: 0 }
          row.count++
          row.amount += amount
          byTreatment.set(key, row)
        } else bySource['Other charges'] += amount
      }
      const dKey = appt?.doctor_id || 'none'
      const dRow = byDoctor.get(dKey) || { name: appt?.doctor_id ? doctorLabel(doctor?.name) : 'No doctor', invoices: 0, billed: 0, collected: 0, due: 0 }
      dRow.invoices++
      dRow.billed += num(inv.total_amount)
      dRow.collected += num(inv.paid_amount)
      dRow.due += num(inv.due_amount)
      byDoctor.set(dKey, dRow)
      const depId = appt?.department_id || doctor?.department_id || null
      const depName = (depId && deptBy[depId]) || 'Unassigned'
      byDepartment.set(depName, (byDepartment.get(depName) || 0) + num(inv.total_amount))
    }

    const byMethod = new Map()
    for (const p of payInRange) {
      const m = p.payment_method || 'other'
      const row = byMethod.get(m) || { method: m, count: 0, amount: 0 }
      row.count++
      row.amount += num(p.amount)
      byMethod.set(m, row)
    }

    const groupCat = (rows) => {
      const m = new Map()
      for (const l of rows) m.set(l.category || 'other', (m.get(l.category || 'other') || 0) + num(l.amount))
      return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
    }

    /* ---- Who owes money ---- */
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const dues = invoices
      .filter((i) => num(i.due_amount) > 0.009)
      .map((i) => {
        const d = invDate(i)
        const age = d ? daysBetween(d, today) : 0
        const bucket = age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : '90+'
        aging[bucket] += num(i.due_amount)
        const appt = apptBy[i.appointment_id]
        return {
          invoiceId: i.id,
          patientId: i.patient_id,
          patientName: patientBy[i.patient_id]?.name || i.patient_id || 'Unknown',
          mobile: patientBy[i.patient_id]?.mobile || '',
          doctor: appt?.doctor_id ? doctorLabel(staffBy[appt.doctor_id]?.name) : null,
          date: d,
          ageDays: age,
          total: num(i.total_amount),
          paid: num(i.paid_amount),
          due: num(i.due_amount),
          status: i.payment_status,
        }
      })
      .sort((a, b) => b.ageDays - a.ageDays || b.due - a.due)

    /* ---- Every payment received, with who took it ---- */
    const paymentLog = payInRange.map((p) => {
      const inv = invoiceBy[p.invoice_id]
      return {
        id: p.id,
        at: p.paid_at,
        invoiceId: p.invoice_id,
        patientName: patientBy[inv?.patient_id]?.name || inv?.patient_id || '—',
        method: p.payment_method || 'other',
        amount: num(p.amount),
        reference: p.reference_id || '',
        receivedBy: actorName[p.created_by] || null,
        invoiceStatus: inv?.payment_status || null,
      }
    })

    /* ---- Payroll for one month ---- */
    const pFrom = `${pMonth}-01`
    const pTo = monthEnd(pFrom)
    const salaryEntries = ledger.filter((l) => l.direction === 'outgoing' && l.category === 'salary' && within(l.transaction_date, pFrom, pTo))
    const paidByStaff = {}
    for (const l of salaryEntries) if (l.staff_id) paidByStaff[l.staff_id] = (paidByStaff[l.staff_id] || 0) + num(l.amount)
    const payrollRows = staff
      .filter((s) => s.is_active !== false || paidByStaff[s.id])
      .map((s) => {
        const salary = num(s.salary)
        const paid = paidByStaff[s.id] || 0
        const status = salary <= 0 ? (paid > 0 ? 'paid' : 'no_salary') : paid >= salary - 0.009 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
        return {
          staffId: s.id,
          name: String(s.name || '').trim() || 'Unnamed',
          role: s.role || '',
          department: deptBy[s.department_id] || '',
          salary,
          paid,
          balance: Math.max(salary - paid, 0),
          status,
          active: s.is_active !== false,
        }
      })
      .sort((a, b) => ({ unpaid: 0, partial: 1, paid: 2, no_salary: 3 }[a.status] - { unpaid: 0, partial: 1, paid: 2, no_salary: 3 }[b.status]) || a.name.localeCompare(b.name))
    const unlinkedSalary = salaryEntries.filter((l) => !l.staff_id)

    /* ---- Inventory value ---- */
    const activeItems = inventory.filter((i) => i.is_active !== false)
    const soon = addDays(today, 30)
    const inventoryRows = activeItems.map((i) => ({
      id: i.id,
      name: i.item_name,
      code: i.item_code || '',
      category: i.category || '',
      quantity: num(i.quantity),
      minimum: num(i.minimum_quantity),
      unit: i.unit || '',
      unitPrice: num(i.purchase_price),
      value: num(i.quantity) * num(i.purchase_price),
      supplier: i.supplier_name || '',
      purchaseDate: i.purchase_date,
      expiryDate: i.expiry_date,
      lowStock: num(i.quantity) <= num(i.minimum_quantity),
      expired: Boolean(i.expiry_date && i.expiry_date < today),
      expiringSoon: Boolean(i.expiry_date && i.expiry_date >= today && i.expiry_date <= soon),
    })).sort((a, b) => b.value - a.value)

    const withStaff = (l) => ({ ...l, staff_name: l.staff_id ? String(staffBy[l.staff_id]?.name || '').trim() || null : null, created_by_name: actorName[l.created_by] || null })

    return {
      success: true,
      hospital: { id: hospital?.id || null, name: String(hospital?.name || '').trim() },
      departments: departments.map((d) => ({ id: d.id, name: String(d.name || '').trim() })),
      today,
      range: { key: r.key, from: r.from, to: r.to, label: r.label, granularity: daily ? 'day' : 'month' },
      summary: {
        collected,
        billed,
        otherIncome,
        totalIncoming: collected + otherIncome,
        expenses,
        net: collected + otherIncome - expenses,
        outstanding,
        discounts,
        collectionRate: billed > 0 ? Math.round((billedPaid / billed) * 100) : null,
        invoices: invInRange.length,
        payments: payInRange.length,
        avgInvoice: invInRange.length ? billed / invInRange.length : 0,
        unpaidInvoices: dues.length,
        // Kept for anything still reading the old shape.
        patientIncome: collected,
        manualIncoming: otherIncome,
        totalOutgoing: expenses,
        outstandingDue: outstanding,
      },
      previous,
      trend: [...trendMap.values()],
      breakdown: {
        bySource: Object.entries(bySource).map(([name, amount]) => ({ name, amount })).filter((x) => x.amount > 0),
        byTreatment: [...byTreatment.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
        byDoctor: [...byDoctor.values()].sort((a, b) => b.billed - a.billed),
        byDepartment: [...byDepartment.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
        byMethod: [...byMethod.values()].sort((a, b) => b.amount - a.amount),
        expensesByCategory: groupCat(outgoing),
        incomeByCategory: groupCat(incoming),
      },
      dues: { total: outstanding, aging, rows: dues },
      paymentLog,
      payroll: {
        month: pMonth,
        monthlyBill: payrollRows.filter((p) => p.active).reduce((s, p) => s + p.salary, 0),
        paid: sum(salaryEntries, (l) => l.amount),
        paidToStaff: payrollRows.reduce((s, p) => s + p.paid, 0),
        pending: payrollRows.reduce((s, p) => s + (p.active ? p.balance : 0), 0),
        counts: {
          paid: payrollRows.filter((p) => p.status === 'paid').length,
          partial: payrollRows.filter((p) => p.status === 'partial').length,
          unpaid: payrollRows.filter((p) => p.status === 'unpaid').length,
        },
        rows: payrollRows,
        unlinked: unlinkedSalary.map(withStaff),
      },
      inventory: {
        totalValue: inventoryRows.reduce((s, i) => s + i.value, 0),
        items: inventoryRows.length,
        lowStock: inventoryRows.filter((i) => i.lowStock).length,
        expiringSoon: inventoryRows.filter((i) => i.expiringSoon).length,
        expired: inventoryRows.filter((i) => i.expired).length,
        purchasedInRange: inventory
          .filter((i) => within(i.purchase_date, r.from, r.to))
          .reduce((s, i) => s + num(i.quantity) * num(i.purchase_price), 0),
        rows: inventoryRows,
      },
      incoming: incoming.map(withStaff),
      outgoing: outgoing.map(withStaff),
      staffOptions: staff
        .filter((s) => s.is_active !== false)
        .map((s) => ({ id: s.id, name: String(s.name || '').trim() || 'Unnamed', role: s.role || '', salary: num(s.salary) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  } catch (e) {
    console.error('getFinanceOverview error:', e)
    return { success: false, error: e?.message || 'Could not load finance data' }
  }
}

/**
 * Take a payment against one of this hospital's unpaid invoices, from the
 * Finance page. Same bookkeeping as recordPayment (src/actions/invoices.js):
 * a row in invoice_payments, then the invoice's paid / due / status. But it is
 * pinned to the admin's own hospital and records the signed-in admin as the
 * receiver, rather than trusting an id from the browser.
 */
export async function collectInvoicePayment({ invoiceId, amount, method, reference, paidOn } = {}) {
  const { profile } = await getActor()
  if (!profile || profile.role !== 'hospital_admin' || !profile.hospital_id) {
    return { success: false, error: 'Only hospital admins can record payments here' }
  }
  try {
    const svc = createServiceRoleClient()
    const { data: invoice, error } = await svc
      .from('invoices')
      .select('id, hospital_id, total_amount, paid_amount')
      .eq('id', String(invoiceId || ''))
      .eq('hospital_id', profile.hospital_id)
      .maybeSingle()
    if (error) throw error
    if (!invoice) return { success: false, error: 'Invoice not found in your hospital' }

    const total = num(invoice.total_amount)
    const alreadyPaid = num(invoice.paid_amount)
    const remaining = Math.max(0, total - alreadyPaid)
    const value = Math.round(Number(amount) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) return { success: false, error: 'Enter a valid amount' }
    if (remaining <= 0) return { success: false, error: 'This invoice is already fully paid' }
    if (value > remaining + 0.01) {
      return { success: false, error: `That is more than the ₹${remaining.toFixed(2)} still due` }
    }

    // A back-dated payment keeps the time of day it's recorded at, in India time.
    let paidAt
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(paidOn || '')) && paidOn !== todayInIndia()) {
      if (paidOn > todayInIndia()) return { success: false, error: 'The payment date cannot be in the future' }
      paidAt = new Date(`${paidOn}T12:00:00+05:30`).toISOString()
    }

    const { error: payError } = await svc.from('invoice_payments').insert({
      invoice_id: invoice.id,
      hospital_id: invoice.hospital_id,
      payment_method: PAYMENT_METHODS.includes(method) ? method : 'cash',
      amount: value,
      reference_id: String(reference || '').trim() || null,
      created_by: profile.id,
      ...(paidAt ? { paid_at: paidAt } : {}),
    })
    if (payError) throw payError

    const newPaid = Math.min(total, alreadyPaid + value)
    const newDue = Math.max(0, total - newPaid)
    const { error: updError } = await svc
      .from('invoices')
      .update({
        paid_amount: newPaid,
        due_amount: newDue,
        payment_status: newPaid >= total - 0.009 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid',
      })
      .eq('id', invoice.id)
    if (updError) throw updError

    revalidatePath('/dashboard/hospital/finance')
    return { success: true, due: newDue }
  } catch (e) {
    console.error('collectInvoicePayment error:', e)
    return { success: false, error: e?.message || 'Could not record the payment' }
  }
}

/**
 * Record a manual finance transaction (incoming or outgoing).
 */
export async function createFinanceTransaction(input) {
  const { supabase, profile } = await getActor()
  if (!profile) return { success: false, error: 'Unauthorized' }
  if (profile.role !== 'hospital_admin') {
    return { success: false, error: 'Only hospital admins can record finance entries' }
  }
  if (!profile.hospital_id) return { success: false, error: 'No hospital linked to your account' }

  const direction = input.direction
  if (direction !== 'incoming' && direction !== 'outgoing') {
    return { success: false, error: 'Invalid direction' }
  }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Enter a valid amount greater than 0' }
  }

  const allowedCats = direction === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES
  const category = allowedCats.includes(input.category) ? input.category : 'other'
  const paymentMethod = PAYMENT_METHODS.includes(input.payment_method) ? input.payment_method : null

  // A salary can name the staff member it was for -- only one of this hospital's.
  let staffId = null
  if (direction === 'outgoing' && category === 'salary' && input.staff_id) {
    const { data: member } = await supabase
      .from('staff').select('id, name').eq('id', input.staff_id).eq('hospital_id', profile.hospital_id).maybeSingle()
    if (!member) return { success: false, error: 'That staff member is not in your hospital' }
    staffId = member.id
    if (!input.party?.trim()) input.party = member.name
  }

  const { error } = await supabase.from('finance_transactions').insert([
    {
      hospital_id: profile.hospital_id,
      direction,
      category,
      party: input.party?.trim() || null,
      amount,
      payment_method: paymentMethod,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      transaction_date: input.transaction_date || todayInIndia(),
      staff_id: staffId,
      created_by: profile.id,
    },
  ])

  if (error) {
    console.error('createFinanceTransaction error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/hospital/finance')
  return { success: true }
}

/**
 * Delete a manual finance transaction (RLS scopes it to the admin's hospital).
 */
export async function deleteFinanceTransaction(id) {
  const { supabase, profile } = await getActor()
  if (!profile || profile.role !== 'hospital_admin') {
    return { success: false, error: 'Unauthorized' }
  }
  if (!id) return { success: false, error: 'Missing transaction id' }

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('hospital_id', profile.hospital_id)

  if (error) {
    console.error('deleteFinanceTransaction error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/hospital/finance')
  return { success: true }
}
