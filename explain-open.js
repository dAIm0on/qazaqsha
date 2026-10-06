/* Full explanation from bank and chapters that already exist. Does not invent PDF text. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Bank=node?require('./explain-bank.js'):root.ExplainBank;
 const G=node?require('./grammar-chapters.js'):root.GRAMMAR_CHAPTERS;
 const L31=node?require('./lesson31-pack.js'):root.Lesson31Pack;
 const Canon=node?require('./canon-texts.js'):root.CanonTexts;
 function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
 function ruleIdOf(q){
  const ids=(q&&q.ruleIds)||[];
  return ids.find(id=>Bank&&Bank.byId&&Bank.byId(id))||'';
 }
 function chaptersFor(ruleId){
  const out=[];
  for(const les of (G&&G.LESSONS)||[]){
   for(const ch of les.chapters||[]){
    if((ch.rule_ids||[]).includes(ruleId))out.push(ch);
   }
  }
  return out;
 }
 function beatBlocks(ch){
  const bits=[];
  for(const b of ch.beats||[]){
   if(!b||b.k==='ask')continue;
   if(b.k==='goal')bits.push('<p><strong>Цель.</strong> '+esc(b.t)+'</p>');
   else if(b.k==='why')bits.push('<p><strong>'+esc(b.t||'Зачем')+'.</strong> '+esc(b.b)+'</p>');
   else if(b.k==='bridge')bits.push('<p><strong>В русском.</strong> '+esc(b.ru)+'</p><p><strong>В казахском.</strong> '+esc(b.kz)+'</p><p><strong>Поэтому.</strong> '+esc(b.do||b.doit||'')+'</p>');
   else if(b.k==='algo')bits.push('<p><strong>'+esc(b.t||'Шаги')+'.</strong></p><ol>'+(b.items||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>');
   else if(b.k==='ex')bits.push('<p><strong>Верно:</strong> <span lang="kk">'+esc(b.to)+'</span>'+(b.ru?' — '+esc(b.ru):'')+(b.why?'. '+esc(b.why):'')+'</p>');
   else if(b.k==='trap')bits.push('<p><strong>Неверно:</strong> <span lang="kk">'+esc(b.bad)+'</span> → <strong>Верно:</strong> <span lang="kk">'+esc(b.good)+'</span>'+(b.why?'. <strong>Почему:</strong> '+esc(b.why):'')+'</p>');
   else if(b.k==='fold')bits.push('<p><strong>'+esc(b.t||'Коротко')+'.</strong> '+esc(b.b)+'</p>');
   else if(b.k==='slots')bits.push('<p>'+esc(b.t||'')+' '+esc((b.parts||[]).map(p=>p.l).join(' + '))+'</p>');
  }
  return bits.join('');
 }
 function inlineMd(s){
  let t=esc(s);
  t=t.replace(/`([^`]+)`/g,'<code>$1</code>');
  t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  return t;
 }
 function renderMd(src){
  const lines=String(src||'').replace(/\r\n/g,'\n').split('\n');
  let html='',list='',code=false,buf=[];
  function close(){if(list){html+='</'+list+'>';list='';}}
  function flush(){if(!buf.length)return;close();html+='<p>'+buf.map(inlineMd).join('<br>')+'</p>';buf=[];}
  for(const line of lines){
   if(line.trim().startsWith('```')){
    if(code){html+='<pre><code>'+esc(buf.join('\n'))+'</code></pre>';buf=[];code=false;}
    else{flush();code=true;}
    continue;
   }
   if(code){buf.push(line);continue;}
   if(!line.trim()){flush();continue;}
   const h=line.match(/^(#{1,4})\s+(.*)$/);
   if(h){flush();const n=Math.min(6,h[1].length+1);html+='<h'+n+'>'+inlineMd(h[2])+'</h'+n+'>';continue;}
   if(/^---+$/.test(line.trim())){flush();html+='<hr>';continue;}
   const ol=line.match(/^\d+\.\s+(.*)$/);
   const ul=line.match(/^[-*]\s+(.*)$/);
   if(ol||ul){
    if(buf.length)flush();
    const kind=ol?'ol':'ul';
    if(list!==kind){close();html+='<'+kind+'>';list=kind;}
    html+='<li>'+inlineMd((ol||ul)[1])+'</li>';
    continue;
   }
   if(list)close();
   buf.push(line);
  }
  if(code)html+='<pre><code>'+esc(buf.join('\n'))+'</code></pre>';
  else flush();
  close();
  return html;
 }
 function canonHtml(ruleId){
  const pack=Canon&&Canon.packFor&&Canon.packFor(ruleId);
  if(!pack||!pack.docs||!pack.docs.length)return '';
  const card=Bank&&Bank.byId&&Bank.byId(ruleId);
  const head=card?'<section class="path-block"><p class="small">Карточка</p><p>'+esc(card.short||card.title||'')+'</p></section>':'';
  const body=pack.docs.map(d=>'<section class="path-block" data-canon-doc="'+esc(d.id)+'"><h3>'+esc(d.title)+'</h3>'+renderMd(d.text)+'</section>').join('');
  const src='<section class="path-block" data-canon-source><h3>Исходник</h3><ul>'+pack.docs.map(d=>'<li><a href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">'+esc(d.title)+'</a></li>').join('')+'</ul></section>';
  return '<div data-canon-lesson="'+esc(pack.lesson)+'">'+head+body+src+'</div>';
 }
 function fullHtml(ruleId,opts){
  // r7 X1: author source docs (canon-texts: S31/S32, «Статус», «Файл дыр», .md names, Drive links) are not
  // learner text. The learner panel is the bank card + chapters; canonHtml stays for authors only (not rendered).
  const card=Bank&&Bank.byId&&Bank.byId(ruleId);
  if(!card)return '';
  const paras=text=>String(text||'').split(/\n{2,}/).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
  const chapters=chaptersFor(ruleId).map(ch=>'<section class="path-block"><h3>'+esc(ch.title)+'</h3>'+beatBlocks(ch)+'</section>').join('');
  return '<section class="path-block"><h3>Сравни с русским</h3>'+paras(card.ru_refresh)+'</section>'
   +'<section class="path-block"><h3>Коротко</h3>'+paras(card.short)+'</section>'
   +'<section class="path-block"><h3>Как работает</h3>'+paras(card.medium)+'</section>'
   +(card.examples&&card.examples.length?'<section class="path-block"><h3>Примеры</h3><ul>'+card.examples.map(x=>'<li lang="kk">'+esc(x)+'</li>').join('')+'</ul></section>':'')
   +(card.traps&&card.traps.length?'<section class="path-block"><h3>Неверно → верно</h3><ul>'+card.traps.map(t=>'<li lang="kk">'+esc(t)+'</li>').join('')+'</ul></section>':'')
   +(opts&&opts.brief?'':chapters);
 }
 function ruleOpen(ruleId){
  if(root.ExplainDepth&&ruleId&&typeof root.ExplainDepth.get==='function')return root.ExplainDepth.get(ruleId)!==false;
  return true;
 }
 function openButton(ruleId,opts){
  const body=fullHtml(ruleId,opts);
  if(!body)return '';
  const hidden=ruleOpen(ruleId)?'':' hidden';
  return '<p><button type="button" class="secondary-button" data-full-rule="'+esc(ruleId)+'">Показать полностью</button></p><div data-full-panel'+hidden+'>'+body+'</div>';
 }
 function spoilsOnWrong(why,q){
  const t=String(why||'').trim();
  if(!t)return false;
  // Soft/hard grouping that names the correct letter sets (A10 content leak).
  if(/мягк\w*\s+групп|групп\w*[^.\n]{0,40}мягк/i.test(t))return true;
  if(/мягк/i.test(t)&&/(твёрд|тверд)/i.test(t))return true;
  // Ready "слово — форма/перевод" lines that embed the answer.
  if(/[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі-]{2,}\s*[—–]\s*[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі-]{2,}/.test(t))return true;
  const answers=[];
  ((q&&q.fields)||[]).forEach(f=>((f&&f.answers)||[]).forEach(a=>answers.push(String(a||''))));
  ((q&&q.correct)||[]).forEach(a=>answers.push(String(a||'')));
  for(const a of answers){
   if(a.length>=2&&t.indexOf(a)!==-1)return true;
  }
  if(answers.some(a=>a.length===1)&&/(мягк|твёрд|тверд|групп)/i.test(t))return true;
  return false;
 }
 function safeWrongWhy(why,q){
  if(!why||spoilsOnWrong(why,q))return '';
  return String(why);
 }
 function forQuestion(q,typed){
  const ruleId=ruleIdOf(q);
  const actual=Array.isArray(typed)?String(typed[0]||''):String(typed||'');
  const why=safeWrongWhy((q&&q.explanation)||'',q);
  if(!ruleId&&!actual&&!why)return '';
  // P0: wrong-feedback must not reveal expected/correct form (A10 UI sibling).
  return (actual?'<p><strong>Неверно:</strong> <span lang="kk">'+esc(actual)+'</span></p>':'')
   +(why?'<p><strong>Почему:</strong> '+esc(why)+'</p>':'')
   +openButton(ruleId,{brief:true}); // r7 X1: after a wrong answer the rule card only — chapter beats carry «Верно: <answer>» lines
 }
 function chainHtml(q,typed){
  const actual=Array.isArray(typed)?String(typed[0]||''):String(typed||'');
  const diff=actual?'<p data-error-diff>Ты написала: <s lang="kk">'+esc(actual)+'</s>. Разберём механизм — без готового ответа.</p>':'';
  const body=forQuestion(q,typed);
  if(!diff&&!body)return '';
  return '<div data-error-chain>'+diff+body+'</div>';
 }
 function map31(){
  // r7 X1: «Карта урока 3–1» (круги A–G, конструктор, рецепты) is an author map, not a learner screen.
  return '';
 }
 function bind(rootEl){
  if(!rootEl)return;
  rootEl.querySelectorAll('[data-full-rule]').forEach(btn=>{
   btn.onclick=()=>{
    const next=btn.nextElementSibling;
    const panel=next&&next.hasAttribute&&next.hasAttribute('data-full-panel')?next:(btn.parentElement&&btn.parentElement.nextElementSibling);
    if(!panel)return;
    panel.hidden=!panel.hidden;
    const id=btn.getAttribute('data-full-rule');
    if(root.ExplainDepth&&id&&typeof root.ExplainDepth.set==='function')root.ExplainDepth.set(id,!panel.hidden);
   };
  });
 }
 const api={ruleIdOf,fullHtml,openButton,forQuestion,chainHtml,map31,bind,chaptersFor,spoilsOnWrong,safeWrongWhy};
 if(node)module.exports=api;
 else root.ExplainOpen=api;
})(typeof window!=='undefined'?window:globalThis);
