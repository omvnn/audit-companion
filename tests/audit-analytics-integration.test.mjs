import test from 'node:test';
import assert from 'node:assert/strict';
import { auditView } from '../views.mjs';
import { AuditService } from '../service.mjs';

test('audit view includes provided analytics panel without coupling to analytics renderer', () => {
  const html = auditView({
    audit:{id:'a1',title:'Material Audit',audit_date:'2026-09-14',scope:'Material Lab',scope_clauses:[]},
    profile:{id:'u1',role:'auditor',display_name:'Auditor'},
    items:[],responses:new Map(),findings:[],actions:[],evidence:[],canEdit:true,canManage:false,teamProfiles:[],
    analyticsHtml:'<section data-test="audit-analytics">Audit analytics custom panel</section>',
  });
  assert.match(html,/data-test="audit-analytics"/);
  assert.match(html,/Audit analytics custom panel/);
});

test('AuditService.auditAnalyticsBundle reads one audit summary plus finding and CAPA detail rows', async () => {
  const calls=[];
  const api={user:{id:'u1'},async request(path){calls.push(path);if(path.includes('v_audit_analytics'))return [{audit_id:'a1'}];if(path.includes('v_finding_analytics'))return [{finding_id:'f1'}];if(path.includes('v_capa_register'))return [{finding_id:'f1'}];return [];}};
  const service=new AuditService(api);
  const bundle=await service.auditAnalyticsBundle('a1');
  assert.equal(bundle.summary.audit_id,'a1');
  assert.equal(bundle.findings.length,1);
  assert.equal(bundle.capa.length,1);
  assert.ok(calls.every(path=>path.includes('audit_id=eq.a1')));
});
