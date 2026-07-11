'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  isR2Configured,
  validateUpload,
  buildStorageKey,
  putObject,
  deleteObject,
  getSignedDownloadUrl,
  getPublicUrl,
  UPLOAD_RULES,
} from '@/lib/storage/r2'

/**
 * File uploads.
 *
 * R2 has no row-level security, so THIS FILE is the access control for every
 * uploaded file in the product. Two rules, and neither may be relaxed:
 *
 *   1. Nothing writes to the bucket without an authority check here first.
 *   2. No private file is ever handed out as a stable URL. Downloads are
 *      short-lived signed URLs, minted only after re-checking ownership.
 */

const STAFF_ROLES = ['hospital_admin', 'doctor', 'receptionist', 'reception', 'staff']

async function getActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()

  return profile ? { profile, adminClient } : null
}

/**
 * May `actor` attach a file of this `scope` to this owner?
 *
 * Deliberately explicit and boring. Every branch answers one question: does
 * this person have authority over the thing the file hangs off?
 */
async function canUpload(actor, scope, { hospitalId, patientId, profileId }) {
  const { profile, adminClient } = actor
  const isStaff = STAFF_ROLES.includes(profile.role)
  const isSuper = profile.role === 'super_admin'

  switch (scope) {
    // Only ever your own face.
    case 'avatar':
      return profileId === profile.id
        ? { ok: true }
        : { ok: false, error: 'You can only change your own profile picture.' }

    // Hospital branding + notice images: the hospital's own admins.
    case 'hospital_media':
    case 'notice_media':
      if (isSuper) return { ok: true }
      if (profile.role !== 'hospital_admin') {
        return { ok: false, error: 'Only a hospital administrator can upload hospital media.' }
      }
      return profile.hospital_id === hospitalId
        ? { ok: true }
        : { ok: false, error: 'That hospital is not yours.' }

    // Medical records. Either the patient themselves, or staff at the hospital
    // that owns the record.
    case 'prescription':
    case 'medical_report': {
      if (isSuper) return { ok: true }

      if (profile.role === 'patient') {
        // The patient link row must belong to THIS person and THIS hospital --
        // otherwise a patient could post a report into someone else's chart by
        // guessing a patient_id.
        const { data: link } = await adminClient
          .from('patients')
          .select('id')
          .eq('id', patientId)
          .eq('profile_id', profile.id)
          .eq('hospital_id', hospitalId)
          .maybeSingle()

        return link
          ? { ok: true }
          : { ok: false, error: 'You can only upload documents to your own record.' }
      }

      if (isStaff) {
        if (profile.hospital_id !== hospitalId) {
          return { ok: false, error: 'That patient belongs to another hospital.' }
        }
        // And the patient must genuinely be registered at this hospital.
        const { data: link } = await adminClient
          .from('patients')
          .select('id')
          .eq('id', patientId)
          .eq('hospital_id', hospitalId)
          .maybeSingle()

        return link ? { ok: true } : { ok: false, error: 'That patient is not at your hospital.' }
      }

      return { ok: false, error: 'You do not have permission to upload this document.' }
    }

    default:
      return { ok: false, error: `Unknown upload type: ${scope}` }
  }
}

/**
 * Upload a file. Takes a FormData so the bytes stream from the browser without
 * a base64 round-trip.
 *
 * Expects: file, scope, and whichever owner ids the scope requires, plus
 * optional title / description / documentType / appointmentId / noticeId.
 */
export async function uploadDocument(formData) {
  if (!isR2Configured()) {
    return {
      success: false,
      error: 'File storage is not configured yet. Add your Cloudflare R2 keys to .env.local.',
    }
  }

  const actor = await getActor()
  if (!actor) return { success: false, error: 'Not signed in' }

  const file = formData.get('file')
  const scope = formData.get('scope')

  if (!file || typeof file === 'string' || file.size === 0) {
    return { success: false, error: 'No file was selected.' }
  }
  if (!UPLOAD_RULES[scope]) {
    return { success: false, error: `Unknown upload type: ${scope}` }
  }

  const hospitalId = formData.get('hospitalId') || null
  const patientId = formData.get('patientId') || null
  // A profile-scoped upload is always the actor's own; never trust a client id.
  const profileId = actor.profile.id

  // Validate the REAL bytes, not what the browser claimed.
  const check = validateUpload(scope, { mimeType: file.type, sizeBytes: file.size })
  if (!check.ok) return { success: false, error: check.error }

  const allowed = await canUpload(actor, scope, { hospitalId, patientId, profileId })
  if (!allowed.ok) return { success: false, error: allowed.error }

  const key = buildStorageKey(scope, {
    hospitalId,
    patientId,
    profileId,
    mimeType: file.type,
  })

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    await putObject({ key, body: bytes, mimeType: file.type })
  } catch (error) {
    console.error('R2 upload failed:', error)
    return { success: false, error: 'The upload failed. Please try again.' }
  }

  const { adminClient, profile } = actor

  const { data: doc, error } = await adminClient
    .from('documents')
    .insert({
      scope,
      storage_key: key,
      file_name: file.name || 'upload',
      mime_type: file.type,
      size_bytes: file.size,
      profile_id: scope === 'avatar' ? profileId : null,
      hospital_id: hospitalId,
      patient_id: patientId,
      appointment_id: formData.get('appointmentId') || null,
      notice_id: formData.get('noticeId') || null,
      uploaded_by: profile.id,
      uploaded_by_role: profile.role === 'patient' ? 'patient' : 'staff',
      title: formData.get('title') || null,
      description: formData.get('description') || null,
      document_type: formData.get('documentType') || null,
      is_public: check.rule.isPublic,
    })
    .select()
    .single()

  if (error) {
    // The bytes are in the bucket but the row failed -- that object would be
    // unreachable and unbilled-for forever. Roll it back.
    console.error('Document row insert failed, removing orphaned object:', error)
    await deleteObject(key).catch((e) => console.error('Orphan cleanup failed:', e))
    return { success: false, error: 'Could not save the file. Please try again.' }
  }

  // An avatar is a singleton: point the profile at the new one and retire the
  // old rows so the UI never has to guess which is current.
  if (scope === 'avatar') {
    await adminClient
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('scope', 'avatar')
      .eq('profile_id', profileId)
      .neq('id', doc.id)
      .is('deleted_at', null)

    const url = await getSignedDownloadUrl(key, { expiresIn: 60 * 60 * 24 * 7 })
    await adminClient.from('profiles').update({ avatar_url: url }).eq('id', profileId)
  }

  revalidatePath('/dashboard')
  return { success: true, document: doc }
}

