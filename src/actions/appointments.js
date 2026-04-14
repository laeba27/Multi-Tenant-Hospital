'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

/**
 * Fetch doctors by department and hospital
 */
export async function getDoctorsByDepartment(hospitalId, departmentId) {
  try {
    const supabase = await createClient()

    const { data: doctors, error } = await supabase
      .from('staff')
      .select(`
        id, 
        profile_id, 
        profiles!profile_id(name, email, mobile, avatar_url),
        designation,
        specialization,
        consultation_fee,
        max_patients_per_day,
        work_days,
        shift_start_time,
        shift_end_time
      `)
      .eq('hospital_id', hospitalId)
      .eq('department_id', departmentId)
      .eq('role', 'doctor')
      .eq('is_active', true)

    if (error) throw error
    return doctors || []
  } catch (error) {
    console.error('Error fetching doctors:', error)
    throw error
  }
}

/**
 * Calculate available slots for a doctor on a specific date
 */
export async function getDoctorAvailableSlots(doctorId, date, hospitalId) {
  try {
    const supabase = await createClient()

    // 1. Get doctor details
    const { data: doctor, error: docError } = await supabase
      .from('staff')
      .select('shift_start_time, shift_end_time, max_patients_per_day')
      .eq('id', doctorId)
      .single()

    if (docError) throw docError

    // 2. Get existing appointments for that date
    const { count: bookedCount, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .eq('status', 'scheduled')

    if (apptError) throw apptError

    // Check if max patients reached
    if (bookedCount >= doctor.max_patients_per_day) {
      return { available: false, reason: 'Doctor is fully booked for this day', slots: [] }
    }

    // Generate slots (e.g., every 30 mins)
    const slots = []
    let current = new Date(`2000-01-01T${doctor.shift_start_time}`)
    const end = new Date(`2000-01-01T${doctor.shift_end_time}`)

    while (current < end) {
      slots.push(current.toTimeString().substring(0, 5)) // HH:MM
      current.setMinutes(current.getMinutes() + 30) // Assuming 30 min slots
    }

    // You could theoretically filter out specifically booked slots here by checking actual DB records for overlaps
    // But for MVP, returning all shift slots if total patients < max_patients
    return { available: true, slots }
    
  } catch (error) {
    console.error('Error fetching slots:', error)
    throw error
  }
}

/**
 * Fetch all appointments for a hospital
 */
export async function getHospitalAppointments(hospitalId) {
  try {
    const supabase = await createClient()

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        hospital_id,
        patient_id,
        department_id,
        doctor_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        status,
        created_at,
        patients:patient_id(
          id,
          profile_id,
          profiles:profile_id(id, registration_no, name, email, mobile)
        )
      `)
      .eq('hospital_id', hospitalId)
      .order('appointment_date', { ascending: false })

    if (error) throw error

    // Fetch doctor details separately to avoid join complexity
    let appointmentsWithDoctors = appointments
    
    if (appointments && appointments.length > 0) {
      // Get unique doctor IDs
      const doctorIds = [...new Set(appointments.map(apt => apt.doctor_id).filter(Boolean))]
      
      if (doctorIds.length > 0) {
        const { data: doctors, error: doctorError } = await supabase
          .from('staff')
          .select(`
            id,
            profile_id,
            profiles!profile_id(id, name, registration_no, email)
          `)
          .in('id', doctorIds)

        if (!doctorError && doctors) {
          // Create a map of doctor details
          const doctorMap = {}
          doctors.forEach(doc => {
            doctorMap[doc.id] = doc.profiles
          })

          // Attach doctor details to appointments
          appointmentsWithDoctors = appointments.map(apt => ({
            ...apt,
            doctor: doctorMap[apt.doctor_id] || null
          }))
        }
      }
    }

    return appointmentsWithDoctors || []
  } catch (error) {
    console.error('Error fetching hospital appointments:', error)
    throw error
  }
}

/**
 * Fetch appointments assigned to a specific doctor
 */
export async function getDoctorAppointments(doctorId) {
  if (!doctorId) return []

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        hospital_id,
        patient_id,
        department_id,
        doctor_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        status,
        consultation_fee_snapshot,
        created_at,
        updated_at,
        patients:patient_id (
          id,
          profile_id,
          registration_no,
          profile:profiles!profile_id (
            id,
            name,
            email,
            mobile,
            avatar_url,
            registration_no
          )
        ),
        departments:department_id (
          id,
          name
        )
      `)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_slot', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    throw error
  }
}

/**
 * Reschedule an appointment
 */
export async function rescheduleAppointment({ appointmentId, newDate, newSlot }) {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_slot: newSlot,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard/doctor/appointments')

    return {
      success: true,
      message: 'Appointment rescheduled',
    }
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    throw error
  }
}

/**
 * Delete an appointment permanently
 */
export async function deleteAppointment(appointmentId) {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('appointments')
      .delete()
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard/doctor/appointments')

    return {
      success: true,
      message: 'Appointment deleted',
    }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
}

/**
 * Book an appointment
 */
export async function bookAppointment(data, currentUserId) {
  try {
    const adminClient = await createAdminClient()
    const appointmentId = `APT${Math.floor(100000 + Math.random() * 900000)}`

    const { data: appointment, error } = await adminClient
      .from('appointments')
      .insert({
        id: appointmentId,
        hospital_id: data.hospital_id,
        patient_id: data.patient_id,
        department_id: data.department_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_slot: data.appointment_slot,
        appointment_type: data.appointment_type || 'consultation',
        reason: data.reason || null,
        consultation_fee_snapshot: data.consultation_fee_snapshot,
        booked_by: currentUserId,
        status: 'scheduled'
      })
      .select()

    if (error) throw error

    return {
      success: true,
      appointment: appointment[0],
      message: 'Appointment booked successfully'
    }
  } catch (error) {
    console.error('Error booking appointment:', error)
    throw error
  }
}
