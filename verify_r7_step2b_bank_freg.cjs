#!/usr/bin/env node
'use strict';
/* r7 step 2b · independent practice bank 3–4 + FREG field keys + evidence classes.
   Q6-01…19 · ST-04/05/07/09 · H-02/03/07 · Q5-14 (full) · FREG 2361 · additive idempotent migration r7-freg-1
   · казакша 2b decisions: (1) homework words button in every lesson, (2) қалайсың N/4 line,
   (3) cards with NEW IDs for homework words without cards (1-2 он, 2-1, six 3-1 question words). */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
const appSrc=read('app.js'),learnSrc=read('learning.js'),rtSrc=read('lesson-v2-runtime.js');
const grab=(src,name)=>{const i=src.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=src.indexOf('\n function ',i+5);return src.slice(i,j);};
function fullStack(){
  const sandbox={console,Date,Math,JSON,Array,Object,Map,Set,String,Number,Boolean,Error,RegExp,parseInt,parseFloat,isNaN,isFinite,Infinity,undefined,NaN,Promise,TextEncoder,TextDecoder,
    location:{hostname:'localhost',href:'http://localhost/',protocol:'http:'},
    document:{documentElement:{getAttribute:()=>null},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},body:{},head:{},createElement:()=>({style:{},setAttribute(){},appendChild(){}})},
    localStorage:{_d:Object.create(null),getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
    matchMedia:()=>({matches:false,addListener(){},addEventListener(){}}),addEventListener(){},removeEventListener(){}};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.self=sandbox;
  const skip=new Set(['app.js','pwa.js','design-ui.js','cloud.js','firebase-config.js','dashboard.js','morph-ui.js','morph-nav2.js','personal-trainers.js','free-practice-view.js','tutor-ui.js']);
  const errs=[];
  for(const f of read('index.html').match(/src="([^"]+\.js)"/g).map(x=>x.slice(5,-1))){if(skip.has(f))continue;try{vm.runInNewContext(read(f),sandbox,{filename:f});}catch(e){errs.push(f+': '+e.message);}}
  assert.deepEqual(errs,[],'full stack loads');
  return sandbox;
}
const S=fullStack();
const E=S.EvidenceState,FR=S.FieldRegister,core=S.TrainerCore,P=S.ProgressStore,RK=S.ResponseKinds,R=S.LessonV2Runtime;
const LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'],B34=['3-1','3-2','3-3','4-1','4-2'];
for(const id of LESSONS)R.ensure(id);
const Q=new Map(S.COURSE.questions.map(q=>[q.id,q]));
const bank=S.COURSE.questions.filter(q=>q.bank===true);
const NOW=Date.UTC(2026,9,6,9,0,0);
const ans=q=>{const p=q.payload;
  if(q.kind==='choice')return p.accepted.slice();
  if(q.kind==='tap-token')return p.accepted[0].slice();
  if(q.kind==='sort')return Object.entries(p.accepted).map(([i,c])=>i+'='+c);
  if(q.kind==='word-bank')return p.accepted[0].slice();
  if(q.kind==='detect')return ['verdict:'+p.verdict.accepted,...(p.broken_step&&p.broken_step.accepted.length?['step:'+p.broken_step.accepted[0]]:[])];
};
let seq=0;
const observe=(state,q,answers,extra={})=>E.observe(state,{q,answers,result:core.evaluate(q,answers),event:{id:'t:'+(++seq),at:NOW+seq*1000,...(extra.event||{})},responseModes:extra.modes||(q.fields||[]).map(()=>'typed'),origin:extra.origin||'lesson',presentation:extra.pres,revealed:!!extra.reveal,first:extra.first,register:extra.register});

// ── FREG ─────────────────────────────────────────────────────────────
{
  const reg=JSON.parse(read('qa/freg/field-address-register-r7.json'));
  assert.equal(reg.register,'freg-r7-1');assert.equal(reg.fields.length,2361);assert.equal(reg.fields_total,2361);
  assert.equal(new Set(reg.fields.map(f=>f.key)).size,2361,'keys unique');
  assert.ok(reg.fields.every(f=>f.key==='fk:'+f.qid+'#'+f.index),'key = fk:<qid>#<index at freg-r7-1>');
  assert.equal(reg.fields.filter(f=>f.bank12).length,564);
  assert.equal(FR.TOTAL,2361);assert.equal(FR.MOUNTED,1797);assert.equal(FR.BANK12,564);assert.equal(FR.REV,'freg-r7-1');
  const out=cp.execFileSync(process.execPath,[path.join(__dirname,'tools/build-field-register.cjs'),'--check'],{encoding:'utf8'});assert.ok(/FREG ok 1797/.test(out),out);
  let okN=0;const bad=[];
  for(const qid of FR.questions()){const q=Q.get(qid);if(!q){bad.push('missing '+qid);continue;}q.fields.forEach((f,i)=>{const r=FR.resolve(q,i);if(r.status==='ok'&&r.key===FR.keyAt(qid,i))okN++;else bad.push(qid+'#'+i+':'+r.status);});}
  // One known live difference: the app mounts the legacy data.js card e22-5-4 (same id as the v2 school card),
  // whose field 0 has other answers than the registered address → honestly "changed" (ST-05), never re-bound.
  assert.deepEqual(bad,['e22-5-4#0:changed'],'every mounted registered field resolves ok (except the documented legacy twin)');assert.equal(okN,1796);
  assert.ok(bank.every(q=>!FR.registered(q.id)),'bank cards are not FREG fields (support kinds, fields:[])');
  assert.ok(/<script defer src="field-register\.js"><\/script>\s*<script defer src="evidence-state\.js">/.test(read('index.html')),'field-register loads before evidence-state');
  assert.ok(read('sw.js').includes('"field-register.js"'),'offline asset');
}
ok('FREG: 2361 unique keys at freg-r7-1 (1797 mounted, 564 BANK12 registered), fingerprints match the build, --check green, loaded before evidence');

