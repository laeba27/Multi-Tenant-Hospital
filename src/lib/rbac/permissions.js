/**
 * The permission catalogue.
 *
 * One place defines what permissions exist, what they mean, and who holds them
 * when a hospital has never touched the RBAC page. The admin UI renders from
 * this list, and the server-side guard reads the same defaults -- so the screen
 * and the enforcement can never drift apart.
 *
 * Plain constants, not a 'use server' module: those may only export async
 * functions, and an exported array would reach the client as a function.
 */

export const PERMISSIONS = [
  {
    key: 'book_appointment',
    short: 'Book',
    label: 'Book Appointment',
    description: 'Create appointments for patients at the front desk.',
  },
  {
    key: 'confirm_booking_request',
    short: 'Confirm requests',
    label: 'Confirm Booking Requests',
    description: 'Approve or decline appointments patients booked themselves.',
  },
  {
    key: 'view_prescription',
    short: 'Prescriptions',
    label: 'View Prescriptions',
    description: "Open a patient's prescriptions and prescription history.",
  },
  {
    key: 'manage_billing',
    short: 'Billing',
    label: 'Manage Billing & Payments',
    description: 'Generate invoices and record payments.',
  },
  {
    key: 'edit_follow_up',
    short: 'Edit follow-ups',
    label: 'Edit Follow-ups',
    description: 'Change or remove the follow-up date on a prescription.',
  },
  {
    key: 'send_follow_up_reminder',
    short: 'Reminders',
    label: 'Send Follow-up Reminders',
    description: 'Send a patient a reminder about their follow-up visit.',
  },
]

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key)

/**
 * What each role can do when NO rule has been configured.
 *
 * Without these, a brand-new hospital is bricked: `checkPermission` denies by
 * default, and no hospital has any rbac rows, so every receptionist would be
 * unable to book until an admin discovered the RBAC page. Defaults make the
 * product work out of the box and turn the RBAC page into what it should be --
 * a place to *override*, not a place you must visit before anything functions.
 *
 * hospital_admin and super_admin are not listed: they are allowed everything,
 * and that is decided in code rather than data so an admin cannot lock
 * themselves out of their own hospital.
 */
export const ROLE_DEFAULTS = {
  doctor: {
    book_appointment: true,
    confirm_booking_request: false,
    // A doctor who cannot read prescriptions cannot practise. Revocable, but
    // never the default.
    view_prescription: true,
    // Off by default -- most hospitals bill at the front desk -- but a real
    // switch now: a doctor granted this gets the same billing screen and the
    // same server-side authority as reception.
    manage_billing: false,
    // The doctor set the follow-up, so they can move it. Reminding the
    // patient is a front-desk job by default.
    edit_follow_up: true,
    send_follow_up_reminder: false,
  },
  receptionist: {
    book_appointment: true,
    confirm_booking_request: true,
    view_prescription: false,
    manage_billing: true,
    // Reception chases follow-ups; the date itself is the doctor's call.
    edit_follow_up: false,
    send_follow_up_reminder: true,
  },
  // The `staff` table's own role vocabulary, for staff whose profile role is
  // the generic 'staff'.
  nurse: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: true,
    manage_billing: false,
    edit_follow_up: false,
    send_follow_up_reminder: false,
  },
  pharmacist: {
    book_appointment: false,
    confirm_booking_request: false,
    // A pharmacist dispenses against the prescription -- they must read it.
    view_prescription: true,
    manage_billing: false,
    edit_follow_up: false,
    send_follow_up_reminder: false,
  },
  lab_technician: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: true,
    manage_billing: false,
    edit_follow_up: false,
    send_follow_up_reminder: false,
  },
  staff: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: false,
    manage_billing: false,
    edit_follow_up: false,
    send_follow_up_reminder: false,
  },
  other: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: false,
    manage_billing: false,
    edit_follow_up: false,
    send_follow_up_reminder: false,
  },
}

/** Roles that hold every permission unconditionally. */
export const SUPER_ROLES = ['hospital_admin', 'super_admin']

/**
 * The roles an admin can write a rule against, in one place.
 *
 * The RBAC screen used to hard-code its own list, which offered 'admin' -- a
 * value no staff row or profile ever carries, so a rule targeting it silently
 * matched nobody -- while omitting the generic 'staff'. Deriving the list from
 * ROLE_DEFAULTS keeps the dropdown honest: every option is a role the resolver
 * actually recognises. Admins are excluded on purpose; they hold everything
 * unconditionally, so a rule about them would be a rule that does nothing.
 */
export const ASSIGNABLE_ROLES = Object.keys(ROLE_DEFAULTS)

/** A human label for a role key. */
export function labelForRole(role) {
  return String(role || '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * The defaults for a role, or all-false for one we don't know.
 *
 * Always a fresh copy. This used to hand back the ROLE_DEFAULTS entry itself,
 * and the resolver then wrote overrides into it -- so one hospital's rule
 * rewrote the module-level defaults for every hospital served by the same
 * server process until it restarted.
 */
export function defaultsForRole(role) {
  if (SUPER_ROLES.includes(role)) {
    return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]))
  }
  return {
    ...Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])),
    ...(ROLE_DEFAULTS[role] || {}),
  }
}

/** Rule levels, least specific first. A later level beats an earlier one. */
export const RULE_LEVELS = ['all', 'role', 'user']

/**
 * Apply a hospital's rules on top of the built-in defaults.
 *
 * Precedence, most specific first: a rule naming this staff member, then a
 * rule for their role, then an 'all' rule, then the defaults. A rule only
 * overrides the permissions it mentions, so a rule that predates a new
 * permission never silently revokes it. Rules switched off (is_allowed false)
 * are ignored.
 *
 * Pure, so the server guard and the admin screen resolve identically.
 * `below` stops before that level -- the screen uses it to show what a rule
 * being edited would fall back to ("Default").
 */
export function resolvePermissions({ role, staffId = null, rules = [], below = null }) {
  const resolved = defaultsForRole(role)
  if (SUPER_ROLES.includes(role)) return resolved

  const limit = below ? RULE_LEVELS.indexOf(below) : RULE_LEVELS.length
  const applicable = (rules || [])
    .filter((r) => r && r.is_allowed !== false)
    .filter((r) => {
      const level = RULE_LEVELS.indexOf(r.target_type)
      if (level < 0 || level >= limit) return false
      if (r.target_type === 'all') return true
      if (r.target_type === 'role') return r.role === role
      return Boolean(staffId) && r.staff_id === staffId
    })
    .sort((a, b) => RULE_LEVELS.indexOf(a.target_type) - RULE_LEVELS.indexOf(b.target_type))

  for (const rule of applicable) {
    const perms = rule.permissions || {}
    for (const key of PERMISSION_KEYS) {
      if (key in perms) resolved[key] = perms[key] === true
    }
  }
  return resolved
}
