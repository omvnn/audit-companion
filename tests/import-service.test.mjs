import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditService } from '../service.mjs';

function mockApi(){
  const calls=[];
  const api={user:{id:'user-1'},calls,async request(path,opts={}){
    calls.push({path,opts});
    if(path.startsWith('/rest/v1/audit_plan_imports?')&&opts.method==='POST')return [{id:'imp-1',status:'uploaded'}];
    if(path.startsWith('/rest/v1/audit_plan_import_pages'))return [{id:'page-1',import_id:'imp-1',page_number:1}];
    if(path==='/rest/v1/rpc/promote_audit_plan_import')return 'audit-1';
    if(path.startsWith('/rest/v1/audit_import_settings'))return [{ai_fallback_enabled:false}];
    if(path.startsWith('/rest/v1/audit_plan_imports?id=eq.imp-1')&&!opts.method)return [{id:'imp-1',status:'review_ready'}];
    if(path.startsWith('/rest/v1/audit_plan_import_pages?import_id=eq.imp-1')&&!opts.method)return [{id:'page-1',page_number:1}];
    if(path.startsWith('/rest/v1/audit_plan_import_items?import_id=eq.imp-1')&&!opts.method)return [{id:'item-1',position:1}];
    return [];
  }};
  return api;
}

test('createImport creates uploader-owned staging row',async()=>{
  const api=mockApi(),service=new AuditService(api);
  const row=await service.createImport({original_filename:'plan.pdf',mime_type:'application/pdf',page_count:2,document_hash:'abc'});
  assert.equal(row.id,'imp-1');
  const call=api.calls.find(c=>c.path.startsWith('/rest/v1/audit_plan_imports?'));
  assert.equal(call.opts.method,'POST');
  assert.equal(call.opts.body.uploaded_by,'user-1');
  assert.equal(call.opts.body.original_filename,'plan.pdf');
});

test('saveImportPage upserts by import and page number',async()=>{
  const api=mockApi(),service=new AuditService(api);
  await service.saveImportPage('imp-1',{page_number:1,quality_status:'passed',ocr_text:'hello',ocr_confidence:0.95});
  const call=api.calls.find(c=>c.path.includes('on_conflict=import_id,page_number'));
  assert.ok(call);
  assert.equal(call.opts.body.import_id,'imp-1');
});

test('replaceImportPage clears items from only the replaced page',async()=>{
  const api=mockApi(),service=new AuditService(api);
  await service.replaceImportPage('imp-1',{id:'page-1',page_number:1,quality_status:'passed'});
  assert.ok(api.calls.some(c=>c.path==='/rest/v1/audit_plan_import_items?page_id=eq.page-1'&&c.opts.method==='DELETE'));
  assert.ok(api.calls.some(c=>c.path.includes('/rest/v1/audit_plan_import_pages?on_conflict=import_id,page_number')));
});

test('saveImportExtraction replaces staged items and marks review_ready',async()=>{
  const api=mockApi(),service=new AuditService(api);
  await service.saveImportExtraction('imp-1',{metadata:{labId:'lab-1',lab:'Material Lab',auditDate:'2026-09-10',standard:'ISO 9001:2015'},items:[{position:1,sourcePage:1,sourceRow:'1',requirementReference:'7.2',inspectionItem:'Is competence verified?',documentReview:true,inquiry:true,onsiteInspection:false,textConfidence:0.95,clauseConfidence:0.95,methodConfidence:0.95}],overallConfidence:0.95});
  assert.ok(api.calls.some(c=>c.path==='/rest/v1/audit_plan_import_items?import_id=eq.imp-1'&&c.opts.method==='DELETE'));
  const insert=api.calls.find(c=>c.path==='/rest/v1/audit_plan_import_items'&&c.opts.method==='POST');
  assert.equal(insert.opts.body[0].requirement_reference,'7.2');
  const patch=api.calls.find(c=>c.path==='/rest/v1/audit_plan_imports?id=eq.imp-1'&&c.opts.method==='PATCH');
  assert.equal(patch.opts.body.status,'review_ready');
  assert.equal(patch.opts.body.lab_id,'lab-1');
});

test('loadImport returns import pages and items together',async()=>{
  const api=mockApi(),service=new AuditService(api);
  const bundle=await service.loadImport('imp-1');
  assert.equal(bundle.import.id,'imp-1');
  assert.equal(bundle.pages.length,1);
  assert.equal(bundle.items.length,1);
});

test('promotion uses narrow authenticated RPC and settings default disabled',async()=>{
  const api=mockApi(),service=new AuditService(api);
  assert.equal(await service.promoteImport('imp-1'),'audit-1');
  const rpc=api.calls.find(c=>c.path==='/rest/v1/rpc/promote_audit_plan_import');
  assert.deepEqual(rpc.opts.body,{import_id:'imp-1'});
  const settings=await service.workspaceImportSettings();
  assert.equal(settings.ai_fallback_enabled,false);
});
