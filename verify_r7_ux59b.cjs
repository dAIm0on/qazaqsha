// r7 ux59b (QA #59 cf03db5): weak spots without raw keys / empty arrows, Today card = «Продолжить» target, work = answers only,
// own queue per entry point, logo history entry; plus the shown-only due fix and the ended-session reload guard.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const app=read('app.js'),dash=read('dashboard.js'),learn=read('learning.js'),scan=read('tools/learner-text-scan.mjs'),diag=read('diagnostics.js');
const H=require('./homework.js'),S=require('./scheduler.js');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
const slice=(src,from,to)=>{const i=src.indexOf(from);assert.ok(i>=0,'missing '+from);const j=src.indexOf(to,i+from.length);assert.ok(j>i,'missing end '+to);return src.slice(i,j);};
// #1 names
{
  const skill=[...new Set((diag.match(/const SKILL=\{[^}]*\}/)[0].match(/'rule:[^']+'/g)||[]).map(s=>s.slice(1,-1)))];
  assert.ok(skill.length>40);for(const k of skill)assert.ok(H.weakLabel(k),'no Russian name for '+k);
  assert.equal(H.weakLabel('confuse:lex-4'),'сен и сіз');assert.equal(H.weakLabel('confuse:алты_алпыс'),'6 и 60');
  assert.equal(H.weakLabel('confuse:pair'),'','unnamed confuse hidden');assert.equal(H.weakLabel('confuse:lex-99'),'');
  assert.equal(H.weakLabel('rule:v2:4-2:bridge::application'),'Правило урока 4–2','no catalog in node → lesson fallback');
  assert.equal(H.weakLabel('vocab:4-2:bar::production'),'Слово: написать по-казахски');
  assert.equal(H.weakLabel('card:x1',[{id:'x1',title:'Напиши форму'}]),'Задание: Напиши форму');assert.equal(H.weakLabel('card:zz',[]),'');
  assert.equal(H.weakLabel('something:raw'),'','unknown keys are hidden, never raw');
  for(const k of skill.concat(['confuse:lex-4','rule:v2:4-2:bridge::application']))assert.ok(!/\w+:[\w:-]+/.test(H.weakLabel(k)),'raw-looking name for '+k);
  assert.equal(H.weakDetail({count:7,expected:'',actual:'тест'}),'7 раз за 14 дней','no «. → тест»');
  assert.equal(H.weakDetail({count:3,expected:'Сөйлейсіз',actual:''}),'3 раза за 14 дней');
  assert.equal(H.weakDetail({count:24,expected:'Сөйлемейді',actual:'тест'}),'24 раза за 14 дней. Сөйлемейді → тест');
  assert.equal(H.weakDetail({count:21,expected:'а',actual:'а'}),'21 раз за 14 дней');
}
ok('#1 every weak-spot key has a Russian name or is hidden (diagnostics SKILL tags, rule:<id>, confuse:lex-N, words, card:); arrows only with both sides');
{
  const now=Date.UTC(2026,9,6,12),q={id:'c1',lessonId:'4-2',topic:'verbs',ruleIds:['v2:4-2:sen-siz'],kind:'fields',fields:[{answers:['Сіз сөйледіңіз']}],stimulus:'вы (сіз) говорили'};
  const ev=(i,a)=>({id:'e'+i,type:'answer',card_id:'c1',at:now-i*60000,correct:false,first_try_correct:0,answers:[a],confusion_tag:'ending',confuse_pair_id:'lex-4'});
  const typed={events:[1,2,3,4,5].map(i=>ev(i,'тест')),homeworkAttempts:{}};
  const w1=H.weakSpots(typed,[q],now);assert.ok(!w1.some(w=>w.key.startsWith('confuse:')),'«тест» on a сен/сіз card is not a confusion');
  const swapped={events:[1,2,3].map(i=>ev(i,'Сен сөйледіңіз')),homeworkAttempts:{}};
  const w2=H.weakSpots(swapped,[q],now);assert.ok(w2.some(w=>w.key==='confuse:сен_сіз'),'сен typed for сіз is');
  assert.equal(H.weakLabel('confuse:сен_сіз'),'сен и сіз');
  const lw=H.learnerWeakSpots(typed,[q],now);assert.ok(lw.length&&lw.every(w=>w.label&&!/\w+:[\w:-]+/.test(w.label)),'learner list is named');
}
ok('#1 «confuse:lex-4 · → тест» gone: a confusion needs the other word of the pair typed; the learner list carries names only');
{
  assert.ok(!dash.includes('Часто путаю: ${'),'«Часто путаю: N →» removed');
  assert.ok(dash.includes("p&&p.known_alternative&&String(p.expected_answer||'').trim()&&String(p.wrong_answer_given||'').trim()"),'pairs only with both sides, real answers');
  assert.ok(dash.includes('<strong lang="kk">${esc(p.expected_answer)} и ${esc(p.wrong_answer_given)}</strong>'));
  assert.ok(!/weakLabel\(w\.key\):w\.key/.test(dash),'no raw key fallback in the dashboard');
  assert.ok(dash.includes('window.Homework.learnerWeakSpots(state,api.questions())'),'Today and «Сейчас трудно» use the named list');
  assert.ok(!/Ждали: \$\{esc\(w\.expected\)\} · написала/.test(app),'homework sheet: no «Ждали:  · написала:»');
  assert.ok(dash.includes("const k=window.ErrorDiagnostics.labels[type]||'Другие ошибки';"),'«Частые ошибки»: legacy types (wrong_form) grouped, not raw');
  for(const src of ["['raw key',/\\b[A-Za-z_]\\w*:[\\w:-]+/]","['arrow, empty left',","['arrow, empty right',","['«Часто путаю: N →»',/Часто путаю:\\s*\\d+/]","{name:'typed-wrong-4-2',state:null,ai:null,drive:'4-2'}","'review']"])assert.ok(scan.includes(src),'scan: '+src);
  const L=/(?:[.:;,(·][ \t]*→|^[ \t]*→[ \t]*\S)/m,R=/\S[ \t]*→[ \t]*(?:$|[.,;:)·])/m,K=/\b[A-Za-z_]\w*:[\w:-]+/;
  assert.ok(K.test('Слабые места\nrule:v2:4-2:bridge::application')&&K.test('confuse:lex-4'));assert.ok(L.test('7 за 14 дней. → тест'));assert.ok(R.test('Часто путаю: 9 →\nНавыки'));
  assert.ok(!L.test('← Занятия\n→\nУрок 1-1')&&!R.test('← Занятия\n→\nУрок 1-1'),'breadcrumb separator line is fine');assert.ok(!L.test('Сөйлемейді → тест')&&!R.test('казахский → русский'));
}
ok('#1 «Слабые места» sources: weakSpots rows, «Правила», «Повторяются ошибки», pairs (old «Часто путаю: N →»), «Сейчас трудно», homework sheet; the scan now flags raw keys, empty arrows, «Часто путаю: N →»');
// #2 one resolver
{
  const src=slice(app,' function isLessonPracticeSnap(s){',' function runtimePracticeLessonId(){')+slice(app,' function pathOf(id){',' function continueLesson(id){');
  const mk=(lp,rp,gp)=>{const ctx={box:{},state:{grammarPath:gp||null},P:{ensureLessonProgress:()=>lp,ensureCourseProgress:()=>({resumePointer:rp})},window:{LessonV2Runtime:{isV2:()=>true}},
    pathNeedsV2TheoryReplay:()=>false,core:{sessionStep:(q,p,a)=>({step:p+1,total:new Set(q).size})},chapterCheckpoint:(id,p)=>'Глава '+p.chapterId+' из 13 · Действие уже произошло · шаг '+((p.beat||0)+1),nextChapterOf:()=>({chapterId:1,beat:0})};
    vm.runInNewContext(src+'\nbox.f=resumeTarget;',ctx);return ctx.box.f('4-2');};
  const ps={mode:'course',queue:['a','b','c','d','e','f','g','h','i','j','k','l','m','n'],position:9,answered:false,updatedAt:200};
  const qa=mk({status:'in_progress',path:{chapterId:2,beat:3,phase:'beat',updatedAt:100},practiceSession:ps},{lessonId:'4-2',surface:'practice'});
  assert.equal(qa.kind,'practice');assert.equal(qa.hint,'Глава 2 из 13 · Действие уже произошло · практика, шаг 10 из 14','the QA card → practice target');
  const th=mk({status:'in_progress',path:{chapterId:2,beat:3,phase:'beat',updatedAt:300},practiceSession:ps},{lessonId:'4-2',surface:'path'});
  assert.equal(th.kind,'theory');assert.ok(/шаг 4$/.test(th.hint),'theory → chapter step');
  const shelf=mk({status:'in_progress',path:{chapterId:2,beat:0,phase:'beat'},practiceSession:Object.assign({},ps,{mode:'lesson',activeLesson:'v2-track-stage-4-2-wb-1-1'})},{lessonId:'4-2',surface:'practice'});
  assert.equal(shelf.kind,'theory','a shelf snapshot is not lesson practice');
  const cont=slice(app,' function continueLesson(id){',' function resetCounts(){');
  assert.ok(/const t=resumeTarget\(id\);\n   if\(t\.kind==='practice'&&restoreLessonPractice\(id\)\)/.test(cont)&&cont.includes("if(t.kind==='theory'){openPathLesson(id,{meaningful:true});return;}"),'«Продолжить» routes by the same target');
  assert.ok(!cont.includes('forceTheory'),'no separate theory rule that ignores the card');
  const sn=slice(app,' function stepNow(){',' function continueStep(){');assert.ok(sn.includes('const t=resumeTarget(lessonId);')&&sn.includes('hint:t.hint'),'Today card text = target hint');
  assert.ok(learn.includes("api.resumeTarget?'<p class=\"small\" data-resume-hint>'+esc(api.resumeTarget(id).hint)"),'hub line = target hint');
  assert.ok(dash.includes('if(api.resumeTarget&&p.status!==\'completed\')return api.resumeTarget(id).hint;'),'picker line = target hint');
}
ok('#2 Today card text and «Продолжить» target come from resumeTarget(): «Глава 2 из 13 · … · практика, шаг 10 из 14» opens that practice step (draft restored with it)');
// #3 answers only
{
  const src=slice(app,' function lessonOfEvent(e){',' function nextChapterOf(lessonId){');
  const lessons={};const ids=['1-1','2-1','3-1','4-2'];for(const id of ids)lessons[id]={status:'not_started'};
  const state={courseProgress:{lessons,resumePointer:{lessonId:'1-1',surface:'path',updatedAt:100}},homeworkAttempts:{},events:[]};
  const ctx={box:{},P:{ensureCourseProgress:s=>s.courseProgress,ensureLessonProgress:(s,id)=>s.courseProgress.lessons[id]},state,byId:new Map(),courseIds:()=>ids,
    window:{LESSON_V2_COMPILED:[{lesson_id:'4-2',original_exercises:[{id:'e42-x'}],practice_bank:{items:[{id:'b34-42-choice-01'}]}}]}};
  vm.runInNewContext(src+'\nbox.f=namedCourse;',ctx);const f=ctx.box.f;
  state.events.push({type:'answer',card_id:'e42-x',at:200});assert.equal(f(),'4-2','old event of an uninstalled lesson (compiled index)');
  state.courseProgress.resumePointer={lessonId:'3-1',surface:'practice',updatedAt:900};lessons['3-1'].lastAttemptAt=900;lessons['3-1'].practiceSession={queue:['a']};
  assert.equal(f(),'4-2','opening «Сборник 1-1» in 3-1 (pointer / start / snapshot, no answer) does not switch Today');
  state.events.push({type:'answer',card_id:'??',lesson_id:'3-1',at:1000});assert.equal(f(),'3-1','an answer in 3-1 does');
  assert.ok(!slice(app,' function lessonActivity(){',' function namedCourse(){').includes('lastAttemptAt')&&!slice(app,' function lessonActivity(){',' function namedCourse(){').includes('updatedAt'),'only answers count');
  assert.ok(app.includes('if(!stageContext&&q.lessonId&&courseIds().includes(String(q.lessonId)))event.lesson_id=String(q.lessonId);'),'answers carry lesson_id');
}
ok('#3 Today = lesson of the latest ANSWER; opening a session, a lesson start or a pointer move without an answer is not work');
{
  const shown=S.shown(undefined,1000);assert.equal(shown.next_review,null);const again=S.shown(shown,2000);
  assert.equal(S.migrate(again,3000).next_review,null,'shown twice, never answered → still not due (cf03db5: due, 28 → 29)');assert.equal(S.due(S.migrate(again,3000),4000),false);
  assert.ok(S.migrate({seen:2},5000).next_review===5000&&S.migrate({attempts:3,correct:2},5000).next_review===5000,'legacy records keep seen → due');
  const ans=S.answer(again,{at:5000,correct:false,hinted:false});assert.ok(ans.next_review>0&&ans.review_count===1,'an answer schedules');
  const boot=slice(app,"// r7 ux59b #3: «Повторить сегодня» counted only cards","}catch(e){}");
  assert.ok(boot.includes('r.needsReview||core.isDue(r,now)')&&boot.includes('for(const id of need)ensureV2(id);'),'lessons owning due cards are installed at start (no 28 → 0 after reload)');
}
ok('#3 «Повторить сегодня» 28 → 29: a card only shown by opening «Сборник 1-1» (twice) became due; now only answers schedule; the count no longer depends on which lessons are loaded');
// #4 own queue
{
  const src=slice(app,' function isLessonPracticeSnap(s){',' function persistLessonPractice(');
  const run=(m,act,block,q,pos)=>{const ctx={box:{},mode:m,activeLesson:act,courseBlock:block,queue:q,position:pos,P:{courseIds:()=>['3-1','4-2']}};vm.runInNewContext(src+'\nbox.f=runtimePracticeLessonId;box.g=isLessonPracticeSnap;',ctx);return ctx.box;};
  assert.equal(run('lesson','v2-track-stage-3-1-1-1','3-1',['a'],0).f(),null,'shelf session is not saved as lesson practice');
  assert.equal(run('lesson','b34-track-3-1-choice','3-1',['a'],0).f(),null,'bank session either');
  assert.equal(run('course',null,'3-1',['a','b'],0).f(),'3-1','lesson practice is');
  const g=run('course',null,'3-1',[],0).g;assert.equal(g({mode:'lesson',activeLesson:'v2-track-stage-3-1-1-1',queue:['a']}),false,'older foreign snapshot ignored');assert.equal(g({mode:'course',queue:['a']}),true);
  assert.ok(/function restoreLessonPractice\(id\)\{\n   practiceHold=null;\n   const lp=P\.ensureLessonProgress\(state,id\),s=lessonPracticeOf\(lp\);/.test(app));
}
ok('#4 each entry point keeps its own queue: shelves / bank tracks never land in «Практика этого урока» (all 11 lessons checked headless)');
// #5 logo history
{
  const h=slice(app,"const brandLink=document.querySelector('a.brand');"," $('#pause-session').onclick");
  assert.ok(h.includes("history.replaceState(Object.assign({},history.state||{},{qzView:from}),'');history.pushState({qzView:'today'},'');"),'one entry, same URL');
  assert.ok(!/pushState\([^)]*,[^)]*,[^)]+\)/.test(h),'no URL argument → F5 / resumeSurface / SW untouched');
  assert.ok(h.includes("window.addEventListener('popstate',ev=>{")&&h.includes("if(v==='practice'&&!(queue.length>position))return;")&&h.includes('showView(v);save();'),'«Назад» returns to the screen, never into an ended session');
}
ok('#5 logo adds one history entry (same URL); browser «Назад» returns to the previous screen with its session and draft');
// reload guard
{
  assert.ok(app.includes("restoredEnded=mode==='course'&&!stageContext&&position>=queue.length;"),'restored ended course session flagged');
  const re=slice(app,"     if(restoredEnded){","     markLessonCompleted(lessonId);");assert.ok(!re.includes('markLessonCompleted')&&re.includes('restoredEnded=false;'));
}
ok('reload of an already ended course session shows the step screen and no longer marks the lesson completed (seen on prod)');
console.log('verify_r7_ux59b: '+passed+' checks passed');
