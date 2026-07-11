/**
 * Notice audience + category vocabularies.
 *
 * These live OUTSIDE src/actions/notices.js on purpose: a 'use server' module
 * may only export async functions. Next wraps every export in a server-action
 * proxy, so an exported array arrives on the client as a function and blows up
 * on .map(). Plain constants belong in a plain module.
 */

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone', hint: 'All patients and all staff' },
  { value: 'staff', label: 'All staff', hint: 'Every staff role, no patients' },
  { value: 'patient', label: 'Patients', hint: 'Patients registered at your hospital' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'nurse', label: 'Nurses' },
  { value: 'receptionist', label: 'Receptionists' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'lab_technician', label: 'Lab technicians' },
  { value: 'hospital_admin', label: 'Administrators' },
  { value: 'other', label: 'Other staff' },
]

export const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'policy', label: 'Policy' },
  { value: 'event', label: 'Event' },
  { value: 'health_alert', label: 'Health alert' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'closure', label: 'Closure' },
]

/** The two wildcards. 'all' = everyone; 'staff' = every non-patient. */
export const WILDCARD_AUDIENCES = ['all', 'staff']

export const AUDIENCE_LABEL = Object.fromEntries(
  AUDIENCE_OPTIONS.map((o) => [o.value, o.label])
)

export const VALID_AUDIENCE = new Set(AUDIENCE_OPTIONS.map((o) => o.value))
export const VALID_CATEGORY = new Set(CATEGORY_OPTIONS.map((o) => o.value))
