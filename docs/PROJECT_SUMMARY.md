# Audit Companion — Project Summary

**Version:** v0.2.0  
**Status:** Live / verified internal-audit application  
**Snapshot date:** 14 September 2026  
**Repository:** https://github.com/omvnn/audit-companion  
**Production:** https://audit-companion-g440ez.v2.appdeploy.ai/

## 1. Purpose

Audit Companion is a centralized internal-audit workspace for Testing Validation Lab teams. It keeps audit planning, ISO scope, objective evidence, findings, CAPA, team access, analytics and reporting in one shared system instead of scattered spreadsheets, chats and files.

The application is designed to remain beginner-friendly on desktop and mobile while enforcing role-based access around sensitive audit data.

## 2. Current Product Scope

### Audit planning and execution
- Admin and Lead Auditor can create audits.
- Select ISO 9001 clauses 4–10 and their components when defining scope.
- Generate a starter checklist from the selected scope.
- Record objective evidence, notes and sample/record references.
- Attach private evidence files.
- Track checklist completion and audit-result counts.

### Findings and CAPA
- Create Observation, OFI, Minor NC and Major NC findings.
- Record owners and due dates.
- Record root cause, controlled root-cause category, corrective action and verification notes.
- Track lifecycle states: Open → Action Pending → Verification → Closed.
- Record a real `closed_at` timestamp and clear it when a finding is reopened.
- Maintain a consolidated CAPA Register across all audits the user is permitted to read.
- Filter CAPA by lab, date, owner, classification, category, status, overdue state and aging bucket.
- Export the filtered CAPA Register to CSV.

### Analytics
Per-audit analytics include:
- completion rate
- conformity rate
- NC rate
- evidence coverage
- result distribution
- findings by ISO clause
- findings by process stage
- CAPA status and aging

Management analytics for Admin and Lead Auditor include:
- audits by month
- conformity and NC trends
- findings by classification, lab, clause and process stage
- CAPA status, aging, owner workload and closure-time trend
- root-cause distribution
- deterministic recurring-finding signals
- deterministic CAPA management summary

The v0.2.0 summary layer is rule-based. Optional AI Deep Analysis remains disabled.

### Evidence and reporting
- Private evidence storage in Supabase Storage.
- Short-lived signed evidence links.
- Audit CSV export.
- CAPA CSV export.
- Browser Print / PDF reporting.

### Team and access control
| Role | Main permissions |
| --- | --- |
| **Admin** | Full workspace administration, invitations, role management, global CAPA/analytics access and audit management. |
| **Lead Auditor** | Create/manage audits they lead, assign members, and access global CAPA/management analytics subject to RLS. |
| **Auditor** | Work on assigned/readable audits and use per-audit analytics. |
| **Viewer** | Read-only access to assigned/readable audit information and per-audit analytics. |

Additional controls:
- Invite-only onboarding.
- Display names instead of normal UI exposure of email addresses.
- Admin-only Team Access panel.
- Last-active-Admin database guard.
- RLS-backed audit membership and role boundaries.

## 3. Architecture

```text
Desktop / Mobile Browser
        │
        ▼
Audit Companion frontend
HTML + CSS + JavaScript ES modules
        │
        ├── Supabase Auth
        ├── Supabase Postgres / PostgREST
        │     ├── Operational tables remain source of truth
        │     └── security_invoker reporting views for analytics
        └── Supabase Storage
              └── Private evidence + signed URLs

GitHub → source, migrations, docs, CI
AppDeploy → production hosting + browser/runtime QA
```

Operational data is not duplicated into a second analytics database. Reporting views derive analytics from the source audit, response, finding and corrective-action records.

## 4. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript ES Modules |
| Build | Vite 6 |
| Tests | Node.js built-in test runner |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| API | Supabase PostgREST / RPC |
| Authorization | PostgreSQL RLS + column grants + DB triggers |
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
├── analytics.mjs
├── analytics-view.mjs
├── capa-view.mjs
├── styles.css
├── analytics.css
├── public/assets/
├── docs/
├── supabase/migrations/
│   └── 008_capa_analytics.sql
└── tests/
```

## 6. Security Posture

Implemented controls include:
- Supabase Row Level Security.
- Private evidence storage and signed links.
- Invite-only onboarding.
- Role-aware UI plus database-side authorization.
- `security_invoker` analytics views so reporting respects source-table RLS.
- Anonymous profile access removed.
- Last-active-Admin lockout protection.
- Content Security Policy, no-referrer behavior and anti-framing guard.

v0.2.0 verification additionally confirmed:
- Auditor cannot read unrelated audit, finding or CAPA analytics rows.
- Lead Auditor global views remain limited by readable source rows.
- Viewer can read assigned data but write attempts are blocked.
- Admin reporting views match the readable operational source data.
- Finding closure sets `closed_at`; reopening clears it.
- Legacy due dates continue to resolve through CAPA due-date fallback.

Known platform warnings remain unchanged:
1. `update_own_display_name(...)` is an intentional narrow `SECURITY DEFINER` RPC available to authenticated users.
2. Supabase leaked-password protection remains disabled because the project is on the Free plan and the feature is Pro-only.

## 7. Verification / QA State

For the v0.2.0 release candidate:
- GitHub Actions test + production-build workflow passed on the completed feature branch.
- Supabase schema migration `008_capa_analytics.sql` is applied.
- Reporting views were verified with `security_invoker=on`.
- Role-boundary, closure-timestamp and due-date compatibility checks passed.
- AppDeploy production QA returned zero frontend, network and backend errors and produced desktop/mobile QA snapshots.

## 8. Current Milestone

**v0.2.0 — CAPA & Analytics**

- Centralized audit workflow ✅
- ISO scope/checklist ✅
- Evidence + findings ✅
- CAPA lifecycle ✅
- Consolidated CAPA Register ✅
- Deterministic CAPA summary ✅
- Per-audit analytics ✅
- Management analytics ✅
- Recurring-finding signals ✅
- Mobile + desktop responsive UI ✅
- RLS/security verification ✅
- GitHub CI + AppDeploy QA ✅

## 9. Next Product Opportunities

High-value follow-ups include:
- Controlled Template Export with document/revision control.
- CAPA reminders/escalation and management notifications.
- Stronger effectiveness-verification/sign-off gates.
- Optional AI Deep Analysis behind explicit permission and data-governance controls.

---

**Release state:** v0.2.0 CAPA & Analytics release candidate verified for merge on 14 September 2026.
