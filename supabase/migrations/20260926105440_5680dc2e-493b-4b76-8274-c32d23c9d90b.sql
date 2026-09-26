DROP POLICY IF EXISTS "Owner or admin can delete maintenance contracts" ON public.maintenance_contracts;
DROP POLICY IF EXISTS "Owner or admin can update maintenance contracts" ON public.maintenance_contracts;
CREATE POLICY "Maintenance staff can delete maintenance contracts" ON public.maintenance_contracts FOR DELETE TO authenticated
USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','project_manager','technician','maintenance')));
CREATE POLICY "Maintenance staff can update maintenance contracts" ON public.maintenance_contracts FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','project_manager','technician','maintenance')));