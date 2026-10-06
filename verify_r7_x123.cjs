#!/usr/bin/env node
'use strict';
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

/* r7 X1–X3 · казакша re-QA on #57 (PASS) found 3 more + minors.
   X1 author lesson map / canon docs on the learner screen (all lessons) · X2 first-try / peek-rate labels ·
   X3 ← Назад / «Сделать паузу» goes back to where the learner came from (not to the previous card) ·
   step: «Начать» of another lesson keeps the saved step; cold start opens the saved practice, picker = resume ·
   minors: Russian counts, explicit «отметь» prompts + one-line why on a wrong tap, «Убрать последний» + «Очистить»,
   bank header names the kind, айту accepts «сказать».
   Headless repro (desktop + 390px): /workspace/r7/x123fix/{x1scan,x23,step2,minor}.mjs (docs/r7/R7_X123.md). */
const S=fullStack();
const core=S.TrainerCore,RK=S.ResponseKinds,R=S.LessonV2Runtime,Open=S.ExplainOpen,Bank=S.ExplainBank,Diag=S.ErrorDiagnostics;
const LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'];
for(const id of LESSONS)R.ensure(id);
const Q=new Map(S.COURSE.questions.map(q=>[q.id,q]));
const dashSrc=read('dashboard.js'),eoSrc=read('explain-open.js'),rkSrc=read('response-kinds.js'),learnSrc=read('learning.js');
const AUTHOR=/Карта урока|Статус:|Файл дыр|[\wа-яё]\.md\b|\bS3\d\.|Разжёвано для ученика|разжёвано|На сайт —|Круг [A-G]\b|рецепт|Русский refresh|Исходник|drive\.google|data-canon/;

// X1
{
  assert.equal(Open.map31(),'','map31 is empty');
  assert.ok(!/ExplainOpen\.map31\(\)/.test(appSrc),'renderPath no longer renders the 3-1 lesson map');
  assert.ok(!/const canon=canonHtml\(ruleId\);\s*if\(canon\)return canon;/.test(eoSrc),'fullHtml does not return author canon docs');
  const ids=(Bank.CARDS||Bank.cards||[]).map(c=>c.id).concat(['T20_POSS','T21_POSS_ASSIM','T22_BAR_ZHOK','T23_POSS_PL','T24_POSS_BIZ','T25_POSS_SENDER','T26_POSS_OLAR','T27_DEIXIS']);
  let n=0;
  for(const id of new Set(ids)){
    const full=Open.fullHtml(id);if(!full)continue;n++;
    assert.ok(!AUTHOR.test(full),'author note in the full rule panel '+id+': '+(full.match(AUTHOR)||[])[0]);
    const q={ruleIds:[id],fields:[{answers:['zzzz']}],explanation:'',stimulus:''};
    const fb=Open.forQuestion(q,['xxxx']);
    assert.ok(!AUTHOR.test(fb),'author note in wrong feedback '+id);
    assert.ok(!/Верно:/.test(fb),'wrong feedback rule panel carries no «Верно: …» example lines '+id);
  }
  assert.ok(n>=8,'rule panels checked: '+n);
  // the 3-1 / 3-2 author docs are still in the repo (authors), but no learner surface calls them
  assert.ok(S.CanonTexts&&S.CanonTexts.DOCS.s31,'canon docs kept for authors');
  for(const f of ['app.js','learning.js','dashboard.js','tutor-ui.js'])assert.ok(!/CanonTexts|canonHtml/.test(read(f)),f+' does not render canon docs');
  // lesson theory beats of every lesson: no author status lines / file names / lesson maps
  for(const les of (S.GrammarChapters&&S.GrammarChapters.LESSONS)||[]){
    const t=JSON.stringify(les.chapters||[]);
    assert.ok(!/Карта урока|Статус:|Файл дыр|[\wа-яё]\.md\b|Круг [A-G]\b|разжёвано|На сайт —/.test(t),'theory of '+les.id);
  }
}
ok('X1 no author lesson map / canon docs (S31 status, Файл дыр, .md, Круг A–G, Исходник) on learner screens; wrong-feedback panel without «Верно:» lines');

