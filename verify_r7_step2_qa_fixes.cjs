#!/usr/bin/env node
'use strict';
/* r7 step 2a · казакша QA on c4df614 (FAIL) → fixes F1–F4, M1, M2 and the R10 counter note.
   F1 words-track counter is word-based and stable (13 for 4-2) · F2 v2 examples never render «қол → қол» or «Слот: .»
   F3 ai-remed probes never enter homework, no service text · F4 words button hidden while homework words lack cards
   M1 «Задано выучить» = homework.word_ids (T13 for 4-2, сүю included) · M2 барді → harmony, not person
   R10: pre-#56 sheet answers kept; T13 answers keep counting; one note line instead of a silent drop. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
const appSrc=read('app.js'),learnSrc=read('learning.js');
const grab=(src,name)=>{const i=src.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=src.indexOf('\n function ',i+5);return src.slice(i,j);};
const Schema=require('./lesson-v2-schema.js');
const ctx={window:{}};ctx.window.window=ctx.window;vm.runInNewContext(read('compiled-lessons-v2.js'),ctx);
const compiled=plain(ctx.window.LESSON_V2_COMPILED);
function runtime(list){
  const mock={location:{hostname:'localhost'},LessonV2Schema:Schema,LESSON_V2_COMPILED:list,COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){let w=this.words.find(x=>x.kazakh===kazakh);if(!w){w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);}return w;}},
    CourseProgress:{registerStages(){return [];}},Canonical:null};
  vm.runInNewContext(read('lesson-v2-runtime.js'),{window:mock,globalThis:mock,console});
  return mock;
}
const rt=runtime(plain(compiled));rt.LessonV2Runtime.installAll();
const R=rt.LessonV2Runtime,Q=new Map(rt.COURSE.questions.map(q=>[q.id,q]));
const LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'];

// F1: the words-track header counts words of the list; queue re-inserts / reload / reopen cannot move it.
{
  const rs=grab(appSrc,'renderStats');
  const br=rs.slice(rs.indexOf("startsWith(HW_WORDS_PREFIX)"),rs.indexOf("else if(['smart'"));assert.ok(br.length>50);
  assert.ok(/wordGroupCounter\(\(track&&track\.questionIds\)\|\|\[\]\)/.test(br),'F1: words track counts track.questionIds');
  assert.ok(!/queue\.length/.test(br),'F1: words track counter must not depend on the queue');
  assert.ok(rs.indexOf("startsWith(HW_WORDS_PREFIX)")<rs.indexOf('Шаг ${'),'F1: words-track branch wins over «Шаг N из queue»');
  const box={},records={};
  vm.runInNewContext(grab(appSrc,'answeredSet')+'\n'+grab(appSrc,'wordGroupCounter')+'\nbox.f=wordGroupCounter;',{box,records,byId:Q,state:{events:[],homeworkAttempts:{}}});
  const ids=plain(R.homework('4-2').homework.word_question_ids);
  const seen=[];
  for(let i=0;i<ids.length;i++){records[ids[i]]={attempts:1,review_count:1};/* r7 2b QA: answered = reviewed record / answer event / sheet item */const c=box.f(ids);assert.equal(c.total,13,'F1: denominator 13 after answer '+(i+1));seen.push(c.tried);}
  assert.ok(seen.every((v,i)=>i===0||v>=seen[i-1]),'F1: «встречалось» never goes back');
  assert.equal(seen.at(-1),13);
  // reload: same records, same list → same numbers.
  assert.deepEqual(plain(box.f(ids)),{tried:13,total:13});
}
ok('F1 4-2 words track: «Встречалось X из 13 слов», denominator fixed at the list (13) across answers, F5 and reopening');

