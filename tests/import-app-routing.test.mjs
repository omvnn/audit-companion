import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');

test('new audit routes to import-first screen rather than opening manual dialog immediately',()=>{
  assert.match(app,/action==='new-audit'[\s\S]{0,180}goImportStart/);
  assert.match(app,/import-start/);
  assert.match(app,/import-review/);
});

test('manual creation remains an explicit fallback',()=>{
  assert.match(app,/action==='open-manual-audit'/);
  assert.match(app,/#audit-dialog/);
});

test('file processing uses quality engine parser and staged import service',()=>{
  assert.match(app,/extractPages\(/);
  assert.match(app,/parseAuditPlan\(/);
  assert.match(app,/blockingImportIssues\(/);
  assert.match(app,/service\.createImport\(/);
  assert.match(app,/service\.saveImportPage\(/);
  assert.match(app,/service\.saveImportExtraction\(/);
});

test('review submit promotes through RPC-backed service and navigates to audit',()=>{
  assert.match(app,/form\.id==='import-review-form'/);
  assert.match(app,/service\.promoteImport\(/);
  assert.match(app,/goAudit\(/);
});

test('failed page replacement is wired without creating an operational audit',()=>{
  assert.match(app,/replace-import-page/);
  assert.match(app,/service\.replaceImportPage\(/);
});
