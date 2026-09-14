import { SupabaseRest } from './api.mjs';
import { AuditService } from './service.mjs';
import { loginView, dashboardView, auditView } from './views.mjs';
import { capaView } from './capa-view.mjs';
import { managementAnalyticsView, auditAnalyticsPanel, canSeeManagementAnalytics } from './analytics-view.mjs';
import { importStartView, importProcessingView, importReviewView } from './import-view.mjs';
import { extractPages, supportedImportFile } from './import-engine.mjs';
import { parseAuditPlan } from './import-parser.mjs';
import { blockingImportIssues, confidenceBand } from './import-quality.mjs';
import { canInvokeAiFallback, requestAiFallback } from './import-ai.mjs';
import { csvRowsForCAPA } from './analytics.mjs';
import { csvCell, normalizeResult, inviteTokenFromUrl } from './core.mjs';

if(window.top!==window.self){document.body.textContent='Audit Companion cannot run inside an embedded frame.';throw new Error('Framed execution blocked');}
const SUPABASE_URL='https://zsfaozpbcprahqsggcmh.supabase.co';
const SUPABASE_KEY='sb_publishable_jtbw-3KITyRi3gfJS49QYA_O8uyogZ_';
const SESSION_KEY='audit-hub-session-v1';
const app=document.querySelector('#app');
const api=new SupabaseRest({url:SUPABASE_URL,key:SUPABASE_KEY});
const service=new AuditService(api);
const state={screen:'login',dashboard:null,audit:null,capa:null,analytics:null,importFlow:null,message:'',inviteLink:'',busy:false};

