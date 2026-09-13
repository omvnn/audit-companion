-- Live hardening applied after the first administrator account was created.
-- Keeps SECURITY DEFINER policy helpers outside the exposed public API schema
-- and requires a one-time invite token for every subsequent signup.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop function if exists public.can_read_audit(uuid);
drop function if exists public.can_edit_audit(uuid);
drop function if exists public.can_manage_audit(uuid);
drop function if exists public.is_admin();
drop function if exists public.app_role();

create or replace function private.app_role()
returns public.app_role_type
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid() and p.active),
    'viewer'::public.app_role_type
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$ select private.app_role() = 'admin'::public.app_role_type; $$;

create or replace function private.can_read_audit(target_audit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select auth.uid() is not null and (
    private.is_admin()
    or exists (select 1 from public.audits a where a.id = target_audit_id and (a.created_by = auth.uid() or a.lead_auditor_id = auth.uid()))
    or exists (select 1 from public.audit_members m where m.audit_id = target_audit_id and m.user_id = auth.uid())
  );
$$;

create or replace function private.can_edit_audit(target_audit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select auth.uid() is not null and (
    private.is_admin()
    or exists (select 1 from public.audits a where a.id = target_audit_id and (a.created_by = auth.uid() or a.lead_auditor_id = auth.uid()))
    or exists (select 1 from public.audit_members m where m.audit_id = target_audit_id and m.user_id = auth.uid() and m.assignment_role in ('lead','auditor'))
  );
$$;

create or replace function private.can_manage_audit(target_audit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select auth.uid() is not null and (
    private.is_admin()
    or exists (select 1 from public.audits a where a.id = target_audit_id and (a.created_by = auth.uid() or a.lead_auditor_id = auth.uid()))
    or exists (select 1 from public.audit_members m where m.audit_id = target_audit_id and m.user_id = auth.uid() and m.assignment_role = 'lead')
  );
$$;

revoke execute on all functions in schema private from public, anon, authenticated;

-- Recreate policies against private helpers.
drop policy if exists profiles_select_team on public.profiles;
create policy profiles_select_team on public.profiles for select to authenticated using (active or id = (select auth.uid()) or private.is_admin());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists departments_admin_write on public.departments;
create policy departments_admin_write on public.departments for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists labs_admin_write on public.labs;
create policy labs_admin_write on public.labs for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists audits_select on public.audits;
create policy audits_select on public.audits for select to authenticated using (private.can_read_audit(id));
drop policy if exists audits_insert on public.audits;
create policy audits_insert on public.audits for insert to authenticated with check (
  private.app_role() in ('admin'::public.app_role_type,'lead_auditor'::public.app_role_type)
  and created_by = (select auth.uid())
);
drop policy if exists audits_update on public.audits;
create policy audits_update on public.audits for update to authenticated using (private.can_manage_audit(id)) with check (private.can_manage_audit(id));
drop policy if exists audits_delete on public.audits;
create policy audits_delete on public.audits for delete to authenticated using (private.is_admin());

drop policy if exists audit_members_select on public.audit_members;
create policy audit_members_select on public.audit_members for select to authenticated using (private.can_read_audit(audit_id));
drop policy if exists audit_members_insert on public.audit_members;
create policy audit_members_insert on public.audit_members for insert to authenticated with check (private.can_manage_audit(audit_id));
drop policy if exists audit_members_update on public.audit_members;
create policy audit_members_update on public.audit_members for update to authenticated using (private.can_manage_audit(audit_id)) with check (private.can_manage_audit(audit_id));
drop policy if exists audit_members_delete on public.audit_members;
create policy audit_members_delete on public.audit_members for delete to authenticated using (private.can_manage_audit(audit_id));

drop policy if exists audit_sources_select on public.audit_sources;
create policy audit_sources_select on public.audit_sources for select to authenticated using (private.can_read_audit(audit_id));
drop policy if exists audit_sources_write on public.audit_sources;
create policy audit_sources_write on public.audit_sources for all to authenticated using (private.can_edit_audit(audit_id)) with check (private.can_edit_audit(audit_id));

drop policy if exists checklist_items_select on public.checklist_items;
create policy checklist_items_select on public.checklist_items for select to authenticated using (private.can_read_audit(audit_id));
drop policy if exists checklist_items_write on public.checklist_items;
create policy checklist_items_write on public.checklist_items for all to authenticated using (private.can_edit_audit(audit_id)) with check (private.can_edit_audit(audit_id));

drop policy if exists findings_select on public.findings;
create policy findings_select on public.findings for select to authenticated using (private.can_read_audit(audit_id));
drop policy if exists findings_write on public.findings;
create policy findings_write on public.findings for all to authenticated using (private.can_edit_audit(audit_id)) with check (private.can_edit_audit(audit_id));

drop policy if exists evidence_files_select on public.evidence_files;
create policy evidence_files_select on public.evidence_files for select to authenticated using (private.can_read_audit(audit_id));
drop policy if exists evidence_files_write on public.evidence_files;
create policy evidence_files_write on public.evidence_files for all to authenticated using (private.can_edit_audit(audit_id)) with check (private.can_edit_audit(audit_id));

drop policy if exists audit_responses_select on public.audit_responses;
create policy audit_responses_select on public.audit_responses for select to authenticated using (
  exists (select 1 from public.checklist_items c where c.id = checklist_item_id and private.can_read_audit(c.audit_id))
);
drop policy if exists audit_responses_write on public.audit_responses;
create policy audit_responses_write on public.audit_responses for all to authenticated using (
  exists (select 1 from public.checklist_items c where c.id = checklist_item_id and private.can_edit_audit(c.audit_id))
) with check (
  exists (select 1 from public.checklist_items c where c.id = checklist_item_id and private.can_edit_audit(c.audit_id))
);

drop policy if exists corrective_actions_select on public.corrective_actions;
create policy corrective_actions_select on public.corrective_actions for select to authenticated using (
  exists (select 1 from public.findings f where f.id = finding_id and private.can_read_audit(f.audit_id))
);
drop policy if exists corrective_actions_write on public.corrective_actions;
create policy corrective_actions_write on public.corrective_actions for all to authenticated using (
  exists (select 1 from public.findings f where f.id = finding_id and private.can_edit_audit(f.audit_id))
) with check (
  exists (select 1 from public.findings f where f.id = finding_id and private.can_edit_audit(f.audit_id))
);

drop policy if exists audit_templates_select on public.audit_templates;
create policy audit_templates_select on public.audit_templates for select to authenticated using (active or private.is_admin());
drop policy if exists audit_templates_write on public.audit_templates;
create policy audit_templates_write on public.audit_templates for all to authenticated using (
  private.app_role() in ('admin','lead_auditor')
) with check (private.app_role() in ('admin','lead_auditor'));

drop policy if exists template_items_select on public.template_items;
create policy template_items_select on public.template_items for select to authenticated using (
  exists (select 1 from public.audit_templates t where t.id = template_id and (t.active or private.is_admin()))
);
drop policy if exists template_items_write on public.template_items;
create policy template_items_write on public.template_items for all to authenticated using (
  private.app_role() in ('admin','lead_auditor')
) with check (private.app_role() in ('admin','lead_auditor'));

-- Storage policies use the same private helpers.
drop policy if exists audit_evidence_select on storage.objects;
create policy audit_evidence_select on storage.objects for select to authenticated using (
  bucket_id = 'audit-evidence' and private.can_read_audit(((storage.foldername(name))[1])::uuid)
);
drop policy if exists audit_evidence_insert on storage.objects;
create policy audit_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'audit-evidence' and private.can_edit_audit(((storage.foldername(name))[1])::uuid)
);
drop policy if exists audit_evidence_update on storage.objects;
create policy audit_evidence_update on storage.objects for update to authenticated using (
  bucket_id = 'audit-evidence' and private.can_edit_audit(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'audit-evidence' and private.can_edit_audit(((storage.foldername(name))[1])::uuid)
);
drop policy if exists audit_evidence_delete on storage.objects;
create policy audit_evidence_delete on storage.objects for delete to authenticated using (
  bucket_id = 'audit-evidence' and private.can_edit_audit(((storage.foldername(name))[1])::uuid)
);

-- One-time team invites. The first account may bootstrap as Admin; after that every signup needs an invite token.
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  role public.app_role_type not null default 'viewer',
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.team_invites enable row level security;
grant select, insert, update, delete on public.team_invites to authenticated;
drop policy if exists team_invites_admin_all on public.team_invites;
create policy team_invites_admin_all on public.team_invites for all to authenticated using (private.is_admin()) with check (private.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_role public.app_role_type;
  v_token text;
begin
  if exists(select 1 from public.profiles) then
    v_token := nullif(new.raw_user_meta_data->>'invite_token','');
    if v_token is null then raise exception 'Invite token required'; end if;
    select role into v_role
      from public.team_invites
     where token = v_token and used_at is null and expires_at > now()
     for update;
    if v_role is null then raise exception 'Invite token invalid or expired'; end if;
  else
    v_role := 'admin';
  end if;

  insert into public.profiles(id,display_name,email,role,active)
  values(new.id,
         coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1)),
         coalesce(new.email,''),coalesce(v_role,'viewer'),true)
  on conflict(id) do update set email=excluded.email;

  if v_token is not null then
    update public.team_invites set used_by = new.id, used_at = now() where token = v_token;
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
