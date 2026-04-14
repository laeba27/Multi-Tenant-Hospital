import { NextResponse } from 'next/server'
import { searchPatients } from '@/actions/patients'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createUserServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.hospital_id) {
      return NextResponse.json(
        { error: 'No hospital associated with user' },
        { status: 400 }
      )
    }

    const results = await searchPatients(userProfile.hospital_id, query)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search patients error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search patients' },
      { status: 500 }
    )
  }
}
