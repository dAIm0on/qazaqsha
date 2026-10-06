// r7 ux59 (QA after #58): logo in place, hub lesson, Today lesson rule + chapter/step, weak spots, memory N, one back button, stable «Шаг N из M».
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const app=read('app.js'),dash=read('dashboard.js'),learn=read('learning.js'),core=read('core.js'),html=read('index.html');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
const slice=(src,from,to)=>{const i=src.indexOf(from);assert.ok(i>=0,'missing '+from);const j=src.indexOf(to,i+from.length);assert.ok(j>i,'missing end '+to);return src.slice(i,j);};
// #0 logo
{
  assert.ok(/<a class="brand" href="\.\/" aria-label="Qazaqsha, сегодня">/.test(html),'logo stays a real link (new tab / no-JS still work)');
  const h=slice(app,"const brandLink=document.querySelector('a.brand');"," $('#pause-session').onclick");
  assert.ok(/ev\.button!==0\|\|ev\.metaKey\|\|ev\.ctrlKey\|\|ev\.shiftKey\|\|ev\.altKey\)return;/.test(h),'modifier / middle clicks untouched');
  assert.ok(h.includes('ev.preventDefault();')&&h.includes("showView('today');save();"),'plain click → Сегодня in place, state saved');
  assert.ok(!/location\.(reload|href|assign)/.test(h),'no reload');
  assert.ok(app.includes("const resumeView=window.MorphState.resumeSurface("),'F5 still uses resumeSurface');
}
ok('#0 logo «Qazaqsha, сегодня» opens Сегодня without a reload; session / drafts kept (showView captures the draft); F5 unchanged');
// #1 hub lesson
{
  assert.ok(app.includes("const HUB_KEY='qazaqsha-hub-lesson';")&&/function hubLesson\(\)\{try\{const id=sessionStorage\.getItem\(HUB_KEY\)/.test(app),'navigation-only (sessionStorage), not progress');
  assert.ok(/function continueLesson\(id\)\{\n   setHubLesson\(id\);/.test(app),'«Начать / Продолжить» of a lesson selects it');
  assert.ok(app.includes('ensureV2(lessonId);setHubLesson(lessonId);'),'opening a lesson from «Все уроки» selects it');
  const ci=slice(learn,' function currentId(){',' let picked');
  assert.ok(ci.indexOf('api.hubLesson')>0&&ci.indexOf('api.hubLesson')<ci.indexOf('api.currentCourse'),'hub lesson wins over the resume lesson');
  assert.ok(learn.includes("const pr=$('#learn-practice');if(pr)pr.onclick=()=>api.startCourse(id);"),'«Практика этого урока» opens the hub lesson');
  assert.ok(learn.includes("b.onclick=()=>{if(api.startLesson)api.startLesson(b.dataset.track);};")&&learn.includes('tracksMarkup(id)'),'tracks are the hub lesson tracks');
  assert.ok(/api\.currentCourse\(\)!==id\?api\.continueLesson\(id\)/.test(learn),'hub button continues the hub lesson');
}
ok('#1 «Выбрать занятие»: «Практика этого урока», «Сборник …» tracks and the main button open the selected lesson (4-2), not 1-1');
// #2 Today lesson rule
{
  const src=slice(app,' function lessonOfEvent(e){',' function chapterCheckpoint(');
  const lessons={};const ids=['1-1','1-2','2-1','4-1','4-2'];for(const id of ids)lessons[id]={status:'not_started'};
  const state={courseProgress:{lessons,resumePointer:{lessonId:'1-1',surface:'path',updatedAt:100}},homeworkAttempts:{},events:[],grammarPath:{}};
  const P={ensureCourseProgress:s=>s.courseProgress,ensureLessonProgress:(s,id)=>s.courseProgress.lessons[id]};
  const byId=new Map([['q21',{id:'q21',lessonId:'2-1'}]]);
  const ctx={box:{},P,state,byId,courseIds:()=>ids};vm.runInNewContext(src+'\nbox.f=namedCourse;',ctx);const f=ctx.box.f;
  assert.equal(f(),'1-1','pointer only → its lesson');
  state.homeworkAttempts['4-2']={items:[{id:'x',at:200}]};assert.equal(f(),'4-2','ДЗ 4-2 after the pointer → 4-2');
  state.events.push({type:'answer',card_id:'q21',at:300});assert.equal(f(),'2-1','a 2-1 track / practice answer later → 2-1');
  state.events.push({type:'answer',card_id:'zz',block:'homework:4-1',at:400});assert.equal(f(),'4-1','event block names the lesson');
  lessons['4-1'].status='completed';assert.equal(f(),'2-1','finished lessons are skipped');
  lessons['1-1'].lastAttemptAt=500;assert.equal(f(),'1-1','«Начать / Продолжить» 1-1 later → 1-1');
  const empty={courseProgress:{lessons:{'1-1':{status:'completed'},'1-2':{status:'not_started'}},resumePointer:{lessonId:null,updatedAt:0}},events:[]};
  const c2={box:{},P,state:empty,byId,courseIds:()=>['1-1','1-2']};vm.runInNewContext(src+'\nbox.f=namedCourse;',c2);assert.equal(c2.box.f(),'1-2','no activity, no pointer → first unfinished');
  const sn=slice(app,' function stepNow(){',' function continueStep(){');
  assert.ok(!sn.includes('Очередь, позиция и набранный ответ сохранены')&&sn.includes("'практика, шаг '+st.step+' из '+st.total"),'practice hint names the step');
  assert.ok(sn.includes('const at=p&&p.chapterId?p:nextChapterOf(lessonId);'),'not started → first unfinished chapter, «шаг 1»');
}
ok('#2 Today names the lesson of the latest work (lesson start, pointer, ДЗ, practice / tracks), and the card shows chapter + step from the start');
// #3 weak spots
{
  assert.ok(dash.includes("learnerWeak(3).filter(w=>(Number(w.count_recent||w.count_total)||0)>=2)"),'a single slip is not a weak spot');
  assert.ok(dash.includes("const weakBody=(...parts)=>{const html=parts.join('');return html||'<p>Устойчивых слабых мест пока нет.</p>';};"),'«пока нет» only when nothing is listed');
  assert.equal((dash.match(/<p>Устойчивых слабых мест пока нет\.<\/p>/g)||[]).length,1);
  assert.ok(dash.includes('const weakOpen=weak.length||weakWords.length||weakRules.length||repeated.length;'));
}
ok('#3 «Слабые места»: no «пока нет» above a listed item; «Слово · 1 раз» no longer listed (repeated errors only, «Вспомнить слово»)');
// #4 memory
{
  assert.ok(!/tip\('memory-help'/.test(dash),'lone «?» gone');
  assert.ok(dash.includes("const metIds=Object.keys(state.records||{}).filter(")&&dash.includes('const recallCards=metIds;'),'N from records (survives lazy lesson loading)');
  assert.ok(!dash.includes("const recallCards=cards.filter("),'old N = loaded typed cards (1640 → 1946) gone');
  assert.ok(/Помню после паузы: <strong>\$\{remembered\} из \$\{core\.ruCount\(recallCards\.length/.test(dash),'«X из N карточек, которые уже встречались…»');
}
ok('#4 «Память»: N = typed cards already answered (stable while lessons load), explained in words; no lone «?»');
// #5 one back button
{
  assert.ok(app.includes("const hb=document.querySelector('#path-view .section-heading [data-chrome-back]');")&&app.includes('if(hb.hidden!==own)hb.hidden=own;'),'heading back hidden when the card has its own');
  assert.ok(app.includes("new MutationObserver(syncPathHeadingBack).observe(pc,{childList:true,subtree:true})"),'kept in sync on every path render');
  assert.equal((html.match(/id="pause-session"/g)||[]).length,1);
}
ok('#5 one «← Назад» per screen (lesson page / chapter: the heading duplicate is hidden — out of DOM tab order and a11y)');
// #6 stable M
{
  const ctx={module:{exports:{}},window:{},globalThis:{}};
  const box={};vm.runInNewContext(slice(core,'  function sessionStep(','\n  }\n')+'\n  }\nbox.f=sessionStep;',{box});const f=box.f;
  const q=['a','b','c','d'];assert.deepEqual(f(q,0,false),{step:1,total:4});
  const q2=['a','b','a','c','b','d'];assert.deepEqual(f(q2,2,false),{step:2,total:4},'a returning card keeps N');assert.deepEqual(f(q2,5,false),{step:4,total:4});
  assert.deepEqual(f(q2,1,true),{step:2,total:4},'answered → next card');assert.deepEqual(f([],0,false),{step:0,total:0});
  assert.ok(/sessionStep,/.test(core.slice(core.indexOf('const api={'))),'exported');
  assert.ok(app.includes("const st=core.sessionStep(queue,position,false);sp.textContent=`Шаг ${st.step} из ${st.total}`;"),'practice counter');
  assert.ok(dash.includes('core.sessionStep(p.practiceSession.queue,p.practiceSession.position,p.practiceSession.answered)'),'picker counter is the same');
}
ok('#6 «Шаг N из M» in lesson practice: M = distinct cards (18 stays 18 when a card returns), same counter in the picker and on Today');
console.log('verify_r7_ux59: '+passed+' checks passed');
