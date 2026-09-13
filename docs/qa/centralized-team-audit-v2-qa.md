# Centralized Team Audit v2 — QA/QC Evidence

**Date:** 2026-09-13  
**Branch:** `feature/team-audit-v2`  
**Scope:** Pre-deployment verification of the centralized Testing Validation Lab Audit Hub.

## What was verified

- Invite-only email/password login UI; no public sign-up control.
- Role-aware UI for Admin/Lead Auditor/Auditor/Viewer.
- Testing Validation Lab hierarchy: Material, Performance, Safety Lab.
- Shared audit creation and team assignment.
- Material Lab 18-question starter checklist.
- Central checklist responses and explicit auditor finding promotion.
- Findings + root cause + corrective action + verification fields.
- Private evidence upload contract for PDF, DOCX, PNG, JPEG, WEBP up to 10 MiB.
- Evidence metadata links to the correct checklist response/finding.
- CSV, JSON, and print/PDF workflow.
- Migration path from schemaVersion 1 offline JSON backup.
- Navy/teal responsive UI.

## Automated test evidence

Final verification command:

```bash
npm test
npm run build
node --check api/config.js
node --check src/team-main.js
```

The full test suite covers domain logic, local fallback behavior, central repository mappings, Supabase public-client behavior, SQL/RLS migration contract, team service, private evidence handling, team UI, theme, dual build output, and mock central-service sharing.

## Browser acceptance

Because this environment blocks Chromium navigation to localhost, the exact built `dist/index.html` was loaded into Chromium and its Supabase HTTP requests were intercepted and forwarded to the local mock Supabase service. This exercises the same browser client/repository/service/UI code without changing a live cloud project.

Accepted end-to-end flow:

1. Lead Auditor signs in.
2. Creates a Material Lab audit.
3. Material starter checklist seeds 18 questions.
4. Assigns a second auditor.
5. Records objective evidence and sample reference.
6. Uploads a private PDF evidence file.
7. Selects OFI and explicitly promotes it to a finding.
8. Records root cause and corrective action.
9. Uploads evidence linked directly to the finding.
10. Exports findings CSV and schemaVersion 2 JSON backup.
11. Triggers Print / Save PDF path.
12. Signs out.
13. Second Auditor signs in and sees the same audit, response, OFI, private evidence metadata, finding, root cause, and corrective action.

Browser result:

- Page errors: **0**
- Console errors: **0**
- CSV download: **PASS**
- JSON download: **PASS**
- Print trigger: **PASS**
- Shared state between two users: **PASS (mock central API)**

## Responsive QC

| Width | document scrollWidth | innerWidth | Horizontal overflow |
|---:|---:|---:|---|
| 360 | 360 | 360 | None |
| 390 | 390 | 390 | None |
| 430 | 430 | 430 | None |
| 768 | 768 | 768 | None |
| 1366 | 1366 | 1366 | None |

Screenshots were captured during QA outside the Git repository at `/mnt/data/team-audit-v2-qa/`.

## Security/static scan

`dist/index.html` was searched for:

- `service_role`
- test password (`Audit123`)
- OpenAI/API-key patterns
- `sk-` secrets
- `SUPABASE_SERVICE`
- `/storage/v1/object/public`

Result: **no matches in the production team build**.

The runtime config function returns only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The Supabase service-role key is not required by or exposed to the browser application.

## Defects found and fixed during QA

### Startup race

**Finding:** Login could appear briefly before cloud-client initialization finished.  
**Root cause:** Initial render happened before client creation.  
**Fix:** Added explicit `Connecting…` disabled state and client-ready guard.

### Restricted sessionStorage

**Finding:** Sandboxed/opaque Chromium context could reject `sessionStorage` access and stop startup.  
**Root cause:** Storage capability check itself could throw.  
**Fix:** Guarded access and fall back to in-memory session storage.

### Evidence attached after a saved response did not display

**Finding:** New-response evidence worked; evidence added after typing a response could be stored but not appear under the question.  
**Root cause:** Existing-response path preferred checklist item `id` before `responseId`.  
**Fix:** Existing `responseId` is now authoritative; regression test added.

## Not yet proven — live cloud gate

The following cannot be honestly marked verified until the approved migration is applied to a real Supabase project:

- PostgreSQL migration execution against the live Supabase SQL engine.
- Live Row Level Security behavior between real authenticated accounts.
- Live private Storage RLS and file download behavior.
- Real invitation/email flow.
- Vercel preview/production environment variables and production URL.

These are deployment-stage checks, not missing application code.

## 2026-09-13 Live Cloud Activation

- Supabase project `audit-companion` created in Singapore (`ap-southeast-1`) on the free tier.
- First user profile created and promoted to `admin`.
- Anonymous RLS read check: 0 profiles, 0 departments, 0 labs, 0 audits visible.
- Authenticated Admin RLS read check: 1 profile, 1 department, 3 labs visible.
- Private Storage bucket `audit-evidence` verified with `public=false`.
- RLS policy helper functions moved to non-exposed `private` schema.
- Future signups require a one-time `team_invites` token.
- Supabase security advisor: no database/RLS lints; one Auth advisory remains for leaked-password protection being disabled.
- Hosted Vercel preview created for `testing-validation-audit-hub`; post-deploy inspection is blocked by Vercel connector scope authorization, so the final authenticated browser acceptance requires the Admin user to open the preview and sign in.
