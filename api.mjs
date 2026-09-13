import { inviteSignupPayload } from './core.mjs';

export class SupabaseRest {
  constructor({url,key,fetchImpl=globalThis.fetch,sleepImpl=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
    this.url=url.replace(/\/$/,'');
    this.key=key;
    this.fetch=fetchImpl.bind(globalThis);
    this.sleep=sleepImpl;
    this.accessToken='';
    this.refreshToken='';
    this.user=null;
  }
  setSession(session={}){this.accessToken=session.access_token||'';this.refreshToken=session.refresh_token||'';this.user=session.user||null;}
  clearSession(){this.setSession({})}
  async request(path,{method='GET',body,headers={},auth=true,prefer,raw=false}={}){
    const h={apikey:this.key,...headers};if(auth&&this.accessToken)h.Authorization=`Bearer ${this.accessToken}`;if(prefer)h.Prefer=prefer;
    if(body!==undefined && !(body instanceof Uint8Array) && !(typeof Blob!=='undefined' && body instanceof Blob) && !h['Content-Type']) h['Content-Type']='application/json';
    const delays=[2000,5000,10000];
    for(let attempt=0;;attempt++){
      const res=await this.fetch(`${this.url}${path}`,{method,headers:h,body:body===undefined?undefined:(h['Content-Type']==='application/json'?JSON.stringify(body):body)});
      if(raw){if(!res.ok)throw await this.errorFrom(res);return res;}
      const text=await res.text();let data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
      if(res.ok)return data;
      const msg=(data&&typeof data==='object'&&(data.message||data.msg||data.error_description||data.error))||`Request failed (${res.status})`;
      const futureJwt=auth&&this.accessToken&&res.status===401&&((data&&typeof data==='object'&&data.code==='PGRST303')||String(msg).toLowerCase().includes('jwt issued at future'));
      if(futureJwt&&attempt<delays.length){await this.sleep(delays[attempt]);continue;}throw new Error(String(msg));
    }
  }
  async errorFrom(res){let data=null;try{data=await res.json()}catch{}return new Error((data&&(data.message||data.msg||data.error_description||data.error))||`Request failed (${res.status})`);}
  async signIn(email,password){const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}});this.setSession(data);return data;}
  async signUp(email,password,inviteToken){const data=await this.request('/auth/v1/signup',{method:'POST',auth:false,body:inviteSignupPayload(email,password,inviteToken)});if(data?.session)this.setSession(data.session);else if(data?.access_token)this.setSession(data);return data;}
  async refresh(){if(!this.refreshToken)throw new Error('No refresh token');const data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:this.refreshToken}});this.setSession(data);return data;}
  async uploadEvidence(path,body,mime='application/octet-stream'){return this.request(`/storage/v1/object/audit-evidence/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',body,headers:{'Content-Type':mime,'x-upsert':'true'},prefer:'return=representation'});}
  async signedEvidenceUrl(path,seconds=900){const data=await this.request(`/storage/v1/object/sign/audit-evidence/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',body:{expiresIn:seconds}});return data?.signedURL?`${this.url}/storage/v1${data.signedURL}`:'';}
}