// F2: v2 worked examples.
{
  let ex=0,arrows=0;
  for(const l of rt.GRAMMAR_CHAPTERS.LESSONS)for(const ch of l.chapters||[])for(const b of ch.beats||[])if(b.k==='ex'){
    ex++;assert.ok(b.from,'F2: example keeps its Kazakh line');
    assert.ok(!(b.to&&b.to===b.from),'F2: same word on both sides '+b.from);
    if(b.to){arrows++;assert.notEqual(b.to,b.from);}
    assert.ok(!('slot' in b)||String(b.slot).trim(),'F2: empty slot');
  }
  // Section 2 (#54) pathLesson uses k=core beats instead of theory ex; non-canon lessons keep ex.
  assert.ok(ex>=220,'F2: non-canon v2 examples still rendered ('+ex+')');
  for(const id of ['2-1','2-2','2-3']){
    const les=rt.GRAMMAR_CHAPTERS.LESSONS.find(l=>l.id===id);
    assert.ok(les&&les.chapters.length&&les.chapters.every(ch=>(ch.beats||[]).some(b=>b.k==='core')),'F2: '+id+' canonical core beats');
  }
  const box={};vm.runInNewContext(grab(appSrc,'exampleLine')+grab(appSrc,'exampleNote')+'\nbox.line=exampleLine;box.note=exampleNote;',{box});
  const esc=v=>String(v).replace(/</g,'&lt;');
  assert.equal(box.line({from:'қол'},esc),'қол');
  assert.equal(box.line({from:'көл',to:'көл'},esc),'көл');
  assert.equal(box.line({from:'ұн / үн'},esc),'ұн / үн');
  assert.equal(box.line({from:'кітап',to:'кітабым'},esc),'кітап → кітабым');
  assert.equal(box.note({why:'Қ и О — сигналы твёрдого ряда.'},esc),'<p>Қ и О — сигналы твёрдого ряда.</p>');
  assert.equal(box.note({slot:'',why:''},esc),'');
  assert.ok(/Слот: <strong lang="kk">кітабым<\/strong>/.test(box.note({slot:'кітабым',why:'x'},esc)),'legacy chapters with a real slot keep it');
  const l11=rt.GRAMMAR_CHAPTERS.LESSONS.find(l=>l.id==='1-1');
  const lines=l11.chapters.flatMap(c=>c.beats).filter(b=>b.k==='ex').map(b=>box.line(b,esc)+' '+box.note(b,esc));
  for(const bad of ['қол → қол','көл → көл','ұн / үн → ұн / үн','он / оң → он / оң','орман / арман → орман / арман','Слот: <strong lang="kk"></strong>'])assert.ok(!lines.some(t=>t.includes(bad)),'F2: 1-1 still shows '+bad);
  const view=appSrc.slice(appSrc.indexOf("if(beat.k==='ex'){"),appSrc.indexOf("if(beat.k==='trap'){"));
  assert.ok(/exampleLine\(beat,seeText\)/.test(view)&&/exampleNote\(beat,seeText\)/.test(view)&&!/Слот: <strong/.test(view),'F2: path view uses the helpers');
  // lesson texts untouched: compiled theory examples are the same data.
  for(const id of ['1-1','4-2'])assert.equal(JSON.stringify(JSON.parse(read('lessons/'+id+'/lesson.json')).theory.map(t=>t.examples)),JSON.stringify(compiled.find(x=>x.lesson_id===id).theory.map(t=>t.examples.map(e=>Object.fromEntries(Object.entries(e).filter(([k,v])=>v!==''))))).replace(/,"why":""/g,''),'F2: theory examples data unchanged ('+id+')');
}
ok('F2 «Разобранный пример»: no «қол → қол» / «Слот: .»; arrow only for a real pair, slot only when set; lesson data unchanged');

// F3: ai-remed probes.
{
  const ai=read('ai-tutor.js');
  assert.ok(!/Не входит в банк|банк 220|Временная проверка/.test(ai),'F3: service text gone from ai-tutor.js');
  for(const f of fs.readdirSync(__dirname).filter(f=>/\.js$/.test(f)))assert.ok(!/Не входит в банк 220 ID/.test(read(f)),'F3: service text in '+f);
  const at=appSrc.indexOf('window.AiTutor.takeRemediation(byId)');assert.ok(at>0);
  const guard=appSrc.slice(at-200,at);
  assert.ok(/if\(mode!=='homework'&&!homeworkMode(&&!bankRun&&!q\.bank)?\)\{\s*const extra=$/.test(guard),'F3: remediation splice is skipped in homework (r7 2b QA B5: and in bank sessions)');
  // the probe itself is still a normal short check outside homework
  assert.ok(/explanation:'Короткая проверка того же навыка\.'/.test(ai));
}
ok('F3 temporary ai-remed cards never enter a homework session; the «Не входит в банк 220 ID» service line is gone everywhere');

// F4 + M1: coverage per lesson on the full browser stack (base course cards decide which words own a card).
function fullStack(){
  const sandbox={console,Date,Math,JSON,Array,Object,Map,Set,String,Number,Boolean,Error,RegExp,parseInt,parseFloat,isNaN,isFinite,Infinity,undefined,NaN,Promise,TextEncoder,TextDecoder,
    location:{hostname:'localhost',href:'http://localhost/',protocol:'http:'},
    document:{documentElement:{getAttribute:()=>null},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},body:{},head:{},createElement:()=>({style:{},setAttribute(){},appendChild(){}})},
    localStorage:{_d:Object.create(null),getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
    matchMedia:()=>({matches:false,addListener(){},addEventListener(){}}),addEventListener(){},removeEventListener(){}};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.self=sandbox;
  const skip=new Set(['app.js','pwa.js','design-ui.js','cloud.js','firebase-config.js','dashboard.js','morph-ui.js','morph-nav2.js','personal-trainers.js','free-practice-view.js','tutor-ui.js']);
  for(const f of read('index.html').match(/src="([^"]+\.js)"/g).map(x=>x.slice(5,-1))){if(skip.has(f))continue;try{vm.runInNewContext(read(f),sandbox,{filename:f});}catch(e){}}
  return sandbox;
}
{
  const S=fullStack(),FR=S.LessonV2Runtime;assert.ok(FR&&FR.homeworkWordCoverage,'full stack runtime');
  // r7 2b (казакша, решение 3): the former gaps (1-2 он, 2-1 23/24, 3-1 six question words) got own cards
  // with new IDs, so every lesson is complete now and the F4 hide no longer triggers anywhere.
  const rows={};
  for(const id of LESSONS){
    const c=plain(FR.homeworkWordCoverage(id));assert.ok(c&&c.total>0,id);rows[id]=c;
    assert.equal(c.complete,true,'F4: '+id+' should be fully covered: '+c.words.filter(w=>!w.covered).map(w=>w.lemma).join(','));
  }
  const c42=rows['4-2'];
  assert.deepEqual(c42.words.map(w=>w.id),JSON.parse(read('lessons/4-2/lesson.json')).homework.word_ids,'M1: T13 order');
  assert.ok(c42.words.some(w=>w.lemma==='сүю'&&w.covered),'M1: сүю is listed and covered in 4-2');
  assert.ok(!c42.words.some(w=>/^да/.test(w.lemma)),'M1: the particle (R10) is not in the 4-2 «Задано выучить»');
  const t=grab(appSrc,'homeworkWordsTrack');
  assert.ok(/homeworkWordCoverage\(lessonId\)/.test(t)&&/!cov\.complete\)\{[^}]*return false;\}/.test(t),'F4: track returns false while coverage is incomplete');
  assert.ok(/!\(hw===false&&l\.id==='vocab-must'\)/.test(learnSrc),'F4: hub drops the global must-track under the same title too');
  const wl=grab(appSrc,'homeworkWordList');assert.ok(/homeworkWordCoverage/.test(wl));
  assert.ok(/const hwList=api\.homeworkWordList\?api\.homeworkWordList\(id\):null;/.test(learnSrc)&&/const mustWords=hwList\|\|/.test(learnSrc),'M1: hub «Задано выучить» uses homework words');
  assert.ok(/homeworkWordsTrack,homeworkWordList,/.test(appSrc));
}
ok('F4/M1 coverage per lesson: complete in all 11 lessons after 2b (F4 hide stays as a guard); 4-2 list = T13 with сүю');

