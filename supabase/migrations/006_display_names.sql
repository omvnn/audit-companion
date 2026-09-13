-- Secure self-service display-name updates.
-- Keeps profile role/email/admin-managed fields protected while allowing each signed-in user
-- to change only the name teammates see in the Audit Companion UI.

create or replace function public.update_own_display_name(new_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_name text;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  v_name := regexp_replace(btrim(coalesce(new_display_name, '')), '\s+', ' ', 'g');
  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'Display name must be between 1 and 60 characters';
  end if;

  update public.profiles
     set display_name = v_name,
         updated_at = now()
   where id = auth.uid()
   returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.update_own_display_name(text) from public, anon;
grant execute on function public.update_own_display_name(text) to authenticated;