// ── Migration r7-freg-1: additive, idempotent, rollback ─────────────
{
  const raw=JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json'));
  const q=Q.get('e1-3-1-1'),fp=i=>E.fieldFingerprint(q.fields[i]);
  // pre-2b attempts: no key/ks (written by #56). One exact, one moved (fingerprint of field 0 at index 1), one unknown question.
  raw.evidence={v:1,attempts:[
    {id:'a1',at:NOW-5000,q:'e1-3-1-1',lesson:'1-3',rev:'',origin:'lesson',q_origin:'school',first:true,hint:false,reveal:false,rule_peek:false,correct:true,fields:[{i:0,fp:fp(0),resp:'typed',alts:false,verdict:'correct',indep:true},{i:1,fp:fp(0),resp:'choice',alts:true,verdict:'correct',indep:false}],forms:[]},
    {id:'a2',at:NOW-4000,q:'nope-1',lesson:'',rev:'',origin:'bank',q_origin:'',first:true,hint:false,reveal:false,rule_peek:false,correct:false,fields:[{i:0,fp:'deadbeef',resp:'typed',alts:false,verdict:'incorrect',indep:false}],forms:[]}],
    forms:{},migrations:{'r7-progress-1':{at:NOW-9000,from_schema:7,fresh:false,input_fp:'00000000',history_partial:true}},legacy:{}};
  const before=plain(raw);
  const m1=P.migrate(JSON.parse(JSON.stringify(raw)),NOW);
  const mk=m1.evidence.migrations[E.FREG_ID];
  assert.ok(mk&&mk.register==='freg-r7-1'&&mk.fields_n===3&&mk.keyed_n===1&&mk.history_partial===true&&mk.fresh===false,'marker');
  const f=m1.evidence.attempts[0].fields;
  assert.deepEqual([f[0].key,f[0].ks],['fk:e1-3-1-1#0','ok']);
  assert.equal(f[1].key,undefined,'moved field: no silent re-binding without a mapping');assert.equal(f[1].ks,'ambiguous'===f[1].ks?'ambiguous':'moved');
  assert.deepEqual([m1.evidence.attempts[1].fields[0].key,m1.evidence.attempts[1].fields[0].ks],[undefined,'unregistered']);
  const m2=P.migrate(JSON.parse(P.serialize(m1)),NOW+1000);
  assert.deepEqual(plain(m2.evidence),plain(m1.evidence),'idempotent: second load changes nothing (marker keeps its first time)');
  assert.deepEqual(plain(P.merge(m1,m2).evidence.migrations),plain(m1.evidence.migrations),'merge keeps one marker');
  for(const k of ['records','skills','vocabulary','homeworkAttempts','courseProgress','events'])assert.deepEqual(plain(m1[k]),plain(P.migrate(JSON.parse(JSON.stringify(before)),NOW)[k]),k+' untouched');
  assert.equal(m1.evidence.migrations['r7-progress-1'].input_fp,'00000000','r7-progress-1 marker kept');
  const rb=plain(E.rollbackFreg(JSON.parse(JSON.stringify(m1))));
  assert.equal(rb.evidence.migrations[E.FREG_ID],undefined);assert.ok(rb.evidence.attempts.every(a=>a.fields.every(x=>x.key===undefined&&x.ks===undefined)),'rollback removes only FREG keys');
  assert.deepEqual(rb.evidence.attempts,plain(E.migrate(before.evidence)).attempts,'rollback = the pre-FREG attempts');
  const fresh=P.empty();assert.ok(fresh.evidence.migrations[E.FREG_ID].fresh,'new profile: fresh FREG marker');
}
ok('migration r7-freg-1: exact fields keyed, moved/unknown stay unkeyed; idempotent; core namespaces untouched; rollbackFreg restores pre-FREG attempts');

