'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Fetch hospital details by registration number
 */
export async function getHospitalDetails(registrationNo) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from('hospitals')
      .select('*')
      .eq('registration_no', registrationNo)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching hospital details:', error)
    return null
  }
}

/**
 * Fetch patient and profile details
 */
export async function getPatientDetails(patientId) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from('patients')
      .select(`
        *,
        profile:profile_id(id, registration_no, name, email, mobile, gender, date_of_birth, address, city, state, pincode)
      `)
      .eq('id', patientId)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching patient details:', error)
    return null
  }
}

/**
 * Fetch doctor/staff details by ID
 */
export async function getDoctorDetails(doctorId) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, name, registration_no, email, mobile, role')
      .eq('id', doctorId)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching doctor details:', error)
    return null
  }
}

/**
 * Generate Invoice with multiple payment entries
 */
export async function generateInvoice(data, currentUserId) {
  try {
    const adminClient = await createAdminClient()
    
    // Generate invoice ID in format INV-XXXXXX
    const invoiceId = `INV-${Math.floor(100000 + Math.random() * 900000)}`

    // Validate hospital exists using the hospital_id (which is registration_no per schema)
    if (!data.hospital_id) {
      throw new Error('Hospital registration number is required to generate invoice')
    }

    const { data: hospitalData, error: hospitalError } = await adminClient
      .from('hospitals')
      .select('id, registration_no')
      .eq('registration_no', data.hospital_id)
      .single()
    
    if (hospitalError || !hospitalData) {
      throw new Error(`Hospital with registration number "${data.hospital_id}" not found`)
    }

    // Insert invoice with registration_no as hospital_id (matches foreign key constraint)
    const { data: invoice, error } = await adminClient
      .from('invoices')
      .insert({
        id: invoiceId,
        hospital_id: data.hospital_id,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id || null,
        subtotal: data.subtotal || 0,
        discount_type: data.discount_type || null,
        discount_value: data.discount_value || 0,
        discount_amount: data.discount_amount || 0,
        tax_amount: data.tax_amount || 0,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount || 0,
        due_amount: data.due_amount || 0,
        payment_status: data.payment_status || 'unpaid',
        notes: data.notes || null,
        created_by: currentUserId
      })
      .select()

    if (error) throw error

    const createdInvoice = invoice[0]

    // Insert all payment records if multiple payments were made
    if (data.payments && data.payments.length > 0) {
      const paymentRecords = data.payments.map(p => ({
        invoice_id: invoiceId,
        hospital_id: data.hospital_id,
        payment_method: p.payment_method,
        amount: parseFloat(p.amount),
        reference_id: p.reference_id || null,
        created_by: currentUserId
      }))

      const { error: paymentError } = await adminClient
        .from('invoice_payments')
        .insert(paymentRecords)

      if (paymentError) {
        console.error('Payment recording error:', paymentError)
        throw paymentError
      }
    }

    return {
      success: true,
      invoice: createdInvoice,
      message: 'Invoice generated successfully with all payments recorded'
    }
  } catch (error) {
    console.error('Error generating invoice:', error)
    throw error
  }
}

/**
 * Record a payment for an invoice
 */
export async function recordPayment(invoiceId, paymentData, currentUserId) {
  try {
    const adminClient = await createAdminClient()

    // Get invoice details
    const { data: invoice, error: invoiceError } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice not found')

    // Insert payment record
    const { data: payment, error: paymentError } = await adminClient
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        hospital_id: invoice.hospital_id,
        payment_method: paymentData.method || 'cash', // Ensure payment_method has a default value
        amount: parseFloat(paymentData.amount),
        reference_id: paymentData.referenceId || null,
        created_by: currentUserId
      })
      .select()

    if (paymentError) throw paymentError

    // Update invoice paid_amount and due_amount
    const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(paymentData.amount)
    const newDueAmount = parseFloat(invoice.total_amount) - newPaidAmount
    const newPaymentStatus = newPaidAmount >= parseFloat(invoice.total_amount) 
      ? 'paid' 
      : (newPaidAmount > 0 ? 'partially_paid' : 'unpaid')

    const { error: updateError } = await adminClient
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        payment_status: newPaymentStatus
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    return {
      success: true,
      payment: payment[0],
      invoice: {
        ...invoice,
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        payment_status: newPaymentStatus
      }
    }
  } catch (error) {
    console.error('Error recording payment:', error)
    throw error
  }
}

/**
 * Fetch invoice with payment details
 */
export async function getInvoiceWithPayments(invoiceId) {
  try {
    const supabase = await createClient()

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    const { data: payments, error: paymentError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false })

    if (paymentError) throw paymentError

    return {
      invoice,
      payments: payments || []
    }
  } catch (error) {
    console.error('Error fetching invoice with payments:', error)
    throw error
  }
}

/**
 * Fetch invoice with complete details (hospital, patient, doctor, payments)
 */
