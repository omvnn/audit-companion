<p align="center">
  <img src="public/assets/audit-companion-logo.png" alt="Audit Companion logo" width="180">
</p>

<h1 align="center">Audit Companion</h1>

<p align="center"><b>A beginner-friendly, centralized internal audit workspace for Testing Validation Lab teams.</b></p>

<p align="center">
  <a href="https://audit-companion-g440ez.v2.appdeploy.ai/"><img alt="Live App" src="https://img.shields.io/badge/Live_App-AppDeploy-24C7B1?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
  <a href="https://github.com/omvnn/audit-companion/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/omvnn/audit-companion/ci.yml?branch=main&style=for-the-badge&label=CI"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-v0.2.0-2563EB?style=for-the-badge">
  <img alt="Backend" src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white">
</p>

<p align="center">
  <img alt="ISO 9001" src="https://img.shields.io/badge/ISO_9001-Scope_4--10-2563EB?style=flat-square">
  <img alt="Security" src="https://img.shields.io/badge/Security-RLS_%2B_Private_Storage-0F766E?style=flat-square&logo=shield&logoColor=white">
  <img alt="Responsive" src="https://img.shields.io/badge/UI-Desktop_%2B_Mobile-7C3AED?style=flat-square">
</p>

Audit Companion keeps **audits, evidence, findings, CAPA, analytics and team access in one shared place**. It is designed for Material, Performance and Safety Lab audits and uses Supabase for centralized data and security.

> **Current release:** **v0.2.0 — CAPA & Analytics**

## 🚀 Start here

1. **Open the live app:** [Audit Companion](https://audit-companion-g440ez.v2.appdeploy.ai/)
2. **Sign in** with your team account.
3. **Open an audit** or create one if your role allows it, then work through the checklist, evidence, findings and CAPA workflow.

For the complete handoff, architecture, security posture and verification state, see [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md).

## ✨ What it can do

| Capability | What it means |
| --- | --- |
| 🧭 ISO 9001 scope picker | Choose clauses 4–10 and specific subclauses before creating an audit. |
| ✅ Smart checklist | Seeds a starter checklist around the selected scope. |
| 🧾 Evidence capture | Record objective evidence, notes, sample references and private file evidence. |
| 🚩 Findings | Record Observation, OFI, Minor NC and Major NC. |
| 🔁 CAPA lifecycle | Track root cause, category, corrective action, owner, due date, verification and closure. |
| 📋 CAPA Register | Consolidated, filterable CAPA table across readable audits. |
| 🧠 CAPA summary | Deterministic management summary from the underlying CAPA records. |
| 📊 Per-audit analytics | Completion, conformity, NC, evidence coverage, findings and CAPA metrics. |
| 📈 Management analytics | Audit trends, labs, clauses, process stages, root causes, CAPA aging/workload and recurring signals. |
| 👥 Team roles | Admin, Lead Auditor, Auditor and Viewer with controlled access. |
| 📤 Reporting | Audit CSV, CAPA CSV and Print / PDF reporting. |
| 📱 Responsive UI | Desktop and mobile layouts. |

## 👤 Roles at a glance

| Role | Typical use |
| --- | --- |
| **Admin** | Workspace administration, invites, team roles, global CAPA/analytics and audit management. |
| **Lead Auditor** | Creates/manages audits and uses global CAPA/analytics subject to RLS. |
| **Auditor** | Works on assigned/readable audits and records evidence/findings/CAPA. |
| **Viewer** | Read-only access to assigned/readable audits and per-audit analytics. |

## 📊 v0.2.0 analytics model

```text
Audits + Responses + Findings + Corrective Actions
                    │
                    ▼
        RLS-safe reporting views
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   Per-audit analytics   Management analytics
                              │
                              ▼
                         CAPA Register
                              │
                              ▼
                    Deterministic summary
```

Operational records remain the source of truth; analytics do not create a second audit database.

## 🗺️ Product roadmap

<p align="center">
  <img src="docs/assets/audit-companion-roadmap.png" alt="Audit Companion product roadmap" width="900">
</p>

High-value next steps include Controlled Template Export with document/revision control, CAPA reminders/escalation, stronger effectiveness-verification gates and optional AI Deep Analysis behind explicit data-governance controls.

## 🧩 Architecture

```text
Browser / Mobile Browser
        │
        ▼
Audit Companion UI
        │
        ├── Supabase Auth
        ├── Supabase Postgres / PostgREST
        │     ├── operational audit data
        │     └── security_invoker analytics views
        └── Private Storage → evidence files

GitHub → source of truth + CI
AppDeploy → production hosting + browser/runtime QA
```

## 🧑‍💻 Run locally

```bash
npm install
npm run dev
```

Verification:

```bash
npm test
npm run build
```

## 📁 Project map

```text
audit-companion/
├── index.html
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
└── tests/
```

## 🔐 Security model

Audit Companion uses **Supabase Auth, PostgreSQL Row Level Security, private evidence storage, role-based permissions, short-lived signed evidence links and security-invoker reporting views**. The browser contains only public Supabase client configuration.

The project has a purple-team assessment under [`docs/security/`](docs/security/). v0.2.0 role-boundary verification confirmed that analytics respects readable source rows and Viewer writes remain blocked.

Known platform notes remain documented: the narrow self-display-name SECURITY DEFINER RPC is intentional, and Supabase leaked-password protection remains unavailable on the current Free plan.

## 🗃️ Database setup

Apply files in [`supabase/migrations/`](supabase/migrations/) in filename order. `008_capa_analytics.sql` adds closure tracking, root-cause categories and RLS-safe reporting views for v0.2.0.

## ✅ Verification

GitHub Actions runs the repository test suite and production build. Production releases are additionally checked through Supabase security/RLS verification and AppDeploy desktop/mobile QA before being marked ready.

## 🌐 Production

**Live app:** https://audit-companion-g440ez.v2.appdeploy.ai/

**Stack:** HTML/CSS/JavaScript · Vite · Supabase Auth/Postgres/PostgREST/Storage · AppDeploy · GitHub Actions

---

<p align="center"><b>Audit · Evidence · Findings · CAPA · Analytics · Improvement</b></p>
