(function(){
'use strict';
const data=window.LEARNING,core=window.TrainerCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
function create(api){
 function render(){
  const state=api.state,lesson=data.lessons.find(l=>l.id===state.lessonId)||data.lessons[0];state.lessonId=lesson.id;
  const i=Math.min(lesson.chunks.length-1,Math.max(0,state.steps[lesson.id]||0)),step=lesson.chunks[i];
  const complete=!!state.completedSteps[lesson.id+':'+i],available=step.questionIds.every(api.eligible);
  $('#learn-content').innerHTML='<div class="lesson-selector"><label for="micro-lesson">Маленький урок</label><select id="micro-lesson">'+
   [['numbers','Числа'],['vocab','Слова'],['sounds','Сингармонизм'],['plural','Грамматика']].map(([id,title])=>'<optgroup label="'+title+'">'+data.lessons.filter(l=>l.topic===id).map(l=>'<option value="'+l.id+'" '+(l.id===lesson.id?'selected':'')+'>'+esc(l.title)+'</option>').join('')+'</optgroup>').join('')+'</select></div>'+
   '<article class="panel micro-lesson"><div class="lesson-top"><p class="eyebrow">УРОК '+lesson.courseLesson+' · ШАГ '+(i+1)+' / '+lesson.chunks.length+'</p><span class="small">'+(complete?'Проверка пройдена':'Одна идея → проверка')+'</span></div><h2>'+esc(step.title)+'</h2><p class="lesson-intro">'+esc(step.explanation)+'</p>'+
   (step.items.length?'<div class="study-heading"><h3>Примеры</h3><button type="button" class="secondary-button" id="toggle-study" aria-expanded="true" aria-controls="study-grid">Скрыть ответы</button></div><div class="study-grid" id="study-grid">'+step.items.map((item,n)=>'<div class="study-card"><p class="study-front">'+esc(item.front)+'</p><div class="study-answer" id="study-answer-'+n+'"><p class="study-back" lang="kk">'+esc(item.back)+'</p><p class="small">'+esc(item.cue)+'</p></div><button type="button" class="text-button individual-answer" data-answer="'+n+'" aria-controls="study-answer-'+n+'" aria-expanded="true">Скрыть</button></div>').join('')+'</div>':'')+
   (!available?'<p class="learning-note">Сначала вспомни слова: '+esc(api.missing(step.questionIds).map(id=>id.slice(5)).join(', '))+'.</p><button type="button" class="secondary-button" id="practice-prerequisites">Закрепить эти слова</button>':'')+
   '<div class="lesson-actions"><button type="button" class="primary-button" id="start-lesson" '+(available?'':'disabled')+'>Понятно → проверить ('+step.questionIds.length+')</button><p class="small">Чтение само по себе не повышает уровень. Проверяем ответ без открытого объяснения.</p></div>'+
   '<details class="personal-cue"><summary>Ассоциация к этой идее</summary><label for="personal-cue">Мой образ или подсказка</label><textarea id="personal-cue" rows="2" maxlength="1200">'+esc(api.association(step.associationKey)||state.notes[lesson.id]||'')+'</textarea><p class="small">Во время проверки показывается только по запросу и считается подсказкой.</p></details>'+
   (lesson.note?'<details><summary>Важное уточнение</summary><p>'+esc(lesson.note)+'</p></details>':'')+
   '</article><div class="lesson-pagination"><button type="button" class="secondary-button" id="previous-step" '+(i===0?'disabled':'')+'>← Назад</button><button type="button" class="secondary-button" id="next-step" '+(!complete?'disabled':'')+'>'+(i<lesson.chunks.length-1?'Следующая идея →':'Урок пройден · дальше →')+'</button></div>'+
   (lesson.tool?toolMarkup(lesson.tool):'')+
   '<details class="panel method-note"><summary>Уровни и повторения</summary><p>Новое → изучается → знакомо → помню после паузы → устойчиво вспоминаю. Выбор из вариантов не равен самостоятельному воспроизведению. Высокие уровни требуют правильных ответов после пауз.</p><p>Дата повторения автоматически рассчитывается по истории ответов. Медленный правильный ответ не штрафуется. Своя ассоциация считается подсказкой.</p><p>Если для повторения ошибки нет трёх других карточек, она переносится в следующий подход.</p><div class="link-list"><a href="https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x" target="_blank" rel="noopener noreferrer">Проверка по памяти: исследование</a><a href="https://pubmed.ncbi.nlm.nih.gov/19076480/" target="_blank" rel="noopener noreferrer">Интервалы: исследование</a></div></details>';
  $('#micro-lesson').onchange=e=>selectLesson(e.target.value);
  if($('#practice-prerequisites'))$('#practice-prerequisites').onclick=()=>api.practiceWords(api.missing(step.questionIds));
  $('#start-lesson').onclick=()=>api.startLesson(lesson.id,i);
  $('#previous-step').onclick=()=>{state.steps[lesson.id]=i-1;api.save();render();};
  $('#next-step').onclick=()=>{if(i<lesson.chunks.length-1){state.steps[lesson.id]=i+1;api.save();render();}else{const next=data.lessons[data.lessons.indexOf(lesson)+1];if(next)selectLesson(next.id);else api.today();}};
  $('#personal-cue').oninput=e=>api.setAssociation(step.associationKey,e.target.value);
  function show(b,visible){$('#study-answer-'+b.dataset.answer).hidden=!visible;b.textContent=visible?'Скрыть':'Проверить себя';b.setAttribute('aria-expanded',String(visible));}
  function sync(){const visible=[...document.querySelectorAll('.study-answer')].some(e=>!e.hidden);$('#toggle-study').textContent=visible?'Скрыть ответы':'Показать ответы';$('#toggle-study').setAttribute('aria-expanded',String(visible));}
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{show(b,$('#study-answer-'+b.dataset.answer).hidden);sync();});
  if($('#toggle-study'))$('#toggle-study').onclick=()=>{const visible=$('#toggle-study').getAttribute('aria-expanded')!=='true';document.querySelectorAll('[data-answer]').forEach(b=>show(b,visible));sync();};
  bindTool(lesson.tool);
 }
 function selectLesson(id){api.state.lessonId=id;api.save();render();$('#learn-view').scrollIntoView({block:'start'});}
 return {render,selectLesson};
}
 function toolMarkup(type){
   if(type==='number')return `<details class="panel concept-tool"><summary>Конструктор чисел: проверь свой пример</summary><p>Сначала назови число сама. Затем посмотри, из каких частей оно складывается.</p><form id="number-builder"><label for="number-value">Целое число от 0 до 999999</label><div class="builder-controls"><input id="number-value" type="text" inputmode="numeric" pattern="[0-9]{1,6}" maxlength="6" value="47" required><button type="submit" class="secondary-button">Разобрать</button></div></form><div id="number-result" class="builder-result" role="status" aria-live="polite"></div></details>`;
   return `<details class="panel concept-tool"><summary>${type==='plural'?'Разбор окончания по шагам':'Найди последний слог'}</summary><p>Выбери слово и предскажи ответ. Нажми «Разобрать», чтобы сравнить свои рассуждения.</p><form id="harmony-builder"><label for="harmony-word">Слово для разбора</label><div class="builder-controls"><select id="harmony-word">${data.analyses.map((a,i)=>`<option value="${i}">${esc(a.word)}</option>`).join('')}</select><button type="submit" class="secondary-button">Разобрать</button></div></form><div id="harmony-result" class="builder-result" role="status" aria-live="polite"></div></details>`;
 }
 function bindTool(type){
   if(type==='number')$('#number-builder').onsubmit=e=>{
     e.preventDefault();const raw=$('#number-value').value.trim(),parts=/^\d{1,6}$/.test(raw)?core.numberParts(raw):null;
     $('#number-result').innerHTML=parts?`<p class="decomposition">${Number(raw)} = ${parts.map(p=>p.value).join(' + ')}</p><div class="number-parts">${parts.map(p=>`<div><span>${p.value}</span><strong lang="kk">${p.word}</strong></div>`).join('')}</div><p class="assembled-word" lang="kk">${core.numberToKazakh(raw)}</p><p class="small">Большие разряды первыми. Нулевые разряды внутри числа пропускаем. Между словами — пробел.</p>`:'<p>Введи целое число от 0 до 999999.</p>';
   };
   if(type==='harmony'||type==='plural')$('#harmony-builder').onsubmit=e=>{
     e.preventDefault();const a=data.analyses[Number($('#harmony-word').value)];
     $('#harmony-result').innerHTML=`<ol class="learning-steps"><li><span lang="kk">${esc(a.split)}</span>: последний слог <strong lang="kk">${esc(a.last)}</strong>.</li><li>${a.family} группа → <strong>${a.vowel.toUpperCase()}</strong> в окончании.</li><li>${esc(a.reason)}</li></ol><p class="assembled-word" lang="kk">${esc(a.word)} + ${a.suffix} = ${esc(a.plural)}</p><p class="small">Гласная — по последнему слогу. Согласная — по последней букве.</p>`;
   };
 }
 window.LearningUI={create};
})();