// ── e22-5-4#0: legacy twin (lesson-pack-2-2.js) under a registered v2 id ──
{
  const live=Q.get('e22-5-4');assert.equal(live.source,'e22','the app mounts the legacy pack card, the v2 school card with the same id is skipped');
  assert.equal(FR.resolve(live,0).status,'changed');assert.deepEqual(plain(FR.resolve(live,1)),{key:'fk:e22-5-4#1',status:'ok'});
  assert.deepEqual([live.fields[0].label,live.fields[0].kind],['Ответ','text'],'same address (label/kind); only the accepted answers differ');
  const fps=live.fields.map(f=>E.fieldFingerprint(f));
  const raw=JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json'));
  const rec={seen:3,review_count:3,correct_count:3,wrong_count:0,last_seen:NOW-9000,last_answer:NOW-9000};
  raw.records=Object.assign({},raw.records,{'e22-5-4':Object.assign({},rec)});
  raw.evidence={v:1,attempts:[{id:'old-e22',at:NOW-9000,q:'e22-5-4',lesson:'2-2',rev:'',origin:'lesson',q_origin:'',first:true,hint:false,reveal:false,rule_peek:false,correct:true,
    fields:[{i:0,fp:fps[0],resp:'typed',alts:false,verdict:'correct',indep:true},{i:1,fp:fps[1],resp:'typed',alts:false,verdict:'correct',indep:true}],forms:[]}],
    forms:{},migrations:{'r7-progress-1':{at:NOW-9900,from_schema:7,fresh:false,input_fp:'00000000',history_partial:true}},legacy:{}};
  const before=P.migrate(JSON.parse(JSON.stringify(raw)),NOW);E.rollbackFreg(before);
  const m=P.migrate(JSON.parse(JSON.stringify(raw)),NOW);const f=m.evidence.attempts[0].fields;
  assert.deepEqual([f[0].key,f[0].ks,f[1].key,f[1].ks],['fk:e22-5-4#0','changed','fk:e22-5-4#1','ok'],'index kept, no move to another field');
  assert.equal(E.fieldStatus(m,'fk:e22-5-4#0').independent,false,'old legacy answer is not a PASS for the registered v2 field (ST-05)');
  assert.equal(E.fieldStatus(m,'fk:e22-5-4#0').stale,1,'…but it is kept, marked stale');
  assert.equal(E.fieldStatus(m,'fk:e22-5-4#1').independent,true,'the unchanged field keeps its PASS');
  assert.deepEqual(plain(m.records['e22-5-4']),plain(before.records['e22-5-4']),'FSRS/record of the legacy card untouched');
  assert.deepEqual(plain(m.skills),plain(before.skills));
  const st={evidence:E.empty(NOW)};const a=observe(st,live,live.fields.map(x=>x.answers[0]),{pres:'e22'});
  assert.deepEqual(plain(a.fields.map(x=>[x.key,x.ks])),[['fk:e22-5-4#0','changed'],['fk:e22-5-4#1','ok']],'live answers are keyed the same way as the migration');
}
ok('e22-5-4#0: legacy pack twin keeps its index and record; old evidence marked changed/stale (no PASS carried, no re-binding), field #1 ok');

// ── ST-04 / ST-05 ───────────────────────────────────────────────────
{
  const fa={label:'A',kind:'text',answers:['x']},fb={label:'B',kind:'text',answers:['y']};
  const fpa=FR.fieldFingerprint(fa),fpb=FR.fieldFingerprint(fb);
  const reg=FR.create({data:{'q-x':fpa+','+fpb,'q-twin':fpa+','+fpa+','+fpb}});
  const permuted={id:'q-x',fields:[fb,fa]};
  assert.deepEqual(plain(reg.resolve(permuted,0)),{key:null,status:'moved',from:1},'ST-04 permutation without mapping: no key');
  const mapped=FR.create({data:{'q-x':fpa+','+fpb},mappings:[{rev:'r2',qid:'q-x',map:{0:'fk:q-x#1',1:'fk:q-x#0'}}]});
  assert.deepEqual(plain(mapped.resolve(permuted,0)),{key:'fk:q-x#1',status:'mapped'},'ST-04 explicit mapping re-binds');
  assert.equal(reg.resolve({id:'q-twin',fields:[fb,fb,fa]},2).status,'ambiguous','same label/fingerprint is not a unique id');
  // ST-05: answers changed at the same address → status changed; old independent PASS is not carried over.
  const fa2={label:'A',kind:'text',answers:['x','z']};
  assert.deepEqual(plain(reg.resolve({id:'q-x',fields:[fa2,fb]},0)),{key:'fk:q-x#0',status:'changed'});
  const st={evidence:E.empty(NOW)};
  observe(st,{id:'q-x',kind:'fields',fields:[fa,fb]},['x','y'],{register:reg,pres:'p1'});
  assert.equal(E.fieldStatus(st,'fk:q-x#0',{register:reg}).independent,true);
  const after=E.fieldStatus(st,'fk:q-x#0',{register:reg,fp:FR.fieldFingerprint(fa2)});
  assert.equal(after.independent,false,'ST-05: no automatic PASS after a content change');assert.equal(after.stale,1);
}
ok('ST-04 permutation needs an explicit mapping (no re-binding by label/fingerprint); ST-05 changed answers keep the address but drop the old PASS');

// ── H-02 / H-03 / H-07 ──────────────────────────────────────────────
{
  const f0={label:'A',kind:'text',answers:['a']},f1={label:'B',kind:'text',answers:['b']};
  const reg=FR.create({data:{'h-q':FR.fieldFingerprint(f0)+','+FR.fieldFingerprint(f1)},holds:[{key:'fk:h-q#1',reason:'OPEN-NORM test',since:'freg-r7-1'}]});
  const st={evidence:E.empty(NOW)};
  const a=observe(st,{id:'h-q',kind:'fields',fields:[f0,f1]},['a','b'],{register:reg,pres:'h1'});
  assert.deepEqual(a.fields.map(f=>f.verdict),['correct','held']);assert.deepEqual(a.fields.map(f=>f.indep),[true,false]);
  assert.equal(a.correct,false,'H-02: no full PASS from the remaining parts');assert.equal(a.full,false);assert.equal(a.held_n,1);
  // H-03: a new question-ID with the same disputed norm inherits the hold through derived_from.
  const b=observe(st,{id:'h-new',kind:'fields',derived_from:['fk:h-q#1'],fields:[f1]},['b'],{register:reg,pres:'h2'});
  assert.equal(b.fields[0].verdict,'held','H-03: hold inherited by dependency, not only by old ID');
  const c=observe(st,{id:'h-new2',kind:'fields',fields:[Object.assign({derived_from:'fk:h-q#1'},f1)]},['b'],{register:reg,pres:'h3'});
  assert.equal(c.fields[0].verdict,'held','H-03: field-level derived_from');
  // H-07: held field out of the denominator; never "mastered" while held.
  const sum=E.fieldSummary(st,['fk:h-q#0','fk:h-q#1'],{register:reg});
  assert.deepEqual([sum.total,sum.held,sum.denominator,sum.independent,sum.mastered],[2,1,1,1,false]);
  assert.deepEqual(plain(FR.holds()),[],'production register: no active HOLDs (Q4=A, OPEN-NORM-1=A)');
}
ok('H-02 held part graded «held», card never full PASS · H-03 hold inherited via derived_from · H-07 held left out of the denominator, never mastered');

