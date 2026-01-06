/**
 * Generate human-readable IDs
 * Hospital: HOSP##### (e.g., HOSP12345)
 * User: ROLE##### (e.g., DOCT12345, RECEP12345, ADMIN12345)
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
    reception: 'RECEP',
    nurse: 'NURS',
    patient: 'PATI',
  }

  const prefix = rolePrefix[role] || 'USER'
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  
  return `${prefix}${randomNum}`
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
    RECEP: 'reception',
    NURS: 'nurse',
    PATI: 'patient',
    USER: 'user',
  }

  const prefix = registrationNo.substring(0, 4)
  return rolePrefixMap[prefix] || null
}
