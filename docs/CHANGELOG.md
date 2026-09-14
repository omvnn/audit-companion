# Changelog

## v0.2.0 — 14 September 2026

CAPA and analytics release.

- Added a consolidated CAPA Register across readable audits.
- Added deterministic CAPA management summaries with no external AI dependency.
- Added CAPA lifecycle states: Open, Action Pending, Verification and Closed.
- Added explicit finding `closed_at` tracking with reopen support.
- Added controlled root-cause categories for analytics.
- Added per-audit analytics for completion, conformity, NC rate, evidence coverage and CAPA status.
- Added management analytics for audit activity, findings, labs, ISO clauses, process stages, root causes, CAPA aging, workload and closure trends.
- Added deterministic recurring-finding signals across audits.
- Added filtered CAPA CSV export.
- Added responsive/mobile analytics and CAPA layouts with print-safe reporting behavior.
- Added RLS-safe `security_invoker` reporting views in Supabase.
- Verified auditor/lead data isolation, viewer read-only behavior, closure trigger lifecycle and legacy due-date fallback.
- AppDeploy QA completed with zero frontend, network and backend errors on desktop/mobile snapshots.

Known limitation: optional AI Deep Analysis remains disabled; v0.2.0 uses deterministic summaries only.

## v0.1.0 — 13 September 2026

Initial stable MVP release.

- Centralized audit workspace
- ISO 9001 scope picker and checklist seeding
- Evidence, findings and CAPA workflows
- CSV / Print-PDF reporting
- Supabase Auth, Postgres/RLS and private Storage
- Admin / Lead Auditor / Auditor / Viewer roles
- Admin promotion and demotion with last-admin protection
- Lead Auditor audit creation
- Responsive desktop/mobile UI
- GitHub Actions CI and AppDeploy production QA
