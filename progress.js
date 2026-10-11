(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const cfg=node?require('./config.js'):root.TRAINER_CONFIG,core=node?require('./core.js'):root.TrainerCore;
 const packages=node?require('./package-schema.js'):root.LessonPackageSchema;
 const courseProgress=node?require('./course-progress.js'):root.CourseProgress;
 const morph=node?require('./morph-state.js'):root.MorphState;
 const morphEngine=node?require('./morph-engine.js'):root.MorphEngine;
 const evidence=node?require('./evidence-state.js'):root.EvidenceState;
 function nav(){return node?require('./navigation-state.js'):root.NavigationState;}
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const safe=k=>typeof k==='string'&&k.length<=300&&!['__proto__','prototype','constructor'].includes(k);
 function dictionary(value,transform){const out=Object.create(null);if(obj(value))for(const [k,v] of Object.entries(value))if(safe(k)){const next=transform(v,k);if(next!==undefined)out[k]=next;}return out;}
 function empty(){return {schema:7,morphTrainer:morph.empty(),records:Object.create(null),skills:Object.create(null),errors:[],issueLog:[],associations:Object.create(null),confusions:Object.create(null),vocabulary:Object.create(null),events:[],learning:{lessonId:'numbers-0',notes:{},steps:{},completedSteps:{}},prefs:{letters:true,lettersChosen:false},preExam:{trainers:Object.create(null),updatedAt:0},incidentalWeek:{key:'',added:0},homeworkAttempts:Object.create(null),grammarPath:{topicId:null,step:0,phase:'hub',queue:[],index:0,peeks:Object.create(null),fails:Object.create(null),passed:Object.create(null),blocked:false,completed:[],lessonId:null,chapterId:null,beat:0,completedChapters:Object.create(null),legacyCompleted:[]},courseProgress:courseProgress.empty(),session:null,navigationResume:{version:1,slots:Object.create(null),lastRoute:null},lesson_packages:[],repair:null,savings:Object.create(null),...(evidence?{evidence:evidence.empty()}:{})};}
 function migrate(raw={},now=Date.now()){
   const state=empty();state.morphTrainer=morph.migrate(raw.morphTrainer);state.lesson_packages=packages.merge([],raw.lesson_packages||[]);state.skills=dictionary(raw.skills,r=>obj(r)?core.migrateRecord(r,now):undefined);state.errors=Array.isArray(raw.errors)?raw.errors.filter(e=>obj(e)&&typeof e.error_type==='string'&&Number.isFinite(e.timestamp)):[];state.records=dictionary(raw.records,r=>obj(r)?core.migrateRecord(r,now):undefined);
  // Drop retired letter-breakdown («Разбери каждую букву») FSRS cards — skip on load.
  for(const id of ['m1-9-1','m1-10-1','m1-11-1','e1-2-1-1','e1-2-2-1','e1-2-3-1','e1-2-4-1','e1-2-5-1','e1-2-6-1','e1-2-7-1'])delete state.records[id];
   state.associations=dictionary(raw.associations,v=>typeof v==='string'?{text:v.slice(0,cfg.storage.maxAssociationLength),updated_at:now}:obj(v)&&typeof v.text==='string'?{text:v.text.slice(0,cfg.storage.maxAssociationLength),updated_at:Number(v.updated_at)||0}:undefined);
   state.confusions=dictionary(raw.confusions,c=>obj(c)&&typeof c.expected_answer==='string'&&typeof c.wrong_answer_given==='string'?{
     expected_item:Array.isArray(c.expected_item)?c.expected_item.filter(safe):[],given_item:Array.isArray(c.given_item)?c.given_item.filter(safe):[],last_confused:Number(c.last_confused||c.last_wrong)||0,expected_answer:c.expected_answer.slice(0,128),wrong_answer_given:c.wrong_answer_given.slice(0,128),confusion_count:Math.max(0,Math.floor(Number(c.confusion_count)||0)),
     card_ids:Array.isArray(c.card_ids)?c.card_ids.filter(safe).slice(0,100):[],last_wrong:Number(c.last_wrong)||0,
     known_alternative:!!c.known_alternative,successes:dictionary(c.successes,v=>Math.min(2,Math.max(0,Number(v)||0))),resolved:!!c.resolved}:undefined);
   state.vocabulary=dictionary(raw.vocabulary,v=>obj(v)?{times_seen:Math.max(0,Number(v.times_seen)||0),last_seen:Number(v.last_seen)||0,last_seen_lesson:typeof v.last_seen_lesson==='string'?v.last_seen_lesson:null,target_or_context:v.target_or_context==='target'?'target':'context'}:undefined);
   state.events=Array.isArray(raw.events)?raw.events.slice(-cfg.storage.maxEvents).filter(e=>obj(e)&&safe(e.card_id)&&Number.isFinite(e.at)).map(e=>({...e,card_id:e.card_id,at:e.at,correct:!!e.correct,hinted:!!e.hinted,response_time:Number.isFinite(e.response_time)?Math.max(0,e.response_time):null,latency_ms:Number.isFinite(e.latency_ms)?e.latency_ms:(Number.isFinite(e.response_time)?e.response_time:null),recall:!!e.recall,answers:Array.isArray(e.answers)?e.answers.slice(0,50).map(a=>String(a).slice(0,300)):[],item_type:typeof e.item_type==='string'?e.item_type:null,direction:typeof e.direction==='string'?e.direction:null,first_try_correct:e.first_try_correct==null?null:Number(e.first_try_correct)?1:0,peek:e.peek==null?null:Number(e.peek)?1:0,retype_after_peek_ok:e.retype_after_peek_ok==null?null:e.retype_after_peek_ok,confusion_tag:typeof e.confusion_tag==='string'?e.confusion_tag:'',confuse_pair_id:typeof e.confuse_pair_id==='string'?e.confuse_pair_id:'',official_like:e.official_like?1:0,predicted_R:Number.isFinite(e.predicted_R)?e.predicted_R:null,hours_since_last:Number.isFinite(e.hours_since_last)?e.hours_since_last:null})):[];
   if(obj(raw.incidentalWeek))state.incidentalWeek={key:String(raw.incidentalWeek.key||''),added:Math.max(0,Number(raw.incidentalWeek.added)||0)};
   if(obj(raw.grammarPath)){
     const g=raw.grammarPath;
     state.grammarPath={topicId:typeof g.topicId==='string'?g.topicId:null,step:Math.max(0,Number(g.step)||0),phase:typeof g.phase==='string'?g.phase:'hub',queue:Array.isArray(g.queue)?g.queue.filter(safe).slice(0,40):[],index:Math.max(0,Number(g.index)||0),peeks:obj(g.peeks)?g.peeks:Object.create(null),fails:obj(g.fails)?g.fails:Object.create(null),passed:obj(g.passed)?g.passed:Object.create(null),blocked:!!g.blocked,completed:Array.isArray(g.completed)?g.completed.filter(safe).slice(0,40):[],lessonId:typeof g.lessonId==='string'?g.lessonId:null,chapterId:typeof g.chapterId==='string'?g.chapterId:null,beat:Math.max(0,Number(g.beat)||0),completedChapters:obj(g.completedChapters)?g.completedChapters:Object.create(null),legacyCompleted:Array.isArray(g.legacyCompleted)?g.legacyCompleted.concat(Array.isArray(g.completed)?g.completed:[]).filter(safe).slice(0,80):Array.isArray(g.completed)?g.completed.filter(safe):[]}; // r7 2T-a: keep path contentRevision across F5 (only when set — omit null so golden fixtures stay identical)
     if(typeof g.contentRevision==='string'&&g.contentRevision)state.grammarPath.contentRevision=g.contentRevision.slice(0,80);
     if(g.pathNeedsReplay===true)state.grammarPath.pathNeedsReplay=true;
     const d=g.pathDraft;
     if(obj(d)&&typeof d.value==='string')state.grammarPath.pathDraft={lessonId:typeof d.lessonId==='string'?d.lessonId.slice(0,20):null,chapterId:typeof d.chapterId==='string'?d.chapterId.slice(0,80):null,beat:Math.max(0,Math.floor(Number(d.beat)||0)),value:d.value.slice(0,400)};
     if(typeof g.canonShownFor==='string')state.grammarPath.canonShownFor=g.canonShownFor.slice(0,80);
   }
   state.explainDepth=Object.create(null);
   if(obj(raw.explainDepth)){
     for(const [k,v] of Object.entries(raw.explainDepth)){
       if(!safe(k)||(v!=='open'&&v!=='closed'))continue;
       state.explainDepth[k.slice(0,40)]=v;
       if(Object.keys(state.explainDepth).length>=40)break;
     }
   }
   if(obj(raw.place)&&['path','practice','homework'].includes(raw.place.surface)&&typeof raw.place.lessonId==='string')state.place={surface:raw.place.surface,lessonId:raw.place.lessonId.slice(0,20),mode:typeof raw.place.mode==='string'?raw.place.mode.slice(0,40):null};
   if(obj(raw.rulesDraft)&&typeof raw.rulesDraft.value==='string'&&raw.rulesDraft.value)state.rulesDraft={article:typeof raw.rulesDraft.article==='string'?raw.rulesDraft.article.slice(0,40):'',value:raw.rulesDraft.value.slice(0,400)};
   if(obj(raw.homeworkAttempts))state.homeworkAttempts=dictionary(raw.homeworkAttempts,(a,lesson)=>{
     if(!obj(a))return undefined;
     const items=Array.isArray(a.items)?a.items.filter(it=>obj(it)&&safe(it.id)).map(it=>({id:it.id,answers:Array.isArray(it.answers)?it.answers.slice(0,20).map(x=>String(x).slice(0,300)):[],correct:!!it.correct,rule_peek:!!it.rule_peek,answer_peek:!!it.answer_peek,skipped:!!it.skipped,expected:typeof it.expected==='string'?it.expected.slice(0,300):'',at:Number(it.at)||0,status:typeof it.status==='string'?it.status.slice(0,40):'',event_id:typeof it.event_id==='string'?it.event_id.slice(0,120):''})): [];
     const previous=Array.isArray(a.previous)?a.previous.filter(obj).slice(-30):[];
     return {lessonId:safe(a.lessonId)?a.lessonId:lesson,started_at:Number(a.started_at)||0,items,rule_peeks:Math.max(0,Number(a.rule_peeks)||0),answer_peeks:Math.max(0,Number(a.answer_peeks)||0),submitted_at:Number(a.submitted_at)||null,export_rev:Math.max(0,Number(a.export_rev)||0),cursor:typeof a.cursor==='string'?a.cursor.slice(0,80):null,checklist:obj(a.checklist)?a.checklist:{method:false,exercises:false,words:false,external_test:false,keyboard:false,cheat:false},previous};
   });
   if(obj(raw.learning)){
     state.learning.lessonId=typeof raw.learning.lessonId==='string'?raw.learning.lessonId:'numbers-0';
     state.learning.notes=dictionary(raw.learning.notes,n=>typeof n==='string'?n.slice(0,1200):undefined);
     state.learning.steps=dictionary(raw.learning.steps,n=>Number.isInteger(n)&&n>=0?n:undefined);
     state.learning.completedSteps=dictionary(raw.learning.completedSteps,n=>n===true?true:undefined);
     for(const [id,note] of Object.entries(state.learning.notes))if(!state.associations['lesson:'+id])state.associations['lesson:'+id]={text:note,updated_at:0};
   }
   state.prefs={letters:!!(obj(raw.prefs)&&raw.prefs.letters),lettersChosen:!!(obj(raw.prefs)&&raw.prefs.lettersChosen)};
   // Always default letters on (any width); user can still opt out via pref if lettersChosen.
   if(!state.prefs.lettersChosen)state.prefs.letters=true;
   state.issueLog=Array.isArray(raw.issueLog)?raw.issueLog.filter(x=>obj(x)&&typeof x.note==='string'&&Number.isFinite(x.at)).map(x=>({at:x.at,note:String(x.note).slice(0,800),view:typeof x.view==='string'?x.view.slice(0,40):'',mode:typeof x.mode==='string'?x.mode.slice(0,40):'',topic:typeof x.topic==='string'?x.topic.slice(0,40):'',courseBlock:typeof x.courseBlock==='string'?x.courseBlock.slice(0,20):'',lessonId:typeof x.lessonId==='string'?x.lessonId.slice(0,20):'',exerciseId:safe(x.exerciseId)?x.exerciseId:'',title:typeof x.title==='string'?x.title.slice(0,200):'',stimulus:typeof x.stimulus==='string'?x.stimulus.slice(0,200):'',source:typeof x.source==='string'?x.source.slice(0,80):''})).slice(-80):[];
   state.session=obj(raw.session)?raw.session:null;
   if(obj(raw.repair)&&typeof raw.repair.rule_id==='string')state.repair={rule_id:raw.repair.rule_id.slice(0,80),started:String(raw.repair.started||''),quiet_until:Number(raw.repair.quiet_until)||0,roots_used:Array.isArray(raw.repair.roots_used)?raw.repair.roots_used.filter(x=>typeof x==='string').slice(0,8):[],attempts:Math.max(0,Number(raw.repair.attempts)||0),blinds:Math.max(0,Number(raw.repair.blinds)||0)};
   if(obj(raw.savings))state.savings=dictionary(raw.savings,v=>Math.max(0,Math.floor(Number(v)||0)));
   if(obj(raw.aiTutor))state.aiTutor=tidyTutor(raw.aiTutor);
   state.schema=7;
   state.courseProgress=courseProgress.migrate(raw.courseProgress,state,raw,now);
   // r7: additive evidence namespace + one-time legacy marker; never rewrites the namespaces above.
   if(evidence)evidence.upgrade(state,raw,now);
    if(obj(raw.preExam)){state.preExam={trainers:Object.create(null),updatedAt:Number(raw.preExam.updatedAt)||0};const tr=raw.preExam.trainers;if(obj(tr)){for(const [k,v] of Object.entries(tr)){if(typeof k==='string'&&k.length<80)state.preExam.trainers[k]=!!v;}}}else if(!state.preExam){state.preExam={trainers:Object.create(null),updatedAt:0};} // r7 ux63 HG-20
   if(nav()){state.navigationResume=nav().adopt(raw.navigationResume);if(!obj(raw.navigationResume)&&obj(state.session))nav().seedLegacy(state);}
 return state;
 }
 function tidyTutor(raw){
   const errors=Object.create(null);
   if(obj(raw.errors))for(const [k,v] of Object.entries(raw.errors)){
     if(!safe(k)||!obj(v))continue;
     const code=k.slice(0,80);
     errors[code]={error_code:code,rule_id:typeof v.rule_id==='string'?v.rule_id.slice(0,40):'',lesson_id:typeof v.lesson_id==='string'?v.lesson_id.slice(0,20):'',count_total:Math.max(0,Math.floor(Number(v.count_total)||0)),count_recent:Math.max(0,Math.floor(Number(v.count_recent)||0)),last_seen:typeof v.last_seen==='string'?v.last_seen.slice(0,40):null,last_exercise_ids:Array.isArray(v.last_exercise_ids)?v.last_exercise_ids.filter(safe).slice(0,6):[],hint_count_recent:Math.max(0,Math.floor(Number(v.hint_count_recent)||0)),successful_retrievals_after_error:Math.max(0,Math.floor(Number(v.successful_retrievals_after_error)||0)),remediation_due:!!v.remediation_due};
   }
   const recent=Array.isArray(raw.recent)?raw.recent.filter(obj).slice(-80).map(e=>({code:typeof e.code==='string'?e.code.slice(0,80):null,at:Number(e.at)||0,correct:!!e.correct,hinted:!!e.hinted,id:safe(e.id)?e.id:''})):[];
   return {errors,recent};
 }
 function mergeTutor(a,b){
   if(!a)return b||null;
   if(!b)return a;
   const errors=Object.assign(Object.create(null),a.errors||{});
   for(const [k,v] of Object.entries(b.errors||{})){
     const old=errors[k];
     if(!old||(v.count_total||0)>=(old.count_total||0))errors[k]=v;
   }
   const recent=[],seen=new Set();
   for(const e of [...(a.recent||[]),...(b.recent||[])].sort((x,y)=>(x.at||0)-(y.at||0))){
     const id=String(e.at||0)+'|'+String(e.code||'')+'|'+String(e.id||'');
     if(seen.has(id))continue;
     seen.add(id);recent.push(e);
   }
   return {errors,recent:recent.slice(-80)};
 }
 function serialize(state){return JSON.stringify({app:'qazaq-trainer',schema:7,exported_at:new Date().toISOString(),policy_version:cfg.version,scheduler_config:{implementation:cfg.algorithm,desired_retention:cfg.fsrs.desired_retention,standard_weights:true},...state});}
 function validate(text,knownIds,now=Date.now()){
   if(new TextEncoder().encode(text).length>cfg.storage.maxImportBytes)throw Error('Файл слишком большой: максимум 20 МБ.');
   let raw;try{raw=JSON.parse(text);}catch{throw Error('Это не корректный JSON-файл.');}
   if(!obj(raw)||!obj(raw.records)||(raw.app&&raw.app!=='qazaq-trainer'))throw Error('Файл не похож на резервную копию тренажёра.');
   if(raw.schema!==undefined&&![1,2,3,4,5,6,7].includes(raw.schema))throw Error('Эта версия резервной копии пока не поддерживается.');
   if(Object.keys(raw.records).length+Object.keys(raw.skills||{}).length>20000)throw Error('Слишком много карточек в файле.');
   for(const [id,r] of [...Object.entries(raw.records),...Object.entries(raw.skills||{})]){
     if(!safe(id)||!obj(r))throw Error('В файле есть некорректная запись карточки.');
     if(r.fsrs&&!((typeof module!=='undefined'&&module.exports?require('./scheduler.js'):root.ReviewScheduler).validCard(r.fsrs)))throw Error('Повреждено состояние FSRS: '+id);
     for(const key of ['seen','attempts','correct_count','correct','wrong_count','correct_streak','streak','next_review','dueAt','response_time'])
       if(r[key]!=null&&(!Number.isFinite(r[key])||r[key]<0))throw Error('Некорректное значение в карточке '+id+'.');
     const seen=r.seen??r.attempts??0;if((r.correct_count??r.correct??0)>seen||(r.wrong_count??0)>seen)throw Error('Счётчики ответов не согласованы: '+id+'.');
   }
   const state=migrate(raw,now),ids=Object.keys(state.records),morphIds=new Set((morphEngine.bank?.()||[]).map(item=>item.id)),unknown=ids.filter(id=>!knownIds.has(id)&&!morphIds.has(id)).length;
   return {state,summary:{cards:ids.length,unknown,events:state.events.length,associations:Object.keys(state.associations).length},warning:unknown?'Записи отсутствующих в этой версии карточек сохранятся, но не попадут в тренировку.':''};
 }
 function merge(current,incoming){
   const out=migrate(current);
   // r7 2b ST-07: both sides of a record conflict are kept in evidence.conflicts (core choice below is unchanged).
   const before=evidence&&evidence.recordConflicts?{records:Object.assign({},out.records),skills:Object.assign({},out.skills),events:out.events}:null;
   out.morphTrainer=morph.merge(current.morphTrainer,incoming.morphTrainer);out.session=null;out.lesson_packages=packages.merge(out.lesson_packages,incoming.lesson_packages);
   for(const [id,r] of Object.entries(incoming.skills)){const old=out.skills[id];if(!old||(r.last_answer||0)>(old.last_answer||0)||((r.last_answer||0)===(old.last_answer||0)&&r.review_count>old.review_count))out.skills[id]=r;}
   out.errors=Array.from(new Map([...out.errors,...incoming.errors].map(e=>[JSON.stringify(e),e])).values());
   for(const [id,r] of Object.entries(incoming.records)){
     const old=out.records[id];if(!old||(r.last_seen||0)>(old.last_seen||0)||((r.last_seen||0)===(old.last_seen||0)&&r.seen>old.seen))out.records[id]=r;
   }
   for(const [id,a] of Object.entries(incoming.associations))if(!out.associations[id]||a.updated_at>=out.associations[id].updated_at)out.associations[id]=a;
   for(const [id,c] of Object.entries(incoming.confusions))if(!out.confusions[id]||c.last_wrong>out.confusions[id].last_wrong)out.confusions[id]=c;
   for(const [id,v] of Object.entries(incoming.vocabulary)){
     const old=out.vocabulary[id];out.vocabulary[id]=old?{times_seen:Math.max(old.times_seen,v.times_seen),last_seen:Math.max(old.last_seen,v.last_seen),last_seen_lesson:old.last_seen>v.last_seen?old.last_seen_lesson:v.last_seen_lesson,target_or_context:old.target_or_context==='target'||v.target_or_context==='target'?'target':'context'}:v;
   }
   const eventMap=new Map([...out.events,...incoming.events].map(e=>[JSON.stringify([e.type,e.card_id,e.at,e.answers,e.correct]),e]));
   // PR-7 GPT P1-2: a vocab:must show has one first answer and one retype close («ans:/rc:» + session:presentation:card).
   // Two tabs can each write the same one at a different moment; after the merge only the earliest stays.
   const showIds=new Set();
   out.events=courseProgress.dedupeStageEvents([...eventMap.values()]).sort((a,b)=>a.at-b.at).filter(e=>{
     const id=e&&typeof e.id==='string'&&/^(ans|rc):/.test(e.id)?e.id:null;
     if(!id)return true;
     if(showIds.has(id))return false;
     showIds.add(id);return true;
   }).slice(-cfg.storage.maxEvents);
   out.prefs={letters:!!(incoming.prefs&&incoming.prefs.letters)||!!out.prefs.letters,lettersChosen:!!(incoming.prefs&&incoming.prefs.lettersChosen)||!!out.prefs.lettersChosen};
   // storage p0c (GPT design §3): a lesson step never goes back on merge; completedSteps only ever gains true.
   for(const [id,n] of Object.entries(incoming.learning.steps||{}))out.learning.steps[id]=Math.max(Number(out.learning.steps[id])||0,Number(n)||0);
   Object.assign(out.learning.notes,incoming.learning.notes);
   for(const [id,v] of Object.entries(incoming.learning.completedSteps||{}))if(v===true)out.learning.completedSteps[id]=true;
   if(incoming.incidentalWeek){
     const a=out.incidentalWeek||{key:'',added:0},b=incoming.incidentalWeek;
     out.incidentalWeek=a.key===b.key?{key:a.key,added:Math.max(a.added||0,b.added||0)}:(b.key||'')>(a.key||'')?{key:b.key,added:b.added||0}:a;
   }
   if(incoming.grammarPath){
     out.grammarPath=out.grammarPath||{};
     out.grammarPath.completedChapters=Object.assign(Object.create(null),out.grammarPath.completedChapters||{},incoming.grammarPath.completedChapters||{});
     out.grammarPath.legacyCompleted=[...new Set([...(out.grammarPath.legacyCompleted||[]),...(incoming.grammarPath.legacyCompleted||[])])].slice(0,80);
   }
   if(incoming.homeworkAttempts){
     out.homeworkAttempts=out.homeworkAttempts||Object.create(null);
     for(const [lesson,a] of Object.entries(incoming.homeworkAttempts)){
       // storage p0d: the same attempt (same started_at) is merged item by item, never replaced by an older copy
       out.homeworkAttempts[lesson]=mergeAttempt(out.homeworkAttempts[lesson],a);
     }
   }
   if(Array.isArray(incoming.issueLog)){
     const map=new Map([...(out.issueLog||[]),...incoming.issueLog].map(x=>[String(x.at)+'|'+String(x.note||'').slice(0,80),x]));
     out.issueLog=[...map.values()].sort((a,b)=>a.at-b.at).slice(-80);
   }
   if(incoming.aiTutor||out.aiTutor)out.aiTutor=mergeTutor(out.aiTutor,obj(incoming.aiTutor)?tidyTutor(incoming.aiTutor):null);
   out.courseProgress=courseProgress.merge(out.courseProgress,incoming.courseProgress,out);
   const runtimeId=courseProgress.validId(out.grammarPath&&out.grammarPath.lessonId)?out.grammarPath.lessonId:(out.courseProgress.resumePointer&&out.courseProgress.resumePointer.lessonId);
   const mergedPath=runtimeId&&out.courseProgress.lessons[runtimeId]&&out.courseProgress.lessons[runtimeId].path;
   if(runtimeId&&mergedPath&&(mergedPath.chapterId||mergedPath.phase!=='hub')){
     out.grammarPath=out.grammarPath||{};
     out.grammarPath.lessonId=runtimeId;out.grammarPath.chapterId=mergedPath.chapterId;out.grammarPath.beat=mergedPath.beat;out.grammarPath.phase=mergedPath.phase;
     if(mergedPath.pathDraft)out.grammarPath.pathDraft=JSON.parse(JSON.stringify(mergedPath.pathDraft));else delete out.grammarPath.pathDraft;
     if(mergedPath.canonShownFor)out.grammarPath.canonShownFor=mergedPath.canonShownFor;else delete out.grammarPath.canonShownFor;
     if(mergedPath.contentRevision)out.grammarPath.contentRevision=mergedPath.contentRevision;else delete out.grammarPath.contentRevision;
     if(mergedPath.pathNeedsReplay)out.grammarPath.pathNeedsReplay=true;else delete out.grammarPath.pathNeedsReplay;
   }
   if(evidence)out.evidence=evidence.merge(out.evidence,incoming.evidence);
   if(before)evidence.recordConflicts(out,before,incoming);
   out.schema=7;
   if(nav())out.navigationResume=nav().mergeSlots(out.navigationResume,incoming&&incoming.navigationResume);
   return out;
 }
 function memoryStats(state,now=Date.now()){
   const hw=(state.events||[]).filter(e=>e.type==='answer'&&String(e.card_id||'').startsWith('hw'));
   const first=hw.filter(e=>e.first_try_correct!=null);
   const days=Object.create(null);
   for(const e of hw){
     const day=new Date(e.at).toISOString().slice(0,10);
     if(!days[day])days[day]={n:0,peek:0};
     days[day].n++;if(e.peek||e.hinted)days[day].peek++;
   }
   const last3=Object.keys(days).sort().slice(-3);
   const stop=last3.length===3&&last3.every(d=>days[d].n&&days[d].peek/days[d].n>0.5);
   return {
     firstTry:first.length?Math.round(100*first.filter(e=>e.first_try_correct).length/first.length):null,
     peekRate:hw.length?Math.round(100*hw.filter(e=>e.peek||e.hinted).length/hw.length):null,
     stop
   };
 }
 function answerIndex(questions){
   const index=new Map();
   for(const q of questions)if(q.kind==='fields')for(const f of q.fields)for(const a of f.answers){const key=core.normalize(a,f.kind);if(!index.has(key))index.set(key,new Set());index.get(key).add(q.id);}
   return index;
 }
 function observeConfusions(state,q,answers,result,at,index,assisted=false){
   if(assisted)return;
   if(q.kind==='multi'){
     const missed=q.correct.filter(a=>!answers.includes(a)),extra=answers.filter(a=>!q.correct.includes(a));
     if(missed.length===1&&extra.length===1)observeConfusions(state,{id:q.id,kind:'fields',fields:[{answers:missed,kind:'text'}]},extra,{parts:[false]},at,index,false);
     return;
   }
   if(q.kind!=='fields')return;
   q.fields.forEach((f,i)=>{
     const expected=core.normalize(f.answers[0],f.kind),actual=core.normalize(answers[i],f.kind);
     if(result.parts[i]){
       for(const pair of Object.values(state.confusions))if([pair.expected_answer,pair.wrong_answer_given].includes(expected)&&samePair(q,pair)){
         pair.successes[expected]=Math.min(2,(pair.successes[expected]||0)+1);
         pair.resolved=(pair.successes[pair.expected_answer]||0)>=2&&(!pair.known_alternative||(pair.successes[pair.wrong_answer_given]||0)>=2);
       }
       return;
     }
     if(!actual||actual.length>128||expected.length>128)return;
     // Unknown strings remain unverified mistakes, never invented answer keys.
     const key=JSON.stringify([expected,actual]);
     const pair=state.confusions[key]||{expected_answer:expected,wrong_answer_given:actual,confusion_count:0,card_ids:[],known_alternative:index.has(actual),successes:{},resolved:false};
     pair.confusion_count++;pair.last_wrong=at;pair.resolved=false;pair.successes={};if(!pair.card_ids.includes(q.id))pair.card_ids.push(q.id);state.confusions[key]=pair;
   });
   const ordered=Object.entries(state.confusions).sort((a,b)=>b[1].last_wrong-a[1].last_wrong);
   if(ordered.length>cfg.confusion.maxPairs)state.confusions=Object.fromEntries(ordered.slice(0,cfg.confusion.maxPairs));
 }
 function pairs(state){return Object.entries(state.confusions).filter(([,p])=>p.confusion_count>=cfg.confusion.minCount&&!p.resolved).sort((a,b)=>b[1].confusion_count-a[1].confusion_count);}
 const PAIR_WORDS=[['алты','алпыс'],['жеті','жетпіс'],['сегіз','сексен'],['тоғыз','тоқсан'],['сен','сіз'],['сың','сыз']];
 function pairWordsOf(q){
   const t=((q&&q.stimulus||'')+' '+((q&&q.fields)||[]).flatMap(f=>f.answers||[]).join(' ')+' '+(q&&q.title||'')).toLowerCase();
   const has=w=>new RegExp('(?:^|[^\\p{L}])'+w+'(?:$|[^\\p{L}])','iu').test(t);
   for(const [a,b] of PAIR_WORDS){if(has(b)||has(a))return [a,b];}
   return null;
 }
 function samePair(q,pair){
   if(!q||!pair)return false;
   if((pair.card_ids||[]).includes(q.id))return true;
   const words=pairWordsOf(q);
   return !!(words&&words.includes(pair.expected_answer)&&words.includes(pair.wrong_answer_given));
 }
 function contrastIds(pair,index,questions){
   const byId=new Map(questions.map(q=>[q.id,q]));
   const ids=questions.filter(q=>samePair(q,pair)&&byId.has(q.id)).map(q=>q.id);
   return [...new Set(ids)].slice(0,cfg.session.size);
 }
 // ---------- storage p0c (GPT fix design §3): a page that could not read IndexedDB at start ("pending") records
 // which values the user actually changed (pendingTouch, against the copy it started from). The next normal start
 // applies only that delta on top of the newer mirror (reconcilePending): additive parts are merged, monotonic
 // values take the max, other values come from the page only when touched. updatedAt alone is not a change
 // (save() refreshes it itself).
 function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
 function sameValue(a,b){return JSON.stringify(a)===JSON.stringify(b);}
 function changedKeys(a,b){a=obj(a)?a:{};b=obj(b)?b:{};const out=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!sameValue(a[k],b[k]))out.push(k);return out;}
 function unionList(a,b){return [...new Set([...(a||[]),...(b||[])])];}
 function pendingTouch(base,current,prior){
   const a=migrate(base),b=migrate(current);
   const t=clone(prior)||{learning:{lessonId:false,steps:[],notes:[],completedSteps:[]},prefs:false,explainDepth:[],preExam:[],savings:[],repair:false,place:false,rulesDraft:false,grammarPath:[],coursePath:[],coursePractice:[],courseResume:false};
   t.learning=t.learning||{lessonId:false,steps:[],notes:[],completedSteps:[]};
   if(a.learning.lessonId!==b.learning.lessonId)t.learning.lessonId=true;
   t.learning.steps=unionList(t.learning.steps,changedKeys(a.learning.steps,b.learning.steps));
   t.learning.notes=unionList(t.learning.notes,changedKeys(a.learning.notes,b.learning.notes));
   t.learning.completedSteps=unionList(t.learning.completedSteps,changedKeys(a.learning.completedSteps,b.learning.completedSteps));
   if(!sameValue(a.prefs,b.prefs))t.prefs=true;
   t.explainDepth=unionList(t.explainDepth,changedKeys(a.explainDepth,b.explainDepth));
   t.preExam=unionList(t.preExam,changedKeys(a.preExam&&a.preExam.trainers,b.preExam&&b.preExam.trainers));
   t.savings=unionList(t.savings,changedKeys(a.savings,b.savings));
   if(!sameValue(a.repair,b.repair))t.repair=true;
   if(!sameValue(a.place,b.place))t.place=true;
   if(!sameValue(a.rulesDraft,b.rulesDraft))t.rulesDraft=true;
   t.grammarPath=t.grammarPath||[];
   for(const k of ['topicId','step','phase','queue','index','blocked','lessonId','chapterId','beat','contentRevision','pathNeedsReplay','pathDraft','canonShownFor'])
     if(!sameValue(a.grammarPath&&a.grammarPath[k],b.grammarPath&&b.grammarPath[k])&&!t.grammarPath.includes(k))t.grammarPath.push(k);
   const ac=a.courseProgress||{lessons:{},resumePointer:null},bc=b.courseProgress||{lessons:{},resumePointer:null};
   t.coursePath=t.coursePath||[];t.coursePractice=t.coursePractice||[];
   for(const id of new Set([...Object.keys(ac.lessons||{}),...Object.keys(bc.lessons||{})])){
     const x=ac.lessons&&ac.lessons[id]||{},y=bc.lessons&&bc.lessons[id]||{};
     const xp=clone(x.path)||{},yp=clone(y.path)||{};delete xp.updatedAt;delete yp.updatedAt;
     if(!sameValue(xp,yp)&&!t.coursePath.includes(id))t.coursePath.push(id);
     const xs=clone(x.practiceSession),ys=clone(y.practiceSession);if(xs)delete xs.updatedAt;if(ys)delete ys.updatedAt;
     if(!sameValue(xs,ys)&&!t.coursePractice.includes(id))t.coursePractice.push(id);
   }
   const ar=clone(ac.resumePointer)||{},br=clone(bc.resumePointer)||{};delete ar.updatedAt;delete br.updatedAt;
   if(!sameValue(ar,br))t.courseResume=true;
   // storage p0d (GPT review 3): homework attempts and the «Формы слова» runtime are touched values too
   t.homework=unionList(t.homework,changedKeys(a.homeworkAttempts,b.homeworkAttempts));
   t.morph=t.morph||{session:false,chain:false,resume:false};
   const am=a.morphTrainer||{},bm=b.morphTrainer||{},strip=v=>{const c=clone(v);if(c&&typeof c==='object')delete c.updatedAt;return c;};
   if(!sameValue(strip(am.session),strip(bm.session)))t.morph.session=true;
   if(!sameValue(strip(am.chain),strip(bm.chain)))t.morph.chain=true;
   if(!sameValue(strip(am.teaching&&am.teaching.resume),strip(bm.teaching&&bm.teaching.resume)))t.morph.resume=true;
   return t;
 }
 function applyTouchedDict(target,page,keys){
   target=clone(target)||Object.create(null);page=page||{};
   for(const k of keys||[]){if(Object.prototype.hasOwnProperty.call(page,k))target[k]=clone(page[k]);else delete target[k];}
   return target;
 }
 function mergeRepair(a,b,touched){
   if(!touched)return clone(a);
   if(!a)return clone(b);
   if(!b)return null;
   if(a.rule_id!==b.rule_id)return clone(b);
   return {...clone(b),attempts:Math.max(Number(a.attempts)||0,Number(b.attempts)||0),blinds:Math.max(Number(a.blinds)||0,Number(b.blinds)||0),quiet_until:Math.max(Number(a.quiet_until)||0,Number(b.quiet_until)||0),roots_used:unionList(a.roots_used,b.roots_used).slice(0,8)};
 }
 function pathForward(a,b,touched){
   if(!touched)return clone(a);
   if(!a||!a.chapterId)return clone(b);
   if(!b||!b.chapterId)return clone(a);
   // same chapter: beat only moves forward
   if(a.chapterId===b.chapterId&&(a.contentRevision||null)===(b.contentRevision||null)){
     if((Number(b.beat)||0)>(Number(a.beat)||0))return clone(b);
     const out=clone(a);out.beat=Math.max(Number(a.beat)||0,Number(b.beat)||0);out.pathNeedsReplay=!!(a.pathNeedsReplay||b.pathNeedsReplay);return out;
   }
   // different chapters cannot be ordered here: keep the durable pointer (page.session still resumes the page)
   return clone(a);
 }
 function practiceForward(a,b,touched){
   if(!touched)return clone(a);
   if(!a)return clone(b);
   if(!b)return clone(a);
   if(a.queueEpoch!=null&&b.queueEpoch!=null&&a.queueEpoch===b.queueEpoch)return (Number(b.position)||0)>(Number(a.position)||0)?clone(b):clone(a);
   return clone(a);
 }
 // One homework attempt from two copies. Different started_at: the newer attempt, the older one kept in previous.
 // Same attempt: items by id (newer at wins), counters and export_rev never go back, checklist only gains ticks.
 function attemptSnapshot(a){return {started_at:a.started_at,items:clone(a.items||[]),rule_peeks:a.rule_peeks||0,answer_peeks:a.answer_peeks||0,submitted_at:a.submitted_at||null,export_rev:a.export_rev||0,checklist:clone(a.checklist||{})};}
 function unionPrevious(...lists){const m=new Map();for(const list of lists)for(const p of list||[])if(obj(p)&&!m.has(p.started_at))m.set(p.started_at,clone(p));return [...m.values()].sort((x,y)=>(x.started_at||0)-(y.started_at||0)).slice(-30);}
 function mergeAttempt(a,b){
   if(!obj(a))return clone(b);
   if(!obj(b))return clone(a);
   if((a.started_at||0)!==(b.started_at||0)){
     const newer=(b.started_at||0)>(a.started_at||0)?b:a,older=newer===b?a:b,out=clone(newer);
     out.previous=unionPrevious(older.previous,newer.previous,(older.items||[]).length||older.submitted_at?[attemptSnapshot(older)]:[]).filter(p=>p.started_at!==newer.started_at);
     return out;
   }
   const out=clone(a),items=(out.items||[]).slice(),index=new Map(items.map((it,i)=>[it.id,i]));
   for(const it of b.items||[]){const i=index.get(it.id);if(i===undefined){index.set(it.id,items.length);items.push(clone(it));}else if((Number(it.at)||0)>(Number(items[i].at)||0))items[i]=clone(it);}
   out.items=items;
   for(const k of ['rule_peeks','answer_peeks','export_rev'])out[k]=Math.max(Number(a[k])||0,Number(b[k])||0);
   out.submitted_at=Math.max(Number(a.submitted_at)||0,Number(b.submitted_at)||0)||null;
   const last=list=>Math.max(0,...(list||[]).map(it=>Number(it.at)||0));
   out.cursor=last(b.items)>last(a.items)?b.cursor:a.cursor;
   out.checklist=Object.assign({},a.checklist||{});for(const [k,v] of Object.entries(b.checklist||{}))if(v===true)out.checklist[k]=true;
   out.previous=unionPrevious(a.previous,b.previous);
   return out;
 }
 // «Формы слова» session touched on the blind page: same session moves only forward; another session = the page's.
 function morphSessionForward(a,b,touched){
   if(!touched)return clone(a);
   if(!a||!b)return clone(b);
   if(a.id!==b.id)return clone(b);
   const rank={question:0,feedback:1,complete:2},ka=(a.cursor||0)*3+(rank[a.phase]||0),kb=(b.cursor||0)*3+(rank[b.phase]||0);
   return kb>=ka?clone(b):clone(a);
 }
 function reconcilePending(authoritative,page,touch){
   const A=migrate(authoritative),B=migrate(page),t=touch||{};
   // a lesson package that differs between the copies keeps the mirror's version (P.merge would throw and block the start)
   const aPk=new Map((A.lesson_packages||[]).map(p=>[p.lesson_id,JSON.stringify(p)]));
   const Bm=Object.assign({},B,{lesson_packages:(B.lesson_packages||[]).filter(p=>!aPk.has(p.lesson_id)||aPk.get(p.lesson_id)===JSON.stringify(p))});
   const out=merge(A,Bm);
   // homework: untouched attempts stay as in the mirror; touched ones are merged item by item
   const hw=Object.assign(Object.create(null),clone(A.homeworkAttempts)||{});
   for(const [id,att] of Object.entries(B.homeworkAttempts||{}))if(!hw[id])hw[id]=clone(att);
   for(const id of t.homework||[])hw[id]=mergeAttempt(A.homeworkAttempts&&A.homeworkAttempts[id],B.homeworkAttempts&&B.homeworkAttempts[id]);
   out.homeworkAttempts=hw;
   // «Формы слова»: events/exposed/teaching events stay merged; the runtime pointers follow touch
   const tm=t.morph||{},am=A.morphTrainer||{},bm=B.morphTrainer||{};
   out.morphTrainer.session=morphSessionForward(am.session||null,bm.session||null,tm.session);
   if(!tm.chain)out.morphTrainer.chain=clone(am.chain||null);
   if(!tm.resume&&out.morphTrainer.teaching)out.morphTrainer.teaching.resume=clone(am.teaching&&am.teaching.resume||null);
   out.learning=clone(A.learning);
   if(t.learning&&t.learning.lessonId)out.learning.lessonId=B.learning.lessonId;
   for(const id of (t.learning&&t.learning.steps)||[])out.learning.steps[id]=Math.max(Number(A.learning.steps[id])||0,Number(B.learning.steps[id])||0);
   out.learning.notes=applyTouchedDict(A.learning.notes,B.learning.notes,t.learning&&t.learning.notes);
   for(const id of (t.learning&&t.learning.completedSteps)||[])if(A.learning.completedSteps[id]===true||B.learning.completedSteps[id]===true)out.learning.completedSteps[id]=true;
   out.prefs=t.prefs?clone(B.prefs):clone(A.prefs);
   out.explainDepth=applyTouchedDict(A.explainDepth,B.explainDepth,t.explainDepth);
   out.place=t.place?clone(B.place):clone(A.place);
   out.rulesDraft=t.rulesDraft?clone(B.rulesDraft):clone(A.rulesDraft);
   out.repair=mergeRepair(A.repair,B.repair,t.repair);
   out.savings=clone(A.savings)||Object.create(null);
   for(const id of t.savings||[])out.savings[id]=Math.max(Number(A.savings&&A.savings[id])||0,Number(B.savings&&B.savings[id])||0);
   out.preExam=clone(A.preExam)||{trainers:Object.create(null),updatedAt:0};out.preExam.trainers=out.preExam.trainers||Object.create(null);
   for(const id of t.preExam||[])out.preExam.trainers[id]=!!(A.preExam&&A.preExam.trainers&&A.preExam.trainers[id]||B.preExam&&B.preExam.trainers&&B.preExam.trainers[id]);
   out.preExam.updatedAt=Math.max(Number(A.preExam&&A.preExam.updatedAt)||0,Number(B.preExam&&B.preExam.updatedAt)||0);
   const ga=A.grammarPath||{},gb=B.grammarPath||{},g=clone(ga);
   g.completed=unionList(ga.completed,gb.completed).slice(0,40);
   g.legacyCompleted=unionList(ga.legacyCompleted,gb.legacyCompleted).slice(0,80);
   g.completedChapters=Object.assign(Object.create(null),ga.completedChapters||{},gb.completedChapters||{});
   for(const name of ['peeks','fails']){g[name]=Object.assign(Object.create(null),ga[name]||{});for(const [k,v] of Object.entries(gb[name]||{}))g[name][k]=Math.max(Number(g[name][k])||0,Number(v)||0);}
   g.passed=Object.assign(Object.create(null),ga.passed||{},gb.passed||{});
   const touchedGp=new Set(t.grammarPath||[]);
   for(const k of ['topicId','phase','queue','blocked','lessonId','chapterId','contentRevision','pathDraft','canonShownFor'])if(touchedGp.has(k))g[k]=clone(gb[k]);
   const sameLesson=(ga.lessonId||null)===(gb.lessonId||null),sameChapter=(ga.chapterId||null)===(gb.chapterId||null);
   if(touchedGp.has('step'))g.step=sameLesson?Math.max(Number(ga.step)||0,Number(gb.step)||0):Number(gb.step)||0;
   if(touchedGp.has('beat'))g.beat=sameLesson&&sameChapter?Math.max(Number(ga.beat)||0,Number(gb.beat)||0):Number(gb.beat)||0;
   if(touchedGp.has('index'))g.index=sameLesson?Math.max(Number(ga.index)||0,Number(gb.index)||0):Number(gb.index)||0;
   g.pathNeedsReplay=!!(ga.pathNeedsReplay||gb.pathNeedsReplay);
   out.grammarPath=g;
   const cp=out.courseProgress;
   for(const id of Object.keys(cp.lessons||{})){
     const aa=A.courseProgress&&A.courseProgress.lessons&&A.courseProgress.lessons[id],bb=B.courseProgress&&B.courseProgress.lessons&&B.courseProgress.lessons[id];
     if(!aa||!bb)continue;
     cp.lessons[id].path=pathForward(aa.path,bb.path,(t.coursePath||[]).includes(id));
     cp.lessons[id].practiceSession=practiceForward(aa.practiceSession,bb.practiceSession,(t.coursePractice||[]).includes(id));
   }
   cp.resumePointer=t.courseResume?clone(B.courseProgress.resumePointer):clone(A.courseProgress.resumePointer);
   out.courseProgress=cp;
   // the user goes on with the session of the page where they kept working
   out.session=clone(B.session);
   out.schema=7;
   return out;
 }
 const api={empty,migrate,serialize,validate,merge,pendingTouch,reconcilePending,answerIndex,observeConfusions,pairs,contrastIds,samePair,memoryStats,courseIds:courseProgress.courseIds,ensureCourseProgress:courseProgress.ensure,ensureLessonProgress:courseProgress.ensureLesson,setResumePointer:courseProgress.setResume,markLessonStarted:courseProgress.markStarted,markLessonCompleted:courseProgress.markCompleted,saveLessonPath:courseProgress.savePath,saveLessonPractice:courseProgress.savePractice,clearLessonPractice:courseProgress.clearPractice,normalizePracticeSession:courseProgress.normalizePractice,normalizeStageContext:courseProgress.normalizeStageContext,evaluateStage:courseProgress.evaluateStage,lessonStatusAfterStage:courseProgress.lessonStatusAfterStage,pushStageCompletion:courseProgress.pushStageCompletion,registerStages:courseProgress.registerStages,nextRegistered:courseProgress.nextRegistered,unknownQueueIds:courseProgress.unknownQueueIds,STAGE_REVISION:courseProgress.STAGE_REVISION};
 if(node)module.exports=api;else root.ProgressStore=api;
})(typeof window!=='undefined'?window:globalThis);
