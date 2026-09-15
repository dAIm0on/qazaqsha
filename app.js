/* All answers are checked locally against the reviewed course key. */
(function(){
 'use strict';
 const course=window.COURSE, core=window.TrainerCore, questions=course.questions;
 function coerceTyped(q){
   if(q.kind==='multi'){
     q.kind='fields';
     if(!q.stimulus)q.stimulus=(q.options||[]).join(' · ');
     q.fields=[{label:'Ответ',kind:'set-text',answers:q.correct||[]}];
     q.note=q.note||'Напиши подходящие через запятую или пробел.';
   }
   for(const f of q.fields||[])if(f.kind==='select'){f.kind='text';delete f.options;}
 }
 for(const q of questions)coerceTyped(q);
 const byId=new Map(questions.map(q=>[q.id,q]));
 const topics=[['all','Все задания','∞'],['sounds','Звуки и слоги','01'],['plural','Множественное число','02'],['vocab','Слова','03'],['numbers','Числа и количество','04'],['person','Личные окончания','05'],['rules','Только правила','06']];
 const KEY='qazaq-kris-course-v1', BACKUP=KEY+'-before-import', MIGRATION=KEY+'-before-schema-5';
 const cfg=window.TRAINER_CONFIG, P=window.ProgressStore, catalog=window.CURRICULUM;
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=P.empty(),savedSession=null,storageAvailable=true,storageReadError=null;
 try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);state=P.migrate(saved);savedSession=state.session;if((saved.schema||1)<5&&!localStorage.getItem(MIGRATION))localStorage.setItem(MIGRATION,raw);}}
 catch(error){storageAvailable=false;storageReadError=error;}
 window.NumberLadder?.parkLearn(state.learning,state.records);
 let records=state.records,learningState=state.learning;
 try{window.LessonPackages.install(state.lesson_packages);}catch(error){storageReadError=error;storageAvailable=false;}catalog.activatePromotions(state);for(const q of questions){coerceTyped(q);byId.set(q.id,q);}window.Knowledge.hydrate(state,questions);
 let confusionIndex=P.answerIndex(questions);
 let topic='all',mode='ordered',sourceFilter=null,courseBlock=null,vocabRole=null,queue=[],position=0,checked=false,hinted=false,view='today',lastTextInput=null,activeLesson=null,activeStep=null;
 const COURSE_BLOCKS=[{id:'1-1',title:'1–1',hint:'Звуки и первые слова'},{id:'1-2',title:'1–2',hint:'Окончания и десятки'},{id:'1-3',title:'1–3',hint:'Числа и новые слова'},{id:'2-1',title:'2–1',hint:'Мен, сен, сіз'},{id:'2-2',title:'2–2',hint:'Біз, сендер, сіздер'}];
 function courseJumpMarkup(id){
   return `<div class="course-jump" id="${id}"><p>Открыть любой урок сразу, без прохождения предыдущих:</p><div class="review-actions">${COURSE_BLOCKS.map(b=>`<button type="button" class="secondary-button" data-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}>Урок ${b.title}</button>`).join('')}</div></div>`;
 }
 function bindCourseJump(root){
   (root?root.querySelectorAll('[data-course]'):[]).forEach(b=>b.onclick=()=>startCourse(b.dataset.course));
 }
 let variants={},practiceIds=[],stepEvidence={},queueEpoch=Date.now(),presented=null,elapsedMs=0,timerSince=null;
 let sessionAttempts=0,sessionCorrect=0,sessionAssisted=0,draft=null,remediation=null,introOpen=false,cloudApplying=false;
 let examRaf=null,examTimedOut=false,advanceTimer=null;
 function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}
 function focusAnswer(){const el=$('#answer-0');if(el&&!el.disabled){try{el.focus({preventScroll:false});}catch{el.focus();}}}
 function captureDraft(){const q=byId.get(queue[position]);if(!checked&&q&&$('#answer-form'))draft={token:queueEpoch+':'+position,answers:readAnswers(q)};}
 function resetCounts(){sessionAttempts=0;sessionCorrect=0;sessionAssisted=0;draft=null;remediation=null;}
 function elapsed(){return Math.round(elapsedMs+(timerSince===null?0:Math.max(0,performance.now()-timerSince)));}
 function pauseTimer(){elapsedMs=elapsed();timerSince=null;if(examRaf){cancelAnimationFrame(examRaf);examRaf=null;}cancelAdvance();}
 function startTimer(){if(!introOpen&&view==='practice'&&!checked&&!document.hidden&&timerSince===null&&byId.has(queue[position]))timerSince=performance.now();}
 function eligible(value){const q=typeof value==='string'?byId.get(value):value;return !!q&&catalog.eligible(q,state)&&(!q.promotedWord||state.vocabulary[q.promotedWord]?.target_or_context==='target');}
 function activateCard(){
   if(introOpen||view!=='practice'||checked||document.hidden)return;
   const q=byId.get(queue[position]);if(!q)return;
   const token=queueEpoch+':'+position;
   if(presented!==token){
     presented=token;records[q.id]=window.ReviewScheduler.shown(records[q.id]);
     for(const id of q.vocabIds||[]){const w=catalog.words.find(w=>w.id===id),p=state.vocabulary[id]||{times_seen:0,target_or_context:w?.target_or_context||'context'};state.vocabulary[id]={...p,times_seen:p.times_seen+1,last_seen:Date.now(),last_seen_lesson:q.lessonId};}
   }startTimer();startExamBar();focusAnswer();
 }
 function startExamBar(){
   examTimedOut=false;
   const bar=$('#exam-bar'),fill=$('#exam-bar-fill');
   if(mode!=='exam'||!bar||!fill){if(bar)bar.hidden=true;return;}
   bar.hidden=false;fill.style.width='100%';
   const limit=cfg.session.examMs,t0=performance.now();
   const tick=now=>{
     if(checked||mode!=='exam'||view!=='practice')return;
     const left=limit-(now-t0);
     fill.style.width=Math.max(0,left/limit*100)+'%';
     if(left<=0){examTimedOut=true;const q=byId.get(queue[position]);if(q&&!checked)checkAnswer(q,true);return;}
     examRaf=requestAnimationFrame(tick);
   };
   examRaf=requestAnimationFrame(tick);
 }
 function renderExam(){
   $('#exam-content').innerHTML=`<div class="panel"><p>В обычной учёбе время не штрафует. Экзамен — те же задания, но ${cfg.session.examMs/1000} секунды на карточку.</p><p>Сначала тип, потом урок — можно прыгать.</p>
     <div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>`<button type="button" class="chip" data-exam="${id}">${esc(name)}</button>`).join('')}</div>
     <div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-exam-course="${b.id}">${esc(b.title)}</button>`).join('')}</div>
     <p class="small">${cfg.session.examSize} карточек. Подсказки выключены. Отдельная кнопка «Только правила» — без слов, только окончания и гармония.</p></div>`;
   $$('#exam-content [data-exam]').forEach(b=>b.onclick=()=>{topic=b.dataset.exam;mode='exam';sourceFilter=null;vocabRole=null;activeLesson=null;startQueue({all:true});showView('practice');});
   $$('#exam-content [data-exam-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.examCourse;mode='exam';activeLesson=null;startQueue({all:true});showView('practice');});
 }
 function save(){
   captureDraft();state.records=records;state.learning=learningState;
   state.session={topic,mode,sourceFilter,courseBlock,queue,position,answered:checked,view,activeLesson,activeStep,practiceIds,stepEvidence,variants,hinted,elapsed_ms:elapsed(),queueEpoch,presented,draft,sessionAttempts,sessionCorrect,sessionAssisted,remediation};
   try{if(storageReadError)throw storageReadError;localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}
   $('#save-status').hidden=storageAvailable;$('#save-status').textContent=storageAvailable?(window.QazaqCloud?.user?'Прогресс в аккаунте и в этом браузере.':'Прогресс в этом браузере · резервная копия в «Сегодня».'):'Сохранение недоступно. Экспортируй прогресс перед закрытием.';
   if(!cloudApplying)window.QazaqCloud?.pushSoon?.(state);
 }
 function subset(){
   if(activeLesson){const ids=new Set(window.LEARNING.lessons.find(l=>l.id===activeLesson).questionIds);return questions.filter(q=>ids.has(q.id));}
   let list=questions.filter(q=>eligible(q));
   if(vocabRole)list=list.filter(q=>q.topic==='vocab'&&q.wordRole===vocabRole);
   if(courseBlock)list=list.filter(q=>q.lessonId===courseBlock);
   if(topic!=='all')list=list.filter(q=>q.topic===topic);
   if(sourceFilter)list=list.filter(q=>q.source===sourceFilter);
   if(topic==='numbers'&&!courseBlock&&mode!=='numbers'&&window.NumberLadder){
     list=window.NumberLadder.filter(list,state);
     list=[...list].sort((a,b)=>(window.NumberLadder.extractN(a)??0)-(window.NumberLadder.extractN(b)??0));
   }
   return list;
 }
 function startCourse(block){
   courseBlock=block;vocabRole=null;sourceFilter=null;activeLesson=null;activeStep=null;if(view!=='practice'&&view!=='exam')topic='all';mode=mode==='exam'?'exam':'ordered';
   const first=window.LEARNING.lessons.find(l=>l.courseLesson===block);
   if(first)learningState.lessonId=first.id;
   startQueue({all:true});showView('practice');
 }
 function shuffled(items){
   const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
 }
 function examReady(r){return !!r&&((r.recall_review_successes||0)>=1||((r.correct_streak||0)>=2&&r.last_successful_review));}
 function startQueue({all=false}={}){
   activeLesson=null;activeStep=null;stepEvidence={};let list=subset();
   if(!vocabRole)list=list.filter(q=>q.wordRole!=='used');
   if(mode==='smart'){list=shuffled(list).sort((a,b)=>Number(window.Knowledge.bindings(b).some(x=>x.skill_type==='production'))-Number(window.Knowledge.bindings(a).some(x=>x.skill_type==='production')));list=core.chooseShortSession(list,records,Date.now(),questions.length);}
   else if(mode==='review')list=list.filter(q=>core.isDue(records[q.id])).sort((a,b)=>records[a.id].dueAt-records[b.id].dueAt);
   else if(mode==='mistakes')list=list.filter(q=>records[q.id]?.needsReview);
   else if(mode==='exam')list=list.filter(q=>examReady(records[q.id]));
   else if(!all)list=list.filter(q=>(records[q.id]?.streak||0)<2||core.isDue(records[q.id]));
   if(mode==='shuffle'||mode==='mistakes'||mode==='exam')list=shuffled(list);
   if(mode==='exam')list=list.slice(0,cfg.session.examSize);
   if(mode==='ordered'||mode==='shuffle'){
     const fresh=list.filter(q=>!(records[q.id]?.seen)),old=list.filter(q=>records[q.id]?.seen);
     list=[...fresh.slice(0,cfg.session.newLimit),...old].slice(0,cfg.session.size+cfg.session.newLimit);
   }
   if(['smart','review','mistakes'].includes(mode)){const recent=state.events.filter(e=>e.type==='answer'&&Date.now()-e.at<cfg.session.recentWindowMs).slice(-cfg.session.minIntervening).map(e=>e.card_id);list=core.spaceRecent(window.Knowledge.choose(list,state,Infinity),recent).slice(0,cfg.session.size);}
   queue=list.map(q=>q.id);practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;resetCounts();render();
 }
 function startLesson(id,step=learningState.steps[id]||0){
   const lesson=window.LEARNING.lessons.find(l=>l.id===id),chunk=lesson?.chunks[step];if(!chunk)return;
   courseBlock=lesson.courseLesson||courseBlock;
   activeLesson=id;activeStep=step;learningState.lessonId=id;learningState.steps[id]=step;topic=lesson.topic;mode='lesson';sourceFilter=null;
   queue=lesson.topic==='numbers'?shuffled(chunk.questionIds):[...chunk.questionIds];practiceIds=[...queue];stepEvidence={};queueEpoch=Date.now()+Math.random();
   position=0;variants={};checked=false;resetCounts();render();showView('practice');$('#exercise').scrollIntoView({block:'start'});
 }
 function startContrast(pair){
   activeLesson=null;activeStep=null;topic='all';sourceFilter=null;mode='contrast';
   queue=shuffled(P.contrastIds(pair,confusionIndex,questions).filter(eligible));practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;resetCounts();
   render();showView('practice');
 }
 function showView(next){
   pauseTimer();if(view==='practice'&&!checked&&['learn','rules','vocabulary','materials','review','exam'].includes(next)){const current=byId.get(queue[position]);if(current)hintEvent(current,'reference');hinted=true;}
   view=next;document.body.dataset.view=next;
   ['today','learn','review','vocabulary','practice','rules','materials','exam'].forEach(v=>{$('#'+v+'-view').hidden=v!==next;});
   const tab=next==='practice'?(mode==='exam'?'exam':'review'):next;
   $$('[data-view]').forEach(b=>{if(b.dataset.view===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
   renderStats();if(next==='learn')learning.render();if(['today','review','vocabulary'].includes(next))dashboard.render(next);if(next==='exam')renderExam();if(next==='practice')activateCard();save();
 }
 function renderNav(){
   $('#lesson-nav').innerHTML=topics.map(([id,name,num])=>{
     const list=questions.filter(q=>id==='all'||q.topic===id), n=list.filter(q=>(records[q.id]?.streak||0)>=2).length;
     return `<button type="button" class="topic-button" data-topic="${id}" ${topic===id?'aria-current="page"':''}><span class="topic-num">${num}</span><span><span class="topic-name">${name}</span><span class="topic-count">${n} / ${list.length} закреплено</span></span></button>`;
   }).join('');
   $$('[data-topic]').forEach(b=>b.addEventListener('click',()=>{topic=b.dataset.topic;sourceFilter=null;courseBlock=null;vocabRole=null;activeLesson=null;mode='smart';startQueue();showView('practice');}));
 }
 function renderStats(){
   const recallCards=questions.filter(q=>q.kind==='fields'&&q.fields.some(f=>f.kind!=='select'));
   const learned=recallCards.filter(q=>['REMEMBERED','MASTERED'].includes(records[q.id]?.mastery_level)).length;
   $('#mastery-count').textContent=`${learned} / ${recallCards.length}`;$('#mastery-progress').max=recallCards.length;$('#mastery-progress').value=learned;
   $('#mistake-count').textContent=subset().filter(q=>records[q.id]?.needsReview).length;
   $('#due-count').textContent=subset().filter(q=>core.isDue(records[q.id])).length;
   $('#pause-session').hidden=queue.length===0||position>=queue.length;
   const scope=subset(), tried=scope.filter(q=>records[q.id]?.attempts>0).length;
   $('#session-position').textContent=['smart','lesson','review','contrast'].includes(mode)?`В подходе ${new Set(queue).size} разных карточек · шаг ${Math.min(position+1,queue.length)} из ${queue.length}`:`Встречалось ${tried} из ${scope.length} карточек`;
   $('#session-score').textContent=sessionAttempts?`Без подсказки: ${sessionCorrect} / ${sessionAttempts} · с подсказкой: ${sessionAssisted}`:'Можно отвечать сразу';
   $('#practice-title').textContent=mode==='exam'?'Экзамен на время':activeLesson?window.LEARNING.lessons.find(l=>l.id===activeLesson).title:topic==='all'?'Практика казахского':topics.find(x=>x[0]===topic)[1];
   $('.course-badge').textContent=`${scope.length} карточек`;
   $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
   const sf=$('#source-filter');
   if(courseBlock){
     const b=COURSE_BLOCKS.find(x=>x.id===courseBlock);
     sf.hidden=false;sf.innerHTML=`<span>Урок ${esc(b?b.title:courseBlock)} · ${esc(b?b.hint:'')}</span><button type="button">Все уроки</button>`;
     sf.querySelector('button').onclick=()=>{courseBlock=null;startQueue();};
   }else if(sourceFilter){
     sf.hidden=false;sf.innerHTML=`<span>${esc(course.sources[sourceFilter].title)}</span><button type="button">Все материалы</button>`;sf.querySelector('button').onclick=()=>{sourceFilter=null;startQueue();};
   }else sf.hidden=true;
   renderJumpBar();
   renderNav();
 }
 function renderJumpBar(){
   const bar=$('#jump-bar');if(!bar)return;
   bar.innerHTML=`<div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>`<button type="button" class="chip" data-jump-topic="${id}" ${topic===id?'aria-pressed="true"':''}>${esc(name)}</button>`).join('')}</div><div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-jump-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}>${esc(b.title)}</button>`).join('')}<button type="button" class="chip" data-jump-course="" ${courseBlock?'':'aria-pressed="true"'}>все</button></div>`;
   $$('#jump-bar [data-jump-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.jumpTopic;activeLesson=null;vocabRole=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');});
   $$('#jump-bar [data-jump-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.jumpCourse||null;activeLesson=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');});
 }
 function answerMarkup(q){
   const fields=q.fields||[{label:'Ответ',kind:'text'}];
   return `<div class="fields">${fields.map((f,i)=>`<div class="field-row"><label class="field-label" for="answer-${i}">${esc(f.label)}</label><div class="field-control"><input id="answer-${i}" name="answer-${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ${f.kind==='number-text'?'inputmode="numeric"':''} aria-describedby="correction-${i}"><span class="field-correction" id="correction-${i}"></span></div></div>`).join('')}</div>`;
 }
 function render(){
   introOpen=false;pauseTimer();elapsedMs=0;checked=false;hinted=false;lastTextInput=null;renderStats();
   const q=byId.get(queue[position]);
   if(!q){renderEmpty();return;}
   window.NumberPractice.prepare(q,variants);confusionIndex=P.answerIndex(questions);
   const source=course.sources[q.source], streak=records[q.id]?.streak||0;
   const location=q.source.startsWith('hw')?'Слово '+q.group:`Задание ${q.group}${q.part!=='1'?' · пункт '+q.part:''}`;
   const hasText=q.kind==='fields'&&q.fields.some(f=>f.kind!=='number-text');
   const letters=hasText&&state.prefs.letters;
   const exam=mode==='exam';
   $('#exercise').innerHTML=`<div class="question-top"><div class="source-label">${source.additional?esc(source.title):`<a href="${source.url}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`}<br>${esc(location)}</div><span class="mastery-label">${exam?'Экзамен':esc(cfg.labels[records[q.id]?.mastery_level||'NEW'])}</span></div><form id="answer-form"><div class="question-body"><p class="phase-label">${exam?'НА ВРЕМЯ':esc(q.phase||(q.source.startsWith('hw')?'Вспомнить':'Применить правило'))}</p><h2 id="question-title">${esc(q.title)}</h2>${q.stimulus?`<div class="stimulus" lang="${q.title.includes('на казахский')?'ru':'kk'}">${esc(q.stimulus)}${q.translation?`<span class="translation" lang="ru">${esc(q.translation)}</span>`:''}</div>`:''}${q.note?`<p class="question-note">${esc(q.note)}</p>`:''}${q.contextGloss?`<div class="context-gloss">${q.contextGloss.map(g=>`<span><strong>${esc(g.word)}</strong> — ${esc(g.translation)} <small>для контекста</small></span>`).join('')}</div>`:''}${answerMarkup(q)}${letters?`<div class="letter-keyboard" aria-label="Казахские буквы">${[...'әғқңөұүһі'].map(c=>`<button type="button" data-letter="${c}" aria-label="Вставить ${c}">${c}</button>`).join('')}</div><div class="keyboard-label">Буква вставится в выбранное поле.</div>`:''}<div id="hint-box" class="hint" hidden></div><div id="association-box" class="hint" hidden></div><p id="validation" class="validation-message" role="alert" hidden></p></div><div class="question-actions"><div class="secondary-actions"><button type="button" class="secondary-button" id="hint-button" ${exam?'hidden':''}>Подсказка</button><button type="button" class="text-button" id="reveal-button">${exam?'Пропустить': 'Не знаю'}</button><button type="button" class="text-button" id="association-button" ${exam?'hidden':''}>Моя подсказка</button></div><div class="primary-slot"><button type="submit" class="primary-button" id="check-button">Проверить</button><button type="button" class="primary-button" id="next-button" hidden>Дальше →</button></div></div><div id="feedback" class="feedback" role="status" aria-live="polite" hidden></div></form>`;
   $('#answer-form').addEventListener('submit',e=>{e.preventDefault();if(checked)nextQuestion();else checkAnswer(q);});
   $('#hint-button').onclick=()=>showHint(q);
   $('#reveal-button').onclick=()=>mode==='exam'?checkAnswer(q,true):peekAnswer(q);
   $('#next-button').onclick=nextQuestion;
   $('#association-button').onclick=()=>openAssociation(q);
   $$('#answer-form input[type=text]').forEach(el=>el.addEventListener('focus',()=>{lastTextInput=el;}));
   $$('[data-letter]').forEach(b=>{
     b.addEventListener('mousedown',e=>e.preventDefault());
     b.addEventListener('click',()=>{
       if(checked)return;
       const target=lastTextInput||$('#answer-form input[type=text]');if(!target)return;
       const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
       target.value=target.value.slice(0,start)+b.dataset.letter+target.value.slice(end);
       target.focus();target.setSelectionRange(start+1,start+1);lastTextInput=target;save();
     });
   });
   if(draft?.token===queueEpoch+':'+position){
     if(q.kind==='multi')$$('input[name=choice]').forEach(el=>{el.checked=draft.answers.includes(el.value);});
     else q.fields.forEach((f,i)=>{$('#answer-'+i).value=String(draft.answers[i]||'');});
   }
   $('#answer-form').addEventListener('input',save);$('#answer-form').addEventListener('change',save);
   activateCard();save();
 }
 function hintEvent(q,kind){state.events.push({type:'hint',card_id:q.id,at:Date.now(),hint_kind:kind,response_time_ms:elapsed(),hinted:true});}
 function peekAnswer(q){
   if(checked||mode==='exam')return;
   hinted=true;hintEvent(q,'reveal');
   const answerLine=q.kind==='multi'?(q.correct||[]).join(', '):(q.fields||[]).map(f=>f.answers.join(' / ')).join('; ');
   const why=q.explanation?('<p class="small">'+esc(q.explanation)+'</p>'):'';
   const box=$('#hint-box');
   box.innerHTML='<strong>Сначала слепая попытка, теперь перенабор.</strong> Подсказка = провал для интервала. Набери форму целиком, потом она вернётся ещё раз без подсказки. <p lang="kk"><strong>'+esc(answerLine)+'</strong></p>'+why;
   box.hidden=false;
   (q.fields||[]).forEach((_,i)=>{const el=$('#answer-'+i);if(el)el.value='';});
   if($('#reveal-button'))$('#reveal-button').disabled=true;
   if($('#hint-button'))$('#hint-button').disabled=true;
   if(!$('.letter-keyboard')&&q.kind==='fields'&&q.fields.some(f=>f.kind!=='number-text')){
     const keys=document.createElement('div');keys.className='letter-keyboard';keys.innerHTML=[...'әғқңөұүһі'].map(c=>`<button type="button" data-letter="${c}">${c}</button>`).join('');
     box.after(keys);
     keys.querySelectorAll('[data-letter]').forEach(b=>b.addEventListener('mousedown',e=>{
       e.preventDefault();
       const target=lastTextInput||$('#answer-0');if(!target||target.disabled)return;
       const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
       target.value=target.value.slice(0,start)+b.dataset.letter+target.value.slice(end);
       target.focus();target.setSelectionRange(start+1,start+1);lastTextInput=target;
     }));
   }
   focusAnswer();save();
 }
 function showHint(q){
   hintEvent(q,'explanation');if($('#hint-button'))$('#hint-button').disabled=true;
   const hints={sounds:'Схема курса: мягкая группа Ә, Ө, І, Ү, Е, К, Г, Э; твёрдая А, О, Ы, Ұ, Қ, Ғ, Я, Ё. Для окончания важен последний слог.',plural:'Последний слог: А или Е. Потом последняя буква: глухие и Б, В, Г, Д → тар/тер; Л, М, Н, Ң, Ж, З → дар/дер; гласные, Р, Й, У → лар/лер.',vocab:'Сначала слепая попытка. Не открывай готовое слово — иначе это не вспоминание.',numbers:'Собери разряды: сначала большая часть. Не считай по порядку.',person:'Мен: пын/бын/мын. Сен: сың. Сіз: сыз. Біз после м/н/ң: біз. Сендер/сіздер без -лар на основу. Отрицание: основа + емес + окончание.',rules:'Набери суффикс или короткое слово правила, не целое новое существительное.'};
   const box=$('#hint-box');box.textContent=q.hint&&!/^[А-Яа-яӘәІіҢңҒғҚқӨөҰұҮүҺһ ]{1,24}$/.test(q.hint)?q.hint:(hints[q.topic]||'Вспомни правило, потом форму.');box.hidden=false;save();
 }
 function readAnswers(q){return q.kind==='multi'?$$('input[name=choice]:checked').map(el=>el.value):q.fields.map((_,i)=>$('#answer-'+i).value);}
 function checkAnswer(q,reveal=false){
   if(checked)return;
   const answers=readAnswers(q), warning=$('#validation');
   if(!reveal){
     const missing=q.kind==='multi'?answers.length===0:answers.some(a=>!a.trim());
     if(missing){warning.textContent=q.kind==='multi'?'Выбери хотя бы один вариант.':'Заполни все поля — проверим разбор целиком.';warning.hidden=false;if(q.kind==='fields')$('#answer-'+answers.findIndex(a=>!a.trim())).focus();return;}
   }
   warning.hidden=true;
   const result=reveal?{correct:false,parts:q.kind==='multi'?q.options.map(()=>false):q.fields.map(()=>false)}:core.evaluate(q,answers);
   checked=true;if(reveal){hintEvent(q,'reveal');hinted=true;}
   pauseTimer();const now=Date.now(),recall=q.kind==='fields'&&q.fields.some(f=>f.kind!=='select');
   const F=window.FSRS;
   let rating;
   if(!result.correct||hinted||examTimedOut)rating=F.Rating.Again;
   else if(mode==='exam'){
     if(elapsedMs<=cfg.session.examEasyMs)rating=F.Rating.Easy;
     else if(elapsedMs<=cfg.session.examHardMs)rating=F.Rating.Good;
     else rating=F.Rating.Hard;
   }else if((records[q.id]?.review_count||0)<4&&elapsedMs>(cfg.session.slowMs||8000))rating=F.Rating.Hard;
   else rating=F.Rating.Good;
   let rec=core.updateRecord(records[q.id],result.correct,hinted,now,{responseTime:elapsedMs,recall,rating});records[q.id]=rec;
   const errors=reveal?[]:window.ErrorDiagnostics.diagnose(q,answers,result,now);state.errors.push(...errors);
   const event={session_id:String(queueEpoch),presentation:position,type:'answer',card_id:q.id,at:now,correct:result.correct,hinted,response_time_ms:elapsedMs,response_time:elapsedMs,recall,answers};
   event.skills=window.Knowledge.observe(state,q,result,event,errors);state.events.push(event);rec=records[q.id];
   P.observeConfusions(state,q,answers,result,now,confusionIndex,hinted||reveal);
   for(const pair of Object.values(state.confusions)){pair.expected_item=[...confusionIndex.get(pair.expected_answer)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.given_item=[...confusionIndex.get(pair.wrong_answer_given)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.last_confused=pair.last_wrong;}
   if(activeLesson&&practiceIds.includes(q.id))stepEvidence[q.id]=result.correct&&!hinted;
   sessionAttempts++;if(result.correct){if(hinted)sessionAssisted++;else sessionCorrect++;}
   core.scheduleRepeat(queue,position,q.id,rec.streak,[...practiceIds,...questions.filter(x=>eligible(x)&&records[x.id]?.seen&&x.id!==q.id).map(x=>x.id)].filter(id=>id!==q.id));
   const deferred=rec.streak<cfg.schedule.cleanAnswersToConsolidate&&!queue.slice(position+1).includes(q.id);
   if(q.kind==='multi'){
     q.options.forEach((o,i)=>{
       const label=$('#choice-'+i),expected=q.correct.includes(o),selected=answers.includes(o);
       if(expected){label.classList.add(selected&&!reveal?'correct':'missed');label.querySelector('.choice-result').textContent='✓';}
       else if(selected){label.classList.add('incorrect');label.querySelector('.choice-result').textContent='×';}
     });
   }else{
     q.fields.forEach((f,i)=>{
       const el=$('#answer-'+i);el.classList.add(result.parts[i]&&!reveal?'valid':'invalid');
       if(!result.parts[i]||reveal)el.setAttribute('aria-invalid','true');
     });
   }
   $$('#answer-form input, #answer-form select, #hint-button, #reveal-button, [data-letter]').forEach(el=>{el.disabled=true;});
   $('#answer-form').classList.add('answered');
   $('#check-button').hidden=true;$('#next-button').hidden=false;
   const feedback=$('#feedback');feedback.className='feedback '+(!result.correct?'error':hinted?'hinted':'');
   const headline=reveal?'Разберём ответ':!result.correct?'Пока не всё верно':hinted?'Верно, с подсказкой':rec.streak>=2?'Верно, самостоятельно!':'Верно. Продолжим закрепление';
   let status=rec.streak>=2?'Следующая проверка по памяти: '+new Date(rec.dueAt).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'.':!result.correct?'Эта карточка появится снова.':'Для закрепления карточка вернётся позже.';
   if(deferred)status='Карточка сохранена для следующего подхода: сейчас не хватает других заданий для паузы.';
   if(result.correct&&hinted)status='Перенабор засчитан как обучение, не как самостоятельный успех. Карточка вернётся в этом подходе слепой.';
   const answerLine=q.kind==='multi'?q.correct.join(', '):(q.fields||[]).map(f=>f.answers.join(' / ')).join('; ');
   const timeLine=mode==='exam'?(examTimedOut?'Время вышло.':'Время '+(elapsedMs/1000).toFixed(1)+' с'+(elapsedMs>cfg.session.examHardMs&&result.correct?' · медленно, для экзамена это слабо.':' · зачёт по времени.')):(cfg.labels[rec.mastery_level]+' · время '+(elapsedMs/1000).toFixed(1)+' с, без штрафа.');
   feedback.innerHTML=`<h3>${headline}</h3><p><strong>Ответ:</strong> ${esc(answerLine)}.</p>${errors.length?'<p><strong>Где ошибка:</strong> '+[...new Set(errors.map(e=>window.ErrorDiagnostics.labels[e.error_type]))].map(esc).join('; ')+'.</p>':''}<p>${esc(q.explanation)}</p><p class="small">${status}</p><p class="small">${timeLine}</p>`;feedback.hidden=false;
   renderStats();save();
   cancelAdvance();
   if(result.correct&&!reveal&&!hinted){
     advanceTimer=setTimeout(()=>{advanceTimer=null;if(checked)nextQuestion();},180);
   }else{
     const next=$('#next-button');if(next)next.focus({preventScroll:true});
   }
 }
 function nextQuestion(){cancelAdvance();draft=null;position++;if(!['ordered','shuffle'].includes(mode)&&sessionAttempts>=cfg.session.maxAttempts)position=queue.length;render();$('#exercise').scrollIntoView({block:'start',behavior:'auto'});focusAnswer();}
 function renderEmpty(){
   if(mode==='exam'&&!sessionAttempts){
     $('#exercise').innerHTML='<div class="empty-state"><h2>Экзамен ещё рано</h2><p>По исследованию таймер только на формах, которые уже дважды вспоминались в разные дни. Сначала обычная учёба без часов.</p><button type="button" class="primary-button" id="back-to-learning">К учёбе</button></div>';
     $('#back-to-learning').onclick=()=>{mode='ordered';showView('today');};
     save();return;
   }
   const lesson=activeLesson&&window.LEARNING.lessons.find(l=>l.id===activeLesson);
   const complete=!!lesson&&practiceIds.length>0&&practiceIds.every(id=>stepEvidence[id]);
   if(complete)learningState.completedSteps[activeLesson+':'+activeStep]=true;
   const waiting=practiceIds.filter(id=>(records[id]?.streak||0)<cfg.schedule.cleanAnswersToConsolidate).length;
   const help=window.LearningSupport.suggestions(state,questions)[0];
   $('#exercise').innerHTML='<div class="empty-state"><span class="empty-letter" lang="kk">✓</span><h2>'+(complete?'Проверка идеи пройдена':'Подход завершён')+'</h2><p>Самостоятельно: '+sessionCorrect+' из '+sessionAttempts+'. С подсказкой: '+sessionAssisted+'. Ошибок: '+(sessionAttempts-sessionCorrect-sessionAssisted)+'.</p><p>'+(waiting?'Ещё закрепляем '+waiting+' карточек. Они сохраняются для повторения.':'Можно остановиться; карточки вернутся по расписанию.')+'</p><div class="finish-actions"><button type="button" class="primary-button" id="restart">'+(lesson?(complete?(activeStep<lesson.chunks.length-1?'Следующая идея':'Выбрать следующий урок'):'Вернуться к объяснению'):'Ещё несколько заданий')+'</button><button type="button" class="secondary-button" id="back-to-learning">Закончить</button></div>'+(help?'<div class="panel"><h3>'+esc(help.title)+'</h3><p>Эта ошибка повторялась. Можно отдельно потренировать трудный шаг.</p><button type="button" class="secondary-button" id="start-remedy">Разобрать и проверить</button></div>':'')+'</div>';
   $('#restart').onclick=()=>{if(lesson){if(complete&&activeStep<lesson.chunks.length-1)learningState.steps[lesson.id]=activeStep+1;else if(complete){const next=window.LEARNING.lessons[window.LEARNING.lessons.indexOf(lesson)+1];if(next)learningState.lessonId=next.id;}showView('learn');}else{mode='smart';startQueue();showView('practice');}};
   $('#back-to-learning').onclick=()=>showView('today');
   if($('#start-remedy'))$('#start-remedy').onclick=()=>startRemedy(help.type);
   save();
 }
 function startRemedy(type){
   const help=window.LearningSupport.suggestions(state,questions).find(h=>h.type===type);if(!help)return;
   showView('practice');captureDraft();pauseTimer();introOpen=true;const current=byId.get(queue[position]);if(current&&!checked){hintEvent(current,'remediation');hinted=true;}save();const priorExercise=document.createDocumentFragment();while($('#exercise').firstChild)priorExercise.append($('#exercise').firstChild);
   $('#exercise').innerHTML='<div class="panel"><h2>'+esc(help.title)+'</h2><p>'+esc(help.explanation)+'</p><p>Сначала '+(help.ids.length-1)+' коротких проверок, затем исходный пример.</p><button type="button" class="primary-button" id="remedy-check">Понятно → проверить</button><button type="button" class="text-button" id="remedy-cancel">Вернуться</button></div>';
   $('#remedy-cancel').onclick=()=>{introOpen=false;$('#exercise').replaceChildren(priorExercise);showView('today');};
   $('#remedy-check').onclick=()=>{startCustom(help.ids,'remediation');remediation=type;save();};
 }
 function startCustom(ids,kind='words'){
   activeLesson=null;activeStep=null;sourceFilter=null;topic='all';mode=kind;
   queue=ids.filter(eligible);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;resetCounts();render();showView('practice');
 }
 function practiceWords(ids){
   const wanted=new Set(ids),qs=questions.filter(q=>window.Knowledge.bindings(q).some(b=>wanted.has(b.item_id)&&['production','digit_to_word'].includes(b.skill_type)));
   startCustom(window.Knowledge.choose(shuffled(qs),state).map(q=>q.id));

 }
 function setAssociation(key,text){state.associations[key]={text:text.slice(0,cfg.storage.maxAssociationLength),updated_at:Date.now()};save();}
 function openAssociation(q){
   if(!checked){hintEvent(q,'association');hinted=true;}
   const relevant=window.LEARNING.lessons.filter(l=>l.questionIds.includes(q.id));
   const keys=[...new Set([...(q.associationKeys||[]),...relevant.map(l=>'lesson:'+l.id),...(activeLesson?[window.LEARNING.lessons.find(l=>l.id===activeLesson).chunks[activeStep].associationKey]:[])])];
   const title=key=>key.startsWith('word:')?key.slice(5):key.startsWith('rule:')?(catalog.rules.find(r=>r.id===key.slice(5))?.title||key):key.startsWith('ending:')?'Окончание '+key.slice(7):key.startsWith('lesson:')?'Идея урока':'Этот пример';
   const chosen=keys.find(k=>state.associations[k]?.text)||keys[0],box=$('#association-box');
   box.innerHTML='<p>Это подсказка: ответ после просмотра не повышает уровень самостоятельного воспроизведения.</p><label for="association-target">К чему относится<select id="association-target">'+keys.map(k=>'<option value="'+esc(k)+'" '+(k===chosen?'selected':'')+'>'+esc(title(k))+'</option>').join('')+'</select></label><label for="association-text">Моя ассоциация<textarea id="association-text" rows="2" maxlength="1200">'+esc(state.associations[chosen]?.text||'')+'</textarea></label>';
   box.hidden=false;$('#association-target').onchange=e=>{$('#association-text').value=state.associations[e.target.value]?.text||'';};
   $('#association-text').oninput=e=>setAssociation($('#association-target').value,e.target.value);save();
 }
 function downloadProgress(text,name='progress.json'){
   const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function promote(id){
   const w=catalog.words.find(w=>w.id===id);if(!w)return;
   state.vocabulary[id]={...(state.vocabulary[id]||{times_seen:0,last_seen:0}),target_or_context:'target'};
   window.LessonPackages.install(state.lesson_packages);catalog.activatePromotions(state);window.Knowledge.hydrate(state,questions);for(const q of questions)byId.set(q.id,q);confusionIndex=P.answerIndex(questions);save();
 }
 function importProgress(incoming,mode){
   const backup=P.serialize(state);
   try{localStorage.setItem(BACKUP,backup);}catch{throw Error('Не удалось сохранить копию перед импортом. Сначала скачай текущий прогресс; импорт не выполнен.');}
   const next=mode==='replace'?P.migrate(incoming):P.merge(state,incoming);next.session=null;next.lesson_packages=window.LessonPackageSchema.merge(state.lesson_packages,next.lesson_packages);window.LessonPackages.prepare(next.lesson_packages);
   try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Не хватает места для импортированных данных. Текущий прогресс не изменён.');}
   state=next;records=state.records;learningState=state.learning;storageReadError=null;storageAvailable=true;
   window.LessonPackages.install(state.lesson_packages);catalog.activatePromotions(state);window.Knowledge.hydrate(state,questions);for(const q of questions)byId.set(q.id,q);confusionIndex=P.answerIndex(questions);
   activeLesson=null;activeStep=null;queue=[];practiceIds=[];position=0;checked=false;presented=null;pauseTimer();elapsedMs=0;showView('today');
 }
 function vocabTable(rows){return `<div class="table-wrap"><table><thead><tr><th scope="col">Қазақша</th><th scope="col">По-русски / число</th></tr></thead><tbody>${rows.map(([k,r])=>`<tr><td lang="kk">${esc(k)}</td><td>${esc(Array.isArray(r)?r.join(', '):r)}</td></tr>`).join('')}</tbody></table></div>`;}
 function bankMarkup(){
   const B=window.WORD_BANK;if(!B)return '';
   const titles={'1-1':'1–1','1-2':'1–2','1-3':'1–3','2-2':'2–2'};
   const mustBlocks=Object.entries(B.must).map(([les,rows])=>'<h3>Домашка '+esc(titles[les]||les)+' · '+rows.length+' слов</h3>'+vocabTable(rows.map(w=>[w.kazakh,w.translation]))).join('');
   const all=[...B.all].sort((a,b)=>a.kazakh.localeCompare(b.kazakh,'kk'));
   return `<div class="panel"><h2>Как запоминать слова</h2>
     <p>Два разных набора — два разных упражнения. Не смешивай.</p>
     <ol class="learning-steps"><li><strong>Задали выучить</strong> — домашка. Смотри пару → закрой → скажи вслух → напиши. Свою ассоциацию (дос = «доска друга») держи 1–2 раза, потом убери.</li><li><strong>Просто встречались</strong> — сначала только узнать (казахский → русский). Писать казахский — отдельным шагом, позже.</li><li>Маленькие пачки по 4. Интервал считает сам тренажёр. Подсказка не считается самостоятельным ответом.</li></ol>
     <p class="small">Опора: retrieval practice (Karpicke), keyword+retrieval (Memory & Cognition 2019), FSRS уже в тренажёре. Chrome для ChatGPT/Gemini сейчас закрыт — методика сверена с папкой ИССЛЕДОВАНИЯ и этими работами.</p></div>
     <div class="panel"><h2>Слова «выучить» из методичек</h2><p>Домашки 1–1, 1–2, 1–3, 2–1 и 2–2. Все <strong>${B.mustCount}</strong> позиций в тренажёре.</p>${mustBlocks}<p><button type="button" class="secondary-button" data-vocab="must">Тренировать заданные слова</button></p></div>
     <div class="panel"><h2>Слова, которые просто встречались</h2><p>${B.extraCount} слов не зубрить списком. Сначала узнать, потом писать.</p>${vocabTable(all.filter(w=>w.role==='used').map(w=>[w.kazakh,(Array.isArray(w.translation)?w.translation.join(', '):w.translation)+' · урок '+w.from_lesson]))}<p><button type="button" class="secondary-button" data-vocab="used">Тренировать встретившиеся слова</button></p></div>`;
 }
 function renderRules(){
   $('#rules-content').innerHTML=`
     <div class="panel"><h2>Сингармонизм без путаницы</h2><p>Для выбора окончания нужны две опоры: <strong>последний слог</strong> определяет гласную, <strong>последняя буква</strong> — первую согласную. Не пытайся запомнить шесть окончаний как шесть отдельных правил.</p><div class="table-wrap"><table><thead><tr><th scope="col">Последняя буква слова</th><th scope="col">Последний слог задний<br>А О Ұ Ы</th><th scope="col">Последний слог передний<br>Ә Ө Ү І Е</th></tr></thead><tbody><tr><th scope="row">Гласная, Р, Й, У → Л</th><td lang="kk">-лар · қалалар</td><td lang="kk">-лер · көшелер</td></tr><tr><th scope="row">Л, М, Н, Ң, Ж, З → Д</th><td lang="kk">-дар · адамдар</td><td lang="kk">-дер · сөздер</td></tr><tr><th scope="row">Глухая; Б, В, Г, Д → Т</th><td lang="kk">-тар · кітаптар</td><td lang="kk">-тер · жігіттер</td></tr></tbody></table></div><p>Пример рассуждения: кі-<strong>тап</strong> → последний слог задний → А. Последняя буква П → Т. Получаем кітап + тар = <span lang="kk">кітаптар</span>.</p><p>И и У разбираем в составе слова: иттер, но милар. -мен — особое падежное окончание без чередования А/Е. Остальные группы букв в методичке — учебная схема; полный алфавит не нужно смешивать с двумя основными группами гласных.</p><p><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Правило множественного числа и примеры</a></p></div>
     <div class="panel"><h2>Числа: лестница, не список до 9999</h2>
     <p>Мозг не учит «47» как отдельное слово. Сначала <strong>0–10</strong>, потом круглые десятки, потом отличаем пары <span lang="kk">сегіз / сексен</span> (8 и 80). Составные собираем из частей.</p>
     <ol class="learning-steps"><li>0–10 — отдельные слова, вразброс, не считая по порядку.</li><li>10, 20, 30, 40, 50 — тоже отдельные слова (жиырма ≠ екі + он).</li><li>60–90 рядом с 6–9: алты↔алпыс, жеті↔жетпіс, сегіз↔сексен, тоғыз↔тоқсан.</li><li>Двузначные сначала с эхом: 88, 55, 66 — в одном числе 8 и 80, 5 и 50.</li><li>Сотни: жүз. Сначала 550, 880, 808.</li><li>Тысячи: мың. Сначала 1550, 8080, 1888.</li></ol>
     <p>47 = 40 + 7 → <span lang="kk">қырық жеті</span>. Для 100 достаточно <span lang="kk">жүз</span>. Для 1001–1999: <span lang="kk">бір мың …</span>.</p>
     <p>Число перед существительным уже сообщает количество: екі кітап, көп адам.</p>
     <p class="small">В «Учить» лестница идёт сверху вниз. В «Повторять» можно взять нужную ступень. Конструктор чисел — внутри урока.</p></div>
     <div class="panel"><h2>Мягкое или твёрдое?</h2><p>Это названия групп из твоего курса для выбора окончаний. Они не совпадают с русской классификацией согласных по мягкости.</p><div class="pair-strip">${['Ә — А','Ө — О','І — Ы','Ү — Ұ','К — Қ','Г — Ғ'].map(s=>`<span lang="kk">${s}</span>`).join('')}</div><p><strong>Мягкая группа:</strong> Ә, Ө, І, Ү, Е, К, Г; в таблице курса также Э.</p><p><strong>Твёрдая группа:</strong> А, О, Ы, Ұ, Қ, Ғ, Я; в таблице курса также Ё.</p><p><strong>Остальные буквы зависят от слова.</strong> Например, Ң не является «всегда твёрдой»: сравни таң и тең.</p><p class="small">И, У и Ю не нужно угадывать отдельно от слова. Ит и би — мягкие; ми («мозг»), су, ту и у — твёрдые. Сүю — мягкое; аю и ою — твёрдые.</p><details><summary>Смешанные слова и разбор по слогам</summary><p>В мұғалім есть твёрдые и мягкий слог. Для окончания смотрим на последний лім: мұғалімдер. В іссапар последний слог пар твёрдый.</p><p>В учебном разборе слог только с И или У согласуется с предыдущим определённым слогом. Если предыдущего нет — со следующим: ғы-лы-ми, и-не. Для конкретных слов здесь сохранены разборы из ключей курса.</p><p>Окончание -мен — особый случай: досыммен не становится целиком мягким словом. В упражнении с Аманкелдіұлымен разбираем написанные слоги; новое множественное окончание к готовой падежной форме не прибавляем.</p></details></div>
     <div class="panel"><h2>Как выбрать множественное окончание</h2><p>1. По последнему слогу выбери твёрдый вариант с <strong>А</strong> или мягкий с <strong>Е</strong>.<br>2. По последней букве выбери начало окончания.</p><div class="table-wrap"><table><thead><tr><th scope="col">Последняя буква</th><th scope="col">Окончание</th><th scope="col">Пример</th></tr></thead><tbody><tr><td>К, Қ, П, С, Т, Ф, Х, Һ, Ц, Ч, Ш, Щ; Б, В, Г, Д</td><td>тар / тер</td><td>кітаптар<br>жігіттер</td></tr><tr><td>Л, М, Н, Ң, Ж, З</td><td>дар / дер</td><td>адамдар<br>сөздер</td></tr><tr><td>Гласные, Р, Й, У</td><td>лар / лер</td><td>қалалар<br>жерлер</td></tr></tbody></table></div><p class="small">Запоминалка для дар/дер: согласные в «ЛиМоН» + Ң, Ж, З. Чтобы получить единственное число, убери только окончание: дәрігерлер → дәрігер; иелер → ие.</p><details><summary>Число и количество перед существительным</summary><p>После числительного и слов көп, аз множественное окончание обычно не нужно: екі кітап, көп адам, аз қалам.</p><p class="small"><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Объяснение и примеры на kaz-tili.kz</a> — дополнительный материал из методички.</p></details></div>
     <div class="panel"><h2>Алфавит и произношение</h2><p lang="kk" style="font-size:1.15rem;line-height:1.95">А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я</p><p>Смотри на точную букву: Н ≠ Ң, К ≠ Қ, У ≠ Ұ ≠ Ү, И ≠ І.</p><div class="table-wrap"><table><thead><tr><th scope="col">Буква</th><th scope="col">Ориентир из урока</th><th scope="col">Примеры</th></tr></thead><tbody><tr><td>Ң</td><td>Носовой звук, как ng в sing. Не отдельные Н + Г.</td><td>шын — правда<br>шың — вершина</td></tr><tr><td>Қ, Ғ</td><td>Произносятся глубже, чем К, Г; Ғ — звонкий.</td><td>қол, ғасыр, сағат</td></tr><tr><td>Ы, І</td><td>Краткие гласные; І — передняя пара Ы.</td><td>жыл, алтын; тіс, кім</td></tr><tr><td>Ұ, Ү</td><td>Губы округлены; у Ү язык продвинут вперёд.</td><td>ұн, тұрмыс; үн, күн</td></tr><tr><td>Ә, Ө</td><td>Передние пары А и О; произносятся без добавочного Й.</td><td>ән, мән; өзен, өрт</td></tr><tr><td>Һ</td><td>Лёгкий выдох; встречается в заимствованных словах.</td><td>жиһаз, қаһарман</td></tr><tr><td>И, У, Ю</td><td>Чтение зависит от слова и его звукового состава.</td><td>ит, ми; су, ту; сүю, аю</td></tr><tr><td>Я, О, Е, Щ</td><td>Я — йа; не заменяй безударное О на А; Е в примерах курса — мягкой группы; Щ в ащы читается как шш.</td><td>ұя; орман / арман; ащы, тұщы</td></tr></tbody></table></div><div class="link-list"><a href="https://www.youtube.com/watch?v=CeGuG3jeRgo" target="_blank" rel="noopener noreferrer">Гласные: видео из методички</a><a href="https://www.youtube.com/watch?v=IjbaQlBEwkw" target="_blank" rel="noopener noreferrer">Согласные: видео из методички</a></div><p class="small">Произноси примеры вслух по образцу из видео. Проверка произношения голосом в этой версии не предусмотрена.</p></div>
     <div class="panel"><h2>Личные окончания біз / сендер / сіздер</h2>
     <p>Окончание как у мен/сен/сіз, только для біз Н меняется на З. После <strong>м, н, ң</strong> у біз звонкое <span lang="kk">быз/біз</span>: ғалыммын → ғалымбыз, мұғаліммін → мұғалімбіз.</p>
     <div class="table-wrap"><table><thead><tr><th scope="col">Последний звук</th><th scope="col">Біз</th><th scope="col">Сендер</th><th scope="col">Сіздер</th></tr></thead><tbody>
     <tr><th scope="row">Глухие; б в г д</th><td lang="kk">пыз / піз</td><td lang="kk">сыңдар / сіңдер</td><td lang="kk">сыздар / сіздер</td></tr>
     <tr><th scope="row">м н ң; ж з</th><td lang="kk">быз / бі́з</td><td lang="kk">сыңдар / сіңдер</td><td lang="kk">сыздар / сіздер</td></tr>
     <tr><th scope="row">Остальные</th><td lang="kk">мыз / міз</td><td lang="kk">сыңдар / сіңдер</td><td lang="kk">сыздар / сіздер</td></tr>
     </tbody></table></div>
     <p>С <strong>сендер</strong> и <strong>сіздер</strong> множественное окончание на само слово не ставим: <span lang="kk">сендер студентсіңдер</span>, не студенттерсіңдер. С біз множественное можно, но в упражнениях пишем без него: <span lang="kk">біз студентпіз</span>.</p>
     <p>Отрицание: основа + <span lang="kk">емес</span> + окончание. <span lang="kk">Сараңмын</span> → <span lang="kk">сараң емеспін</span>.</p>
     <p>Вопрос: после н/ң/з — ба/бе; после р (сыңдар, сіздер) — ма/ме. <span lang="kk">Сендер жазушысыңдар ма? Сіздер кәсіпкерсіздер ме?</span></p>
     <p><button type="button" class="secondary-button" data-rule-topic="person">Тренировать окончания</button></p>
     <p class="small"><a href="https://kaz-tili.kz/lichnie1.htm" target="_blank" rel="noopener noreferrer">Личные окончания</a> · <a href="https://kaz-tili.kz/prilag.htm" target="_blank" rel="noopener noreferrer">Прилагательные</a> · <a href="https://kaz-tili.kz/su_mn3.htm" target="_blank" rel="noopener noreferrer">Вопросительные частицы</a></p></div>
     <div class="panel"><h2>11 слов из домашней работы 1–1</h2>${vocabTable(course.vocabulary)}<p><button type="button" class="secondary-button" data-rule-topic="vocab">Тренировать слова</button></p></div>
     <div class="panel"><h2>Числа и количество из домашней работы 1–2</h2>${vocabTable(course.numbers)}<p><button type="button" class="secondary-button" data-rule-topic="numbers">Тренировать числа</button></p></div>
     <div class="panel"><h2>Слова урока 2–2</h2>${vocabTable(catalog.words.filter(w=>w.lesson_first_seen==='2-2').map(w=>[w.kazakh,w.translation]))}<p><button type="button" class="secondary-button" data-rule-topic="vocab">Тренировать слова</button></p></div>
     ${bankMarkup()}`;
   $$('[data-rule-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.ruleTopic;sourceFilter=null;mode='ordered';showView('practice');startQueue();});
   $$('#rules-content [data-source]').forEach(b=>b.onclick=()=>{sourceFilter=b.dataset.source;vocabRole=null;topic='all';mode='ordered';showView('practice');startQueue();});
   $$('#rules-content [data-vocab]').forEach(b=>b.onclick=()=>{vocabRole=b.dataset.vocab;courseBlock=null;sourceFilter=null;topic='vocab';mode='ordered';startQueue({all:true});showView('practice');});
 }
 function renderMaterials(){
   const cards=Object.entries(course.sources).filter(([,s])=>!s.additional).map(([key,s])=>{
     const n=questions.filter(q=>q.source===key).length;
     return `<div class="source-card"><div><h3>${esc(s.title)}</h3><p>${s.groups?s.groups+' групп заданий · ':''}${n} карточек</p></div><div class="source-actions"><button type="button" class="secondary-button" data-source="${key}">Тренировать</button><a href="${s.url}" target="_blank" rel="noopener noreferrer">Открыть оригинал</a></div></div>`;
   }).join('');
   $('#materials-content').innerHTML=`<div class="panel"><div class="coverage-stats"><div><span class="coverage-number">15</span><p>файлов проверено</p></div><div><span class="coverage-number">${Object.keys(course.sources).filter(k=>!course.sources[k].additional).length}</span><p>источников в практике</p></div><div><span class="coverage-number">${questions.filter(q=>!q.source||q.source!=='plus').length}</span><p>карточек по урокам</p></div></div><p>Дополнительно: ${window.LEARNING.lessons.length} маленьких уроков и ${questions.filter(q=>q.source==='plus').length} карточек и шаблонов для постепенного обучения. Они разработаны для тренажёра и не выданы за задания автора курса.</p><p>Включены упражнения уроков 1–1, 1–2, 1–3 и 2–2. Слова домашки 2–2 и новые прилагательные/профессии тренируются в обе стороны. Расхождения ключей 2–2 (мұғалімбіз, кәсіпкерлер, бастықтармыз) отмечены в карточках: принимается и ключ, и форма по правилу урока.</p><p class="coverage-note">Новые PDF лежат в «Казахский / учебные материалы». Файлы с Диска в тренажёр сами не подмешиваются.</p><a href="${course.folder}" target="_blank" rel="noopener noreferrer">Открыть папку с исходными материалами</a></div><div class="panel"><h2>Упражнения и домашняя работа</h2>${cards}</div><div class="panel"><h2>Остальные файлы учтены</h2><p><a href="https://drive.google.com/file/d/1HIVPE51FqFOcHBOOXFNfsmDKxvfCKpui/view" target="_blank" rel="noopener noreferrer">«Мягкие и твёрдые.pdf»</a> — шпаргалка; её схема включена в «Правила».</p><p><a href="https://docs.google.com/document/d/1Y-dWGwCJL04Pbp015V3_T91_n2f15-ep/edit" target="_blank" rel="noopener noreferrer">Uroki_1_1_Otvety.docx</a> — ответы к сборнику 1–1; использованы для сверки.</p><p><a href="https://drive.google.com/file/d/1P45V0RTvcpKEAjutHpPXM6KARx1MZbgd/view" target="_blank" rel="noopener noreferrer">Вторая копия методички 1–1</a> — текст полностью совпадает с первой. Задания не удваивались.</p><p class="small">Ключи воспроизведены по курсу, для перевода добавлены допустимые синонимы. Исправлена опечатка «Дукен» → «дүкен». Особенность задания с -мен объяснена прямо в карточке.</p></div><div class="panel"><h2>Завершение домашней работы на сайте курса</h2><p>Чтобы преподаватель получил результат, выполни официальный тест и нажми «Зафиксировать результат» на сайте BatylBol. При необходимости войди в свой аккаунт.</p><div class="link-list"><a href="https://batylbol.kz/test/Zvuki.html" target="_blank" rel="noopener noreferrer">BatylBol · твёрдые и мягкие звуки</a><a href="https://batylbol.kz/test/MnozhChislo.html" target="_blank" rel="noopener noreferrer">BatylBol · множественное число</a><a href="https://batylbol.kz/test/LichnyeLitso1-2.html" target="_blank" rel="noopener noreferrer">BatylBol · біз, сендер, сіздер</a><a href="https://batylbol.kz/test/LichnyeEdChislo.html" target="_blank" rel="noopener noreferrer">BatylBol · мен, сен, сіз</a></div><p class="small">Эти внешние банки вопросов не были доступны для переноса. Здесь сохранены ссылки из домашней работы; результаты личной тренировки в BatylBol не передаются.</p><p>Для заданий на письмо используй казахскую раскладку или кнопки букв под ответом. Шпаргалка всегда доступна в разделе «Правила».</p><details><summary>Дополнительные ссылки из методичек</summary><div class="link-list"><a href="https://kaz-tili.kz/su_fonetika.htm" target="_blank" rel="noopener noreferrer">Фонетика</a><a href="https://kaz-tili.kz/su_prav.htm" target="_blank" rel="noopener noreferrer">Мягкие и твёрдые слова</a><a href="https://kaz-tili.kz/progd/prog_mnozhestv_chislo.html" target="_blank" rel="noopener noreferrer">Множественное число · первый уровень</a><a href="https://kaz-tili.kz/prog/prog_mnozhestv_chislo.html" target="_blank" rel="noopener noreferrer">Множественное число · второй уровень</a><a href="https://sozdik.kz/" target="_blank" rel="noopener noreferrer">Русско-казахский словарь</a></div></details></div>`;
   renderPackageImport();
   $$('[data-source]').forEach(b=>b.onclick=()=>{sourceFilter=b.dataset.source;topic='all';mode='ordered';showView('practice');startQueue();});
 }
 function renderPackageImport(){
   const panel=document.createElement('details');panel.className='panel';
   panel.innerHTML='<summary>Добавить полученный школьный урок</summary><p>Загрузи подготовленный JSON-пакет с исходной ссылкой, проверенными ответами и небольшими объяснениями. PDF и исследования напрямую не добавляются. Будущие уроки тренажёр не создаёт.</p><label>Пакет урока<input id="lesson-package-file" type="file" accept=".json,application/json"></label><div id="lesson-package-preview" role="status"></div>';
   $('#materials-content').append(panel);
   $('#lesson-package-file').onchange=async e=>{
     const file=e.target.files[0],out=$('#lesson-package-preview');if(!file)return;
     try{
       if(file.size>2000000)throw Error('Пакет должен быть не больше 2 МБ.');
       const pack=window.LessonPackageSchema.validate(JSON.parse(await file.text()));
       const combined=window.LessonPackageSchema.merge(state.lesson_packages,[pack]);window.LessonPackages.prepare(combined);
       if(state.lesson_packages.some(p=>p.lesson_id===pack.lesson_id)){out.textContent='Этот пакет уже добавлен.';return;}
       const comparison=catalog.compareLesson({vocabulary:pack.words,rules:[]});
       out.innerHTML='<h3>'+esc(pack.lesson_title)+'</h3><p>Новых слов: '+comparison.newWords.length+'; уже в словаре: '+comparison.knownWords.length+'; проверок: '+pack.exercises.length+'.</p><p><a target="_blank" rel="noopener noreferrer" href="'+esc(pack.source.url)+'">'+esc(pack.source.title)+'</a></p><details><summary>Проверить содержание</summary>'+pack.blocks.map(b=>'<h4>'+esc(b.title)+'</h4><p>'+esc(b.explanation)+'</p>').join('')+pack.exercises.map(q=>'<p><strong>'+esc(q.stimulus)+'</strong> → '+esc(q.fields.map(f=>f.answers.join(' / ')).join('; '))+'</p>').join('')+'</details><label class="import-label"><input type="checkbox" id="received-lesson"> Этот урок действительно получен на занятиях; содержание и ответы проверены.</label><button type="button" class="primary-button" id="confirm-lesson" disabled>Добавить урок</button>';
       $('#received-lesson').onchange=e=>{$('#confirm-lesson').disabled=!e.target.checked;};
       $('#confirm-lesson').onclick=()=>{try{
         if(!$('#received-lesson').checked)return;
         const next={...state,lesson_packages:combined};localStorage.setItem(BACKUP,P.serialize(state));localStorage.setItem(KEY,JSON.stringify(next));
         state.lesson_packages=combined;window.LessonPackages.install(combined);catalog.activatePromotions(state);window.Knowledge.hydrate(state,questions);questions.forEach(q=>byId.set(q.id,q));confusionIndex=P.answerIndex(questions);save();renderMaterials();showView('learn');
       }catch(error){out.textContent='Урок не добавлен: '+error.message;}};
     }catch(error){out.textContent=error.message;}
   };
 }
 $$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
 $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;startQueue();}));
 $('#reset-progress').onclick=()=>{
   if(!window.confirm('Сбросить весь прогресс в этом браузере? Ответы, ошибки, заметки и ассоциации будут очищены.'))return;
   try{localStorage.setItem(BACKUP,P.serialize(state));}catch{}const retainedPackages=state.lesson_packages;state=P.empty();state.lesson_packages=retainedPackages;records=state.records;learningState=state.learning;storageReadError=null;topic='all';mode='smart';sourceFilter=null;activeLesson=null;activeStep=null;queue=[];practiceIds=[];position=0;showView('today');
 };
 const learning=window.LearningUI.create({
   get state(){return learningState;},save,startLesson,startCourse,courseJumpMarkup,bindCourseJump,eligible,missing:ids=>[...new Set(ids.flatMap(id=>catalog.missingPrerequisites(byId.get(id),state)))],practiceWords,association:key=>state.associations[key]?.text||'',setAssociation,today:()=>showView('today')
 });
 const dashboard=window.DashboardUI.create({
   state:()=>state,questions:()=>questions,eligible,hasSession:()=>queue.length>position,
   action(next){
     if(next.startsWith('remedy:')){startRemedy(next.slice(7));return;}
     if(next.startsWith('number:')){activeLesson=null;activeStep=null;sourceFilter=null;topic='numbers';mode='numbers';queue=window.NumberPractice.session(next.split(':')[1],state).filter(eligible).map(q=>q.id);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;resetCounts();render();showView('practice');return;}
     if(next==='reset'){$('#reset-progress').click();return;}
     if(next==='new'){
       const lessons=[...window.LEARNING.lessons].sort((a,b)=>(b.id===learningState.lessonId?1:0)-(a.id===learningState.lessonId?1:0));
       for(const lesson of lessons){const i=lesson.chunks.findIndex(step=>step.questionIds.every(eligible)&&step.questionIds.some(id=>!records[id]?.seen));if(i>=0){learningState.lessonId=lesson.id;learningState.steps[lesson.id]=i;break;}}
       showView('learn');return;
     }
     if(next.startsWith('course:')){startCourse(next.split(':')[1]);return;}
     if(next==='learn'){showView('learn');return;}
     if(next==='resume'){showView('practice');return;}
     if(['today','vocabulary','materials'].includes(next)){showView(next);return;}
     if(next==='confusions'){showView('review');return;}
     topic='all';sourceFilter=null;activeLesson=null;mode=next;startQueue();showView('practice');
   },
   contrast:startContrast,setAssociation,promote,export:()=>{save();downloadProgress(P.serialize(state));},import:importProgress,
   restoreBackup(){const data=localStorage.getItem(BACKUP)||localStorage.getItem(MIGRATION);if(data)downloadProgress(data,'progress-before-import.json');else window.alert('Предыдущей резервной копии пока нет.');}
 });
 $('#pause-session').onclick=()=>showView(mode==='exam'?'exam':'today');
 const lettersPref=$('#pref-letters');
 if(lettersPref){lettersPref.checked=!!state.prefs.letters;lettersPref.onchange=()=>{state.prefs.letters=lettersPref.checked;save();if(view==='practice')render();};}
 renderRules();renderMaterials();
 const validSaved=savedSession&&topics.some(t=>t[0]===savedSession.topic)&&['ordered','shuffle','mistakes','smart','review','lesson','contrast','numbers','remediation','words','exam'].includes(savedSession.mode)&&Array.isArray(savedSession.queue)&&savedSession.queue.every(id=>byId.has(id))&&Number.isInteger(savedSession.position)&&savedSession.position>=0&&savedSession.position<=savedSession.queue.length&&(!savedSession.sourceFilter||course.sources[savedSession.sourceFilter])&&(savedSession.mode!=='lesson'||window.LEARNING.lessons.some(l=>l.id===savedSession.activeLesson));
 if(validSaved){
   variants=savedSession.variants||{};
   queueEpoch=typeof savedSession.queueEpoch==='number'?savedSession.queueEpoch:queueEpoch;
   presented=typeof savedSession.presented==='string'?savedSession.presented:null;
   sessionAttempts=Math.max(0,Number(savedSession.sessionAttempts)||0);sessionCorrect=Math.min(sessionAttempts,Math.max(0,Number(savedSession.sessionCorrect)||0));sessionAssisted=Math.min(sessionAttempts-sessionCorrect,Math.max(0,Number(savedSession.sessionAssisted)||0));
   draft=savedSession.draft&&Array.isArray(savedSession.draft.answers)?savedSession.draft:null;remediation=savedSession.remediation||null;
   topic=savedSession.topic;mode=savedSession.mode;sourceFilter=savedSession.sourceFilter||null;courseBlock=savedSession.courseBlock||null;activeLesson=mode==='lesson'?savedSession.activeLesson:null;
   activeStep=activeLesson?Math.min(window.LEARNING.lessons.find(l=>l.id===activeLesson).chunks.length-1,Math.max(0,Number(savedSession.activeStep)||0)):null;
   queue=savedSession.queue;practiceIds=Array.isArray(savedSession.practiceIds)?savedSession.practiceIds.filter(id=>byId.has(id)):[...new Set(queue)];
   stepEvidence=savedSession.stepEvidence&&typeof savedSession.stepEvidence==='object'?savedSession.stepEvidence:{};
   position=Math.min(queue.length,savedSession.position+(savedSession.answered?1:0));if(savedSession.answered&&!['ordered','shuffle'].includes(mode)&&sessionAttempts>=cfg.session.maxAttempts)position=queue.length;render();
   if(!savedSession.answered){hinted=!!savedSession.hinted;elapsedMs=Number.isFinite(savedSession.elapsed_ms)?Math.max(0,savedSession.elapsed_ms):0;}
 }else{queue=[];practiceIds=[];renderStats();}
 showView(validSaved&&savedSession.view==='practice'?'practice':'today');
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseTimer();else{renderStats();if(view==='practice')activateCard();if(['today','review','vocabulary'].includes(view))dashboard.render(view);}save();});
 window.addEventListener('qazaq-before-update',e=>{pauseTimer();save();if(!storageAvailable)e.preventDefault();});
 window.addEventListener('blur',pauseTimer);window.addEventListener('focus',startTimer);window.addEventListener('pagehide',()=>{pauseTimer();save();});
 function applyRemote(incoming){
   if(!incoming)return;
   cloudApplying=true;
   state=P.merge(state,incoming);records=state.records;learningState=state.learning;
   try{window.LessonPackages.install(state.lesson_packages);}catch{}
   catalog.activatePromotions(state);for(const q of questions){coerceTyped(q);byId.set(q.id,q);}window.Knowledge.hydrate(state,questions);
   confusionIndex=P.answerIndex(questions);save();cloudApplying=false;renderStats();
   if(['today','review','vocabulary'].includes(view))dashboard.render(view);
 }
 function paintAccount(){
   const cloud=window.QazaqCloud,toggle=$('#account-toggle'),form=$('#account-form'),userEl=$('#account-user'),out=$('#account-logout');
   if(!cloud)return;
   if(!cloud.configured){toggle.hidden=true;form.hidden=true;userEl.hidden=true;out.hidden=true;return;}
   if(cloud.user){toggle.hidden=true;form.hidden=true;userEl.hidden=false;userEl.textContent=cloud.user.email;out.hidden=false;}
   else{toggle.hidden=false;userEl.hidden=true;out.hidden=true;}
 }
 function accountError(error){
   const msg=$('#account-msg');if(!msg)return;
   const text=String(error&&error.message||error);
   msg.textContent=/email-already-in-use/i.test(text)?'Этот адрес уже зарегистрирован. Войди.':/invalid-credential|user-not-found|wrong-password/i.test(text)?'Почта или пароль не подошли.':/weak-password/i.test(text)?'Пароль короче 6 символов.':text;
 }
 (async()=>{
   const cloud=window.QazaqCloud;if(!cloud)return;
   await cloud.start();paintAccount();
   $('#account-toggle').onclick=()=>{$('#account-form').hidden=!$('#account-form').hidden;};
   $('#account-logout').onclick=async()=>{await cloud.logout();paintAccount();};
   $('#account-form').onsubmit=async e=>{
     e.preventDefault();$('#account-msg').textContent='Вхожу…';
     try{await cloud.login($('#account-email').value.trim(),$('#account-password').value);const remote=await cloud.pull();applyRemote(remote);await cloud.push(state);$('#account-msg').textContent='Прогресс в облаке.';paintAccount();}catch(error){accountError(error);}
   };
   $('#account-register').onclick=async()=>{
     const email=$('#account-email').value.trim(),password=$('#account-password').value;
     if(!email||password.length<6){$('#account-msg').textContent='Нужны почта и пароль от 6 символов.';return;}
     $('#account-msg').textContent='Создаю аккаунт…';
     try{await cloud.register(email,password);await cloud.push(state);$('#account-msg').textContent='Аккаунт создан, этот прогресс сохранён в облаке.';paintAccount();}catch(error){accountError(error);}
   };
   window.addEventListener('qazaq-cloud-user',async()=>{
     paintAccount();
     if(cloud.user){try{const remote=await cloud.pull();applyRemote(remote);await cloud.push(state);}catch{}}
   });
 })();
})();
