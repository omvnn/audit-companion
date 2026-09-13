const ROOT_CAUSE_LABELS = {
  people_competency: 'People / Competency',
  procedure_documentation: 'Procedure / Documentation',
  equipment_calibration: 'Equipment / Calibration',
  process_method: 'Process / Method',
  material_sample: 'Material / Sample',
  data_system: 'Data / System',
  environment: 'Environment',
  supplier_external: 'Supplier / External',
  other: 'Other',
};

export function safeRate(numerator, denominator) {
  const d = Number(denominator);
  if (!(d > 0)) return null;
  return Math.round((Number(numerator || 0) / d) * 1000) / 10;
}

export function agingBucket(daysOpen) {
  const n = Math.max(0, Number(daysOpen) || 0);
  if (n <= 30) return '0-30';
  if (n <= 60) return '31-60';
  if (n <= 90) return '61-90';
  return '>90';
}

export function isOverdue(row, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(row?.due_date && row.status !== 'closed' && String(row.due_date).slice(0, 10) < today);
}

function rootCauseLabel(value) {
  return ROOT_CAUSE_LABELS[value] || (value ? String(value).replaceAll('_', ' ') : 'Uncategorized');
}

function mean(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function summarizeCAPA(rows = []) {
  const data = Array.isArray(rows) ? rows : [];
  const total = data.length;
  if (!total) return 'No CAPAs are visible for the selected filters.';

  const open = data.filter((row) => row.status !== 'closed').length;
  const overdue = data.filter((row) => Boolean(row.overdue)).length;
  const verification = data.filter((row) => row.status === 'verification').length;
  const closed = data.filter((row) => row.status === 'closed').length;
  const closureAverage = mean(data.filter((row) => row.status === 'closed').map((row) => row.closure_days));

  const categories = new Map();
  for (const row of data) {
    const key = row.root_cause_category;
    if (!key) continue;
    categories.set(key, (categories.get(key) || 0) + 1);
  }
  const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;

  const parts = [`${total} CAPA${total === 1 ? '' : 's'} are visible`];
  parts.push(`${open} remain open`);
  if (overdue) parts.push(`${overdue} overdue`);
  if (verification) parts.push(`${verification} awaiting verification`);
  if (closed) parts.push(`${closed} closed`);
  if (closureAverage !== null) parts.push(`average closure time is ${closureAverage} days`);
  if (topCategory) parts.push(`${rootCauseLabel(topCategory)} is the most frequent root-cause category`);
  return `${parts.join('. ')}.`;
}

function clauseParts(value) {
  return String(value || '').split('/').map((part) => part.trim()).filter(Boolean);
}

function clausesRelated(a, b) {
  const left = clauseParts(a);
  const right = clauseParts(b);
  return left.some((x) => right.some((y) => x === y || x.startsWith(`${y}.`) || y.startsWith(`${x}.`)));
}

function stageKey(value) {
  return String(value || '').trim().toLowerCase();
}

export function groupRepeatSignals(rows = []) {
  const source = Array.isArray(rows) ? rows : [];
  const groups = [];
  for (const row of source) {
    if (!row?.audit_id || !row?.lab_id || !row?.requirement_reference) continue;
    const stage = stageKey(row.process_stage);
    let group = groups.find((candidate) =>
      candidate.lab_id === row.lab_id &&
      candidate.stage === stage &&
      clausesRelated(candidate.requirement_reference, row.requirement_reference)
    );
    if (!group) {
      group = {
        lab_id: row.lab_id,
        lab_name: row.lab_name || 'Lab',
        requirement_reference: row.requirement_reference,
        process_stage: row.process_stage || '',
        stage,
        audit_ids: new Set(),
        rows: [],
      };
      groups.push(group);
    }
    group.audit_ids.add(row.audit_id);
    group.rows.push(row);
  }

  return groups
    .filter((group) => group.audit_ids.size >= 2)
    .map((group) => {
      const dates = group.rows.map((row) => row.audit_date).filter(Boolean).sort();
      return {
        lab_id: group.lab_id,
        lab_name: group.lab_name,
        requirement_reference: group.requirement_reference,
        process_stage: group.process_stage,
        occurrence_count: group.rows.length,
        audit_count: group.audit_ids.size,
        first_occurrence: dates[0] || null,
        latest_occurrence: dates.at(-1) || null,
        classifications: [...new Set(group.rows.map((row) => row.classification).filter(Boolean))],
      };
    })
    .sort((a, b) => b.occurrence_count - a.occurrence_count || String(b.latest_occurrence || '').localeCompare(String(a.latest_occurrence || '')));
}

export function auditMetrics({ responses = [], findings = [], actions = [], evidence = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const answered = responses.filter((row) => row?.result && row.result !== 'unanswered');
  const conform = answered.filter((row) => row.result === 'conform').length;
  const minor = answered.filter((row) => row.result === 'minor_nc').length;
  const major = answered.filter((row) => row.result === 'major_nc').length;
  const evidenceResponses = new Set(evidence.map((row) => row?.response_id).filter(Boolean));
  const covered = answered.filter((row) => String(row.evidence_text || '').trim() || evidenceResponses.has(row.id)).length;

  const actionByFinding = new Map(actions.map((action) => [action.finding_id, action]));
  const capaRows = findings.map((finding) => {
    const action = actionByFinding.get(finding.id) || {};
    return {
      ...finding,
      due_date: action.due_date || finding.due_date || null,
      root_cause_category: action.root_cause_category || null,
      status: finding.status || 'open',
    };
  });
  const closed = capaRows.filter((row) => row.status === 'closed');
  const open = capaRows.filter((row) => row.status === 'open').length;
  const actionPending = capaRows.filter((row) => row.status === 'action_pending').length;
  const verification = capaRows.filter((row) => row.status === 'verification').length;
  const overdue = capaRows.filter((row) => isOverdue(row, today)).length;

  return {
    total_items: responses.length,
    answered_items: answered.length,
    completion_percent: safeRate(answered.length, responses.length),
    conform_count: conform,
    observation_count: answered.filter((row) => row.result === 'observation').length,
    ofi_count: answered.filter((row) => row.result === 'ofi').length,
    minor_nc_count: minor,
    major_nc_count: major,
    conformity_rate: safeRate(conform, answered.length),
    nc_rate: safeRate(minor + major, answered.length),
    evidence_coverage_percent: safeRate(covered, answered.length),
    total_findings: findings.length,
    open_capa: open,
    action_pending_capa: actionPending,
    verification_capa: verification,
    closed_capa: closed.length,
    overdue_capa: overdue,
    capa_closure_rate: safeRate(closed.length, capaRows.length),
  };
}

export function csvRowsForCAPA(rows = []) {
  const header = ['Audit','Lab','Clause','Classification','Root cause category','Root cause','Corrective action','Owner','Due date','Status','Days open','Overdue','Verification'];
  return [header, ...rows.map((row) => [
    row.audit_title || '', row.lab_name || '', row.requirement_reference || '', row.classification || '',
    rootCauseLabel(row.root_cause_category), row.root_cause || '', row.action_text || '', row.owner_name || '',
    row.due_date || '', row.status || '', row.days_open ?? '', row.overdue ? 'Yes' : 'No', row.verification_text || '',
  ])];
}

export { ROOT_CAUSE_LABELS, rootCauseLabel, clausesRelated };
