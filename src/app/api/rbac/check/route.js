import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/actions/rbac'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { hospital_id, staff_id, role } = body

    // Get current user to verify request
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = {
      book_appointment: await checkPermission(hospital_id, staff_id, role, 'book_appointment'),
    }

    return Response.json({ permissions })
  } catch (error) {
    console.error('RBAC check API error:', error)
    return Response.json({ error: 'Failed to check permissions' }, { status: 500 })
  }
}
