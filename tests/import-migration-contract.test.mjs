import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../supabase/migrations/009_audit_plan_import.sql',import.meta.url),'utf8');

const must=(pattern,label)=>test(label,()=>assert.match(sql,pattern));

must(/create table if not exists public\.audit_plan_imports/i,'creates audit_plan_imports');
must(/create table if not exists public\.audit_plan_import_pages/i,'creates audit_plan_import_pages');
must(/create table if not exists public\.audit_plan_import_items/i,'creates audit_plan_import_items');
must(/unique\s*\(\s*import_id\s*,\s*page_number\s*\)/i,'enforces unique import page numbers');
must(/alter table public\.audit_plan_imports enable row level security/i,'enables import RLS');
must(/alter table public\.audit_plan_import_pages enable row level security/i,'enables page RLS');
must(/alter table public\.audit_plan_import_items enable row level security/i,'enables item RLS');
must(/private\.can_manage_import/i,'defines import authorization helper');
must(/private\.app_role\(\).*lead_auditor/is,'limits import management to admin or lead auditor roles');
must(/storage\.foldername\(name\).*imports/is,'adds private import storage prefix checks');
must(/create or replace function public\.promote_audit_plan_import\s*\(\s*import_id uuid\s*\)/i,'defines atomic promotion RPC');
must(/security definer/i,'promotion RPC uses SECURITY DEFINER');
must(/review_ready/i,'promotion requires review_ready status');
must(/insert into public\.checklist_items/i,'promotion creates exact checklist items');
must(/insert into public\.audit_sources/i,'promotion links source document');
must(/created_audit_id/i,'promotion records resulting audit id');
must(/ai_fallback_enabled/i,'adds governed AI fallback setting');
must(/document_hash/i,'stores document hash audit trail');
must(/ai_provider/i,'stores AI provider audit trail field');
