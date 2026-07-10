/**
 * Generate human-readable IDs
 * Hospital: HOSP##### (e.g., HOSP12345)
 * User: ROLE##### (e.g., DOCT12345, RECEP12345, ADMIN12345)
 * Patient: PATIENT-###### (e.g., PATIENT-123456)
 */

/**
 * Generate hospital registration number
 * Format: HOSP + 5 random digits
 * @returns {string} e.g., HOSP12345
 */
export function generateHospitalRegistrationNo() {
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `HOSP${randomNum}`
}

/**
 * Generate user/profile registration number
 * Format: First 4 letters of role + 5 random digits
 * @param {string} role - User role (doctor, reception, admin, super_admin, patient)
 * @returns {string} e.g., DOCT12345, RECEP12345
 */
export function generateUserRegistrationNo(role) {
  const rolePrefix = {
    super_admin: 'SADM',
    hospital_admin: 'HADM',
    doctor: 'DOCT',
    receptionist: 'RECEP',
    nurse: 'NURS',
    patient: 'PATI',
    pharmacist: 'PHAR',
    lab_technician: 'LABT',
    admin: 'ADMI',
  }

  const prefix = rolePrefix[role] || 'USER'
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')

  return `${prefix}${randomNum}`
}

/**
 * Generate hospital-specific patient ID
 * Format: HOSP-PAT- + 5 random digits
 * @returns {string} e.g., HOSP-PAT-12345
 */
export function generateHospitalPatientId() {
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `HOSP-PAT-${randomNum}`
}

/**
 * Generate patient profile registration number (for portal login/logout)
 * Format: PATIENT- + 6 random digits
 * @returns {string} e.g., PATIENT-123456
 */
export function generatePatientRegistrationNo() {
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `PATIENT-${randomNum}`
}

/** Domain used for accounts that have no real email address yet. */
export const PLACEHOLDER_EMAIL_DOMAIN = 'patients.internal'

/**
 * Build the placeholder address for a patient registered without an email.
 * profiles.id references auth.users(id), so an auth user must exist even for a
 * walk-in; Supabase requires an address to create one. Derived from the
 * registration number so it inherits that column's uniqueness.
 * @param {string} registrationNo - e.g. PATIENT-123456
 */
export function buildPlaceholderEmail(registrationNo) {
  return `${String(registrationNo).toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`
}

/** True when `email` is a system-issued placeholder rather than the patient's own. */
export function isPlaceholderEmail(email) {
  return String(email || '').endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
}

/**
 * Format registration number for display
 * @param {string} registrationNo - Registration number
 * @returns {string} Formatted registration number with hyphens
 */
export function formatRegistrationNo(registrationNo) {
  if (!registrationNo || registrationNo.length < 4) return registrationNo
  
  const prefix = registrationNo.substring(0, 4)
  const number = registrationNo.substring(4)
  
  return `${prefix}-${number}`
}

/**
 * Validate registration number format
 * @param {string} registrationNo - Registration number to validate
 * @param {string} type - 'hospital' or 'user'
 * @returns {boolean} Whether the registration number is valid
 */
export function validateRegistrationNo(registrationNo, type = 'user') {
  if (!registrationNo || typeof registrationNo !== 'string') return false

  const patterns = {
    hospital: /^HOSP\d{5}$/,
    user: /^(SADM|HADM|DOCT|RECEP|NURS|PATI|USER)\d{5}$/,
  }

  const pattern = patterns[type] || patterns.user
  return pattern.test(registrationNo)
}

/**
 * Extract role from user registration number
 * @param {string} registrationNo - User registration number
 * @returns {string|null} Role or null if invalid
 */
export function extractRoleFromRegistrationNo(registrationNo) {
  if (!registrationNo || registrationNo.length < 4) return null

  const rolePrefixMap = {
    SADM: 'super_admin',
    HADM: 'hospital_admin',
    DOCT: 'doctor',
    RECEP: 'receptionist',
    NURS: 'nurse',
    PATI: 'patient',
    PHAR: 'pharmacist',
    LABT: 'lab_technician',
    ADMI: 'admin',
    USER: 'user',
  }

  const prefix = registrationNo.substring(0, 4)
  return rolePrefixMap[prefix] || null
}
