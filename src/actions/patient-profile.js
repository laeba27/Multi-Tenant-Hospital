'use server'

/**
 * The patient's own profile page (/dashboard/patient/profile): read and edit
 * their details, change their email (verified by a code) and their password.
 *
 * Everything is keyed off the signed-in user -- never an id from the browser.
 * IDs (patient ID, per-hospital record IDs), the hospital links themselves and
 * clinical notes written by staff are read-only here.
 *
 * Personal and contact details live on `profiles`. Health details, the
 * emergency contact and insurance live on each `patients` row (one per
 * hospital the patient is registered at); a patient editing them is updating
 * facts about themselves, so the change is applied to every one of their rows.
 */

import { createHash } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ageToStore } from '@/lib/patients/age'
import { isPlaceholderEmail } from '@/lib/utils/id-generator'
import { todayInIndia } from '@/lib/cron/followUpReminders'

const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed']
const OTP_MAX_ATTEMPTS = 5

async function requirePatient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const svc = createServiceRoleClient()
  const { data: profile, error } = await svc.from('profiles').select('*').eq('id', user.id).single()
  if (error || !profile) throw new Error('Profile not found')
  if (profile.role !== 'patient') throw new Error('This page is for patients')
  return { supabase, svc, user, profile }
}

const fail = (e) => ({ success: false, error: e?.message || 'Something went wrong' })

/** Trimmed text or null; throws if longer than `max`. */
function text(v, label, max = 200) {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (s.length > max) throw new Error(`${label} is too long (max ${max} characters)`)
  return s
}

function phone(v, label) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  if (!/^\+?[\d\s()-]+$/.test(s) || digits.length < 7 || digits.length > 15) {
    throw new Error(`Enter a valid ${label}`)
  }
  return s
}

