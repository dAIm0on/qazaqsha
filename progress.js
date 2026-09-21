(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const cfg=node?require('./config.js'):root.TRAINER_CONFIG,core=node?require('./core.js'):root.TrainerCore;
 const packages=node?require('./package-schema.js'):root.LessonPackageSchema;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const safe=k=>typeof k==='string'&&k.length<=300&&!['__proto__','prototype','constructor'].includes(k);
 function dictionary(value,transform){const out=Object.create(null);if(obj(value))for(const [k,v] of Object.entries(value))if(safe(k)){const next=transform(v,k);if(next!==undefined)out[k]=next;}return out;}
 function empty(){return {schema:6,records:Object.create(null),skills:Object.create(null),errors:[],issueLog:[],associations:Object.create(null),confusions:Object.create(null),vocabulary:Object.create(null),events:[],learning:{lessonId:'numbers-0',notes:{},steps:{},completedSteps:{}},prefs:{letters:false,lettersChosen:false},incidentalWeek:{key:'',added:0},homeworkAttempts:Object.create(null),grammarPath:{topicId:null,step:0,phase:'hub',queue:[],index:0,peeks:Object.create(null),fails:Object.create(null),passed:Object.create(null),blocked:false,completed:[],lessonId:null,chapterId:null,beat:0,completedChapters:Object.create(null),legacyCompleted:[]},session:null,lesson_packages:[],repair:null,savings:Object.create(null)};}
 function migrate(raw={},now=Date.now()){
   const state=empty();state.lesson_packages=packages.merge([],raw.lesson_packages||[]);state.skills=dictionary(raw.skills,r=>obj(r)?core.migrateRecord(r,now):undefined);state.errors=Array.isArray(raw.errors)?raw.errors.filter(e=>obj(e)&&typeof e.error_type==='string'&&Number.isFinite(e.timestamp)):[];state.records=dictionary(raw.records,r=>obj(r)?core.migrateRecord(r,now):undefined);
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
     state.grammarPath={topicId:typeof g.topicId==='string'?g.topicId:null,step:Math.max(0,Number(g.step)||0),phase:typeof g.phase==='string'?g.phase:'hub',queue:Array.isArray(g.queue)?g.queue.filter(safe).slice(0,40):[],index:Math.max(0,Number(g.index)||0),peeks:obj(g.peeks)?g.peeks:Object.create(null),fails:obj(g.fails)?g.fails:Object.create(null),passed:obj(g.passed)?g.passed:Object.create(null),blocked:!!g.blocked,completed:Array.isArray(g.completed)?g.completed.filter(safe).slice(0,40):[],lessonId:typeof g.lessonId==='string'?g.lessonId:null,chapterId:typeof g.chapterId==='string'?g.chapterId:null,beat:Math.max(0,Number(g.beat)||0),completedChapters:obj(g.completedChapters)?g.completedChapters:Object.create(null),legacyCompleted:Array.isArray(g.legacyCompleted)?g.legacyCompleted.concat(Array.isArray(g.completed)?g.completed:[]).filter(safe).slice(0,80):Array.isArray(g.completed)?g.completed.filter(safe):[]};
   }
   if(obj(raw.homeworkAttempts))state.homeworkAttempts=dictionary(raw.homeworkAttempts,(a,lesson)=>{
     if(!obj(a))return undefined;
     const items=Array.isArray(a.items)?a.items.filter(it=>obj(it)&&safe(it.id)).map(it=>({id:it.id,answers:Array.isArray(it.answers)?it.answers.slice(0,20).map(x=>String(x).slice(0,300)):[],correct:!!it.correct,rule_peek:!!it.rule_peek,answer_peek:!!it.answer_peek,skipped:!!it.skipped,expected:typeof it.expected==='string'?it.expected.slice(0,300):'',at:Number(it.at)||0,status:typeof it.status==='string'?it.status.slice(0,40):''})): [];
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
   if(!state.prefs.lettersChosen&&typeof globalThis.matchMedia==='function'&&globalThis.matchMedia('(max-width:690px)').matches)state.prefs.letters=true;
   state.issueLog=Array.isArray(raw.issueLog)?raw.issueLog.filter(x=>obj(x)&&typeof x.note==='string'&&Number.isFinite(x.at)).map(x=>({at:x.at,note:String(x.note).slice(0,800),view:typeof x.view==='string'?x.view.slice(0,40):'',mode:typeof x.mode==='string'?x.mode.slice(0,40):'',topic:typeof x.topic==='string'?x.topic.slice(0,40):'',courseBlock:typeof x.courseBlock==='string'?x.courseBlock.slice(0,20):'',lessonId:typeof x.lessonId==='string'?x.lessonId.slice(0,20):'',exerciseId:safe(x.exerciseId)?x.exerciseId:'',title:typeof x.title==='string'?x.title.slice(0,200):'',stimulus:typeof x.stimulus==='string'?x.stimulus.slice(0,200):'',source:typeof x.source==='string'?x.source.slice(0,80):''})).slice(-80):[];
   state.session=obj(raw.session)?raw.session:null;
   if(obj(raw.repair)&&typeof raw.repair.rule_id==='string')state.repair={rule_id:raw.repair.rule_id.slice(0,80),started:String(raw.repair.started||''),quiet_until:Number(raw.repair.quiet_until)||0,roots_used:Array.isArray(raw.repair.roots_used)?raw.repair.roots_used.filter(x=>typeof x==='string').slice(0,8):[],attempts:Math.max(0,Number(raw.repair.attempts)||0),blinds:Math.max(0,Number(raw.repair.blinds)||0)};
   if(obj(raw.savings))state.savings=dictionary(raw.savings,v=>Math.max(0,Math.floor(Number(v)||0)));
   return state;
 }
 function serialize(state){return JSON.stringify({app:'qazaq-trainer',schema:6,exported_at:new Date().toISOString(),policy_version:cfg.version,scheduler_config:{implementation:cfg.algorithm,desired_retention:cfg.fsrs.desired_retention,standard_weights:true},...state});}
 function validate(text,knownIds,now=Date.now()){
   if(new TextEncoder().encode(text).length>cfg.storage.maxImportBytes)throw Error('Файл слишком большой: максимум 20 МБ.');
   let raw;try{raw=JSON.parse(text);}catch{throw Error('Это не корректный JSON-файл.');}
   if(!obj(raw)||!obj(raw.records)||(raw.app&&raw.app!=='qazaq-trainer'))throw Error('Файл не похож на резервную копию тренажёра.');
   if(raw.schema!==undefined&&![1,2,3,4,5,6].includes(raw.schema))throw Error('Эта версия резервной копии пока не поддерживается.');
   if(Object.keys(raw.records).length+Object.keys(raw.skills||{}).length>20000)throw Error('Слишком много карточек в файле.');
   for(const [id,r] of [...Object.entries(raw.records),...Object.entries(raw.skills||{})]){
     if(!safe(id)||!obj(r))throw Error('В файле есть некорректная запись карточки.');
     if(r.fsrs&&!((typeof module!=='undefined'&&module.exports?require('./scheduler.js'):root.ReviewScheduler).validCard(r.fsrs)))throw Error('Повреждено состояние FSRS: '+id);
     for(const key of ['seen','attempts','correct_count','correct','wrong_count','correct_streak','streak','next_review','dueAt','response_time'])
       if(r[key]!=null&&(!Number.isFinite(r[key])||r[key]<0))throw Error('Некорректное значение в карточке '+id+'.');
     const seen=r.seen??r.attempts??0;if((r.correct_count??r.correct??0)>seen||(r.wrong_count??0)>seen)throw Error('Счётчики ответов не согласованы: '+id+'.');
   }
   const state=migrate(raw,now),ids=Object.keys(state.records),unknown=ids.filter(id=>!knownIds.has(id)).length;
   return {state,summary:{cards:ids.length,unknown,events:state.events.length,associations:Object.keys(state.associations).length},warning:unknown?'Записи отсутствующих в этой версии карточек сохранятся, но не попадут в тренировку.':''};
 }
 function merge(current,incoming){
   const out=migrate(current);out.session=null;out.lesson_packages=packages.merge(out.lesson_packages,incoming.lesson_packages);
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
   out.events=[...eventMap.values()].sort((a,b)=>a.at-b.at).slice(-cfg.storage.maxEvents);
   out.prefs={letters:!!(incoming.prefs&&incoming.prefs.letters)||!!out.prefs.letters,lettersChosen:!!(incoming.prefs&&incoming.prefs.lettersChosen)||!!out.prefs.lettersChosen};
   Object.assign(out.learning.steps,incoming.learning.steps);
   Object.assign(out.learning.notes,incoming.learning.notes);Object.assign(out.learning.completedSteps,incoming.learning.completedSteps);
   if(incoming.incidentalWeek){
     const a=out.incidentalWeek||{key:'',added:0},b=incoming.incidentalWeek;
     out.incidentalWeek=a.key===b.key?{key:a.key,added:Math.max(a.added||0,b.added||0)}:(b.key||'')>(a.key||'')?{key:b.key,added:b.added||0}:a;
   }
   if(incoming.grammarPath)out.grammarPath=incoming.grammarPath;
   if(incoming.homeworkAttempts){
     out.homeworkAttempts=out.homeworkAttempts||Object.create(null);
     for(const [lesson,a] of Object.entries(incoming.homeworkAttempts)){
       const old=out.homeworkAttempts[lesson];
       if(!old||(a.started_at||0)>=(old.started_at||0))out.homeworkAttempts[lesson]=a;
     }
   }
   if(Array.isArray(incoming.issueLog)){
     const map=new Map([...(out.issueLog||[]),...incoming.issueLog].map(x=>[String(x.at)+'|'+String(x.note||'').slice(0,80),x]));
     out.issueLog=[...map.values()].sort((a,b)=>a.at-b.at).slice(-80);
   }
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
       for(const pair of Object.values(state.confusions))if([pair.expected_answer,pair.wrong_answer_given].includes(expected)){
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
 function contrastIds(pair,index,questions){
   const a=[...(index.get(pair.expected_answer)||[])],b=pair.known_alternative?[...(index.get(pair.wrong_answer_given)||[])]:[];
   const byId=new Map(questions.map(q=>[q.id,q]));
   const small=ids=>ids.filter(id=>byId.has(id)).sort((x,y)=>byId.get(x).fields.length-byId.get(y).fields.length);
   const left=small([...new Set([...pair.card_ids,...a])]),right=small(b),out=[];
   for(let i=0;i<Math.max(left.length,right.length);i++){if(left[i]&&!out.includes(left[i]))out.push(left[i]);if(right[i]&&!out.includes(right[i]))out.push(right[i]);if(out.length>=cfg.session.size)break;}
   return out.slice(0,cfg.session.size);
 }
 const api={empty,migrate,serialize,validate,merge,answerIndex,observeConfusions,pairs,contrastIds,memoryStats};
 if(node)module.exports=api;else root.ProgressStore=api;
})(typeof window!=='undefined'?window:globalThis);
