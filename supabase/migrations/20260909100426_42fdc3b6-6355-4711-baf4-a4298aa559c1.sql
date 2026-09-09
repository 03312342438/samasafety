drop policy if exists "sales or mgmt insert quotations" on public.quotations;
create policy "sales pm or mgmt insert quotations" on public.quotations for insert to authenticated
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'));

drop policy if exists "sales or mgmt update quotations" on public.quotations;
create policy "sales pm or mgmt update quotations" on public.quotations for update to authenticated
using (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'))
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'));

drop policy if exists "sales or mgmt insert quotation items" on public.quotation_items;
create policy "sales pm or mgmt insert quotation items" on public.quotation_items for insert to authenticated
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'));

drop policy if exists "sales or mgmt update quotation items" on public.quotation_items;
create policy "sales pm or mgmt update quotation items" on public.quotation_items for update to authenticated
using (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'))
with check (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'));

drop policy if exists "sales or mgmt delete quotation items" on public.quotation_items;
create policy "sales pm or mgmt delete quotation items" on public.quotation_items for delete to authenticated
using (private.is_mgmt(auth.uid()) or private.has_dept(auth.uid(),'sales') or private.has_dept(auth.uid(),'project_manager'));