/**
 * A usable URL for one document, after re-checking that this user may have it.
 *
 * The RLS select policies on `documents` do the authorisation: we read the row
 * with the USER'S client, so a row they cannot see simply isn't returned, and
 * we never reach the signing step.
 */
export async function getDocumentUrl(documentId) {
  if (!isR2Configured()) return { success: false, error: 'File storage is not configured.' }

  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, storage_key, file_name, is_public')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !doc) {
    // Indistinguishable from "does not exist" on purpose -- don't confirm the
    // existence of a file to someone not allowed to see it.
    return { success: false, error: 'That file is not available.' }
  }

  if (doc.is_public) {
    const publicUrl = getPublicUrl(doc.storage_key)
    if (publicUrl) return { success: true, url: publicUrl }
  }

  const url = await getSignedDownloadUrl(doc.storage_key, {
    expiresIn: 300,
    fileName: doc.file_name,
  })
  return { success: true, url }
}

/**
 * List documents for a patient (their medical records / prescriptions).
 * RLS decides visibility: the patient themselves, or staff at their hospital.
 */
export async function getPatientDocuments(patientId, { scope = null } = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select(
      'id, scope, file_name, mime_type, size_bytes, title, description, document_type, uploaded_by_role, appointment_id, created_at'
    )
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (scope) query = query.eq('scope', scope)

  const { data, error } = await query
  if (error) {
    console.error('getPatientDocuments failed:', error)
    return []
  }
  return data || []
}

/**
 * Every medical document belonging to the signed-in patient, across all the
 * hospitals they're registered at. Powers the patient portal's records page.
 */
export async function getMyDocuments({ scope = null } = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: links } = await supabase.from('patients').select('id').eq('profile_id', user.id)
  const patientIds = (links || []).map((l) => l.id)
  if (patientIds.length === 0) return []

  let query = supabase
    .from('documents')
    .select(
      'id, scope, file_name, mime_type, size_bytes, title, description, document_type, uploaded_by_role, hospital_id, created_at, hospital:hospitals!documents_hospital_id_fkey(name)'
    )
    .in('patient_id', patientIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (scope) query = query.eq('scope', scope)

  const { data, error } = await query
  if (error) {
    console.error('getMyDocuments failed:', error)
    return []
  }
  return data || []
}

/** A hospital's public gallery. */
export async function getHospitalMedia(hospitalId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('id, storage_key, file_name, title, description, created_at')
    .eq('hospital_id', hospitalId)
    .eq('scope', 'hospital_media')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getHospitalMedia failed:', error)
    return []
  }

  // Public bucket objects can be linked directly; otherwise sign each one.
  return Promise.all(
    (data || []).map(async (d) => ({
      ...d,
      url: getPublicUrl(d.storage_key) || (await getSignedDownloadUrl(d.storage_key, { expiresIn: 3600 })),
    }))
  )
}

/**
 * Soft-delete. A medical record must stay auditable, so the row survives with
 * `deleted_at` set and the bytes stay in the bucket.
 */
export async function deleteDocument(documentId) {
  const actor = await getActor()
  if (!actor) return { success: false, error: 'Not signed in' }
  const { profile, adminClient } = actor

  const { data: doc } = await adminClient
    .from('documents')
    .select('id, scope, hospital_id, patient_id, profile_id, uploaded_by')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!doc) return { success: false, error: 'That file is not available.' }

  const isSuper = profile.role === 'super_admin'
  const isOwnAvatar = doc.scope === 'avatar' && doc.profile_id === profile.id
  const isOwnUpload = doc.uploaded_by === profile.id
  const isHospitalAdmin =
    profile.role === 'hospital_admin' && profile.hospital_id === doc.hospital_id

  if (!isSuper && !isOwnAvatar && !isOwnUpload && !isHospitalAdmin) {
    return { success: false, error: 'You do not have permission to delete this file.' }
  }

  const { error } = await adminClient
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId)

  if (error) {
    console.error('deleteDocument failed:', error)
    return { success: false, error: 'Could not delete that file.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
