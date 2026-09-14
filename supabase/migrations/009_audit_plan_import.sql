-- Audit Companion v0.3.0: import-first audit plan staging and atomic promotion.

create table if not exists public.audit_plan_imports (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  original_filename text not null default '',
  storage_path text not null default '',
  mime_type text not null default '',
  page_count integer not null default 0 check (page_count >= 0),
  status text not null default 'uploaded' check (status in ('uploaded','quality_check','extracting','ai_fallback','review_ready','rejected','abandoned','imported')),
  department_text text not null default '',
  lab_text text not null default '',
  lab_id uuid references public.labs(id) on delete set null,
  audit_title text not null default '',
  audit_date date,
  standard_text text not null default '',
  objective text not null default '',
  scope text not null default '',
  criteria text not null default '',
  auditors jsonb not null default '[]'::jsonb,
  auditees jsonb not null default '[]'::jsonb,
  document_number text not null default '',
  document_revision text not null default '',
  document_hash text not null default '',
  parser text not null default '',
  parser_version text not null default '',
  ai_used boolean not null default false,
  ai_provider text not null default '',
  ai_model text not null default '',
  overall_confidence numeric(5,4),
  quality_score numeric(5,4),
  failure_reason text not null default '',
  manual_corrections jsonb not null default '[]'::jsonb,
  created_audit_id uuid references public.audits(id) on delete set null,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (overall_confidence is null or (overall_confidence >= 0 and overall_confidence <= 1)),
  check (quality_score is null or (quality_score >= 0 and quality_score <= 1))
);

create table if not exists public.audit_plan_import_pages (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.audit_plan_imports(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  storage_path text not null default '',
  quality_status text not null default 'pending' check (quality_status in ('pending','passed','failed','replaced')),
  quality_score numeric(5,4),
  failure_reason text not null default '',
  ocr_text text not null default '',
  ocr_confidence numeric(5,4),
  parser_version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_id, page_number),
  check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 1))
);

create table if not exists public.audit_plan_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.audit_plan_imports(id) on delete cascade,
  page_id uuid references public.audit_plan_import_pages(id) on delete cascade,
  position integer not null check (position > 0),
  source_row text not null default '',
  requirement_reference text not null default '',
  inspection_item text not null default '',
  document_review boolean not null default false,
  inquiry boolean not null default false,
  onsite_inspection boolean not null default false,
  other_method text not null default '',
  expected_evidence text not null default '',
  process_stage text not null default 'Other',
  text_confidence numeric(5,4),
  clause_confidence numeric(5,4),
  method_confidence numeric(5,4),
  needs_review boolean not null default false,
  blocking_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_id, position),
  check (text_confidence is null or (text_confidence >= 0 and text_confidence <= 1)),
  check (clause_confidence is null or (clause_confidence >= 0 and clause_confidence <= 1)),
  check (method_confidence is null or (method_confidence >= 0 and method_confidence <= 1))
);

