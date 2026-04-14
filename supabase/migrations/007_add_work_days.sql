-- Add work_days column to staff table if it doesn't exist
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS work_days jsonb DEFAULT NULL;

-- Add index for work_days if it doesn't exist (for better performance on JSONB queries)
CREATE INDEX IF NOT EXISTS idx_staff_work_days ON public.staff USING GIN (work_days);