ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS attention text NOT NULL DEFAULT '';