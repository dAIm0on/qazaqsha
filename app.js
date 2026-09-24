/* All answers are checked locally against the reviewed course key. */
(function(){
 'use strict';
 const course=window.COURSE, core=window.TrainerCore;
 try{window.Lesson31Pack?.install?.(course,window.CURRICULUM);}catch{}
 try{
  const known31=new Set((course.questions||[]).map(q=>q.id));
  for(const q of (window.Lesson31Pack?.extraQuestions?.()||[])){if(q&&!known31.has(q.id)){course.questions.push(q);known31.add(q.id);}}
 }catch{}
 try{window.Lesson32Pack?.install?.(course,window.CURRICULUM);}catch{}
 try{window.Lesson33Pack?.install?.(course,window.CURRICULUM);}catch{}
 try{window.PhraseDrill?.install?.(course,window.CURRICULUM);}catch{}
 try{window.TransferItems?.install?.(course,window.CURRICULUM);}catch{}
 const questions=course.questions;
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
 const topics=[['all','Все задания','∞'],['sounds','Звуки и слоги','01'],['plural','Множественное число','02'],['vocab','Слова','03'],['numbers','Числа и количество','04'],['person','Личные окончания','05'],['rules','Только правила','06'],['phrase','Фразы','07']];
 const KEY='qazaq-kris-course-v1', BACKUP=KEY+'-before-import', MIGRATION=KEY+'-before-schema-5';
 const cfg=window.TRAINER_CONFIG, P=window.ProgressStore, catalog=window.CURRICULUM;
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=P.empty(),savedSession=null,storageAvailable=true,storageReadError=null;
 try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);state=P.migrate(saved);savedSession=state.session;if((saved.schema||1)<5&&!localStorage.getItem(MIGRATION))localStorage.setItem(MIGRATION,raw);}}
 catch(error){storageAvailable=false;storageReadError=error;}
 if(!state.prefs.lettersChosen&&typeof matchMedia==='function'&&matchMedia('(max-width:690px)').matches)state.prefs.letters=true;
 if(state.aiTutor&&window.AiTutor&&window.AiTutor.restore)window.AiTutor.restore(state.aiTutor);
 window.ExplainDepth={
   get(id){const key=String(id||''),chosen=state.explainDepth&&state.explainDepth[key];if(chosen==='open')return true;if(chosen==='closed')return false;if(/^T2[4-7]_/.test(key)||/^T2[89]_|^T3[0-4]_/.test(key))return false;return true;},
   set(id,open){if(!id)return;state.explainDepth=state.explainDepth||Object.create(null);state.explainDepth[String(id).slice(0,40)]=open?'open':'closed';save();}
 };
 window.NumberLadder?.parkLearn(state.learning,state.records);
 let records=state.records,learningState=state.learning;
 try{window.LessonPackages.install(state.lesson_packages);}catch(error){storageReadError=error;storageAvailable=false;}catalog.activatePromotions(state);for(const q of questions){coerceTyped(q);byId.set(q.id,q);}window.Knowledge.hydrate(state,questions);try{if(window.Lesson31Pack&&P.registerStages)P.registerStages('3-1',window.Lesson31Pack.stagePlans());}catch{}
 try{if(window.Lesson32Pack&&P.registerStages)P.registerStages('3-2',window.Lesson32Pack.stagePlans());}catch{}
 try{if(window.Lesson33Pack&&P.registerStages)P.registerStages('3-3',window.Lesson33Pack.stagePlans());}catch{}
 let confusionIndex=P.answerIndex(questions);
 let topic='all',mode='ordered',sourceFilter=null,courseBlock=null,vocabRole=null,queue=[],position=0,checked=false,hinted=false,view='today',lastTextInput=null,activeLesson=null,activeStep=null,trainerReturn=null;
 let reviewReasonMap=Object.create(null),materialsQuery='',materialsLesson='',materialsKind='';
 const COURSE_BLOCKS=(window.ExplainBankUI&&window.ExplainBankUI.COURSE||[]).map(row=>({id:row.id,title:row.label,hint:row.name}));
 function courseJumpMarkup(id){
   return `<div class="course-jump" id="${id}"><p>Уроки 1–1…3–3</p><div class="review-actions">${COURSE_BLOCKS.map(b=>`<button type="button" class="secondary-button" data-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}><span class="today-lesson-id">Урок ${b.title}</span><small>${esc(b.hint)}</small></button>`).join('')}</div></div>`;
 }
 function bindCourseJump(root){
   (root?root.querySelectorAll('[data-course]'):[]).forEach(b=>b.onclick=()=>startCourse(b.dataset.course));
 }
 let variants={},practiceIds=[],stepEvidence={},queueEpoch=Date.now(),presented=null,elapsedMs=0,timerSince=null;
 let sessionAttempts=0,sessionCorrect=0,sessionAssisted=0,draft=null,remediation=null,introOpen=false,cloudApplying=false;
 let examRaf=null,examTimedOut=false,advanceTimer=null,sessionBlindFails=Object.create(null),sessionUnaided=Object.create(null),rulePeeked=false,hwLesson=null,hwPart=null,hwSection=0,hwReturn=null,remediationNote='',retrying=false,rulesArticle=null;
 let tutorToken=0,tutorAbort=null,viewOnlyPathLesson=null,stageContext=null,practiceHold=null;
 function abortTutor(){tutorToken++;try{if(tutorAbort)tutorAbort.abort();}catch{}tutorAbort=null;}
 function currentLessonId(q){
   if(q&&q.lessonId)return q.lessonId;
   if(mode==='homework'&&hwLesson)return hwLesson;
   if(state.place&&state.place.lessonId)return state.place.lessonId;
   if(state.grammarPath&&state.grammarPath.lessonId)return state.grammarPath.lessonId;
   if(courseBlock)return courseBlock;
   return '1-1';
 }
 function tutorSurface(){
   if(mode==='exam')return 'exam';
   if(mode==='homework')return 'homework';
   if(view==='path')return 'path';
   if(view==='rules')return 'rules';
   if(view==='review')return 'review';
   return 'practice';
 }
 function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}
 let kbScrollLock=false;
 function syncKbInset(){
   if(document.documentElement.hasAttribute('data-kbinset-lock'))return;
   const vv=window.visualViewport;
   const inset=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0;
   document.documentElement.style.setProperty('--kbinset',Math.round(inset)+'px');
   const open=inset>80;
   document.documentElement.classList.toggle('keyboard-open',open);
   document.body.classList.toggle('keyboard-open',open);
   const dock=$('#practice-dock');
   if(dock)document.documentElement.style.setProperty('--dockh',dock.offsetHeight+'px');
   const tog=$('#issue-toggle');
   if(tog)tog.hidden=open||(inset>48&&document.body.getAttribute('data-view')==='practice');
   if(open&&!kbScrollLock&&document.body.getAttribute('data-view')==='practice'){
     kbScrollLock=true;
     const field=lastTextInput||$('#answer-0');
     if(field&&(!dock||!dock.contains(field))){
       const r=field.getBoundingClientRect();
       const visBottom=window.innerHeight-inset-(dock?dock.offsetHeight:0)-8;
       if(r.bottom>visBottom||r.top<8){try{field.scrollIntoView({block:'nearest'});}catch{}}
     }
     setTimeout(()=>{kbScrollLock=false;},220);
   }
 }
 if(window.visualViewport){
   window.visualViewport.addEventListener('resize',syncKbInset);
   window.visualViewport.addEventListener('scroll',syncKbInset);
 }
 window.addEventListener('resize',syncKbInset);
 syncKbInset();
 function focusAnswer(){
   const el=$('#answer-0');
   if(el&&!el.disabled){try{el.focus({preventScroll:false});}catch{el.focus();}}
   const dock=$('#practice-dock');
   if(dock&&dock.scrollIntoView)try{dock.scrollIntoView({block:'nearest',inline:'nearest'});}catch{}
 }
 function captureDraft(){
   const pathInput=$('#path-answer');
   const gp=state.grammarPath;
   if(pathInput&&gp){
     const beat=Number(pathInput.dataset.beat);
     gp.pathDraft={lessonId:pathInput.dataset.lesson||gp.lessonId,chapterId:pathInput.dataset.chapter||gp.chapterId,beat:Number.isInteger(beat)?beat:gp.beat,value:pathInput.value};
   }
   const q=byId.get(queue[position]);if(!checked&&q&&$('#answer-form'))draft={token:queueEpoch+':'+position,exerciseId:q.id,answers:readAnswers(q)};
   const ask=$('#rules-ask-q');
   if(ask){
     if(ask.value)state.rulesDraft={article:rulesArticle||'',value:ask.value.slice(0,400)};
     else if(state.rulesDraft&&(state.rulesDraft.article||'')===(rulesArticle||''))state.rulesDraft=null;
   }
 }

 function runtimePracticeLessonId(){
   if(!['course','phrase','lesson','transfer','remediation'].includes(mode)||queue.length<=position)return null;
   if(P.courseIds().includes(courseBlock))return courseBlock;
   const l=activeLesson&&window.LEARNING.lessons.find(x=>x.id===activeLesson);
   return l&&P.courseIds().includes(l.courseLesson)?l.courseLesson:null;
 }
 function runtimePracticeSnapshot(){
   const snap={topic,mode,sourceFilter,courseBlock,queue:[...queue],position,answered:checked,view,activeLesson,activeStep,practiceIds:[...practiceIds],stepEvidence:{...stepEvidence},variants:{...variants},hinted,elapsed_ms:elapsed(),queueEpoch,presented,draft:draft?JSON.parse(JSON.stringify(draft)):null,sessionAttempts,sessionCorrect,sessionAssisted,remediation:remediation?JSON.parse(JSON.stringify(remediation)):null};
   if(stageContext)snap.stageContext=JSON.parse(JSON.stringify(stageContext));
   return snap;
 }
 function persistLessonPractice(id=runtimePracticeLessonId()){
   if(!id)return null;
   return P.saveLessonPractice(state,id,runtimePracticeSnapshot(),Date.now());
 }
 function restoreLessonPractice(id){
   practiceHold=null;
   const lp=P.ensureLessonProgress(state,id),s=lp&&lp.practiceSession;
   if(!s||!Array.isArray(s.queue))return false;
   const missing=P.unknownQueueIds?P.unknownQueueIds(s.queue,byId):s.queue.filter(qid=>!byId.has(qid));
   if(missing.length){practiceHold={lessonId:id,missing,kept:s.queue.slice()};return false;}
   if(!s.queue.length)return false;
   topic=s.topic||'all';mode=s.mode||'course';sourceFilter=s.sourceFilter||null;courseBlock=id;
   activeLesson=s.mode==='lesson'?s.activeLesson||null:null;activeStep=s.activeStep==null?null:s.activeStep;
   queue=[...s.queue];practiceIds=Array.isArray(s.practiceIds)?s.practiceIds.filter(qid=>byId.has(qid)):[...new Set(queue)];
   stepEvidence=s.stepEvidence&&typeof s.stepEvidence==='object'?s.stepEvidence:{};variants=s.variants&&typeof s.variants==='object'?s.variants:{};
   queueEpoch=typeof s.queueEpoch==='number'?s.queueEpoch:Date.now()+Math.random();presented=typeof s.presented==='string'?s.presented:null;
   sessionAttempts=Math.max(0,Number(s.sessionAttempts)||0);sessionCorrect=Math.min(sessionAttempts,Math.max(0,Number(s.sessionCorrect)||0));sessionAssisted=Math.min(sessionAttempts-sessionCorrect,Math.max(0,Number(s.sessionAssisted)||0));
   draft=s.draft&&Array.isArray(s.draft.answers)?s.draft:null;remediation=s.remediation||null;
   stageContext=P.normalizeStageContext?P.normalizeStageContext(s.stageContext):null;
   position=Math.min(queue.length,Math.max(0,Number(s.position)||0)+(s.answered?1:0));checked=false;hinted=!s.answered&&!!s.hinted;elapsedMs=Number.isFinite(s.elapsed_ms)?Math.max(0,s.elapsed_ms):0;
   return true;
 }
 function persistLessonPath(id){
   const gp=state.grammarPath;if(!gp)return null;
   const lessonId=id||gp.lessonId;if(!P.courseIds().includes(lessonId))return null;
   return P.saveLessonPath(state,lessonId,gp,Date.now());
 }
 function loadLessonPath(id){
   const G=window.GrammarPath;if(!G||!P.courseIds().includes(id))return null;
   const gp=state.grammarPath||(state.grammarPath=G.emptyProgress());
   G.migrateProgress(gp);
   if(gp.lessonId&&gp.lessonId!==id)persistLessonPath(gp.lessonId);
   const lp=P.ensureLessonProgress(state,id),p=lp&&lp.path;
   gp.lessonId=id;gp.chapterId=p&&p.chapterId||null;gp.beat=Math.max(0,Number(p&&p.beat)||0);gp.phase=p&&['lesson','beat','done'].includes(p.phase)?p.phase:'lesson';
   if(p&&p.pathDraft)gp.pathDraft=JSON.parse(JSON.stringify(p.pathDraft));else delete gp.pathDraft;
   if(p&&p.canonShownFor)gp.canonShownFor=p.canonShownFor;else delete gp.canonShownFor;
   return gp;
 }
 function markLessonStarted(id,surface){
   return P.markLessonStarted(state,id,surface,Date.now());
 }
 function markLessonCompleted(id){
   const cp=P.ensureCourseProgress(state),wasPrimary=cp.resumePointer&&cp.resumePointer.lessonId===id;
   const done=P.markLessonCompleted(state,id,Date.now());
   if(wasPrimary){
     const ids=P.courseIds(),at=Math.max(0,ids.indexOf(id));
     const ordered=ids.slice(at+1).concat(ids.slice(0,at));
     const next=ordered.find(x=>(P.ensureLessonProgress(state,x)||{}).status!=='completed');
     if(next)P.setResumePointer(state,next,'path',Date.now()+1);
   }
   return done;
 }
 function beginStaged(id,ctx){
   const ids=(ctx.coreIds||[]).filter(qid=>byId.has(qid));
   if(!ids.length||ids.length!==ctx.coreIds.length)return false;
   const extra=(ctx.extraIds||[]).filter(qid=>byId.has(qid)&&!ids.includes(qid)).slice(0,3);
   mode='course';courseBlock=id;topic='all';sourceFilter=null;activeLesson=null;activeStep=null;
   queue=ids.concat(extra);practiceIds=[...queue];stepEvidence={};variants={};
   stageContext=Object.assign({},ctx,{coreIds:ids.slice(),presentations:0,limitReached:false});
   delete stageContext.extraIds;
   queueEpoch=Date.now()+Math.random();position=0;checked=false;sessionBlindFails=Object.create(null);sessionUnaided=Object.create(null);resetCounts();
   markLessonStarted(id,'practice');render();showView('practice');return true;
 }
 function continueLesson(id){
   viewOnlyPathLesson=null;
   const lp=P.ensureLessonProgress(state,id);
   if(lp&&lp.practiceSession&&restoreLessonPractice(id)){
     markLessonStarted(id,'practice');render();showView('practice');return;
   }
   if(beginPacked(id))return;
   const nxt=P.nextRegistered&&P.nextRegistered(id,state.events);
   if(nxt&&beginStaged(id,nxt))return;
   openPathLesson(id,{meaningful:true});
 }
 function resetCounts(){sessionAttempts=0;sessionCorrect=0;sessionAssisted=0;draft=null;remediation=null;sessionUnaided=Object.create(null);}
 function sameSkillOffers(q){
   if(!q)return {isolated:'',other:''};
   const iso=window.Homework&&window.Homework.isolatedFor?window.Homework.isolatedFor(q,questions,state):[];
   const rules=new Set((q.ruleIds||[]).filter(Boolean));
   const hit=questions.find(x=>x&&x.id!==q.id&&!iso.includes(x.id)&&(x.ruleIds||[]).some(r=>rules.has(r)));
   return {isolated:iso[0]||'',other:hit?hit.id:''};
 }
 function offerHtml(offers){
   const bits=[];
   if(offers.isolated)bits.push('<button type="button" class="secondary-button" data-chain-offer="'+esc(offers.isolated)+'">Проверить этот навык отдельно</button>');
   if(offers.other)bits.push('<button type="button" class="secondary-button" data-chain-offer="'+esc(offers.other)+'">Другой пример</button>');
   if(!bits.length)bits.push('<p class="small" data-coverage-gap>Отдельного упражнения для этой ошибки нет.</p>');
   return '<div data-error-offers>'+bits.join('')+'</div>';
 }
 function openOffer(id){
   captureDraft();
   const kept=state.grammarPath&&state.grammarPath.pathDraft;
   if(!byId.has(id))return;
   startCustom([id],'course');
   if(kept&&state.grammarPath)state.grammarPath.pathDraft=kept;
   save();
 }
 function bindOffers(box){
   if(!box)return;
   box.querySelectorAll('[data-chain-offer]').forEach(b=>b.onclick=()=>openOffer(b.dataset.chainOffer));
 }
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
 function eligible(value){
  const q=typeof value==='string'?byId.get(value):value;
  if(!q)return false;
  if(q.source==='p2b'&&!records[q.id]?.seen&&mode!=='course')return false;
  if(q.source==='phrase'&&!records[q.id]?.seen&&mode!=='phrase'&&mode!=='course')return false;
  if(q.lessonId==='3-3'&&q.source==='phrase'&&window.Lesson33Pack&&window.Lesson33Pack.phraseUnlocked&&!window.Lesson33Pack.phraseUnlocked(q.id,{events:state.events}))return false;
  if(q.source==='phase3-31'&&!records[q.id]?.seen&&mode!=='course'&&mode!=='phrase')return false;
  if(q.source==='slice'||q.source==='repair'||q.slice)return mode==='slice'||mode==='repair';
  return catalog.eligible(q,state)&&(!q.promotedWord||state.vocabulary[q.promotedWord]?.target_or_context==='target');
 }
 function activateCard(){
   if(introOpen||view!=='practice'||checked||document.hidden)return;
   const q=byId.get(queue[position]);if(!q)return;
   const token=queueEpoch+':'+position;
   if(presented!==token){
     presented=token;if(mode!=='voluntary')records[q.id]=window.ReviewScheduler.shown(records[q.id]);
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
 function slicePanel(){
   const P=window.ProbeItems;if(!P)return '';
   const blocks=P.openBlocks(window.CURRICULUM);
   if(!blocks.length)return '';
   return `<div class="panel"><h2>Проверить дыры</h2><p class="small">Список дыр, не балл. Один блок за заход. Подсказка не идёт в зачёт. Это не очередь «пора вспомнить».</p><div class="review-actions">${blocks.map(b=>`<button type="button" class="secondary-button" data-slice="${b.id}">${esc(b.title)}</button>`).join('')}</div></div>`;
 }
 function bindSlice(){
   $$('#exam-content [data-slice]').forEach(b=>b.onclick=()=>startSlice(b.dataset.slice));
 }
 function startSlice(block){
   const P=window.ProbeItems;if(!P)return;
   course.sources=course.sources||{};
   if(!course.sources.slice)course.sources.slice={title:'Проверка дыр',url:'#',additional:true};
   const list=P.session(block,window.CURRICULUM).map(P.toQuestion);
   for(const q of list){if(!byId.has(q.id)){course.questions.push(q);byId.set(q.id,q);}}
   mode='slice';topic='all';sourceFilter=null;activeLesson=null;courseBlock=null;vocabRole=null;
   queue=list.map(q=>q.id);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;
   state.sliceRun=[];state.sliceBlock=block;resetCounts();render();showView('practice');
 }
 function showSliceResult(){
   const P=window.ProbeItems;
   const holes=P?P.summarize(state.sliceRun||[]):[];
   state.sliceLast=holes;mode='ordered';
   const body=holes.length?holes.map(h=>`<article class="panel"><h2>${esc(h.title)}</h2><p><button type="button" class="secondary-button" data-view="rules">Правило</button> <button type="button" class="primary-button" data-repair="${esc(h.rule_id)}">Разберём</button></p></article>`).join(''):'<div class="panel"><h2>Дыр в этом блоке нет</h2><p>Это список, не процент.</p></div>';
   showView('exam');
   $('#exam-content').innerHTML=`<div class="panel"><h2>Проверить дыры</h2><p class="small">Список дыр, не балл. Очередь «пора вспомнить» от этого не меняется.</p></div>${body}${slicePanel()}`;
   bindSlice();
   $$('#exam-content [data-view="rules"]').forEach(b=>b.onclick=()=>showView('rules'));
   $$('#exam-content [data-repair]').forEach(b=>b.onclick=()=>beginRepair(b.dataset.repair));
 }
 function launchRepair(list){
  course.sources=course.sources||{};
  if(!course.sources.repair)course.sources.repair={title:'Разберём',url:'#',additional:true};
  for(const q of list){if(!byId.has(q.id)){course.questions.push(q);byId.set(q.id,q);}}
  mode='repair';topic='all';sourceFilter=null;activeLesson=null;courseBlock=null;vocabRole=null;
  queue=list.map(q=>q.id);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;
  state.sliceRun=[];resetCounts();render();showView('practice');
 }
 function beginRepair(ruleId){
  const R=window.RepairState;if(!R||!ruleId)return false;
  const cards=R.day0Cards(ruleId);
  const roots=cards.map(q=>q.repairRoot);
  if(!R.start(state,ruleId,Date.now(),roots))return false;
  state.repairDay10=false;launchRepair(cards);return true;
 }
 function openRepair(){
  const R=window.RepairState,repair=state.repair;if(!R||!repair)return;
  if(Date.now()>=Number(repair.quiet_until)){
   state.repairDay10=true;
   launchRepair(R.day10Cards(repair.rule_id,repair.roots_used));
  }else{
   state.repairDay10=false;
   launchRepair(R.day0Cards(repair.rule_id));
  }
 }
 function finishRepair(){
  const R=window.RepairState;
  const rows=state.sliceRun||[];
  const ok=rows.length>0&&rows.every(row=>row.correct);
  if(state.repairDay10&&R){if(ok)R.passDay10(state);else R.failDay10(state,Date.now());}
  state.repairDay10=false;mode='ordered';
  showView('exam');
  $('#exam-content').innerHTML=`<div class="panel"><h2>Разберём</h2><p>${esc(R?R.PAPER:'')}</p><p class="small">${ok?'Этот заход сошёлся.':'День 0 снова. Вторая дыра не стартует.'}</p></div>${slicePanel()}`;
  bindSlice();
 }
 function checkProbe(q,reveal){
   const P=window.ProbeItems;
   const item=P&&P.byId(q.id);
   const answers=readAnswers(q);
   if(!reveal&&answers.some(a=>!String(a).trim())){const warning=$('#validation');warning.textContent='Набери ответ. Подсказка в зачёт не идёт.';warning.hidden=false;return;}
   const row=item?P.judge(item,answers,!!reveal):{id:q.id,item_rule:(q.ruleIds||[])[0],rule_id:(q.ruleIds||[])[0],correct:false,peek:!!reveal,signature:false};
   state.sliceRun=state.sliceRun||[];state.sliceRun.push(row);
   if(mode==='repair'&&window.RepairState)window.RepairState.note(state,row.correct);
   checked=true;pauseTimer();hinted=!!reveal;
   const feedback=$('#feedback');
   const answerLine=(q.fields||[]).map(f=>f.answers[0]).join(' · ');
   feedback.className='feedback '+(row.correct?'':'error');
   feedback.innerHTML=`<h3>${row.correct?'Сходится.':'Пока не это.'}</h3><p><strong>Ответ:</strong> ${esc(answerLine)}</p><p class="small">${reveal?'Подсказка не засчитана.':'Это проверка дыр. Очередь «пора вспомнить» от неё не меняется.'}</p>`;
   feedback.hidden=false;
   $$('#answer-form input, #hint-button, #reveal-button, [data-letter]').forEach(el=>{el.disabled=true;});
   $('#check-button').hidden=true;$('#next-button').hidden=false;
   try{save();}catch(_){}
 }
 function renderExam(){
   const pool=questions.filter(q=>eligible(q)&&examReady(records[q.id])&&(!window.CurriculumGate||window.CurriculumGate.examEligible(q)));
   const n=Math.min(cfg.session.examSize,pool.length);
   if(!n){
     $('#exam-content').innerHTML=`<div class="panel exam-intro exam-empty"><h2>Пока нечего закреплять</h2><p>Сюда попадают только формы, которые ты уже вспоминала после паузы в разные дни. Новое на таймер не отправляется.</p><p><button type="button" class="primary-button" data-view="today">К сегодня</button></p></div>${slicePanel()}`;
     const back=$('#exam-content [data-view="today"]');if(back)back.onclick=()=>showView('today');
     bindSlice();
     return;
   }
   $('#exam-content').innerHTML=`<div class="panel exam-intro exam-ready"><h2>Закрепление на время</h2><button type="button" class="primary-button" id="exam-start">Начать ${n} карточек</button><p class="small">Подсказки выключены. Только то, что уже вспоминалось после паузы. Короткий лимит на карточку.</p>
     <div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>name?`<button type="button" class="chip" data-exam="${id}">${esc(name)}</button>`:'').join('')}</div>
     <div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-exam-course="${b.id}">${esc(b.title)}</button>`).join('')}</div>
     <p><button type="button" class="secondary-button" id="exam-rules">Только правила (другие основы)</button></p></div>`;
   const go=()=>{mode='exam';sourceFilter=null;vocabRole=null;activeLesson=null;startQueue({all:true});showView('practice');};
   $('#exam-start').onclick=go;
   $$('#exam-content [data-exam]').forEach(b=>b.onclick=()=>{topic=b.dataset.exam;go();});
   $$('#exam-content [data-exam-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.examCourse;go();});
   $('#exam-rules').onclick=()=>{topic='rules';courseBlock=null;go();};
   $('#exam-content').insertAdjacentHTML('beforeend',slicePanel());
   bindSlice();
 }
 function save(){
   captureDraft();persistLessonPath();persistLessonPractice();if(window.AiTutor&&window.AiTutor.snapshot)state.aiTutor=window.AiTutor.snapshot();state.records=records;state.learning=learningState;
   state.session={topic,mode,sourceFilter,courseBlock,queue,position,answered:checked,view,activeLesson,activeStep,practiceIds,stepEvidence,variants,hinted,elapsed_ms:elapsed(),queueEpoch,presented,draft,sessionAttempts,sessionCorrect,sessionAssisted,remediation,hwLesson,hwPart,hwSection,stageContext:stageContext?JSON.parse(JSON.stringify(stageContext)):null,trainerReturn};
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
   if(topic==='numbers'&&!courseBlock&&window.NumberLadder){
     list=window.NumberLadder.filter(list,state);
     list=[...list].sort((a,b)=>(window.NumberLadder.extractN(a)??0)-(window.NumberLadder.extractN(b)??0));
   }
   return list;
 }
 function startCourse(block){
   if(!P.courseIds().includes(block))return;
   viewOnlyPathLesson=null;
   persistLessonPractice();persistLessonPath();
   courseBlock=block;vocabRole=null;sourceFilter=null;activeLesson=null;activeStep=null;if(view!=='practice'&&view!=='exam')topic='all';
   if(restoreLessonPractice(block)){
     markLessonStarted(block,'practice');render();showView('practice');return;
   }
   if(practiceHold&&practiceHold.lessonId===block){
     const hold=practiceHold;
     $('#exercise').innerHTML='<div class="empty-state"><h2>Сохранённая очередь на месте</h2><p>В снимке есть задание, которого нет в этой версии: '+esc(hold.missing.join(', '))+'. Очередь не пересобрана.</p><div class="finish-actions"><button type="button" class="secondary-button" id="hold-lessons">Выбрать занятие</button></div></div>';
     $('#hold-lessons').onclick=()=>showView('learn');
     showView('practice');save();return;
   }
   const first=window.LEARNING.lessons.find(l=>l.courseLesson===block);
   if(first)learningState.lessonId=first.id;
   if(mode!=='exam'&&beginPacked(block))return;
   const lessonCards=(window.Phase2BPractice?.lessonSession?.(block)||[]);
   if(lessonCards.length&&mode!=='exam'){
     mode='course';
     let ordered=lessonCards.slice();
     const phraseCut=block==='1-2'?2:block==='1-3'?3:null;
     if(phraseCut!=null&&window.PhraseDrill){
       const seenIds=Object.keys(records).filter(id=>records[id]&&records[id].seen);
       const phrases=window.PhraseDrill.session(block,{count:block==='1-2'?16:12,seen_ids:seenIds,error_profile:(window.AiTutor?.topWeak?.(4)||[])});
       const before=ordered.filter(q=>Number(q.phase2b&&q.phase2b.lesson_order||99)<=phraseCut);
       const after=ordered.filter(q=>Number(q.phase2b&&q.phase2b.lesson_order||99)>phraseCut);
       ordered=[...before,...phrases,...after];
     }
     queue=ordered.map(q=>q.id).filter(id=>byId.has(id));
     practiceIds=[...queue];stepEvidence={};queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);sessionUnaided=Object.create(null);resetCounts();
     markLessonStarted(block,'practice');render();showView('practice');return;
   }
   markLessonStarted(block,'practice');
   mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');
 }
 function beginPacked(id){
   const pack=id==='3-1'?window.Lesson31Pack:id==='3-2'?window.Lesson32Pack:id==='3-3'?window.Lesson33Pack:null;
   if(!pack||!pack.courseSession)return false;
   const built=pack.courseSession(records,{events:state.events});
   return !!(built&&built.stage&&beginStaged(id,Object.assign({},built.stage,{extraIds:built.remediationIds||[]})));
 }
 function startTransfer(){
   const T=window.TransferItems;if(!T)return;
   if(courseBlock==='3-3')return;
   const rule=courseBlock==='3-2'&&window.Lesson32Pack&&window.Lesson32Pack.transferRule?window.Lesson32Pack.transferRule({stageId:stageContext&&stageContext.stageId,events:state.events}):courseBlock==='3-1'?'T20_POSS':courseBlock==='2-1'?'T6_PERSON_SG':courseBlock==='1-3'?'T4_NO_PLURAL_AFTER_NUMBER':'T2_PLURAL_LDT';
   let list=(T.forRule?T.forRule(rule,{catalog:window.CURRICULUM}):T.session(rule,{catalog:window.CURRICULUM}))||[];
   if(!list.length&&courseBlock==='3-2'&&T.forRule)list=T.forRule('T24_POSS_BIZ',{catalog:window.CURRICULUM})||[];
   if(!list.length)list=T.session(rule,{catalog:window.CURRICULUM})||[];
   list=list.filter(q=>byId.has(q.id));
   if(!list.length)return;
   mode='transfer';topic='all';sourceFilter=null;activeLesson=null;activeStep=null;
   queue=list.map(q=>q.id);practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);sessionUnaided=Object.create(null);resetCounts();
   render();showView('practice');
 }
 function startPausePrep(){
   const now=Date.now();
   const ids=questions.filter(q=>eligible(q)&&core.pauseReady(records[q.id],now)).map(q=>q.id);
   mode='ordered';topic='all';sourceFilter=null;activeLesson=null;
   queue=ids;practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);sessionUnaided=Object.create(null);resetCounts();
   render();showView('practice');
 }
 function shuffled(items){
   const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
 }
 function examReady(r){return window.MemoryPolicy?window.MemoryPolicy.examReady(r):!!r&&(r.recall_review_successes||0)>=2;}
 function startQueue({all=false}={}){
   activeLesson=null;activeStep=null;stepEvidence={};
   if(topic==='phrase'&&courseBlock&&window.PhraseDrill&&mode!=='exam'){
     mode='phrase';
     const seenIds=Object.keys(records).filter(id=>records[id]&&records[id].seen);
     const list=window.PhraseDrill.session(courseBlock,{count:courseBlock==='1-2'?16:12,seen_ids:seenIds,error_profile:(window.AiTutor?.topWeak?.(4)||[]),events:state.events});
     queue=list.map(q=>q.id).filter(id=>byId.has(id));practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);resetCounts();render();return;
   }
   let list=subset();
   if(!vocabRole)list=list.filter(q=>q.wordRole!=='used');
   if(mode==='smart'){list=shuffled(list).sort((a,b)=>Number(window.Knowledge.bindings(b).some(x=>x.skill_type==='production'))-Number(window.Knowledge.bindings(a).some(x=>x.skill_type==='production')));list=core.chooseShortSession(list,records,Date.now(),questions.length);}
   else if(mode==='review'){
     const nowReview=Date.now();
     const remediation=window.AiTutor&&window.AiTutor.dueRemediation?window.AiTutor.dueRemediation().slice(0,1).flatMap(rec=>window.AiTutor.templateQuestions(rec.error_code,0)):[];
     for(const item of remediation){if(item&&!byId.has(item.id)){course.questions.push(item);byId.set(item.id,item);}}
     const rows=window.CorpusSearch?window.CorpusSearch.todayQueue(state,list,nowReview,{
       isDue:(r,t)=>core.isDue(r,t),
       remediation,
       ruleTitle:id=>{const card=window.ExplainBank&&window.ExplainBank.byId(id);return card&&card.title||'это правило';}
     }):list.filter(q=>core.isDue(records[q.id])).map(q=>({id:q.id,reason:'пора вспомнить',action:'review'}));
     reviewReasonMap=Object.create(null);
     const picked=[];
     for(const row of rows){
       if(row.action!=='review')continue;
       const item=byId.get(row.id);
       if(!item)continue;
       reviewReasonMap[item.id]=row.reason;
       picked.push(item);
     }
     list=picked;
     const rank=id=>reviewReasonMap[id]==='проверим на новом слове'?0:reviewReasonMap[id]==='дважды путала окончание'?1:reviewReasonMap[id]==='ещё раз это окончание'?2:3;
     list.sort((a,b)=>rank(a.id)-rank(b.id)||((records[a.id]&&records[a.id].dueAt)||0)-((records[b.id]&&records[b.id].dueAt)||0));
   }
   else if(mode==='mistakes')list=list.filter(q=>records[q.id]?.needsReview);
   else if(mode==='exam')list=list.filter(q=>examReady(records[q.id])&&(!window.CurriculumGate||window.CurriculumGate.examEligible(q)));
   else if(mode!=='voluntary'&&!all)list=list.filter(q=>(records[q.id]?.streak||0)<2||core.isDue(records[q.id]));
   if(mode==='voluntary')list=list.slice(0,cfg.session.size);
   if(mode==='shuffle'||mode==='mistakes'||mode==='exam')list=shuffled(list);
   if(mode==='exam')list=list.slice(0,cfg.session.examSize);
   if(mode==='ordered'||mode==='shuffle'){
     const fresh=list.filter(q=>!(records[q.id]?.seen)),old=list.filter(q=>records[q.id]?.seen);
     list=[...fresh.slice(0,cfg.session.newLimit),...old].slice(0,cfg.session.size+cfg.session.newLimit);
   }
   if(['smart','review','mistakes'].includes(mode)){const recent=state.events.filter(e=>e.type==='answer'&&Date.now()-e.at<cfg.session.recentWindowMs).slice(-cfg.session.minIntervening).map(e=>e.card_id);list=core.spaceRecent(window.Knowledge.choose(list,state,Infinity),recent).slice(0,cfg.session.size);}
   let ids=list.map(q=>q.id);
   if(window.MemoryPolicy)ids=window.MemoryPolicy.breakRuns(ids,questions);
   if(window.MemoryPolicy&&window.MemoryPolicy.mixRulesProbes&&['smart','review','ordered'].includes(mode))ids=window.MemoryPolicy.mixRulesProbes(ids,questions,state,{lessonId:courseBlock||null,topic});
   queue=ids;practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;sessionBlindFails=Object.create(null);resetCounts();render();
 }
 function startLesson(id,step=learningState.steps[id]||0,opts){
   const lesson=window.LEARNING.lessons.find(l=>l.id===id),chunk=lesson?.chunks[step];if(!chunk)return;
   let stepIds=[...chunk.questionIds];
   if(lesson.topic==='numbers'&&window.NumberLadder){
     stepIds=chunk.questionIds.filter(qid=>{const q=byId.get(qid);return q&&window.NumberLadder.allowed(q,state);});
     if(!stepIds.length){
       const order=window.NumberLadder.ORDER||[];
       const nextId=order.find(lid=>lid!==id&&window.LEARNING.lessons.some(l=>l.id===lid&&(l.questionIds||[]).some(qid=>{const q=byId.get(qid);return q&&window.NumberLadder.allowed(q,state);})));
       if(nextId)return startLesson(nextId,0,opts);
       return;
     }
   }
   courseBlock=lesson.courseLesson||courseBlock;
   activeLesson=id;activeStep=step;learningState.lessonId=id;learningState.steps[id]=step;topic=lesson.topic;mode=opts&&opts.voluntary?'voluntary':'lesson';sourceFilter=null;
   queue=lesson.topic==='numbers'?shuffled(stepIds):stepIds;practiceIds=[...queue];stepEvidence={};queueEpoch=Date.now()+Math.random();
   position=0;variants={};checked=false;resetCounts();render();showView('practice');$('#exercise').scrollIntoView({block:'start'});
 }
 function startContrast(pair){
   activeLesson=null;activeStep=null;topic='all';sourceFilter=null;mode='contrast';
   const ids=P.contrastIds(pair,confusionIndex,questions).filter(id=>{
     const q=byId.get(id);
     if(!q||!eligible(q))return false;
     if(q.topic==='numbers'&&window.NumberLadder&&!window.NumberLadder.allowed(q,state))return false;
     return true;
   });
   if(!ids.length)return;
   queue=shuffled(ids);practiceIds=[...queue];queueEpoch=Date.now()+Math.random();variants={};position=0;checked=false;resetCounts();
   render();showView('practice');
 }
 const RULE_TRACKS={
   T1_HARMONY:['harmony-syllables','harmony-pairs'],
   T2_PLURAL_LDT:['plural-1','plural-2']
 };
 function tryRule(ruleId,host){
   const tracks=(RULE_TRACKS[ruleId]||[]).map(id=>(window.LEARNING&&window.LEARNING.lessons||[]).find(l=>l.id===id)).filter(Boolean).slice(0,2);
   if(tracks.length>1&&host){
     host.innerHTML=tracks.map(l=>'<button type="button" class="secondary-button" data-try-track="'+esc(l.id)+'">'+esc(l.title)+'</button>').join('');
     host.querySelectorAll('[data-try-track]').forEach(b=>b.onclick=()=>startLesson(b.dataset.tryTrack,learningState.steps[b.dataset.tryTrack]||0,{voluntary:true}));
     return;
   }
   if(tracks.length===1){startLesson(tracks[0].id,learningState.steps[tracks[0].id]||0,{voluntary:true});return;}
   const ids=questions.filter(q=>{
     if(!q||!(q.ruleIds||[]).includes(ruleId))return false;
     if(!catalog.eligible(q,state))return false;
     if(q.topic==='numbers'&&window.NumberLadder&&!window.NumberLadder.allowed(q,state))return false;
     return true;
   }).slice(0,cfg.session.size).map(q=>q.id);
   if(!ids.length){
     if(host)host.innerHTML='<p class="small" data-coverage-gap>Отдельного упражнения для этой ошибки нет.</p>';
     return;
   }
   startCustom(ids,'voluntary');
 }
 function showView(next){
   captureDraft();
   pauseTimer();if(view==='practice'&&!checked&&['learn','rules','vocabulary','materials','review','exam'].includes(next)){const current=byId.get(queue[position]);if(current)hintEvent(current,'reference');hinted=true;}
   view=next;document.body.dataset.view=next;
   const gpNow=state.grammarPath||{};
   document.body.classList.toggle('path-immersive',next==='path'&&!!(gpNow.lessonId&&gpNow.phase==='beat'));
   document.querySelectorAll('main > section').forEach(el=>{el.hidden=el.id!==next+'-view';});
   const tab=shellTab(next);
   $$('[data-view]').forEach(b=>{if(b.dataset.view===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
   renderStats();if(next==='learn')learning.render();if(next==='personal'&&window.PersonalTrainers)window.PersonalTrainers.render();if(['today','review','vocabulary'].includes(next))dashboard.render(next);if(next==='materials')renderMaterials();if(next==='exam')renderExam();if(next==='homework')renderHomework();if(next==='path')renderPath();if(next==='practice')activateCard();
   if(next==='practice'&&['homework','course','lesson','phrase','transfer','remediation'].includes(mode)){const id=mode==='homework'?hwLesson:(courseBlock||(state.grammarPath&&state.grammarPath.lessonId)||null);if(id)markPlace(mode==='homework'?'homework':'practice',id);}
   if(next==='path'&&state.grammarPath&&state.grammarPath.phase==='beat'&&state.grammarPath.lessonId)markPlace('path',state.grammarPath.lessonId);
   if(window.TutorUI){
     window.TutorUI.mount();
     window.TutorUI.syncView(next==='practice'&&mode==='exam'?'exam':next);
   }
   save();
 }
 function shellTab(next){
   if(next==='practice')return mode==='exam'?'review':'today';
   if(['learn','homework','path','personal'].includes(next))return 'today';
   if(['rules','vocabulary'].includes(next))return 'materials';
   if(next==='exam')return 'review';
   return next;
 }
 function markPlace(surface,lessonId){
   const id=String(lessonId||'');
   if(!/^[1-3]-[0-9]$/.test(id))return;
   state.place={surface,lessonId:id,mode:surface==='path'?'path':mode};
 }
 function courseIds(){return (window.ExplainBankUI&&window.ExplainBankUI.COURSE||[]).map(c=>c.id);}
 function studyLive(){return ['homework','course','lesson','phrase','transfer','remediation'].includes(mode)&&queue.length>position;}
 function namedCourse(){
   const ids=courseIds(),cp=P.ensureCourseProgress(state),rp=cp.resumePointer||{};
   if(ids.includes(rp.lessonId))return rp.lessonId;
   return ids.find(id=>(P.ensureLessonProgress(state,id)||{}).status!=='completed')||ids[0]||'1-1';
 }
 function stepNow(){
   const ids=courseIds(),cp=P.ensureCourseProgress(state);
   const allDone=ids.length&&ids.every(id=>(P.ensureLessonProgress(state,id)||{}).status==='completed');
   const lessonId=namedCourse(),lp=P.ensureLessonProgress(state,lessonId),rp=cp.resumePointer||{};
   if(allDone)return {lessonId,surface:'path',title:'Основное прохождение завершено',hint:'Можно выбрать любой урок и повторить его.'};
   if(rp.surface==='practice'&&lp&&lp.practiceSession)return {lessonId,surface:'practice',title:'Продолжить урок '+lessonId,hint:'Очередь, позиция и набранный ответ сохранены.'};
   const p=lp&&lp.path;
   const checkpoint=p&&p.chapterId?('Глава · шаг '+(Math.max(0,Number(p.beat)||0)+1)):(lp&&lp.status==='not_started'?'Урок ещё не начат':'Место прохождения сохранено');
   return {lessonId,surface:'path',title:(lp&&lp.status==='not_started'?'Начать урок ':'Продолжить урок ')+lessonId,hint:checkpoint};
 }
 function continueStep(){
   const s=stepNow();
   if(s.title==='Основное прохождение завершено'){showView('path');return;}
   continueLesson(s.lessonId);
 }
 function openChapter(lessonId,chapterId){
   const G=window.GrammarPath;
   if(!G||!P.courseIds().includes(lessonId))return;
   const lp=P.ensureLessonProgress(state,lessonId),changesResume=viewOnlyPathLesson!==lessonId&&lp&&lp.status!=='completed';
   let gp=state.grammarPath;
   if(!gp||gp.lessonId!==lessonId)gp=loadLessonPath(lessonId);
   if(gp&&gp.lessonId===lessonId&&gp.chapterId===chapterId&&G.keepChapter(gp,lessonId)){
     gp.phase='beat';if(changesResume)markLessonStarted(lessonId,'path');markPlace('path',lessonId);save();renderPath();return;
   }
   captureDraft();persistLessonPath();
   G.startChapter(state,lessonId,chapterId);
   if(changesResume)markLessonStarted(lessonId,'path');markPlace('path',lessonId);save();renderPath();
 }
 function openPathLesson(lessonId,options){
   const G=window.GrammarPath;if(!G){showView('path');return;}
   if(!P.courseIds().includes(lessonId))return;
   const meaningful=!!(options&&options.meaningful);
   viewOnlyPathLesson=meaningful?null:lessonId;
   persistLessonPractice();persistLessonPath();
   const lp=P.ensureLessonProgress(state,lessonId);
   let gp=loadLessonPath(lessonId);
   if(meaningful){
     markLessonStarted(lessonId,'path');
     if(lp&&lp.status!=='completed'&&(!gp.chapterId||gp.phase==='lesson')&&!(lp.path&&lp.path.updatedAt)){
       G.startLesson(state,lessonId);gp=state.grammarPath;
       const les=G.lesson(lessonId);
       const next=les&&(les.chapters||[]).find(ch=>!(gp.completedChapters&&gp.completedChapters[les.id+':'+ch.id]));
       if(next)G.startChapter(state,les.id,next.id);
       else{gp.phase='done';gp.chapterId=null;}
     }
   }
   markPlace('path',lessonId);save();showView('path');
 }
 function filterSummary(){
   const t=topics.find(x=>x[0]===topic);
   const type=topic==='all'||!t?'Все типы':t[1];
   const les=courseBlock?(COURSE_BLOCKS.find(b=>b.id===courseBlock)||{}).title:null;
   return les?('Урок '+les+' · '+type):type;
 }
 function renderStats(){
   const pause=$('#pause-session');
   if(pause){
     pause.hidden=queue.length===0||position>=queue.length;
     pause.textContent='←';
     pause.setAttribute('aria-label',mode==='homework'||(mode==='remediation'&&hwReturn)?'Сделать паузу · Домашка':mode==='exam'?'Сделать паузу · Экзамен':'Сделать паузу · Сегодня');
   }
   const scope=subset(), tried=scope.filter(q=>records[q.id]?.attempts>0).length;
   const sp=$('#session-position');
   if(sp)sp.textContent=['smart','lesson','course','review','contrast'].includes(mode)?`Шаг ${Math.min(position+1,queue.length)} из ${queue.length}`:`Встречалось ${tried} из ${scope.length}`;
   const ss=$('#session-score');
   if(ss)ss.textContent=sessionAttempts?`Без подсказки: ${sessionCorrect} / ${sessionAttempts}`:'';
   const pt=$('#practice-title');
   if(pt)pt.textContent=mode==='exam'?'Экзамен':mode==='homework'?'Домашка':activeLesson?(window.LEARNING.lessons.find(l=>l.id===activeLesson)||{}).title||'Практика':topic==='all'?'Практика':(topics.find(x=>x[0]===topic)||[])[1]||'Практика';
   const sum=$('#practice-filter-summary');
   if(sum)sum.textContent=filterSummary();
   $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
   const sf=$('#source-filter');
   if(sf){
     if(courseBlock){
       const b=COURSE_BLOCKS.find(x=>x.id===courseBlock);
       sf.hidden=false;sf.innerHTML=`<span>Урок ${esc(b?b.title:courseBlock)} · ${esc(b?b.hint:'')}</span><button type="button">Все уроки</button>`;
       sf.querySelector('button').onclick=()=>{courseBlock=null;startQueue();};
     }else if(sourceFilter){
       sf.hidden=false;sf.innerHTML=`<span>${esc(course.sources[sourceFilter].title)}</span><button type="button">Все материалы</button>`;sf.querySelector('button').onclick=()=>{sourceFilter=null;startQueue();};
     }else sf.hidden=true;
   }
   renderJumpBar();
 }
 function renderJumpBar(){
   const bar=$('#jump-bar');if(!bar)return;
   bar.innerHTML=`<div class="jump-row"><span>Тип</span>${topics.map(([id,name])=>name?`<button type="button" class="chip" data-jump-topic="${id}" ${topic===id?'aria-pressed="true"':''}>${esc(name)}</button>`:'').join('')}</div><div class="jump-row"><span>Урок</span>${COURSE_BLOCKS.map(b=>`<button type="button" class="chip" data-jump-course="${b.id}" ${courseBlock===b.id?'aria-pressed="true"':''}>${esc(b.title)}</button>`).join('')}<button type="button" class="chip" data-jump-course="" ${courseBlock?'':'aria-pressed="true"'}>Все</button></div><div class="jump-row"><span>След</span><button type="button" class="chip" data-jump-transfer ${mode==='transfer'?'aria-pressed="true"':''}>Перенос</button><button type="button" class="chip" data-jump-pause>Скоро пауза</button></div>`;
   const closeFilter=()=>{const dlg=$('#practice-filter');if(dlg&&dlg.open&&dlg.close)dlg.close();};
   $$('#jump-bar [data-jump-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.jumpTopic;activeLesson=null;vocabRole=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');closeFilter();});
   $$('#jump-bar [data-jump-course]').forEach(b=>b.onclick=()=>{courseBlock=b.dataset.jumpCourse||null;activeLesson=null;mode=mode==='exam'?'exam':'ordered';startQueue({all:true});showView('practice');closeFilter();});
   const tr=$('#jump-bar [data-jump-transfer]');if(tr)tr.onclick=()=>{startTransfer();closeFilter();};
   const soon=$('#jump-bar [data-jump-pause]');if(soon)soon.onclick=()=>{startPausePrep();closeFilter();};
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
 function classifierOptions(f){
   const a=(f.answers||[]).join(' ').toLowerCase();
   if(/зависит от слова/.test(a))return ['Мягкая','Твёрдая','Зависит от слова'];
   if(/мягкое|твёрдое|твердое/.test(a))return ['Мягкое','Твёрдое'];
   if(/мягкий|твёрдый|твердый/.test(a))return ['Мягкий','Твёрдый'];
   return null;
 }
 function answerMarkup(q){
   const fields=q.fields||[{label:'Ответ',kind:'text'}];
   return `<div class="fields">${fields.map((f,i)=>{
     const taps=classifierOptions(f);
     if(taps)return `<div class="field-row"><span class="field-label" id="label-${i}">${esc(f.label)}</span><div class="field-control tap-choices" role="group" aria-labelledby="label-${i}"><input id="answer-${i}" name="answer-${i}" type="hidden">${taps.map(v=>`<button type="button" class="chip" data-fill="answer-${i}" data-val="${esc(v)}" aria-pressed="false">${esc(v)}</button>`).join('')}</div></div>`;
     return `<div class="field-row"><label class="field-label" for="answer-${i}">${esc(f.label)}</label><div class="field-control"><input id="answer-${i}" name="answer-${i}" type="text" lang="kk" enterkeyhint="done" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ${f.kind==='number-text'?'inputmode="numeric"':''} aria-describedby="correction-${i}"><span class="field-correction" id="correction-${i}"></span></div></div>`;
   }).join('')}</div>`;
 }
 function render(){
   retrying=false;
   introOpen=false;pauseTimer();elapsedMs=0;checked=false;hinted=false;rulePeeked=false;lastTextInput=null;renderStats();
   const q=byId.get(queue[position]);
   if(!q){renderEmpty();return;}
   window.NumberPractice.prepare(q,variants);confusionIndex=P.answerIndex(questions);
   if(course.sources&&!course.sources['ai-remed'])course.sources['ai-remed']={title:'Разбор навыка',url:'#',additional:true};
   const source=course.sources[q.source]||course.sources['ai-remed']||{title:'Практика',url:'#',additional:true}, streak=records[q.id]?.streak||0;
   const sourceUrl=liveSource(source.url);
   const sourceLabel=sourceUrl?`<a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`:esc(source.title);
   const location=placeLine(q);
   const hasText=(q.kind==='fields'||q.kind==='phrase')&&q.fields.some(f=>f.kind!=='number-text'&&!classifierOptions(f));
   const letters=hasText&&state.prefs.letters;
   const exam=mode==='exam';
   const hw=mode==='homework';
   const canRule=hw&&window.Homework&&window.Homework.ruleText(q);
   const longHw=hw&&hwLesson&&state.homeworkAttempts[hwLesson]&&Date.now()-(state.homeworkAttempts[hwLesson].started_at||Date.now())>25*60*1000;
   const letterBar=letters?`<div class="letter-keyboard" lang="kk" aria-label="Казахские буквы">${[...'әғқңөұүһі'].map(c=>`<button type="button" lang="kk" data-letter="${c}" aria-label="Вставить ${c}">${c}</button>`).join('')}</div>`:'';
   $('#exercise').innerHTML=`<div class="question-top"><div class="source-label">${sourceLabel}${location?'<br>'+esc(location):''}</div><span class="mastery-label">${exam?'Экзамен':hw?'Домашка':esc(cfg.labels[records[q.id]?.mastery_level||'NEW'])}</span></div><form id="answer-form"><div class="question-body"><p class="phase-label">${exam?'НА ВРЕМЯ':hw?'ДОМАШКА':mode==='voluntary'?'ПО ЖЕЛАНИЮ':esc(q.phase||(q.source.startsWith('hw')?'Вспомнить':'Применить правило'))}</p>${mode==='voluntary'?'<p class="question-note" data-voluntary>Это подход по желанию. Очередь «пора вспомнить» от него не меняется.</p>':''}${longHw?'<p class="question-note">Уже больше 25 минут на этом листе. Можно сохранить и продолжить позже — это не стоп.</p>':''}<h2 id="question-title">${esc(q.title)}</h2>${mode==='review'&&reviewReasonMap[q.id]?`<p class="question-note">${esc(reviewReasonMap[q.id])}</p>`:''}${q.stimulus?`<div class="stimulus" lang="${q.title.includes('на казахский')?'ru':'kk'}">${esc(q.stimulus)}${q.translation?`<span class="translation" lang="ru">${esc(q.translation)}</span>`:''}</div>`:''}${q.note?`<p class="question-note">${esc(q.note)}</p>`:''}${mode==='remediation'&&remediationNote&&position===0?`<p class="question-note remediation-rule">${esc(remediationNote)}</p>`:''}${encodingMarkup(q)}${q.contextGloss?`<div class="context-gloss">${q.contextGloss.map(g=>`<span><strong>${esc(g.word)}</strong> — ${esc(g.translation)} <small>для контекста</small></span>`).join('')}</div>`:''}<div id="hint-box" class="hint" hidden></div><div id="association-box" class="hint" hidden></div><p id="validation" class="validation-message" role="alert" hidden></p></div><div class="practice-dock" id="practice-dock"><div class="practice-composer"><div class="composer-row">${answerMarkup(q)}<div class="primary-slot"><button type="submit" class="primary-button" id="check-button">Проверить</button><button type="submit" class="primary-button" id="next-button" hidden>Дальше →</button></div></div><div class="question-actions"><div class="secondary-actions"><button type="button" class="secondary-button" id="rule-button" ${canRule?'':'hidden'}>Правило</button><button type="button" class="secondary-button" id="hint-button" ${exam?'hidden':''}>Нужна подсказка</button><button type="button" class="text-button" id="reveal-button">${exam?'Пропустить': 'Не знаю'}</button><button type="button" class="text-button" id="association-button" ${exam?'hidden':''}>Ассоциация</button></div></div>${letterBar}</div></div><div id="feedback" class="feedback" role="status" aria-live="polite" hidden></div></form>`;
   const goCard=()=>{if(checked)nextQuestion();else checkAnswer(q);};
   if(window._qazaqEnter)document.removeEventListener('keydown',window._qazaqEnter);
   window._qazaqEnter=e=>{
     if(e.key!=='Enter'&&e.key!=='NumpadEnter')return;
     if(e.repeat||e.isComposing)return;
     if(document.body.getAttribute('data-view')!=='practice')return;
     if(!document.getElementById('answer-form'))return;
     if(e.target&&e.target.closest&&e.target.closest('textarea,dialog,#issue-dialog,#path-form'))return;
     e.preventDefault();
     goCard();
   };
   document.addEventListener('keydown',window._qazaqEnter);
   $('#answer-form').addEventListener('submit',e=>{e.preventDefault();if(e.isComposing||(e.nativeEvent&&e.nativeEvent.isComposing))return;goCard();});
   if($('#rule-button'))$('#rule-button').onclick=()=>showRule(q);
   $('#hint-button').onclick=()=>showHint(q);
   $('#reveal-button').onclick=()=>mode==='exam'?checkAnswer(q,true):peekAnswer(q);
   if(mode==='slice'||mode==='repair'){const h=$('#hint-button'),r=$('#reveal-button');if(h)h.hidden=true;if(r)r.hidden=true;}
   $('#next-button').onclick=nextQuestion;
   $('#association-button').onclick=()=>openAssociation(q);
   $$('#answer-form input[type=text]').forEach(el=>el.addEventListener('focus',()=>{lastTextInput=el;syncKbInset();const dock=$('#practice-dock');if(dock&&dock.scrollIntoView)try{dock.scrollIntoView({block:'nearest'});}catch{}}));
   $$('[data-letter]').forEach(b=>{
     b.addEventListener('pointerdown',e=>e.preventDefault());
     b.addEventListener('mousedown',e=>e.preventDefault());
     b.addEventListener('click',()=>{
       if(checked)return;
       const target=lastTextInput||$('#answer-form input[type=text]');if(!target)return;
       const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
       target.value=target.value.slice(0,start)+b.dataset.letter+target.value.slice(end);
       target.focus();target.setSelectionRange(start+1,start+1);lastTextInput=target;save();
     });
   });
   $$('[data-fill]').forEach(b=>b.addEventListener('click',e=>{
     e.preventDefault();
     const inp=$('#'+b.dataset.fill);if(!inp)return;
     inp.value=b.dataset.val;
     b.parentElement.querySelectorAll('[data-fill="'+b.dataset.fill+'"]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
     save();
   }));
   if(draft?.token===queueEpoch+':'+position&&draft.exerciseId===q.id){
     if(q.kind==='multi')$$('input[name=choice]').forEach(el=>{el.checked=draft.answers.includes(el.value);});
     else q.fields.forEach((f,i)=>{$('#answer-'+i).value=String(draft.answers[i]||'');});
   }
   $$('[data-fill]').forEach(b=>{const inp=$('#'+b.dataset.fill);if(inp&&inp.value===b.dataset.val)b.setAttribute('aria-pressed','true');});
   $('#answer-form').addEventListener('input',save);$('#answer-form').addEventListener('change',save);
   activateCard();save();syncKbInset();
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
   if(!$('.letter-keyboard')&&(q.kind==='fields'||q.kind==='phrase')&&q.fields.some(f=>f.kind!=='number-text')){
     const keys=document.createElement('div');keys.className='letter-keyboard';keys.lang='kk';keys.innerHTML=[...'әғқңөұүһі'].map(c=>`<button type="button" lang="kk" data-letter="${c}">${c}</button>`).join('');
     const slot=$('.practice-composer .primary-slot');
     if(slot)slot.before(keys);else box.after(keys);
     keys.querySelectorAll('[data-letter]').forEach(b=>b.addEventListener('pointerdown',e=>{
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
 }
 function readAnswers(q){return q.kind==='multi'?$$('input[name=choice]:checked').map(el=>el.value):q.fields.map((_,i)=>$('#answer-'+i).value);}
 function checkAnswer(q,reveal=false){
   if(mode==='slice'||mode==='repair'){checkProbe(q,reveal);return;}
   if(checked&&!retrying)return;
   if(retrying){
     const answers=readAnswers(q), warning=$('#validation');
     if(answers.some(a=>!String(a).trim())&&q.kind!=='multi'){warning.textContent='Набери форму целиком.';warning.hidden=false;return;}
     warning.hidden=true;
     const result=core.evaluate(q,answers);
     if(result.correct){nextQuestion();return;}
     warning.hidden=true;
     focusAnswer();return;
   }
   const answers=readAnswers(q), warning=$('#validation');
   if(!reveal){
     const missing=q.kind==='multi'?answers.length===0:answers.some(a=>!a.trim());
     if(missing){warning.textContent=q.kind==='multi'?'Выбери хотя бы один вариант.':'Заполни все поля — проверим разбор целиком.';warning.hidden=false;if(q.kind!=='multi')$('#answer-'+answers.findIndex(a=>!a.trim())).focus();return;}
   }
   warning.hidden=true;
   const result=reveal?{correct:false,parts:q.kind==='multi'?q.options.map(()=>false):q.fields.map(()=>false)}:core.evaluate(q,answers);
   checked=true;if(reveal){hintEvent(q,'reveal');hinted=true;}
   pauseTimer();const now=Date.now(),recall=(q.kind==='fields'||q.kind==='phrase')&&q.fields.some(f=>f.kind!=='select');
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
   const voluntary=mode==='voluntary';
   const aiRemed=String(q.id||'').startsWith('ai-remed:');
   let rec=previous||core.migrateRecord({},now);
   if(homeworkMode){
     if(hinted&&previous){rec=core.updateRecord(previous,result.correct,true,now,{responseTime:elapsedMs,recall,rating:F.Rating.Again});records[q.id]=rec;}
   }else if(voluntary){rec=previous||rec;}
   else if(!aiRemed){rec=core.updateRecord(previous,result.correct,hinted,now,{responseTime:elapsedMs,recall,rating});records[q.id]=rec;}
   else records[q.id]=rec;
   const errors=reveal?[]:window.ErrorDiagnostics.diagnose(q,answers,result,now);state.errors.push(...errors);
   const policy=window.MemoryPolicy;
   const flags=policy&&policy.answerFlags?policy.answerFlags({hinted,correct:result.correct}):{first_try_correct:hinted?0:(result.correct?1:0),peek:hinted?1:0,retype_after_peek_ok:hinted?(result.correct?1:0):null};
   if(rulePeeked)flags.first_try_correct=0;
   const eventId='ev:'+now+':'+q.id;
   const event={id:eventId,session_id:String(queueEpoch),presentation:position,type:'answer',card_id:q.id,at:now,correct:result.correct,hinted,response_time_ms:elapsedMs,response_time:elapsedMs,latency_ms:elapsedMs,recall,answers,
     item_type:policy?policy.classify(q):null,direction:policy?policy.direction(q):null,
     first_try_correct:flags.first_try_correct,peek:flags.peek,retype_after_peek_ok:flags.retype_after_peek_ok,
     confusion_tag:policy?policy.confusionTag(q,answers,result):'',
     confuse_pair_id:policy&&policy.contrastSide(q)?String(policy.contrastSide(q).pair):'',
     official_like:(mode==='exam'||q.topic==='rules')?1:0,
     predicted_R:predicted,
     hours_since_last:hours,
     rule_peek:rulePeeked?1:0,homework:homeworkMode?1:0,block:window.Homework?window.Homework.inferBlock(q,mode,hwLesson,activeLesson):''};
   if(stageContext){
     event.lesson_id=stageContext.lessonId;
     event.stage_id=stageContext.stageId;
     event.content_revision=stageContext.contentRevision;
     event.practice_kind=stageContext.kind;
   }
   if(!homeworkMode&&!aiRemed&&!voluntary)event.skills=window.Knowledge.observe(state,q,result,event,errors);
   state.events.push(event);rec=records[q.id]||rec;
   if(homeworkMode&&hwLesson){
     const expected=q.kind==='multi'?(q.correct||[]).join(', '):(q.fields||[]).map(f=>f.answers[0]).join('; ');
     window.Homework.recordItem(state,hwLesson,{id:q.id,answers,correct:result.correct,rule_peek:rulePeeked,answer_peek:hinted,skipped:!!reveal,expected,event_id:eventId},now);
   }
   if(!voluntary)P.observeConfusions(state,q,answers,result,now,confusionIndex,hinted||reveal||rulePeeked);
   for(const pair of Object.values(state.confusions)){pair.expected_item=[...confusionIndex.get(pair.expected_answer)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.given_item=[...confusionIndex.get(pair.wrong_answer_given)||[]].flatMap(id=>window.Knowledge.bindings(byId.get(id))).map(b=>b.item_id);pair.last_confused=pair.last_wrong;}
   if(activeLesson&&practiceIds.includes(q.id))stepEvidence[q.id]=result.correct&&!hinted;
   sessionAttempts++;if(result.correct){if(hinted)sessionAssisted++;else sessionCorrect++;}
   if(!hinted&&!result.correct)sessionBlindFails[q.id]=(sessionBlindFails[q.id]||0)+1;
   const day0=core.isDay0Learning(rec,now);
   if(hinted||!result.correct)sessionUnaided[q.id]=0;
   else if(!hinted&&result.correct)sessionUnaided[q.id]=(sessionUnaided[q.id]||0)+1;
   if(stageContext){
     stageContext.presentations=(stageContext.presentations||0)+1;
     if(stageContext.presentations>=stageContext.maxPresentations){
       stageContext.limitReached=true;
       queue.splice(position+1);
     }else if(!homeworkMode&&mode!=='phrase'&&(sessionBlindFails[q.id]||0)<2){
       core.scheduleRepeat(queue,position,q.id,rec.streak,stageContext.coreIds.filter(id=>id!==q.id&&byId.has(id)),{learning:day0,review:!day0,sessionBlinds:sessionUnaided[q.id]||0});
     }
   }else if(!homeworkMode&&mode!=='phrase'&&(sessionBlindFails[q.id]||0)<2)core.scheduleRepeat(queue,position,q.id,rec.streak,[...practiceIds,...questions.filter(x=>eligible(x)&&records[x.id]?.seen&&x.id!==q.id).map(x=>x.id)].filter(id=>id!==q.id),{learning:day0,review:!day0,sessionBlinds:sessionUnaided[q.id]||0});
   const mate=window.MemoryPolicy&&window.MemoryPolicy.contrastSide(q);
   if(!stageContext&&mate&&!result.correct&&!hinted){
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
     q.fields.forEach((_,i)=>{const el=$('#answer-'+i);if(el){el.classList.add('invalid');el.disabled=false;}});
     focusAnswer();
   }
   const feedback=$('#feedback');feedback.className='feedback '+(!result.correct?'error':hinted?'hinted':'');
   const tarBlob=answers.join(' ');
   const tarLooks=/тар|тер|дар|дер|лар|лер|kitapтар/i.test(tarBlob)&&((q.ruleIds||[]).includes('quantity')||/количеств|книг|кітап/.test((q.title||'')+' '+(q.stimulus||'')));
   const tarErr=!result.correct&&(errors.some(e=>e.error_type==='plural_after_numeral')||tarLooks);
   const headline=reveal?'Разберём ответ':!result.correct?(tarErr?'Лишнее -тар. Число уже сказало, сколько.':'Пока не всё верно'):hinted?'Верно с подсказкой. Позже вернёмся к этому без помощи.':'Сходится. Дальше.';
   const blinds=sessionUnaided[q.id]||0;
   const learningCap=cfg.schedule.learningSessionBlinds||3;
   let status=(!day0&&rec.streak>=2)||(day0&&blinds>=learningCap)?'Следующая проверка по памяти: '+new Date(rec.dueAt).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'.':!result.correct?'Эта карточка появится снова.':day0?'Для закрепления карточка вернётся в этом подходе ещё раз (нужно '+learningCap+' слепых).':'Для закрепления карточка вернётся позже.';
   if(deferred)status='Карточка сохранена для следующего подхода: сейчас не хватает других заданий для паузы.';
   if(result.correct&&hinted)status='Перенабор засчитан как обучение, не как самостоятельный успех. Карточка вернётся в этом подходе слепой.';
   const answerLine=q.kind==='multi'?q.correct.join(', '):(q.fields||[]).map(f=>f.answers.join(' / ')).join('; ');
   const alsoOk=!result.correct?'':(q.fields||[]).map((f,i)=>{
     const used=core.normalize(answers[i]||'');
     const rest=(f.answers||[]).filter(a=>core.normalize(a)!==used);
     return rest.length?rest.join(', '):'';
   }).filter(Boolean).join('; ');
   const timeLine=mode==='exam'?(examTimedOut?'Время вышло.':'Короткий лимит на карточку'+(elapsedMs>cfg.session.examHardMs&&result.correct?' · медленно.':' · зачёт.')):'';
   const local=errors.map(e=>window.ErrorDiagnostics.line&&window.ErrorDiagnostics.line(e.error_type,e.expected_answer,e.actual_answer,q)||window.ErrorDiagnostics.labels[e.error_type]).filter(Boolean);
   const aiCodes=window.AiTutor&&mode!=='exam'?window.AiTutor.noteAnswer(q,answers,result,hinted,errors,now):[];
   const aiRepeat=window.AiTutor&&aiCodes[0]&&window.AiTutor.shouldOfferExplain(aiCodes[0]);
   const morph=!result.correct?morphemeRow(errors,answerLine,answers.join(' ')):'';
   feedback.innerHTML=`<h3>${headline}</h3>${tarErr?'<p class="error-sticker">не -тар</p><p>Нужно: <strong lang="kk">'+esc(answerLine)+'</strong>.</p>':''}${morph}${!tarErr?'<p><strong>Ответ:</strong> '+esc(answerLine)+'.</p>':''}${result.correct&&alsoOk?'<p class="small">Ещё верно: '+esc(alsoOk)+'.</p>':''}${local.length?'<p><strong>Где ошибка:</strong> '+[...new Set(local)].map(esc).join('; ')+'.</p>':''}<p>${esc(q.explanation)}</p><p class="small">${status}</p>${timeLine?'<p class="small">'+timeLine+'</p>':''}`+(!result.correct&&mode!=='exam'?`<div class="ai-tutor-panel" id="ai-tutor-panel"><div class="ai-tutor-actions"><button type="button" class="text-button" id="ai-why">Почему так?</button><button type="button" class="text-button" id="ai-rule">Покажи правило</button></div>${aiRepeat?'<p class="small" id="ai-repeat-note">Это уже повторялось — разберём</p>':''}<div id="ai-tutor-out" class="ai-tutor-out" hidden></div></div>`:'');feedback.hidden=false;if(!result.correct&&window.ExplainOpen){const offers=sameSkillOffers(q);feedback.insertAdjacentHTML('beforeend',(window.ExplainOpen.chainHtml?window.ExplainOpen.chainHtml(q,answers):window.ExplainOpen.forQuestion(q,answers))+offerHtml(offers));window.ExplainOpen.bind(feedback);bindOffers(feedback);}if(!result.correct&&mode!=='exam'&&window.AiTutor&&window.AiTutor.coverageGaps&&!feedback.querySelector('[data-coverage-gap]')){const gap=window.AiTutor.coverageGaps().find(g=>aiCodes.includes(g.error_code));if(gap)feedback.insertAdjacentHTML('beforeend','<p class="small" data-coverage-gap>'+esc(gap.phrase)+(gap.label?' '+esc(gap.label)+'.':'')+'</p>');}
   if(!result.correct&&mode!=='exam'&&window.AiTutor){
     const unlock=()=>{['ai-why','ai-rule'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=false;});};
     const paint=(resp,token)=>{
       if(token!==tutorToken)return;
       const out=$('#ai-tutor-out');if(!out||!resp)return;
       const msg=String(resp.message_ru||'').trim();
       if(!msg||resp.aborted)return;
       out.hidden=false;
       out.innerHTML='<p>'+esc(msg)+'</p>';
       unlock();
     };
     const ask=(m,localOnly)=>{
       const token=++tutorToken;
       const out=$('#ai-tutor-out');if(out){out.hidden=false;out.textContent='Разбираю этот ответ…';}
       ['ai-why','ai-rule'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=true;});
       const extra={user_answer:answers.join(' '),is_correct:false,hint_used:hinted,codes:aiCodes,surface:tutorSurface(),lesson_id:currentLessonId(q),repeat_count:aiCodes[0]?window.AiTutor.sameErrorCount(aiCodes[0]):0};
       if(m==='explain_rule'||localOnly){
         paint(window.AiTutor.localFallback(q,aiCodes,'explain_rule',extra),token);
         unlock();
         return;
       }
       const req=window.AiTutor.buildRequest(m,q,extra);
       const ac=typeof AbortController!=='undefined'?new AbortController():null;
       tutorAbort=ac;
       window.AiTutor.callTutor(req,25000,{signal:ac&&ac.signal}).then(resp=>paint(resp,token)).catch(()=>paint(window.AiTutor.localFallback(q,aiCodes,m,extra),token)).finally(()=>{if(token===tutorToken)unlock();});
     };
     if($('#ai-why'))$('#ai-why').onclick=()=>ask('explain_error');
     if($('#ai-rule'))$('#ai-rule').onclick=()=>ask('explain_rule',true);
     if(aiRepeat)ask('explain_error');
     const extra=window.AiTutor.takeRemediation(byId);
     if(extra.length)window.AiTutor.spliceRemediation(queue,position,extra.map(x=>x.id));
   }
   try{renderStats();save();}catch(_){}
   cancelAdvance();
   if(result.correct&&!reveal){
     const next=$('#next-button'),check=$('#check-button');
     if(check)check.hidden=true;
     if(next){next.hidden=false;try{next.focus({preventScroll:true});}catch{}}
     advanceTimer=setTimeout(()=>{advanceTimer=null;nextQuestion();},400);
   }
 }
 function nextQuestion(){cancelAdvance();abortTutor();draft=null;retrying=false;position++;if(!['ordered','shuffle','homework','course','phrase','transfer','slice','repair'].includes(mode)&&sessionAttempts>=cfg.session.maxAttempts)position=queue.length;render();const ex=$('#exercise');if(ex)ex.scrollIntoView({block:'start',behavior:'auto'});focusAnswer();}
 function homeworkOpts(){
   const sessionGUnlocked=!!(window.Lesson31Pack?.sessionG?.().length)&&window.Lesson31Pack.sessionG().every(q=>records[q.id]?.seen);
   return {sessionGUnlocked,events:state.events};
 }
 function startHomework(lessonId,part,section){
   const H=window.Homework,pack=(H.packs(questions,course,homeworkOpts()).find(p=>p.lesson_id===lessonId));
   if(!pack)return;
   hwLesson=lessonId;hwPart=part||'exercises';mode='homework';topic='all';sourceFilter=null;vocabRole=null;activeLesson=null;activeStep=null;courseBlock=lessonId;
   const attempt=H.ensureAttempt(state,lessonId);
   const all=(part==='words'?pack.homework.word_question_ids||[]:pack.homework.exercise_ids).filter(id=>byId.has(id));
   const n=H.sectionCount(all);
   let sec=section==null?H.sectionOf(H.resumeIndex(all,attempt)):Math.floor(Number(section)||0);
   sec=Math.max(0,Math.min(n-1,sec));
   if(mode==='homework'&&hwLesson===lessonId&&(hwPart||'exercises')===(part||'exercises')&&hwSection===sec&&queue.length>position){showView('practice');return;}
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
   const list=window.Homework.packs(questions,course,homeworkOpts());
   const weak=window.Homework.weakSpots(state,questions);
   const pick=hwLesson&&list.find(p=>p.lesson_id===hwLesson)||list[0];
   if(!pick){root.innerHTML='<div class="panel"><p>Пакеты ДЗ 1–1…1–3 ещё не собраны из банка.</p></div>';return;}
   const pack=pick,attempt=window.Homework.ensureAttempt(state,pack.lesson_id),h=pack.homework;
   const exercisesClosed=pack.lesson_id==='3-3'&&!h.exercise_ids.length;
   const ready=!exercisesClosed&&window.Homework.sheetReady(attempt,pack);
   const exP=window.Homework.partProgress(attempt,h.exercise_ids),wP=window.Homework.partProgress(attempt,h.word_question_ids||[]);
   const exN=window.Homework.sectionCount(h.exercise_ids),wN=window.Homework.sectionCount(h.word_question_ids||[]);
   const resumeAt=window.Homework.resumeIndex(h.exercise_ids,attempt);
   const check=key=>`<label class="pref-check"><input type="checkbox" data-hw-check="${key}" ${attempt.checklist[key]?'checked':''}> ${{method:'Повторила методичку',exercises:'Упражнения сборника',words:'Слова урока',external_test:'Зафиксировала на сайте',keyboard:'Казахская раскладка на телефоне',cheat:'Шпаргалка сохранена'}[key]||key}</label>`;
   const secBtns=(part,n)=>n<=1?'':`<div class="jump-row">${Array.from({length:n},(_,i)=>`<button type="button" class="chip" data-hw-part="${part}" data-hw-sec="${i}">Часть ${i+1}</button>`).join('')}</div>`;
   const wordLine=(pack.lesson_id==='3-1'||pack.lesson_id==='3-2'||pack.lesson_id==='3-3')?`${(h.word_ids||[]).length} слов × направления, карточек ${wP.done} из ${wP.total}`:`${wP.done} из ${wP.total} слов`;
   const headLine=exercisesClosed?'Упражнения ещё закрыты. Они появятся после сдачи правила. Просмотр карточки их не открывает.':`Готово ${exP.done} из ${exP.total} упражнений · ${wordLine}. Это выборка урока, не весь сборник и не повторение.`;
   const openExercises=exercisesClosed?'':`<button type="button" class="primary-button" data-hw-part="exercises">${exP.done?('Продолжить с задания '+(resumeAt+1)):'Открыть упражнения'}</button>`;
   root.innerHTML=`<div class="panel homework-head"><p class="eyebrow">УРОК ${esc(pack.lesson_id)}</p><h2>${esc(h.title)}</h2><p>${headLine}</p>${openExercises}</div>
     <div class="panel"><div class="jump-row">${list.map(p=>`<button type="button" class="chip" data-hw-lesson="${p.lesson_id}" ${p.lesson_id===pack.lesson_id?'aria-pressed="true"':''}>${esc(p.homework.title)}</button>`).join('')}</div>
       <p class="small">Открытие правила не повышает уровень. Готовый ответ — как подсказка в практике. Можно выйти в любой момент: ответы уже в листе.</p>
       <ol class="learning-steps">
         <li>Повторить методичку — ${h.method_url?`<a href="${esc(h.method_url)}" target="_blank" rel="noopener noreferrer">${esc(h.method_title)}</a>`:'ссылка на материал урока'}${check('method')}</li>
         <li>${exercisesClosed?'Упражнения сборника откроются вместе с правилом.':`Упражнения сборника (${h.exercise_ids.length} пунктов, по ${window.Homework.HW_SECTION} в части) <button type="button" class="secondary-button" data-hw-part="exercises">${exP.done?'Продолжить упражнения':'Открыть упражнения'}</button>${secBtns('exercises',exN)}`}</li>
         <li>Слова урока: сначала узнать (казахский → русский), потом написать. ${h.word_ids.length} слов. <button type="button" class="secondary-button" data-hw-part="words">${wP.done?'Продолжить слова':'Открыть слова'}</button>${secBtns('words',wN)}</li>
         <li>Внешний тест: ${(h.external_tests&&h.external_tests.length?h.external_tests:[h.external_test_url]).filter(Boolean).map(u=>`<a class="ext-test-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">BatylBol · внешний тест</a>`).join(' · ')||'URL в PDF не найден'}. Мы результат сайта не проверяем и не обещаем зачёт на BatylBol. ${check('external_test')}</li>
         ${(h.extras||[]).map(x=>'<li>'+check(x)+'</li>').join('')}
       </ol>
       <p class="small">Повторно открыть лист можно. «Новая сдача» не стирает прошлый файл. Пауза на карточке возвращает сюда без потери набора.</p>
       <div class="review-actions"><button type="button" class="text-button" data-hw-new>Новая сдача</button></div>
     </div>
     <div class="panel"><h2>Слабые места</h2>${weak.length?weak.map(w=>`<div class="confusion-row"><div><strong>${esc(window.Homework.weakLabel(w.key))}</strong><p class="small">${w.count} раз за 14 дней. Ждали: ${esc(w.expected)} · написала: ${esc(w.actual)}</p></div><button type="button" class="secondary-button" data-weak="${esc(w.cardId)}">Разобрать</button></div>`).join(''):'<p>Пока нет устойчивых слабых мест.</p>'}</div>
     <div class="panel" ${ready?'':'hidden'}><h2>Домашка пройдена</h2>
       <p>Следующий шаг — повторение. Оно использует сохранённые результаты и вернёт нужные карточки по расписанию.</p>
       <p><button type="button" class="primary-button" data-hw-review>Перейти к повторению</button></p>
     </div>
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
   const reviewBtn=root.querySelector('[data-hw-review]');
   if(reviewBtn)reviewBtn.onclick=()=>{courseBlock=pack.lesson_id;topic='all';sourceFilter=null;vocabRole=null;activeLesson=null;activeStep=null;mode='review';queue=[];position=0;practiceIds=[];showView('review');};
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
     const Bank=window.ExplainBankUI;
     const title=ch&&Bank?Bank.chapterTitle(ch):(ch&&ch.title)||'';
     const bits=['<button type="button" class="text-button" data-path-learn>← Занятия</button>'];
     if(les)bits.push('<span>→</span><button type="button" class="text-button" data-path-les="'+esc(les.id)+'">Урок '+esc(les.id)+'</button>');
     if(ch)bits.push('<span>→</span><strong>'+esc(title)+'</strong>');
     return '<nav class="path-crumb">'+bits.join(' ')+'</nav>';
   };
   const bindCrumb=()=>{
     const back=root.querySelector('[data-path-learn]');if(back)back.onclick=()=>showView('learn');
     const h=root.querySelector('[data-path-hub]');if(h)h.onclick=()=>{persistLessonPath(gp.lessonId);gp.phase='hub';gp.lessonId=null;gp.chapterId=null;save();renderPath();};
     const l=root.querySelector('[data-path-les]');if(l)l.onclick=()=>{captureDraft();gp.phase='lesson';save();renderPath();};
   };
   const bindTutor=(les,ch)=>{
     if(!window.TutorUI)return;
     const Bank=window.ExplainBankUI;
     window.TutorUI.setContext({surface:'path',lesson_id:les&&les.id||'',chapter_id:ch&&ch.id||'',rule_id:ch&&Bank?Bank.ruleForChapter(ch):''});
     window.TutorUI.syncView('path');
   };
   const isCanonBeat=k=>['goal','why','bridge','slots','algo','ex','trap','fold'].includes(k);
   document.body.classList.toggle('path-immersive',!!(gp.lessonId&&gp.phase==='beat'));
   if(gp.phase==='hub'||gp.phase==='pick'||!gp.lessonId){
     bindTutor(null,null);
     root.innerHTML=`<div class="panel path-map"><h2>Уроки и правила</h2><p>Разбираем только то, что уже было на занятиях. Это не домашка и не «Пора повторить».</p>
       <div class="path-lessons">${list.map(les=>{
         const n=les.chapters.length,done=les.chapters.filter(c=>gp.completedChapters&&gp.completedChapters[les.id+':'+c.id]).length;
         return `<button type="button" class="lesson" data-les="${les.id}"><span class="number">${esc(les.id)}</span><div><h3>${esc(les.title)}</h3><p>Глав ${done} из ${n}</p></div><span class="small">${done?'Можно повторить':'Продолжить'}</span></button>`;
       }).join('')}</div>
       <p class="small">Прохождение не ставит Good словам словаря.</p></div>`;
     root.querySelectorAll('[data-les]').forEach(b=>b.onclick=()=>openPathLesson(b.dataset.les));
     return;
   }
   const les=G.lesson(gp.lessonId);
   if(!les){gp.phase='hub';renderPath();return;}
   const Bank=window.ExplainBankUI;
   const courseRow=Bank&&Bank.courseById(les.id);
   if(gp.phase==='done'){
     bindTutor(les,null);
     root.innerHTML=`<div class="panel path-paper">${crumb(les,null)}<h2>Урок разобран</h2><p>${esc(courseRow?courseRow.name:les.title)}</p>
       <div class="lesson-actions"><button type="button" class="primary-button" id="path-to-practice">Перейти к практике</button>
       <button type="button" class="secondary-button" data-path-learn>К урокам</button></div></div>`;
     bindCrumb();
     const go=$('#path-to-practice');if(go)go.onclick=()=>startCourse(les.id);
     return;
   }
   if(gp.phase==='lesson'||!gp.chapterId){
     bindTutor(les,null);
     const map31=les.id==='3-1'&&window.ExplainOpen?window.ExplainOpen.map31():'';
     root.innerHTML=`${map31}<div class="panel">${crumb(les,null)}<h2>Урок ${esc(courseRow?courseRow.label:les.id)}</h2><p>${esc(courseRow?courseRow.name:les.title)}</p>
       <p class="small">${esc((les.chapters||[]).filter(c=>gp.completedChapters&&gp.completedChapters[les.id+':'+c.id]).length)} из ${les.chapters.length} глав</p>
       <div class="path-chapters">${les.chapters.map((c,i)=>{
         const ok=gp.completedChapters&&gp.completedChapters[les.id+':'+c.id];
         const title=Bank?Bank.chapterTitle(c):c.title;
         return `<button type="button" class="secondary-button" data-ch="${c.id}">Глава ${i+1} из ${les.chapters.length} · ${esc(title)}${ok?' ✓':''}</button>`;
       }).join('')}</div>
       <p><button type="button" class="text-button" data-path-learn>К урокам</button></p></div>`;
     bindCrumb();
     root.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>openChapter(les.id,b.dataset.ch));
     if(window.ExplainOpen)window.ExplainOpen.bind(root);
     return;
   }
   const ch=G.chapter(les.id,gp.chapterId);if(!ch){gp.phase='lesson';renderPath();return;}
   const beats=ch.beats||[],beat=beats[gp.beat];
   if(!beat){
     G.markChapterDone(gp,les.id,ch.id);
     const nxt=(les.chapters||[]).find(c=>c.id!==ch.id&&!(gp.completedChapters&&gp.completedChapters[les.id+':'+c.id]));
     if(nxt){G.startChapter(state,les.id,nxt.id);save();renderPath();return;}
     gp.phase='done';gp.chapterId=null;save();renderPath();return;
   }
   const chTitle=Bank?Bank.chapterTitle(ch):ch.title;
   const head=`${crumb(les,ch)}<p class="small">Урок ${esc(courseRow?courseRow.label:les.id)} · ${esc(courseRow?courseRow.name:les.title)}</p><p class="small">Глава ${les.chapters.findIndex(c=>c.id===ch.id)+1} из ${les.chapters.length} · ${esc(chTitle)}</p>`;
   const nextBeat=()=>{gp.beat++;save();renderPath();};
   const letters=state.prefs.letters;
   const kb=letters?`<div class="letter-keyboard" lang="kk">${[...'әғқңөұүһі'].map(ch=>'<button type="button" lang="kk" data-letter="'+ch+'">'+ch+'</button>').join('')}</div>`:'';
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
   const bankCard=Bank&&Bank.cardForChapter(ch);
   const canonKey=les.id+':'+ch.id;
   if(bankCard&&isCanonBeat(beat.k)&&gp.canonShownFor!==canonKey){
     gp.canonShownFor=canonKey;
     const paras=Bank.paras;
     const ru=paras(bankCard.ru_refresh).map(p=>'<p>'+esc(p)+'</p>').join('');
     const med=paras(bankCard.medium).map(p=>'<p>'+esc(p)+'</p>').join('');
     const ex=(bankCard.examples||[]).map(x=>'<li lang="kk">'+esc(x)+'</li>').join('');
     const traps=(bankCard.traps||[]).map(t=>'<li>Не так: <span lang="kk">'+esc(String(t).replace(/^\*/,''))+'</span></li>').join('');
     const rest=beats.find((b,i)=>i>=gp.beat&&!isCanonBeat(b.k));
     const cta=rest&&rest.k==='ask'?'Проверить себя':'Продолжить →';
     root.innerHTML=`<div class="panel path-paper path-canon">${head}<h2>${esc(bankCard.title)}</h2>
       ${ru?'<section class="path-block path-ru"><h3>Сравни с русским</h3>'+ru+'</section>':''}
       ${med?'<section class="path-block"><h3>Как работает</h3>'+med+'</section>':''}
       ${ex?'<section class="path-block"><h3>Примеры</h3><ul class="path-ex">'+ex+'</ul></section>':''}
       ${traps?'<section class="path-block"><h3>Не перепутай</h3><ul class="path-traps">'+traps+'</ul></section>':''}
       <button type="button" class="secondary-button" id="path-full" data-full-rule="${esc((ch.rule_ids||[])[0]||canonKey)}">Показать полностью</button>
       <div id="path-full-panel" data-full-panel${(window.ExplainDepth&&window.ExplainDepth.get((ch.rule_ids||[])[0]||canonKey))?'':' hidden'}>${window.ExplainOpen?window.ExplainOpen.fullHtml((ch.rule_ids||[])[0]||''):''}</div>
       <button type="button" class="primary-button" id="path-next">${cta}</button></div>`;
     bindCrumb();bindTutor(les,ch);
     $('#path-next').onclick=()=>{save();renderPath();};
     if(window.ExplainOpen)window.ExplainOpen.bind(root);
     return;
   }
   bindTutor(les,ch);
   if(beat.k==='goal'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="eyebrow">ЦЕЛЬ ГЛАВЫ</p><h2>После этой главы</h2><p>${esc(beat.t)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='sound'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="eyebrow">КАК ПРИМЕРНО ПОЧУВСТВОВАТЬ</p><h2 lang="kk">${esc(beat.letter)}</h2><p><strong>Русский якорь:</strong> ${esc(beat.anchor)}</p><p>${esc(beat.art)}</p><p lang="kk">${esc(beat.ex)}</p><p class="small">${esc(beat.warn)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='why'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>${esc(beat.t)}</h2><p>${esc(beat.b)}</p><button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='bridge'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Сравни с русским</h2>
       <p><strong>В русском ты привыкла…</strong> ${esc(beat.ru)}</p>
       <p><strong>В казахском иначе…</strong> ${esc(beat.kz)}</p>
       <p><strong>Поэтому делай…</strong> ${esc(beat.do)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='slots'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Из чего это собирается</h2><p>${esc(beat.t)}</p>
       <div class="path-slots">${(beat.parts||[]).map(p=>'<span class="path-slot">'+esc(p.l)+'</span>').join('<span class="path-plus">+</span>')}</div>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='algo'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>${esc(beat.t)}</h2><ol class="learning-steps">${(beat.items||[]).map(i=>'<li>'+esc(i)+'</li>').join('')}</ol>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='ex'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Разобранный пример</h2>
       <p lang="kk" class="stimulus">${esc(beat.from)} → ${esc(beat.to)}</p>
       <p>${esc(beat.ru)}</p>
       <p>Слот: <strong lang="kk">${esc(beat.slot)}</strong>. ${esc(beat.why)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='trap'){
     root.innerHTML=`<div class="panel path-paper">${head}<h2>Не перепутай</h2>
       <p>Нельзя: <s lang="kk">${esc(beat.bad)}</s></p>
       <p>Нужно: <strong lang="kk">${esc(beat.good)}</strong></p>
       <p>${esc(beat.why)}</p>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='fold'){
     root.innerHTML=`<div class="panel path-paper">${head}<details open><summary>${esc(beat.t)}</summary><p>${esc(beat.b)}</p></details>
       <button type="button" class="primary-button" id="path-next">Дальше</button></div>`;
     bindCrumb();$('#path-next').onclick=nextBeat;return;
   }
   if(beat.k==='ask'){
     root.innerHTML=`<div class="panel path-paper">${head}<p class="phase-label">${beat.type==='one_prod'?'Самостоятельно':beat.type==='trap_choice'?'Ловушка':'Проверь понимание'}</p>
       <h2>${esc(beat.prompt)}</h2>
       ${beat.stem?'<p class="stimulus" lang="kk">'+esc(beat.stem)+'</p>':''}
       <form id="path-form" class="practice-composer"><div class="composer-row"><input id="path-answer" type="text" lang="kk" enterkeyhint="enter" autocomplete="off" spellcheck="false"><button type="submit" class="primary-button" id="path-check">Проверить</button></div>${kb}
         <div id="path-fb" class="feedback" hidden></div>
         <div class="lesson-actions">
           <button type="button" class="secondary-button" id="path-rule">Подсказка</button>
           <button type="button" class="text-button" id="path-idk">Не знаю</button></div></form></div>`;
     bindCrumb();
     const input=$('#path-answer');
     if(input){
       input.dataset.lesson=les.id;input.dataset.chapter=ch.id;input.dataset.beat=String(gp.beat);
       const saved=gp.pathDraft;
       if(saved&&saved.chapterId===ch.id&&Number(saved.beat)===gp.beat&&(!saved.lessonId||saved.lessonId===les.id))input.value=saved.value||'';
       input.addEventListener('input',save);
       input.focus();
     }
     $$('#path-form [data-letter]').forEach(b=>{b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=()=>{const s=input.selectionStart||input.value.length,end=input.selectionEnd||s;input.value=input.value.slice(0,s)+b.dataset.letter+input.value.slice(end);const n=s+b.dataset.letter.length;try{input.setSelectionRange(n,n);}catch{}input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();};});
     let pathPeek=false;
     const exp=()=>String([].concat(beat.answers||[],beat.answer||[])[0]||'');
     const formAsk=beat.type==='one_prod'||beat.type==='fade';
     const hintLine=()=>{
       if(beat.rule_line)return beat.rule_line;
       if(beat.type==='know_if')return 'Ответ да или нет. Это тот же смысл, что в заголовке, или другой?';
       if(beat.type==='know_lever')return 'Это вопрос «который по счёту», не «сколько предметов». Например екінші — второй, екі кітап — две книги.';
       if(beat.type==='trap_choice')return beat.trap||'Напиши форму, которую курс как раз запрещает.';
       if(formAsk)return 'Обычное число из курса + одна наклейка справа. Пример: бір → бірінші.';
       return 'Вспомни объяснение этой главы, потом напиши короткий ответ.';
     };
     const showPathFb=(cls,html)=>{
       const box=$('#path-fb');box.hidden=false;box.className='feedback '+cls;box.innerHTML=html;
       const go=$('#path-go');if(go)go.onclick=nextBeat;
     };
     const askDummy=()=>{
       const n=(state.grammarPath&&state.grammarPath.fails&&beat.error_key&&state.grammarPath.fails[beat.error_key])||0;
       const tRules=(window.AiRules&&window.AiRules.allowedRuleIds([les.id]))||[];
       const step=beatPlain(beat).replace(/падеж\w*|посессив\w*|притяжательн\w*/gi,' ').replace(/\s+/g,' ').trim().slice(0,220);
       const again=n>=2?('Ученица уже '+n+' раз ошибалась на этом шаге. Скажи это мягко. '):'';
       return {id:'path:'+les.id+':'+ch.id+':'+(beat.id||''),lessonId:les.id,title:beat.prompt||ch.title,stimulus:again+'Глава: '+ch.title+'. '+step,fields:[{answers:['']}],ruleIds:tRules};
     };
     $('#path-rule').onclick=()=>{
       pathPeek=true;
       const local=hintLine();
       showPathFb('hinted','<p>'+esc(local)+'</p>');
     };
     const pathSkillFor=(errorType,errorKey,beat)=>{
       const known={
         vowel_harmony:{item_id:'rule:plural',skill_type:'harmony'},
         plural_initial_consonant:{item_id:'rule:plural',skill_type:'initial_consonant'},
         plural_after_numeral:{item_id:'rule:plural',skill_type:'plural_suppression'},
         ordinal_20:{item_id:'rule:ordinal',skill_type:'exception_20'},
         harmony:{item_id:'rule:plural',skill_type:'harmony'},
         junction_ldt:{item_id:'rule:plural',skill_type:'initial_consonant'},
         quantity:{item_id:'rule:plural',skill_type:'plural_suppression'},
         ol_no_ending:{item_id:'rule:T9_OL',skill_type:'application'},
         ba_me:{item_id:'rule:T10_QUESTION',skill_type:'application'},
         chunk_address:{item_id:'rule:farewell',skill_type:'application'},
         person_sg_initial:{item_id:'rule:person',skill_type:'sg_initial'},
         person_marker_missing:{item_id:'rule:person',skill_type:'marker_presence'},
         person_sen_siz:{item_id:'rule:person',skill_type:'sen_siz'},
         person_biz_initial:{item_id:'rule:person-pl',skill_type:'biz_initial'},
         plural_on_predicate:{item_id:'rule:person-pl',skill_type:'no_extra_plural'},
         extra_plural:{item_id:'rule:person-pl',skill_type:'no_extra_plural'},
         emes_position:{item_id:'rule:person-neg',skill_type:'position'},
         question_particle_missing:{item_id:'rule:person-q',skill_type:'presence'},
         question_class:{item_id:'rule:person-q',skill_type:'class'}
       };
       if(errorType==='ordinal_20')return known.ordinal_20;
       if(errorKey==='ordinal'||errorType==='ordinal'){
         const blob=[beat&&beat.prompt,beat&&beat.answer,beat&&beat.stem].filter(Boolean).join(' ');
         const skill=window.ErrorDiagnostics&&window.ErrorDiagnostics.ordinalSkill?window.ErrorDiagnostics.ordinalSkill(blob,''):'suffix_family';
         return {item_id:'rule:ordinal',skill_type:skill};
       }
       return known[errorType]||known[errorKey]||null;
     };
     const commitPath=(ok,peeked,val)=>{
       const now=Date.now(),right=exp(),written=String(val||'');
       const qPath={id:'path:'+les.id+':'+ch.id+':'+(beat.id||''),lessonId:les.id,kind:'fields',stimulus:beat.stem||'',title:beat.prompt||ch.title,fields:[{kind:'text',answers:[right]}],ruleIds:(ch.rule_ids||[]).filter(id=>/^T\d/.test(id)),vocabIds:[],topic:beat.error_key==='harmony'?'sounds':''};
       const result={correct:!!ok,parts:[!!ok]};
       const diagErrors=(!ok&&window.ErrorDiagnostics)?window.ErrorDiagnostics.diagnose(qPath,[written],result,now):[];
       const binds=[];
       const seenBind=new Set();
       for(const err of diagErrors){
         const b=pathSkillFor(err.error_type,beat.error_key,beat);
         if(!b)continue;
         const k=b.item_id+'::'+b.skill_type;
         if(seenBind.has(k))continue;
         seenBind.add(k);
         binds.push({item_id:b.item_id,skill_type:b.skill_type,field:0,facet:null});
       }
       if(!binds.length){
         const b=pathSkillFor('',beat.error_key,beat);
         if(b)binds.push({item_id:b.item_id,skill_type:b.skill_type,field:0,facet:null});
       }
       if(binds.some(b=>b.item_id==='rule:person-neg'&&b.skill_type==='position')&&!binds.some(b=>b.item_id==='rule:emes'&&b.skill_type==='application')){
         binds.push({item_id:'rule:emes',skill_type:'application',field:0,facet:null});
       }
       qPath.skillBindings=binds;
       let skills=[];
       if(binds.length&&window.Knowledge)skills=window.Knowledge.observe(state,qPath,result,{at:now,answers:[written],hinted:!!peeked,rule_peek:peeked?1:0,recall:true,response_time_ms:null},diagErrors)||[];
       const aiCodes=window.AiTutor?window.AiTutor.noteAnswer(qPath,[written],result,!!peeked,diagErrors,now).filter(c=>c&&c!=='UNKNOWN'):[];
       if(diagErrors.length)state.errors.push(...diagErrors);
       const eventId='path:'+(beat.id||ch.id)+':'+now;
       G.recordPath(state,beat,ok,peeked,now,{event_id:eventId,actual:written,expected:right,codes:diagErrors.map(e=>e.error_type),skills});
       return {right,written,diagErrors,aiCodes};
     };
     $('#path-idk').onclick=()=>{
       pathPeek=true;
       const typed=input?input.value:'';
       const noted=commitPath(false,true,typed);
       if(input)input.value=noted.right;
       showPathFb('hinted','<p>Правильно: <strong>'+esc(noted.right)+'</strong></p><p class="small">Это подсказка, не самостоятельный ответ.</p><button type="button" class="primary-button" id="path-go">Дальше</button>');
       save();
     };
     $('#path-form').onsubmit=e=>{
       e.preventDefault();
       if(e.isComposing||(e.nativeEvent&&e.nativeEvent.isComposing))return;
       const val=$('#path-answer').value,ok=G.evalCheck(beat,val);
       const noted=commitPath(ok,pathPeek,val);
       if(ok){nextBeat();return;}
       const right=noted.right;
       const diag=formAsk&&val.trim()?G.diagnoseProd(right,val):'Пока неверно.';
       const why=noted.diagErrors.map(err=>window.ErrorDiagnostics&&window.ErrorDiagnostics.labels[err.error_type]||err.error_type).filter(Boolean);
       const bankCard=window.ExplainBankUI&&window.ExplainBankUI.cardForChapter(ch);
       const tr=window.TransferItems&&window.TransferItems.oneForPath(ch,les,{catalog:window.CURRICULUM});
       const ruleId=window.ExplainBankUI&&window.ExplainBankUI.ruleForChapter?window.ExplainBankUI.ruleForChapter(ch):'';
       const pathRules=(ch.rule_ids||[]).filter(id=>/^T\d/.test(id)||(window.ExplainBank&&window.ExplainBank.byId&&window.ExplainBank.byId(id)));
       if(ruleId&&!pathRules.includes(ruleId))pathRules.unshift(ruleId);
       const pathQ={id:'path:'+ch.id,lessonId:les.id,ruleIds:pathRules,fields:[{answers:[right]}],explanation:diag,stimulus:beat.stem||''};
       const offers=sameSkillOffers(pathQ);
       const chain=window.ExplainOpen&&window.ExplainOpen.chainHtml?window.ExplainOpen.chainHtml(pathQ,val):'';
       const gap=window.AiTutor&&window.AiTutor.coverageGaps?window.AiTutor.coverageGaps().find(g=>noted.aiCodes.includes(g.error_code)):null;
       const gapHtml=gap&&!offers.isolated&&!offers.other?'<p class="small" data-coverage-gap>'+esc(gap.phrase)+(gap.label?' '+esc(gap.label)+'.':'')+'</p>':'';
       showPathFb('error','<p data-error-diff>Отличие: <s lang="kk">'+esc(val.trim()||'пусто')+'</s> → <strong lang="kk">'+esc(right)+'</strong></p><p>Ты написала: <strong lang="kk">'+esc(val.trim()||'пусто')+'</strong></p><p>Нужно: <strong lang="kk">'+esc(right)+'</strong></p>'+(why.length?'<p>'+esc([...new Set(why)].join(' · '))+'</p>':'')+'<p>'+esc(diag)+'</p>'+chain+offerHtml(offers)+gapHtml+(beat.trap?'<p>'+esc(beat.trap)+'</p>':'')+(bankCard&&bankCard.short?'<p class="small">'+esc(bankCard.short)+'</p>':'')+(tr?'<p class="small">Другой корень: <strong lang="kk">'+esc(tr.stimulus)+'</strong></p><button type="button" class="secondary-button" id="path-transfer">Набрать перенос</button>':'')+'<div class="ai-tutor-actions"><button type="button" class="text-button" id="path-again-rule">Ещё раз правило</button><button type="button" class="text-button" id="path-ask-tutor">Спросить тьютора</button></div><button type="button" class="primary-button" id="path-go">Дальше</button>');
       if(window.ExplainOpen)window.ExplainOpen.bind($('#path-fb'));
       bindOffers($('#path-fb'));
       const again=$('#path-again-rule');if(again)again.onclick=()=>{showPathFb('hinted','<p>'+esc(bankCard&&(bankCard.short||bankCard.medium)||hintLine())+'</p>');};
       const goTr=$('#path-transfer');if(goTr&&tr)goTr.onclick=()=>{if(!byId.has(tr.id)){course.questions.push(tr);byId.set(tr.id,tr);}mode='transfer';queue=[tr.id];practiceIds=[tr.id];position=0;checked=false;sessionBlindFails=Object.create(null);sessionUnaided=Object.create(null);resetCounts();render();showView('practice');};
       const askT=$('#path-ask-tutor');if(askT)askT.onclick=()=>{
         if(!window.TutorUI)return;
         const Bank=window.ExplainBankUI;
         window.TutorUI.setContext({surface:'path',lesson_id:les.id,chapter_id:ch.id,rule_id:Bank?Bank.ruleForChapter(ch):'',user_answer:val,expected_answer:right,codes:noted.aiCodes});
         window.TutorUI.open();
       };
       save();
     };
     
     return;
   }
   nextBeat();
 }
 function finishStagedPractice(lessonId){
   const ctx=stageContext;
   const report=P.evaluateStage(state.events,ctx);
   if(report.pass){
     const done=P.pushStageCompletion(state.events,ctx,report.independent,Date.now());
     if(done)state.events.push(done);
   }
   const status=P.lessonStatusAfterStage((P.ensureLessonProgress(state,lessonId)||{}).status,ctx,report);
   stageContext=null;
   P.clearLessonPractice(state,lessonId,Date.now());
   if(status==='completed'){
     markLessonCompleted(lessonId);
     $('#exercise').innerHTML='<div class="empty-state"><h2>Практика урока завершена</h2><p>Следующий шаг — домашка этого же урока. Можно выйти и вернуться: место сохранено.</p><div class="finish-actions"><button type="button" class="primary-button" id="course-to-homework">Перейти к домашке</button><button type="button" class="secondary-button" id="course-to-learn">К урокам</button></div></div>';
     $('#course-to-homework').onclick=()=>{hwLesson=lessonId;hwPart='exercises';hwSection=0;showView('homework');};
     $('#course-to-learn').onclick=()=>showView('learn');
     return;
   }
   const lp=P.ensureLessonProgress(state,lessonId);
   if(lp&&lp.status!=='completed')lp.status='in_progress';
   P.setResumePointer(state,lessonId,'practice',Date.now());
   const line=ctx.limitReached||!report.pass?'Подход завершён, продолжим этот навык.':'Этот шаг сдан. Следующий шаг — в том же уроке.';
   $('#exercise').innerHTML='<div class="empty-state"><h2>Шаг урока</h2><p>'+esc(line)+'</p><div class="finish-actions"><button type="button" class="primary-button" id="stage-continue">Продолжить</button><button type="button" class="secondary-button" id="stage-lessons">К урокам</button></div></div>';
   $('#stage-continue').onclick=()=>continueLesson(lessonId);
   $('#stage-lessons').onclick=()=>showView('learn');
 }
 function renderEmpty(){
   if(mode==='repair'&&(state.sliceRun||[]).length){finishRepair();return;}
   if(mode==='slice'&&(state.sliceRun||[]).length){showSliceResult();return;}
   if(hwReturn&&mode==='remediation'){
     const back=hwReturn;hwReturn=null;hwLesson=back.lesson;hwPart=back.part;hwSection=back.section||0;mode='homework';showView('homework');save();return;
   }
   if(mode==='homework'){
     const pack=window.Homework.packs(questions,course,homeworkOpts()).find(p=>p.lesson_id===hwLesson);
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
   if(mode==='course'&&courseBlock){
     const lessonId=courseBlock;
     if(stageContext){
       finishStagedPractice(lessonId);
       save();return;
     }
     markLessonCompleted(lessonId);
     $('#exercise').innerHTML='<div class="empty-state"><h2>Практика урока завершена</h2><p>Следующий шаг — домашка этого же урока. Можно выйти и вернуться: место сохранено.</p><div class="finish-actions"><button type="button" class="primary-button" id="course-to-homework">Перейти к домашке</button><button type="button" class="secondary-button" id="course-to-learn">К урокам</button></div></div>';
     $('#course-to-homework').onclick=()=>{hwLesson=lessonId;hwPart='exercises';hwSection=0;showView('homework');};
     $('#course-to-learn').onclick=()=>showView('learn');
     save();return;
   }
   if(mode==='exam'&&!sessionAttempts){
     $('#exercise').innerHTML='<div class="empty-state"><h2>Экзамен ещё рано</h2><p>По исследованию таймер только на формах, которые уже дважды вспоминались в разные дни. Сначала обычная учёба без часов.</p><button type="button" class="primary-button" id="back-to-learning">К учёбе</button></div>';
     $('#back-to-learning').onclick=()=>{mode='ordered';showView('today');};
     save();return;
   }
   const lesson=activeLesson&&window.LEARNING.lessons.find(l=>l.id===activeLesson);
   const complete=!!lesson&&practiceIds.length>0&&practiceIds.every(id=>stepEvidence[id]);
   if(complete)learningState.completedSteps[activeLesson+':'+activeStep]=true;
   if(trainerReturn){
     const returnKind=trainerReturn;
     $('#exercise').innerHTML='<div class="empty-state"><h2>Подход завершён</h2><p>Самостоятельно: '+sessionCorrect+' из '+sessionAttempts+'. С подсказкой: '+sessionAssisted+'.</p><div class="finish-actions"><button type="button" class="primary-button" id="restart">Ещё подход</button><button type="button" class="secondary-button" id="back-to-learning">К тренажёрам</button></div></div>';
     $('#restart').onclick=()=>startCatalogTrainer(returnKind);
     $('#back-to-learning').onclick=()=>{trainerReturn=null;showView('personal');if(window.PersonalTrainers&&window.PersonalTrainers.openCatalog)window.PersonalTrainers.openCatalog();};
     save();return;
   }
   const waiting=practiceIds.filter(id=>(records[id]?.streak||0)<cfg.schedule.cleanAnswersToConsolidate).length;
   const help=window.LearningSupport.suggestions(state,questions)[0];
   $('#exercise').innerHTML='<div class="empty-state"><h2>Ещё один шаг. Уже твой.</h2><p>'+(complete?'Проверка идеи пройдена. ':'Подход завершён. ')+'Самостоятельно: '+sessionCorrect+' из '+sessionAttempts+'. С подсказкой: '+sessionAssisted+'. Ошибок: '+(sessionAttempts-sessionCorrect-sessionAssisted)+'.</p><p>'+(waiting?'Ещё закрепляем '+waiting+' карточек. Они сохраняются для повторения.':'Можно остановиться; карточки вернутся по расписанию.')+'</p><div class="finish-actions"><button type="button" class="primary-button" id="restart">'+(lesson?(complete?(activeStep<lesson.chunks.length-1?'Следующая идея':'Выбрать следующий урок'):'Вернуться к объяснению'):'Ещё несколько заданий')+'</button><button type="button" class="secondary-button" id="back-to-learning">Закончить</button></div>'+(help?'<div class="panel"><h3>'+esc(help.title)+'</h3><p>Эта ошибка повторялась. Можно отдельно потренировать трудный шаг.</p><button type="button" class="secondary-button" id="start-remedy">Разобрать и проверить</button></div>':'')+'</div>';
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
 function catalogNumberTracks(){
   const order=window.NumberLadder&&window.NumberLadder.ORDER||[];
   const by=new Map((window.LEARNING&&window.LEARNING.lessons||[]).map(l=>[l.id,l]));
   return order.map(id=>by.get(id)).filter(Boolean).map(l=>{
     const open=(l.questionIds||[]).some(qid=>{const q=byId.get(qid);return q&&(!window.NumberLadder||window.NumberLadder.allowed(q,state));});
     return {id:l.id,title:l.title||l.id,open};
   });
 }
 function catalogVocabIds(role){
   let list=questions.filter(q=>eligible(q)&&q.topic==='vocab'&&q.wordRole===role);
   list=window.Knowledge&&window.Knowledge.choose?window.Knowledge.choose(shuffled(list),state,Infinity):shuffled(list);
   const recognize=shuffled(list.filter(q=>/-ru$/.test(q.id)));
   const produce=shuffled(list.filter(q=>/-kk$/.test(q.id)));
   const other=shuffled(list.filter(q=>!/-ru$|-kk$/.test(q.id)));
   const mixed=[];
   while(recognize.length||produce.length){
     if(recognize.length&&produce.length)mixed.push((Math.random()<0.5?recognize:produce).shift());
     else mixed.push((recognize.length?recognize:produce).shift());
   }
   mixed.push(...other);
   const limit=Math.max(2,(cfg.session.size||10)+(cfg.session.newLimit||0));
   let ids=mixed.map(q=>q.id);
   if(window.MemoryPolicy&&window.MemoryPolicy.breakRuns)ids=window.MemoryPolicy.breakRuns(ids,questions);
   return ids.slice(0,limit);
 }
 function startCatalogTrainer(kind){
   trainerReturn=kind;
   if(String(kind).startsWith('number:')){
     const id=String(kind).slice(7),lesson=(window.LEARNING&&window.LEARNING.lessons||[]).find(l=>l.id===id);
     const ids=(lesson&&lesson.questionIds||[]).filter(qid=>{const q=byId.get(qid);return q&&eligible(q)&&(!window.NumberLadder||window.NumberLadder.allowed(q,state));});
     activeLesson=null;activeStep=null;sourceFilter=null;courseBlock=null;topic='numbers';vocabRole=null;mode='numbers';
     queue=shuffled(ids);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;resetCounts();
     if(!queue.length){trainerReturn=null;showView('personal');return;}
     render();showView('practice');return;
   }
   const role=kind==='vocab:used'?'used':'must';
   activeLesson=null;activeStep=null;sourceFilter=null;courseBlock=null;topic='vocab';vocabRole=role;mode='words';
   queue=catalogVocabIds(role);practiceIds=[...queue];variants={};queueEpoch=Date.now()+Math.random();position=0;checked=false;resetCounts();
   if(!queue.length){trainerReturn=null;showView('personal');return;}
   render();showView('practice');
 }
 function launchCatalogTrainer(kind){
   if(trainerReturn===kind&&queue.length>position){showView('practice');return;}
   startCatalogTrainer(kind);
 }
 function catalogTrainerStatus(kind){
   if(trainerReturn!==kind||!queue.length||position>=queue.length)return null;
   return {remaining:queue.length-position,total:queue.length,position};
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
   if(state.aiTutor&&window.AiTutor&&window.AiTutor.restore)window.AiTutor.restore(state.aiTutor);
   window.LessonPackages.install(state.lesson_packages);catalog.activatePromotions(state);window.Knowledge.hydrate(state,questions);for(const q of questions)byId.set(q.id,q);confusionIndex=P.answerIndex(questions);
   activeLesson=null;activeStep=null;queue=[];practiceIds=[];position=0;checked=false;presented=null;pauseTimer();elapsedMs=0;showView('today');
 }
 function vocabTable(rows){return `<div class="table-wrap"><table><thead><tr><th scope="col">Қазақша</th><th scope="col">По-русски / число</th></tr></thead><tbody>${rows.map(([k,r])=>`<tr><td lang="kk">${esc(k)}</td><td>${esc(Array.isArray(r)?r.join(', '):r)}</td></tr>`).join('')}</tbody></table></div>`;}
 function explainCanonMarkup(){
   const Bank=window.ExplainBank;if(!Bank||!Bank.BANK)return '';
   return Object.keys(Bank.BANK).map(id=>{
     const card=Bank.BANK[id]||{};
     const full=window.ExplainOpen&&window.ExplainOpen.fullHtml?window.ExplainOpen.fullHtml(id):'';
     const body=full||esc([card.ru_refresh,card.medium,card.short,(card.examples||[]).join('\n'),(card.traps||[]).join('\n')].filter(Boolean).join('\n\n'));
     return `<div class="panel rule-block" data-rule="${esc(id)}"><h2>${esc(card.title||'Правило')}</h2><p class="small">Полный текст. Краткая карточка его не заменяет.</p>${full?body:'<pre class="rule-pre">'+body+'</pre>'}</div>`;
   }).join('');
 }
 function liveSource(url){
   const u=String(url||'');
   if(!/^https?:\/\//i.test(u))return '';
   if(/qazaqsha\.pages\.dev\/?$/i.test(u))return '';
   return u;
 }
 function canonForSource(key,source){
   const lesson=source&&source.lesson_id;
   const byLesson={'1-1':'T1_HARMONY','1-2':'T2_PLURAL_LDT','1-3':'T4_NO_PLURAL_AFTER_NUMBER','2-1':'T6_PERSON_SG','2-2':'T8_PERSON_PL','2-3':'T9_OL','3-1':'T20_POSS','3-2':'T24_POSS_BIZ','3-3':'T28_OWNER_SUBJECT'};
   if(lesson&&byLesson[lesson])return byLesson[lesson];
   if(key==='phase3-31'||key==='m31'||key==='hw31')return 'T20_POSS';
   if(key==='phase3-32'||key==='m32'||key==='hw32')return 'T24_POSS_BIZ';
   return '';
 }
 function openSearchedRule(id){
   if(!id)return;
   showView('rules');
   showRuleArticle(id);
 }
 function placeLine(q){
   if(!q)return '';
   if(q.slice||q.source==='slice')return 'Проверка дыр';
   if(q.source==='repair'||q.repairRoot)return 'Проверим на новом слове';
   if(q.source==='transfer')return 'Проверим на новом слове';
   if(q.source==='phrase'||q.topic==='phrase')return 'Фраза урока';
   if(q.source==='plus'||q.source==='ai-remed')return 'Короткая ступень';
   if(String(q.source||'').startsWith('hw'))return 'Слово домашки';
   if(/^\d+$/.test(String(q.group||'')))return 'Задание '+q.group+(q.part&&q.part!=='1'?' · пункт '+q.part:'');
   if(q.lessonId)return 'Урок '+String(q.lessonId).replace('-','–');
   return '';
 }
 function bankMarkup(){
   const B=window.WORD_BANK;if(!B)return '';
   const titles={'1-1':'1–1','1-2':'1–2','1-3':'1–3','2-1':'2–1','2-2':'2–2','2-3':'2–3'};
   const mustBlocks=Object.entries(B.must).map(([les,rows])=>'<h3>Домашка '+esc(titles[les]||les)+' · '+rows.length+' слов</h3>'+vocabTable(rows.map(w=>[w.kazakh,w.translation]))).join('');
   const all=[...B.all].sort((a,b)=>a.kazakh.localeCompare(b.kazakh,'kk'));
   return `<div class="panel rule-block" data-rule="bank"><h2>Как запоминать слова</h2>
     <p>Два разных набора — два разных упражнения. Не смешивай.</p>
     <ol class="learning-steps"><li><strong>Задали выучить</strong> — домашка. Смотри пару → закрой → скажи вслух → напиши. Свою ассоциацию (дос = «доска друга») держи 1–2 раза, потом убери.</li><li><strong>Просто встречались</strong> — сначала только узнать (казахский → русский). Писать казахский — отдельным шагом, позже.</li><li>Маленькие пачки по 4. Интервал считает сам тренажёр. Подсказка не считается самостоятельным ответом.</li></ol>
     <p class="small">Интервал считает сам тренажёр. Подсказка не считается самостоятельным ответом.</p></div>
     <div class="panel rule-block" data-rule="bank"><h2>Слова «выучить» из методичек</h2><p>Домашки 1–1, 1–2, 1–3, 2–1 и 2–2. Все <strong>${B.mustCount}</strong> позиций в тренажёре.</p>${mustBlocks}<p><button type="button" class="secondary-button" data-vocab="must">Тренировать заданные слова</button></p></div>
     <div class="panel rule-block" data-rule="bank"><h2>Слова, которые просто встречались</h2><p>${B.extraCount} слов не зубрить списком. Сначала узнать, потом писать.</p>${vocabTable(all.filter(w=>w.role==='used').map(w=>[w.kazakh,(Array.isArray(w.translation)?w.translation.join(', '):w.translation)+' · урок '+w.from_lesson]))}<p><button type="button" class="secondary-button" data-vocab="used">Тренировать встретившиеся слова</button></p></div>`;
 }
 function showRuleArticle(id){
   const typed=$('#rules-ask-q');
   if(typed&&typed.value)state.rulesDraft={article:rulesArticle||'',value:typed.value.slice(0,400)};
   rulesArticle=id||null;
   const toc=$('.rules-toc'),back=$('.rules-back'),ask=$('#rules-ask-panel');
   $$('#rules-content .rule-block').forEach(p=>{p.hidden=id?p.getAttribute('data-rule')!==id:true;});
   if(toc)toc.hidden=!!id;
   if(back)back.hidden=!id;
   if(ask)ask.hidden=!id;
   const box=$('#rules-ask-q');
   if(box){
     const d=state.rulesDraft;
     box.value=d&&(d.article||'')===(rulesArticle||'')?(d.value||''):'';
   }
 }
 function renderRules(){
   $('#rules-content').innerHTML=`
     <div class="panel rules-search"><label for="rules-q">Найти правило, форму или пример</label><input id="rules-q" type="search" placeholder="менің, мой, кітапым" autocomplete="off" enterkeyhint="search"><p class="small">Ищет по всем уже записанным правилам, примерам и полным объяснениям. Новая статья не создаётся.</p></div>
     <button type="button" class="text-button rules-back" hidden>Ко всем правилам</button>
     <nav class="rules-toc" aria-label="Оглавление">
       <p class="eyebrow">Окончания</p>
       <button type="button" class="rules-toc-item" data-rule-open="quantity">После числа множественное не ставится</button>
       <button type="button" class="rules-toc-item" data-rule-open="harmony">Сингармонизм без путаницы</button>
       <button type="button" class="rules-toc-item" data-rule-open="plural">Как выбрать множественное окончание</button>
       <button type="button" class="rules-toc-item" data-rule-open="soft">Мягкое или твёрдое</button>
       <p class="eyebrow">Числа</p>
       <button type="button" class="rules-toc-item" data-rule-open="numbers">Числа: лестница</button>
       <button type="button" class="rules-toc-item" data-rule-open="numbers-hw">Числа из домашней работы 1–2</button>
       <p class="eyebrow">Лица и вопрос</p>
       <button type="button" class="rules-toc-item" data-rule-open="person">Личные окончания</button>
       <p class="eyebrow">Слова</p>
       <button type="button" class="rules-toc-item" data-rule-open="alphabet">Алфавит и произношение</button>
       <button type="button" class="rules-toc-item" data-rule-open="vocab11">11 слов из домашней работы 1–1</button>
       <button type="button" class="rules-toc-item" data-rule-open="words-22">Слова урока 2–2</button>
       <button type="button" class="rules-toc-item" data-rule-open="bank">Как запоминать слова</button>
       <p class="eyebrow">Полные тексты</p>
       ${(window.ExplainBank&&window.ExplainBank.BANK?Object.keys(window.ExplainBank.BANK):[]).map(id=>`<button type="button" class="rules-toc-item" data-rule-open="${esc(id)}">${esc((window.ExplainBank.BANK[id]||{}).title||'Правило')}</button>`).join('')}
     </nav>
     <div class="panel rule-block" data-rule="quantity"><h2>После числа множественное не ставится</h2><p>Число перед существительным уже сообщает количество: <span lang="kk">екі кітап</span>, <span lang="kk">көп адам</span>.</p><p>После числительного и слов көп, аз множественное окончание обычно не нужно: <span lang="kk">екі кітап</span>, <span lang="kk">көп адам</span>, <span lang="kk">аз қалам</span>.</p><p><s lang="kk">екі кітаптар</s> → <strong lang="kk">екі кітап</strong>.</p><p class="small"><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Объяснение и примеры на kaz-tili.kz</a> — дополнительный материал из методички.</p></div>
     <div class="panel ask-zone" id="rules-ask-panel" hidden><p class="small">Свой вопрос по правилу этой страницы. Не открывает падежи и будущие темы.</p><label class="input-label" for="rules-ask-q">Не поняла</label><textarea id="rules-ask-q" rows="2" maxlength="400" autocomplete="off" enterkeyhint="send" placeholder="Напиши вопрос"></textarea><button type="button" class="text-button" id="rules-ask-send">Спросить</button><div id="rules-ask-out" hidden></div></div>
     <div class="panel rule-block" data-rule="harmony"><h2>Сингармонизм без путаницы</h2><p>Для выбора окончания нужны две опоры: <strong>последний слог</strong> определяет гласную, <strong>последняя буква</strong> — первую согласную. Не пытайся запомнить шесть окончаний как шесть отдельных правил.</p><div class="table-wrap"><table><thead><tr><th scope="col">Последняя буква слова</th><th scope="col">Последний слог задний<br>А О Ұ Ы</th><th scope="col">Последний слог передний<br>Ә Ө Ү І Е</th></tr></thead><tbody><tr><th scope="row">Гласная, Р, Й, У → Л</th><td lang="kk">-лар · қалалар</td><td lang="kk">-лер · көшелер</td></tr><tr><th scope="row">Л, М, Н, Ң, Ж, З → Д</th><td lang="kk">-дар · адамдар</td><td lang="kk">-дер · сөздер</td></tr><tr><th scope="row">Глухая; Б, В, Г, Д → Т</th><td lang="kk">-тар · кітаптар</td><td lang="kk">-тер · жігіттер</td></tr></tbody></table></div><p>Пример рассуждения: кі-<strong>тап</strong> → последний слог задний → А. Последняя буква П → Т. Получаем кітап + тар = <span lang="kk">кітаптар</span>.</p><p>И и У разбираем в составе слова: иттер, но ми (мозг) → милар. -мен — особое падежное окончание без чередования А/Е. Остальные группы букв в методичке — учебная схема; полный алфавит не нужно смешивать с двумя основными группами гласных.</p><p><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Правило множественного числа и примеры</a></p></div>
     <div class="panel rule-block" data-rule="numbers"><h2>Числа: лестница, не список до 9999</h2>
     <p>Мозг не учит «47» как отдельное слово. Сначала <strong>0–10</strong>, потом круглые десятки, потом отличаем пары <span lang="kk">сегіз / сексен</span> (8 и 80). Составные собираем из частей.</p>
     <ol class="learning-steps"><li>0–10 — отдельные слова, вразброс, не считая по порядку.</li><li>10, 20, 30, 40, 50 — тоже отдельные слова (жиырма ≠ екі + он).</li><li>60–90 рядом с 6–9: алты↔алпыс, жеті↔жетпіс, сегіз↔сексен, тоғыз↔тоқсан.</li><li>Двузначные сначала с эхом: 88, 55, 66 — в одном числе 8 и 80, 5 и 50.</li><li>Сотни: жүз. Сначала 550, 880, 808.</li><li>Тысячи: мың. Сначала 1550, 8080, 1888.</li></ol>
     <p>47 = 40 + 7 → <span lang="kk">қырық жеті</span>. Для 100 достаточно <span lang="kk">жүз</span>. Для 1001–1999: <span lang="kk">бір мың …</span>.</p>
     <p>Число перед существительным уже сообщает количество: екі кітап, көп адам.</p>
     <p class="small">В «Выбрать занятие» лестница идёт сверху вниз. В «Мой результат» можно взять нужную ступень. Конструктор чисел — внутри урока.</p></div>
     <div class="panel rule-block" data-rule="soft"><h2>Мягкое или твёрдое?</h2><p>Это названия групп из твоего курса для выбора окончаний. Они не совпадают с русской классификацией согласных по мягкости. Формула «слово только мягкое или только твёрдое» — упрощение старта, не универсальное правило: смешанные слова смотрят на последний однозначный слог.</p><div class="pair-strip">${['Ә — А','Ө — О','І — Ы','Ү — Ұ','К — Қ','Г — Ғ'].map(s=>`<span lang="kk">${s}</span>`).join('')}</div><p><strong>Мягкая группа:</strong> Ә, Ө, І, Ү, Е, К, Г; в таблице курса также Э.</p><p><strong>Твёрдая группа:</strong> А, О, Ы, Ұ, Қ, Ғ, Я; в таблице курса также Ё.</p><p><strong>Остальные буквы зависят от слова.</strong> Например, Ң не является «всегда твёрдой»: сравни таң и тең.</p><p class="small">И, У и Ю не нужно угадывать отдельно от слова. Ит и би — мягкие; ми («мозг»), су, ту и у — твёрдые. Сүю — мягкое; аю и ою — твёрдые.</p><details><summary>Смешанные слова и разбор по слогам</summary><p>В мұғалім есть твёрдые и мягкий слог. Для окончания смотрим на последний лім: мұғалімдер. В іссапар последний слог пар твёрдый.</p><p>В учебном разборе слог только с И или У согласуется с предыдущим определённым слогом. Если предыдущего нет — со следующим: ғы-лы-ми, и-не. Для конкретных слов здесь сохранены разборы из ключей курса.</p><p>Окончание -мен — особый случай: досыммен не становится целиком мягким словом. В упражнении с Аманкелдіұлымен разбираем написанные слоги; новое множественное окончание к готовой падежной форме не прибавляем.</p></details></div>
     <div class="panel rule-block" data-rule="plural"><h2>Как выбрать множественное окончание</h2><p>1. По последнему слогу выбери твёрдый вариант с <strong>А</strong> или мягкий с <strong>Е</strong>.<br>2. По последней букве выбери начало окончания.</p><div class="table-wrap"><table><thead><tr><th scope="col">Последняя буква</th><th scope="col">Окончание</th><th scope="col">Пример</th></tr></thead><tbody><tr><td>К, Қ, П, С, Т, Ф, Х, Һ, Ц, Ч, Ш, Щ; Б, В, Г, Д</td><td>тар / тер</td><td>кітаптар<br>жігіттер</td></tr><tr><td>Л, М, Н, Ң, Ж, З</td><td>дар / дер</td><td>адамдар<br>сөздер</td></tr><tr><td>Гласные, Р, Й, У</td><td>лар / лер</td><td>қалалар<br>жерлер</td></tr></tbody></table></div><p class="small">Запоминалка для дар/дер: согласные в «ЛиМоН» + Ң, Ж, З. Чтобы получить единственное число, убери только окончание: дәрігерлер → дәрігер; иелер → ие.</p><details><summary>Число и количество перед существительным</summary><p>После числительного и слов көп, аз множественное окончание обычно не нужно: екі кітап, көп адам, аз қалам.</p><p class="small"><a href="https://kaz-tili.kz/su_mn1.htm" target="_blank" rel="noopener noreferrer">Объяснение и примеры на kaz-tili.kz</a> — дополнительный материал из методички.</p></details></div>
     <div class="panel rule-block" data-rule="alphabet"><h2>Алфавит и произношение</h2><p lang="kk" style="font-size:1.15rem;line-height:1.95">А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я</p><p>Смотри на точную букву: Н ≠ Ң, К ≠ Қ, У ≠ Ұ ≠ Ү, И ≠ І.</p><div class="table-wrap"><table><thead><tr><th scope="col">Буква</th><th scope="col">Ориентир из урока</th><th scope="col">Примеры</th></tr></thead><tbody><tr><td>Ң</td><td>Носовой звук, как ng в sing. Не отдельные Н + Г.</td><td>шын — правда<br>шың — вершина</td></tr><tr><td>Қ, Ғ</td><td>Произносятся глубже, чем К, Г; Ғ — звонкий.</td><td>қол, ғасыр, сағат</td></tr><tr><td>Ы, І</td><td>Краткие гласные; І — передняя пара Ы.</td><td>жыл, алтын; тіс, кім</td></tr><tr><td>Ұ, Ү</td><td>Губы округлены; у Ү язык продвинут вперёд.</td><td>ұн, тұрмыс; үн, күн</td></tr><tr><td>Ә, Ө</td><td>Передние пары А и О; произносятся без добавочного Й.</td><td>ән, мән; өзен, өрт</td></tr><tr><td>Һ</td><td>Лёгкий выдох; встречается в заимствованных словах.</td><td>жиһаз, қаһарман</td></tr><tr><td>И, У, Ю</td><td>Чтение зависит от слова и его звукового состава.</td><td>ит, ми; су, ту; сүю, аю</td></tr><tr><td>Я, О, Е, Щ</td><td>Я — йа; не заменяй безударное О на А; Е в примерах курса — мягкой группы; Щ в ащы читается как шш.</td><td>ұя; орман / арман; ащы, тұщы</td></tr></tbody></table></div><div class="link-list"><a href="https://www.youtube.com/watch?v=CeGuG3jeRgo" target="_blank" rel="noopener noreferrer">Гласные: видео из методички</a><a href="https://www.youtube.com/watch?v=IjbaQlBEwkw" target="_blank" rel="noopener noreferrer">Согласные: видео из методички</a></div><p class="small">Произноси примеры вслух по образцу из видео. Проверка произношения голосом в этой версии не предусмотрена.</p></div>
     <div class="panel rule-block" data-rule="person"><h2>Личные окончания біз / сендер / сіздер</h2>
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
     <div class="panel rule-block" data-rule="vocab11"><h2>11 слов из домашней работы 1–1</h2>${vocabTable(course.vocabulary)}<p><button type="button" class="secondary-button" data-rule-topic="vocab">Тренировать слова</button></p></div>
     <div class="panel rule-block" data-rule="numbers-hw"><h2>Числа и количество из домашней работы 1–2</h2>${vocabTable(course.numbers)}<p><button type="button" class="secondary-button" data-rule-topic="numbers">Тренировать числа</button></p></div>
     <div class="panel rule-block" data-rule="words-22"><h2>Слова урока 2–2</h2>${vocabTable(catalog.words.filter(w=>w.lesson_first_seen==='2-2').map(w=>[w.kazakh,w.translation]))}<p><button type="button" class="secondary-button" data-rule-topic="vocab">Тренировать слова</button></p></div>
     ${explainCanonMarkup()}${bankMarkup()}`;
   const rulesQ=$('#rules-q');
   if(rulesQ)rulesQ.oninput=()=>{
     const n=core.normalize(rulesQ.value);
     if(!n){showRuleArticle(rulesArticle);return;}
     const best=window.CorpusSearch&&window.CorpusSearch.bestRule(rulesQ.value);
     if(best){showRuleArticle(best.id);return;}
     showRuleArticle(null);
     const toc=$('.rules-toc');if(toc)toc.hidden=false;
     $$('#rules-content .rule-block').forEach(p=>{p.hidden=!core.normalize(p.textContent).includes(n);});
     $$('.rules-toc-item').forEach(b=>{b.hidden=!core.normalize(b.textContent).includes(n);});
   };
   $$('[data-rule-open]').forEach(b=>b.onclick=()=>showRuleArticle(b.dataset.ruleOpen));
   const rulesBack=$('.rules-back');
   if(rulesBack)rulesBack.onclick=()=>{if(rulesQ)rulesQ.value='';showRuleArticle(null);};
   const oldCanon={quantity:'T4_NO_PLURAL_AFTER_NUMBER',harmony:'T2_PLURAL_LDT',plural:'T2_PLURAL_LDT',soft:'T1_HARMONY',numbers:'T5_NUMERAL_COMPOSE',person:'T8_PERSON_PL'};
   if(oldCanon[rulesArticle])rulesArticle=oldCanon[rulesArticle];
   for(const [oldId,canonId] of Object.entries(oldCanon)){
     const old=document.querySelector('#rules-content .rule-block[data-rule="'+oldId+'"]');
     const canon=document.querySelector('#rules-content .rule-block[data-rule="'+canonId+'"]');
     if(!old||!canon||old===canon)continue;
     const notes=document.createElement('details');
     notes.className='old-rule-notes';
     notes.innerHTML='<summary>Заметки старой статьи</summary>';
     const h2=old.querySelector('h2');
     [...old.childNodes].forEach(node=>{if(node!==h2)notes.append(node);});
     canon.append(notes);
     old.remove();
   }
   $$('#rules-content [data-rule-open]').forEach(b=>{if(oldCanon[b.dataset.ruleOpen])b.dataset.ruleOpen=oldCanon[b.dataset.ruleOpen];});
   showRuleArticle(rulesArticle);
   const rulesAsk=$('#rules-ask-q');if(rulesAsk)rulesAsk.addEventListener('input',save);
   const rulesSend=$('#rules-ask-send');
   let rulesTail=[];
   const RULE_LESSON={quantity:'1-3',harmony:'1-1',plural:'1-2',soft:'1-1',numbers:'1-3','numbers-hw':'1-2',person:'2-3',alphabet:'1-1',vocab11:'1-1','words-22':'2-2',bank:'1-1'};
   if(rulesSend)rulesSend.onclick=()=>{
     const q=($('#rules-ask-q')&&$('#rules-ask-q').value.trim())||'';
     const out=$('#rules-ask-out');if(!out)return;
     if(!q){out.hidden=false;out.textContent='Напиши вопрос своими словами.';return;}
     out.hidden=false;out.textContent='Разбираю этот ответ…';
     rulesSend.disabled=true;
     const lesson=RULE_LESSON[rulesArticle]||currentLessonId();
     const tRules=(window.AiRules&&window.AiRules.allowedRuleIds(window.AiContract?window.AiContract.lessonsThrough(lesson):[lesson]))||[];
     const dummy={id:'rules:ask:'+(rulesArticle||lesson),lessonId:lesson,title:'Правила курса',stimulus:'',fields:[{answers:['']}],ruleIds:tRules};
     if(!window.AiTutor||!window.AiTutor.callTutor){
       const local=window.AiTutor&&window.AiTutor.localFallback?window.AiTutor.localFallback(dummy,[], 'ask_tutor',{user_question:q,lesson_id:lesson,surface:'rules'}):null;
       out.textContent=(local&&local.message_ru)||'Смотри текст правила выше.';
       rulesSend.disabled=false;return;
     }
     rulesTail.push({role:'user',content:q});rulesTail=rulesTail.slice(-4);
     const token=++tutorToken;
     const ac=typeof AbortController!=='undefined'?new AbortController():null;
     tutorAbort=ac;
     window.AiTutor.askTutor(dummy,q,{surface:'rules',lesson_id:lesson,conversation_tail:rulesTail,signal:ac&&ac.signal}).then(resp=>{
       if(token!==tutorToken)return;
       const msg=resp&&resp.message_ru?String(resp.message_ru).trim():'';
       if(msg){out.textContent=msg;rulesTail.push({role:'assistant',content:msg});rulesTail=rulesTail.slice(-4);return;}
       const local=window.AiTutor.localFallback(dummy,[], 'ask_tutor',{user_question:q,lesson_id:lesson,surface:'rules'});
       out.textContent=(local&&local.message_ru)||'Смотри текст правила выше.';
     }).catch(()=>{
       const local=window.AiTutor.localFallback(dummy,[], 'ask_tutor',{user_question:q,lesson_id:lesson,surface:'rules'});
       out.textContent=(local&&local.message_ru)||'Смотри текст правила выше.';
     }).finally(()=>{rulesSend.disabled=false;});
   };
   $$('[data-rule-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.ruleTopic;sourceFilter=null;mode='ordered';showView('practice');startQueue();});
   $$('#rules-content [data-source]').forEach(b=>b.onclick=()=>{sourceFilter=b.dataset.source;vocabRole=null;topic='all';mode='ordered';showView('practice');startQueue();});
   $$('#rules-content [data-vocab]').forEach(b=>b.onclick=()=>{vocabRole=b.dataset.vocab;courseBlock=null;sourceFilter=null;topic='vocab';mode='ordered';startQueue({all:true});showView('practice');});
 }
 function renderMaterials(){
   const lessonOpts=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3'].map(id=>`<option value="${id}"${materialsLesson===id?' selected':''}>${id.replace('-','–')}</option>`).join('');
   const cards=Object.entries(course.sources).filter(([,s])=>!s.additional).map(([key,s])=>{
     const n=questions.filter(q=>q.source===key).length;
     const url=liveSource(s.url);
     const canon=canonForSource(key,s);
     return `<div class="source-card"><div><h3>${esc(s.title)}</h3><p>${n} карточек</p></div><div class="source-actions"><button type="button" class="secondary-button" data-source="${key}">Тренировать</button>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Открыть оригинал</a>`:''}${canon?`<button type="button" class="secondary-button" data-open-canon="${esc(canon)}">Открыть правило</button>`:''}</div></div>`;
   }).join('');
   $('#materials-content').innerHTML=`<div class="panel rules-search"><label for="materials-q">Найти по названию, форме или примеру</label><input id="materials-q" type="search" value="${esc(materialsQuery)}" placeholder="менің, мой отец, кітапым" autocomplete="off" enterkeyhint="search"><div class="jump-row"><label>Урок <select id="materials-lesson"><option value="">Все</option>${lessonOpts}</select></label><label>Тип <select id="materials-kind"><option value="">Всё</option><option value="rule"${materialsKind==='rule'?' selected':''}>Правило</option><option value="word"${materialsKind==='word'?' selected':''}>Слово</option><option value="example"${materialsKind==='example'?' selected':''}>Пример</option></select></label></div><p class="small">Ищет по уже записанным правилам, словам, примерам и полным объяснениям. Новая статья не создаётся.</p><div id="materials-search-out"></div></div><div class="panel"><div class="coverage-stats"><div><span class="coverage-number">15</span><p>файлов проверено</p></div><div><span class="coverage-number">${Object.keys(course.sources).filter(k=>!course.sources[k].additional).length}</span><p>источников в практике</p></div><div><span class="coverage-number">${questions.filter(q=>!q.source||q.source!=='plus').length}</span><p>карточек по урокам</p></div></div><p>Дополнительно: ${window.LEARNING.lessons.length} маленьких уроков и ${questions.filter(q=>q.source==='plus').length} карточек и шаблонов для постепенного обучения. Они разработаны для тренажёра и не выданы за задания автора курса.</p><p>Включены упражнения уроков 1–1, 1–2, 1–3 и 2–2. Слова домашки 2–2 и новые прилагательные/профессии тренируются в обе стороны. Расхождения ключей 2–2 (мұғалімбіз, кәсіпкерлер, бастықтармыз) отмечены в карточках: принимается и ключ, и форма по правилу урока.</p><p class="coverage-note">Новые PDF лежат в «Казахский / учебные материалы». Файлы с Диска в тренажёр сами не подмешиваются.</p><a href="${course.folder}" target="_blank" rel="noopener noreferrer">Открыть папку с исходными материалами</a></div><div class="panel"><h2>Упражнения и домашняя работа</h2>${cards}</div><div class="panel"><h2>Остальные файлы учтены</h2><p><a href="https://drive.google.com/file/d/1HIVPE51FqFOcHBOOXFNfsmDKxvfCKpui/view" target="_blank" rel="noopener noreferrer">«Мягкие и твёрдые.pdf»</a> — шпаргалка; её схема включена в «Правила».</p><p><a href="https://docs.google.com/document/d/1Y-dWGwCJL04Pbp015V3_T91_n2f15-ep/edit" target="_blank" rel="noopener noreferrer">Uroki_1_1_Otvety.docx</a> — ответы к сборнику 1–1; использованы для сверки.</p><p><a href="https://drive.google.com/file/d/1P45V0RTvcpKEAjutHpPXM6KARx1MZbgd/view" target="_blank" rel="noopener noreferrer">Вторая копия методички 1–1</a> — текст полностью совпадает с первой. Задания не удваивались.</p><p class="small">Ключи воспроизведены по курсу, для перевода добавлены допустимые синонимы. Исправлена опечатка «Дукен» → «дүкен». Особенность задания с -мен объяснена прямо в карточке.</p></div><div class="panel"><h2>Завершение домашней работы на сайте курса</h2><p>Чтобы преподаватель получил результат, выполни официальный тест и нажми «Зафиксировать результат» на сайте BatylBol. При необходимости войди в свой аккаунт.</p><div class="link-list"><a href="https://batylbol.kz/test/Zvuki.html" target="_blank" rel="noopener noreferrer">BatylBol · твёрдые и мягкие звуки</a><a href="https://batylbol.kz/test/MnozhChislo.html" target="_blank" rel="noopener noreferrer">BatylBol · множественное число</a><a href="https://batylbol.kz/test/LichnyeLitso1-2.html" target="_blank" rel="noopener noreferrer">BatylBol · біз, сендер, сіздер</a><a href="https://batylbol.kz/test/LichnyeEdChislo.html" target="_blank" rel="noopener noreferrer">BatylBol · мен, сен, сіз</a></div><p class="small">Эти внешние банки вопросов не были доступны для переноса. Здесь сохранены ссылки из домашней работы; результаты личной тренировки в BatylBol не передаются.</p><p>Для заданий на письмо используй казахскую раскладку или кнопки букв под ответом. Шпаргалка всегда доступна в разделе «Правила».</p><details><summary>Дополнительные ссылки из методичек</summary><div class="link-list"><a href="https://kaz-tili.kz/su_fonetika.htm" target="_blank" rel="noopener noreferrer">Фонетика</a><a href="https://kaz-tili.kz/su_prav.htm" target="_blank" rel="noopener noreferrer">Мягкие и твёрдые слова</a><a href="https://kaz-tili.kz/progd/prog_mnozhestv_chislo.html" target="_blank" rel="noopener noreferrer">Множественное число · первый уровень</a><a href="https://kaz-tili.kz/prog/prog_mnozhestv_chislo.html" target="_blank" rel="noopener noreferrer">Множественное число · второй уровень</a><a href="https://sozdik.kz/" target="_blank" rel="noopener noreferrer">Русско-казахский словарь</a></div></details></div>`;
   renderPackageImport();
   $$('[data-source]').forEach(b=>b.onclick=()=>{sourceFilter=b.dataset.source;topic='all';mode='voluntary';showView('practice');startQueue();});
   $$('#materials-content [data-open-canon]').forEach(b=>b.onclick=()=>openSearchedRule(b.dataset.openCanon));
   const materialsQ=$('#materials-q'),materialsLes=$('#materials-lesson'),materialsType=$('#materials-kind');
   const drawMaterialSearch=()=>{
     const box=$('#materials-search-out');if(!box)return;
     const query=materialsQuery.trim();
     if(!query||!window.CorpusSearch){box.innerHTML='';return;}
     const found=window.CorpusSearch.search(query,{lesson:materialsLesson,kind:materialsKind});
     if(!found.rules.length&&!found.words.length){box.innerHTML='<p>В уже записанных материалах этого нет. Новая статья не создаётся.</p>';return;}
     const best=found.rules[0];
     const full=best&&window.ExplainOpen&&window.ExplainOpen.fullHtml?window.ExplainOpen.fullHtml(best.id):'';
     const more=found.rules.slice(best?1:0,6).map(r=>`<button type="button" class="text-button" data-open-canon="${esc(r.id)}">${esc(r.title)}</button>`).join(' ');
     const words=found.words.length?`<p class="small">Слова, не вместо правила: ${found.words.map(w=>esc(w.title)+(w.gloss?' — '+esc(w.gloss):'')).join(' · ')}</p>`:'';
     box.innerHTML=(best?`<article class="panel"><h2>${esc(best.title)}</h2><p class="small">${best.lesson?'Урок '+esc(String(best.lesson).replace('-','–')):''}</p>${full}<p><button type="button" class="secondary-button" data-open-canon="${esc(best.id)}">Открыть в правилах</button> <button type="button" class="secondary-button" data-try-rule="${esc(best.id)}">Попробовать</button></p><div data-try-choices></div></article>`:'')+(more?`<p>${more}</p>`:'')+words;
     if(window.ExplainOpen&&window.ExplainOpen.bind)window.ExplainOpen.bind(box);
     box.querySelectorAll('[data-open-canon]').forEach(b=>b.onclick=()=>openSearchedRule(b.dataset.openCanon));
     box.querySelectorAll('[data-try-rule]').forEach(b=>b.onclick=()=>tryRule(b.dataset.tryRule,b.parentElement&&b.parentElement.nextElementSibling));
   };
   if(materialsQ)materialsQ.oninput=()=>{materialsQuery=materialsQ.value;drawMaterialSearch();};
   if(materialsLes)materialsLes.onchange=()=>{materialsLesson=materialsLes.value;drawMaterialSearch();};
   if(materialsType)materialsType.onchange=()=>{materialsKind=materialsType.value;drawMaterialSearch();};
   drawMaterialSearch();
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
 $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;startQueue();showView('practice');const dlg=$('#practice-filter');if(dlg&&dlg.open&&dlg.close)dlg.close();}));
 const filterOpen=$('#practice-filter-open'),filterClose=$('#practice-filter-close'),filterDlg=$('#practice-filter');
 if(filterOpen&&filterDlg)filterOpen.onclick=()=>{if(filterDlg.showModal)filterDlg.showModal();else filterDlg.setAttribute('open','');};
 if(filterClose&&filterDlg)filterClose.onclick=()=>{if(filterDlg.close)filterDlg.close();else filterDlg.removeAttribute('open');};
 function resetProgress(){
   if(!window.confirm('Сбросить весь прогресс в этом браузере? Ответы, ошибки, заметки и ассоциации будут очищены.'))return;
   try{localStorage.setItem(BACKUP,P.serialize(state));}catch{}const retainedPackages=state.lesson_packages;state=P.empty();state.lesson_packages=retainedPackages;records=state.records;learningState=state.learning;storageReadError=null;topic='all';mode='smart';sourceFilter=null;activeLesson=null;activeStep=null;queue=[];practiceIds=[];position=0;showView('today');
 }
 const learning=window.LearningUI.create({
   get state(){return learningState;},save,startLesson,startCourse,courseJumpMarkup,bindCourseJump,eligible,missing:ids=>[...new Set(ids.flatMap(id=>catalog.missingPrerequisites(byId.get(id),state)))],practiceWords,association:key=>state.associations[key]?.text||'',setAssociation,today:()=>showView('today'),
   grammarPath:()=>state.grammarPath,openPath:openPathLesson,currentCourse:namedCourse,continueStep,progress:()=>state,openHomework(id){hwLesson=id;showView('homework');}
 });
 const dashboard=window.DashboardUI.create({
   state:()=>state,questions:()=>questions,eligible,hasSession:()=>queue.length>position,continueInfo:stepNow,
   action(next){
     if(next.startsWith('remedy:')){startRemedy(next.slice(7));return;}
     if(next==='homework'){hwLesson=null;showView('homework');return;}
     if(next==='path'){showView('path');return;}
     if(next==='personal-trainers'){showView('personal');return;}
     if(next.startsWith('weak:')){startBlockReview(next.slice(5));return;}
     if(next.startsWith('pair:')){
       const [a,b]=next.slice(5).split(':');
       const found=Object.values(state.confusions||{}).find(p=>(p.expected_answer===a&&p.wrong_answer_given===b)||(p.expected_answer===b&&p.wrong_answer_given===a));
       startContrast(found||{expected_answer:a,wrong_answer_given:b,card_ids:[],known_alternative:true});
       return;
     }
     if(next==='chunks'){
       const ids=questions.filter(q=>window.MemoryPolicy&&window.MemoryPolicy.isChunk(q)&&eligible(q)).map(q=>q.id);
       startCustom(ids,'chunks');return;
     }
     if(next==='ai-summary'&&window.AiTutor){
       const lesson=currentLessonId();
       const req=window.AiTutor.buildRequest('session_summary',{lessonId:lesson,id:'',title:'',stimulus:'',fields:[]},{codes:window.AiTutor.topWeak().map(w=>w.error_code),surface:'practice',lesson_id:lesson});
       window.AiTutor.callTutor(req,25000).then(resp=>{
         const root=document.getElementById('today-content');if(!root||!resp)return;
         const msg=String(resp.message_ru||'').trim()||'Слабые места сохранены локально.';
         const box=document.createElement('div');box.className='panel ai-tutor-out';box.innerHTML='<h2>Разбор</h2><p>'+esc(msg)+'</p>';
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
     if(next.startsWith('lesson-view:')){openPathLesson(next.slice(12));return;}
     if(next.startsWith('lesson-start:')){continueLesson(next.slice(13));return;}
     if(next.startsWith('course:')){startCourse(next.split(':')[1]);return;}
     if(next==='pause-prep'){startPausePrep();return;}
     if(next==='repair-open'){openRepair();return;}
     if(next.startsWith('repair:')){beginRepair(next.slice(7));return;}
     if(next==='transfer'){startTransfer();return;}
     if(next==='continue'||next==='learn'||next==='resume'){continueStep();return;}
     if(['today','vocabulary','materials'].includes(next)){showView(next);return;}
     if(next==='confusions'){showView('review');return;}
     topic='all';sourceFilter=null;activeLesson=null;mode=next;startQueue();showView('practice');
   },
   contrast:startContrast,setAssociation,promote,export:()=>{save();downloadProgress(P.serialize(state));},import:importProgress,
   restoreBackup(){const data=localStorage.getItem(BACKUP)||localStorage.getItem(MIGRATION);if(data)downloadProgress(data,'progress-before-import.json');else window.alert('Предыдущей резервной копии пока нет.');}
 });
 $('#pause-session').onclick=()=>showView(trainerReturn?'personal':mode==='homework'||(mode==='remediation'&&hwReturn)?'homework':mode==='exam'?'exam':'today');
 const lettersPref=$('#pref-letters');
 if(lettersPref){lettersPref.checked=!!state.prefs.letters;lettersPref.onchange=()=>{state.prefs.letters=lettersPref.checked;state.prefs.lettersChosen=true;save();if(view==='practice')render();};}
 function issueContext(){
   const q=view==='practice'?byId.get(queue[position]):null;
   const gp=state.grammarPath||{};
   return {
     view,mode,topic:topic||'',courseBlock:courseBlock||'',
     lessonId:(q&&q.lessonId)||gp.lessonId||activeLesson||hwLesson||'',
     exerciseId:q?q.id:'',
     title:q?String(q.title||''): (view==='path'&&gp.chapterId?String(gp.chapterId):''),
     stimulus:q?String(q.stimulus||'').slice(0,200):'',
     source:q?String(q.source||''):''
   };
 }
 function issueLines(){
   return (state.issueLog||[]).map(x=>{
     const when=new Date(x.at).toLocaleString('ru-RU');
     return when+' · '+[x.view,x.mode,x.lessonId,x.exerciseId].filter(Boolean).join(' / ')+'\n'+(x.title||'')+' '+(x.stimulus||'')+'\n'+x.note;
   }).join('\n\n');
 }
 function refreshIssueContext(){
   const el=$('#issue-context');if(!el)return;
   const c=issueContext();
   const bits=[c.view,c.mode&&c.mode!==c.view?c.mode:'',c.lessonId&&('урок '+c.lessonId),c.exerciseId&&('карточка '+c.exerciseId),c.title].filter(Boolean);
   el.textContent=bits.join(' · ')||'Экран без карточки.';
 }
 function bindIssueBar(){
   const dlg=$('#issue-dialog'), tog=$('#issue-toggle'), note=$('#issue-note'), status=$('#issue-status');
   if(!dlg||!tog||!note)return;
   const open=()=>{refreshIssueContext();status.hidden=true;note.value='';if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');note.focus();};
   tog.onclick=open;
   $('#issue-close')&&($('#issue-close').onclick=()=>dlg.close?dlg.close():dlg.removeAttribute('open'));
   $('#issue-save')&&($('#issue-save').onclick=()=>{
     const text=note.value.trim();
     if(!text){status.hidden=false;status.textContent='Напиши, что не так.';return;}
     const row=Object.assign({at:Date.now(),note:text.slice(0,800)},issueContext());
     state.issueLog=(state.issueLog||[]).concat([row]).slice(-80);
     save();
     status.hidden=false;status.textContent='Сохранено. Заметок: '+(state.issueLog.length)+'.';
     note.value='';
   });
   $('#issue-copy')&&($('#issue-copy').onclick=()=>{
     const blob=issueLines()||'Пока пусто.';
     if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(blob).then(()=>{status.hidden=false;status.textContent='Скопировано '+((state.issueLog||[]).length)+' заметок.';}).catch(()=>{status.hidden=false;status.textContent=blob;});
     else {status.hidden=false;status.textContent=blob;}
   });
   $('#issue-download')&&($('#issue-download').onclick=()=>{
     downloadProgress(JSON.stringify({app:'qazaq-issues',saved_at:new Date().toISOString(),items:state.issueLog||[]},null,2),'qazaq-issues.json');
     status.hidden=false;status.textContent='Файл qazaq-issues.json — пришли его, и я прочитаю.';
   });
 }
 bindIssueBar();
 window.QazaqShell={show:showView};
 window.TrainerCatalogBridge={
   launch:launchCatalogTrainer,
   numberTracks:catalogNumberTracks,
   status:catalogTrainerStatus
 };
 renderRules();renderMaterials();
 const validSaved=savedSession&&topics.some(t=>t[0]===savedSession.topic)&&['ordered','shuffle','mistakes','smart','review','lesson','course','phrase','transfer','contrast','numbers','remediation','words','exam','homework','chunks'].includes(savedSession.mode)&&Array.isArray(savedSession.queue)&&savedSession.queue.every(id=>byId.has(id))&&Number.isInteger(savedSession.position)&&savedSession.position>=0&&savedSession.position<=savedSession.queue.length&&(!savedSession.sourceFilter||course.sources[savedSession.sourceFilter])&&(savedSession.mode!=='lesson'||window.LEARNING.lessons.some(l=>l.id===savedSession.activeLesson));
 if(validSaved){
   variants=savedSession.variants||{};
   queueEpoch=typeof savedSession.queueEpoch==='number'?savedSession.queueEpoch:queueEpoch;
   presented=typeof savedSession.presented==='string'?savedSession.presented:null;
   sessionAttempts=Math.max(0,Number(savedSession.sessionAttempts)||0);sessionCorrect=Math.min(sessionAttempts,Math.max(0,Number(savedSession.sessionCorrect)||0));sessionAssisted=Math.min(sessionAttempts-sessionCorrect,Math.max(0,Number(savedSession.sessionAssisted)||0));
   draft=savedSession.draft&&Array.isArray(savedSession.draft.answers)?savedSession.draft:null;remediation=savedSession.remediation||null;
   stageContext=P.normalizeStageContext?P.normalizeStageContext(savedSession.stageContext):null;
   topic=savedSession.topic;mode=savedSession.mode;sourceFilter=savedSession.sourceFilter||null;courseBlock=savedSession.courseBlock||null;hwLesson=savedSession.hwLesson||((mode==='homework'||savedSession.view==='homework')?savedSession.courseBlock||null:null);hwPart=savedSession.hwPart||null;hwSection=Math.max(0,Number(savedSession.hwSection)||0);trainerReturn=savedSession.trainerReturn||null;activeLesson=mode==='lesson'?savedSession.activeLesson:null;
   activeStep=activeLesson?Math.min(window.LEARNING.lessons.find(l=>l.id===activeLesson).chunks.length-1,Math.max(0,Number(savedSession.activeStep)||0)):null;
   queue=savedSession.queue;practiceIds=Array.isArray(savedSession.practiceIds)?savedSession.practiceIds.filter(id=>byId.has(id)):[...new Set(queue)];
   stepEvidence=savedSession.stepEvidence&&typeof savedSession.stepEvidence==='object'?savedSession.stepEvidence:{};
   position=Math.min(queue.length,savedSession.position+(savedSession.answered?1:0));if(savedSession.answered&&!['ordered','shuffle','homework','course','phrase','transfer'].includes(mode)&&sessionAttempts>=cfg.session.maxAttempts)position=queue.length;render();
   if(!savedSession.answered){hinted=!!savedSession.hinted;elapsedMs=Number.isFinite(savedSession.elapsed_ms)?Math.max(0,savedSession.elapsed_ms):0;}
 }else{queue=[];practiceIds=[];renderStats();}
 const resumeView=validSaved&&['practice','homework','learn','path','review'].includes(savedSession.view)?savedSession.view:'today';
 showView(resumeView);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseTimer();else{renderStats();if(view==='practice')activateCard();if(['today','review','vocabulary'].includes(view))dashboard.render(view);}save();});
 window.addEventListener('qazaq-before-update',e=>{pauseTimer();save();if(!storageAvailable)e.preventDefault();});
 window.addEventListener('blur',pauseTimer);window.addEventListener('focus',startTimer);window.addEventListener('pagehide',()=>{pauseTimer();save();});
 function applyRemote(incoming){
   if(!incoming)return;
   cloudApplying=true;
   state=P.merge(state,incoming);records=state.records;learningState=state.learning;
   if(state.aiTutor&&window.AiTutor&&window.AiTutor.restore)window.AiTutor.restore(state.aiTutor);
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
