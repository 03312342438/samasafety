
-- credit_notes
drop policy if exists "cnote readable" on public.credit_notes;
create policy "cnote readable" on public.credit_notes for select to authenticated
using (private.has_dept(auth.uid(),'accounts') or private.is_mgmt(auth.uid()));

-- supplier_invoices
drop policy if exists "sinv readable" on public.supplier_invoices;
create policy "sinv readable" on public.supplier_invoices for select to authenticated
using (private.has_dept(auth.uid(),'accounts') or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or private.is_mgmt(auth.uid()));

-- supplier_payments
drop policy if exists "spay readable" on public.supplier_payments;
create policy "spay readable" on public.supplier_payments for select to authenticated
using (private.has_dept(auth.uid(),'accounts') or private.is_mgmt(auth.uid()));

-- suppliers
drop policy if exists "suppliers readable" on public.suppliers;
create policy "suppliers readable" on public.suppliers for select to authenticated
using (private.has_dept(auth.uid(),'accounts') or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or private.is_mgmt(auth.uid()));

-- stock_receipts
drop policy if exists "receipts readable" on public.stock_receipts;
create policy "receipts readable" on public.stock_receipts for select to authenticated
using (private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'accounts') or private.has_dept(auth.uid(),'project_manager') or private.is_mgmt(auth.uid()));

-- project_costs
drop policy if exists "pcost readable" on public.project_costs;
create policy "pcost readable" on public.project_costs for select to authenticated
using (private.has_dept(auth.uid(),'accounts') or private.has_dept(auth.uid(),'project_manager') or private.is_mgmt(auth.uid()));
drop policy if exists "pcost write" on public.project_costs;
create policy "pcost write" on public.project_costs for insert to authenticated
with check (private.has_dept(auth.uid(),'accounts') or private.has_dept(auth.uid(),'project_manager') or private.has_dept(auth.uid(),'inventory') or private.is_mgmt(auth.uid()));

-- job_installation_steps
drop policy if exists "steps readable" on public.job_installation_steps;
create policy "steps readable" on public.job_installation_steps for select to authenticated
using (private.is_staff(auth.uid()));
drop policy if exists "steps insert" on public.job_installation_steps;
create policy "steps insert" on public.job_installation_steps for insert to authenticated
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'project_manager') or private.has_dept(auth.uid(),'technician') or private.has_dept(auth.uid(),'maintenance'));
drop policy if exists "steps update" on public.job_installation_steps;
create policy "steps update" on public.job_installation_steps for update to authenticated
using (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'project_manager') or private.has_dept(auth.uid(),'technician') or private.has_dept(auth.uid(),'maintenance'))
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'project_manager') or private.has_dept(auth.uid(),'technician') or private.has_dept(auth.uid(),'maintenance'));

-- stock_releases
drop policy if exists "Staff can view stock releases" on public.stock_releases;
create policy "Staff can view stock releases" on public.stock_releases for select to authenticated
using (private.is_staff(auth.uid()));
drop policy if exists "Staff can update stock releases" on public.stock_releases;
create policy "Staff can update stock releases" on public.stock_releases for update to authenticated
using (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or auth.uid() = created_by)
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or auth.uid() = created_by);

-- stock_release_items
drop policy if exists "Staff can view stock release items" on public.stock_release_items;
create policy "Staff can view stock release items" on public.stock_release_items for select to authenticated
using (private.is_staff(auth.uid()));
drop policy if exists "Staff can create stock release items" on public.stock_release_items;
create policy "Staff can create stock release items" on public.stock_release_items for insert to authenticated
with check (exists (select 1 from public.stock_releases r where r.id = release_id and (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or r.created_by = auth.uid())));
drop policy if exists "Staff can update stock release items" on public.stock_release_items;
create policy "Staff can update stock release items" on public.stock_release_items for update to authenticated
using (exists (select 1 from public.stock_releases r where r.id = release_id and (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or r.created_by = auth.uid())))
with check (exists (select 1 from public.stock_releases r where r.id = release_id and (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or r.created_by = auth.uid())));
drop policy if exists "Staff can delete stock release items" on public.stock_release_items;
create policy "Staff can delete stock release items" on public.stock_release_items for delete to authenticated
using (exists (select 1 from public.stock_releases r where r.id = release_id and (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'inventory') or private.has_dept(auth.uid(),'project_manager') or r.created_by = auth.uid())));

-- storage: item-images
drop policy if exists "item_images_read" on storage.objects;
create policy "item_images_read" on storage.objects for select to authenticated
using (bucket_id = 'item-images' and private.is_staff(auth.uid()));
drop policy if exists "item_images_insert" on storage.objects;
create policy "item_images_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'item-images' and owner = auth.uid() and private.is_staff(auth.uid()));
drop policy if exists "item_images_update" on storage.objects;
create policy "item_images_update" on storage.objects for update to authenticated
using (bucket_id = 'item-images' and (owner = auth.uid() or private.is_mgmt(auth.uid())))
with check (bucket_id = 'item-images' and (owner = auth.uid() or private.is_mgmt(auth.uid())));
