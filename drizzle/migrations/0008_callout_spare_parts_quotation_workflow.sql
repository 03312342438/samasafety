ALTER TABLE public.callout_reports ADD COLUMN spare_parts_quotation_status text NOT NULL DEFAULT 'none', ADD COLUMN spare_parts_quotation_id uuid REFERENCES public.quotations(id), ADD COLUMN spare_parts_quotation_reference text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.validate_callout_spare_parts_quotation() RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN
  IF NEW.spare_parts_quotation_status NOT IN ('none', 'requested', 'approved') THEN RAISE EXCEPTION 'Invalid spare parts quotation status'; END IF;
  IF NEW.spare_parts_quotation_status = 'approved' THEN
    IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Submit the spare parts request before the approved report'; END IF;
    IF OLD.spare_parts_quotation_status NOT IN ('requested', 'approved') THEN RAISE EXCEPTION 'Submit the spare parts request first'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = NEW.spare_parts_quotation_id AND q.status IN ('approved', 'accepted', 'won')) THEN RAISE EXCEPTION 'An approved spare parts quotation is required'; END IF;
    SELECT reference INTO NEW.spare_parts_quotation_reference FROM public.quotations WHERE id = NEW.spare_parts_quotation_id;
  END IF;
  IF NEW.spare_parts_quotation_status = 'requested' THEN NEW.status := 'follow_up'; NEW.date_completed := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER callout_spare_parts_quotation_validation BEFORE INSERT OR UPDATE ON public.callout_reports FOR EACH ROW EXECUTE FUNCTION public.validate_callout_spare_parts_quotation();