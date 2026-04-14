'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Fetch receptionist dashboard statistics
 */
export async function getReceptionDashboardStats(hospitalId) {
  try {
    const supabase = await createClient()

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // 1. Today's appointments count
    const { data: todayAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', today)

    // 2. Total patients count
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)

    // 3. Pending payments (invoices with due amount > 0)
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gt('due_amount', 0)

    // 4. Monthly revenue (current month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString()
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString()

    const { data: invoices, error: revenueError } = await supabase
      .from('invoices')
      .select('paid_amount')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    const monthlyRevenue = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0

    return {
      data: {
        todayAppointments: todayAppointments || 0,
        totalPatients: patients || 0,
        pendingPayments: pendingPayments || 0,
        monthlyRevenue: monthlyRevenue
      },
      error: null
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Get today's appointments for receptionist
 */
export async function getTodayAppointments(hospitalId) {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id(
          id,
          profile:profile_id(
            name,
            mobile
          )
        ),
        doctors:doctor_id(
          name,
          specialization
        ),
        departments:department_id(
          name
        )
      `)
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', today)
      .order('appointment_slot', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching today appointments:', error)
    return { data: null, error: error.message }
  }
}
