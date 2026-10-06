#!/usr/bin/env node
'use strict';
/* r7 step 2b · казакша QA on PR #57 (tip 4d7b382) = FAIL → fixes.
   Counter decision («Встречалось» = answered only, fresh profile 0 из N) · B1 no ids in bank feedback (71 tasks)
   · B2 bank layout · B3/B4 4-2 detect texts · B5 bank sessions only own bank tasks · B6 stable step counter, no
   «уже повторялось» on support kinds · B7 қалайсың forms come back until 4/4 · m1–m8.
   Headless repro (desktop + 390px): /workspace/r7/qa57/{bankall,hw,minor,a11y}.mjs (see docs/r7/R7_STEP2B.md). */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
const appSrc=read('app.js'),css=read('theme-redesign.css'),tutorSrc=read('tutor-ui.js');
const grab=(src,name)=>{const i=src.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=src.indexOf('\n function ',i+5);return src.slice(i,j)+'\n';};
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
const E=S.EvidenceState,core=S.TrainerCore,RK=S.ResponseKinds,R=S.LessonV2Runtime,H=S.Homework;
const LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'],B34=['3-1','3-2','3-3','4-1','4-2'];
for(const id of LESSONS)R.ensure(id);
const Q=new Map(S.COURSE.questions.map(q=>[q.id,q]));
const bank=S.COURSE.questions.filter(q=>q.bank===true);
const ID_RE=/\b[otpic]\d{1,2}\b|\bi\d+=c\d+|verdict:|step:/;
const right=q=>{const p=q.payload;
  if(q.kind==='choice')return p.accepted.slice();
  if(q.kind==='tap-token')return p.accepted[0].slice();
  if(q.kind==='sort')return Object.entries(p.accepted).map(([i,c])=>i+'='+c);
  if(q.kind==='word-bank')return p.accepted[0].slice();
  return ['verdict:'+p.verdict.accepted,...(p.broken_step?['step:'+p.broken_step.accepted[0]]:[])];
};
const wrongs=q=>{const p=q.payload,out=[];
  if(q.kind==='choice')for(const o of p.options)if(!p.accepted.includes(o.id))out.push([o.id]);
  if(q.kind==='tap-token')for(const t of p.tokens)if(!p.accepted[0].includes(t.id))out.push([t.id]);
  if(q.kind==='sort'){out.push(p.items.map(it=>it.id+'='+p.categories.find(c=>c.id!==p.accepted[it.id]).id));}
  if(q.kind==='word-bank'){out.push(p.accepted[0].slice().reverse());out.push(p.pieces.map(x=>x.id));}
  if(q.kind==='detect'){out.push(['verdict:'+(p.verdict.accepted==='correct'?'wrong':'correct')]);if(p.broken_step)for(const o of p.broken_step.options)if(!p.broken_step.accepted.includes(o.id))out.push(['verdict:wrong','step:'+o.id]);}
  return out;
};

