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
assert.ok(app.includes('<h2>Можно продолжить</h2>'));
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

console.log('VERIFY_VOCAB_TRAINER_V1_OK');
