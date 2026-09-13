import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canDeleteAudit, buildChecklistForScopes, inviteTokenFromUrl } from '../core.mjs';
import { dashboardView } from '../views.mjs';
import { AuditService } from '../service.mjs';

test('Admin and lead-auditor delete permissions are enforced in UI helpers', () => {
  const audit = { id: 'a1', title: 'Audit A', created_by: 'u1', lead_auditor_id: 'u2' };
  assert.equal(canDeleteAudit('admin', audit, 'other'), true);
  assert.equal(canDeleteAudit('lead_auditor', audit, 'u1'), true);
  assert.equal(canDeleteAudit('lead_auditor', audit, 'u2'), true);
  assert.equal(canDeleteAudit('lead_auditor', audit, 'other'), false);
  assert.equal(canDeleteAudit('auditor', audit, 'u1'), false);
  assert.equal(canDeleteAudit('viewer', audit, 'u1'), false);
});

test('Dashboard only renders Delete audit for authorized records', () => {
  const audit = { id: 'a1', title: 'Audit A', scope: '', status: 'draft', audit_date: '2026-09-13', lab_name: 'Material Lab', auditee: '', created_by: 'lead-1', lead_auditor_id: 'lead-1' };
  const leadHtml = dashboardView({ profile: { id: 'lead-1', role: 'lead_auditor' }, labs: [], audits: [audit] });
  const auditorHtml = dashboardView({ profile: { id: 'auditor-1', role: 'auditor' }, labs: [], audits: [audit] });
  assert.match(leadHtml, /Delete audit/);
  assert.doesNotMatch(auditorHtml, /Delete audit/);
});

test('AuditService.deleteAudit uses DELETE and rejects zero-row deletes', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path, options = {}) {
      calls.push({ path, options });
      return [{ id: 'audit-1' }];
    },
  };
  const service = new AuditService(api);
  const deleted = await service.deleteAudit('audit-1');
  assert.equal(deleted.id, 'audit-1');
  assert.equal(calls[0].options.method, 'DELETE');
  assert.match(calls[0].path, /audits\?id=eq\.audit-1/);

  const denied = new AuditService({ user: { id: 'u1' }, request: async () => [] });
  await assert.rejects(() => denied.deleteAudit('audit-2'), /not found or deletion is not permitted/i);
});

test('ISO scope selection narrows checklist generation', () => {
  const items = buildChecklistForScopes(['7.1.5.2']);
  assert.ok(items.length >= 1);
  assert.ok(items.every((item) => String(item.requirement_reference).startsWith('7.1.5') || item.requirement_reference === '7.1.5.2'));
});

test('Invite parser prefers fragment tokens', () => {
  assert.equal(inviteTokenFromUrl('https://example.test/#invite=frag-token'), 'frag-token');
  assert.equal(inviteTokenFromUrl('https://example.test/?invite=query-token#invite=frag-token'), 'frag-token');
});

test('Frontend hardening remains present', () => {
  const app = fs.readFileSync(new URL('../app.mjs', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const joined = `${app}\n${html}`;
  assert.match(app, /sessionStorage/);
  assert.doesNotMatch(app, /localStorage/);
  assert.match(app, /window\.top!==window\.self/);
  assert.match(html, /Content-Security-Policy/i);
  assert.match(html, /no-referrer/i);
  assert.doesNotMatch(joined, /service[_-]?role/i);
  assert.doesNotMatch(joined, /sb_secret_/i);
});
