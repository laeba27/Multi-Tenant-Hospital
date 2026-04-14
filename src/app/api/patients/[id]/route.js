import { NextResponse } from 'next/server'
import { getPatient, updatePatient, deletePatient } from '@/actions/patients'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  try {
    const supabase = await createUserServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hospitalId = searchParams.get('hospital_id')

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id')
      .eq('id', user.id)
      .single()

    const finalHospitalId = hospitalId || userProfile?.hospital_id

    const patient = await getPatient(params.id, finalHospitalId)

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Get patient error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patient' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createUserServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (!['hospital_admin', 'receptionist', 'doctor'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const updateData = await request.json()
    const result = await updatePatient(params.id, userProfile.hospital_id, updateData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update patient error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update patient' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createUserServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (userProfile.role !== 'hospital_admin') {
      return NextResponse.json(
        { error: 'Only hospital admins can delete patients' },
        { status: 403 }
      )
    }

    const result = await deletePatient(params.id, userProfile.hospital_id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Delete patient error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete patient' },
      { status: 500 }
    )
  }
}
