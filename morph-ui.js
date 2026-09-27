(function(){
'use strict';
const E=window.MorphEngine,S=window.MorphState,T=window.MorphTeachingData,P=window.MorphTeachingPractice;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let shownAt=null,interrupted=false,level='harmony',responseMode='choice',message='',attemptSeq=0;
let showHub=true,teachingMode=false,topicOpen=false,calcOpen=false,calcQuery='',calcLemmaId='',calcSequence=[];
const CALC_KEY='qazaqsha-calc-v1';
function persistCalc(){try{sessionStorage.setItem(CALC_KEY,JSON.stringify({open:calcOpen,query:calcQuery,lemmaId:calcLemmaId,sequence:calcSequence}));}catch(e){}}
function restoreCalc(){try{const v=JSON.parse(sessionStorage.getItem(CALC_KEY)||'null');if(!v)return;calcOpen=!!v.open;calcQuery=String(v.query||'');calcLemmaId=String(v.lemmaId||'');calcSequence=Array.isArray(v.sequence)?v.sequence.slice(0,5):[];}catch(e){}}
restoreCalc();
const bridge=()=>window.MorphBridge,root=()=>document.getElementById('morph-content');
function learner(){return window.MorphLearner||null;}
function shownReason(item,codes){
 const api=learner(),plain=api&&item&&api.feedback(item,codes||[]);
 return plain||E.reason(item,codes);
}
function shownOperation(item){
 const api=learner(),plain=api&&item&&api.operation(item);
 return plain||(item&&item.operation)||'';
}
function shownSupport(task,fallback){
 const id=task&&(task.familyId||task.morpheme);
 const line=learner()&&learner().supportLine(id);
 return line||fallback;
}
function learnerLesson(module,familyId){
 const api=learner();
 return api&&module?api.forFamily(module.id,familyId):null;
}
function shellPhrase(s){
 return ({'мало данных':'пока мало ответов','перенос проверен':'порог на новых словах пройден','нужно повторить':'стоит повторить','в смешивании':'смешиваем знакомое','нет отложенной проверки':'повтора на следующий день ещё не было','есть отложенная проверка':'есть повтор не в тот же день'})[s]||s;
}
function learnerOpenButton(item){
 const dest=learner()&&learner().openTarget(item);
 return dest?'<button type="button" class="text-button" data-learner-open="'+esc(dest.lessonId)+'">Открыть полный разбор</button>':'';
}
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
 teachingMode=true;showHub=false;topicOpen=false;level=moduleId;
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
function weakTarget(events){
 const counts={};
 for(const e of events||[]){
  if(!e||e.correct!==false||e.transfer||e.mode==='transfer'||e.hinted||e.scored===false)continue;
  const family=e.sequence&&e.sequence.at(-1);if(!family)continue;counts[family]=(counts[family]||0)+1;
 }
 const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(!top)return null;
 const module=T.modules.find(m=>(m.families||[]).includes(top[0]));
 return module?{familyId:top[0],count:top[1],moduleId:module.id,title:module.title}:null;
}
function routeStatus(moduleId){
 const ev=S.teachingEvidence(data().module,{moduleId}),rows=(data().module.events||[]).filter(e=>e.level===moduleId);
 const fresh=rows.filter(e=>e.transfer||e.mode==='transfer'),own=rows.filter(e=>!(e.transfer||e.mode==='transfer')&&!e.hinted);
 const claim=fresh.length?P.stage10StrongFromEvents(fresh):null,bits=[];
 if(ev.semanticIntroSeen)bits.push('Знакомство');
 if(ev.guided.attempts)bits.push('с подсказкой');
 if(own.length)bits.push('самостоятельно');
 if(rows.some(e=>e.level==='mixed'))bits.push('в смешивании');
 if(claim&&claim.pass)bits.push(shellPhrase('перенос проверен'));
 else if(fresh.length)bits.push(shellPhrase('мало данных'));
 else if(!own.length&&ev.guided.attempts)bits.push(shellPhrase('нужно повторить'));
 if(!bits.length)bits.push(shellPhrase('мало данных'));
 return {text:bits.join(' · '),retention:shellPhrase(P.stage10Retention(data().module.events||[]).label)};
}
function seenEnough(moduleId){
 const ev=S.teachingEvidence(data().module,{moduleId});
 return {meaning:!!ev.semanticIntroSeen,full:!!ev.fullExplanationOpened,feature:ev.featureNotice.attempts>0};
}
function continueLearning(){
 const d=data(),s=d.module.session,tr=d.module.teaching&&d.module.teaching.resume;
 const teachingNewer=tr&&(!s||(tr.updatedAt||0)>=(s.updatedAt||0));
 topicOpen=false;
 if(teachingNewer){teachingMode=true;showHub=false;level=tr.currentModule;message='';render();return;}
 if(s&&!s.complete){teachingMode=false;showHub=false;level=s.level||level;message='';render();return;}
 message='Пока нечего продолжать. Начни с «Учиться с нуля» или открой тему раздела.';showHub=true;teachingMode=false;render();
}
function learnFromZero(){
 const tr=currentTeachingResume();
 if(tr&&tr.currentModule===level){teachingMode=true;showHub=false;topicOpen=false;message='';render();return;}
 startTeaching(level);
}
function repeatWeak(){
 const hit=weakTarget(data().module.events);
 if(!hit){message='Пока мало ответов. Нет ошибки на учебном слове, которую можно повторить.';showHub=true;teachingMode=false;topicOpen=false;render();return;}
 message='Повторяем «'+(teachingFamily(hit.familyId)?.title||'эту форму')+'»: здесь была ошибка. Это учебная основа, не перенос и не новая проверка.';
 startTeaching(hit.moduleId,hit.familyId,'FULL_EXPLANATION');
}
function openTopicStep(step){
 const module=teachingModule(level);if(!module){message='Для этого раздела нет учебной темы.';render();return;}
 const seen=seenEnough(module.id);
 if(step==='CONTRAST_EXAMPLES'&&!seen.meaning){message='Сначала смысл: примеры идут после знакомства.';startTeaching(module.id,null,'SEMANTIC_INTRO');return;}
 if(step==='FEATURE_NOTICE'&&!seen.full){message='Сначала полное объяснение, потом признаки.';startTeaching(module.id,null,'FULL_EXPLANATION');return;}
 if(step==='GUIDED_CHOICE'){if(!seen.meaning||!seen.full){message='С опорой можно пробовать после смысла и полного объяснения.';startTeaching(module.id,null,seen.meaning?'FULL_EXPLANATION':'SEMANTIC_INTRO');return;}if(P?.MODULES?.includes(module.id)&&P.fullStage5Ready(data().module,module.id)){setTeachingResume(module.id,'GUIDED_CHOICE',null,0,'');message='';render();return;}message='Сначала отметь признаки этого раздела.';startTeaching(module.id,null,'FEATURE_NOTICE');return;}
 if(step==='INDEPENDENT'){if(!seen.meaning||!seen.full||!seen.feature){message='Самостоятельное задание не первое знакомство с механизмом.';startTeaching(module.id,null,!seen.meaning?'SEMANTIC_INTRO':!seen.full?'FULL_EXPLANATION':'FEATURE_NOTICE');return;}const s=data().module.session;if(s&&!s.complete&&s.mode==='learn'&&s.level===module.id){topicOpen=false;teachingMode=false;showHub=false;message='';render();return;}start('learn');return;}
 startTeaching(module.id,null,step);
}
function topicScreen(){
 const module=teachingModule(level)||T.modules[0];
 const status=routeStatus(module.id);
 const item=(step,label)=>'<button type="button" class="secondary-button" data-topic-step="'+step+'">'+label+'</button>';
 return '<div class="morph-panel morph-teach-panel"><button class="text-button" data-morph-hub>← К разделу</button><p class="eyebrow">ТЕМА</p><h2>'+esc(module.title)+'</h2><div class="morph-routes">'+
  item('SEMANTIC_INTRO','Что изучаем')+item('FULL_EXPLANATION','Полное объяснение')+item('CONTRAST_EXAMPLES','Примеры')+item('FEATURE_NOTICE','На что смотреть')+item('GUIDED_CHOICE','Попробовать с опорой')+item('INDEPENDENT','Самостоятельно')+'</div><h3>Мой прогресс</h3><p>'+esc(status.text)+'</p><p class="small">Удержание: '+esc(status.retention)+'. Перенос и удержание не сведены в одну оценку.</p><button class="text-button" data-morph-full-rule>Разобрать правило полностью</button></div>';
}
function hub(){
 const d=data(),m=d.module,s=m.session,tr=m.teaching?.resume,lines=E.writtenLines(m.events),r=lines.practice,p=teachingProgress(m);
 const rows=E.data.levels.map(l=>{const stats=E.summary(m.events.filter(e=>e.level===l.id&&!e.transfer));return '<option value="'+l.id+'"'+(l.id===level?' selected':'')+'>'+l.title+(stats.n?' · '+stats.correct+'/'+stats.n:'')+'</option>';}).join('');
 const misses={};for(const e of m.events.slice(-40))for(const c of e.errorCodes||[])misses[c]=(misses[c]||0)+1;
 const labels={HARMONY:'ряд гласного',ONSET_CLASS:'начальный согласный',STEM_CHANGE:'изменение основы',MORPH_STATE:'форма после «мой / его»',OTHER_FORM:'другая форма',MULTIPLE_FEATURES:'несколько отличий',LEXICAL_EXCEPTION:'особое слово',CATEGORY:'другое значение',MORPHEME_BOUNDARY:'другой шаг',UNSCORABLE:'Для этого ответа сейчас нет однозначного проверенного эталона. Это не считается твоей ошибкой.'};
 const canContinue=!!(tr||(s&&!s.complete));
 const where=tr&&(!s||(tr.updatedAt||0)>=(s.updatedAt||0))?esc(teachingFamily(tr.familyId)?.title||teachingModule(tr.currentModule)?.title||'тема'):(s&&!s.complete?'практика '+(s.cursor+1)+' из '+s.queue.length:'пока не начато');
 const status=routeStatus(level);
 return '<div class="morph-panel"><p class="eyebrow">ФОРМА СЛОВА</p><h2>Сначала понять, потом строить форму</h2><p>Режим «Учиться с нуля» сначала объясняет значение формы, полное правило, контрасты и признаки. Эти шаги не засчитываются как самостоятельное владение.</p>'+
 '<label for="morph-level">Раздел</label><select id="morph-level">'+rows+'</select><p class="morph-rule">'+esc(rule(level))+'</p>'+
 '<div class="morph-routes"><button class="'+(canContinue?'primary-button':'secondary-button')+'" data-morph-continue>Продолжить обучение</button><button class="primary-button" data-morph-learn-zero>Учиться с нуля</button><button class="secondary-button" data-morph-weak>Повторить слабое место</button><button class="secondary-button" data-morph-start>Самостоятельная практика</button><button class="secondary-button" data-morph-transfer>Проверить на новых основах</button><button class="secondary-button" data-morph-calc>Разобрать форму</button></div>'+
 '<p class="small">Сейчас продолжится: '+where+'.</p>'+
 '<details open><summary>Как устроены урок и проверка</summary>'+
 '<p>Короткая фраза возле шага помогает сделать ход, но это не вся теория. Полное объяснение открывается по «Разобрать правило полностью» и не исчезает. На узком экране его можно разбить, спрятать под «Подробнее» или оставить короткую опору сверху. Нельзя выкинуть контрпримеры, ограничения и переписать полное правило одной фразой.</p>'+
 '<p>Перед вопросом «какое окончание?» нужно понять три вещи: какой смысл мы сейчас выражаем; по какому признаку нужна именно эта операция; что не надо путать с этой операцией. Ещё: какая сейчас основа и какой участок будет стыком. Карточка новичка не обязана сразу дать все оттенки. Для первого шага берётся один ясный смысл. Более широкие значения остаются в полном объяснении. Два или три контраста идут до самостоятельной оценки. Заметить признак — не то же самое, что самостоятельно построить форму.</p>'+
 '<p>Сначала значение, потом уже получившееся слово, не первая догадка по последней букве. У отдельных вопросов есть свой приоритет поверх общего порядка. Угадать любую правильную форму любого неизвестного слова по одной последней букве — не задача. Не склеивай разные вопросы только потому, что концы похожи. Вопрос и «не делать» нельзя объединять в одно правило только потому, что буквы ма, ме, ба, бе, па, пе похожи.</p>'+
 '<p>Главный экран: продолжить обучение, учиться с нуля, повторить слабое место, самостоятельная практика, проверить на новых основах, разобрать форму. Внутри темы: что изучаем, полное объяснение, примеры, на что смотреть, попробовать с опорой, самостоятельно. «Учиться с нуля» сначала даёт объяснение и не открывает голую форму без него. Механическое упражнение идёт после этого объяснения. На карточке видны слово, перевод и какой смысл сейчас нужен. Счётчик шага не заменяет правило.</p>'+
 '<p>Обычный заход — 8–12 первых показов, без обязательного секундомера. Медленный верный ответ остаётся верным. Время не превращает правильное в ошибку. В учении разбор появляется после первой попытки: видно отличие, стык, нужную форму и одну подходящую причину. Выдуманной причины, почему так вышло у человека, нет. На проверке новых слов подсказки нет, эталон сразу не показывают, и разбор идёт после блока. Знакомые карточки эту проверку не заменяют.</p>'+
 '<p>Подсказка может напомнить, что искать, показать класс текущего края или открыть нужный кусок правила. Она не раскрывает точный ответ на проверке новых слов. Ответ после подсказки хранится как ответ с опорой и не считается ответом без подсказки.</p>'+
 '<p>После ошибки — короткий контраст на другой основе, без кружения одной темы, затем смесь со знакомым контрастом. Отложенные слова проверки заранее не показываем и на исправление не тратим. Смешивание начинается после знакомства с частями. Его задача — различать конкурирующие условия, а не перемешать задания случайно. За следующее задание смотрят, какие смыслы уже введены, где были ошибки, как отвечают, край слова, ряд, особое состояние, длину цепочки и знакома ли основа. Сложность поднимают по одному отличию.</p>'+
 '<p>Полный вывод о новых словах требует не меньше 40 подходящих самостоятельных заданий минимум в двух подходах, долю верных не ниже 90 процентов и нижнюю границу оценки не ниже 0,80, включая оба значения каждого заявленного контраста. Пока этого нет, экран говорит, что ответов мало. Обычный повтор — не эта проверка. Повтор на следующий день считается отдельно и сегодняшним днём не закрывается.</p>'+
 '<p>Если у слова нет проверенной записи или нужная цепочка не разрешена, разбор не выдаёт самый вероятный ответ. Честные исходы: одна подтверждённая форма, несколько разрешённых вариантов с условиями, неизвестное слово или неподдержанная цепочка. Это не считается твоей ошибкой и не меняет расписание повторений. Подпись карточки не выдаёт правильность заранее. Отложенные слова, которые уже израсходованы, заново «новыми» не называем.</p>'+
 '<p>Все учебные значения, которые есть в тренажёре, открываются готовым уроком до первого самостоятельного задания этой темы. Звук здесь не записывается. Проверка носителем всех пар ещё не проводилась. Нехватка новых основ для «мы» — ограничение списка слов, не дыра в объяснении. Эффективность метода этим экраном не заявлена. Урок показывает только то, что уже согласовано с проверенными парами. Правило сборки сайта само по себе не является правилом казахского.</p>'+
 '<p>Текст урока — полное объяснение, не короткая подпись экрана. Экран может показать выдержку, шаги, аккордеон и короткую подсказку. Он не имеет права удалять, переиначивать или заменять условия. Нельзя сжимать полное объяснение до короткого правила, упрощать его выкидыванием исключений, склеивать разные вопросы из-за похожих концов, заменять смысл догадкой по звуку и строить правило только от последней буквы. Общий порядок — каркас. У отдельного вопроса может быть своё приоритетное правило.</p>'+
 '<p>Когда смысл уже известен, ученик понимает, какое значение требуется, замечает признаки уже получившегося слова, выбирает разрешённый вариант, сам собирает целое слово и сохраняет точную форму. До вопроса «какое окончание?» он знает, какую операцию дали, что является основой, какой участок будет стыком и какой результат по смыслу нужен. Новый смысл объясняют до первого задания. Порядок: сначала значение, не последняя буква; затем уже получившееся слово, не обязательно первый словарный корень; затем особое состояние, чья это вещь или какая личная серия; затем записанный ряд; затем шаблон этого вопроса; затем выбор.</p>'+
 '<p>Порядок захода: 1. что изучаем. 2. полное объяснение остаётся открытым. 3. два или три контраста. 4. на что смотреть. 5. попытка с опорой. 6. самостоятельный выбор. 7. ввод целого слова. 8. исправление на другом слове. 9. смесь со знакомым. 10. конец блока. 11. повтор позже, отдельно. Знакомство, ответ с подсказкой, смесь и проверка новых слов — разные статусы, не одна оценка. В смешивание не входят сразу новый смысл, край, исключение, длинная цепочка и новый способ ответа. Минимальный вход в смесь — не первая фраза раздела: сначала местное знакомство и несколько самостоятельных первых ответов.</p>'+
 '<p>Проверка на новых основах — новые слова внутри этой темы, на уровне самого слова. Знакомые карточки её не заменяют. Там нет подсказки и нет немедленного эталона, разбор после блока. Если новых основ не хватает, так и говорят: недостаточно новых основ для полной проверки этого поднавыка. Обычный повтор — не эта проверка. Повтор на следующий день — отдельное возвращение, и сегодняшний день его не доказывает. Навык сам собой не объявляется удержанным. Контрольные отложенные основы заранее не показывают. Исследовательский каталог сам не становится каждой карточкой тренажёра.</p>'+
 '<p>Если у слова нет проверенной записи или операция не разрешена, система не выдаёт наиболее вероятный нормативный ответ. Честные исходы: неизвестное слово, несколько возможных чтений, неподдержанная цепочка. Одной подтверждённой формы при невыполненных условиях нет. Это не считается твоей ошибкой. На карточке можно показать слово, перевод, нужный смысл и отдельный счётчик. Счётчик не заменяет правило. На узком экране полный текст не удаляют: можно разбить на экраны, открыть «Подробнее», оставить короткую опору сверху. Механическое упражнение открывается только после объяснения. «Учиться с нуля» либо даёт это объяснение, либо не открывает голую форму. Урок считается собранным, когда новый смысл объяснён раньше задания, полное объяснение не схлопнуто, два или три контраста идут до самостоятельной оценки, а заметка признака не считается самостоятельной формой. Смысл вне текущих уроков тренажёр не выдумывает.</p>'+
 '<p>Общий порядок — только каркас. У конкретного вопроса может быть своё приоритетное правило. Сначала смысл. Затем уже получившееся слово, не обязательно первый корень. Затем особое состояние: чья это вещь или какая личная серия. Затем записанный ряд этого слова. Затем край: гласный, й, р, л, носовой, з или ж, глухой. Показатель «куда» или «где» открываем только вместе с карточкой этого вопроса. Пара заднего и переднего ряда идёт без смены класса края. Самостоятельный ответ — целая форма. Разбор в учении — после первой попытки. Разбор проверки новых слов — после блока. Разбор называет видимое отличие, стык, эталон и одну причину. Он не сообщает выдуманную психологическую причину.</p>'+
 '<p>Проверка на новых основах смотрит новое слово внутри этой темы, на уровне самого слова. Не заменять знакомыми карточками. Отсроченное удержание — не только что исправленная карточка. После устойчивого результата навык возвращается позже через обычное повторение. Это не доказательство, что он уже удержан сегодня. Следующее задание смотрит, как отвечают, и знакомо ли слово. Нельзя сразу добавлять новый смысл и новый край. Перед смесью нужны самостоятельные ответы без подсказки. Все двадцать восемь учебных значений имеют простой разбор до режима «учиться с нуля». До первого самостоятельного задания уже показаны: пара владельца и вещи, «куда» и «кому» в ясных ситуациях, «где» и «откуда», «чей предмет», «кто я», вопрос отдельно от «не делать». На экране остаются другие ограничения, и это не дыры объяснения: новых основ для «мы» не хватает, проверка носителем всех пар не проводилась, звука нет, эффективность метода не заявлена. Берём только то, что уже согласовано с проверенными парами. Смысл вне этих уроков не выдумываем.</p>'+
 '<p>Когда операция уже известна, ученик определяет признаки текущей основы, выбирает разрешённый вариант внутри этого вопроса и сам собирает точную форму. Общий порядок — каркас, но у конкретного вопроса может быть своё приоритетное правило. Проверь особое состояние: чья это вещь или какая личная серия. Ряд гласных записан у допущенного слова. Край бывает гласным, й, р, л, носовым, з или ж, глухим. Простой разбор обязателен, пока функция ещё не знакома. До вопроса «какое окончание?» ученик понимает, какую операцию дали, что является основой, какой участок будет стыком и какой результат по смыслу нужен.</p>'+
 '<p>Гласная добавки согласуется с рядом уже получившегося слова: а или е, ы или і. Не каждый вопрос меняет все свои гласные: смотри правило именно этого вопроса. У многих концов есть передний и задний ряд. Это не значит, что у каждого конца есть одна настоящая форма, которую ученик обязан угадать. Ряд и первая буква — два разных решения. Для «куда или кому» сначала смысл, затем особое состояние, затем ғ или г против қ или к, и уже внутри пары а или е. Перед выбором смотри, какой смысл задан, есть ли особое состояние и какой ряд записан у этого слова. Смысл «куда» или «где» показываем только вместе с карточкой этого вопроса. Самостоятельный ответ бывает выбором целой формы и вводом целой формы. Первая буква выбирается по-разному у разных вопросов. Гласная внутри того же вопроса выбирается отдельно. Некоторые заимствования на б, в, г или д относятся к отдельному орфографическому классу, записанному у слова.</p>'+
 '<p>На одной основе сравниваем разные вопросы. Выбор «после гласного или после согласного» смотрит на звуковой край допущенного слова. Буквы и и у нельзя всегда считать простой гласной буквой. Сначала значение формы, затем её условие. У каждого вопроса свои группы. Смешивание идёт после местного знакомства. Его задача — различать конкурирующие условия, а не перемешать задания случайно. Следующее задание смотрит способ ответа и знакомо ли слово. Нельзя сразу добавлять новый смысл, новый край и длинную цепочку. Статусы не склеиваются: знакомство, ответ с подсказкой, самостоятельно, в смешивании, перенос проверен. Отдельно бывает «стоит повторить». Перед смесью нужны самостоятельные ответы без подсказки.</p>'+
 '<p>Разбор проверки новых слов приходит после блока, не после первой попытки. Разбор называет наблюдаемое различие, стык, эталон и одну причину. Он не сообщает выдуманную психологическую причину. Заход начинается так: что изучаем, полное объяснение открыто, два или три контраста. После устойчивого результата существующая система повторений возвращает навык позже. Это не доказательство, что навык уже удержан. Контрольные отложенные основы заранее не показываем. Большой исследовательский каталог сам не открывается каждой карточкой. Главный экран: продолжить обучение, учиться с нуля, повторить слабое место, самостоятельная практика, проверить на новых основах. Механическое упражнение есть только у того, кому функцию уже объяснили.</p>'+
 '<p>Урок собран только если простой разбор идёт раньше незнакомой функции, полное объяснение доступно без сокращения, два или три контраста идут раньше самостоятельной оценки, а заметка признака не считается самостоятельной формой. Все двадцать восемь учебных значений имеют такой простой разбор до режима «учиться с нуля». До первого самостоятельного задания уже показаны «чей или чего» как владелец и вещь, пара целиком и «куда или кому» как направление и адресат в ясных ситуациях. Нехватка новых основ для «мы» — вопрос списка слов, не дыра объяснения. Проверка носителем всех пар не проводилась. Звука нет. Берём только утверждения, которые уже согласованы с проверенными парами. Карточка новичка до задания отвечает, какой смысл выражаем, по какому признаку нужна именно эта операция и что с ней не путать. Она не обязана сразу дать все оттенки: для первого шага берётся один ясный смысл, более широкие остаются в полном объяснении. Тренажёр не выдумывает смысл сам. Вопрос вне этих двадцати восьми снова требует отдельного проверенного разбора.</p>'+
 '</details>'+
 '<div class="morph-actions"><button class="secondary-button" data-morph-topic>Тема раздела</button><button class="secondary-button" data-morph-full-rule>Разобрать правило полностью</button><button class="text-button" data-morph-restart>Начать раздел сначала</button><button class="text-button" data-morph-pilot>Скачать учебный журнал</button></div>'+
 '<p class="small">Смысл разобран для '+p.semantic+' из '+p.total+' значений; признаки отмечены для '+p.noticed+' из '+p.total+'. Просмотр объяснения и ответы с подсказкой не меняют расписание повторений. Прогресс раздела: '+esc(status.text)+'. Удержание: '+esc(status.retention)+'.</p></div>'+
 '<div class="morph-panel"><h2>Самостоятельная практика</h2><p>Этот режим остаётся отдельным: здесь уже нужно строить форму. Если тема новая, сначала пройди «Учиться с нуля». Новый подход · 10 не стоит первым, пока смысл и правило не разобраны.</p>'+
 '<label for="morph-response">Как отвечать</label><select id="morph-response"><option value="choice"'+(responseMode==='choice'?' selected':'')+'>Выбрать форму</option><option value="input"'+(responseMode==='input'?' selected':'')+'>Написать самостоятельно</option></select><p class="small">«Проверить на новых словах» — это маршрут «Проверить на новых основах»: без подсказки, с разбором в конце и без записи в расписание повторений. Проверка берёт основы из отложенной половины банка, которые здесь ещё не показывали. Новое для тренажёра не значит незнакомое тебе в жизни.</p>'+(E.transferRule(level)?.note?'<p class="small">'+esc(E.transferRule(level).note)+'</p>':'')+'</div>'+
 '<div class="morph-panel"><h2>Наблюдения</h2><p>'+(r.n?r.correct+' из '+r.n+' самостоятельно · '+r.uniqueLemmas+' основ':'Пока нет самостоятельных ответов.')+'</p><p>'+(lines.fresh.n?lines.fresh.correct+' из '+lines.fresh.n+' на новых основах'+(lines.families.length?' · '+esc(lines.families.map(id=>teachingFamily(id)?.title||'форма').join(', ')):'') :'На новых основах пока нет самостоятельных ответов.')+'</p><p class="small">'+Object.entries(misses).map(([k,n])=>esc(labels[k]||'другая форма')+': '+n).join(' · ')+'</p><p class="small">Процент на знакомых заданиях ещё не доказывает перенос.</p><p class="small">'+esc(S.historyNote)+'</p><details><summary>Как это устроено</summary><p>Результаты относятся к письменным заданиям.</p><p>У каждого семейства свои условия: например, адаммын, адамбыз, адам ба. Следующая форма зависит от уже собранного слова. Изменения основы допускаются только для проверенных слов.</p><p>Правила: <a href="https://qazcorpus.kz/_oqu-ishorpus/Dengeilyk/pdf/Қазақ_грамматикасы.pdf" target="_blank" rel="noopener">Қазақ грамматикасы (2002)</a>; <a href="https://slaviccenters.duke.edu/sites/slaviccenters.duke.edu/files/file-attachments/kazakh-grammar.pdf" target="_blank" rel="noopener">грамматика Duke</a>.</p></details></div>';
}
function teachingNav(module,resume){
 const modules=T.modules.map(m=>'<option value="'+esc(m.id)+'"'+(m.id===module.id?' selected':'')+'>'+esc(m.title)+'</option>').join('');
 const families=module.families.map(id=>'<option value="'+esc(id)+'"'+(id===resume.familyId?' selected':'')+'>'+esc(teachingFamily(id)?.title||'значение')+'</option>').join('');
 return '<div class="morph-teach-nav"><button class="text-button" data-teach-close>← К разделу</button><label>Тема<select data-teach-module>'+modules+'</select></label><label>Значение<select data-teach-family>'+families+'</select></label></div>';
}
let showFullSemantic=false;
function renderBlocks(blocks){
 return (blocks||[]).map(b=>{
  if(b.type==='subheading')return '<h3>'+esc(b.text)+'</h3>';
  if(b.type==='paragraph')return '<p>'+esc(b.text)+'</p>';
  if(b.type==='list')return '<ul class="morph-teach-list">'+b.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  if(b.type==='ordered_list')return '<ol class="morph-teach-list">'+b.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
  if(b.type==='matrix')return '<div class="morph-matrix" role="region" aria-label="Таблица начальных согласных. На узком экране её можно листать вбок."><table><tbody>'+b.rows.map(row=>'<tr><td>'+esc(row)+'</td></tr>').join('')+'</tbody></table></div>';
  return '';
 }).join('');
}
function semanticGroupsFor(familyId){
 const groups=(T.level0.semanticGroups)||[];
 if(familyId==='INS')return groups.filter(g=>g.id==='INS');
 if(familyId==='DAT')return groups.filter(g=>g.id==='DAT');
 if(familyId==='Q'||familyId==='NEG')return groups.filter(g=>g.id==='Q');
 return groups.filter(g=>g.id===familyId||(familyId||'').startsWith(g.id));
}
function learnerPanel(module,resume,row,mode){
 const body=learner().render(row,mode);
 const actions=mode==='opening'
  ?'<button class="secondary-button" data-teach-semantic-full>Разобрать смысл полностью</button><button class="primary-button" data-teach-semantic-done>Понятно, разобрать правило</button>'
  :(resume.currentTeachingStep==='SEMANTIC_INTRO'
    ?'<button class="secondary-button" data-teach-semantic-short>Короткая опора</button><button class="primary-button" data-teach-next-step="CONTRAST_EXAMPLES">Посмотреть контрасты</button>'
    :'<button class="primary-button" data-teach-next-step="CONTRAST_EXAMPLES">Посмотреть контрасты</button>');
 return '<div class="morph-panel morph-teach-panel morph-learner" data-learner-lesson="'+esc(row.id)+'">'+teachingNav(module,resume)+body+'<p class="small">Полное объяснение не заменяется короткой подсказкой и остаётся доступным из раздела.</p><div class="morph-actions">'+actions+'</div></div>';
}
function semanticIntro(module,resume,semantic){
 recordOnce('semantic_intro_seen',module.id,resume.familyId);
 const lessonRow=learnerLesson(module,resume.familyId);
 if(lessonRow){
  if(showFullSemantic){recordOnce('semantic_full_opened',module.id,resume.familyId);return learnerPanel(module,resume,lessonRow,'full');}
  return learnerPanel(module,resume,lessonRow,'opening');
 }
 const examples=(semantic.examples||[]).map(x=>'<li lang="kk">'+esc(x.text)+'</li>').join('');
 const split=resume.familyId==='INS'?'<h2>Чем? С помощью чего?</h2><p>Инструмент или средство действия. Это первая отдельная карточка.</p><h2>С кем? С чем вместе?</h2><p>Совместность. Вторая карточка. Сначала эти значения учатся отдельно и смешиваются позже.</p>':resume.familyId==='DAT'?'<h2>Куда?</h2><p>Направление к месту. Первая карточка.</p><h2>Кому?</h2><p>Адресат. Вторая карточка. В первом блоке направление и адресат не смешиваются.</p>':'';
 if(showFullSemantic){
  recordOnce('semantic_full_opened',module.id,resume.familyId);
  const full=semanticGroupsFor(resume.familyId).map(g=>'<section><h2>'+esc(g.title)+'</h2>'+renderBlocks(g.blocks)+'</section>').join('')||renderBlocks([{type:'paragraph',text:semantic.meaning}]);
  return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">СМЫСЛ ПОЛНОСТЬЮ</p>'+full+'<p class="small">Это знакомство со смыслом, не самостоятельный ответ и не оценка произношения.</p><div class="morph-actions"><button class="secondary-button" data-teach-semantic-short>Короткая опора</button><button class="primary-button" data-teach-semantic-done>Понятно, разобрать правило</button></div></div>';
 }
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 1 · СМЫСЛ</p><h2>'+esc(semantic.title)+'</h2>'+split+'<p class="morph-teach-lead">'+esc(semantic.meaning)+'</p><div class="morph-rule"><strong>Не перепутать</strong><p>'+esc(semantic.contrast)+'</p></div>'+(examples?'<h3>Примеры</h3><ul class="morph-teach-list">'+examples+'</ul>':'')+'<p class="small">Пока ты только разбираешь значение. Этот экран не считается самостоятельным ответом.</p><div class="morph-actions"><button class="secondary-button" data-teach-semantic-full>Разобрать смысл полностью</button><button class="primary-button" data-teach-semantic-done>Понятно, разобрать правило</button></div></div>';
}
function fullExplanation(module,resume){
 recordOnce('full_explanation_opened',module.id,resume.familyId);
 const lessonRow=learnerLesson(module,resume.familyId);
 if(lessonRow)return learnerPanel(module,resume,lessonRow,'full');
 const body=module.fullExplanationBlocks?renderBlocks(module.fullExplanationBlocks):module.fullExplanation.map(p=>'<p>'+esc(p)+'</p>').join('');
 const counters=(module.counterExamples||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const limits=(module.limitations||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 2 · ПОЛНОЕ ОБЪЯСНЕНИЕ</p><h2>'+esc(module.title)+'</h2><div class="morph-full-explanation">'+body+'</div>'+(counters?'<h3>Контрпримеры</h3><ul class="morph-teach-list">'+counters+'</ul>':'')+(limits?'<h3>Границы правила</h3><ul class="morph-teach-list">'+limits+'</ul>':'')+'<p class="small">Полное объяснение не заменяется короткой подсказкой и остаётся доступным из раздела.</p><div class="morph-actions"><button class="primary-button" data-teach-next-step="CONTRAST_EXAMPLES">Посмотреть контрасты</button></div></div>';
}
function contrastExamples(module,resume,semantic){
 const lessonRow=learnerLesson(module,resume.familyId);
 if(lessonRow)return '<div class="morph-panel morph-teach-panel morph-learner" data-learner-lesson="'+esc(lessonRow.id)+'">'+teachingNav(module,resume)+learner().render(lessonRow,'contrast')+'<div class="morph-actions"><button class="secondary-button" data-teach-go-full>Разобрать правило полностью</button><button class="primary-button" data-teach-next-step="FEATURE_NOTICE">На что смотреть</button></div></div>';
 const examples=[...(semantic.examples||[]).map(x=>x.text),...(module.examples||[]).map(x=>x.text)].filter((x,i,a)=>a.indexOf(x)===i);
 const ex=examples.map(x=>'<li lang="kk">'+esc(x)+'</li>').join('');
 const contrasts=(module.contrastSets||[]).map(set=>'<li>'+set.map(x=>'<span lang="kk">'+esc(x)+'</span>').join(' ↔ ')+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 3 · КОНТРАСТЫ</p><h2>Сравни похожие случаи</h2>'+(ex?'<h3>Сопоставимые примеры</h3><ul class="morph-teach-list">'+ex+'</ul>':'')+(contrasts?'<h3>Что различать</h3><ul class="morph-teach-list morph-contrast-list">'+contrasts+'</ul>':'')+'<div class="morph-actions"><button class="secondary-button" data-teach-go-full>Разобрать правило полностью</button><button class="primary-button" data-teach-next-step="FEATURE_NOTICE">На что смотреть</button></div></div>';
}
function featureNotice(module,resume){
 if(resume.stepIndex>0)return teachingComplete(module,resume);
 const lessonRow=learnerLesson(module,resume.familyId);
 const checks=lessonRow?lessonRow.lookAt.map((x,i)=>'<label class="morph-feature-option"><input type="checkbox" data-teach-feature value="'+i+'"><span>'+esc(x)+'</span></label>').join(''):module.whatToLookAt.map((x,i)=>'<label class="morph-feature-option"><input type="checkbox" data-teach-feature value="'+i+'"><span>'+esc(x)+'</span></label>').join('');
 const steps=lessonRow?lessonRow.steps.map((x,i)=>'<li><strong>'+(i+1)+'.</strong> '+esc(x)+'</li>').join(''):module.decisionSteps.map((x,i)=>'<li><strong>'+(i+1)+'.</strong> '+esc(x)+'</li>').join('');
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">ШАГ 4 · НА ЧТО СМОТРЕТЬ</p><h2>Перед формой назови признаки</h2><p>Отметь всё, что нужно проверить в этом разделе. Это активная опора, а не тест на mastery.</p><div class="morph-feature-grid">'+checks+'</div><h3>Порядок решения</h3><ol class="morph-teach-list">'+steps+'</ol><div class="morph-actions"><button class="secondary-button" data-teach-go-full>Разобрать правило полностью</button><button class="primary-button" data-teach-feature-submit>Я отметил(а) признаки</button></div></div>';
}
function stage5Ready(module){return !!P&&P.MODULES.includes(module.id)&&P.fullStage5Ready(data().module,module.id)&&P.prerequisitesReady(data().module,module.id);}
function stage5Evidence(moduleId){return S.teachingEvidence(data().module,{moduleId});}
function stage5Guided(module,resume){
 const plan=P.guidedPlan(module.id),i=Math.max(0,resume.stepIndex||0);
 if(i>=plan.length)return stage5GuidedComplete(module,resume,plan);
 const task=plan[i],support=shownSupport(task,P.support(module.id,task)),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage5-guided-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · '+(i+1)+' / '+plan.length+'</p><h2>'+esc(module.title)+'</h2><p class="morph-rule">'+esc(support)+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(shownOperation(task))+'</p><div class="morph-choices">'+choices+'</div><p class="small">Ответ с опорой сохраняется как подсказка и не считается самостоятельным ответом.</p>'+learnerOpenButton(task)+'<button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function stage5GuidedComplete(module,resume,plan=P.guidedPlan(module.id)){
 const e=stage5Evidence(module.id),guided=e.guided;
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · ГОТОВО</p><h2>Теперь без подсказки</h2><p>Ответы с подсказкой: '+guided.correct+' из '+guided.attempts+'. Ошибки после показа ответа исправлялись на другой основе и не становились самостоятельный результат.</p><p class="small">Следующий блок использует другие учебных основы и отключает подсказку.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Повторить с опорой</button><button class="primary-button" data-stage5-start-choice>Самостоятельно · выбор</button></div></div>';
}
function parseRepair(resume){try{const x=JSON.parse(resume.draft||'{}');return x&&typeof x==='object'?x:{};}catch{return {};}}
function stage5Repair(module,resume){
 const payload=parseRepair(resume),source=P.taskForItem(module.id,payload.sourceItemId,'source');
 const session=data().module.session,exclude=[...P.guidedPlan(module.id).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)];
 const task=P.repairFor(module.id,source,exclude),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage5-repair-answer="'+esc(o)+'">'+esc(o)+'</button>').join(''),wrong=String(payload.response||''),codes=wrong?E.errors(E.getItem(source.itemId),wrong):[];
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">РАЗБОР ОШИБКИ</p><h2>Тот же контраст — другое слово</h2><div class="morph-feedback wrong"><strong>Правильная форма: <span lang="kk">'+esc(source.expected)+'</span></strong>'+(wrong?'<p>Твой ответ: <span lang="kk">'+esc(wrong)+'</span></p>':'')+'<p>'+esc(shownReason(E.getItem(source.itemId),codes))+'</p></div><p>Теперь проверь тот же признак на другой основе. Этот ответ — correction evidence, не independent.</p><p class="morph-rule">'+esc(shownSupport(task,P.support(module.id,task)))+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(shownOperation(task))+'</p><div class="morph-choices">'+choices+'</div><button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function startStage5Guided(moduleId){
 const module=teachingModule(moduleId);if(!module||!P?.MODULES.includes(moduleId)){message='Практика с опорой здесь открывается для первых четырёх разделов.';render();return;}
 if(!P.fullStage5Ready(data().module,moduleId)){message='Сначала заверши Level 0 для всех значений этого раздела.';startTeaching(moduleId);return;}
 if(!P.prerequisitesReady(data().module,moduleId)){const prev=P.previousModule(moduleId);message='Сначала заверши предыдущий учебный модуль.';if(prev)startTeaching(prev);return;}
 saveSession(null);setTeachingResume(moduleId,'GUIDED_CHOICE',null,0,'');teachingMode=true;showHub=false;message='';render();
}
function stage5ExposedLemmas(moduleId,responseMode){
 const m=data().module,out=new Set();
 for(const e of m.teaching?.events||[])if(e.moduleId===moduleId&&e.type==='correction_after_feedback'&&e.lemmaId)out.add(e.lemmaId);
 if(responseMode==='input')for(const e of m.events||[])if(e.level===moduleId&&typeof e.eventId==='string'&&e.eventId.startsWith('morph-stage5-'+moduleId+'-choice-')&&e.lemmaId)out.add(e.lemmaId);
 return [...out];
}
function startStage5Independent(moduleId,step,responseMode){
 const module=teachingModule(moduleId);if(!module||!P?.MODULES.includes(moduleId))return;
 const excludeLemmas=stage5ExposedLemmas(moduleId,responseMode),now=Date.now();setTeachingResume(moduleId,step,null,0,'');
 const session=P.createIndependentSession(moduleId,responseMode,now+2,excludeLemmas);saveSession(session);teachingMode=false;showHub=false;message='';render();
}
function stage5Finish(s,resume){
 const module=teachingModule(resume?.currentModule)||teachingModule(s.level),r=E.summary(s.results),input=resume?.currentTeachingStep==='FULL_INPUT';
 if(!module)return '<div class="morph-panel"><p role="status">Учебный модуль не удалось восстановить. Ответы сохранены.</p><button class="secondary-button" data-morph-hub>К тренировкам</button></div>';
 const e=stage5Evidence(module.id),next=P.MODULES[P.MODULES.indexOf(module.id)+1]||null;
 if(!input)return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">САМОСТОЯТЕЛЬНО · ВЫБОР</p><h2>'+r.correct+' из '+r.n+'</h2><p>'+r.uniqueLemmas+' разных учебных основ. Подсказка в этом блоке была отключена.</p><p class="small">Это independent-choice evidence. Теперь та же логика проверяется вводом полной формы на другом наборе основ.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Вернуться к опоре</button><button class="primary-button" data-stage5-start-input>Самостоятельно · ввод</button></div></div>';
 recordOnce('stage5_module_completed',module.id,null,{responseMode:'view'});
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">МОДУЛЬ 1–4 · БЛОК ЗАВЕРШЁН</p><h2>'+esc(module.title)+'</h2><p>Самостоятельный ввод: '+r.correct+' из '+r.n+'.</p><div class="stage5-evidence"><p>Самостоятельный выбор: '+e.independentChoice.correct+' / '+e.independentChoice.attempts+'</p><p>Самостоятельный ввод: '+e.independentInput.correct+' / '+e.independentInput.attempts+'</p><p>С подсказкой: '+e.guided.correct+' / '+e.guided.attempts+'</p><p>Исправления: '+e.corrections.correct+' / '+e.corrections.attempts+'</p></div><p class="small">Это завершённый учебный блок, а не заявление «навык освоен». Перенос и удержание проверяются отдельно.</p><div class="morph-actions"><button class="secondary-button" data-stage5-restart-guided>Повторить этот модуль</button>'+(next?'<button class="primary-button" data-stage5-next-module="'+esc(next)+'">Следующий модуль</button>':'<button class="primary-button" data-teach-close>К разделу</button>')+'</div></div>';
}

function stage6Ready(module){return !!P&&P.STAGE6_MODULES?.includes(module.id)&&P.fullStage6Ready(data().module,module.id)&&P.stage6PrerequisitesReady(data().module,module.id);}
function stage6Evidence(moduleId){return S.teachingEvidence(data().module,{moduleId});}
function stage6Guided(module,resume){
 const checks=P.stage6SemanticChecks(module.id),plan=P.stage6GuidedPlan(module.id),i=Math.max(0,resume.stepIndex||0),total=checks.length+plan.length;
 if(i<checks.length){
  const check=checks[i];let feedback=null;try{feedback=JSON.parse(resume.draft||'null');}catch{}
  const answered=feedback&&feedback.semanticId===check.id,choices=check.options.map(o=>'<button type="button" class="secondary-button" data-stage6-semantic-answer="'+esc(o)+'"'+(answered?' disabled':'')+'>'+esc(o)+'</button>').join('');
  const result=answered?'<div class="morph-feedback '+(feedback.correct?'correct':'wrong')+'" role="status"><strong>'+(feedback.correct?'Верно':'Правильная категория: '+esc(check.expected))+'</strong><p>Твой ответ: '+esc(feedback.response)+'</p><p>'+esc(check.explanation)+'</p></div><button class="primary-button" data-stage6-semantic-next>Дальше</button>':'';
  return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">СМЫСЛОВОЙ КОНТРАСТ · '+(i+1)+' / '+total+'</p><h2>'+esc(module.title)+'</h2><p class="morph-operation">'+esc(check.prompt)+'</p><div class="morph-choices">'+choices+'</div>'+result+'<p class="small">Это проверка смысла. Ответ не меняет расписание повторений и не считается самостоятельной формой.</p><button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
 }
 const formIndex=i-checks.length;if(formIndex>=plan.length)return stage6GuidedComplete(module,resume,plan);
 const task=plan[formIndex],support=shownSupport(task,P.stage6Support(module.id,task)),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage6-guided-answer="'+esc(o)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · '+(i+1)+' / '+total+'</p><h2>'+esc(module.title)+'</h2><p class="morph-rule">'+esc(support)+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(shownOperation(task))+'</p><div class="morph-choices">'+choices+'</div><p class="small">Подсказка разрешена. Расписание повторений и самостоятельный зачёт не меняются.</p>'+learnerOpenButton(task)+'<button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function stage6GuidedComplete(module,resume,plan=P.stage6GuidedPlan(module.id)){
 const e=stage6Evidence(module.id);
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">С ОПОРОЙ · ГОТОВО</p><h2>Теперь без подсказки</h2><p>Смысловые контрасты: '+e.semanticChecks.correct+' из '+e.semanticChecks.attempts+'. Формы с подсказкой: '+e.guided.correct+' из '+e.guided.attempts+'. Исправления после раскрытого ответа не считаются самостоятельным результатом.</p><p class="small">Следующий блок использует учебные задания без подсказки. Слова из исправления в следующее самостоятельное задание не попадают.</p><div class="morph-actions"><button class="secondary-button" data-stage6-restart-guided>Повторить с опорой</button><button class="primary-button" data-stage6-start-choice>Самостоятельно · выбор</button></div></div>';
}
function stage6Repair(module,resume){
 const payload=parseRepair(resume),source=P.stage6TaskForItem(module.id,payload.sourceItemId,'source');
 const session=data().module.session,exclude=[...P.stage6GuidedPlan(module.id).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)];
 const task=P.stage6RepairFor(module.id,source,exclude),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage6-repair-answer="'+esc(o)+'">'+esc(o)+'</button>').join(''),wrong=String(payload.response||''),codes=wrong?E.errors(E.getItem(source.itemId),wrong):[];
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">РАЗБОР ОШИБКИ</p><h2>Тот же механизм — другая основа</h2><div class="morph-feedback wrong"><strong>Правильная форма: <span lang="kk">'+esc(source.expected)+'</span></strong>'+(wrong?'<p>Твой ответ: <span lang="kk">'+esc(wrong)+'</span></p>':'')+'<p>'+esc(shownReason(E.getItem(source.itemId),codes))+'</p></div><p>Теперь тот же признак на другом учебном слове. Этот ответ — исправление, не самостоятельный результат.</p><p class="morph-rule">'+esc(shownSupport(task,P.stage6Support(module.id,task)))+'</p><h3 class="morph-stem" lang="kk">'+esc(task.stem)+'</h3><p>'+esc(task.gloss)+'</p><p class="morph-operation">'+esc(shownOperation(task))+'</p><div class="morph-choices">'+choices+'</div><button class="text-button" data-teach-go-full>Разобрать правило полностью</button></div>';
}
function startStage6Guided(moduleId){
 const module=teachingModule(moduleId);if(!module||!P?.STAGE6_MODULES?.includes(moduleId)){message='Практика с опорой здесь открывается для «чей предмет» и «я, мы и вопрос».';render();return;}
 if(!P.fullStage6Ready(data().module,moduleId)){message='Сначала заверши Level 0 для всех значений этого раздела.';startTeaching(moduleId);return;}
 if(!P.stage6PrerequisitesReady(data().module,moduleId)){const missing=P.stage6MissingPrerequisite(data().module,moduleId);message='Сначала закончи предыдущую тему: '+(teachingModule(missing)?.title||missing||'предыдущий модуль')+'.';if(missing)startTeaching(missing);return;}
 saveSession(null);setTeachingResume(moduleId,'GUIDED_CHOICE',null,0,'');teachingMode=true;showHub=false;message='';render();
}
function stage6Exposed(moduleId,responseMode){
 const m=data().module,lemmas=new Set(),items=new Set();
 for(const e of m.teaching?.events||[])if(e.moduleId===moduleId&&e.type==='correction_after_feedback'&&e.lemmaId)lemmas.add(e.lemmaId);
 if(responseMode==='input')for(const e of m.events||[])if(e.level===moduleId&&typeof e.eventId==='string'&&e.eventId.startsWith('morph-stage6-'+moduleId+'-choice-')&&e.itemId)items.add(e.itemId);
 return {excludeLemmas:[...lemmas],excludeItemIds:[...items]};
}
function startStage6Independent(moduleId,step,responseMode){
 const module=teachingModule(moduleId);if(!module||!P?.STAGE6_MODULES?.includes(moduleId))return;
 const opts=stage6Exposed(moduleId,responseMode),now=Date.now();setTeachingResume(moduleId,step,null,0,'');
 const session=P.createStage6IndependentSession(moduleId,responseMode,now+2,opts);saveSession(session);teachingMode=false;showHub=false;message='';render();
}
function stage6Finish(s,resume){
 const module=teachingModule(resume?.currentModule)||teachingModule(s.level),r=E.summary(s.results),input=resume?.currentTeachingStep==='FULL_INPUT';
 if(!module)return '<div class="morph-panel"><p role="status">Учебный модуль не удалось восстановить. Ответы сохранены.</p><button class="secondary-button" data-morph-hub>К тренировкам</button></div>';
 const e=stage6Evidence(module.id),next=P.stage6NextModule(module.id);
 if(!input)return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">САМОСТОЯТЕЛЬНО · ВЫБОР</p><h2>'+r.correct+' из '+r.n+'</h2><p>'+r.uniqueLemmas+' разных учебных основ. Подсказка отключена.</p><p class="small">Теперь та же система проверяется вводом полной формы. То же задание из выбора снова не даётся.</p><div class="morph-actions"><button class="secondary-button" data-stage6-restart-guided>Вернуться к опоре</button><button class="primary-button" data-stage6-start-input>Самостоятельно · ввод</button></div></div>';
 recordOnce('teaching_module_completed',module.id,null,{responseMode:'view'});
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">УЧЕБНЫЙ БЛОК ЗАВЕРШЁН</p><h2>'+esc(module.title)+'</h2><p>Самостоятельный ввод: '+r.correct+' из '+r.n+'.</p><div class="stage5-evidence"><p>Самостоятельный выбор: '+e.independentChoice.correct+' / '+e.independentChoice.attempts+'</p><p>Самостоятельный ввод: '+e.independentInput.correct+' / '+e.independentInput.attempts+'</p><p>С подсказкой: '+e.guided.correct+' / '+e.guided.attempts+'</p><p>Исправления: '+e.corrections.correct+' / '+e.corrections.attempts+'</p></div><p class="small">Это завершённый учебный блок, не заявление «навык освоен». Перенос и удержание проверяются отдельно. Для «я, мы и вопрос» проверка на новых словах ограничена тем, сколько новых основ есть в банке.</p><div class="morph-actions"><button class="secondary-button" data-stage6-restart-guided>Повторить этот модуль</button>'+(next?'<button class="primary-button" data-stage6-next-module="'+esc(next)+'">Следующий раздел</button>':'<button class="primary-button" data-teach-close>К разделу</button>')+'</div></div>';
}

function saveChain(v){return bridge().chain(v);}
function stage7EdgeLabel(edge){return {vowel:'гласный',glide:'й/у',r:'р',l:'л',nasal:'м/н/ң',voiced_fricative:'з/ж',voiceless:'глухой'}[edge]||edge;}
function stage7StateLabel(view){return (view.poss||'без принадлежности')+', '+(view.kase||'без падежа');}
function stage7Pending(){return '<div class="morph-panel" data-stage7-pending><p role="status">Шаг цепочки ещё не готов. Прогресс, очередь и учебный шаг не изменены.</p><button type="button" class="secondary-button" data-stage7-retry>Показать шаг</button></div>';}
function stage7EventId(chain){return chain.id+':'+chain.chainIndex+':'+chain.junction;}
function stage7ExposedLemmas(){const moduleId=data().module.chain?.moduleId==='verbs'?'verbs':'chains';return (data().module.teaching?.events||[]).filter(e=>e.moduleId===moduleId&&e.type==='correction_after_feedback'&&e.lemmaId).map(e=>e.lemmaId);}
function stage7Advance(chain){
 const row=chain.chains[chain.chainIndex],total=P.stage7View(row.lemmaId,row.sequence,0).total;
 let junction=chain.junction+1,chainIndex=chain.chainIndex;
 if(junction>=total){junction=0;chainIndex++;}
 const phase=chainIndex>=chain.chains.length?'complete':'question';
 return {...chain,junction,chainIndex,phase,result:null,repair:null,draft:'',updatedAt:Date.now()};
}
function stage7TaskHtml(view,chain,answered){
 const choices=chain.responseMode==='choice'?view.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage7-answer="'+esc(o)+'"'+(answered?' disabled':'')+'>'+esc(o)+'</button>').join(''):'<form id="stage7-answer-form"><label for="stage7-answer">Форма после этого шага</label><input id="stage7-answer" lang="kk" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200"'+(answered?' disabled':'')+'><div class="morph-keys">'+[...'әғқңөұүі'].map(c=>'<button type="button" class="text-button" data-stage7-key="'+c+'"'+(answered?' disabled':'')+'>'+c+'</button>').join('')+'</div><button class="primary-button"'+(answered?' disabled':'')+'>Проверить</button></form>';
 const support=chain.lane==='guided'&&chain.phase==='question'?'<p class="morph-rule">'+esc(P.stage7Support())+'</p>':'';
 return support+'<p class="eyebrow">Сейчас</p><h2 class="morph-stem" lang="kk">'+esc(view.before)+'</h2><p class="morph-operation">'+esc(shownOperation(view))+'</p><div class="morph-choices">'+choices+'</div>';
}
function stage7RepairScreen(chain){
 const repair=chain.repair,source=P.stage7View(repair.sourceLemmaId,repair.sequence,repair.sequence.length-1),view=P.stage7View(repair.repairLemmaId,repair.sequence,repair.sequence.length-1);
 const note=(learner()&&learner().chainNote(source,repair.errorCodes||[]))||P.stage7Feedback(source,repair.errorCodes||[]);
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">РАЗБОР СТЫКА</p><h2>Тот же стык — другая основа</h2><div class="morph-feedback wrong"><strong>Форма этого шага: <span lang="kk">'+esc(repair.expected)+'</span></strong>'+(repair.response?'<p>Твой ответ: <span lang="kk">'+esc(repair.response)+'</span></p>':'')+'<p>'+esc(note)+'</p></div><p>Дальше тот же стык на другой учебной основе. Это исправление, не самостоятельная цепочка.</p>'+stage7TaskHtml({...view,chainId:repair.sourceChainId},{...chain,lane:'guided',responseMode:'choice',phase:'question'},false)+'</div>';
}
function stage7Finish(chain){
 const e=P.stage7Evidence(data().module);
 if(chain.lane==='guided')return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">С ОПОРОЙ · ГОТОВО</p><h2>Теперь без подсказки</h2><p>Стыки с опорой: '+e.guided.correct+' из '+e.guided.attempts+'. Исправления: '+e.corrections.correct+' из '+e.corrections.attempts+'. Это не одна общая оценка и не самостоятельная цепочка.</p><div class="morph-actions"><button class="secondary-button" data-stage7-start-guided>Повторить с опорой</button><button class="primary-button" data-stage7-start-choice>Самостоятельно · выбор</button></div></div>';
 if(chain.responseMode==='choice')return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">САМОСТОЯТЕЛЬНО · ВЫБОР</p><h2>Выбор без подсказки записан</h2><p>Разных основ: '+e.uniqueLemmas+'. Ошибочные стыки: '+(e.errorJunctions.map(id=>(learner()&&learner().label(id))||teachingFamily(id)?.title||'шаг').join(', ')||'нет')+'.</p><div class="morph-actions"><button class="primary-button" data-stage7-start-input>Самостоятельно · ввод</button></div></div>';
 recordOnce('teaching_module_completed','chains',null,{responseMode:'view'});
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">УЧЕБНЫЙ БЛОК ЗАВЕРШЁН</p><h2>Цепочки</h2><div class="stage5-evidence"><p>Стыки с подсказкой: '+e.guided.correct+' / '+e.guided.attempts+'</p><p>Самостоятельный выбор: '+e.independentChoice.correct+' / '+e.independentChoice.attempts+'</p><p>Самостоятельный ввод: '+e.independentInput.correct+' / '+e.independentInput.attempts+'</p><p>Исправления: '+e.corrections.correct+' / '+e.corrections.attempts+'</p><p>Разных основ: '+e.uniqueLemmas+'</p><p>Ошибочные стыки: '+(e.errorJunctions.map(id=>(learner()&&learner().label(id))||teachingFamily(id)?.title||'шаг').join(', ')||'нет')+'</p></div><p class="small">Это завершённый учебный блок, не заявление «навык освоен». Перенос проверяется отдельно.</p><button class="secondary-button" data-stage7-start-guided>Повторить с опорой</button></div>';
}
function stage7Screen(){
 const chain=data().module.chain;if(!chain)return stage7Pending();
 if(chain.phase==='complete'||chain.chainIndex>=chain.chains.length)return stage7Finish(chain);
 if(chain.phase==='repair'&&chain.repair)return stage7RepairScreen(chain);
 const view=P.stage7Current(chain);if(!view)return stage7Pending();
 const answered=chain.phase==='feedback';
 const revealed=answered?'<div class="morph-feedback correct" role="status"><strong>Теперь форма: <span lang="kk">'+esc(view.after)+'</span></strong><p>Дальше слово кончается так: '+esc(stage7EdgeLabel(view.nextEdge))+'.</p><p>Уже собрано: '+esc(stage7StateLabel(view))+'.</p></div><button class="primary-button" data-stage7-next>Дальше</button>':'';
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">'+(chain.lane==='guided'?'С ОПОРОЙ':'САМОСТОЯТЕЛЬНО')+' · '+esc(view.chainId||'')+' · '+(view.junction+1)+' / '+view.total+'</p>'+stage7TaskHtml(view,chain,answered)+revealed+'<p class="small">Следующий стык не показан, пока не принят этот.</p></div>';
}
function startStage7(lane,step,responseMode){
 const moduleState=data().module;
 if(!P.stage7PrerequisitesReady(moduleState)){const missing=P.stage7MissingPrerequisite(moduleState);message='Сначала закончи предыдущую тему: '+(teachingModule(missing)?.title||missing)+'.';if(missing)startTeaching(missing);return;}
 if(!P.stage7MeaningReady(moduleState)){const family=P.stage7MissingMeaning(moduleState),owner=P.stage7Owner(family);message='Сначала смысл этой операции: '+(family||'')+'.';startTeaching(owner,family);return;}
 const chain=P.createStage7Run(lane,responseMode,Date.now(),{excludeLemmas:stage7ExposedLemmas()});
 setTeachingResume('chains',step,null,0,'');saveChain(chain);saveSession(null);teachingMode=true;showHub=false;message='';render();
}
function answerStage7Repair(response){
 const chain=data().module.chain;if(!chain||chain.phase!=='repair'||!chain.repair||!String(response||'').trim())return;
 let view=null;try{view=P.stage7View(chain.repair.repairLemmaId,chain.repair.sequence,chain.repair.sequence.length-1);}catch(e){view=null;}
 if(!view||!chain.id||!view.lemmaId){message='Шаг цепочки ещё не готов. Прогресс, очередь и учебный шаг не изменены.';render();return;}
 const correct=E.norm(response)===E.norm(view.after),id=chain.id+':repair:'+chain.chainIndex+':'+chain.junction+':'+view.lemmaId;
 if(!(data().module.teaching?.events||[]).some(e=>e.eventId===id))recordTeaching({eventId:id,type:'correction_after_feedback',moduleId:chain.moduleId==='verbs'?'verbs':'chains',familyId:view.morpheme,lemmaId:view.lemmaId,at:Date.now(),responseMode:'choice',answer:String(response),correct,hinted:true});
 const next=stage7Advance(chain);
 saveChain({...next,acceptedEventIds:chain.acceptedEventIds,exposedRepairLemmas:[...new Set([...chain.exposedRepairLemmas,view.lemmaId])],updatedAt:Date.now()});
 const step=chain.lane==='guided'?'GUIDED_CHOICE':chain.responseMode==='input'?'FULL_INPUT':'INDEPENDENT_CHOICE';
 setTeachingResume(chain.moduleId==='verbs'?'verbs':'chains',step,null,next.junction,'');message=correct?'Исправление верное. Возвращаемся к цепочке.':'Правильная форма: '+view.after+'. Возвращаемся к цепочке.';teachingMode=true;render();
}
function answerStage7(response){
 const chain=data().module.chain;if(chain?.phase==='repair')return answerStage7Repair(response);
 if(!chain||chain.phase!=='question'||!String(response||'').trim())return;
 const view=P.stage7Current(chain);if(!view)return;
 const correct=E.norm(response)===E.norm(view.after),codes=correct?[]:P.stage7Errors(view,response);
 const id=stage7RecordAnswer(chain,view,response,correct);if(!id){message='Этот шаг уже сохранён.';render();return;}
 if(!correct){
  const repairView=P.stage7RepairFor(view,[...chain.exposedRepairLemmas,...stage7ExposedLemmas()],chain.moduleId==='verbs'?'verb':'noun');
  const repair={sourceChainId:view.chainId||chain.chains[chain.chainIndex].chainId,sourceLemmaId:view.lemmaId,sourceJunction:view.junction,repairLemmaId:repairView.lemmaId,sequence:repairView.sequence,response:String(response),expected:view.after,errorCodes:codes};
  saveChain({...chain,phase:'repair',repair,result:null,acceptedEventIds:[...chain.acceptedEventIds,id],exposedRepairLemmas:[...new Set([...chain.exposedRepairLemmas,repairView.lemmaId])],updatedAt:Date.now()});
  setTeachingResume(chain.moduleId==='verbs'?'verbs':'chains','ERROR_REPAIR',view.morpheme,chain.junction,'');message='Стык разобран на другой основе.';teachingMode=true;render();return;
 }
 saveChain({...chain,phase:'feedback',result:{eventId:id,response:String(response),correct:true,errorCodes:[]},repair:null,acceptedEventIds:[...chain.acceptedEventIds,id],updatedAt:Date.now()});
 setTeachingResume(chain.moduleId==='verbs'?'verbs':'chains',chain.lane==='guided'?'GUIDED_CHOICE':chain.responseMode==='input'?'FULL_INPUT':'INDEPENDENT_CHOICE',view.morpheme,chain.junction,'');message='';teachingMode=true;render();
}
function stage8Semantic(check,resume){
 let feedback=null;try{feedback=JSON.parse(resume.draft||'null');}catch{}
 const answered=feedback&&feedback.id===check.id;
 const choices=check.options.map(o=>'<button type="button" class="secondary-button" data-stage8-semantic="'+esc(o)+'"'+(answered?' disabled':'')+'>'+esc(o)+'</button>').join('');
 const note=answered?'<div class="morph-feedback '+(feedback.correct?'correct':'wrong')+'" role="status"><strong>'+(feedback.correct?'Верно':'Это другая функция')+'</strong><p>'+esc(check.explain)+'</p></div><button class="primary-button" data-stage8-semantic-next>Дальше</button>':'';
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">СМЫСЛ · '+(resume.stepIndex+1)+' / '+P.STAGE8_SEMANTIC.length+'</p><h2>Сначала функция</h2><p class="morph-operation">'+esc(check.prompt)+'</p><div class="morph-choices">'+choices+'</div>'+note+'<p class="small">Это смысловой выбор. Он не меняет расписание повторений и не является самостоятельной формой.</p></div>';
}
function stage8FormScreen(chain){
 if(chain.phase==='complete'||chain.chainIndex>=chain.chains.length){
  const rows=(data().module.teaching?.events||[]).filter(e=>e.moduleId==='verbs');
  const e={guided:{correct:rows.filter(x=>x.type==='guided_attempt'&&x.correct).length,attempts:rows.filter(x=>x.type==='guided_attempt').length},corrections:{correct:rows.filter(x=>x.type==='correction_after_feedback'&&x.correct).length,attempts:rows.filter(x=>x.type==='correction_after_feedback').length}};
  if(chain.lane==='guided')return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">С ОПОРОЙ · ГОТОВО</p><h2>Теперь без подсказки</h2><p>С опорой: '+e.guided.correct+' из '+e.guided.attempts+'. Исправления: '+e.corrections.correct+' из '+e.corrections.attempts+'. Смысл и форма здесь не сведены в одну оценку.</p><div class="morph-actions"><button class="secondary-button" data-stage8-start>Повторить смысл</button><button class="primary-button" data-stage8-start-choice>Самостоятельно · выбор</button></div></div>';
  if(chain.responseMode==='choice')return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">САМОСТОЯТЕЛЬНО · ВЫБОР</p><h2>Выбор записан</h2><div class="morph-actions"><button class="primary-button" data-stage8-start-input>Самостоятельно · ввод</button></div></div>';
  recordOnce('teaching_module_completed','verbs',null,{responseMode:'view'});
  return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">УЧЕБНЫЙ БЛОК ЗАВЕРШЁН</p><h2>Глагольные стыки</h2><p class="small">Это завершённый учебный блок, не заявление «навык освоен». Каузатив, пассив и возвратность сюда не добавлялись.</p><button class="secondary-button" data-stage8-start>К смыслу</button></div>';
 }
 if(chain.phase==='repair'&&chain.repair)return stage7RepairScreen(chain).replace('РАЗБОР СТЫКА','РАЗБОР ГЛАГОЛА');
 const view=P.stage7Current(chain);if(!view)return '<div class="morph-panel" data-stage8-pending><p role="status">Шаг глагола ещё не готов. Прогресс и учебный шаг не изменены.</p><button type="button" class="secondary-button" data-stage7-retry>Показать шаг</button></div>';
 const answered=chain.phase==='feedback';
 const revealed=answered?'<div class="morph-feedback correct" role="status"><strong>Теперь форма: <span lang="kk">'+esc(view.after)+'</span></strong><p>Новый край: '+esc(stage7EdgeLabel(view.nextEdge))+'.</p></div><button class="primary-button" data-stage7-next>Дальше</button>':'';
 return '<div class="morph-panel morph-teach-panel stage5-panel"><button class="text-button" data-teach-close>← К разделу</button><p class="eyebrow">'+(chain.lane==='guided'?'С ОПОРОЙ':'САМОСТОЯТЕЛЬНО')+' · '+esc(view.chainId||'')+' · '+(view.junction+1)+' / '+view.total+'</p><p>'+esc(P.stage8Context(view.chainId))+'</p>'+stage7TaskHtml(view,chain,answered)+revealed+'<p class="small">Следующий стык не показан, пока не принят этот.</p></div>';
}
function stage8Screen(){
 const resume=currentTeachingResume(),chain=data().module.chain;
 if(chain&&chain.moduleId==='verbs')return stage8FormScreen(chain);
 if(resume&&resume.currentTeachingStep==='GUIDED_CHOICE'&&(resume.stepIndex||0)<P.STAGE8_SEMANTIC.length)return stage8Semantic(P.STAGE8_SEMANTIC[resume.stepIndex],resume);
 return stage8FormScreen({lane:'guided',phase:'complete',chainIndex:0,chains:[],responseMode:'choice',moduleId:'verbs'});
}
function startStage8Forms(lane,step,responseMode){
 const chain=P.createStage8Run(lane,responseMode,Date.now(),{excludeLemmas:stage7ExposedLemmas()});
 setTeachingResume('verbs',step,null,P.STAGE8_SEMANTIC.length,'');saveChain(chain);saveSession(null);teachingMode=true;showHub=false;message='';render();
}
function startStage8(){
 const moduleState=data().module;
 if(!P.stage8PrerequisitesReady(moduleState)){const missing=P.stage8MissingPrerequisite(moduleState);message='Сначала закончи предыдущую тему: '+(teachingModule(missing)?.title||missing)+'.';if(missing)startTeaching(missing);return;}
 saveChain(null);setTeachingResume('verbs','GUIDED_CHOICE',null,0,'');teachingMode=true;showHub=false;message='';render();
}
function teachingComplete(module,resume){
 const nextIndex=module.families.indexOf(resume.familyId)+1,next=module.families[nextIndex]||null;
 let route='';
 if(next)route='<button class="primary-button" data-teach-next-family="'+esc(next)+'">Следующее значение · '+esc(teachingFamily(next)?.title||next)+'</button>';
 else if(module.id==='mixed'){
  route='<button class="primary-button" data-stage9-start>Смешать уже знакомое</button>';
 }else if(module.id==='verbs'){
  const ready=!!P&&P.stage8PrerequisitesReady(data().module),missing=P?.stage8MissingPrerequisite(data().module);
  route=ready?'<button class="primary-button" data-stage8-start>Глаголы: сначала смысл</button>':missing?'<button class="secondary-button" data-stage8-prereq="'+esc(missing)+'">Сначала предыдущая тема · '+esc(teachingModule(missing)?.title||missing)+'</button>':'';
 }else if(module.id==='chains'){
  const ready=!!P&&P.stage7Ready(data().module),missing=P?.stage7MissingPrerequisite(data().module),meaning=P?.stage7MissingMeaning(data().module),owner=meaning?P.stage7Owner(meaning):'';
  route=ready?'<button class="primary-button" data-stage7-start-guided>Цепочки по одному стыку</button>':missing?'<button class="secondary-button" data-stage7-prereq="'+esc(missing)+'">Сначала предыдущая тема · '+esc(teachingModule(missing)?.title||missing)+'</button>':meaning?'<button class="secondary-button" data-stage7-meaning="'+esc(owner)+'" data-stage7-family="'+esc(meaning)+'">Сначала смысл · '+esc(meaning)+'</button>':'';
 }else if(P?.STAGE6_MODULES?.includes(module.id)){
  const ownReady=P.fullStage6Ready(data().module,module.id),ready=stage6Ready(module),missing=P.stage6MissingPrerequisite(data().module,module.id);
  route=ready?'<button class="primary-button" data-stage6-start-guided>Дальше с подсказкой</button>':ownReady&&missing?'<button class="secondary-button" data-stage6-prereq="'+esc(missing)+'">Сначала предыдущая тема · '+esc(teachingModule(missing)?.title||missing)+'</button>':'';
 }else{
  const ownReady=!!P&&P.MODULES.includes(module.id)&&P.fullStage5Ready(data().module,module.id),ready=stage5Ready(module),prev=P?.previousModule(module.id),prevTitle=prev?teachingModule(prev)?.title:'';
  route=ready?'<button class="primary-button" data-stage5-start-guided>Тренировка с опорой</button>':ownReady&&prev?'<button class="secondary-button" data-stage5-prereq="'+esc(prev)+'">Сначала предыдущий модуль · '+esc(prevTitle||prev)+'</button>':'';
 }
 return '<div class="morph-panel morph-teach-panel">'+teachingNav(module,resume)+'<p class="eyebrow">LEVEL 0 · ГОТОВО</p><h2>Смысл и признаки разобраны</h2><p>Ты прошёл(а) вводную часть для «'+esc(teachingFamily(resume.familyId)?.title||resume.familyId)+'». Это ещё не самостоятельное владение формой. Практика с подсказкой и практика без подсказки идут отдельно.</p><div class="morph-actions">'+route+'<button class="secondary-button" data-teach-close>К разделу</button></div></div>';
}
function teachingScreen(){
 const d=data(),resume=d.module.teaching?.resume;if(!resume){teachingMode=false;showHub=true;return hub();}
 if(resume.currentModule==='mixed'&&['MIXED_PRACTICE','ERROR_REPAIR'].includes(resume.currentTeachingStep))return stage9Screen();
 const practiceStep=['GUIDED_CHOICE','ERROR_REPAIR','INDEPENDENT_CHOICE','FULL_INPUT'].includes(resume.currentTeachingStep);
 const module=teachingModule(resume.currentModule,resume.familyId);if(!module||(!practiceStep&&!module.families.includes(resume.familyId))){message='Учебная тема обновилась. Выбери раздел заново.';teachingMode=false;showHub=true;level='harmony';return hub();}
 if(practiceStep){
  const is5=!!P?.MODULES.includes(module.id),is6=!!P?.STAGE6_MODULES?.includes(module.id),is7=module.id==='chains',is8=module.id==='verbs',is9=module.id==='mixed';
  if(is9)return stage9Screen();
  if(is8)return stage8Screen();
  if(is7)return stage7Screen();
  if(!is5&&!is6){message='Guided-практика для этого модуля ещё не подключена.';teachingMode=false;showHub=true;return hub();}
  if(resume.currentTeachingStep==='GUIDED_CHOICE')return is6?stage6Guided(module,resume):stage5Guided(module,resume);
  if(resume.currentTeachingStep==='ERROR_REPAIR')return is6?stage6Repair(module,resume):stage5Repair(module,resume);
  message='Самостоятельная часть восстанавливается из сохранённой сессии.';teachingMode=false;showHub=false;
  if(data().module.session)return question(data().module.session);
  return is6?stage6GuidedComplete(module,{...resume,currentTeachingStep:'GUIDED_CHOICE'},P.stage6GuidedPlan(module.id)):stage5GuidedComplete(module,{...resume,currentTeachingStep:'GUIDED_CHOICE'},P.guidedPlan(module.id));
 }
 const semantic=teachingFamily(resume.familyId);if(!semantic){message='Для этой темы нет готового объяснения.';teachingMode=false;showHub=true;return hub();}
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
 const tr=currentTeachingResume();
 if(tr&&P?.STAGE6_MODULES?.includes(tr.currentModule)&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(tr.currentTeachingStep)&&s.level===tr.currentModule&&s.mode==='learn')return stage6Finish(s,tr);
 if(tr&&P?.MODULES.includes(tr.currentModule)&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(tr.currentTeachingStep)&&s.level===tr.currentModule&&s.mode==='learn')return stage5Finish(s,tr);
 const r=E.summary(s.results),transfer=s.mode==='transfer',view=E.reveal(s);
 const claim=transfer?P.stage10StrongFromEvents(s.results):null,retention=P.stage10Retention(data().module.events||[]),families=[...new Set(s.results.map(e=>e.sequence.at(-1)).filter(Boolean))];
 const claimText=claim?'<div class="stage5-evidence"><p>Проверка на новых словах, значения: '+(families.map(id=>(learner()&&learner().label(id))||teachingFamily(id)?.title||'значение').join(', ')||'нет')+'.</p><p>'+claim.correct+' из '+claim.total+', разных основ: '+r.uniqueLemmas+'.</p><p>'+esc(shellPhrase(claim.status))+'. Проверены новые реальные основы. Это не максимальное обобщение и не удержание.</p>'+(s.holdoutNote?'<p>'+esc(P.STAGE10_SHORT_BANK)+'</p>':'')+'<p>Повтор не в тот же день: '+esc(shellPhrase(retention.label))+'.</p></div>':'';
 return '<div class="morph-panel"><p class="eyebrow">ПОДХОД ЗАВЕРШЁН</p><h2>'+r.correct+' из '+r.n+(transfer?' самостоятельно, на новых основах':' самостоятельно')+'</h2><p>'+r.uniqueLemmas+' разных основ</p><p>'+(transfer?'Это короткая проверка новых здесь основ. Для вывода об устойчивом переносе нужны другие слова и отсроченная проверка.':'Теперь можно повторить трудный контраст или смешать правила.')+'</p>'+claimText+(view.transferNote?'<p>'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p>'+esc(view.holdoutNote)+'</p>':'')+'<div class="morph-actions"><button class="primary-button" data-morph-hub>К тренировкам</button>'+(!transfer&&s.level==='mixed'&&P.stage9Eligible(data().module).length?'<button class="secondary-button" data-morph-transfer>Проверить на новых основах</button>':'')+'</div>'+s.results.filter(e=>!e.correct).map(e=>{const i=E.getItem(e.itemId);return i?'<details><summary>'+esc(i.stem)+' → '+esc(i.expected)+'</summary><p>'+esc(shownReason(i,e.errorCodes))+learnerOpenButton(i)+'</p></details>':'';}).join('')+'</div>';
}
function stage7RecordAnswer(chain,view,response,correct){
 const bank=E.getItem('morph:v1:'+view.lemmaId+':'+view.sequence.slice(0,view.junction+1).join('.'));
 const id=stage7EventId(chain)+(chain.lane==='independent'&&bank?':0':'');
 const moduleId=chain.moduleId==='verbs'?'verbs':'chains';
 if(chain.acceptedEventIds.includes(id)||(data().module.events||[]).some(e=>e.eventId===id))return id;
 if(chain.lane==='independent'&&bank){
  const session={id:stage7EventId(chain),version:1,dataVersion:E.data.version,level:moduleId,mode:'learn',responseMode:chain.responseMode,modality:'text',queue:[{id:bank.id,options:bank.options.slice()}],cursor:0,phase:'question',draft:'',hinted:false,result:null,startedAt:chain.startedAt,updatedAt:Date.now(),results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]};
  saveSession(session);const answered=E.answer(data().module.session,response,interrupted||shownAt===null?null:performance.now()-shownAt);const ok=answered&&bridge().answer(answered);saveSession(null);if(!ok)return null;return id;
 }
 const type=chain.lane==='guided'?'guided_attempt':'chain_junction_attempt';
 const ok=recordTeaching({eventId:id,type,moduleId,familyId:view.morpheme,lemmaId:view.lemmaId,at:Date.now(),responseMode:chain.responseMode,answer:response,correct,hinted:chain.lane==='guided'});
 return ok||(data().module.teaching?.events||[]).some(e=>e.eventId===id)?id:null;
}
function questionReady(s){
 if(!s||!Array.isArray(s.queue)||!s.queue.length)return null;
 if(!Number.isInteger(s.cursor)||s.cursor<0||s.cursor>=s.queue.length)return null;
 const entry=s.queue[s.cursor];
 if(!entry||typeof entry.id!=='string'||!entry.id)return null;
 if(s.responseMode==='choice'&&!Array.isArray(entry.options))return null;
 return E.getItem(entry.id)||null;
}
function question(s){
 const item=questionReady(s);
 if(!item)return '<div class="morph-panel" data-morph-question-pending><p role="status">Вопрос ещё не готов. Прогресс, очередь и учебный шаг не изменены.</p><button type="button" class="secondary-button" data-morph-question-retry>Показать вопрос</button></div>';
 const tr=currentTeachingResume(),teachingIndependent=tr&&(P?.MODULES.includes(tr.currentModule)||P?.STAGE6_MODULES?.includes(tr.currentModule))&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(tr.currentTeachingStep)&&s.level===tr.currentModule&&s.mode==='learn';
 const entry=s.queue[s.cursor];
 if(!entry||!Array.isArray(entry.options))return '<div class="morph-panel" data-morph-question-pending><p role="status">Вопрос ещё не готов. Прогресс, очередь и учебный шаг не изменены.</p><button type="button" class="secondary-button" data-morph-question-retry>Показать вопрос</button></div>';
 const done=s.phase==='feedback',view=E.reveal(s),choices=entry.options;
 const controls=s.responseMode==='choice'?'<div class="morph-choices">'+choices.map(o=>'<button type="button" class="secondary-button" lang="kk" data-morph-answer="'+esc(o)+'"'+(done?' disabled':'')+'>'+esc(o)+'</button>').join('')+'</div>':'<form id="morph-answer-form"><label for="morph-answer">Полная форма'+(item.sequence.at(-1)==='Q'?' вместе с частицей':'')+'</label><input id="morph-answer" lang="kk" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" value="'+esc(s.draft)+'"'+(done?' disabled':'')+'><div class="morph-keys">'+[...'әғқңөұүі'].map(c=>'<button type="button" class="text-button" data-morph-key="'+c+'"'+(done?' disabled':'')+'>'+c+'</button>').join('')+'</div><button class="primary-button"'+(done?' disabled':'')+'>Проверить</button></form>';
 const feedback=done?(view.expected?'<div class="morph-feedback '+(view.correctnessClass?(s.result.correct?'correct':'wrong'):'')+'" role="status"><strong>'+(s.result.correct?'Верно':'Правильная форма: '+esc(item.expected))+'</strong><p>'+esc(shownReason(item,s.result.errorCodes))+'</p><p class="small" lang="kk">'+item.trace.map(t=>esc(t.stem)+' + '+esc(t.suffix)).join(' → ')+'</p>'+learnerOpenButton(item)+'</div>':'<p role="status">Ответ сохранён. Разбор будет в конце проверки.</p>')+'<button class="primary-button" data-morph-next>'+(s.cursor===s.queue.length-1?'Завершить':'Следующее')+'</button>':'';
 return '<div class="morph-panel"><button class="text-button" data-morph-hub>Выбрать другой режим</button><div class="morph-progress"><span>'+(teachingIndependent?(tr.currentTeachingStep==='FULL_INPUT'?'Самостоятельно · ввод':'Самостоятельно · выбор'):(s.mode==='transfer'?'Проверка новых основ':s.level==='mixed'?'Смешанная практика':'Практика'))+'</span><strong>'+(s.cursor+1)+' / '+s.queue.length+'</strong></div>'+(s.queue[s.cursor].reason?'<p class="small">'+esc(s.queue[s.cursor].reason)+'</p>':'')+(view.transferNote?'<p class="small">'+esc(view.transferNote)+'</p>':'')+(view.holdoutNote?'<p class="small">'+esc(view.holdoutNote)+'</p>':'')+(s.mode==='transfer'&&s.holdoutNote?'<p class="small">'+esc(P.STAGE10_SHORT_BANK)+'</p>':'')+'<h2 class="morph-stem" lang="kk">'+esc(item.stem)+'</h2><p>'+esc(item.gloss)+'</p><p class="morph-operation">'+esc(shownOperation(item))+'</p>'+controls+(!teachingIndependent&&view.hint?'<p class="small">Подсказка может напомнить, что искать, показать класс текущего края или открыть нужный кусок правила. Она не раскрывает точный ответ на проверке новых слов. Ответ после подсказки хранится как ответ с опорой и не считается ответом без подсказки.</p><button class="text-button" data-morph-hint>Подсказка</button>':'')+(view.reason?'<p class="morph-rule">'+esc(shownReason(item))+'</p>':'')+feedback+'</div>';
}
function trainLemmas(){return E.data.lemmas.filter(l=>l.split==='train').slice().sort((a,b)=>a.text.localeCompare(b.text,'kk'));}
function calculatorScreen(){
 const api=learner();
 const lemmas=trainLemmas();
 const list=lemmas.map(l=>'<option value="'+esc(l.text)+'"></option>').join('');
 const resolved=api?api.resolveLemma(calcQuery,E.data.lemmas):{kind:'empty'};
 const lemma=lemmas.find(l=>l.id===calcLemmaId)||null;
 let body='';
 if(resolved.kind==='unknown'&&calcQuery.trim())body+='<p role="status">'+esc(resolved.message)+'</p>';
 if(resolved.kind==='ambiguous')body+='<p role="status">Для этого написания есть несколько проверенных слов. Выбери одно. Это не ошибка.</p>'+resolved.options.map(o=>'<button type="button" class="secondary-button" data-calc-lemma="'+esc(o.id)+'">'+esc(o.text)+' — '+esc(o.gloss)+'</button>').join('');
 if(lemma&&api){
  const formOf=(id,seq)=>E.form(id,seq);
  const choices=api.nextMeanings(lemma,calcSequence,formOf);
  const explained=calcSequence.length?api.explain(lemma,calcSequence,formOf):null;
  const base=calcSequence.slice(0,-1);
  const replace=calcSequence.length?api.nextMeanings(lemma,base,formOf).filter(c=>c.id!==calcSequence.at(-1)):[];
  body+='<p lang="kk">'+esc(lemma.text)+'</p><p>'+esc(lemma.gloss)+'</p><p>Что сказать дальше</p><div class="morph-choices">'+choices.map(c=>'<button type="button" class="secondary-button" data-calc-add="'+esc(c.id)+'">'+esc(c.label)+'</button>').join('')+'</div>';
  if(replace.length)body+='<p>Заменить последний смысл</p><div class="morph-choices">'+replace.map(c=>'<button type="button" class="secondary-button" data-calc-replace="'+esc(c.id)+'">'+esc(c.label)+'</button>').join('')+'</div>';
  if(calcSequence.length)body+='<button type="button" class="text-button" data-calc-pop>Убрать последний шаг</button>';
  if(explained&&explained.ok){
   body+='<h3>Получилось</h3><p lang="kk">'+esc(explained.word)+'</p>'+explained.steps.map((s,i)=>'<p>Шаг '+(i+1)+'. «'+esc(s.meaning)+'». Было <span lang="kk">'+esc(s.before)+'</span>. Добавили '+esc(s.added)+'. Получилось <span lang="kk">'+esc(s.after)+'</span>. '+esc(s.why)+'</p>').join('');
   if(explained.lessonId)body+='<button type="button" class="text-button" data-learner-open="'+esc(explained.lessonId)+'">Открыть полный разбор</button>';
   body+='<p class="small">'+esc(explained.note)+'</p>';
  }else if(explained)body+='<p role="status">'+esc(explained.message)+'</p><p class="small">Это не считается твоей ошибкой. Расписание повторений не меняется.</p>';
 }
 return '<div class="morph-panel"><button class="text-button" data-calc-close>← К разделу</button><p class="eyebrow">РАЗБОР ФОРМЫ</p><h2>Разобрать форму</h2><p>Выбери проверенное слово и смысл. Здесь видно, как собралась форма. Это не задание и не оценка.</p><label for="calc-word">Слово</label><input id="calc-word" list="calc-words" value="'+esc(calcQuery)+'" autocomplete="off" enterkeyhint="search"><datalist id="calc-words">'+list+'</datalist><button type="button" class="secondary-button" data-calc-lookup>Найти слово</button>'+body+'</div>';
}
function bindCalculator(host){
 host.querySelector('[data-morph-calc]')?.addEventListener('click',()=>{calcOpen=true;teachingMode=false;showHub=false;topicOpen=false;message='';persistCalc();render();});
 host.querySelector('[data-calc-close]')?.addEventListener('click',()=>{calcOpen=false;showHub=true;persistCalc();render();});
 const lookup=()=>{const input=host.querySelector('#calc-word');calcQuery=input?input.value:'';const found=learner()&&learner().resolveLemma(calcQuery,E.data.lemmas);calcLemmaId=found&&found.kind==='train'?found.lemma.id:'';calcSequence=[];persistCalc();render();};
 host.querySelector('[data-calc-lookup]')?.addEventListener('click',lookup);
 host.querySelector('#calc-word')?.addEventListener('change',lookup);
 for(const b of host.querySelectorAll('[data-calc-lemma]'))b.onclick=()=>{const lemma=trainLemmas().find(l=>l.id===b.dataset.calcLemma);if(!lemma)return;calcLemmaId=lemma.id;calcQuery=lemma.text;calcSequence=[];persistCalc();render();};
 for(const b of host.querySelectorAll('[data-calc-add]'))b.onclick=()=>{if(calcSequence.length>=5)return;calcSequence=calcSequence.concat(b.dataset.calcAdd);persistCalc();render();};
 for(const b of host.querySelectorAll('[data-calc-replace]'))b.onclick=()=>{if(!calcSequence.length)return;calcSequence=calcSequence.slice(0,-1).concat(b.dataset.calcReplace);persistCalc();render();};
 host.querySelector('[data-calc-pop]')?.addEventListener('click',()=>{calcSequence=calcSequence.slice(0,-1);persistCalc();render();});
}
function render(){
 const host=root();if(!host||!bridge()||!T)return;
 const m=data().module,s=m.session,tr=m.teaching?.resume;
 const teachingNewer=tr&&(!s||(tr.updatedAt||0)>=(s.updatedAt||0));
 if(teachingNewer&&document.body.dataset.view==='morph'&&host.dataset.first!=='yes'){const rm=teachingModule(tr.currentModule,tr.familyId);teachingMode=true;showHub=false;topicOpen=false;level=rm?.id||'harmony';host.dataset.first='yes';}
 else if(s&&!s.complete&&document.body.dataset.view==='morph'&&host.dataset.first!=='yes'){teachingMode=false;showHub=false;topicOpen=false;host.dataset.first='yes';}
 if(calcOpen){teachingMode=false;showHub=false;topicOpen=false;}
 const body=calcOpen?calculatorScreen():teachingMode?teachingScreen():topicOpen?topicScreen():(!s||showHub?hub():s.complete?finish(s):question(s));
 host.innerHTML='<div class="morph-head"><button class="text-button" data-morph-exit>← Все тренажёры</button><span class="small">Версия '+esc(E.data.version)+' · обучение '+esc(T.version)+'</span></div>'+(message||m.recovery||m.teaching?.recovery?'<p role="status" class="morph-notice">'+esc(message||m.teaching?.recovery||m.recovery)+'</p>':'')+body;
 bind(host);clock();
}
function startMixed(){
 const built=P.stage9Queue(data().module,20260926);
 if(!built.items.length){saveSession(null);setTeachingResume('mixed','MIXED_PRACTICE',null,0,'');teachingMode=true;showHub=false;message='';render();return;}
 const now=Date.now();
 const session={id:'morph-stage9-'+built.seed+'-'+now,version:1,dataVersion:E.data.version,level:'mixed',mode:'learn',responseMode:'choice',modality:'text',queue:built.items.map(i=>({id:i.id,options:i.options,reason:i.reason})),cursor:0,phase:'question',draft:'',hinted:false,result:null,startedAt:now,updatedAt:now,results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]};
 saveSession(session);setTeachingResume('mixed','MIXED_PRACTICE',null,0,'');teachingMode=false;showHub=false;message='';render();
}
function stage9RepairScreen(){
 const r=currentTeachingResume();let payload=null;try{payload=JSON.parse(r.draft||'null');}catch{}
 if(!payload)return '<div class="morph-panel"><p role="status">Разбор не сохранился.</p></div>';
 const task=E.getItem(payload.repairItemId),choices=task.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-stage9-repair="'+esc(o)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">СМЕШИВАНИЕ · РАЗБОР</p><h2>Тот же контраст, другая основа</h2><p>'+esc(payload.reason)+'</p><p class="morph-stem" lang="kk">'+esc(task.stem)+'</p><p>'+esc(shownOperation(task))+'</p><div class="morph-choices">'+choices+'</div><p class="small">Это исправление. Оно не считается самостоятельным ответом и не меняет расписание повторений.</p><button class="text-button" data-stage9-full>Открыть полное объяснение</button></div>';
}
function stage9Screen(){
 const s=data().module.session,r=currentTeachingResume();
 if(r&&r.currentTeachingStep==='ERROR_REPAIR')return stage9RepairScreen();
 if(s&&!s.complete)return question(s);
 const built=P.stage9Queue(data().module,20260926);
 return '<div class="morph-panel morph-teach-panel stage5-panel"><p class="eyebrow">СМЕШАННАЯ ПРАКТИКА</p><h2>'+esc(shellPhrase(built.status))+'</h2><p>'+esc(built.reason)+'</p><p class="small">Этот порог только открывает смешанную практику. Он не означает, что тема освоена навсегда. Сложность поднимай постепенно: не меняй сразу смысл, край слова, исключение, длинную цепочку и способ ответа. Проверка на новых словах и повтор на следующий день считаются отдельно.</p><button class="secondary-button" data-stage9-full>Открыть полное объяснение</button><button class="text-button" data-morph-hub>К тренировкам</button></div>';
}
function start(mode){
 const d=data();teachingMode=false;topicOpen=false;
 if(level==='mixed'&&mode==='learn'){startMixed();return;}
 try{const s=E.createSession({level,mode,responseMode,events:d.module.events,records:d.records,knownLemmas:[...d.module.exposed,...d.knownLemmas,...(mode==='transfer'?P.stage10ContaminatedLemmas():[])]});saveSession(s);showHub=false;message=mode==='transfer'&&s.holdoutNote?P.STAGE10_SHORT_BANK:'';render();}catch(e){message=e.message&&String(e.message).includes('новых')?P.STAGE10_SHORT_BANK:e.message;render();}
}
function submit(response){
 const s=data().module.session;if(!s||!String(response).trim())return;
 const result=E.answer(s,response,interrupted||shownAt===null?null:performance.now()-shownAt);if(!result)return;
 const ok=bridge().answer(result);if(!ok)message='Ответ уже сохранён или сессия изменилась.';render();
}
function practiceNotReady(){message='Вопрос ещё не готов. Прогресс, очередь и учебный шаг не изменены.';render();}
function onPracticeNext(){
 const s=data().module.session;if(!s||s.phase!=='feedback')return;
 const r=currentTeachingResume(),teachingModuleActive=r&&(P?.MODULES.includes(r.currentModule)||P?.STAGE6_MODULES?.includes(r.currentModule));
 if(s.level==='mixed'&&s.mode==='learn'&&s.result&&!s.result.correct){
  const source=s.result.itemId?E.getItem(s.result.itemId):null;let repair=null;try{repair=source?P.stage9Repair(source,[source.lemmaId]):null;}catch(e){repair=null;}
  if(!source||!repair||!source.id||!repair.id||!Array.isArray(source.sequence)){practiceNotReady();return;}
  setTeachingResume('mixed','ERROR_REPAIR',source.sequence.at(-1),s.cursor,JSON.stringify({sourceItemId:source.id,repairItemId:repair.id,reason:'Повторяем эту функцию, потому что здесь была ошибка.'}));message='Тот же контраст на другой основе. Это не самостоятельный ответ.';teachingMode=true;render();return;
 }
 if(teachingModuleActive&&['INDEPENDENT_CHOICE','FULL_INPUT'].includes(r.currentTeachingStep)&&s.mode==='learn'&&s.level===r.currentModule&&s.result&&!s.result.correct){
  if(!s.result.itemId||!Array.isArray(s.result.sequence)){practiceNotReady();return;}
  setTeachingResume(r.currentModule,'ERROR_REPAIR',s.result.sequence.at(-1),s.cursor,JSON.stringify({sourceItemId:s.result.itemId,response:s.result.response,returnStep:r.currentTeachingStep,returnIndex:s.cursor}));message='Ответ разобран. Теперь тот же контраст на другой основе.';teachingMode=true;render();return;
 }
 let next=null;try{next=E.next(s);}catch(e){next=null;}
 if(!next){practiceNotReady();return;}
 try{saveSession(next);}catch(e){practiceNotReady();return;}
 render();root()?.querySelector('#morph-answer')?.focus();
}
function bind(host){
 bindCalculator(host);
 host.querySelector('[data-morph-exit]')?.addEventListener('click',()=>{window.QazaqShell.show('personal');window.PersonalTrainers.openCatalog();});
 host.querySelector('[data-morph-start]')?.addEventListener('click',()=>start('learn'));
 host.querySelector('[data-morph-transfer]')?.addEventListener('click',()=>start('transfer'));
 host.querySelector('[data-morph-learn-zero]')?.addEventListener('click',()=>learnFromZero());
 host.querySelector('[data-morph-continue]')?.addEventListener('click',()=>continueLearning());
 host.querySelector('[data-morph-weak]')?.addEventListener('click',()=>repeatWeak());
 host.querySelector('[data-morph-topic]')?.addEventListener('click',()=>{topicOpen=true;teachingMode=false;showHub=false;message='';render();});
 host.querySelector('[data-morph-restart]')?.addEventListener('click',()=>{message='Раздел начинается сначала. Уже сохранённые ответы и проверка не стираются.';startTeaching(level,null,'SEMANTIC_INTRO');});
 host.querySelector('[data-morph-pilot]')?.addEventListener('click',()=>{const doc=P.pilotExport(data().module),blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qazaqsha-morph-pilot.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 for(const b of host.querySelectorAll('[data-learner-open]'))b.onclick=()=>{const dest=learner()&&learner().lessonTarget(b.dataset.learnerOpen);if(!dest){message=learner()?learner().unavailable():'Этот разбор временно недоступен. Можно вернуться к разделу.';render();return;}showFullSemantic=true;startTeaching(dest.moduleId,dest.familyId,'FULL_EXPLANATION');};
 for(const b of host.querySelectorAll('[data-learner-try]'))b.onclick=()=>{const box=b.closest('.morph-learner-trybox'),note=box&&box.querySelector('[data-learner-note]');if(!note)return;note.textContent=b.dataset.learnerTry===b.dataset.learnerOk?b.dataset.learnerGood:b.dataset.learnerBad;};
 for(const b of host.querySelectorAll('[data-topic-step]'))b.onclick=()=>openTopicStep(b.dataset.topicStep);
 host.querySelector('[data-morph-full-rule]')?.addEventListener('click',()=>startTeaching(level,null,'FULL_EXPLANATION'));
 host.querySelector('[data-morph-teach-resume]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r){teachingMode=true;showHub=false;level=r.currentModule;render();}});
 host.querySelector('#morph-level')?.addEventListener('change',e=>{level=e.target.value;render();});
 host.querySelector('#morph-response')?.addEventListener('change',e=>{responseMode=e.target.value;});
 for(const b of host.querySelectorAll('[data-morph-hub]'))b.onclick=()=>{teachingMode=false;showHub=true;topicOpen=false;render();};
 host.querySelector('[data-morph-resume]')?.addEventListener('click',()=>{teachingMode=false;showHub=false;render();});
 host.querySelector('[data-morph-question-retry]')?.addEventListener('click',()=>{render();});
 for(const b of host.querySelectorAll('[data-morph-answer]'))b.onclick=()=>submit(b.dataset.morphAnswer);
 host.querySelector('#morph-answer-form')?.addEventListener('submit',e=>{e.preventDefault();submit(host.querySelector('#morph-answer').value);});
 const input=host.querySelector('#morph-answer');if(input){input.oninput=()=>{const s=data().module.session;if(s?.phase==='question')saveSession({...s,draft:input.value,updatedAt:Date.now()});};for(const b of host.querySelectorAll('[data-morph-key]'))b.onclick=()=>{const a=input.selectionStart,z=input.selectionEnd;input.value=input.value.slice(0,a)+b.dataset.morphKey+input.value.slice(z);input.focus();input.setSelectionRange(a+1,a+1);input.oninput();};}
 host.querySelector('[data-morph-hint]')?.addEventListener('click',()=>{const s=data().module.session;saveSession({...s,hinted:true});render();});
 host.querySelector('[data-morph-next]')?.addEventListener('click',onPracticeNext);

 for(const b of host.querySelectorAll('[data-teach-close]'))b.onclick=()=>{teachingMode=false;showHub=true;render();};
 host.querySelector('[data-teach-module]')?.addEventListener('change',e=>startTeaching(e.target.value));
 host.querySelector('[data-teach-family]')?.addEventListener('change',e=>{const r=currentTeachingResume();if(r)startTeaching(r.currentModule,e.target.value);});
 host.querySelector('[data-teach-semantic-full]')?.addEventListener('click',()=>{showFullSemantic=true;message='';render();});
 host.querySelector('[data-teach-semantic-short]')?.addEventListener('click',()=>{showFullSemantic=false;message='';render();});
 host.querySelector('[data-teach-semantic-done]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;showFullSemantic=false;recordOnce('semantic_intro_completed',r.currentModule,r.familyId);setTeachingResume(r.currentModule,'FULL_EXPLANATION',r.familyId,0,'');message='';render();});
 for(const b of host.querySelectorAll('[data-teach-next-step]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;setTeachingResume(r.currentModule,b.dataset.teachNextStep,r.familyId,0,'');message='';render();};
 for(const b of host.querySelectorAll('[data-teach-go-full]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const module=teachingModule(r.currentModule),family=r.familyId||module?.families?.[0]||null;setTeachingResume(r.currentModule,'FULL_EXPLANATION',family,0,'');message='';render();};
 host.querySelector('[data-teach-feature-submit]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;const all=[...host.querySelectorAll('[data-teach-feature]')],selected=all.filter(x=>x.checked);const correct=all.length>0&&selected.length===all.length;recordTeaching({eventId:attemptTeachingId('feature_notice_attempt',r.currentModule,r.familyId),type:'feature_notice_attempt',moduleId:r.currentModule,familyId:r.familyId,at:Date.now(),responseMode:'choice',answer:selected.map(x=>x.value).join(','),correct,hinted:false});if(!correct){message='Отметь все признаки, которые этот раздел просит проверить. Это опора, а не экзамен.';render();return;}setTeachingResume(r.currentModule,'FEATURE_NOTICE',r.familyId,1,'');message='';render();});
 for(const b of host.querySelectorAll('[data-teach-next-family]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;startTeaching(r.currentModule,b.dataset.teachNextFamily,'SEMANTIC_INTRO');};
 host.querySelector('[data-stage5-start-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Guided(r.currentModule);});
 host.querySelector('[data-stage5-restart-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Guided(r.currentModule);});
 host.querySelector('[data-stage5-start-choice]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Independent(r.currentModule,'INDEPENDENT_CHOICE','choice');});
 host.querySelector('[data-stage5-start-input]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage5Independent(r.currentModule,'FULL_INPUT','input');});
 for(const b of host.querySelectorAll('[data-stage5-next-module]'))b.onclick=()=>startTeaching(b.dataset.stage5NextModule);
 for(const b of host.querySelectorAll('[data-stage5-prereq]'))b.onclick=()=>startTeaching(b.dataset.stage5Prereq);
 host.querySelector('[data-stage6-start-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage6Guided(r.currentModule);});
 host.querySelector('[data-stage6-restart-guided]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage6Guided(r.currentModule);});
 host.querySelector('[data-stage6-start-choice]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage6Independent(r.currentModule,'INDEPENDENT_CHOICE','choice');});
 host.querySelector('[data-stage6-start-input]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(r)startStage6Independent(r.currentModule,'FULL_INPUT','input');});
 host.querySelector('[data-stage7-retry]')?.addEventListener('click',()=>{render();});
 host.querySelector('[data-stage8-start]')?.addEventListener('click',()=>startStage8());
 host.querySelector('[data-stage9-start]')?.addEventListener('click',()=>{level='mixed';responseMode='choice';startMixed();});
 host.querySelector('[data-stage9-full]')?.addEventListener('click',()=>{setTeachingResume('mixed','FULL_EXPLANATION','DAT',0,'');teachingMode=true;render();});
 for(const b of host.querySelectorAll('[data-stage9-repair]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;let payload=null;try{payload=JSON.parse(r.draft||'null');}catch{return;}const task=E.getItem(payload.repairItemId),correct=E.norm(b.dataset.stage9Repair)===E.norm(task.expected),id='stage9-repair:'+payload.sourceItemId+':'+task.lemmaId;if(!(data().module.teaching?.events||[]).some(e=>e.eventId===id))recordTeaching({eventId:id,type:'correction_after_feedback',moduleId:'mixed',familyId:task.sequence.at(-1),lemmaId:task.lemmaId,itemId:task.id,at:Date.now(),responseMode:'choice',answer:b.dataset.stage9Repair,correct,hinted:true});const s=data().module.session;if(s)saveSession(E.next(s));setTeachingResume('mixed','MIXED_PRACTICE',null,0,'');teachingMode=false;message=correct?'Исправление верное. Возвращаемся в смешивание.':'Правильная форма: '+task.expected+'. Возвращаемся в смешивание.';render();};
 host.querySelector('[data-stage8-start-choice]')?.addEventListener('click',()=>startStage8Forms('independent','INDEPENDENT_CHOICE','choice'));
 host.querySelector('[data-stage8-start-input]')?.addEventListener('click',()=>startStage8Forms('independent','FULL_INPUT','input'));
 for(const b of host.querySelectorAll('[data-stage8-prereq]'))b.onclick=()=>startTeaching(b.dataset.stage8Prereq);
 for(const b of host.querySelectorAll('[data-stage8-semantic]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const check=P.STAGE8_SEMANTIC[r.stepIndex];if(!check)return;const response=b.dataset.stage8Semantic,correct=response===check.expected;recordTeaching({eventId:'stage8-sem:'+check.id,type:'semantic_check_attempt',moduleId:'verbs',familyId:null,at:Date.now(),responseMode:'choice',answer:response,correct,hinted:false});setTeachingResume('verbs','GUIDED_CHOICE',null,r.stepIndex,JSON.stringify({id:check.id,response,correct}));message=correct?'':'Сначала различаем функцию.';render();};
 host.querySelector('[data-stage8-semantic-next]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;if((r.stepIndex||0)+1>=P.STAGE8_SEMANTIC.length){startStage8Forms('guided','GUIDED_CHOICE','choice');return;}setTeachingResume('verbs','GUIDED_CHOICE',null,r.stepIndex+1,'');message='';render();});
 host.querySelector('[data-stage7-start-guided]')?.addEventListener('click',()=>startStage7('guided','GUIDED_CHOICE','choice'));
 host.querySelector('[data-stage7-start-choice]')?.addEventListener('click',()=>startStage7('independent','INDEPENDENT_CHOICE','choice'));
 host.querySelector('[data-stage7-start-input]')?.addEventListener('click',()=>startStage7('independent','FULL_INPUT','input'));
 for(const b of host.querySelectorAll('[data-stage7-prereq]'))b.onclick=()=>startTeaching(b.dataset.stage7Prereq);
 for(const b of host.querySelectorAll('[data-stage7-meaning]'))b.onclick=()=>startTeaching(b.dataset.stage7Meaning,b.dataset.stage7Family);
 for(const b of host.querySelectorAll('[data-stage7-answer]'))b.onclick=()=>answerStage7(b.dataset.stage7Answer);
 host.querySelector('#stage7-answer-form')?.addEventListener('submit',e=>{e.preventDefault();answerStage7(host.querySelector('#stage7-answer').value);});
 const stage7Input=host.querySelector('#stage7-answer');if(stage7Input){for(const b of host.querySelectorAll('[data-stage7-key]'))b.onclick=()=>{const a=stage7Input.selectionStart,z=stage7Input.selectionEnd;stage7Input.value=stage7Input.value.slice(0,a)+b.dataset.stage7Key+stage7Input.value.slice(z);stage7Input.focus();stage7Input.setSelectionRange(a+1,a+1);};}
 host.querySelector('[data-stage7-next]')?.addEventListener('click',()=>{const chain=data().module.chain;if(!chain||chain.phase!=='feedback')return;const next=stage7Advance(chain);saveChain({...next,acceptedEventIds:chain.acceptedEventIds,exposedRepairLemmas:chain.exposedRepairLemmas});const step=chain.lane==='guided'?'GUIDED_CHOICE':chain.responseMode==='input'?'FULL_INPUT':'INDEPENDENT_CHOICE';setTeachingResume(chain.moduleId==='verbs'?'verbs':'chains',step,null,next.junction,'');teachingMode=true;message='';render();});
 for(const b of host.querySelectorAll('[data-stage6-next-module]'))b.onclick=()=>startTeaching(b.dataset.stage6NextModule);
 for(const b of host.querySelectorAll('[data-stage6-prereq]'))b.onclick=()=>startTeaching(b.dataset.stage6Prereq);
 for(const b of host.querySelectorAll('[data-stage6-semantic-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const checks=P.stage6SemanticChecks(r.currentModule),check=checks[r.stepIndex];if(!check)return;const response=b.dataset.stage6SemanticAnswer,correct=response===check.expected;recordTeaching({eventId:attemptTeachingId('semantic_check_attempt',r.currentModule,null),type:'semantic_check_attempt',moduleId:r.currentModule,familyId:null,at:Date.now(),responseMode:'choice',answer:response,correct,hinted:false});setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,r.stepIndex,JSON.stringify({semanticId:check.id,response,correct}));message='';render();};
 host.querySelector('[data-stage6-semantic-next]')?.addEventListener('click',()=>{const r=currentTeachingResume();if(!r)return;setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,r.stepIndex+1,'');message='';render();});
 for(const b of host.querySelectorAll('[data-stage6-guided-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const checks=P.stage6SemanticChecks(r.currentModule),plan=P.stage6GuidedPlan(r.currentModule),formIndex=r.stepIndex-checks.length,task=plan[formIndex];if(!task)return;const correct=P.evaluate(task,b.dataset.stage6GuidedAnswer);recordTeaching({eventId:attemptTeachingId('guided_attempt',r.currentModule,task.familyId),type:'guided_attempt',moduleId:r.currentModule,familyId:task.familyId,itemId:task.itemId,lemmaId:task.lemmaId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage6GuidedAnswer,correct,hinted:true});if(correct){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,r.stepIndex+1,'');message='Верно. Дальше тот же приём на другом примере.';render();return;}setTeachingResume(r.currentModule,'ERROR_REPAIR',task.familyId,r.stepIndex,JSON.stringify({sourceItemId:task.itemId,response:b.dataset.stage6GuidedAnswer,returnStep:'GUIDED_CHOICE',returnIndex:r.stepIndex}));message='Сначала разберём ошибку на другой учебной основе.';teachingMode=true;render();};
 for(const b of host.querySelectorAll('[data-stage6-repair-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const payload=parseRepair(r),source=P.stage6TaskForItem(r.currentModule,payload.sourceItemId,'source'),session=data().module.session,exclude=[...P.stage6GuidedPlan(r.currentModule).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)],task=P.stage6RepairFor(r.currentModule,source,exclude),correct=P.evaluate(task,b.dataset.stage6RepairAnswer);recordTeaching({eventId:attemptTeachingId('correction_after_feedback',r.currentModule,task.familyId),type:'correction_after_feedback',moduleId:r.currentModule,familyId:task.familyId,itemId:task.itemId,lemmaId:task.lemmaId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage6RepairAnswer,correct,hinted:true});if(payload.returnStep==='GUIDED_CHOICE'){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,(payload.returnIndex||0)+1,'');message=correct?'Исправление верное.':'Правильная форма: '+task.expected+'. Продолжаем; repair не считается independent.';teachingMode=true;render();return;}const active=data().module.session;if(active?.phase==='feedback'){setTeachingResume(r.currentModule,payload.returnStep||'INDEPENDENT_CHOICE',null,active.cursor,'');saveSession({...E.next(active),updatedAt:Date.now()+2});message=correct?'Исправление верное. Возвращаемся к самостоятельной практике.':'Правильная форма: '+task.expected+'. Возвращаемся к самостоятельной практике.';teachingMode=false;showHub=false;render();}};

 for(const b of host.querySelectorAll('[data-stage5-guided-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const plan=P.guidedPlan(r.currentModule),task=plan[r.stepIndex],correct=P.evaluate(task,b.dataset.stage5GuidedAnswer);recordTeaching({eventId:attemptTeachingId('guided_attempt',r.currentModule,task.familyId),type:'guided_attempt',moduleId:r.currentModule,familyId:task.familyId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage5GuidedAnswer,correct,hinted:true});if(correct){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,r.stepIndex+1,'');message='Верно. Теперь тот же принцип на следующем контрасте.';render();return;}setTeachingResume(r.currentModule,'ERROR_REPAIR',task.familyId,r.stepIndex,JSON.stringify({sourceItemId:task.itemId,response:b.dataset.stage5GuidedAnswer,returnStep:'GUIDED_CHOICE',returnIndex:r.stepIndex}));message='Сначала разберём ошибку на другой основе.';teachingMode=true;render();};
 for(const b of host.querySelectorAll('[data-stage5-repair-answer]'))b.onclick=()=>{const r=currentTeachingResume();if(!r)return;const payload=parseRepair(r),source=P.taskForItem(r.currentModule,payload.sourceItemId,'source'),session=data().module.session,exclude=[...P.guidedPlan(r.currentModule).map(x=>x.lemmaId),...(session?.queue||[]).map(q=>E.getItem(q.id)?.lemmaId).filter(Boolean)],task=P.repairFor(r.currentModule,source,exclude),correct=P.evaluate(task,b.dataset.stage5RepairAnswer);recordTeaching({eventId:attemptTeachingId('correction_after_feedback',r.currentModule,task.familyId),type:'correction_after_feedback',moduleId:r.currentModule,familyId:task.familyId,itemId:task.itemId,lemmaId:task.lemmaId,at:Date.now(),responseMode:'choice',answer:b.dataset.stage5RepairAnswer,correct,hinted:true});if(payload.returnStep==='GUIDED_CHOICE'){setTeachingResume(r.currentModule,'GUIDED_CHOICE',null,(payload.returnIndex||0)+1,'');message=correct?'Исправление верное.':'Правильная форма: '+task.expected+'. Продолжаем; это исправление не считается independent.';teachingMode=true;render();return;}const s=data().module.session;if(s?.phase==='feedback'){setTeachingResume(r.currentModule,payload.returnStep||'INDEPENDENT_CHOICE',null,s.cursor,'');saveSession({...E.next(s),updatedAt:Date.now()+2});message=correct?'Исправление верное. Возвращаемся к самостоятельной практике.':'Правильная форма: '+task.expected+'. Возвращаемся к самостоятельной практике.';teachingMode=false;showHub=false;render();}};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupted=true;});
window.addEventListener('blur',()=>{interrupted=true;});
window.MorphTrainer={open,render,status};
})();