drop policy if exists "sales or mgmt insert customer pos" on public.customer_pos;
drop policy if exists "sales or mgmt update customer pos" on public.customer_pos;
drop policy if exists "sales or mgmt delete customer pos" on public.customer_pos;

create policy "sales pm or mgmt insert customer pos" on public.customer_pos
  for insert to authenticated
  with check (
    private.is_mgmt(auth.uid())
    or private.has_dept(auth.uid(), 'sales')
    or private.has_dept(auth.uid(), 'project_manager')
  );

create policy "sales pm or mgmt update customer pos" on public.customer_pos
  for update to authenticated
  using (
    private.is_mgmt(auth.uid())
    or private.has_dept(auth.uid(), 'sales')
    or private.has_dept(auth.uid(), 'project_manager')
  )
  with check (
    private.is_mgmt(auth.uid())
    or private.has_dept(auth.uid(), 'sales')
    or private.has_dept(auth.uid(), 'project_manager')
  );

create policy "sales pm or mgmt delete customer pos" on public.customer_pos
  for delete to authenticated
  using (
    private.is_mgmt(auth.uid())
    or ((private.has_dept(auth.uid(), 'sales') or private.has_dept(auth.uid(), 'project_manager'))
        and verification_status <> 'verified')
  );