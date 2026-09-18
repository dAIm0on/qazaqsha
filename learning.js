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
  const list=Bank?Bank.COURSE:[];
  const gp=api.grammarPath?api.grammarPath():{};
  if(gp.lessonId&&list.some(c=>c.id===gp.lessonId))return gp.lessonId;
  for(const c of list){
   const p=progressOf(c.id);
   if(!p.all)return c.id;
  }
  return list[0]&&list[0].id||'1-1';
 }
 function render(){
  const Bank=window.ExplainBankUI;
  const list=Bank?Bank.COURSE:[];
  const id=currentId();
  const cur=list.find(c=>c.id===id)||list[0];
  const G=window.GrammarPath;
  const les=G&&G.lesson(id);
  const p=progressOf(id);
  const chIndex=les&&les.chapters&&p.done<les.chapters.length?p.done:0;
  const ch=les&&les.chapters?les.chapters[Math.min(chIndex,les.chapters.length-1)]:null;
  const chTitle=ch&&Bank?Bank.chapterTitle(ch):(ch&&ch.title)||'';
  const cta=p.all?'Повторить урок':(p.started?'Продолжить урок':'Начать урок');
  const prog=p.n?('Глава '+(Math.min(p.done+1,p.n))+' из '+p.n):'';
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
      '<span class="number">'+esc(c.label)+'</span><div><h3>'+esc(c.name)+'</h3><p>'+(pr.n?(pr.done+' из '+pr.n+' глав'):'')+'</p></div>'+
      '<span class="small">'+esc(mark)+'</span></button>';
    }).join('')+
   '</div></div>'+
   '<div class="panel compact-panel learn-secondary"><p class="small">Дополнительно</p>'+
    '<div class="review-actions">'+
     '<button type="button" class="secondary-button" id="learn-practice">Практика этого урока</button>'+
     '<button type="button" class="text-button" id="learn-homework">Домашка</button>'+
    '</div></div>';
  const go=$('#learn-continue');
  if(go)go.onclick=()=>api.openPath?api.openPath(id):api.startCourse(id);
  document.querySelectorAll('[data-learn-les]').forEach(b=>b.onclick=()=>{
   if(api.openPath)api.openPath(b.dataset.learnLes);
  });
  const pr=$('#learn-practice');if(pr)pr.onclick=()=>api.startCourse(id);
  const hw=$('#learn-homework');if(hw)hw.onclick=()=>{if(api.openHomework)api.openHomework(id);else api.today();};
  if(window.TutorUI){
   window.TutorUI.setContext({surface:'learn',lesson_id:id,rule_id:cur&&cur.rules[0]});
   window.TutorUI.syncView('learn');
  }
 }
 function selectLesson(id){if(api.openPath)api.openPath(id);}
 return {render,selectLesson};
}
 window.LearningUI={create};
})();
