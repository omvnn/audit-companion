import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const helperUrl=new URL('../scroll-position.mjs',import.meta.url);
const appSource=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');

test('checklist scroll anchor helper preserves the saved card viewport position',async()=>{
  assert.equal(fs.existsSync(helperUrl),true,'scroll-position.mjs should exist');
  const {captureElementAnchor,restoreElementAnchor}=await import(helperUrl.href);
  const original={dataset:{itemId:'item-42'},getBoundingClientRect:()=>({top:320})};
  const anchor=captureElementAnchor(original);
  assert.deepEqual(anchor,{itemId:'item-42',top:320});

  const replacement={getBoundingClientRect:()=>({top:410})};
  let scrollArgs=null;
  const root={querySelector:(selector)=>selector==='[data-item-id="item-42"]'?replacement:null};
  const win={scrollBy:(args)=>{scrollArgs=args;}};
  const restored=restoreElementAnchor(anchor,{root,win});

  assert.equal(restored,true);
  assert.deepEqual(scrollArgs,{top:90,left:0,behavior:'instant'});
});

test('Save item refreshes the audit using a viewport anchor instead of forcing the page top',()=>{
  assert.match(appSource,/captureElementAnchor\(card\)/);
  assert.match(appSource,/goAudit\(state\.audit\.audit\.id,'Checklist item saved\.',\{anchor\}\)/);
  assert.match(appSource,/if\(anchor\)restoreElementAnchor\(anchor\);else window\.scrollTo\(\{top:0,behavior:'instant'\}\)/);
});
