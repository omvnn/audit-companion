import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.mjs', import.meta.url), 'utf8');

test('app routes CAPA and management analytics screens', () => {
  assert.match(app, /from '\.\/capa-view\.mjs'/);
  assert.match(app, /from '\.\/analytics-view\.mjs'/);
  assert.match(app, /state\.screen==='capa'/);
  assert.match(app, /state\.screen==='analytics'/);
  assert.match(app, /open-capa/);
  assert.match(app, /open-management-analytics/);
});

test('audit rendering loads and injects per-audit analytics', () => {
  assert.match(app, /auditAnalyticsBundle/);
  assert.match(app, /auditAnalyticsPanel/);
  assert.match(app, /analyticsHtml/);
});

test('CAPA save persists category, verification and lifecycle status', () => {
  assert.match(app, /root_cause_category/);
  assert.match(app, /verification_text/);
  assert.match(app, /finding_status/);
  assert.match(app, /setFindingStatus/);
});

test('CAPA register supports filters and CSV export', () => {
  assert.match(app, /capa-filter-form/);
  assert.match(app, /analytics-filter-form/);
  assert.match(app, /capa-export/);
  assert.match(app, /csvRowsForCAPA/);
});
