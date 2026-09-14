-- Audit Companion v0.3.0: allow RLS/storage policies to invoke private import helpers.
-- These helpers remain in the non-exposed private schema and contain their own narrow role checks.

grant execute on function private.can_manage_import(uuid) to authenticated;
grant execute on function private.can_read_import(uuid) to authenticated;
grant execute on function private.safe_uuid(text) to authenticated;
