/* r7 step 1: answer evidence + additive progress migration (handoff r7, W-2=C, Q5-A, Q6-B).
   Lives in state.evidence with its own version. The main progress schema stays 7 so older builds
   keep reading backups/cloud payloads; they simply ignore this namespace (rollback-safe).
   Nothing here rewrites records, skills, vocabulary, homework attempts, events or FSRS. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const FR=node?require('./field-register.js'):root.FieldRegister;
 const VERSION=1,MIGRATION_ID='r7-progress-1',MAX_ATTEMPTS=600;
 // r7 2b FREG: second additive migration — stable field keys (fk:<qid>#<i> @ freg-r7-1) on old attempts.
 const FREG_ID='r7-freg-1',MAX_CONFLICTS=200;
 // r7 2b Q6: evidence class of one answered field (what the learner actually did).
 const FIELD_CLS=['build','retry','solved_with_help','choose_variant','choose','spot','classify','assemble','detect','text_fallback'];
 const KEY_STATUS=['ok','mapped','mapped-changed','changed','moved','ambiguous','unregistered'];
 const KIND_CLS={choice:'choose','tap-token':'spot',sort:'classify','word-bank':'assemble',detect:'detect',multi:'choose'};
 // Owner decision W-2=C (2026-10-06): one source id / one T13 position, four mandatory form-level checks.
 // Full credit only after every form was done at least once independently, without a hint.
 const FORM_REQUIREMENTS=Object.freeze({
  'vocab:4-2:qalaisyn':Object.freeze({lesson_id:'4-2',forms:Object.freeze(['қалайсың','қалайсыңдар','қалайсыз','қалайсыздар'])})
 });
 // Which evidence counts as "done independently" for a form — FINAL owner decision (казакша, 2026-10-06, W-2):
 // only independent typed production of exactly this form, first try, no hint / reveal / rule peek.
 // Recognition (form -> translation), one combined "write all 4" answer and any choice / Q6-B support kind
 // are kept as support practice (help_n / wrong_n under their own keys) and never count.
 const POLICY=Object.freeze({id:'w2c-strict-v1',directions:Object.freeze(['produce']),contexts:Object.freeze(['single'])});
 const SUPPORT_KINDS=['choice','tap-token','sort','word-bank','detect'];
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
   return {v:VERSION,attempts:[],forms:Object.create(null),migrations:{[MIGRATION_ID]:{at,from_schema:null,fresh:true,input_fp:null,history_partial:false},[FREG_ID]:{at,from_schema:null,fresh:true,input_fp:null,history_partial:false,register:FR?FR.REV:'',keyed_n:0,fields_n:0}},legacy:Object.create(null)};
 }
 function blank(){return {v:VERSION,attempts:[],forms:Object.create(null),migrations:Object.create(null),legacy:Object.create(null)};}
 function cleanKey(k){return {indep_at:ts(Number(k&&k.indep_at)),indep_n:Math.max(0,Math.floor(num(k&&k.indep_n))),help_n:Math.max(0,Math.floor(num(k&&k.help_n))),wrong_n:Math.max(0,Math.floor(num(k&&k.wrong_n))),last_at:ts(Number(k&&k.last_at))};}
 function cleanAttempt(a){
   if(!obj(a)||!safe(a.id)||!safe(a.q))return null;
   const fields=Array.isArray(a.fields)?a.fields.filter(obj).slice(0,30).map(f=>({i:Math.max(0,Math.floor(num(f.i))),fp:str(f.fp,16),resp:RESPONSE.includes(f.resp)?f.resp:'typed',alts:!!f.alts,verdict:f.verdict==='correct'?'correct':f.verdict==='held'?'held':'incorrect',indep:!!f.indep&&f.verdict!=='held',
     // r7 2b: additive, present only when known (older attempts keep their exact shape)
     ...(typeof f.key==='string'&&/^fk:/.test(f.key)?{key:f.key.slice(0,220)}:{}),...(KEY_STATUS.includes(f.ks)?{ks:f.ks}:{}),...(FIELD_CLS.includes(f.cls)?{cls:f.cls}:{})})):[];
   const forms=Array.isArray(a.forms)?a.forms.filter(f=>obj(f)&&safe(f.src)&&typeof f.form==='string').slice(0,20).map(f=>({src:f.src,form:f.form.slice(0,80),dir:['produce','recognize','choose'].includes(f.dir)?f.dir:'produce',ctx:f.ctx==='set'?'set':'single',ok:!!f.ok,indep:!!f.indep})):[];
   const kind=a.kind==='multi'||SUPPORT_KINDS.includes(a.kind)?a.kind:'fields';
   return {id:a.id.slice(0,160),at:num(a.at),q:a.q,...(kind!=='fields'?{kind}:{}),lesson:str(a.lesson,20),rev:str(a.rev,40),origin:ORIGINS.includes(a.origin)?a.origin:'other',q_origin:str(a.q_origin,40),first:a.first!==false,hint:!!a.hint,reveal:!!a.reveal,rule_peek:!!a.rule_peek,correct:!!a.correct,fields,forms,
     ...(typeof a.pres==='string'&&a.pres?{pres:a.pres.slice(0,80)}:{}),...(a.full===false?{full:false}:{}),...(Number(a.held_n)>0?{held_n:Math.min(30,Math.floor(num(a.held_n)))}:{}),
     ...(a.status==='unsupported'?{status:'unsupported',modality:str(a.modality,20)}:{}),...(a.transfer?{transfer:true}:{})};
 }
 const CONFLICT_FIELDS=['seen','last_seen','review_count','last_answer','correct_count','wrong_count','due','stability','difficulty','reps','lapses','state'];
 function conflictSide(v){const o={};if(obj(v))for(const k of CONFLICT_FIELDS)if(v[k]!=null&&Number.isFinite(Number(v[k])))o[k]=Number(v[k]);return o;}
 function cleanConflict(c){
   if(!obj(c)||!safe(c.id)||!['records','skills'].includes(c.ns)||!safe(c.key))return null;
   const side=conflictSide;
   return {id:c.id.slice(0,260),ns:c.ns,key:c.key.slice(0,200),at:num(c.at),local:side(c.local),incoming:side(c.incoming),chosen:c.chosen==='incoming'?'incoming':'local',
     provenance:{local:str(c.provenance&&c.provenance.local,40)||'this-device',incoming:str(c.provenance&&c.provenance.incoming,40)||'incoming'},history_partial:!!c.history_partial,status:c.status==='resolved'?'resolved':'unresolved'};
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
     out.migrations[id]={at:num(m.at),from_schema:Number.isFinite(m.from_schema)?m.from_schema:null,fresh:!!m.fresh,input_fp:typeof m.input_fp==='string'?m.input_fp.slice(0,16):null,history_partial:!!m.history_partial,
       ...(typeof m.register==='string'?{register:m.register.slice(0,40),keyed_n:Math.max(0,Math.floor(num(m.keyed_n))),fields_n:Math.max(0,Math.floor(num(m.fields_n)))}:{})};
   }
   if(Array.isArray(raw.conflicts)){const c=raw.conflicts.map(cleanConflict).filter(Boolean).slice(-MAX_CONFLICTS);if(c.length)out.conflicts=c;}
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
   if(Number(ev.v)>VERSION)return state;
   if(!ev.migrations[MIGRATION_ID]){
     ev.legacy=legacyFacts(state);
     ev.migrations[MIGRATION_ID]={at,from_schema:Number.isFinite(raw&&raw.schema)?raw.schema:null,fresh:false,input_fp:fingerprint(state),history_partial:true};
   }
   upgradeFreg(ev,at);
   return state;
 }
 // r7 2b FREG migration: additive and idempotent. Only evidence attempts get key/ks; records, skills,
 // FSRS, homework and the core fingerprint are not touched. A field is keyed only through the register
 // (exact address or explicit mapping); a moved/ambiguous field stays unkeyed (no silent re-binding).
 function upgradeFreg(ev,at,register){
   if(ev.migrations[FREG_ID])return false;
   const reg=register||FR;let keyed=0,n=0;
   for(const a of ev.attempts){
     if(a.kind)continue; // support kinds / multi have no registered fields
     for(const f of a.fields){
       if(f.key||f.ks)continue;n++;
       const r=reg?reg.resolveFp(a.q,f.i,f.fp):{key:null,status:'unregistered'};
       f.ks=r.status;if(r.key){f.key=r.key;keyed++;}
     }
   }
   ev.migrations[FREG_ID]={at,from_schema:null,fresh:!ev.attempts.length,input_fp:null,history_partial:!!(ev.migrations[MIGRATION_ID]&&ev.migrations[MIGRATION_ID].history_partial),register:reg?reg.REV:'',keyed_n:keyed,fields_n:n};
   return true;
 }
 function rollback(state){if(state&&typeof state==='object')delete state.evidence;return state;}
 // Undo only the FREG step (field keys + its marker); r7-progress-1 data stays.
 function rollbackFreg(state){
   const ev=state&&state.evidence;if(!obj(ev)||Number(ev.v)>VERSION)return state;
   if(ev.migrations)delete ev.migrations[FREG_ID];
   for(const a of ev.attempts||[])for(const f of a.fields||[]){delete f.key;delete f.ks;}
   return state;
 }
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
   const cs=new Map();for(const c of [...(a.conflicts||[]),...(b.conflicts||[])])if(!cs.has(c.id))cs.set(c.id,c);
   if(cs.size)out.conflicts=[...cs.values()].sort((x,y)=>x.at-y.at).slice(-MAX_CONFLICTS);
   return out;
 }
 function fieldFingerprint(f){return hash(stable([f&&f.label||'',f&&f.kind||'',(f&&f.answers||[]).map(x=>String(x))]));}
 function supportTokens(q){
   const p=q.payload||{},out=new Set(),add=t=>toks(t).forEach(x=>out.add(x)),pick=(list,ids)=>(list||[]).filter(x=>(ids||[]).includes(x.id)).forEach(x=>add(x.text));
   if(q.kind==='choice')pick(p.options,p.accepted);
   else if(q.kind==='tap-token')pick(p.tokens,(p.accepted||[]).flat());
   else if(q.kind==='word-bank')pick(p.pieces,(p.accepted||[]).flat());
   else if(q.kind==='sort')(p.items||[]).forEach(x=>add(x.text));
   else if(q.kind==='detect')add(p.target||'');
   add(q.stimulus||'');
   return out;
 }
 function formHits(q,answers,result,modes){
   const hits=[];
   for(const [src,req] of Object.entries(FORM_REQUIREMENTS)){
     const forms=req.forms.map(norm);
     if(SUPPORT_KINDS.includes(q.kind)){
       // Support kinds are choice evidence: recorded as 'choose', never independent production.
       const present=forms.filter(f=>supportTokens(q).has(f));
       for(const f of present)hits.push({src,form:f,dir:'choose',ctx:present.length===1?'single':'set',field:null,ok:!!result.correct});
       continue;
     }
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
   // r7 2b Q6-07/08: first try is per presentation of the card. Any earlier attempt in the same
   // presentation (wrong try, retry) makes this one not-first; earlier help carries over as help.
   const pres=typeof ctx.presentation==='string'&&ctx.presentation?ctx.presentation.slice(0,80):'';
   const prior=pres?ev.attempts.filter(a=>a.q===q.id&&a.pres===pres):[];
   const assisted=!!(event.hinted||ctx.revealed||event.rule_peek||event.peek)||prior.some(a=>a.hint||a.reveal||a.rule_peek);
   const first=ctx.first!==false&&!prior.length;
   const support=SUPPORT_KINDS.includes(q.kind);
   // Q6-18: a listening card without audio is not run as listening; any answer is a text fallback.
   const unsupported=(q.modality==='listen'||q.kind==='listen'||q.type==='listen')&&!q.audio;
   const reg=ctx.register||FR;
   const modes=support||q.kind==='multi'?['choice']:(q.fields||[]).map((_,i)=>RESPONSE.includes(ctx.responseModes&&ctx.responseModes[i])?ctx.responseModes[i]:'typed');
   const fields=support?(result.parts||[]).slice(0,30).map((ok,i)=>({i,fp:hash(stable([q.kind,q.payload||null])),resp:'choice',alts:true,verdict:ok?'correct':'incorrect',indep:false,cls:KIND_CLS[q.kind]})):q.kind==='multi'?[{i:0,fp:hash(stable(q.options||[])),resp:'choice',alts:true,verdict:result.correct?'correct':'incorrect',indep:false,cls:'choose'}]:(q.fields||[]).map((f,i)=>{
     const ok=!!(result.parts&&result.parts[i]);
     const r=reg&&reg.resolve?reg.resolve(q,i):{key:null,status:'unregistered'};
     const hold=reg&&reg.holdFor?reg.holdFor(q,i):null;
     const typed=modes[i]==='typed';
     const cls=unsupported?'text_fallback':!typed?'choose_variant':assisted?'solved_with_help':!first?'retry':'build';
     // H-02: a held field is graded "held" — neither correct nor incorrect, never independent.
     const row={i,fp:fieldFingerprint(f),resp:modes[i],alts:modes[i]==='choice',verdict:hold?'held':ok?'correct':'incorrect',indep:!hold&&!unsupported&&ok&&first&&!assisted&&typed,ks:r.status,cls};
     if(r.key)row.key=r.key;
     return row;
   });
   const heldN=fields.filter(f=>f.verdict==='held').length;
   const forms=[];
   for(const hit of formHits(q,answers,result,modes)){
     const typed=hit.field==null?(!support&&q.kind!=='multi'&&modes.every(m=>m==='typed')):modes[hit.field]==='typed';
     // W-2 final: only produce|single can be independent; recognition / combined set / choose stay support practice.
     const indep=!!(hit.ok&&first&&!assisted&&typed&&!unsupported&&hit.dir==='produce'&&hit.ctx==='single');
     forms.push({src:hit.src,form:hit.form,dir:hit.dir,ctx:hit.ctx,ok:hit.ok,indep});
     bump(state,hit.src,hit.form,hit.dir+'|'+hit.ctx,hit,indep,at);
   }
   const attempt=cleanAttempt({id,at,q:q.id,kind:q.kind,lesson:ctx.lessonId||q.lessonId||'',rev:ctx.contentRevision||event.content_revision||'',origin:ctx.origin,q_origin:q.origin||'',first,hint:!!(event.hinted||event.peek),reveal:!!ctx.revealed,rule_peek:!!event.rule_peek,correct:!!result.correct&&!heldN,fields,forms,
     pres,full:!heldN&&!unsupported?undefined:false,held_n:heldN,...(unsupported?{status:'unsupported',modality:'listen'}:{}),transfer:!!(q.transfer||q.type==='transfer')});
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
 const evOf=state=>obj(state&&state.evidence)&&Number(state.evidence.v)<=VERSION?state.evidence:blank();
 // Q6-05/06: how the learner met a card — every attempt stays visible (help, reveal, retries);
 // a later correct answer never erases that the answer was shown before.
 function exposure(state,qid){
   const rows=evOf(state).attempts.filter(a=>a.q===qid).sort((x,y)=>x.at-y.at);
   const firstRow=rows[0]||null;
   return {q:qid,attempts:rows.length,first_try_correct:!!(firstRow&&firstRow.first&&firstRow.correct&&!firstRow.hint&&!firstRow.reveal&&!firstRow.rule_peek),
     ever_helped:rows.some(a=>a.hint||a.reveal||a.rule_peek),answer_revealed:rows.some(a=>a.reveal),
     support_only:rows.length>0&&rows.every(a=>a.kind||a.fields.every(f=>f.resp==='choice')),
     later_correct:rows.slice(1).some(a=>a.correct),independent:rows.some(a=>a.fields.some(f=>f.indep))};
 }
 function firstTry(state,qid,pres){
   const rows=evOf(state).attempts.filter(a=>a.q===qid&&(!pres||a.pres===pres)).sort((x,y)=>x.at-y.at);
   return rows.length?{correct:!!rows[0].correct,first:!!rows[0].first,assisted:!!(rows[0].hint||rows[0].reveal||rows[0].rule_peek),pres:rows[0].pres||null}:null;
 }
 // ST-04/05: field status by stable key. Only evidence whose fingerprint equals the field's current
 // fingerprint counts; a changed field (new answers/meaning) does not inherit an old independent PASS.
 function fieldStatus(state,key,opts={}){
   const reg=opts.register||FR;
   const cur=opts.fp||(reg&&reg.fpOfKey?reg.fpOfKey(key):null);
   const held=!!(reg&&reg.holds&&reg.holds().some(h=>h.key===key));
   let indepAt=null,stale=0,seen=0,help=0,wrong=0;
   for(const a of evOf(state).attempts)for(const f of a.fields){
     if(f.key!==key)continue;
     if(cur&&f.fp!==cur){stale++;continue;}
     seen++;
     if(f.indep&&f.verdict==='correct'){if(!indepAt||a.at<indepAt)indepAt=a.at;}
     else if(f.verdict==='correct')help++;else if(f.verdict==='incorrect')wrong++;
   }
   return {key,fp:cur,held,independent:!held&&!!indepAt,independent_at:held?null:indepAt,seen,with_help:help,wrong,stale};
 }
 // H-07: held fields are left out of the denominator and the item is never "mastered" while one is held.
 function fieldSummary(state,keys,opts={}){
   const rows=(keys||[]).map(k=>fieldStatus(state,k,opts));
   const active=rows.filter(r=>!r.held),held=rows.length-active.length,passed=active.filter(r=>r.independent).length;
   return {total:rows.length,held,denominator:active.length,independent:passed,mastered:held===0&&active.length>0&&passed===active.length,fields:rows};
 }
 // Q5-14: one report per origin — bank, homework, exam, lesson, voluntary — never mixed.
 function byOrigin(state){
   const out={};for(const o of ORIGINS)out[o]={attempts:0,correct:0,independent_fields:0,questions:[]};
   for(const a of evOf(state).attempts){const r=out[a.origin]||out.other;r.attempts++;if(a.correct)r.correct++;r.independent_fields+=a.fields.filter(f=>f.indep).length;if(!r.questions.includes(a.q))r.questions.push(a.q);}
   return out;
 }
 // ST-07: a sync/import conflict on the same record is kept with both sides and provenance; the core
 // merge result itself is not changed here (it stays whatever P.merge picked).
 function recordConflicts(out,current,incoming,opts={}){
   if(!out||!obj(out.evidence)||Number(out.evidence.v)>VERSION)return [];
   const at=Number.isFinite(opts.now)?opts.now:Date.now(),found=[];
   const sign=v=>v>0?1:v<0?-1:0;
   const scan=(ns,A,B,countKey,lastKey)=>{
     if(!obj(A)||!obj(B))return;
     for(const k of Object.keys(B)){
       const a=A[k],b=B[k];if(!obj(a)||!obj(b)||!safe(k))continue;
       const flat=v=>Object.assign({},v,obj(v.fsrs)?v.fsrs:{});
       if(stable(conflictSide(flat(a)))===stable(conflictSide(flat(b))))continue; // same learning state (only bookkeeping differs)
       const c=sign(num(a[countKey])-num(b[countKey])),l=sign(num(a[lastKey])-num(b[lastKey]));
       if(c!==0&&c===l)continue; // one side is strictly ahead: a plain update, not a conflict
       const chosen=out[ns]&&stable(out[ns][k])===stable(b)?'incoming':'local';
       const row=cleanConflict({id:ns+':'+k+':'+hash(stable([a,b])),ns,key:k,at,local:flat(a),incoming:flat(b),chosen,provenance:{local:'this-device',incoming:opts.source||'incoming'},
         history_partial:!!(opts.history_partial||(Array.isArray(current&&current.events)&&current.events.length>=2500)||(Array.isArray(incoming&&incoming.events)&&incoming.events.length>=2500)),status:'unresolved'});
       if(row)found.push(row);
     }
   };
   scan('records',current&&current.records,incoming&&incoming.records,'seen','last_seen');
   scan('skills',current&&current.skills,incoming&&incoming.skills,'review_count','last_answer');
   if(found.length){
     const ev=out.evidence,have=new Set((ev.conflicts||[]).map(c=>c.id));
     ev.conflicts=[...(ev.conflicts||[]),...found.filter(c=>!have.has(c.id))].slice(-MAX_CONFLICTS);
   }
   return found;
 }
 // Q6-17: a transfer task (or any support kind) is never evidence of a NEW word.
 function newWordEvidence(a){return !!(a&&!a.transfer&&!a.kind&&a.fields.some(f=>f.indep));}
 const api={VERSION,MIGRATION_ID,FREG_ID,MAX_ATTEMPTS,FIELD_CLS,FORM_REQUIREMENTS,POLICY,empty,migrate,upgrade,upgradeFreg,rollback,rollbackFreg,merge,observe,formStatus,formHits,fingerprint,fieldFingerprint,hash,stable,
   exposure,firstTry,fieldStatus,fieldSummary,byOrigin,recordConflicts,newWordEvidence};
 if(node)module.exports=api;else root.EvidenceState=api;
})(typeof window!=='undefined'?window:globalThis);