export async function getInvoiceWithCompleteDetails(invoiceId) {
  try {
    const supabase = await createClient()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    // Fetch payments
    const { data: payments, error: paymentError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false })

    if (paymentError) throw paymentError

    // Fetch hospital details
    const { data: hospital, error: hospitalError } = await supabase
      .from('hospitals')
      .select('*')
      .eq('registration_no', invoice.hospital_id)
      .single()

    if (hospitalError) console.warn('Hospital not found')

    // Fetch patient details with profile
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select(`
        *,
        profile:profile_id(id, registration_no, name, email, mobile, gender, date_of_birth, address, city, state, pincode)
      `)
      .eq('id', invoice.patient_id)
      .single()

    if (patientError) console.warn('Patient not found')

    // Fetch appointment to get doctor details
    let doctor = null
    if (invoice.appointment_id) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('assigned_to')
        .eq('id', invoice.appointment_id)
        .single()

      if (!appointmentError && appointment?.assigned_to) {
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('id, name, registration_no, email, mobile, role')
          .eq('id', appointment.assigned_to)
          .single()
        
        doctor = doctorProfile
      }
    }

    return {
      invoice,
      payments: payments || [],
      hospital,
      patient,
      doctor
    }
  } catch (error) {
    console.error('Error fetching complete invoice details:', error)
    throw error
  }
}

/**
 * Fetch patient invoices
 */
export async function getPatientInvoices(patientId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching patient invoices:', error)
    throw error
  }
}

/**
 * Fetch hospital invoices by payment status
 */
export async function getHospitalInvoices(hospitalId, paymentStatus = null) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('hospital_id', hospitalId)

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching hospital invoices:', error)
    throw error
  }
}

/**
 * Fetch hospital invoices with patient and appointment details for billing page
 */
export async function getHospitalInvoicesWithDetails(hospitalId, filters = {}) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('invoices')
      .select(`
        *,
        appointments:appointment_id(
          id,
          appointment_date,
          appointment_slot,
          status,
          doctors:doctor_id(
            name,
            specialization
          ),
          departments:department_id(
            name
          )
        ),
        patients:patient_id(
          id,
          profile:profile_id(
            name,
            email,
            mobile
          )
        ),
        invoice_payments(
          id,
          payment_method,
          amount,
          reference_id,
          paid_at
        )
      `)
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    // Apply payment status filter
    if (filters.payment_status) {
      query = query.eq('payment_status', filters.payment_status)
    }

    // Apply due amount filter (show only invoices with due amount)
    if (filters.showDueOnly) {
      query = query.gt('due_amount', 0)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching invoices with details:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Get invoice summary stats for hospital
 */
export async function getInvoiceStats(hospitalId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('payment_status, total_amount, paid_amount, due_amount')
      .eq('hospital_id', hospitalId)

    if (error) throw error

    const stats = {
      total: data.length,
      paid: data.filter(i => i.payment_status === 'paid').length,
      partially_paid: data.filter(i => i.payment_status === 'partially_paid').length,
      unpaid: data.filter(i => i.payment_status === 'unpaid').length,
      totalRevenue: data.reduce((sum, i) => sum + (i.paid_amount || 0), 0),
      totalDue: data.reduce((sum, i) => sum + (i.due_amount || 0), 0),
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Error fetching invoice stats:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Create a new invoice (standalone, not from appointment)
 */
export async function createInvoice(invoiceData, userId) {
  try {
    const adminClient = await createAdminClient()

    // Generate invoice ID
    const invoiceId = `INV-${Math.floor(100000 + Math.random() * 900000)}`

    const invoice = {
      id: invoiceId,
      hospital_id: invoiceData.hospital_id,
      patient_id: invoiceData.patient_id,
      appointment_id: invoiceData.appointment_id || null,
      subtotal: invoiceData.subtotal || 0,
      discount_type: invoiceData.discount_type || null,
      discount_value: invoiceData.discount_value || null,
      discount_amount: invoiceData.discount_amount || 0,
      tax_amount: invoiceData.tax_amount || 0,
      total_amount: invoiceData.total_amount,
      paid_amount: invoiceData.paid_amount || 0,
      due_amount: invoiceData.due_amount || invoiceData.total_amount,
      payment_status: invoiceData.payment_status || 'unpaid',
      notes: invoiceData.notes || null,
      created_by: userId,
    }

    const { data, error } = await adminClient
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) throw error

    // If there's an initial payment, record it
    if (invoiceData.paid_amount > 0 && invoiceData.payment_method) {
      const payment = {
        invoice_id: invoiceId,
        hospital_id: invoiceData.hospital_id,
        payment_method: invoiceData.payment_method,
        amount: invoiceData.paid_amount,
        reference_id: invoiceData.reference_id || null,
        created_by: userId,
      }

      await adminClient
        .from('invoice_payments')
        .insert(payment)
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { data: null, error: error.message }
  }
}

