import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('analytics stylesheet is loaded by the application shell', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /analytics\.css/);
});

test('analytics stylesheet includes responsive, table, overdue, focus and print rules', () => {
  const css = fs.readFileSync(new URL('../analytics.css', import.meta.url), 'utf8');
  assert.match(css, /\.analytics-page/);
  assert.match(css, /\.analytics-kpis/);
  assert.match(css, /\.analytics-grid/);
  assert.match(css, /\.table-scroll/);
  assert.match(css, /\.capa-table/);
  assert.match(css, /\.is-overdue/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /@media\s+print/);
});
