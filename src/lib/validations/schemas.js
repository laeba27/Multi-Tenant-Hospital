import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// User Registration (Step 1) - Hospital Admin Only
export const registrationUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// Hospital Registration (Step 2)
export const HOSPITAL_TYPES = [
  'General Hospital',
  'Multi-Specialty Hospital',
  'Super-Specialty Hospital',
  'Clinic',
  'Dental Clinic',
  'Nursing Home',
  'Diagnostic Centre',
  'Maternity Hospital',
  'Eye Hospital',
  'Other',
]

export const registrationHospitalSchema = z
  .object({
    name: z.string().min(2, 'Hospital name is required').max(64),
    licenseNumber: z.string().min(2, 'License number is required'),
    hospitalType: z.string().min(1, 'Select the type of facility'),

    // The hospital's OWN contact email -- distinct from the administrator's
    // personal login email. The old form never collected it and silently reused
    // the admin's, so hospitals.email (a UNIQUE column) was really a person's
    // address, and a second hospital registered by the same admin would collide.
    email: z.string().email('Enter a valid hospital email'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
    website: z.string().url('Enter a full URL, e.g. https://example.com').optional().or(z.literal('')),

    administratorName: z.string().min(2, 'Administrator name is required').max(64),

    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required').max(64),
    state: z.string().min(2, 'State is required').max(64),
    postalCode: z.string().min(2, 'Postal code is required').max(20),

    totalBeds: z.string().optional(),
    icuBeds: z.string().optional(),

    emergencyServices: z.boolean().default(false),
    inpatientServices: z.boolean().default(false),
    ambulanceServices: z.boolean().default(false),
    feedbackEnabled: z.boolean().default(false),
  })
  // ICU beds are a subset of the total -- a hospital claiming 40 ICU beds out of
  // 20 has mistyped something, and the DB's non-negative checks won't catch it.
  .refine(
    (d) =>
      !d.totalBeds ||
      !d.icuBeds ||
      Number(d.icuBeds) <= Number(d.totalBeds),
    { message: 'ICU beds cannot exceed total beds', path: ['icuBeds'] }
  )

// Legacy exports (for backward compatibility)
export const hospitalRegistrationSchema = registrationHospitalSchema
export const userRegistrationSchema = registrationUserSchema

// Legacy sign-up schema (for backward compatibility)
export const signUpSchema = z.object({
  hospitalName: z.string().min(2, 'Hospital name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  departmentId: z.string().min(1, 'Department is required'),
  scheduledAt: z.string().min(1, 'Date and time are required'),
  notes: z.string().optional(),
})

export const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  mobile: z.string().min(10, 'Mobile must be at least 10 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  emergencyContact: z.string().min(10, 'Emergency contact must be at least 10 characters'),
})

export const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  appointmentId: z.string().optional(),
  diagnosis: z.string().min(5, 'Diagnosis must be at least 5 characters'),
  medications: z.array(z.object({
    drugName: z.string().min(1, 'Drug name is required'),
    dosage: z.string().min(1, 'Dosage is required'),
    frequency: z.string().min(1, 'Frequency is required'),
    duration: z.string().min(1, 'Duration is required'),
  })).min(1, 'At least one medication is required'),
  instructions: z.string().optional(),
  followUpDate: z.string().optional(),
})