// ── B1: learner-visible answer text of every bank task is human text, never an option/token/piece id ──
{
  assert.equal(bank.length,71);
  let n=0;
  for(const q of bank){
    for(const a of [right(q),...wrongs(q)]){
      const t=RK.answerText(q,a);n++;
      assert.ok(t&&t.trim(),'answer text '+q.id+' '+JSON.stringify(a));
      assert.ok(!ID_RE.test(t),'id leaked '+q.id+': '+t);
      const lead=RK.answerLead(q);assert.ok(/^(Ты выбрала|Ты собрала|Ты разложила|Твой ответ)$/.test(lead));
    }
    assert.ok(!ID_RE.test(RK.solutionText(q)),'solution text '+q.id);
    assert.ok(!ID_RE.test(q.explanation||''),'explanation '+q.id);
  }
  assert.ok(n>=200,'answers checked '+n);
  const ca=grab(appSrc,'checkAnswer');
  // the typed-answer chain («Ты написала: …», «Неверно: …»), the typed-error classifier and morpheme row are off for support kinds
  assert.match(ca,/if\(!result\.correct&&window\.ExplainOpen&&!supportKind\(q\)\)\{const offers=/);
  assert.match(ca,/const aiCodes=window\.AiTutor&&mode!=='exam'&&!supportKind\(q\)\?window\.AiTutor\.noteAnswer/);
  assert.match(ca,/const morph=!result\.correct&&!supportKind\(q\)\?morphemeRow/);
  assert.match(ca,/const errors=reveal\|\|supportKind\(q\)\?\[\]:window\.ErrorDiagnostics\.diagnose/);
  assert.match(ca,/if\(!voluntary&&!supportKind\(q\)\)P\.observeConfusions/);
  assert.match(ca,/supportDiff=.*window\.ResponseKinds\.answerLead\(q\).*esc\(userAnswer\)/);
  assert.equal((ca.match(/user_answer:userAnswer/g)||[]).length,2,'tutor context + request carry human text');
  assert.ok(!/user_answer:answers\.join\(' '\),\s*\n/.test(ca));
  // shownAnswer: support kinds → ResponseKinds.answerText
  const box={};vm.runInNewContext(grab(appSrc,'supportKind')+grab(appSrc,'shownAnswer')+'\nbox.f=shownAnswer;',{box,window:S});
  for(const q of bank)for(const a of wrongs(q))assert.ok(!ID_RE.test(box.f(q,a)),'shownAnswer '+q.id);
  // «её всё равно нужно набрать» footer: hidden on tap/choice cards
  assert.match(grab(appSrc,'render'),/const note=document\.querySelector\('\.practice-note'\);if\(note\)note\.hidden=supportKind\(q\);/);
}
ok('B1 human answer text for all 71 bank tasks (right + every wrong option); no chain/AI-codes/morph/«набрать» on support kinds');

// ── B2: layout — support kinds in the question body, labels/slot visible, dock not sticky ──
{
  const r=grab(appSrc,'render');
  assert.match(r,/encodingMarkup\(q\)\}\$\{supportKind\(q\)\?answerMarkup\(q\):''\}/);
  assert.match(r,/<div class="composer-row">\$\{supportKind\(q\)\?'':answerMarkup\(q\)\}<\/div>/);
  assert.match(r,/practice-dock typing-dock\$\{supportKind\(q\)\?' rk-dock':''\}/);
  assert.ok(/\.question-body \.rk \.field-label\{position:static;width:auto;height:auto;overflow:visible;clip:auto;display:block/.test(css),'/\\.question-body \\.rk \\.field-label\\{pos');
  assert.ok(/\.question-body \.rk \.rk-built\{min-height:2\.75rem/.test(css),'/\\.question-body \\.rk \\.rk-built\\{min-he');
  assert.ok(/\.practice-dock\.rk-dock\{position:static;box-shadow:none\}/.test(css),'/\\.practice-dock\\.rk-dock\\{position:stat');
  // kb-compact (typed cards) untouched: the sticky typing dock rule is still there
  assert.ok(/\.practice-dock\s*\{[^}]*position:\s*sticky/.test(css),'typing dock still sticky');
  // no palette change: the new block only uses existing variables
  const block=css.slice(css.indexOf('r7 2b QA B2'));assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(block),'no raw colours');
}
ok('B2 bank labels («Собери»/«Кусочки»/sort stems) + answer slot visible, support dock static (no overlap), kb-compact and palette unchanged');

// ── B3/B4/m1/m2/m3: bank texts ──
{
  const by=id=>{const q=Q.get(id);assert.ok(q,id);return q;};
  assert.equal(by('b34-42-detect-01').explanation,'После отрицания -ба/-ма/-па всегда Д: жазбады.');
  const d3=by('b34-42-detect-03');
  assert.ok(d3.payload.broken_step.options.every(o=>!/мық|-қ\b|біз/.test(o.text)),'B4 options neutral: '+JSON.stringify(d3.payload.broken_step.options));
  assert.equal(d3.payload.target,'жаздымыз');
  // no broken-step option names the correct form of its own task
  for(const q of bank.filter(q=>q.kind==='detect'&&q.payload.broken_step)){
    const ex=q.explanation||'',forms=new Set((ex.match(/[а-яё]*[әғқңөұүһі][а-яёәғқңөұүһі]*/gi)||[]).filter(w=>w.length>=4));
    const tail=(/:\s*([а-яёәғқңөұүһі]{4,})\.?$/i.exec(ex)||[])[1],head=/^([а-яёәғқңөұүһі]{4,}):/i.exec(ex);
    if(tail)forms.add(tail);if(head)forms.add(head[1]);
    for(const o of q.payload.broken_step.options){
      assert.ok(!/не -|= -/.test(o.text),'contrast giveaway '+q.id+': '+o.text);
      for(const f of forms)if(!q.payload.target.includes(f))assert.ok(!o.text.includes(f),'option names the answer '+q.id+': '+o.text+' ~ '+f);
    }
  }
  assert.equal(by('b34-41-detect-01').explanation,'істеймін: после гласной основы нужна связка й.');
  assert.equal(by('b34-31-build-03').stimulus,'мои книги (сначала «много», потом «чьё»)');
  const all=bank.map(q=>JSON.stringify([q.title,q.stimulus,q.explanation,q.payload])).join('\n');
  for(const jargon of ['наклейк','подпорк','закон края','поезд','класс 2','после Й всегда','хвост','глух','-мық','фамильяр','Целев','Норматив','указател'])
    assert.ok(!all.includes(jargon),'jargon left: '+jargon);
  const b31=bank.filter(q=>q.lessonId==='3-1').map(q=>JSON.stringify([q.stimulus,q.explanation,q.payload])).join('\n');
  for(const w of ['перед гласным притяжательным','после гласной -сы/-сі','п/к/қ → б/г/ғ'])assert.ok(b31.toLowerCase().includes(w.toLowerCase()),'3-1 theory wording '+w);
}
ok('B3 жазбады explanation · B4 neutral жаздымыз options · m1 связка й · m2 «сначала много» · m3 3-1 theory wording, no jargon in the 71 tasks');

// ── B5/B6: bank sessions — own bank tasks only, stable denominator, no «уже повторялось» ──
{
  const ca=grab(appSrc,'checkAnswer');
  assert.ok(/return String\(activeLesson\|\|''\)\.startsWith\('b34-track-'\)&&\(mode==='lesson'\|\|mode==='voluntary'\);\}/.test(grab(appSrc,'isBankSession')),'isBankSession');
  assert.match(ca,/const bankRun=isBankSession\(\);\s*if\(bankRun\)\{[\s\S]{0,200}if\(!result\.correct&&!queue\.slice\(position\+1\)\.includes\(q\.id\)\)queue\.push\(q\.id\);\s*\}else if\(stageContext\)/);
  assert.match(ca,/if\(!stageContext&&!bankRun&&mate&&!result\.correct&&!hinted\)/);
  assert.match(ca,/if\(mode!=='homework'&&!homeworkMode&&!bankRun&&!q\.bank\)\{\s*const extra=window\.AiTutor\.takeRemediation/);
  // functional: the bank counter
  const rs=grab(appSrc,'renderStats');assert.match(rs,/else if\(isBankSession\(\)\)\{const total=new Set\(practiceIds\)\.size,reached=new Set\(queue\.slice\(0,position\+1\)\.filter\(id=>practiceIds\.includes\(id\)\)\)\.size;/);
  const step=(queue,practiceIds,position)=>{const total=new Set(practiceIds).size,reached=new Set(queue.slice(0,position+1).filter(id=>practiceIds.includes(id))).size;return `Шаг ${Math.max(1,Math.min(reached,total))} из ${total}`;};
  const ids=['a','b','c','d'],qq=[...ids,'a','c'];
  assert.deepEqual(qq.map((_,i)=>step(qq,ids,i)),['Шаг 1 из 4','Шаг 2 из 4','Шаг 3 из 4','Шаг 4 из 4','Шаг 4 из 4','Шаг 4 из 4']);
  // bank tracks hold only their own bank ids
  for(const l of B34){const tracks=S.LEARNING.lessons.filter(t=>String(t.id).startsWith('b34-track-'+l+'-'));assert.equal(tracks.length,5,l);
    for(const t of tracks){const g=t.id.split('-').at(-1);for(const id of t.questionIds){const q=Q.get(id);assert.ok(q&&q.bank&&q.lessonId===l&&id.startsWith('b34-'+l.replace('-','')+'-'+g+'-'),t.id+' '+id);}}}
  // B6: support kinds never feed AiTutor.noteAnswer → sameErrorCount cannot reach the «уже повторялось» threshold from bank answers
  assert.match(ca,/aiRepeat=window\.AiTutor&&aiCodes\[0\]&&window\.AiTutor\.shouldOfferExplain\(aiCodes\[0\]\)/);
}
ok('B5 bank session = own bank tasks only (no fillers/remediation/contrast) · B6 «Шаг N из M» M fixed, «уже повторялось» never from support kinds');

// ── B7: қалайсың forms stay open until 4/4 independent ──
{
  const st=P0();function P0(){return S.ProgressStore&&S.ProgressStore.empty?S.ProgressStore.empty():{events:[],records:{},evidence:E.empty?E.empty():undefined};}
  if(!st.evidence&&E.empty)st.evidence=E.empty();
  const box={};vm.runInNewContext(grab(appSrc,'pendingFormCards')+'\nbox.f=pendingFormCards;',{box,state:st,byId:Q,window:S});
  const hw=R.homework('4-2').homework.word_question_ids;
  const forms=hw.filter(id=>Q.get(id)&&Q.get(id).formCheck);assert.equal(forms.length,4);
  assert.deepEqual(plain(box.f('4-2',hw)),plain(forms),'fresh: all four open');
  let seq=0;const obs=(q,a,pres,first=true)=>E.observe(st,{q,answers:[a],result:core.evaluate(q,[a]),event:{id:'b7:'+(++seq),at:Date.now()+seq},responseModes:['typed'],origin:'homework',presentation:pres,first,lessonId:'4-2'});
  const f=forms.map(id=>Q.get(id));
  obs(f[0],f[0].fields[0].answers[0],'p1');obs(f[1],f[1].fields[0].answers[0],'p2');
  obs(f[2],'қате','p3');obs(f[2],f[2].fields[0].answers[0],'p3',false); // wrong first try, right on retry (same presentation)
  obs(f[3],'қате','p4');
  assert.deepEqual(plain(box.f('4-2',hw)),plain([forms[2],forms[3]]),'two forms still open after the session');
  assert.equal(E.formStatus(st,'vocab:4-2:qalaisyn').done,2);
  obs(f[2],f[2].fields[0].answers[0],'p5');obs(f[3],f[3].fields[0].answers[0],'p6'); // come back later: first try of a new presentation
  assert.deepEqual(plain(box.f('4-2',hw)),[]);assert.equal(E.formStatus(st,'vocab:4-2:qalaisyn').done,4);
  const ca=grab(appSrc,'checkAnswer'),sh=grab(appSrc,'startHomework');
  assert.match(ca,/if\(hwPart==='words'&&q\.formCheck&&pendingFormCards\(hwLesson,\[q\.id\]\)\.length&&!queue\.slice\(position\+1\)\.includes\(q\.id\)\)queue\.push\(q\.id\);/);
  assert.match(sh,/const back=pendingFormCards\(lessonId,all\)\.filter\(id=>answered\.has\(id\)&&!queue\.slice\(position\)\.includes\(id\)\);\s*if\(back\.length\)\{if\(position>=queue\.length\)\{queue=back;position=0;\}else queue=queue\.concat\(back\);/);
}
ok('B7 a missed қалайсың form comes back (same session + «Продолжить слова») and counts on a later first try → 4 из 4');

// ── counter decision: «Встречалось» = answered cards only ──
{
  const mk=(state,records)=>{const box={};vm.runInNewContext(grab(appSrc,'answeredSet')+grab(appSrc,'homeworkCounter')+grab(appSrc,'wordGroupCounter')+'\nbox.w=wordGroupCounter;box.h=homeworkCounter;',{box,state,records,byId:Q,window:S,hwPart:'words'});return box;};
  const hw=R.homework('4-2').homework.word_question_ids;
  // shown but unanswered: records.seen/attempts>0 (scheduler alias) — must not count
  const shownRecords={[hw[0]]:{seen:1,attempts:1,review_count:0}};
  let b=mk({events:[],homeworkAttempts:{}},shownRecords);
  assert.deepEqual(plain(b.w(hw)),{tried:0,total:13});assert.deepEqual(plain(b.h(hw)),{tried:0,total:13});
  b=mk({events:[{type:'answer',card_id:hw[0],at:1}],homeworkAttempts:{}},shownRecords);assert.equal(b.w(hw).tried,1);
  b=mk({events:[],homeworkAttempts:{'4-2':{items:[{id:hw[2]}]}}},{});assert.equal(b.w(hw).tried,1,'homework sheet item counts');
  b=mk({events:[],homeworkAttempts:{}},{[hw[4]]:{seen:3,attempts:3,review_count:2}});assert.equal(b.w(hw).tried,1,'old reviewed record counts');
  for(const l of LESSONS){const ids=R.homework(l).homework.word_question_ids;const c=mk({events:[],homeworkAttempts:{}},{}).w(ids);assert.equal(c.tried,0,l);assert.equal(c.total,R.homework(l).homework.word_ids.length,l);}
}
ok('counter: «Встречалось» counts answered cards only — fresh profile 0 из N in all 11 lessons (shown-only cards do not count)');

// ── m4/m5/m6: answers ──
{
  const ev=(id,a)=>core.evaluate(Q.get(id),[a]).correct;
  assert.ok(ev('v2-1-2-vocab-nol-ru','0')&&ev('v2-1-2-vocab-nol-ru','ноль')&&ev('v2-1-2-vocab-nol-ru','нуль'));
  const nums=S.COURSE.questions.filter(q=>q.lessonId==='1-2'&&/-ru$/.test(q.id)&&q.fields&&/^\d+$/.test(q.fields[0].answers[0]));
  assert.ok(nums.length>=19,'1-2 number cards '+nums.length);
  const RU={0:'ноль',1:'один',2:'два',3:'три',4:'четыре',5:'пять',6:'шесть',7:'семь',8:'восемь',9:'девять',10:'десять',20:'двадцать',30:'тридцать',40:'сорок',50:'пятьдесят',60:'шестьдесят',70:'семьдесят',80:'восемьдесят',90:'девяносто',100:'сто',1000:'тысяча'};
  for(const q of nums){const n=+q.fields[0].answers[0];assert.ok(core.evaluate(q,[String(n)]).correct,q.id);if(RU[n])assert.ok(core.evaluate(q,[RU[n]]).correct,q.id+' '+RU[n]);assert.ok(!core.evaluate(q,[RU[(n+1)%10]||'сто один']).correct,q.id+' wrong word');}
  for(const a of ['любить / целовать','любить','целовать','Любить, целовать'])assert.ok(ev('v2-4-2-vocab-suiu-ru-1',a),a);
  assert.ok(!ev('v2-4-2-vocab-suiu-ru-1','читать'));
  assert.equal(Q.get('v2-4-2-vocab-suiu-ru-1').title,'Узнай слово (словарная форма)');
  assert.match(Q.get('v2-4-2-vocab-suiu-ru-1').explanation,/^сүю \(словарная форма\) — любить \/ целовать/);
  assert.deepEqual(plain(Q.get('v2-4-2-vocab-oqu-ru-2').fields[0].answers),['я читал(а) / прочитал(а)']);
  for(const a of ['я читал','я читала','я прочитала','я прочитал','я читал(а) / прочитал(а)','я читал / прочитал'])assert.ok(ev('v2-4-2-vocab-oqu-ru-2',a),a);
  for(const a of ['читать','читал','мы читали'])assert.ok(!ev('v2-4-2-vocab-oqu-ru-2',a),a);
  // the subject is never dropped (3-3 «Вы мой родственник» ≠ «мой родственник»)
  assert.ok(!core.evaluate({kind:'fields',fields:[{kind:'text',answers:['Вы мой родственник']}]},['мой родственник']).correct);
  assert.deepEqual(plain(Q.get('v2-4-2-vocab-suiu-ru-2').fields[0].answers),['я любил(а) / поцеловал(а)']);
  // Kazakh answers are never split/expanded
  assert.ok(!core.evaluate({kind:'fields',fields:[{kind:'text',answers:['жаздым']}]},['жаздым / жазды']).correct);
  // да/де particle untouched
  const da=JSON.parse(read('lessons/4-2/lesson.json')).vocabulary.find(v=>v.id==='vocab:4-2:da');assert.ok(!da.form_translations);
}
ok('m4 1-2 numbers: digit or Russian word (нөл → 0 / ноль) · m5 сүю = словарная форма, «любить / целовать» accepted · m6 оқыдым = «я читал(а) / прочитал(а)»');

// ── m7: recognition first in every homework word list ──
{
  for(const l of LESSONS){const ids=H.buildPack(l,S.COURSE.questions,S.COURSE,{events:[]})?.homework?.word_question_ids||[];
    for(const id of ids){const m=/^(.*)-kk$/.exec(id);if(m&&ids.includes(m[1]+'-ru'))assert.ok(ids.indexOf(m[1]+'-ru')<ids.indexOf(id),l+' '+id);}}
  const ids22=H.buildPack('2-2',S.COURSE.questions,S.COURSE,{events:[]}).homework.word_question_ids;
  assert.deepEqual(plain(ids22.filter(x=>/hw22-1[1-4]-/.test(x))),['hw22-11-ru','hw22-11-kk','hw22-12-ru','hw22-12-kk','hw22-13-ru','hw22-13-kk','hw22-14-ru','hw22-14-kk']);
  assert.deepEqual(plain(H.recognitionFirst(['a-kk','a-ru','b','c-ru','c-kk'])),['a-ru','a-kk','b','c-ru','c-kk']);
}
ok('m7 «сначала узнать (казахский → русский)»: every X-ru before its X-kk (2-2 сау бол…)');

// ── m8: only Kazakh words are tap-to-gloss in bank headings; no «Подсказка ·» in the a11y tree ──
{
  const box={};vm.runInNewContext(tutorSrc.slice(tutorSrc.indexOf(' const KK_RE='),tutorSrc.indexOf('\n',tutorSrc.indexOf(' const KK_RE=')))+'\n const esc=s=>String(s);'+grab(tutorSrc,'markKkWords').replace(/^ \/\/.*$/mg,'')+'\nbox.f=markKkWords;',{box,KK_ONLY:/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/});
  const taps=h=>(h.match(/data-tutor-word="([^"]+)"/g)||[]).map(x=>x.slice(17,-1));
  assert.deepEqual(taps(box.f('Обе формы прошедшего',{onlyKazakh:true})),[]);
  assert.deepEqual(taps(box.f('ваши книги (сендердің)',{onlyKazakh:true})),['сендердің']);
  assert.deepEqual(taps(box.f('Вы (Сіз) написали',{onlyKazakh:true})),['Сіз']);
  assert.deepEqual(taps(box.f('кітап адам')),['кітап','адам'],'Kazakh stimulus unchanged');
  for(const q of bank)for(const t of taps(box.f(q.stimulus,{onlyKazakh:true})))assert.match(t,/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/,q.id);
  assert.match(grab(appSrc,'render'),/lang="\$\{q\.title\.includes\('на казахский'\)\|\|q\.bank\?'ru':'kk'\}"/);
  assert.match(grab(appSrc,'render'),/markKkWords\(q\.stimulus,q\.bank\?\{onlyKazakh:true\}:undefined\)/);
  assert.ok(/\.hint::before\{content:"Подсказка · ";content:"Подсказка · " \/ "";/.test(css),'/\\.hint::before\\{content:"Подсказка · ";');
  assert.ok(/#association-box::before\{content:none\}/.test(css),'/#association-box::before\\{content:none\\');
}
ok('m8 bank headings: only Kazakh words underlined/clickable; «Подсказка ·» prefix not read out, not on the association box');

console.log('R7_STEP2B_QA57_OK',passed);
