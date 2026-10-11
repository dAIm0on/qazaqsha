'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const cfg=require('./config.js');
const core=require('./core.js');
const progress=require('./progress.js');
const VM=require('./vocab-must.js');
const F=require('./fsrs-vendor.js');

assert.equal(cfg.version,'tz2-bir-myn-2026-09-10');
assert.equal(cfg.fsrs.desired_retention,0.90);
assert.deepEqual(cfg.vocab,{answerBudget:10,sessionNewCap:2});
assert.equal(VM.learnerTextOk(VM.TEXT.idkReturn)&&VM.learnerTextOk(VM.TEXT.saved)&&VM.learnerTextOk(VM.TEXT.queued),true);
assert.equal(/из/.test(VM.mustCounterText(4)),false);
assert.equal(VM.mustCounterText(4),'Ответов: 4');

function card(id,lemma){
  return {id,topic:'vocab',wordRole:'must',kind:'fields',title:'Переведи на казахский',stimulus:id,fields:[{answers:[id+'к'],kind:'text'}],vocabIds:[lemma],skillBindings:[{item_id:lemma,skill_type:'production',field:0}]};
}
function state(){return {records:Object.create(null),skills:Object.create(null),events:[],errors:[]};}
function loadKnowledge(){
  const sandbox={console,window:{},globalThis:null};
  sandbox.globalThis=sandbox.window;
  sandbox.window.TRAINER_CONFIG=cfg;
  sandbox.window.FSRS=F;
  sandbox.window.TrainerCore=core;
  sandbox.window.CURRICULUM={words:[],rules:[],lessons:[]};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'scheduler.js'),'utf8'),sandbox,{filename:'scheduler.js'});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'knowledge.js'),'utf8'),sandbox,{filename:'knowledge.js'});
  return sandbox.window;
}
const root=loadKnowledge();
const Knowledge=root.Knowledge;
const Scheduler=root.ReviewScheduler;

const pool=[card('A','word:a'),card('B','word:b'),card('C','word:c')];
const clean=VM.planPortion(pool,state(),cfg,core,1000);
assert.deepEqual(clean.ids,['A','B','C']);
assert.equal(clean.plan.nNew,3);
assert.equal(clean.plan.baseLen,3);
assert.equal(clean.plan.budget,9);
assert.deepEqual(clean.plan.newLemmas,['word:a','word:b','word:c']);

const hist=state();
hist.records.A={review_count:1,seen:1,needsReview:true,streak:0,next_review:1,dueAt:1};
const mixed=VM.planPortion(pool,hist,cfg,core,5000);
assert.equal(mixed.plan.nNew,2);
assert.equal(mixed.ids[0],'A');
assert.ok(mixed.ids.includes('B')&&mixed.ids.includes('C')===false||mixed.plan.nNew===2);
assert.equal(mixed.ids.filter(id=>id==='B'||id==='C').length,2-0||mixed.plan.newLemmas.length,2);

