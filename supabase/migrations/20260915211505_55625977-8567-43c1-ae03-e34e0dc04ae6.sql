ALTER TABLE public.job_numbers
  ADD COLUMN IF NOT EXISTS maintenance_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maintenance_total_count integer,
  ADD COLUMN IF NOT EXISTS maintenance_start_date date;