CREATE OR REPLACE FUNCTION public.validate_callout_spare_parts_quotation() RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN
  IF NEW.spare_parts_quotation_status NOT IN ('none', 'requested', 'approved') THEN RAISE EXCEPTION 'Invalid spare parts quotation status'; END IF;
  IF NEW.spare_parts_quotation_status = 'approved' THEN
    IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Submit the spare parts request before the approved report'; END IF;
    IF OLD.spare_parts_quotation_status NOT IN ('requested', 'approved') THEN RAISE EXCEPTION 'Submit the spare parts request first'; END IF;
    IF btrim(coalesce(NEW.spare_parts_quotation_reference, '')) = '' THEN RAISE EXCEPTION 'Enter the spare parts quotation number'; END IF;
  END IF;
  IF NEW.spare_parts_quotation_status = 'requested' THEN NEW.status := 'follow_up'; NEW.date_completed := NULL; END IF;
  RETURN NEW;
END $$;