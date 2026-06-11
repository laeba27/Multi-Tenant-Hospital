'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, hospital_id')
    .eq('id', user.id)
    .single()

  return { supabase, profile }
}

/**
 * Hospital admin raises a new issue for their hospital.
 */
export async function createIssue({ title, description, category = 'general', priority = 'medium' }) {
  const { supabase, profile } = await getActor()
  if (!profile) return { success: false, error: 'Unauthorized' }
  if (profile.role !== 'hospital_admin') {
    return { success: false, error: 'Only hospital admins can raise issues' }
  }
  if (!title?.trim()) return { success: false, error: 'Title is required' }
  if (!profile.hospital_id) return { success: false, error: 'No hospital linked to your account' }

  const { data, error } = await supabase
    .from('issues')
    .insert([
      {
        hospital_id: profile.hospital_id,
        raised_by: profile.id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        priority,
        status: 'open',
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('createIssue error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, id: data.id }
}

/**
 * Hospital admin: list their own hospital's issues.
 */
export async function getHospitalIssues() {
  const { supabase, profile } = await getActor()
  if (!profile || profile.role !== 'hospital_admin') return []

  const { data, error } = await supabase
    .from('issues')
    .select('id, title, description, category, priority, status, admin_response, responded_at, created_at')
    .eq('hospital_id', profile.hospital_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getHospitalIssues error:', error)
    return []
  }
  return data || []
}

/**
 * Super admin: every issue across all hospitals, with hospital + raiser names.
 */
export async function getAllIssues() {
  const { profile } = await getActor()
  if (!profile || profile.role !== 'super_admin') return []

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('issues')
    .select('id, hospital_id, raised_by, title, description, category, priority, status, admin_response, responded_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAllIssues error:', error)
    return []
  }

  const hospitalIds = [...new Set((data || []).map((i) => i.hospital_id).filter(Boolean))]
  const raiserIds = [...new Set((data || []).map((i) => i.raised_by).filter(Boolean))]

  const [hospRes, profRes] = await Promise.all([
    hospitalIds.length
      ? adminClient.from('hospitals').select('registration_no, name').in('registration_no', hospitalIds)
      : Promise.resolve({ data: [] }),
    raiserIds.length
      ? adminClient.from('profiles').select('id, name, email').in('id', raiserIds)
      : Promise.resolve({ data: [] }),
  ])

  const hospName = Object.fromEntries((hospRes.data || []).map((h) => [h.registration_no, h.name]))
  const profName = Object.fromEntries((profRes.data || []).map((p) => [p.id, p]))

  return (data || []).map((i) => ({
    ...i,
    hospital_name: hospName[i.hospital_id] || i.hospital_id || 'Unknown',
    raiser_name: profName[i.raised_by]?.name || '—',
    raiser_email: profName[i.raised_by]?.email || '',
  }))
}

/**
 * Super admin: update an issue's status and/or post a response.
 */
export async function updateIssue(issueId, { status, response }) {
  const { profile } = await getActor()
  if (!profile || profile.role !== 'super_admin') {
    return { success: false, error: 'Only super admins can update issues' }
  }
  if (!issueId) return { success: false, error: 'Issue id required' }

  const adminClient = await createAdminClient()
  const patch = { updated_at: new Date().toISOString() }
  if (status) patch.status = status
  if (response !== undefined) {
    patch.admin_response = response?.trim() || null
    patch.responded_by = profile.id
    patch.responded_at = new Date().toISOString()
  }

  const { error } = await adminClient.from('issues').update(patch).eq('id', issueId)
  if (error) {
    console.error('updateIssue error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
