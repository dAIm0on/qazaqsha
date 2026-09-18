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
  ctx={surface:next.surface||ctx.surface||'learn',lesson_id,chapter_id,rule_id};
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
  const c=course();
  el.textContent='Урок '+(c?c.label:ctx.lesson_id)+(c?' · '+c.name:'');
 }
 function showOut(html,local){
  const out=$('#tutor-out');if(!out)return;
  out.hidden=false;
  out.innerHTML=(local?'<p class="small">Ответ из материалов урока</p>':'')+html;
 }
 function dummyQ(){
  const c=card()||{};
  return {id:'tutor:'+ctx.surface+':'+ctx.lesson_id+':'+(ctx.chapter_id||''),lessonId:ctx.lesson_id,title:c.title||'',stimulus:'',fields:[{answers:['']}],ruleIds:[ctx.rule_id].filter(Boolean)};
 }
 function extra(more){
  return Object.assign({
   surface:ctx.surface==='learn'?'learn':(ctx.surface||'path'),
   lesson_id:ctx.lesson_id,
   codes:[],
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
  const c=card();
  if(act==='ru'){
   if(c&&c.ru_refresh){
    showOut('<p>'+esc(c.ru_refresh).replace(/\n/g,'</p><p>')+'</p><p><button type="button" class="text-button" id="tutor-ru-more">Спросить подробнее</button></p>',true);
    const more=$('#tutor-ru-more');if(more)more.onclick=()=>callAI('ask_tutor','Объясни через русский подробнее.');
    return;
   }
   callAI('ask_tutor','Сравни с русским.');return;
  }
  if(act==='ex'){
   const ex=(c&&c.examples)||[];
   if(exampleIndex<ex.length){
    showOut('<p lang="kk">'+esc(ex[exampleIndex])+'</p>',true);
    exampleIndex++;
    return;
   }
   callAI('ask_tutor','Дай ещё пример на словах этого урока.');return;
  }
  if(act==='simplify'){callAI('simplify','Объясни проще.');return;}
  if(act==='why'){callAI('ask_tutor','Почему именно так?');return;}
 }
 function askFree(){
  const q=($('#tutor-q')&&$('#tutor-q').value.trim())||'';
  if(!q){quick('simplify');return;}
  callAI('ask_tutor',q);
 }
 const api={mount,setContext,syncView,open,close,context:()=>ctx};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TutorUI=api;
})(typeof window!=='undefined'?window:globalThis);
