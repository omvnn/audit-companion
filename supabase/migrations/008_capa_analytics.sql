-- Audit Companion v0.2 CAPA + analytics reporting layer.
-- Additive migration: keeps operational tables authoritative and exposes RLS-safe reporting views.

alter table public.findings
  add column if not exists closed_at timestamptz;

alter table public.corrective_actions
  add column if not exists root_cause_category text;

alter table public.corrective_actions
  drop constraint if exists corrective_actions_root_cause_category_check;

alter table public.corrective_actions
  add constraint corrective_actions_root_cause_category_check
  check (
    root_cause_category is null or root_cause_category in (
      'people_competency',
      'procedure_documentation',
      'equipment_calibration',
      'process_method',
      'material_sample',
      'data_system',
      'environment',
      'supplier_external',
      'other'
    )
  );

create or replace function public.sync_finding_closed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'closed'::public.finding_status_type
     and old.status is distinct from new.status
     and new.closed_at is null then
    new.closed_at := now();
  elsif new.status <> 'closed'::public.finding_status_type
        and old.status = 'closed'::public.finding_status_type then
    new.closed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_finding_closed_at() from public, anon, authenticated;

drop trigger if exists sync_finding_closed_at on public.findings;
create trigger sync_finding_closed_at
before update of status on public.findings
for each row execute function public.sync_finding_closed_at();

create index if not exists findings_due_status_idx
  on public.findings(due_date, status);
create index if not exists findings_closed_at_idx
  on public.findings(closed_at);
create index if not exists corrective_actions_due_idx
  on public.corrective_actions(due_date);
create index if not exists corrective_actions_root_cause_category_idx
  on public.corrective_actions(root_cause_category);

drop view if exists public.v_capa_register;
create view public.v_capa_register
with (security_invoker = on)
as
select
  a.id as audit_id,
  a.title as audit_title,
  a.audit_date,
  a.status as audit_status,
  a.lab_id,
  l.name as lab_name,
  f.id as finding_id,
  f.classification,
  f.requirement_reference,
  f.statement as finding_statement,
  f.status,
  f.owner_name as finding_owner_name,
  f.created_at,
  f.closed_at,
  ca.id as corrective_action_id,
  ca.root_cause,
  ca.root_cause_category,
  ca.action_text,
  coalesce(nullif(ca.owner_name, ''), nullif(f.owner_name, ''), '') as owner_name,
  coalesce(ca.due_date, f.due_date) as due_date,
  ca.verification_text,
  ca.verified_by,
  ca.verified_at,
  greatest(
    0,
    (case
       when f.status = 'closed'::public.finding_status_type and f.closed_at is not null then f.closed_at::date
       else current_date
     end) - f.created_at::date
  ) as days_open,
  case
    when f.status = 'closed'::public.finding_status_type and f.closed_at is not null
      then greatest(0, f.closed_at::date - f.created_at::date)
    else null
  end as closure_days,
  (
    coalesce(ca.due_date, f.due_date) is not null
    and coalesce(ca.due_date, f.due_date) < current_date
    and f.status <> 'closed'::public.finding_status_type
  ) as overdue,
  case
    when greatest(0, (case when f.status = 'closed'::public.finding_status_type and f.closed_at is not null then f.closed_at::date else current_date end) - f.created_at::date) <= 30 then '0-30'
    when greatest(0, (case when f.status = 'closed'::public.finding_status_type and f.closed_at is not null then f.closed_at::date else current_date end) - f.created_at::date) <= 60 then '31-60'
    when greatest(0, (case when f.status = 'closed'::public.finding_status_type and f.closed_at is not null then f.closed_at::date else current_date end) - f.created_at::date) <= 90 then '61-90'
    else '>90'
  end as aging_bucket
from public.findings f
join public.audits a on a.id = f.audit_id
join public.labs l on l.id = a.lab_id
left join lateral (
  select ca0.*
  from public.corrective_actions ca0
  where ca0.finding_id = f.id
  order by ca0.updated_at desc, ca0.created_at desc
  limit 1
) ca on true;

drop view if exists public.v_audit_analytics;
create view public.v_audit_analytics
with (security_invoker = on)
as
select
  a.id as audit_id,
  a.title as audit_title,
  a.audit_date,
  a.status as audit_status,
  a.lab_id,
  l.name as lab_name,
  coalesce(rs.total_items, 0)::bigint as total_items,
  coalesce(rs.answered_count, 0)::bigint as answered_count,
  case when coalesce(rs.total_items, 0) > 0
    then round((coalesce(rs.answered_count, 0)::numeric / rs.total_items::numeric) * 100, 1)
    else null end as completion_percent,
  coalesce(rs.conform_count, 0)::bigint as conform_count,
  coalesce(rs.observation_count, 0)::bigint as observation_count,
  coalesce(rs.ofi_count, 0)::bigint as ofi_count,
  coalesce(rs.minor_nc_count, 0)::bigint as minor_nc_count,
  coalesce(rs.major_nc_count, 0)::bigint as major_nc_count,
  case when coalesce(rs.answered_count, 0) > 0
    then round((coalesce(rs.conform_count, 0)::numeric / rs.answered_count::numeric) * 100, 1)
    else null end as conformity_rate,
  case when coalesce(rs.answered_count, 0) > 0
    then round(((coalesce(rs.minor_nc_count, 0) + coalesce(rs.major_nc_count, 0))::numeric / rs.answered_count::numeric) * 100, 1)
    else null end as nc_rate,
  case when coalesce(rs.answered_count, 0) > 0
    then round((coalesce(rs.evidence_covered_count, 0)::numeric / rs.answered_count::numeric) * 100, 1)
    else null end as evidence_coverage_percent,
  coalesce(fs.total_findings, 0)::bigint as total_findings,
  coalesce(fs.open_capa, 0)::bigint as open_capa,
  coalesce(fs.action_pending_capa, 0)::bigint as action_pending_capa,
  coalesce(fs.verification_capa, 0)::bigint as verification_capa,
  coalesce(fs.closed_capa, 0)::bigint as closed_capa,
  coalesce(fs.overdue_capa, 0)::bigint as overdue_capa,
  case when coalesce(fs.total_findings, 0) > 0
    then round((coalesce(fs.closed_capa, 0)::numeric / fs.total_findings::numeric) * 100, 1)
    else null end as capa_closure_rate,
  fs.average_closed_capa_days
