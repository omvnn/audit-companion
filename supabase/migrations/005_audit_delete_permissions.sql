-- Allow Admin to delete any visible audit.
-- Allow Lead Auditor to delete only audits they created or currently lead.
drop policy if exists audits_delete on public.audits;
create policy audits_delete on public.audits
for delete to authenticated
using (
  private.is_admin()
  or (
    private.app_role() = 'lead_auditor'::public.app_role_type
    and (created_by = (select auth.uid()) or lead_auditor_id = (select auth.uid()))
  )
);
