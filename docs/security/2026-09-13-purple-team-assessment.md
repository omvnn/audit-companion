# Audit Companion — Purple-Team Security Assessment

Date: 2026-09-13
Target: Audit Companion centralized web app + Supabase backend
Approach: non-destructive red/blue/purple review of public delivery, browser client, Auth/RLS, invitations, and evidence storage.

## Gate result

No Critical or High exploitable issue remained after hardening. The application is acceptable for controlled internal use with one residual Supabase Auth advisory noted below.

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

## Residual / platform items

1. Supabase Security Advisor reports "Leaked Password Protection Disabled". Supabase documents this feature as Pro-plan-only. This does not bypass RLS/Auth but leaves credential-stuffing protection weaker than the ideal production baseline.
2. AppDeploy injects its own platform overlay JavaScript into the hosted page. This is a hosting-provider trust/supply-chain dependency, not an application secret leak. For highly confidential company data, a future deployment on a host with no injected runtime overlay and first-class security headers would reduce third-party runtime exposure.
3. AppDeploy does not expose a true HTTP `frame-ancestors` / `X-Frame-Options` control for this static site. A client-side anti-framing guard is deployed as a compensating control.

## Hardening changes made

- Moved session persistence from localStorage to sessionStorage.
- Moved generated invite tokens from query strings to URL fragments.
- Added restrictive CSP and `Referrer-Policy: no-referrer` equivalent via meta policy.
- Added anti-framing guard.
- Privatized obsolete public frontend bundle bucket.
- Retested public HTML/JS delivery and credential scan after deploy.

## Verification evidence

- Core project suite: 84/84 tests passing.
- Live-shell/security suite: 14/14 tests passing.
- Build and JavaScript syntax checks: passing.
- AppDeploy final QA: zero frontend errors and zero network errors on desktop/mobile snapshots.
- Outside-in live HTML: HTTP 200, `text/html`, CSP present, no-referrer present, no iframe wrapper.
- Outside-in live JS: HTTP 200, `text/javascript`, sessionStorage present, localStorage absent, fragment invites present, frame guard present, no service-role/secret key, no dependency on legacy long host.
- Supabase Security Advisor: no RLS/schema security finding; one Auth warning for leaked-password protection.
