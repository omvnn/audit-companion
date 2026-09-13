# Centralized Team Audit v2 — Deployment Runbook

## Goal

Activate the already-built Audit Hub as one shared team application using Vercel + Supabase without exposing privileged credentials.

## Pre-deployment gates

Do not perform these live actions without explicit approval:

1. Create/change the Supabase production project or apply SQL migration.
2. Add production environment values/permissions.
3. Publish/promote a Vercel production deployment.
4. Invite real team members or change their roles.

A Vercel preview can be used first once the Supabase preview project is approved.

## 1. Supabase project

Create a Supabase project for the audit app. Record:

- Project URL → `SUPABASE_URL`
- Public anon/publishable key → `SUPABASE_ANON_KEY`

Do **not** put a service-role key in Vercel browser-visible config or source code.

## 2. Apply database + RLS + private Storage migration

Use the Supabase SQL editor or approved migration workflow to apply:

```text
supabase/migrations/001_team_audit_v2.sql
```

The migration creates the audit tables, RLS policies, private `audit-evidence` bucket, profile provisioning trigger, and seeds:

```text
Testing Validation Lab
├─ Material Lab
├─ Performance Lab
└─ Safety Lab
```

After applying it, run live checks before adding real audit data:

- All application tables exist.
- RLS is enabled.
- `audit-evidence` is private.
- Material / Performance / Safety labs exist.
- A newly created Auth user receives a `profiles` row.

## 3. Bootstrap the first administrator

Create/invite the first user through Supabase Auth. New profiles default to the safest role. Promote only the intended owner account to `admin` using the approved Supabase admin/SQL workflow.

Then use the app's role model:

- `admin` — user/role and full audit administration.
- `lead_auditor` — create/manage audits and team assignments.
- `auditor` — perform assigned audit work.
- `viewer` — read-only access.

Do not share accounts.

## 4. Vercel environment

Configure these Vercel environment values:

```text
SUPABASE_URL=<approved Supabase project URL>
SUPABASE_ANON_KEY=<approved public anon/publishable key>
```

`api/config.js` intentionally returns only those public browser values.

Build contract:

```bash
npm test
npm run build
```

Outputs:

```text
dist/index.html                         # centralized team app
dist/material-lab-audit-companion.html # retained offline app
```

Vercel project settings are captured in `vercel.json`:

```text
Build command: npm run build
Output directory: dist
```

The `/api/config` Vercel Function stays in the source tree and supplies runtime public config.

## 5. Preview deployment acceptance

Before production promotion, deploy a Vercel **preview** and test with at least two non-production/test users.

Required checks:

1. Both users can sign in.
2. Lead creates one Material Lab audit.
3. Lead assigns Auditor B.
4. Auditor A updates a checklist response.
5. Auditor B sees the same saved response after reload.
6. Private evidence upload succeeds for an assigned editor.
7. An unauthorized/unassigned account cannot read/write the audit according to RLS.
8. Viewer cannot create/edit records.
9. Finding + CAPA changes persist across users.
10. PDF/CSV/JSON exports work.
11. Mobile widths 360/390/430 and tablet/desktop remain usable.

If any RLS test fails, do not promote the deployment.

## 6. Import the current offline Material Lab audit

From the original local Audit Companion:

1. Export JSON backup.
2. Sign in to the centralized Audit Hub as Admin/Lead Auditor.
3. Select the destination lab.
4. Import the JSON.
5. Verify summary counts and findings before treating the central copy as authoritative.

Import is idempotent using the original audit ID as `importSourceId`, preventing accidental duplicate re-import of the same local audit.

Keep the original JSON backup until the central copy is verified.

## 7. Invite team members

Only after preview acceptance:

1. Add/invite each real person through Supabase Auth.
2. Verify the generated profile.
3. Set the minimum required global role.
4. Assign the person only to audits they need.
5. Test one real Auditor and one Viewer before wider rollout.

## 8. Production gate

Production promotion is a separate explicit approval step.

Before approval, provide:

- Preview URL.
- Live RLS test evidence.
- User/role list to be invited.
- Confirmation that no service-role/private key is in the browser build.
- Backup/import result if existing audit data was migrated.

## Backup and rollback

### Application rollback

If a new frontend deployment is faulty, roll Vercel back to the previous known-good deployment. The central Supabase data remains separate from the frontend deployment.

### Data protection

Before major migration/import work:

- Export audit JSON from the application for important audits.
- Export CSV findings where useful for human-readable recovery.
- Use Supabase-provided database backup/export options available to the selected plan when appropriate.

### Migration failure

For the initial empty preview project, fix the migration and retest before production. Once real audit data exists, do not drop tables or destructively reset the database as a troubleshooting shortcut; use a reviewed forward migration or restore process.

## Local pre-cloud test

The repository includes a mock central service for non-production acceptance:

```bash
npm run build
npm run start:mock
```

Mock users are test-only and are never embedded in `dist/index.html`.
