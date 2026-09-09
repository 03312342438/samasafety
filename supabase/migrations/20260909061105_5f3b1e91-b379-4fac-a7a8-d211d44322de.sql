CREATE TABLE public.project_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 1,
  percent numeric NOT NULL DEFAULT 0,
  milestone text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'project_start',
  trigger_steps integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notified_at timestamp with time zone,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_payment_terms TO authenticated;
GRANT ALL ON public.project_payment_terms TO service_role;

ALTER TABLE public.project_payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view payment terms"
  ON public.project_payment_terms FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE POLICY "delivery finance insert payment terms"
  ON public.project_payment_terms FOR INSERT TO authenticated
  WITH CHECK (
    private.is_mgmt(auth.uid())
    OR private.has_dept(auth.uid(), 'sales')
    OR private.has_dept(auth.uid(), 'project_manager')
    OR private.has_dept(auth.uid(), 'accounts')
  );

CREATE POLICY "delivery finance update payment terms"
  ON public.project_payment_terms FOR UPDATE TO authenticated
  USING (
    private.is_mgmt(auth.uid())
    OR private.has_dept(auth.uid(), 'sales')
    OR private.has_dept(auth.uid(), 'project_manager')
    OR private.has_dept(auth.uid(), 'accounts')
  )
  WITH CHECK (
    private.is_mgmt(auth.uid())
    OR private.has_dept(auth.uid(), 'sales')
    OR private.has_dept(auth.uid(), 'project_manager')
    OR private.has_dept(auth.uid(), 'accounts')
  );

CREATE POLICY "sales pm or mgmt delete payment terms"
  ON public.project_payment_terms FOR DELETE TO authenticated
  USING (
    private.is_mgmt(auth.uid())
    OR private.has_dept(auth.uid(), 'sales')
    OR private.has_dept(auth.uid(), 'project_manager')
  );

CREATE INDEX project_payment_terms_project_idx ON public.project_payment_terms (project_id);

CREATE TRIGGER project_payment_terms_updated_at
  BEFORE UPDATE ON public.project_payment_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();