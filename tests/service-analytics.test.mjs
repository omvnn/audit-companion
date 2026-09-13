import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditService } from '../service.mjs';

test('capaRegister builds safe reporting-view filters', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path, options = {}) {
      calls.push({ path, options });
      return [];
    },
  };
  const service = new AuditService(api);
  await service.capaRegister({ labId: 'lab-1', overdue: true, status: 'open', agingBucket: '31-60' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].path, /^\/rest\/v1\/v_capa_register\?/);
  assert.match(calls[0].path, /lab_id=eq\.lab-1/);
  assert.match(calls[0].path, /overdue=eq\.true/);
  assert.match(calls[0].path, /status=eq\.open/);
  assert.match(calls[0].path, /aging_bucket=eq\.31-60/);
});

test('saveCAPA persists a supported root-cause category only', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path, options = {}) {
      calls.push({ path, options });
      if (path.includes('select=id')) return [];
      return [{ id: 'ca-1', finding_id: 'f1' }];
    },
  };
  const service = new AuditService(api);
  await service.saveCAPA('f1', {
    root_cause: 'Expired calibration',
    root_cause_category: 'equipment_calibration',
    action_text: 'Recalibrate equipment',
    owner_name: 'Ahmad',
    due_date: '2026-09-30',
    verification_text: 'Verify certificate',
    unsupported: 'must not persist',
  });
  const write = calls.find((call) => call.options.method === 'POST');
  assert.equal(write.options.body.root_cause_category, 'equipment_calibration');
  assert.equal(Object.hasOwn(write.options.body, 'unsupported'), false);
  await assert.rejects(() => service.saveCAPA('f1', { root_cause_category: 'random' }), /root cause category/i);
});

test('auditAnalytics and managementAnalytics read reporting views', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path) {
      calls.push(path);
      if (path.includes('v_audit_analytics?audit_id=eq.audit-1')) return [{ audit_id: 'audit-1' }];
      return [];
    },
  };
  const service = new AuditService(api);
  const row = await service.auditAnalytics('audit-1');
  assert.equal(row.audit_id, 'audit-1');
  const bundle = await service.managementAnalytics({ labId: 'lab-1', from: '2026-01-01', to: '2026-12-31' });
  assert.ok(Array.isArray(bundle.audits));
  assert.ok(Array.isArray(bundle.findings));
  assert.ok(Array.isArray(bundle.capa));
  assert.ok(calls.some((path) => path.includes('/rest/v1/v_finding_analytics?')));
});

test('setFindingStatus only accepts supported lifecycle statuses', async () => {
  const calls = [];
  const api = {
    user: { id: 'u1' },
    async request(path, options = {}) {
      calls.push({ path, options });
      return [{ id: 'f1', status: options.body?.status || 'open' }];
    },
  };
  const service = new AuditService(api);
  const updated = await service.setFindingStatus('f1', 'verification');
  assert.equal(updated.status, 'verification');
  await assert.rejects(() => service.setFindingStatus('f1', 'deleted'), /invalid finding status/i);
});
