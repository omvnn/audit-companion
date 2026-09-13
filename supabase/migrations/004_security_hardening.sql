-- Security hardening after purple-team review.
-- The temporary frontend bundle bucket is no longer used by the deployed app.
update storage.buckets
set public = false
where id = 'audit-app-public';
