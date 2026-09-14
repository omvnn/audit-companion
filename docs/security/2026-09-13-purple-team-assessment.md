# Audit Companion — Purple-Team Security Assessment

Date: 2026-09-13  
Updated for v0.2 analytics verification: 2026-09-14  
Target: Audit Companion centralized web app + Supabase backend  
Approach: non-destructive red/blue/purple review of public delivery, browser client, Auth/RLS, invitations, evidence storage, CAPA reporting and analytics views.

## Gate result

No Critical or High exploitable issue remained after hardening. The application is acceptable for controlled internal use with the residual platform/advisor items documented below.

## Verified controls

- Anonymous database access returns zero profiles, audits, invites, and private evidence objects.
- A normal Auditor cannot self-promote to Admin; the attempted profile role update affects zero rows.
- An unassigned Auditor sees zero audits, invites, and evidence; Admin retains expected access.
- RLS is enabled on application data and private helper functions are not executable by anon/public.
- `audit-evidence` is private, limited to 10 MiB, and restricted to PDF, DOCX, PNG, JPEG, and WebP.
- Frontend contains only the Supabase publishable key; no secret/service-role credential is shipped.
- Renderers escape untrusted audit/profile text; regression coverage includes XSS-shaped strings.
- Browser session tokens are stored in `sessionStorage`, not persistent `localStorage`.
- New invite links use URL fragments (`#invite=`), reducing leakage through HTTP logs/referrers; legacy query links remain readable for compatibility.
- CSP and `no-referrer` browser policies are present.
- Client refuses to render when embedded in another frame as a clickjacking mitigation.
- Unused temporary `audit-app-public` storage bucket is private.

## v0.2 analytics / CAPA verification

The v0.2.0 reporting layer uses PostgreSQL views created with `security_invoker=on`, so underlying source-table RLS remains authoritative.

Verified behaviors:
- Auditor cannot read unrelated audit, finding, or CAPA analytics rows.
- Lead Auditor reporting remains limited to source rows readable under existing RLS.
- Viewer can read assigned/readable audit reporting data but write attempts remain blocked.
- Admin analytics views return the same readable population as the underlying operational records.
- Closing a finding populates `closed_at`; reopening clears it.
- Legacy CAPA due dates continue to resolve via `coalesce(corrective_actions.due_date, findings.due_date)`.
- No new security-definer-view or RLS-bypass warning was introduced by the analytics migration.

## Residual / platform items

1. Supabase Security Advisor reports `authenticated_security_definer_function_executable` for `public.update_own_display_name(new_display_name text)`. This is an intentional narrow RPC for authenticated self-service display-name updates and should be re-reviewed if profile permissions change.
2. Supabase Security Advisor reports **Leaked Password Protection Disabled**. Supabase documents this feature as Pro-plan-only; the current project is on the Free plan.
3. AppDeploy injects its own platform overlay JavaScript into the hosted page. This is a hosting-provider trust/supply-chain dependency, not an application secret leak. For highly confidential company data, a future deployment on a host with no injected runtime overlay and first-class security headers would reduce third-party runtime exposure.
4. AppDeploy does not expose a true HTTP `frame-ancestors` / `X-Frame-Options` control for this static site. A client-side anti-framing guard is deployed as a compensating control.

Performance-advisor notices also exist for some pre-existing RLS/init-plan patterns, multiple permissive policies, unindexed foreign keys and newly created indexes that have not yet accumulated usage statistics. These are performance/maintainability items, not demonstrated authorization bypasses.

## Hardening changes made

- Moved session persistence from localStorage to sessionStorage.
- Moved generated invite tokens from query strings to URL fragments.
- Added restrictive CSP and `Referrer-Policy: no-referrer` equivalent via meta policy.
- Added anti-framing guard.
- Privatized obsolete public frontend bundle bucket.
- Added RLS-safe analytics views using `security_invoker=on`.
- Added constrained CAPA root-cause categories and database-managed closure timestamps.
- Retested public delivery and database authorization boundaries after the v0.2 changes.

## Verification evidence

- GitHub Actions feature-branch test and production-build workflow: passing before release promotion.
- AppDeploy v0.2 QA: zero frontend, network and backend errors on generated desktop/mobile snapshots.
- Supabase reporting views verified as `security_invoker=on`.
- Auditor unrelated-audit/finding/CAPA access checks: blocked.
- Viewer assigned-read check: allowed; viewer write check: blocked.
- Admin reporting-view/source-population comparison: matched.
- Finding closure/reopen trigger lifecycle: passed.
- Legacy due-date fallback verification: passed.
- Supabase Security Advisor: no new analytics RLS/schema security warning; known display-name RPC and leaked-password warnings remain documented.
