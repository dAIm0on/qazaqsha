/* One free-practice screen for every topic. Flag off: nothing is drawn. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const cfg=node?require('./free-practice-config.js'):root.FreePracticeConfig;
const S=node?require('./free-practice-state.js'):root.FreePracticeState;
const C=node?require('./free-practice-content.js'):root.FreePracticeContent;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let open=false,pool=[],state=S.empty(1);
function enabled(){return cfg.enabled();}
function allowlist(){return cfg.config.enabledBlockIds||[];}
function isOpen(){return enabled()&&open;}
function entryHtml(){return enabled()?'<button type="button" class="secondary-button" data-free-practice-open>Потренироваться</button>':'';}
function load(){
 if(typeof localStorage==='undefined')return;
 try{const raw=JSON.parse(localStorage.getItem(S.KEY)||'null');if(raw)state=S.migrate(raw);}catch(e){}
}
function save(next){
 state=next;
 if(typeof localStorage==='undefined')return;
 try{localStorage.setItem(S.KEY,JSON.stringify(state));}catch(e){}
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
 pool=[];
 const next=S.cas(state,state.revision,s=>{s.currentCard=null;s.preferences.mixedPick=true;s.preferences.screenOpen=true;s.selectedBlockIds=[];return s;});
 state=next.ok?next.state:Object.assign(state,{currentCard:null});
 state.preferences.mixedPick=true;
 save(state);
 open=true;
}
function mixedPickHtml(){
 const ids=allowlist().filter(id=>C.forBlock(id,'').length&&!id.startsWith('free.mixed.'));
 const boxes=ids.map(id=>'<label class="morph-feature-option"><input type="checkbox" data-free-mix="'+esc(id)+'">'+esc(id.replace('free.','').replace(/\./g,' · '))+'</label>').join('');
 return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close>← К разделу</button><p class="eyebrow">СМЕШАТЬ ЗНАКОМОЕ</p><h2>Только уже открытые темы</h2><p>Можно попробовать один пример или заниматься дольше. Оценок нет. Когда захотите, переходите дальше.</p><div class="morph-feature-grid">'+boxes+'</div><div class="morph-actions"><button type="button" class="secondary-button" data-free-mix-start>Ещё пример</button><button type="button" class="secondary-button" data-free-cycle>Повторить знакомые</button><button type="button" class="primary-button" data-free-close>Дальше</button></div></div>';
}
function html(){
 if(!isOpen())return '';
 if(state.preferences.mixedPick)return mixedPickHtml();
 const c=card();
 const shown=state.history.filter(h=>h.exposureKind==='question').length;
 const intro=shown>1?'':'<p>Можно попробовать один пример или заниматься дольше. Оценок нет. Когда захотите, переходите дальше.</p>';
 if(!c)return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close>← К разделу</button><p class="eyebrow">СВОБОДНАЯ ПРАКТИКА</p><h2>Пока без урока</h2>'+intro+'<p>Новые подходящие примеры для этого шага закончились. Можно повторить знакомые или идти дальше.</p><div class="morph-actions"><button type="button" class="secondary-button" data-free-cycle>Повторить знакомые</button><button type="button" class="primary-button" data-free-close>Дальше</button></div></div>';
 const tr=c.translationSpec||{};
 const hint=state.preferences.supportLevel==='try_myself'?'':('<p class="morph-rule">'+esc(c.promptSpec&&c.promptSpec.hint||'Смотри на уже объяснённый шаг.')+'</p>');
 const options=(state.currentCard.renderedOptions||[]).map(o=>'<button type="button" class="secondary-button" data-free-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 const note=state.currentCard.revealed||state.currentCard.answered?'<p role="status">'+esc(c.feedbackRu||'')+'</p>':'';
 const visible=c.showExpectedBeforeAnswer&&c.expected?'<p lang="kk">'+esc(c.expected)+'</p>':'';
 return '<div class="morph-panel" data-free-practice><button type="button" class="text-button" data-free-close>← К разделу</button><p class="eyebrow">СВОБОДНАЯ ПРАКТИКА</p>'+intro+'<h2>'+esc(c.promptSpec&&c.promptSpec.ru||'Собери форму')+'</h2><p lang="kk">'+esc(tr.lemma||'')+'</p><p>'+esc(tr.lemmaRu||'')+'</p><p>'+esc(tr.target||'')+'</p><p>'+esc(tr.contextRu||'')+'</p>'+visible+hint+'<div class="morph-choices">'+options+'</div>'+note+'<div class="morph-actions"><button type="button" class="secondary-button" data-free-support>'+(state.preferences.supportLevel==='try_myself'?'С подсказкой':'Попробую сам')+'</button><button type="button" class="secondary-button" data-free-reveal>Показать разбор</button><button type="button" class="secondary-button" data-free-another>Ещё пример</button><button type="button" class="primary-button" data-free-close>Дальше по уроку</button></div></div>';
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
 if(!saved)return false;
 try{pool=C.forBlock(saved.blockId,saved.subcase||'');}catch(e){pool=[];}
 open=true;
 return true;
}
function bind(host,redraw){
 const go=fn=>{const next=fn();if(next&&next.ok)save(next.state);else if(next&&next.state)state=next.state;redraw();};
 for(const b of host.querySelectorAll('[data-free-close]'))b.addEventListener('click',()=>{dismiss();redraw();});
 host.querySelector('[data-free-another]')?.addEventListener('click',()=>go(()=>S.present(state,pool)));
 host.querySelector('[data-free-reveal]')?.addEventListener('click',()=>go(()=>S.reveal(state)));
 host.querySelector('[data-free-support]')?.addEventListener('click',()=>go(()=>S.setSupport(state,state.preferences.supportLevel==='try_myself'?'supported':'try_myself')));
 host.querySelector('[data-free-cycle]')?.addEventListener('click',()=>go(()=>{const next=S.newCycle(state);if(!next.ok)return next;next.state.preferences.mixedPick=false;return pool.length?S.present(next.state,pool):next;}));
 host.querySelector('[data-free-mix-start]')?.addEventListener('click',()=>{
  const ids=[...host.querySelectorAll('[data-free-mix]:checked')].map(el=>el.dataset.freeMix);
  pool=ids.flatMap(id=>C.forBlock(id,''));
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
