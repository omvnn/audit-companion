import test from 'node:test';
import assert from 'node:assert/strict';
import { capaView } from '../capa-view.mjs';

test('CAPA register renders management summary, filters and accessible table labels', () => {
  const html = capaView({
    profile: { id:'u1', role:'admin', display_name:'Admin' },
    rows: [
      { finding_id:'f1', audit_id:'a1', audit_title:'Material Audit', lab_name:'Material Lab', requirement_reference:'7.1.5', classification:'minor_nc', root_cause_category:'equipment_calibration', root_cause:'Expired calibration', action_text:'Recalibrate', owner_name:'Ahmad', due_date:'2026-09-10', status:'open', days_open:20, overdue:true, verification_text:'' },
      { finding_id:'f2', audit_id:'a2', audit_title:'Safety Audit', lab_name:'Safety Lab', requirement_reference:'8.7', classification:'ofi', root_cause_category:'process_method', root_cause:'Weak handoff', action_text:'Update WI', owner_name:'Farah', due_date:'2026-09-30', status:'verification', days_open:8, overdue:false, verification_text:'Pending evidence' },
    ],
    filters: {},
    labs: [{id:'lab1',name:'Material Lab'}],
  });
  assert.match(html, /CAPA Register/);
  assert.match(html, /Total CAPA/);
  assert.match(html, /Overdue/);
  assert.match(html, /Awaiting verification/);
  assert.match(html, /name="labId"/);
  assert.match(html, /data-action="capa-filter"/);
  assert.match(html, /Corrective action/);
  assert.match(html, /Days open/);
  assert.match(html, /Equipment \/ Calibration/);
  assert.match(html, /Open/);
});

test('CAPA register renders a clean empty state', () => {
  const html = capaView({ profile:{role:'lead_auditor',display_name:'Lead'}, rows:[], filters:{}, labs:[] });
  assert.match(html, /No CAPAs match/);
  assert.match(html, /No CAPAs are visible/);
});
