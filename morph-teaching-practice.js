(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const E=node?require('./morph-engine'):root.MorphEngine;
const T=node?require('./morph-teaching-data'):root.MorphTeachingData;
const S=node?require('./morph-state'):root.MorphState;
const MODULES=['harmony','voice','plural','nasal'];
const TARGETS={
 harmony:{guided:['back','front','back','front'],choice:['back','front','back','front','back','front'],input:['front','back','front','back']},
 voice:{guided:['nonvoiceless','voiceless','nonvoiceless','voiceless'],choice:['voiceless','nonvoiceless','voiceless','nonvoiceless','voiceless','nonvoiceless'],input:['nonvoiceless','voiceless','nonvoiceless','voiceless']},
 plural:{guided:['L','D','T','L','D','T'],choice:['L','D','T','L','D','T'],input:['T','D','L','T']},
 nasal:{guided:['GEN','ACC','ABL','INS'],choice:['GEN','ACC','ABL','INS','GEN','ACC'],input:['ABL','INS','GEN','ACC']}
};
function spec(moduleId){
 if(!MODULES.includes(moduleId))throw Error('Stage 5 supports modules 1–4 only');
 const row=T.modules.find(x=>x.id===moduleId);if(!row)throw Error('Unknown teaching module');
 return row;
}
function pluralGroup(edge){
 if(['vowel','glide','r'].includes(edge))return 'L';
 if(['l','nasal','voiced_fricative'].includes(edge))return 'D';
 if(edge==='voiceless')return 'T';
 return '?';
}
function featureKey(moduleId,item){
 const t=item.trace.at(-1);
 if(moduleId==='harmony')return t.harmony;
 if(moduleId==='voice')return t.edge==='voiceless'?'voiceless':'nonvoiceless';
 if(moduleId==='plural')return pluralGroup(t.edge);
 if(moduleId==='nasal')return item.sequence.at(-1);
 throw Error('Unsupported module');
}
function basePool(moduleId){
 const s=spec(moduleId);
 return E.bank().filter(item=>item.split==='train'&&item.sequence.length===1&&s.families.includes(item.sequence[0])&&(moduleId!=='nasal'||item.trace.at(-1).edge==='nasal'));
}
function stableRows(moduleId){
 return basePool(moduleId).slice().sort((a,b)=>a.lemmaId.localeCompare(b.lemmaId,'kk')||a.sequence.join('.').localeCompare(b.sequence.join('.')));
}
function rotate(options,n){
 if(!options.length)return options;
 const k=n%options.length;return options.slice(k).concat(options.slice(0,k));
}
function task(moduleId,item,index,kind){
 const built=E.itemFor(item.lemmaId,item.sequence,moduleId),t=built.trace.at(-1);
 return {
  id:kind+':'+moduleId+':'+index+':'+built.id,
  itemId:built.id,lemmaId:built.lemmaId,familyId:built.sequence.at(-1),stem:built.stem,gloss:built.gloss,
  operation:built.operation,expected:built.expected,options:rotate(built.options,index+1),feature:featureKey(moduleId,built),
  edge:t.edge,harmony:t.harmony,trace:t
 };
}
function pickTargets(moduleId,targets,{exclude=new Set(),offset=0,allowRepeatLemma=false}={}){
 const rows=stableRows(moduleId),used=new Set(exclude),picked=[];
 for(let i=0;i<targets.length;i++){
  const target=targets[i],candidates=rows.filter(x=>featureKey(moduleId,x)===target&&!used.has(x.lemmaId));
  if(!candidates.length&&allowRepeatLemma){
   const fallback=rows.filter(x=>featureKey(moduleId,x)===target);if(!fallback.length)throw Error('No Stage 5 item for '+moduleId+' '+target);
   const row=fallback[(i+offset)%fallback.length];picked.push(row);continue;
  }
  if(!candidates.length)throw Error('Not enough distinct Stage 5 items for '+moduleId+' '+target);
  const row=candidates[(i+offset)%candidates.length];picked.push(row);used.add(row.lemmaId);
 }
 return picked;
}
function nasalGuided(){
 const rows=stableRows('nasal'),families=TARGETS.nasal.guided;
 const byLemma=new Map();
 for(const row of rows){const a=byLemma.get(row.lemmaId)||[];a.push(row);byLemma.set(row.lemmaId,a);}
 const complete=[...byLemma.entries()].filter(([,a])=>families.every(f=>a.some(x=>x.sequence.at(-1)===f))).sort((a,b)=>(a[0]==='n-адам'?-1:0)-(b[0]==='n-адам'?-1:0)||a[0].localeCompare(b[0],'kk'));
 if(!complete.length)throw Error('No complete nasal contrast lemma');
 const rowsForLemma=complete[0][1];
 return families.map(f=>rowsForLemma.find(x=>x.sequence.at(-1)===f));
}
function guidedPlan(moduleId){
 spec(moduleId);
 const rows=moduleId==='nasal'?nasalGuided():pickTargets(moduleId,TARGETS[moduleId].guided);
 return rows.map((x,i)=>task(moduleId,x,i,'guided'));
}
function taskForItem(moduleId,itemId,kind='source'){
 const item=E.getItem(itemId);if(!item||item.split!=='train'||item.sequence.length!==1||!spec(moduleId).families.includes(item.sequence.at(-1)))throw Error('Invalid Stage 5 source item');
 if(moduleId==='nasal'&&item.trace.at(-1).edge!=='nasal')throw Error('Stage 5 nasal source must have nasal edge');
 return task(moduleId,item,0,kind);
}
function repairFor(moduleId,sourceTask,extraExclude=[]){
 spec(moduleId);
 const rows=stableRows(moduleId);
 const excluded=new Set([sourceTask.lemmaId,...extraExclude]);
 const candidate=rows.find(x=>x.sequence.at(-1)===sourceTask.familyId&&featureKey(moduleId,x)===sourceTask.feature&&!excluded.has(x.lemmaId));
 if(!candidate)throw Error('No different repair lemma for '+moduleId+' '+sourceTask.familyId+' '+sourceTask.feature);
 return task(moduleId,candidate,0,'repair');
}
function reservedLemmaIds(moduleId){
 const out=new Set(guidedPlan(moduleId).map(x=>x.lemmaId));
 for(const g of guidedPlan(moduleId)){try{out.add(repairFor(moduleId,g,[...out]).lemmaId);}catch{}}
 return out;
}
function independentPlan(moduleId,responseMode){
 if(!['choice','input'].includes(responseMode))throw Error('Invalid Stage 5 response mode');
 spec(moduleId);
 const exclude=reservedLemmaIds(moduleId);
 if(responseMode==='input'){
  for(const x of independentPlan(moduleId,'choice'))exclude.add(x.lemmaId);
 }
 const targets=TARGETS[moduleId][responseMode];
 const rows=pickTargets(moduleId,targets,{exclude,offset:responseMode==='input'?2:1});
 return rows.map((x,i)=>task(moduleId,x,i,responseMode));
}
function createIndependentSession(moduleId,responseMode,now=Date.now()){
 const plan=independentPlan(moduleId,responseMode),id='morph-stage5-'+moduleId+'-'+responseMode+'-'+now;
 return {
  id,version:1,dataVersion:E.data.version,level:moduleId,mode:'learn',responseMode,modality:'text',
  queue:plan.map(x=>({id:x.itemId,options:x.options.slice()})),cursor:0,phase:'question',draft:'',hinted:false,result:null,
  startedAt:now,updatedAt:now,results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]
 };
}
function support(moduleId,task){
 const m=spec(moduleId);
 if(moduleId==='harmony')return m.shortSupport+' Сейчас сравни ряд основы: '+(task.harmony==='front'?'передний':'задний')+'.';
 if(moduleId==='voice')return m.shortSupport+' Текущий край: '+(task.edge==='voiceless'?'глухой':'не глухой')+'.';
 if(moduleId==='plural')return m.shortSupport+' Для этого края группа: '+task.feature+'.';
 if(moduleId==='nasal')return m.shortSupport+' Здесь край специально носовой; различай функцию '+task.familyId+'.';
 return m.shortSupport;
}
function evaluate(task,response){return E.norm(response)===E.norm(task.expected);}
function fullStage5Ready(state,moduleId){
 const m=spec(moduleId);
 return m.families.every(f=>{
  const e=S?.teachingEvidence(state,{moduleId,familyId:f});
  return !!e?.semanticIntroCompleted&&e.featureNotice.correct>0;
 });
}
const api={MODULES,TARGETS,spec,featureKey,basePool,guidedPlan,taskForItem,repairFor,reservedLemmaIds,independentPlan,createIndependentSession,support,evaluate,fullStage5Ready};
if(node)module.exports=api;else root.MorphTeachingPractice=api;
})(typeof window!=='undefined'?window:globalThis);
