'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { VALID_AUDIENCE, VALID_CATEGORY } from '@/lib/notices/options'

/**
 * Quick Updates — hospital announcements.
 *
 * One `notices` table serves both staff and patients; who sees a notice is
 * decided by `audience_roles`, and enforced by RLS (see migration 031). Reads
 * therefore use the ordinary client and simply trust the policy: a notice not
 * addressed to you is not returned. Writes are admin-only and re-check the
 * author's authority here.
 *
 * The audience/category vocabularies live in @/lib/notices/options -- a
 * 'use server' module may only export async functions.
 */

/** The signed-in user, if they may author notices for `hospitalId`. */
async function requireNoticeAuthor(hospitalId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Not signed in' }

  if (profile.role === 'super_admin') return { profile, adminClient }

  if (profile.role !== 'hospital_admin') {
    return { error: 'Only a hospital administrator can post updates.' }
  }
  if (hospitalId && profile.hospital_id !== hospitalId) {
    return { error: 'That hospital is not yours.' }
  }

  return { profile, adminClient }
}

/**
 * Normalise the audience the form sent.
 *
 * 'all' and 'staff' are wildcards, so combining them with named roles is
 * meaningless -- ['all','doctor'] reads the same as ['all']. Collapse it, or the
 * author will think they narrowed the audience when they didn't.
 */
function normaliseAudience(roles) {
  const clean = (Array.isArray(roles) ? roles : [roles])
    .filter((r) => VALID_AUDIENCE.has(r))

  if (clean.length === 0) return { error: 'Choose at least one audience.' }
  if (clean.includes('all')) return { roles: ['all'] }

  // 'staff' subsumes every staff role, but not 'patient'.
  if (clean.includes('staff')) {
    return { roles: clean.includes('patient') ? ['all'] : ['staff'] }
  }

  return { roles: [...new Set(clean)] }
}

/**
 * Post an update.
 *
 * `audienceRoles` is an array: ['all'] | ['staff'] | ['patient'] | any mix of
 * named roles, e.g. ['doctor','nurse','pharmacist'].
 */
export async function createNotice({
  hospitalId,
  title,
  body,
  category = 'general',
  audienceRoles = ['all'],
  isPinned = false,
  expiresAt = null,
  imageDocumentId = null,
}) {
  const auth = await requireNoticeAuthor(hospitalId)
  if (auth.error) return { success: false, error: auth.error }
  const { profile, adminClient } = auth

  const cleanTitle = (title || '').trim()
  if (!cleanTitle) return { success: false, error: 'A title is required.' }
  if (!VALID_CATEGORY.has(category)) return { success: false, error: 'Unknown category.' }

  const audience = normaliseAudience(audienceRoles)
  if (audience.error) return { success: false, error: audience.error }

  const targetHospital = hospitalId || profile.hospital_id
  if (!targetHospital) {
    return { success: false, error: 'A hospital is required to post an update.' }
  }

  const { data: notice, error } = await adminClient
    .from('notices')
    .insert({
      hospital_id: targetHospital,
      created_by: profile.id,
      title: cleanTitle,
      body: (body || '').trim() || null,
      category,
      audience_roles: audience.roles,
      is_pinned: Boolean(isPinned),
      expires_at: expiresAt || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createNotice failed:', error)
    return { success: false, error: 'Could not post that update.' }
  }

  // An image was uploaded before the notice existed (the upload needs a file,
  // the notice needs an id) -- attach it now.
  if (imageDocumentId) {
    await adminClient
      .from('documents')
      .update({ notice_id: notice.id })
      .eq('id', imageDocumentId)
      .eq('scope', 'notice_media')
  }

  revalidatePath('/dashboard')
  return { success: true, notice }
}

export async function updateNotice(noticeId, updates = {}) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('notices')
    .select('id, hospital_id')
    .eq('id', noticeId)
    .maybeSingle()

  if (!existing) return { success: false, error: 'That update no longer exists.' }

  const auth = await requireNoticeAuthor(existing.hospital_id)
  if (auth.error) return { success: false, error: auth.error }
  const { adminClient } = auth

  const patch = { updated_at: new Date().toISOString() }

  if (updates.title !== undefined) {
    const t = (updates.title || '').trim()
    if (!t) return { success: false, error: 'A title is required.' }
    patch.title = t
  }
  if (updates.body !== undefined) patch.body = (updates.body || '').trim() || null
  if (updates.category !== undefined) {
    if (!VALID_CATEGORY.has(updates.category)) {
      return { success: false, error: 'Unknown category.' }
    }
    patch.category = updates.category
  }
  if (updates.audienceRoles !== undefined) {
    const audience = normaliseAudience(updates.audienceRoles)
    if (audience.error) return { success: false, error: audience.error }
    patch.audience_roles = audience.roles
  }
  if (updates.isPinned !== undefined) patch.is_pinned = Boolean(updates.isPinned)
  if (updates.expiresAt !== undefined) patch.expires_at = updates.expiresAt || null

  const { error } = await adminClient.from('notices').update(patch).eq('id', noticeId)

  if (error) {
    console.error('updateNotice failed:', error)
    return { success: false, error: 'Could not save that update.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteNotice(noticeId) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('notices')
    .select('id, hospital_id')
    .eq('id', noticeId)
    .maybeSingle()

  if (!existing) return { success: false, error: 'That update no longer exists.' }

  const auth = await requireNoticeAuthor(existing.hospital_id)
  if (auth.error) return { success: false, error: auth.error }

  const { error } = await auth.adminClient.from('notices').delete().eq('id', noticeId)
  if (error) {
    console.error('deleteNotice failed:', error)
    return { success: false, error: 'Could not delete that update.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Every notice at a hospital, for the admin who manages them -- including ones
 * whose audience excludes the admin themselves, and expired ones. The manage
 * RLS policy allows this; the read policy alone would not.
 */
export async function getHospitalNoticesForAdmin(hospitalId) {
  const auth = await requireNoticeAuthor(hospitalId)
  if (auth.error) return { success: false, error: auth.error, notices: [] }

  const { data, error } = await auth.adminClient
    .from('notices')
    .select('id, title, body, category, audience_roles, is_pinned, published_at, expires_at, created_at, created_by')
    .eq('hospital_id', hospitalId || auth.profile.hospital_id)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('getHospitalNoticesForAdmin failed:', error)
    return { success: false, error: error.message, notices: [] }
  }
  return { success: true, notices: data || [] }
}

/**
 * The updates addressed to the signed-in user, whoever they are.
 *
 * No audience filtering here on purpose: RLS already decides what this person
 * may see, so a plain select IS the audience filter. One action serves the
 * doctor's page, the nurse's, the receptionist's and the patient's.
 */
export async function getMyUpdates({ limit = 20 } = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', notices: [] }

  const { data, error } = await supabase
    .from('notices')
    .select(`
      id, hospital_id, title, body, category, audience_roles, is_pinned,
      published_at, expires_at,
      hospital:hospitals!notices_hospital_id_fkey ( name )
    `)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getMyUpdates failed:', error)
    return { success: false, error: error.message, notices: [] }
  }
  return { success: true, notices: data || [] }
}
