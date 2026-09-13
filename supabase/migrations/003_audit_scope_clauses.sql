alter table public.audits
  add column if not exists scope_clauses text[] not null default '{}'::text[];

comment on column public.audits.scope_clauses is
  'User-selected ISO 9001 clause numbers used to define audit scope and seed the scoped checklist.';
