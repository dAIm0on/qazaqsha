(function(root){
'use strict';const node=typeof module!=='undefined'&&module.exports,E=node?require('./morph-engine.js'):root.MorphEngine;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),safe=s=>typeof s==='string'&&s.length<250&&!['__proto__','constructor','prototype'].includes(s);
const copy=x=>JSON.parse(JSON.stringify(x)),stamp=x=>Number.isFinite(x)&&x>=0?x:0;
const HISTORY_LIMIT=400,historyNote='В файле прогресса хранятся последние 400 ответов этого тренажёра. Более длинный разбор эта версия не обещает.';
const TEACHING_CONTENT_VERSION='morph-teaching-20260926-v3',TEACHING_HISTORY_LIMIT=400;
const TEACHING_STEPS=new Set(['SEMANTIC_INTRO','FULL_EXPLANATION','CONTRAST_EXAMPLES','FEATURE_NOTICE','GUIDED_CHOICE','INDEPENDENT_CHOICE','FULL_INPUT','ERROR_REPAIR','MIXED_PRACTICE','TRANSFER_BLOCK','RETENTION_REVIEW']);
const TEACHING_EVENTS=new Set(['semantic_intro_seen','semantic_intro_completed','full_explanation_opened','semantic_check_attempt','feature_notice_attempt','guided_attempt','correction_after_feedback','chain_junction_attempt','stage5_module_completed','teaching_module_completed']);
const moduleIds=new Set(['meaning',...E.data.levels.map(x=>x.id)]);
function emptyTeaching(){return {version:1,contentVersion:TEACHING_CONTENT_VERSION,events:[],resume:null,updatedAt:0,recovery:null};}
function empty(){return {version:1,dataVersion:E.data.version,events:[],exposed:[],session:null,teaching:emptyTeaching(),chain:null,updatedAt:0,recovery:null};}
function chainSession(v){
 if(!obj(v)||v.version!==1||v.dataVersion!==E.data.version||v.contentVersion!==TEACHING_CONTENT_VERSION||!safe(v.id))return null;
 if(!['guided','independent'].includes(v.lane)||!['choice','input'].includes(v.responseMode))return null;
 if(!Array.isArray(v.chains)||!v.chains.length||v.chains.length>12)return null;
 const lemmaOk=id=>E.data.lemmas.some(l=>l.id===id&&l.split==='train'&&l.pos==='noun');
 if(!v.chains.every(c=>obj(c)&&safe(c.chainId)&&lemmaOk(c.lemmaId)&&Array.isArray(c.sequence)&&c.sequence.length<=5&&c.sequence.every(x=>E.data.families[x])))return null;
 try{for(const c of v.chains)E.form(c.lemmaId,c.sequence);}catch{return null;}
 if(!Number.isInteger(v.chainIndex)||v.chainIndex<0||v.chainIndex>v.chains.length)return null;
 if(!Number.isInteger(v.junction)||v.junction<0||v.junction>5)return null;
 if(!['question','feedback','repair','complete'].includes(v.phase))return null;
 const ids=Array.isArray(v.acceptedEventIds)?v.acceptedEventIds.filter(safe).slice(0,80):[];
 const exposed=Array.isArray(v.exposedRepairLemmas)?v.exposedRepairLemmas.filter(lemmaOk).slice(0,40):[];
 const result=obj(v.result)&&safe(v.result.eventId)?{eventId:v.result.eventId,response:String(v.result.response||'').slice(0,200),correct:!!v.result.correct,errorCodes:Array.isArray(v.result.errorCodes)?v.result.errorCodes.filter(safe).slice(0,5):[]}:null;
 if(v.phase==='feedback'&&!result)return null;
 let repair=null;
 if(v.phase==='repair'){
  if(!obj(v.repair)||!lemmaOk(v.repair.repairLemmaId)||!lemmaOk(v.repair.sourceLemmaId)||!safe(v.repair.sourceChainId))return null;
  if(!Array.isArray(v.repair.sequence)||!v.repair.sequence.every(x=>E.data.families[x]))return null;
  try{E.form(v.repair.repairLemmaId,v.repair.sequence);}catch{return null;}
  repair={sourceChainId:v.repair.sourceChainId,sourceLemmaId:v.repair.sourceLemmaId,sourceJunction:Math.max(0,Math.min(5,v.repair.sourceJunction|0)),repairLemmaId:v.repair.repairLemmaId,sequence:v.repair.sequence.slice(),response:String(v.repair.response||'').slice(0,200),expected:String(v.repair.expected||'').slice(0,200),errorCodes:Array.isArray(v.repair.errorCodes)?v.repair.errorCodes.filter(safe).slice(0,5):[]};
 }
 return {id:v.id,version:1,dataVersion:v.dataVersion,contentVersion:TEACHING_CONTENT_VERSION,lane:v.lane,responseMode:v.responseMode,chains:v.chains.map(c=>({chainId:c.chainId,lemmaId:c.lemmaId,sequence:c.sequence.slice()})),chainIndex:v.chainIndex,junction:v.junction,phase:v.phase,draft:String(v.draft||'').slice(0,200),result,repair,acceptedEventIds:ids,exposedRepairLemmas:exposed,startedAt:stamp(v.startedAt),updatedAt:stamp(v.updatedAt)};
}
function text(v,max){return typeof v==='string'&&v.length>0&&v.length<=max&&!['__proto__','constructor','prototype'].includes(v);}
function strings(v,max){return Array.isArray(v)&&v.length<=max&&v.every(x=>safe(x));}
function teachingEvent(v){
 if(!obj(v)||!safe(v.eventId)||!TEACHING_EVENTS.has(v.type)||!moduleIds.has(v.moduleId)||!Number.isFinite(v.at))return null;
 const familyId=v.familyId==null?null:(E.data.families[v.familyId]?v.familyId:null);if(v.familyId!=null&&!familyId)return null;
 const responseMode=['view','choice','input'].includes(v.responseMode)?v.responseMode:'view';
 const answer=v.answer==null?'':String(v.answer).slice(0,200);
 let itemId=null,lemmaId=null;
 if(v.itemId!=null){
  const item=safe(v.itemId)?E.getItem(v.itemId):null;if(!item)return null;itemId=item.id;lemmaId=item.lemmaId;
 }else if(v.lemmaId!=null){
  if(!safe(v.lemmaId)||!E.data.lemmas.some(x=>x.id===v.lemmaId))return null;lemmaId=v.lemmaId;
 }
 const contentVersion=typeof v.contentVersion==='string'&&v.contentVersion.length<80?v.contentVersion:TEACHING_CONTENT_VERSION;
 return {eventId:v.eventId,type:v.type,moduleId:v.moduleId,familyId,itemId,lemmaId,at:stamp(v.at),contentVersion,responseMode,answer,correct:v.correct==null?null:!!v.correct,hinted:!!v.hinted,productionMastery:false};
}
function teachingResume(v){
 if(!obj(v)||v.contentVersion!==TEACHING_CONTENT_VERSION||!moduleIds.has(v.currentModule)||!TEACHING_STEPS.has(v.currentTeachingStep))return null;
 const familyId=v.familyId==null?null:(E.data.families[v.familyId]?v.familyId:null);if(v.familyId!=null&&!familyId)return null;
 const stepIndex=Math.max(0,Math.min(999,Math.floor(Number(v.stepIndex)||0)));
 return {contentVersion:TEACHING_CONTENT_VERSION,currentModule:v.currentModule,currentTeachingStep:v.currentTeachingStep,familyId,stepIndex,draft:String(v.draft||'').slice(0,400),updatedAt:stamp(v.updatedAt)};
}
function teachingMigrate(raw){
 const out=emptyTeaching();if(raw==null)return out;
 if(!obj(raw)||raw.version!==1){out.recovery='Учебное состояние не удалось прочитать. Ответы тренажёра сохранены.';return out;}
 const map=new Map();
 for(const v of Array.isArray(raw.events)?raw.events:[]){const e=teachingEvent(v);if(e&&!map.has(e.eventId))map.set(e.eventId,e);}
 out.events=[...map.values()].sort((a,b)=>a.at-b.at||a.eventId.localeCompare(b.eventId)).slice(-TEACHING_HISTORY_LIMIT);
 out.updatedAt=stamp(raw.updatedAt);
 if(raw.contentVersion===TEACHING_CONTENT_VERSION)out.resume=teachingResume(raw.resume);
 else{
  out.resume=null;
  if(raw.contentVersion)out.recovery='Учебный контент обновился. История знакомства и подсказок сохранена; продолжение начнётся с актуального шага.';
 }
 if(!out.recovery&&typeof raw.recovery==='string'&&raw.recovery.length<400)out.recovery=raw.recovery;
 return out;
}
function teachingMerge(a,b){
 const x=teachingMigrate(a),y=teachingMigrate(b),map=new Map();
 for(const e of [...x.events,...y.events]){const old=map.get(e.eventId);if(!old||JSON.stringify(e)<JSON.stringify(old))map.set(e.eventId,e);}
 const xr=x.resume,yr=y.resume;let resume=xr||yr;
 if(xr&&yr){if((yr.updatedAt||0)>(xr.updatedAt||0))resume=yr;else if((yr.updatedAt||0)===(xr.updatedAt||0)&&JSON.stringify(yr)<JSON.stringify(xr))resume=yr;}
 const newer=(y.updatedAt||0)>(x.updatedAt||0)?y:x;
 return {version:1,contentVersion:TEACHING_CONTENT_VERSION,events:[...map.values()].sort((p,q)=>p.at-q.at||p.eventId.localeCompare(q.eventId)).slice(-TEACHING_HISTORY_LIMIT),resume,updatedAt:Math.max(x.updatedAt,y.updatedAt),recovery:newer.recovery||null};
}
function event(v,live){
 if(!obj(v)||!safe(v.eventId)||!safe(v.itemId)||!safe(v.lemmaId)||!strings(v.sequence,5)||!v.sequence.length||!Number.isFinite(v.at))return null;
 if(v.response!=null&&typeof v.response!=='string')return null;
 if(!text(v.expected,200))return null;
 if(v.contextClasses!=null&&!strings(v.contextClasses,8))return null;
 const item=E.getItem(v.itemId);
 if(live){
  if(!item||item.expected!==v.expected||item.lemmaId!==v.lemmaId||item.sequence.join('.')!==v.sequence.join('.'))return null;
 }
 const revised=item&&item.expected!==v.expected;
 return {eventId:v.eventId,itemId:v.itemId,lemmaId:v.lemmaId,sequence:v.sequence.slice(),contextClasses:Array.isArray(v.contextClasses)?v.contextClasses.slice(0,8):[],level:E.data.levels.some(x=>x.id===v.level)?v.level:'mixed',mode:v.mode==='transfer'?'transfer':'learn',modality:v.modality==='audio'?'audio':'text',responseMode:v.responseMode==='input'?'input':'choice',response:String(v.response||'').slice(0,200),expected:v.expected,correct:!!v.correct,hinted:!!v.hinted,errorCodes:Array.isArray(v.errorCodes)?v.errorCodes.filter(safe).slice(0,5):[],responseTime:Number.isFinite(v.responseTime)&&v.responseTime>=0?v.responseTime:null,at:v.at,dataVersion:typeof v.dataVersion==='string'&&v.dataVersion.length<80?v.dataVersion:E.data.version,transfer:v.mode==='transfer',audioAssetId:safe(v.audioAssetId)?v.audioAssetId:null,normRevision:revised?item.expected:null,scored:!revised};
}
function session(v){
 if(!obj(v)||v.version!==1||v.dataVersion!==E.data.version||!safe(v.id)||!Array.isArray(v.queue)||!v.queue.length||v.queue.length>40||!Number.isInteger(v.cursor)||v.cursor<0||v.cursor>v.queue.length||!['question','feedback','complete'].includes(v.phase)||!['learn','transfer'].includes(v.mode)||!['choice','input'].includes(v.responseMode))return null;
 if(!v.queue.every(q=>obj(q)&&E.getItem(q.id)&&Array.isArray(q.options)&&q.options.every(x=>typeof x==='string'&&x.length<=150)&&new Set(q.options).size===q.options.length&&q.options.includes(E.getItem(q.id).expected)))return null;
 if(v.phase==='complete'&&v.cursor!==v.queue.length||v.phase!=='complete'&&v.cursor>=v.queue.length)return null;
 const result=event(v.result,false);if(v.phase==='feedback'&&(!result||result.eventId!==v.id+':'+v.cursor))return null;
 const note=s=>safe(s)?s:'';
 return {id:v.id,version:1,dataVersion:v.dataVersion,level:E.data.levels.some(x=>x.id===v.level)?v.level:'mixed',mode:v.mode,responseMode:v.responseMode,modality:'text',queue:copy(v.queue),cursor:v.cursor,phase:v.phase,draft:String(v.draft||'').slice(0,200),hinted:!!v.hinted,result,startedAt:stamp(v.startedAt),updatedAt:stamp(v.updatedAt),results:Array.isArray(v.results)?v.results.map(x=>event(x,false)).filter(Boolean).slice(-40):[],complete:v.phase==='complete',closesLevel:v.closesLevel!==false,transferNote:note(v.transferNote),holdoutNote:note(v.holdoutNote),unscoredFamilies:Array.isArray(v.unscoredFamilies)?v.unscoredFamilies.filter(x=>E.data.families[x]).slice(0,20):[]};
}
function migrate(raw){
 const out=empty();if(raw==null)return out;if(!obj(raw)||raw.version!==1){out.recovery='Состояние тренажёра не удалось прочитать. Прогресс курса сохранён.';return out;}
 const map=new Map(),incoming=Array.isArray(raw.events)?raw.events:[];let dropped=0;
 for(const v of incoming){const e=event(v,false);if(!e){dropped++;continue;}if(!map.has(e.eventId))map.set(e.eventId,e);}
 out.events=[...map.values()].sort((a,b)=>a.at-b.at).slice(-HISTORY_LIMIT);
 out.exposed=[...new Set([...(Array.isArray(raw.exposed)?raw.exposed:[]),...out.events.map(e=>e.lemmaId)])].filter(safe);out.updatedAt=stamp(raw.updatedAt);out.session=session(raw.session);out.teaching=teachingMigrate(raw.teaching);out.chain=chainSession(raw.chain);
 const prior=typeof raw.recovery==='string'&&raw.recovery.length<400?raw.recovery:'';
 if(raw.session&&!out.session)out.recovery=incoming.length&&!map.size?'История ответа не перенесена: записи не прошли проверку. Начни новый подход.':dropped?'Часть истории не прошла проверку. Сохранённые ответы на месте. Начни новый подход.':'Банк заданий обновился или сессия повреждена. История сохранена; начни новый подход.';
 else if(raw.chain&&!out.chain)out.recovery='Цепочка закрыта: банк или учебная версия изменились. История ответов и курс сохранены.';
 else out.recovery=!out.session&&prior?prior:null;
 return out;
}
function merge(a,b){const x=migrate(a),y=migrate(b),m=new Map();for(const e of [...x.events,...y.events]){const old=m.get(e.eventId);if(!old||JSON.stringify(e)<JSON.stringify(old))m.set(e.eventId,e);}const chain=!x.chain?y.chain:!y.chain?x.chain:(y.chain.updatedAt||0)>=(x.chain.updatedAt||0)?y.chain:x.chain;return {...x,events:[...m.values()].sort((a,b)=>a.at-b.at).slice(-HISTORY_LIMIT),exposed:[...new Set([...x.exposed,...y.exposed])],session:x.session||y.session,chain,teaching:teachingMerge(x.teaching,y.teaching),updatedAt:Math.max(x.updatedAt,y.updatedAt)};}
function putChain(raw,value){const out=migrate(raw);if(value==null){out.chain=null;out.updatedAt=Date.now();return out;}const clean=chainSession(value);if(!clean)throw Error('Invalid morph chain');out.chain=clean;out.updatedAt=Math.max(out.updatedAt,clean.updatedAt||Date.now());return out;}
function putSession(raw,s){const out=migrate(raw),clean=session(s);if(s&&!clean)throw Error('Invalid morph session');out.session=clean;out.updatedAt=Date.now();if(clean){out.recovery=null;out.exposed=[...new Set([...out.exposed,...clean.queue.map(q=>E.getItem(q.id).lemmaId)])];}return out;}
function accept(raw,result){const out=migrate(raw),e=event(result?.event,true),s=session(result?.session);if(!e||!s||!out.session||out.session.id!==s.id||out.session.cursor!==s.cursor)return {state:out,accepted:false};const card=out.session.queue[out.session.cursor];if(!card||card.id!==e.itemId||e.eventId!==out.session.id+':'+out.session.cursor)return {state:out,accepted:false};if(out.events.some(x=>x.eventId===e.eventId)||out.session.phase!=='question')return {state:out,accepted:false};out.events=[...out.events,e].slice(-HISTORY_LIMIT);out.session=s;out.updatedAt=e.at;return {state:out,accepted:true,event:e};}
function recordTeaching(raw,input){
 const out=migrate(raw),value={...input,contentVersion:input&&input.contentVersion||TEACHING_CONTENT_VERSION},e=teachingEvent(value);
 if(!e||out.teaching.events.some(x=>x.eventId===e.eventId))return {state:out,accepted:false};
 out.teaching.events=[...out.teaching.events,e].slice(-TEACHING_HISTORY_LIMIT);out.teaching.updatedAt=e.at;out.teaching.recovery=null;out.updatedAt=Math.max(out.updatedAt,e.at);
 return {state:out,accepted:true,event:e};
}
function putTeachingResume(raw,value){
 const out=migrate(raw);if(value==null){out.teaching.resume=null;out.teaching.updatedAt=Date.now();out.updatedAt=Math.max(out.updatedAt,out.teaching.updatedAt);return out;}
 const clean=teachingResume({...value,contentVersion:TEACHING_CONTENT_VERSION,updatedAt:Number.isFinite(value.updatedAt)?value.updatedAt:Date.now()});if(!clean)throw Error('Invalid teaching resume');
 out.teaching.resume=clean;out.teaching.updatedAt=clean.updatedAt;out.teaching.recovery=null;out.updatedAt=Math.max(out.updatedAt,out.teaching.updatedAt);return out;
}
function productionChannel(e){
 if(!e||e.scored===false||e.modality==='audio')return 'excluded';
 if(e.transfer||e.mode==='transfer')return 'transfer';
 if(e.hinted)return 'guided';
 if(e.level==='mixed')return 'mixed';
 return e.responseMode==='input'?'independent_input':'independent_choice';
}
function teachingEvidence(raw,{moduleId=null,familyId=null}={}){
 const out=migrate(raw),answers=out.events.filter(e=>(!moduleId||e.level===moduleId)&&(!familyId||e.sequence.at(-1)===familyId));
 const teaching=out.teaching.events.filter(e=>(!moduleId||e.moduleId===moduleId)&&(!familyId||e.familyId===familyId));
 const count=(list,pred)=>{const rows=list.filter(pred);return {attempts:rows.length,correct:rows.filter(x=>x.correct===true).length};};
 return {
  semanticIntroSeen:teaching.some(e=>e.type==='semantic_intro_seen'||e.type==='semantic_intro_completed'),
  semanticIntroCompleted:teaching.some(e=>e.type==='semantic_intro_completed'),
  fullExplanationOpened:teaching.some(e=>e.type==='full_explanation_opened'),
  semanticChecks:count(teaching,e=>e.type==='semantic_check_attempt'),
  featureNotice:count(teaching,e=>e.type==='feature_notice_attempt'),
  guided:{attempts:teaching.filter(e=>e.type==='guided_attempt').length+answers.filter(e=>productionChannel(e)==='guided').length,correct:teaching.filter(e=>e.type==='guided_attempt'&&e.correct===true).length+answers.filter(e=>productionChannel(e)==='guided'&&e.correct).length},
  corrections:count(teaching,e=>e.type==='correction_after_feedback'),
  independentChoice:count(answers,e=>productionChannel(e)==='independent_choice'),
  independentInput:count(answers,e=>productionChannel(e)==='independent_input'),
  mixed:count(answers,e=>productionChannel(e)==='mixed'),
  transfer:count(answers,e=>productionChannel(e)==='transfer'),
  moduleCompleted:teaching.some(e=>e.type==='stage5_module_completed'||e.type==='teaching_module_completed')
 };
}
function forMastery(events){return (events||[]).filter(e=>e&&e.scored!==false&&e.modality!=='audio');}
function scheduleUpdate(e){if(!e||e.transfer||e.mode==='transfer')return null;return {correct:!!e.correct,hinted:!!e.hinted,recall:e.responseMode==='input',at:e.at,responseTime:e.responseTime};}
function resumeSurface(view,hasMorphSession,lessonOpen,lessonViews=['practice','homework','learn','path','review']){if(view==='morph'&&hasMorphSession)return 'morph';if(lessonOpen&&lessonViews.includes(view))return view;return 'today';}
const api={empty,migrate,merge,putSession,accept,session,emptyTeaching,teachingMigrate,recordTeaching,putTeachingResume,putChain,chainSession,productionChannel,teachingEvidence,forMastery,scheduleUpdate,resumeSurface,HISTORY_LIMIT,historyNote,TEACHING_CONTENT_VERSION,TEACHING_HISTORY_LIMIT};if(node)module.exports=api;else root.MorphState=api;
})(typeof window!=='undefined'?window:globalThis);
