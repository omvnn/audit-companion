import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../supabase/migrations/010_import_rls_function_permissions.sql',import.meta.url),'utf8');

test('authenticated RLS can execute import authorization helpers',()=>{
  assert.match(sql,/grant execute on function private\.can_manage_import\s*\(\s*uuid\s*\) to authenticated/i);
  assert.match(sql,/grant execute on function private\.can_read_import\s*\(\s*uuid\s*\) to authenticated/i);
});

test('storage import policy can execute safe uuid parser',()=>{
  assert.match(sql,/grant execute on function private\.safe_uuid\s*\(\s*text\s*\) to authenticated/i);
});
