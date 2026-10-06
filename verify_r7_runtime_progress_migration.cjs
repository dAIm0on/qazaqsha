#!/usr/bin/env node
'use strict';
/* r7 step 1: runtime evidence + additive progress migration.
   Fixtures in qa/fixtures/progress-r7 are synthetic OLD progress (no real learner data).
   _golden-base-8d6b032.json = output of progress.migrate/merge from main 8d6b032 (before r7) with the same NOW.
   Every pre-existing namespace must stay byte-identical; r7 only adds state.evidence. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('./progress.js'),E=require('./evidence-state.js'),Schema=require('./lesson-v2-schema.js');
const dir=path.join(__dirname,'qa','fixtures','progress-r7');
const golden=JSON.parse(fs.readFileSync(path.join(dir,'_golden-base-8d6b032.json'),'utf8'));
const NOW=golden.now,D=86400000;
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};
const load=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'));
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
const plain=v=>stable(JSON.parse(JSON.stringify(v)));
const core=s=>{const c=plain(s);delete c.evidence;delete c.preExam;if(c.courseProgress&&c.courseProgress.lessons){for(const id of ['5-1'])delete c.courseProgress.lessons[id];}return c;}; // additive lessons after golden base
const names=Object.keys(golden.migrate);
assert.equal(golden.base_commit,'8d6b032b1629900f43cc19d5dc01985a8b343d93');
assert.ok(names.length>=4);

// A. Non-destructive: everything the previous build produced is unchanged.
for(const n of names){const m=P.migrate(load(n),NOW);assert.deepEqual(core(m),golden.migrate[n],n+': pre-existing namespaces changed');assert.equal(m.schema,7);}
{const m=P.merge(P.migrate(load('schema4-early-learner'),NOW),P.migrate(load('schema7-lesson-4-2-homework'),NOW));assert.deepEqual(core(m),golden.merge['schema4+schema7']);}
ok('migrate/merge of old fixtures keep every pre-r7 namespace identical to main 8d6b032');

// B. Marker + legacy facts; the old aggregate is never turned into 4/4.
const raw42=load('schema7-lesson-4-2-homework');
const m1=P.migrate(raw42,NOW);
const mk=m1.evidence.migrations[E.MIGRATION_ID];
assert.ok(mk&&mk.at===NOW&&mk.from_schema===7&&mk.history_partial===true&&mk.fresh===false&&/^[0-9a-f]{8}$/.test(mk.input_fp));
assert.equal(m1.evidence.v,1);
assert.deepEqual(plain(m1.evidence.legacy.homework['4-2']),{checklist_words:true,submitted_at:raw42.homeworkAttempts['4-2'].submitted_at,items_n:1,status:'insufficient_evidence'});
assert.equal(m1.evidence.legacy.forms['vocab:4-2:qalaisyn'].status,'insufficient_evidence');
assert.ok(m1.evidence.legacy.forms['vocab:4-2:qalaisyn'].prior_events_n>=1);
let st=E.formStatus(m1,'vocab:4-2:qalaisyn');
assert.equal(st.done,0);assert.equal(st.full_credit,false);assert.equal(st.legacy_status,'insufficient_evidence');
assert.deepEqual(m1.evidence.attempts,[]);
assert.equal(m1.homeworkAttempts['4-2'].checklist.words,true,'old checklist fact kept as is');
ok('one-time marker, legacy aggregates kept as insufficient evidence, W-2 not credited from old completed');

// C. Idempotent (ST-08): re-running adds nothing and keeps the first marker.
const m2=P.migrate(JSON.parse(P.serialize(m1)),NOW+D),m3=P.migrate(JSON.parse(P.serialize(m2)),NOW+2*D);
assert.deepEqual(plain(m2.evidence),plain(m1.evidence));assert.deepEqual(plain(m3.evidence),plain(m1.evidence));
assert.equal(m3.events.length,m1.events.length);assert.equal(m3.errors.length,m1.errors.length);
assert.deepEqual(plain(m3.records),plain(m1.records));assert.deepEqual(plain(m3.skills),plain(m1.skills));assert.deepEqual(plain(m3.homeworkAttempts),plain(m1.homeworkAttempts));
assert.equal(E.fingerprint(m3),E.fingerprint(m1));
ok('migration is idempotent: same marker, no extra events/errors, same fingerprint');

// D. Rollback-safe: dropping the namespace returns exactly the old state; schema stays 7 for older builds.
{const rolled=plain(E.rollback(P.migrate(raw42,NOW)));delete rolled.preExam;if(rolled.courseProgress&&rolled.courseProgress.lessons)delete rolled.courseProgress.lessons['5-1'];assert.deepEqual(rolled,golden.migrate['schema7-lesson-4-2-homework']);}
const exported=JSON.parse(P.serialize(m1));assert.equal(exported.schema,7);assert.equal(exported.app,'qazaq-trainer');assert.ok(exported.evidence);
assert.doesNotThrow(()=>P.validate(P.serialize(m1),new Set(Object.keys(m1.records))));
ok('rollback = drop state.evidence (old state byte-identical); export stays schema 7 for previous builds');

// E. Corrupt evidence never throws and never touches core state.
const mc=P.migrate(load('schema7-corrupt-evidence'),NOW);
assert.deepEqual(core(mc),golden.migrate['schema7-corrupt-evidence']);
assert.equal(mc.evidence.attempts.length,1);assert.equal(mc.evidence.attempts[0].id,'ok-1');assert.deepEqual(mc.evidence.attempts[0].fields,[]);assert.deepEqual(mc.evidence.attempts[0].forms,[]);
assert.equal(Object.getPrototypeOf(mc.evidence.forms),null);assert.equal(Object.keys(mc.evidence.forms).includes('__proto__'),false);
assert.deepEqual(Object.keys(mc.evidence.forms['vocab:4-2:qalaisyn']['қалайсыз'].keys),['produce|single']);
assert.equal(mc.evidence.forms['vocab:4-2:qalaisyn']['қалайсыз'].keys['produce|single'].indep_at,null);
assert.ok(mc.evidence.migrations[E.MIGRATION_ID]);
ok('hostile/corrupt evidence is sanitized; core state unchanged');

// F. Evidence written by a newer build passes through untouched.
const rawF=load('schema7-future-evidence-v2'),mf=P.migrate(rawF,NOW);
assert.deepEqual(plain(mf.evidence),plain(rawF.evidence));
assert.equal(E.observe(mf,{q:{id:'x',kind:'fields',fields:[{answers:['a'],kind:'text'}]},answers:['a'],result:{correct:true,parts:[true]},event:{id:'e1',at:NOW}}),null);
assert.deepEqual(plain(P.merge(mf,m1).evidence),plain(rawF.evidence));
ok('future evidence version is preserved, never downgraded or written to');

// Real lesson questions through the real v2 runtime.
const ctx={window:{}};ctx.window.window=ctx.window;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8'),ctx);
const compiled=ctx.window.LESSON_V2_COMPILED;assert.ok(Array.isArray(compiled)&&compiled.length>=10);
function runtime(list){
  // r7 51: draft-gate hides non-released on public hosts; verify installs all under localhost QA bypass.
  const mock={location:{hostname:'localhost'},LessonV2Schema:Schema,LESSON_V2_COMPILED:list,COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){let w=this.words.find(x=>x.kazakh===kazakh);if(!w){w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);}return w;}},
    CourseProgress:{registerStages(){return [];}},Canonical:null};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),{window:mock,globalThis:mock,console});
  return mock;
}
const rt=runtime(JSON.parse(JSON.stringify(compiled)));rt.LessonV2Runtime.installAll();
const Q=new Map(rt.COURSE.questions.map(q=>[q.id,q]));

// G. Q5-A runtime reader: homework word queue follows homework.word_ids through recorded bindings.
let lessonsChecked=0;
for(const raw of compiled){
  const id=raw.lesson_id,h=rt.LessonV2Runtime.homework(id);if(!h||!rt.LessonV2Runtime.byId(id))continue;
  // r7 2b (казакша b): the combined «all forms» card of a word with per-form checks is not in the homework queue.
  const formWords=new Set(rt.COURSE.questions.filter(q=>q.lessonId===id&&q.formCheck).flatMap(q=>q.vocabIds||[]));
  const before=rt.COURSE.questions.filter(q=>q.lessonId===id&&q.topic==='vocab'&&q.wordRole==='must'&&!(/-kk-set$/.test(q.id)&&(q.vocabIds||[]).some(w=>formWords.has(w)))).map(q=>q.id);
  assert.deepEqual(h.homework.word_question_ids,before,id+': word queue changed with unchanged data');
  lessonsChecked++;
}
assert.ok(lessonsChecked>=10);
const L42=JSON.parse(fs.readFileSync(path.join(__dirname,'lessons','4-2','lesson.json'),'utf8'));
const T13=['vocab:4-2:oilau','vocab:4-2:oinau','vocab:4-2:senu','vocab:4-2:kutu','vocab:4-2:aitu','vocab:4-2:qoiu','vocab:4-2:suiu','vocab:4-2:oqu','vocab:4-2:estu','vocab:4-2:qalai','vocab:4-2:qalaisyn','vocab:4-2:bari','vocab:4-2:raqmet'];
const R10=['vocab:4-2:tusinu','vocab:4-2:baru','vocab:4-2:zhuru','vocab:4-2:zhatu','vocab:4-2:otyru','vocab:4-2:turu','vocab:4-2:ashu','vocab:4-2:zhabu','vocab:4-2:tigu','vocab:4-2:da'];
assert.equal(T13.length,13);assert.equal(new Set(T13).size,13);
assert.deepEqual(L42.homework.word_ids,T13,'r7 step 2: 4-2 homework.word_ids = T13 exactly (Q5-01)');
assert.equal(L42.vocabulary.length,23,'all 23 vocabulary objects kept');
const p42=rt.LessonV2Runtime.byId('4-2');
assert.equal(new Set(Object.keys(p42.vocab_bindings)).size,23);
const t13q=rt.LessonV2Runtime.homeworkWordQuestionIds('4-2',T13,p42.vocab_bindings,rt.COURSE.questions);
const r10words=new Set(R10.map(id=>p42.vocab_bindings[id]));
assert.ok(t13q.length>0);
assert.ok(t13q.every(id=>!(Q.get(id).vocabIds||[]).some(w=>r10words.has(w))),'R10 must not enter the 4-2 word queue under T13');
const qalWord=p42.vocab_bindings['vocab:4-2:qalaisyn'];
const qalQs=rt.COURSE.questions.filter(q=>q.lessonId==='4-2'&&(q.vocabIds||[]).includes(qalWord)).map(q=>q.id);
// r7 2b (b): every қалайсың card is in the T13 queue except the combined «all forms» duplicate.
assert.ok(qalQs.length>=1&&qalQs.filter(id=>!/-kk-set$/.test(id)).every(id=>t13q.includes(id))&&!t13q.includes('v2-4-2-vocab-qalaisyn-kk-set'));
assert.equal(rt.CURRICULUM.words.filter(w=>w.id===qalWord).length,1,'qalaisyn stays one catalog word');
ok('Q5-A reader: same queues on current data for '+lessonsChecked+' lessons; T13 fixture excludes R10, keeps qalaisyn as one id');

// H. Field evidence (Q6-B): real response mode, choice is never independent input.
const typedQ={id:'fixture:typed',kind:'fields',lessonId:'4-2',fields:[{label:'Ответ',kind:'text',answers:['келдім']},{label:'Ряд',kind:'text',answers:['мягкий']}]};
let s=P.empty();
const at0=NOW+10*D;
let a=E.observe(s,{q:typedQ,answers:['келдім','мягкий'],result:{correct:true,parts:[true,true]},event:{id:'e:t1',at:at0},responseModes:['typed','choice'],origin:'bank'});
assert.deepEqual(a.fields.map(f=>[f.resp,f.alts,f.verdict,f.indep]),[['typed',false,'correct',true],['choice',true,'correct',false]]);
a=E.observe(s,{q:typedQ,answers:['келдім','мягкий'],result:{correct:true,parts:[true,true]},event:{id:'e:t2',at:at0+1,hinted:true},responseModes:['typed','typed'],origin:'homework'});
assert.deepEqual(a.fields.map(f=>f.indep),[false,false]);assert.equal(a.origin,'homework');
a=E.observe(s,{q:typedQ,answers:['',''],result:{correct:false,parts:[false,false]},event:{id:'e:t3',at:at0+2},revealed:true,responseModes:['typed','typed']});
assert.equal(a.reveal,true);assert.deepEqual(a.fields.map(f=>f.indep),[false,false]);
const multiQ={id:'fixture:multi',kind:'multi',options:['a','b'],correct:['a']};
a=E.observe(s,{q:multiQ,answers:['a'],result:{correct:true,parts:[true,true]},event:{id:'e:t4',at:at0+3}});
assert.deepEqual(a.fields.map(f=>[f.resp,f.indep]),[['choice',false]]);
assert.equal(E.observe(s,{q:typedQ,answers:['келдім','мягкий'],result:{correct:true,parts:[true,true]},event:{id:'e:t1',at:at0}}),null,'same event twice is ignored');
assert.equal(s.evidence.attempts.length,4);
assert.equal(s.evidence.attempts[0].fields[0].fp,E.fieldFingerprint(typedQ.fields[0]));
ok('field evidence keeps response mode, help, reveal, origin and a stable field fingerprint; choice never independent');

// H2. Response mode comes from the control the page actually renders (Q6-02: e1-3-1-1 has tap buttons inside fields).
{
  const appSrc=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const grab=name=>{const i=appSrc.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=appSrc.indexOf('\n function ',i+5);return appSrc.slice(i,j);};
  const l11=compiled.find(x=>x.lesson_id==='1-1'),q11=JSON.parse(JSON.stringify(l11.original_exercises.find(x=>x.id==='e1-3-1-1')||null));assert.ok(q11);
  const box={};
  vm.runInNewContext(grab('supportKind')+grab('classifierOptions')+grab('answerMarkup')+grab('responseModes')+'\nbox.markup=answerMarkup(q);document.markup=box.markup;box.modes=responseModes(q);',{
    box,q:{...q11,kind:'fields'},esc:v=>String(v??''),window:{ResponseKinds:require('./response-kinds.js')},
    document:{markup:'',getElementById(id){const m=this.markup.match(new RegExp('<input id="'+id+'"[^>]*type="(\\w+)"'));return m?{type:m[1]}:null;}}
  });
  assert.deepEqual(JSON.parse(JSON.stringify(box.modes)),['typed','choice','choice','choice','choice']);
  box.modes=JSON.parse(JSON.stringify(box.modes));
  const ss=P.empty(),core=require('./core.js'),ans=q11.fields.map(f=>f.answers[0]);
  const rec=E.observe(ss,{q:q11,answers:ans,result:core.evaluate(q11,ans),event:{id:'e11',at:NOW},responseModes:box.modes,origin:'lesson'});
  assert.deepEqual(rec.fields.map(f=>f.indep),[true,false,false,false,false],'tap answers are choice evidence, not independent input');
}
ok('response mode is read from the rendered control: tap buttons inside fields are recorded as choice');

// I. W-2=C on real 4-2 cards + single-form fixtures (fixtures are not bank or homework items).
const req=E.FORM_REQUIREMENTS['vocab:4-2:qalaisyn'];
assert.deepEqual(Object.keys(E.FORM_REQUIREMENTS),['vocab:4-2:qalaisyn']);
assert.deepEqual([...req.forms],L42.vocabulary.find(v=>v.id==='vocab:4-2:qalaisyn').forms,'forms come from the lesson data');
assert.equal(/\u0301/.test(fs.readFileSync(path.join(__dirname,'evidence-state.js'),'utf8')),false,'no stress marks');
s=P.empty();let t=NOW+20*D;
const answerAll=(q,answers,extra={})=>E.observe(s,{q,answers,result:require('./core.js').evaluate(q,answers),event:{id:'ev:'+(++t)+':'+q.id,at:t,...(extra.event||{})},responseModes:extra.modes||(q.fields||[]).map(()=>'typed'),revealed:!!extra.reveal,origin:'bank'});
for(let i=1;i<=4;i++){const q=Q.get('v2-4-2-vocab-qalaisyn-ru-'+i);assert.ok(q,'real recognition card '+i);answerAll(q,[q.fields[0].answers[0]]);}
st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.done,0);assert.ok(st.forms.every(f=>f.seen['recognize|single'].independent===0&&f.seen['recognize|single'].with_help===1),'W-2 final: recognition is support practice');
const set=Q.get('v2-4-2-vocab-qalaisyn-kk-set');assert.ok(set);answerAll(set,[req.forms.join(' ')]);
st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.done,0,'one combined answer is not four separate checks');assert.ok(st.forms.every(f=>f.seen['produce|set'].independent===0&&f.seen['produce|set'].with_help===1),'W-2 final: combined all-4 is support practice');
const single=f=>({id:'fixture:w2:'+f,kind:'fields',lessonId:'4-2',stimulus:'Как дела?',fields:[{label:'Ответ',kind:'text',answers:[f]}]});
answerAll(single('қалайсың'),['қалайсың']);
answerAll({id:'fixture:w2:sentence',kind:'fields',lessonId:'4-2',fields:[{label:'Фраза',kind:'text',answers:['Сендер қалайсыңдар?']}]},['Сендер қалайсыңдар']);
answerAll(single('қалайсыз'),['қалайсыз']);
st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.done,3);assert.equal(st.full_credit,false);
answerAll(single('қалайсыздар'),['қалайсыздар'],{event:{hinted:true}});
answerAll(single('қалайсыздар'),['қалайсыздар'],{modes:['choice']});
answerAll(single('қалайсыздар'),['қалайсыз']);
answerAll(single('қалайсыздар'),[''],{reveal:true});
st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.full_credit,false,'help/choice/wrong/reveal never complete a form');
assert.deepEqual(st.forms[3].seen['produce|single'],{independent:0,with_help:2,wrong:2});
const firstAt=st.forms[0].independent_at;
answerAll(single('қалайсыздар'),['қалайсыздар']);
st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.done,4);assert.equal(st.full_credit,true);assert.equal(st.required,4);assert.equal(st.forms[0].independent_at,firstAt);
assert.deepEqual(Object.keys(s.evidence.forms),['vocab:4-2:qalaisyn'],'one source id, no new word ids');
ok('W-2=C: full credit only after each of the 4 forms was produced once independently; recognition/set/help/choice do not count');

// J. Roundtrip (ST-03/ST-10): export/import, cloud-like payload, two devices.
const reloaded=P.migrate(JSON.parse(JSON.stringify(s)),NOW+40*D);
assert.deepEqual(plain(reloaded.evidence),plain(s.evidence));
const imported=P.validate(P.serialize(s),new Set()).state;assert.deepEqual(plain(imported.evidence),plain(s.evidence));
const cloud=JSON.parse(P.serialize(s));cloud.session=null;if(cloud.events.length>2500)cloud.events=cloud.events.slice(-2500);
assert.deepEqual(plain(P.migrate(cloud).evidence),plain(s.evidence));
const devA=P.migrate(raw42,NOW),devB=P.migrate(JSON.parse(P.serialize(devA)),NOW);
const sq=single('қалайсың');
E.observe(devA,{q:sq,answers:['қалайсың'],result:{correct:true,parts:[true]},event:{id:'shared',at:NOW+1},responseModes:['typed']});
E.observe(devB,{q:sq,answers:['қалайсың'],result:{correct:true,parts:[true]},event:{id:'shared',at:NOW+1},responseModes:['typed']});
E.observe(devB,{q:single('қалайсыз'),answers:['қалайсыз'],result:{correct:true,parts:[true]},event:{id:'b-only',at:NOW+2},responseModes:['typed']});
const merged=P.merge(devA,devB);
assert.equal(merged.evidence.attempts.length,2);
assert.equal(merged.evidence.forms['vocab:4-2:qalaisyn']['қалайсың'].keys['produce|single'].indep_n,1,'shared attempt not double counted');
assert.equal(E.formStatus(merged,'vocab:4-2:qalaisyn').done,2);
assert.ok(merged.evidence.migrations[E.MIGRATION_ID].fresh===false&&merged.evidence.legacy.homework['4-2']);
const fresh=P.empty();assert.ok(fresh.evidence.migrations[E.MIGRATION_ID].fresh);
const mergedFresh=P.merge(fresh,devA);assert.equal(mergedFresh.evidence.migrations[E.MIGRATION_ID].fresh,false);assert.ok(mergedFresh.evidence.legacy.homework['4-2']);
ok('evidence survives reload, export/import, cloud payload and two-device merge without double counting');

// K. Fresh profile never gets "legacy" facts later; cap keeps the summary.
const f1=P.empty();f1.homeworkAttempts['4-2']={lessonId:'4-2',started_at:NOW,items:[],checklist:{words:true}};
const f2=P.migrate(JSON.parse(P.serialize(f1)),NOW+D);assert.equal(Object.keys(f2.evidence.legacy).length,0);
const cap=P.empty();for(let i=0;i<E.MAX_ATTEMPTS+100;i++)E.observe(cap,{q:sq,answers:['қалайсың'],result:{correct:true,parts:[true]},event:{id:'c'+i,at:NOW+i},responseModes:['typed']});
assert.equal(cap.evidence.attempts.length,E.MAX_ATTEMPTS);assert.equal(cap.evidence.forms['vocab:4-2:qalaisyn']['қалайсың'].keys['produce|single'].indep_n,E.MAX_ATTEMPTS+100);
ok('fresh profiles have no legacy facts; attempt log is capped while per-form summary keeps counting');

// L. Wiring in the page.
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert.ok(html.indexOf('src="evidence-state.js"')>0&&html.indexOf('src="evidence-state.js"')<html.indexOf('src="progress.js"'));
assert.ok(sw.includes('"evidence-state.js"'));
assert.ok(sw.includes("CACHE='qazaq-offline-live-20261006-r7-51-7'"));
assert.ok(/function responseModes\(q\)\{return supportKind\(q\)\|\|q\.kind==='multi'\?\['choice'\]:.*el\.type==='hidden'\?'choice':'typed'/.test(app),'response mode read from the rendered control');
assert.ok(/state\.events\.push\(event\);rec=records\[q\.id\]\|\|rec;\n\s+if\(window\.EvidenceState\)\{try\{window\.EvidenceState\.observe\(state,/.test(app));
assert.ok(app.includes("R7_SNAPSHOT=KEY+'-before-r7'")&&app.includes('localStorage.setItem(R7_SNAPSHOT,raw)')&&app.includes('localStorage.getItem(R7_SNAPSHOT)'));
// ST-01/ST-02: homework accounting unchanged (no Knowledge.observe; hinted+existing record keeps the Again exception).
assert.ok(app.includes('if(hinted&&previous){rec=core.updateRecord(previous,result.correct,true,now,{responseTime:elapsedMs,recall,rating:F.Rating.Again});records[q.id]=rec;}'));
assert.ok(app.includes('if(!homeworkMode&&!aiRemed&&!voluntary)event.skills=window.Knowledge.observe(state,q,result,event,errors);'));
ok('page loads evidence-state before progress, SW caches it, answers feed evidence, homework policy unchanged');

console.log('r7 runtime/progress migration checks passed:',passed);
