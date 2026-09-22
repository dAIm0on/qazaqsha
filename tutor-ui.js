/* Contextual tutor launcher. Uses AiTutor. No new AI backend. */
(function(root){
 'use strict';
 const $=s=>document.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ctx={surface:'learn',lesson_id:'1-1',chapter_id:'',rule_id:''};
 let tail=[];
 let exampleIndex=0;
 let abort=null;
 let token=0;
 function bank(){return root.ExplainBankUI;}
 function card(){return bank()&&bank().get(ctx.rule_id);}
 function course(){return bank()&&bank().courseById(ctx.lesson_id);}
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
  ctx={surface:next.surface||ctx.surface||'learn',lesson_id,chapter_id,rule_id,user_answer:next.user_answer!=null?String(next.user_answer).slice(0,400):'',expected_answer:next.expected_answer!=null?String(next.expected_answer).slice(0,400):'',codes:Array.isArray(next.codes)?next.codes.filter(x=>typeof x==='string').slice(0,8):[]};
  const now=ctx.lesson_id+':'+ctx.chapter_id+':'+ctx.rule_id;
  if(now!==prev){tail=[];exampleIndex=0;}
 }
 function syncView(view){
  const host=$('#tutor-host');
  if(!host)return;
  const show=view==='learn'||view==='path';
  host.hidden=!show;
  if(!show)close();
  document.body.classList.toggle('tutor-exam',view==='exam');
 }
 function mount(){
  if($('#tutor-host'))return;
  const host=document.createElement('div');
  host.id='tutor-host';
  host.innerHTML=`<button type="button" class="tutor-launch" id="tutor-launch" aria-label="Спросить тьютора" aria-haspopup="dialog" aria-controls="tutor-sheet">
    <img src="assets/tutor/pet-idle.png" alt="" width="48" height="56" decoding="async">
  </button>
  <div id="tutor-sheet" class="tutor-sheet" hidden role="dialog" aria-labelledby="tutor-sheet-title">
    <div class="tutor-sheet-head">
      <p class="eyebrow" id="tutor-sheet-title">Спросить про это</p>
      <p class="small" id="tutor-sheet-ctx"></p>
      <button type="button" class="text-button" id="tutor-close">Закрыть</button>
    </div>
    <div class="tutor-chips">
      <button type="button" class="secondary-button" data-tutor-act="simplify">Объясни проще</button>
      <button type="button" class="secondary-button" data-tutor-act="ru">Сравни с русским</button>
      <button type="button" class="secondary-button" data-tutor-act="ex">Ещё пример</button>
      <button type="button" class="secondary-button" data-tutor-act="why">Почему именно так?</button>
    </div>
    <label class="input-label" for="tutor-q">Свой вопрос</label>
    <textarea id="tutor-q" rows="2" maxlength="400" autocomplete="off" enterkeyhint="send" placeholder="Напиши вопрос"></textarea>
    <button type="button" class="primary-button" id="tutor-send">Спросить</button>
    <div id="tutor-out" class="tutor-out" hidden></div>
  </div>`;
  document.body.appendChild(host);
  $('#tutor-launch').onclick=()=>open();
  $('#tutor-close').onclick=()=>close();
  $('#tutor-send').onclick=()=>askFree();
  host.querySelectorAll('[data-tutor-act]').forEach(b=>b.onclick=()=>quick(b.dataset.tutorAct));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#tutor-sheet').hidden)close();});
 }
 function open(){
  const sheet=$('#tutor-sheet');if(!sheet)return;
  paintCtx();
  sheet.hidden=false;
  document.body.classList.add('tutor-open');
  const q=$('#tutor-q');if(q)try{q.focus({preventScroll:true});}catch{q.focus();}
 }
 function close(){
  const sheet=$('#tutor-sheet');if(sheet)sheet.hidden=true;
  document.body.classList.remove('tutor-open');
  token++;
  try{if(abort)abort.abort();}catch{}
 }
 function paintCtx(){
  const el=$('#tutor-sheet-ctx');if(!el)return;
  const c=course(),r=card();
  el.textContent='Урок '+(c?c.label:ctx.lesson_id)+(c?' · '+c.name:'')+(r&&r.title?' · '+r.title:'');
 }
 function showOut(html,local){
  const out=$('#tutor-out');if(!out)return;
  out.hidden=false;
  out.innerHTML=(local?'<p class="small">Ответ из материалов урока</p>':'')+html;
 }
 function dummyQ(){
  const c=card()||{};
  return {id:'tutor:'+ctx.surface+':'+ctx.lesson_id+':'+(ctx.chapter_id||''),lessonId:ctx.lesson_id,title:c.title||'',stimulus:ctx.user_answer||'',fields:[{answers:[ctx.expected_answer||'']}],ruleIds:[ctx.rule_id].filter(Boolean)};
 }
 function extra(more){
  return Object.assign({
   surface:ctx.surface==='learn'?'learn':(ctx.surface||'path'),
   lesson_id:ctx.lesson_id,
   codes:ctx.codes||[],
   user_answer:ctx.user_answer||'',
   is_correct:false,
   conversation_tail:tail.slice()
  },more||{});
 }
 function thinking(){
  showOut('<p>Думаю над этим примером…</p>');
 }
 async function callAI(mode,question){
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
  const resp=await root.AiTutor.callTutor(req,25000,{signal:abort&&abort.signal});
  if(my!==token||(resp&&resp.aborted))return;
  const msg=resp&&String(resp.message_ru||'').trim();
  if(msg){
   if(question){tail.push({role:'user',content:question});tail.push({role:'assistant',content:msg});tail=tail.slice(-4);}
   showOut('<p>'+esc(msg)+'</p>',resp.meta&&resp.meta.source==='local');
   return;
  }
  localCanon(mode,question);
 }
 function localCanon(mode,question){
  const c=card();
  if(!c){showOut('<p>Объяснение пока не подключено.</p>',true);return;}
  if(mode==='simplify'||!mode){
   showOut('<p>'+esc(c.short||c.medium||'')+'</p>',true);return;
  }
  if(question)showOut('<p>'+esc(c.medium||c.ru_refresh||c.short)+'</p>',true);
  else showOut('<p>'+esc(c.short||c.medium)+'</p>',true);
 }
 function quick(act){
  const c=card(),p=contextPrompts();
  if(act==='ru'){
   if(c&&c.ru_refresh){
    showOut('<p>'+esc(c.ru_refresh).replace(/\n/g,'</p><p>')+'</p><p><button type="button" class="text-button" id="tutor-ru-more">Спросить подробнее</button></p>',true);
    const more=$('#tutor-ru-more');if(more)more.onclick=()=>callAI('ask_tutor',p.ru);
    return;
   }
   callAI('ask_tutor',p.ru);return;
  }
  if(act==='ex'){
   const ex=(c&&c.examples)||[];
   if(exampleIndex<ex.length){
    showOut('<p lang="kk">'+esc(ex[exampleIndex])+'</p>',true);
    exampleIndex++;
    return;
   }
   callAI('ask_tutor',p.ex);return;
  }
  if(act==='simplify'){callAI('simplify',p.simplify);return;}
  if(act==='why'){callAI('ask_tutor',p.why);return;}
 }
 function askFree(){
  const q=($('#tutor-q')&&$('#tutor-q').value.trim())||'';
  if(!q){quick('simplify');return;}
  callAI('ask_tutor',q);
 }
 const api={mount,setContext,syncView,open,close,context:()=>ctx};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TutorUI=api;
})(typeof window!=='undefined'?window:globalThis);
