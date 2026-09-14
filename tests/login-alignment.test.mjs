import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const styles=[
  fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8'),
  fs.readFileSync(new URL('../brand.css',import.meta.url),'utf8'),
].join('\n');

test('login branding eyebrow and title are centered without centering the form',()=>{
  assert.match(styles,/\.auth-card\s*>\s*\.eyebrow\s*,\s*\.auth-card\s*>\s*h1\s*\{[^}]*text-align\s*:\s*center/i);
  assert.doesNotMatch(styles,/\.auth-card\s*\{[^}]*text-align\s*:\s*center/i);
  assert.doesNotMatch(styles,/\.stack\s*\{[^}]*text-align\s*:\s*center/i);
});
