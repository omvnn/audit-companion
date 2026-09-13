import test from 'node:test';
import assert from 'node:assert/strict';
import { managementAnalyticsView } from '../analytics-view.mjs';
import { csvRowsForCAPA } from '../analytics.mjs';

test('management analytics includes approved trend sections and filters', () => {
  const html = managementAnalyticsView({
    profile:{role:'admin',display_name:'Admin'},
    auditRows:[
      {audit_id:'a1',audit_date:'2026-08-01',answered_count:10,minor_nc_count:2,major_nc_count:0,conform_count:8},
      {audit_id:'a2',audit_date:'2026-09-01',answered_count:10,minor_nc_count:1,major_nc_count:0,conform_count:9},
    ],
    findingRows:[],
    capaRows:[
      {status:'closed',closed_at:'2026-08-20T00:00:00Z',closure_days:20},
      {status:'closed',closed_at:'2026-09-15T00:00:00Z',closure_days:10},
    ],
    filters:{classification:'minor_nc',owner:'Ahmad'},
    labs:[],
  });
  assert.match(html,/NC rate trend/);
  assert.match(html,/Average closure trend/);
  assert.match(html,/name="classification"/);
  assert.match(html,/name="owner"/);
});

test('CAPA CSV includes the finding statement as an auditable source field', () => {
  const rows = csvRowsForCAPA([{audit_title:'Audit A',lab_name:'Material Lab',requirement_reference:'7.1.5',classification:'minor_nc',finding_statement:'Expired calibration sticker'}]);
  assert.ok(rows[0].includes('Statement'));
  const statementIndex=rows[0].indexOf('Statement');
  assert.equal(rows[1][statementIndex],'Expired calibration sticker');
});
