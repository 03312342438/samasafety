CREATE POLICY "maintenance roles manage contract tasks" ON public.maintenance_tasks FOR ALL TO authenticated
USING (contract_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','project_manager','technician','maintenance')))
WITH CHECK (contract_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','project_manager','technician','maintenance')));
CREATE POLICY "maintenance roles view contract reports" ON public.reports FOR SELECT TO authenticated
USING (contract_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','project_manager','technician','maintenance')));