create table if not exists public.audit_import_settings (
  singleton boolean primary key default true check (singleton),
  ai_fallback_enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.audit_import_settings(singleton, ai_fallback_enabled) values(true,false) on conflict(singleton) do nothing;

create index if not exists audit_plan_imports_uploader_status_idx on public.audit_plan_imports(uploaded_by,status,created_at desc);
create index if not exists audit_plan_import_pages_import_idx on public.audit_plan_import_pages(import_id,page_number);
create index if not exists audit_plan_import_items_import_idx on public.audit_plan_import_items(import_id,position);

create or replace function private.can_manage_import(target_import_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select auth.uid() is not null
    and private.app_role() in ('admin'::public.app_role_type,'lead_auditor'::public.app_role_type)
    and (
      private.app_role() = 'admin'::public.app_role_type
      or exists(select 1 from public.audit_plan_imports i where i.id=target_import_id and i.uploaded_by=auth.uid())
    );
$$;

create or replace function private.can_read_import(target_import_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select private.can_manage_import(target_import_id)
    or exists(
      select 1 from public.audit_plan_imports i
      where i.id=target_import_id and i.created_audit_id is not null and private.can_read_audit(i.created_audit_id)
    );
$$;

create or replace function private.safe_uuid(value text)
returns uuid language plpgsql immutable set search_path=pg_catalog as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

revoke execute on function private.can_manage_import(uuid) from public,anon,authenticated;
revoke execute on function private.can_read_import(uuid) from public,anon,authenticated;
revoke execute on function private.safe_uuid(text) from public,anon,authenticated;

alter table public.audit_plan_imports enable row level security;
alter table public.audit_plan_import_pages enable row level security;
alter table public.audit_plan_import_items enable row level security;
alter table public.audit_import_settings enable row level security;

grant select,insert,update,delete on public.audit_plan_imports,public.audit_plan_import_pages,public.audit_plan_import_items to authenticated;
grant select on public.audit_import_settings to authenticated;
grant update on public.audit_import_settings to authenticated;

drop policy if exists audit_plan_imports_select on public.audit_plan_imports;
create policy audit_plan_imports_select on public.audit_plan_imports for select to authenticated using (private.can_read_import(id));
drop policy if exists audit_plan_imports_insert on public.audit_plan_imports;
create policy audit_plan_imports_insert on public.audit_plan_imports for insert to authenticated with check (
  private.app_role() in ('admin'::public.app_role_type,'lead_auditor'::public.app_role_type)
  and uploaded_by=(select auth.uid())
);
drop policy if exists audit_plan_imports_update on public.audit_plan_imports;
create policy audit_plan_imports_update on public.audit_plan_imports for update to authenticated using (private.can_manage_import(id)) with check (private.can_manage_import(id));
drop policy if exists audit_plan_imports_delete on public.audit_plan_imports;
create policy audit_plan_imports_delete on public.audit_plan_imports for delete to authenticated using (private.can_manage_import(id));

drop policy if exists audit_plan_import_pages_select on public.audit_plan_import_pages;
create policy audit_plan_import_pages_select on public.audit_plan_import_pages for select to authenticated using (private.can_read_import(import_id));
drop policy if exists audit_plan_import_pages_write on public.audit_plan_import_pages;
create policy audit_plan_import_pages_write on public.audit_plan_import_pages for all to authenticated using (private.can_manage_import(import_id)) with check (private.can_manage_import(import_id));

drop policy if exists audit_plan_import_items_select on public.audit_plan_import_items;
create policy audit_plan_import_items_select on public.audit_plan_import_items for select to authenticated using (private.can_read_import(import_id));
drop policy if exists audit_plan_import_items_write on public.audit_plan_import_items;
create policy audit_plan_import_items_write on public.audit_plan_import_items for all to authenticated using (private.can_manage_import(import_id)) with check (private.can_manage_import(import_id));

drop policy if exists audit_import_settings_select on public.audit_import_settings;
create policy audit_import_settings_select on public.audit_import_settings for select to authenticated using (true);
drop policy if exists audit_import_settings_admin_update on public.audit_import_settings;
create policy audit_import_settings_admin_update on public.audit_import_settings for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- Replace bucket policies with safe path routing for both operational audit files and staged imports.
drop policy if exists audit_evidence_select on storage.objects;
create policy audit_evidence_select on storage.objects for select to authenticated using (
  bucket_id='audit-evidence' and
  case
    when (storage.foldername(name))[1]='imports'
      then private.can_read_import(private.safe_uuid((storage.foldername(name))[3]))
    else private.can_read_audit(private.safe_uuid((storage.foldername(name))[1]))
  end
);

drop policy if exists audit_evidence_insert on storage.objects;
create policy audit_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='audit-evidence' and
  case
    when (storage.foldername(name))[1]='imports'
      then (storage.foldername(name))[2]=(select auth.uid())::text
        and private.can_manage_import(private.safe_uuid((storage.foldername(name))[3]))
    else private.can_edit_audit(private.safe_uuid((storage.foldername(name))[1]))
  end
);

drop policy if exists audit_evidence_update on storage.objects;
create policy audit_evidence_update on storage.objects for update to authenticated using (
  bucket_id='audit-evidence' and
  case
    when (storage.foldername(name))[1]='imports'
      then private.can_manage_import(private.safe_uuid((storage.foldername(name))[3]))
    else private.can_edit_audit(private.safe_uuid((storage.foldername(name))[1]))
  end
) with check (
  bucket_id='audit-evidence' and
  case
    when (storage.foldername(name))[1]='imports'
      then private.can_manage_import(private.safe_uuid((storage.foldername(name))[3]))
    else private.can_edit_audit(private.safe_uuid((storage.foldername(name))[1]))
  end
);

drop policy if exists audit_evidence_delete on storage.objects;
create policy audit_evidence_delete on storage.objects for delete to authenticated using (
  bucket_id='audit-evidence' and
  case
    when (storage.foldername(name))[1]='imports'
      then private.can_manage_import(private.safe_uuid((storage.foldername(name))[3]))
    else private.can_edit_audit(private.safe_uuid((storage.foldername(name))[1]))
  end
);

create or replace function public.promote_audit_plan_import(import_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_import public.audit_plan_imports%rowtype;
  v_audit_id uuid;
  v_scope_clauses text[];
  v_auditee text;
  v_extracted_text text;
begin
  select * into v_import from public.audit_plan_imports i where i.id=$1 for update;
  if not found then raise exception 'Import not found'; end if;
  if not private.can_manage_import($1) then raise exception 'Import promotion is not permitted'; end if;
  if v_import.status <> 'review_ready' then raise exception 'Import is not ready for promotion'; end if;
  if v_import.lab_id is null then raise exception 'Lab must be confirmed before promotion'; end if;
  if v_import.audit_date is null then raise exception 'Audit date must be confirmed before promotion'; end if;
  if exists(select 1 from public.audit_plan_import_pages p where p.import_id=$1 and p.quality_status='failed') then
    raise exception 'All pages must pass quality review before promotion';
  end if;
  if not exists(select 1 from public.audit_plan_import_items x where x.import_id=$1) then
    raise exception 'No inspection items were extracted';
  end if;
  if exists(
    select 1 from public.audit_plan_import_items x where x.import_id=$1 and (
      nullif(trim(x.inspection_item),'') is null or nullif(trim(x.requirement_reference),'') is null or
      nullif(trim(x.blocking_error),'') is not null or
      coalesce(x.text_confidence,0)<0.75 or coalesce(x.clause_confidence,0)<0.75 or coalesce(x.method_confidence,0)<0.75
    )
  ) then raise exception 'Import contains unresolved blocking inspection items'; end if;

  select coalesce(array_agg(distinct x.requirement_reference order by x.requirement_reference),'{}'::text[])
    into v_scope_clauses from public.audit_plan_import_items x where x.import_id=$1;
  select string_agg(value,', ') into v_auditee from jsonb_array_elements_text(v_import.auditees);

  insert into public.audits(title,lab_id,audit_date,scope,scope_clauses,auditee,objective,criteria,status,lead_auditor_id,created_by,import_source_id)
  values(
    coalesce(nullif(v_import.audit_title,''),concat(coalesce(nullif(v_import.lab_text,''),'Lab'),' Audit')),
    v_import.lab_id,v_import.audit_date,v_import.scope,v_scope_clauses,coalesce(v_auditee,''),v_import.objective,
    coalesce(nullif(v_import.criteria,''),nullif(v_import.standard_text,''),'Imported audit plan'),
    'draft',auth.uid(),auth.uid(),v_import.id::text
  ) returning id into v_audit_id;

  insert into public.audit_members(audit_id,user_id,assignment_role)
  values(v_audit_id,auth.uid(),'lead') on conflict(audit_id,user_id) do update set assignment_role='lead';

  insert into public.checklist_items(audit_id,position,question,requirement_reference,requirement_text,source_type,expected_evidence,process_stage,sampling_note,priority)
  select v_audit_id,x.position,x.inspection_item,x.requirement_reference,'Imported from approved audit plan','attachment',x.expected_evidence,x.process_stage,
    concat_ws('; ',case when x.document_review then 'Document Review' end,case when x.inquiry then 'Inquiry' end,case when x.onsite_inspection then 'On-site Inspection' end,nullif(x.other_method,'')),
    'normal'
  from public.audit_plan_import_items x where x.import_id=$1 order by x.position;

  select string_agg(coalesce(p.ocr_text,''),E'\n\n--- PAGE '||p.page_number||' ---\n' order by p.page_number)
    into v_extracted_text from public.audit_plan_import_pages p where p.import_id=$1;

  insert into public.audit_sources(audit_id,source_type,reference,title,requirement_text,storage_path,input_mode,section,notes,extracted_text,original_filename,mime_type,parser,parse_error,created_by)
  values(v_audit_id,'attachment',v_import.document_number,v_import.original_filename,'Approved imported audit plan',v_import.storage_path,'audit_plan_import','Audit plan',
    concat('revision=',v_import.document_revision,'; parser=',v_import.parser_version,'; ai_used=',v_import.ai_used,'; ai_provider=',v_import.ai_provider,'; ai_model=',v_import.ai_model),
    coalesce(v_extracted_text,''),v_import.original_filename,v_import.mime_type,v_import.parser,'',auth.uid());

  update public.audit_plan_imports set status='imported',created_audit_id=v_audit_id,promoted_at=now(),updated_at=now() where id=$1;
  return v_audit_id;
end;
$$;
revoke execute on function public.promote_audit_plan_import(uuid) from public,anon;
grant execute on function public.promote_audit_plan_import(uuid) to authenticated;

comment on table public.audit_plan_imports is 'Private staging records for v0.3 audit-plan import before operational audit creation.';
comment on function public.promote_audit_plan_import(uuid) is 'Atomically promotes a reviewed import into an audit, exact checklist, lead membership, and source lineage.';
