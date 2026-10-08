CREATE TABLE public.callout_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  project text NOT NULL DEFAULT '',
  site_location text NOT NULL DEFAULT '',
  system_type text NOT NULL DEFAULT '',
  call_received_at timestamptz NOT NULL DEFAULT now(),
  reported_problem text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  arrival_at timestamptz,
  findings text NOT NULL DEFAULT '',
  action_taken text NOT NULL DEFAULT '',
  follow_up_notes text NOT NULL DEFAULT '',
  spare_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  performed_by text NOT NULL DEFAULT '',
  client_sign_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  date_completed date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.callout_reports TO authenticated;
GRANT ALL ON public.callout_reports TO service_role;
ALTER TABLE public.callout_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "callouts select" ON public.callout_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "callouts insert" ON public.callout_reports FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "callouts update" ON public.callout_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "callouts delete" ON public.callout_reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE TRIGGER callout_reports_updated BEFORE UPDATE ON public.callout_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();