# Audit Companion — Project Summary

**Status:** Live / usable MVP  
**Snapshot date:** 13 September 2026  
**Repository:** https://github.com/omvnn/audit-companion  
**Production:** https://audit-companion-g440ez.v2.appdeploy.ai/

## 1. Purpose

Audit Companion is a centralized internal-audit workspace built for Testing Validation Lab teams. Its goal is to keep audit planning, ISO scope, objective evidence, findings, CAPA, team access and reporting in one shared system instead of scattered spreadsheets, chats and files.

The app is designed to stay beginner-friendly on desktop and mobile while enforcing role-based access around sensitive audit data.

## 2. Current Product Scope

### Audit planning and execution
- Create and start internal audits.
- Admin and Lead Auditor can create audits.
- Select ISO 9001 clauses 4–10 and their components when defining scope.
- Generate a starter checklist based on selected scope.
- Record objective evidence, auditor notes and sample/record references.
- Track checklist completion and audit result counts.

### Findings and CAPA
- Create Observation, OFI, Minor NC and Major NC findings from checklist results.
- Record finding owner and due date.
- Track root cause and corrective action.
- Maintain CAPA follow-up in the same audit workspace.

### Evidence and reporting
- Upload evidence files to private Supabase Storage.
- Open evidence using short-lived signed URLs.
- Export audit data to CSV.
- Use the browser Print / PDF flow for reports.

### Team and access control
Application roles:

| Role | Main permissions |
| --- | --- |
| **Admin** | Full workspace administration, invitations, application-role management, audit management and deletion of any audit. |
| **Lead Auditor** | Create/start audits, manage audits they lead, assign audit members and delete audits they created or lead. |
| **Auditor** | Work on assigned audits and record evidence/findings. |
| **Viewer** | Read-only access to assigned audit information. |

Additional controls:
- Invite-only team onboarding.
- User-selected display names instead of exposing email addresses in normal team UI.
- Admin-only Team Access panel.
- Admin can promote or demote teammates between Admin, Lead Auditor, Auditor and Viewer.
- Database guard prevents demoting/deactivating the final active Admin.
- Recent Work and privileged controls remain role-gated.

## 3. Architecture

```text
Desktop / Mobile Browser
        │
        ▼
Audit Companion frontend
HTML + CSS + JavaScript ES modules
        │
        ├── Supabase Auth
        │     └── Sign-in + invited account creation
        │
        ├── Supabase Postgres / PostgREST
        │     ├── Profiles / roles
        │     ├── Audits + audit membership
        │     ├── Checklist items + responses
        │     ├── Findings
        │     └── Corrective actions / CAPA
        │
        └── Supabase Storage
              └── Private audit evidence + signed URLs

GitHub
├── Source of truth
├── SQL migrations
├── Documentation
└── CI

AppDeploy
└── Production web deployment + browser/runtime QA
```

## 4. Tech Stack

| Layer | Technology | Usage |
| --- | --- | --- |
| **Frontend** | HTML5 | App shell and browser entry point. |
| **Frontend** | CSS3 | Responsive desktop/mobile UI and visual system. |
| **Frontend** | Vanilla JavaScript / ES Modules | App state, routing, forms, audit interactions and rendering. |
| **Build tooling** | Vite 6 | Local development, production build and preview. |
| **Runtime/testing** | Node.js built-in test runner | Unit and regression tests. |
| **Authentication** | Supabase Auth | Team sign-in and invite-based account creation. |
| **Database** | Supabase Postgres | Central source of truth for audits, profiles, membership, findings and CAPA. |
| **API layer** | Supabase PostgREST / RPC | Browser-to-database application operations. |
| **Authorization** | PostgreSQL RLS + column grants + DB triggers | Role and audit-level access enforcement. |
| **File storage** | Supabase Storage | Private evidence-file storage. |
| **Hosting** | AppDeploy | Public production deployment and QA snapshots. |
| **Source control** | GitHub | Repository, pull requests and documentation. |
| **CI** | GitHub Actions | Automated unit tests and production-build verification. |

## 5. Important Repository Components

```text
audit-companion/
├── index.html
├── app.mjs              # UI events, state and interaction flow
├── api.mjs              # Supabase REST/Auth/storage client
├── core.mjs             # ISO scope, permissions and shared rules
├── service.mjs          # Audit/domain operations
├── views.mjs            # HTML rendering
├── styles.css           # Responsive application styling
├── public/assets/       # Logo / branding
├── docs/
│   ├── assets/          # Roadmap visuals
│   ├── deployment/      # Deployment/runbook documentation
│   ├── qa/              # QA/QC records
│   ├── security/        # Purple-team/security documentation
│   └── PROJECT_SUMMARY.md
├── supabase/migrations/
│   ├── 001_team_audit_v2.sql
│   ├── 002_invite_only_and_private_helpers.sql
│   ├── 003_audit_scope_clauses.sql
│   ├── 004_security_hardening.sql
│   ├── 005_audit_delete_permissions.sql
│   ├── 006_display_names.sql
│   └── 007_admin_role_management.sql
└── tests/
```

## 6. Security Posture Implemented

- Supabase Row Level Security for database authorization.
- Private evidence storage.
- Short-lived signed evidence links.
- Invite-only onboarding flow.
- Role-aware UI plus database-side authorization.
- Anonymous profile access removed.
- Browser clients do not receive broad profile UPDATE permission; role modification is restricted to the role column and Admin RLS.
- Last-active-Admin database lockout guard with transaction advisory locking.
- Content Security Policy and anti-framing protection in the frontend.
- Purple-team review documentation stored under `docs/security/`.

### Current security notes

Two Supabase security-advisor items remain known:

1. `update_own_display_name(...)` is an intentional `SECURITY DEFINER` RPC used for controlled self-service display-name updates. It remains a warning that should be reviewed whenever the profile model changes.
2. **Leaked Password Protection is disabled.** Supabase only provides HaveIBeenPwned leaked-password checking on the Pro plan and above; the current Audit Companion Supabase project is on the Free plan.

Neither item blocks the current MVP, but both should remain visible in future security reviews.

## 7. Verification / QA State

As of this snapshot:
- Repository unit/regression tests passed on the latest feature work.
- GitHub CI passed before the latest role-management merge.
- Production AppDeploy deployment reported zero frontend, network and backend errors after the role-management release.
- Supabase confirmed the last-admin guard is installed and Lead Auditor audit creation is allowed.
- Admin promotion/demotion changes were merged into `main` through PR #3.

## 8. Current Product Milestone

The current milestone can be considered a **usable centralized internal-audit MVP**:

- Authentication ✅
- Invite-only team onboarding ✅
- Role-based permissions ✅
- Admin promotion/demotion ✅
- Lead Auditor audit creation ✅
- ISO scope selection ✅
- Scope-based checklist generation ✅
- Evidence capture/storage ✅
- Findings classification ✅
- CAPA tracking ✅
- CSV / Print-PDF reporting ✅
- Mobile + desktop responsive UI ✅
- Security hardening / purple-team review ✅
- GitHub CI + AppDeploy QA ✅

## 9. Resume Point

If development resumes later, treat this document, the README, `supabase/migrations/`, and the current `main` branch as the source of truth. Re-run CI and Supabase security advisors before any future production release.

---

**Session close:** 13 September 2026  
**State:** Stable MVP, deployed, documented and ready to pause.
