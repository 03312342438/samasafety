DELETE FROM public.maintenance_tasks t
USING (
  SELECT id, row_number() OVER (
    PARTITION BY contract_id, sequence
    ORDER BY (status = 'completed') DESC, created_at ASC, id ASC
  ) AS rn
  FROM public.maintenance_tasks WHERE contract_id IS NOT NULL
) d
WHERE t.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_tasks_contract_seq_uniq
  ON public.maintenance_tasks (contract_id, sequence);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS system_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contract_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS reports_contract_ids_idx ON public.reports USING gin (contract_ids);