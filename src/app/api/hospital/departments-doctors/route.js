import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/hospital/departments-doctors
 * 
 * Fetches all active departments and all active doctors for the current hospital
 * in a single request for efficient data loading.
 * 
 * Query Parameters:
 * - hospital_id (required): The hospital registration_no (text) to fetch departments and doctors for
 * 
 * Returns:
 * {
 *   departments: Array of active departments
 *   doctors: Array of active doctors with their department information
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const hospitalRegistrationNo = searchParams.get('hospital_id')

    console.log('[API] /hospital/departments-doctors called with:', { hospitalRegistrationNo })

    if (!hospitalRegistrationNo) {
      return Response.json(
        { error: 'hospital_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get hospital UUID from registration_no for departments query
    const { data: hospital, error: hospitalError } = await supabase
      .from('hospitals')
      .select('id')
      .eq('registration_no', hospitalRegistrationNo)
      .single()

    console.log('[API] Hospital lookup:', { hospitalId: hospital?.id, error: hospitalError?.message })

    if (hospitalError || !hospital) {
      // Return helpful error message
      return Response.json(
        { 
          error: 'Hospital not found', 
          details: hospitalError?.message,
          registrationNo: hospitalRegistrationNo
        },
        { status: 404 }
      )
    }

    // Fetch all active departments (uses hospital UUID)
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code, description')
      .eq('hospital_id', hospital.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    console.log('[API] Departments:', { count: departments?.length, error: deptError?.message })

    if (deptError) {
      console.error('[API] Department error:', deptError)
      throw deptError
    }

    // Fetch all active doctors (uses hospital registration_no)
    const { data: doctors, error: doctorError } = await supabase
      .from('staff')
      .select(`
        id,
        employee_registration_no,
        name,
        gender,
        avatar_url,
        department_id,
        specialization,
        qualification,
        consultation_fee,
        max_patients_per_day,
        shift_start_time,
        shift_end_time,
        work_days,
        is_active
      `)
      .eq('hospital_id', hospitalRegistrationNo)
      .eq('role', 'doctor')
      .eq('is_active', true)

    console.log('[API] Doctors:', { count: doctors?.length, error: doctorError?.message })

    if (doctorError) {
      console.error('[API] Doctor error:', doctorError)
      throw doctorError
    }

    const response = {
      departments: departments || [],
      doctors: doctors || [],
      success: true
    }

    console.log('[API] Success response:', { deptCount: response.departments.length, docCount: response.doctors.length })

    return Response.json(response)
  } catch (error) {
    console.error('[API] Error in /hospital/departments-doctors:', error)
    return Response.json(
      { 
        error: 'Failed to fetch departments and doctors', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
