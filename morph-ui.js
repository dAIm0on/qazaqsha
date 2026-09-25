(function(){
'use strict';const E=window.MorphEngine,S=window.MorphState;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let shownAt=null,interrupted=false,level='harmony',responseMode='choice',message='';
const bridge=()=>window.MorphBridge,root=()=>document.getElementById('morph-content');
function data(){return bridge()?.read()||{module:S.empty(),records:{},knownLemmas:[]};}
function clock(){shownAt=performance.now();interrupted=document.hidden;}
function saveSession(s){return bridge().session(s);}
function status(){const s=data().module.session;return s&&!s.complete?'Продолжить · '+(s.cursor+1)+' / '+s.queue.length:'Короткие подходы и проверка новых слов';}
function open(){window.QazaqShell.show('morph');}
function rule(l){return E.data.levels.find(x=>x.id===l)?.rule||'';}
function hub(){
 const d=data(),m=d.module,s=m.session,lines=E.writtenLines(m.events),r=lines.practice;
 const rows=E.data.levels.map(l=>{const stats=E.summary(m.events.filter(e=>e.level===l.id&&!e.transfer));return '<option value="'+l.id+'"'+(l.id===level?' selected':'')+'>'+l.title+(stats.n?' · '+stats.correct+'/'+stats.n:'')+'</option>';}).join('');
 const misses={};for(const e of m.events.slice(-40))for(const c of e.errorCodes||[])misses[c]=(misses[c]||0)+1;
 const labels={HARMONY:'ряд гласного',ONSET_CLASS:'начальный согласный',STEM_CHANGE:'изменение основы',MORPH_STATE:'форма после притяжательности',OTHER_FORM:'полная форма'};
 return '<div class="morph-panel"><p class="eyebrow">ФОРМА СЛОВА</p><h2>От короткого стыка к целой цепочке</h2><p>Тренируй выбор и построение правильной формы слова. Сначала с опорой, затем самостоятельно и на новых основах.</p>'+
 (s&&!s.complete?'<button class="primary-button" data-morph-resume>Продолжить '+(s.cursor+1)+' из '+s.queue.length+'</button>':'')+
 '<label for="morph-level">Что тренируем</label><select id="morph-level">'+rows+'</select><label for="morph-response">Как отвечать</label><select id="morph-response"><option value="choice"'+(responseMode==='choice'?' selected':'')+'>Выбрать форму</option><option value="input"'+(responseMode==='input'?' selected':'')+'>Написать самостоятельно</option></select><p class="morph-rule">'+esc(rule(level))+'</p><div class="morph-actions"><button class="primary-button" data-morph-start>Новый подход · 10</button><button class="secondary-button" data-morph-transfer>Проверить на новых словах</button></div><p class="small">Проверка берёт основы из отложенной половины банка, которые здесь ещё не показывали. Новое для тренажёра не значит незнакомое тебе в жизни.</p>'+(E.transferRule(level)?.note?'<p class="small">'+esc(E.transferRule(level).note)+'</p>':'')+'</div>'+
 '<div class="morph-panel"><h2>Наблюдения</h2><p>'+(r.n?r.correct+' из '+r.n+' самостоятельно · '+r.uniqueLemmas+' основ':'Пока нет самостоятельных ответов.')+'</p><p>'+(lines.fresh.n?lines.fresh.correct+' из '+lines.fresh.n+' на новых основах'+(lines.families.length?' · '+esc(lines.families.join(', ')):'') :'На новых основах пока нет самостоятельных ответов.')+'</p><p class="small">'+Object.entries(misses).map(([k,n])=>esc(labels[k]||k)+': '+n).join(' · ')+'</p><p class="small">Процент на знакомых заданиях ещё не доказывает перенос.</p><p class="small">'+esc(S.historyNote)+'</p><details><summary>Как это устроено</summary><p>Результаты относятся к письменным заданиям.</p><p>У каждого семейства свои условия: например, адаммын, адамбыз, адам ба. Следующая форма зависит от уже собранного слова. Изменения основы допускаются только для проверенных слов.</p><p>Правила: <a href="https://qazcorpus.kz/_oqu-ishorpus/Dengeilyk/pdf/Қазақ_грамматикасы.pdf" target="_blank" rel="noopener">Қазақ грамматикасы (2002)</a>; <a href="https://slaviccenters.duke.edu/sites/slaviccenters.duke.edu/files/file-attachments/kazakh-grammar.pdf" target="_blank" rel="noopener">грамматика Duke</a>.</p></details></div>';
}
function finish(s){
 const r=E.summary(s.results),transfer=s.mode==='transfer';
 const view=E.reveal(s);
 return '<div class="morph-panel"><p class="eyebrow">ПОДХОД ЗАВЕРШЁН</p><h2>'+r.correct+' из '+r.n+(transfer?' самостоятельно, на новых основах':' самостоятельно')+'</h2><p>'+r.uniqueLemmas+' разных основ</p><p>'+(transfer?'Это короткая проверка новых здесь основ. Для вывода об устойчивом переносе нужны другие слова и отсроченная проверка.':'Теперь можно повторить трудный контраст или смешать правила.')+'</p>'+(view.transferNote?'<p>'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p>'+esc(view.holdoutNote)+'</p>':'')+'<div class="morph-actions"><button class="primary-button" data-morph-hub>К тренировкам</button></div>'+s.results.filter(e=>!e.correct).map(e=>{const i=E.getItem(e.itemId);return '<details><summary>'+esc(i.stem)+' → '+esc(i.expected)+'</summary><p>'+esc(E.reason(i,e.errorCodes))+'</p></details>';}).join('')+'</div>';
}
function question(s){
 const item=E.getItem(s.queue[s.cursor].id),done=s.phase==='feedback',view=E.reveal(s),choices=s.queue[s.cursor].options;
 const controls=s.responseMode==='choice'?'<div class="morph-choices">'+choices.map(o=>'<button type="button" class="secondary-button" lang="kk" data-morph-answer="'+esc(o)+'"'+(done?' disabled':'')+'>'+esc(o)+'</button>').join('')+'</div>':'<form id="morph-answer-form"><label for="morph-answer">Полная форма'+(item.sequence.at(-1)==='Q'?' вместе с частицей':'')+'</label><input id="morph-answer" lang="kk" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" value="'+esc(s.draft)+'"'+(done?' disabled':'')+'><div class="morph-keys">'+[...'әғқңөұүі'].map(c=>'<button type="button" class="text-button" data-morph-key="'+c+'"'+(done?' disabled':'')+'>'+c+'</button>').join('')+'</div><button class="primary-button"'+(done?' disabled':'')+'>Проверить</button></form>';
 const feedback=done?(view.expected?'<div class="morph-feedback '+(view.correctnessClass?(s.result.correct?'correct':'wrong'):'')+'" role="status"><strong>'+(s.result.correct?'Верно':'Правильная форма: '+esc(item.expected))+'</strong><p>'+esc(E.reason(item,s.result.errorCodes))+'</p><p class="small" lang="kk">'+item.trace.map(t=>esc(t.stem)+' + '+esc(t.suffix)).join(' → ')+'</p></div>':'<p role="status">Ответ сохранён. Разбор будет в конце проверки.</p>')+'<button class="primary-button" data-morph-next>'+(s.cursor===s.queue.length-1?'Завершить':'Следующее')+'</button>':'';
 return '<div class="morph-panel"><button class="text-button" data-morph-hub>Выбрать другой режим</button><div class="morph-progress"><span>'+(s.mode==='transfer'?'Проверка новых основ':'Практика')+'</span><strong>'+(s.cursor+1)+' / '+s.queue.length+'</strong></div>'+(view.transferNote?'<p class="small">'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p class="small">'+esc(view.holdoutNote)+'</p>':'')+'<h2 class="morph-stem" lang="kk">'+esc(item.stem)+'</h2><p>'+esc(item.gloss)+'</p><p class="morph-operation">'+esc(item.operation)+'</p>'+controls+
 (view.hint?'<button class="text-button" data-morph-hint>Подсказка</button>':'')+(view.reason?'<p class="morph-rule">'+esc(E.reason(item))+'</p>':'')+feedback+'</div>';
}
let showHub=true;
function render(){
 const host=root();if(!host||!bridge())return;const m=data().module,s=m.session;
 if(s&&!s.complete&&document.body.dataset.view==='morph'&&host.dataset.first!=='yes'){showHub=false;host.dataset.first='yes';}
 host.innerHTML='<div class="morph-head"><button class="text-button" data-morph-exit>← Все тренажёры</button><span class="small">Версия '+esc(E.data.version)+'</span></div>'+(message||m.recovery?'<p role="status" class="morph-notice">'+esc(message||m.recovery)+'</p>':'')+(!s||showHub?hub():s.complete?finish(s):question(s));
 bind(host);clock();
}
function start(mode){
 const d=data();try{const s=E.createSession({level,mode,responseMode,events:d.module.events,records:d.records,knownLemmas:[...d.module.exposed,...d.knownLemmas]});saveSession(s);showHub=false;message='';render();}catch(e){message=e.message;render();}
}
function submit(response){const s=data().module.session;if(!s||!String(response).trim())return;const result=E.answer(s,response,interrupted||shownAt===null?null:performance.now()-shownAt);if(!result)return;const ok=bridge().answer(result);if(!ok)message='Ответ уже сохранён или сессия изменилась.';render();}
function bind(host){
 host.querySelector('[data-morph-exit]')?.addEventListener('click',()=>{window.QazaqShell.show('personal');window.PersonalTrainers.openCatalog();});
 host.querySelector('[data-morph-start]')?.addEventListener('click',()=>start('learn'));
 host.querySelector('[data-morph-transfer]')?.addEventListener('click',()=>start('transfer'));
 host.querySelector('#morph-level')?.addEventListener('change',e=>{level=e.target.value;render();});
 host.querySelector('#morph-response')?.addEventListener('change',e=>{responseMode=e.target.value;});
 for(const b of host.querySelectorAll('[data-morph-hub]'))b.onclick=()=>{showHub=true;render();};
 host.querySelector('[data-morph-resume]')?.addEventListener('click',()=>{showHub=false;render();});
 for(const b of host.querySelectorAll('[data-morph-answer]'))b.onclick=()=>submit(b.dataset.morphAnswer);
 host.querySelector('#morph-answer-form')?.addEventListener('submit',e=>{e.preventDefault();submit(host.querySelector('#morph-answer').value);});
 const input=host.querySelector('#morph-answer');if(input){input.oninput=()=>{const s=data().module.session;if(s?.phase==='question')saveSession({...s,draft:input.value,updatedAt:Date.now()});};for(const b of host.querySelectorAll('[data-morph-key]'))b.onclick=()=>{const a=input.selectionStart,z=input.selectionEnd;input.value=input.value.slice(0,a)+b.dataset.morphKey+input.value.slice(z);input.focus();input.setSelectionRange(a+1,a+1);input.oninput();};}
 host.querySelector('[data-morph-hint]')?.addEventListener('click',()=>{const s=data().module.session;saveSession({...s,hinted:true});render();});
 host.querySelector('[data-morph-next]')?.addEventListener('click',()=>{saveSession(E.next(data().module.session));render();host.querySelector('#morph-answer')?.focus();});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupted=true;});window.addEventListener('blur',()=>{interrupted=true;});
window.MorphTrainer={open,render,status};
})();
