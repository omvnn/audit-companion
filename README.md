<p align="center">
  <img src="public/assets/audit-companion-logo.png" alt="Audit Companion logo" width="180">
</p>

<h1 align="center">Audit Companion</h1>

<p align="center"><b>A beginner-friendly, centralized internal audit workspace for Testing Validation Lab teams.</b></p>

<p align="center">
  <a href="https://audit-companion-g440ez.v2.appdeploy.ai/"><img alt="Live App" src="https://img.shields.io/badge/Live_App-AppDeploy-24C7B1?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
  <a href="https://github.com/omvnn/audit-companion/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/omvnn/audit-companion/ci.yml?branch=main&style=for-the-badge&label=CI"></a>
  <img alt="Backend" src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white">
</p>

<p align="center">
  <img alt="ISO 9001" src="https://img.shields.io/badge/ISO_9001-Scope_4--10-2563EB?style=flat-square">
  <img alt="Security" src="https://img.shields.io/badge/Security-RLS_%2B_Private_Storage-0F766E?style=flat-square&logo=shield&logoColor=white">
  <img alt="Responsive" src="https://img.shields.io/badge/UI-Desktop_%2B_Mobile-7C3AED?style=flat-square">
</p>

Audit Companion keeps **audits, evidence, findings, CAPA and team access in one shared place**. It is designed for Material, Performance and Safety Lab audits and uses Supabase for centralized data and security.

> **New here?** You do not need to understand the codebase to use the app. Start with the three steps below.

## 🚀 Start here

1. **Open the live app:** [Audit Companion](https://audit-companion-g440ez.v2.appdeploy.ai/)
2. **Sign in** with your team account. Invited users choose a display name so teammates see a human-friendly name instead of an email address.
3. **Open an existing audit or create one** if your role allows it, then work through the checklist and record objective evidence.

## ✨ What it can do

| Capability | What it means in simple terms |
| --- | --- |
| 🧭 ISO 9001 scope picker | Choose clauses **4–10**, including specific subclauses, before creating an audit. |
| ✅ Smart checklist | Builds a starter checklist around the ISO scope you selected. |
| 🧾 Evidence capture | Record objective evidence, notes, sample references and private file evidence. |
| 🚩 Findings | Record Observation, OFI, Minor NC and Major NC findings. |
| 🔁 CAPA | Track root cause, corrective actions, owners and due dates. |
| 👥 Team roles | Admin, Lead Auditor, Auditor and Viewer each get controlled access. |
| 🪪 Display names | Users can show a single name or full name instead of exposing email as their normal identity. |
| 🗑️ Controlled deletion | Admin can delete audits; Lead Auditors can delete only audits they created or lead. |
| 📤 Reporting | Export audit data to CSV and use Print / PDF for reports. |
| 📱 Responsive UI | Works on desktop and mobile layouts. |

## 👤 Roles at a glance

| Role | Typical use |
| --- | --- |
| **Admin** | Manages the workspace, invites people, manages teams and can delete any audit. |
| **Lead Auditor** | Creates and manages audits; can delete audits they created or currently lead. |
| **Auditor** | Works on audits they are assigned to and records audit evidence/findings. |
| **Viewer** | Read-only access to assigned audits. |

## 🗺️ Product roadmap

The roadmap below shows what is already built and the direction of the app.

<p align="center">
  <img src="docs/assets/audit-companion-roadmap.png" alt="Audit Companion product roadmap" width="900">
</p>

## 🧩 How the app fits together

```text
Browser / Mobile Browser
        │
        ▼
Audit Companion UI
        │
        ├── Supabase Auth        → sign in / invited accounts
        ├── Supabase Postgres    → audits, checklist, findings, CAPA, profiles
        └── Private Storage      → audit evidence files

GitHub → source of truth + CI
AppDeploy → production web hosting
```

## 🧑‍💻 Run it locally

You need **Node.js** and **npm**.

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

To verify a production build:

```bash
npm test
npm run build
```

## 📁 Project map

```text
audit-companion/
├── index.html                 # Browser entry page
├── app.mjs                    # Main app interactions and routing
├── api.mjs                    # Supabase REST/Auth client
├── core.mjs                   # Core rules, ISO scope and helpers
├── service.mjs                # Audit/domain operations
├── views.mjs                  # UI rendering
├── styles.css                 # Responsive visual design
├── public/assets/             # Website branding assets
├── docs/
│   ├── assets/                # Roadmap and README visuals
│   ├── deployment/            # Deployment/runbook docs
│   ├── qa/                    # QA/QC evidence
│   └── security/              # Purple-team security assessment
├── supabase/migrations/       # Reproducible database/security changes
└── tests/                     # Repository + AppDeploy QA tests
```

## 🔐 Security model

Audit Companion uses **Supabase Auth, Postgres Row Level Security (RLS), private evidence storage, role-based permissions and short-lived signed evidence links**. The browser contains only the public Supabase client configuration; privileged service-role credentials must never be committed to the repository.

The project has also gone through a purple-team review. See [`docs/security/2026-09-13-purple-team-assessment.md`](docs/security/2026-09-13-purple-team-assessment.md).

## 🗃️ Database setup

For a fresh Supabase project, apply the files in [`supabase/migrations/`](supabase/migrations/) **in filename order**. They bootstrap the schema and then add invite-only provisioning, hardened RLS helpers, ISO scope persistence, security improvements, controlled audit deletion and secure self-service display names.

## ✅ Verification

GitHub Actions runs the repository test suite and production build on changes. Production releases are additionally checked through AppDeploy QA for browser/runtime and network errors before being treated as ready.

## 🌐 Production

**Live app:** https://audit-companion-g440ez.v2.appdeploy.ai/

**Stack:** HTML/CSS/JavaScript · Supabase Auth/Postgres/Storage · AppDeploy · GitHub Actions

---

<p align="center"><b>Audit · Evidence · Findings · CAPA · Improvement</b></p>
