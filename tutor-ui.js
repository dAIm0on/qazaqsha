/* Contextual tutor launcher + pet. Uses AiTutor. No new AI backend. */
(function(root){
 'use strict';
 const $=s=>document.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const TUTOR_SURFACES=new Set(['learn','path','practice','homework','rules','review','theory']);
 let ctx={surface:'learn',lesson_id:'1-1',chapter_id:'',rule_id:'',focus_word:'',stimulus:'',expected_answer:'',user_answer:'',codes:[]};
 let tail=[];
 let exampleIndex=0;
 let abort=null;
 let token=0;
 let lastReq=null;
 let pet=null;

 function bank(){return root.ExplainBankUI;}
 function card(){return bank()&&bank().get(ctx.rule_id);}
 function course(){return bank()&&bank().courseById(ctx.lesson_id);}
 function normWord(s){return String(s||'').normalize('NFC').toLocaleLowerCase('ru').replace(/[.!?,;:«»"']+/g,'').replace(/\s+/g,' ').trim();}


 function contextPrompts(){
  const id=ctx.chapter_id||'';
  const base={
   simplify:'Объясни правило этой главы проще, короткими шагами.',
   ru:'Чем это правило отличается от русского?',
   ex:'Дай ещё 2 примера на словах текущего урока.',
   why:'Почему именно так работает правило этой главы? Объясни механизм, а не только готовый ответ.'
  };
  const withQ=(ru,ex)=>Object.assign({},base,{ru,ex});
  if(ctx.lesson_id==='1-1'&&id!=='1-1-ae')return withQ('Чем это отличается от русского мягкого согласного?','Дай ещё 2 пары на знакомых словах.');
  if(id==='1-1-ae'||id==='1-2-a')return withQ('Почему твёрдое берёт А, а мягкое Е?','Дай ещё 2 слова курса: покажи только выбор А или Е.');
  if(id==='1-2-b'||id==='1-2-traps')return withQ('Почему не *адамлар и не *жердер?','Дай ещё 2 основы и покажи выбор Л, Д или Т.');
  if(id==='1-2-slot'||id==='1-2-glue')return withQ('Чем казахское множественное отличается от русской формы «книги»?','Собери ещё 2 формы: сначала А или Е, потом Л, Д или Т.');
  if(id==='1-3-qty'||id==='1-3-qty2')return withQ('Почему по-русски «две книги», а по-казахски после числа нет окончания множественного?','Дай ещё 2 примера: число + существительное без окончания множественного.');
  if(ctx.lesson_id==='1-3')return withQ('Как составное число собирается по разрядам?','Дай ещё 2 числа из курса.');
  if(id==='2-1-emes')return withQ('Чем отличается русское «не врач» от конструкции с емес и куда ставится окончание лица?','Дай ещё 2 отрицания на знакомых словах.');
  if(id==='2-1-ba'||id==='2-2-rq'||id==='2-3-q'||id==='2-3-qstem')return withQ('Чем казахская вопросительная частица отличается от русского вопроса и на какой звук она смотрит?','Дай ещё 2 вопроса из этой главы.');
  if(ctx.lesson_id==='2-1')return withQ('Почему по-русски «Я врач» без «есть», а по-казахски нужен кусок «кто есть» справа?','Дай ещё 2 формы мен/сен/сіз на словах курса.');
  if(id==='2-2-hi'||id==='2-3-bye')return withQ('Почему это готовая фраза, а не новое окончание?','Покажи ещё 2 примера с разными адресатами.');
  if(ctx.lesson_id==='2-2')return withQ('Почему русские формы «умный / умная / умные» нельзя переносить сюда буквально?','Дай ещё 2 формы біз/сендер/сіздер.');
  if(id==='2-3-ol'||id==='2-3-olar')return withQ('Почему у ол нет окончания «кто есть»?','Дай ещё 2 фразы с ол/олар.');
  if(ctx.lesson_id==='2-3')return withQ('Чем порядковое число отличается от сочетания вроде екі кітап?','Дай ещё 2 порядковых числа из курса.');
  return base;
 }

 const KK_RE=/[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі-]{2,}/;
 function extractKkToken(raw){
  const m=String(raw||'').match(KK_RE);
  return m?m[0]:'';
 }
 function lessonFirstWord(lessonId){
  const packs=root.LESSON_PACKS||[];
  const through=(root.AiContract&&root.AiContract.lessonsThrough&&root.AiContract.lessonsThrough(lessonId))||null;
  const prefer=packs.filter(p=>p&&(!lessonId||p.lesson_id===lessonId||(Array.isArray(through)&&through.includes(p.lesson_id))));
  for(const list of [prefer,packs]){
   for(const p of list){
    for(const row of (p&&p.target_vocabulary)||[]){
     const kk=row.kazakh||row.kk||row.word||'';
     if(kk)return String(kk);
    }
   }
  }
  const vocab=root.AiContract&&root.AiContract.VOCAB_BY_LESSON&&root.AiContract.VOCAB_BY_LESSON[lessonId];
  return (vocab&&vocab[0])||'';
 }
 function stemCandidates(word){
  const w=normWord(word);
  if(!w)return [];
  const out=[w];
  const endings=['ларымыз','леріміз','дарымыз','деріміз','тарымыз','теріміз','ларың','лерің','дарың','дерің','тарың','терің','лары','лері','дары','дері','тары','тері','ымыз','іміз','умыз','үміз','ыңыз','іңіз','ым','ім','ум','үм','ың','ің','уң','үң','сы','сі','ны','ні','ы','і','у','ү'];
  for(const e of endings){
   if(w.length>e.length+2&&w.endsWith(e)){
    const stem=w.slice(0,-e.length);
    out.push(stem);
    if(/б$/.test(stem))out.push(stem.slice(0,-1)+'п');
    if(/г$/.test(stem))out.push(stem.slice(0,-1)+'к');
    if(/ғ$/.test(stem))out.push(stem.slice(0,-1)+'қ');
   }
  }
  return [...new Set(out.filter(Boolean))];
 }
 function bankVocabRows(lessonId){
  const rows=[];
  const packs=root.LESSON_PACKS||[];
  const through=(root.AiContract&&root.AiContract.lessonsThrough&&root.AiContract.lessonsThrough(lessonId))||null;
  for(const p of packs){
   if(!p)continue;
   if(lessonId&&p.lesson_id!==lessonId&&!(Array.isArray(through)&&through.includes(p.lesson_id)))continue;
   for(const row of (p.target_vocabulary||[]))rows.push(row);
  }
  const WB=root.WORD_BANK;
  if(WB){
   const lessons=Array.isArray(through)&&through.length?through:(lessonId?[lessonId]:Object.keys(WB.must||{}));
   const buckets=[WB.must,WB.extra,WB.bonus,WB.optional].filter(Boolean);
   for(const bucket of buckets){
    for(const lid of lessons){
     for(const row of (bucket[lid]||[]))rows.push(row);
    }
    // also scan all lessons as fallback
    for(const lid of Object.keys(bucket)){
     if(lessons.includes(lid))continue;
     for(const row of (bucket[lid]||[]))rows.push(row);
    }
   }
  }
  return rows;
 }
 function glossLookup(word,lessonId){
  const surface=String(word||'').trim();
  const w=normWord(surface);
  if(!w)return null;
  const rows=bankVocabRows(lessonId);
  const scanExact=(needle)=>{
   for(const row of rows){
    const kk=normWord(row.kazakh||row.kk||row.word||'');
    if(kk!==needle)continue;
    const tr=row.translation||row.ru||row.gloss;
    const gloss=Array.isArray(tr)?tr[0]:tr;
    if(gloss)return {word:row.kazakh||row.kk||surface,gloss:String(gloss),source:'local',surface:surface||row.kazakh||row.kk};
   }
   return null;
  };
  let hit=scanExact(w);
  if(hit)return hit;
  // Inflected forms (кітабым → кітап): try stems, keep surface label.
  for(const cand of stemCandidates(w)){
   if(cand===w)continue;
   hit=scanExact(cand);
   if(hit)return {word:surface||hit.word,gloss:hit.gloss,source:'local-stem',stem:hit.word,surface:surface};
  }
  // Longest vocab prefix of the surface form.
  let best=null;
  for(const row of rows){
   const kk=normWord(row.kazakh||row.kk||row.word||'');
   if(kk.length<2||!w.startsWith(kk))continue;
   const tr=row.translation||row.ru||row.gloss;
   const gloss=Array.isArray(tr)?tr[0]:tr;
   if(!gloss)continue;
   if(!best||kk.length>best._n)best={word:surface||row.kazakh||row.kk,gloss:String(gloss),source:'local-prefix',stem:row.kazakh||row.kk,surface:surface,_n:kk.length};
  }
  if(best){delete best._n;return best;}
  return null;
 }
 function isLoneLetter(s){
  const t=String(s||'').trim();
  return !t||t.length<2||!KK_RE.test(t);
 }
 function preferVocabFocus(){
  const bag=[ctx.stimulus,ctx.expected_answer,ctx.user_answer,ctx.focus_word].filter(Boolean).join(' ');
  const re=new RegExp(KK_RE.source,'g');
  let m,best='',bestHit=null;
  while((m=re.exec(bag))){
   const hit=glossLookup(m[0],ctx.lesson_id);
   if(hit&&m[0].length>=(best||'').length){best=hit.word||m[0];bestHit=hit;}
  }
  if(bestHit)return bestHit.word||best;
  re.lastIndex=0;best='';
  while((m=re.exec(bag))){if(m[0].length>(best||'').length)best=m[0];}
  return best||'';
 }
 function focusWordFromCtx(){
  const raw=ctx.focus_word?String(ctx.focus_word):'';
  if(raw&&!isLoneLetter(raw))return raw;
  return preferVocabFocus()||extractKkToken(ctx.stimulus)||extractKkToken(ctx.expected_answer)||extractKkToken(ctx.user_answer)||'';
 }
 function ensureFocusWord(){
  let w=focusWordFromCtx();
  if(w&&!isLoneLetter(w)){ctx.focus_word=w;return w;}
  w=lessonFirstWord(ctx.lesson_id);
  if(w&&!isLoneLetter(w))ctx.focus_word=w;
  else ctx.focus_word=w||'';
  return ctx.focus_word||'';
 }
 function markKkWords(text){
  const s=String(text||'');
  let out='',last=0,m;
  const re=new RegExp(KK_RE.source,'g');
  while((m=re.exec(s))){
   out+=esc(s.slice(last,m.index));
   out+='<button type="button" class="tutor-word-tap" data-tutor-word="'+esc(m[0])+'" lang="kk">'+esc(m[0])+'</button>';
   last=m.index+m[0].length;
  }
  return out+esc(s.slice(last));
 }
 function bindWordTaps(rootEl){
  const rootNode=rootEl||document;
  rootNode.querySelectorAll('[data-tutor-word]').forEach(b=>{
   if(b.dataset.tutorBound)return;
   b.dataset.tutorBound='1';
   b.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    const w=b.getAttribute('data-tutor-word')||'';
    if(!w)return;
    openGloss(w);
   });
  });
 }

 function setContext(next){
  next=next||{};
  const prev=ctx.lesson_id+':'+ctx.chapter_id+':'+ctx.rule_id;
  const lesson_id=next.lesson_id||ctx.lesson_id||'1-1';
  const chapter_id=next.chapter_id||'';
  let rule_id=next.rule_id||'';
  if(!rule_id&&bank()&&chapter_id)rule_id=bank().ruleForChapter({id:chapter_id,rule_ids:next.rule_ids||[]});
  if(!rule_id&&bank()){
   const row=bank().courseById(lesson_id);
   rule_id=row&&row.rules&&row.rules[0]||'';
  }
  ctx={
   surface:next.surface||ctx.surface||'learn',
   lesson_id,chapter_id,rule_id,
   user_answer:next.user_answer!=null?String(next.user_answer).slice(0,400):'',
   expected_answer:next.expected_answer!=null?String(next.expected_answer).slice(0,400):'',
   stimulus:next.stimulus!=null?String(next.stimulus).slice(0,400):'',
   codes:Array.isArray(next.codes)?next.codes.filter(x=>typeof x==='string').slice(0,8):[],
   focus_word:next.focus_word!=null?String(next.focus_word).slice(0,80):(next.word!=null?String(next.word).slice(0,80):ctx.focus_word||'')
  };
  if(isLoneLetter(ctx.focus_word))ctx.focus_word='';
  if(!ctx.focus_word)ensureFocusWord();
  const now=ctx.lesson_id+':'+ctx.chapter_id+':'+ctx.rule_id;
  if(now!==prev){tail=[];exampleIndex=0;}
  paintChips();
 }

 function syncView(view){
  const host=$('#tutor-host');
  if(!host)return;
  const v=String(view||'');
  const exam=view==='exam'||v==='exam';
  const show=!exam&&(TUTOR_SURFACES.has(v)||v==='practice'||v==='homework'||v==='learn'||v==='path'||v==='rules'||v==='review'||v==='theory');
  host.hidden=!show;
  if(!show)close();
  document.body.classList.toggle('tutor-exam',exam);
  if(show&&pet)pet.onView(v);
 }

 function mount(){
  if($('#tutor-host')){if(pet)pet.ensure();return;}
  const host=document.createElement('div');
  host.id='tutor-host';
  host.innerHTML=`<button type="button" class="tutor-launch" id="tutor-launch" aria-label="Спросить тьютора" aria-haspopup="dialog" aria-controls="tutor-sheet">
    <span class="tutor-sticker-dot" aria-hidden="true"></span>
  </button>
  <div id="tutor-steb" class="tutor-steb" hidden role="status" aria-live="polite"></div>
  <div id="tutor-sheet" class="tutor-sheet" hidden role="dialog" aria-labelledby="tutor-sheet-title">
    <div class="tutor-sheet-head">
      <p class="eyebrow" id="tutor-sheet-title">Спросить про это</p>
      <p class="small" id="tutor-sheet-ctx"></p>
      <button type="button" class="text-button" id="tutor-close">Готово</button>
    </div>
    <div class="tutor-chips" id="tutor-chips"></div>
    <label class="input-label" for="tutor-q">Свой вопрос</label>
    <textarea id="tutor-q" rows="2" maxlength="400" autocomplete="off" enterkeyhint="send" placeholder="Напиши вопрос"></textarea>
    <div class="tutor-send-row">
      <button type="button" class="primary-button" id="tutor-send">Спросить</button>
      <span id="tutor-badge" class="tutor-badge" hidden></span>
      <button type="button" class="text-button" id="tutor-retry" hidden>Повторить</button>
    </div>
    <div id="tutor-out" class="tutor-out" hidden></div>
  </div>`;
  document.body.appendChild(host);
  $('#tutor-launch').onclick=(e)=>{e.preventDefault();open();};
  $('#tutor-close').onclick=()=>close();
  $('#tutor-send').onclick=()=>askFree();
  $('#tutor-retry').onclick=()=>retryLast();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#tutor-sheet')&&!$('#tutor-sheet').hidden)close();});
  paintChips();
  pet=createPet(host);
  pet.ensure();
 }

 function paintChips(){
  const box=$('#tutor-chips');if(!box)return;
  const word=ensureFocusWord();
  const glossHit=word?glossLookup(word,ctx.lesson_id):null;
  const chipWord=(glossHit&&(glossHit.surface||glossHit.word))||word;
  const glossLabel=glossHit?(chipWord+' — '+String(glossHit.gloss).slice(0,28)):(word&&!isLoneLetter(word)?word:'Слово');
  const chips=[];
  // P0: first chip always = current/tapped word gloss (≤2 taps with cat)
  chips.push('<button type="button" class="secondary-button tutor-chip-gloss" data-tutor-act="gloss" data-word="'+esc(word)+'">'+esc(glossLabel.length>36?glossLabel.slice(0,34)+'…':glossLabel)+'</button>');
  chips.push('<button type="button" class="secondary-button" data-tutor-act="unclear">Не ясно</button>');
  chips.push('<button type="button" class="secondary-button" data-tutor-act="explain">Объясни</button>');
  box.innerHTML=chips.join('');
  box.querySelectorAll('[data-tutor-act]').forEach(b=>b.onclick=()=>quick(b.dataset.tutorAct,b.dataset.word||''));
 }

 function open(){
  const sheet=$('#tutor-sheet');if(!sheet)return;
  ensureFocusWord();
  paintCtx();paintChips();
  sheet.hidden=false;
  document.body.classList.add('tutor-open');
  const q=$('#tutor-q');if(q)try{q.focus({preventScroll:true});}catch{q.focus();}
 }
 function openGloss(word){
  const w=String(word||'').trim()||ensureFocusWord();
  if(w)ctx.focus_word=w;
  open();
  quick('gloss',w);
 }

 function close(){
  const sheet=$('#tutor-sheet');if(sheet)sheet.hidden=true;
  document.body.classList.remove('tutor-open');
  token++;
  try{if(abort)abort.abort();}catch{}
  hideBadge();
 }

 function paintCtx(){
  const el=$('#tutor-sheet-ctx');if(!el)return;
  const c=course(),r=card();
  el.textContent='Урок '+(c?c.label:ctx.lesson_id)+(c?' · '+c.name:'')+(r&&r.title?' · '+r.title:'');
 }

 function hideBadge(){
  const b=$('#tutor-badge'),r=$('#tutor-retry');
  if(b){b.hidden=true;b.textContent='';}
  if(r)r.hidden=true;
 }
 function showBadge(source){
  const b=$('#tutor-badge'),r=$('#tutor-retry');
  const src=source==='primary'?'':(source==='fallback'||source==='recovery'?'fallback':source==='local'?'local':'');
  if(!src){hideBadge();return;}
  if(b){b.hidden=false;b.textContent=src;b.dataset.source=src;}
  if(r)r.hidden=false;
 }

 function stripClientMeta(raw){
  let t=String(raw||'').trim().replace(/reasoning[_a-z]*\s*:[\s\S]*/i,'').trim();
  t=t.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<\/?think>/gi,'').trim();
  const metaRe=/Хорошо,?\s*учениц|учениц[ая]\s+просит|Нужно следовать|внутренн(ие|их)\s+инструкц|структурирую ответ|сначала (подумаю|разберу)|разберу инструкции|следуя инструкциям|Okay,?\s+the user (asked|is asking)|\bI will structure\b|Let me (structure|think|recall|analyze)/i;
  const paras=t.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
  while(paras.length>1&&metaRe.test(paras[0]))paras.shift();
  if(paras.length)t=paras.join('\n\n').trim();
  t=t.replace(/^(Хорошо,?\s*учениц[ая][^.!?…\n]*[.!?…]?\s*)+/i,'');
  t=t.replace(/^(Нужно следовать[^.!?…\n]*[.!?…]?\s*)+/i,'');
  t=t.replace(/^(Okay,?\s+the user (asked|is asking)[^.!?…\n]*[.!?…]?\s*)+/i,'');
  t=t.replace(/^(I will structure[^.!?…\n]*[.!?…]?\s*)+/i,'');
  t=t.replace(/^(сначала (подумаю|разберу)[^.!?…\n]*[.!?…]?\s*)+/i,'');
  t=t.replace(/^(следуя инструкциям[^.!?…\n]*[.!?…]?\s*)+/i,'');
  if(metaRe.test(t)&&t.length<420&&!/(В русском|По-казахски|наклейк|п\s*[→\-–]\s*б)/i.test(t))return '';
  return t.trim();
 }
 function showOut(html,meta){
  const out=$('#tutor-out');if(!out)return;
  out.hidden=false;
  const source=meta&&meta.source;
  const oil=source&&source!=='primary';
  out.innerHTML=(oil?'<p class="small tutor-oil">Ответ '+(source==='local'?'из материалов урока':'с запасного канала')+'</p>':'')+html;
  showBadge(source||'');
 }

 function dummyQ(){
  const c=card()||{};
  return {id:'tutor:'+ctx.surface+':'+ctx.lesson_id+':'+(ctx.chapter_id||''),lessonId:ctx.lesson_id,title:c.title||'',stimulus:ctx.user_answer||'',fields:[{answers:[ctx.expected_answer||'']}],ruleIds:[ctx.rule_id].filter(Boolean)};
 }
 function extra(more){
  const surface=ctx.surface==='theory'?'learn':(ctx.surface||'practice');
  return Object.assign({
   surface:surface==='learn'?'learn':surface,
   lesson_id:ctx.lesson_id,
   codes:ctx.codes||[],
   user_answer:ctx.user_answer||'',
   is_correct:false,
   conversation_tail:tail.slice()
  },more||{});
 }
 function thinking(){showOut('<p>Думаю над этим примером…</p>',{source:'primary'});hideBadge();}

 async function callAI(mode,question,opts){
  opts=opts||{};
  lastReq={mode,question,opts};
  if(!root.AiTutor||!root.AiTutor.callTutor){
   localCanon(mode,question);return;
  }
  const my=++token;
  thinking();
  try{if(abort)abort.abort();}catch{}
  abort=typeof AbortController!=='undefined'?new AbortController():null;
  const q=dummyQ();
  const ctxCard=bank()?bank().context(ctx.rule_id):null;
  const req=root.AiTutor.buildRequest(mode,q,extra({user_question:question||'',rule_context:ctxCard?[ctxCard]:[]}));
  if(ctxCard)req.rule_context=[ctxCard];
  req.lesson_id=ctx.lesson_id;
  if(mode==='translate_word'){
   req.expected_answer='';
   req.user_answer='';
   req.prompt=question||'';
  }
  const resp=await root.AiTutor.callTutor(req,(root.AiContract&&root.AiContract.CLIENT_TIMEOUT_MS)||30000,{signal:abort&&abort.signal});
  if(my!==token||(resp&&resp.aborted))return;
  const msg=resp&&String(resp.message_ru||'').trim();
  if(msg){
   if(question&&mode!=='translate_word'){tail.push({role:'user',content:question});tail.push({role:'assistant',content:msg});tail=tail.slice(-4);}
   // Strip any CoT / reasoning / RU meta if API slipped
   const clean=stripClientMeta(msg);
   if(!clean){localCanon(mode,question);return;}
   showOut('<p>'+esc(clean)+'</p>',resp.meta||{});
   return;
  }
  localCanon(mode,question);
 }

 function retryLast(){
  if(!lastReq)return;
  callAI(lastReq.mode,lastReq.question,lastReq.opts);
 }

 function localCanon(mode,question){
  const c=card();
  if(mode==='translate_word'){
   const hit=glossLookup(question||focusWordFromCtx(),ctx.lesson_id);
   if(hit){showOut('<p lang="kk"><strong>'+esc(hit.word)+'</strong></p><p>'+esc(hit.gloss)+'</p>',{source:'local'});return;}
   showOut('<p>Короткий перевод пока из материалов урока недоступен.</p>',{source:'local'});return;
  }
  if(!c){showOut('<p>Объяснение пока не подключено. Вернись к карточке урока.</p>',{source:'local'});return;}
  // «Не ясно» / explain: prefer full medium + research (ru_refresh), not short
  const full=[c.medium,c.ru_refresh].filter(Boolean).join('\n\n')||c.short||'';
  if(mode==='simplify'||mode==='ask_tutor'||!mode){
   showOut('<p>'+esc(full).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')+'</p>',{source:'local'});return;
  }
  showOut('<p>'+esc(full).replace(/\n\n/g,'</p><p>')+'</p>',{source:'local'});
 }

 function offTopicReply(){
  showOut('<p>Это сейчас вне текущего урока. Вернёмся к правилу на карточке.</p>',{source:'local'});
  paintChips();
 }

 function looksOffTopic(q){
  q=String(q||'');
  if(!q)return false;
  // crude: pure smalltalk / unrelated languages without kk letters and without lesson cues
  if(/^(привет|как дела|что такое жизнь|напиши стих|who are you)/i.test(q.trim()))return true;
  return false;
 }

 async function quick(act,word){
  if(act==='gloss'){
   const w=word||focusWordFromCtx();
   const hit=glossLookup(w,ctx.lesson_id);
   if(hit){showOut('<p lang="kk"><strong>'+esc(hit.word)+'</strong></p><p>'+esc(hit.gloss)+'</p>',{source:'local'});return;}
   await callAI('translate_word',w);return;
  }
  if(act==='unclear'){
   // Primary = fullExplanation + research-card (medium+ru_refresh), never short tip / futureBlocked.
   let c=card();
   if((!c||!(c.medium||c.ru_refresh))&&bank()){
    if(ctx.chapter_id){
     const rid=bank().ruleForChapter({id:ctx.chapter_id,rule_ids:[]});
     if(rid){ctx.rule_id=rid;c=card();}
    }
    if((!c||!(c.medium||c.ru_refresh))){
     const row=bank().courseById(ctx.lesson_id);
     if(row&&row.rules&&row.rules[0]){ctx.rule_id=row.rules[0];c=card();}
    }
   }
   if(c&&(c.medium||c.ru_refresh)){
    const html=[c.medium?('<p>'+esc(c.medium).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')+'</p>'):'',
                c.ru_refresh?('<p class="small">'+esc(c.ru_refresh).replace(/\n/g,'<br>')+'</p>'):''].join('');
    showOut(html,{source:'local'});
    return;
   }
   if(c&&c.short){
    showOut('<p>'+esc(c.short)+'</p>',{source:'local'});
    return;
   }
   await callAI('ask_tutor','Не ясно. Объясни правило этой главы ещё раз полностью.');
   return;
  }
  if(act==='explain'){
   await callAI('simplify','Объясни правило этой главы. Используй полное объяснение текущего урока.');
   return;
  }
 }

 function askFree(){
  const q=($('#tutor-q')&&$('#tutor-q').value.trim())||'';
  if(!q){quick('unclear');return;}
  if(looksOffTopic(q)){offTopicReply();return;}
  callAI('ask_tutor',q);
 }

 /* Pet: edge dock, ≥44px hit, z below primary controls, freeze on focus, mischief gated on assets. */
 function createPet(host){
  const WAVE1=[
   {id:'tygydyk',file:'assets/tutor/wave1/1-tygydyk.webp'},
   {id:'crab',file:'assets/tutor/wave1/3-crab.webp'},
   {id:'miss-lick',file:'assets/tutor/wave1/7-miss-lick.webp'},
   {id:'meerkat',file:'assets/tutor/wave1/8-meerkat.webp'},
   {id:'corner-bite',file:'assets/tutor/wave1/4-corner-bite.webp'}
  ];
  let available=[];
  let frozen=false;
  let clipPlaying=false;
  let raf=0;
  let schoolOnce=false;
  const launch=$('#tutor-launch');
  const steb=$('#tutor-steb');
  const img=launch&&launch.querySelector('.tutor-pet-img');

  function reduced(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}

  function probeAssets(){
   available=[];
   WAVE1.forEach(clip=>{
    const probe=new Image();
    probe.onload=()=>{if(!available.find(x=>x.id===clip.id))available.push(clip);};
    probe.onerror=()=>{};
    probe.src=clip.file;
   });
  }

  function setIdle(){/* default companion is the CSS sticker; pet-idle is not shown */ }

  function showSteb(text){
   if(!steb)return;
   steb.hidden=false;
   steb.textContent=text;
   clearTimeout(showSteb._t);
   showSteb._t=setTimeout(()=>{steb.hidden=true;},1800);
  }

  function playMischief(){
   return; /* wave1 webp stay in assets, unused */
   if(frozen||reduced()||!available.length||clipPlaying)return;
   const clip=available[Math.floor(Math.random()*available.length)];
   clipPlaying=true;
   if(img)img.src=clip.file;
   showSteb('…');
   const start=performance.now();
   const tick=(t)=>{
    if(t-start>1600){
     clipPlaying=false;setIdle();raf=0;return;
    }
    raf=requestAnimationFrame(tick);
   };
   raf=requestAnimationFrame(tick);
  }

  function onFocusIn(e){
   const t=e.target;
   if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)){
    frozen=true;
    host.classList.add('tutor-pet-frozen');
   }
  }
  function onFocusOut(){
   frozen=false;
   host.classList.remove('tutor-pet-frozen');
  }

  function ensure(){
   document.addEventListener('focusin',onFocusIn,true);
   document.addEventListener('focusout',onFocusOut,true);
   if(launch){
    // Hit target uses button onclick → open() (works during clip too). School one-shot ≤2s.
    launch.addEventListener('click',()=>{
     if(!schoolOnce&&!reduced()){
      schoolOnce=true;
      host.classList.add('tutor-pet-school');
      setTimeout(()=>host.classList.remove('tutor-pet-school'),2000);
     }
    });
   }
   // Mischief only if assets present: occasional timer
   setInterval(()=>{if(available.length&&!frozen&&!document.body.classList.contains('tutor-open'))playMischief();},28000);
  }

  function onView(){/* reserved */}

  return {ensure,onView,playMischief,available:()=>available};
 }

 const api={mount,setContext,syncView,open,openGloss,close,context:()=>ctx,glossLookup,focusWord:focusWordFromCtx,ensureFocusWord,markKkWords,bindWordTaps};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TutorUI=api;
})(typeof window!=='undefined'?window:globalThis);
