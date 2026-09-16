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
 const COURSE_BLOCKS=[{id:'1-1',title:'1–1',hint:'Звуки и первые слова'},{id:'1-2',title:'1–2',hint:'Окончания и десятки'},{id:'1-3',title:'1–3',hint:'Числа и новые слова'},{id:'2-1',title:'2–1',hint:'Мен, сен, сіз'},{id:'2-2',title:'2–2',hint:'Біз, сендер, сіздер'},{id:'2-3',title:'2–3',hint:'Ол, вопрос, порядковые'}];
 function courseJumpMarkup(id){
   return `<div class="course-jump" id="${id}"><p>Открыть любой урок сразу, без прохождения предыдущих:</p><div class="review-actions">${COURSE_BLOCKS.map(b=>`<button type="button" class="secondary-button" data-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}>Урок ${b.title}</button>`).join('')}</div></div>`;
 }
 function bindCourseJump(root){
   (root?root.querySelectorAll('[data-course]'):[]).forEach(b=>b.onclick=()=>startCourse(b.dataset.course));
 }
 let variants={},practiceIds=[],stepEvidence={},queueEpoch=Date.now(),presented=null,elapsedMs=0,timerSince=null;
 let sessionAttempts=0,sessionCorrect=0,sessionAssisted=0,draft=null,remediation=null,introOpen=false,cloudApplying=false;
 let examRaf=null,examTimedOut=false,advanceTimer=null,sessionBlindFails=Object.create(null),rulePeeked=false,hwLesson=null,hwPart=null,hwSection=0,hwReturn=null,remediationNote='',retrying=false;
 function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}
 function focusAnswer(){const el=$('#answer-0');if(el&&!el.disabled){try{el.focus({preventScroll:false});}catch{el.focus();}}}
 function captureDraft(){const q=byId.get(queue[position]);if(!checked&&q&&$('#answer-form'))draft={token:queueEpoch+':'+position,exerciseId:q.id,answers:readAnswers(q)};}
 function resetCounts(){sessionAttempts=0;sessionCorrect=0;sessionAssisted=0;draft=null;remediation=null;}
 function elapsed(){return Math.round(elapsedMs+(timerSince===null?0:Math.max(0,performance.now()-timerSince)));}
 function morphemeRow(errors,expected,actual){
   const types=(errors||[]).map(e=>e.error_type);
   if(!types.some(t=>t==='vowel_harmony'||t==='plural_initial_consonant'||t==='plural_after_numeral'))return '';
   const exp=String(expected||'').split(' / ')[0],act=String(actual||'');
   if(!exp)return '';
   if(types.includes('plural_after_numeral')){
     return `<div class="rule-parts" lang="kk"><span class="morpheme">${esc(exp)}</span><span class="morpheme extra">лишнее окончание</span></div>`;
   }
   let i=0;while(i<exp.length&&i<act.length&&exp[i]===act[i])i++;
   const stem=exp.slice(0,Math.max(1,i));
   const need=exp.slice(stem.length);
   const extra=act.slice(stem.length);
   return `<div class="rule-parts" lang="kk"><span class="morpheme">${esc(stem)}</span>${need?`<span class="morpheme suffix">${esc(need)}</span>`:''}${extra&&extra!==need?`<span class="morpheme extra">${esc(extra)}</span>`:''}</div>`;
 }
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
   const pool=questions.filter(q=>eligible(q)&&examReady(records[q.id])&&(!window.CurriculumGate||window.CurriculumGate.examEligible(q)));
   const n=Math.min(cfg.session.examSize,pool.length);
   if(!n){
     $('#exam-content').innerHTML=`<div class="panel exam-intro"><h2>Пока нечего закреплять</h2><p>Сюда попадают формы, которые ты уже вспоминала после паузы в разные дни.</p><p><button type="button" class="primary-button" data-view="today">К сегодня</button></p></div>`;
     $('#exam-content [data-view="today"]').onclick=()=>showView('today');
     return;
   }
   $('#exam-content').innerHTML=`<div class="panel exam-intro"><h2>Закрепление на время</h2><button type="button" class="primary-button" id="exam-start">Начать ${n} карточек</button><p class="small">Подсказки выключены. Только то, что уже вспоминалось после паузы. Короткий лимит на карточку.</p>
     <div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>name?`<button type="button" class="chip" data-exam="${id}">${esc(name)}</button>`:'').join('')}</div>
     <div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-exam-course="${b.id}">${esc(b.title)}</button>`).join('')}</div>
     <p><button type="button" class="secondary-button" id="exam-rules">Только правила (другие основы)</button></p></div>`;
   const go=()=>{mode='exam';sourceFilter=null;vocabRole=null;activeLesson=null;startQueue({all:true});showView('practice');};
   $('#exam-start').onclick=go;
   $$('#exam-content [data-exam]').forEach(b=>b.onclick=()=>{topic=b.dataset.exam;go();});
   $$('#exam-content [data-exam-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.examCourse;go();});
   $('#exam-rules').onclick=()=>{topic='rules';courseBlock=null;go();};
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
 function examReady(r){return window.MemoryPolicy?window.MemoryPolicy.examReady(r):!!r&&(r.recall_review_successes||0)>=2;}
 function startQueue({all=false}={}){
   activeLesson=null;activeStep=null;stepEvidence={};let list=subset();
   if(!vocabRole)list=list.filter(q=>q.wordRole!=='used');
   if(mode==='smart'){list=shuffled(list).sort((a,b)=>Number(window.Knowledge.bindings(b).some(x=>x.skill_type==='production'))-Number(window.Knowledge.bindings(a).some(x=>x.skill_type==='production')));list=core.chooseShortSession(list,records,Date.now(),questions.length);}
   else if(mode==='review')list=list.filter(q=>core.isDue(records[q.id])).sort((a,b)=>records[a.id].dueAt-records[b.id].dueAt);
   else if(mode==='mistakes')list=list.filter(q=>records[q.id]?.needsReview);
   else if(mode==='exam')list=list.filter(q=>examReady(records[q.id])&&(!window.CurriculumGate||window.CurriculumGate.examEligible(q)));
   else if(!all)list=list.filter(q=>(records[q.id]?.streak||0)<2||core.isDue(records[q.id]));
   if(mode==='shuffle'||mode==='mistakes'||mode==='exam')list=shuffled(list);
   if(mode==='exam')list=list.slice(0,cfg.session.examSize);
   if(mode==='ordered'||mode==='shuffle'){
     const fresh=list.filter(q=>!(records[q.id]?.seen)),old=list.filter(q=>records[q.id]?.seen);
     list=[...fresh.slice(0,cfg.session.newLimit),...old].slice(0,cfg.session.size+cfg.session.newLimit);
   }
   if(['smart','review','mistakes'].includes(mode)){const recent=state.events.filter(e=>e.type==='answer'&&Date.now()-e.at<cfg.session.recentWindowMs).slice(-cfg.session.minIntervening).map(e=>e.card_id);list=core.spaceRecent(window.Knowledge.choose(list,state,Infinity),recent).slice(0,cfg.session.size);}
   let ids=list.map(q=>q.id);
   if(window.MemoryPolicy)ids=window.MemoryPolicy.breakRuns(ids,questions);
   if(window.MemoryPolicy&&window.MemoryPolicy.mixRulesProbes&&['smart','review','ordered'].includes(mode))ids=window.MemoryPolicy.mixRulesProbes(ids,questions,state);
   queue=ids;practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);resetCounts();render();
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
   ['today','learn','review','vocabulary','practice','rules','materials','exam','homework','path'].forEach(v=>{const el=$('#'+v+'-view');if(el)el.hidden=v!==next;});
   const tab=next==='practice'?(mode==='exam'?'exam':'review'):next;
   $$('[data-view]').forEach(b=>{if(b.dataset.view===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
   renderStats();if(next==='learn')learning.render();if(['today','review','vocabulary'].includes(next))dashboard.render(next);if(next==='exam')renderExam();if(next==='homework')renderHomework();if(next==='path')renderPath();if(next==='practice')activateCard();save();
 }
 function renderNav(){
   $('#lesson-nav').innerHTML=topics.map(([id,name,num])=>{
     const list=questions.filter(q=>id==='all'||q.topic===id), n=list.filter(q=>(records[q.id]?.streak||0)>=2).length;
     return `<button type="button" class="topic-button" data-topic="${id}" ${topic===id?'aria-current="page"':''}><span class="topic-num">${num}</span><span><span class="topic-name">${name}</span><span class="topic-count">${n} в банке форм</span></span></button>`;
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
   $('#pause-session').textContent=mode==='homework'||(mode==='remediation'&&hwReturn)?'Сделать паузу · Домашка':mode==='exam'?'Сделать паузу · Экзамен':'Сделать паузу · Сегодня';
   const scope=subset(), tried=scope.filter(q=>records[q.id]?.attempts>0).length;
   $('#session-position').textContent=['smart','lesson','review','contrast'].includes(mode)?`В подходе ${new Set(queue).size} разных карточек · шаг ${Math.min(position+1,queue.length)} из ${queue.length}`:`Встречалось ${tried} из ${scope.length} карточек`;
   $('#session-score').textContent=sessionAttempts?`Без подсказки: ${sessionCorrect} / ${sessionAttempts} · с подсказкой: ${sessionAssisted}`:'Можно отвечать сразу';
   $('#practice-title').textContent=mode==='exam'?'Экзамен на время':activeLesson?window.LEARNING.lessons.find(l=>l.id===activeLesson).title:topic==='all'?'Практика казахского':topics.find(x=>x[0]===topic)[1];
   $('.course-badge').textContent=mode==='homework'?'Домашка':mode==='exam'?'На время':'Письменно';
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
   bar.innerHTML=`<details class="filter-fold"><summary>Фильтр</summary><div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>name?`<button type="button" class="chip" data-jump-topic="${id}" ${topic===id?'aria-pressed="true"':''}>${esc(name)}</button>`:'').join('')}</div><div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-jump-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}>${esc(b.title)}</button>`).join('')}<button type="button" class="chip" data-jump-course="" ${courseBlock?'':'aria-pressed="true"'}>Все</button></div></details>`;
   $$('#jump-bar [data-jump-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.jumpTopic;activeLesson=null;vocabRole=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');});
   $$('#jump-bar [data-jump-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.jumpCourse||null;activeLesson=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');});
   const fold=$('#jump-bar details');if(fold&&typeof matchMedia==='function'&&matchMedia('(min-width:691px)').matches)fold.open=true;
 }
 function encodingMarkup(q){
   if(!q||mode==='exam')return '';
   const rec=records[q.id];
   if(window.MemoryPolicy&&window.MemoryPolicy.associationFaded(rec))return '';
   const keys=[...new Set([...(q.associationKeys||[]),'card:'+q.id])];
   const text=keys.map(k=>state.associations[k]&&state.associations[k].text).find(t=>t&&String(t).trim());
   if(!text)return '';
   return `<p class="question-note encoding-cue" id="encoding-cue">${esc(text)}</p>`;
 }
 function answerMarkup(q){
   const fields=q.fields||[{label:'Ответ',kind:'text'}];
   return `<div class="fields">${fields.map((f,i)=>`<div class="field-row"><label class="field-label" for="answer-${i}">${esc(f.label)}</label><div class="field-control"><input id="answer-${i}" name="answer-${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ${f.kind==='number-text'?'inputmode="numeric"':''} aria-describedby="correction-${i}"><span class="field-correction" id="correction-${i}"></span></div></div>`).join('')}</div>`;
 }
 function render(){
   retrying=false;
   introOpen=false;pauseTimer();elapsedMs=0;checked=false;hinted=false;rulePeeked=false;lastTextInput=null;renderStats();
   const q=byId.get(queue[position]);
   if(!q){renderEmpty();return;}
   window.NumberPractice.prepare(q,variants);confusionIndex=P.answerIndex(questions);
   const source=course.sources[q.source], streak=records[q.id]?.streak||0;
   const location=q.source.startsWith('hw')?'Слово '+q.group:`Задание ${q.group}${q.part!=='1'?' · пункт '+q.part:''}`;
   const hasText=q.kind==='fields'&&q.fields.some(f=>f.kind!=='number-text');
   const letters=hasText&&state.prefs.letters;
   const exam=mode==='exam';
   const hw=mode==='homework';
   const canRule=hw&&window.Homework&&window.Homework.ruleText(q);
   const longHw=hw&&hwLesson&&state.homeworkAttempts[hwLesson]&&Date.now()-(state.homeworkAttempts[hwLesson].started_at||Date.now())>25*60*1000;
   $('#exercise').innerHTML=`<div class="question-top"><div class="source-label">${source.additional?esc(source.title):`<a href="${source.url}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`}<br>${esc(location)}</div><span class="mastery-label">${exam?'Экзамен':hw?'Домашка':esc(cfg.labels[records[q.id]?.mastery_level||'NEW'])}</span></div><form id="answer-form"><div class="question-body"><p class="phase-label">${exam?'НА ВРЕМЯ':hw?'ДОМАШКА':esc(q.phase||(q.source.startsWith('hw')?'Вспомнить':'Применить правило'))}</p>${longHw?'<p class="question-note">Уже больше 25 минут на этом листе. Можно сохранить и продолжить позже — это не стоп.</p>':''}<h2 id="question-title">${esc(q.title)}</h2>${q.stimulus?`<div class="stimulus" lang="${q.title.includes('на казахский')?'ru':'kk'}">${esc(q.stimulus)}${q.translation?`<span class="translation" lang="ru">${esc(q.translation)}</span>`:''}</div>`:''}${q.note?`<p class="question-note">${esc(q.note)}</p>`:''}${mode==='remediation'&&remediationNote&&position===0?`<p class="question-note remediation-rule">${esc(remediationNote)}</p>`:''}${encodingMarkup(q)}${q.contextGloss?`<div class="context-gloss">${q.contextGloss.map(g=>`<span><strong>${esc(g.word)}</strong> — ${esc(g.translation)} <small>для контекста</small></span>`).join('')}</div>`:''}${answerMarkup(q)}${letters?`<div class="letter-keyboard" aria-label="Казахские буквы">${[...'әғқңөұүһі'].map(c=>`<button type="button" data-letter="${c}" aria-label="Вставить ${c}">${c}</button>`).join('')}</div><div class="keyboard-label">Буква вставится в выбранное поле.</div>`:''}<div id="hint-box" class="hint" hidden></div><div id="association-box" class="hint" hidden></div><p id="validation" class="validation-message" role="alert" hidden></p></div><div class="question-actions"><div class="secondary-actions"><button type="button" class="secondary-button" id="rule-button" ${canRule?'':'hidden'}>Правило</button><button type="button" class="secondary-button" id="hint-button" ${exam?'hidden':''}>Нужна подсказка</button><button type="button" class="text-button" id="reveal-button">${exam?'Пропустить': 'Не знаю'}</button><button type="button" class="text-button" id="association-button" ${exam?'hidden':''}>Ассоциация</button></div><div class="primary-slot"><button type="submit" class="primary-button" id="check-button">Проверить</button><button type="button" class="primary-button" id="next-button" hidden>Дальше →</button></div></div><div id="feedback" class="feedback" role="status" aria-live="polite" hidden></div></form>`;
   $('#answer-form').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();});
   $('#answer-form').addEventListener('submit',e=>{e.preventDefault();if(e.isComposing||(e.nativeEvent&&e.nativeEvent.isComposing))return;if(checked)nextQuestion();else checkAnswer(q);});
   if($('#rule-button'))$('#rule-button').onclick=()=>showRule(q);
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
   if(draft?.token===queueEpoch+':'+position&&draft.exerciseId===q.id){
     if(q.kind==='multi')$$('input[name=choice]').forEach(el=>{el.checked=draft.answers.includes(el.value);});
     else q.fields.forEach((f,i)=>{$('#answer-'+i).value=String(draft.answers[i]||'');});
   }
   $('#answer-form').addEventListener('input',save);$('#answer-form').addEventListener('change',save);
   activateCard();save();
 }
 function hintEvent(q,kind){state.events.push({type:'hint',card_id:q.id,at:Date.now(),hint_kind:kind,response_time_ms:elapsed(),hinted:true});}
 function showRule(q){
   if(checked||mode==='exam')return;
   const text=window.Homework&&window.Homework.ruleText(q);
   if(!text)return;
   rulePeeked=true;
   state.events.push({type:'rule_peek',card_id:q.id,at:Date.now(),rule_id:window.Homework.ruleId(q),homework:mode==='homework'?1:0});
   const box=$('#hint-box');
   box.innerHTML='<strong>Правило, не ответ этого пункта.</strong><pre class="rule-pre">'+esc(text)+'</pre>';
   box.hidden=false;
   if($('#rule-button'))$('#rule-button').disabled=true;
   save();
 }
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
   hinted=true;hintEvent(q,'explanation');if($('#hint-button'))$('#hint-button').disabled=true;
   const hints={sounds:'Схема курса: мягкая группа Ә, Ө, І, Ү, Е, К, Г, Э; твёрдая А, О, Ы, Ұ, Қ, Ғ, Я, Ё. Для окончания важен последний слог.',plural:'Последний слог: А или Е. Потом последняя буква: глухие и Б, В, Г, Д → тар/тер; Л, М, Н, Ң, Ж, З → дар/дер; гласные, Р, Й, У → лар/лер.',vocab:'Сначала слепая попытка. Не открывай готовое слово — иначе это не вспоминание.',numbers:'Собери разряды: сначала большая часть. Не считай по порядку.',person:'Мен: пын/бын/мын. Сен: сың. Сіз: сыз. Біз после м/н/ң: біз. Сендер/сіздер без -лар на основу. Отрицание: основа + емес + окончание.',rules:'Набери суффикс или короткое слово правила, не целое новое существительное.'};
   const box=$('#hint-box');box.textContent=q.hint&&!/^[А-Яа-яӘәІіҢңҒғҚқӨөҰұҮүҺһ ]{1,24}$/.test(q.hint)?q.hint:(hints[q.topic]||'Вспомни правило, потом форму.');box.hidden=false;save();
   if(mode!=='exam'&&window.AiTutor){
     const expected=(q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'';
     const req=window.AiTutor.buildRequest('hint',q,{hint_used:true,codes:[]});
     window.AiTutor.callTutor(req).then(resp=>{
       if(!resp||!resp.message_ru||window.AiTutor.hintLeaks(resp,expected))return;
       box.textContent=resp.message_ru+(resp.next_action_ru?' '+resp.next_action_ru:'');
     });
   }
 }
 function readAnswers(q){return q.kind==='multi'?$$('input[name=choice]:checked').map(el=>el.value):q.fields.map((_,i)=>$('#answer-'+i).value);}
 function checkAnswer(q,reveal=false){
   if(checked&&!retrying)return;
   if(retrying){
     const answers=readAnswers(q), warning=$('#validation');
     if(answers.some(a=>!String(a).trim())&&q.kind!=='multi'){warning.textContent='Набери форму целиком.';warning.hidden=false;return;}
     warning.hidden=true;
     const result=core.evaluate(q,answers);
     if(result.correct){nextQuestion();return;}
     warning.textContent='Ещё раз целиком.';warning.hidden=false;
     q.fields.forEach((_,i)=>{const el=$('#answer-'+i);if(el)el.value='';});
     focusAnswer();return;
   }
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
   }else rating=F.Rating.Good;
   const previous=records[q.id];
   const predicted=window.ReviewScheduler.retrievability?window.ReviewScheduler.retrievability(previous,now):null;
   const hours=previous?.last_correct?(now-previous.last_correct)/3600000:null;
   const homeworkMode=mode==='homework';
   const aiRemed=String(q.id||'').startsWith('ai-remed:');
   let rec=previous||core.migrateRecord({},now);
   if(homeworkMode){
     if(hinted&&previous){rec=core.updateRecord(previous,result.correct,true,now,{responseTime:elapsedMs,recall,rating:F.Rating.Again});records[q.id]=rec;}
   }else if(!aiRemed){rec=core.updateRecord(previous,result.correct,hinted,now,{responseTime:elapsedMs,recall,rating});records[q.id]=rec;}
   else records[q.id]=rec;
   const errors=reveal?[]:window.ErrorDiagnostics.diagnose(q,answers,result,now);state.errors.push(...errors);
   const policy=window.MemoryPolicy;
   const flags=policy&&policy.answerFlags?policy.answerFlags({hinted,correct:result.correct}):{first_try_correct:hinted?0:(result.correct?1:0),peek:hinted?1:0,retype_after_peek_ok:hinted?(result.correct?1:0):null};
   if(rulePeeked)flags.first_try_correct=0;
   const event={session_id:String(queueEpoch),presentation:position,type:'answer',card_id:q.id,at:now,correct:result.correct,hinted,response_time_ms:elapsedMs,response_time:elapsedMs,latency_ms:elapsedMs,recall,answers,
     item_type:policy?policy.classify(q):null,direction:policy?policy.direction(q):null,
     first_try_correct:flags.first_try_correct,peek:flags.peek,retype_after_peek_ok:flags.retype_after_peek_ok,
     confusion_tag:policy?policy.confusionTag(q,answers,result):'',
     confuse_pair_id:policy&&policy.contrastSide(q)?String(policy.contrastSide(q).pair):'',
     official_like:(mode==='exam'||q.topic==='rules')?1:0,
     predicted_R:predicted,
     hours_since_last:hours,
     rule_peek:rulePeeked?1:0,homework:homeworkMode?1:0,block:window.Homework?window.Homework.inferBlock(q,mode,hwLesson,activeLesson):''};
   if(!homeworkMode&&!aiRemed)event.skills=window.Knowledge.observe(state,q,result,event,errors);
   state.events.push(event);rec=records[q.id]||rec;
   if(homeworkMode&&hwLesson){
     const expected=q.kind==='multi'?(q.correct||[]).join(', '):(q.fields||[]).map(f=>f.answers[0]).join('; ');
     window.Homework.recordItem(state,hwLesson,{id:q.id,answers,correct:result.correct,rule_peek:rulePeeked,answer_peek:hinted,skipped:!!reveal,expected},now);
   }
   P.observeConfusions(state,q,answers,result,now,confusionIndex,hinted||reveal||rulePeeked);
   for(const pair of Object.values(state.confusions)){pair.expected_item=[...confusionIndex.get(pair.expected_answer)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.given_item=[...confusionIndex.get(pair.wrong_answer_given)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.last_confused=pair.last_wrong;}
   if(activeLesson&&practiceIds.includes(q.id))stepEvidence[q.id]=result.correct&&!hinted;
   sessionAttempts++;if(result.correct){if(hinted)sessionAssisted++;else sessionCorrect++;}
   if(!hinted&&!result.correct)sessionBlindFails[q.id]=(sessionBlindFails[q.id]||0)+1;
   if(!homeworkMode&&(sessionBlindFails[q.id]||0)<2)core.scheduleRepeat(queue,position,q.id,rec.streak,[...practiceIds,...questions.filter(x=>eligible(x)&&records[x.id]?.seen&&x.id!==q.id).map(x=>x.id)].filter(id=>id!==q.id));
   const mate=window.MemoryPolicy&&window.MemoryPolicy.contrastSide(q);
   if(mate&&!result.correct&&!hinted){
     const other=questions.find(x=>x.id!==q.id&&window.MemoryPolicy.contrastSide(x)?.pair===mate.pair&&window.MemoryPolicy.contrastSide(x)?.side!==mate.side);
     if(other&&!queue.slice(position+1).includes(other.id))queue.splice(Math.min(position+4,queue.length),0,other.id);
   }
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
   const allowRetry=!result.correct&&mode!=='exam'&&!reveal;
   if(!allowRetry){
     $$('#answer-form input, #answer-form select, #hint-button, #reveal-button, [data-letter]').forEach(el=>{el.disabled=true;});
     $('#answer-form').classList.add('answered');
     $('#check-button').hidden=true;$('#next-button').hidden=false;
   }else{
     retrying=true;checked=false;
     $('#check-button').hidden=false;$('#next-button').hidden=true;
     q.fields.forEach((_,i)=>{const el=$('#answer-'+i);if(el){el.value='';el.classList.remove('valid','invalid');el.removeAttribute('aria-invalid');el.disabled=false;}});
     focusAnswer();
   }
   const feedback=$('#feedback');feedback.className='feedback '+(!result.correct?'error':hinted?'hinted':'');
   const headline=reveal?'Разберём ответ':!result.correct?'Пока не всё верно':hinted?'Верно с подсказкой. Позже вернёмся к этому без помощи.':rec.streak>=2?'Верно самостоятельно':'Верно';
   let status=rec.streak>=2?'Следующая проверка по памяти: '+new Date(rec.dueAt).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'.':!result.correct?'Эта карточка появится снова.':'Для закрепления карточка вернётся позже.';
   if(deferred)status='Карточка сохранена для следующего подхода: сейчас не хватает других заданий для паузы.';
   if(result.correct&&hinted)status='Перенабор засчитан как обучение, не как самостоятельный успех. Карточка вернётся в этом подходе слепой.';
   const answerLine=q.kind==='multi'?q.correct.join(', '):(q.fields||[]).map(f=>f.answers.join(' / ')).join('; ');
   const timeLine=mode==='exam'?(examTimedOut?'Время вышло.':'Короткий лимит на карточку'+(elapsedMs>cfg.session.examHardMs&&result.correct?' · медленно.':' · зачёт.')):'';
   const local=errors.map(e=>window.ErrorDiagnostics.line&&window.ErrorDiagnostics.line(e.error_type)||window.ErrorDiagnostics.labels[e.error_type]).filter(Boolean);
   const aiCodes=window.AiTutor&&mode!=='exam'?window.AiTutor.noteAnswer(q,answers,result,hinted,errors,now):[];
   const aiRepeat=window.AiTutor&&aiCodes[0]&&window.AiTutor.shouldOfferExplain(aiCodes[0]);
   const morph=!result.correct?morphemeRow(errors,answerLine,answers.join(' ')):'';
   feedback.innerHTML=`<h3>${headline}</h3>${morph}<p><strong>Ответ:</strong> ${esc(answerLine)}.</p>${local.length?'<p><strong>Где ошибка:</strong> '+[...new Set(local)].map(esc).join('; ')+'.</p>':''}<p>${esc(q.explanation)}</p><p class="small">${status}</p>${timeLine?'<p class="small">'+timeLine+'</p>':''}`+(!result.correct&&mode!=='exam'?`<div class="ai-tutor-panel" id="ai-tutor-panel"><div class="ai-tutor-actions"><button type="button" class="text-button" id="ai-why">Почему так?</button><button type="button" class="text-button" id="ai-rule">Покажи правило</button></div>${aiRepeat?'<p class="small" id="ai-repeat-note">Это уже повторялось — разберём</p>':''}<div id="ai-tutor-out" class="ai-tutor-out" hidden></div></div>`:'');feedback.hidden=false;
   if(!result.correct&&mode!=='exam'&&window.AiTutor){
     const paint=(resp)=>{
       const out=$('#ai-tutor-out');if(!out||!resp)return;
       out.hidden=false;
       const leak=resp.mode==='hint'?false:!!(resp.contrast&&resp.contrast.correct);
       out.innerHTML='<p>'+esc(resp.message_ru||'Разбор по правилу урока сейчас короткий. Можно продолжить упражнение.')+'</p>';
     };
     const ask=(m)=>{
       const out=$('#ai-tutor-out');if(out){out.hidden=false;out.textContent='Разбираю этот ответ…';}
       const req=window.AiTutor.buildRequest(m,q,{user_answer:answers.join(' '),is_correct:false,hint_used:hinted,codes:aiCodes});
       window.AiTutor.callTutor(req,18000).then(paint);
     };
     if($('#ai-why'))$('#ai-why').onclick=()=>ask('explain_error');
     if($('#ai-rule'))$('#ai-rule').onclick=()=>ask('explain_rule');
     if(aiRepeat)ask('explain_error');
     const extra=window.AiTutor.takeRemediation(byId);
     if(extra.length)window.AiTutor.spliceRemediation(queue,position,extra.map(x=>x.id));
   }
   renderStats();save();
   cancelAdvance();
   if(result.correct&&!reveal&&!hinted){
     advanceTimer=setTimeout(()=>{advanceTimer=null;if(checked)nextQuestion();},180);
   }else{
     const next=$('#next-button');if(next)next.focus({preventScroll:true});
   }
 }
 function nextQuestion(){cancelAdvance();draft=null;retrying=false;position++;if(!['ordered','shuffle','homework'].includes(mode)&&sessionAttempts>=cfg.session.maxAttempts)position=queue.length;render();$('#exercise').scrollIntoView({block:'start',behavior:'auto'});focusAnswer();}
 function startHomework(lessonId,part,section){
   const H=window.Homework,pack=(H.packs(questions,course).find(p=>p.lesson_id===lessonId));
   if(!pack)return;
   hwLesson=lessonId;hwPart=part||'exercises';mode='homework';topic='all';sourceFilter=null;vocabRole=null;activeLesson=null;activeStep=null;courseBlock=lessonId;
   const attempt=H.ensureAttempt(state,lessonId);
   const all=(part==='words'?pack.homework.word_question_ids||[]:pack.homework.exercise_ids).filter(id=>byId.has(id));
   const n=H.sectionCount(all);
   let sec=section==null?H.sectionOf(H.resumeIndex(all,attempt)):Math.floor(Number(section)||0);
   sec=Math.max(0,Math.min(n-1,sec));
   hwSection=sec;
   queue=H.sliceSection(all,sec);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=H.resumeIndex(queue,attempt);checked=false;resetCounts();
   if(!queue.length){renderHomework();showView('homework');return;}
   render();showView('practice');
 }
 function startBlockReview(failedId){
   const q=byId.get(failedId);if(!q||!window.Homework)return;
   if(hwLesson)hwReturn={lesson:hwLesson,part:hwPart,section:hwSection};
   const iso=window.Homework.isolatedFor(q,questions,state);
   const others=window.Homework.otherTopicFillers(q,questions,state,5);
   const ids=window.Homework.remediationQueue(failedId,iso,others);
   remediationNote=(window.Homework.ruleText(q)||'').split('\n').map(s=>s.trim()).find(Boolean)||'';
   startCustom(ids,'remediation');
 }
 function renderHomework(){
   const root=$('#homework-content');if(!root||!window.Homework)return;
   const list=window.Homework.packs(questions,course);
   const weak=window.Homework.weakSpots(state,questions);
   const pick=hwLesson&&list.find(p=>p.lesson_id===hwLesson)||list[0];
   if(!pick){root.innerHTML='<div class="panel"><p>Пакеты ДЗ 1–1…1–3 ещё не собраны из банка.</p></div>';return;}
   const pack=pick,attempt=window.Homework.ensureAttempt(state,pack.lesson_id),h=pack.homework;
   const ready=window.Homework.sheetReady(attempt,pack);
   const exP=window.Homework.partProgress(attempt,h.exercise_ids),wP=window.Homework.partProgress(attempt,h.word_question_ids||[]);
   const exN=window.Homework.sectionCount(h.exercise_ids),wN=window.Homework.sectionCount(h.word_question_ids||[]);
   const resumeAt=window.Homework.resumeIndex(h.exercise_ids,attempt);
   const check=key=>`<label class="pref-check"><input type="checkbox" data-hw-check="${key}" ${attempt.checklist[key]?'checked':''}> ${{method:'Повторила методичку',exercises:'Упражнения сборника',words:'Слова урока',external_test:'Зафиксировала на сайте',keyboard:'Казахская раскладка на телефоне',cheat:'Шпаргалка сохранена'}[key]||key}</label>`;
   const secBtns=(part,n)=>n<=1?'':`<div class="jump-row">${Array.from({length:n},(_,i)=>`<button type="button" class="chip" data-hw-part="${part}" data-hw-sec="${i}">Часть ${i+1}</button>`).join('')}</div>`;
   root.innerHTML=`<div class="panel homework-head"><p class="eyebrow">УРОК ${esc(pack.lesson_id)}</p><h2>${esc(h.title)}</h2><p>Готово ${exP.done} из ${exP.total} упражнений · ${wP.done} из ${wP.total} слов. Это задания урока, не повторение.</p><button type="button" class="primary-button" data-hw-part="exercises">${exP.done?('Продолжить с задания '+(resumeAt+1)):'Открыть упражнения'}</button></div>
     <div class="panel"><div class="jump-row">${list.map(p=>`<button type="button" class="chip" data-hw-lesson="${p.lesson_id}" ${p.lesson_id===pack.lesson_id?'aria-pressed="true"':''}>${esc(p.homework.title)}</button>`).join('')}</div>
       <p class="small">Открытие правила не повышает уровень. Готовый ответ — как подсказка в практике. Можно выйти в любой момент: ответы уже в листе.</p>
       <ol class="learning-steps">
         <li>Повторить методичку — ${h.method_url?`<a href="${esc(h.method_url)}" target="_blank" rel="noopener noreferrer">${esc(h.method_title)}</a>`:'ссылка на материал урока'}${check('method')}</li>
         <li>Упражнения сборника (${h.exercise_ids.length} пунктов, по ${window.Homework.HW_SECTION} в части) <button type="button" class="secondary-button" data-hw-part="exercises">${exP.done?'Продолжить упражнения':'Открыть упражнения'}</button>${secBtns('exercises',exN)}</li>
         <li>Слова урока: сначала узнать (казахский → русский), потом написать. ${h.word_ids.length} слов. <button type="button" class="secondary-button" data-hw-part="words">${wP.done?'Продолжить слова':'Открыть слова'}</button>${secBtns('words',wN)}</li>
         <li>Внешний тест: ${(h.external_tests&&h.external_tests.length?h.external_tests:[h.external_test_url]).filter(Boolean).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`).join(' · ')||'URL в PDF не найден'}. Мы результат сайта не проверяем и не обещаем зачёт на BatylBol. ${check('external_test')}</li>
         ${(h.extras||[]).map(x=>'<li>'+check(x)+'</li>').join('')}
       </ol>
       <p class="small">Повторно открыть лист можно. «Новая сдача» не стирает прошлый файл. Пауза на карточке возвращает сюда без потери набора.</p>
       <div class="review-actions"><button type="button" class="text-button" data-hw-new>Новая сдача</button></div>
     </div>
     <div class="panel"><h2>Слабые места</h2>${weak.length?weak.map(w=>`<div class="confusion-row"><div><strong>${esc(window.Homework.weakLabel(w.key))}</strong><p class="small">${w.count} раз за 14 дней. Ждали: ${esc(w.expected)} · написала: ${esc(w.actual)}</p></div><button type="button" class="secondary-button" data-weak="${esc(w.cardId)}">Разобрать</button></div>`).join(''):'<p>Пока нет устойчивых слабых мест.</p>'}</div>
     <div class="panel" ${ready?'':'hidden'}><h2>Выгрузка листа</h2>
       <p>Упражнения и слова этого листа отмечены. Тест сайта может остаться не отмеченным — в файле это будет видно.</p>
       <div class="review-actions">
         <button type="button" class="primary-button" data-hw-html>Скачать лист</button>
         <button type="button" class="secondary-button" data-hw-json>Скачать данные</button>
         <button type="button" class="secondary-button" data-hw-print>Печать / PDF</button>
       </div>
     </div>`;
   root.querySelectorAll('[data-hw-lesson]').forEach(b=>b.onclick=()=>{hwLesson=b.dataset.hwLesson;renderHomework();});
   root.querySelectorAll('[data-hw-part]').forEach(b=>b.onclick=()=>startHomework(pack.lesson_id,b.dataset.hwPart,b.dataset.hwSec==null?undefined:Number(b.dataset.hwSec)));
   root.querySelectorAll('[data-hw-check]').forEach(el=>el.onchange=()=>{window.Homework.markChecklist(state,pack.lesson_id,el.dataset.hwCheck,el.checked);save();});
   const neu=root.querySelector('[data-hw-new]');if(neu)neu.onclick=()=>{if(!window.confirm('Начать новую сдачу? Прошлый экспорт останется в истории попытки.'))return;window.Homework.newAttempt(state,pack.lesson_id);save();renderHomework();};
   root.querySelectorAll('[data-weak]').forEach(b=>b.onclick=()=>startBlockReview(b.dataset.weak));
   const stamp=window.Homework.fileStamp();
   const htmlBtn=root.querySelector('[data-hw-html]'),jsonBtn=root.querySelector('[data-hw-json]'),printBtn=root.querySelector('[data-hw-print]');
   if(htmlBtn)htmlBtn.onclick=()=>{attempt.submitted_at=Date.now();attempt.export_rev=(attempt.export_rev||0)+1;attempt.weak_tags=weak.map(w=>w.key);save();downloadProgress(window.Homework.exportHtml(attempt,pack,questions),'homework-'+pack.lesson_id+'-'+stamp+'.html');};
   if(jsonBtn)jsonBtn.onclick=()=>{attempt.submitted_at=Date.now();attempt.export_rev=(attempt.export_rev||0)+1;attempt.weak_tags=weak.map(w=>w.key);save();downloadProgress(JSON.stringify(window.Homework.exportJson(attempt,pack),null,2),'homework-'+pack.lesson_id+'-'+stamp+'.json');};
   if(printBtn)printBtn.onclick=()=>{attempt.submitted_at=Date.now();save();const html=window.Homework.exportHtml(attempt,pack,questions);const w=window.open('','_blank');if(!w)return;w.document.write(html);w.document.close();w.focus();w.print();};
 }
 function renderPath(){
   const root=$('#path-content');if(!root||!window.GrammarPath)return;
   const G=window.GrammarPath;
   state.grammarPath=G.migrateProgress(state.grammarPath||G.emptyProgress());
   const gp=state.grammarPath,list=G.lessons();
   const crumb=(les,ch)=>{
     const bits=['<button type="button" class="text-button" data-path-hub>Уроки</button>'];
     if(les)bits.push('<span>→</span><button type="button" class="text-button" data-path-les="'+esc(les.id)+'">Урок '+esc(les.id)+'</button>');
     if(ch)bits.push('<span>→</span><strong>'+esc(ch.title)+'</strong>');
     return '<nav class="path-crumb">'+bits.join(' ')+'</nav>';
   };
   const bindCrumb=()=>{
     const h=root.querySelector('[data-path-hub]');if(h)h.onclick=()=>{gp.phase='hub';gp.lessonId=null;gp.chapterId=null;save();renderPath();};
     const l=root.querySelector('[data-path-les]');if(l)l.onclick=()=>{G.startLesson(state,l.dataset.pathLes);save();renderPath();};
   };
   if(gp.phase==='hub'||gp.phase==='pick'||!gp.lessonId){
     root.innerHTML=`<div class="panel"><h2>Уроки и правила</h2><p>Разбираем только то, что уже было на занятиях. Это не домашка и не «Пора повторить».</p>
       <div class="path-lessons">${list.map(les=>{
         const n=les.chapters.length,done=les.chapters.filter(c=>gp.completedChapters&&gp.completedChapters[les.id+':'+c.id]).length;
         return `<button type="button" class="lesson" data-les="${les.id}"><span class="number">${esc(les.id)}</span><div><h3>${esc(les.title)}</h3><p>Глав ${done} из ${n}</p></div><span class="small">${done?'Можно повторить':'Продолжить'}</span></button>`;
       }).join('')}</div>
       <p class="small">Прохождение не ставит Good словам словаря.</p></div>`;
     root.querySelectorAll('[data-les]').forEach(b=>b.onclick=()=>{G.startLesson(state,b.dataset.les);save();renderPath();});
     return;
   }
   const les=G.lesson(gp.lessonId);
   if(!les){gp.phase='hub';renderPath();return;}
   if(gp.phase==='lesson'||!gp.chapterId){
     root.innerHTML=`<div class="panel">${crumb(les,null)}<h2>Урок ${esc(les.id)}</h2><p>${esc(les.title)}</p>
       <p class="small">Глава — один кусок правила. Не прыгай через непонятое.</p>
       <div class="path-chapters">${les.chapters.map((c,i)=>{
         const ok=gp.completedChapters&&gp.completedChapters[les.id+':'+c.id];
         return `<button type="button" class="secondary-button" data-ch="${c.id}">Глава ${i+1} из ${les.chapters.length} · ${esc(c.title)}${ok?' ✓':''}</button>`;
       }).join('')}</div>
       <p><button type="button" class="text-button" data-path-hub>Ко всем урокам</button></p></div>`;
     bindCrumb();
     root.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{G.startChapter(state,les.id,b.dataset.ch);save();renderPath();});
     return;
   }
   const ch=G.chapter(les.id,gp.chapterId);if(!ch){gp.phase='lesson';renderPath();return;}
   const beats=ch.beats||[],beat=beats[gp.beat];
   if(!beat){
     G.markChapterDone(gp,les.id,ch.id);gp.phase='lesson';gp.chapterId=null;save();renderPath();return;
   }
   const head=`${crumb(les,ch)}<p class="small">Глава ${les.chapters.findIndex(c=>c.id===ch.id)+1} из ${les.chapters.length} · шаг ${gp.beat+1} из ${beats.length}</p>`;
   const nextBeat=()=>{gp.beat++;save();renderPath();};
   const letters=state.prefs.letters;
   const kb=letters?`<div class="letter-keyboard">${[...'әғқңөұүһі'].map(ch=>'<button type="button" data-letter="'+ch+'">'+ch+'</button>').join('')}</div>`:'';
   function beatPlain(b){
     if(!b)return '';
     const clip=s=>String(s||'').trim();
     if(b.k==='sound')return clip([b.letter,b.anchor,b.art,b.ex,b.warn].filter(Boolean).join('. '));
     if(b.k==='why'||b.k==='fold')return clip((b.t?b.t+'. ':'')+(b.b||''));
     if(b.k==='algo')return clip((b.t?b.t+'. ':'')+(b.items||[]).join('. '));
     if(b.k==='slots'){
       const parts=(b.parts||[]).map(p=>typeof p==='string'?p:(p&&(p.t||p.text||p.name))||'').filter(Boolean);
       return clip((b.t?b.t+'. ':'')+parts.join('. '));
     }
     if(b.k==='bridge'){
       const ru=String(b.ru||'').trim();
       const kz=String(b.kz||'').trim();
       const ruLine=/^в русск/i.test(ru)?ru:(ru?'В русском: '+ru:'');
       const kzLine=/^в казах/i.test(kz)?kz:(kz?'В казахском: '+kz:'');
       return [ruLine,kzLine,b.do||b.doit||''].filter(Boolean).join('\n');
     }
     if(b.k==='ex')return clip((b.from||'')+' → '+(b.to||'')+(b.ru?' ('+b.ru+')':'')+(b.why?' '+b.why:''));
     if(b.k==='trap')return clip((b.bad||'')+' → '+(b.good||'')+(b.why?' '+b.why:''));
     if(b.k==='goal')return clip(b.t||'');
     return clip(b.t||b.b||'');
   }
   function paperAlready(s){
     const paper=root.querySelector('.path-paper');
     if(!paper||!s)return false;
     const n=String(s).replace(/\s+/g,'').slice(0,80).toLowerCase();
     if(n.length<12)return false;
     const clone=paper.cloneNode(true);
     const bar=clone.querySelector('.path-ai-bar');if(bar)bar.remove();
     return String(clone.innerText||'').replace(/\s+/g,'').toLowerCase().includes(n);
   }
   function pathLocalText(chapter,kind,cur){
     const beats=(chapter&&chapter.beats)||[];
     const clip=s=>String(s||'').trim().slice(0,800);
     const first=k=>beats.find(b=>b.k===k);
     const LOOK='Смотри текст этого шага выше.';
     const take=(list)=>{
       for(const raw of list){
         const t=clip(raw);if(!t)continue;
         if(paperAlready(t))continue;
         return t;
       }
       return '';
     };
     if(kind==='simplify'){
       if(cur&&cur.k==='sound'){
         const t=clip([cur.letter,cur.art,cur.ex,cur.warn].filter(Boolean).join('. '));
         if(t)return t;
       }
       if(cur&&['why','fold','algo','slots','bridge','ex','trap'].includes(cur.k)){
         const t=clip(beatPlain(cur));if(t)return t;
       }
       const fallback=[];
       const w=first('why');if(w)fallback.push(w.b||w.t);
       const a=first('algo');if(a)fallback.push((a.t?a.t+'. ':'')+(a.items||[]).slice(0,3).join('. '));
       return take(fallback)||LOOK;
     }
     if(kind==='ru'){
       const cand=[];
       if(cur&&cur.k==='bridge')cand.push(beatPlain(cur));
       const br=first('bridge');if(br)cand.push(beatPlain(br));
       return take(cand)||LOOK;
     }
     if(kind==='examples'){
       const lines=[];
       const add=t=>{const x=clip(t);if(x&&!lines.includes(x)&&x.length>1)lines.push(x);};
       if(cur){
         if(cur.k==='sound'&&cur.ex)add(cur.ex);
         if(cur.k==='ex')add(beatPlain(cur));
         if(cur.k==='trap')add(beatPlain(cur));
       }
       for(const b of beats){
         if(lines.length>=2)break;
         if(b===cur||b.k==='ask')continue;
         if(b.k==='sound'&&b.ex)add(b.ex);
         if(b.k==='ex')add(beatPlain(b));
         if(b.k==='trap')add(beatPlain(b));
       }
       const clean=lines.filter(t=>cur&&(cur.k==='sound'||cur.k==='ex'||cur.k==='trap')?true:!paperAlready(t));
       if(!clean.length)return LOOK;
       return clean.slice(0,2).join('\n');
     }
     if(cur&&cur.k!=='goal'){
       const t=clip(beatPlain(cur));
       if(t)return t;
     }
     return LOOK;
   }
   function pathAskChips(lessonId,chapter){
     const id=chapter.id||'';
     const simplify=['Объясни ещё проще','Объясни ещё проще','simplify'];
     const pair=(label,q,kind)=>[label,q,kind];
     if(lessonId==='1-1'&&id!=='1-1-ae')return [simplify,pair('Сравни с русским','Чем это отличается от русского мягкого согласного?','ru'),pair('Ещё 2 примера','Дай ещё 2 пары на знакомых словах.','examples')];
     if(id==='1-1-ae'||id==='1-2-a')return [simplify,pair('Сравни с русским','Почему твёрдое берёт А, а мягкое Е?','ru'),pair('Ещё 2 примера','Дай ещё 2 слова курса: только гласная А или Е.','examples')];
     if(id==='1-2-b'||id==='1-2-traps')return [simplify,pair('Сравни с русским','Почему не *адамлар и не *жердер?','ru'),pair('Ещё 2 примера','Дай ещё 2 основы: только стык Л, Д или Т.','examples')];
     if(id==='1-2-slot'||id==='1-2-glue')return [simplify,pair('Сравни с русским','Чем казахское множественное отличается от русской формы «книги»?','ru'),pair('Ещё 2 примера','Собери ещё 2 формы двумя рычагами на словах курса.','examples')];
     if(id==='1-3-qty'||id==='1-3-qty2')return [simplify,pair('Сравни с русским','Почему «две книги», а по-казахски без -тар?','ru'),pair('Ещё 2 примера','Дай ещё 2 примера без множественного.','examples')];
     if(lessonId==='1-3')return [simplify,pair('Сравни с русским','Как собрать число по разрядам, не списком?','ru'),pair('Ещё 2 примера','Дай ещё 2 числа из курса.','examples')];
     if(id==='2-1-emes')return [simplify,pair('Сравни с русским','Куда переезжает окончание при емес?','ru'),pair('Ещё 2 примера','Дай ещё 2 отрицания на знакомых словах.','examples')];
     if(id==='2-1-ba'||id==='2-2-rq'||id==='2-3-q'||id==='2-3-qstem')return [simplify,pair('Сравни с русским','На какой звук смотрит вопросительная частица?','ru'),pair('Ещё 2 примера','Дай ещё 2 вопроса из этой сетки курса.','examples')];
     if(lessonId==='2-1')return [simplify,pair('Сравни с русским','Почему по-русски «Я врач» без «есть», а здесь нужна бирка?','ru'),pair('Ещё 2 примера','Дай ещё 2 формы мен/сен/сіз на словах курса.','examples')];
     if(id==='2-2-hi'||id==='2-3-bye')return [simplify,pair('Сравни с русским','Почему это готовая фраза, а не новое окончание?','ru'),pair('Ещё 2 примера','Покажи сетку по адресату ещё раз.','examples')];
     if(lessonId==='2-2')return [simplify,pair('Сравни с русским','Почему не переносим умный/умная/умные?','ru'),pair('Ещё 2 примера','Дай ещё 2 формы біз/сендер/сіздер.','examples')];
     if(id==='2-3-ol'||id==='2-3-olar')return [simplify,pair('Сравни с русским','Почему у ол нет мын?','ru'),pair('Ещё 2 примера','Дай ещё 2 фразы с ол/олар.','examples')];
     if(lessonId==='2-3')return [simplify,pair('Сравни с русским','Чем порядковое отличается от екі кітап?','ru'),pair('Ещё 2 примера','Дай ещё 2 порядковых из курса.','examples')];
     return [simplify,pair('Сравни с русским','Чем это правило отличается от русского?','ru'),pair('Ещё 2 примера','Дай ещё 2 примера на словах текущего урока.','examples')];
   }
   function attachPathAsk(){
     const paper=root.querySelector('.path-paper');if(!paper||paper.querySelector('#path-ask'))return;
     const chips=pathAskChips(les.id,ch);
     paper.insertAdjacentHTML('beforeend',`<div class="path-ai-bar"><button type="button" class="text-button" id="path-ask">Не поняла — спросить про это правило</button><div id="path-ask-panel" class="ai-tutor-out" hidden><p class="small">Разбор только этой главы. Не ставит оценку произношению и не открывает будущие темы.</p><div class="ai-tutor-actions">${chips.map(([label,q,kind])=>`<button type="button" class="secondary-button" data-path-q="${esc(q)}" data-path-kind="${esc(kind||'simplify')}">${esc(label)}</button>`).join('')}</div><label class="input-label" for="path-ask-q">Свой вопрос</label><input id="path-ask-q" type="text" maxlength="400" autocomplete="off"><button type="button" class="text-button" id="path-ask-send">Спросить</button><div id="path-ask-out" hidden></div></div></div>`);
     const open=$('#path-ask'),panel=$('#path-ask-panel');
     if(open)open.onclick=()=>{if(panel)panel.hidden=!panel.hidden;};
     const showLocal=kind=>{
       const out=$('#path-ask-out');if(!out)return;
       out.hidden=false;
       out.innerHTML='<p class="small">Это пересказ этого шага.</p><p>'+esc(pathLocalText(ch,kind,beat))+'</p>';
     };
     const failAsk=()=>{
       const out=$('#path-ask-out');if(!out)return;
       out.hidden=false;
       out.textContent='Не разобрала этот вопрос. Смотри текст шага выше.';
     };
     const stub=s=>!s||s.length<12||/короткий разбор|Правило уже на карточке|недоступен|Проверь форму по правилу|Проверь правило текущего урока|Полный ответ не показываю/.test(s);
     $$('[data-path-kind]').forEach(b=>b.onclick=()=>showLocal(b.dataset.pathKind||'simplify'));
     const go=$('#path-ask-send');
     if(go)go.onclick=()=>{
       const q=($('#path-ask-q')&&$('#path-ask-q').value.trim())||'';
       if(!q){showLocal('simplify');return;}
       const out=$('#path-ask-out');if(out){out.hidden=false;out.textContent='Разбираю этот ответ…';}
       if(!window.AiTutor||!window.AiTutor.callTutor){failAsk();return;}
       const tRules=(window.AiRules&&window.AiRules.allowedRuleIds([les.id]))||[];
       const dummy={id:'path:'+les.id+':'+ch.id,lessonId:les.id,title:'Глава: '+ch.title,stimulus:'Шаг: '+beatPlain(beat).slice(0,280),fields:[{answers:['']}],ruleIds:tRules};
       const req=window.AiTutor.buildRequest('explain_rule',dummy,{user_question:q,is_correct:true,hint_used:false,codes:[],allowed_lesson_ids:[les.id]});
       window.AiTutor.callTutor(req,18000).then(resp=>{
         const msg=resp&&typeof resp.message_ru==='string'?resp.message_ru:'';
         if(!stub(msg)){if(out)out.textContent=msg;return;}
         failAsk();
       }).catch(()=>failAsk());
     };
   }
   if(beat.k==='goal'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="eyebrow">ЦЕЛЬ ГЛАВЫ</p><h2>После этой главы</h2><p>${esc(beat.t)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='sound'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="eyebrow">КАК ПРИМЕРНО ПОЧУВСТВОВАТЬ</p><h2 lang="kk">${esc(beat.letter)}</h2><p><strong>Русский якорь:</strong> ${esc(beat.anchor)}</p><p>${esc(beat.art)}</p><p lang="kk">${esc(beat.ex)}</p><p class="small">${esc(beat.warn)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='why'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>${esc(beat.t)}</h2><p>${esc(beat.b)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='bridge'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Сравни с русским</h2>
       <p><strong>В русском ты привыкла…</strong> ${esc(beat.ru)}</p>
       <p><strong>В казахском иначе…</strong> ${esc(beat.kz)}</p>
       <p><strong>Поэтому делай…</strong> ${esc(beat.do)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='slots'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Из чего это собирается</h2><p>${esc(beat.t)}</p>
       <div class="path-slots">${(beat.parts||[]).map(p=>'<span class="path-slot">'+esc(p.l)+'</span>').join('<span class="path-plus">+</span>')}</div>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='algo'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>${esc(beat.t)}</h2><ol class="learning-steps">${(beat.items||[]).map(i=>'<li>'+esc(i)+'</li>').join('')}</ol>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='ex'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Разобранный пример</h2>
       <p lang="kk" class="stimulus">${esc(beat.from)} → ${esc(beat.to)}</p>
       <p>${esc(beat.ru)}</p>
       <p>Слот: <strong lang="kk">${esc(beat.slot)}</strong>. ${esc(beat.why)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='trap'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Не перепутай</h2>
       <p>Нельзя: <s lang="kk">${esc(beat.bad)}</s></p>
       <p>Нужно: <strong lang="kk">${esc(beat.good)}</strong></p>
       <p>${esc(beat.why)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='fold'){
     root.innerHTML=`<div class="panel path-paper">${head}<details open><summary>${esc(beat.t)}</summary><p>${esc(beat.b)}</p></details>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();attachPathAsk();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='ask'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="phase-label">${beat.type==='one_prod'?'Самостоятельно':beat.type==='trap_choice'?'Ловушка':'Проверь понимание'}</p>
       <h2>${esc(beat.prompt)}</h2>
       ${beat.stem?'<p class="stimulus" lang="kk">'+esc(beat.stem)+'</p>':''}
       <form id="path-form"><input id="path-answer" type="text" autocomplete="off" spellcheck="false">${kb}
         <div id="path-fb" class="feedback" hidden></div>
         <div class="lesson-actions"><button type="submit" class="primary-button">Проверить</button>
           <button type="button" class="secondary-button" id="path-rule">Подсказка</button>
           <button type="button" class="text-button" id="path-idk">Не знаю</button></div></form></div>`;
     bindCrumb();
     const input=$('#path-answer');if(input)input.focus();
     $$('#path-form [data-letter]').forEach(b=>b.onclick=()=>{const s=input.selectionStart||input.value.length,e=input.selectionEnd||s;input.value=input.value.slice(0,s)+b.dataset.letter+input.value.slice(e);input.focus();});
     let pathPeek=false;
     $('#path-rule').onclick=()=>{pathPeek=true;$('#path-fb').hidden=false;$('#path-fb').className='feedback hinted';$('#path-fb').innerHTML='<p>'+esc(beat.rule_line||beat.trap||'Собери слот, потом напиши форму целиком.')+'</p>';};
     $('#path-idk').onclick=()=>{pathPeek=true;$('#path-form').requestSubmit();};
     $('#path-form').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();});
     $('#path-form').onsubmit=e=>{
       e.preventDefault();
       if(e.isComposing||(e.nativeEvent&&e.nativeEvent.isComposing))return;
       const val=$('#path-answer').value,ok=G.evalCheck(beat,val);
       G.recordPath(state,beat,ok,pathPeek);
       if(ok&&!pathPeek){nextBeat();return;}
       const box=$('#path-fb');box.hidden=false;box.className='feedback error';
       const exp=[].concat(beat.answers||[beat.answer])[0];
       box.innerHTML='<p>'+esc(G.diagnoseProd(exp,val))+'</p>'+(beat.trap?'<p>'+esc(beat.trap)+'</p>':'')+'<p>Набери верную форму целиком: <strong lang="kk">'+esc(exp)+'</strong></p>';
       $('#path-form').onsubmit=ev=>{ev.preventDefault();if(!G.evalCheck(beat,$('#path-answer').value))return;nextBeat();};
       save();
     };
     return;
   }
   nextBeat();
 }
 function renderEmpty(){
   if(hwReturn&&mode==='remediation'){
     const back=hwReturn;hwReturn=null;hwLesson=back.lesson;hwPart=back.part;hwSection=back.section||0;mode='homework';showView('homework');save();return;
   }
   if(mode==='homework'){
     const pack=window.Homework.packs(questions,course).find(p=>p.lesson_id===hwLesson);
     if(pack){
       const all=hwPart==='words'?pack.homework.word_question_ids||[]:pack.homework.exercise_ids;
       const done=new Set((state.homeworkAttempts[hwLesson]&&state.homeworkAttempts[hwLesson].items||[]).map(i=>i.id));
       if(all.every(id=>done.has(id))){
         if(hwPart==='exercises')window.Homework.markChecklist(state,hwLesson,'exercises',true);
         if(hwPart==='words')window.Homework.markChecklist(state,hwLesson,'words',true);
       }
     }
     showView('homework');save();return;
   }
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
   $('#exercise').innerHTML='<div class="empty-state"><img class="empty-graphic" src="assets/graphics/g04-completion.svg" alt=""><h2>Ещё один шаг. Уже твой.</h2><p>'+(complete?'Проверка идеи пройдена. ':'Подход завершён. ')+'Самостоятельно: '+sessionCorrect+' из '+sessionAttempts+'. С подсказкой: '+sessionAssisted+'. Ошибок: '+(sessionAttempts-sessionCorrect-sessionAssisted)+'.</p><p>'+(waiting?'Ещё закрепляем '+waiting+' карточек. Они сохраняются для повторения.':'Можно остановиться; карточки вернутся по расписанию.')+'</p><div class="finish-actions"><button type="button" class="primary-button" id="restart">'+(lesson?(complete?(activeStep<lesson.chunks.length-1?'Следующая идея':'Выбрать следующий урок'):'Вернуться к объяснению'):'Ещё несколько заданий')+'</button><button type="button" class="secondary-button" id="back-to-learning">Закончить</button></div>'+(help?'<div class="panel"><h3>'+esc(help.title)+'</h3><p>Эта ошибка повторялась. Можно отдельно потренировать трудный шаг.</p><button type="button" class="secondary-button" id="start-remedy">Разобрать и проверить</button></div>':'')+'</div>';
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
   $('#remedy-check').onclick=()=>{remediationNote='';startCustom(help.ids,'remediation');remediation=type;save();};
 }
 function startCustom(ids,kind='words'){
   activeLesson=null;activeStep=null;sourceFilter=null;topic='all';mode=kind;
   queue=kind==='remediation'?ids.filter(id=>byId.has(id)):ids.filter(eligible);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;resetCounts();render();showView('practice');
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
   const blob=new Blob([text],{type:/\.html$/i.test(name)?'text/html;charset=utf-8':'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function promote(id){
   const w=catalog.words.find(w=>w.id===id);if(!w)return;
   const policy=window.MemoryPolicy;
   if(policy&&!policy.canAddIncidental(state)){
     const msg=$('#save-status');
     if(msg){msg.hidden=false;msg.textContent='На этой неделе уже 8 контекстных слов в обязательное. Дальше только глоссарий.';}
     return;
   }
   state.vocabulary[id]={...(state.vocabulary[id]||{times_seen:0,last_seen:0}),target_or_context:'target'};
   if(policy){const week=policy.incidentalWeek(state);week.added+=1;state.incidentalWeek=week;}
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
   const titles={'1-1':'1–1','1-2':'1–2','1-3':'1–3','2-1':'2–1','2-2':'2–2','2-3':'2–3'};
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
     <div class="panel rules-search"><label for="rules-q">Найти правило или слово</label><input id="rules-q" type="search" placeholder="казахское слово или тема" autocomplete="off"><p class="small">Поиск по этой странице. Несуществующее слово не становится новой статьёй.</p></div>
     <div class="panel"><h2>Сингармонизм без путаницы</h2><p>Для выбора окончания нужны две опоры: <strong>последний слог</strong> определяет гласную, <strong>последняя буква</strong> — первую согласную. Не пытайся запомнить шесть окончаний как шесть отдельных правил.</p><div class="table-wrap"><table><thead><tr><th scope="col">Последняя буква слова</th><th scope="col">Последний слог задний<br>А О Ұ Ы</th><th scope="col">Последний слог передний<br>Ә Ө Ү І Е</th></tr></thead><tbody><tr><th scope="row">Гласная, Р, Й, У → Л</th><td lang="kk">-лар · қалалар</td><td lang="kk">-лер · көшелер</td></tr><tr><th scope="row">Л, М, Н, Ң, Ж, З → Д</th><td lang="kk">-дар · адамдар</td><td lang="kk">-дер · сөздер</td></tr><tr><th scope="row">Глухая; Б, В, Г, Д → Т</th><td lang="kk">-тар · кітаптар</td><td lang="kk">-тер · жігіттер</td></tr></tbody></table></div><p>Пример рассуждения: кі-<strong>тап</strong> → последний слог задний → А. Последняя буква П → Т. Получаем кітап + тар = <span lang="kk">кітаптар</span>.</p><p>И и У разбираем в составе слова: иттер, но ми (мозг) → милар. -мен — особое падежное окончание без чередования А/Е. Остальные группы букв в методичке — учебная схема; полный алфавит не нужно смешивать с двумя основными группами гласных.</p><p><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Правило множественного числа и примеры</a></p></div>
     <div class="panel"><h2>Числа: лестница, не список до 9999</h2>
     <p>Мозг не учит «47» как отдельное слово. Сначала <strong>0–10</strong>, потом круглые десятки, потом отличаем пары <span lang="kk">сегіз / сексен</span> (8 и 80). Составные собираем из частей.</p>
     <ol class="learning-steps"><li>0–10 — отдельные слова, вразброс, не считая по порядку.</li><li>10, 20, 30, 40, 50 — тоже отдельные слова (жиырма ≠ екі + он).</li><li>60–90 рядом с 6–9: алты↔алпыс, жеті↔жетпіс, сегіз↔сексен, тоғыз↔тоқсан.</li><li>Двузначные сначала с эхом: 88, 55, 66 — в одном числе 8 и 80, 5 и 50.</li><li>Сотни: жүз. Сначала 550, 880, 808.</li><li>Тысячи: мың. Сначала 1550, 8080, 1888.</li></ol>
     <p>47 = 40 + 7 → <span lang="kk">қырық жеті</span>. Для 100 достаточно <span lang="kk">жүз</span>. Для 1001–1999: <span lang="kk">бір мың …</span>.</p>
     <p>Число перед существительным уже сообщает количество: екі кітап, көп адам.</p>
     <p class="small">В «Учить» лестница идёт сверху вниз. В «Повторять» можно взять нужную ступень. Конструктор чисел — внутри урока.</p></div>
     <div class="panel"><h2>Мягкое или твёрдое?</h2><p>Это названия групп из твоего курса для выбора окончаний. Они не совпадают с русской классификацией согласных по мягкости. Формула «слово только мягкое или только твёрдое» — упрощение старта, не универсальное правило: смешанные слова смотрят на последний однозначный слог.</p><div class="pair-strip">${['Ә — А','Ө — О','І — Ы','Ү — Ұ','К — Қ','Г — Ғ'].map(s=>`<span lang="kk">${s}</span>`).join('')}</div><p><strong>Мягкая группа:</strong> Ә, Ө, І, Ү, Е, К, Г; в таблице курса также Э.</p><p><strong>Твёрдая группа:</strong> А, О, Ы, Ұ, Қ, Ғ, Я; в таблице курса также Ё.</p><p><strong>Остальные буквы зависят от слова.</strong> Например, Ң не является «всегда твёрдой»: сравни таң и тең.</p><p class="small">И, У и Ю не нужно угадывать отдельно от слова. Ит и би — мягкие; ми («мозг»), су, ту и у — твёрдые. Сүю — мягкое; аю и ою — твёрдые.</p><details><summary>Смешанные слова и разбор по слогам</summary><p>В мұғалім есть твёрдые и мягкий слог. Для окончания смотрим на последний лім: мұғалімдер. В іссапар последний слог пар твёрдый.</p><p>В учебном разборе слог только с И или У согласуется с предыдущим определённым слогом. Если предыдущего нет — со следующим: ғы-лы-ми, и-не. Для конкретных слов здесь сохранены разборы из ключей курса.</p><p>Окончание -мен — особый случай: досыммен не становится целиком мягким словом. В упражнении с Аманкелдіұлымен разбираем написанные слоги; новое множественное окончание к готовой падежной форме не прибавляем.</p></details></div>
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
   const rulesQ=$('#rules-q');
   if(rulesQ)rulesQ.oninput=()=>{
     const n=core.normalize(rulesQ.value);
     $$('#rules-content .panel').forEach(p=>{
       if(p.classList.contains('rules-search'))return;
       p.hidden=!!(n&&!core.normalize(p.textContent).includes(n));
     });
   };
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
 function resetProgress(){
   if(!window.confirm('Сбросить весь прогресс в этом браузере? Ответы, ошибки, заметки и ассоциации будут очищены.'))return;
   try{localStorage.setItem(BACKUP,P.serialize(state));}catch{}const retainedPackages=state.lesson_packages;state=P.empty();state.lesson_packages=retainedPackages;records=state.records;learningState=state.learning;storageReadError=null;topic='all';mode='smart';sourceFilter=null;activeLesson=null;activeStep=null;queue=[];practiceIds=[];position=0;showView('today');
 }
 const learning=window.LearningUI.create({
   get state(){return learningState;},save,startLesson,startCourse,courseJumpMarkup,bindCourseJump,eligible,missing:ids=>[...new Set(ids.flatMap(id=>catalog.missingPrerequisites(byId.get(id),state)))],practiceWords,association:key=>state.associations[key]?.text||'',setAssociation,today:()=>showView('today')
 });
 const dashboard=window.DashboardUI.create({
   state:()=>state,questions:()=>questions,eligible,hasSession:()=>queue.length>position,
   action(next){
     if(next.startsWith('remedy:')){startRemedy(next.slice(7));return;}
     if(next==='homework'){hwLesson=null;showView('homework');return;}
     if(next==='path'){showView('path');return;}
     if(next.startsWith('weak:')){startBlockReview(next.slice(5));return;}
     if(next==='chunks'){
       const ids=questions.filter(q=>window.MemoryPolicy&&window.MemoryPolicy.isChunk(q)&&eligible(q)).map(q=>q.id);
       startCustom(ids,'chunks');return;
     }
     if(next==='ai-summary'&&window.AiTutor){
       const req=window.AiTutor.buildRequest('session_summary',{lessonId:'',id:'',title:'',stimulus:'',fields:[]},{codes:window.AiTutor.topWeak().map(w=>w.error_code)});
       window.AiTutor.callTutor(req).then(resp=>{
         const root=document.getElementById('today-content');if(!root||!resp)return;
         const box=document.createElement('div');box.className='panel ai-tutor-out';box.innerHTML='<h2>Разбор</h2><p>'+esc(resp.message_ru||'')+'</p>';
         root.prepend(box);
       });
       return;
     }
     if(next.startsWith('number:')){activeLesson=null;activeStep=null;sourceFilter=null;topic='numbers';mode='numbers';queue=window.NumberPractice.session(next.split(':')[1],state).filter(eligible).map(q=>q.id);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;resetCounts();render();showView('practice');return;}
     if(next==='reset'){resetProgress();return;}
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
 $('#pause-session').onclick=()=>showView(mode==='homework'||(mode==='remediation'&&hwReturn)?'homework':mode==='exam'?'exam':'today');
 const lettersPref=$('#pref-letters');
 if(lettersPref){lettersPref.checked=!!state.prefs.letters;lettersPref.onchange=()=>{state.prefs.letters=lettersPref.checked;state.prefs.lettersChosen=true;save();if(view==='practice')render();};}
 renderRules();renderMaterials();
 const validSaved=savedSession&&topics.some(t=>t[0]===savedSession.topic)&&['ordered','shuffle','mistakes','smart','review','lesson','contrast','numbers','remediation','words','exam','homework','chunks'].includes(savedSession.mode)&&Array.isArray(savedSession.queue)&&savedSession.queue.every(id=>byId.has(id))&&Number.isInteger(savedSession.position)&&savedSession.position>=0&&savedSession.position<=savedSession.queue.length&&(!savedSession.sourceFilter||course.sources[savedSession.sourceFilter])&&(savedSession.mode!=='lesson'||window.LEARNING.lessons.some(l=>l.id===savedSession.activeLesson));
 if(validSaved){
   variants=savedSession.variants||{};
   queueEpoch=typeof savedSession.queueEpoch==='number'?savedSession.queueEpoch:queueEpoch;
   presented=typeof savedSession.presented==='string'?savedSession.presented:null;
   sessionAttempts=Math.max(0,Number(savedSession.sessionAttempts)||0);sessionCorrect=Math.min(sessionAttempts,Math.max(0,Number(savedSession.sessionCorrect)||0));sessionAssisted=Math.min(sessionAttempts-sessionCorrect,Math.max(0,Number(savedSession.sessionAssisted)||0));
   draft=savedSession.draft&&Array.isArray(savedSession.draft.answers)?savedSession.draft:null;remediation=savedSession.remediation||null;
   topic=savedSession.topic;mode=savedSession.mode;sourceFilter=savedSession.sourceFilter||null;courseBlock=savedSession.courseBlock||null;hwLesson=mode==='homework'?savedSession.courseBlock||null:null;activeLesson=mode==='lesson'?savedSession.activeLesson:null;
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
   const cloud=window.QazaqCloud,toggle=$('#account-toggle'),dlg=$('#account-dialog'),userEl=$('#account-user'),out=$('#account-logout');
   if(!cloud)return;
   if(!cloud.configured){if(toggle)toggle.hidden=true;if(userEl)userEl.hidden=true;if(out)out.hidden=true;return;}
   if(cloud.user){if(toggle)toggle.hidden=true;if(userEl){userEl.hidden=false;userEl.textContent=cloud.user.email;}if(out)out.hidden=false;if(dlg&&dlg.open&&dlg.close)dlg.close();}
   else{if(toggle)toggle.hidden=false;if(userEl)userEl.hidden=true;if(out)out.hidden=true;}
 }
 function accountError(error){
   const msg=$('#account-msg');if(!msg)return;
   const text=String(error&&error.message||error);
   msg.textContent=/email-already-in-use/i.test(text)?'Этот адрес уже зарегистрирован. Войди.':/invalid-credential|user-not-found|wrong-password/i.test(text)?'Почта или пароль не подошли.':/weak-password/i.test(text)?'Пароль короче 6 символов.':text;
 }
 (async()=>{
   const cloud=window.QazaqCloud;if(!cloud)return;
   await cloud.start();paintAccount();
   $('#account-toggle').onclick=()=>{const d=$('#account-dialog');if(d&&d.showModal)d.showModal();};
   const cancel=$('#account-cancel');if(cancel)cancel.onclick=()=>{const d=$('#account-dialog');if(d&&d.close)d.close();};
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
