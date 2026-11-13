/** Whole years since `dob`, as a string ('' when missing or invalid). */
export function ageFromDob(dob) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
}

/**
 * A patient's current age, as a string ('' when unknown).
 *
 * A date of birth wins when there is one. Otherwise it's the age reception
 * recorded at registration (age_years), plus the whole years that have passed
 * since (age_recorded_on) -- so a patient registered as 40 shows 41 a year
 * later, without a birth date ever being made up.
 */
export function patientAge(profile) {
  if (!profile) return ''
  const fromDob = ageFromDob(profile.date_of_birth)
  if (fromDob !== '') return fromDob

  const recorded = Number(profile.age_years)
  if (profile.age_years === null || profile.age_years === undefined || Number.isNaN(recorded)) return ''
  if (!profile.age_recorded_on) return String(recorded)

  const since = new Date(profile.age_recorded_on)
  if (Number.isNaN(since.getTime())) return String(recorded)
  const now = new Date()
  let years = now.getFullYear() - since.getFullYear()
  const m = now.getMonth() - since.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < since.getDate())) years -= 1
  return String(recorded + Math.max(0, years))
}

/** The age to store at registration: from the birth date if given, else as entered. */
export function ageToStore({ age, date_of_birth }) {
  const fromDob = ageFromDob(date_of_birth)
  if (fromDob !== '') return Number(fromDob)
  const raw = String(age ?? '').trim()
  if (!/^\d{1,3}$/.test(raw)) return null
  const n = Number(raw)
  return n <= 150 ? n : null
}
