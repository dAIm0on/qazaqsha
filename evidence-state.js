/* r7 step 1: answer evidence + additive progress migration (handoff r7, W-2=C, Q5-A, Q6-B).
   Lives in state.evidence with its own version. The main progress schema stays 7 so older builds
   keep reading backups/cloud payloads; they simply ignore this namespace (rollback-safe).
   Nothing here rewrites records, skills, vocabulary, homework attempts, events or FSRS. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const VERSION=1,MIGRATION_ID='r7-progress-1',MAX_ATTEMPTS=600;
 // Owner decision W-2=C (2026-10-06): one source id / one T13 position, four mandatory form-level checks.
 // Full credit only after every form was done at least once independently, without a hint.
 const FORM_REQUIREMENTS=Object.freeze({
  'vocab:4-2:qalaisyn':Object.freeze({lesson_id:'4-2',forms:Object.freeze(['қалайсың','қалайсыңдар','қалайсыз','қалайсыздар'])})
 });
 // Which evidence counts as "done independently" for a form. Strict until the owner says otherwise:
 // typed production of exactly this form, first try, no hint / reveal / rule peek. Recognition
 // (form -> translation) and one combined "write all forms" answer are recorded but do not count.
 const POLICY=Object.freeze({id:'w2c-strict-v1',directions:Object.freeze(['produce']),contexts:Object.freeze(['single'])});
 const RESPONSE=['typed','choice'],ORIGINS=['homework','exam','lesson','lesson-stage','bank','voluntary','other'];
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const safe=k=>typeof k==='string'&&k.length>0&&k.length<=300&&!['__proto__','prototype','constructor'].includes(k);
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const ts=v=>Number.isFinite(v)&&v>0?v:null;
 const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
 const norm=s=>core&&core.normalize?core.normalize(s):String(s||'').normalize('NFC').toLowerCase().trim();
 const toks=s=>core&&core.tokens?core.tokens(s):[...new Set(norm(s).split(/[\s,;/+]+/).filter(Boolean))];
 function hash(text){let h=0x811c9dc5;const s=String(text);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}
 function stable(v){
   if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
   if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
   return JSON.stringify(v===undefined?null:v);
 }
 function empty(now){
   const at=Number.isFinite(now)?now:Date.now();
   // A brand-new profile has no pre-r7 history: mark it so later aggregates are never mistaken for legacy facts.
   return {v:VERSION,attempts:[],forms:Object.create(null),migrations:{[MIGRATION_ID]:{at,from_schema:null,fresh:true,input_fp:null,history_partial:false}},legacy:Object.create(null)};
 }
 function blank(){return {v:VERSION,attempts:[],forms:Object.create(null),migrations:Object.create(null),legacy:Object.create(null)};}
 function cleanKey(k){return {indep_at:ts(Number(k&&k.indep_at)),indep_n:Math.max(0,Math.floor(num(k&&k.indep_n))),help_n:Math.max(0,Math.floor(num(k&&k.help_n))),wrong_n:Math.max(0,Math.floor(num(k&&k.wrong_n))),last_at:ts(Number(k&&k.last_at))};}
 function cleanAttempt(a){
   if(!obj(a)||!safe(a.id)||!safe(a.q))return null;
   const fields=Array.isArray(a.fields)?a.fields.filter(obj).slice(0,30).map(f=>({i:Math.max(0,Math.floor(num(f.i))),fp:str(f.fp,16),resp:RESPONSE.includes(f.resp)?f.resp:'typed',alts:!!f.alts,verdict:f.verdict==='correct'?'correct':'incorrect',indep:!!f.indep})):[];
   const forms=Array.isArray(a.forms)?a.forms.filter(f=>obj(f)&&safe(f.src)&&typeof f.form==='string').slice(0,20).map(f=>({src:f.src,form:f.form.slice(0,80),dir:['produce','recognize','choose'].includes(f.dir)?f.dir:'produce',ctx:f.ctx==='set'?'set':'single',ok:!!f.ok,indep:!!f.indep})):[];
   return {id:a.id.slice(0,160),at:num(a.at),q:a.q,lesson:str(a.lesson,20),rev:str(a.rev,40),origin:ORIGINS.includes(a.origin)?a.origin:'other',q_origin:str(a.q_origin,40),first:a.first!==false,hint:!!a.hint,reveal:!!a.reveal,rule_peek:!!a.rule_peek,correct:!!a.correct,fields,forms};
 }
 function migrate(raw){
   if(obj(raw)&&Number(raw.v)>VERSION)return JSON.parse(JSON.stringify(raw)); // newer build wrote it: keep untouched
   const out=blank();
   if(!obj(raw))return out;
   out.attempts=Array.isArray(raw.attempts)?raw.attempts.map(cleanAttempt).filter(Boolean).slice(-MAX_ATTEMPTS):[];
   if(obj(raw.forms))for(const [src,forms] of Object.entries(raw.forms)){
     if(!safe(src)||!obj(forms))continue;
     out.forms[src]=Object.create(null);
     for(const [form,row] of Object.entries(forms)){
       if(!safe(form)||!obj(row))continue;
       const keys=Object.create(null);
       if(obj(row.keys))for(const [k,v] of Object.entries(row.keys))if(/^(produce|recognize|choose)\|(single|set)$/.test(k))keys[k]=cleanKey(v);
       out.forms[src][form.slice(0,80)]={keys};
     }
   }
   if(obj(raw.migrations))for(const [id,m] of Object.entries(raw.migrations)){
     if(!safe(id)||!obj(m))continue;
     out.migrations[id]={at:num(m.at),from_schema:Number.isFinite(m.from_schema)?m.from_schema:null,fresh:!!m.fresh,input_fp:typeof m.input_fp==='string'?m.input_fp.slice(0,16):null,history_partial:!!m.history_partial};
   }
   if(obj(raw.legacy)){
     if(obj(raw.legacy.homework)){
       out.legacy.homework=Object.create(null);
       for(const [lesson,h] of Object.entries(raw.legacy.homework))if(safe(lesson)&&obj(h))out.legacy.homework[lesson.slice(0,20)]={checklist_words:!!h.checklist_words,submitted_at:ts(Number(h.submitted_at)),items_n:Math.max(0,Math.floor(num(h.items_n))),status:'insufficient_evidence'};
     }
     if(obj(raw.legacy.forms)){
       out.legacy.forms=Object.create(null);
       for(const [src,f] of Object.entries(raw.legacy.forms))if(safe(src)&&obj(f))out.legacy.forms[src]={prior_events_n:Math.max(0,Math.floor(num(f.prior_events_n))),status:'insufficient_evidence'};
     }
   }
   return out;
 }
 const CORE_KEYS=['records','skills','vocabulary','associations','confusions','homeworkAttempts','courseProgress','learning','grammarPath','morphTrainer','lesson_packages'];
 function fingerprint(state){
   const view={};for(const k of CORE_KEYS)view[k]=state&&state[k]!==undefined?state[k]:null;
   view.events_n=Array.isArray(state&&state.events)?state.events.length:0;view.errors_n=Array.isArray(state&&state.errors)?state.errors.length:0;
   return hash(stable(view));
 }
 function legacyFacts(state){
   const legacy=Object.create(null);legacy.homework=Object.create(null);legacy.forms=Object.create(null);
   for(const [lesson,a] of Object.entries(state.homeworkAttempts||{})){
     if(!obj(a))continue;
     legacy.homework[lesson]={checklist_words:!!(a.checklist&&a.checklist.words),submitted_at:ts(Number(a.submitted_at)),items_n:Array.isArray(a.items)?a.items.length:0,status:'insufficient_evidence'};
   }
   for(const [src,req] of Object.entries(FORM_REQUIREMENTS)){
     const wanted=new Set(req.forms.map(norm));let n=0;
     for(const e of state.events||[])if(e&&Array.isArray(e.answers)&&e.answers.some(a=>toks(a).some(t=>wanted.has(t))))n++;
     legacy.forms[src]={prior_events_n:n,status:'insufficient_evidence'};
   }
   return legacy;
 }
 // One-time, additive, idempotent. `state` is the freshly migrated core state; `raw` is what was loaded.
 function upgrade(state,raw,now){
   const at=Number.isFinite(now)?now:Date.now();
   const ev=migrate(raw&&raw.evidence);state.evidence=ev;
   if(Number(ev.v)>VERSION||ev.migrations[MIGRATION_ID])return state;
   ev.legacy=legacyFacts(state);
   ev.migrations[MIGRATION_ID]={at,from_schema:Number.isFinite(raw&&raw.schema)?raw.schema:null,fresh:false,input_fp:fingerprint(state),history_partial:true};
   return state;
 }
 function rollback(state){if(state&&typeof state==='object')delete state.evidence;return state;}
 function mergeKey(a,b){
   const A=cleanKey(a),B=cleanKey(b);
   const first=[A.indep_at,B.indep_at].filter(Boolean);
   // max, not sum: two devices usually share most of their history after a cloud sync.
   return {indep_at:first.length?Math.min(...first):null,indep_n:Math.max(A.indep_n,B.indep_n),help_n:Math.max(A.help_n,B.help_n),wrong_n:Math.max(A.wrong_n,B.wrong_n),last_at:Math.max(A.last_at||0,B.last_at||0)||null};
 }
 function merge(current,incoming){
   const a=migrate(current),b=migrate(incoming);
   if(Number(a.v)>VERSION||Number(b.v)>VERSION)return Number(a.v)>=Number(b.v)?a:b;
   const out=blank();
   const byId=new Map();for(const x of [...a.attempts,...b.attempts])if(!byId.has(x.id))byId.set(x.id,x);
   out.attempts=[...byId.values()].sort((x,y)=>x.at-y.at).slice(-MAX_ATTEMPTS);
   for(const src of new Set([...Object.keys(a.forms),...Object.keys(b.forms)])){
     out.forms[src]=Object.create(null);
     const fa=a.forms[src]||{},fb=b.forms[src]||{};
     for(const form of new Set([...Object.keys(fa),...Object.keys(fb)])){
       const keys=Object.create(null),ka=(fa[form]||{}).keys||{},kb=(fb[form]||{}).keys||{};
       for(const k of new Set([...Object.keys(ka),...Object.keys(kb)]))keys[k]=mergeKey(ka[k],kb[k]);
       out.forms[src][form]={keys};
     }
   }
   for(const id of new Set([...Object.keys(a.migrations),...Object.keys(b.migrations)])){
     const x=a.migrations[id],y=b.migrations[id];
     out.migrations[id]=!x?y:!y?x:(x.fresh&&!y.fresh)?y:(y.fresh&&!x.fresh)?x:(x.at<=y.at?x:y);
   }
   const hasLegacy=l=>l&&(Object.keys(l.homework||{}).length||Object.keys(l.forms||{}).length);
   out.legacy=hasLegacy(a.legacy)?a.legacy:hasLegacy(b.legacy)?b.legacy:a.legacy;
   return out;
 }
 function fieldFingerprint(f){return hash(stable([f&&f.label||'',f&&f.kind||'',(f&&f.answers||[]).map(x=>String(x))]));}
 function formHits(q,answers,result,modes){
   const hits=[];
   for(const [src,req] of Object.entries(FORM_REQUIREMENTS)){
     const forms=req.forms.map(norm);
     if(q.kind==='multi'){
       for(const opt of q.correct||[]){const f=norm(opt);if(forms.includes(f))hits.push({src,form:f,dir:'choose',ctx:'single',field:null,ok:!!result.correct});}
       continue;
     }
     let produced=false;
     (q.fields||[]).forEach((field,i)=>{
       const expected=new Set((field.answers||[]).flatMap(x=>toks(x)));
       const present=forms.filter(f=>expected.has(f));
       if(!present.length)return;
       produced=true;
       const ctx=present.length===1?'single':'set';
       const typed=new Set(toks(answers&&answers[i]));
       for(const f of present)hits.push({src,form:f,dir:'produce',ctx,field:i,ok:ctx==='single'?!!(result.parts&&result.parts[i]):(!!(result.parts&&result.parts[i])&&typed.has(f))});
     });
     if(produced)continue;
     const shown=forms.filter(f=>toks(q.stimulus||'').includes(f));
     if(shown.length===1)hits.push({src,form:shown[0],dir:'recognize',ctx:'single',field:null,ok:!!result.correct});
   }
   return hits;
 }
 function bump(state,src,form,key,hit,independent,at){
   const ev=state.evidence;
   ev.forms[src]=ev.forms[src]||Object.create(null);
   const row=ev.forms[src][form]=ev.forms[src][form]||{keys:Object.create(null)};
   const k=row.keys[key]=row.keys[key]?cleanKey(row.keys[key]):cleanKey(null);
   if(independent){k.indep_n++;if(!k.indep_at)k.indep_at=at;}
   else if(hit.ok)k.help_n++;
   else k.wrong_n++;
   k.last_at=at;
 }
 // ctx: {q, answers, result, event, responseModes[], origin, revealed, lessonId, contentRevision}
 function observe(state,ctx){
   if(!state||!ctx||!ctx.q||!ctx.event||!ctx.result)return null;
   if(!obj(state.evidence))state.evidence=blank();
   const ev=state.evidence;if(Number(ev.v)>VERSION)return null;
   const {q,answers,result,event}=ctx,id=String(event.id||('ev:'+event.at+':'+q.id));
   if(ev.attempts.some(a=>a.id===id))return null; // idempotent per event
   const at=Number(event.at)||Date.now();
   const assisted=!!(event.hinted||ctx.revealed||event.rule_peek||event.peek);
   const first=ctx.first!==false;
   const modes=q.kind==='multi'?['choice']:(q.fields||[]).map((_,i)=>RESPONSE.includes(ctx.responseModes&&ctx.responseModes[i])?ctx.responseModes[i]:'typed');
   const fields=q.kind==='multi'?[{i:0,fp:hash(stable(q.options||[])),resp:'choice',alts:true,verdict:result.correct?'correct':'incorrect',indep:false}]:(q.fields||[]).map((f,i)=>{
     const ok=!!(result.parts&&result.parts[i]);
     return {i,fp:fieldFingerprint(f),resp:modes[i],alts:modes[i]==='choice',verdict:ok?'correct':'incorrect',indep:ok&&first&&!assisted&&modes[i]==='typed'};
   });
   const forms=[];
   for(const hit of formHits(q,answers,result,modes)){
     const typed=hit.field==null?(q.kind!=='multi'&&modes.every(m=>m==='typed')):modes[hit.field]==='typed';
     const indep=!!(hit.ok&&first&&!assisted&&typed&&hit.dir!=='choose');
     forms.push({src:hit.src,form:hit.form,dir:hit.dir,ctx:hit.ctx,ok:hit.ok,indep});
     bump(state,hit.src,hit.form,hit.dir+'|'+hit.ctx,hit,indep,at);
   }
   const attempt=cleanAttempt({id,at,q:q.id,lesson:ctx.lessonId||q.lessonId||'',rev:ctx.contentRevision||event.content_revision||'',origin:ctx.origin,q_origin:q.origin||'',first,hint:!!(event.hinted||event.peek),reveal:!!ctx.revealed,rule_peek:!!event.rule_peek,correct:!!result.correct,fields,forms});
   if(attempt){ev.attempts.push(attempt);if(ev.attempts.length>MAX_ATTEMPTS)ev.attempts.splice(0,ev.attempts.length-MAX_ATTEMPTS);}
   return attempt;
 }
 function formStatus(state,src,policy=POLICY){
   const req=FORM_REQUIREMENTS[src];if(!req)return null;
   const ev=obj(state&&state.evidence)&&Number(state.evidence.v)<=VERSION?state.evidence:blank();
   const rows=ev.forms[src]||{};
   const forms=req.forms.map(raw=>{
     const f=norm(raw),keys=(rows[f]||{}).keys||{};
     let at=null;
     for(const dir of policy.directions)for(const c of policy.contexts){const k=keys[dir+'|'+c];if(k&&k.indep_at)at=at?Math.min(at,k.indep_at):k.indep_at;}
     const seen={};for(const [k,v] of Object.entries(keys))seen[k]={independent:v.indep_n,with_help:v.help_n,wrong:v.wrong_n};
     return {form:raw,done:!!at,independent_at:at,seen};
   });
   const done=forms.filter(f=>f.done).length;
   const legacy=ev.legacy&&ev.legacy.forms&&ev.legacy.forms[src]||null;
   return {source_id:src,lesson_id:req.lesson_id,policy:policy.id,required:req.forms.length,done,full_credit:done===req.forms.length,forms,legacy_status:legacy?legacy.status:null};
 }
 const api={VERSION,MIGRATION_ID,MAX_ATTEMPTS,FORM_REQUIREMENTS,POLICY,empty,migrate,upgrade,rollback,merge,observe,formStatus,formHits,fingerprint,fieldFingerprint,hash,stable};
 if(node)module.exports=api;else root.EvidenceState=api;
})(typeof window!=='undefined'?window:globalThis);
