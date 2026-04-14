import { z } from 'zod'

export const departmentSchema = z.object({
  name: z.string().min(2, {
    message: 'Department name must be at least 2 characters.',
  }),
  code: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})