// M2: harmony vs person.
{
  global.window=global;require('./core.js');const D=require('./diagnostics.js');
  const q=Q.get('e42-m3-1');assert.ok(q);
  const t=a=>D.diagnose(q,[a],{correct:false,parts:[false]},1).map(x=>x.error_type);
  assert.deepEqual(t('барді'),['verb_harmony']);assert.deepEqual(t('Ол барді'),['verb_harmony']);
  assert.equal(D.labels.verb_harmony,'Глагол: твёрдый / мягкий ряд');
  assert.deepEqual(t('бардым'),['verb_person'],'a real person slip stays person');
  const neg={id:'n',topic:'verbs',lessonId:'4-1',ruleIds:['v2:4-1:negative'],kind:'fields',fields:[{label:'Ответ',kind:'text',answers:['жазбаймын']}]};
  assert.deepEqual(D.diagnose(neg,['жазбеймын'],{correct:false,parts:[false]},1).map(x=>x.error_type),['verb_negative_harmony'],'negative harmony unchanged');
}
ok('M2 «Ол (бару)» → «барді»: badge «Глагол: твёрдый / мягкий ряд» (harmony), real person errors keep «Глагол: лицо»');

// R10: a pre-#56 sheet (4-2 answers on R10 + T13 cards).
{
  const P=require('./progress.js'),H=require('./homework.js');
  const raw=JSON.parse(read('qa/fixtures/progress-r7/schema7-pre56-4-2-r10.json'));
  const m=P.migrate(plain(raw),1791270000000);
  assert.deepEqual(plain(m.homeworkAttempts['4-2'].items),raw.homeworkAttempts['4-2'].items,'R10: old sheet answers kept');
  for(const id of Object.keys(raw.records))assert.ok(m.records[id],'R10: record kept '+id);
  const ids=R.homework('4-2').homework.word_question_ids;
  const pp=H.partProgress(m.homeworkAttempts['4-2'],ids);
  assert.equal(pp.done,4,'R10: T13 answers keep counting');
  const box={};vm.runInNewContext(grab(appSrc,'homeworkListUpdated')+'\nbox.f=homeworkListUpdated;',{box});
  assert.equal(box.f('4-2',m.homeworkAttempts['4-2'],ids),true,'R10: note shown');
  assert.equal(box.f('4-2',{items:m.homeworkAttempts['4-2'].items.filter(i=>ids.includes(i.id))},ids),false,'no note without dropped cards');
  assert.equal(box.f('4-1',m.homeworkAttempts['4-2'],ids),false);
  assert.ok(/Список слов обновлён, уже выученные слова сохранены\./.test(appSrc));
  const rh=grab(appSrc,'renderHomework');assert.ok(/isV2\(want\)&&!window\.LessonV2Runtime\.byId\(want\)\)\{ensureV2\(want\);list=packsNow\(\);\}/.test(rh),'R10: the shown lesson is hydrated so the counter counts real cards');
}
ok('R10 pre-#56 state: sheet answers and records kept, T13 answers keep counting (4), note «Список слов обновлён, уже выученные слова сохранены» shown');

console.log('r7 step 2a QA fixes checks passed: '+passed);
