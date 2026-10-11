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
 function tidySlot(slot){
   if(!slot||typeof slot!=='object'||Array.isArray(slot))return null;
   if(slot.status!=='paused'&&slot.status!=='closed')return null;
   if(!slot.snapshot||typeof slot.snapshot!=='object'||Array.isArray(slot.snapshot))return null;
   const snapshot=clone(slot.snapshot);
   if(!snapshot)return null;
   const out={status:slot.status,updatedAt:Number(slot.updatedAt)||0,origin:typeof slot.origin==='string'?slot.origin.slice(0,40):'park',snapshot};
   if(typeof slot.lessonId==='string'&&slot.lessonId)out.lessonId=slot.lessonId.slice(0,40);
   if(typeof slot.part==='string'&&slot.part)out.part=slot.part.slice(0,40);
   if(slot.section!=null&&Number.isFinite(Number(slot.section)))out.section=Math.max(0,Math.floor(Number(slot.section)));
   return out;
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
   return resume;
 }
 function keyFromSession(session){
   const s=session;
   if(!s||typeof s!=='object')return null;
   if(s.view==='path')return null;
   if(s.mode==='words'&&s.vocabRole==='must'&&s.trainerReturn==='vocab:must')return 'vocab:must';
   if(s.mode==='words'&&s.vocabRole==='used'&&s.trainerReturn==='vocab:used')return 'vocab:used';
   if(typeof s.trainerReturn==='string'&&/^number:[a-z0-9._-]{1,80}$/.test(s.trainerReturn))return s.trainerReturn;
   if(s.mode==='homework'&&s.hwLesson)return 'homework:'+s.hwLesson+':'+(s.hwPart||'exercises')+':'+String(s.hwSection||0);
   if(s.mode==='course'&&s.courseBlock&&!s.activeLesson)return 'course:'+s.courseBlock;
   if(s.mode==='phrase'&&s.courseBlock)return 'phrase:'+s.courseBlock;
   if(s.mode==='transfer'&&s.courseBlock)return 'transfer:'+s.courseBlock;
   if(s.mode==='lesson'&&s.activeLesson)return String(s.activeLesson).indexOf('numbers')===0?'number:'+s.activeLesson:'lesson:'+s.activeLesson;
   if(s.mode==='exam')return 'exam:'+(s.topic||'all');
   if(s.mode==='slice')return 'slice:probe';
   if(s.mode==='repair')return 'repair:day';
   if(s.mode==='contrast')return 'contrast:pair';
   if(s.mode==='numbers')return 'number:'+(s.activeLesson||s.topic||'track');
   if(Array.isArray(s.queue)&&s.queue.length){
     let key='queue:'+(s.mode||'ordered')+':'+(s.topic||'all');
     if(s.courseBlock)key+=':course:'+s.courseBlock;
     if(s.sourceFilter)key+=':source:'+s.sourceFilter;
     if(s.vocabRole)key+=':vocab:'+s.vocabRole;
     return validKey(key)?key:null;
   }
   return null;
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
   return true;
 }
 function get(state,key){
   if(!state||!validKey(key)||!state.navigationResume||!state.navigationResume.slots)return null;
   return state.navigationResume.slots[key]||null;
 }
 function mergeSlots(localResume,incomingResume){
   const out=adopt(localResume);
   const incoming=adopt(incomingResume);
   for(const [key,slot] of Object.entries(incoming.slots))if(!out.slots[key])out.slots[key]=slot;
   if(!out.lastRoute&&incoming.lastRoute)out.lastRoute=incoming.lastRoute;
   return out;
 }
 const api={emptyResume,adopt,seedLegacy,keyFromSession,put,get,mergeSlots,validKey,clone};
 if(node)module.exports=api;else root.NavigationState=api;
})(typeof window!=='undefined'?window:globalThis);
