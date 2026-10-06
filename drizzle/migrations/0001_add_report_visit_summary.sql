ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS visit_summary JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reports.visit_summary IS 'Snapshot of per-system completed, remaining, and next maintenance visit values shown on the issued report.';