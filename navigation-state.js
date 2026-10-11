(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const BAD=new Set(['__proto__','prototype','constructor']);
 const KEY_RE=/^[a-z0-9:._-]{1,120}$/;
 const PREFIXES=['vocab:','number:','homework:','course:','theory:','lesson:','preexam:','custom:','queue:','exam:','transfer:','slice:','repair:','contrast:','phrase:','remediation:','pause:'];
 function clone(value){try{return JSON.parse(JSON.stringify(value));}catch(e){return null;}}
 function emptyResume(){return {version:1,slots:Object.create(null),lastRoute:null};}
 function validKey(key){
   if(typeof key!=='string'||!KEY_RE.test(key)||BAD.has(key))return false;
   if(!PREFIXES.some(p=>key.startsWith(p)))return false;
   const parts=key.split(':');
   return parts.every(part=>part.length>0&&!BAD.has(part));
 }
 const PAUSED_CAP=24;
 const SNAPSHOT_MAX=65536;
 // Whole navigationResume budget (characters of JSON). 24 paused slots x 64 KiB would be ~1.5 M chars,
 // too much next to the main progress JSON in ~5 MB WebKit storage, so the oldest paused slots are
 // evicted until the namespace fits. Real slots are ~1-1.5 K chars, so this only bites on outliers.
 const RESUME_MAX=262144;
 function part(value){
   return String(value==null?'':value).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,48);
 }
 function shortHash(ids){
   const text=(Array.isArray(ids)?ids:[]).map(id=>String(id)).join('\n');
   let h=2166136261;
   for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
   return (h>>>0).toString(16).padStart(8,'0');
 }
 function sliceKey(block){const key='slice:'+(part(block)||'block');return validKey(key)?key:null;}
 function repairKey(ids){const key='repair:'+shortHash(ids);return validKey(key)?key:null;}
 function contrastKey(pair){
   const bits=pair&&typeof pair==='object'?[pair.expected_answer,pair.wrong_answer_given].concat(pair.card_ids||[]):[pair];
   const key='contrast:'+shortHash(bits);
   return validKey(key)?key:null;
 }
 function customKey(kind,ids){
   const k=part(kind)||'words';
   const key=(k==='remediation'?'remediation:':'custom:'+k+':')+shortHash(ids);
   return validKey(key)?key:null;
 }
 function examKey(topic,courseBlock){
   let key='exam:'+(part(topic)||'all');
   if(courseBlock)key+=':course:'+part(courseBlock);
   return validKey(key)?key:null;
 }
 function lessonKey(id){
   const raw=String(id||'');
   const key=raw.indexOf('numbers')===0?'number:'+part(raw):'lesson:'+part(raw);
   return validKey(key)?key:null;
 }
 function genericQueueKey(mode,topic,course,source,vocab){
   let key='queue:'+(mode||'ordered')+':'+(topic||'all');
   if(course)key+=':course:'+course;
   if(source)key+=':source:'+source;
   if(vocab)key+=':vocab:'+vocab;
   return validKey(key)?key:null;
 }
 function fitSnapshot(snapshot){
   let text=JSON.stringify(snapshot);
   if(text.length<=SNAPSHOT_MAX)return snapshot;
   const session=snapshot.session;
   if(session&&typeof session==='object'){
     delete session.variants;delete session.stepEvidence;delete session.remediation;
     if(Array.isArray(session.queue)&&session.queue.length>400)session.queue=session.queue.slice(0,400);
     if(Array.isArray(session.practiceIds)&&session.practiceIds.length>400)session.practiceIds=session.practiceIds.slice(0,400);
     snapshot.trimmed=true;
   }
   // SNAPSHOT_MAX is a hard cap: a snapshot still too big after trimming is rejected, not stored.
   text=JSON.stringify(snapshot);
   return typeof text==='string'&&text.length<=SNAPSHOT_MAX?snapshot:null;
 }
 function tidySlot(slot){
   if(!slot||typeof slot!=='object'||Array.isArray(slot))return null;
   if(slot.status!=='paused'&&slot.status!=='closed')return null;
   const out={status:slot.status,updatedAt:Number(slot.updatedAt)||0,origin:typeof slot.origin==='string'?slot.origin.slice(0,40):'park'};
   if(typeof slot.lessonId==='string'&&slot.lessonId)out.lessonId=slot.lessonId.slice(0,40);
   if(typeof slot.part==='string'&&slot.part)out.part=slot.part.slice(0,40);
   if(slot.section!=null&&Number.isFinite(Number(slot.section)))out.section=Math.max(0,Math.floor(Number(slot.section)));
   if(slot.status==='closed')return out;
   if(!slot.snapshot||typeof slot.snapshot!=='object'||Array.isArray(slot.snapshot))return null;
   const snapshot=fitSnapshot(clone(slot.snapshot));
   if(!snapshot)return null;
   out.snapshot=snapshot;
   return out;
 }
 function oldestPaused(resume,keepKey){
   return Object.entries(resume.slots).filter(([key,slot])=>slot&&slot.status==='paused'&&key!==keepKey).sort((a,b)=>(a[1].updatedAt||0)-(b[1].updatedAt||0)||(a[0]<b[0]?-1:1));
 }
 function enforcePausedCap(resume,keepKey){
   let guard=0;
   while(guard++<80){
     const paused=Object.entries(resume.slots).filter(([,slot])=>slot&&slot.status==='paused');
     if(paused.length<=PAUSED_CAP)break;
     const victims=oldestPaused(resume,keepKey);
     if(!victims.length)break;
     delete resume.slots[victims[0][0]];
   }
   const sizes=Object.create(null);
   let total=0;
   for(const [key,slot] of Object.entries(resume.slots)){sizes[key]=key.length+JSON.stringify(slot).length+4;total+=sizes[key];}
   if(total<=RESUME_MAX)return;
   for(const [key] of oldestPaused(resume,keepKey)){
     if(total<=RESUME_MAX)break;
     total-=sizes[key];
     delete resume.slots[key];
   }
 }
 function adopt(raw){
   const resume=emptyResume();
   if(!raw||typeof raw!=='object'||Array.isArray(raw))return resume;
   resume.lastRoute=typeof raw.lastRoute==='string'?raw.lastRoute.slice(0,120):null;
   const slots=raw.slots;
   if(slots&&typeof slots==='object'&&!Array.isArray(slots)){
     for(const [key,value] of Object.entries(slots)){
       if(!validKey(key))continue;
       const tidy=tidySlot(value);
       if(tidy)resume.slots[key]=tidy;
     }
   }
   enforcePausedCap(resume,null);
   return resume;
 }
 function epochsAllow(rt){
   if(typeof rt.queueEpoch!=='number'||typeof rt.trainerEpoch!=='number')return true;
   return rt.queueEpoch===rt.trainerEpoch;
 }
 function launchKeyFromRuntime(rt){
   const s=rt;
   if(!s||typeof s!=='object')return null;
   if(s.view==='morph')return null;
   if(s.view==='path'){
     const grammar=typeof s.grammarLesson==='string'?s.grammarLesson:(s.grammarPath&&typeof s.grammarPath.lessonId==='string'?s.grammarPath.lessonId:null);
     if(!grammar)return null;
     const key='theory:'+grammar;
     return validKey(key)?key:null;
   }
   const stamped=typeof s.launchKey==='string'&&validKey(s.launchKey)?s.launchKey:null;
   if(stamped&&(s.view==='practice'||s.view==='homework'))return stamped;
   if(s.mode==='words'&&s.vocabRole==='must'&&s.trainerReturn==='vocab:must'&&epochsAllow(s))return 'vocab:must';
   if(s.mode==='words'&&s.vocabRole==='used'&&s.trainerReturn==='vocab:used'&&epochsAllow(s))return 'vocab:used';
   if(typeof s.trainerReturn==='string'&&/^number:[a-z0-9._-]{1,80}$/.test(s.trainerReturn)&&epochsAllow(s))return s.trainerReturn;
   if(s.mode==='homework'&&s.hwLesson)return 'homework:'+s.hwLesson+':'+(s.hwPart||'exercises')+':'+String(s.hwSection||0);
   if(s.mode==='course'&&s.courseBlock&&!s.activeLesson)return 'course:'+s.courseBlock;
   if(s.mode==='phrase'&&s.courseBlock)return 'phrase:'+s.courseBlock;
   if(s.mode==='transfer'&&s.courseBlock)return 'transfer:'+s.courseBlock;
   if(s.mode==='remediation')return customKey('remediation',Array.isArray(s.repairIds)?s.repairIds:(Array.isArray(s.queue)?s.queue:[]));
   if(s.mode==='voluntary'&&s.activeLesson)return lessonKey(s.activeLesson);
   if(s.mode==='lesson'&&s.activeLesson)return lessonKey(s.activeLesson);
   if(s.mode==='exam')return examKey(s.topic,s.courseBlock);
   if(s.mode==='slice')return s.sliceBlock?sliceKey(s.sliceBlock):'slice:probe';
   if(s.mode==='repair'){const ids=Array.isArray(s.repairIds)?s.repairIds:(Array.isArray(s.queue)?s.queue:[]);return ids.length?repairKey(ids):'repair:day';}
   if(s.mode==='contrast')return s.contrastPair?contrastKey(s.contrastPair):'contrast:pair';
   if(s.mode==='numbers')return 'number:'+(s.activeLesson||s.topic||'track');
   if(s.mode==='preexam')return validKey('preexam:3-3')?'preexam:3-3':null;
   if((s.view==='practice'||s.view==='homework')&&Array.isArray(s.queue)&&s.queue.length){
     if(s.mode==='words'||s.mode==='voluntary'||s.mode==='chunks')return customKey(s.mode,s.queue);
     return genericQueueKey(s.mode,s.topic,s.courseBlock,s.sourceFilter,s.vocabRole);
   }
   return null;
 }
 function keyFromSession(session){
   return launchKeyFromRuntime(session);
 }
 function seedLegacy(state){
   if(!state||!state.session||typeof state.session!=='object')return;
   const key=keyFromSession(state.session);
   if(!validKey(key))return;
   state.navigationResume=state.navigationResume||emptyResume();
   if(state.navigationResume.slots[key])return;
   const session=clone(state.session);
   if(!session)return;
   state.navigationResume.slots[key]={status:'paused',updatedAt:0,origin:'legacy-once',snapshot:{kind:'session',session:session}};
 }
 function put(state,key,slot){
   if(!state||!validKey(key))return false;
   const tidy=tidySlot(slot);
   if(!tidy)return false;
   if(key.startsWith('homework:')){
     const parts=key.split(':');
     tidy.lessonId=parts[1]||'';
     tidy.part=parts[2]||'';
     tidy.section=Math.max(0,Math.floor(Number(parts[3])||0));
   }else if(key.startsWith('course:')||key.startsWith('theory:')||key.startsWith('lesson:')){
     tidy.lessonId=key.split(':').slice(1).join(':');
   }
   state.navigationResume=adopt(state.navigationResume);
   state.navigationResume.slots[key]=tidy;
   state.navigationResume.lastRoute=key;
   enforcePausedCap(state.navigationResume,key);
   return true;
 }
 function get(state,key){
   if(!state||!validKey(key)||!state.navigationResume||!state.navigationResume.slots)return null;
   return state.navigationResume.slots[key]||null;
 }
 function mergeSlots(localResume,incomingResume){
   const out=adopt(localResume);
   const incoming=adopt(incomingResume);
   for(const [key,slot] of Object.entries(incoming.slots)){
     const local=out.slots[key];
     if(local&&local.status==='closed')continue;
     if(!local)out.slots[key]=slot;
   }
   enforcePausedCap(out,null);
   if(!out.lastRoute&&incoming.lastRoute)out.lastRoute=incoming.lastRoute;
   return out;
 }
 const api={emptyResume,adopt,seedLegacy,keyFromSession,launchKeyFromRuntime,sliceKey,repairKey,contrastKey,customKey,examKey,lessonKey,genericQueueKey,shortHash,put,get,mergeSlots,validKey,clone,PAUSED_CAP,SNAPSHOT_MAX,RESUME_MAX};
 if(node)module.exports=api;else root.NavigationState=api;
})(typeof window!=='undefined'?window:globalThis);
