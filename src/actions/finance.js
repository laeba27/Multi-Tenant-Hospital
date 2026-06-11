'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

/**
 * Full finance overview for a hospital admin:
 *  - auto patient income (from invoices.paid_amount)
 *  - manual incoming + outgoing ledger entries
 *  - summary totals
 */
export async function getFinanceOverview() {
  const { supabase, profile } = await getActor()
  const empty = {
    summary: { patientIncome: 0, manualIncoming: 0, totalIncoming: 0, totalOutgoing: 0, net: 0, outstandingDue: 0 },
    patientIncome: 0,
    outstandingDue: 0,
    incoming: [],
    outgoing: [],
  }
  if (!profile || profile.role !== 'hospital_admin' || !profile.hospital_id) return empty

  const hospitalId = profile.hospital_id

  const [invoiceRes, txRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('paid_amount, due_amount')
      .eq('hospital_id', hospitalId),
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const invoices = invoiceRes.data || []
  const transactions = txRes.data || []

  const patientIncome = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0)
  const outstandingDue = invoices.reduce((s, i) => s + Number(i.due_amount || 0), 0)

  const incoming = transactions.filter((t) => t.direction === 'incoming')
  const outgoing = transactions.filter((t) => t.direction === 'outgoing')

  const manualIncoming = incoming.reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOutgoing = outgoing.reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalIncoming = patientIncome + manualIncoming

  return {
    summary: {
      patientIncome,
      manualIncoming,
      totalIncoming,
      totalOutgoing,
      net: totalIncoming - totalOutgoing,
      outstandingDue,
    },
    patientIncome,
    outstandingDue,
    incoming,
    outgoing,
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
      transaction_date: input.transaction_date || new Date().toISOString().slice(0, 10),
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
