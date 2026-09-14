import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canInvokeAiFallback, requestAiFallback } from '../import-ai.mjs';

test('AI fallback is eligible only for readable medium-confidence content when enabled',()=>{
  assert.equal(canInvokeAiFallback({ai_fallback_enabled:true},{passed:true},0.82),true);
  assert.equal(canInvokeAiFallback({ai_fallback_enabled:true},{passed:true},0.95),false);
  assert.equal(canInvokeAiFallback({ai_fallback_enabled:false},{passed:true},0.82),false);
  assert.equal(canInvokeAiFallback({ai_fallback_enabled:true},{passed:false},0.82),false);
});

test('unconfigured provider fails closed without sending document content',async()=>{
  await assert.rejects(()=>requestAiFallback({pageText:'company content'}),e=>e?.code==='AI_FALLBACK_UNAVAILABLE');
});

test('browser AI adapter contains no provider endpoint or credential pattern',()=>{
  const source=fs.readFileSync(new URL('../import-ai.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/api\.openai|anthropic\.com|generativelanguage|sk-[A-Za-z0-9]|api[_-]?key/i);
});
