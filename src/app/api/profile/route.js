import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user profile with hospital details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        registration_no,
        name,
        email,
        mobile,
        phone,
        role,
        status,
        hospital_id,
        access_granted,
        avatar_url,
        created_at,
        updated_at,
        hospitals (
          id,
          registration_no,
          name,
          license_number,
          address,
          city,
          state,
          postal_code,
          phone,
          email,
          administrator_name,
          hospital_type,
          website,
          total_beds,
          icu_beds,
          emergency_services,
          inpatient_services,
          ambulance_services,
          feedback_enabled,
          account_status,
          logo_url,
          created_at,
          updated_at
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    // Based on user role, fetch additional data from role-specific tables
    let additionalData = {}

    switch (profile.role) {
      case 'doctor':
        // Fetch doctor-specific data when doctors table is created
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (doctorData) {
          additionalData.doctor = doctorData
        }
        break

      case 'reception':
        // Fetch receptionist-specific data when receptionist table is created
        const { data: receptionData } = await supabase
          .from('receptionists')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (receptionData) {
          additionalData.reception = receptionData
        }
        break

      case 'nurse':
        // Fetch nurse-specific data when nurse table is created
        const { data: nurseData } = await supabase
          .from('nurses')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (nurseData) {
          additionalData.nurse = nurseData
        }
        break

      case 'patient':
        // Fetch patient-specific data when patient table is created
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (patientData) {
          additionalData.patient = patientData
        }
        break

      case 'hospital_admin':
        // Hospital admin can access hospital data already included
        break

      case 'super_admin':
        // Super admin has full access
        break

      default:
        break
    }

    return NextResponse.json({
      profile,
      hospital: profile.hospitals ? profile.hospitals[0] : null,
      ...additionalData,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
