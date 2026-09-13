import { groupRepeatSignals, safeRate, rootCauseLabel } from './analytics.mjs';
import { shell, esc } from './views.mjs';

export function canSeeManagementAnalytics(profile){return profile?.role==='admin'||profile?.role==='lead_auditor';}
const fmt=v=>v===null||v===undefined||Number.isNaN(v)?'—':String(v);
const pct=v=>v===null||v===undefined||Number.isNaN(v)?'—':`${v}%`;
const selected=(a,b)=>String(a??'')===String(b??'')?'selected':'';

function counts(rows,key,labeler=v=>v||'Uncategorized'){
  const map=new Map();
  for(const row of rows||[]){const raw=typeof key==='function'?key(row):row?.[key];const k=labeler(raw);map.set(k,(map.get(k)||0)+1);}
  return [...map.entries()].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label));
}
function mean(values){const nums=(values||[]).map(Number).filter(Number.isFinite);return nums.length?Math.round((nums.reduce((a,b)=>a+b,0)/nums.length)*10)/10:null;}
function kpi(label,value,tone=''){return `<div class="analytics-kpi ${tone}"><strong>${esc(fmt(value))}</strong><span>${esc(label)}</span></div>`;}
function barList(title,items,empty='No data in this period'){
  const max=Math.max(1,...items.map(x=>Number(x.value)||0));
  const rows=items.length?items.map(x=>`<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><b>${esc(fmt(x.value))}</b></div><div class="bar-track"><span style="width:${Math.max(2,Math.round((Number(x.value)||0)/max*100))}%"></span></div></div>`).join(''):`<div class="mini-empty">${esc(empty)}</div>`;
  return `<section class="analytics-card"><div class="section-head"><div><div class="eyebrow">BREAKDOWN</div><h3>${esc(title)}</h3></div></div>${rows}</section>`;
}
function monthLabel(value){const s=String(value||'');return s.length>=7?s.slice(0,7):s||'Unknown';}
function classificationLabel(v){return ({observation:'Observation',ofi:'OFI',minor_nc:'Minor NC',major_nc:'Major NC'}[v]||v||'Unclassified');}
function statusLabel(v){return ({open:'Open',action_pending:'Action pending',verification:'Verification',closed:'Closed'}[v]||v||'Unknown');}

