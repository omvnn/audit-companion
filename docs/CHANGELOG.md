# Changelog

## v0.3.0 — 14 September 2026

Audit Plan Import release.

- Made Import Audit Plan the default new-audit path while retaining manual ISO-scope creation as a fallback.
- Added PDF, JPG and PNG audit-plan import.
- Added browser-local rasterization, document-quality checks and OCR before parsing.
- Added fail-closed rejection for low resolution, blur, low contrast, underexposure, glare and cropped-page signals.
- Added deterministic extraction of audit metadata, ISO clauses, inspection-item wording and inspection-method flags.
- Preserved repeated clauses and source row/page order instead of deduplicating inspection items.
- Added multi-page staging and per-page replacement for failed pages.
- Added a single review screen before any operational audit is created.
- Added private staged source storage, short-lived signed source links, SHA-256 document hash metadata and parser traceability.
- Added RLS-protected staging tables for imports, pages and extracted items.
- Added atomic `promote_audit_plan_import(...)` RPC to create the audit, lead membership, exact checklist rows and source lineage in one database transaction.
- Added Admin / Lead Auditor import permissions with Auditor / Viewer creation restrictions and cross-user isolation.
- Added a fail-closed AI fallback boundary; no external AI provider or credential is configured in v0.3.0.
- Fixed an RLS helper execution-permission defect discovered during release stress testing and added a regression test/migration.
- Stress-tested a 20-page / 200-item staged import through promotion with exact checklist count and source linkage.
- Verified failed-page and low-confidence promotion blocking, repeat-promotion protection, role isolation and private import storage-path enforcement.
- AppDeploy release-candidate QA completed with zero frontend, network and backend errors on desktop/mobile snapshots.

Known limitation: authenticated import UI automation is not configured because there is no dedicated QA browser account. Authorization, promotion and storage boundaries were verified directly against live Supabase under transactional role simulations, and repository CI covers the deterministic importer modules.

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