function safeStorage(){try{const k='__audit_probe__';sessionStorage.setItem(k,'1');sessionStorage.removeItem(k);return sessionStorage}catch{return null}}
const storage=safeStorage();
function saveSession(){if(!storage)return;if(api.accessToken)storage.setItem(SESSION_KEY,JSON.stringify({access_token:api.accessToken,refresh_token:api.refreshToken,user:api.user}));else storage.removeItem(SESSION_KEY)}
function loadSession(){if(!storage)return;try{const s=JSON.parse(storage.getItem(SESSION_KEY)||'null');if(s?.access_token)api.setSession(s)}catch{storage.removeItem(SESSION_KEY)}}
function inviteToken(){return inviteTokenFromUrl(location.href)}
function clearInviteUrl(){const u=new URL(location.href);u.searchParams.delete('invite');const h=new URLSearchParams(u.hash.replace(/^#/,'')||'');h.delete('invite');u.hash=h.toString()?`#${h.toString()}`:'';history.replaceState({},'',u.pathname+u.search+u.hash)}
function setBusy(on){state.busy=on;document.documentElement.toggleAttribute('data-busy',on)}
function qs(sel,root=document){return root.querySelector(sel)}
function cardFor(el){return el.closest('.question-card')}
function field(root,name){return qs(`[name="${name}"]`,root)?.value?.trim?.()||''}
function updateScopeCount(form){const count=form?.querySelectorAll('input[name="scope_clauses"]:checked').length||0;const out=form?.querySelector('[data-scope-count]');if(out)out.textContent=`${count} selected`;}
function filterScopeTree(form,query=''){const q=String(query||'').trim().toLowerCase();form?.querySelectorAll('.scope-node').forEach(node=>{const matches=!q||node.textContent.toLowerCase().includes(q);node.hidden=!matches;if(q&&matches&&node.matches('details'))node.open=true;});}
function setAllTopLevelScopes(form,checked){form?.querySelectorAll('.scope-tree > .scope-node > summary input[name="scope_clauses"]').forEach(input=>{input.checked=checked});if(!checked)form?.querySelectorAll('input[name="scope_clauses"]').forEach(input=>{input.checked=false});updateScopeCount(form);}
function selectedResult(card){return card.dataset.result||qs('.result-btn.selected',card)?.dataset.result||'unanswered'}
function download(name,text,type='text/plain;charset=utf-8'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function csvText(rows){return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')}
function filtersFrom(form,kind){const fd=new FormData(form);const out={};for(const [key,value] of fd.entries()){const v=String(value||'').trim();if(v)out[key]=v;}if(kind==='capa'&&fd.has('overdue'))out.overdue=true;return out;}
function safeName(name='plan'){return String(name||'plan').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'plan';}
function canonLab(value=''){return String(value).toLowerCase().replace(/laboratory/g,'lab').replace(/testing validation|tvl/g,'').replace(/[^a-z0-9]/g,'');}
function matchLabId(label,labs=[]){const q=canonLab(label);if(!q)return null;const exact=labs.find(l=>canonLab(l.name)===q);if(exact)return exact.id;const fuzzy=labs.find(l=>canonLab(l.name).includes(q)||q.includes(canonLab(l.name)));return fuzzy?.id||null;}
async function sha256File(file){if(!globalThis.crypto?.subtle)return '';const bytes=await file.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function splitNames(value){return String(value||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);}

function render(){
  if(state.screen==='dashboard'&&state.dashboard){app.innerHTML=dashboardView({...state.dashboard,message:state.message,inviteLink:state.inviteLink});return;}
  if(state.screen==='audit'&&state.audit){const bundle=state.audit.analyticsBundle||{summary:{},findings:[],capa:[]};const analyticsHtml=auditAnalyticsPanel({analytics:bundle.summary||{},findingRows:bundle.findings||[],capaRows:bundle.capa||[]});app.innerHTML=auditView({...state.audit,message:state.message,analyticsHtml});return;}
  if(state.screen==='capa'&&state.capa){app.innerHTML=capaView({...state.capa,message:state.message});return;}
  if(state.screen==='analytics'&&state.analytics){app.innerHTML=managementAnalyticsView({...state.analytics,message:state.message});return;}
  if(state.screen==='import-start'&&state.importFlow){app.innerHTML=importStartView({profile:state.importFlow.profile,message:state.message,settings:state.importFlow.settings});return;}
  if(state.screen==='import-processing'&&state.importFlow){app.innerHTML=importProcessingView({profile:state.importFlow.profile,fileName:state.importFlow.fileName||'Audit plan'});return;}
  if(state.screen==='import-review'&&state.importFlow?.bundle){app.innerHTML=importReviewView({profile:state.importFlow.profile,importRecord:state.importFlow.bundle.import,pages:state.importFlow.bundle.pages,items:state.importFlow.bundle.items,labs:state.importFlow.labs||[],blockingIssues:state.importFlow.blockingIssues||[],settings:state.importFlow.settings||{},message:state.message});return;}
  app.innerHTML=loginView({invite:inviteToken(),message:state.message});
}

async function goDashboard(message=''){state.message=message;state.inviteLink='';state.dashboard=await service.dashboard();state.screen='dashboard';state.audit=null;state.capa=null;state.analytics=null;state.importFlow=null;render();}
async function goAudit(id,message=''){state.message=message;const [auditData,analyticsBundle]=await Promise.all([service.loadAudit(id),service.auditAnalyticsBundle(id)]);state.audit={...auditData,analyticsBundle};state.screen='audit';state.capa=null;state.analytics=null;state.importFlow=null;render();window.scrollTo({top:0,behavior:'instant'});}
async function managementContext(){const [profile,labs]=await Promise.all([service.profile(),service.labs()]);if(!canSeeManagementAnalytics(profile))throw new Error('Admin or Lead Auditor access is required');return {profile,labs};}
async function goCapa(filters={},message=''){const [{profile,labs},rows]=await Promise.all([managementContext(),service.capaRegister(filters)]);state.message=message;state.capa={profile,labs,rows,filters};state.screen='capa';state.audit=null;state.analytics=null;state.importFlow=null;render();window.scrollTo({top:0,behavior:'instant'});}
async function goManagementAnalytics(filters={},message=''){const [{profile,labs},bundle]=await Promise.all([managementContext(),service.managementAnalytics(filters)]);state.message=message;state.analytics={profile,labs,filters,auditRows:bundle.audits,findingRows:bundle.findings,capaRows:bundle.capa};state.screen='analytics';state.audit=null;state.capa=null;state.importFlow=null;render();window.scrollTo({top:0,behavior:'instant'});}
async function goImportStart(message=''){
  const [profile,labs,settings]=await Promise.all([service.profile(),service.labs(),service.workspaceImportSettings()]);
  if(!['admin','lead_auditor'].includes(profile?.role))throw new Error('Admin or Lead Auditor access is required to import an audit plan');
  state.importFlow={profile,labs,settings,bundle:null,blockingIssues:[],fileName:''};state.message=message;state.screen='import-start';state.audit=null;state.capa=null;state.analytics=null;render();window.scrollTo({top:0,behavior:'instant'});
}
async function goImportReview(importId,message='',extraIssues=[]){
  const bundle=await service.loadImport(importId);
  const issues=[...blockingImportIssues({pages:bundle.pages,items:bundle.items}),...extraIssues];
  state.importFlow={...(state.importFlow||{}),bundle,blockingIssues:issues};state.message=message;state.screen='import-review';render();window.scrollTo({top:0,behavior:'instant'});
}
async function withUi(task){if(state.busy)return;setBusy(true);try{await task()}catch(e){state.message=e?.message||String(e);render()}finally{setBusy(false)}}

async function init(){loadSession();if(api.accessToken){try{await goDashboard();return}catch(e){if(api.refreshToken){try{await api.refresh();saveSession();await goDashboard();return}catch{api.clearSession();saveSession()}}else{api.clearSession();saveSession()}}}state.screen='login';render();}
async function handleAuth(form){const fd=new FormData(form),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||''),mode=form.dataset.mode;if(mode==='signup'){const token=String(fd.get('invite')||''),displayName=String(fd.get('display_name')||'').trim();await api.signUp(email,password,token,displayName);if(api.accessToken){saveSession();clearInviteUrl();await goDashboard('Account created. Welcome to the audit team.');}else{clearInviteUrl();state.screen='login';state.message='Account created. Confirm your email if Supabase requested it, then sign in.';render()}}else{await api.signIn(email,password);saveSession();await goDashboard()}}
async function saveCard(card){const itemId=card.dataset.itemId;const row=await service.saveResponse(itemId,{result:normalizeResult(selectedResult(card)),evidence_text:field(card,'evidence_text'),notes:field(card,'notes'),sample_references:field(card,'sample_references')});card.dataset.responseId=row?.id||card.dataset.responseId||'';return row;}
function csvForAudit(data){const header=['Position','ISO / requirement','Question','Result','Objective evidence','Notes','Sample references'];const rows=data.items.map(i=>{const r=data.responses.get(i.id)||{};return [i.position,i.requirement_reference,i.question,r.result||'unanswered',r.evidence_text||'',r.notes||'',r.sample_references||'']});return csvText([header,...rows]);}

function pageSavePayload(page,storagePath=''){
  return {page_number:page.pageNumber,storage_path:storagePath,quality_status:page.qualityStatus,quality_score:page.qualityStatus==='passed'?1:0,failure_reason:page.failureReason||'',ocr_text:page.text||'',ocr_confidence:page.confidence||0,parser_version:'v0.3.0'};
}
async function persistParsedImport(importId,pages,pageRows,settings,message=''){
  const parsed=parseAuditPlan(pages.map(p=>({pageNumber:p.pageNumber??p.page_number,text:p.text??p.ocr_text??'',confidence:p.confidence??p.ocr_confidence??0})));
  const pageMap=new Map((pageRows||[]).map(p=>[Number(p.page_number),p.id]));
  parsed.items=parsed.items.map(item=>({...item,pageId:pageMap.get(Number(item.sourcePage))||null}));
  const labs=state.importFlow?.labs||await service.labs();
  parsed.metadata.labId=matchLabId(parsed.metadata.lab,labs);
  const pageIssues=blockingImportIssues({pages,items:parsed.items});
  const ambiguity=[];
  const representativeQuality={passed:pages.every(p=>(p.qualityStatus??p.quality_status)==='passed')};
  if(parsed.items.length===0)ambiguity.push({code:'NO_INSPECTION_ITEMS'});
  if(parsed.warnings.length)ambiguity.push({code:'AMBIGUOUS_EXTRACTION',reason:parsed.warnings[0]});
  if(confidenceBand(parsed.overallConfidence)==='medium'){
    if(canInvokeAiFallback(settings,representativeQuality,parsed.overallConfidence)){
      try{await requestAiFallback({pageText:pages.map(p=>p.text??p.ocr_text??'').join('\n')});}
      catch(e){ambiguity.push({code:e.code||'AI_FALLBACK_FAILED',reason:e.message});message=e.message;}
    }else ambiguity.push({code:'AI_FALLBACK_DISABLED',reason:'Readable content remains ambiguous. Reupload a clearer plan or use Create manually.'});
  }
  if(confidenceBand(parsed.overallConfidence)==='low')ambiguity.push({code:'LOW_EXTRACTION_CONFIDENCE'});
  const allIssues=[...pageIssues,...ambiguity];
  await service.saveImportExtraction(importId,{metadata:parsed.metadata,items:parsed.items,overallConfidence:parsed.overallConfidence,status:allIssues.length?'quality_check':'review_ready',parser:'local-ocr-table-parser',parserVersion:'v0.3.0'});
  await goImportReview(importId,message,allIssues);
}
async function processNewImport(file){
  if(!supportedImportFile(file))throw new Error('Unsupported file. Upload a PDF, JPG or PNG.');
  state.importFlow.fileName=file.name;state.screen='import-processing';state.message='';render();
  const documentHash=await sha256File(file);
  const record=await service.createImport({original_filename:file.name,mime_type:file.type,page_count:0,document_hash:documentHash});
  if(!record?.id)throw new Error('Could not create import staging record');
  const sourcePath=await service.uploadImportSource(record.id,file);
  const pages=await extractPages(file);
  await service.updateImport(record.id,{page_count:pages.length,status:'quality_check'});
  const pageRows=[];
  for(const page of pages)pageRows.push(await service.saveImportPage(record.id,pageSavePayload(page,sourcePath)));
  const failed=pages.filter(p=>p.qualityStatus==='failed');
  if(failed.length){await goImportReview(record.id,`${failed.length} page${failed.length===1?'':'s'} need a clearer reupload.`);return;}
  await service.updateImport(record.id,{status:'extracting'});
  await persistParsedImport(record.id,pages,pageRows,state.importFlow.settings);
}
async function replaceImportPage(input,file){
  const importId=state.importFlow?.bundle?.import?.id;if(!importId)throw new Error('Import ID missing');
  if(!supportedImportFile(file))throw new Error('Upload a PDF, JPG or PNG replacement page.');
  const extracted=await extractPages(file);if(extracted.length!==1)throw new Error('Upload exactly one replacement page.');
  const pageNumber=Number(input.dataset.page);const previous=state.importFlow.bundle.pages.find(p=>Number(p.page_number)===pageNumber);
  const path=`imports/${api.user.id}/${importId}/page-${String(pageNumber).padStart(3,'0')}-${safeName(file.name)}`;
  const bytes=new Uint8Array(await file.arrayBuffer());await api.uploadImport(path,bytes,file.type||'application/octet-stream');
  const replacement={...extracted[0],pageNumber};
  await service.replaceImportPage(importId,{id:previous?.id,...pageSavePayload(replacement,path)});
  const bundle=await service.loadImport(importId);
  if(bundle.pages.some(p=>p.quality_status==='failed')){await goImportReview(importId,'Replacement saved. Another page still needs attention.');return;}
  await persistParsedImport(importId,bundle.pages,bundle.pages,state.importFlow.settings,'Replacement page passed quality checks.');
}

async function handleClick(btn){
  const action=btn.dataset.action;
  if(action==='logout'){api.clearSession();saveSession();state.screen='login';state.dashboard=null;state.audit=null;state.capa=null;state.analytics=null;state.importFlow=null;state.message='Signed out.';render();return;}
  if(action==='edit-name'){qs('#profile-name-dialog')?.showModal();return;}
  if(action==='new-audit'){await withUi(()=>goImportStart());return;}
  if(action==='open-manual-audit'){await withUi(async()=>{await goDashboard();const dialog=qs('#audit-dialog');dialog?.showModal();updateScopeCount(qs('#audit-form'));});return;}
  if(action==='import-back'){await withUi(()=>goDashboard());return;}
  if(action==='import-source'){await withUi(async()=>{const url=await service.importSourceUrl(btn.dataset.path);if(!url)throw new Error('Could not create source-document link');window.open(url,'_blank','noopener')});return;}
  if(action==='invite'){qs('#invite-dialog')?.showModal();return;}
  if(action==='change-role'){const row=btn.closest('.team-role-row'),userId=row?.dataset.userId,role=qs('[data-field="app-role"]',row)?.value;if(!userId||!role)throw new Error('Choose a valid teammate and role');await withUi(async()=>{await service.updateProfileRole(userId,role);await goDashboard('Team role updated.');});return;}
  if(action==='scope-select-all'){const form=btn.closest('form');setAllTopLevelScopes(form,true);return;}
  if(action==='scope-clear'){const form=btn.closest('form');setAllTopLevelScopes(form,false);filterScopeTree(form,qs('[data-scope-search]',form)?.value||'');return;}
  if(action==='close-dialog'){btn.closest('dialog')?.close();return;}
  if(action==='copy-invite'){await navigator.clipboard?.writeText(btn.dataset.value||'');state.message='Invite link copied.';render();return;}
  if(action==='open-audit'){await withUi(()=>goAudit(btn.dataset.id));return;}
  if(action==='open-capa'){await withUi(()=>goCapa(state.capa?.filters||{}));return;}
  if(action==='open-management-analytics'){await withUi(()=>goManagementAnalytics(state.analytics?.filters||{}));return;}
  if(action==='open-capa-source'){const auditId=btn.dataset.auditId;if(!auditId)throw new Error('Audit ID missing');await withUi(()=>goAudit(auditId));return;}
  if(action==='capa-reset'){await withUi(()=>goCapa({}));return;}
  if(action==='analytics-reset'){await withUi(()=>goManagementAnalytics({}));return;}
  if(action==='capa-export'&&state.capa){download(`capa-register-${new Date().toISOString().slice(0,10)}.csv`,csvText(csvRowsForCAPA(state.capa.rows)),'text/csv;charset=utf-8');return;}
  if(action==='capa-filter'||action==='analytics-filter')return;
  if(action==='delete-audit'){const dialog=qs('#delete-audit-dialog');if(!dialog)return;dialog.dataset.auditId=btn.dataset.id||'';const title=qs('[data-delete-title]',dialog);if(title)title.textContent=btn.dataset.title||'this audit';dialog.showModal();return;}
  if(action==='confirm-delete-audit'){const dialog=btn.closest('dialog'),id=dialog?.dataset.auditId;if(!id)throw new Error('Audit ID missing');await withUi(async()=>{await service.deleteAudit(id);dialog.close();await goDashboard('Audit deleted.');});return;}
  if(action==='back'){await withUi(()=>goDashboard());return;}
  if(action==='print'){window.print();return;}
  if(action==='export-csv'&&state.audit){download(`audit-${state.audit.audit.audit_date||'report'}.csv`,csvForAudit(state.audit),'text/csv;charset=utf-8');return;}
  if(action==='open-evidence'){await withUi(async()=>{const url=await service.evidenceUrl(btn.dataset.path);if(!url)throw new Error('Could not create evidence link');window.open(url,'_blank','noopener')});return;}
  if(action==='assign-member'&&state.audit){await withUi(async()=>{const panel=btn.closest('.team-panel');const userId=qs('[data-field="member-user"]',panel)?.value,role=qs('[data-field="member-role"]',panel)?.value;if(!userId)throw new Error('Choose a team member first');await service.assignMember(state.audit.audit.id,userId,role);await goAudit(state.audit.audit.id,'Audit access updated.');});return;}
  if(action==='save-response'){await withUi(async()=>{const card=cardFor(btn);await saveCard(card);await goAudit(state.audit.audit.id,'Checklist item saved.');});return;}
  if(action==='promote-finding'){await withUi(async()=>{const card=cardFor(btn),item=state.audit.items.find(x=>x.id===card.dataset.itemId);const result=normalizeResult(selectedResult(card));if(!['observation','ofi','minor_nc','major_nc'].includes(result))throw new Error('Choose Observation, OFI, Minor NC or Major NC first');const response=await saveCard(card);const evidence=field(card,'evidence_text');await service.createFinding({audit_id:state.audit.audit.id,response_id:response?.id||card.dataset.responseId||null,checklist_item_id:item.id,classification:result,requirement_reference:item.requirement_reference,requirement_text:item.requirement_text,evidence,statement:evidence||`Finding recorded against ${item.requirement_reference}.`});await goAudit(state.audit.audit.id,'Finding created.');});return;}
  if(action==='save-capa'){await withUi(async()=>{const card=btn.closest('.finding-card'),findingId=card.dataset.findingId;const owner=field(card,'owner_name'),due=field(card,'due_date')||null,status=field(card,'finding_status')||'open';await service.saveFinding(findingId,{owner_name:owner,due_date:due});await service.saveCAPA(findingId,{root_cause:field(card,'root_cause'),root_cause_category:field(card,'root_cause_category')||null,action_text:field(card,'action_text'),owner_name:owner,due_date:due,verification_text:field(card,'verification_text')});await service.setFindingStatus(findingId,status);await goAudit(state.audit.audit.id,'CAPA saved.');});return;}
}

document.addEventListener('click',e=>{const resultBtn=e.target.closest('.result-btn');if(resultBtn&&!resultBtn.disabled){const card=cardFor(resultBtn);card.dataset.result=resultBtn.dataset.result;card.querySelectorAll('.result-btn').forEach(b=>b.classList.toggle('selected',b===resultBtn));return}const btn=e.target.closest('[data-action]');if(btn&&btn.tagName!=='INPUT')handleClick(btn);});
document.addEventListener('change',e=>{const input=e.target;if(input.matches('input[name="scope_clauses"]')){updateScopeCount(input.closest('form'));return}if(input.matches('input[data-action="toggle-ai-fallback"]')){withUi(async()=>{await service.updateAiFallback(input.checked);state.importFlow.settings=await service.workspaceImportSettings();state.message=input.checked?'AI fallback enabled by Admin. Provider processing remains fail-closed until configured.':'AI fallback disabled.';render();});return}if(input.matches('input[type="file"][data-action="import-plan-file"]')&&input.files?.[0]){withUi(()=>processNewImport(input.files[0]));return}if(input.matches('input[type="file"][data-action="replace-import-page"]')&&input.files?.[0]){withUi(()=>replaceImportPage(input,input.files[0]));return}if(input.matches('input[type="file"][data-action="upload-response"]')&&input.files?.[0])withUi(async()=>{const card=cardFor(input);let responseId=card.dataset.responseId;if(!responseId){const row=await saveCard(card);responseId=row?.id}if(!responseId)throw new Error('Save the checklist response before attaching evidence');await service.attachEvidence({auditId:state.audit.audit.id,kind:'response',recordId:responseId,file:input.files[0]});await goAudit(state.audit.audit.id,'Evidence attached.');});});
document.addEventListener('input',e=>{const input=e.target;if(input.matches('[data-scope-search]'))filterScopeTree(input.closest('form'),input.value);});
document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();if(form.id==='auth-form'){withUi(()=>handleAuth(form));return}if(form.id==='profile-name-form'){withUi(async()=>{await service.updateDisplayName(field(form,'display_name'));form.closest('dialog')?.close();if(state.screen==='audit'&&state.audit?.audit?.id)await goAudit(state.audit.audit.id,'Display name updated.');else await goDashboard('Display name updated.');});return}if(form.id==='audit-form'){withUi(async()=>{const fd=new FormData(form);const input=Object.fromEntries(fd.entries());input.scope_clauses=fd.getAll('scope_clauses').map(String);const audit=await service.createAudit(input);form.closest('dialog')?.close();await goAudit(audit.id,input.scope_clauses.length?'Audit created with a checklist matched to the selected ISO scope.':'Audit created with the default Material Lab starter checklist.');});return}if(form.id==='import-review-form'){withUi(async()=>{const bundle=state.importFlow?.bundle;if(!bundle)throw new Error('Import review data missing');const fd=new FormData(form);const metadata={...bundle.import,auditTitle:String(fd.get('audit_title')||''),auditDate:String(fd.get('audit_date')||''),labId:String(fd.get('lab_id')||''),standard:String(fd.get('standard_text')||''),scope:String(fd.get('scope')||''),auditors:splitNames(fd.get('auditors')),auditees:splitNames(fd.get('auditees'))};const items=bundle.items.map((item,index)=>({...item,pageId:item.page_id,sourceRow:item.source_row,requirementReference:String(fd.get(`item_${index}_requirement_reference`)||''),inspectionItem:String(fd.get(`item_${index}_inspection_item`)||''),documentReview:fd.has(`item_${index}_document_review`),inquiry:fd.has(`item_${index}_inquiry`),onsiteInspection:fd.has(`item_${index}_onsite_inspection`),textConfidence:item.text_confidence,clauseConfidence:item.clause_confidence,methodConfidence:item.method_confidence,blockingError:''}));await service.saveImportExtraction(bundle.import.id,{metadata,items,overallConfidence:bundle.import.overall_confidence,status:'review_ready',parser:bundle.import.parser,parserVersion:bundle.import.parser_version,aiUsed:bundle.import.ai_used,aiProvider:bundle.import.ai_provider,aiModel:bundle.import.ai_model,manualCorrections:[{confirmed_at:new Date().toISOString()}]});const auditId=await service.promoteImport(bundle.import.id);if(!auditId)throw new Error('Audit promotion returned no ID');await goAudit(auditId,'Audit created from the approved imported plan.');});return}if(form.id==='invite-form'){withUi(async()=>{const fd=new FormData(form);const inv=await service.createInvite(String(fd.get('role')||'auditor'),Number(fd.get('days')||7),location.origin+'/');form.closest('dialog')?.close();await goDashboard();state.inviteLink=inv.link;state.message='One-time invite link generated.';render();});return}if(form.id==='capa-filter-form'){withUi(()=>goCapa(filtersFrom(form,'capa')));return}if(form.id==='analytics-filter-form'){withUi(()=>goManagementAnalytics(filtersFrom(form,'analytics')));return}});

init();