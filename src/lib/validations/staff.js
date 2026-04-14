import { z } from 'zod'

// Days of week for work schedule
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

export const staffSchema = z.object({
  name: z.string()
    .min(1, { message: 'Name is required.' })
    .min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Please enter a valid email address.' }),
  mobile: z.string()
    .min(1, { message: 'Mobile is required.' })
    .regex(/^\d{10}$/, { message: 'Mobile must be exactly 10 digits.' }),
  role: z.string()
    .min(1, { message: 'Role is required.' })
    .refine(val => ['doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'admin', 'other'].includes(val), {
      message: 'Please select a valid role.'
    }),
  department_id: z.string().optional(),
  employment_type: z.string().optional(),
  joining_date: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  shift_name: z.string().optional(),
  shift_start_time: z.string().optional(),
  shift_end_time: z.string().optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
  max_patients_per_day: z.coerce.number().min(1).optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
  avatar_url: z.string().optional(),
  notes: z.string().optional(),
  work_days: z.array(z.string()).optional(),
})