// X2
{
  for(const k of ['first-try','peek-rate','transfer-rate'])assert.equal(Diag.pauseLine(k,'4/20'),'',k);
  assert.equal(Diag.pauseLine('savings','T2 savings 2'),'T2 savings 2');
  assert.ok(!/pauseLine\(/.test(dashSrc),'dashboard no longer prints metric kinds');
  assert.ok(/metricParts\(state,state\.events\)\.filter\(part=>part\.kind==='savings'\)/.test(dashSrc),'only the human «Стало легче вспоминать» line remains');
  for(const f of ['app.js','dashboard.js','learning.js','tutor-ui.js','homework.js'])assert.ok(!/['"`]first-try|['"`]peek-rate/.test(read(f).replace(/\/\/[^\n]*/g,'')),f+' prints no first-try / peek-rate');
}
ok('X2 first-try / peek-rate / transfer-rate are not shown (no developer mode exists)');

// X3
{
  const box={};
  const ctx={box,trainerReturn:null,mode:'homework',hwReturn:null,pathPracticeReturn:null,sessionOrigin:null};
  const pt=appSrc.slice(appSrc.indexOf(' function pauseTarget('),appSrc.indexOf('\n }\n',appSrc.indexOf(' function pauseTarget('))+4);
  vm.runInNewContext(pt+'\nbox.f=pauseTarget;',ctx);
  const t=(o)=>{Object.assign(ctx,{trainerReturn:null,mode:'lesson',hwReturn:null,pathPracticeReturn:null,sessionOrigin:null},o);return box.f();};
  assert.equal(t({mode:'homework'}),'homework','homework words session → Домашка');
  assert.equal(t({mode:'remediation',hwReturn:{lesson:'4-2'}}),'homework');
  assert.equal(t({trainerReturn:'numbers'}),'personal');
  assert.equal(t({mode:'exam'}),'exam');
  assert.equal(t({pathPracticeReturn:{lessonId:'4-2'}}),'path','practice from a lesson chapter → the lesson');
  assert.equal(t({sessionOrigin:'learn'}),'learn','hub track → Учёба');
  assert.equal(t({sessionOrigin:'path'}),'path');
  assert.equal(t({}),'today');
  const h=appSrc.slice(appSrc.indexOf(" $('#pause-session').onclick=()=>{"),appSrc.indexOf(" const lettersPref=$('#pref-letters');"));
  assert.ok(!/position--/.test(h),'← Назад no longer steps to the previous card');
  assert.ok(/showView\(trainerReturn\?'personal':pauseTarget\(\)\)/.test(h));
  assert.ok(/if\(next==='practice'&&view!=='practice'&&ORIGIN_VIEWS\.includes\(view\)\)sessionOrigin=view;/.test(appSrc),'showView remembers the origin');
  assert.ok(/trainerReturn,sessionOrigin\};/.test(appSrc)&&/sessionOrigin=\/\^\(today\|learn\|path\|homework/.test(appSrc),'origin saved with the session and restored');
  assert.ok(/'Сделать паузу · '\+ORIGIN_LABEL\[pauseTarget\(\)\]/.test(appSrc),'aria-label names the real target');
}
ok('X3 ← Назад / «Сделать паузу» returns to homework / hub / lesson / today (where the session came from), never to the previous card');

// step: another lesson's «Начать» keeps the saved step; cold start; picker = resume
{
  const cl=grab(appSrc,'continueLesson');
  assert.ok(cl.indexOf('ensureV2(id);')>0&&cl.indexOf('ensureV2(id);')<cl.indexOf('restoreLessonPractice(id)'),'v2 cards installed before the saved practice is restored (cold start)');
  assert.ok(/pos=Math\.min\(total,Math\.max\(0,Number\(p\.practiceSession\.position\)\|\|0\)\+\(p\.practiceSession\.answered\?1:0\)\)/.test(dashSrc),'picker «шаг N из M» counts like the resume');
}
ok('step: «Начать» of another lesson does not move the saved step; cold start opens the saved practice; picker step = resume step');

// minors
{
  const f=['карточка','карточки','карточек'];
  assert.deepEqual([0,1,2,4,5,11,12,14,21,22,25,101,111].map(n=>core.ruCount(n,f)),['0 карточек','1 карточка','2 карточки','4 карточки','5 карточек','11 карточек','12 карточек','14 карточек','21 карточка','22 карточки','25 карточек','101 карточка','111 карточек']);
  const nouns='карточек|карточки|заданий|слов|форм|глав|раз|минут|ошибок';
  const raw=new RegExp("(\\$\\{[^}]{1,60}\\}|'\\s*\\+\\s*[\\w.()\\[\\]]{1,40}\\s*\\+\\s*')\\s*("+nouns+")[\\s<.,'`]","g");
  for(const [fname,src] of [['app.js',appSrc],['dashboard.js',dashSrc],['learning.js',learnSrc]]){
    const bad=(src.match(raw)||[]).filter(x=>!/minCount/.test(x));
    assert.deepEqual(bad,[],fname+': a number glued to a fixed plural');
  }
  assert.ok(/'Ещё закрепляем '\+core\.ruCount\(waiting,\['карточку','карточки','карточек'\]\)/.test(appSrc),'«Ещё закрепляем 4 карточки»');
  // bank «отметь»
  const taps=S.COURSE.questions.filter(q=>q.bank&&q.kind==='tap-token');
  assert.equal(taps.length,11);
  for(const q of taps){
    assert.ok(!/^Обе формы/.test(q.stimulus),'explicit prompt '+q.id+': '+q.stimulus);
    assert.ok(q.why_wrong&&q.why_wrong.length<=200,'one-line why '+q.id);
    const texts=q.payload.accepted[0].map(id=>q.payload.tokens.find(t=>t.id===id).text);
    for(const x of texts)assert.ok(!q.why_wrong.includes(x),'why does not name the answer '+q.id+' '+x);
    const m=RK.markup(q,v=>String(v));
    assert.ok(/Отметь (два слова|одно слово)/.test(m),'label says how many '+q.id);
  }
  assert.equal(S.COURSE.questions.find(q=>q.id==='b34-42-tap-01').stimulus,'Два глагола в прошедшем времени (действие уже было: писал, пришёл)');
  assert.ok(/<p data-why-wrong>'\+esc\(q\.why_wrong\)/.test(appSrc)&&/if\(supportKind\(q\)&&q\.why_wrong\)return '';/.test(appSrc),'wrong tap: «Ты выбрала: …» + one line why');
  // «Собери»: Убрать последний + Очистить
  const wb=S.COURSE.questions.find(q=>q.bank&&q.kind==='word-bank');
  const m=RK.markup(wb,v=>String(v));
  assert.ok(m.includes('>Убрать последний<')&&m.includes('data-rk-clear>Очистить<')&&!m.includes('Стереть'));
  const input={value:JSON.stringify(wb.payload.accepted[0])};
  const form={classList:{contains:()=>false},querySelector:s=>s==='#rk-response'?input:null,querySelectorAll:()=>[]};
  assert.equal(RK.click(form,wb,{dataset:{},hasAttribute:a=>a==='data-rk-undo'}),true);assert.equal(JSON.parse(input.value).length,wb.payload.accepted[0].length-1,'Убрать последний drops one');
  assert.equal(RK.click(form,wb,{dataset:{},hasAttribute:a=>a==='data-rk-clear'}),true);assert.deepEqual(JSON.parse(input.value),[],'Очистить empties');
  // bank header
  const box={};
  const ctx={box,topic:'all',topics:[['all','Все']],courseBlock:'4-2',COURSE_BLOCKS:[{id:'4-2',title:'4–2'}],activeLesson:'b34-track-4-2-tap',mode:'lesson',window:{LEARNING:S.LEARNING},String};
  vm.runInNewContext(grab(appSrc,'isBankSession')+grab(appSrc,'filterSummary')+'\nbox.f=filterSummary;',ctx);
  assert.equal(box.f(),'Урок 4–2 · Отметь в строке');
  ctx.activeLesson='b34-track-4-2-detect';assert.equal(box.f(),'Урок 4–2 · Найди ошибку');
  ctx.activeLesson=null;assert.equal(box.f(),'Урок 4–2 · Все типы','non-bank sessions unchanged');
  // айту
  const ru=S.COURSE.questions.find(q=>q.lessonId==='4-2'&&q.stimulus==='айту'&&q.title==='Переведи на русский');
  assert.ok(ru,'айту card');
  for(const a of ['сказать','говорить'])assert.equal(core.evaluate(ru,[a]).correct,true,'айту ← '+a);
  const kk=S.COURSE.questions.find(q=>q.lessonId==='4-2'&&q.title==='Переведи на казахский'&&q.fields[0].answers[0]==='айту');
  assert.equal(kk.stimulus,'говорить','the gloss itself stays');
}
ok('minors: Russian counts, explicit «отметь» prompts + one-line why, «Убрать последний» / «Очистить», bank header names the kind, айту ← «сказать»');
console.log('verify_r7_x123: '+passed+' checks passed');
