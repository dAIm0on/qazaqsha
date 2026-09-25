(function(){
'use strict';
const E=window.MorphEngine,S=window.MorphState,T=window.MorphTeachingData,P=window.MorphTeachingPractice;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let shownAt=null,interrupted=false,level='harmony',responseMode='choice',message='',attemptSeq=0;
let showHub=true,teachingMode=false;
const bridge=()=>window.MorphBridge,root=()=>document.getElementById('morph-content');
function data(){return bridge()?.read()||{module:S.empty(),records:{},knownLemmas:[]};}
function clock(){shownAt=performance.now();interrupted=document.hidden;}
function saveSession(s){return bridge().session(s);}
function saveTeachingResume(v){return bridge().teachingResume(v);}
function teachingModule(id,familyId=null){
 if(id==='meaning'&&familyId)return T?.modules?.find(x=>x.families.includes(familyId))||null;
 return T?.modules?.find(x=>x.id===id)||null;
}
function teachingFamily(id){return T?.level0?.familySemantics?.[id]||null;}
function currentTeachingResume(){return data().module.teaching?.resume||null;}
function staticTeachingId(type,moduleId,familyId){return ['teach',T.version,type,moduleId,familyId||'-'].join(':');}
function attemptTeachingId(type,moduleId,familyId){return staticTeachingId(type,moduleId,familyId)+':'+Date.now()+':'+(++attemptSeq);}
function recordTeaching(event){
 const ok=bridge().teaching({...event,contentVersion:T.version});
 if(!ok&&event.eventId&&!data().module.teaching?.events?.some(x=>x.eventId===event.eventId))message='Учебный шаг не сохранился. Обнови страницу и повтори.';
 return ok;
}
function recordOnce(type,moduleId,familyId,extra={}){
 const eventId=staticTeachingId(type,moduleId,familyId);
 if(data().module.teaching?.events?.some(x=>x.eventId===eventId))return true;
 return recordTeaching({eventId,type,moduleId,familyId,at:Date.now(),responseMode:'view',...extra});
}
function setTeachingResume(moduleId,step,familyId,stepIndex=0,draft=''){
 teachingMode=true;showHub=false;level=moduleId;
 return saveTeachingResume({currentModule:moduleId,currentTeachingStep:step,familyId,stepIndex,draft,updatedAt:Date.now()});
}
function status(){
 const d=data(),s=d.module.session,tr=d.module.teaching?.resume;
 const teachingNewer=tr&&(!s||(tr.updatedAt||0)>=(s.updatedAt||0));
 if(teachingNewer){const m=teachingModule(tr.currentModule),f=teachingFamily(tr.familyId);return 'Продолжить обучение · '+(f?.title||m?.title||'Форма слова');}
 if(s&&!s.complete)return 'Продолжить практику · '+(s.cursor+1)+' / '+s.queue.length;
 return 'Короткие подходы и обучение с нуля';
}
function open(){window.QazaqShell.show('morph');}
function rule(l){return E.data.levels.find(x=>x.id===l)?.rule||'';}
function teachingProgress(m){
 const families=Object.keys(T?.level0?.familySemantics||{});
 const semantic=families.filter(id=>S.teachingEvidence(m,{familyId:id}).semanticIntroCompleted).length;
 const noticed=new Set((m.teaching?.events||[]).filter(e=>e.type==='feature_notice_attempt'&&e.correct===true&&e.familyId).map(e=>e.familyId)).size;
 return {semantic,noticed,total:families.length};
}
function hub(){
 const d=data(),m=d.module,s=m.session,tr=m.teaching?.resume,lines=E.writtenLines(m.events),r=lines.practice,p=teachingProgress(m);
 const rows=E.data.levels.map(l=>{const stats=E.summary(m.events.filter(e=>e.level===l.id&&!e.transfer));return '<option value="'+l.id+'"'+(l.id===level?' selected':'')+'>'+l.title+(stats.n?' · '+stats.correct+'/'+stats.n:'')+'</option>';}).join('');
 const misses={};for(const e of m.events.slice(-40))for(const c of e.errorCodes||[])misses[c]=(misses[c]||0)+1;
 const labels={HARMONY:'ряд гласного',ONSET_CLASS:'начальный согласный',STEM_CHANGE:'изменение основы',MORPH_STATE:'форма после притяжательности',OTHER_FORM:'полная форма'};
 const resumeTeach=tr?'<button class="primary-button" data-morph-teach-resume>Продолжить обучение · '+esc(teachingFamily(tr.familyId)?.title||teachingModule(tr.currentModule)?.title||'тема')+'</button>':'';
 return '<div class="morph-panel"><p class="eyebrow">ФОРМА СЛОВА</p><h2>Сначала понять, потом строить форму</h2><p>Режим «Учиться с нуля» сначала объясняет значение формы, полное правило, контрасты и признаки. Эти шаги не засчитываются как самостоятельное владение.</p>'+
 resumeTeach+
 (s&&!s.complete?'<button class="secondary-button" data-morph-resume>Продолжить практику '+(s.cursor+1)+' из '+s.queue.length+'</button>':'')+
 '<label for="morph-level">Раздел</label><select id="morph-level">'+rows+'</select><p class="morph-rule">'+esc(rule(level))+'</p>'+
 '<div class="morph-actions"><button class="primary-button" data-morph-learn-zero>Учиться с нуля</button><button class="secondary-button" data-morph-full-rule>Разобрать правило полностью</button></div>'+
 '<p class="small">Level 0: смысл разобран для '+p.semantic+' из '+p.total+' семей; признаки отмечены для '+p.noticed+' из '+p.total+'. Просмотр теории и работа с опорой не двигают FSRS.</p></div>'+
 '<div class="morph-panel"><h2>Самостоятельная практика</h2><p>Этот режим остаётся отдельным: здесь уже нужно строить форму. Если тема новая, сначала пройди «Учиться с нуля».</p>'+
 '<label for="morph-response">Как отвечать</label><select id="morph-response"><option value="choice"'+(responseMode==='choice'?' selected':'')+'>Выбрать форму</option><option value="input"'+(responseMode==='input'?' selected':'')+'>Написать самостоятельно</option></select><div class="morph-actions"><button class="secondary-button" data-morph-start>Новый подход · 10</button><button class="secondary-button" data-morph-transfer>Проверить на новых словах</button></div><p class="small">Проверка берёт основы из отложенной половины банка, которые здесь ещё не показывали. Новое для тренажёра не значит незнакомое тебе в жизни.</p>'+(E.transferRule(level)?.note?'<p class="small">'+esc(E.transferRule(level).note)+'</p>':'')+'</div>'+
 '<div class="morph-panel"><h2>Наблюдения</h2><p>'+(r.n?r.correct+' из '+r.n+' самостоятельно · '+r.uniqueLemmas+' основ':'Пока нет самостоятельных ответов.')+'</p><p>'+(lines.fresh.n?lines.fresh.correct+' из '+lines.fresh.n+' на новых основах'+(lines.families.length?' · '+esc(lines.families.join(', ')):'') :'На новых основах пока нет самостоятельных ответов.')+'</p><p class="small">'+Object.entries(misses).map(([k,n])=>esc(labels[k]||k)+': '+n).join(' · ')+'</p><p class="small">Процент на знакомых заданиях ещё не доказывает перенос.</p><p class="small">'+esc(S.historyNote)+'</p><details><summary>Как это устроено</summary><p>Результаты относятся к письменным заданиям.</p><p>У каждого семейства свои условия: например, адаммын, адамбыз, адам ба. Следующая форма зависит от уже собранного слова. Изменения основы допускаются только для проверенных слов.</p><p>Правила: <a href="https://qazcorpus.kz/_oqu-ishorpus/Dengeilyk/pdf/Қазақ_грамматикасы.pdf" target="_blank" rel="noopener">Қазақ грамматикасы (2002)</a>; <a href="https://slaviccenters.duke.edu/sites/slaviccenters.duke.edu/files/file-attachments/kazakh-grammar.pdf" target="_blank" rel="noopener">грамматика Duke</a>.</p></details></div>';
}
function teachingNav(module,resume){
 const modules=T.modules.map(m=>'<option value="'+esc(m.id)+'"'+(m.id===module.id?' selected':'')+'>'+esc(m.title)+'</option>').join('');
 const families=module.families.map(id=>'<option value="'+esc(id)+'"'+(id===resume.familyId?' selected':'')+'>'+esc(teachingFamily(id)?.title||id)+'</option>').join('');
 return '<div class="morph-teach-nav"><button class="text-button" data-teach-close>← К разделу</button><label>Тема<select data-teach-module>'+modules+'</select></label><label>Значение<select data-teach-family>'+families+'</select></label></div>';
}
function semanticIntro(module,resume,semantic){
 recordOnce('semantic_intro_seen',module.id,resume.familyId);
 const examples=(semantic.examples||[]).map(x=>'<li lang="kk">'+esc(x.text)+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 1 · СМЫСЛ</p><h2>'+esc(semantic.title)+'</h2><p class="morph-teach-lead">'+esc(semantic.meaning)+'</p><div class="morph-rule"><strong>Не перепутать</strong><p>'+esc(semantic.contrast)+'</p></div>'+(examples?'<h3>Примеры</h3><ul class="morph-teach-list">'+examples+'</ul>':'')+'<p class="small">Пока ты только разбираешь значение. Этот экран не считается самостоятельным ответом.</p><div class="morph-actions"><button class="primary-button" data-teach-semantic-done>Понятно, разобрать правило</button></div></div>';
}
function fullExplanation(module,resume){
 recordOnce('full_explanation_opened',module.id,resume.familyId);
 const paragraphs=module.fullExplanation.map(p=>'<p>'+esc(p)+'</p>').join('');
 const counters=(module.counterExamples||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const limits=(module.limitations||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 2 · ПОЛНОЕ ОБЪЯСНЕНИЕ</p><h2>'+esc(module.title)+'</h2><div class="morph-full-explanation">'+paragraphs+'</div>'+(counters?'<h3>Контрпримеры</h3><ul class="morph-teach-list">'+counters+'</ul>':'')+(limits?'<h3>Границы правила</h3><ul class="morph-teach-list">'+limits+'</ul>':'')+'<p class="small">Полное объяснение не заменяется короткой подсказкой и остаётся доступным из раздела.</p><div class="morph-actions"><button class="primary-button" data-teach-next-step="CONTRAST_EXAMPLES">Посмотреть контрасты</button></div></div>';
}
function contrastExamples(module,resume,semantic){
 const examples=[...(semantic.examples||[]).map(x=>x.text),...(module.examples||[]).map(x=>x.text)].filter((x,i,a)=>a.indexOf(x)===i);
 const ex=examples.map(x=>'<li lang="kk">'+esc(x)+'</li>').join('');
 const contrasts=(module.contrastSets||[]).map(set=>'<li>'+set.map(x=>'<span lang="kk">'+esc(x)+'</span>').join(' ↔ ')+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 3 · КОНТРАСТЫ</p><h2>Сравни похожие случаи</h2>'+(ex?'<h3>Сопоставимые примеры</h3><ul class="morph-teach-list">'+ex+'</ul>':'')+(contrasts?'<h3>Что различать</h3><ul class="morph-teach-list morph-contrast-list">'+contrasts+'</ul>':'')+'<div class="morph-actions"><button class="secondary-button" data-teach-go-full>Разобрать правило полностью</button><button class="primary-button" data-teach-next-step="FEATURE_NOTICE">На что смотреть</button></div></div>';
}
function featureNotice(module,resume){
 if(resume.stepIndex>0)return teachingComplete(module,resume);
 const checks=module.whatToLookAt.map((x,i)=>'<label class="morph-feature-option"><input type="checkbox" data-teach-feature value="'+i+'"><span>'+esc(x)+'</span></label>').join('');
 const steps=module.decisionSteps.map((x,i)=>'<li><strong>'+(i+1)+'.</strong> '+esc(x)+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 4 · НА ЧТО СМОТРЕТЬ</p><h2>Перед формой назови признаки</h2><p>Отметь всё, что нужно проверить в этом разделе. Это активная опора, а не тест на mastery.</p><div class="morph-feature-grid">'+checks+'</div><h3>Порядок решения</h3><ol class="morph-teach-list">'+steps+'</ol><div class="morph-actions"><button class="secondary-button" data-teach-go-full>Разобрать правило полностью</button><button class="primary-button" data-teach-feature-submit>Я отметил(а) признаки</button></div></div>';
}
function stage5Ready(module){return !!P&&P.MODULES.includes(module.id)&&P.fullStage5Ready(data().module,module.id);}
function stage5Evidence(moduleId){return S.teachingEvidence(data().module,{moduleId});}
function stage5Guided(module,resume){
 const plan=P.guidedPlan(module.id),i=Math.max(0,resume.stepIndex||0);
 if(i>=plan.length)return stage5GuidedComplete(module,resume,plan);
 const task=plan[i],support=P.support(module.id,task),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage5-guided-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · '+(i+1)+' / '+plan.length+'</p><h2>'+esc(module.title)+'</h2><p class="morph-rule">'+esc(support)+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(task.operation)+'</p><div class="morph-choices">'+choices+'</div><p class="small">Ответ с опорой сохраняется как guided evidence и не считается самостоятельным ответом.</p><button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function stage5GuidedComplete(module,resume,plan=P.guidedPlan(module.id)){
 const e=stage5Evidence(module.id),guided=e.guided;
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · ГОТОВО</p><h2>Теперь без подсказки</h2><p>Guided attempts: '+guided.correct+' из '+guided.attempts+'. Ошибки после показа ответа исправлялись на другой основе и не становились independent evidence.</p><p class="small">Следующий блок использует другие train-основы и отключает подсказку.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Повторить с опорой</button><button class="primary-button" data-stage5-start-choice>Самостоятельно · выбор</button></div></div>';
}
function parseRepair(resume){try{const x=JSON.parse(resume.draft||'{}');return x&&typeof x==='object'?x:{};}catch{return {};}}
function stage5Repair(module,resume){
 const payload=parseRepair(resume),source=P.taskForItem(module.id,payload.sourceItemId,'source');
 const session=data().module.session,exclude=[...P.guidedPlan(module.id).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)];
 const task=P.repairFor(module.id,source,exclude),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage5-repair-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">РАЗБОР ОШИБКИ</p><h2>Тот же контраст — другое слово</h2><div class="morph-feedback wrong"><strong>Было: <span lang="kk">'+esc(source.stem)+' → '+esc(source.expected)+'</span></strong><p>'+esc(E.reason(E.getItem(source.itemId)))+'</p></div><p>Теперь проверь тот же признак на другой основе. Этот ответ — correction evidence, не independent.</p><p class="morph-rule">'+esc(P.support(module.id,task))+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(task.operation)+'</p><div class="morph-choices">'+choices+'</div><button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function startStage5Guided(moduleId){
 const module=teachingModule(moduleId);if(!module||!P?.MODULES.includes(moduleId)){message='Guided Stage 5 доступен только для первых четырёх модулей.';render();return;}
 if(!stage5Ready(module)){message='Сначала заверши Level 0 для всех значений этого раздела.';startTeaching(moduleId);return;}
 saveSession(null);setTeachingResume(moduleId,'GUIDED_CHOICE',null,0,'');teachingMode=true;showHub=false;message='';render();
}
function startStage5Independent(moduleId,step,responseMode){
 const module=teachingModule(moduleId);if(!module||!P?.MODULES.includes(moduleId))return;
 const now=Date.now();setTeachingResume(moduleId,step,null,0,'');
 const session=P.createIndependentSession(moduleId,responseMode,now+2);saveSession(session);teachingMode=false;showHub=false;message='';render();
}
function stage5Finish(s,resume){
 const module=teachingModule(resume.currentModule),r=E.summary(s.results),input=resume.currentTeachingStep==='FULL_INPUT';
 const e=stage5Evidence(module.id),next=P.MODULES[P.MODULES.indexOf(module.id)+1]||null;
 if(!input)return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">САМОСТОЯТЕЛЬНО · ВЫБОР</p><h2>'+r.correct+' из '+r.n+'</h2><p>'+r.uniqueLemmas+' разных train-основ. Подсказка в этом блоке была отключена.</p><p class="small">Это independent-choice evidence. Теперь та же логика проверяется вводом полной формы на другом наборе основ.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Вернуться к опоре</button><button class="primary-button" data-stage5-start-input>Самостоятельно · ввод</button></div></div>';
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">МОДУЛЬ 1–4 · БЛОК ЗАВЕРШЁН</p><h2>'+esc(module.title)+'</h2><p>Самостоятельный ввод: '+r.correct+' из '+r.n+'.</p><div class="stage5-evidence"><p>Independent choice: '+e.independentChoice.correct+' / '+e.independentChoice.attempts+'</p><p>Independent input: '+e.independentInput.correct+' / '+e.independentInput.attempts+'</p><p>Guided: '+e.guided.correct+' / '+e.guided.attempts+'</p><p>Corrections: '+e.corrections.correct+' / '+e.corrections.attempts+'</p></div><p class="small">Это завершённый учебный блок, а не заявление «навык освоен». Перенос и удержание проверяются отдельно.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Повторить этот модуль</button>'+(next?'<button class="primary-button" data-stage5-next-module="'+esc(next)+'">Следующий модуль</button>':'<button class="primary-button" data-teach-close>К разделу</button>')+'</div></div>';
}
function teachingComplete(module,resume){
 const nextIndex=module.families.indexOf(resume.familyId)+1,next=module.families[nextIndex]||null,ready=stage5Ready(module);
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">LEVEL 0 · ГОТОВО</p><h2>Смысл и признаки разобраны</h2><p>Ты прошёл(а) вводную часть для «'+esc(teachingFamily(resume.familyId)?.title||resume.familyId)+'». Это ещё не самостоятельное владение формой: guided и production-практика остаются отдельными этапами.</p><div class="morph-actions">'+(next?'<button class="primary-button" data-teach-next-family="'+esc(next)+'">Следующее значение · '+esc(teachingFamily(next)?.title||next)+'</button>':ready?'<button class="primary-button" data-stage5-start-guided>Тренировка с опорой</button>':'')+'<button class="secondary-button" data-teach-close>К разделу</button></div></div>';
}
function teachingScreen(){
 const d=data(),resume=d.module.teaching?.resume;if(!resume){teachingMode=false;showHub=true;return hub();}
 const stage5Step=['GUIDED_CHOICE','ERROR_REPAIR','INDEPENDENT_CHOICE','FULL_INPUT'].includes(resume.currentTeachingStep);
 const module=teachingModule(resume.currentModule,resume.familyId);if(!module||(!stage5Step&&!module.families.includes(resume.familyId))){message='Учебная тема обновилась. Выбери раздел заново.';teachingMode=false;showHub=true;level='harmony';return hub();}
 if(stage5Step){
  if(!P?.MODULES.includes(module.id)){message='Этот этап доступен только для модулей 1–4.';teachingMode=false;showHub=true;return hub();}
  if(resume.currentTeachingStep==='GUIDED_CHOICE')return stage5Guided(module,resume);
  if(resume.currentTeachingStep==='ERROR_REPAIR')return stage5Repair(module,resume);
  message='Самостоятельная часть восстанавливается из сохранённой сессии.';teachingMode=false;showHub=false;return data().module.session?question(data().module.session):stage5GuidedComplete(module,{...resume,currentTeachingStep:'GUIDED_CHOICE'},P.guidedPlan(module.id));
 }
 const semantic=teachingFamily(resume.familyId);if(!semantic){message='Для этой темы нет утверждённой semantic card.';teachingMode=false;showHub=true;return hub();}
 if(resume.currentTeachingStep==='SEMANTIC_INTRO')return semanticIntro(module,resume,semantic);
 if(resume.currentTeachingStep==='FULL_EXPLANATION')return fullExplanation(module,resume);
 if(resume.currentTeachingStep==='CONTRAST_EXAMPLES')return contrastExamples(module,resume,semantic);
 if(resume.currentTeachingStep==='FEATURE_NOTICE')return featureNotice(module,resume);
 message='Этот этап обучения ещё не подключён.';return teachingComplete(module,{...resume,stepIndex:1});
}
function startTeaching(moduleId=level,familyId=null,step='SEMANTIC_INTRO'){
 const module=teachingModule(moduleId);if(!module){message='Teaching data не загрузились.';render();return;}
 const family=familyId&&module.families.includes(familyId)?familyId:module.families[0];
 setTeachingResume(module.id,step,family,0,'');message='';render();
}
function finish(s){
 const tr=currentTeachingResume();if(tr&&P?.MODULES.includes(tr.currentModule)&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(tr.currentTeachingStep)&&s.level===tr.currentModule&&s.mode==='learn')return stage5Finish(s,tr);
 const r=E.summary(s.results),transfer=s.mode==='transfer',view=E.reveal(s);
 return '<div class="morph-panel"><p class="eyebrow">ПОДХОД ЗАВЕРШЁН</p><h2>'+r.correct+' из '+r.n+(transfer?' самостоятельно, на новых основах':' самостоятельно')+'</h2><p>'+r.uniqueLemmas+' разных основ</p><p>'+(transfer?'Это короткая проверка новых здесь основ. Для вывода об устойчивом переносе нужны другие слова и отсроченная проверка.':'Теперь можно повторить трудный контраст или смешать правила.')+'</p>'+(view.transferNote?'<p>'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p>'+esc(view.holdoutNote)+'</p>':'')+'<div class="morph-actions"><button class="primary-button" data-morph-hub>К тренировкам</button></div>'+s.results.filter(e=>!e.correct).map(e=>{const i=E.getItem(e.itemId);return '<details><summary>'+esc(i.stem)+' → '+esc(i.expected)+'</summary><p>'+esc(E.reason(i,e.errorCodes))+'</p></details>';}).join('')+'</div>';
}
function question(s){
 const tr=currentTeachingResume(),stage5Independent=tr&&P?.MODULES.includes(tr.currentModule)&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(tr.currentTeachingStep)&&s.level===tr.currentModule&&s.mode==='learn';
 const item=E.getItem(s.queue[s.cursor].id),done=s.phase==='feedback',view=E.reveal(s),choices=s.queue[s.cursor].options;
 const controls=s.responseMode==='choice'?'<div class="morph-choices">'+choices.map(o=>'<button type="button" class="secondary-button" lang="kk" data-morph-answer="'+esc(o)+'"'+(done?' disabled':'')+'>'+esc(o)+'</button>').join('')+'</div>':'<form id="morph-answer-form"><label for="morph-answer">Полная форма'+(item.sequence.at(-1)==='Q'?' вместе с частицей':'')+'</label><input id="morph-answer" lang="kk" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" value="'+esc(s.draft)+'"'+(done?' disabled':'')+'><div class="morph-keys">'+[...'әғқңөұүі'].map(c=>'<button type="button" class="text-button" data-morph-key="'+c+'"'+(done?' disabled':'')+'>'+c+'</button>').join('')+'</div><button class="primary-button"'+(done?' disabled':'')+'>Проверить</button></form>';
 const feedback=done?(view.expected?'<div class="morph-feedback '+(view.correctnessClass?(s.result.correct?'correct':'wrong'):'')+'" role="status"><strong>'+(s.result.correct?'Верно':'Правильная форма: '+esc(item.expected))+'</strong><p>'+esc(E.reason(item,s.result.errorCodes))+'</p><p class="small" lang="kk">'+item.trace.map(t=>esc(t.stem)+' + '+esc(t.suffix)).join(' → ')+'</p></div>':'<p role="status">Ответ сохранён. Разбор будет в конце проверки.</p>')+'<button class="primary-button" data-morph-next>'+(s.cursor===s.queue.length-1?'Завершить':'Следующее')+'</button>':'';
 return '<div class="morph-panel"><button class="text-button" data-morph-hub>Выбрать другой режим</button><div class="morph-progress"><span>'+(stage5Independent?(tr.currentTeachingStep==='FULL_INPUT'?'Самостоятельно · ввод':'Самостоятельно · выбор'):(s.mode==='transfer'?'Проверка новых основ':'Практика'))+'</span><strong>'+(s.cursor+1)+' / '+s.queue.length+'</strong></div>'+(view.transferNote?'<p class="small">'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p class="small">'+esc(view.holdoutNote)+'</p>':'')+'<h2 class="morph-stem" lang="kk">'+esc(item.stem)+'</h2><p>'+esc(item.gloss)+'</p><p class="morph-operation">'+esc(item.operation)+'</p>'+controls+(!stage5Independent&&view.hint?'<button class="text-button" data-morph-hint>Подсказка</button>':'')+(view.reason?'<p class="morph-rule">'+esc(E.reason(item))+'</p>':'')+feedback+'</div>';
}
function render(){
 const host=root();if(!host||!bridge()||!T)return;
 const m=data().module,s=m.session,tr=m.teaching?.resume;
 const teachingNewer=tr&&(!s||(tr.updatedAt||0)>=(s.updatedAt||0));
 if(teachingNewer&&document.body.dataset.view==='morph'&&host.dataset.first!=='yes'){const rm=teachingModule(tr.currentModule,tr.familyId);teachingMode=true;showHub=false;level=rm?.id||'harmony';host.dataset.first='yes';}
 else if(s&&!s.complete&&document.body.dataset.view==='morph'&&host.dataset.first!=='yes'){teachingMode=false;showHub=false;host.dataset.first='yes';}
 const body=teachingMode?teachingScreen():(!s||showHub?hub():s.complete?finish(s):question(s));
 host.innerHTML='<div class="morph-head"><button class="text-button" data-morph-exit>← Все тренажёры</button><span class="small">Версия '+esc(E.data.version)+' · обучение '+esc(T.version)+'</span></div>'+(message||m.recovery||m.teaching?.recovery?'<p role="status" class="morph-notice">'+esc(message||m.teaching?.recovery||m.recovery)+'</p>':'')+body;
 bind(host);clock();
}
function start(mode){
 const d=data();teachingMode=false;
 try{const s=E.createSession({level,mode,responseMode,events:d.module.events,records:d.records,knownLemmas:[...d.module.exposed,...d.knownLemmas]});saveSession(s);showHub=false;message='';render();}catch(e){message=e.message;render();}
}
function submit(response){
 const s=data().module.session;if(!s||!String(response).trim())return;
 const result=E.answer(s,response,interrupted||shownAt===null?null:performance.now()-shownAt);if(!result)return;
 const ok=bridge().answer(result);if(!ok)message='Ответ уже сохранён или сессия изменилась.';render();
}
function bind(host){
 host.querySelector('[data-morph-exit]')?.addEventListener('click',()=>{window.QazaqShell.show('personal');window.PersonalTrainers.openCatalog();});
 host.querySelector('[data-morph-start]')?.addEventListener('click',()=>start('learn'));
 host.querySelector('[data-morph-transfer]')?.addEventListener('click',()=>start('transfer'));
 host.querySelector('[data-morph-learn-zero]')?.addEventListener('click',()=>startTeaching(level));
 host.querySelector('[data-morph-full-rule]')?.addEventListener('click',()=>startTeaching(level,null,'FULL_EXPLANATION'));
 host.querySelector('[data-morph-teach-resume]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r){teachingMode=true;showHub=false;level=r.currentModule;render();}});
 host.querySelector('#morph-level')?.addEventListener('change',e=>{level=e.target.value;render();});
 host.querySelector('#morph-response')?.addEventListener('change',e=>{responseMode=e.target.value;});
 for(const b of host.querySelectorAll('[data-morph-hub]'))b.onclick=()=>{teachingMode=false;showHub=true;render();};
 host.querySelector('[data-morph-resume]')?.addEventListener('click',()=>{teachingMode=false;showHub=false;render();});
 for(const b of host.querySelectorAll('[data-morph-answer]'))b.onclick=()=>submit(b.dataset.morphAnswer);
 host.querySelector('#morph-answer-form')?.addEventListener('submit',e=>{e.preventDefault();submit(host.querySelector('#morph-answer').value);});
 const input=host.querySelector('#morph-answer');if(input){input.oninput=()=>{const s=data().module.session;if(s?.phase==='question')saveSession({...s,draft:input.value,updatedAt:Date.now()});};for(const b of host.querySelectorAll('[data-morph-key]'))b.onclick=()=>{const a=input.selectionStart,z=input.selectionEnd;input.value=input.value.slice(0,a)+b.dataset.morphKey+input.value.slice(z);input.focus();input.setSelectionRange(a+1,a+1);input.oninput();};}
 host.querySelector('[data-morph-hint]')?.addEventListener('click',()=>{const s=data().module.session;saveSession({...s,hinted:true});render();});
 host.querySelector('[data-morph-next]')?.addEventListener('click',()=>{const s=data().module.session,r=currentTeachingResume();if(r&&P?.MODULES.includes(r.currentModule)&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(r.currentTeachingStep)&&s?.mode==='learn'&&s.level===r.currentModule&&s.result&&!s.result.correct){setTeachingResume(r.currentModule,'ERROR_REPAIR',s.result.sequence.at(-1),s.cursor,JSON.stringify({sourceItemId:s.result.itemId,returnStep:r.currentTeachingStep,returnIndex:s.cursor}));message='Ответ разобран. Теперь тот же контраст на другой основе.';teachingMode=true;render();return;}saveSession(E.next(s));render();host.querySelector('#morph-answer')?.focus();});

 for(const b of host.querySelectorAll('[data-teach-close]'))b.onclick=()=>{teachingMode=false;showHub=true;render();};
 host.querySelector('[data-teach-module]')?.addEventListener('change',e=>startTeaching(e.target.value));
 host.querySelector('[data-teach-family]')?.addEventListener('change',e=>{const r=currentTeachingResume();if(r)startTeaching(r.currentModule,e.target.value);});
 host.querySelector('[data-teach-semantic-done]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;recordOnce('semantic_intro_completed',r.currentModule,r.familyId);setTeachingResume(r.currentModule,'FULL_EXPLANATION',r.familyId,0,'');message='';render();});
 for(const b of host.querySelectorAll('[data-teach-next-step]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;setTeachingResume(r.currentModule,b.dataset.teachNextStep,r.familyId,0,'');message='';render();};
 for(const b of host.querySelectorAll('[data-teach-go-full]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;setTeachingResume(r.currentModule,'FULL_EXPLANATION',r.familyId,0,'');message='';render();};
 host.querySelector('[data-teach-feature-submit]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;const all=[...host.querySelectorAll('[data-teach-feature]')],selected=all.filter(x=>x.checked);const correct=all.length>0&&selected.length===all.length;recordTeaching({eventId:attemptTeachingId('feature_notice_attempt',r.currentModule,r.familyId),type:'feature_notice_attempt',moduleId:r.currentModule,familyId:r.familyId,at:Date.now(),responseMode:'choice',answer:selected.map(x=>x.value).join(','),correct,hinted:false});if(!correct){message='Отметь все признаки, которые этот раздел просит проверить. Это опора, а не экзамен.';render();return;}setTeachingResume(r.currentModule,'FEATURE_NOTICE',r.familyId,1,'');message='';render();});
 for(const b of host.querySelectorAll('[data-teach-next-family]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;startTeaching(r.currentModule,b.dataset.teachNextFamily,'SEMANTIC_INTRO');};
 host.querySelector('[data-stage5-start-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Guided(r.currentModule);});
 host.querySelector('[data-stage5-restart-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Guided(r.currentModule);});
 host.querySelector('[data-stage5-start-choice]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Independent(r.currentModule,'INDEPENDENT_CHOICE','choice');});
 host.querySelector('[data-stage5-start-input]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Independent(r.currentModule,'FULL_INPUT','input');});
 for(const b of host.querySelectorAll('[data-stage5-next-module]'))b.onclick=()=>startTeaching(b.dataset.stage5NextModule);
 for(const b of host.querySelectorAll('[data-stage5-guided-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const plan=P.guidedPlan(r.currentModule),task=plan[r.stepIndex],correct=P.evaluate(task,b.dataset.stage5GuidedAnswer);recordTeaching({eventId:attemptTeachingId('guided_attempt',r.currentModule,task.familyId),type:'guided_attempt',moduleId:r.currentModule,familyId:task.familyId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage5GuidedAnswer,correct,hinted:true});if(correct){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,r.stepIndex+1,'');message='Верно. Теперь тот же принцип на следующем контрасте.';render();return;}setTeachingResume(r.currentModule,'ERROR_REPAIR',task.familyId,r.stepIndex,JSON.stringify({sourceItemId:task.itemId,returnStep:'GUIDED_CHOICE',returnIndex:r.stepIndex}));message='Сначала разберём ошибку на другой основе.';teachingMode=true;render();};
 for(const b of host.querySelectorAll('[data-stage5-repair-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const payload=parseRepair(r),source=P.taskForItem(r.currentModule,payload.sourceItemId,'source'),session=data().module.session,exclude=[...P.guidedPlan(r.currentModule).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)],task=P.repairFor(r.currentModule,source,exclude),correct=P.evaluate(task,b.dataset.stage5RepairAnswer);recordTeaching({eventId:attemptTeachingId('correction_after_feedback',r.currentModule,task.familyId),type:'correction_after_feedback',moduleId:r.currentModule,familyId:task.familyId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage5RepairAnswer,correct,hinted:true});if(payload.returnStep==='GUIDED_CHOICE'){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,(payload.returnIndex||0)+1,'');message=correct?'Исправление верное.':'Правильная форма: '+task.expected+'. Продолжаем; это исправление не считается independent.';teachingMode=true;render();return;}const s=data().module.session;if(s?.phase==='feedback'){setTeachingResume(r.currentModule,payload.returnStep||'INDEPENDENT_CHOICE',null,s.cursor,'');saveSession({...E.next(s),updatedAt:Date.now()+2});message=correct?'Исправление верное. Возвращаемся к самостоятельной практике.':'Правильная форма: '+task.expected+'. Возвращаемся к самостоятельной практике.';teachingMode=false;showHub=false;render();}};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupted=true;});
window.addEventListener('blur',()=>{interrupted=true;});
window.MorphTrainer={open,render,status};
})();