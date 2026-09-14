# Audit Companion — Project Summary

**Version:** v0.3.0  
**Status:** Live / verified internal-audit application  
**Snapshot date:** 14 September 2026  
**Repository:** https://github.com/omvnn/audit-companion  
**Production:** https://audit-companion-g440ez.v2.appdeploy.ai/

## 1. Purpose

Audit Companion is a centralized internal-audit workspace for Testing Validation Lab teams. It keeps audit planning, imported audit plans, ISO scope, objective evidence, findings, CAPA, team access, analytics and reporting in one shared system instead of scattered spreadsheets, chats and files.

The application is designed to remain beginner-friendly on desktop and mobile while enforcing role-based access around sensitive audit data.

## 2. Current Product Scope

### Audit planning and import
- Admin and Lead Auditor can create audits.
- The default creation flow imports a PDF, JPG or PNG audit plan.
- Browser-local document quality checks reject unreadable, blurred, cropped, low-contrast, underexposed or glare-affected pages instead of guessing.
- Browser-local OCR extracts page text before deterministic parsing.
- The parser extracts audit metadata, ISO clauses, inspection-item text and Document Review / Inquiry / On-site Inspection flags.
- Repeated clauses remain separate inspection rows and source page/row order is preserved.
- Multi-page imports retain good pages and allow failed pages to be replaced individually.
- Imported content is staged for one review screen; no operational audit is created until the user selects **Create Audit**.
- A narrow database RPC atomically creates the audit, lead membership, exact checklist rows and source-document lineage.
- Manual ISO 9001 scope creation remains available as a fallback.

### Audit execution
- Select ISO 9001 clauses 4–10 and components for manually created audits.
- Generate a starter checklist from selected scope.
- Record objective evidence, notes and sample/record references.
- Attach private evidence files.
- Track checklist completion and audit-result counts.

### Findings and CAPA
- Create Observation, OFI, Minor NC and Major NC findings.
- Record owners and due dates.
- Record root cause, controlled root-cause category, corrective action and verification notes.
- Track lifecycle states: Open → Action Pending → Verification → Closed.
- Record a real `closed_at` timestamp and clear it when a finding is reopened.
- Maintain a consolidated CAPA Register across readable audits.
- Filter CAPA by lab, date, owner, classification, category, status, overdue state and aging bucket.
- Export the filtered CAPA Register to CSV.

### Analytics
Per-audit analytics include completion, conformity, NC rate, evidence coverage, result distribution, findings by ISO clause/process stage and CAPA status/aging.

Management analytics for Admin and Lead Auditor include audits by month, conformity/NC trends, findings by classification/lab/clause/process stage, CAPA status/aging/owner workload/closure time, root-cause distribution and deterministic recurring-finding signals.

The management summary remains deterministic. AI Deep Analysis is not enabled.

### Evidence and reporting
- Private evidence and imported source-document storage in Supabase Storage.
- Short-lived signed evidence/source links.
- Audit CSV export.
- CAPA CSV export.
- Browser Print / PDF reporting.

### Team and access control
| Role | Main permissions |
| --- | --- |
| **Admin** | Full workspace administration, invitations, role management, all staged imports, global CAPA/analytics and audit management. |
| **Lead Auditor** | Create/import audits, manage imports they own, manage audits they lead and use global CAPA/analytics subject to RLS. |
| **Auditor** | Work on assigned/readable audits; cannot create staged plan imports. |
| **Viewer** | Read-only access to assigned/readable audit information; cannot create staged plan imports. |

Additional controls include invite-only onboarding, display names, Admin-only Team Access, last-active-Admin protection and database-backed RLS boundaries.

## 3. Architecture

```text
Desktop / Mobile Browser
        │
        ▼
Audit Companion frontend
HTML + CSS + JavaScript ES modules
        │
        ├── Local PDF/image quality checks
        ├── Local OCR + deterministic plan parser
        │
        ├── Supabase Auth
        ├── Supabase Postgres / PostgREST / RPC
        │     ├── operational audit tables
        │     ├── private import staging tables
        │     └── security_invoker reporting views
        └── Supabase Storage
              └── private evidence + imported source documents

GitHub → source, migrations, docs, CI
AppDeploy → production hosting + browser/runtime QA
```

AI fallback has a governed UI/database setting but the provider adapter intentionally fails closed in v0.3.0. No external provider endpoint or secret is exposed in the browser.