// ── ST-07 / ST-09 ───────────────────────────────────────────────────
{
  const base=P.migrate(JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json')),NOW);
  const id=Object.keys(base.records)[0];assert.ok(id,'fixture has a record');
  const A=JSON.parse(JSON.stringify(base)),B=JSON.parse(JSON.stringify(base));
  A.records[id]=Object.assign({},A.records[id],{seen:9,last_seen:NOW-100,fsrs:Object.assign({},A.records[id].fsrs||{},{stability:3})});
  B.records[id]=Object.assign({},B.records[id],{seen:5,last_seen:NOW-50,fsrs:Object.assign({},B.records[id].fsrs||{},{stability:11})});
  const m=P.merge(A,B);
  assert.deepEqual(plain(m.records[id]),plain(B.records[id]),'core merge choice unchanged (later last_seen wins, no averaging)');
  const c=m.evidence.conflicts||[];assert.equal(c.length,1,'ST-07 conflict kept');
  assert.deepEqual([c[0].ns,c[0].key,c[0].status,c[0].chosen,c[0].local.seen,c[0].incoming.seen,c[0].local.stability,c[0].incoming.stability],['records',id,'unresolved','incoming',9,5,3,11]);
  assert.ok(c[0].provenance.local&&c[0].provenance.incoming&&'history_partial' in c[0]);
  const again=P.merge(m,B);assert.equal(again.evidence.conflicts.length,1,'no duplicate conflicts');
  const ahead=JSON.parse(JSON.stringify(base));ahead.records[id]=Object.assign({},ahead.records[id],{seen:20,last_seen:NOW});
  assert.equal((P.merge(base,ahead).evidence.conflicts||[]).length,0,'a plain update (strictly ahead) is not a conflict');
  assert.deepEqual(plain(P.migrate(JSON.parse(P.serialize(m)),NOW).evidence.conflicts),plain(m.evidence.conflicts),'conflicts survive save/load');
  // ST-09: one full pre-FREG snapshot of the exact stored bytes; restore offers it before older backups.
  assert.ok(/R7_FREG_SNAPSHOT=KEY\+'-before-r7-freg'/.test(appSrc));
  assert.ok(/const freg=window\.EvidenceState&&window\.EvidenceState\.FREG_ID;if\(freg&&!\(saved\.evidence&&saved\.evidence\.migrations&&saved\.evidence\.migrations\[freg\]\)&&!localStorage\.getItem\(R7_FREG_SNAPSHOT\)\)\{try\{localStorage\.setItem\(R7_FREG_SNAPSHOT,raw\);\}catch\{\}\}/.test(appSrc),'snapshot = raw bytes, taken once, write failure tolerated');
  assert.ok(/restoreBackup\(\)\{const data=localStorage\.getItem\(BACKUP\)\|\|localStorage\.getItem\(R7_FREG_SNAPSHOT\)\|\|localStorage\.getItem\(R7_SNAPSHOT\)/.test(appSrc));
  const raw=read('qa/fixtures/progress-r7/schema7-pre56-4-2-r10.json');const restored=P.migrate(JSON.parse(raw),NOW);
  const full=P.migrate(JSON.parse(raw),NOW);E.rollbackFreg(full);E.rollbackFreg(restored);
  assert.deepEqual(plain(restored),plain(full),'restore from snapshot rebuilds every namespace (records, skills, homework, evidence), not only FSRS');
  assert.equal(E.fingerprint(P.migrate(JSON.parse(raw),NOW)),E.fingerprint(JSON.parse(raw).schema===7?P.migrate(JSON.parse(raw),NOW):full),'FREG does not touch the core fingerprint');
}
ok('ST-07 diverged records: core choice unchanged, both sides + provenance kept as unresolved conflict · ST-09 full raw snapshot before FREG, restore offered first');

// ── Q6 evidence classes ─────────────────────────────────────────────
{
  // Q6-01: blocks 1–2 keep the fields contract; no support kinds and no bank there.
  for(const q of S.COURSE.questions)if(/^[12]-/.test(q.lessonId||''))assert.equal(q.kind==null||q.kind==='fields'||q.kind==='multi'||q.kind==='phrase',true,'Q6-01 '+q.id+' '+q.kind);
  const Schema=S.LessonV2Schema;const l21=JSON.parse(read('lessons/2-1/lesson.json'));l21.sources=JSON.parse(read('lessons/2-1/sources.json')).sources;
  assert.throws(()=>Schema.validate(Object.assign({},l21,{practice_bank:{items:[bank[0]]}})),/блоков 3–4/,'Q6-01 bank refused in block 2');
  assert.ok(JSON.parse(read('qa/freg/field-address-register-r7.json')).fields.filter(f=>f.bank12).every(f=>f.kind&&!['choice','tap-token','sort','word-bank','detect'].includes(f.kind)),'Q6-01 BANK12 rows stay field kinds');
  // Q6-02: real classifier buttons on e1-3-1-1 field 1 are choice evidence even inside kind fields.
  const q=Q.get('e1-3-1-1');assert.ok(/function classifierOptions\(f\)/.test(appSrc));
  const st={evidence:E.empty(NOW)};
  const a2=observe(st,q,q.fields.map(f=>f.answers[0]),{modes:q.fields.map((_,i)=>i===1?'choice':'typed'),pres:'q2'});
  assert.deepEqual([a2.fields[1].resp,a2.fields[1].cls,a2.fields[1].indep,a2.fields[1].key],['choice','choose_variant',false,'fk:e1-3-1-1#1'],'Q6-02/05');
  assert.deepEqual([a2.fields[0].cls,a2.fields[0].indep,a2.fields[0].key,a2.fields[0].ks],['build',true,'fk:e1-3-1-1#0','ok'],'Q6-06 build');
  // Q6-03/04: bank kinds survive schema→runtime and are graded by stable option-IDs, not by button index.
  const ch=bank.find(x=>x.kind==='choice');assert.ok(ch.payload&&ch.fields.length===0&&RK.markup(ch).includes('data-rk-toggle="'+ch.payload.accepted[0]+'"'));
  const shuffled=Object.assign({},ch,{payload:Object.assign({},ch.payload,{options:ch.payload.options.slice().reverse()})});
  assert.equal(core.evaluate(shuffled,ch.payload.accepted).correct,true,'Q6-04 option order does not matter');
  assert.equal(core.evaluate(ch,ch.payload.options.filter(o=>!ch.payload.accepted.includes(o.id)).slice(0,1).map(o=>o.id)).correct,false);
  const ca=observe(st,ch,ans(ch),{pres:'c1'});assert.deepEqual([ca.kind,ca.fields[0].cls,ca.fields[0].indep],['choice','choose',false],'Q6-04 correct choice is not build');
  // Q6-07: wrong first, right retry in the same presentation.
  const t={id:'q7',kind:'fields',fields:[{label:'Ответ',kind:'text',answers:['келді']}]};
  const s7={evidence:E.empty(NOW)};
  observe(s7,t,['келде'],{pres:'p7'});const r7=observe(s7,t,['келді'],{pres:'p7',first:false});
  assert.deepEqual([r7.first,r7.fields[0].cls,r7.fields[0].indep],[false,'retry',false]);
  const ex7=E.exposure(s7,'q7');assert.deepEqual([ex7.first_try_correct,ex7.later_correct,ex7.attempts],[false,true,2],'Q6-07 miss and learning kept apart');
  const again7=observe(s7,t,['келді'],{pres:'p7'});assert.equal(again7.first,false,'re-showing the same presentation is not a new first try');
  const late=observe(s7,t,['келді'],{pres:'p7-later'});assert.deepEqual([late.first,late.fields[0].indep],[true,true],'a later separate presentation is a separate control');
  assert.equal(E.firstTry(s7,'q7').correct,false,'first_try_correct is not rewritten');
  assert.ok(/presentation:typeof presented==='string'\?presented:''/.test(appSrc)&&/event:\{id:'retry:'\+q\.id\+':'\+at,at,hinted\}/.test(appSrc),'app passes the presentation token and records retries');
  // Q6-08: hint then a clean answer in the same presentation → solved_with_help; exposure kept.
  const s8={evidence:E.empty(NOW)};
  observe(s8,t,['келді'],{pres:'p8',event:{hinted:true}});const r8=observe(s8,t,['келді'],{pres:'p8',first:false});
  assert.deepEqual([r8.fields[0].cls,r8.fields[0].indep],['solved_with_help',false]);
  observe(s8,t,[''],{pres:'p8b',reveal:true});
  const ex8=E.exposure(s8,'q7');assert.deepEqual([ex8.ever_helped,ex8.answer_revealed],[true,true],'Q6-08 exposure is not erased');
  // Q6-09 word-bank / Q6-10 tap-token / Q6-11 sort / Q6-12/13 detect
  const wb=bank.find(x=>x.kind==='word-bank'&&x.payload.accepted[0].length>=3);
  const wa=observe(st,wb,ans(wb),{pres:'w'});assert.deepEqual([wa.correct,wa.fields[0].cls,wa.fields[0].indep],[true,'assemble',false],'Q6-09 assembly is not unaided');
  assert.equal(core.evaluate(wb,ans(wb).slice().reverse()).correct,false,'Q6-09 sequence matters');
  const tap={id:'tt',kind:'tap-token',lessonId:'3-1',payload:RK.normalize('tap-token',{tokens:[{id:'t1',text:'кітап'},{id:'t2',text:'кітап'},{id:'t3',text:'қалам'}],accepted:[['t2']]})};
  assert.equal(core.evaluate(tap,['t1']).correct,false,'Q6-10 the chosen occurrence is graded, not the first string match');assert.equal(core.evaluate(tap,['t2']).correct,true);
  const so=bank.find(x=>x.kind==='sort'&&Object.keys(x.payload.accepted).length>=4);
  const full=ans(so),partial=full.slice(0,full.length-1);const [i0,c0]=full[0].split('=');const other=so.payload.categories.find(c=>c.id!==c0).id;const wrongOne=[i0+'='+other,...full.slice(1)];
  assert.equal(core.evaluate(so,full).correct,true);assert.equal(core.evaluate(so,partial).correct,false,'Q6-11 gaps are not correct');
  const sp=core.evaluate(so,wrongOne);assert.equal(sp.correct,false);assert.equal(sp.parts.filter(Boolean).length,full.length-1,'Q6-11 per-item diagnostics');
  const so2=observe(st,so,full,{pres:'s'});assert.equal(so2.fields[0].cls,'classify','Q6-16 classification stays classification');assert.ok(so2.fields.every(f=>!f.indep));
  const dw=bank.find(x=>x.kind==='detect'&&x.payload.verdict.accepted==='wrong');
  const wrongStep=dw.payload.broken_step.options.find(o=>!dw.payload.broken_step.accepted.includes(o.id)).id;
  const d12=core.evaluate(dw,['verdict:wrong','step:'+wrongStep]);assert.deepEqual([d12.correct,...d12.parts],[false,true,false],'Q6-12 right verdict + wrong step ≠ correct');
  const dc=bank.filter(x=>x.kind==='detect'&&x.payload.verdict.accepted==='correct');
  assert.ok(B34.every(l=>dc.some(x=>x.lessonId===l)),'Q6-13 every bank lesson has a correct control item');
  for(const x of dc){assert.equal(core.evaluate(x,['verdict:correct']).correct,true,'Q6-13 '+x.id);assert.ok(!x.payload.broken_step,'no invented broken step');}
  // Q6-14 several fields → per-field verdicts; Q6-15 mixed card keeps one evidence per mode.
  const two={id:'q14',kind:'fields',fields:[{label:'1',kind:'text',answers:['жаздым']},{label:'2',kind:'text',answers:['жаздық']}]};
  const a14=observe(st,two,['жаздым','жазмық'],{pres:'14'});assert.deepEqual(a14.fields.map(f=>f.verdict),['correct','incorrect']);assert.equal(a14.correct,false);
  const a15=observe(st,Object.assign({},two,{id:'q15'}),['жаздым','жаздық'],{modes:['typed','choice'],pres:'15'});
  assert.deepEqual(a15.fields.map(f=>[f.resp,f.cls,f.indep]),[['typed','build',true],['choice','choose_variant',false]],'Q6-15 card correct does not lend production to the chosen part');
  // Q6-17 transfer is never new-word evidence; neither are bank/support answers.
  const tr=observe(st,Object.assign({},t,{id:'q17',transfer:true}),['келді'],{pres:'17'});
  assert.equal(tr.transfer,true);assert.equal(E.newWordEvidence(tr),false);assert.equal(E.newWordEvidence(ca),false);assert.equal(E.newWordEvidence(late),true);
  // Q6-18 listening without audio → unsupported, text fallback only.
  const li=observe(st,{id:'q18',kind:'fields',modality:'listen',fields:[{label:'Что слышно?',kind:'text',answers:['ел']}]},['ел'],{pres:'18'});
  assert.deepEqual([li.status,li.fields[0].cls,li.fields[0].indep,li.full],['unsupported','text_fallback',false,false]);
  const l31=JSON.parse(read('lessons/3-1/lesson.json'));l31.sources=JSON.parse(read('lessons/3-1/sources.json')).sources;
  const pb=JSON.parse(read('lessons/3-1/practice-bank.json'));
  assert.throws(()=>Schema.validate(Object.assign({},l31,{practice_bank:{items:[Object.assign({},pb.items[0],{id:'b34-31-x',modality:'listen'})]}})),/аудио/,'Q6-18 bank refuses listening');
  assert.throws(()=>Schema.validate(Object.assign({},l31,{practice_bank:{items:[Object.assign({},pb.items[0],{id:'b34-31-x',audio:'a.mp3'})]}})),/аудио/);
  // Q6-19 FreePractice stays separate.
  S.localStorage.setItem('qazaqsha.freePractice.v1',JSON.stringify({history:[{id:'e1-3-1-1',correct:true,supportLevel:0}]}));
  const st19={evidence:E.empty(NOW)};assert.deepEqual(plain(E.byOrigin(st19)).bank.attempts,0);
  for(const f of ['evidence-state.js','field-register.js','homework.js','lesson-v2-runtime.js'])assert.ok(!/freePractice/i.test(read(f)),'Q6-19 '+f+' never reads FreePractice');
}
ok('Q6-01…19: fields contract in blocks 1–2, choice evidence for shown buttons, stable option/token IDs, retry/help/reveal kept per presentation, word-bank/sort/detect partials, per-field verdicts, transfer/listen/FreePractice isolation');

// ── Bank content + Q5-14 (full) ─────────────────────────────────────
{
  assert.ok(bank.length>=65,'bank size '+bank.length);
  const allHw=new Set(LESSONS.flatMap(l=>(R.homework(l)&&R.homework(l).homework.exercise_ids)||[]));
  const school=new Set(S.COURSE.questions.filter(q=>!q.bank).map(q=>q.id));
  const groups=['choice','tap','sort','build','detect'];
  for(const l of B34){
    const rows=bank.filter(q=>q.lessonId===l);assert.ok(rows.length>=12,l);
    for(const g of groups)assert.ok(rows.some(q=>q.group===g),l+' has '+g);
    const kept=R.byId(l);assert.equal(kept.practice_bank.homework_intersection,0);assert.equal(kept.practice_bank.ids.length,rows.length);
    for(const g of groups){const tr=S.LEARNING.lessons.find(x=>x.id==='b34-track-'+l+'-'+g);assert.ok(tr&&tr.topic==='bank'&&tr.courseLesson===l&&tr.questionIds.length,'hub track '+l+' '+g);}
  }
  const L07=/(^|[^а-яәғқңөұүһі])(оқ[ыиу]|есті|ести|есту)/i,PART=/(^|\s)(да|де|та|те)(\s|$|[?.!,])/i;
  for(const q of bank){
    assert.ok(/^b34-(31|32|33|41|42)-(choice|tap|sort|build|detect)-\d\d$/.test(q.id),q.id);
    assert.ok(!allHw.has(q.id)&&!school.has(q.id),'Q5-14 bank id never replaces a homework/school id '+q.id);
    assert.equal(q.origin,'bank');assert.ok(q.source_ref,'source_ref '+q.id);assert.ok(['choice','tap-token','sort','word-bank','detect'].includes(q.kind));
    assert.ok(!q.audio&&q.modality!=='listen');
    const text=JSON.stringify([q.stimulus,q.payload,q.explanation]);
    assert.ok(!L07.test(text.replace(/"[a-z_]+":/g,' ')),'L-07 (оқу/есту) not in bank: '+q.id);
    const kk=[q.payload.target||'',...(q.payload.options||[]).map(o=>o.text),...(q.payload.tokens||[]).map(o=>o.text),...(q.payload.items||[]).map(o=>o.text),...(q.payload.pieces||[]).map(o=>o.text)].join(' | ');
    assert.ok(!PART.test(kk),'да/де particle not in bank: '+q.id);
    assert.ok(!/жап|жаб|істеріңыз/.test(kk),'avoided items: '+q.id);
    assert.equal(core.evaluate(q,ans(q)).correct,true,'accepted answer grades correct '+q.id);
  }
  // origins stay apart in attempts and reports
  const st={evidence:E.empty(NOW)};
  observe(st,bank[0],ans(bank[0]),{origin:'bank',pres:'b0'});
  const hwq=Q.get(R.homework('4-2').homework.exercise_ids[0]);observe(st,hwq,hwq.fields.map(f=>f.answers[0]),{origin:'homework',pres:'h0'});
  const rep=plain(E.byOrigin(st));assert.deepEqual([rep.bank.attempts,rep.homework.attempts,rep.bank.questions,rep.homework.questions],[1,1,[bank[0].id],[hwq.id]]);
  // bank reachable only through its own tracks
  assert.ok(/if\(q\.bank===true\)return false;/.test(grab(appSrc,'eligible')),'eligible() excludes bank');
  assert.ok(/q\.bank\|\|!\(q\.ruleIds\|\|\[\]\)\.includes\(ruleId\)/.test(grab(appSrc,'tryRule')),'tryRule excludes bank');
  for(const l of B34){const rid=(R.byId(l).rules[0]||{}).id;assert.ok(R.practiceForRule(l,rid,50).every(id=>!/^b34-/.test(id)),'practiceForRule '+l);}
  assert.ok(/origin:q\.bank&&!homeworkMode\?'bank':evidenceOrigin\(homeworkMode,voluntary\)/.test(appSrc),'bank answers carry origin bank');
  assert.ok(/bank:'Банк заданий'/.test(learnSrc));
  for(const l of B34)for(const id of R.homework(l).homework.exercise_ids)assert.ok(!/^b34-/.test(id));
}
ok('bank 3–4: ≥65 support-kind items in 5 groups per lesson, origin bank + source_ref, no L-07 / particle / avoided forms, all gradable; Q5-14 ids, attempts and reports stay apart; bank only via its hub tracks');

// ── 2b decisions 1 + 3: new word cards, button everywhere ───────────
{
  const added=S.COURSE.questions.filter(q=>/^v2-(1-2|2-1|3-1)-hw-/.test(q.id));
  assert.equal(added.length,2*(1+23+6),'2 cards per word: 1-2 он, 2-1 ×23, 3-1 ×6');
  assert.ok(added.every(q=>q.wordRole==='must'&&q.vocabIds.length===1&&q.topic==='vocab'),'bound must cards');
  assert.ok(added.every(q=>!FR.registered(q.id)),'new IDs (not FREG fields of older cards)');
  const pre=JSON.parse(read('qa/fixtures/progress-r7/schema7-pre56-4-2-r10.json'));
  assert.ok(added.every(q=>!(q.id in (pre.records||{}))),'no old record is re-used');
  assert.ok(Q.get('v2-2-1-vocab-aqyldy-ru')&&Q.get('v2-2-1-vocab-aqyldy-ru').origin==='school'&&!Q.get('v2-2-1-vocab-aqyldy-ru').vocabIds,'the old school card is unchanged (same id, same data)');
  const lem=l=>plain(added.filter(q=>q.lessonId===l&&/-ru$/.test(q.id)).map(q=>q.stimulus));
  assert.deepEqual(lem('1-2'),['он']);assert.deepEqual(lem('3-1').sort(),['бұл','кім','не','нешінші','қай','қандай'].sort());
  for(const l of LESSONS){const c=plain(R.homeworkWordCoverage(l));assert.equal(c.complete,true,'coverage '+l);}
  // F4 hide lifts: homeworkWordsTrack only returns false on incomplete coverage.
  const box={};const tracks=[];
  vm.runInNewContext(grab(appSrc,'homeworkWordsTrack')+'\nbox.f=homeworkWordsTrack;',{box,window:S,HW_WORDS_PREFIX:'hw-words-',ensureV2:id=>R.ensure(id),byId:Q,String,Array,Set,Object,JSON});
  for(const l of LESSONS){const v=box.f(l);assert.ok(v&&v.homeworkWords&&v.questionIds.length>=plain(R.homeworkWordCoverage(l)).total,'words button shown in '+l);tracks.push([l,v.questionIds.length]);}
  const n=Object.fromEntries(tracks);assert.ok(n['1-2']>=48&&n['2-1']>=48&&n['3-1']>=36,'1-2/2-1/3-1 tracks carry the new cards '+JSON.stringify(n));
  assert.ok(/hwOwn/.test(rtSrc)&&/-hw-'\+slug/.test(rtSrc));
}
ok('decision 3: 60 new-ID cards (1-2 он, 2-1 ×23, 3-1 six question words); old cards/records untouched; coverage complete in all 11 lessons → F4 hide lifts, decision 1 button everywhere');

// ── decision 2: қалайсың N из 4 line ────────────────────────────────
{
  const box={},state={evidence:E.empty(NOW)};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  vm.runInNewContext(grab(appSrc,'homeworkFormLines')+'\nbox.f=homeworkFormLines;',{box,window:{EvidenceState:E},state,esc,Object});
  assert.equal(box.f('4-1'),'');
  assert.ok(box.f('4-2').includes('data-hw-forms="vocab:4-2:qalaisyn">қалайсың: 0 из 4 форм самостоятельно.'),box.f('4-2'));
  for(const f of E.FORM_REQUIREMENTS['vocab:4-2:qalaisyn'].forms)observe(state,{id:'fx:'+f,kind:'fields',lessonId:'4-2',fields:[{label:'Ответ',kind:'text',answers:[f]}]},[f],{pres:'f:'+f});
  assert.ok(box.f('4-2').includes('қалайсың: 4 из 4 форм самостоятельно.'));
  assert.ok(appSrc.includes('${wordLine}.${listNote}${homeworkFormLines(pack.lesson_id)} <button'),'one short line at the homework words item');
}
ok('decision 2: «қалайсың: N из 4 форм самостоятельно.» at the 4-2 homework words item (W-2 strict count)');

// ── казакша (a) translation line on check cards · (b) «Напиши все формы» out of homework ──
{
  const box={};vm.runInNewContext(grab(appSrc,'translationGivesAnswer')+'\nbox.f=translationGivesAnswer;',{box,core,String});
  const syn=Q.get('hw32-21-ru');assert.equal(syn.translation,'класс');assert.equal(box.f(syn),true,'(a) сынып · класс is the answer → hidden before answering');
  assert.equal(box.f({translation:'вспомогательно',fields:[{answers:['другое']}]}),false,'a translation that is not the answer stays visible');
  assert.ok(appSrc.includes('${q.translation&&!translationGivesAnswer(q)?`<span class="translation" lang="ru">'),'(a) render guard');
  assert.ok(R.homework('3-2').homework.word_question_ids.includes('hw32-21-ru'));
  const h=plain(R.homework('4-2').homework.word_question_ids);
  assert.ok(!h.includes('v2-4-2-vocab-qalaisyn-kk-set'),'(b) combined card left the homework queue');
  assert.ok(Q.get('v2-4-2-vocab-qalaisyn-kk-set'),'…but stays as practice (no id removed, old records valid)');
  for(let i=1;i<=4;i++){assert.ok(h.includes('v2-4-2-vocab-qalaisyn-ru-'+i));assert.ok(h.includes('v2-4-2-vocab-qalaisyn-kk-form-'+i));}
  assert.ok(h.includes('v2-4-2-vocab-suiu-kk-set'),'a word without form checks keeps its all-forms card');
  assert.equal(h.length,39);
}
ok('казакша (a) a check card never shows its answer as the translation line (64 cards hw31–33) · (b) qalaisyn «Напиши все формы» leaves homework (4+4 stay), 4-2 queue 39');

// ── words counter = homework.word_ids in every lesson (2-2 сау бол… cards bound to several words) ──
{
  const box={},records={};
  vm.runInNewContext(grab(appSrc,'answeredSet')+'\n'+grab(appSrc,'wordGroupCounter')+'\nbox.f=wordGroupCounter;',{box,records,byId:Q,window:S,state:{events:[],homeworkAttempts:{}}});
  const got={};for(const l of LESSONS){const h=R.homework(l).homework;got[l]=[box.f(plain(h.word_question_ids)).total,h.word_ids.length];}
  for(const [l,[a,b]] of Object.entries(got))assert.equal(a,b,'counter denominator '+l+' '+JSON.stringify(got));
  assert.equal(got['2-2'][0],14);assert.equal(got['1-2'][0],24);assert.equal(got['2-1'][0],24);assert.equal(got['3-1'][0],18);
}
ok('words-track counter denominator = homework.word_ids in all 11 lessons (2-2: 14 with the сау бол… cards)');

console.log('R7_STEP2B_BANK_FREG_OK',passed);
