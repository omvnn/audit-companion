import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agingBucket,
  isOverdue,
  safeRate,
  summarizeCAPA,
  groupRepeatSignals,
  auditMetrics,
} from '../analytics.mjs';

test('aging buckets have stable boundaries', () => {
  assert.equal(agingBucket(0), '0-30');
  assert.equal(agingBucket(30), '0-30');
  assert.equal(agingBucket(31), '31-60');
  assert.equal(agingBucket(60), '31-60');
  assert.equal(agingBucket(61), '61-90');
  assert.equal(agingBucket(90), '61-90');
  assert.equal(agingBucket(91), '>90');
});

test('closed items are never overdue and zero denominators return null', () => {
  assert.equal(isOverdue({ due_date:'2026-09-01', status:'closed' }, '2026-09-14'), false);
  assert.equal(isOverdue({ due_date:'2026-09-01', status:'open' }, '2026-09-14'), true);
  assert.equal(safeRate(0, 0), null);
});

test('CAPA summary only states facts present in rows', () => {
  const rows = [
    { status:'open', overdue:true, root_cause_category:'equipment_calibration', days_open:20 },
    { status:'verification', overdue:false, root_cause_category:'equipment_calibration', days_open:10 },
    { status:'closed', overdue:false, root_cause_category:'process_method', closure_days:18 },
  ];
  const text = summarizeCAPA(rows);
  assert.match(text, /3 CAPAs/);
  assert.match(text, /1 overdue/);
  assert.match(text, /1 awaiting verification/);
  assert.match(text, /18/);
  assert.match(text, /Equipment \/ Calibration/);
});

test('repeat signals require two separate audits for same lab, related clause and process stage', () => {
  const rows = [
    { audit_id:'a1', lab_id:'lab1', lab_name:'Material Lab', requirement_reference:'7.1.5', process_stage:'Calibration', classification:'minor_nc', audit_date:'2026-06-01' },
    { audit_id:'a2', lab_id:'lab1', lab_name:'Material Lab', requirement_reference:'7.1.5.2', process_stage:'Calibration', classification:'observation', audit_date:'2026-09-01' },
    { audit_id:'a2', lab_id:'lab1', lab_name:'Material Lab', requirement_reference:'8.7', process_stage:'Calibration', classification:'minor_nc', audit_date:'2026-09-01' },
  ];
  const signals = groupRepeatSignals(rows);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].lab_name, 'Material Lab');
  assert.equal(signals[0].occurrence_count, 2);
});

test('audit metrics calculate evidence coverage from text or uploaded evidence', () => {
  const responses = [
    { id:'r1', result:'conform', evidence_text:'Calibration cert checked' },
    { id:'r2', result:'minor_nc', evidence_text:'' },
    { id:'r3', result:'unanswered', evidence_text:'' },
  ];
  const findings = [{ id:'f1', status:'open', classification:'minor_nc', created_at:'2026-09-01T00:00:00Z' }];
  const actions = [{ finding_id:'f1', due_date:'2026-09-10' }];
  const evidence = [{ response_id:'r2' }];
  const metrics = auditMetrics({ responses, findings, actions, evidence, today:'2026-09-14' });
  assert.equal(metrics.completion_percent, 66.7);
  assert.equal(metrics.conformity_rate, 50);
  assert.equal(metrics.nc_rate, 50);
  assert.equal(metrics.evidence_coverage_percent, 100);
  assert.equal(metrics.overdue_capa, 1);
});
