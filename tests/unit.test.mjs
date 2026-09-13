import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canDeleteAudit, buildChecklistForScopes, inviteTokenFromUrl, inviteSignupPayload } from '../core.mjs';
import { dashboardView, loginView } from '../views.mjs';
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
  const leadHtml = dashboardView({ profile: { id: 'lead-1', role: 'lead_auditor', display_name: 'Luqman' }, labs: [], audits: [audit] });
  const auditorHtml = dashboardView({ profile: { id: 'auditor-1', role: 'auditor', display_name: 'Auditor' }, labs: [], audits: [audit] });
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
  const refs = items.map((item) => String(item.requirement_reference));
  assert.ok(items.length >= 1);
  assert.ok(refs.some((ref) => ref === '7.1.5.2' || ref === '7.1.5'));
  assert.ok(refs.every((ref) => ref === '7.1' || ref === '7.1.5' || ref === '7.1.5.2'));
});

test('Invite parser prefers fragment tokens', () => {
  assert.equal(inviteTokenFromUrl('https://example.test/#invite=frag-token'), 'frag-token');
  assert.equal(inviteTokenFromUrl('https://example.test/?invite=query-token#invite=frag-token'), 'frag-token');
});

test('Invited signup requires and submits a display name', () => {
  const html = loginView({ invite: 'invite-token' });
  assert.match(html, /name="display_name"/);
  assert.match(html, /Display name/);
  assert.match(html, /maxlength="60"/);
  assert.deepEqual(inviteSignupPayload('a@example.com', 'password123', 'invite-token', '  Ahmad Luqman  '), {
    email: 'a@example.com',
    password: 'password123',
    data: { invite_token: 'invite-token', display_name: 'Ahmad Luqman' },
  });
});

test('Dashboard shows display name and an edit-name control instead of email identity', () => {
  const html = dashboardView({ profile: { id: 'u1', role: 'auditor', display_name: 'Ahmad', email: 'ahmad@example.com' }, labs: [], audits: [] });
  assert.match(html, />Ahmad</);
  assert.match(html, /Edit name/);
  assert.doesNotMatch(html, />ahmad@example\.com</);
});

test('Audit Companion branding uses the auditing logo on login and signed-in shell', () => {
  const loginHtml = loginView();
  const dashboardHtml = dashboardView({ profile: { id: 'u1', role: 'auditor', display_name: 'Ahmad' }, labs: [], audits: [] });
  assert.match(loginHtml, /audit-companion-logo\.png/);
  assert.match(loginHtml, /alt="Audit Companion logo"/);
  assert.match(dashboardHtml, /audit-companion-logo\.png/);
});

test('AuditService updates only the signed-in user display name through RPC', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path, options = {}) {
      calls.push({ path, options });
      return { display_name: 'Ahmad' };
    },
  };
  const service = new AuditService(api);
  const updated = await service.updateDisplayName('  Ahmad  ');
  assert.equal(updated.display_name, 'Ahmad');
  assert.equal(calls[0].path, '/rest/v1/rpc/update_own_display_name');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(calls[0].options.body, { new_display_name: 'Ahmad' });
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
