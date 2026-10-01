/* One free-practice screen for every topic. Flag off: nothing is drawn. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const cfg=node?require('./free-practice-config.js'):root.FreePracticeConfig;
const S=node?require('./free-practice-state.js'):root.FreePracticeState;
const C=node?require('./free-practice-content.js'):root.FreePracticeContent;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let open=false,pool=[],state=S.empty(1),mixNotice='',saveWarning='',corruptRaw=null,foreign=false,cardNotice='',writeOpen=false;
const TAB_KEY='qazaqsha-fp-tab';
const CORRUPT_KEY='qazaqsha.freePractice.v1.corrupt';
function tabId(){
 try{
  let id=sessionStorage.getItem(TAB_KEY);
  if(!id){id='tab-'+Date.now().toString(36)+Math.random().toString(36).slice(2);sessionStorage.setItem(TAB_KEY,id);}
  return id;
 }catch(e){return 'tab-local';}
}
const THEMES=[
 {lesson:'learner.dat.kuda',title:'Куда или кому?',test:id=>/^free\.(harmony\.(meaning_dat|vowel_dat|limits)|voice\.(dat_|direction_place))/.test(id)},
 {lesson:'learner.loc.where',title:'Где находится?',test:id=>/^free\.(harmony\.(meaning_loc|vowel_loc)|voice\.loc_)/.test(id)},
 {lesson:'learner.pl.several',title:'Один и несколько',test:id=>id.startsWith('free.plural.')},
 {lesson:'learner.nasal.senses',title:'Похожие окончания — разный смысл',test:id=>id.startsWith('free.nasal.')},
 {lesson:'learner.poss.owner',title:'Мой, твой, его или её',test:id=>id.startsWith('free.poss.')},
 {lesson:'learner.person.roles',title:'Я, мы и вопрос',test:id=>id.startsWith('free.person.')},
 {lesson:'learner.chains.steps',title:'Собираем слово по шагам',test:id=>id.startsWith('free.chains.')},
 {lesson:'learner.verbs.steps',title:'Действия: не сделал, сделал, если…',test:id=>id.startsWith('free.verbs.')}
];
function skillName(id){
 if(id==='free.poss.stem')return 'Почему меняется буква';
 if(id==='free.verbs.stem')return 'Особые слова';
 if(id==='free.chains.full')return 'Целая цепочка';
 if(id==='free.plural.compare')return 'Сравнить несколько';
 if(id==='free.poss.compare')return 'Сравнить, чья вещь';
 if(id==='free.person.compare')return 'Не перепутать лицо и вещь';
 if(id==='free.person.i_we')return 'Я и мы';
 const tail=id.split('.').pop();
 const names={meaning_dat:'Смысл: куда или кому',meaning_loc:'Смысл: где',vowel_dat:'Гласная: куда или кому',vowel_loc:'Гласная: где',limits:'Когда правило не подходит',dat_onset:'Первая буква: куда',loc_onset:'Первая буква: где',dat_build:'Собрать: куда',loc_build:'Собрать: где',direction_place:'Куда, где и откуда',meaning:'Несколько предметов',vowel:'Гласная',group_vowel:'После гласного',group_yw:'После й или у',group_r:'После р',group_l:'После л',group_nasal:'После м, н, ң',group_z:'После з или ж',group_voiceless:'После глухого',gen:'Чей или чего',acc:'Кого или что именно',abl:'Откуда',ins_with:'С кем',ins_tool:'Чем',groups:'Одинаковый край, разный вопрос',contrast:'Похожие формы',my:'Мой',your:'Твой',our:'Наш',polite:'Ваш',third:'Его или её',you:'Ты и Вы',you_many:'Вы, несколько',question:'Вопрос',plural_poss:'Несколько, потом чьё',poss_dat:'Куда после «его»',third_acc:'Кого после «его»',third_loc:'Где после «его»',third_abl:'Откуда после «его»',negative:'Не делать',past:'Уже сделал',participle:'Предмет через действие',condition:'Если',connected:'Добавочное действие',short_person:'Кто сделал',combined:'Несколько шагов',full:'Целиком'};
 return names[tail]||tail;
}
function lessonOpened(lesson){
 try{const c=JSON.parse(sessionStorage.getItem('qazaqsha-fs2-read')||'null');return !!(c&&c.seen&&c.seen[lesson]);}catch(e){return false;}
}
function topicHeading(){
 const ids=state.selectedBlockIds||[];
 if(ids.length===1)return skillName(ids[0]);
 return 'Знакомые темы вперемешку';
}
function enabled(){return cfg.enabled();}
function allowlist(){return cfg.config.enabledBlockIds||[];}
function isOpen(){return enabled()&&open;}
function entryHtml(){return enabled()?'<button type="button" class="secondary-button" data-free-practice-open>Потренироваться</button>':'';}
function load(){
 if(typeof localStorage==='undefined')return;
 let raw=null;
 try{raw=localStorage.getItem(S.KEY);}catch(e){saveWarning='Сейчас не получается сохранить место. Пока страница открыта, можно продолжать.';return;}
 if(!raw)return;
 try{
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||parsed.schemaVersion!==1){corruptRaw=raw;state=S.empty(1);return;}
  state=S.migrate(parsed);
  corruptRaw=null;
 }catch(e){corruptRaw=raw;state=S.empty(1);}
 foreign=!!(state.ownerId&&state.ownerId!==tabId());
}
function save(next){
 state=next;
 if(corruptRaw||foreign)return;
 if(typeof localStorage==='undefined')return;
 try{localStorage.setItem(S.KEY,JSON.stringify(state));saveWarning='';}
 catch(e){saveWarning='Сейчас не получается сохранить место. Пока страница открыта, можно продолжать.';}
}
function own(){
 if(corruptRaw)return false;
 if(foreign)return false;
 if(!state.ownerId){
  const got=S.claim(state,tabId());
  if(!got.ok){foreign=true;return false;}
  save(got.state);
 }
 else if(state.ownerId!==tabId()){foreign=true;return false;}
 return true;
}
function resetCorrupt(){
 if(!corruptRaw||typeof localStorage==='undefined')return;
 try{if(!localStorage.getItem(CORRUPT_KEY))localStorage.setItem(CORRUPT_KEY,corruptRaw);}
 catch(e){saveWarning='Сейчас не получается сохранить место. Пока страница открыта, можно продолжать.';return;}
 corruptRaw=null;
 foreign=false;
 save(S.empty(1));
 const got=S.claim(state,tabId());
 if(got.ok)save(got.state);
}
function synthetic(n){
 const cards=[];
 for(let i=0;i<n;i++)cards.push({cardId:'p1-'+i,blockId:'p1.synthetic',targetSkillIds:['p1.skill'],lemmaId:'p1-'+i,normalizedLemmaKey:'сөз'+i,subcase:'a',promptSpec:{ru:'Собери форму',hint:'Один уже объяснённый шаг.'},translationSpec:{lemma:'сөз'+i,lemmaRu:'слово '+i,target:'куда',context:'сөз'+i,contextRu:'слово '+i},split:'train',holdout:false,admissionStatus:'synthetic',exerciseType:'choose',options:['а','е'],answer:'а'});
 return cards;
}
function card(){return state.currentCard&&state.currentCard.card;}
function openMixed(){
 if(!enabled())return;
 load();
 open=true;
 if(!own())return;
 pool=[];
 const next=S.cas(state,state.revision,s=>{s.currentCard=null;s.preferences.mixedPick=true;s.preferences.screenOpen=true;s.selectedBlockIds=[];return s;});
 state=next.ok?next.state:Object.assign(state,{currentCard:null});
 state.preferences.mixedPick=true;
 save(state);
 open=true;
}
function mixedPickHtml(){
 const ids=allowlist().filter(id=>C.forBlock(id,'').length&&!id.startsWith('free.mixed.'));
 const groups=THEMES.map(theme=>{
  const rows=ids.filter(theme.test);
  if(!rows.length)return '';
  const boxes=rows.map(id=>'<label class="morph-feature-option"><input type="checkbox" data-free-mix="'+esc(id)+'" data-fs2-lesson="'+esc(theme.lesson)+'" data-fs2-name="'+esc(skillName(id))+'">'+esc(skillName(id))+'</label>').join('');
  return '<details><summary>'+esc(theme.title)+'</summary><div class="morph-feature-grid">'+boxes+'</div><div class="morph-actions"><button type="button" class="secondary-button" data-fs2-explained="'+esc(theme.lesson)+'">Выбрать уже открытое</button><button type="button" class="text-button" data-fs2-open-lesson="'+esc(theme.lesson)+'">Открыть объяснение</button></div></details>';
 }).join('');
 const note=mixNotice?'<p role="status">'+esc(mixNotice)+'</p>':'';
 return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close data-free-home>← К разделу</button><p class="eyebrow">СВОБОДНАЯ ПРАКТИКА</p><h2>Что потренировать?</h2><p>Выбери знакомые темы. Можно смешать несколько.</p>'+note+'<p data-fs2-chosen>Пока ничего не выбрано.</p><div class="morph-routes">'+groups+'</div><div class="morph-actions"><button type="button" class="primary-button" data-free-mix-start>Ещё пример</button><button type="button" class="secondary-button" data-free-cycle>Повторить знакомые</button><button type="button" class="secondary-button" data-free-close>Дальше</button></div></div>';
}
function notes(){
 return (saveWarning?'<p role="status">'+esc(saveWarning)+'</p>':'')+(cardNotice?'<p role="status">'+esc(cardNotice)+'</p>':'');
}
function html(){
 if(!isOpen())return '';
 if(corruptRaw)return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close data-free-home>← К разделу</button><h2>Свободная практика</h2><p role="status">Запись свободной практики не читается. Курс не меняется. Можно начать её заново, прежняя запись останется копией.</p>'+notes()+'<div class="morph-actions"><button type="button" class="primary-button" data-free-reset>Начать свободную практику заново</button></div></div>';
 if(foreign)return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close data-free-home>← К разделу</button><h2>Свободная практика</h2><p role="status">Практика уже открыта в другой вкладке. Продолжить здесь.</p>'+notes()+'<div class="morph-actions"><button type="button" class="primary-button" data-free-takeover>Продолжить здесь</button></div></div>';
 if(state.preferences.mixedPick)return mixedPickHtml();
 const c=card();
 const shown=state.history.filter(h=>h.exposureKind==='question').length;
 const intro=shown>1?'':'<p>Можно попробовать один пример или заниматься дольше. Оценок нет. Когда захотите, переходите дальше.</p>';
 if(!c){
  const empty=state.exhaustReason==='empty'||!pool.length;
  const broken=state.exhaustReason==='error';
  const line=broken?'Не удалось загрузить примеры. Попробовать ещё раз.':empty?'Для этого шага пока нет проверенных заданий. Можно посмотреть разобранные примеры или выбрать другую тему.':'Для этого шага подходящие примеры закончились.';
  const again=empty||broken?'':'<button type="button" class="secondary-button" data-free-cycle>Повторить знакомые</button>';
  const retry=broken?'<button type="button" class="secondary-button" data-free-retry>Попробовать ещё раз</button>':'';
  return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close data-free-home>← К разделу</button><p class="eyebrow">СВОБОДНАЯ ПРАКТИКА</p><h2>'+esc(topicHeading())+'</h2><p role="status">'+line+'</p><div class="morph-actions">'+again+retry+'<button type="button" class="secondary-button" data-free-topics>Выбрать тему</button><button type="button" class="primary-button" data-free-close>К разделу</button></div></div>';
 }
 const tr=c.translationSpec||{};
 const hint=state.preferences.supportLevel==='try_myself'?'':('<p class="morph-rule">'+esc(c.promptSpec&&c.promptSpec.hint||'Смотри на уже объяснённый шаг.')+'</p>');
 const options=(state.currentCard.renderedOptions||[]).map(o=>'<button type="button" class="secondary-button" data-free-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 const done=!!(state.currentCard.revealed||state.currentCard.answered);
 const letters=[...'әғқңөұүһі'].map(ch=>'<button type="button" class="text-button" data-free-key="'+ch+'">'+ch+'</button>').join('');
 const writer=done?'':(writeOpen?'<form data-free-write-form><label for="free-write">Напишите форму</label><input id="free-write" lang="kk" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80"><div class="typing-strip"><div class="morph-keys">'+letters+'</div><button type="submit" class="primary-button">Проверить написанное</button></div></form>':'<button type="button" class="secondary-button" data-free-write>Написать самому</button>');
 const ok=state.currentCard.feedback==='yes';
 const wrong=state.currentCard.feedback==='no';
 const result=done?('<div role="status"><p>'+(state.currentCard.revealed&&!wrong&&!ok?'Разбор. Это не ошибка.':ok?'Верно для этого шага.':'Пока не то.')+'</p>'+(state.currentCard.rawInput?'<p>Твой ответ: '+esc(state.currentCard.rawInput)+'</p>':'')+(c.answer||c.expected?'<p lang="kk">'+esc(c.expected||c.answer)+'</p><p>'+esc(tr.target||'')+'</p>':'')+'<p>'+esc(c.feedbackRu||'')+'</p>'+(wrong?'<p>Дальше можно то же на другом слове.</p>':'')+'</div>'):'';
 const visible=!done&&c.showExpectedBeforeAnswer&&c.expected?'<p lang="kk">'+esc(c.expected)+'</p>':'';
 const repeat=state.preferences.repeatNotice?'<p>Повторяем знакомые примеры.</p>':'';
 const moreLabel=done?'Ещё пример':'Другой пример';
 const moreClass=done?'primary-button':'secondary-button';
 const leaveClass=done?'secondary-button':'primary-button';
 return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close data-free-home>← К разделу</button><p class="eyebrow">СВОБОДНАЯ ПРАКТИКА</p>'+notes()+intro+repeat+'<h2>'+esc(topicHeading())+'</h2><p>'+esc(c.promptSpec&&c.promptSpec.ru||'Собери форму')+'</p><p lang="kk">'+esc(tr.lemma||'')+'</p><p>'+esc(tr.lemmaRu||'')+'</p><p>'+esc(tr.target||'')+'</p><p>'+esc(tr.contextRu||'')+'</p>'+visible+hint+'<div class="morph-choices">'+options+'</div>'+writer+result+'<div class="morph-actions"><button type="button" class="secondary-button" data-free-support>'+(state.preferences.supportLevel==='try_myself'?'С подсказкой':'Попробую сам')+'</button><button type="button" class="secondary-button" data-free-reveal>Показать разбор</button><button type="button" class="'+moreClass+'" data-free-another>'+moreLabel+'</button><button type="button" class="'+leaveClass+'" data-free-close>Дальше по уроку</button></div></div>';
}
function anchorsHtml(headingId){
 if(!enabled())return '';
 const rows=C.anchorsFor(headingId).filter(row=>allowlist().includes(row.blockId)&&C.forBlock(row.blockId,row.subcase).length);
 if(!rows.length)return '';
 return '<div class="morph-actions" data-free-anchor="'+esc(headingId)+'">'+rows.map(row=>'<button type="button" class="secondary-button" data-free-block="'+esc(row.blockId)+'" data-free-subcase="'+esc(row.subcase)+'">'+esc(row.title)+'</button>').join('')+'<button type="button" class="primary-button" data-free-skip>Дальше</button></div>';
}
function openBlock(blockId,subcase){
 if(!enabled()||!allowlist().includes(blockId))return;
 load();
 open=true;
 if(!own())return;
 pool=C.forBlock(blockId,subcase);
 const switched=S.cas(state,state.revision,s=>{s.selectedBlockIds=[blockId];if(!s.explainedBlockIds.includes(blockId))s.explainedBlockIds=s.explainedBlockIds.concat([blockId]);s.currentCard=null;return s;});
 if(switched.ok)state=switched.state;
 state.preferences.mixedPick=false;
 state.preferences.screenOpen=true;
 const shown=S.present(state,pool);
 if(shown.ok)state=shown.state;
 save(state);
 open=true;
}
function openPractice(items,seed){
 if(!enabled())return;
 load();
 open=true;
 if(!own())return;
 pool=(items||[]).slice();
 if(seed)state.seed=seed>>>0;
 if(!state.selectedBlockIds.length){
  const ready=S.prepare(state,[...new Set(pool.map(c=>c.blockId))]);
  if(ready.ok)state=ready.state;
 }
 if(!state.currentCard){
  const shown=S.present(state,pool);
  if(shown.ok)state=shown.state;
 }
 state.preferences.screenOpen=true;
 save(state);
 open=true;
}
function dismiss(){
 const next=S.cas(state,state.revision,s=>{s.preferences.screenOpen=false;return s;});
 if(next.ok)save(next.state);
 else{state.preferences.screenOpen=false;save(state);}
 open=false;
}
function resumeIfOpen(){
 if(!enabled())return false;
 load();
 if(!state.preferences||!state.preferences.screenOpen)return false;
 if(state.preferences.mixedPick){pool=[];open=true;return true;}
 const saved=state.currentCard&&state.currentCard.card;
 if(!saved){
  if(!state.exhaustReason)return false;
  try{pool=(state.selectedBlockIds||[]).flatMap(id=>C.forBlock(id,''));}catch(e){pool=[];}
  open=true;
  return true;
 }
 try{pool=C.forBlock(saved.blockId,saved.subcase||'');}catch(e){pool=[];}
 if(own()){
  const fresh=S.replaceStaleCard(state,pool);
  if(fresh&&fresh.ok){
   if(fresh.replaced)cardNotice='Пример обновился. Откроем другой';
   save(fresh.state);
  }
 }
 open=true;
 return true;
}
function bind(host,redraw){
 const go=fn=>{if(!own()){redraw();return;}const next=fn();if(next&&next.ok)save(next.state);else if(next&&next.state)state=next.state;redraw();};
 host.querySelector('[data-free-reset]')?.addEventListener('click',()=>{resetCorrupt();redraw();});
 host.querySelector('[data-free-takeover]')?.addEventListener('click',()=>{load();const got=S.takeOver(state,tabId());if(got.ok){foreign=false;save(got.state);}else saveWarning='Сейчас не получается сохранить место. Пока страница открыта, можно продолжать.';redraw();});
 for(const b of host.querySelectorAll('[data-free-close]'))b.addEventListener('click',()=>{dismiss();redraw();});
 host.querySelector('[data-free-another]')?.addEventListener('click',()=>{writeOpen=false;go(()=>S.present(state,pool));});
 host.querySelector('[data-free-reveal]')?.addEventListener('click',()=>{writeOpen=false;go(()=>S.reveal(state));});
 host.querySelector('[data-free-write]')?.addEventListener('click',()=>{writeOpen=true;redraw();});
 host.querySelectorAll('[data-free-key]').forEach(b=>b.addEventListener('click',()=>{const input=host.querySelector('#free-write');if(!input)return;input.value+=b.dataset.freeKey;input.focus();}));
 host.querySelector('[data-free-write-form]')?.addEventListener('submit',ev=>{ev.preventDefault();const input=host.querySelector('#free-write');const value=input?input.value.trim():'';const ok=card()&&value===card().answer;writeOpen=false;go(()=>S.answer(state,value,!!ok));});
 host.querySelector('[data-free-support]')?.addEventListener('click',()=>go(()=>S.setSupport(state,state.preferences.supportLevel==='try_myself'?'supported':'try_myself')));
 host.querySelector('[data-free-cycle]')?.addEventListener('click',()=>go(()=>{const next=S.newCycle(state);if(!next.ok)return next;next.state.preferences.mixedPick=false;if(!pool.length){next.state.exhaustReason='empty';return next;}return S.present(next.state,pool);}));
 host.querySelector('[data-free-topics]')?.addEventListener('click',()=>{openMixed();redraw();});
 host.querySelector('[data-free-retry]')?.addEventListener('click',()=>{const ids=state.selectedBlockIds||[];pool=ids.flatMap(id=>{try{return C.forBlock(id,'');}catch(e){return [];}});const shown=S.present(state,pool);if(shown.ok)save(shown.state);redraw();});
 const paintChosen=()=>{const names=[...host.querySelectorAll('[data-free-mix]:checked')].map(el=>el.dataset.fs2Name||el.dataset.freeMix);const slot=host.querySelector('[data-fs2-chosen]');if(slot)slot.textContent=names.length?('Выбрано: '+names.join(', ')):'Пока ничего не выбрано.';};
 for(const box of host.querySelectorAll('[data-free-mix]'))box.addEventListener('change',paintChosen);
 for(const b of host.querySelectorAll('[data-fs2-explained]'))b.addEventListener('click',()=>{
  const lesson=b.dataset.fs2Explained;
  const opened=lessonOpened(lesson);
  let any=false;
  for(const box of host.querySelectorAll('[data-free-mix]')){
   if(box.dataset.fs2Lesson!==lesson)continue;
   const known=opened||(state.explainedBlockIds||[]).includes(box.dataset.freeMix);
   box.checked=known;
   if(known)any=true;
  }
  if(!any)mixNotice='Выбери хотя бы одну знакомую тему';
  paintChosen();
  const note=host.querySelector('[role="status"]');
  if(!any&&note)note.textContent=mixNotice;
 });
 host.querySelector('[data-free-mix-start]')?.addEventListener('click',()=>{
  const ids=[...host.querySelectorAll('[data-free-mix]:checked')].map(el=>el.dataset.freeMix);
  if(!ids.length){mixNotice='Выбери хотя бы одну знакомую тему';redraw();return;}
  pool=ids.flatMap(id=>C.forBlock(id,''));
  if(!pool.length){mixNotice='Для этого шага пока нет проверенных заданий. Можно посмотреть разобранные примеры или выбрать другую тему.';redraw();return;}
  mixNotice='';
  const switched=S.cas(state,state.revision,s=>{s.selectedBlockIds=ids;s.explainedBlockIds=[...new Set(s.explainedBlockIds.concat(ids))];s.preferences.mixedPick=false;s.currentCard=null;return s;});
  if(switched.ok)state=switched.state;
  const shown=pool.length?S.present(state,pool):{ok:true,state};
  if(shown.ok)save(shown.state);
  redraw();
 });
 for(const b of host.querySelectorAll('[data-free-answer]'))b.addEventListener('click',()=>{const value=b.dataset.freeAnswer;const ok=card()&&value===card().answer;go(()=>S.answer(state,value,!!ok));});
}
const api={enabled,allowlist,isOpen,entryHtml,html,anchorsHtml,open:openPractice,openBlock,openMixed,bind,dismiss,resumeIfOpen,synthetic,debug(){return {state,pool,open};}};
if(node)module.exports=api;
else{root.FreePractice=api;root.FreePractice.enabled=enabled;}
})(typeof window!=='undefined'?window:globalThis);