export function managementAnalyticsView({profile,auditRows=[],findingRows=[],capaRows=[],filters={},labs=[],message=''}={}){
  if(!canSeeManagementAnalytics(profile))return shell(`<main class="page"><div class="empty"><b>Management analytics is restricted</b><p>Admin or Lead Auditor access is required.</p></div></main>`,{profile,title:'Analytics'});
  const answered=auditRows.reduce((s,r)=>s+Number(r.answered_count||0),0);
  const conform=auditRows.reduce((s,r)=>s+Number(r.conform_count||0),0);
  const nc=auditRows.reduce((s,r)=>s+Number(r.minor_nc_count||0)+Number(r.major_nc_count||0),0);
  const openCapa=capaRows.filter(r=>r.status!=='closed').length;
  const overdue=capaRows.filter(r=>r.overdue).length;
  const avgClosure=mean(capaRows.filter(r=>r.status==='closed').map(r=>r.closure_days));
  const monthAudits=counts(auditRows,r=>monthLabel(r.audit_date));
  const classifications=counts(findingRows,'classification',classificationLabel);
  const labsBreakdown=counts(findingRows,'lab_name',v=>v||'Unknown lab');
  const clauses=counts(findingRows,'requirement_reference',v=>v||'No clause').slice(0,8);
  const stages=counts(findingRows,'process_stage',v=>v||'Unspecified').slice(0,8);
  const roots=counts(capaRows,'root_cause_category',rootCauseLabel);
  const capaStatus=counts(capaRows,'status',statusLabel);
  const aging=counts(capaRows,'aging_bucket',v=>v?`${v} days`:'Uncategorized');
  const owners=counts(capaRows,'owner_name',v=>v||'Unassigned').slice(0,8);
  const repeats=groupRepeatSignals(findingRows);
  const repeatRows=repeats.length?repeats.map(r=>`<tr><td>${esc(r.lab_name)}</td><td>${esc(r.requirement_reference)}</td><td>${esc(r.process_stage||'—')}</td><td>${r.occurrence_count}</td><td>${esc(r.first_occurrence||'—')}</td><td>${esc(r.latest_occurrence||'—')}</td></tr>`).join(''):`<tr><td colspan="6"><div class="mini-empty">No repeat pattern detected in the selected period.</div></td></tr>`;
  const labOptions=labs.map(l=>`<option value="${esc(l.id)}" ${selected(filters.labId,l.id)}>${esc(l.name)}</option>`).join('');
  return shell(`<main class="page analytics-page">
    <div class="audit-toolbar"><button class="ghost sm" data-action="back">← Dashboard</button><div class="toolbar-actions"><button class="ghost sm" data-action="open-capa">CAPA Register</button></div></div>
    <section class="analytics-hero"><div><div class="eyebrow">MANAGEMENT VIEW</div><h1>Management Analytics</h1><p>Trends across audits you are permitted to read. Every metric comes from the operational audit records.</p></div></section>
    ${message?`<div class="notice">${esc(message)}</div>`:''}
    <form class="analytics-filters" id="analytics-filter-form"><label>Lab<select name="labId"><option value="">All labs</option>${labOptions}</select></label><label>From<input name="from" type="date" value="${esc(filters.from||'')}"></label><label>To<input name="to" type="date" value="${esc(filters.to||'')}"></label><label>Audit status<select name="auditStatus"><option value="">All statuses</option>${['draft','active','review','closed'].map(v=>`<option value="${v}" ${selected(filters.auditStatus,v)}>${v}</option>`).join('')}</select></label><div class="filter-actions"><button class="primary sm" type="submit" data-action="analytics-filter">Apply</button><button class="ghost sm" type="button" data-action="analytics-reset">Reset</button></div></form>
    <section class="analytics-kpis">${kpi('Audits in period',auditRows.length)}${kpi('Conformity rate',pct(safeRate(conform,answered)))}${kpi('NC rate',pct(safeRate(nc,answered)),nc?'danger':'')}${kpi('Open CAPA',openCapa)}${kpi('Overdue CAPA',overdue,overdue?'danger':'')}${kpi('Average closure days',avgClosure)}</section>
    <div class="analytics-grid">${barList('Audits by month',monthAudits)}${barList('Finding classification',classifications)}${barList('Findings by lab',labsBreakdown)}${barList('ISO clause hotspots',clauses)}${barList('Process-stage hotspots',stages)}${barList('Root-cause categories',roots)}${barList('CAPA status',capaStatus)}${barList('CAPA aging',aging)}${barList('CAPA owner workload',owners)}</div>
    <section class="analytics-card wide"><div class="section-head"><div><div class="eyebrow">RECURRENCE</div><h3>Recurring finding signals</h3></div></div><p class="muted">Deterministic signal: same lab, related ISO clause and same process stage across at least two audits. This is not proof that a previous CAPA was ineffective.</p><div class="table-scroll"><table><thead><tr><th>Lab</th><th>Clause</th><th>Process stage</th><th>Occurrences</th><th>First</th><th>Latest</th></tr></thead><tbody>${repeatRows}</tbody></table></div></section>
  </main>`,{profile,title:'Management Analytics'});
}

export function auditAnalyticsPanel({analytics={},findingRows=[],capaRows=[]}={}){
  const clauseCounts=counts(findingRows,'requirement_reference',v=>v||'No clause').slice(0,6);
  const stageCounts=counts(findingRows,'process_stage',v=>v||'Unspecified').slice(0,6);
  const capaStatus=counts(capaRows,'status',statusLabel);
  const aging=counts(capaRows,'aging_bucket',v=>v?`${v} days`:'Uncategorized');
  const resultItems=[
    {label:'Conform',value:Number(analytics.conform_count||0)},
    {label:'Observation',value:Number(analytics.observation_count||0)},
    {label:'OFI',value:Number(analytics.ofi_count||0)},
    {label:'Minor NC',value:Number(analytics.minor_nc_count||0)},
    {label:'Major NC',value:Number(analytics.major_nc_count||0)},
  ];
  return `<section class="audit-analytics"><div class="section-head"><div><div class="eyebrow">ANALYTICS</div><h2>Audit analytics</h2></div></div><section class="analytics-kpis">${kpi('Completion',pct(analytics.completion_percent))}${kpi('Conformity rate',pct(analytics.conformity_rate))}${kpi('NC rate',pct(analytics.nc_rate))}${kpi('Evidence coverage',pct(analytics.evidence_coverage_percent))}${kpi('Overdue CAPA',analytics.overdue_capa??'—',Number(analytics.overdue_capa)>0?'danger':'')}</section><div class="analytics-grid compact">${barList('Result distribution',resultItems)}${barList('Findings by ISO clause',clauseCounts)}${barList('Findings by process stage',stageCounts)}${barList('CAPA status',capaStatus)}${barList('CAPA aging',aging)}</div></section>`;
}