from public.audits a
join public.labs l on l.id = a.lab_id
left join lateral (
  select
    count(*) as total_items,
    count(*) filter (where ar.result <> 'unanswered'::public.audit_result_type) as answered_count,
    count(*) filter (where ar.result = 'conform'::public.audit_result_type) as conform_count,
    count(*) filter (where ar.result = 'observation'::public.audit_result_type) as observation_count,
    count(*) filter (where ar.result = 'ofi'::public.audit_result_type) as ofi_count,
    count(*) filter (where ar.result = 'minor_nc'::public.audit_result_type) as minor_nc_count,
    count(*) filter (where ar.result = 'major_nc'::public.audit_result_type) as major_nc_count,
    count(*) filter (
      where ar.result <> 'unanswered'::public.audit_result_type
        and (
          nullif(btrim(coalesce(ar.evidence_text, '')), '') is not null
          or exists (
            select 1 from public.evidence_files ef
            where ef.response_id = ar.id
          )
        )
    ) as evidence_covered_count
  from public.checklist_items ci
  left join public.audit_responses ar on ar.checklist_item_id = ci.id
  where ci.audit_id = a.id
) rs on true
left join lateral (
  select
    count(*) as total_findings,
    count(*) filter (where f.status = 'open'::public.finding_status_type) as open_capa,
    count(*) filter (where f.status = 'action_pending'::public.finding_status_type) as action_pending_capa,
    count(*) filter (where f.status = 'verification'::public.finding_status_type) as verification_capa,
    count(*) filter (where f.status = 'closed'::public.finding_status_type) as closed_capa,
    count(*) filter (
      where f.status <> 'closed'::public.finding_status_type
        and coalesce(ca.due_date, f.due_date) is not null
        and coalesce(ca.due_date, f.due_date) < current_date
    ) as overdue_capa,
    round(avg(
      case when f.status = 'closed'::public.finding_status_type and f.closed_at is not null
        then greatest(0, f.closed_at::date - f.created_at::date)::numeric
        else null end
    ), 1) as average_closed_capa_days
  from public.findings f
  left join lateral (
    select ca0.due_date
    from public.corrective_actions ca0
    where ca0.finding_id = f.id
    order by ca0.updated_at desc, ca0.created_at desc
    limit 1
  ) ca on true
  where f.audit_id = a.id
) fs on true;

drop view if exists public.v_finding_analytics;
create view public.v_finding_analytics
with (security_invoker = on)
as
select
  f.id as finding_id,
  f.audit_id,
  a.title as audit_title,
  a.audit_date,
  date_trunc('month', a.audit_date::timestamp)::date as audit_month,
  a.lab_id,
  l.name as lab_name,
  f.classification,
  f.requirement_reference,
  f.statement as finding_statement,
  f.status,
  f.created_at,
  f.closed_at,
  ci.process_stage,
  ca.root_cause_category,
  coalesce(nullif(ca.owner_name, ''), nullif(f.owner_name, ''), '') as owner_name,
  coalesce(ca.due_date, f.due_date) as due_date,
  (
    coalesce(ca.due_date, f.due_date) is not null
    and coalesce(ca.due_date, f.due_date) < current_date
    and f.status <> 'closed'::public.finding_status_type
  ) as overdue,
  case when f.status = 'closed'::public.finding_status_type and f.closed_at is not null
    then greatest(0, f.closed_at::date - f.created_at::date)
    else null end as closure_days
from public.findings f
join public.audits a on a.id = f.audit_id
join public.labs l on l.id = a.lab_id
left join public.checklist_items ci on ci.id = f.checklist_item_id
left join lateral (
  select ca0.*
  from public.corrective_actions ca0
  where ca0.finding_id = f.id
  order by ca0.updated_at desc, ca0.created_at desc
  limit 1
) ca on true;

revoke all on public.v_capa_register from public, anon;
revoke all on public.v_audit_analytics from public, anon;
revoke all on public.v_finding_analytics from public, anon;
grant select on public.v_capa_register to authenticated;
grant select on public.v_audit_analytics to authenticated;
grant select on public.v_finding_analytics to authenticated;
