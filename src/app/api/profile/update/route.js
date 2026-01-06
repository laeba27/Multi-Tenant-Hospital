import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { type, profileData, hospitalData } = body

    // Update profile
    if (type === 'profile' || type === 'both') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }
    }

    // Update hospital (only for hospital_admin)
    if ((type === 'hospital' || type === 'both') && hospitalData) {
      // Check if user is hospital_admin
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileCheck?.role !== 'hospital_admin') {
        return NextResponse.json(
          { error: 'Only hospital admins can update hospital details' },
          { status: 403 }
        )
      }

      // Get hospital_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('hospital_id')
        .eq('id', user.id)
        .single()

      if (!profile?.hospital_id) {
        return NextResponse.json(
          { error: 'Hospital not found' },
          { status: 404 }
        )
      }

      const { error: hospitalError } = await supabase
        .from('hospitals')
        .update({
          ...hospitalData,
          updated_at: new Date().toISOString(),
        })
        .eq('registration_no', profile.hospital_id)

      if (hospitalError) {
        throw hospitalError
      }
    }

    return NextResponse.json({
      message: 'Updated successfully',
      success: true,
    })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update' },
      { status: 500 }
    )
  }
}