function numberIn(v, label, min, max) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}`)
  return Math.round(n * 10) / 10
}

function oneOf(v, list, label) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const hit = list.find((x) => x.toLowerCase() === s.toLowerCase())
  if (!hit) throw new Error(`Choose a valid ${label}`)
  return hit
}

export async function getMyPatientProfile() {
  try {
    const { svc, user, profile } = await requirePatient()
    const { data: links, error } = await svc
      .from('patients')
      .select('id, registration_no, hospital_id, is_active, created_at, height, weight, marital_status, allergies, chronic_conditions, insurance_provider, insurance_number, emergency_contact_name, emergency_contact_mobile, hospital:hospitals!hospital_id(name, city)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error

    // The shared fields should agree across hospitals; show the most recently
    // filled value of each.
    const pick = (key) => {
      for (const l of [...(links || [])].reverse()) {
        const v = l[key]
        if (v !== null && v !== undefined && String(v).trim() !== '') return v
      }
      return ''
    }

    const email = profile.email || ''
    return {
      success: true,
      profile: {
        name: profile.name || '',
        email: isPlaceholderEmail(email) ? '' : email,
        emailVerified: Boolean(profile.email_verified) && !isPlaceholderEmail(email),
        mobile: profile.mobile || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth || '',
        age_years: profile.age_years ?? '',
        age_recorded_on: profile.age_recorded_on || null,
        blood_group: profile.blood_group || '',
        aadhaar_number: profile.aadhaar_number || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        country: profile.country || '',
        height: pick('height'),
        weight: pick('weight'),
        marital_status: pick('marital_status'),
        allergies: pick('allergies'),
        chronic_conditions: pick('chronic_conditions'),
        insurance_provider: pick('insurance_provider'),
        insurance_number: pick('insurance_number'),
        emergency_contact_name: pick('emergency_contact_name'),
        emergency_contact_mobile: pick('emergency_contact_mobile'),
      },
      account: {
        patientId: profile.registration_no || '',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        mustChangePassword: Boolean(profile.must_change_password),
        lastSignIn: user.last_sign_in_at || null,
      },
      hospitals: (links || []).map((l) => ({
        recordId: l.id,
        registrationNo: l.registration_no || '',
        hospitalId: l.hospital_id,
        name: String(l.hospital?.name || '').trim() || l.hospital_id,
        city: l.hospital?.city || '',
        active: l.is_active !== false,
        since: l.created_at,
      })),
    }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Save one section of the profile. `section` says which fields are being
 * edited, so a section saved with a field left blank clears it, while fields
 * of other sections are never touched.
 */
export async function updateMyPatientProfile(section, input = {}) {
  try {
    const { svc, user, profile } = await requirePatient()
    const now = new Date().toISOString()
    const profilePatch = {}
    const linkPatch = {}

    if (section === 'personal') {
      const name = text(input.name, 'Name', 100)
      if (!name || name.length < 2) throw new Error('Enter your full name')
      profilePatch.name = name
      profilePatch.gender = oneOf(input.gender, GENDERS, 'gender')
      profilePatch.blood_group = oneOf(input.blood_group, BLOOD_GROUPS, 'blood group')
      linkPatch.marital_status = oneOf(input.marital_status, MARITAL, 'marital status')

      const dob = String(input.date_of_birth || '').trim()
      if (dob) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) throw new Error('Enter a valid date of birth')
        if (dob > todayInIndia()) throw new Error('Date of birth cannot be in the future')
        if (dob < '1870-01-01') throw new Error('Enter a valid date of birth')
      }
      const age = ageToStore({ age: input.age_years, date_of_birth: dob })
      if (age === null) throw new Error('Enter your age (or date of birth)')
      profilePatch.date_of_birth = dob || null
      // Only restamp the recorded-on date when the age actually changes, so
      // the automatic yearly increase keeps working.
      if (dob || Number(profile.age_years) !== age) {
        profilePatch.age_years = age
        profilePatch.age_recorded_on = todayInIndia()
      }

      const aadhaar = String(input.aadhaar_number || '').replace(/\s/g, '')
      if (aadhaar && !/^\d{12}$/.test(aadhaar)) throw new Error('Aadhaar number must be 12 digits')
      profilePatch.aadhaar_number = aadhaar || null
    } else if (section === 'contact') {
      const mobile = phone(input.mobile, 'mobile number')
      if (!mobile) throw new Error('Enter your mobile number')
      profilePatch.mobile = mobile
      profilePatch.address = text(input.address, 'Address', 300)
      profilePatch.city = text(input.city, 'City', 80)
      profilePatch.state = text(input.state, 'State', 80)
      const pin = String(input.pincode || '').trim()
      if (pin && !/^[A-Za-z0-9 -]{3,10}$/.test(pin)) throw new Error('Enter a valid PIN code')
      profilePatch.pincode = pin || null
      profilePatch.country = text(input.country, 'Country', 80)
    } else if (section === 'health') {
      linkPatch.height = numberIn(input.height, 'Height (cm)', 30, 260)
      linkPatch.weight = numberIn(input.weight, 'Weight (kg)', 1, 400)
      linkPatch.allergies = text(input.allergies, 'Allergies', 1000)
      linkPatch.chronic_conditions = text(input.chronic_conditions, 'Ongoing conditions', 1000)
      linkPatch.insurance_provider = text(input.insurance_provider, 'Insurance provider', 120)
      linkPatch.insurance_number = text(input.insurance_number, 'Policy number', 60)
    } else if (section === 'emergency') {
      linkPatch.emergency_contact_name = text(input.emergency_contact_name, 'Contact name', 100)
      linkPatch.emergency_contact_mobile = phone(input.emergency_contact_mobile, 'contact mobile number')
      if (Boolean(linkPatch.emergency_contact_name) !== Boolean(linkPatch.emergency_contact_mobile)) {
        throw new Error('Give both the name and the mobile number of your emergency contact')
      }
    } else {
      throw new Error('Unknown section')
    }

    if (Object.keys(profilePatch).length) {
      const { error } = await svc.from('profiles').update({ ...profilePatch, updated_at: now }).eq('id', user.id).eq('role', 'patient')
      if (error) throw error
    }
    if (Object.keys(linkPatch).length) {
      const { error } = await svc.from('patients').update({ ...linkPatch, updated_at: now }).eq('profile_id', user.id)
      if (error) throw error
    }

    revalidatePath('/dashboard/patient/profile')
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Change password. Asks for the current one first, except while the account
 * still has its temporary password (must_change_password), where the patient
 * may only know it as "my phone number".
 */
export async function changeMyPatientPassword({ currentPassword, newPassword } = {}) {
  try {
    const { supabase, svc, user, profile } = await requirePatient()
    const next = String(newPassword || '')
    if (next.length < 8) throw new Error('Use at least 8 characters for your new password')
    if (next.length > 72) throw new Error('That password is too long')
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) throw new Error('Use both letters and numbers in your new password')

    if (!profile.must_change_password) {
      if (!currentPassword) throw new Error('Enter your current password')
      if (currentPassword === next) throw new Error('The new password must be different from the current one')
      // Check it on a throwaway client, so the signed-in session is untouched.
      const probe = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
      const { error: signInError } = await probe.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) throw new Error('Your current password is not correct')
      await probe.auth.signOut().catch(() => {})
    }

    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) throw error
    await svc.from('profiles').update({ must_change_password: false, updated_at: new Date().toISOString() }).eq('id', user.id)
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Finish an email change: check the 6-digit code sent by sendMyEmailOtp
 * (src/actions/patients.js), then move the address onto the login and the
 * profile together. The old address keeps working until this succeeds.
 */
export async function verifyMyNewEmail({ email, code } = {}) {
  try {
    const { svc, user } = await requirePatient()
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized) throw new Error('Enter the new email address')

    const { data: record, error } = await svc
      .from('email_verification_codes')
      .select('id, code_hash, attempts, expires_at')
      .eq('profile_id', user.id)
      .eq('email', normalized)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!record) throw new Error('Send a code to the new address first')
    if (new Date(record.expires_at) < new Date()) throw new Error('That code has expired. Send a new one.')
    if (record.attempts >= OTP_MAX_ATTEMPTS) throw new Error('Too many incorrect attempts. Send a new code.')

    const hash = createHash('sha256').update(String(code || '').trim()).digest('hex')
    if (hash !== record.code_hash) {
      await svc.from('email_verification_codes').update({ attempts: record.attempts + 1 }).eq('id', record.id)
      const left = OTP_MAX_ATTEMPTS - record.attempts - 1
      throw new Error(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Send a new code.')
    }

    const { data: taken } = await svc.from('profiles').select('id').eq('email', normalized).neq('id', user.id).maybeSingle()
    if (taken) throw new Error('That email is already registered to another account')

    const { error: authError } = await svc.auth.admin.updateUserById(user.id, { email: normalized, email_confirm: true })
    if (authError) throw authError
    const { error: profileError } = await svc
      .from('profiles')
      .update({ email: normalized, email_verified: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (profileError) throw profileError
    await svc.from('email_verification_codes').update({ consumed_at: new Date().toISOString() }).eq('id', record.id)

    revalidatePath('/dashboard/patient/profile')
    return { success: true, email: normalized }
  } catch (e) {
    return fail(e)
  }
}
