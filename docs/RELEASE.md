# Audit Companion Release

**Current version:** v0.3.0  
**Release stage:** Production milestone  
**Snapshot date:** 14 September 2026

## Versioning

Audit Companion uses semantic-style versioning for project milestones:

- **MAJOR** — breaking architecture or workflow changes.
- **MINOR** — new user-facing capabilities and milestone releases.
- **PATCH** — fixes, hardening and small non-breaking improvements.

## v0.3.0 — Audit Plan Import

Import-first audit creation for PDF/JPG/PNG plans with browser-local quality checks and OCR, deterministic clause/inspection-method extraction, multi-page failed-page replacement, review-before-create staging, private source-document storage and atomic promotion into exact audit/checklist/source records.

Release verification included repository CI/build, Supabase migration/security checks, role-boundary and storage-path tests, fail-closed quality/confidence tests, repeat-promotion protection and a transactional 20-page/200-item promotion stress run. Stress testing discovered and fixed an authenticated RLS helper permission issue before release through migration `010_import_rls_function_permissions.sql`.

AI fallback remains disabled/unconfigured and fails closed until an approved provider and data-governance path are added.

## v0.2.0 — CAPA & Analytics

Added the consolidated CAPA Register, deterministic management summaries, lifecycle/closure tracking, per-audit and management analytics, recurring-finding signals and RLS-safe reporting views.

## v0.1.0 — MVP

First stable deployed MVP with centralized audit planning, ISO 9001 scope selection, smart checklist generation, evidence capture, findings, CAPA, reporting, Supabase-backed authentication/database/storage, application roles, Admin promotion/demotion, Lead Auditor audit creation, RLS-based authorization and deployment/CI verification.

See `docs/PROJECT_SUMMARY.md` for the complete project handoff.
