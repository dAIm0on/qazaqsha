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
function reservedLemmaIds(moduleId){return new Set(guidedPlan(moduleId).map(x=>x.lemmaId));}
function nasalIndependentRows(responseMode,extraExclude=[]){
 const rows=stableRows('nasal'),guidedLemma=guidedPlan('nasal')[0].lemmaId,excluded=new Set([guidedLemma,...extraExclude]);
 const lemmas=[...new Set(rows.map(x=>x.lemmaId))].filter(x=>!excluded.has(x)).sort((a,b)=>a.localeCompare(b,'kk'));
 if(!lemmas.length)throw Error('No unseen nasal lemma remains for Stage 5 independent block');
 const take=Math.min(responseMode==='choice'?3:2,lemmas.length);
 const chosen=responseMode==='choice'?lemmas.slice(0,take):lemmas.slice(Math.max(0,lemmas.length-take));
 const targets=TARGETS.nasal[responseMode];
 return targets.map((family,i)=>{
  const lemma=chosen[i%chosen.length],row=rows.find(x=>x.lemmaId===lemma&&x.sequence.at(-1)===family);
  if(!row)throw Error('Missing nasal family '+family+' for '+lemma);
  return row;
 });
}
function independentPlan(moduleId,responseMode,extraExclude=[]){
 if(!['choice','input'].includes(responseMode))throw Error('Invalid Stage 5 response mode');
 spec(moduleId);
 const extra=[...new Set(extraExclude.filter(Boolean))];
 if(moduleId==='nasal')return nasalIndependentRows(responseMode,extra).map((x,i)=>task(moduleId,x,i,responseMode));
 const exclude=reservedLemmaIds(moduleId);for(const lemma of extra)exclude.add(lemma);
 if(responseMode==='input')for(const x of independentPlan(moduleId,'choice'))exclude.add(x.lemmaId);
 const targets=TARGETS[moduleId][responseMode];
 const rows=pickTargets(moduleId,targets,{exclude,offset:responseMode==='input'?2:1});
 return rows.map((x,i)=>task(moduleId,x,i,responseMode));
}
function createIndependentSession(moduleId,responseMode,now=Date.now(),excludeLemmas=[]){
 const plan=independentPlan(moduleId,responseMode,excludeLemmas),id='morph-stage5-'+moduleId+'-'+responseMode+'-'+now;
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
function previousModule(moduleId){const i=MODULES.indexOf(moduleId);return i>0?MODULES[i-1]:null;}
function prerequisitesReady(state,moduleId){const prev=previousModule(moduleId);return !prev||!!S?.teachingEvidence(state,{moduleId:prev}).moduleCompleted;}
function fullStage5Ready(state,moduleId){
 const m=spec(moduleId);
 return m.families.every(f=>{
  const e=S?.teachingEvidence(state,{moduleId,familyId:f});
  return !!e?.semanticIntroCompleted&&e.featureNotice.correct>0;
 });
}

const STAGE6_MODULES=['poss','person'];
const STAGE6_GUIDED={
 poss:[
  ['n-бала','POSS_1SG'],['n-ат','POSS_1SG'],['n-кітап','POSS_1SG'],['n-көлік','POSS_1SG'],['n-қонақ','POSS_1SG'],
  ['n-үй','POSS_2SG'],['n-әке','POSS_1PL'],['n-қала','POSS_2POL'],['n-орын','POSS_3'],['n-көше','POSS_3']
 ],
 person:[
  ['n-адам','COP_1SG'],['n-адам','COP_1PL'],['n-адам','Q'],
  ['n-бала','COP_2SG'],['n-бала','COP_2POL'],['n-бала','COP_2PL'],['n-бала','COP_2PL_POL'],
  ['n-қонақ','COP_1SG'],['n-қыз','COP_1PL'],['n-мұғалім','COP_1SG']
 ]
};
const STAGE6_TARGETS={
 poss:{
  choice:[
   {family:'POSS_1SG',feature:'rewrite'},{family:'POSS_2SG',feature:'plain'},{family:'POSS_1PL',feature:'plain'},
   {family:'POSS_2POL',feature:'plain'},{family:'POSS_3',feature:'plain'},{family:'POSS_1SG',feature:'plain'},
   {family:'POSS_2SG',feature:'plain'},{family:'POSS_3',feature:'plain'}
  ],
  input:[
   {family:'POSS_1SG',feature:'plain'},{family:'POSS_2SG',feature:'plain'},{family:'POSS_1PL',feature:'plain'},
   {family:'POSS_2POL',feature:'plain'},{family:'POSS_3',feature:'plain'}
  ]
 },
 person:{
  choice:['COP_1SG','COP_1PL','COP_2SG','COP_2POL','COP_2PL','COP_2PL_POL','Q'].map(family=>({family,feature:family})),
  input:['COP_1SG','COP_1PL','COP_2SG','COP_2POL','Q'].map(family=>({family,feature:family}))
 }
};
function stage6Spec(moduleId){
 if(!STAGE6_MODULES.includes(moduleId))throw Error('Stage 6 supports poss/person only');
 const row=T.modules.find(x=>x.id===moduleId);if(!row)throw Error('Unknown Stage 6 teaching module');
 return row;
}
function stage6ChangeClass(item){return item.trace.at(-1).changed?'rewrite':'plain';}
function stage6FeatureKey(moduleId,item){
 if(moduleId==='poss')return stage6ChangeClass(item);
 if(moduleId==='person')return item.sequence.at(-1);
 throw Error('Unsupported Stage 6 module');
}
function stage6BasePool(moduleId){
 const m=stage6Spec(moduleId);
 return E.bank().filter(item=>item.split==='train'&&item.sequence.length===1&&m.families.includes(item.sequence[0]));
}
function stage6StableRows(moduleId){
 return stage6BasePool(moduleId).slice().sort((a,b)=>a.lemmaId.localeCompare(b.lemmaId,'kk')||a.sequence[0].localeCompare(b.sequence[0]));
}
function stage6Operation(family){
 const map={
  POSS_1SG:'Чей предмет? Мой / моя / моё: владелец — я.',
  POSS_2SG:'Чей предмет? Твой / твоя / твоё: владелец — ты.',
  POSS_1PL:'Чей предмет? Наш / наша / наше: владельцы — мы.',
  POSS_2POL:'Чей предмет? Ваш / ваша / ваше: вежливое «Вы».',
  POSS_3:'Чей предмет? Его / её / их: владелец — 3-е лицо.',
  COP_1SG:'Предикативный смысл: мен ... — «я ...». Это не принадлежность.',
  COP_1PL:'Предикативный смысл: біз ... — «мы ...». Это не принадлежность.',
  COP_2SG:'Предикативный смысл: сен ... — «ты ...».',
  COP_2POL:'Предикативный смысл: сіз ... — вежливое «Вы ...».',
  COP_2PL:'Предикативный смысл: сендер ... — «вы ...».',
  COP_2PL_POL:'Предикативный смысл: сіздер ... — вежливое множественное «Вы ...».',
  Q:'Вопросительная частица: сделай вопрос. Это Q, не глагольное NEG.'
 };
 return map[family]||family;
}
function stage6Task(moduleId,item,index,kind){
 const built=E.itemFor(item.lemmaId,item.sequence,moduleId),t=built.trace.at(-1);
 return {
  id:kind+':stage6:'+moduleId+':'+index+':'+built.id,
  itemId:built.id,lemmaId:built.lemmaId,familyId:built.sequence.at(-1),stem:built.stem,gloss:built.gloss,
  operation:stage6Operation(built.sequence.at(-1)),expected:built.expected,options:rotate(built.options,index+1),
  feature:stage6FeatureKey(moduleId,built),edge:t.edge,harmony:t.harmony,changed:!!t.changed,trace:t
 };
}
function stage6Item(moduleId,lemmaId,familyId){
 const built=E.itemFor(lemmaId,[familyId],moduleId);
 if(!built||built.split!=='train'||!stage6Spec(moduleId).families.includes(familyId))throw Error('Invalid Stage 6 guided item '+lemmaId+' '+familyId);
 return built;
}
function stage6GuidedPlan(moduleId){
 stage6Spec(moduleId);
 return STAGE6_GUIDED[moduleId].map(([lemma,family],i)=>stage6Task(moduleId,stage6Item(moduleId,lemma,family),i,'guided'));
}
function stage6TaskForItem(moduleId,itemId,kind='source'){
 const item=E.getItem(itemId);
 if(!item||item.split!=='train'||item.sequence.length!==1||!stage6Spec(moduleId).families.includes(item.sequence.at(-1)))throw Error('Invalid Stage 6 source item');
 return stage6Task(moduleId,item,0,kind);
}
function stage6RepairFor(moduleId,sourceTask,extraExclude=[]){
 const rows=stage6StableRows(moduleId),excluded=new Set([sourceTask.lemmaId,...extraExclude]);
 const candidate=rows.find(x=>x.sequence.at(-1)===sourceTask.familyId&&stage6FeatureKey(moduleId,x)===sourceTask.feature&&!excluded.has(x.lemmaId));
 if(!candidate)throw Error('No different Stage 6 repair lemma for '+moduleId+' '+sourceTask.familyId+' '+sourceTask.feature);
 return stage6Task(moduleId,candidate,0,'repair');
}
function stage6ReservedLemmaIds(moduleId){return new Set(stage6GuidedPlan(moduleId).map(x=>x.lemmaId));}
function stage6PickTargets(moduleId,targets,{excludeLemmas=[],excludeItemIds=[],offset=0}={}){
 const rows=stage6StableRows(moduleId),blockedLemma=new Set(excludeLemmas),blockedItem=new Set(excludeItemIds),usedLemmas=new Set(),picked=[];
 for(let i=0;i<targets.length;i++){
  const target=targets[i];
  const candidates=rows.filter(x=>x.sequence.at(-1)===target.family&&stage6FeatureKey(moduleId,x)===target.feature&&!blockedLemma.has(x.lemmaId)&&!blockedItem.has(x.id));
  if(!candidates.length)throw Error('No Stage 6 item for '+moduleId+' '+target.family+' '+target.feature);
  const fresh=candidates.filter(x=>!usedLemmas.has(x.lemmaId)),pool=fresh.length?fresh:candidates,row=pool[(i+offset)%pool.length];
  picked.push(row);usedLemmas.add(row.lemmaId);blockedItem.add(row.id);
 }
 return picked;
}
function stage6IndependentPlan(moduleId,responseMode,{excludeLemmas=[],excludeItemIds=[]}={}){
 if(!['choice','input'].includes(responseMode))throw Error('Invalid Stage 6 response mode');
 stage6Spec(moduleId);
 const blocked=[...stage6ReservedLemmaIds(moduleId),...excludeLemmas];
 const rows=stage6PickTargets(moduleId,STAGE6_TARGETS[moduleId][responseMode],{excludeLemmas:blocked,excludeItemIds,offset:responseMode==='input'?3:1});
 return rows.map((x,i)=>stage6Task(moduleId,x,i,responseMode));
}
function createStage6IndependentSession(moduleId,responseMode,now=Date.now(),opts={}){
 const plan=stage6IndependentPlan(moduleId,responseMode,opts),id='morph-stage6-'+moduleId+'-'+responseMode+'-'+now;
 return {
  id,version:1,dataVersion:E.data.version,level:moduleId,mode:'learn',responseMode,modality:'text',
  queue:plan.map(x=>({id:x.itemId,options:x.options.slice()})),cursor:0,phase:'question',draft:'',hinted:false,result:null,
  startedAt:now,updatedAt:now,results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]
 };
}
function stage6Support(moduleId,task){
 const m=stage6Spec(moduleId);
 if(moduleId==='poss'){
  const edge=task.edge==='vowel'?'гласный край':'согласный/негласный фонологический край';
  const change=task.changed?'У этой леммы словарь разрешает изменение основы перед этим POSS.':'Не придумывай изменение основы: здесь оно не лицензировано.';
  return m.shortSupport+' Сейчас: '+edge+', ряд '+(task.harmony==='front'?'передний':'задний')+'. '+change;
 }
 return m.shortSupport+' Сейчас выбрана функция '+task.familyId+'. Сначала держи в голове лицо/вопрос, затем форму; не переноси окончание из POSS или AGR_SHORT.';
}
function fullStage6Ready(state,moduleId){
 const m=stage6Spec(moduleId);
 return m.families.every(f=>{const e=S?.teachingEvidence(state,{moduleId,familyId:f});return !!e?.semanticIntroCompleted&&e.featureNotice.correct>0;});
}
function stage6PrerequisitesReady(state,moduleId){
 return stage6Spec(moduleId).prerequisites.every(id=>!!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted);
}
function stage6MissingPrerequisite(state,moduleId){
 return stage6Spec(moduleId).prerequisites.find(id=>!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted)||null;
}
function stage6NextModule(moduleId){const i=STAGE6_MODULES.indexOf(moduleId);return i>=0?STAGE6_MODULES[i+1]||null:null;}

const api={MODULES,TARGETS,spec,featureKey,basePool,guidedPlan,taskForItem,repairFor,reservedLemmaIds,independentPlan,createIndependentSession,support,evaluate,previousModule,prerequisitesReady,fullStage5Ready,STAGE6_MODULES,STAGE6_TARGETS,stage6Spec,stage6FeatureKey,stage6BasePool,stage6GuidedPlan,stage6TaskForItem,stage6RepairFor,stage6ReservedLemmaIds,stage6IndependentPlan,createStage6IndependentSession,stage6Support,fullStage6Ready,stage6PrerequisitesReady,stage6MissingPrerequisite,stage6NextModule};
if(node)module.exports=api;else root.MorphTeachingPractice=api;
})(typeof window!=='undefined'?window:globalThis);
