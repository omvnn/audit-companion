import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_IMPORT_THRESHOLDS,
  assessImageQuality,
  confidenceBand,
  shouldUseAiFallback,
  blockingImportIssues,
} from '../import-quality.mjs';

test('confidence bands are high medium and low at approved thresholds',()=>{
  assert.equal(confidenceBand(0.95),'high');
  assert.equal(confidenceBand(0.80),'medium');
  assert.equal(confidenceBand(0.50),'low');
  assert.equal(DEFAULT_IMPORT_THRESHOLDS.highConfidence,0.90);
  assert.equal(DEFAULT_IMPORT_THRESHOLDS.mediumConfidence,0.75);
});

test('clear readable page passes quality gate',()=>{
  const result=assessImageQuality({width:1800,height:2400,sharpness:180,contrast:45,brightness:145,glareRatio:0.01,cropRatio:0.01});
  assert.equal(result.passed,true);
  assert.deepEqual(result.errors,[]);
});

test('blur crop low contrast and glare fail closed with explicit codes',()=>{
  assert.ok(assessImageQuality({width:1800,height:2400,sharpness:20,contrast:45,brightness:145,glareRatio:0.01,cropRatio:0.01}).errors.includes('BLURRY_PAGE'));
  assert.ok(assessImageQuality({width:1800,height:2400,sharpness:180,contrast:45,brightness:145,glareRatio:0.01,cropRatio:0.35}).errors.includes('CROPPED_PAGE'));
  assert.ok(assessImageQuality({width:1800,height:2400,sharpness:180,contrast:5,brightness:145,glareRatio:0.01,cropRatio:0.01}).errors.includes('LOW_CONTRAST'));
  assert.ok(assessImageQuality({width:1800,height:2400,sharpness:180,contrast:45,brightness:245,glareRatio:0.30,cropRatio:0.01}).errors.includes('GLARE'));
});

test('AI fallback is only eligible for readable medium-confidence content when enabled',()=>{
  assert.equal(shouldUseAiFallback({qualityPassed:true,confidence:0.82,aiEnabled:true}),true);
  assert.equal(shouldUseAiFallback({qualityPassed:true,confidence:0.95,aiEnabled:true}),false);
  assert.equal(shouldUseAiFallback({qualityPassed:false,confidence:0.82,aiEnabled:true}),false);
  assert.equal(shouldUseAiFallback({qualityPassed:true,confidence:0.82,aiEnabled:false}),false);
});

test('blocking issues aggregate failed pages and low-confidence required rows',()=>{
  const issues=blockingImportIssues({
    pages:[{pageNumber:1,qualityStatus:'passed'},{pageNumber:2,qualityStatus:'failed',failureReason:'BLURRY_PAGE'}],
    items:[{position:1,textConfidence:0.93,clauseConfidence:0.94,methodConfidence:0.92},{position:2,textConfidence:0.60,clauseConfidence:0.95,methodConfidence:0.95}],
  });
  assert.equal(issues.length,2);
  assert.ok(issues.some(x=>x.code==='PAGE_FAILED'&&x.pageNumber===2));
  assert.ok(issues.some(x=>x.code==='ITEM_LOW_CONFIDENCE'&&x.position===2));
});
