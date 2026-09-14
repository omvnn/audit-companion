import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuditPlan } from '../import-parser.mjs';
import { syntheticAuditPlanPages } from './fixtures/audit-plan-text-fixture.mjs';

test('parser extracts audit metadata from synthetic header',()=>{
  const result=parseAuditPlan(syntheticAuditPlanPages);
  assert.equal(result.metadata.department,'Testing Validation Lab');
  assert.equal(result.metadata.lab,'Material Lab');
  assert.equal(result.metadata.auditDate,'2026-09-10');
  assert.equal(result.metadata.standard,'ISO 9001:2015');
  assert.deepEqual(result.metadata.auditors,['Lead Auditor','Auditor Two']);
  assert.deepEqual(result.metadata.auditees,['Lab PIC','Technician']);
});

test('parser preserves every inspection row in original multi-page order',()=>{
  const result=parseAuditPlan(syntheticAuditPlanPages);
  assert.equal(result.items.length,6);
  assert.deepEqual(result.items.map(x=>x.position),[1,2,3,4,5,6]);
  assert.deepEqual(result.items.map(x=>x.sourcePage),[1,1,1,1,2,2]);
  assert.equal(result.items[1].requirementReference,'7.2');
  assert.equal(result.items[2].requirementReference,'7.2');
  assert.notEqual(result.items[1].inspectionItem,result.items[2].inspectionItem);
});

test('parser extracts inspection method flags without rewriting question text',()=>{
  const result=parseAuditPlan(syntheticAuditPlanPages);
  const row=result.items[3];
  assert.equal(row.inspectionItem,'Is measuring equipment uniquely identified?');
  assert.equal(row.documentReview,true);
  assert.equal(row.inquiry,false);
  assert.equal(row.onsiteInspection,true);
});

test('OCR-aligned whitespace table rows use header column positions to detect methods',()=>{
  const text=[
    'No  Clause  Inspection Item                                      Document Review  Inquiry  On-site Inspection',
    '10  7.1.5   Is each measuring/testing equipment uniquely identified?          X                         X',
  ].join('\n');
  const result=parseAuditPlan([{pageNumber:1,confidence:0.94,text}]);
  assert.equal(result.items.length,1);
  const row=result.items[0];
  assert.equal(row.position,10);
  assert.equal(row.requirementReference,'7.1.5');
  assert.equal(row.inspectionItem,'Is each measuring/testing equipment uniquely identified?');
  assert.equal(row.documentReview,true);
  assert.equal(row.inquiry,false);
  assert.equal(row.onsiteInspection,true);
  assert.ok(row.methodConfidence>=0.90);
});

test('malformed rows become warnings instead of fabricated inspection items',()=>{
  const result=parseAuditPlan([{pageNumber:1,confidence:0.88,text:'Audit Date: 2026-09-10\n7.2 ???'}]);
  assert.equal(result.items.length,0);
  assert.ok(result.warnings.length>0);
  assert.ok(result.overallConfidence<0.90);
});
