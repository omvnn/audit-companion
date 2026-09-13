-- Allow Admins to promote/demote application roles without exposing broad profile writes.
-- A database trigger prevents the final active Admin from being demoted or deactivated.

create or replace function private.prevent_last_admin_lockout()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'admin'::public.app_role_type
     and old.active
     and (new.role <> 'admin'::public.app_role_type or not new.active) then
    perform pg_catalog.pg_advisory_xact_lock(724013001);
    if not exists (
      select 1
      from public.profiles p
      where p.id <> old.id
        and p.active
        and p.role = 'admin'::public.app_role_type
    ) then
      raise exception 'Cannot demote or deactivate the last active Admin';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_last_admin_lockout() from public, anon, authenticated;

drop trigger if exists prevent_last_admin_lockout on public.profiles;
create trigger prevent_last_admin_lockout
before update of role, active on public.profiles
for each row execute function private.prevent_last_admin_lockout();

-- Profiles are readable by authenticated teammates, but browser clients only need
-- direct UPDATE privilege on the role column. Display-name self-service continues
-- through the existing update_own_display_name RPC.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update(role) on table public.profiles to authenticated;
