/* K1 course progress: primary resume + per-lesson path/practice. No FSRS logic. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Bank=node?require('./explain-bank-adapter.js'):root.ExplainBankUI;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 const statuses=new Set(['not_started','in_progress','completed']);
 const surfaces=new Set(['path','practice']);
 const studyModes=new Set(['course','phrase','lesson','transfer','remediation']);
 function courseIds(){return (Bank&&Array.isArray(Bank.COURSE)?Bank.COURSE:[]).map(row=>row&&row.id).filter(Boolean);}
 function validId(id){return courseIds().includes(id);}
 function emptyPath(){return {chapterId:null,beat:0,phase:'hub',pathDraft:null,canonShownFor:null,updatedAt:0};}
 function emptyLesson(){return {status:'not_started',path:emptyPath(),practiceSession:null,startedAt:null,completedAt:null,lastAttemptAt:null,updatedAt:0};}
 function empty(){const lessons=Object.create(null);for(const id of courseIds())lessons[id]=emptyLesson();return {lessons,resumePointer:{lessonId:null,surface:null,updatedAt:0}};}
 function normalizePath(raw){
   const out=emptyPath();if(!obj(raw))return out;
   out.chapterId=typeof raw.chapterId==='string'?raw.chapterId.slice(0,100):null;
   out.beat=Math.max(0,Math.floor(Number(raw.beat)||0));
   out.phase=['lesson','beat','done','hub'].includes(raw.phase)?raw.phase:'hub';
   if(obj(raw.pathDraft)&&typeof raw.pathDraft.value==='string')out.pathDraft={
     lessonId:typeof raw.pathDraft.lessonId==='string'?raw.pathDraft.lessonId.slice(0,20):null,
     chapterId:typeof raw.pathDraft.chapterId==='string'?raw.pathDraft.chapterId.slice(0,100):null,
     beat:Math.max(0,Math.floor(Number(raw.pathDraft.beat)||0)),
     value:raw.pathDraft.value.slice(0,400)
   };
   out.canonShownFor=typeof raw.canonShownFor==='string'?raw.canonShownFor.slice(0,100):null;
   out.updatedAt=Math.max(0,Number(raw.updatedAt)||0);
   return out;
 }
 function normalizePractice(raw){
   if(!obj(raw)||!Array.isArray(raw.queue)||!Number.isInteger(raw.position)||raw.position<0||raw.position>raw.queue.length||typeof raw.mode!=='string')return null;
   const out={};
   const scalar=['topic','mode','sourceFilter','courseBlock','position','answered','view','activeLesson','activeStep','hinted','elapsed_ms','queueEpoch','presented','sessionAttempts','sessionCorrect','sessionAssisted','remediation','updatedAt'];
   const arrays=['queue','practiceIds'];
   const objects=['stepEvidence','variants','draft'];
   for(const k of scalar)if(raw[k]!==undefined)out[k]=copy(raw[k]);
   for(const k of arrays)if(Array.isArray(raw[k]))out[k]=copy(raw[k]);
   for(const k of objects)if(raw[k]==null||obj(raw[k]))out[k]=copy(raw[k]);
   out.queue=out.queue||[];
   out.position=Math.min(out.queue.length,Math.max(0,Number(out.position)||0));
   out.updatedAt=Math.max(0,Number(raw.updatedAt)||0);
   const stage=normalizeStageContext(raw.stageContext);
   if(stage)out.stageContext=stage;
   return out;
 }
 const STAGE_REVISION='t-integration-v1';
 const STAGE_KINDS=new Set(['learning','repair','checkpoint']);
 const stagePlans=Object.create(null);
 function cleanToken(v,max){
   if(typeof v!=='string'||!v.length||v.length>max||/[\s\u0000]/.test(v))return '';
   return v;
 }
 function idList(raw,max){
   if(!Array.isArray(raw))return [];
   const out=[];
   for(const id of raw){
     const s=cleanToken(id,80);
     if(!s||out.includes(s))continue;
     out.push(s);
     if(out.length>=max)break;
   }
   return out;
 }
 function normalizeStageContext(raw){
   if(!obj(raw))return null;
   const lessonId=cleanToken(raw.lessonId,20);
   if(!validId(lessonId))return null;
   const stageId=cleanToken(raw.stageId,80);
   if(!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(stageId))return null;
   if(raw.contentRevision!==STAGE_REVISION)return null;
   const coreIds=idList(raw.coreIds,24);
   if(!coreIds.length)return null;
   const kind=STAGE_KINDS.has(raw.kind)?raw.kind:'learning';
   const nextStageId=cleanToken(raw.nextStageId,80);
   const safeNext=/^[a-z0-9][a-z0-9_-]{0,79}$/.test(nextStageId)?nextStageId:null;
   const ratio=Number(raw.minIndependentRatio);
   return {
     lessonId,
     contentRevision:STAGE_REVISION,
     stageId,
     kind,
     coreIds,
     requiredIndependentIds:idList(raw.requiredIndependentIds,24).filter(id=>coreIds.includes(id)),
     ruleIds:idList(raw.ruleIds,12),
     nextStageId:safeNext,
     minIndependentRatio:Number.isFinite(ratio)?Math.min(1,Math.max(0,ratio)):0.8,
     maxPresentations:Math.min(24,Math.max(1,Math.floor(Number(raw.maxPresentations)||24))),
     final:raw.final===true,
     presentations:Math.max(0,Math.min(24,Math.floor(Number(raw.presentations)||0))),
     limitReached:raw.limitReached===true
   };
 }
 function stageCardId(ctx){return 'course-stage:'+ctx.lessonId+':'+ctx.stageId;}
 function stageAnswers(events,ctx){
   return (events||[]).filter(e=>e&&e.type==='answer'&&e.lesson_id===ctx.lessonId&&e.stage_id===ctx.stageId&&e.content_revision===ctx.contentRevision&&ctx.coreIds.includes(e.card_id));
 }
 function independentAnswer(e){
   return !!(e&&e.correct&&!e.hinted&&!e.peek&&!e.rule_peek&&e.first_try_correct!==0);
 }
 function evaluateStage(events,ctx){
   const stage=normalizeStageContext(ctx);
   if(!stage)return {pass:false,attempted:[],independent:[],presentations:0,limitReached:false};
   const answers=stageAnswers(events,stage);
   const byCard=Object.create(null);
   for(const e of answers){(byCard[e.card_id]||(byCard[e.card_id]=[])).push(e);}
   const attempted=stage.coreIds.filter(id=>(byCard[id]||[]).length);
   const independent=stage.coreIds.filter(id=>(byCard[id]||[]).some(independentAnswer));
   const required=stage.requiredIndependentIds.length?stage.requiredIndependentIds:stage.coreIds;
   const need=Math.ceil(stage.coreIds.length*stage.minIndependentRatio-1e-9);
   let repeatCritical=false;
   const fails=answers.filter(e=>!e.correct&&e.confusion_tag);
   for(let i=1;i<fails.length;i++){
     if(fails[i].card_id!==fails[i-1].card_id&&fails[i].confusion_tag===fails[i-1].confusion_tag)repeatCritical=true;
   }
   const pass=!stage.limitReached&&required.every(id=>independent.includes(id))&&independent.length>=need&&!repeatCritical;
   return {pass,attempted,independent,presentations:answers.length,limitReached:!!stage.limitReached,need};
 }
 function lessonStatusAfterStage(status,ctx,report){
   if(status==='completed')return 'completed';
   if(report&&report.pass&&ctx&&ctx.final)return 'completed';
   return 'in_progress';
 }
 function pushStageCompletion(events,ctx,evidenceIds,at){
   const stage=normalizeStageContext(ctx);
   if(!stage)return null;
   const card=stageCardId(stage);
   if((events||[]).some(e=>e&&e.type==='course_stage_completed'&&e.card_id===card&&e.content_revision===stage.contentRevision))return null;
   return {
     id:'stage:'+stage.lessonId+':'+stage.stageId+':'+stage.contentRevision,
     type:'course_stage_completed',
     card_id:card,
     at:Number(at)||Date.now(),
     lesson_id:stage.lessonId,
     stage_id:stage.stageId,
     content_revision:stage.contentRevision,
     evidence_ids:(evidenceIds||[]).filter(id=>typeof id==='string').slice(0,24)
   };
 }
 function dedupeStageEvents(events){
   const seen=new Set(),out=[];
   for(const e of [...(events||[])].sort((a,b)=>(a.at||0)-(b.at||0))){
     if(e&&e.type==='course_stage_completed'){
       const key=String(e.card_id)+'|'+String(e.content_revision||'');
       if(seen.has(key))continue;
       seen.add(key);
     }
     out.push(e);
   }
   return out;
 }
 function registerStages(lessonId,stages){
   if(!validId(lessonId)||!Array.isArray(stages))return [];
   stagePlans[lessonId]=stages.map(normalizeStageContext).filter(Boolean);
   return stagePlans[lessonId].slice();
 }
 function stageDone(events,stage){
   const card=stageCardId(stage);
   return (events||[]).some(e=>e&&e.type==='course_stage_completed'&&e.card_id===card&&e.content_revision===stage.contentRevision);
 }
 function nextRegistered(lessonId,events){
   const list=stagePlans[lessonId];
   if(!list||!list.length)return null;
   return list.find(stage=>!stageDone(events,stage))||null;
 }
 function unknownQueueIds(queue,known){
   const has=known&&typeof known.has==='function'?id=>known.has(id):(set=>id=>set.has(id))(new Set(known||[]));
   return (queue||[]).filter(id=>typeof id!=='string'||!has(id));
 }
 function normalizeLesson(raw){
   const out=emptyLesson();if(!obj(raw))return out;
   out.status=statuses.has(raw.status)?raw.status:'not_started';
   out.path=normalizePath(raw.path);
   out.practiceSession=normalizePractice(raw.practiceSession);
   out.startedAt=Number(raw.startedAt)>0?Number(raw.startedAt):null;
   out.completedAt=Number(raw.completedAt)>0?Number(raw.completedAt):null;
   out.lastAttemptAt=Number(raw.lastAttemptAt)>0?Number(raw.lastAttemptAt):null;
   out.updatedAt=Math.max(0,Number(raw.updatedAt)||0);
   if(out.completedAt)out.status='completed';
   if(out.status==='completed'&&!out.completedAt)out.completedAt=out.updatedAt||out.lastAttemptAt||out.startedAt||null;
   return out;
 }
 function liveSession(raw){
   if(!obj(raw)||!studyModes.has(raw.mode)||!Array.isArray(raw.queue)||!(Number(raw.position)<raw.queue.length))return null;
   const id=validId(raw.courseBlock)?raw.courseBlock:(validId(raw.activeLesson)?raw.activeLesson:null);
   return id?{lessonId:id,surface:'practice'}:null;
 }
 function legacyPath(state){
   const gp=state&&state.grammarPath;
   return obj(gp)&&validId(gp.lessonId)&&['lesson','beat'].includes(gp.phase)?{lessonId:gp.lessonId,surface:'path'}:null;
 }
 function legacyPlace(state){
   const p=state&&state.place;
   return obj(p)&&validId(p.lessonId)&&surfaces.has(p.surface)?{lessonId:p.lessonId,surface:p.surface}:null;
 }
 function fallbackId(lessons){
   for(const id of courseIds())if((lessons[id]||{}).status!=='completed')return id;
   return courseIds()[0]||null;
 }
 function migrate(rawCp,state,raw,now=Date.now()){
   const out=empty(),src=obj(rawCp)?rawCp:{};
   for(const id of courseIds())if(obj(src.lessons)&&src.lessons[id])out.lessons[id]=normalizeLesson(src.lessons[id]);
   const gp=state&&state.grammarPath;
   if(obj(gp)&&validId(gp.lessonId)){
     const lp=out.lessons[gp.lessonId],hadLesson=obj(src.lessons)&&obj(src.lessons[gp.lessonId]);
     if(!hadLesson||!src.lessons[gp.lessonId].path){
       lp.path=normalizePath({chapterId:gp.chapterId,beat:gp.beat,phase:gp.phase,pathDraft:gp.pathDraft,canonShownFor:gp.canonShownFor,updatedAt:0});
     }
     if(!hadLesson&&['lesson','beat'].includes(gp.phase)&&lp.status!=='completed')lp.status='in_progress';
   }
   const live=liveSession(raw&&raw.session);
   if(live){
     const lp=out.lessons[live.lessonId],hadPractice=obj(src.lessons)&&obj(src.lessons[live.lessonId])&&src.lessons[live.lessonId].practiceSession;
     if(!hadPractice)lp.practiceSession=normalizePractice(Object.assign({},raw.session,{updatedAt:0}));
     if(lp.status!=='completed')lp.status='in_progress';
   }
   const rp=obj(src.resumePointer)&&validId(src.resumePointer.lessonId)&&surfaces.has(src.resumePointer.surface)?{
     lessonId:src.resumePointer.lessonId,surface:src.resumePointer.surface,updatedAt:Math.max(0,Number(src.resumePointer.updatedAt)||0)
   }:null;
   const inferred=live||legacyPath(state)||legacyPlace(state);
   out.resumePointer=rp||{lessonId:(inferred&&inferred.lessonId)||fallbackId(out.lessons),surface:(inferred&&inferred.surface)||'path',updatedAt:rp?rp.updatedAt:0};
   if(!validId(out.resumePointer.lessonId))out.resumePointer={lessonId:fallbackId(out.lessons),surface:'path',updatedAt:0};
   return out;
 }
 function ensure(state){
   if(!state.courseProgress)state.courseProgress=empty();
   else state.courseProgress=migrate(state.courseProgress,state,state,Date.now());
   return state.courseProgress;
 }
 function ensureLesson(state,id){
   if(!validId(id))return null;
   const cp=ensure(state);if(!cp.lessons[id])cp.lessons[id]=emptyLesson();return cp.lessons[id];
 }
 function setResume(state,id,surface,now=Date.now()){
   if(!validId(id)||!surfaces.has(surface))return ensure(state).resumePointer;
   const cp=ensure(state);cp.resumePointer={lessonId:id,surface,updatedAt:Math.max(0,Number(now)||Date.now())};return cp.resumePointer;
 }
 function markStarted(state,id,surface='path',now=Date.now()){
   const lp=ensureLesson(state,id);if(!lp)return null;
   if(lp.status!=='completed')lp.status='in_progress';
   if(!lp.startedAt)lp.startedAt=now;
   lp.lastAttemptAt=now;lp.updatedAt=Math.max(lp.updatedAt||0,now);
   setResume(state,id,surface,now);return lp;
 }
 function markCompleted(state,id,now=Date.now()){
   const lp=ensureLesson(state,id);if(!lp)return null;
   lp.status='completed';if(!lp.completedAt)lp.completedAt=now;if(!lp.startedAt)lp.startedAt=now;
   lp.lastAttemptAt=now;lp.updatedAt=Math.max(lp.updatedAt||0,now);lp.practiceSession=null;return lp;
 }
 function savePath(state,id,gp,now=Date.now()){
   const lp=ensureLesson(state,id);if(!lp||!obj(gp))return null;
   lp.path=normalizePath({chapterId:gp.chapterId,beat:gp.beat,phase:gp.phase,pathDraft:gp.pathDraft,canonShownFor:gp.canonShownFor,updatedAt:now});
   lp.updatedAt=Math.max(lp.updatedAt||0,now);return lp.path;
 }
 function savePractice(state,id,snapshot,now=Date.now()){
   const lp=ensureLesson(state,id);if(!lp)return null;
   const raw=Object.assign({},snapshot||{},{updatedAt:now});
   lp.practiceSession=normalizePractice(raw);
   lp.updatedAt=Math.max(lp.updatedAt||0,now);return lp.practiceSession;
 }
 function clearPractice(state,id,now=Date.now()){
   const lp=ensureLesson(state,id);if(!lp)return;lp.practiceSession=null;lp.updatedAt=Math.max(lp.updatedAt||0,now);
 }
 function earlier(a,b){const xs=[a,b].filter(x=>Number(x)>0).map(Number);return xs.length?Math.min(...xs):null;}
 function later(a,b){const xs=[a,b].filter(x=>Number(x)>0).map(Number);return xs.length?Math.max(...xs):null;}
 function merge(a,b,state){
   const left=migrate(a,state||{},state||{},Date.now()),right=migrate(b,state||{},state||{},Date.now()),out=empty();
   for(const id of courseIds()){
     const x=left.lessons[id],y=right.lessons[id],z=emptyLesson();
     const completed=x.status==='completed'||y.status==='completed';
     z.status=completed?'completed':(x.status==='in_progress'||y.status==='in_progress'?'in_progress':'not_started');
     z.completedAt=completed?earlier(x.completedAt,y.completedAt):null;
     z.startedAt=earlier(x.startedAt,y.startedAt);
     z.lastAttemptAt=later(x.lastAttemptAt,y.lastAttemptAt);
     z.updatedAt=Math.max(x.updatedAt||0,y.updatedAt||0);
     z.path=(y.path.updatedAt||0)>(x.path.updatedAt||0)?copy(y.path):copy(x.path);
     const xp=x.practiceSession,yp=y.practiceSession;
     z.practiceSession=completed?null:(!xp?copy(yp):!yp?copy(xp):(yp.updatedAt||0)>(xp.updatedAt||0)?copy(yp):copy(xp));
     out.lessons[id]=z;
   }
   const x=left.resumePointer,y=right.resumePointer;
   out.resumePointer=(y.updatedAt||0)>(x.updatedAt||0)?copy(y):copy(x);
   if(!validId(out.resumePointer.lessonId))out.resumePointer={lessonId:fallbackId(out.lessons),surface:'path',updatedAt:0};
   return out;
 }
 const api={courseIds,validId,empty,emptyLesson,normalizePath,normalizePractice,normalizeStageContext,evaluateStage,lessonStatusAfterStage,pushStageCompletion,dedupeStageEvents,registerStages,nextRegistered,unknownQueueIds,STAGE_REVISION,migrate,ensure,ensureLesson,setResume,markStarted,markCompleted,savePath,savePractice,clearPractice,merge};
 if(node)module.exports=api;else root.CourseProgress=api;
})(typeof window!=='undefined'?window:globalThis);
