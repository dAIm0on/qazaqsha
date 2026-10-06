(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
function create(api){
 function progressOf(lessonId){
  const G=window.GrammarPath;
  const les=G&&G.lesson(lessonId);
  const gp=api.grammarPath?api.grammarPath():{};
  const n=les&&les.chapters?les.chapters.length:0;
  const done=n?(les.chapters.filter(c=>gp.completedChapters&&gp.completedChapters[lessonId+':'+c.id]).length):0;
  return {n,done,started:done>0||(gp.lessonId===lessonId&&gp.chapterId),all:n>0&&done>=n};
 }
 function currentId(){
  const Bank=window.ExplainBankUI;
  const list=window.LessonRegistry?window.LessonRegistry.course():(Bank?Bank.COURSE:[]);
  if(api.currentCourse){
   const id=api.currentCourse();
   if(id&&list.some(c=>c.id===id))return id;
  }
  const gp=api.grammarPath?api.grammarPath():{};
  if(gp.lessonId&&list.some(c=>c.id===gp.lessonId))return gp.lessonId;
  for(const c of list){
   const p=progressOf(c.id);
   if(!p.all)return c.id;
  }
  return list[0]&&list[0].id||'1-1';
 }
 let picked='';
 function render(){
  const Bank=window.ExplainBankUI;
  const list=window.LessonRegistry?window.LessonRegistry.course():(Bank?Bank.COURSE:[]);
  const id=currentId();
  const cur=list.find(c=>c.id===id)||list[0];
  const G=window.GrammarPath;
  const les=G&&G.lesson(id);
  const p=progressOf(id);
  const gpNow=api.grammarPath?api.grammarPath():{};
  const openCh=les&&les.chapters&&gpNow.lessonId===id&&gpNow.chapterId?les.chapters.find(c=>c.id===gpNow.chapterId):null;
  const chIndex=les&&les.chapters&&p.done<les.chapters.length?p.done:0;
  const ch=openCh||(les&&les.chapters?les.chapters[Math.min(chIndex,les.chapters.length-1)]:null);
  const chTitle=ch&&Bank?Bank.chapterTitle(ch):(ch&&ch.title)||'';
  const cta=p.all?'Повторить урок':(p.started?'Продолжить урок':'Начать урок');
  const chPos=ch&&les&&les.chapters?Math.max(0,les.chapters.findIndex(c=>c.id===ch.id)):p.done;
  const prog=p.n?('Глава '+(Math.min(chPos+1,p.n))+' из '+p.n):'';
  const ruleId=cur&&cur.rules&&cur.rules[0];
  const ruleCard=ruleId&&window.ExplainBank&&window.ExplainBank.byId?window.ExplainBank.byId(ruleId):null;
  const ruleBlock=ruleCard&&window.ExplainOpen?'<div class="panel"><h2>Правило этого урока</h2><p>'+esc(ruleCard.title||'')+'</p>'+window.ExplainOpen.openButton(ruleId)+'</div>':'';
  const lessonWords=(window.CURRICULUM&&window.CURRICULUM.words||[]).filter(w=>w.lesson_first_seen===id);
  const hwList=api.homeworkWordList?api.homeworkWordList(id):null;
  const mustWords=hwList||lessonWords.filter(w=>w.target_or_context==='target');
  const mustIds=new Set(mustWords.map(w=>w.id));
  const metWords=hwList?lessonWords.filter(w=>!mustIds.has(w.id)):lessonWords.filter(w=>w.target_or_context!=='target');
  const wordLine=list=>list.length?'<p lang="kk">'+list.map(w=>esc(w.kazakh)).join(' · ')+'</p>':'<p class="small">В этом уроке таких слов нет.</p>';
  const wordBlock=(lessonWords.length||mustWords.length)?'<div class="panel"><h2>Слова этого урока</h2><p class="small">Те же слова словаря. Нового списка нет.</p><h3>Задано выучить</h3>'+wordLine(mustWords)+'<h3>Встречается в объяснении</h3>'+wordLine(metWords)+'</div>':'';
  const subjects=[['','Этот урок'],['numbers','Числа'],['plural','Окончания'],['vocab','Слова'],['person','Лица'],['verbs','Глаголы'],['phrase','Фразы']];
  $('#learn-content').innerHTML=
   '<article class="panel learn-now">'+
    '<p class="eyebrow">ТЕКУЩИЙ УРОК</p>'+
    '<h2>Урок '+(cur?esc(cur.label):esc(id))+'</h2>'+
    '<p class="learn-now-name">'+(cur?esc(cur.name):'')+'</p>'+
    (prog?'<p class="small">'+esc(prog)+(chTitle?(' · '+esc(chTitle)):'')+'</p>':'')+
    '<div class="lesson-actions"><button type="button" class="primary-button" id="learn-continue">'+esc(cta)+'</button></div>'+
   '</article>'+
   '<div class="panel learn-course"><h2>Все уроки</h2><div class="learn-lessons">'+
    list.map(c=>{
     const pr=progressOf(c.id);
     const mark=pr.all?'Разобран':(pr.started?'В процессе':'Не начат');
     return '<button type="button" class="lesson" data-learn-les="'+esc(c.id)+'" '+(c.id===id?'aria-current="true"':'')+'>'+
      '<span class="number">'+esc(c.label)+'</span><div><h3>'+esc(c.name)+'</h3><p>'+(pr.n?(pr.done+' из '+pr.n+' '+(window.TrainerCore&&window.TrainerCore.ruPlural?window.TrainerCore.ruPlural(pr.n,['главы','глав','глав']):'глав')):'')+'</p></div>'+
      '<span class="small">'+esc(mark)+'</span></button>';
    }).join('')+
   '</div></div>'+
   '<div class="panel"><h2>Предмет</h2><div class="review-actions">'+subjects.map(([key,label])=>'<button type="button" class="secondary-button" data-subject="'+esc(key)+'"'+(picked===key?' aria-pressed="true"':'')+'>'+esc(label)+'</button>').join('')+'</div></div>'+
   tracksMarkup(id)+
   ruleBlock+wordBlock+
   '<div class="panel compact-panel learn-secondary"><p class="small">Тот же урок: практика и домашка</p>'+
    '<div class="review-actions">'+
     '<button type="button" class="secondary-button" id="learn-practice">Практика этого урока</button>'+
     '<button type="button" class="text-button" id="learn-homework">Домашка</button>'+
    '</div></div>';
  const go=$('#learn-continue');
  if(go)go.onclick=()=>api.continueStep?api.continueStep():(api.openPath?api.openPath(id):api.startCourse(id));
  document.querySelectorAll('[data-learn-les]').forEach(b=>b.onclick=()=>{
   if(api.openPath)api.openPath(b.dataset.learnLes);
  });
  document.querySelectorAll('[data-track]').forEach(b=>{
   if(b.disabled)return;
   b.onclick=()=>{if(api.startLesson)api.startLesson(b.dataset.track);};
  });
  const pr=$('#learn-practice');if(pr)pr.onclick=()=>api.startCourse(id);
  const hw=$('#learn-homework');if(hw)hw.onclick=()=>{if(api.openHomework)api.openHomework(id);else api.today();};
  document.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>{picked=b.dataset.subject||'';render();});
  if(window.ExplainOpen&&window.ExplainOpen.bind)window.ExplainOpen.bind($('#learn-content'));
  if(window.TutorUI){
   window.TutorUI.setContext({surface:'learn',lesson_id:id,rule_id:cur&&cur.rules[0]});
   window.TutorUI.syncView('learn');
  }
 }
 function numberOpen(lesson){
  if(!lesson||lesson.topic!=='numbers'||!window.NumberLadder)return true;
  const full=api.progress?api.progress():{records:{}};
  const ids=new Set(lesson.questionIds||[]);
  const mine=(window.COURSE&&window.COURSE.questions||[]).filter(q=>ids.has(q.id));
  if(!mine.length)return true;
  return mine.some(q=>window.NumberLadder.allowed(q,full));
 }
 function tracksFor(lessonId){
  const all=window.LEARNING&&window.LEARNING.lessons||[];
  // r7 Q5-A (QA): the lesson's own homework words replace the global must-track (1-1…) in this hub.
  const hw=api.homeworkWordsTrack?api.homeworkWordsTrack(lessonId):null;
  // r7 QA F4: false = the lesson's words are not all covered by cards yet; then no words button at all
  // (not the global 1-1… must-track under the same title either).
  return all.filter(l=>l&&!l.homeworkWords&&(l.courseLesson===lessonId||l.courseLesson==='bank')&&!(hw===false&&l.id==='vocab-must')).map(l=>hw&&l.id==='vocab-must'?hw:l);
 }
 function tracksMarkup(lessonId){
  const TOPIC={sounds:'Звуки',vocab:'Слова',numbers:'Числа',plural:'Окончания',person:'Лица',verbs:'Глаголы',rules:'Правила',phrase:'Фразы',possessive:'Притяжательность',bank:'Банк заданий'};
  const all=window.LEARNING&&window.LEARNING.lessons||[];
  const rows=picked?all.filter(l=>l&&l.topic===picked&&!l.homeworkWords):tracksFor(lessonId);
  const heading=picked?(TOPIC[picked]||'Ступени'):'Ступени этого урока';
  if(!rows.length)return '';
  const groups=new Map();
  for(const l of rows){
   const key=l.topic||'other';
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(l);
  }
  const body=[...groups.entries()].map(([topic,list])=>{
   const buttons=list.map(l=>{
    const open=numberOpen(l);
    return '<button type="button" class="secondary-button" data-track="'+esc(l.id)+'"'+(open?'':' disabled')+'>'+esc(l.title)+(open?'':' · сначала меньшие числа')+'</button>';
   }).join('');
   return '<p class="small">'+esc(TOPIC[topic]||topic)+'</p><div class="review-actions">'+buttons+'</div>';
  }).join('');
  return '<div class="panel learn-tracks"><h2>'+esc(heading)+'</h2><p class="small">Те же короткие дорожки, что уже есть в курсе. Новых уроков здесь нет.</p>'+body+'</div>';
 }
 function selectLesson(id){if(api.openPath)api.openPath(id);}
 return {render,selectLesson};
}
 window.LearningUI={create};
})();
