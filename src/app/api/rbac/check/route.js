import { createClient } from '@/lib/supabase/server'
import { getPermissionsFor } from '@/actions/rbac'

/**
 * The permissions the signed-in user actually holds.
 *
 * Everything is resolved from the SESSION. The previous version read
 * `hospital_id`, `staff_id` and `role` out of the request body -- so a caller
 * could POST `role: 'hospital_admin'` and be told they hold every permission,
 * then render every button. A client cannot be allowed to nominate its own
 * role; only the server knows who you are.
 *
 * This drives UI only. The real enforcement is requirePermission() inside the
 * server actions -- hiding a button has never been access control.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, hospital_id, registration_no')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // rbac.staff_id references staff.id, not profiles.id -- resolve the staff
    // row so a per-person override can actually match.
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id, role')
      .eq('hospital_id', profile.hospital_id)
      .eq('employee_registration_no', profile.registration_no || '')
      .maybeSingle()

    const permissions = await getPermissionsFor(
      profile.hospital_id,
      staffRow?.id || null,
      staffRow?.role || profile.role
    )

    return Response.json({ permissions })
  } catch (error) {
    console.error('RBAC check API error:', error)
    return Response.json({ error: 'Failed to check permissions' }, { status: 500 })
  }
}
