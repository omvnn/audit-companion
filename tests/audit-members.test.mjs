import test from 'node:test';
import assert from 'node:assert/strict';
import { auditView } from '../views.mjs';
import { AuditService } from '../service.mjs';

function baseAuditView(overrides={}){
  return auditView({
    audit:{id:'a1',title:'Material Lab Audit',audit_date:'2026-09-18',scope:'Material Lab',scope_clauses:['4','5']},
    profile:{id:'u1',role:'auditor',display_name:'Oman'},
    items:[],responses:new Map(),findings:[],actions:[],evidence:[],canEdit:true,canManage:false,teamProfiles:[],
    analyticsHtml:'',
    ...overrides,
  });
}

test('audit page shows only members assigned to this audit', () => {
  const html=baseAuditView({members:[
    {user_id:'u1',display_name:'Oman',assignment_role:'auditor'},
    {user_id:'u2',display_name:'Firda',assignment_role:'lead'},
  ]});
  assert.match(html,/>Members</);
  assert.match(html,/Oman/);
  assert.match(html,/Firda/);
  assert.doesNotMatch(html,/Nazri/);

  const empty=baseAuditView({members:[]});
  assert.match(empty,/No members assigned/);
});

test('AuditService.loadAudit resolves assigned member display names for every readable audit', async () => {
  const calls=[];
  const api={
    user:{id:'u1'},
    async request(path){
      calls.push(path);
      if(path.startsWith('/rest/v1/audits?id=eq.a1'))return [{id:'a1',created_by:'u9',lead_auditor_id:'u9'}];
      if(path.startsWith('/rest/v1/checklist_items'))return [];
      if(path.startsWith('/rest/v1/audit_responses'))return [];
      if(path.startsWith('/rest/v1/findings'))return [];
      if(path.startsWith('/rest/v1/evidence_files'))return [];
      if(path.includes('/rest/v1/audit_members?audit_id=eq.a1&select='))return [
        {user_id:'u1',assignment_role:'auditor',created_at:'2026-09-14T00:00:00Z'},
        {user_id:'u2',assignment_role:'lead',created_at:'2026-09-14T00:01:00Z'},
      ];
      if(path.startsWith('/rest/v1/profiles?id=eq.u1'))return [{id:'u1',role:'auditor',display_name:'Oman',active:true}];
      if(path.includes('/rest/v1/profiles?id=in.'))return [
        {id:'u1',display_name:'Oman'},
        {id:'u2',display_name:'Firda'},
      ];
      return [];
    },
  };
  const service=new AuditService(api);
  const data=await service.loadAudit('a1');
  assert.deepEqual(data.members.map(x=>x.display_name),['Oman','Firda']);
  assert.equal(data.assignmentRole,'auditor');
  assert.ok(calls.some(path=>path.includes('/rest/v1/audit_members?audit_id=eq.a1&select=')));
});
