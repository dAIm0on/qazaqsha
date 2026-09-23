(function(){
  'use strict';
  const H=window.HarmonyLetterTrainer;
  const STORAGE_KEY='qazaqsha-personal-trainers-v1';
  const REGISTRY=Object.freeze([
    Object.freeze({id:'harmony_letters',order:1,title:'Буквы · кот',description:'Твёрдые / мягкие сигналы, пары и слова',enabled:true,kind:'cat'}),
    Object.freeze({id:'numbers',order:2,title:'Числа',description:'Лестница от 0–10 до сотен и тысяч',enabled:true,kind:'numbers'}),
    Object.freeze({id:'vocab_must',order:3,title:'Новые слова',description:'Слова, которые задали выучить · оба направления вперемешку',enabled:true,kind:'bridge',target:'vocab:must'}),
    Object.freeze({id:'vocab_used',order:4,title:'Встречавшиеся слова',description:'Узнать и написать вперемешку в одном подходе',enabled:true,kind:'bridge',target:'vocab:used'})
  ]);
  const STAGE_LABELS={0:'Карта пар',1:'Найди пару',2:'К какой группе?',3:'Собери из памяти',4:'Сигнал в слове',5:'Быстрый раунд'};
  let screen='catalog',activeId=null,itemShownAt=0,selection=new Set(),pairSelection={};

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function emptyStore(){return {version:1,lastTrainerId:null,trainers:{}};}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!raw||raw.version!==1||typeof raw.trainers!=='object')return emptyStore();
      return raw;
    }catch{return emptyStore();}
  }
  function save(store){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));return true;}catch{return false;}
  }
  function record(store,id){
    if(!store.trainers[id])store.trainers[id]={session:null,stats:null,updatedAt:0,completions:0};
    return store.trainers[id];
  }
  function writeSession(id,session){
    const store=load(),rec=record(store,id);
    rec.session=session;rec.stats=H.summary(session);rec.updatedAt=Date.now();
    if(session.complete&&!rec.completedAtCounted){rec.completions=(rec.completions||0)+1;rec.completedAtCounted=session.completedAt||Date.now();}
    if(!session.complete)delete rec.completedAtCounted;
    store.lastTrainerId=id;save(store);
  }
  function clearTrainer(id){
    const store=load();delete store.trainers[id];if(store.lastTrainerId===id)store.lastTrainerId=null;save(store);
  }
  function currentRecord(){const store=load();return activeId?record(store,activeId):null;}
  function currentSession(){const rec=currentRecord();return rec&&rec.session||null;}
  function statusLine(rec){
    if(!rec||!rec.session)return 'Не начинала';
    if(rec.session.complete)return 'Последний результат: '+(rec.stats?.accuracy||0)+'%';
    if(rec.session.mode==='quick')return 'Быстрый подход · '+Math.min(rec.session.cursor+1,rec.session.queue.length)+' из '+rec.session.queue.length;
    return STAGE_LABELS[rec.session.stage]+' · '+(rec.session.queue.length?Math.min(rec.session.cursor+1,rec.session.queue.length)+' из '+rec.session.queue.length:'готово к старту');
  }
  function open(){
    if(window.QazaqShell&&window.QazaqShell.show)window.QazaqShell.show('personal');
    else render();
  }
  function openCatalog(){screen='catalog';activeId=null;selection=new Set();pairSelection={};render();}
  function openTrainer(id){
    const item=REGISTRY.find(x=>x.id===id&&x.enabled);if(!item)return;
    activeId=id;screen=item.kind==='numbers'?'numbers':'trainer';selection=new Set();pairSelection={};render();
  }
  function start(id='harmony_letters',mode='full'){
    activeId=id;screen='trainer';
    const session=H.createSession(mode);
    writeSession(id,session);selection=new Set();pairSelection={};render();
  }
  function reset(id='harmony_letters'){clearTrainer(id);start(id,'full');}
  function getRoot(){return document.getElementById('personal-content');}
  function pairMapMarkup(){
    return '<div class="cat-pair-map">'+H.PAIRS.map(p=>'<div class="cat-pair"><strong>'+esc(p.hard)+'</strong><span>↔</span><strong>'+esc(p.soft)+'</strong></div>').join('')+'</div>';
  }
  function catalogMarkup(){
    const store=load(),bridge=window.TrainerCatalogBridge;
    const cards=REGISTRY.filter(x=>x.enabled).map(item=>{
      const rec=item.kind==='cat'?store.trainers[item.id]:null;
      const live=item.target&&bridge&&bridge.status?bridge.status(item.target):null;
      const status=item.kind==='cat'?statusLine(rec):(live?('В процессе · осталось '+live.remaining+' из '+live.total):'Можно открыть отдельно');
      const action=item.kind==='cat'?(rec&&rec.session&&!rec.session.complete?'Продолжить':'Начать'):(live?'Продолжить':'Открыть');
      const quick=item.kind==='cat'?'<button type="button" class="text-button" data-trainer-quick="'+esc(item.id)+'">Быстро: 12</button>':'';
      return '<article class="personal-trainer-card" data-trainer-card="'+esc(item.id)+'">'+
        '<div><p class="eyebrow">ТРЕНАЖЁР '+item.order+'</p><h2>'+esc(item.order+'. '+item.title)+'</h2><p>'+esc(item.description)+'</p><p class="small">'+esc(status)+'</p></div>'+
        '<div class="personal-trainer-actions"><button type="button" class="primary-button" data-trainer-open="'+esc(item.id)+'">'+action+'</button>'+quick+'</div></article>';
    }).join('');
    return '<div class="cat-trainer-hero"><div><p class="eyebrow">ЛИЧНАЯ ЗОНА</p><h2>Тренажёры</h2><p>Отдельные короткие тренировки: буквы, числа и словарь. Они используют те же карточки и прогресс курса.</p></div><img src="assets/tutor/pet-idle.png" alt="" width="120" height="120"></div>'+
      '<div class="personal-trainer-list">'+cards+'</div>';
  }
  function numbersMarkup(){
    const bridge=window.TrainerCatalogBridge;
    const tracks=bridge&&bridge.numberTracks?bridge.numberTracks():[];
    const rows=tracks.map((item,i)=>'<article class="personal-trainer-card"><div><p class="eyebrow">СТУПЕНЬ '+(i+1)+'</p><h2>'+esc(item.title)+'</h2><p class="small">'+(item.open?'Доступно по текущему прогрессу':'Сначала закрепи предыдущую ступень')+'</p></div><div class="personal-trainer-actions"><button type="button" class="primary-button" data-number-track="'+esc(item.id)+'"'+(item.open?'':' disabled')+'>'+(item.open?'Открыть':'Пока закрыто')+'</button></div></article>').join('');
    return '<div class="personal-trainer-head"><button type="button" class="text-button" data-back-catalog>← Все тренажёры</button><div><p class="eyebrow">ЧИСЛА</p><h2>Лестница чисел</h2><p class="small">Используется существующий NumberLadder. Закрытые ступени не обходятся.</p></div></div><div class="personal-trainer-list">'+rows+'</div>';
  }
  function stageIntro(session){
    return '<div class="cat-stage-card"><p class="eyebrow">СТУПЕНЬ 0</p><h2>Карта пар</h2><p>Сначала держим в голове шесть контрастов. Остальные буквы потом сортируем отдельно.</p>'+
      pairMapMarkup()+
      '<div class="cat-memory-note"><p><strong>Е</strong> — мягкий сигнал.</p><p><strong>Я</strong> — твёрдый учебный сигнал.</p><p><strong>И / У / Ю</strong> — нужен контекст.</p><p>Остальные согласные обычно сами ряд не задают.</p></div>'+
      '<button type="button" class="primary-button" data-stage-begin>Начать тренировку</button></div>';
  }
  function stageProgress(session){
    if(session.stage===0)return '';
    const total=session.queue.length,pos=Math.min(session.cursor+1,total);
    return '<div class="cat-stage-progress"><span>'+esc(STAGE_LABELS[session.stage]||'Тренировка')+'</span><strong>'+pos+' / '+total+'</strong></div>';
  }
  function choiceMarkup(item,session){
    return '<div class="cat-choice-grid">'+item.options.map(opt=>'<button type="button" class="cat-choice" data-answer="'+esc(opt)+'"'+(session.answered?' disabled':'')+'>'+esc(opt)+'</button>').join('')+'</div>';
  }
  function recallMarkup(item,session){
    const options=item.options||[];
    return '<div class="cat-letter-grid">'+options.map(opt=>'<button type="button" class="cat-letter-choice'+(selection.has(opt)?' selected':'')+'" data-select-letter="'+esc(opt)+'" aria-pressed="'+(selection.has(opt)?'true':'false')+'"'+(session.answered?' disabled':'')+'>'+esc(opt)+'</button>').join('')+'</div>'+
      (!session.answered?'<button type="button" class="primary-button" data-check-recall>Проверить</button>':'');
  }
  function pairsRecallMarkup(item,session){
    const soft=H.PAIRS.map(p=>p.soft);
    return '<div class="cat-pairs-recall">'+H.PAIRS.map(p=>{
      const value=pairSelection[p.hard]||'';
      return '<label><span>'+esc(p.hard)+' →</span><select data-pair-hard="'+esc(p.hard)+'"'+(session.answered?' disabled':'')+'><option value="">?</option>'+soft.map(x=>'<option value="'+esc(x)+'"'+(value===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>';
    }).join('')+'</div>'+(!session.answered?'<button type="button" class="primary-button" data-check-pairs>Проверить</button>':'');
  }
  function signalMarkup(item,session){
    const chars=Array.from(item.word);
    return '<p class="cat-word" lang="kk">'+esc(item.word)+'</p><div class="cat-letter-grid cat-word-letters">'+chars.map((ch,i)=>'<button type="button" class="cat-letter-choice" data-answer="'+esc(ch.toUpperCase())+'" aria-label="Буква '+esc(ch)+' позиция '+(i+1)+'"'+(session.answered?' disabled':'')+'>'+esc(ch)+'</button>').join('')+'</div>';
  }
  function infoMarkup(item,session){
    return '<div class="cat-info"><div class="cat-focus-letter">'+esc(item.letter||item.prompt)+'</div><p>'+esc(item.feedback)+'</p></div>'+
      (!session.answered?'<button type="button" class="primary-button" data-info-ok>Понятно</button>':'');
  }
  function resultMarkup(session){
    const r=session.lastResult;if(!session.answered||!r)return '';
    const ok=r.correct;
    let expected='';
    if(!ok&&r.expected!=null)expected='<p><strong>Правильно:</strong> '+esc(Array.isArray(r.expected)?r.expected.join(' · '):r.expected)+'</p>';
    return '<div class="cat-feedback '+(ok?'correct':'wrong')+'" role="status"><strong>'+(ok?'Верно':'Ещё раз закрепим')+'</strong>'+expected+'<p>'+esc(r.feedback||'')+'</p></div>'+
      '<button type="button" class="primary-button" data-next-item>'+(session.cursor>=session.queue.length-1?'Дальше':'Следующее')+'</button>';
  }
  function itemMarkup(session){
    const item=session.queue[session.cursor];
    if(!item)return '<div class="cat-stage-card"><p>Задания этой ступени закончились.</p><button type="button" class="primary-button" data-next-item>Дальше</button></div>';
    const focus=item.letter||item.word||item.focus||'';
    let controls='';
    if(item.type==='choice')controls=choiceMarkup(item,session);
    else if(item.type==='recall')controls=recallMarkup(item,session);
    else if(item.type==='pairs')controls=pairsRecallMarkup(item,session);
    else if(item.type==='signal')controls=signalMarkup(item,session);
    else if(item.type==='info')controls=infoMarkup(item,session);
    const focusHtml=item.type==='signal'?'':('<div class="cat-focus-letter"'+(item.word?' lang="kk"':'')+'>'+esc(focus||item.prompt)+'</div>');
    const prompt=item.type==='signal'?'<h2>'+esc(item.prompt)+'</h2>':(item.prompt&&item.prompt!==focus?'<h2>'+esc(item.prompt)+'</h2>':'');
    return '<div class="cat-stage-card">'+stageProgress(session)+focusHtml+prompt+controls+resultMarkup(session)+'</div>';
  }
  function completeMarkup(session,rec){
    const s=H.summary(session);
    return '<div class="cat-stage-card cat-complete"><p class="eyebrow">ПОДХОД ЗАВЕРШЁН</p><h2>'+s.accuracy+'% самостоятельно</h2>'+
      '<div class="cat-summary"><div><strong>'+s.correct+'</strong><span>верно</span></div><div><strong>'+s.attempts+'</strong><span>ответов</span></div><div><strong>'+(s.medianResponseMs==null?'—':(s.medianResponseMs/1000).toFixed(1)+' с')+'</strong><span>медиана</span></div></div>'+
      '<p>'+(s.fluent?'Беглость уже высокая. Можно иногда возвращаться коротким раундом.':'Ошибочные пары будут встречаться чаще в следующих подходах.')+'</p>'+
      '<div class="personal-trainer-actions"><button type="button" class="primary-button" data-restart-full>Ещё полный подход</button><button type="button" class="secondary-button" data-restart-quick>Быстро: 12</button><button type="button" class="text-button" data-back-catalog>К списку</button></div></div>';
  }
  function trainerMarkup(){
    const rec=currentRecord(),session=rec&&rec.session;
    if(!session)return '<div class="cat-stage-card"><h2>Твёрдые / мягкие звуки</h2>'+pairMapMarkup()+'<button type="button" class="primary-button" data-start-full>Начать полный подход</button><button type="button" class="text-button" data-start-quick>Быстро: 12</button></div>';
    if(session.complete)return completeMarkup(session,rec);
    return session.stage===0?stageIntro(session):itemMarkup(session);
  }
  function render(){
    const root=getRoot();if(!root||!H)return;
    if(screen==='catalog')root.innerHTML=catalogMarkup();
    else if(screen==='numbers')root.innerHTML=numbersMarkup();
    else root.innerHTML='<div class="personal-trainer-head"><button type="button" class="text-button" data-back-catalog>← Все тренажёры</button><div><p class="eyebrow">ТРЕНАЖЁР КОТА</p><h2>1. Твёрдые / мягкие звуки</h2></div></div>'+trainerMarkup();
    bind(root);
    itemShownAt=Date.now();
  }
  function applyAnswer(response){
    const session=currentSession();if(!session||session.answered)return;
    const next=H.answer(session,response,Date.now()-itemShownAt);writeSession(activeId,next);render();
  }
  function bind(root){
    root.querySelectorAll('[data-trainer-open]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.trainerOpen,item=REGISTRY.find(x=>x.id===id);if(!item)return;
      if(item.kind==='cat'){const rec=load().trainers[id];if(rec&&rec.session&&!rec.session.complete)openTrainer(id);else start(id,'full');return;}
      if(item.kind==='numbers'){openTrainer(id);return;}
      if(item.target&&window.TrainerCatalogBridge&&window.TrainerCatalogBridge.launch)window.TrainerCatalogBridge.launch(item.target);
    });
    root.querySelectorAll('[data-number-track]').forEach(b=>b.onclick=()=>{if(!b.disabled&&window.TrainerCatalogBridge&&window.TrainerCatalogBridge.launch)window.TrainerCatalogBridge.launch('number:'+b.dataset.numberTrack);});
    root.querySelectorAll('[data-trainer-quick]').forEach(b=>b.onclick=()=>start(b.dataset.trainerQuick,'quick'));
    root.querySelectorAll('[data-back-catalog]').forEach(b=>b.onclick=openCatalog);
    root.querySelectorAll('[data-start-full],[data-restart-full]').forEach(b=>b.onclick=()=>start(activeId||'harmony_letters','full'));
    root.querySelectorAll('[data-start-quick],[data-restart-quick]').forEach(b=>b.onclick=()=>start(activeId||'harmony_letters','quick'));
    const begin=root.querySelector('[data-stage-begin]');if(begin)begin.onclick=()=>{const next=H.advance(currentSession());writeSession(activeId,next);render();};
    root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>applyAnswer(b.dataset.answer));
    root.querySelectorAll('[data-select-letter]').forEach(b=>b.onclick=()=>{const v=b.dataset.selectLetter;if(selection.has(v))selection.delete(v);else selection.add(v);b.classList.toggle('selected',selection.has(v));b.setAttribute('aria-pressed',selection.has(v)?'true':'false');});
    const checkRecall=root.querySelector('[data-check-recall]');if(checkRecall)checkRecall.onclick=()=>applyAnswer([...selection]);
    root.querySelectorAll('[data-pair-hard]').forEach(sel=>sel.onchange=()=>{pairSelection[sel.dataset.pairHard]=sel.value;});
    const checkPairs=root.querySelector('[data-check-pairs]');if(checkPairs)checkPairs.onclick=()=>applyAnswer(H.PAIRS.map(p=>p.hard+':'+(pairSelection[p.hard]||'')));
    const info=root.querySelector('[data-info-ok]');if(info)info.onclick=()=>applyAnswer(null);
    const next=root.querySelector('[data-next-item]');if(next)next.onclick=()=>{const s=H.advance(currentSession());selection=new Set();pairSelection={};writeSession(activeId,s);render();};
  }

  window.PersonalTrainers={STORAGE_KEY,REGISTRY,open,render,start,reset,load,openCatalog,openTrainer};
})();