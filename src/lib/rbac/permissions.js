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
    label: 'Book Appointment',
    description: 'Create appointments for patients at the front desk.',
  },
  {
    key: 'confirm_booking_request',
    label: 'Confirm Booking Requests',
    description: 'Approve or decline appointments patients booked themselves.',
  },
  {
    key: 'view_prescription',
    label: 'View Prescriptions',
    description: "Open a patient's prescriptions and prescription history.",
  },
  {
    key: 'manage_billing',
    label: 'Manage Billing & Payments',
    description: 'Generate invoices and record payments.',
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
    manage_billing: false,
  },
  receptionist: {
    book_appointment: true,
    confirm_booking_request: true,
    view_prescription: false,
    manage_billing: true,
  },
  // The `staff` table's own role vocabulary, for staff whose profile role is
  // the generic 'staff'.
  nurse: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: true,
    manage_billing: false,
  },
  pharmacist: {
    book_appointment: false,
    confirm_booking_request: false,
    // A pharmacist dispenses against the prescription -- they must read it.
    view_prescription: true,
    manage_billing: false,
  },
  lab_technician: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: true,
    manage_billing: false,
  },
  staff: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: false,
    manage_billing: false,
  },
  other: {
    book_appointment: false,
    confirm_booking_request: false,
    view_prescription: false,
    manage_billing: false,
  },
}

/** Roles that hold every permission unconditionally. */
export const SUPER_ROLES = ['hospital_admin', 'super_admin']

/** The defaults for a role, or all-false for one we don't know. */
export function defaultsForRole(role) {
  if (SUPER_ROLES.includes(role)) {
    return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]))
  }
  return (
    ROLE_DEFAULTS[role] || Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false]))
  )
}
