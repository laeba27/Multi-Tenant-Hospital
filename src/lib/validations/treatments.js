import { z } from 'zod'

export const treatmentSchema = z.object({
  treatment_name: z.string().min(2, {
    message: 'Treatment name must be at least 2 characters.',
  }).min(1, {
    message: 'Treatment name is required.',
  }),
  treatment_code: z.string().optional(),
  description: z.string().optional(),
  department_id: z.string().optional(),
  base_price: z.coerce.number().min(0, {
    message: 'Base price must be a positive number.',
  }).min(1, {
    message: 'Base price is required.',
  }),
  duration_minutes: z.coerce.number().min(0).optional(),
  preparation_instructions: z.string().optional(),
  post_treatment_instructions: z.string().optional(),
  is_active: z.boolean().default(true),
})
