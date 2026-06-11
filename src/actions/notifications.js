'use server'

import { createClient } from '@/lib/supabase/server'

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
 * Notification feed for the top-bar bell.
 * Combines hospital notices and recent issue activity, newest first.
 * Returns { items: [{ id, kind, title, body, badge, at }], count }.
 */
export async function getNavNotifications() {
  const { supabase, profile } = await getActor()
  if (!profile) return { items: [], count: 0 }

  const items = []

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
  return { items: top, count: top.length }
}
