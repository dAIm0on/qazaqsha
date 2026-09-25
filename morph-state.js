(function(root){
'use strict';const node=typeof module!=='undefined'&&module.exports,E=node?require('./morph-engine.js'):root.MorphEngine;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),safe=s=>typeof s==='string'&&s.length<250&&!['__proto__','constructor','prototype'].includes(s);
const copy=x=>JSON.parse(JSON.stringify(x)),stamp=x=>Number.isFinite(x)&&x>=0?x:0;
const HISTORY_LIMIT=400,historyNote='В файле прогресса хранятся последние 400 ответов этого тренажёра. Более длинный разбор эта версия не обещает.';
function empty(){return {version:1,dataVersion:E.data.version,events:[],exposed:[],session:null,updatedAt:0,recovery:null};}
function text(v,max){return typeof v==='string'&&v.length>0&&v.length<=max&&!['__proto__','constructor','prototype'].includes(v);}
function strings(v,max){return Array.isArray(v)&&v.length<=max&&v.every(x=>safe(x));}
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
 return {eventId:v.eventId,itemId:v.itemId,lemmaId:v.lemmaId,sequence:v.sequence.slice(),contextClasses:Array.isArray(v.contextClasses)?v.contextClasses.slice(0,8):[],level:E.data.levels.some(x=>x.id===v.level)?v.level:'mixed',mode:v.mode==='transfer'?'transfer':'learn',modality:v.modality==='audio'?'audio':'text',responseMode:v.responseMode==='input'?'input':'choice',response:String(v.response||'').slice(0,200),expected:v.expected,correct:!!v.correct,hinted:!!v.hinted,errorCodes:Array.isArray(v.errorCodes)?v.errorCodes.filter(safe).slice(0,5):[],responseTime:Number.isFinite(v.responseTime)&&v.responseTime>=0?v.responseTime:null,at:v.at,dataVersion:typeof v.dataVersion==='string'&&v.dataVersion.length<80?v.dataVersion:E.data.version,transfer:v.mode==='transfer',audioAssetId:null,normRevision:revised?item.expected:null,scored:!revised};
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
 out.exposed=[...new Set([...(Array.isArray(raw.exposed)?raw.exposed:[]),...out.events.map(e=>e.lemmaId)])].filter(safe);out.updatedAt=stamp(raw.updatedAt);out.session=session(raw.session);
 const prior=typeof raw.recovery==='string'&&raw.recovery.length<400?raw.recovery:'';
 if(raw.session&&!out.session)out.recovery=incoming.length&&!map.size?'История ответа не перенесена: записи не прошли проверку. Начни новый подход.':dropped?'Часть истории не прошла проверку. Сохранённые ответы на месте. Начни новый подход.':'Банк заданий обновился или сессия повреждена. История сохранена; начни новый подход.';
 else out.recovery=!out.session&&prior?prior:null;
 return out;
}
function merge(a,b){const x=migrate(a),y=migrate(b),m=new Map();for(const e of [...x.events,...y.events]){const old=m.get(e.eventId);if(!old||JSON.stringify(e)<JSON.stringify(old))m.set(e.eventId,e);}return {...x,events:[...m.values()].sort((a,b)=>a.at-b.at).slice(-HISTORY_LIMIT),exposed:[...new Set([...x.exposed,...y.exposed])],session:x.session||y.session,updatedAt:Math.max(x.updatedAt,y.updatedAt)};}
function putSession(raw,s){const out=migrate(raw),clean=session(s);if(s&&!clean)throw Error('Invalid morph session');out.session=clean;out.updatedAt=Date.now();if(clean){out.recovery=null;out.exposed=[...new Set([...out.exposed,...clean.queue.map(q=>E.getItem(q.id).lemmaId)])];}return out;}
function accept(raw,result){const out=migrate(raw),e=event(result?.event,true),s=session(result?.session);if(!e||!s||!out.session||out.session.id!==s.id||out.session.cursor!==s.cursor)return {state:out,accepted:false};const card=out.session.queue[out.session.cursor];if(!card||card.id!==e.itemId||e.eventId!==out.session.id+':'+out.session.cursor)return {state:out,accepted:false};if(out.events.some(x=>x.eventId===e.eventId)||out.session.phase!=='question')return {state:out,accepted:false};out.events=[...out.events,e].slice(-HISTORY_LIMIT);out.session=s;out.updatedAt=e.at;return {state:out,accepted:true,event:e};}
function forMastery(events){return (events||[]).filter(e=>e&&e.scored!==false);}
function scheduleUpdate(e){if(!e||e.transfer||e.mode==='transfer')return null;return {correct:!!e.correct,hinted:!!e.hinted,recall:e.responseMode==='input',at:e.at,responseTime:e.responseTime};}
function resumeSurface(view,hasMorphSession,lessonOpen,lessonViews=['practice','homework','learn','path','review']){if(view==='morph'&&hasMorphSession)return 'morph';if(lessonOpen&&lessonViews.includes(view))return view;return 'today';}
const api={empty,migrate,merge,putSession,accept,session,forMastery,scheduleUpdate,resumeSurface,HISTORY_LIMIT,historyNote};if(node)module.exports=api;else root.MorphState=api;
})(typeof window!=='undefined'?window:globalThis);
