# Audit Companion

Centralized internal audit workspace for the Testing Validation Lab. Audit Companion supports Material, Performance and Safety Lab audits with shared Supabase-backed data, ISO 9001 scope selection, evidence capture, findings/CAPA, role-based access, exports and responsive desktop/mobile UI.

## Production

- App: https://audit-companion-g440ez.v2.appdeploy.ai/
- Backend: Supabase Auth + Postgres + Row Level Security + private evidence storage
- Hosting: AppDeploy

## Roles

- **Admin** — full workspace administration, invites, team management, and deletion of any audit.
- **Lead Auditor** — creates/manages audits and can delete only audits they created or currently lead.
- **Auditor** — edits assigned audits.
- **Viewer** — read-only access to assigned audits.

## Main capabilities

- Central shared audit dataset across team members
- ISO 9001 Clauses 4–10 hierarchical scope picker
- Scope-matched checklist generation
- Default 18-question Material Lab starter checklist
- Objective evidence, notes, result classification and private evidence uploads
- Findings and CAPA follow-up
- Team assignment and one-time invite links
- Admin/Lead-Auditor controlled audit deletion
- CSV and Print/PDF export
- Responsive desktop/mobile interface
- Supabase RLS-backed authorization

## Repository structure

- `index.html`, `app.mjs`, `api.mjs`, `core.mjs`, `service.mjs`, `views.mjs`, `styles.css` — production browser client
- `supabase/migrations/` — reproducible database, Auth/RLS, scope and security migrations
- `tests/tests.txt` — AppDeploy user-visible QA contract
- `docs/security/` — purple-team security assessment
- `docs/qa/` — QA/QC evidence
- `docs/deployment/` — deployment/runbook documentation

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Database migrations

Apply `supabase/migrations/*.sql` in filename order to a fresh Supabase project. Migration `001` bootstraps the schema/catalog/private evidence bucket; migration `002` applies invite-only provisioning and hardened private RLS helpers; later migrations add ISO scope persistence, security hardening, and role-gated audit deletion.

Never commit a Supabase service-role key or other private credential. The browser contains only the public Supabase client configuration; access to audit data is enforced by Postgres RLS and private Storage policies.

## Verification baseline

Imported from the verified `feature/team-audit-v2` project state after local commit `6dd5229`.

- 84/84 project tests passed
- 17/17 live-app tests passed after the audit-delete feature
- AppDeploy production QA: 0 frontend errors, 0 network errors
- Purple-team gate: no remaining Critical/High finding in the tested frontend/Supabase authorization path

See `docs/security/2026-09-13-purple-team-assessment.md` for the security assessment.
