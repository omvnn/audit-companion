import test from 'node:test';
import assert from 'node:assert/strict';
import { managementAnalyticsView, auditAnalyticsPanel, canSeeManagementAnalytics } from '../analytics-view.mjs';

test('management analytics is limited to Admin and Lead Auditor', () => {
  assert.equal(canSeeManagementAnalytics({role:'admin'}), true);
  assert.equal(canSeeManagementAnalytics({role:'lead_auditor'}), true);
  assert.equal(canSeeManagementAnalytics({role:'auditor'}), false);
  assert.equal(canSeeManagementAnalytics({role:'viewer'}), false);
});

test('management analytics renders executive KPIs, trends and recurrence with text labels', () => {
  const html = managementAnalyticsView({
    profile:{role:'admin',display_name:'Admin'},
    auditRows:[
      {audit_id:'a1',audit_date:'2026-08-10',lab_id:'l1',lab_name:'Material Lab',answered_count:10,conform_count:8,minor_nc_count:1,major_nc_count:1,conformity_rate:80,nc_rate:20,open_capa:1,overdue_capa:1,average_closed_capa_days:12},
      {audit_id:'a2',audit_date:'2026-09-10',lab_id:'l1',lab_name:'Material Lab',answered_count:10,conform_count:9,minor_nc_count:1,major_nc_count:0,conformity_rate:90,nc_rate:10,open_capa:0,overdue_capa:0,average_closed_capa_days:8},
    ],
    findingRows:[
      {audit_id:'a1',audit_date:'2026-08-10',lab_id:'l1',lab_name:'Material Lab',classification:'minor_nc',requirement_reference:'7.1.5',process_stage:'Calibration',root_cause_category:'equipment_calibration'},
      {audit_id:'a2',audit_date:'2026-09-10',lab_id:'l1',lab_name:'Material Lab',classification:'minor_nc',requirement_reference:'7.1.5.2',process_stage:'Calibration',root_cause_category:'equipment_calibration'},
    ],
    capaRows:[
      {status:'open',overdue:true,aging_bucket:'31-60',owner_name:'Ahmad',root_cause_category:'equipment_calibration'},
      {status:'closed',overdue:false,aging_bucket:'0-30',owner_name:'Farah',closure_days:10,root_cause_category:'process_method'},
    ],
    filters:{},labs:[],
  });
  assert.match(html,/Management Analytics/);
  assert.match(html,/Conformity rate/);
  assert.match(html,/NC rate/);
  assert.match(html,/Audits by month/);
  assert.match(html,/Finding classification/);
  assert.match(html,/ISO clause hotspots/);
  assert.match(html,/Root-cause categories/);
  assert.match(html,/CAPA aging/);
  assert.match(html,/Recurring finding signals/);
  assert.match(html,/Material Lab/);
});

test('per-audit analytics panel renders KPI and finding/CAPA sections', () => {
  const html = auditAnalyticsPanel({
    analytics:{completion_percent:75,conformity_rate:80,nc_rate:10,evidence_coverage_percent:90,overdue_capa:2,conform_count:8,observation_count:1,ofi_count:0,minor_nc_count:1,major_nc_count:0,open_capa:1,action_pending_capa:0,verification_capa:1,closed_capa:3},
    findingRows:[{requirement_reference:'7.1.5',process_stage:'Calibration',classification:'minor_nc'}],
    capaRows:[{status:'open',aging_bucket:'31-60'}],
  });
  assert.match(html,/Audit analytics/);
  assert.match(html,/Evidence coverage/);
  assert.match(html,/Findings by ISO clause/);
  assert.match(html,/CAPA status/);
});
