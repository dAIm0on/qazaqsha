/* NAV-2.3 1:1 shell. Renders canonical MorphLearner source units; free practice remains non-scored. */
(function(root){
'use strict';
const KEY='qazaqsha-nav2-v1';
const BACKUP='qazaqsha-nav2-v1.backup';
const OLD={dat:'learner.dat.kuda',poss:'learner.poss.owner',loc:'learner.loc.where',pl:'learner.pl.several',nas:'learner.nasal.senses',per:'learner.person.roles',ch:'learner.chains.steps',vb:'learner.verbs.steps'};
function cat(){return root.MorphNav2Catalog;}
function lesson(id){return (cat().lessons||[]).find(x=>x.id===id)||null;}
function part(n){return (cat().parts||[]).find(x=>x.number===n)||null;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const CHOICES={
 'learner.dat.kuda':['nav2.4.1','nav2.4.2','nav2.1.2'],
 'learner.loc.where':['nav2.4.3','nav2.4.5'],
 'learner.pl.several':['nav2.2.1','nav2.1.1','nav2.2.2'],
 'learner.poss.owner':['nav2.3.1','nav2.3.3','nav2.3.7'],
 'learner.person.roles':['nav2.5.1','nav2.5.4','nav2.7.4'],
 'learner.chains.steps':['nav2.6.1','nav2.6.2','nav2.6.4'],
 'learner.verbs.steps':['nav2.7.1','nav2.7.2','nav2.7.3'],
 'learner.nasal.senses':['nav2.4.5','nav2.4.6','nav2.3.6']
};
const ARTICLES=[
 {id:'ref.nominative',title:'Исходная форма',text:'Исходная форма — слово, от которого строим другую форму. Отдельного окончания у неё нет.'},
 {id:'ref.onset.table',title:'Первая буква по концам и вопросам',heading:'nas.47'},
 {id:'ref.dat.after-poss',title:'После «его» или «мой»',heading:'dat.46'},
 {id:'ref.poss.five',title:'Пять смыслов рядом',heading:'poss.26'}
];
function blank(){return {schemaVersion:2,catalogVersion:(cat()&&cat().version)||'NAV-2.3-1TO1',migrated:true,bookmarkApplied:false,screen:null,part:1,lessonId:'nav2.1.1',homeLessonId:'nav2.1.1',step:0,tab:'learn',pick:'',outcome:'',fromLesson:false,viewed:{},log:{},explained:{},perLessonCursors:{},draftAnswers:{},navBack:[],excursionOrigin:null,find:'',aliasId:'',aliasChoices:[],pendingAlias:'',aliasDismissed:false,oldViews:{},activeMode:'learn'};}
function readFs2(){
 try{return JSON.parse(sessionStorage.getItem('qazaqsha-fs2-read')||'null');}catch(e){return null;}
}
function load(){
 let raw='';
 try{raw=sessionStorage.getItem(KEY)||'';}catch(e){raw='';}
 let x=null;
 try{x=raw?JSON.parse(raw):null;}catch(e){x=null;}
 if(!x||typeof x!=='object')x=blank();
 let changed=false;
 if(x.schemaVersion===1){
  try{if(!sessionStorage.getItem(BACKUP))sessionStorage.setItem(BACKUP,raw);}catch(e){}
  x.schemaVersion=2;
  x.migrated=true;
  changed=true;
 }
 x.catalogVersion=(cat()&&cat().version)||x.catalogVersion||'NAV-2.3-1TO1';
 x.log=x.log||{};
 x.explained=x.explained||{};
 x.viewed=x.viewed||{};
 x.perLessonCursors=x.perLessonCursors||{};
 x.draftAnswers=x.draftAnswers||{};
 x.navBack=x.navBack||[];
 x.oldViews=x.oldViews||{};
 x.find=x.find||'';
 if(!x.homeLessonId){x.homeLessonId=x.lessonId||'nav2.1.1';changed=true;}
 if(!x.bookmarkApplied){
  x.bookmarkApplied=true;
  changed=true;
  const old=readFs2();
  if(old&&old.id&&CHOICES[old.id]){
   x.pendingAlias=old.id;
   x.oldViews[old.id]=true;
  }
 }
 if(changed){try{sessionStorage.setItem(KEY,JSON.stringify(x));}catch(e){}}
 return x;
}
function lessonLog(id){
 const row=(st().log||{})[id]||{};
 return {seen:row.seen||[],unaided:row.unaided||[],helped:row.helped||[],skipped:row.skipped||[],attempted:row.attempted||[]};
}
function putLog(id,row){
 const log=Object.assign({},st().log);
 log[id]=row;
 return log;
}
function addOnly(list,id){return list.includes(id)?list:list.concat([id]);}
function drop(list,id){return list.filter(x=>x!==id);}
function savedStepFor(id,saved){
 const row=lesson(id);
 if(!row||!row.steps||!row.steps.length)return 0;
 let key=saved&&saved.stepId||'';
 if(key&&row.legacyStepAliases&&row.legacyStepAliases[key])key=row.legacyStepAliases[key];
 if(key){
  const i=row.steps.findIndex(s=>s.id===key||(s.sourceUnitIds||[]).includes(key));
  if(i>=0)return i;
 }
 return Math.min(Math.max(0,Number(saved&&saved.step)||0),row.steps.length-1);
}
function save(s){try{sessionStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
let state=null;
function st(){if(!state)state=load();return state;}
function takeover(){return !!st().screen;}
function immersive(){const s=st();return s.screen==='lesson'||s.screen==='reference'||s.screen==='alias'||(s.screen==='map'&&s.fromLesson)||(s.screen==='part'&&s.fromLesson);}
function snapshot(){const s=st();return {screen:s.screen,lessonId:s.lessonId,step:s.step,tab:s.tab,pick:s.pick,outcome:s.outcome,part:s.part,fromLesson:s.fromLesson,find:s.find};}
function rememberPlace(){
 const s=st();
 const row=current();
 const step=row&&row.steps?row.steps[Math.min(Math.max(0,s.step||0),Math.max(0,row.steps.length-1))]:null;
 const cursors=Object.assign({},s.perLessonCursors);
 cursors[s.lessonId]={step:s.step,tab:s.tab,pick:s.pick,outcome:s.outcome,stepId:step?step.id:''};
 const drafts=Object.assign({},s.draftAnswers);
 const bag=Object.assign({},drafts[s.lessonId]);
 if(step)bag[step.id]={pick:s.pick,outcome:s.outcome};
 drafts[s.lessonId]=bag;
 return {perLessonCursors:cursors,draftAnswers:drafts,activeLessonId:s.lessonId,courseCursor:{lessonId:s.lessonId,stepId:step?step.id:''}};
}
function go(patch){
 const prev=snapshot();
 const place=rememberPlace();
 const next=Object.assign({},st(),place,patch||{});
 if(patch&&patch.nav){
  next.navBack=(st().navBack||[]).concat([prev]).slice(-24);
  try{history.pushState({nav2:1},'');}catch(e){}
 }
 delete next.nav;
 state=next;
 save(state);
}
function back(){
 const stack=(st().navBack||[]).slice();
 if(!stack.length)return false;
 const prev=stack.pop();
 state=Object.assign({},st(),prev,{navBack:stack});
 save(state);
 return true;
}
function norm(s){return String(s||'').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();}
function searchHits(q){
 const n=norm(q);
 if(!n)return [];
 const extra=[
  {words:['моя книга','мой'],id:'nav2.3.1'},
  {words:['несколько'],id:'nav2.2.1'},
  {words:['в школе','где'],id:'nav2.4.3'},
  {words:['кому'],id:'nav2.4.2'},
  {words:['из школы'],id:'nav2.4.4'},
  {words:['не пришел','не пришёл'],id:'nav2.7.3'}
 ];
 const rows=[];
 extra.forEach(item=>{if(item.words.some(w=>norm(w).includes(n)||n.includes(norm(w)))){const L=lesson(item.id);if(L)rows.push(L);}});
 (cat().lessons||[]).forEach(L=>{
  const blob=norm(L.number+' '+L.title+' '+L.goal);
  if(blob.includes(n)&&!rows.some(r=>r.id===L.id))rows.push(L);
 });
 ARTICLES.forEach(a=>{if(norm(a.title).includes(n))rows.push({id:a.id,number:'',title:a.title,part:0,article:true});});
 return rows;
}
function current(){return lesson(st().lessonId)||lesson('nav2.1.1');}
function nextOf(row){return row&&row.nextLessonId?lesson(row.nextLessonId):null;}
function homeRow(){return lesson(st().homeLessonId)||current();}
function homeHtml(){
 const row=homeRow();
 const nxt=nextOf(row);
 const fresh=!st().viewed[row.id];
 const cta=fresh&&row.id==='nav2.1.1'?'Начать первый урок':'Продолжить урок';
 return '<div class="morph-panel morph-nav2-home"><p class="eyebrow">ФОРМА СЛОВА</p>'+
  '<article class="morph-nav2-current"><p class="small">Сейчас</p><p class="morph-nav2-num">'+esc(row.number)+'</p><h2>'+esc(row.title)+'</h2><p>'+esc(row.goal)+'</p>'+
  '<button type="button" class="primary-button" data-nav2-lesson="'+esc(row.id)+'">'+cta+'</button></article>'+
  '<button type="button" class="secondary-button" data-nav2="map">Все темы</button>'+
  '<div class="morph-actions"><button type="button" class="text-button" data-nav2="activities">Мои занятия</button><button type="button" class="text-button" data-morph-transfer>Проверка знаний</button></div>'+
  (st().pendingAlias&&!st().aliasDismissed?'<p role="status">Прежний урок обновлён. <button type="button" class="text-button" data-nav2-pending>Выбрать тему</button></p>':'')+
  (nxt?'<article class="morph-nav2-next"><p class="small">Дальше</p><h3>'+esc(nxt.number)+' '+esc(nxt.title)+'</h3></article>':'')+
  '</div>';
}
function searchBlock(){
 const q=st().find||'';
 const box='<label for="nav2-find">Название или пример</label><input id="nav2-find" data-nav2-find value="'+esc(q)+'" autocomplete="off" enterkeyhint="search">';
 if(!norm(q))return box;
 const found=searchHits(q);
 if(!found.length)return box+'<p role="status">Такой темы нет. Можно выбрать часть ниже.</p>';
 const groups={};
 found.forEach(L=>{const key=L.part||0;(groups[key]=groups[key]||[]).push(L);});
 const html=Object.keys(groups).map(key=>{
  const title=key==='0'?'Правила':((part(Number(key))||{}).title||'');
  const rows=groups[key].map(L=>L.article?'<button type="button" class="secondary-button" data-nav2-article="'+esc(L.id)+'">'+esc(L.title)+'</button>':'<button type="button" class="secondary-button" data-nav2-lesson="'+esc(L.id)+'"><span class="morph-nav2-num">'+esc(L.number)+'</span><span>'+esc(L.title)+'</span></button>').join('');
  return '<h3>'+esc(title)+'</h3><div class="morph-routes">'+rows+'</div>';
 }).join('');
 return box+html;
}
function mapHtml(){
 const s=st();
 const back=s.fromLesson?'<button type="button" class="text-button" data-nav2-back>← К занятию</button>':'<button type="button" class="text-button" data-nav2="home">← К разделу</button>';
 const tiles=norm(s.find)?'':(cat().parts||[]).map(p=>{
  const on=p.number===s.part?' morph-nav2-on':'';
  return '<button type="button" class="morph-nav2-tile'+on+'" data-nav2-part="'+p.number+'"><span class="morph-nav2-num">'+p.number+'</span><span>'+esc(p.title)+'</span><span class="small">'+esc(p.example)+'</span></button>';
 }).join('');
 return '<div class="morph-panel morph-nav2">'+back+'<h2>Все темы</h2>'+searchBlock()+(tiles?'<div class="morph-nav2-tiles">'+tiles+'</div>':'')+'</div>';
}
function lessonButton(x){return '<button type="button" class="secondary-button morph-nav2-row" data-nav2-lesson="'+esc(x.id)+'"><span class="morph-nav2-num">'+esc(x.number)+'</span><span>'+esc(x.title)+'</span></button>';}
function partHtml(){
 const s=st();
 const p=part(s.part)||cat().parts[0];
 const rows=(cat().lessons||[]).filter(x=>x.part===p.number);
 let body='';
 if(p.number===7){
  const groups=[['Основа, время и отрицание',['nav2.7.1','nav2.7.2','nav2.7.3']],['Кто действует и при каком условии',['nav2.7.4','nav2.7.5']],['Причастие',['nav2.7.6','nav2.7.7']],['Деепричастие и соединение форм',['nav2.7.8','nav2.7.9','nav2.7.10']]];
  body=groups.map(g=>{
   const open=g[1].includes(s.lessonId)?' open':'';
   const inner=g[1].map(id=>rows.find(x=>x.id===id)).filter(Boolean).map(lessonButton).join('');
   return '<details'+open+'><summary>'+esc(g[0])+'</summary><div class="morph-routes">'+inner+'</div></details>';
  }).join('');
 }else body='<div class="morph-routes">'+rows.map(lessonButton).join('')+'</div>';
 const prev=p.number>1?part(p.number-1):null;
 const next=p.number<7?part(p.number+1):null;
 const hops=(prev?'<button type="button" class="secondary-button" data-nav2-part="'+prev.number+'">Предыдущая часть: '+esc(prev.title)+'</button>':'')+(next?'<button type="button" class="secondary-button" data-nav2-part="'+next.number+'">Следующая часть: '+esc(next.title)+'</button>':'');
 const gen=p.number===4?'<p>Родительный падеж — урок 3.6. <button type="button" class="text-button" data-nav2-lesson="nav2.3.6">Книга ребёнка</button></p>':'';
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2="map">← Все темы</button><p class="eyebrow">Часть '+p.number+'</p><h2>'+esc(p.title)+'</h2><p>'+esc(p.example)+'</p>'+gen+body+'<div class="morph-actions">'+hops+'</div></div>';
}
function sourceUnit(id){
 const learner=root.MorphLearner;
 if(!learner||!id)return null;
 for(const row of learner.lessons||[]){
  const hit=(row.blocks||[]).find(b=>b.id===id);
  if(hit)return hit;
 }
 return null;
}
function sourceUnits(ids){return (ids||[]).map(sourceUnit).filter(Boolean);}
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
function stepTry(step){return sourceUnits(step&&step.sourceUnitIds).find(b=>b.type==='try')||null;}
function blockHtml(b,step){
 if(b.type==='subheading')return '<h3>'+esc(b.text)+'</h3>';
 if(b.type==='paragraph')return '<p>'+esc(b.text)+'</p>';
 if(b.type==='warning')return '<div class="morph-nav2-note"><p>'+esc(b.text)+'</p></div>';
 if(b.type==='term')return '<p class="small">'+esc(b.text)+'</p>';
 if(b.type==='example')return '<div class="morph-nav2-sun"><p lang="kk">'+esc(b.before)+' → '+esc(b.after)+'</p><p class="small" lang="ru">'+esc(b.beforeRu)+' → '+esc(b.afterRu)+'</p></div>';
 if(b.type==='list'||b.type==='ordered-list'||b.type==='ordered_list'){const tag=b.type==='list'?'ul':'ol';return '<'+tag+' class="morph-teach-list">'+(b.items||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</'+tag+'>';}
 if(b.type==='table'){const caption=b.caption?'<caption>'+esc(b.caption)+'</caption>':'';return '<div class="morph-matrix" tabindex="0"><table>'+caption+'<thead><tr>'+(b.headers||[]).map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(b.rows||[]).map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
 if(b.type==='link')return '<button type="button" class="text-button" data-nav2-source-link="'+esc(b.lessonId||'')+'">'+esc(b.text||'Открыть связанное правило')+'</button>';
 if(b.type==='try'){
  if(!step)return '<div class="morph-nav2-note"><p>'+esc(b.prompt||'Попробуйте применить правило.')+'</p><p>'+esc((b.options||[]).join(' · '))+'</p></div>';
  const picked=st().pick,outcome=st().outcome;
  let html='<div class="morph-nav2-try"><p>'+esc(b.prompt||'Попробуйте применить правило.')+'</p><div class="morph-choices">'+(b.options||[]).map(o=>'<button type="button" class="secondary-button'+(picked===o?' morph-nav2-picked':'')+'" data-nav2-pick="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>';
  if(outcome==='wrong')html+='<p class="morph-nav2-spot">Пока не то</p><div class="morph-nav2-error"><p>'+esc(b.bad||'Проверьте правило и попробуйте ещё раз.')+'</p><p>Ваш выбор: '+esc(picked)+'</p><button type="button" class="secondary-button" data-nav2-retry>Попробовать ещё раз</button><button type="button" class="text-button" data-nav2-show>Показать разбор</button></div>';
  if(outcome==='right')html+='<div class="morph-nav2-ok"><p>Верно.</p><p>'+esc(b.good||'')+'</p></div>';
  if(outcome==='helped')html+='<div class="morph-nav2-note"><p>Ответ открыт с помощью. Это не самостоятельный успех.</p><p lang="kk">'+esc(b.answer||'')+'</p><p>'+esc(b.good||'')+'</p></div>';
  if(outcome==='skip')html+='<div class="morph-nav2-note"><p>Задание пропущено. К нему можно вернуться.</p></div>';
  return html+'</div>';
 }
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
 return body+'<div class="morph-actions">'+actions+'</div><p class="small">Шаг '+(s.step+1)+' из '+row.steps.length+' · '+esc(step.title)+'</p>';
}
function summaryHtml(row){
 const log=lessonLog(row.id);
 const nxt=nextOf(row);
 const back=log.skipped.length?'<button type="button" class="secondary-button" data-nav2-unskip>Вернуться к пропущенному</button>':'';
 const nextBtn=nxt?'<button type="button" class="primary-button" data-nav2-lesson="'+esc(nxt.id)+'">Следующий урок: '+esc(nxt.number)+' '+esc(nxt.title)+'</button>':'<button type="button" class="primary-button" data-nav2="home">К разделу</button>';
 return '<p>Урок '+esc(row.number)+' на этом шаге закончен. Это не оценка знания.</p><ul class="morph-teach-list"><li>Шагов просмотрено: '+log.seen.length+'</li><li>Верно без помощи: '+log.unaided.length+'</li><li>С помощью: '+log.helped.length+'</li><li>Пропущено: '+log.skipped.length+'</li></ul><div class="morph-actions">'+back+nextBtn+'</div>';
}
function sectionHeadingFor(row,stepIndex){
 let heading='';
 for(let i=0;i<=stepIndex&&i<(row.steps||[]).length;i++){
  for(const id of row.steps[i].sourceUnitIds||[]){
   const b=sourceUnit(id);
   if(b&&b.type==='subheading')heading=b.id;
  }
 }
 return heading;
}
function sectionEndsAt(row,stepIndex){
 const next=row.steps&&row.steps[stepIndex+1];
 if(!next)return true;
 const first=(next.sourceUnitIds||[]).map(sourceUnit).find(Boolean);
 return !!(first&&first.type==='subheading');
}
function sourcePracticeHtml(row,stepIndex){
 if(!sectionEndsAt(row,stepIndex))return '';
 const heading=sectionHeadingFor(row,stepIndex);
 const C=root.FreePracticeContent;
 if(!heading||!C||!C.anchorsFor||!C.forBlock)return '';
 const allowed=new Set((row.practiceRoutes||[]).map(String));
 const rows=(C.anchorsFor(heading)||[]).filter(x=>{
  const route=x.blockId+':'+(x.subcase||'');
  if(allowed.size&&!allowed.has(route))return false;
  try{return !!(C.forBlock(x.blockId,x.subcase||'')||[]).length;}catch(e){return false;}
 });
 if(!rows.length)return '';
 const buttons=rows.map(x=>'<button type="button" class="secondary-button" data-free-block="'+esc(x.blockId)+'" data-free-subcase="'+esc(x.subcase||'')+'">'+esc(x.title||'Потренировать эту мысль')+'</button>').join('');
 return '<div class="morph-nav2-section-practice" data-nav2-source-practice="'+esc(heading)+'"><p class="small">Практика именно этого объяснения — по желанию.</p><div class="morph-actions">'+buttons+'</div></div>';
}
function practiceReady(row){
 return row.id!=='nav2.1.1'&&row.sourceMappingStatus!=='BOUND_FILTER_GAP'&&row.sourceMappingStatus!=='NO_LICENSED_CARDS'&&!!row.practiceOpen;
}
function learnBody(row){
 if(st().outcome==='summary')return summaryHtml(row);
 const step=row.steps[st().step]||row.steps[0];
 if(!step)return '<p>В этом уроке пока нет шага.</p>';
 const blocks=sourceUnits(step.sourceUnitIds||[]);
 const body=blocks.length?blocks.map(b=>blockHtml(b,step)).join(''):'<h3>'+esc(step.title)+'</h3><p>'+esc(row.goal)+'</p>';
 const task=stepTry(step),last=st().step>=row.steps.length-1;
 let actions='';
 if(task&&!st().outcome)actions='<button type="button" class="text-button" data-nav2-skip>Пропустить</button>';
 else if(task&&st().outcome==='wrong')actions='';
 else actions=last?'<button type="button" class="primary-button" data-nav2-finish>Закончить урок</button>':'<button type="button" class="primary-button" data-nav2-next>Дальше</button>';
 const toPractice=last&&practiceReady(row)&&st().outcome!=='wrong'?'<button type="button" class="secondary-button" data-nav2-explained>К самостоятельной практике</button>':'';
 const microPractice=sourcePracticeHtml(row,st().step||0);
 return body+microPractice+'<div class="morph-actions">'+actions+toPractice+'</div><p class="small">Шаг '+(st().step+1)+' из '+row.steps.length+' · '+esc(step.title||'')+'</p>';
}
function practiceRouteLabel(route,index){
 const sub=String(route||'').split(':')[1]||'';
 const labels={direction:'Куда?',addressee:'Кому?',place:'Где?',vowel:'Выбрать гласную окончания',onset:'Выбрать первую букву окончания',full:'Собрать форму целиком',compare:'Сравнить похожие формы',several:'Один или несколько',glide:'После й или у',r:'После р',l:'После л',nasal:'После м, н, ң',z:'После з или ж',voiceless:'После глухого',groups:'Сравнить группы окончаний',contrast:'Различить похожие окончания',with:'С кем?',tool:'Чем?',i:'Я',we:'Мы',you:'Ты и Вы',many:'Несколько собеседников',question:'Вопрос',owners:'Мой / твой / его / наш / ваш',plural:'Количество + принадлежность',dat:'Падеж после принадлежности',acc:'Кого или что именно',loc:'Где?',abl:'Откуда?',stem:'Основа глагола',past:'Действие уже произошло',neg:'Не делать',person:'Кто сделал',cond:'Если',ptcp:'Причастие',cvb:'Деепричастие',combined:'Соединить несколько шагов',meaning:'Выбрать смысл',three:'Куда / где / откуда'};
 return labels[sub]||('Практика '+(index+1));
}
function practiceBody(row){
 if(row.practiceMode==='observation_only')return '<p>Этот урок нужен для наблюдения за устройством слова. Отдельная проверка здесь не требуется.</p>';
 if(row.practiceClosed)return '<p>'+esc(row.practiceClosed)+'</p>';
 const routes=(row.practiceRoutes&&row.practiceRoutes.length?row.practiceRoutes:(row.practiceOpen?[row.practiceOpen]:[]));
 if(row.sourceMappingStatus==='BOUND_FILTER_GAP'||row.sourceMappingStatus==='NO_LICENSED_CARDS'||!routes.length)return '<p>Для этой темы пока нет проверенного самостоятельного задания. Учебный материал остаётся доступен полностью.</p>';
 if(!st().explained[row.id])return '<p>Сначала закончите объяснение этого урока. Практика использует только уже показанные условия.</p><button type="button" class="primary-button" data-nav2-tab="learn">К объяснению</button>';
 const buttons=routes.map((route,i)=>{const bits=route.split(':');return '<button type="button" class="'+(i===0?'primary-button':'secondary-button')+'" data-nav2-practice="'+esc(bits[0])+'" data-nav2-sub="'+esc(bits[1]||'')+'">'+esc(practiceRouteLabel(route,i))+'</button>';}).join('');
 return '<p>Сначала соберите форму сами: варианты ответа скрыты. Подсказку или выбор из вариантов можно включить по желанию. Это не оценка и не меняет расписание повторений.</p><div class="morph-actions">'+buttons+'</div>';
}
function rulesBody(row){
 const step=row.steps[st().step]||row.steps[0];
 const n=(st().step||0)+1;
 return '<h3>'+esc(row.title)+'</h3><p>'+esc(row.goal)+'</p>'+(step&&step.title?'<p>Сейчас открыт шаг: '+esc(step.title)+'.</p>':'')+'<div class="morph-actions"><button type="button" class="secondary-button" data-nav2-tab="learn">Вернуться к шагу '+n+'</button><button type="button" class="secondary-button" data-morph-calc>Разобрать слово</button><button type="button" class="secondary-button" data-nav2-reference>Все правила</button></div>';
}
function articleHtml(id){
 const article=ARTICLES.find(a=>a.id===id)||ARTICLES[0];
 const body=article.heading?slice(article.heading).map(blockHtml).join(''):'<p>'+esc(article.text||'')+'</p>';
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2-back>← Назад</button><p class="eyebrow">Правила</p><h2>'+esc(article.title)+'</h2>'+searchBlock()+body+'</div>';
}
function aliasHtml(){
 const s=st();
 const choices=(s.aliasChoices||[]).map(id=>lesson(id)).filter(Boolean);
 const buttons=choices.length?choices.map(L=>'<button type="button" class="secondary-button" data-nav2-lesson="'+esc(L.id)+'">'+esc(L.number)+' '+esc(L.title)+'</button>').join(''):'<button type="button" class="primary-button" data-nav2="map">Все темы</button>';
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2="home">← К разделу</button><p role="status">'+esc(s.bookmarkMessage||'Этот урок был обновлён. Выберите тему в списке')+'</p><div class="morph-routes">'+buttons+'</div></div>';
}
function activitiesHtml(){
 const rows=Object.keys(st().viewed||{}).map(id=>lesson(id)).filter(Boolean);
 const list=rows.length?rows.map(L=>'<button type="button" class="secondary-button" data-nav2-lesson="'+esc(L.id)+'">'+esc(L.number)+' '+esc(L.title)+'</button>').join(''):'<p>Пока нет открытых уроков.</p>';
 return '<div class="morph-panel morph-nav2"><button type="button" class="text-button" data-nav2="home">← К разделу</button><h2>Мои занятия</h2><p>Здесь только то, что вы уже открывали. Просмотр не считается верным ответом.</p><div class="morph-routes">'+list+'</div><button type="button" class="secondary-button" data-morph-transfer>Проверка знаний</button></div>';
}
function lessonHtml(){
 const s=st();
 const row=current();
 if(!row)return '<div class="morph-panel"><p>Этот урок был обновлён. Выберите тему в списке.</p><button type="button" class="primary-button" data-nav2="map">Все темы</button></div>';
 const tabs=['learn','Учиться','practice','Практика','rules','Правила'];
 let bar='';
 for(let i=0;i<tabs.length;i+=2)bar+='<button type="button" class="'+(s.tab===tabs[i]?'primary-button':'secondary-button')+'" data-nav2-tab="'+tabs[i]+'">'+tabs[i+1]+'</button>';
 const body=s.tab==='practice'?practiceBody(row):s.tab==='rules'?rulesBody(row):learnBody(row);
 const origin=st().excursionOrigin;
 const backLesson=origin&&origin.lessonId&&origin.lessonId!==row.id&&lesson(origin.lessonId)?'<button type="button" class="text-button" data-nav2-origin>Вернуться к уроку '+esc(lesson(origin.lessonId).number)+'</button>':'';
 const prev=st().step>0&&st().tab==='learn'&&st().outcome!=='summary'?'<button type="button" class="text-button" data-nav2-prev>Назад</button>':'';
 return '<div class="morph-panel morph-nav2 morph-nav2-lesson"><button type="button" class="text-button" data-nav2="home">← К разделу</button><button type="button" class="text-button" data-nav2-maplesson>Все темы</button>'+backLesson+
  '<p class="eyebrow">Урок '+esc(row.number)+'</p><h2>'+esc(row.title)+'</h2><div class="morph-nav2-tabs">'+bar+'</div>'+prev+body+'</div>';
}
function html(){
 const s=st();
 if(s.screen==='map')return mapHtml();
 if(s.screen==='part')return partHtml();
 if(s.screen==='reference')return articleHtml(s.articleId);
 if(s.screen==='alias')return aliasHtml();
 if(s.screen==='activities')return activitiesHtml();
 if(s.screen==='lesson')return lessonHtml();
 return '';
}
function bind(host,rerender){
 host.querySelectorAll('[data-nav2]').forEach(b=>b.addEventListener('click',()=>{
  const name=b.dataset.nav2;
  if(name==='home'){const id=st().homeLessonId||st().lessonId;const saved=(st().perLessonCursors||{})[id]||{};go({screen:null,fromLesson:false,lessonId:id,step:savedStepFor(id,saved),tab:saved.tab||'learn',pick:saved.pick||'',outcome:saved.outcome||'',nav:true});}
  else if(name==='map')go({screen:'map',fromLesson:false,find:'',nav:true});
  else if(name==='activities')go({screen:'activities',nav:true});
  rerender();
 }));
 host.querySelectorAll('[data-nav2-part]').forEach(b=>b.addEventListener('click',()=>{go({screen:'part',part:Number(b.dataset.nav2Part),nav:true});rerender();}));
 host.querySelectorAll('[data-nav2-lesson]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.nav2Lesson;
  const saved=(st().perLessonCursors||{})[id]||{};
  const savedStep=savedStepFor(id,saved);
  const fromSide=st().screen==='map'||st().screen==='alias'||st().screen==='activities'||st().screen==='reference';
  const fromBrowse=st().screen==='map'||st().screen==='part'||st().screen==='reference'||st().screen==='alias';
  const origin=fromSide?(st().excursionOrigin||null):null;
  const seen=Object.assign({},st().viewed);
  const patch={screen:'lesson',lessonId:id,step:savedStep,tab:saved.tab||'learn',pick:saved.pick||'',outcome:saved.outcome||'',fromLesson:false,excursionOrigin:origin,viewed:seen,aliasDismissed:true,nav:true};
  if(!fromBrowse)patch.homeLessonId=id;
  go(patch);
  rerender();
 }));
 host.querySelectorAll('[data-nav2-maplesson]').forEach(b=>b.addEventListener('click',()=>{go({screen:'map',fromLesson:true,part:current().part,find:'',excursionOrigin:st().excursionOrigin||snapshot(),nav:true});rerender();}));
 host.querySelector('[data-nav2-back]')?.addEventListener('click',()=>{
  if((st().navBack||[]).length){try{history.back();return;}catch(e){}}
  if(!back())go({screen:st().fromLesson?'lesson':null,fromLesson:false});
  rerender();
 });
 host.querySelector('[data-nav2-origin]')?.addEventListener('click',()=>{
  const o=st().excursionOrigin;if(!o)return;
  go(Object.assign({},o,{excursionOrigin:null,nav:true}));
  rerender();
 });
 host.querySelector('[data-nav2-prev]')?.addEventListener('click',()=>{
  const row=current();
  const step=Math.max(0,(st().step||0)-1);
  const id=row.steps[step]&&row.steps[step].id;
  const draft=((st().draftAnswers||{})[row.id]||{})[id]||{};
  go({step:step,tab:'learn',pick:draft.pick||'',outcome:draft.outcome||''});
  rerender();
 });
 host.querySelector('[data-nav2-find]')?.addEventListener('input',ev=>{
  go({find:ev.target.value});
  rerender();
  const again=document.querySelector('[data-nav2-find]');
  if(again){again.focus();const n=again.value.length;try{again.setSelectionRange(n,n);}catch(e){}}
 });
 host.querySelectorAll('[data-nav2-article]').forEach(b=>b.addEventListener('click',()=>{go({screen:'reference',articleId:b.dataset.nav2Article,fromLesson:st().screen==='lesson'||st().fromLesson,nav:true});rerender();}));
 host.querySelector('[data-nav2-reference]')?.addEventListener('click',()=>{go({screen:'reference',articleId:'ref.nominative',fromLesson:true,excursionOrigin:st().excursionOrigin||snapshot(),nav:true});rerender();});
 host.querySelector('[data-nav2-pending]')?.addEventListener('click',()=>{const id=st().pendingAlias;go({screen:'alias',aliasId:id,aliasChoices:CHOICES[id]||[],bookmarkMessage:'Урок обновлён. Выберите тему.',nav:true});rerender();});
 host.querySelectorAll('[data-nav2-tab]').forEach(b=>b.addEventListener('click',()=>{go({tab:b.dataset.nav2Tab});rerender();}));
 host.querySelectorAll('[data-nav2-next]').forEach(b=>b.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const log=lessonLog(row.id);
  log.seen=addOnly(log.seen,step?step.id:String(st().step));
  go({step:Math.min(st().step+1,row.steps.length-1),pick:'',outcome:'',log:putLog(row.id,log)});
  rerender();
 }));
 host.querySelectorAll('[data-nav2-pick]').forEach(b=>b.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const task=stepTry(step);
  const pick=b.dataset.nav2Pick;
  const ok=!!task&&pick===task.answer;
  const log=lessonLog(row.id);
  log.attempted=addOnly(log.attempted,step.id);
  log.skipped=drop(log.skipped,step.id);
  if(ok){log.unaided=addOnly(log.unaided,step.id);log.helped=drop(log.helped,step.id);}
  go({pick:pick,outcome:ok?'right':'wrong',log:putLog(row.id,log)});
  rerender();
 }));
 host.querySelector('[data-nav2-retry]')?.addEventListener('click',()=>{go({pick:'',outcome:''});rerender();});
 host.querySelector('[data-nav2-show]')?.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const log=lessonLog(row.id);
  log.helped=addOnly(log.helped,step.id);
  log.unaided=drop(log.unaided,step.id);
  log.skipped=drop(log.skipped,step.id);
  go({outcome:'helped',log:putLog(row.id,log)});
  rerender();
 });
 host.querySelector('[data-nav2-skip]')?.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const log=lessonLog(row.id);
  log.skipped=addOnly(log.skipped,step.id);
  log.unaided=drop(log.unaided,step.id);
  go({outcome:'skip',log:putLog(row.id,log)});
  rerender();
 });
 host.querySelector('[data-nav2-finish]')?.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const log=lessonLog(row.id);
  if(step)log.seen=addOnly(log.seen,step.id);
  const seen=Object.assign({},st().viewed);seen[row.id]=true;
  const explained=Object.assign({},st().explained);explained[row.id]=true;
  go({outcome:'summary',viewed:seen,log:putLog(row.id,log),explained:explained,tab:'learn'});
  rerender();
 });
 host.querySelector('[data-nav2-unskip]')?.addEventListener('click',()=>{
  const row=current();
  const id=lessonLog(row.id).skipped[0];
  const idx=row.steps.findIndex(s=>s.id===id);
  go({step:idx<0?0:idx,tab:'learn',pick:'',outcome:''});
  rerender();
 });
 host.querySelector('[data-nav2-explained]')?.addEventListener('click',()=>{
  const row=current(),step=row.steps[st().step];
  const log=lessonLog(row.id);
  if(step)log.seen=addOnly(log.seen,step.id);
  const explained=Object.assign({},st().explained);explained[row.id]=true;
  go({explained:explained,tab:'practice',log:putLog(row.id,log)});
  rerender();
 });
 host.querySelectorAll('[data-nav2-practice]').forEach(b=>b.addEventListener('click',()=>{
  if(root.FreePractice&&root.FreePractice.openBlock)root.FreePractice.openBlock(b.dataset.nav2Practice,b.dataset.nav2Sub||'');
  rerender();
 }));
 host.querySelectorAll('[data-nav2-source-link]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.nav2SourceLink;
  if(CHOICES[id])go({screen:'alias',aliasId:id,aliasChoices:CHOICES[id],bookmarkMessage:'Связанная тема разделена на несколько уроков. Выберите нужную.',nav:true});
  rerender();
 }));
}
function close(){go({screen:null,fromLesson:false});}
function openBookmark(id){
 if(!id)return false;
 if(lesson(id)){
  const saved=(st().perLessonCursors||{})[id]||{};
  go({screen:'lesson',lessonId:id,step:savedStepFor(id,saved),tab:'learn',pick:saved.pick||'',outcome:saved.outcome||'',nav:true});
  return true;
 }
 if(CHOICES[id]){
  go({screen:'alias',aliasId:id,aliasChoices:CHOICES[id],bookmarkMessage:'Урок обновлён. Выберите тему.',nav:true});
  return true;
 }
 go({screen:'alias',aliasId:id,aliasChoices:[],bookmarkMessage:'Этот урок был обновлён. Выберите тему в списке',nav:true});
 return true;
}
const api={takeover,immersive,homeHtml,html,bind,close,back,openBookmark,debug(){return st();}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MorphNav2=api;
})(typeof window!=='undefined'?window:globalThis);
