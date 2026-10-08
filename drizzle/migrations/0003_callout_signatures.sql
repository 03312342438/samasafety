ALTER TABLE public.callout_reports ADD COLUMN technician_sign_name text NOT NULL DEFAULT '';
ALTER TABLE public.callout_reports ADD COLUMN technician_sign_date text NOT NULL DEFAULT '';
ALTER TABLE public.callout_reports ADD COLUMN client_sign_date text NOT NULL DEFAULT '';