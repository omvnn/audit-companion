const CLAUSE_RE=/\b(?:[4-9]|10)(?:\.\d+){0,3}\b/;
const TICK_RE=/^(?:x|✓|✔|yes|true|1)$/i;
const TICK_TOKEN_RE=/(?:^|\s)(x|✓|✔|yes|true|1)(?=\s|$)/i;
const HEADER_KEYS={
  department:['department'],
  lab:['laboratory','lab'],
  auditDate:['audit date','date'],
  standard:['standard','criteria standard'],
  auditors:['auditors','auditor'],
  auditees:['auditees','auditee'],
  objective:['objective'],
  scope:['scope'],
  criteria:['criteria'],
  auditTitle:['audit title','activity','audit activity'],
  documentNumber:['document no','document number','doc no'],
  documentRevision:['revision','rev'],
};

const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const splitNames=s=>clean(s).split(/[;,]/).map(clean).filter(Boolean);
const normalizeDate=s=>{
  const v=clean(s);
  const iso=v.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if(iso)return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
  const dmy=v.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  if(dmy){const y=dmy[3].length===2?`20${dmy[3]}`:dmy[3];return `${y}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;}
  return v;
};
function metadataFromLines(lines){
  const out={department:'',lab:'',auditDate:'',standard:'',auditors:[],auditees:[],objective:'',scope:'',criteria:'',auditTitle:'',documentNumber:'',documentRevision:''};
  for(const raw of lines){
    const line=clean(raw);if(!line||line.includes('|'))continue;
    const idx=line.indexOf(':');if(idx<1)continue;
    const key=clean(line.slice(0,idx)).toLowerCase(),value=clean(line.slice(idx+1));
    for(const [field,aliases] of Object.entries(HEADER_KEYS)){
      if(aliases.some(a=>key===a||key.startsWith(`${a} `))){
        if(field==='auditors'||field==='auditees')out[field]=splitNames(value);
        else if(field==='auditDate')out[field]=normalizeDate(value);
        else out[field]=value;
        break;
      }
    }
  }
  return out;
}
function methodColumnsFromLines(lines){
  for(const raw of lines){
    const lower=String(raw).toLowerCase();
    if(!lower.includes('inspection item')||!lower.includes('clause'))continue;
    const documentReview=lower.indexOf('document review');
    const inquiry=lower.indexOf('inquiry');
    const onsiteInspection=lower.indexOf('on-site inspection')>=0?lower.indexOf('on-site inspection'):lower.indexOf('onsite inspection');
    if(documentReview>=0&&inquiry>documentReview&&onsiteInspection>inquiry)return {documentReview,inquiry,onsiteInspection};
  }
  return null;
}
function tickInWindow(source,start,end=source.length){
  const segment=source.slice(Math.max(0,start),Math.max(start,end));
  const match=segment.match(TICK_TOKEN_RE);
  if(!match)return null;
  const tokenOffset=match[0].lastIndexOf(match[1]);
  return {token:match[1],index:start+match.index+tokenOffset};
}
function parsePipeRow(raw,pageConfidence,pageNumber){
  const cells=raw.split('|').map(clean);
  if(cells.length<3)return null;
  const first=cells[0].match(/^\d+$/),clause=(cells[1]||'').match(CLAUSE_RE);
  if(!first||!clause)return null;
  const question=cells[2];if(!question||question.length<8)return {warning:`Page ${pageNumber} row ${cells[0]} has no readable inspection item`};
  const methodCells=cells.slice(3);
  const flags=methodCells.map(v=>TICK_RE.test(clean(v)));
  const textConfidence=Math.max(0,Math.min(1,Number(pageConfidence)||0));
  return {item:{
    position:Number(first[0]),sourcePage:pageNumber,sourceRow:cells[0],requirementReference:clause[0],inspectionItem:question,
    documentReview:Boolean(flags[0]),inquiry:Boolean(flags[1]),onsiteInspection:Boolean(flags[2]),otherMethod:'',expectedEvidence:'',processStage:'Other',
    textConfidence,clauseConfidence:textConfidence,methodConfidence:methodCells.length>=3?textConfidence:Math.min(textConfidence,0.74),
  }};
}
function parseAlignedRow(raw,pageConfidence,pageNumber,columns){
  if(!columns)return null;
  const source=String(raw??'');
  const m=source.match(/^\s*(\d+)\s+((?:[4-9]|10)(?:\.\d+){0,3})\s+/);
  if(!m)return null;
  const docTick=tickInWindow(source,columns.documentReview,columns.inquiry);
  const inquiryTick=tickInWindow(source,columns.inquiry,columns.onsiteInspection);
  const onsiteTick=tickInWindow(source,columns.onsiteInspection);
  const firstTick=[docTick,inquiryTick,onsiteTick].filter(Boolean).sort((a,b)=>a.index-b.index)[0];
  const fallbackEnd=Math.min(columns.documentReview,columns.inquiry,columns.onsiteInspection);
  const questionEnd=firstTick?.index??fallbackEnd;
  if(source.length<=Math.min(questionEnd,m[0].length))return null;
  const question=clean(source.slice(m[0].length,questionEnd));
  if(question.length<8)return {warning:`Page ${pageNumber} row ${m[1]} is ambiguous`};
  const conf=Math.max(0,Math.min(1,Number(pageConfidence)||0));
  return {item:{position:Number(m[1]),sourcePage:pageNumber,sourceRow:m[1],requirementReference:m[2],inspectionItem:question,documentReview:Boolean(docTick),inquiry:Boolean(inquiryTick),onsiteInspection:Boolean(onsiteTick),otherMethod:'',expectedEvidence:'',processStage:'Other',textConfidence:conf,clauseConfidence:conf,methodConfidence:conf}};
}
function parseLooseRow(raw,pageConfidence,pageNumber){
  const line=clean(raw);if(!line)return null;
  const m=line.match(/^(\d+)\s+((?:[4-9]|10)(?:\.\d+){0,3})\s+(.+)$/);
  if(!m)return null;
  const question=clean(m[3]);if(question.length<8)return {warning:`Page ${pageNumber} row ${m[1]} is ambiguous`};
  const conf=Math.min(Number(pageConfidence)||0,0.82);
  return {item:{position:Number(m[1]),sourcePage:pageNumber,sourceRow:m[1],requirementReference:m[2],inspectionItem:question,documentReview:false,inquiry:false,onsiteInspection:false,otherMethod:'',expectedEvidence:'',processStage:'Other',textConfidence:conf,clauseConfidence:conf,methodConfidence:0.70}};
}

export function parseAuditPlan(pages=[]){
  const warnings=[];const items=[];let metadata={department:'',lab:'',auditDate:'',standard:'',auditors:[],auditees:[],objective:'',scope:'',criteria:'',auditTitle:'',documentNumber:'',documentRevision:''};
  const sorted=[...pages].sort((a,b)=>(a.pageNumber||0)-(b.pageNumber||0));
  for(const page of sorted){
    const lines=String(page.text||'').split(/\r?\n/);
    const pageMeta=metadataFromLines(lines);
    const methodColumns=methodColumnsFromLines(lines);
    for(const [k,v] of Object.entries(pageMeta)){
      const empty=Array.isArray(metadata[k])?metadata[k].length===0:!metadata[k];
      const has=Array.isArray(v)?v.length>0:Boolean(v);
      if(empty&&has)metadata[k]=v;
    }
    let foundOnPage=0;
    for(const raw of lines){
      if(/inspection item/i.test(raw)&&/clause/i.test(raw))continue;
      const parsed=parsePipeRow(raw,page.confidence,page.pageNumber)||parseAlignedRow(raw,page.confidence,page.pageNumber,methodColumns)||parseLooseRow(raw,page.confidence,page.pageNumber);
      if(parsed?.item){items.push(parsed.item);foundOnPage++;}
      if(parsed?.warning)warnings.push(parsed.warning);
    }
    if(!foundOnPage&&lines.some(x=>CLAUSE_RE.test(x)))warnings.push(`Page ${page.pageNumber} contains requirement-like text but no reliable inspection rows`);
  }
  items.sort((a,b)=>a.position-b.position||a.sourcePage-b.sourcePage);
  const confidences=[...sorted.map(p=>Number(p.confidence)||0),...items.flatMap(i=>[i.textConfidence,i.clauseConfidence,i.methodConfidence])].filter(Number.isFinite);
  const avg=confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:0;
  const overallConfidence=Math.max(0,Math.min(1,avg-(warnings.length?0.08:0)));
  return {metadata,items,warnings,overallConfidence};
}
