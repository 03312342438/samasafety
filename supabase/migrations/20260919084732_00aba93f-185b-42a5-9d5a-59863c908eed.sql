CREATE TABLE public.maintenance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  msr_no text NOT NULL DEFAULT '',
  contract_no text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  site_location text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  system_type text NOT NULL DEFAULT 'FF',
  interval_months integer NOT NULL DEFAULT 6,
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_contracts TO authenticated;
GRANT ALL ON public.maintenance_contracts TO service_role;

ALTER TABLE public.maintenance_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view maintenance contracts"
  ON public.maintenance_contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in users can add maintenance contracts"
  ON public.maintenance_contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update maintenance contracts"
  ON public.maintenance_contracts FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Owner or admin can delete maintenance contracts"
  ON public.maintenance_contracts FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER maintenance_contracts_updated_at
  BEFORE UPDATE ON public.maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();