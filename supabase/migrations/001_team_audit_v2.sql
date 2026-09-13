-- Audit Companion centralized team bootstrap.
-- Creates the base schema/catalog/storage. Migrations 002+ apply the hardened final RLS/auth rules.

create extension if not exists pgcrypto;

do $$ begin create type public.app_role_type as enum ('admin','lead_auditor','auditor','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.audit_status_type as enum ('draft','active','review','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.assignment_role_type as enum ('lead','auditor','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.source_type_type as enum ('iso','sop','wi','manual','attachment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.audit_result_type as enum ('unanswered','conform','observation','ofi','minor_nc','major_nc'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finding_classification_type as enum ('observation','ofi','minor_nc','major_nc'); exception when duplicate_object then null; end $$;
do $$ begin create type public.finding_status_type as enum ('open','action_pending','verification','closed'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', email text not null default '',
  role public.app_role_type not null default 'viewer', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments(id) on delete cascade,
  name text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(department_id,name)
);
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(), title text not null, lab_id uuid not null references public.labs(id),
  scope text not null default '', audit_date date not null, status public.audit_status_type not null default 'draft',
  lead_auditor_id uuid references public.profiles(id), created_by uuid not null references public.profiles(id), import_source_id text unique,
  auditee text not null default '', objective text not null default '', criteria text not null default '', opening_notes text not null default '',
  positive_notes text not null default '', conclusion text not null default '', closing_notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_members (
  audit_id uuid not null references public.audits(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role public.assignment_role_type not null default 'auditor', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), primary key(audit_id,user_id)
);
create table if not exists public.audit_sources (
  id uuid primary key default gen_random_uuid(), audit_id uuid not null references public.audits(id) on delete cascade,
  source_type public.source_type_type not null default 'manual', reference text not null default '', title text not null default '',
  requirement_text text not null default '', storage_path text, input_mode text not null default '', section text not null default '',
  notes text not null default '', extracted_text text not null default '', original_filename text not null default '', mime_type text not null default '',
  parser text not null default '', parse_error text not null default '', created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(), audit_id uuid not null references public.audits(id) on delete cascade, position integer not null default 0,
  question text not null, requirement_reference text not null default '', requirement_text text not null default '', source_type text not null default 'ISO',
  expected_evidence text not null default '', process_stage text not null default 'Other', sampling_note text not null default '', priority text not null default 'normal',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_responses (
  id uuid primary key default gen_random_uuid(), checklist_item_id uuid not null unique references public.checklist_items(id) on delete cascade,
  result public.audit_result_type not null default 'unanswered', evidence_text text not null default '', notes text not null default '',
  sample_references text not null default '', follow_up boolean not null default false, answered_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(), audit_id uuid not null references public.audits(id) on delete cascade,
  response_id uuid references public.audit_responses(id) on delete set null, checklist_item_id uuid references public.checklist_items(id) on delete set null,
  classification public.finding_classification_type not null, requirement_reference text not null default '', requirement_text text not null default '',
  evidence text not null default '', statement text not null default '', risk_impact text not null default '', immediate_correction text not null default '',
  verification_method text not null default '', verification_status text not null default '', status public.finding_status_type not null default 'open',
  owner_name text not null default '', due_date date, created_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.corrective_actions (
  id uuid primary key default gen_random_uuid(), finding_id uuid not null references public.findings(id) on delete cascade,
  action_text text not null default '', root_cause text not null default '', owner_name text not null default '', due_date date,
  verification_text text not null default '', verified_by uuid references public.profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(), audit_id uuid not null references public.audits(id) on delete cascade,
  response_id uuid references public.audit_responses(id) on delete cascade, finding_id uuid references public.findings(id) on delete cascade,
  storage_path text not null unique, original_filename text not null, mime_type text not null, size_bytes bigint not null default 0 check(size_bytes>=0),
  uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(response_id is not null or finding_id is not null or audit_id is not null)
);
create table if not exists public.audit_templates (
  id uuid primary key default gen_random_uuid(), name text not null, lab_id uuid references public.labs(id) on delete set null,
  active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.template_items (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.audit_templates(id) on delete cascade,
  position integer not null default 0, question text not null, requirement_reference text not null default '', requirement_text text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists audits_lab_date_idx on public.audits(lab_id,audit_date desc);
create index if not exists audits_status_idx on public.audits(status);
create index if not exists audit_members_user_idx on public.audit_members(user_id,audit_id);
create index if not exists checklist_items_audit_pos_idx on public.checklist_items(audit_id,position);
create index if not exists findings_audit_status_idx on public.findings(audit_id,status);
create index if not exists corrective_actions_finding_idx on public.corrective_actions(finding_id);
create index if not exists evidence_files_audit_idx on public.evidence_files(audit_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;
do $$ declare t text; begin
  foreach t in array array['profiles','departments','labs','audits','audit_members','audit_sources','checklist_items','audit_responses','evidence_files','findings','corrective_actions','audit_templates','template_items'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I',t,t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;

-- Bootstrap profile trigger. Migration 002 replaces this function with invite-only provisioning.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,email,role,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1)),coalesce(new.email,''),'viewer',true)
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_user();

insert into public.departments(id,name) values('10000000-0000-4000-8000-000000000001','Testing Validation Lab') on conflict(id) do update set name=excluded.name;
insert into public.labs(id,department_id,name) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Material Lab'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Performance Lab'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Safety Lab')
on conflict(id) do update set department_id=excluded.department_id,name=excluded.name;

grant usage on schema public to authenticated;
grant select on public.departments,public.labs,public.profiles to authenticated;
grant select,insert,update,delete on public.audits,public.audit_members,public.audit_sources,public.checklist_items,public.audit_responses,public.evidence_files,public.findings,public.corrective_actions,public.audit_templates,public.template_items to authenticated;

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.labs enable row level security;
alter table public.audits enable row level security;
alter table public.audit_members enable row level security;
alter table public.audit_sources enable row level security;
alter table public.checklist_items enable row level security;
alter table public.audit_responses enable row level security;
alter table public.evidence_files enable row level security;
alter table public.findings enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.audit_templates enable row level security;
alter table public.template_items enable row level security;

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments for select to authenticated using(true);
drop policy if exists labs_select on public.labs;
create policy labs_select on public.labs for select to authenticated using(true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('audit-evidence','audit-evidence',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