const st=state();
const sitting=VM.emptySitting(1000);
sitting.sessions=['s1'];
const plan=clean.plan;
const q=pool[0];
let calls=0;
const observe=(s,card,result,event,errors,trainer)=>{
  calls++;
  assert.equal(trainer&&trainer.must,true);
  assert.equal(event.rating,F.Rating.Again);
  return Knowledge.observe(s,card,result,event,errors,trainer);
};
const first=VM.commitFirst({state:st,records:st.records,q,now:5000,sessionId:'s1',presentation:0,kind:'idk',answers:[''],elapsed:10,core,observe,queue:['A','B','C'],position:0,pool,plan,sitting,rating:F.Rating.Again,errors:[],result:{correct:false,parts:[false]},budget:plan.budget,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(first.duplicate,false);
assert.equal(first.scheduled,true);
assert.deepEqual(first.queue,['A','B','C','A']);
assert.equal(st.records.A.review_count,1);
assert.ok(st.records.A.next_review!=null&&st.records.A.next_review<=5000+10*60*1000);
assert.equal(st.events.filter(e=>e.type==='answer'&&e.idk===1).length,1);
assert.equal(calls,1);
assert.ok(sitting.newLemmas.includes('word:a'));
assert.equal(plan.budget,9);
const skill=st.skills['word:a::production'];
assert.ok(skill&&skill.review_count===1);
assert.equal(skill.fsrs_log.rating,F.Rating.Again);
const again=VM.commitFirst({state:st,records:st.records,q,now:9000,sessionId:'s1',presentation:0,kind:'idk',answers:[''],elapsed:10,core,observe,queue:first.queue,position:0,pool,plan,sitting,rating:F.Rating.Again,errors:[],result:{correct:false,parts:[false]},budget:9,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(again.duplicate,true);
assert.equal(st.records.A.review_count,1);
assert.equal(st.events.filter(e=>e.type==='answer').length,1);
assert.equal(again.event.id,first.event.id);
assert.equal(again.event.at,first.event.at);
assert.equal(calls,1);

const lone=state();
const loneSit=VM.emptySitting(1);
loneSit.sessions=['s'];
const noRet=VM.commitFirst({state:lone,records:lone.records,q:card('Z','word:z'),now:50,sessionId:'s',presentation:0,kind:'idk',answers:[],elapsed:1,core,observe:()=>{},queue:['Z'],position:0,pool:[card('Z','word:z')],plan:{budget:3,nNew:1,baseLen:1,newLemmas:['word:z']},sitting:loneSit,rating:F.Rating.Again,errors:[],result:{correct:false,parts:[false]},budget:3,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(noRet.scheduled,false);
assert.deepEqual(noRet.queue,['Z']);
assert.equal(lone.records.Z.review_count,1);

const before=st.records.A.review_count;
const closed=VM.commitRetype({state:st,sitting,retry:first.retry,sessionId:'s1',presentation:0,cardId:'A',answers:['Aк'],result:{correct:true,parts:[true]},now:6000});
assert.equal(closed.closed,true);
assert.equal(closed.assisted,true);
assert.equal(closed.unaided,false);
assert.equal(st.records.A.review_count,before);
assert.equal(st.events.filter(e=>e.type==='retry_close').length,1);
const rc=st.events.find(e=>e.type==='retry_close');
assert.equal(rc.answer_event_id,first.event.id);
assert.equal(rc.correct,true);
assert.ok(Number.isFinite(rc.at));
const closed2=VM.commitRetype({state:st,sitting,retry:first.retry,sessionId:'s1',presentation:0,cardId:'A',answers:['Aк'],result:{correct:true},now:7000});
assert.equal(closed2.duplicate,true);
assert.equal(st.events.filter(e=>e.type==='retry_close').length,1);
assert.equal(st.records.A.review_count,before);
const tally=VM.recount(st,sitting);
assert.equal(tally.assisted,1);
assert.equal(tally.unaided,0);

const goodState=state();
const goodSit=VM.emptySitting(1);
goodSit.sessions=['g'];
const good=VM.commitFirst({state:goodState,records:goodState.records,q:card('G','word:g'),now:80,sessionId:'g',presentation:1,kind:'good',answers:['Gк'],elapsed:5,core,observe:()=>[],queue:['G'],position:0,pool:[card('G','word:g')],plan:{budget:9,nNew:1,baseLen:1,newLemmas:['word:g']},sitting:goodSit,rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:9,minGap:2,appearCap:3,hinted:false,recall:true});
assert.equal(good.scheduled,false);
assert.equal(good.retry,null);
assert.equal(VM.recount(goodState,goodSit).unaided,1);
assert.equal(VM.recount(goodState,goodSit).assisted,0);
assert.equal(goodSit.answers,1);

const wrong=VM.commitRetype({state:goodState,sitting:goodSit,retry:{cardId:'G',sessionId:'g',presentation:1,kind:'wrong',answerEventId:'x'},answers:['нет'],result:{correct:false},now:90});
assert.equal(wrong.closed,false);
assert.equal(VM.recount(goodState,goodSit).assisted,0);
assert.equal(goodSit.answers,1);

const recent=VM.emptySitting(1);
recent.recent=[{cardId:'L',lemma:'word:l',sessionId:'1',presentation:2}];
const ordered=VM.enforceGap(['L','X','Y'],recent,[card('L','word:l'),card('X','word:x'),card('Y','word:y')],core,2);
assert.deepEqual(ordered,['X','Y','L']);

const legacySit=VM.emptySitting(1000);
legacySit.sessions=['old'];
legacySit.legacy={sessionCorrect:0,sessionAssisted:0,boundaryAt:1000,openIdk:{cardId:'H',sessionId:'old',presentation:1,lemma:'word:h'}};
legacySit.shown=['word:only'];
const legacyState=state();
assert.equal(VM.wordLine(legacyState,legacySit,{cardId:'H',lemma:'word:h'}),'с подсказкой');
assert.equal(VM.recount(legacyState,legacySit).assisted,0);
assert.equal(VM.wordLine(legacyState,legacySit,{cardId:'only',lemma:'word:only'}),'Без ответа');
const legClose=VM.commitRetype({state:legacyState,sitting:legacySit,retry:{cardId:'H',sessionId:'old',presentation:1,kind:'idk',answerEventId:null,legacy:1},sessionId:'old',presentation:1,cardId:'H',answers:['ok'],result:{correct:true},now:2000,legacy:true});
assert.equal(legClose.event.answer_event_id,null);
assert.equal(legClose.event.legacy,1);
assert.equal(legacyState.events.filter(e=>e.type==='answer').length,0);
assert.equal(VM.wordLine(legacyState,legacySit,{cardId:'H',lemma:'word:h'}),'с подсказкой');
assert.equal(VM.recount(legacyState,legacySit).assisted,1);
assert.equal(VM.recount(legacyState,legacySit).assisted,1);

const saved={mode:'words',trainerReturn:'vocab:must',topic:'vocab',queue:['A','B'],position:0,queueEpoch:42,sessionCorrect:2,sessionAssisted:1,hinted:true};
const restored=VM.restoreSaved(saved,{events:[]},cfg,3000);
assert.equal(restored.graded,false);
assert.equal(restored.vocab.plan.budget,cfg.vocab.answerBudget);
assert.deepEqual(saved.queue,['A','B']);
assert.equal(restored.vocab.retry.kind,'idk');
assert.equal(restored.vocab.retry.answerEventId,null);
assert.equal(restored.vocab.sitting.legacy.sessionCorrect,2);
assert.equal(restored.vocab.sitting.answers,3);

const round=state();
round.events.push(first.event,rc);
round.records.A=st.records.A;
const raw=JSON.parse(progress.serialize(progress.migrate(round)));
const migrated=progress.migrate(raw);
const merged=progress.merge(progress.migrate(round),migrated);
const merged2=progress.merge(merged,progress.migrate(raw));
const answers=merged2.events.filter(e=>e.type==='answer'&&e.card_id==='A');
const closes=merged2.events.filter(e=>e.type==='retry_close'&&e.card_id==='A');
assert.equal(answers.length,1);
assert.equal(closes.length,1);
assert.equal(closes[0].answer_event_id,answers[0].id);
assert.equal(answers[0].at,first.event.at);
assert.equal(answers[0].presentation,0);
assert.equal(String(answers[0].session_id),'s1');

const local={mustUnfinished:true,position:4,queueEpoch:9,retry:{cardId:'A',presentation:4}};
const older={session:{mode:'words',trainerReturn:'vocab:must',queue:['A'],position:1,queueEpoch:1,retry:{cardId:'A',presentation:1}}};
assert.equal(VM.importPlan(local,older,'merge').action,'keep-local');
const replaced=VM.importPlan({mustUnfinished:true,position:4},{session:{mode:'words',trainerReturn:'vocab:must',queue:['B','C'],position:1,queueEpoch:7,retry:{cardId:'C',presentation:1}}},'replace');
assert.equal(replaced.action,'restore');
assert.equal(replaced.session.position,1);
assert.equal(replaced.session.queue[1],'C');
assert.equal(VM.importPlan({mustUnfinished:false},older,'merge').action,'reset');
assert.equal(VM.portionDone(9,9,0,12),true);
assert.equal(VM.portionDone(8,9,3,12),false);
assert.equal(VM.portionDone(1,9,12,12),true);

const hard=Scheduler.answer({},{at:1000,correct:true,hinted:false,rating:F.Rating.Hard,recall:true});
const ignored=Scheduler.answer({},{at:1000,correct:true,hinted:false,recall:true});
assert.equal(hard.fsrs_log.rating,F.Rating.Hard);
assert.equal(ignored.fsrs_log.rating,F.Rating.Good);
const kHard=state();
Knowledge.observe(kHard,card('K','word:k'),{correct:true,parts:[true]},{at:1000,correct:true,hinted:false,rating:F.Rating.Hard,answers:['Kк'],recall:true},[],{must:true});
const kGood=state();
Knowledge.observe(kGood,card('K2','word:k2'),{correct:true,parts:[true]},{at:1000,correct:true,hinted:false,rating:F.Rating.Hard,answers:['K2к'],recall:true},[]);
assert.equal(kHard.skills['word:k::production'].fsrs_log.rating,F.Rating.Hard);
assert.equal(kGood.skills['word:k2::production'].fsrs_log.rating,F.Rating.Good);

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const peek=app.split('function peekAnswer')[1].split('function showHint')[0];
assert.ok(peek.includes('Подсказка = провал для интервала'));
assert.ok(/isVocabWordsMode\(\)[\s\S]{0,200}paintVocabLemmaFeedback/.test(peek));
const check=app.split('function checkAnswer')[1].split('function nextQuestion')[0];
assert.ok(check.includes('if(hinted)sessionAssisted++;else sessionCorrect++'));
assert.ok(app.includes('function isVocabMustTrainer()'));
assert.ok(fs.readFileSync(path.join(__dirname,'vocab-must.js'),'utf8').includes('Ответов: '));
assert.ok(app.includes('mustCounterText'));
assert.ok(/Верно \$\{sessionCorrect\} из/.test(app));
assert.ok(app.includes('vocabPlan.budget')||app.includes('plan.budget'));
assert.ok(app.includes('VocabMust.importPlan'));
assert.ok(app.includes("next.session=null"));
assert.ok(!/dayNewCap|vocabDay|vocabMode/.test(app+fs.readFileSync(path.join(__dirname,'config.js'),'utf8')));
const remote=app.split('function applyRemote')[1].split('function paintAccount')[0];
assert.ok(!/queue=\[\]/.test(remote));
assert.ok(app.includes('state.session.vocab'));
assert.ok(peek.includes('analytics:answerAnalytics'));
assert.ok(check.includes('analytics:answerAnalytics'));
assert.ok(app.includes("function isVocabMustTrainer(){return mode==='words'&&vocabRole==='must'&&trainerReturn==='vocab:must'&&queueEpoch===trainerEpoch;}"));
assert.ok(app.includes('function importProgress(incoming,importMode)'));
assert.ok(!app.includes('function importProgress(incoming,mode)'));
assert.ok(app.includes("vocab:'Не открывай готовое слово — иначе это не вспоминание.'"));
assert.ok(!app.includes("vocab:'Сначала слепая попытка"));
assert.ok(!app.includes('Пока всё'));
assert.ok(app.includes('<h2>Все слова пройдены</h2>'));
assert.ok(!app.includes('<h2>Можно продолжить</h2>'));
assert.ok(app.includes('Можно продолжить урок'));
assert.ok(!app.includes('Ещё слова'));
assert.ok(!app.includes('На сегодня новые слова закончились'));
const beginSrc=app.slice(app.indexOf('function beginMustPortion'),app.indexOf('function paintMustRetry'));
assert.ok(beginSrc.includes('prepareVocabPool()'));
assert.ok(beginSrc.indexOf('prepareVocabPool()')<beginSrc.indexOf('mustPool()'));
assert.ok(!beginSrc.includes('loaded.length<3'));
assert.ok(!beginSrc.includes('planned.ids.slice()'),'P0-GAP');
const ensureSrc=app.slice(app.indexOf('function ensureV2'),app.indexOf('function openPathLesson'));
assert.ok(ensureSrc.includes('slice(0,idx+1)'));
const poolSrc=app.slice(app.indexOf('function prepareVocabPool'),app.indexOf('function mustCourseRank'));
assert.ok(poolSrc.includes('ensureV2(id)'));
assert.ok(!/for\s*\(const raw of window\.LESSON_V2_COMPILED/.test(poolSrc));
assert.ok(check.includes('!isVocabMustTrainer()&&mate&&!result.correct&&!hinted'));
const indexHtml=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const dashboard=fs.readFileSync(path.join(__dirname,'dashboard.js'),'utf8');
const personal=fs.readFileSync(path.join(__dirname,'personal-trainers.js'),'utf8');
assert.ok(!indexHtml.includes('Сначала слепая попытка'));
assert.ok(indexHtml.includes('Короткий набор'));
assert.ok(!indexHtml.includes('Короткий подход'));
assert.ok(dashboard.includes('Рекомендовано сейчас'));
assert.ok(!dashboard.includes('Рекомендовано на один подход'));
assert.ok(personal.includes('Узнать и написать вперемешку'));
assert.ok(!personal.includes('в одном подходе'));

const hintState=state();
const hintSit=VM.emptySitting(1);
hintSit.sessions=['m'];
VM.commitFirst({state:hintState,records:hintState.records,q:card('G2','word:g2'),now:100,sessionId:'m',presentation:0,kind:'good',answers:['G2к'],elapsed:4,core,observe:()=>[],queue:['G2','H'],position:0,pool:[card('G2','word:g2'),card('H','word:h')],plan:{budget:9,nNew:2,baseLen:2,newLemmas:['word:g2','word:h']},sitting:hintSit,rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:9,minGap:2,appearCap:3,hinted:false,recall:true});
VM.commitFirst({state:hintState,records:hintState.records,q:card('H','word:h'),now:110,sessionId:'m',presentation:1,kind:'assisted',answers:['Hк'],elapsed:6,core,observe:()=>[],queue:['G2','H'],position:1,pool:[card('G2','word:g2'),card('H','word:h')],plan:{budget:9,nNew:2,baseLen:2,newLemmas:['word:g2','word:h']},sitting:hintSit,rating:F.Rating.Again,errors:[],result:{correct:true,parts:[true]},budget:9,minGap:2,appearCap:3,hinted:true,recall:true});
const hintTally=VM.recount(hintState,hintSit);
assert.equal(hintTally.unaided,1);
assert.equal(hintTally.assisted,1);
assert.equal(hintTally.closed,hintSit.answers);
assert.equal(hintSit.answers,2);
assert.equal(VM.wordLine(hintState,hintSit,{cardId:'H',lemma:'word:h'}),'с подсказкой');
assert.equal(VM.wordLine(hintState,hintSit,{cardId:'G2',lemma:'word:g2'}),'самостоятельно');

const tagged=VM.commitFirst({state:hintState,records:hintState.records,q:card('T','word:t'),now:120,sessionId:'m',presentation:2,kind:'good',answers:['Tк'],elapsed:3,core,observe:()=>[],queue:['T'],position:0,pool:[card('T','word:t')],plan:{budget:9,nNew:1,baseLen:1,newLemmas:['word:t']},sitting:hintSit,rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:9,minGap:2,appearCap:3,hinted:false,recall:true,analytics:{item_type:'vocab',direction:'kk-ru',predicted_R:0.42,hours_since_last:3,id:'nope',correct:false}});
assert.equal(tagged.event.item_type,'vocab');
assert.equal(tagged.event.direction,'kk-ru');
assert.equal(tagged.event.predicted_R,0.42);
assert.equal(tagged.event.hours_since_last,3);
assert.notEqual(tagged.event.id,'nope');
assert.equal(tagged.event.correct,true);

const rel=state();
const relSit=VM.emptySitting(1);
relSit.sessions=['s1'];
const opened=VM.commitFirst({state:rel,records:rel.records,q,now:5000,sessionId:'s1',presentation:0,kind:'idk',answers:[''],elapsed:10,core,observe:()=>{},queue:['A','B','C'],position:0,pool,plan,sitting:relSit,rating:F.Rating.Again,errors:[],result:{correct:false,parts:[false]},budget:9,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(rel.records.A.review_count,1);
const snap=VM.snapshot({plan,sitting:relSit,retry:opened.retry,closed:[],unaided:{},blindFails:{}});
const savedSession={mode:'words',trainerReturn:'vocab:must',topic:'vocab',queue:opened.queue.slice(),position:0,queueEpoch:'s1',trainerEpoch:'s1',vocab:snap};
const back=VM.restoreSaved(savedSession,rel,cfg,9000);
assert.equal(back.legacy,false);
assert.equal(back.vocab.retry.kind,'idk');
assert.equal(back.vocab.retry.cardId,'A');
const dup=VM.commitFirst({state:rel,records:rel.records,q,now:9100,sessionId:'s1',presentation:0,kind:'idk',answers:[''],elapsed:10,core,observe:()=>{},queue:opened.queue,position:0,pool,plan,sitting:relSit,rating:F.Rating.Again,errors:[],result:{correct:false,parts:[false]},budget:9,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(dup.duplicate,true);
assert.equal(rel.records.A.review_count,1);
assert.equal(rel.events.filter(e=>e.type==='answer'&&e.card_id==='A').length,1);
const fromEvent=VM.restoreSaved({mode:'words',trainerReturn:'vocab:must',queue:['A','B','C','A'],position:0,queueEpoch:'s1',vocab:{plan,sitting:relSit,retry:null,closed:[],nearMiss:null}},rel,cfg,9200);
assert.equal(fromEvent.vocab.retry.kind,'idk');
assert.equal(fromEvent.vocab.retry.cardId,'A');

function sliceFn(src,from,to){
  const a=src.indexOf(from),b=src.indexOf(to);
  assert.ok(a>0&&b>a,from);
  return src.slice(a,b);
}
function runImport(appSrc,start,incoming,importMode){
  const pred=sliceFn(appSrc,'function isVocabMustTrainer','function mustPool');
  const imp=sliceFn(appSrc,'function importProgress','function vocabTable');
  const body=[
    'const window={};',
    'window.LessonPackages={prepare(){},install(){}};',
    'window.LessonPackageSchema={merge(a){return Array.isArray(a)?a:[];}};',
    'window.Knowledge={hydrate(){}};',
    'window.VocabMust=VM;',
    'const catalog={activatePromotions(){}};',
    'const KEY="progress", BACKUP="backup";',
    'const store={};',
    'const localStorage={setItem(k,v){store[k]=String(v);},getItem(k){return store[k]||null;}};',
    'const P={serialize(s){return JSON.stringify(s);},migrate(raw){return {records:Object.create(null),events:[],learning:{},session:raw&&raw.session||null,lesson_packages:[]};},merge(current){return {records:current.records||{},events:current.events||[],learning:current.learning||{},session:null,lesson_packages:[]};},answerIndex(){return new Map();}};',
    'let mode=start.mode, vocabRole=start.vocabRole, trainerReturn=start.trainerReturn, queueEpoch=start.queueEpoch, trainerEpoch=start.trainerEpoch, position=start.position;',
    'let queue=(start.queue||[]).slice(), topic=start.topic||"all", sourceFilter=null, courseBlock=null, practiceIds=(start.practiceIds||[]).slice();',
    'let checked=false, presented=null, sessionAttempts=0, sessionCorrect=0, sessionAssisted=0;',
    'let vocabRetry=start.vocabRetry||null, vocabPlan=start.vocabPlan||null, vocabSitting=start.vocabSitting||null, vocabClosed=[];',
    'let view=start.view||"today", state=start.state, records=state.records, learningState=state.learning||{}, questions=start.questions||[];',
    'const byId=start.byId; let confusionIndex=null, elapsedMs=0, storageReadError=null, storageAvailable=true;',
    'const views=[], saves=[]; let poolCalls=0, vocabPoolReady=false;',
    'function prepareVocabPool(){if(vocabPoolReady)return; vocabPoolReady=true; poolCalls++; for(const q of start.pool||[])byId.set(q.id,q);}',
    'function applySavedMust(saved){const built=VM.restoreSaved(saved,state,cfg,3000); const v=built.vocab; vocabPlan=v.plan; vocabSitting=v.sitting; vocabRetry=v.retry; vocabClosed=v.closed||[];}',
    'function captureMustLive(){return {queue:queue.slice(),position,queueEpoch,trainerEpoch,trainerReturn,vocabRole,mode,topic,courseBlock,sourceFilter,view,practiceIds:practiceIds.slice(),vocabPlan,vocabSitting,vocabRetry,vocabClosed:vocabClosed.slice(),sessionAttempts,sessionCorrect,sessionAssisted};}',
    'function restoreMustLive(keep){queue=keep.queue;position=keep.position;queueEpoch=keep.queueEpoch;trainerEpoch=keep.trainerEpoch;trainerReturn=keep.trainerReturn;vocabRole=keep.vocabRole;mode=keep.mode;topic=keep.topic;courseBlock=keep.courseBlock;sourceFilter=keep.sourceFilter;view=keep.view;practiceIds=keep.practiceIds;vocabPlan=keep.vocabPlan;vocabSitting=keep.vocabSitting;vocabRetry=keep.vocabRetry;vocabClosed=keep.vocabClosed;sessionAttempts=keep.sessionAttempts;sessionCorrect=keep.sessionCorrect;sessionAssisted=keep.sessionAssisted;}',
    'function save(){saves.push({mode,queue:queue.slice(),position,snap:isVocabMustTrainer(),kind:vocabRetry&&vocabRetry.kind,cardId:vocabRetry&&vocabRetry.cardId,queueEpoch,trainerEpoch,view});}',
    'function render(){} function showView(name){views.push(name); view=name;} function pauseTimer(){}',
    pred,imp,
    'importProgress(incoming, importMode);',
    'return {mode,queue:queue.slice(),position,practiceIds:practiceIds.slice(),kind:vocabRetry&&vocabRetry.kind,cardId:vocabRetry&&vocabRetry.cardId,queueEpoch,trainerEpoch,vocabRole,trainerReturn,view,views:views.slice(),saves,poolCalls,snap:isVocabMustTrainer()};'
  ].join('\n');
  return new Function('start','incoming','importMode','VM','cfg',body)(start,incoming,importMode,VM,cfg);
}
function knownStart(ids,extra){
  const byId=new Map(ids.map(id=>[id,{id}]));
  return Object.assign({mode:'ordered',vocabRole:null,trainerReturn:null,queueEpoch:1,trainerEpoch:null,position:0,queue:[],topic:'all',state:{records:Object.create(null),events:[],learning:{}},questions:[],byId,pool:[],view:'today'},extra||{},{byId});
}
function mustSession(queue,position,patch){
  const sitting=VM.emptySitting(1); sitting.sessions=['50'];
  return {session:Object.assign({mode:'words',trainerReturn:'vocab:must',topic:'vocab',queue,position,queueEpoch:50,trainerEpoch:50,vocab:{plan:{budget:10,nNew:0,baseLen:queue.length,newLemmas:[]},sitting,retry:{cardId:queue[0],sessionId:'50',presentation:0,kind:'idk',typed:[],answerEventId:null},closed:[],unaided:{},blindFails:{},nearMiss:null}},patch||{})};
}
const openIdk=runImport(app,knownStart([],{pool:[{id:'LATE'}]}),mustSession(['LATE','GONE'],0), 'replace');
assert.equal(openIdk.poolCalls,1);
assert.deepEqual(openIdk.queue,['LATE']);
assert.equal(openIdk.position,0);
assert.equal(openIdk.mode,'words');
assert.equal(openIdk.trainerReturn,'vocab:must');
assert.equal(openIdk.queueEpoch,50);
assert.equal(openIdk.trainerEpoch,50);
assert.equal(openIdk.snap,true);
assert.equal(openIdk.kind,'idk');
assert.equal(openIdk.cardId,'LATE');
assert.deepEqual(openIdk.views,['practice']);
assert.equal(openIdk.saves.at(-1).snap,true);
assert.equal(openIdk.saves.at(-1).mode,'words');
const droppedBefore=runImport(app,knownStart(['A','B']),mustSession(['MISSING','A','B'],1,{vocab:{plan:{budget:10,nNew:0,baseLen:3,newLemmas:[]},sitting:VM.emptySitting(1),retry:null,closed:[],nearMiss:null}}),'replace');
assert.deepEqual(droppedBefore.queue,['A','B']);
assert.equal(droppedBefore.position,0);
const atMissing=runImport(app,knownStart(['A','B']),mustSession(['A','MISSING','B'],1,{vocab:{plan:{budget:10,nNew:0,baseLen:3,newLemmas:[]},sitting:VM.emptySitting(1),retry:null,closed:[],nearMiss:null}}),'replace');
assert.deepEqual(atMissing.queue,['A','B']);
assert.equal(atMissing.position,1);
assert.equal(atMissing.queue[atMissing.position],'B');
const kept=runImport(app,knownStart(['A','B']),mustSession(['A','B'],1,{vocab:{plan:{budget:10,nNew:0,baseLen:2,newLemmas:[]},sitting:VM.emptySitting(1),retry:null,closed:[],nearMiss:null}}),'replace');
assert.deepEqual(kept.queue,['A','B']);
assert.equal(kept.position,1);
const emptyQueue=runImport(app,knownStart(['A'],{pool:[{id:'LATE'}]}),mustSession(['GONE'],0),'replace');
assert.equal(emptyQueue.mode,'ordered');
assert.equal(emptyQueue.trainerReturn,null);
assert.deepEqual(emptyQueue.queue,[]);
assert.equal(emptyQueue.kind,null);
assert.deepEqual(emptyQueue.views,['today']);
assert.equal(emptyQueue.saves.at(-1).snap,false);
const uneven=runImport(app,knownStart(['A']),mustSession(['A'],0,{queueEpoch:10,trainerEpoch:11}),'replace');
assert.equal(uneven.mode,'words');
assert.equal(uneven.queueEpoch,10);
assert.equal(uneven.trainerEpoch,11);
assert.equal(uneven.snap,false);
const copiedEpoch=runImport(app,knownStart(['A']),mustSession(['A'],0,{queueEpoch:12,trainerEpoch:undefined}),'replace');
assert.equal(copiedEpoch.queueEpoch,12);
assert.equal(copiedEpoch.trainerEpoch,12);
assert.equal(copiedEpoch.snap,true);
const live=knownStart(['LOCAL'],{mode:'words',vocabRole:'must',trainerReturn:'vocab:must',queueEpoch:4,trainerEpoch:4,position:0,queue:['LOCAL'],vocabRetry:{cardId:'LOCAL',kind:'idk'}});
const keptLocal=runImport(app,live,{session:{mode:'words',trainerReturn:'vocab:must',queue:['OTHER'],position:0,queueEpoch:1}},'merge');
assert.deepEqual(keptLocal.queue,['LOCAL']);
assert.equal(keptLocal.mode,'words');
assert.equal(keptLocal.kind,'idk');
assert.equal(keptLocal.cardId,'LOCAL');
assert.deepEqual(keptLocal.views,['practice']);

const seenOnly=state();
seenOnly.records.A={seen:1,review_count:0,next_review:1,dueAt:1};
seenOnly.skills['word:a::production']={review_count:0};
const seenPlan=VM.planPortion(pool,seenOnly,cfg,core,5000);
assert.equal(seenPlan.plan.nNew,3);
assert.ok(seenPlan.plan.newLemmas.includes('word:a'));
const skilled=state();
skilled.skills['word:a::production']={review_count:1};
const skilledPlan=VM.planPortion(pool,skilled,cfg,core,5000);
assert.equal(skilledPlan.plan.nNew,2);
assert.ok(!skilledPlan.plan.newLemmas.includes('word:a'));

const openedState=state();
const openedPlan=VM.planPortion(pool,openedState,cfg,core,1000);
const openedLemma=openedPlan.plan.newLemmas[0];
openedState.records[openedPlan.ids[0]]=Scheduler.shown(null,1000);
const reopened=VM.planPortion(pool,openedState,cfg,core,2000);
assert.ok(reopened.plan.newLemmas.includes(openedLemma));

const oldSave=VM.restoreSaved({mode:'words',trainerReturn:'vocab:must',queue:['A'],position:0,queueEpoch:1,sessionCorrect:1,sessionAssisted:0},state(),cfg,3000);
assert.equal(oldSave.legacy,true);
assert.ok(oldSave.vocab&&oldSave.vocab.plan);

const late=card('L','word:l');late.lessonId='2-1';
const early=card('E','word:e');early.lessonId='1-1';
const ranked=VM.planPortion([late,early],state(),cfg,core,1000,{rank:q=>q.lessonId==='1-1'?1:2});
assert.deepEqual(ranked.ids,['E','L']);
assert.deepEqual(ranked.plan.newLemmas,['word:e','word:l']);

const fillerPool=[card('N3','word:n3'),card('N1','word:n1'),card('N2','word:n2'),card('High','word:high'),card('Low','word:low'),card('Mature','word:mature')];
const fillerState=state();
for(const id of ['High','Low','Mature'])fillerState.records[id]={review_count:2,seen:2,needsReview:false,streak:5,next_review:999999999,dueAt:999999999};
const fillerPlan=VM.planPortion(fillerPool,fillerState,cfg,core,1000,{retrievability:q=>q.id==='Low'?0.1:q.id==='High'?0.9:null});
assert.equal(fillerPlan.plan.nNew,2);
assert.deepEqual(fillerPlan.plan.newLemmas,['word:n3','word:n1']);
// N2 has no answer of its own, so the filler cannot take it. The new-word cap already left it out.
assert.ok(!fillerPlan.ids.includes('N2'));
assert.ok(fillerPlan.ids.indexOf('Low')>=0&&fillerPlan.ids.indexOf('Low')<fillerPlan.ids.indexOf('High'));
assert.ok(fillerPlan.ids.indexOf('High')<fillerPlan.ids.indexOf('Mature'));

// P0-FILLER-CARD-HISTORY: a -ru card with no answer of its own stays out.
// nolKk's first recorded answer is today, so the other direction stays buried.
// nolKk is mature and not due, so it can enter only as filler.
function dirCard(id,lemma,skill){
  return {id,topic:'vocab',wordRole:'must',kind:'fields',title:'t',stimulus:id,fields:[{answers:[id+'к'],kind:'text'}],vocabIds:[lemma],skillBindings:[{item_id:lemma,skill_type:skill,field:0}]};
}
const nolRu=dirCard('v2-1-2-vocab-nol-ru','word:nol','recognition');
const nolKk=dirCard('v2-1-2-vocab-nol-kk','word:nol','production');
const fillerHist=state();
fillerHist.records[nolKk.id]={review_count:1,seen:1,needsReview:false,streak:5,next_review:999999999,dueAt:999999999,last_answer:1000};
fillerHist.events=[{type:'answer',card_id:nolKk.id,at:1000}];
const fillerOwn=VM.planPortion([nolRu,nolKk,card('hw1-1-kk','word:h1'),card('hw1-2-kk','word:h2'),card('hw1-3-kk','word:h3')],fillerHist,cfg,core,1000);
assert.ok(!fillerOwn.ids.includes(nolRu.id),'P0-FILLER-CARD-HISTORY');
assert.ok(fillerOwn.ids.includes(nolKk.id),'P0-FILLER-CARD-HISTORY');
const mateHigh=card('mate-high','word:mate');
const mateLow=card('mate-low','word:mate');
const mateState=state();
for(const id of [mateHigh.id,mateLow.id])mateState.records[id]={review_count:3,seen:3,needsReview:false,streak:5,next_review:999999999,dueAt:999999999};
const matePlan=VM.planPortion([mateHigh,mateLow,card('hw9-1-kk','word:j1'),card('hw9-2-kk','word:j2')],mateState,cfg,core,1000,{retrievability:q=>q.id===mateLow.id?0.2:q.id===mateHigh.id?0.8:null});
assert.ok(matePlan.ids.includes(mateLow.id)&&!matePlan.ids.includes(mateHigh.id),'P0-FILLER-CARD-HISTORY');

// P0-GAP: recent X and Y, and no other cards, so neither lemma is shown inside the pause.
const gapPool=[card('X-ru','word:x'),card('Y-ru','word:y')];
const gapSit=VM.emptySitting(1);
gapSit.recent=[{cardId:'X',lemma:'word:x'},{cardId:'Y',lemma:'word:y'}];
const gapPlan=VM.planPortion(gapPool,state(),cfg,core,1000);
const gapIds=VM.enforceGap(gapPlan.ids,gapSit,gapPool,core,2);
assert.deepEqual(gapIds,[],'P0-GAP');
{
  const byId=new Map(gapPool.map(q=>[q.id,q]));
  const seq=gapSit.recent.map(x=>x.lemma||x.cardId);
  for(const id of gapIds){
    const lem=core.lemmaKey(byId.get(id)||{id});
    let last=-1;
    for(let i=0;i<seq.length;i++)if(seq[i]===lem)last=i;
    assert.ok(last<0||seq.length-1-last>=2,'P0-GAP');
    seq.push(lem);
  }
}
function bind(id,lemma,skill){
  const q=card(id,lemma);
  q.skillBindings=[{item_id:lemma,skill_type:skill,field:0}];
  return q;
}
function rec(patch){return Object.assign({review_count:1,seen:1,needsReview:false,streak:1,last_answer:1},patch);}
const DAY=86400000;
const dayNow=new Date(2026,9,11,12,0,0).getTime();
const earlyCard=bind('hw-early','word:due','production');
const lateCard=bind('bank-late','word:due','production');
const dueState=state();
dueState.records[earlyCard.id]=rec({next_review:dayNow-1000,dueAt:dayNow-1000,last_answer:dayNow-DAY});
dueState.records[lateCard.id]=rec({next_review:dayNow+5000,dueAt:dayNow+5000,last_answer:dayNow-2*DAY});
const duePlan=VM.planPortion([lateCard,earlyCard],dueState,cfg,core,dayNow);
assert.deepEqual(duePlan.ids,[earlyCard.id]);
assert.equal(duePlan.plan.nNew,0);
const snapBefore=JSON.stringify(dueState.records);
VM.planPortion([lateCard,earlyCard],dueState,cfg,core,dayNow);
assert.equal(JSON.stringify(dueState.records),snapBefore);

const far=bind('g-far','word:syn','production');
const overdue=bind('g-over','word:syn','recognition');
const loss=state();
loss.records[far.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow-5*DAY});
loss.records[overdue.id]=rec({next_review:dayNow-3*DAY,dueAt:dayNow-3*DAY,needsReview:false,last_answer:dayNow-4*DAY});
loss.skills['word:syn::production']={review_count:1,item_id:'word:syn',skill_type:'production',next_review:dayNow+5*DAY};
const farSkill=JSON.stringify(loss.skills['word:syn::production']);
const farRec=JSON.stringify(loss.records[far.id]);
const lossPlan=VM.planPortion([far,overdue],loss,cfg,core,dayNow);
assert.deepEqual(lossPlan.ids,[overdue.id]);
assert.equal(JSON.stringify(loss.records[far.id]),farRec);
assert.equal(JSON.stringify(loss.skills['word:syn::production']),farSkill);
VM.commitFirst({state:loss,records:loss.records,q:overdue,now:dayNow,sessionId:'syn',presentation:0,kind:'good',answers:['ok'],elapsed:4,core,observe:()=>[],queue:[overdue.id],position:0,pool:[far,overdue],plan:lossPlan.plan,sitting:VM.emptySitting(dayNow),rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:lossPlan.plan.budget,minGap:2,appearCap:3,hinted:false,recall:true});
assert.equal(JSON.stringify(loss.records[far.id]),farRec);
assert.equal(JSON.stringify(loss.skills['word:syn::production']),farSkill);

const kkOnly=bind('hw-kk','word:dir','production');
const ruOnly=bind('v-ru','word:dir','recognition');
const dirState=state();
dirState.records[kkOnly.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow-DAY});
dirState.records[ruOnly.id]=rec({next_review:dayNow-DAY,dueAt:dayNow-DAY,last_answer:dayNow-2*DAY});
const dirPlan=VM.planPortion([kkOnly,ruOnly],dirState,cfg,core,dayNow);
assert.deepEqual(dirPlan.ids,[ruOnly.id]);

const bury=state();
bury.records[kkOnly.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow});
bury.events=[{type:'answer',card_id:kkOnly.id,at:dayNow}];
const buried=VM.planPortion([kkOnly,ruOnly],bury,cfg,core,dayNow);
assert.ok(buried.ids.includes(kkOnly.id));
assert.ok(!buried.ids.includes(ruOnly.id));
assert.ok(!buried.plan.newLemmas.includes('word:dir'));

function vocabFn(name,next){
  const src=fs.readFileSync(path.join(__dirname,'vocab-must.js'),'utf8');
  const start=src.indexOf('function '+name+'(');
  const end=src.indexOf('\n function '+next+'(');
  assert.ok(start>=0&&end>start,name);
  return new Function(src.slice(start,end)+'\nreturn '+name+';')();
}
const n1kk=bind('w-kk','word:n1dir','production');
const n1ru=bind('w-ru','word:n1dir','recognition');
const n1Yesterday=state();
n1Yesterday.records[n1kk.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow-DAY,review_count:1});
n1Yesterday.events=[{type:'answer',card_id:n1kk.id,at:dayNow-DAY}];
const n1Next=VM.planPortion([n1kk,n1ru],n1Yesterday,cfg,core,dayNow);
assert.ok(n1Next.ids.includes(n1ru.id),'N1-SECOND-DIR-NEXT-DAY');
assert.ok(!n1Next.plan.newLemmas.includes('word:n1dir'),'N1-SECOND-DIR-NEXT-DAY');
const n1Today=state();
n1Today.records[n1kk.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow,review_count:1});
n1Today.events=[{type:'answer',card_id:n1kk.id,at:dayNow}];
const n1Same=VM.planPortion([n1kk,n1ru],n1Today,cfg,core,dayNow);
assert.ok(!n1Same.ids.includes(n1ru.id),'N1-SECOND-DIR-NEXT-DAY');

const answerDir=vocabFn('answerDir','groupKeyOf');
const genA={id:'gen-a',topic:'vocab',wordRole:'must',kind:'fields',title:'t',stimulus:'gen-a',fields:[{answers:['а'],kind:'text',answerLang:'ru'}],vocabIds:['word:gen'],skillBindings:[{item_id:'word:gen',skill_type:'recognition',field:0}]};
const genB={id:'gen-b',topic:'vocab',wordRole:'must',kind:'fields',title:'t',stimulus:'gen-b',fields:[{answers:['б'],kind:'text'}],vocabIds:['word:gen'],skillBindings:[{item_id:'word:gen',skill_type:'production',field:0}]};
assert.equal(answerDir(core,genB),'unknown','P1-UNKNOWN-NOT-BURIED');
const unkState=state();
unkState.records[genA.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow,review_count:1});
unkState.events=[{type:'answer',card_id:genA.id,at:dayNow}];
const unkPlan=VM.planPortion([genA,genB],unkState,cfg,core,dayNow);
assert.ok(unkPlan.ids.includes(genB.id),'P1-UNKNOWN-NOT-BURIED');
assert.ok(!unkPlan.plan.newLemmas.includes('word:gen'),'P1-UNKNOWN-NOT-BURIED');

function barePair(id){
  return {id,topic:'vocab',wordRole:'must',kind:'fields',title:'t',stimulus:id,fields:[{answers:[id],kind:'text'}],vocabIds:['word:own'],skillBindings:[{item_id:'exercise:shared',skill_type:'application',field:0}]};
}
const ownWait=barePair('hw-wait');
const ownOver=barePair('bank-over');
const groupKeyOf=vocabFn('groupKeyOf','idClass');
assert.notEqual(groupKeyOf(ownWait),groupKeyOf(ownOver),'P1-FALLBACK-GROUP-OWN');
assert.equal(groupKeyOf(ownOver),'exercise:'+ownOver.id,'P1-FALLBACK-GROUP-OWN');
const ownState=state();
ownState.records[ownWait.id]=rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,last_answer:dayNow-5*DAY});
ownState.records[ownOver.id]=rec({next_review:dayNow-3*DAY,dueAt:dayNow-3*DAY,last_answer:dayNow-4*DAY});
const ownSnap=JSON.stringify(ownState.records[ownWait.id]);
const ownPlan=VM.planPortion([ownWait,ownOver],ownState,cfg,core,dayNow);
assert.deepEqual(ownPlan.ids,[ownOver.id],'P1-FALLBACK-GROUP-OWN');
assert.equal(JSON.stringify(ownState.records[ownWait.id]),ownSnap,'P1-FALLBACK-GROUP-OWN');

function legacyPlan(setup){
  const kk=bind('leg-kk','word:leg','production');
  const ru=bind('leg-ru','word:leg','recognition');
  const st=state();
  setup(st,kk);
  return VM.planPortion([kk,ru],st,cfg,core,dayNow);
}
const legacyA=legacyPlan((st,kk)=>{st.records[kk.id]=rec({review_count:5,last_answer:dayNow,next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,streak:5});});
assert.ok(legacyA.ids.includes('leg-ru'),'P1-LEGACY-LAST-ANSWER a');
const legacyB=legacyPlan((st,kk)=>{
  st.records[kk.id]=rec({review_count:5,last_answer:dayNow,next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,streak:5});
  st.events=[{type:'answer',card_id:kk.id,at:dayNow}];
});
assert.ok(legacyB.ids.includes('leg-ru'),'P1-LEGACY-LAST-ANSWER b');
const legacyC=legacyPlan((st,kk)=>{
  st.records[kk.id]=rec({review_count:2,next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY,streak:5});
  delete st.records[kk.id].last_answer;
});
assert.ok(legacyC.ids.includes('leg-ru'),'P1-LEGACY-LAST-ANSWER c');
const legacyCtrl=legacyPlan((st,kk)=>{
  st.records[kk.id]=rec({review_count:1,last_answer:dayNow,next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY});
  st.events=[{type:'answer',card_id:kk.id,at:dayNow}];
});
assert.ok(!legacyCtrl.ids.includes('leg-ru'),'P1-LEGACY-LAST-ANSWER control');

const many=[bind('bank-9-kk','word:many','production'),bind('learn-word-4','word:many','production'),bind('v2-x','word:many','production'),bind('hw9-1-kk','word:many','production'),bind('other','word:many','production')];
const manyPlan=VM.planPortion(many,state(),cfg,core,dayNow);
assert.deepEqual(manyPlan.ids,['hw9-1-kk']);
assert.equal(new Set(manyPlan.ids.map(id=>core.lemmaKey(many.find(q=>q.id===id)))).size,manyPlan.ids.length);

const table=[['hw1-1-kk-rev','ru'],['hw2-22-kk-rev','ru'],['v2-4-1-vocab-also-kk-set','kk'],['v2-4-2-vocab-qalaisyn-kk-form-1','kk'],['hw3-17-ru','ru'],['hw3-19-ru','ru'],['hw3-8-ru','ru'],['hw3-8-kk','kk'],['learn-word-3','kk'],['learn-word-3-ru','ru'],['bank-8-kk','kk'],['bank-8-ru','ru']];
for(const [id,lang] of table)assert.equal(core.answerLang({id,title:'Напиши все формы'}),lang,id);

// P0-GAP-NOT-EXHAUSTED: 1–2 just-shown cards must not paint «Все слова пройдены».
// Mutation: put `return false` back on the empty enforceGap branch and this fails.
function runGapScreen(cards,sitting,queue){
  const rankSrc=app.slice(app.indexOf('function mustCourseRank'),app.indexOf('function paintMustRetry'));
  const nextSrc=app.slice(app.indexOf('function nextQuestion'),app.indexOf('function homeworkOpts'));
  const emptySrc=app.slice(app.indexOf('function renderEmpty'),app.indexOf('function startRemedy'));
  const mustPred=app.slice(app.indexOf('function isVocabMustTrainer()'),app.indexOf('function mustPool()'));
  assert.ok(rankSrc.includes('function relaxMustGap')&&rankSrc.includes('function beginMustPortion'),'P0-GAP-NOT-EXHAUSTED');
  assert.ok(nextSrc.includes('beginMustPortion(false)'),'P0-GAP-NOT-EXHAUSTED');
  assert.ok(emptySrc.includes('<h2>Все слова пройдены</h2>'),'P0-GAP-NOT-EXHAUSTED');
  const body=[
    'const window={VocabMust:VM,LESSON_V2_COMPILED:[]};',
    'const cfg=start.cfg, core=start.core, state=start.state, records=state.records;',
    'let mode="words", vocabRole="must", trainerReturn="vocab:must", queueEpoch=7, trainerEpoch=7;',
    'let position=0, queue=start.queue.slice(), practiceIds=queue.slice();',
    'let vocabSitting=start.sitting, vocabPlan=start.plan, vocabClosed=[], vocabRetry=null, vocabPoolReady=false, vocabReturnScheduled=false, vocabSummary=false, vocabNear=null, vocabCardHold=null;',
    'let sessionAttempts=0, sessionCorrect=0, sessionAssisted=0, sessionBlindFails=Object.create(null), sessionUnaided=Object.create(null);',
    'let draft=null, presented=null, checked=false, hinted=false, retrying=false, retryAfterWrong=false;',
    'let activeLesson=null, pathPracticeReturn=null, hwReturn=null, courseBlock=null;',
    'const byId=new Map(start.cards.map(q=>[q.id,q]));',
    'const nodes={};',
    'function $(sel){if(!nodes[sel])nodes[sel]={innerHTML:"",onclick:null,scrollIntoView(){},focus(){},classList:{contains(){return false;},add(){},remove(){}}};return nodes[sel];}',
    'const document={documentElement:{classList:{contains(){return false;}}},addEventListener(){},removeEventListener(){}};',
    'function cancelAdvance(){} function abortTutor(){} function focusAnswer(){} function save(){} function showView(){}',
    'function prepareVocabPool(){} function mustPool(){return start.cards;}',
    'function render(){const q=byId.get(queue[position]);if(!q){renderEmpty();return;}$("#exercise").innerHTML="<h2 id=question-title>"+q.id+"</h2>";}',
    mustPred,rankSrc,nextSrc,emptySrc,
    'nextQuestion();',
    'const q=byId.get(queue[position]);',
    'return {html:$("#exercise").innerHTML,queue:queue.slice(),position,id:q?q.id:null};'
  ].join('\n');
  return new Function('start','VM',body)({cfg,core,state:state(),cards,sitting,plan:{budget:10,nNew:cards.length,baseLen:cards.length,newLemmas:[]},queue},VM);
}
const gapLeft=[card('X','word:x'),card('Y','word:y')];
const gapLeftSit=VM.emptySitting(1);
gapLeftSit.recent=[{cardId:'X',lemma:'word:x'},{cardId:'Y',lemma:'word:y'}];
const gapLeftPlan=VM.planPortion(gapLeft,state(),cfg,core,1000);
assert.ok(gapLeftPlan.ids.length>=1&&gapLeftPlan.ids.length<=2,'P0-GAP-NOT-EXHAUSTED');
assert.deepEqual(VM.enforceGap(gapLeftPlan.ids,gapLeftSit,gapLeft,core,cfg.schedule.learningIntervening||2),[],'P0-GAP-NOT-EXHAUSTED');
const gapLeftScreen=runGapScreen(gapLeft,gapLeftSit,['Y']);
assert.ok(!gapLeftScreen.html.includes('Все слова пройдены'),'P0-GAP-NOT-EXHAUSTED');
assert.ok(gapLeftScreen.html.includes('question-title'),'P0-GAP-NOT-EXHAUSTED');
assert.equal(gapLeftScreen.id,'X','P0-GAP-NOT-EXHAUSTED');
const gapOne=[card('Y','word:y')];
const gapOneSit=VM.emptySitting(1);
gapOneSit.recent=[{cardId:'Y',lemma:'word:y'}];
const gapOnePlan=VM.planPortion(gapOne,state(),cfg,core,1000);
assert.deepEqual(gapOnePlan.ids,['Y'],'P0-GAP-NOT-EXHAUSTED');
assert.deepEqual(VM.enforceGap(gapOnePlan.ids,gapOneSit,gapOne,core,2),[],'P0-GAP-NOT-EXHAUSTED');
const gapOneScreen=runGapScreen(gapOne,gapOneSit,['Y']);
assert.ok(!gapOneScreen.html.includes('Все слова пройдены'),'P0-GAP-NOT-EXHAUSTED');
assert.equal(gapOneScreen.id,'Y','P0-GAP-NOT-EXHAUSTED');

function answerCard(st,sitting,cards,q,queue,position,plan,kind,now,sessionId){
  const res=VM.commitFirst({state:st,records:st.records,q,now,sessionId,presentation:position,kind,answers:kind==='good'?['ok']:[],elapsed:5,core,observe:()=>[],queue,position,pool:cards,plan,sitting,rating:kind==='good'?F.Rating.Good:F.Rating.Again,errors:[],result:{correct:kind==='good',parts:[kind==='good']},budget:plan.budget,minGap:2,appearCap:3,hinted:kind!=='good',recall:true});
  let spent=kind==='good'?1:0;
  if(kind!=='good'&&res.retry){
    const closed=VM.commitRetype({state:st,sitting,retry:res.retry,sessionId,presentation:position,cardId:q.id,answers:['ok'],result:{correct:true,parts:[true]},now:now+1});
    if(closed.closed)spent=1;
  }
  return {queue:res.queue,spent,scheduled:res.scheduled};
}
const dPool=['A','B','C','D','N1','N2'].map(id=>card(id,'word:'+id.toLowerCase()));
const dState=state();
for(const id of ['A','B','C','D'])dState.records[id]={review_count:1,seen:1,needsReview:true,streak:0,next_review:1,dueAt:1};
const dPlan=VM.planPortion(dPool,dState,cfg,core,5000);
assert.equal(dPlan.plan.nNew,2);
assert.deepEqual(dPlan.plan.newLemmas,['word:n1','word:n2']);
assert.ok(dPlan.ids.includes('N2')&&dPlan.ids.indexOf('N2')<dPlan.plan.budget);
let dQueue=dPlan.ids.slice();
const dSit=VM.emptySitting(1);dSit.sessions=['d05'];
let dPos=0,dAttempts=0,dDeferred=0;
const dShown=new Set(),dErrored=new Set();
while(dPos<dQueue.length&&dAttempts<dPlan.plan.budget){
  const id=dQueue[dPos];
  const q=dPool.find(c=>c.id===id);
  const kind=['A','B','C','D','N1'].includes(id)&&!dErrored.has(id)?'wrong':'good';
  if(kind==='wrong')dErrored.add(id);
  const step=answerCard(dState,dSit,dPool,q,dQueue,dPos,dPlan.plan,kind,6000+dPos,'d05');
  if(kind!=='good'&&step.scheduled===false)dDeferred++;
  dQueue=step.queue;dAttempts+=step.spent;dShown.add(core.lemmaKey(q));dPos++;
}
assert.ok(dShown.has('word:n2'));
assert.ok(dDeferred>0);
console.log('D05 deferred old returns',dDeferred);

const desk=[];
for(let i=0;i<40;i++)desk.push(card('T'+i,'word:t'+i));
const deskState=state();
let deskNew=0,deskEmpty=0;
for(let portion=0;portion<10;portion++){
  const planned=VM.planPortion(desk,deskState,cfg,core,100000+portion*1000);
  if(!planned.ids.length){deskEmpty++;break;}
  if(portion===0){assert.equal(planned.plan.nNew,3);assert.equal(planned.plan.budget,9);}
  else assert.equal(planned.plan.nNew,2);
  deskNew+=planned.plan.nNew;
  let queue=planned.ids.slice(),pos=0,attempts=0;
  const sit=VM.emptySitting(1);sit.sessions=['desk'+portion];
  const shown=new Set();
  while(pos<queue.length&&attempts<planned.plan.budget){
    const q=desk.find(c=>c.id===queue[pos]);
    const step=answerCard(deskState,sit,desk,q,queue,pos,planned.plan,'good',100000+portion*1000+pos,'desk'+portion);
    queue=step.queue;attempts+=step.spent;
    if(planned.plan.newLemmas.includes(core.lemmaKey(q)))shown.add(core.lemmaKey(q));
    pos++;
  }
  for(const lem of planned.plan.newLemmas)assert.ok(shown.has(lem),lem);
}
assert.ok(deskNew>=20);
assert.equal(deskEmpty,0);
console.log('desk portions new',deskNew);

function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const rand=mulberry32(0xC0FFEE);
const runCards=[];
for(let i=0;i<45;i++)runCards.push(card('R'+i,'word:r'+i));
const runState=state();
let runEmpty=0;
const missedOld=[];
for(let portion=0;portion<20;portion++){
  const planned=VM.planPortion(runCards,runState,cfg,core,200000+portion*1000);
  if(!planned.ids.length){runEmpty++;break;}
  assert.ok(planned.plan.nNew>0);
  let queue=planned.ids.slice(),pos=0,attempts=0,closed=0;
  const sit=VM.emptySitting(1);sit.sessions=['run'+portion];
  const shownNew=new Set(),shownIds=new Set();
  while(pos<queue.length&&attempts<planned.plan.budget){
    const id=queue[pos];
    const q=runCards.find(c=>c.id===id);
    const lem=core.lemmaKey(q);
    const had=VM.lemmaHasHistory(runState,runCards,core,lem);
    const roll=rand();
    const kind=roll<0.70?'good':roll<0.85?'wrong':'idk';
    const step=answerCard(runState,sit,runCards,q,queue,pos,planned.plan,kind,200000+portion*1000+pos,'run'+portion);
    queue=step.queue;attempts+=step.spent;closed+=step.spent;shownIds.add(id);
    if(planned.plan.newLemmas.includes(lem))shownNew.add(lem);
    else if(!had)assert.fail('new lemma from filler '+id);
    pos++;
  }
  assert.ok(closed<=planned.plan.budget);
  for(const lem of planned.plan.newLemmas)assert.ok(shownNew.has(lem),lem+' portion '+portion);
  for(const id of planned.ids){
    if(shownIds.has(id))continue;
    const q=runCards.find(c=>c.id===id);
    if(!planned.plan.newLemmas.includes(core.lemmaKey(q)))missedOld.push(portion+':'+id);
  }
}
assert.equal(runEmpty,0);
console.log('20 portions missed old',missedOld.join(',')||'(none)');

const contrastBlock=app.slice(app.indexOf('const mate=window.MemoryPolicy&&window.MemoryPolicy.contrastSide(q);'),app.indexOf('const deferred='));
function contrastQueue(isMust){
  const policy=require('./memory-policy.js');
  const q={id:'v2-1-2-vocab-togyz-kk',topic:'vocab',wordRole:'must',title:'Переведи на русский',stimulus:'тоғыз',fields:[{answers:['девять']}]};
  const other={id:'hw2-19-kk',topic:'vocab',wordRole:'',title:'Переведи на русский',stimulus:'тоқсан',fields:[{answers:['девяносто']}]};
  const fillers=['a','b','c','d','e'].map(id=>({id,topic:'vocab',wordRole:'must',stimulus:id,fields:[{answers:[id]}]}));
  const questions=[q,other,...fillers];
  const mustIds=new Set([q.id,...fillers.map(x=>x.id)]);
  let queue=[q.id,...fillers.map(x=>x.id)];
  const position=0,result={correct:false},hinted=false,stageContext=null,bankRun=false;
  const window={MemoryPolicy:policy};
  function isVocabMustTrainer(){return isMust;}
  eval(contrastBlock);
  return {queue,mustIds,other:other.id};
}
const leaked=contrastQueue(false);
assert.ok(leaked.queue.includes(leaked.other));
assert.ok(!leaked.mustIds.has(leaked.other));
const held=contrastQueue(true);
assert.ok(!held.queue.includes(held.other));
assert.deepEqual(held.queue,['v2-1-2-vocab-togyz-kk','a','b','c','d','e']);

function bootMust(first,how){
  // curriculum.js installs LESSON_PACKS when it loads. A shorter file list never sees lesson-pack-*.js,
  // so those homework cards stay out and v2 `taken` builds a different, smaller must pool.
  const window={
    document:{documentElement:{getAttribute(){return null;},classList:{contains(){return false;},add(){},remove(){}}},querySelector(){return null;},querySelectorAll(){return [];},getElementById(){return null;},addEventListener(){},body:{appendChild(){}},head:{},createElement(){return {style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},addEventListener(){}};}},
    localStorage:{_d:Object.create(null),getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    navigator:{userAgent:'node',language:'ru'},
    location:{hostname:'localhost',href:'http://127.0.0.1/',origin:'http://127.0.0.1',protocol:'http:'},
    matchMedia(){return {matches:false,addListener(){},addEventListener(){}};},
    console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,Map,Set,WeakMap,WeakSet,Promise,Number,String,Boolean,RegExp,Error,parseInt,parseFloat,isNaN,isFinite,Infinity,NaN,undefined,URL,URLSearchParams,Intl,TextEncoder,TextDecoder,
    performance:{now(){return Date.now();}},requestAnimationFrame(){return 0;},cancelAnimationFrame(){},addEventListener(){},removeEventListener(){}
  };
  window.window=window;window.globalThis=window;window.self=window;
  const ctx=vm.createContext(window);
  const skip=new Set(['app.js','pwa.js','design-ui.js','cloud.js','firebase-config.js','dashboard.js','morph-ui.js','morph-nav2.js','personal-trainers.js','free-practice-view.js','tutor-ui.js']);
  const files=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/src="([^"]+\.js)"/g).map(s=>s.slice(5,-1)).filter(f=>!skip.has(f));
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
  const startupStart=app.indexOf("try{if(!(window.LessonV2Runtime&&window.LessonV2Runtime.isV2('3-1')))window.Lesson31Pack?.install?.(course,window.CURRICULUM);}");
  const startupEnd=app.indexOf('const questions=course.questions;');
  assert.ok(startupStart>0&&startupEnd>startupStart);
  const coerceSrc=app.slice(app.indexOf('function coerceTyped('),app.indexOf('for(const q of questions)coerceTyped'));
  const eligSrc=app.slice(app.indexOf('function eligible('),app.indexOf('function activateCard('));
  const mustSrc=app.slice(app.indexOf('function mustPool('),app.indexOf('function prepareVocabPool('));
  const prepSrc=app.slice(app.indexOf('function prepareVocabPool('),app.indexOf('function mustCourseRank('));
  const ensureFn=app.slice(app.indexOf('function ensureV2('),app.indexOf('function openPathLesson('));
  const body=[
    'const course=window.COURSE;',
    app.slice(startupStart,startupEnd),
    'const questions=course.questions;',
    coerceSrc,
    "let mode='words';",
    'let state=window.ProgressStore.empty();',
    'let records=state.records;',
    'const catalog=window.CURRICULUM;',
    'try{catalog.activatePromotions(state);}catch(e){}',
    'const byId=new Map(questions.map(q=>[q.id,q]));',
    'for(const q of questions){coerceTyped(q);byId.set(q.id,q);}',
    'let confusionIndex=null;',
    'const P=window.ProgressStore;',
    'let vocabPoolReady=false;',
    eligSrc,mustSrc,prepSrc,ensureFn,
    'const idsOf=list=>{const out=[];for(const q of list)if(q&&q.id!=null)out.push(String(q.id));out.sort();return out;};',
    'let partial=[];',
    'if('+JSON.stringify(first)+'){ensureV2('+JSON.stringify(first)+');partial=idsOf(mustPool());}',
    how==='guard'?[
      "const lessonQs=questions.filter(q=>q&&q.lessonId==='4-1'&&q.id);",
      "if(lessonQs.length<3)throw new Error('P2-WARM-SAFE cards '+lessonQs.length);",
      'const qids=lessonQs.slice(0,3).map(q=>q.id);',
      'let queue=qids.slice();',
      'let position=1;',
      "let draft={token:'4-1:1',exerciseId:qids[1],answers:['\\u0431\\u0430\\u0440\\u0430\\u0434\\u044b']};",
      'const beforeQ=queue.slice(),beforeP=position,beforeD=JSON.stringify(draft);',
      'let saves=0;',
      'function save(){saves++;}',
      'window.save=save;',
      "document.readyState='complete';",
      'window.requestIdleCallback=function(cb){cb();return 1;};',
      'warmVocabPool();',
      'const guard={same:queue.length===beforeQ.length&&queue.every((id,i)=>id===beforeQ[i])&&position===beforeP&&JSON.stringify(draft)===beforeD&&saves===0,saves,n:qids.length};'
    ].join('\n'):[
      how==='warm'?"document.readyState='complete';window.requestIdleCallback=function(cb){cb();return 1;};warmVocabPool();":'',
      how==='early'?"document.readyState='complete';var __idle=0;window.requestIdleCallback=function(cb){if(__idle++>=2)return 0;cb();return 1;};warmVocabPool();":'',
      'prepareVocabPool();',
      'const guard=null;'
    ].join('\n'),
    'const pool=mustPool();',
    'const ids=idsOf(pool);',
    'const lemmas=new Set(pool.map(q=>window.TrainerCore.lemmaKey(q))).size;',
    'const vocabIds=new Set(pool.flatMap(q=>q.vocabIds||[])).size;',
    'const foreign=pool.filter(q=>!q||q.topic!=="vocab"||q.wordRole!=="must").length;',
    how==='live'?'({partial,ids,lemmas,vocabIds,foreign,ready:vocabPoolReady,pool,questions,live:window,guard});':'({partial,ids,lemmas,vocabIds,foreign,ready:vocabPoolReady,guard});'
  ].join('\n');
  const result=vm.runInContext(body,ctx,{filename:'product-must-pool.js'});
  const out={partial:[...result.partial],ids:[...result.ids],lemmas:result.lemmas,vocabIds:result.vocabIds,foreign:result.foreign,ready:result.ready,guard:result.guard};
  if(how==='live'){out.pool=result.pool;out.questions=result.questions;out.live=result.live;}
  return out;
}
const freshPool=bootMust(null);
const after32=bootMust('3-2');
const after42=bootMust('4-2');
assert.deepEqual(after32.ids,freshPool.ids);
assert.deepEqual(after42.ids,freshPool.ids);
assert.ok(after32.partial.length>0&&after32.partial.length<freshPool.ids.length);
assert.ok(after42.partial.length>0&&after42.partial.length<freshPool.ids.length);
assert.ok(after32.partial.every(id=>freshPool.ids.includes(id)));
assert.ok(after42.partial.every(id=>freshPool.ids.includes(id)));
assert.equal(freshPool.foreign,0);
assert.equal(freshPool.lemmas,freshPool.vocabIds);
// TZ v6 pool. When lessons are added, update these three numbers together with the TZ.
assert.equal(freshPool.ids.length,566);
assert.equal(freshPool.lemmas,201);
assert.equal(freshPool.vocabIds,201);
assert.ok(freshPool.lemmas>0&&freshPool.lemmas<=freshPool.ids.length);
assert.ok(freshPool.ids.every(id=>id));
console.log('must pool from product path cards',freshPool.ids.length,'lemmaKey',freshPool.lemmas,'vocabIds',freshPool.vocabIds);
const warmed=bootMust(null,'warm');
const earlyTap=bootMust(null,'early');
assert.equal(freshPool.ready,true);
assert.equal(warmed.ready,true);
assert.equal(earlyTap.ready,true);
assert.deepEqual(warmed.ids,freshPool.ids);
assert.deepEqual(earlyTap.ids,freshPool.ids);
console.log('warm pool matches sync',warmed.ids.length,'early matches',earlyTap.ids.length);
const lessonGuard=bootMust('4-1','guard');
assert.equal(lessonGuard.ready,true,'P2-WARM-SAFE');
assert.equal(lessonGuard.guard&&lessonGuard.guard.same,true,'P2-WARM-SAFE');
assert.equal(lessonGuard.guard.saves,0,'P2-WARM-SAFE');
assert.ok(lessonGuard.guard.n>=3,'P2-WARM-SAFE');
console.log('P2-WARM-SAFE ok cards',lessonGuard.guard.n,'saves',lessonGuard.guard.saves);

const product=bootMust(null,'live');
const livePool=product.pool.filter(q=>q&&q.wordRole!=='used');
const KnowledgeLive=product.live.Knowledge;
for(const q of product.questions){if(q&&q.topic==='vocab'&&!q.skillBindings){try{KnowledgeLive.register(q);}catch(e){}}}
const hw=product.questions.find(q=>q.id==='hw31-02-kk');
const bank=product.questions.find(q=>q.id==='bank-8-kk');
assert.ok(hw&&bank);
const hwKeys=KnowledgeLive.bindings(hw).map(b=>KnowledgeLive.key?KnowledgeLive.key(b):b.item_id+'::'+b.skill_type);
const bankKeys=KnowledgeLive.bindings(bank).map(b=>KnowledgeLive.key?KnowledgeLive.key(b):b.item_id+'::'+b.skill_type);
const shared=hwKeys.find(k=>k.startsWith('word:')&&bankKeys.includes(k));
assert.ok(shared,hwKeys.join(',')+' vs '+bankKeys.join(','));
const pairState={records:Object.create(null),skills:Object.create(null),events:[]};
pairState.skills[shared]={review_count:2,next_review:dayNow+1000,needsReview:false,streak:2,mastery_level:'LEARNING',item_id:shared.split('::')[0],skill_type:shared.split('::')[1]};
KnowledgeLive.sync(pairState,[hw,bank]);
assert.equal(pairState.records[hw.id].next_review,dayNow+1000);
assert.equal(pairState.records[bank.id].next_review,dayNow+1000);
const pairPlan=VM.planPortion([Object.assign({},hw,{wordRole:'must'}),Object.assign({},bank,{wordRole:'must'})],pairState,cfg,core,dayNow);
assert.equal(pairPlan.ids.length,1);
assert.ok(pairPlan.ids[0].startsWith('hw'));

const rankOf=lesson=>{const m=String(lesson||'').match(/^(\d+)-(\d+)$/);return m?Number(m[1])*100+Number(m[2]):9999;};
const s2Now=new Date(2026,9,11,12,0,0).getTime();
const s2={records:Object.create(null),skills:Object.create(null),events:[],now:s2Now,seed:null};
const Sched=product.live.ReviewScheduler;
for(const q of livePool){
  if(rankOf(q.lessonId)>303)continue;
  let r=Sched.answer({},{at:s2Now-5*DAY,correct:true,hinted:false,recall:true});
  r=Sched.answer(r,{at:s2Now-3*DAY,correct:true,hinted:false,recall:true});
  s2.records[q.id]=r;
}
product.live.localStorage.setItem('qazaq-s2-pr3',JSON.stringify({now:s2.now,seed:s2.seed,records:s2.records}));
const loaded=JSON.parse(product.live.localStorage.getItem('qazaq-s2-pr3'));
assert.equal(loaded.now,s2Now);
assert.equal(loaded.seed,null);
const s2State={records:loaded.records,skills:{},events:[]};
// P2: S2 starts with real skill keys, so the «skills survive» check below is not empty.
for(const q of livePool){
  if(Object.keys(s2State.skills).length>=8)break;
  if(!s2State.records[q.id])continue;
  for(const b of KnowledgeLive.bindings(q)){
    const k=KnowledgeLive.key?KnowledgeLive.key(b):b.item_id+'::'+b.skill_type;
    if(!k.startsWith('word:')||s2State.skills[k])continue;
    s2State.skills[k]={review_count:2,next_review:s2Now+2*DAY,needsReview:false,streak:2,mastery_level:'LEARNING',item_id:b.item_id,skill_type:b.skill_type};
  }
}
const s2SkillKeys=Object.keys(s2State.skills);
assert.ok(s2SkillKeys.length>=5,'S2 skills seeded: '+s2SkillKeys.length);
const s2RecordKeys=Object.keys(s2State.records);
const s2Portions=[];
let s2Clock=s2Now;
for(let pass=0;pass<3;pass++){
  const portion=VM.planPortion(livePool,s2State,cfg,core,s2Clock);
  s2Portions.push(portion.ids.slice());
  const lemmas=portion.ids.map(id=>core.lemmaKey(livePool.find(q=>q.id===id)||{id}));
  assert.equal(new Set(lemmas).size,lemmas.length);
  for(const id of portion.ids){
    if(!String(id).startsWith('bank-'))continue;
    const lem=core.lemmaKey(livePool.find(q=>q.id===id)||{id});
    assert.ok(!portion.plan.newLemmas.includes(lem),id);
  }
  const before={};
  for(const id of portion.ids)before[id]=Number((s2State.records[id]||{}).review_count)||0;
  portion.ids.forEach((id,i)=>{
    const q=livePool.find(x=>x.id===id);
    VM.commitFirst({state:s2State,records:s2State.records,q,now:s2Clock,sessionId:'s2',presentation:pass*100+i,kind:'good',answers:['ok'],elapsed:4,core,observe:(s,card,result,event,errors,trainer)=>KnowledgeLive.observe(s,card,result,event,errors,Object.assign({},trainer,{must:true})),queue:portion.ids,position:i,pool:livePool,plan:portion.plan,sitting:VM.emptySitting(s2Clock),rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:portion.plan.budget,minGap:2,appearCap:3,hinted:false,recall:true});
    s2Clock+=10*60*1000;
  });
  KnowledgeLive.sync(s2State,livePool);
  for(const id of portion.ids)assert.ok(Number((s2State.records[id]||{}).review_count)>before[id],id);
}
assert.notDeepEqual(s2Portions[1],s2Portions[0]);
assert.notDeepEqual(s2Portions[2],s2Portions[0]);
for(const key of s2RecordKeys)assert.ok(Object.prototype.hasOwnProperty.call(s2State.records,key),key);
for(const key of s2SkillKeys)assert.ok(Object.prototype.hasOwnProperty.call(s2State.skills,key),key);

// P0-KK-REV-DIR: -kk-rev answers in Russian. A first answer today on hw1-1-kk-rev
// buries hw1-1-kk (the other direction) until tomorrow. Old regex (-kk-rev → kk) fails here.
assert.equal(core.answerLang({id:'hw1-1-kk-rev'}),'ru');
assert.equal(core.answerLang({id:'hw1-1-kk'}),'kk');
const revQ=livePool.find(q=>q.id==='hw1-1-kk-rev');
const revKk=livePool.find(q=>q.id==='hw1-1-kk');
assert.ok(revQ&&revKk,'hw1-1 pair in live pool');
assert.equal(core.lemmaKey(revQ),core.lemmaKey(revKk));
const revPool=[revQ,revKk];
const revState={records:Object.create(null),skills:Object.create(null),events:[]};
const revStart=VM.planPortion(revPool,revState,cfg,core,dayNow);
const revFirst=revPool.find(q=>q.id==='hw1-1-kk-rev');
VM.commitFirst({state:revState,records:revState.records,q:revFirst,now:dayNow,sessionId:'rev',presentation:0,kind:'good',answers:['Человек'],elapsed:4,core,observe:(s,card,result,event,errors,trainer)=>KnowledgeLive.observe(s,card,result,event,errors,Object.assign({},trainer,{must:true})),queue:[revFirst.id],position:0,pool:revPool,plan:revStart.plan,sitting:VM.emptySitting(dayNow),rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:revStart.plan.budget,minGap:2,appearCap:3,hinted:false,recall:true});
KnowledgeLive.sync(revState,revPool);
assert.ok(Number((revState.records[revQ.id]||{}).review_count)>0,'rev answered');
// +5 min: the rev card is not due yet, so only the bury keeps hw1-1-kk out.
const revSameDay=VM.planPortion(revPool,revState,cfg,core,dayNow+5*60*1000);
assert.ok(!revSameDay.ids.includes('hw1-1-kk'),'P0-KK-REV-DIR same day: '+revSameDay.ids.join(','));
// Second good answer after the learning step pushes the rev card past tomorrow.
const revAt2=dayNow+20*60*1000;
const revPlan2=VM.planPortion(revPool,revState,cfg,core,revAt2);
assert.ok(!revPlan2.ids.includes('hw1-1-kk'),'P0-KK-REV-DIR same day 2: '+revPlan2.ids.join(','));
VM.commitFirst({state:revState,records:revState.records,q:revFirst,now:revAt2,sessionId:'rev2',presentation:0,kind:'good',answers:['Человек'],elapsed:4,core,observe:(s,card,result,event,errors,trainer)=>KnowledgeLive.observe(s,card,result,event,errors,Object.assign({},trainer,{must:true})),queue:[revFirst.id],position:0,pool:revPool,plan:revPlan2.plan,sitting:VM.emptySitting(revAt2),rating:F.Rating.Good,errors:[],result:{correct:true,parts:[true]},budget:revPlan2.plan.budget,minGap:2,appearCap:3,hinted:false,recall:true});
KnowledgeLive.sync(revState,revPool);
assert.ok(revState.records[revQ.id].next_review>dayNow+DAY,'rev not due tomorrow');
const revNextDay=VM.planPortion(revPool,revState,cfg,core,dayNow+DAY);
assert.ok(revNextDay.ids.includes('hw1-1-kk'),'P0-KK-REV-DIR next day: '+revNextDay.ids.join(','));

const kkSet=livePool.filter(q=>/-kk-set$/.test(q.id));
const kkForm=livePool.filter(q=>/-kk-form-\d+$/.test(q.id));
assert.equal(kkSet.length,7);
assert.equal(kkForm.length,4);
const mismatches=[];
for(const q of livePool){
  const lang=core.answerLang(q);
  const word=(q.skillBindings||[]).find(b=>b&&String(b.item_id||'').startsWith('word:'));
  if(!word)continue;
  const expect=lang==='kk'?'production':lang==='ru'?'recognition':null;
  const numbers=word.skill_type==='digit_to_word'||word.skill_type==='word_to_digit';
  if(!expect||numbers)continue;
  if(word.skill_type!==expect)mismatches.push(q.id+' '+lang+' '+word.skill_type);
}
console.log('answerLang mismatches',mismatches.length);
assert.ok(!mismatches.some(m=>/-kk-rev /.test(m)),'kk-rev mismatches');
if(mismatches.length)console.log(mismatches.join('\n'));

// PR-4 §4.7. Debt is a lemma count for the log. It does not change nNew.
const bannedWords=['vocabMode','debtEnter','debtExit','debtSessionNewCap','debtDayNewCap','Сначала вспомним','Новых слов сегодня немного'];
for(const file of ['vocab-must.js','core.js','app.js','config.js','scheduler.js']){
  const src=fs.readFileSync(path.join(__dirname,file),'utf8');
  for(const word of bannedWords)assert.ok(!src.includes(word),'P4-NO-MODE '+file+' '+word);
}
const dueA=card('due-a','word:da'),dueB=card('due-b','word:db');
const dueOrderState=state();
dueOrderState.records['due-a']={review_count:2,seen:2,needsReview:false,streak:4,next_review:dayNow-DAY,dueAt:dayNow-DAY,last_answer:dayNow-2*DAY};
dueOrderState.records['due-b']={review_count:2,seen:2,needsReview:false,streak:4,next_review:dayNow-3*DAY,dueAt:dayNow-3*DAY,last_answer:dayNow-2*DAY};
assert.deepEqual(core.chooseShortSession([dueA,dueB],dueOrderState.records,dayNow,10,{}).map(q=>q.id),['due-b','due-a'],'chooseShortSession default due order');

function p4Rec(patch){return Object.assign({review_count:3,seen:3,needsReview:false,streak:4,last_answer:dayNow-2*DAY},patch);}
const nrHigh=card('nr-high','word:nrh'),nrNone=card('nr-none','word:nrn'),nrLow=card('nr-low','word:nrl');
const dueHigh=card('due-high','word:dh'),dueLow=card('due-low','word:dl'),learnLow=card('learn-low','word:ll');
const newB=card('new-b','word:nb'),newA=card('new-a','word:na');
const bucketPool=[newB,newA,nrHigh,nrNone,nrLow,dueHigh,dueLow,learnLow];
const bucketState=state();
bucketState.records['nr-high']=p4Rec({needsReview:true,streak:0,next_review:dayNow-10*DAY,dueAt:dayNow-10*DAY});
bucketState.records['nr-none']=p4Rec({needsReview:true,streak:0,next_review:dayNow-20*DAY,dueAt:dayNow-20*DAY});
bucketState.records['nr-low']=p4Rec({needsReview:true,streak:0,next_review:dayNow-DAY,dueAt:dayNow-DAY});
bucketState.records['due-high']=p4Rec({next_review:dayNow-3*DAY,dueAt:dayNow-3*DAY});
bucketState.records['due-low']=p4Rec({next_review:dayNow-2*DAY,dueAt:dayNow-2*DAY});
bucketState.records['learn-low']=p4Rec({streak:1,next_review:dayNow+10*DAY,dueAt:dayNow+10*DAY});
const bucketR={ 'nr-low':0.2,'nr-high':0.9,'nr-none':null,'due-low':0.1,'due-high':0.95,'learn-low':0.01 };
const bucketPlan=VM.planPortion(bucketPool,bucketState,cfg,core,dayNow,{retrievability:q=>bucketR[q.id]});
assert.equal(bucketPlan.plan.nNew,2,'P4-NNEW-WITH-DEBT');
assert.ok(bucketPlan.plan.debt>=3,'P4-DEBT-ON-PLAN '+bucketPlan.plan.debt);
assert.ok(bucketPlan.ids.indexOf('nr-low')<bucketPlan.ids.indexOf('nr-high'),'P4-BUCKET-ORDER');
assert.ok(bucketPlan.ids.indexOf('nr-high')<bucketPlan.ids.indexOf('nr-none'),'P4-NULL-R');
assert.deepEqual(bucketPlan.ids,['nr-low','nr-high','nr-none','due-low','new-b','new-a'],'P4-BUCKET-ORDER');
assert.ok(!bucketPlan.ids.includes('due-high')&&!bucketPlan.ids.includes('learn-low'),'P4-BUCKET-ORDER dropped');

const tieB=card('tie-b','word:tb'),tieA=card('tie-a','word:ta');
const tieState=state();
tieState.records['tie-b']=p4Rec({needsReview:true,streak:0,next_review:dayNow-DAY,dueAt:dayNow-DAY});
tieState.records['tie-a']=p4Rec({needsReview:true,streak:0,next_review:dayNow-DAY,dueAt:dayNow-DAY});
const tiePlan=VM.planPortion([tieB,tieA,card('tie-new-1','word:tn1'),card('tie-new-2','word:tn2')],tieState,cfg,core,dayNow,{retrievability:()=>0.5});
assert.deepEqual(tiePlan.ids.slice(0,2),['tie-a','tie-b'],'P4-TIE-ID');
const earlyDue=card('z-early','word:ze'),lateDue=card('a-late','word:al');
const dueTieState=state();
dueTieState.records['z-early']=p4Rec({next_review:dayNow-5*DAY,dueAt:dayNow-5*DAY});
dueTieState.records['a-late']=p4Rec({next_review:dayNow-DAY,dueAt:dayNow-DAY});
const dueTiePlan=VM.planPortion([lateDue,earlyDue,card('due-new-1','word:dn1'),card('due-new-2','word:dn2')],dueTieState,cfg,core,dayNow,{retrievability:()=>0.4});
assert.deepEqual(dueTiePlan.ids.slice(0,2),['z-early','a-late'],'P4-TIE-DUE');

const twinA=card('hw-twin','word:twin'),twinB=card('bank-twin','word:twin');
const laterCard=card('later','word:later'),needCard=card('need','word:need'),freshCard=card('fresh-1','word:fresh');
const debtState=state();
debtState.records[twinA.id]=p4Rec({next_review:dayNow-DAY,dueAt:dayNow-DAY});
debtState.records[twinB.id]=p4Rec({next_review:dayNow-2*DAY,dueAt:dayNow-2*DAY});
debtState.records[laterCard.id]=p4Rec({next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY});
debtState.records[needCard.id]=p4Rec({needsReview:true,streak:0,next_review:dayNow+5*DAY,dueAt:dayNow+5*DAY});
const debtPool=[twinA,twinB,laterCard,needCard,freshCard];
assert.deepEqual(VM.debtLemmas(debtPool,debtState,core,dayNow),['word:need','word:twin'],'P4-DEBT-LEMMA');
assert.equal(VM.planPortion(debtPool,debtState,cfg,core,dayNow).plan.debt,2,'P4-DEBT-LEMMA');

// 30-day break: 5 days × 3 portions, then +30 days. Seed is the fixed clock and the 4-of-5 Good sequence.
const p4Start=new Date(2026,0,5,12,0,0).getTime();
const p4Pool=[];
for(let i=0;i<40;i++)p4Pool.push(card('p4-'+String(i).padStart(2,'0'),'word:p4-'+String(i).padStart(2,'0')));
const p4State={records:Object.create(null),skills:Object.create(null),events:[]};
function p4Answer(portion,now,tag,correctAt){
  portion.ids.forEach((id,i)=>{
    const q=p4Pool.find(c=>c.id===id);
    const correct=correctAt(i);
    VM.commitFirst({state:p4State,records:p4State.records,q,now:now+i*60000,sessionId:'p4',presentation:tag*100+i,kind:correct?'good':'wrong',answers:['ok'],elapsed:4,core,observe:()=>[],queue:portion.ids,position:i,pool:p4Pool,plan:portion.plan,sitting:VM.emptySitting(now),rating:correct?F.Rating.Good:F.Rating.Again,errors:[],result:{correct,parts:[correct]},budget:portion.plan.budget,minGap:2,appearCap:3,hinted:false,recall:true});
  });
}
for(let day=0;day<5;day++){
  for(let p=0;p<3;p++){
    const now=p4Start+day*DAY+p*3600000;
    const portion=VM.planPortion(p4Pool,p4State,cfg,core,now,{retrievability:q=>Scheduler.retrievability(p4State.records[q.id],now)});
    p4Answer(portion,now,day*10+p,()=>true);
  }
}
const breakNow=p4Start+4*DAY+30*DAY;
const cohort=VM.debtLemmas(p4Pool,p4State,core,breakNow);
assert.ok(cohort.length>0,'P4-COHORT-MELTS start '+cohort.length);
function p4NrLemmas(){
  const out=new Set();
  for(const q of p4Pool){
    const rec=p4State.records[q.id];
    if(rec&&rec.needsReview)out.add(core.lemmaKey(q));
  }
  return out;
}
const nrAtBreak=p4NrLemmas();
function p4NewLeft(){
  const seen=new Set();
  let n=0;
  for(const q of p4Pool){
    const lem=core.lemmaKey(q);
    if(seen.has(lem))continue;
    seen.add(lem);
    const rec=p4State.records[q.id];
    if(!(rec&&Number(rec.review_count)>0))n++;
  }
  return n;
}
console.log('P4 break debt',cohort.length);
for(let p=0;p<10;p++){
  const now=breakNow+p*3600000;
  const leftBefore=p4NewLeft();
  const portion=VM.planPortion(p4Pool,p4State,cfg,core,now,{retrievability:q=>Scheduler.retrievability(p4State.records[q.id],now)});
  assert.equal(portion.plan.nNew,Math.min(2,leftBefore),'P4-NNEW-WITH-DEBT portion '+p);
  const reviews=portion.ids.filter(id=>!portion.plan.newLemmas.includes(core.lemmaKey(p4Pool.find(c=>c.id===id)||{id})));
  const still=VM.debtLemmas(p4Pool,p4State,core,now).filter(lem=>cohort.includes(lem)).length;
  const nrNow=p4NrLemmas();
  let freshNr=0;
  for(const lem of nrNow)if(!nrAtBreak.has(lem))freshNr++;
  console.log('P4 portion',p,'debt',portion.plan.debt,'cohort',still,'new',portion.plan.nNew,'reviews',reviews.length,'freshNr',freshNr,'newLemmas',portion.plan.newLemmas.length);
  if(p===0){
    let prevBucket=-1,lastR=null,missing=false;
    for(const id of reviews){
      const rec=p4State.records[id]||{};
      const bucket=rec.needsReview?0:(core.isDue(rec,now)?1:2);
      assert.ok(bucket>=prevBucket,'P4-BUCKET-ORDER live '+id);
      if(bucket!==prevBucket){lastR=null;missing=false;prevBucket=bucket;}
      if(bucket>1)continue;
      const R=Scheduler.retrievability(rec,now);
      const none=R==null||Number.isNaN(R);
      if(none){missing=true;continue;}
      assert.ok(!missing,'P4-NULL-R '+id);
      if(lastR!=null)assert.ok(R+1e-9>=lastR,'P4-BUCKET-ORDER R '+id);
      lastR=R;
    }
  }
  p4Answer(portion,now,1000+p,i=>i%5!==4);
}
const cohortLeft=VM.debtLemmas(p4Pool,p4State,core,breakNow+10*3600000).filter(lem=>cohort.includes(lem));
assert.ok(cohortLeft.length<cohort.length,'P4-COHORT-MELTS '+cohortLeft.length+'/'+cohort.length);
console.log('P4 cohort',cohort.length,'->',cohortLeft.length);

const diag=require('./diagnostics.js');
function ruCard(id,lemma,answer,field){
  const f=Object.assign({answers:[answer],kind:'text'},field||{});
  return {id,topic:'vocab',wordRole:'must',kind:'fields',title:'Переведи на русский',stimulus:lemma,fields:[f],vocabIds:[lemma],skillBindings:[{item_id:lemma,skill_type:'recognition',field:0}]};
}
function ev(q,typed,catalog){
  return core.evaluate(q,[typed],{must:true,questions:catalog||[q]});
}
const girl=ruCard('girl-ru','word:girl','девушка');
const teacher=ruCard('teacher-ru','word:teacher','учитель');
const house=ruCard('house-ru','word:house','дом');
const student=ruCard('hw3-8-ru','word:student','студент');
const tree=ruCard('tree-ru','word:tree','ёлка');
const son=ruCard('son-ru','word:son','сын');
const dream=ruCard('dream-ru','word:dream','сон');
const chair=ruCard('chair-ru','word:chair','стул');
const kkTeacher=ruCard('teacher-kk','word:teacher-kk','мұғалім');
const studentKk=ruCard('hw3-8-kk','word:student-kk','студент');
const formCard=ruCard('v2-4-2-vocab-qalaisyn-kk-form-1','word:qalai','қалайсың');
const setCard=ruCard('v2-4-1-vocab-also-kk-set','word:also','да',{kind:'set-text',answers:['да','де','та','те']});
const rev=ruCard('hw1-1-kk-rev','word:rev','девушка');
const transpose=ruCard('swap-ru','word:swap','учитель');
const ice=ruCard('ice-ru','word:ice','медь');
const iceDup=ruCard('ice-dup-ru','word:ice','мед');
const honey=ruCard('honey-ru','word:honey','мёд');
const kkLookalike=ruCard('look-kk','word:look','доь');
const numCard=ruCard('num-ru','word:num','5',{kind:'number-text',answers:['5']});
const sylCard=ruCard('syl-ru','word:syl','ма-ма',{kind:'syllables',answers:['ма-ма']});
const p5=[];
function row(name,result,expect){
  const got=!result.correct?'ошибка':result.nearMiss?'почти': 'верно';
  p5.push(name+' '+got);
  assert.equal(got,expect,name+' '+JSON.stringify(result));
}
assert.notEqual(core.normalize('ёлка'),core.normalize('елка'),'P5-YO-GLOBAL');
assert.equal(core.answerLang(rev),'ru','P5-KK-REV-LANG');
assert.equal(core.answerLang(formCard),'kk','P5-FORM-LANG');
assert.equal(core.answerLang(setCard),'kk','P5-SET-LANG');
row('девушко',ev(girl,'девушко'),'почти');
row('учитиль',ev(teacher,'учитиль'),'почти');
row('доь',ev(house,'доь'),'почти');
row('студет',ev(student,'студет'),'почти');
row('елка',ev(tree,'елка'),'верно');
row('ёлкы',ev(tree,'ёлкы'),'почти');
assert.equal(ev(tree,'ёлкы').nearMiss.expected,'ёлка','P5-YO-DISPLAY');
row('сон-коллизия',ev(son,'сон',[son,dream]),'ошибка');
row('сон-без-коллизии',ev(son,'сон',[son]),'почти');
row('сон-эталон',ev(dream,'сон',[son,dream]),'верно');
row('столы',ev(chair,'столы'),'ошибка');
row('две-опечатки',ev(girl,'девушкко'),'ошибка');
row('kk-мугалим',ev(kkTeacher,'мугалим'),'ошибка');
row('kk-студет',ev(studentKk,'студет'),'ошибка');
row('kk-form',ev(formCard,'калайсын'),'ошибка');
row('kk-set',ev(setCard,'до де та те'),'ошибка');
row('used',core.evaluate(girl,['девушко']),'ошибка');
row('used-explicit',core.evaluate(girl,['девушко'],{must:false,questions:[girl]}),'ошибка');
row('kk-rev',ev(rev,'девушко'),'почти');
row('transpose',ev(transpose,'учитлеь'),'почти');
row('d07a',ev(house,'доь',[house,kkLookalike]),'почти');
row('d07b',ev(ice,'мед',[ice,honey]),'ошибка');
row('d07b-yo',ev(ice,'мёд',[ice,honey]),'ошибка');
row('d07-same-lemma',ev(ice,'мед',[ice,iceDup]),'почти');
row('number',ev(numCard,'6'),'ошибка');
row('syllables',ev(sylCard,'ма-мо'),'ошибка');
const exactYo=ev(tree,'елка');
assert.equal(exactYo.nearMiss,undefined,'P5-YO-EXACT');
assert.equal(ev(girl,'девушко').nearMiss.field,0,'P5-FIELD');
assert.equal(ev(girl,'Девушко').nearMiss.typed,'Девушко','P5-TYPED-RAW');
const mix={id:'mix-ru',kind:'fields',topic:'vocab',wordRole:'must',title:'t',stimulus:'mix',vocabIds:['word:mix'],fields:[{answers:['дом'],kind:'text'},{answers:['кот'],kind:'text'}],skillBindings:[{item_id:'word:mix',skill_type:'recognition',field:0},{item_id:'word:mixb',skill_type:'recognition',field:1}]};
const mixRes=core.evaluate(mix,['доь','пес'],{must:true,questions:[mix]});
assert.deepEqual(mixRes.parts,[true,false],'P5-MIX-PARTS');
assert.equal(mixRes.correct,false,'P5-MIX-CORRECT');
assert.equal(mixRes.nearMiss.field,0,'P5-MIX-NEAR');
assert.equal(VM.recordsMiss(mixRes),true,'P5-MIX-STILL-MISS');
const nearGirl=ev(girl,'девушко');
assert.equal(VM.recordsMiss(nearGirl),false,'P5-RECORDS-MISS');
assert.equal(diag.diagnose(girl,['девушко'],nearGirl,10).length,0,'P5-DIAG-EMPTY');
const wrongGirl=ev(girl,'zzzz');
assert.ok(diag.diagnose(girl,['zzzz'],wrongGirl,10).length>0,'P5-DIAG-WRITES');
const box={confusions:Object.create(null),errors:[]};
if(VM.recordsMiss(nearGirl))progress.observeConfusions(box,girl,['девушко'],nearGirl,10,new Map(),false);
assert.equal(Object.keys(box.confusions).length,0,'P5-NO-CONFUSION');
assert.equal(box.errors.length,0,'P5-NO-ERROR');
const boxWrong={confusions:Object.create(null),errors:[]};
progress.observeConfusions(boxWrong,girl,['zzzz'],wrongGirl,10,new Map(),false);
assert.equal(Object.keys(boxWrong.confusions).length,1,'P5-CONFUSION-CONTROL');
assert.equal(!nearGirl.correct,false,'P5-BLIND-FAIL');
const at=1700000000000;
const seeded=Scheduler.migrate({needsReview:true,correct_streak:0,review_count:1,seen:1,correct_count:0,wrong_count:1},at);
const afterHard=Scheduler.answer(seeded,{at,correct:true,hinted:false,rating:F.Rating.Hard,recall:true});
assert.equal(afterHard.needsReview,true,'P5-NEEDS-REVIEW');
assert.equal(afterHard.correct_streak,1,'P5-STREAK');
assert.equal(afterHard.recall_review_successes,0,'P5-RECALL-NOT-SPACED');
assert.equal(afterHard.fsrs_log.rating,F.Rating.Hard,'P5-CARD-RATING');
assert.equal(F.Rating.Hard,2,'P5-RATING-2');
const packState=state();
packState.records[girl.id]=Scheduler.migrate(seeded,at);
packState.skills['word:girl::recognition']=Scheduler.migrate(seeded,at);
const p5Sitting=VM.emptySitting(at);
const pack=VM.commitFirst({state:packState,records:packState.records,q:girl,now:at,sessionId:'s5',presentation:0,kind:'good',answers:['девушко'],elapsed:80,core,observe:(a,b,c,d,e,f)=>Knowledge.observe(a,b,c,d,e,f),queue:[girl.id],position:0,pool:[girl],plan:{budget:10,nNew:0,newLemmas:[]},sitting:p5Sitting,rating:F.Rating.Hard,errors:[],result:nearGirl,hinted:false,recall:true});
assert.equal(pack.retry,null,'P5-NO-RETRY');
assert.equal(pack.event.correct,true,'P5-EVENT-CORRECT');
assert.equal(pack.event.hinted,false,'P5-EVENT-UNAIDED');
assert.equal(pack.event.first_try_correct,1,'P5-SELF');
assert.equal(pack.event.near_miss,1,'P5-EVENT-FLAG');
assert.equal(pack.event.typed,'девушко','P5-EVENT-TYPED');
assert.equal(pack.event.expected,'девушка','P5-EVENT-EXPECTED');
assert.equal(pack.event.rating,2,'P5-EVENT-RATING');
assert.equal(pack.record.fsrs_log.rating,F.Rating.Hard,'P5-CARD-LOG');
const p5Skill=packState.skills['word:girl::recognition'];
assert.equal(p5Skill.fsrs_log.rating,F.Rating.Hard,'P5-SKILL-LOG');
assert.equal(pack.record.next_review,p5Skill.next_review,'P5-NEXT-REVIEW');
assert.equal(p5Skill.needsReview,true,'P5-SKILL-NEEDS');
assert.equal(p5Skill.correct_streak,1,'P5-SKILL-STREAK');
assert.equal(VM.wordLine(packState,p5Sitting,{cardId:girl.id,lemma:'word:girl'}),'почти точно','P5-WORDLINE');
assert.equal(packState.errors.length,0,'P5-COMMIT-ERRORS');
const p5Kept=progress.migrate(packState);
const keptEvent=p5Kept.events.find(e=>e.card_id===girl.id);
assert.equal(keptEvent.near_miss,1,'P5-MIGRATE-FLAG');
assert.equal(keptEvent.typed,'девушко','P5-MIGRATE-TYPED');
assert.equal(keptEvent.expected,'девушка','P5-MIGRATE-EXPECTED');
assert.equal(keptEvent.rating,2,'P5-MIGRATE-RATING');
const html=VM.nearMissFeedbackHtml('девушка',s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
assert.equal(html,'<h3>Почти точно</h3><p>Правильно пишется: <strong>девушка</strong></p>','P5-HTML');
assert.equal(VM.learnerTextOk(html),true,'P5-HTML-TEXT');
assert.ok(!html.includes('vocab-attempt-strike')&&!/style=/.test(html),'P5-HTML-PLAIN');
const nearBranch=check.split('if(mustNear){')[1].split('}else if(vocabWrong)')[0];
assert.ok(nearBranch.includes('nearMissFeedbackHtml'),'P5-SCREEN');
assert.ok(!nearBranch.includes('vocab-attempt-strike')&&!nearBranch.includes('Ещё раз'),'P5-NO-STRIKE');
assert.ok(check.includes('else if(mustNear)rating=F.Rating.Hard'),'P5-HARD-BRANCH');
assert.ok(check.includes('||mustNear?[]:window.ErrorDiagnostics.diagnose'),'P5-SKIP-DIAG');
assert.ok(check.includes('&&!mustNear)P.observeConfusions'),'P5-SKIP-CONFUSION');
assert.ok(check.includes('isVocabMustTrainer()?{must:true,questions}:undefined'),'P5-CTX');
const retrySrc=check.split('if(retrying)')[1].split('const answers=readAnswers(q), warning')[1].split('if(isVocabMustTrainer()&&window.VocabMust)')[0];
assert.ok(retrySrc.includes('core.evaluate(q,answers);')&&!retrySrc.includes('must:true'),'P5-RETRY-STRICT');
assert.ok(check.includes('if(!hinted&&!result.correct)sessionBlindFails'),'P5-BLIND-LINE');
console.log('P5 cases',p5.join(' | '));

function p5Rate(opts){
  const src=check.slice(check.indexOf('const mustNear='),check.indexOf('const previous='));
  const fn=new Function('result','hinted','rulePeeked','examTimedOut','mode','isVocabMustTrainer','F','window',src+'\nreturn rating;');
  return fn(opts.result,!!opts.hinted,!!opts.rulePeeked,false,opts.mode||'words',()=>opts.must!==false,F,{VocabMust:VM});
}
function p5Pack(tag,result,opts){
  const st=state();
  st.records[girl.id]=Scheduler.migrate({needsReview:true,correct_streak:0,review_count:1,seen:1,correct_count:0,wrong_count:1},at);
  st.skills['word:girl::recognition']=Scheduler.migrate({needsReview:true,correct_streak:0,review_count:1,seen:1,correct_count:0,wrong_count:1},at);
  const helped=!!(opts.hinted||opts.rulePeeked);
  const pack=VM.commitFirst({state:st,records:st.records,q:girl,now:at,sessionId:'s5'+tag,presentation:tag,kind:helped?'assisted':'good',answers:[opts.typed],elapsed:80,core,observe:(a,b,c,d,e,f)=>Knowledge.observe(a,b,c,d,e,f),queue:[girl.id],position:0,pool:[girl],plan:{budget:10,nNew:0,newLemmas:[]},sitting:VM.emptySitting(at),rating:p5Rate(Object.assign({result,must:opts.must},opts)),errors:[],result,hinted:helped,recall:true});
  return {st,pack,line:VM.wordLine(st,VM.emptySitting(at),{cardId:girl.id,lemma:'word:girl'})};
}
const hintPack=p5Pack(1,nearGirl,{hinted:true,typed:'девушко'});
assert.equal(hintPack.pack.record.fsrs_log.rating,F.Rating.Again,'P5-HINT-AGAIN');
assert.equal(hintPack.line,'с подсказкой','P5-HINT-LINE');
assert.equal(hintPack.pack.event.near_miss,1,'P5-HINT-FLAG');
assert.equal(hintPack.st.errors.length,0,'P5-HINT-ERRORS');
const peekNear=p5Pack(2,nearGirl,{rulePeeked:true,typed:'девушко'});
assert.equal(peekNear.pack.record.fsrs_log.rating,F.Rating.Again,'P5-PEEK-NEAR');
assert.equal(peekNear.pack.event.first_try_correct,0,'P5-PEEK-ASSISTED');
assert.equal(peekNear.pack.event.hinted,true,'P5-PEEK-HINTED');
assert.equal(peekNear.line,'с подсказкой','P5-PEEK-LINE');
assert.equal(peekNear.pack.event.near_miss,1,'P5-PEEK-FLAG');
assert.equal(peekNear.st.errors.length,0,'P5-PEEK-ERRORS');
const exactGirl=ev(girl,'девушка');
const peekExact=p5Pack(3,exactGirl,{rulePeeked:true,typed:'девушка'});
assert.equal(peekExact.pack.record.fsrs_log.rating,F.Rating.Again,'P5-PEEK-EXACT');
assert.equal(peekExact.line,'с подсказкой','P5-PEEK-EXACT-LINE');
assert.equal(p5Rate({result:exactGirl,rulePeeked:true,must:false}),F.Rating.Good,'P5-OTHER-PEEK');
function p5Advance(mustNear){
  const start=check.lastIndexOf('cancelAdvance();');
  let block=check.slice(start).trim();
  if(block.endsWith('}'))block=block.slice(0,-1);
  const fn=new Function('result','reveal','mustNear',`
    let advanceTimer=null,moved=false,focused=false,delay=null,fire=null;
    const nextBtn={hidden:true,focus(){focused=true;}};
    const checkBtn={hidden:false};
    const $=sel=>sel==='#next-button'?nextBtn:sel==='#check-button'?checkBtn:null;
    function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}
    function nextQuestion(){moved=true;}
    const setTimeout=(cb,ms)=>{delay=ms;fire=cb;return 1;};
    const clearTimeout=()=>{};
    ${block}
    return {nextBtn,armed(){return !!advanceTimer;},moved(){return moved;},focused(){return focused;},press(){nextQuestion();},delay:()=>delay,fire:()=>fire};
  `);
  return fn({correct:true},false,mustNear);
}
const stay=p5Advance(true);
assert.equal(stay.moved(),false,'P5-NO-AUTO');
assert.equal(stay.delay(),null,'P5-NO-AUTO-TIMER');
assert.equal(stay.nextBtn.hidden,false,'P5-NEXT-SHOWN');
assert.equal(stay.focused(),true,'P5-NEXT-FOCUS');
stay.press();
assert.equal(stay.moved(),true,'P5-NEXT-GOES');
const go=p5Advance(false);
assert.equal(go.delay(),400,'P5-AUTO-ARMED');
go.fire()();
assert.equal(go.moved(),true,'P5-AUTO');

const p6Sit=()=>{const s=VM.emptySitting(1);s.sessions=['s'];return s;};
const p6Ans=(cardId,patch)=>Object.assign({type:'answer',session_id:'s',presentation:0,card_id:cardId,correct:true,hinted:false,idk:0,peek:0,rule_peek:0,at:1},patch||{});
VM.noteShown(p6Sit(),'word:a');
const shownOnce=p6Sit();
VM.noteShown(shownOnce,'word:a');
VM.noteShown(shownOnce,'word:a');
assert.deepEqual(shownOnce.shown,['word:a'],'P6-SHOWN-ONCE');
const shownPlan=p6Sit();
shownPlan.shown=['word:a'];
const planOnly=VM.summaryRows(state(),shownPlan,[card('A','word:a'),card('C','word:c')],core,1000);
assert.deepEqual(planOnly.rows.map(r=>r.lemma),['word:a'],'P6-SHOWN-NOT-PLAN');
const worstState=state();
const worstSit=p6Sit();
worstSit.shown=['word:a'];
worstSit.newLemmas=['word:a'];
worstState.events=[
  p6Ans('A',{presentation:0,correct:false,idk:1,hinted:true,at:1}),
  {type:'retry_close',session_id:'s',presentation:0,card_id:'A',correct:true,hinted:true,at:2},
  p6Ans('A',{presentation:1,correct:true,at:3}),
  p6Ans('A',{presentation:2,correct:true,at:4})
];
assert.equal(VM.wordLine(worstState,worstSit,{cardId:'A',lemma:'word:a'}),'с подсказкой','P6-WORST');
const worstRow=VM.summaryRows(worstState,worstSit,[card('A','word:a')],core,1000).rows[0];
assert.equal(worstRow.label,'с подсказкой','P6-WORST');
assert.equal(worstRow.fresh,true,'P6-NEW');
const nearState=state();
const nearSit=p6Sit();
nearSit.shown=['word:a'];
nearSit.sessions=['p1','p2'];
nearState.events=[p6Ans('A',{session_id:'p1',near_miss:1,at:1})];
assert.equal(VM.wordLine(nearState,nearSit,{cardId:'A',lemma:'word:a'}),'почти точно','P6-NEAR');
const nearModel=VM.summaryRows(nearState,nearSit,[card('A','word:a')],core,1000);
assert.equal(nearModel.rows[0].label,'почти точно','P6-NEAR');
assert.equal(nearModel.unaided,1,'P6-TALLY');
assert.equal(nearModel.assisted,0,'P6-TALLY');
const cleanModel=VM.summaryRows(state(),Object.assign(p6Sit(),{shown:['word:b'],sessions:['s']}),[card('B','word:b')],core,1000);
cleanModel; // shown only, no events
const cleanState=state();
const cleanSit=p6Sit();
cleanSit.shown=['word:b'];
cleanState.events=[p6Ans('B',{at:1})];
const cleanRow=VM.summaryRows(cleanState,cleanSit,[card('B','word:b')],core,1000);
assert.equal(cleanRow.rows[0].label,'вспомнила сама','P6-TALLY');
assert.equal(VM.wordLine(cleanState,cleanSit,{cardId:'B',lemma:'word:b'}),'самостоятельно','P6-TALLY');
assert.equal(cleanRow.unaided,1,'P6-TALLY');
const p6LegacySit=p6Sit();
p6LegacySit.shown=['word:h'];
p6LegacySit.legacy={sessionCorrect:0,sessionAssisted:0,boundaryAt:0,openIdk:{cardId:'H',lemma:'word:h'}};
const legacyModel=VM.summaryRows(state(),p6LegacySit,[card('H','word:h')],core,1000);
assert.equal(VM.wordLine(state(),p6LegacySit,{cardId:'H',lemma:'word:h'}),'с подсказкой','P6-LEGACY');
assert.equal(legacyModel.rows[0].label,'с подсказкой','P6-LEGACY');
assert.equal(legacyModel.rows[0].fresh,false,'P6-LEGACY');
assert.equal(legacyModel.assisted,0,'P6-LEGACY');
assert.equal(legacyModel.unaided,0,'P6-LEGACY');
const cloudSit=p6Sit();
cloudSit.sessions=['local'];
cloudSit.shown=['word:a'];
const cloudState=state();
cloudState.events=[p6Ans('A',{session_id:'cloud',correct:true,at:1})];
assert.equal(VM.wordLine(cloudState,cloudSit,{cardId:'A',lemma:'word:a'}),'Без ответа','P6-CLOUD');
assert.equal(VM.summaryRows(cloudState,cloudSit,[card('A','word:a')],core,1000).rows[0].label,'Без ответа','P6-CLOUD');
assert.equal(VM.recount(cloudState,cloudSit).closed,0,'P6-CLOUD');
function p6When(id,lemma,record,events,pool,now){
  const st=state();
  st.records[id]=record;
  st.events=events||[];
  const sit=VM.emptySitting(now);
  sit.sessions=['s'];
  sit.shown=[lemma];
  return VM.summaryRows(st,sit,pool,core,now).rows[0].when;
}
const soonNow=new Date(2026,9,11,15,0,0).getTime();
const soonLater=new Date(2026,9,21,15,0,0).getTime();
assert.equal(p6When('soon','word:soon',{review_count:1,needsReview:true,next_review:soonLater,last_answer:soonNow-86400000},[{type:'answer',card_id:'soon',at:soonNow-86400000,correct:true}],[card('soon','word:soon')],soonNow),'скоро','P6-WHEN-SOON');
const dayNow6=new Date(2026,9,11,15,0,0).getTime();
const tomorrow6=new Date(2026,9,12,9,0,0).getTime();
const plus3=new Date(2026,9,14,9,0,0).getTime();
assert.equal(p6When('day','word:day',{review_count:1,needsReview:false,next_review:tomorrow6,last_answer:dayNow6-86400000},[{type:'answer',card_id:'day',at:dayNow6-86400000,correct:true}],[card('day','word:day')],dayNow6),'завтра','P6-WHEN-DAY');
assert.equal(p6When('day3','word:day3',{review_count:1,needsReview:false,next_review:plus3,last_answer:dayNow6-86400000},[{type:'answer',card_id:'day3',at:dayNow6-86400000,correct:true}],[card('day3','word:day3')],dayNow6),'через 3 дня','P6-WHEN-DAY');
assert.equal(p6When('none','word:none',{review_count:1,needsReview:false,last_answer:dayNow6-86400000},[{type:'answer',card_id:'none',at:dayNow6-86400000,correct:true}],[card('none','word:none')],dayNow6),'','P6-WHEN-NONE');
const buryNow=new Date(2026,9,11,15,0,0).getTime();
const buryTomorrow=new Date(2026,9,12,9,0,0).getTime();
const buryLater=new Date(2026,9,16,9,0,0).getTime();
const buryKk=dirCard('bury-kk','word:bury','production');
const buryRu=dirCard('bury-ru','word:bury','recognition');
const buryState=state();
buryState.records[buryKk.id]={review_count:1,needsReview:false,next_review:buryTomorrow,last_answer:buryNow};
buryState.records[buryRu.id]={review_count:0,needsReview:false,next_review:buryLater};
buryState.events=[{type:'answer',card_id:buryKk.id,at:buryNow,correct:true}];
const burySit=VM.emptySitting(buryNow);
burySit.sessions=['s'];
burySit.shown=['word:bury'];
assert.equal(VM.summaryRows(buryState,burySit,[buryKk,buryRu],core,buryNow).rows[0].when,'завтра','P6-WHEN-BURY');
const rowSit=p6Sit();
rowSit.shown=['word:a','word:a','word:b'];
const rowPool=[card('A','word:a'),card('B','word:b'),card('C','word:c')];
for(let i=0;i<28;i++){rowSit.shown.push('word:n'+i);rowPool.push(card('N'+i,'word:n'+i));}
const rowModel=VM.summaryRows(state(),rowSit,rowPool,core,1000);
assert.equal(rowModel.rows.length,30,'P6-ROWS');
assert.deepEqual(rowModel.rows.map(r=>r.lemma).slice(0,2),['word:a','word:b'],'P6-ROWS');
assert.ok(!rowModel.rows.some(r=>r.lemma==='word:c'),'P6-ROWS');
const keptShown=rowSit.shown.slice();
const p6Snap=VM.snapshot({plan:VM.emptyPlan(10),sitting:rowSit,retry:null,closed:[],unaided:{},blindFails:{}});
const p6Restored=VM.restoreSaved({mode:'words',trainerReturn:'vocab:must',queue:['A'],position:0,queueEpoch:'s',vocab:p6Snap},state(),cfg,5);
assert.deepEqual(p6Restored.vocab.sitting.shown,keptShown,'P6-ROWS');
const shownBefore=p6Restored.vocab.sitting.shown.length;
VM.noteShown(p6Restored.vocab.sitting,'word:a');
assert.equal(p6Restored.vocab.sitting.shown.length,shownBefore,'P6-ROWS');
const paintSrc=app.slice(app.indexOf('function paintVocabSummary'),app.indexOf('function continueVocabSummary'));
const contSrc=app.slice(app.indexOf('function continueVocabSummary'),app.indexOf('function endMustToTrainers'));
const endSrc=app.slice(app.indexOf('function endMustToTrainers'),app.indexOf('function openVocabSummary'));
const openSrc=app.slice(app.indexOf('function openVocabSummary'),app.indexOf('function captureMustLive'));
assert.ok(paintSrc.indexOf('vocab-summary-continue')<paintSrc.indexOf('vocab-summary-list'),'P6-BUTTONS-ABOVE');
assert.ok(paintSrc.includes('<h2>Итог</h2>'),'P6-TEXT');
assert.ok(paintSrc.includes('Самостоятельно: '), 'P6-TEXT');
assert.ok(paintSrc.includes('С подсказкой: '), 'P6-TEXT');
assert.ok(paintSrc.includes('Когда вернётся: '), 'P6-TEXT');
assert.ok(!/интервал|FSRS|из N|закончились|на сегодня всё|retrieval|Again/.test(paintSrc+contSrc+endSrc+openSrc),'P6-TEXT');
assert.ok(contSrc.includes('render()'),'P6-CONTINUE-SRC');
assert.ok(!contSrc.includes('resetCounts'),'P6-CONTINUE-SRC');
assert.ok(!contSrc.includes('beginMustPortion(true)'),'P6-CONTINUE-SRC');
assert.ok(!/commitFirst|noteShown/.test(paintSrc+contSrc+endSrc+openSrc),'P6-NO-GRADE');
const head=indexHtml.slice(indexHtml.indexOf('class="practice-head"'),indexHtml.indexOf('id="session-position"'));
assert.ok(head.includes('id="vocab-finish"')&&head.includes('practice-head-tools')&&head.includes('>Закончить</button>'),'P6-FINISH-BTN');
assert.ok(!head.includes('secondary-actions'),'P6-FINISH-BTN');
const dockAt=app.indexOf('id="practice-dock"');
const dock=app.slice(dockAt,dockAt+1400);
assert.ok(dock.includes('secondary-actions')&&!dock.includes('vocab-finish'),'P6-FINISH-BTN');
const tools=fs.readFileSync(path.join(__dirname,'theme-redesign.css'),'utf8').split('.practice-head-tools{')[1].split('}')[0];
assert.ok(tools&&!/#|rgb|hsl/.test(tools),'P6-COLOR');
const rendSrc=app.slice(app.indexOf('function render()'),app.indexOf('function hintEvent'));
assert.ok(rendSrc.includes('vocabNear')&&rendSrc.includes('nearMissFeedbackHtml')&&!rendSrc.includes('advanceTimer=setTimeout'),'P6-CONTINUE-SRC');

function p6fHarness(){
  const showSrc=app.slice(app.indexOf('function showView(next){'),app.indexOf('function shellTab(next){'));
  const openSrc=app.slice(app.indexOf('function openVocabSummary(){'),app.indexOf('function rememberVocabCard(){'));
  const contSrcF=app.slice(app.indexOf('function continueVocabSummary(){'),app.indexOf('function endMustToTrainers(){'));
  const body=[
    'const ORIGIN_VIEWS=["today","learn","path","homework","personal","exam","review","vocabulary","materials","morph"];',
    'const state={events:[],grammarPath:null};',
    'const window={TutorUI:null,PersonalTrainers:null,MorphTrainer:null};',
    'const document={body:{dataset:{},classList:{toggle(){}}},querySelectorAll(){return [];}};',
    'const history={state:null,replaceState(s){history.state=s;}};',
    'let vocabSummary=false, vocabCardHold=null, view="practice", checked=false, hinted=false, rulePeeked=false, elapsedMs=1800, timerSince=null, advanceTimer=null;',
    'let position=0, queue=["hw1-1-kk","hw1-2-kk"], trainerReturn="vocab:must", queueEpoch=1, trainerEpoch=1, mode="words", vocabSitting={}, typingFocus=false;',
    'let hwLesson=null, courseBlock=null, sessionOrigin=null, resets=0;',
    'const byId=new Map([["hw1-1-kk",{id:"hw1-1-kk"}],["hw1-2-kk",{id:"hw1-2-kk"}]]);',
    'function isVocabMustTrainer(){return true;}',
    'function elapsed(){return elapsedMs;}',
    'function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}',
    'function pauseTimer(){elapsedMs=elapsed();timerSince=null;cancelAdvance();}',
    'function hintEvent(q,kind){state.events.push({type:"hint",card_id:q.id,hint_kind:kind});hinted=true;}',
    'function captureDraft(){} function refillCardDraft(){} function renderStats(){} function activateCard(){} function save(){} function syncKbInset(){} function markPlace(){} function shellTab(){return "today";}',
    'function $$(sel){return [];}',
    'const learning={render(){}}; const dashboard={render(){}};',
    'function renderMaterials(){} function renderExam(){} function renderHomework(){} function renderPath(){}',
    'function render(){if(vocabSummary&&isVocabMustTrainer())return; resets++; checked=false; hinted=false; rulePeeked=false; elapsedMs=0;}',
    'function rememberVocabCard(){vocabCardHold={cardId:queue[position]||null,checked:!!checked,hinted:!!hinted,rulePeeked:!!rulePeeked,elapsedMs:elapsed()};}',
    openSrc, contSrcF, showSrc,
    'function boot(extra){state.events.length=0; vocabSummary=false; vocabCardHold=null; view="practice"; checked=false; hinted=false; rulePeeked=false; elapsedMs=1800; position=0; queue=["hw1-1-kk","hw1-2-kk"]; resets=0; advanceTimer=null; if(extra&&extra.checked)checked=true; if(extra&&extra.hinted)hinted=true;}',
    'function arm(){advanceTimer=setTimeout(function(){position=1;checked=false;advanceTimer=null;},400);}',
    'function fire(){if(!advanceTimer)return; clearTimeout(advanceTimer); position=1; checked=false; advanceTimer=null;}',
    'function snap(){return {events:state.events.map(function(e){return e.card_id+":"+e.hint_kind;}), hinted:hinted, checked:checked, rulePeeked:rulePeeked, elapsedMs:elapsedMs, position:position, resets:resets, advance:advanceTimer};}',
    'return {boot:boot, open:openVocabSummary, show:showView, cont:continueVocabSummary, snap:snap, arm:arm, fire:fire};'
  ].join('\n');
  return new Function(body)();
}
const p6f=p6fHarness();
for(const dest of ['vocabulary','learn','review']){
  p6f.boot();
  p6f.open();
  p6f.show(dest);
  const left=p6f.snap();
  assert.deepEqual(left.events,[],'P6F-LEAVE');
  assert.equal(left.hinted,false,'P6F-LEAVE');
  assert.equal(left.resets,0,'P6F-LEAVE');
  p6f.show('practice');
  const back=p6f.snap();
  assert.deepEqual(back.events,[],'P6F-LEAVE');
  assert.equal(back.hinted,false,'P6F-LEAVE');
  assert.equal(p5Rate({result:{correct:true,parts:[true]},hinted:back.hinted,rulePeeked:back.rulePeeked}),F.Rating.Good,'P6F-LEAVE');
}
p6f.boot({checked:true});
p6f.arm();
p6f.open();
p6f.fire();
p6f.show('vocabulary');
const auto=p6f.snap();
assert.equal(auto.advance,null,'P6F-NO-AUTO');
assert.equal(auto.position,0,'P6F-NO-AUTO');
assert.deepEqual(auto.events,[],'P6F-NO-AUTO');
assert.equal(auto.checked,true,'P6F-NO-AUTO');
assert.equal(auto.resets,0,'P6F-NO-AUTO');
p6f.boot();
p6f.show('vocabulary');
const bare=p6f.snap();
assert.deepEqual(bare.events,['hw1-1-kk:reference'],'P6F-CONTROL');
assert.equal(bare.hinted,true,'P6F-CONTROL');
function p6fKeep(kind){
  const rememberSrc=app.slice(app.indexOf('function rememberVocabCard(){'),app.indexOf('function captureMustLive(){'));
  const tailStart=app.lastIndexOf('if(isVocabMustTrainer()&&vocabNear&&queue[position]===vocabNear.cardId');
  const tailEnd=app.indexOf('function hintEvent',tailStart);
  let tail=app.slice(tailStart,tailEnd).trim();
  assert.ok(tail.endsWith('}'),'P6F-KEEP');
  tail=tail.slice(0,tail.lastIndexOf('}')).trim();
  const nodes={
    '#hint-box':{innerHTML:kind==='rule'?'правило':'подсказка',hidden:false},
    '#hint-button':{disabled:kind!=='rule'},
    '#rule-button':{disabled:kind==='rule'},
    '#feedback':{innerHTML:'',hidden:true,className:'feedback'},
    '#check-button':{hidden:false},
    '#next-button':{hidden:true}
  };
  const body=[
    'let checked=false, hinted='+(kind==='hint'?'true':'false')+', rulePeeked='+(kind==='rule'?'true':'false')+', elapsedMs=3200, position=0;',
    'let queueEpoch=1;',
    'const queue=["hw1-1-kk"];',
    'let vocabCardHold=null, vocabNear=null, vocabRetry=null;',
    'const window={VocabMust:null};',
    'function isVocabMustTrainer(){return true;}',
    'function $(sel){return nodes[sel]||null;}',
    'function elapsed(){return elapsedMs;}',
    'function esc(s){return String(s);}',
    rememberSrc,
    'rememberVocabCard();',
    'checked=false; hinted=false; rulePeeked=false; elapsedMs=0;',
    'nodes["#hint-box"]={innerHTML:"",hidden:true};',
    'nodes["#hint-button"]={disabled:false};',
    'nodes["#rule-button"]={disabled:false};',
    'nodes["#feedback"]={innerHTML:"",hidden:true,className:"feedback"};',
    'nodes["#check-button"]={hidden:false};',
    'nodes["#next-button"]={hidden:true};',
    tail,
    'return {checked:checked, hinted:hinted, rulePeeked:rulePeeked, elapsedMs:elapsedMs, hintDisabled:nodes["#hint-button"].disabled, ruleDisabled:nodes["#rule-button"].disabled, hintHtml:nodes["#hint-box"].innerHTML, hintHidden:nodes["#hint-box"].hidden};'
  ].join('\n');
  return new Function('nodes',body)(nodes);
}
const keptHint=p6fKeep('hint');
assert.equal(keptHint.hinted,true,'P6F-KEEP');
assert.equal(keptHint.rulePeeked,false,'P6F-KEEP');
assert.equal(keptHint.elapsedMs,3200,'P6F-KEEP');
assert.equal(keptHint.hintDisabled,true,'P6F-KEEP');
assert.equal(keptHint.hintHidden,false,'P6F-KEEP');
assert.equal(keptHint.hintHtml,'подсказка','P6F-KEEP');
assert.equal(p5Rate({result:{correct:true,parts:[true]},hinted:keptHint.hinted,rulePeeked:false}),F.Rating.Again,'P6F-KEEP');
const keepQ=card('keep','word:keep');
const keepSt=state();
const keepSit=VM.emptySitting(1);
keepSit.sessions=['s'];
keepSit.shown=['word:keep'];
VM.commitFirst({state:keepSt,records:keepSt.records,q:keepQ,now:10,sessionId:'s',presentation:0,kind:'assisted',answers:['keepк'],elapsed:keptHint.elapsedMs,core,observe:()=>[],queue:['keep'],position:0,pool:[keepQ],plan:{budget:9,nNew:1,baseLen:1,newLemmas:['word:keep']},sitting:keepSit,rating:F.Rating.Again,errors:[],result:{correct:true,parts:[true]},budget:9,minGap:2,appearCap:3,hinted:true,recall:true});
assert.equal(VM.summaryRows(keepSt,keepSit,[keepQ],core,10).rows[0].label,'с подсказкой','P6F-KEEP');
const keptRule=p6fKeep('rule');
assert.equal(keptRule.rulePeeked,true,'P6F-PEEK');
assert.equal(keptRule.ruleDisabled,true,'P6F-PEEK');
assert.equal(keptRule.elapsedMs,3200,'P6F-PEEK');
assert.equal(keptRule.rulePeeked?1:0,1,'P6F-PEEK');
assert.equal(p5Rate({result:{correct:true,parts:[true]},hinted:false,rulePeeked:keptRule.rulePeeked}),F.Rating.Again,'P6F-PEEK');
assert.ok(app.includes('rule_peek:rulePeeked?1:0'),'P6F-PEEK');
const peekSt=state();
const peekSit=VM.emptySitting(1);
peekSit.sessions=['s'];
peekSit.shown=['word:keep'];
peekSt.events=[{type:'answer',card_id:'keep',at:10,correct:true,rule_peek:1,session_id:'s'}];
assert.equal(VM.summaryRows(peekSt,peekSit,[keepQ],core,10).rows[0].label,'с подсказкой','P6F-PEEK');
const pairFn=fs.readFileSync(path.join(__dirname,'vocab-must.js'),'utf8');
const pairBody=pairFn.slice(pairFn.indexOf('function pairOf'),pairFn.indexOf('function whenPhrase'));
assert.ok(pairBody.includes('answerLang')&&!pairBody.includes('на казахский'),'P6F-PAIR-SRC');
function p6fRow(q){
  const sit=VM.emptySitting(1);
  sit.shown=[core.lemmaKey(q)];
  return VM.summaryRows(state(),sit,[q],core,1).rows[0];
}
const pairIds=['learn-word-2','v2-4-1-vocab-also-kk-set','v2-4-2-vocab-qalaisyn-kk-form-1','hw1-1-kk-rev','hw1-1-ru'];
for(const id of pairIds)assert.ok(product.pool.some(q=>q.id===id),'P6F-PAIR '+id);
for(const q of product.pool){
  const lang=core.answerLang(q,0);
  const stim=String(q.stimulus||'');
  const ans=String((q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'');
  const row=p6fRow(q);
  if(lang==='kk'){
    assert.equal(String(row.kk),ans,'P6F-PAIR '+q.id);
    assert.equal(String(row.ru),stim,'P6F-PAIR '+q.id);
  }else{
    assert.equal(String(row.kk),stim,'P6F-PAIR '+q.id);
    assert.equal(String(row.ru),ans,'P6F-PAIR '+q.id);
  }
}
for(const id of pairIds){
  const q=product.pool.find(item=>item.id===id);
  const row=p6fRow(q);
  assert.ok(row&&(row.kk||row.ru),'P6F-PAIR '+id);
}

// P6F-HOLD-* / P6F-AUTO-RESUME: the summary snapshot is one-shot, scoped to one showing, and Продолжить keeps the PR-5 auto-advance.
function p6cHarness(){
  const showSrc=app.slice(app.indexOf('function showView(next){'),app.indexOf('function shellTab(next){'));
  const openSrc=app.slice(app.indexOf('function openVocabSummary(){'),app.indexOf('function rememberVocabCard(){'));
  const contSrc=app.slice(app.indexOf('function continueVocabSummary(){'),app.indexOf('function endMustToTrainers(){'));
  const holdSrc=app.slice(app.indexOf('function rememberVocabCard(){'),app.indexOf('function captureMustLive(){'));
  const rendSrc=app.slice(app.indexOf('function render(){'),app.indexOf('function hintEvent'));
  const holdLine=rendSrc.split('\n').find(l=>l.includes('vocabCardHold&&'));
  assert.ok(holdLine,'P6F-HOLD-SRC');
  const body=[
    'const ORIGIN_VIEWS=["today","learn","path","homework","personal","exam","review","vocabulary","materials","morph"];',
    'const state={events:[],grammarPath:null};',
    'const window={TutorUI:null,PersonalTrainers:null,MorphTrainer:null,VocabMust:null};',
    'const document={body:{dataset:{},classList:{toggle(){}}},querySelectorAll(){return [];}};',
    'const history={state:null,replaceState(s){history.state=s;}};',
    'const timers=[]; function setTimeout(fn,ms){timers.push({fn:fn,ms:ms});return timers.length;} function clearTimeout(id){if(id)timers[id-1]=null;}',
    'let nodes={};',
    'function fresh(){nodes={"#hint-box":{innerHTML:"",hidden:true},"#hint-button":{disabled:false},"#rule-button":{disabled:false},"#feedback":{innerHTML:"",hidden:true,className:"feedback"},"#check-button":{hidden:false},"#next-button":{hidden:true}};}',
    'function $(sel){return nodes[sel]||null;}',
    'let vocabSummary=false, vocabCardHold=null, vocabNear=null, vocabRetry=null, view="practice", checked=false, hinted=false, rulePeeked=false, elapsedMs=0, timerSince=null, advanceTimer=null, mustOn=true;',
    'let position=0, queue=["hw1-1-kk","hw1-2-kk"], trainerReturn="vocab:must", queueEpoch=1, trainerEpoch=1, mode="words", vocabSitting={}, typingFocus=false;',
    'let hwLesson=null, courseBlock=null, sessionOrigin=null, resets=0;',
    'const byId=new Map([["hw1-1-kk",{id:"hw1-1-kk"}],["hw1-2-kk",{id:"hw1-2-kk"}]]);',
    'function isVocabMustTrainer(){return mustOn;}',
    'function elapsed(){return elapsedMs;}',
    'function esc(s){return String(s);}',
    'function cancelAdvance(){if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}}',
    'function pauseTimer(){elapsedMs=elapsed();timerSince=null;cancelAdvance();}',
    'function hintEvent(q,kind){state.events.push({type:"hint",card_id:q.id,hint_kind:kind});hinted=true;}',
    'function captureDraft(){} function refillCardDraft(){} function renderStats(){} function activateCard(){} function save(){} function syncKbInset(){} function markPlace(){} function shellTab(){return "today";}',
    'function $$(sel){return [];}',
    'const learning={render(){}}; const dashboard={render(){}};',
    'function renderMaterials(){} function renderExam(){} function renderHomework(){} function renderPath(){}',
    'function render(){if(vocabSummary&&isVocabMustTrainer())return;',
    holdLine,
    ' resets++; pauseTimer(); elapsedMs=0; checked=false; hinted=false; rulePeeked=false; fresh();',
    ' if(isVocabMustTrainer()&&vocabNear&&queue[position]===vocabNear.cardId){checked=true;nodes["#check-button"].hidden=true;nodes["#next-button"].hidden=false;}',
    ' resumeVocabCard();}',
    'function nextQuestion(){cancelAdvance();vocabNear=null;vocabCardHold=null;position++;render();}',
    holdSrc, openSrc, contSrc, showSrc,
    'function boot(extra){extra=extra||{};state.events.length=0;timers.length=0;vocabSummary=false;vocabCardHold=null;vocabNear=null;view="practice";mustOn=true;queueEpoch=1;trainerEpoch=1;position=0;queue=extra.queue||["hw1-1-kk","hw1-2-kk"];resets=0;advanceTimer=null;fresh();checked=!!extra.checked;hinted=!!extra.hinted;rulePeeked=false;elapsedMs=extra.elapsed||1800;if(hinted){nodes["#hint-box"]={innerHTML:"подсказка",hidden:false};nodes["#hint-button"].disabled=true;}}',
    'function arm(){advanceTimer=setTimeout(function(){advanceTimer=null;nextQuestion();},400);}',
    'function pending(){return timers.filter(Boolean);}',
    'function runPending(){const t=pending();timers.length=0;t.forEach(function(x){x.fn();});}',
    'function snap(){return {events:state.events.map(function(e){return e.card_id+":"+e.hint_kind;}),hinted:hinted,checked:checked,rulePeeked:rulePeeked,elapsedMs:elapsedMs,position:position,resets:resets,hold:vocabCardHold,advance:advanceTimer,pending:pending().map(function(t){return t.ms;}),hintBox:!nodes["#hint-box"].hidden,next:!nodes["#next-button"].hidden,check:!nodes["#check-button"].hidden};}',
    'function set(k,v){if(k==="hinted"){hinted=v;nodes["#hint-box"]={innerHTML:"подсказка",hidden:false};nodes["#hint-button"].disabled=true;}else if(k==="near"){vocabNear={cardId:queue[position],expected:"x"};checked=true;nodes["#check-button"].hidden=true;nodes["#next-button"].hidden=false;}else if(k==="epoch")queueEpoch=v;else if(k==="position")position=v;else if(k==="must")mustOn=v;else if(k==="summary")vocabSummary=v;}',
    'return {boot:boot,open:openVocabSummary,cont:continueVocabSummary,show:showView,render:render,snap:snap,arm:arm,runPending:runPending,set:set};'
  ].join('\n');
  return new Function(body)();
}
const p6c=p6cHarness();
// restore once → the live card changes → a later render does not roll it back
p6c.boot();
p6c.open();
p6c.cont();
let once=p6c.snap();
assert.equal(once.hold,null,'P6F-HOLD-ONCE');
p6c.set('near');
p6c.render();
once=p6c.snap();
assert.equal(once.checked,true,'P6F-HOLD-ONCE');
assert.equal(once.next,true,'P6F-HOLD-ONCE');
assert.equal(once.check,false,'P6F-HOLD-ONCE');
// restored card → hint → Словарь → back: hint kept, no re-render, answer stays assisted
p6c.boot();
p6c.open();
p6c.cont();
const r0=p6c.snap().resets;
p6c.set('hinted',true);
p6c.show('vocabulary');
p6c.show('practice');
once=p6c.snap();
assert.equal(once.resets,r0,'P6F-HOLD-ONCE');
assert.equal(once.hinted,true,'P6F-HOLD-ONCE');
assert.equal(once.hintBox,true,'P6F-HOLD-ONCE');
assert.equal(p5Rate({result:{correct:true,parts:[true]},hinted:once.hinted,rulePeeked:once.rulePeeked}),F.Rating.Again,'P6F-HOLD-ONCE');
// leaving the open summary still keeps the snapshot until the card is shown again (P6F-LEAVE path)
p6c.boot({hinted:true});
p6c.open();
p6c.show('vocabulary');
assert.ok(p6c.snap().hold,'P6F-HOLD-ONCE');
p6c.show('practice');
once=p6c.snap();
assert.equal(once.hold,null,'P6F-HOLD-ONCE');
assert.equal(once.hinted,true,'P6F-HOLD-ONCE');
assert.deepEqual(once.events,[],'P6F-HOLD-ONCE');
// another portion / another place / another trainer with the same cardId never gets the snapshot
for(const [k,v] of [['epoch',2],['position',2],['must',false]]){
  p6c.boot({hinted:true,elapsed:3200,queue:['hw1-1-kk','hw1-2-kk','hw1-1-kk']});
  p6c.open();
  p6c.set('summary',false);
  p6c.set(k,v);
  p6c.render();
  const other=p6c.snap();
  assert.equal(other.hold,null,'P6F-HOLD-SCOPE '+k);
  assert.equal(other.hinted,false,'P6F-HOLD-SCOPE '+k);
  assert.equal(other.hintBox,false,'P6F-HOLD-SCOPE '+k);
  assert.equal(other.elapsedMs,0,'P6F-HOLD-SCOPE '+k);
}
assert.ok(app.slice(app.indexOf('function nextQuestion(){'),app.indexOf('function homeworkOpts(){')).includes('vocabCardHold=null'),'P6F-HOLD-SCOPE');
// fully correct → Закончить within 400 ms → Продолжить → auto-advance as in PR-5
p6c.boot({checked:true});
p6c.arm();
p6c.open();
assert.equal(p6c.snap().pending.length,0,'P6F-AUTO-RESUME');
p6c.cont();
const ar=p6c.snap();
assert.equal(ar.checked,true,'P6F-AUTO-RESUME');
assert.deepEqual(ar.pending,[400],'P6F-AUTO-RESUME');
assert.equal(ar.position,0,'P6F-AUTO-RESUME');
p6c.runPending();
assert.equal(p6c.snap().position,1,'P6F-AUTO-RESUME');
assert.equal(p6c.snap().checked,false,'P6F-AUTO-RESUME');
// no auto-advance was planned (near-miss / Дальше already waiting) → Продолжить plans none
p6c.boot({checked:true});
p6c.open();
p6c.cont();
assert.deepEqual(p6c.snap().pending,[],'P6F-AUTO-RESUME');
assert.equal(p6c.snap().position,0,'P6F-AUTO-RESUME');
// unanswered card → Продолжить never auto-advances
p6c.boot();
p6c.open();
p6c.cont();
assert.deepEqual(p6c.snap().pending,[],'P6F-AUTO-RESUME');

console.log('VERIFY_VOCAB_TRAINER_V1_OK');
