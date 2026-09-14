import { summarizeCAPA, rootCauseLabel } from './analytics.mjs';
import { shell, esc } from './views.mjs';

const statusLabel = (value) => ({open:'Open',action_pending:'Action pending',verification:'Verification',closed:'Closed'}[value] || value || 'Open');
const classificationLabel = (value) => ({observation:'Observation',ofi:'OFI',minor_nc:'Minor NC',major_nc:'Major NC'}[value] || value || 'Finding');
const selected=(a,b)=>String(a??'')===String(b??'')?'selected':'';
const checked=v=>v?'checked':'';

function metric(label,value,tone=''){
  return `<div class="analytics-kpi ${tone}"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

export function capaView({profile,rows=[],filters={},labs=[],message=''}={}){
  const total=rows.length;
  const open=rows.filter(r=>r.status!=='closed').length;
  const overdue=rows.filter(r=>r.overdue).length;
  const verification=rows.filter(r=>r.status==='verification').length;
  const closed=rows.filter(r=>r.status==='closed').length;
  const summary=summarizeCAPA(rows);
  const labOptions=labs.map(l=>`<option value="${esc(l.id)}" ${selected(filters.labId,l.id)}>${esc(l.name)}</option>`).join('');
  const body=rows.length?rows.map(row=>`<tr class="capa-row ${row.overdue?'is-overdue':''}">
    <td><button class="link-button" data-action="open-capa-source" data-audit-id="${esc(row.audit_id)}" data-finding-id="${esc(row.finding_id)}">${esc(row.audit_title||'Audit')}</button><small>${esc(row.requirement_reference||'')}</small></td>
    <td>${esc(row.lab_name||'')}</td>
    <td><span class="finding-class">${esc(classificationLabel(row.classification))}</span></td>
    <td>${esc(rootCauseLabel(row.root_cause_category))}</td>
    <td class="capa-action-cell"><span>${esc(row.action_text||'—')}</span><details><summary>Details</summary><p><b>Finding:</b> ${esc(row.finding_statement||'—')}</p><p><b>Root cause:</b> ${esc(row.root_cause||'—')}</p><p><b>Corrective action:</b> ${esc(row.action_text||'—')}</p><p><b>Verification:</b> ${esc(row.verification_text||'—')}</p></details></td>
    <td>${esc(row.owner_name||'—')}</td>
    <td>${esc(row.due_date||'—')}${row.overdue?'<span class="overdue-label">Overdue</span>':''}</td>
    <td><span class="status ${esc(row.status||'open')}">${esc(statusLabel(row.status))}</span></td>
    <td>${esc(row.days_open??'—')}</td>
    <td>${esc(row.verification_text||'—')}</td>
  </tr>`).join(''):`<tr><td colspan="10"><div class="empty"><b>No CAPAs match the selected filters</b><p>Adjust the filters or create findings with corrective actions from an audit.</p></div></td></tr>`;

  return shell(`<main class="page analytics-page">
    <div class="audit-toolbar"><button class="ghost sm" data-action="back">← Dashboard</button><div class="toolbar-actions"><button class="ghost sm" data-action="capa-export">Export CSV</button><button class="ghost sm" data-action="open-management-analytics">Analytics</button></div></div>
    <section class="analytics-hero"><div><div class="eyebrow">FOLLOW-UP CONTROL</div><h1>CAPA Register</h1><p>One consolidated view of corrective actions across the audits you are permitted to read.</p></div></section>
    ${message?`<div class="notice">${esc(message)}</div>`:''}
    <section class="analytics-kpis">${metric('Total CAPA',total)}${metric('Open',open)}${metric('Overdue',overdue,overdue?'danger':'')}${metric('Awaiting verification',verification)}${metric('Closed',closed)}</section>
    <section class="management-summary"><div class="eyebrow">DETERMINISTIC SUMMARY</div><p>${esc(summary)}</p></section>
    <form class="analytics-filters" id="capa-filter-form">
      <label>Search<input name="search" type="search" value="${esc(filters.search||'')}" placeholder="Audit, clause, owner or finding"></label>
      <label>Lab<select name="labId"><option value="">All labs</option>${labOptions}</select></label>
      <label>Status<select name="status"><option value="">All statuses</option>${['open','action_pending','verification','closed'].map(v=>`<option value="${v}" ${selected(filters.status,v)}>${statusLabel(v)}</option>`).join('')}</select></label>
      <label>Classification<select name="classification"><option value="">All findings</option>${['observation','ofi','minor_nc','major_nc'].map(v=>`<option value="${v}" ${selected(filters.classification,v)}>${classificationLabel(v)}</option>`).join('')}</select></label>
      <label>Owner<input name="owner" value="${esc(filters.owner||'')}"></label>
      <label>Aging<select name="agingBucket"><option value="">All ages</option>${['0-30','31-60','61-90','>90'].map(v=>`<option value="${esc(v)}" ${selected(filters.agingBucket,v)}>${esc(v)} days</option>`).join('')}</select></label>
      <label>From<input name="from" type="date" value="${esc(filters.from||'')}"></label>
      <label>To<input name="to" type="date" value="${esc(filters.to||'')}"></label>
      <label class="check-filter"><input name="overdue" type="checkbox" ${checked(filters.overdue)}> Overdue only</label>
      <div class="filter-actions"><button class="primary sm" type="submit" data-action="capa-filter">Apply filters</button><button class="ghost sm" type="button" data-action="capa-reset">Reset</button></div>
    </form>
    <section class="table-card"><div class="table-scroll"><table class="capa-table"><thead><tr><th>Audit / clause</th><th>Lab</th><th>Classification</th><th>Root-cause category</th><th>Corrective action</th><th>Owner</th><th>Due date</th><th>Status</th><th>Days open</th><th>Verification</th></tr></thead><tbody>${body}</tbody></table></div></section>
  </main>`,{profile,title:'CAPA Register'});
}
