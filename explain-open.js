/* Full explanation from bank and chapters that already exist. Does not invent PDF text. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Bank=node?require('./explain-bank.js'):root.ExplainBank;
 const G=node?require('./grammar-chapters.js'):root.GRAMMAR_CHAPTERS;
 const L31=node?require('./lesson31-pack.js'):root.Lesson31Pack;
 const Full=node?require('./full-sources.js'):root.FullSources;
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
 function fullHtml(ruleId){
  const card=Bank&&Bank.byId&&Bank.byId(ruleId);
  if(!card)return '';
  const paras=text=>String(text||'').split(/\n{2,}/).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
  const chapters=chaptersFor(ruleId).map(ch=>'<section class="path-block"><h3>'+esc(ch.title)+'</h3>'+beatBlocks(ch)+'</section>').join('');
  const files=Full&&Full.forRule?Full.forRule(ruleId):[];
  const links=files.length?'<section class="path-block" data-full-files><h3>Полный текст — файл</h3><p class="small">Ниже по-прежнему краткий вид банка. Файл не вставлен в банк. Номер в имени файла и номер правила банка — разные вещи.</p><ul>'+files.map(f=>'<li><a href="'+esc(f.url)+'" target="_blank" rel="noopener noreferrer">'+esc(f.title)+'</a>'+(f.note?' <span class="small">'+esc(f.note)+'</span>':'')+'</li>').join('')+'</ul></section>':'';
  return links+'<section class="path-block"><h3>Сравни с русским</h3>'+paras(card.ru_refresh)+'</section>'
   +'<section class="path-block"><h3>Коротко</h3>'+paras(card.short)+'</section>'
   +'<section class="path-block"><h3>Как работает</h3>'+paras(card.medium)+'</section>'
   +(card.examples&&card.examples.length?'<section class="path-block"><h3>Примеры</h3><ul>'+card.examples.map(x=>'<li lang="kk">'+esc(x)+'</li>').join('')+'</ul></section>':'')
   +(card.traps&&card.traps.length?'<section class="path-block"><h3>Неверно → верно</h3><ul>'+card.traps.map(t=>'<li lang="kk">'+esc(t)+'</li>').join('')+'</ul></section>':'')
   +chapters;
 }
 function ruleOpen(ruleId){
  if(root.ExplainDepth&&ruleId&&typeof root.ExplainDepth.get==='function')return root.ExplainDepth.get(ruleId)!==false;
  return true;
 }
 function openButton(ruleId){
  const body=fullHtml(ruleId);
  if(!body)return '';
  const hidden=ruleOpen(ruleId)?'':' hidden';
  return '<p><button type="button" class="secondary-button" data-full-rule="'+esc(ruleId)+'">Показать полностью</button></p><div data-full-panel'+hidden+'>'+body+'</div>';
 }
 function forQuestion(q,typed){
  const ruleId=ruleIdOf(q);
  const expected=q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0]||'';
  const actual=Array.isArray(typed)?String(typed[0]||''):String(typed||'');
  const why=(q&&q.explanation)||'';
  if(!ruleId&&!expected)return '';
  return '<p><strong>Неверно:</strong> <span lang="kk">'+esc(actual)+'</span> → <strong>Верно:</strong> <span lang="kk">'+esc(expected)+'</span></p>'
   +(why?'<p><strong>Почему:</strong> '+esc(why)+'</p>':'')
   +openButton(ruleId);
 }
 function chainHtml(q,typed){
  const expected=q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0]||'';
  const actual=Array.isArray(typed)?String(typed[0]||''):String(typed||'');
  const diff=actual&&expected&&actual!==expected?'<p data-error-diff>Отличие: <s lang="kk">'+esc(actual)+'</s> → <strong lang="kk">'+esc(expected)+'</strong></p>':'';
  const body=forQuestion(q,typed);
  if(!diff&&!body)return '';
  return '<div data-error-chain>'+diff+body+'</div>';
 }
 function map31(){
  if(!L31||!Bank)return '';
  const t20=Bank.byId('T20_POSS'),t22=Bank.byId('T22_BAR_ZHOK');
  const rows=[
   ['A',L31.SESSION_A.length,'менің. 6 заданий на әке, кітап, қала. Это не 15 слов методички.'],
   ['B',L31.SESSION_B.length,'сенің'],
   ['C',L31.SESSION_C.length,'оның'],
   ['D',L31.SESSION_D.length,'сіздің'],
   ['E',L31.SESSION_E.length,'бар / жоқ против емес'],
   ['F',L31.SESSION_F.length,'сначала много, потом чьё'],
   ['G',L31.SESSION_G.length,'фразы в обе стороны']
  ];
  return '<section class="panel path-paper"><h2>Карта урока 3–1</h2>'
   +'<p class="small">Полного конструктора «7 шагов, 8 рецептов» из S31 в репозитории нет. Ниже только то, что уже записано в банке и главах.</p>'
   +'<h3>Схема</h3><p>'+esc(t20&&t20.short||'')+'</p>'
   +'<h3>Бар / жоқ, не емес</h3><p>'+esc(t22&&t22.short||'')+'</p>'
   +'<h3>Круги A–G</h3><ul>'+rows.map(([k,n,note])=>'<li>Круг '+k+': '+n+' заданий. '+esc(note)+'</li>').join('')+'</ul>'
   +openButton('T20_POSS')+openButton('T22_BAR_ZHOK')+'</section>';
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
 const api={ruleIdOf,fullHtml,openButton,forQuestion,chainHtml,map31,bind,chaptersFor};
 if(node)module.exports=api;
 else root.ExplainOpen=api;
})(typeof window!=='undefined'?window:globalThis);
