'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

/**
 * Write a notification row.
 *
 * Target EITHER one person (recipientId) OR every holder of a role at a
 * hospital (recipientRole + hospitalId) -- e.g. fan a new booking request out
 * to the whole reception desk without knowing who is on shift.
 *
 * Uses the admin client on purpose: a patient has to be able to create a
 * notification addressed to the reception desk, and no sane RLS insert policy
 * would permit that. The table therefore grants no insert to `authenticated`
 * and this function is the only writer.
 */
export async function notify({
  recipientId = null,
  recipientRole = null,
  hospitalId = null,
  kind,
  title,
  body = null,
  link = null,
  entityType = 'appointment',
  entityId = null,
}) {
  if (!kind || !title) return { success: false, error: 'kind and title are required' }
  if (!recipientId && !(recipientRole && hospitalId)) {
    return { success: false, error: 'Need a recipientId, or a recipientRole + hospitalId' }
  }

  try {
    const adminClient = await createAdminClient()
    const { error } = await adminClient.from('notifications').insert({
      recipient_id: recipientId,
      recipient_role: recipientRole,
      hospital_id: hospitalId,
      kind,
      title,
      body,
      link,
      entity_type: entityType,
      entity_id: entityId,
    })
    if (error) throw error
    return { success: true }
  } catch (error) {
    // A notification is never worth failing the surrounding action for -- the
    // appointment itself is the thing that matters. Log and move on.
    console.error('notify failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * The signed-in user's notifications: everything addressed to them personally,
 * plus everything addressed to their role at their hospital. RLS does the
 * filtering, so this is a plain select.
 */
export async function getMyNotifications({ limit = 20, unreadOnly = false } = {}) {
  const { supabase, profile } = await getActor()
  if (!profile) return { items: [], unreadCount: 0 }

  let query = supabase
    .from('notifications')
    .select('id, kind, title, body, link, entity_type, entity_id, read_at, created_at, recipient_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.is('read_at', null)

  const { data, error } = await query
  if (error) {
    console.error('getMyNotifications failed:', error)
    return { items: [], unreadCount: 0 }
  }

  const items = data || []
  return {
    items,
    unreadCount: items.filter((n) => !n.read_at).length,
  }
}

/**
 * Mark one notification read. Only works on personally-addressed rows -- a
 * role-addressed notification is a shared broadcast, and one receptionist
 * dismissing it must not hide it from the rest of the desk. RLS enforces this.
 */
export async function markNotificationRead(notificationId) {
  const { supabase, profile } = await getActor()
  if (!profile) return { success: false, error: 'Not signed in' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', profile.id)

  if (error) {
    console.error('markNotificationRead failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function markAllNotificationsRead() {
  const { supabase, profile } = await getActor()
  if (!profile) return { success: false, error: 'Not signed in' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', profile.id)
    .is('read_at', null)

  if (error) {
    console.error('markAllNotificationsRead failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * How many appointment requests are sitting unreviewed at this hospital.
 * Drives the count badge on the reception/hospital "Booking Requests" tab.
 */
export async function getPendingRequestCount(hospitalId) {
  if (!hospitalId) return 0
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending_confirmation')

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('getPendingRequestCount failed:', error)
    return 0
  }
}

const NOTIFICATION_BADGES = {
  appointment_requested: 'New request',
  appointment_confirmed: 'Confirmed',
  appointment_cancelled: 'Cancelled',
  appointment_rescheduled: 'Rescheduled',
}

/**
 * Notification feed for the top-bar bell.
 * Combines real notification rows, hospital notices, and issue activity,
 * newest first. Returns { items: [{ id, kind, title, body, badge, at, link,
 * unread }], count } where count is the number of UNREAD real notifications
 * (notices and issues have no read state, so they don't inflate the badge).
 */
export async function getNavNotifications() {
  const { supabase, profile } = await getActor()
  if (!profile) return { items: [], count: 0 }

  const items = []
  let unreadCount = 0

  // Real notifications: appointment requests, confirmations, cancellations.
  // RLS returns rows addressed to this person plus rows addressed to their
  // role at their hospital, so no filtering is needed here.
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, kind, title, body, link, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(12)

  for (const n of notifications || []) {
    const unread = !n.read_at
    if (unread) unreadCount++
    items.push({
      id: `notification-${n.id}`,
      notificationId: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body || '',
      badge: NOTIFICATION_BADGES[n.kind] || 'Update',
      at: n.created_at,
      link: n.link || null,
      unread,
    })
  }

  // Notices for the user's hospital (skips silently if none / table absent).
  // Exclude notices the current user authored -- they don't need to be
  // notified about their own announcements.
  if (profile.hospital_id) {
    const { data: notices } = await supabase
      .from('notices')
      .select('id, title, body, category, is_pinned, published_at, created_by')
      .eq('hospital_id', profile.hospital_id)
      .neq('created_by', profile.id)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(8)

    for (const n of notices || []) {
      items.push({
        id: `notice-${n.id}`,
        kind: 'notice',
        title: n.title,
        body: n.body || '',
        badge: n.is_pinned ? 'Pinned' : n.category || 'Notice',
        at: n.published_at,
      })
    }
  }

  // Issue activity. Hospital admins see their own issues (esp. responses);
  // super admins see the latest issues raised across hospitals.
  if (profile.role === 'hospital_admin' && profile.hospital_id) {
    // Hospital admins raise their own issues, so the issue itself is their
    // own message -- only the super-admin response is worth notifying about.
    const { data: issues } = await supabase
      .from('issues')
      .select('id, title, status, admin_response, responded_at')
      .eq('hospital_id', profile.hospital_id)
      .not('admin_response', 'is', null)
      .order('responded_at', { ascending: false })
      .limit(8)

    for (const i of issues || []) {
      items.push({
        id: `issue-${i.id}`,
        kind: 'issue',
        title: `Response: ${i.title}`,
        body: i.admin_response,
        badge: i.status.replace('_', ' '),
        at: i.responded_at,
      })
    }
  } else if (profile.role === 'super_admin') {
    // Super admins see issues raised by others, never ones they raised.
    const { data: issues } = await supabase
      .from('issues')
      .select('id, title, status, created_at, raised_by')
      .neq('raised_by', profile.id)
      .order('created_at', { ascending: false })
      .limit(8)

    for (const i of issues || []) {
      items.push({
        id: `issue-${i.id}`,
        kind: 'issue',
        title: i.title,
        body: `Status: ${i.status.replace('_', ' ')}`,
        badge: i.status.replace('_', ' '),
        at: i.created_at,
      })
    }
  }

  items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
  const top = items.slice(0, 12)

  // The bell badge counts unread notifications only. Notices and issues have
  // no read state, so counting them would leave the badge permanently lit.
  return { items: top, count: unreadCount }
}
