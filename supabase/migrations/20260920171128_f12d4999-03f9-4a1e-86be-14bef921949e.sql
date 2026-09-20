ALTER TABLE public.maintenance_tasks ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE public.maintenance_tasks ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.maintenance_contracts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS maintenance_tasks_contract_id_idx ON public.maintenance_tasks(contract_id);