/* NAV-2.2 shell. View only. Does not score and does not call the morph engine. */
(function(root){
'use strict';
const KEY='qazaqsha-nav2-v1';
const OLD={dat:'learner.dat.kuda',poss:'learner.poss.owner',loc:'learner.loc.where',pl:'learner.pl.several',nas:'learner.nasal.senses',per:'learner.person.roles',ch:'learner.chains.steps',vb:'learner.verbs.steps'};
function cat(){return root.MorphNav2Catalog;}
function lesson(id){return (cat().lessons||[]).find(x=>x.id===id)||null;}
function part(n){return (cat().parts||[]).find(x=>x.number===n)||null;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function load(){
 try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');if(x&&x.schemaVersion===1)return x;}catch(e){}
 return {schemaVersion:1,screen:null,part:1,lessonId:'nav2.1.1',step:0,tab:'learn',pick:'',outcome:'',fromLesson:false,viewed:{}};
}
function save(s){try{sessionStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
let state=null;
function st(){if(!state)state=load();return state;}
function takeover(){return !!st().screen;}
function immersive(){const s=st();return s.screen==='lesson'||(s.screen==='map'&&s.fromLesson)||(s.screen==='part'&&s.fromLesson);}
function current(){return lesson(st().lessonId)||lesson('nav2.1.1');}
function nextOf(row){return row&&row.nextLessonId?lesson(row.nextLessonId):null;}
function homeHtml(){
 const row=current();
 const nxt=nextOf(row);
 const fresh=!st().viewed[row.id];
 const cta=fresh&&row.id==='nav2.1.1'?'Начать первый урок':'Продолжить урок';
 return '<div class="morph-panel morph-nav2-home"><p class="eyebrow">ФОРМА СЛОВА</p>'+
  '<article class="morph-nav2-current"><p class="small">Сейчас</p><p class="morph-nav2-num">'+esc(row.number)+'</p><h2>'+esc(row.title)+'</h2><p>'+esc(row.goal)+'</p>'+
  '<button type="button" class="primary-button" data-nav2-lesson="'+esc(row.id)+'">'+cta+'</button></article>'+
  '<button type="button" class="secondary-button" data-nav2="map">Все темы</button>'+
  (nxt?'<article class="morph-nav2-next"><p class="small">Дальше</p><h3>'+esc(nxt.number)+' '+esc(nxt.title)+'</h3></article>':'')+
  '</div>';
}
function mapHtml(){
 const s=st();
 const tiles=(cat().parts||[]).map(p=>{
  const on=p.number===s.part?' morph-nav2-on':'';
  return '<button type="button" class="morph-nav2-tile'+on+'" data-nav2-part="'+p.number+'"><span class="morph-nav2-num">'+p.number+'</span><span>'+esc(p.title)+'</span><span class="small">'+esc(p.example)+'</span></button>';
 }).join('');
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2="home">← К разделу</button><h2>Все темы</h2><div class="morph-nav2-tiles">'+tiles+'</div></div>';
}
function partHtml(){
 const s=st();
 const p=part(s.part)||cat().parts[0];
 const rows=(cat().lessons||[]).filter(x=>x.part===p.number).map(x=>'<button type="button" class="secondary-button morph-nav2-row" data-nav2-lesson="'+esc(x.id)+'"><span class="morph-nav2-num">'+esc(x.number)+'</span><span>'+esc(x.title)+'</span></button>').join('');
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2="map">← Все темы</button><p class="eyebrow">Часть '+p.number+'</p><h2>'+esc(p.title)+'</h2><p>'+esc(p.example)+'</p><div class="morph-routes">'+rows+'</div></div>';
}
function slice(headingId){
 const learner=root.MorphLearner;
 if(!learner||!headingId)return [];
 const old=OLD[headingId.split('.')[0]];
 const row=(learner.lessons||[]).find(x=>x.id===old);
 if(!row)return [];
 const blocks=row.blocks||[];
 const i=blocks.findIndex(b=>b.id===headingId);
 if(i<0)return [];
 const out=[];
 for(let j=i;j<blocks.length;j++){
  if(j>i&&blocks[j].type==='subheading')break;
  out.push(blocks[j]);
 }
 return out;
}
function blockHtml(b){
 if(b.type==='subheading')return '<h3>'+esc(b.text)+'</h3>';
 if(b.type==='paragraph'||b.type==='warning'||b.type==='term')return '<p'+(b.type==='warning'?' class="morph-nav2-note"':'')+'>'+esc(b.text)+'</p>';
 if(b.type==='example')return '<div class="morph-nav2-sun" lang="kk"><p>'+esc(b.before)+' → '+esc(b.after)+'</p><p class="small" lang="ru">'+esc(b.beforeRu)+' → '+esc(b.afterRu)+'</p></div>';
 if(b.type==='list'||b.type==='ordered-list'||b.type==='ordered_list'){const tag=b.type==='list'?'ul':'ol';return '<'+tag+' class="morph-teach-list">'+(b.items||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</'+tag+'>';}
 if(b.type==='table')return '<div class="morph-matrix"><table><thead><tr>'+(b.headers||[]).map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(b.rows||[]).map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 return '';
}
function lesson11(row){
 const s=st();
 const step=row.steps[s.step]||row.steps[0];
 let body='';
 if(step.taskKind==='recognition'){
  const picked=s.pick;
  body='<p lang="kk">бала — ребёнок</p><p lang="kk">балалар — дети</p><p>'+esc(step.prompt)+'</p><div class="morph-choices">'+
   (step.options||[]).map(o=>'<button type="button" class="secondary-button'+(picked===o?' morph-nav2-picked':'')+'" data-nav2-pick="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>';
  if(s.outcome==='wrong')body+='<p class="morph-nav2-spot">Пока не то</p><div class="morph-nav2-error"><p>'+esc(step.wrong)+'</p><p>Ваш выбор: '+esc(picked)+'</p><button type="button" class="secondary-button" data-nav2-retry>Попробовать ещё раз</button><button type="button" class="text-button" data-nav2-show>Показать ответ</button></div>';
  if(s.outcome==='right')body+='<p class="morph-nav2-ok">'+esc(step.right)+'</p>';
  if(s.outcome==='helped')body+='<p class="morph-nav2-note">Ответ открыт с помощью. Это не самостоятельный успех. Добавили -лар: бала → балалар.</p>';
  if(s.outcome==='skip')body+='<p class="morph-nav2-note">Задание пропущено. К нему можно вернуться.</p>';
 }else if(step.show){
  body='<p>'+esc(step.text)+'</p><div class="morph-nav2-sun" lang="kk"><p>'+esc(step.show)+'</p><p class="small" lang="ru">город → города</p></div>';
 }else body='<p>'+esc(step.text||'')+'</p>';
 const last=s.step>=row.steps.length-1;
 const actions=step.taskKind==='recognition'&&!s.outcome
  ?'<button type="button" class="text-button" data-nav2-skip>Пропустить</button>'
  :(step.taskKind==='recognition'&&s.outcome==='wrong'?'':(last?'<button type="button" class="primary-button" data-nav2-finish>Закончить урок</button>':'<button type="button" class="primary-button" data-nav2-next>Дальше</button>'));
 if(s.outcome==='done'){
  const nxt=nextOf(row);
  return '<p>Вы увидели, что к слову добавили часть и значение стало «несколько».</p>'+(nxt?'<button type="button" class="primary-button" data-nav2-lesson="'+esc(nxt.id)+'">Следующий урок: '+esc(nxt.number)+' '+esc(nxt.title)+'</button>':'');
 }
 return body+'<div class="morph-actions">'+actions+'</div><p class="small">Шаг '+(s.step+1)+' из '+row.steps.length+' · '+esc(step.title)+'</p>';
}
function learnBody(row){
 if(row.id==='nav2.1.1')return lesson11(row);
 const step=row.steps[st().step]||row.steps[0];
 if(!step)return '<p>В этом уроке пока нет шага.</p>';
 const blocks=step.sourceHeadingId?slice(step.sourceHeadingId):[];
 const body=blocks.length?blocks.map(blockHtml).join(''):'<h3>'+esc(step.title)+'</h3><p>'+esc(row.goal)+'</p>';
 const last=st().step>=row.steps.length-1;
 const btn=last?'<button type="button" class="primary-button" data-nav2-finish>Закончить урок</button>':'<button type="button" class="primary-button" data-nav2-next>Дальше</button>';
 return body+'<div class="morph-actions">'+btn+'</div><p class="small">Шаг '+(st().step+1)+' из '+row.steps.length+'</p>';
}
function practiceBody(row){
 if(row.id==='nav2.1.1')return '<p>Для этого урока отдельной очереди нет. Это наблюдение, не проверка.</p>';
 if(row.sourceMappingStatus==='BOUND_FILTER_GAP'||!row.practiceOpen)return '<p>Практику этой темы пока не открываем: в одном наборе карточек два разных смысла, и фильтр ещё не проверен.</p>';
 const bits=row.practiceOpen.split(':');
 return '<p>Можно потренироваться на словах этой темы. Это не оценка и не меняет расписание повторений.</p><button type="button" class="primary-button" data-nav2-practice="'+esc(bits[0])+'" data-nav2-sub="'+esc(bits[1]||'')+'">Потренироваться</button>';
}
function rulesBody(row){
 const step=row.steps[st().step]||row.steps[0];
 return '<h3>'+esc(row.title)+'</h3><p>'+esc(row.goal)+'</p>'+(step&&step.title?'<p>Сейчас открыт шаг: '+esc(step.title)+'.</p>':'')+'<p class="small">Полное объяснение не заменяется короткой подсказкой и остаётся на этой вкладке.</p>';
}
function lessonHtml(){
 const s=st();
 const row=current();
 if(!row)return '<div class="morph-panel"><p>Этот урок был обновлён. Выберите тему в списке.</p><button type="button" class="primary-button" data-nav2="map">Все темы</button></div>';
 const tabs=['learn','Учиться','practice','Практика','rules','Правила'];
 let bar='';
 for(let i=0;i<tabs.length;i+=2)bar+='<button type="button" class="'+(s.tab===tabs[i]?'primary-button':'secondary-button')+'" data-nav2-tab="'+tabs[i]+'">'+tabs[i+1]+'</button>';
 const body=s.tab==='practice'?practiceBody(row):s.tab==='rules'?rulesBody(row):learnBody(row);
 return '<div class="morph-panel morph-nav2 morph-nav2-lesson"><button type="button" class="text-button" data-nav2="home">← К разделу</button><button type="button" class="text-button" data-nav2-maplesson>Все темы</button>'+
  '<p class="eyebrow">Урок '+esc(row.number)+'</p><h2>'+esc(row.title)+'</h2><div class="morph-nav2-tabs">'+bar+'</div>'+body+'</div>';
}
function html(){
 const s=st();
 if(s.screen==='map')return mapHtml();
 if(s.screen==='part')return partHtml();
 if(s.screen==='lesson')return lessonHtml();
 return '';
}
function go(patch){state=Object.assign(st(),patch);save(state);}
function bind(host,rerender){
 host.querySelectorAll('[data-nav2]').forEach(b=>b.addEventListener('click',()=>{
  const name=b.dataset.nav2;
  if(name==='home')go({screen:null,fromLesson:false});
  else if(name==='map')go({screen:'map',fromLesson:false});
  rerender();
 }));
 host.querySelectorAll('[data-nav2-part]').forEach(b=>b.addEventListener('click',()=>{go({screen:'part',part:Number(b.dataset.nav2Part)});rerender();}));
 host.querySelectorAll('[data-nav2-lesson]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.nav2Lesson;
  const seen=Object.assign({},st().viewed);
  go({screen:'lesson',lessonId:id,step:0,tab:'learn',pick:'',outcome:'',fromLesson:false,viewed:seen});
  rerender();
 }));
 host.querySelectorAll('[data-nav2-maplesson]').forEach(b=>b.addEventListener('click',()=>{go({screen:'map',fromLesson:true,part:current().part});rerender();}));
 host.querySelectorAll('[data-nav2-tab]').forEach(b=>b.addEventListener('click',()=>{go({tab:b.dataset.nav2Tab});rerender();}));
 host.querySelectorAll('[data-nav2-next]').forEach(b=>b.addEventListener('click',()=>{go({step:st().step+1,pick:'',outcome:''});rerender();}));
 host.querySelectorAll('[data-nav2-pick]').forEach(b=>b.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const pick=b.dataset.nav2Pick;
  go({pick:pick,outcome:pick===step.answer?'right':'wrong'});
  rerender();
 }));
 host.querySelector('[data-nav2-retry]')?.addEventListener('click',()=>{go({pick:'',outcome:''});rerender();});
 host.querySelector('[data-nav2-show]')?.addEventListener('click',()=>{go({outcome:'helped'});rerender();});
 host.querySelector('[data-nav2-skip]')?.addEventListener('click',()=>{go({outcome:'skip'});rerender();});
 host.querySelector('[data-nav2-finish]')?.addEventListener('click',()=>{
  const row=current();
  const seen=Object.assign({},st().viewed);seen[row.id]=true;
  const nxt=nextOf(row);
  if(row.id==='nav2.1.1'){go({outcome:'done',viewed:seen});rerender();return;}
  go({lessonId:nxt?nxt.id:row.id,step:0,tab:'learn',pick:'',outcome:'',viewed:seen,screen:nxt?'lesson':'map'});
  rerender();
 });
 host.querySelectorAll('[data-nav2-practice]').forEach(b=>b.addEventListener('click',()=>{
  if(root.FreePractice&&root.FreePractice.openBlock)root.FreePractice.openBlock(b.dataset.nav2Practice,b.dataset.nav2Sub||'');
  rerender();
 }));
}
function close(){go({screen:null,fromLesson:false});}
const api={takeover,immersive,homeHtml,html,bind,close};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MorphNav2=api;
})(typeof window!=='undefined'?window:globalThis);
