#!/usr/bin/env node
/* r7 step 1, final owner decisions (2026-10-06):
   (2) Q6-B support kinds choice / tap-token / sort / word-bank / detect — blocks 3–4 only, support evidence only;
   (3) choice answers (tap buttons inside fields, e.g. 1-1) give NO forward mastery; stored mastery is never recomputed or lowered;
   (1) W-2: only independent typed input of a single form counts. No bank content is added here (step 2). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=require('./response-kinds.js'),core=require('./core.js'),S=require('./scheduler.js'),cfg=require('./config.js');
const P=require('./progress.js'),E=require('./evidence-state.js'),Schema=require('./lesson-v2-schema.js'),Pack=require('./package-schema.js');
let passed=0;const ok=m=>{passed++;console.log('PASS',m);};
const plain=v=>JSON.parse(JSON.stringify(v));
const DAY=86400000,NOW=Date.UTC(2026,9,6,7,0,0);

// ---- fixtures in the r7 PROPOSED payload format (test-only; not bank content) ----
const Q={
  choice:{id:'t-choice',lessonId:'4-2',kind:'choice',topic:'verbs',title:'Выбери вежливую форму',stimulus:'Вы (одному)',fields:[],
    payload:{options:[{id:'o1',text:'қалайсың'},{id:'o2',text:'қалайсыз'},{id:'o3',text:'қалайсыңдар'}],accepted:['o2'],cardinality:1}},
  multi:{id:'t-choice2',lessonId:'3-1',kind:'choice',topic:'verbs',title:'Выбери две',stimulus:'',fields:[],
    payload:{options:[{id:'a',text:'A'},{id:'b',text:'B'},{id:'c',text:'C'}],accepted:['a','c'],cardinality:2}},
  tap:{id:'t-tap',lessonId:'3-2',kind:'tap-token',topic:'verbs',title:'Отметь сказуемое',stimulus:'',fields:[],
    payload:{tokens:[{id:'t1',text:'Мен'},{id:'t2',text:'кітап'},{id:'t3',text:'оқимын'},{id:'t4',text:'кітап'}],accepted:[['t3']],cardinality:1}},
  sort:{id:'t-sort',lessonId:'3-3',kind:'sort',topic:'verbs',title:'Разложи',stimulus:'',fields:[],
    payload:{items:[{id:'i1',text:'бала'},{id:'i2',text:'үй'},{id:'i3',text:'қыз'}],categories:[{id:'hard',label:'Твёрдое'},{id:'soft',label:'Мягкое'}],accepted:{i1:'hard',i2:'soft',i3:'hard'}}},
  bank:{id:'t-bank',lessonId:'4-1',kind:'word-bank',topic:'verbs',title:'Собери',stimulus:'',fields:[],
    payload:{pieces:[{id:'p1',text:'Мен'},{id:'p2',text:'үйге'},{id:'p3',text:'барамын'},{id:'p4',text:'бара',count:2}],accepted:[['p1','p2','p3']]}},
  detect:{id:'t-detect',lessonId:'4-2',kind:'detect',topic:'verbs',title:'Найди ошибку',stimulus:'',fields:[],
    payload:{target:'Сіз қалайсың?',verdict:{accepted:'wrong'},broken_step:{options:[{id:'s1',text:'Кто говорит'},{id:'s2',text:'Окончание'}],accepted:['s2']}}},
  control:{id:'t-control',lessonId:'4-2',kind:'detect',topic:'verbs',title:'Есть ли ошибка?',stimulus:'',fields:[],
    payload:{target:'Сіз қалайсыз?',verdict:{accepted:'correct'}}}
};
for(const q of Object.values(Q))q.payload=R.normalize(q.kind,q.payload);

// A. Grader (Q6-04/10/11/12/13): stable IDs, exact sets / spans / mapping / sequence, detect needs required parts only.
const ev=(q,a)=>core.evaluate(q,a);
assert.equal(ev(Q.choice,['o2']).correct,true);assert.equal(ev(Q.choice,['o1']).correct,false);assert.equal(ev(Q.choice,['o2','o1']).correct,false);
assert.equal(ev(Q.choice,['1']).correct,false,'button index is never an answer');
assert.equal(ev(Q.multi,['c','a']).correct,true);assert.equal(ev(Q.multi,['a']).correct,false);assert.deepEqual(ev(Q.multi,['a']).parts,[true,true,false]);
assert.equal(ev(Q.tap,['t3']).correct,true);assert.equal(ev(Q.tap,['t2']).correct,false);assert.equal(ev(Q.tap,['t4']).correct,false,'duplicate words keep distinct token IDs');
assert.deepEqual(ev(Q.sort,['i1=hard','i2=soft','i3=hard']),{correct:true,parts:[true,true,true]});
assert.deepEqual(ev(Q.sort,['i1=hard','i2=hard']),{correct:false,parts:[true,false,false]},'unplaced item is not correct');
assert.equal(ev(Q.bank,['p1','p2','p3']).correct,true);assert.equal(ev(Q.bank,['p2','p1','p3']).correct,false);
assert.deepEqual(ev(Q.detect,['verdict:wrong']),{correct:false,parts:[true,false]},'detect partial is not a full pass');
assert.equal(ev(Q.detect,['verdict:wrong','step:s2']).correct,true);assert.equal(ev(Q.detect,['verdict:correct']).correct,false);
assert.equal(ev(Q.control,['verdict:correct']).correct,true);assert.equal(ev(Q.control,['verdict:wrong']).correct,false);
assert.equal(R.missing(Q.sort,['i1=hard']),true);assert.equal(R.missing(Q.detect,['verdict:wrong']),true);assert.equal(R.missing(Q.control,['verdict:correct']),false);assert.equal(R.missing(Q.choice,[]),true);
for(const [kind,bad] of [['choice',{options:[{id:'a',text:'x'},{id:'b',text:'y'}],accepted:['z']}],['word-bank',{pieces:[{id:'a',text:'x'},{id:'b',text:'y'}],accepted:[['a','a']]}],['sort',{items:[{id:'a',text:'x'},{id:'b',text:'y'}],categories:[{id:'c',label:'c'},{id:'d',label:'d'}],accepted:{a:'c'}}],['detect',{verdict:{accepted:'wrong'}}],['choice',{options:[{id:'a',text:'x'},{id:'a',text:'y'}],accepted:['a']}]])
  assert.throws(()=>R.normalize(kind,bad),/response kind/);
ok('support-kind grader: ID-based exact sets, spans, mapping, sequence; detect composite needs every required part');

// B. Q6-B barrier: schema keeps the kind only in lessons 3–4; 1–2, unknown kinds and broken payloads are explicit errors; package v1 ingress rejects them.
const ctx={window:{}};ctx.window.window=ctx.window;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8'),ctx);
const compiled=ctx.window.LESSON_V2_COMPILED;
const kindsInBank=new Set(compiled.flatMap(l=>[...(l.original_exercises||[]),...(l.generated_questions||[])].map(q=>q.kind||'fields')));
assert.deepEqual([...kindsInBank],['fields'],'step 1 adds no bank content');
const raw=id=>JSON.parse(JSON.stringify(compiled.find(l=>l.lesson_id===id)));
const exOf=q=>({id:q.id,kind:q.kind,topic:q.topic,title:q.title,stimulus:q.stimulus||'',payload:plain(q.payload)});
const l42=raw('4-2');l42.original_exercises.push(exOf(Q.choice),exOf(Q.detect),exOf(Q.control));
const v42=Schema.validate(l42),got=v42.original_exercises.filter(q=>q.id.startsWith('t-'));
assert.deepEqual(got.map(q=>q.kind),['choice','detect','detect']);assert.ok(got.every(q=>Array.isArray(q.fields)&&q.fields.length===0&&q.payload));
const l31=raw('3-1');l31.original_exercises.push(exOf(Q.multi));assert.equal(Schema.validate(l31).original_exercises.at(-1).kind,'choice');
for(const id of ['1-1','2-1']){const l=raw(id);l.original_exercises.push(exOf(Q.choice));assert.throws(()=>Schema.validate(l),/блоков 3–4/);}
{const l=raw('4-2');l.original_exercises.push({...exOf(Q.choice),kind:'flash-then-hide'});assert.throws(()=>Schema.validate(l),/не поддерживается/);}
{const l=raw('4-2');l.original_exercises.push({...exOf(Q.choice),payload:{options:[{id:'a',text:'x'}],accepted:['a']}});assert.throws(()=>Schema.validate(l),/response kind/);}
assert.equal(plain(Schema.validate(raw('4-2'))).original_exercises.length,raw('4-2').original_exercises.length,'existing lessons validate unchanged');
{
  const ex=(id,extra={})=>({id,topic:'vocab',title:'t',stimulus:'s',explanation:'e',fields:[{kind:'text',label:'a',answers:['a']}],...extra});
  const pack=exs=>({app:'qazaq-lesson',format_version:1,lesson_id:'x1',lesson_title:'x',source:{title:'s',url:'https://e.x'},dependencies:['a1'],words:[],exercises:exs,
    blocks:[{title:'b',explanation:'e',examples:[{kazakh:'k',translation:'t'}],question_ids:exs.map(q=>q.id)}]});
  let base=null;try{base=Pack.validate(pack([ex('e1'),ex('e2')]));}catch(error){base=error;}
  if(base instanceof Error)assert.doesNotMatch(base.message,/только из уроков 3–4/);
  assert.throws(()=>Pack.validate(pack([ex('e1',{kind:'choice'}),ex('e2')])),/только из уроков 3–4/);
}
ok('Q6-B barrier: new kinds only in 3–4 lessons, explicit errors elsewhere, package v1 ingress rejects them, bank unchanged');

// C. Runtime install keeps the kind (explicit dispatcher, no silent fields fallback) for 3–4.
{
  const mock={LessonV2Schema:Schema,ResponseKinds:R,LESSON_V2_COMPILED:[l42],COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){let w=this.words.find(x=>x.kazakh===kazakh);if(!w){w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);}return w;}},
    CourseProgress:{registerStages(){return [];}},Canonical:null};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),{window:mock,globalThis:mock,console});
  mock.LessonV2Runtime.installAll();
  const q=mock.COURSE.questions.find(x=>x.id==='t-choice');assert.ok(q,'installed');assert.equal(q.kind,'choice');assert.deepEqual(plain(q.fields),[]);
  assert.equal(core.evaluate(q,['o2']).correct,true);
  assert.ok(mock.COURSE.questions.filter(x=>!x.id.startsWith('t-')&&!x.bank).every(x=>x.kind==='fields'),'all existing cards stay fields (r7 2b: the bank b34-* is the only support-kind content)');
  assert.ok(mock.COURSE.questions.filter(x=>x.bank).every(x=>/^b34-/.test(x.id)&&x.origin==='bank'&&x.kind!=='fields'),'bank cards are support kinds with origin bank');
}
ok('runtime install keeps support kinds for 3–4 and leaves every existing card as fields');

// D. Page wiring: renderer uses existing chip classes, hidden JSON answer, ID-encoded taps; response mode = choice; event carries response_modes.
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert.ok(html.indexOf('src="response-kinds.js"')>html.indexOf('src="core.js"')&&html.indexOf('src="response-kinds.js"')<html.indexOf('src="lesson-v2-schema.js"'));
assert.ok(sw.includes('"response-kinds.js"')&&sw.includes("CACHE='qazaq-offline-live-20261006-r7-ux59-2'"));
assert.ok(app.includes("response_kind:q.kind||'fields',response_modes:responseModes(q),"));
assert.ok(app.includes('function readAnswers(q){return supportKind(q)?window.ResponseKinds.read(q):'));
{
  const grab=name=>{const i=app.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=app.indexOf('\n function ',i+5);return app.slice(i,j);};
  const box={};
  vm.runInNewContext(grab('supportKind')+grab('classifierOptions')+grab('answerMarkup')+grab('responseModes')+'\nbox.out=qs.map(q=>[answerMarkup(q),responseModes(q)]);',{box,qs:Object.values(Q),esc:v=>String(v??'').replace(/</g,'&lt;'),window:{ResponseKinds:R},document:{getElementById(){return null;}}});
  for(const [markup,modes] of plain(box.out)){assert.ok(markup.includes('id="rk-response" type="hidden"')&&markup.includes('class="chip"')&&!/style=|#[0-9a-f]{3,6}\b/i.test(markup));assert.deepEqual(modes,['choice']);}
  // Tap handler: fake form, IDs only, cardinality respected, locked after check.
  const form=q=>{const input={value:'[]'};const f={classList:{contains:c=>c==='answered'&&f.answered},answered:false,querySelector:s=>s==='#rk-response'?input:null,querySelectorAll:()=>[],ownerDocument:{getElementById:()=>input}};return {f,input};};
  const tap=(q,taps)=>{const {f,input}=form(q);for(const t of taps)R.click(f,q,{dataset:t,hasAttribute:a=>a==='data-rk-undo'&&!!t.undo});return JSON.parse(input.value);};
  assert.deepEqual(tap(Q.choice,[{rkToggle:'o1'},{rkToggle:'o2'}]),['o2']);
  assert.deepEqual(tap(Q.multi,[{rkToggle:'a'},{rkToggle:'b'},{rkToggle:'c'}]),['a','b']);
  assert.deepEqual(tap(Q.sort,[{rkSort:'i2',rkCat:'hard'},{rkSort:'i1',rkCat:'hard'},{rkSort:'i2',rkCat:'soft'}]),['i1=hard','i2=soft']);
  assert.deepEqual(tap(Q.bank,[{rkPiece:'p1',rkCount:'1'},{rkPiece:'p1',rkCount:'1'},{rkPiece:'p2',rkCount:'1'},{undo:true},{rkPiece:'p2',rkCount:'1'},{rkPiece:'p3',rkCount:'1'}]),['p1','p2','p3']);
  assert.deepEqual(tap(Q.detect,[{rkVerdict:'correct'},{rkStep:'s2'}]),['verdict:wrong','step:s2']);
  const {f,input}=form(Q.choice);f.answered=true;assert.equal(R.click(f,Q.choice,{dataset:{rkToggle:'o2'},hasAttribute:()=>false}),false);assert.equal(input.value,'[]');
}
ok('renderer/handlers: existing chip classes, hidden JSON answer of stable IDs, cardinality, resume-safe encoding, locked after check');

// E. Forward mastery (decision 3) through the real Knowledge module.
function knowledge(){
  const w={TrainerCore:core,ReviewScheduler:S,TRAINER_CONFIG:cfg,CURRICULUM:{words:[]},COURSE:{questions:[]}};w.window=w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'knowledge.js'),'utf8'),w);return w.Knowledge;
}
const l11=compiled.find(x=>x.lesson_id==='1-1'),q11raw=l11.original_exercises.find(x=>x.id==='e1-3-1-1');
const mk=()=>({...plain(q11raw),kind:'fields',lessonId:'1-1',ruleIds:q11raw.rule_ids||[]});
const MODES_11=['typed','choice','choice','choice','choice']; // what the page renders for e1-3-1-1 (verified in r7 runtime verify H2)
const BUTTONS_ONLY=()=>{const q=mk();q.fields=q.fields.slice(1);delete q.skillBindings;return q;}; // same card id, only the classifier (button) fields
const MODES_BTN=['choice','choice','choice','choice'];
function drill(K,q,modes,n=6,state={skills:{},records:{}},opts={}){
  const logs=[];let at=opts.at||NOW;
  for(let i=0;i<n;i++){
    const ans=(opts.answers||q.fields.map(f=>f.answers[0])).slice();
    const result=core.evaluate(q,ans),event={at,answers:ans,hinted:false,rule_peek:0,recall:true,response_time_ms:4000,...(opts.event||{}),...(modes?{response_modes:modes}:{})};
    logs.push(...K.observe(state,q,result,event,[]));
    const k=Object.keys(state.skills)[0];at=Math.max(at+DAY+1,(state.skills[k].next_review||0)+1);
  }
  return {state,logs,at};
}
const lvl=s=>Object.values(s.skills)[0].mastery_level;
{
  const K=knowledge();
  const typed=drill(K,mk(),['typed','typed','typed','typed','typed']).state,legacy=drill(knowledge(),mk(),null).state;
  assert.ok(['REMEMBERED','MASTERED'].includes(lvl(typed)),'typed answers still climb: '+lvl(typed));
  assert.equal(lvl(legacy),lvl(typed),'events without response_modes (grammar path, old builds) behave as before');
  // (a) mixed card, every input independent + every button correct: may rise.
  const mixed=drill(knowledge(),mk(),MODES_11).state;
  assert.ok(['REMEMBERED','MASTERED'].includes(lvl(mixed)),'mixed card with independent input + correct buttons can rise: '+lvl(mixed));
  // (d) buttons-only card: never above LEARNING.
  const only=drill(knowledge(),BUTTONS_ONLY(),MODES_BTN).state;
  assert.equal(lvl(only),'LEARNING','buttons-only card stays ≤ LEARNING');assert.equal(only.records['e1-3-1-1'].mastery_level,'LEARNING');
  const sk=Object.values(only.skills)[0];assert.equal(sk.correct_streak,0);assert.equal(sk.recall_review_successes,0);assert.deepEqual(plain(sk.successful_prompts),[]);
  assert.ok(sk.next_review>NOW,'schedule still advances (card is not stuck as due)');
  const logs=drill(knowledge(),BUTTONS_ONLY(),MODES_BTN,2).logs;assert.ok(logs.every(l=>l.independent===false&&l.support===true));
  // (b)/(c) from the same point one clean answer away from rising: hint / reveal / rule peek on the input, or one wrong button, never rise.
  const primed=()=>{const K2=knowledge(),r=drill(K2,mk(),MODES_11,1);assert.equal(lvl(r.state),'LEARNING');return {K2,...r};};
  {const {K2,state,at}=primed();drill(K2,mk(),MODES_11,1,state,{at});assert.ok(['FAMILIAR','REMEMBERED','MASTERED'].includes(lvl(state)),'control: clean mixed answer rises: '+lvl(state));}
  for(const event of [{hinted:true},{peek:1},{rule_peek:1},{revealed:true}]){
    const {K2,state,at}=primed();const before=plain(Object.values(state.skills)[0]);
    const r=drill(K2,mk(),MODES_11,1,state,{at,event});
    assert.equal(lvl(state),'LEARNING','assisted input never rises: '+JSON.stringify(event));
    assert.ok(Object.values(state.skills)[0].correct_streak<=before.correct_streak);assert.ok(r.logs.every(l=>!l.independent));
  }
  {const {K2,state,at}=primed();const ans=mk().fields.map(f=>f.answers[0]);ans[4]=ans[4]==='Твёрдое'?'Мягкое':'Твёрдое';
   drill(K2,mk(),MODES_11,1,state,{at,answers:ans});assert.equal(lvl(state),'LEARNING','a wrong button blocks the rise');}
  {const {K2,state,at}=primed();const ans=mk().fields.map(f=>f.answers[0]);ans[0]='ғы-лым';
   drill(K2,mk(),MODES_11,1,state,{at,answers:ans});assert.equal(lvl(state),'LEARNING','wrong input blocks the rise');}
  // several mixed drills with a hint every time stay LEARNING
  assert.equal(lvl(drill(knowledge(),mk(),MODES_11,6,{skills:{},records:{}},{event:{hinted:true}}).state),'LEARNING');
}
{ // field-level bindings: only the choice field is held back.
  const K=knowledge();
  const q={id:'t-fieldlevel',lessonId:'1-1',topic:'sounds',kind:'fields',stimulus:'x',fields:[{label:'a',kind:'text',answers:['ала']},{label:'b',kind:'text',answers:['Твёрдое']}],
    skillBindings:[{item_id:'rule:t-a',skill_type:'application',field:0,facet:null},{item_id:'rule:t-b',skill_type:'application',field:1,facet:null}]};
  const st={skills:{},records:{}};let at=NOW;
  for(let i=0;i<6;i++){K.observe(st,q,{correct:true,parts:[true,true]},{at,answers:['ала','Твёрдое'],hinted:false,recall:true,response_modes:['typed','choice']},[]);at=Math.max(at+DAY+1,st.skills['rule:t-a::application'].next_review+1,st.skills['rule:t-b::application'].next_review+1);}
  assert.ok(['REMEMBERED','MASTERED'].includes(st.skills['rule:t-a::application'].mastery_level));
  assert.equal(st.skills['rule:t-b::application'].mastery_level,'LEARNING');
}
{ // stored mastery is never lowered or recomputed by a correct choice answer; migration leaves skills byte-identical.
  const K=knowledge(),q=mk(),k='exercise:e1-3-1-1::application';
  const typedState=drill(K,q,['typed','typed','typed','typed','typed'],8).state,before=plain(typedState.skills[k]);
  assert.equal(before.mastery_level,"MASTERED");
  const btn=BUTTONS_ONLY(),at=before.next_review+1,ans=btn.fields.map(f=>f.answers[0]);
  K.observe(typedState,btn,core.evaluate(btn,ans),{at,answers:ans,hinted:false,recall:true,response_modes:MODES_BTN},[]);
  const after=typedState.skills[k];
  assert.equal(after.mastery_level,'MASTERED');for(const f of ['correct_streak','recall_review_successes','review_successes'])assert.equal(after[f],before[f],f);
  const legacy={...P.empty(),skills:{[k]:before,'word:x::production':{...before,item_id:'word:x',skill_type:'production'}},records:{'e1-3-1-1':{...typedState.records['e1-3-1-1']}}};
  const m=P.migrate(JSON.parse(JSON.stringify(legacy)),NOW+DAY),m2=P.migrate(JSON.parse(P.serialize(m)),NOW+2*DAY);
  assert.deepEqual(plain(m.skills),plain(legacy.skills));assert.deepEqual(plain(m2.skills),plain(legacy.skills));
}
{ // support kinds: never independent, never past LEARNING, no successful prompts.
  const K=knowledge(),q={...plain(Q.choice)};
  const st={skills:{},records:{}};let at=NOW;
  for(let i=0;i<6;i++){const logs=K.observe(st,q,core.evaluate(q,['o2']),{at,answers:['o2'],hinted:false,recall:false,response_modes:['choice']},[]);assert.ok(logs.every(l=>!l.independent));const s=Object.values(st.skills)[0];at=Math.max(at+DAY+1,s.next_review+1);}
  const s=Object.values(st.skills)[0];assert.equal(s.mastery_level,'LEARNING');assert.deepEqual(plain(s.successful_prompts),[]);
  // even without response_modes (defensive), the kind alone marks it as support
  const st2={skills:{},records:{}};K.observe(st2,{...plain(Q.detect),id:'t-d2'},{correct:true,parts:[true,true]},{at:NOW,answers:['verdict:wrong','step:s2'],hinted:false,recall:false},[]);
  assert.equal(Object.values(st2.skills)[0].mastery_level,'LEARNING');
}
ok('forward mastery: mixed 1-1 card rises only with independent input + correct buttons; hint/reveal/wrong button/buttons-only/support kinds stay ≤ LEARNING; stored mastery untouched');

// F. Evidence: support kinds are recorded as choice practice; W-2 counts only independent single typed production.
{
  const s=P.empty();
  const a=E.observe(s,{q:Q.choice,answers:['o2'],result:core.evaluate(Q.choice,['o2']),event:{id:'s1',at:NOW},responseModes:['choice'],origin:'lesson'});
  assert.equal(a.kind,'choice');assert.ok(a.fields.length&&a.fields.every(f=>f.resp==='choice'&&f.indep===false));
  assert.deepEqual(a.forms.map(f=>[f.form,f.dir,f.indep]),[['қалайсыз','choose',false]]);
  assert.equal(E.formStatus(s,'vocab:4-2:qalaisyn').done,0);
  const b=E.observe(s,{q:Q.detect,answers:['verdict:wrong','step:s2'],result:core.evaluate(Q.detect,['verdict:wrong','step:s2']),event:{id:'s2',at:NOW+1},responseModes:['choice'],origin:'lesson'});
  assert.equal(b.kind,'detect');assert.ok(b.forms.every(f=>!f.indep));
  const all={id:'t-all4',lessonId:'4-2',kind:'fields',topic:'verbs',stimulus:'Все четыре формы',fields:[{label:'Все',kind:'set-text',answers:['қалайсың, қалайсыңдар, қалайсыз, қалайсыздар']}]};
  const allAns=['қалайсың, қалайсыңдар, қалайсыз, қалайсыздар'];
  E.observe(s,{q:all,answers:allAns,result:core.evaluate(all,allAns),event:{id:'s3',at:NOW+2},responseModes:['typed'],origin:'lesson'});
  const rec={id:'t-rec',lessonId:'4-2',kind:'fields',topic:'vocab',stimulus:'қалайсыңдар',fields:[{label:'Перевод',kind:'text',answers:['как вы (вы все)']}]};
  E.observe(s,{q:rec,answers:['как вы (вы все)'],result:{correct:true,parts:[true]},event:{id:'s4',at:NOW+3},responseModes:['typed'],origin:'lesson'});
  const st=E.formStatus(s,'vocab:4-2:qalaisyn');assert.equal(st.done,0,'recognition, combined all-4 and choice do not count');
  assert.deepEqual(st.forms.find(f=>f.form==='қалайсыңдар').seen['produce|set'],{independent:0,with_help:1,wrong:0},'combined all-4 kept as support practice');
  assert.equal(st.forms.find(f=>f.form==='қалайсыз').seen['choose|single'].independent,0);
  assert.equal(st.forms.find(f=>f.form==='қалайсыңдар').seen['recognize|single'].with_help,1,'recognition kept as support practice');
  const one={id:'t-one',lessonId:'4-2',kind:'fields',topic:'verbs',stimulus:'Ты',fields:[{label:'Форма',kind:'text',answers:['қалайсың']}]};
  E.observe(s,{q:one,answers:['қалайсың'],result:{correct:true,parts:[true]},event:{id:'s5',at:NOW+4},responseModes:['typed'],origin:'lesson'});
  assert.equal(E.formStatus(s,'vocab:4-2:qalaisyn').done,1,'independent typed single form counts');
  const round=P.migrate(JSON.parse(P.serialize(s)),NOW+DAY);assert.deepEqual(plain(round.evidence.attempts),plain(s.evidence.attempts));
}
ok('evidence: support kinds recorded as choice practice (kind kept through save/load); W-2 counts only independent single typed forms');

console.log('r7 support kinds / forward mastery checks passed:',passed);