## 4. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript ES Modules |
| Build | Vite 6 |
| Tests | Node.js built-in test runner |
| PDF rendering | pdfjs-dist 4.10.38, version pinned |
| OCR | Tesseract.js 6.0.1, browser-local |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| API | Supabase PostgREST / RPC |
| Authorization | PostgreSQL RLS + grants + DB triggers/functions |
| Storage | Supabase Storage |
| Hosting | AppDeploy |
| Source / CI | GitHub + GitHub Actions |

## 5. Key Repository Components

```text
audit-companion/
├── app.mjs
├── api.mjs
├── core.mjs
├── service.mjs
├── views.mjs
├── import-engine.mjs
├── import-quality.mjs
├── import-parser.mjs
├── import-view.mjs
├── import-ai.mjs
├── import.css
├── analytics.mjs
├── analytics-view.mjs
├── capa-view.mjs
├── styles.css
├── analytics.css
├── public/assets/
├── docs/
├── supabase/migrations/
│   ├── 008_capa_analytics.sql
│   ├── 009_audit_plan_import.sql
│   └── 010_import_rls_function_permissions.sql
└── tests/
```

## 6. Security Posture

Implemented controls include:
- Supabase Row Level Security.
- Private evidence/import storage and short-lived signed links.
- Admin/Lead-only staged-import creation.
- Lead Auditor ownership isolation for staged imports; Admin can manage all.
- Auditor/Viewer import creation blocked database-side.
- Atomic server-side promotion revalidates review readiness, page quality and item confidence.
- Source-document path policies bind import paths to the authenticated uploader/import record.
- `security_invoker` analytics views so reporting respects source-table RLS.
- Invite-only onboarding, last-active-Admin protection, Content Security Policy, no-referrer behavior and anti-framing guard.
- Imported text is HTML-escaped in the review UI.

v0.3.0 stress verification additionally confirmed:
- A Lead Auditor successfully promoted a staged **20-page / 200-item** import with exactly 200 operational checklist rows, source lineage and lead membership.
- Lead Auditor cannot read another user's unpromoted import.
- Auditor and Viewer cannot create staged imports; Viewer cannot read an unrelated staged import.
- Admin can manage/promote another user's staged import.
- Failed pages and required fields below the 0.75 confidence gate cannot be promoted.
- A promoted import cannot be promoted a second time.
- Private import storage accepts the authorized uploader path and blocks a forged user-path prefix.

Stress testing discovered one RLS helper permission defect before release. Migration `010_import_rls_function_permissions.sql` fixes it and a regression test protects the behavior.

Known platform warnings:
1. `promote_audit_plan_import(...)` and `update_own_display_name(...)` are intentional narrow authenticated `SECURITY DEFINER` RPCs.
2. Supabase leaked-password protection remains disabled on the current Free plan.

## 7. Verification / QA State

For v0.3.0:
- GitHub Actions tests and production build passed after the importer and RLS permission regression fixes.
- Supabase migrations 009 and 010 are applied to production.
- Transactional live-database stress/role/storage checks passed and were rolled back after verification.
- Supabase security advisor reported no new release-blocking missing-RLS issue; intentional SECURITY DEFINER and plan-level leaked-password warnings remain documented.
- AppDeploy release-candidate deployment reached **ready** with zero frontend, network and backend errors and generated desktop/mobile snapshots.
- Public/signed-out browser QA covers production delivery, authentication failure handling, invite UI and anonymous data boundaries.
- There is no dedicated authenticated browser QA account, so authenticated import UI is not automatically exercised by AppDeploy E2E; live DB/RLS/RPC stress tests and repository unit/integration tests provide that release evidence.

## 8. Current Milestone

**v0.3.0 — Audit Plan Import**

- Centralized audit workflow ✅
- Import-first PDF/JPG/PNG workflow ✅
- Quality gate + local OCR ✅
- Deterministic clause/item/method extraction ✅
- Multi-page failed-page replacement ✅
- Review-before-create gate ✅
- Atomic audit/checklist/source promotion ✅
- Private import staging + storage RLS ✅
- Manual ISO scope fallback ✅
- Evidence + findings + CAPA ✅
- CAPA Register + analytics ✅
- Mobile + desktop responsive UI ✅
- Stress/security verification ✅
- GitHub CI + AppDeploy QA ✅

## 9. Next Product Opportunities

High-value follow-ups include:
- Controlled Template Export with document/revision control.
- Dedicated authenticated QA automation account/environment.
- CAPA reminders/escalation and management notifications.
- Stronger effectiveness-verification/sign-off gates.
- Optional AI Deep Analysis or import fallback only after explicit provider approval and data-governance review.

---

**Release state:** v0.3.0 Audit Plan Import release verified for production promotion on 14 September 2026.
