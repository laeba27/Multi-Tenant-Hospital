import { NextResponse } from 'next/server'
import {
  getHospitalPatients,
  onboardPatient,
  updatePatient,
} from '@/actions/patients'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let hospitalId = searchParams.get('hospital_id')

    if (!hospitalId) {
      // Get hospital_id from user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('hospital_id')
        .eq('id', user.id)
        .single()

      if (!profile?.hospital_id) {
        return NextResponse.json(
          { error: 'No hospital associated with user' },
          { status: 400 }
        )
      }

      hospitalId = profile.hospital_id
    }

    const patients = await getHospitalPatients(hospitalId)
    return NextResponse.json(patients)
  } catch (error) {
    console.error('Patients GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createUserServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is hospital_admin or reception
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.hospital_id) {
      return NextResponse.json(
        { error: 'User has no hospital association' },
        { status: 400 }
      )
    }

    if (!['hospital_admin', 'receptionist'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only hospital admins and receptionists can register patients' },
        { status: 403 }
      )
    }

    const patientData = await request.json()

    // Validate required fields
    if (!patientData.name || !patientData.mobile) {
      return NextResponse.json(
        { error: 'Name and mobile are required' },
        { status: 400 }
      )
    }

    // Call the onboarding logic
    const result = await onboardPatient(
      patientData,
      userProfile.hospital_id,
      user.id
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Patients POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to register patient' },
      { status: 500 }
    )
  }
}
