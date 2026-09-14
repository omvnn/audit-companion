import test from 'node:test';
import assert from 'node:assert/strict';
import { importStartView, importProcessingView, importReviewView } from '../import-view.mjs';

const profile={id:'u1',display_name:'Lead',role:'lead_auditor'};

test('start view makes import primary and manual creation a fallback',()=>{
  const html=importStartView({profile});
  assert.match(html,/Import Audit Plan/i);
  assert.match(html,/Scan & extract plan/i);
  assert.match(html,/type="file"/i);
  assert.match(html,/accept="[^"]*(?:pdf|image)/i);
  assert.match(html,/data-action="open-manual-audit"/i);
  assert.match(html,/Create manually/i);
});

test('processing view explains local document checks',()=>{
  const html=importProcessingView({profile,fileName:'plan.pdf'});
  assert.match(html,/Checking document quality/i);
  assert.match(html,/Extracting inspection items/i);
  assert.match(html,/plan\.pdf/);
});

test('review view shows failed page replacement and blocks creation',()=>{
  const html=importReviewView({profile,importRecord:{id:'imp1',original_filename:'plan.pdf',status:'quality_check'},pages:[{id:'p2',page_number:2,quality_status:'failed',failure_reason:'BLURRY_PAGE'}],items:[],labs:[],blockingIssues:[{code:'PAGE_FAILED',pageNumber:2}],settings:{ai_fallback_enabled:false}});
  assert.match(html,/Page 2 cannot be imported/i);
  assert.match(html,/blur/i);
  assert.match(html,/Retake|reupload/i);
  assert.match(html,/data-action="replace-import-page"/i);
  assert.match(html,/Create Audit[^<]*<\/button>|disabled[^>]*>Create Audit/i);
  assert.match(html,/disabled/);
});

test('review view emphasizes only warnings while preserving method flags',()=>{
  const html=importReviewView({profile,importRecord:{id:'imp1',original_filename:'plan.pdf',status:'review_ready',audit_title:'Material Audit',audit_date:'2026-09-10',standard_text:'ISO 9001:2015',lab_id:'lab1',auditors:['Lead'],auditees:['PIC']},pages:[{id:'p1',page_number:1,quality_status:'passed'}],items:[{id:'i1',position:1,source_row:'1',requirement_reference:'7.1.5',inspection_item:'Is equipment identified?',document_review:true,inquiry:false,onsite_inspection:true,text_confidence:0.95,clause_confidence:0.95,method_confidence:0.95}],labs:[{id:'lab1',name:'Material Lab'}],blockingIssues:[],settings:{ai_fallback_enabled:false}});
  assert.match(html,/Audit plan ready/i);
  assert.match(html,/Is equipment identified\?/);
  assert.match(html,/Document Review/);
  assert.match(html,/On-site Inspection/);
  assert.match(html,/Page 1/);
  assert.match(html,/Create Audit/);
  assert.doesNotMatch(html,/Create Audit" disabled/);
});

test('review rendering escapes imported content',()=>{
  const html=importReviewView({profile,importRecord:{id:'imp1',original_filename:'<script>x<\/script>',status:'review_ready'},pages:[],items:[{id:'i1',position:1,requirement_reference:'7.2',inspection_item:'<img src=x onerror=1>',document_review:false,inquiry:false,onsite_inspection:false}],labs:[],blockingIssues:[],settings:{}});
  assert.doesNotMatch(html,/<script>x<\/script>/i);
  assert.doesNotMatch(html,/<img src=x onerror=1>/i);
  assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/i);
  assert.match(html,/&lt;img src=x onerror=1&gt;/i);
});
