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
const STAGE6_SEMANTIC_CHECKS={
 poss:[
  {id:'owner-gen',prompt:'В «менің кітабым» что показывает слово «менің»?',options:['GEN','POSS','COP'],expected:'GEN',explanation:'GEN показывает владельца; POSS на слове кітабым показывает отношение предмета к владельцу.'},
  {id:'item-poss',prompt:'В «менің кітабым» какая категория стоит на самом предмете «кітабым»?',options:['POSS','GEN','AGR_SHORT'],expected:'POSS',explanation:'POSS меняет сам предмет и показывает лицо владельца.'}
 ],
 person:[
  {id:'cop',prompt:'Контекст «я студент»: какая категория отмечает лицо на именном сказуемом?',options:['COP','POSS','AGR_SHORT'],expected:'COP',explanation:'COP — предикативная серия: кто/что я есть.'},
  {id:'poss',prompt:'Контекст «моя книга»: какая категория отмечает принадлежность на самом предмете?',options:['POSS','COP','AGR_SHORT'],expected:'POSS',explanation:'POSS — чей предмет; это не COP.'},
  {id:'agr',prompt:'Контекст «я пришёл» после уже построенной PAST-формы: какая серия отмечает лицо субъекта действия?',options:['AGR_SHORT','COP','POSS'],expected:'AGR_SHORT',explanation:'AGR_SHORT лицензируется после PAST/COND и не является POSS или полной COP-серией.'},
  {id:'q',prompt:'«адам ба?» — что это?',options:['Q','NEG','COP'],expected:'Q',explanation:'Q — отдельная вопросительная частица.'},
  {id:'neg',prompt:'«жазба» — что это?',options:['NEG','Q','POSS'],expected:'NEG',explanation:'NEG — глагольное отрицание внутри глагольной цепочки; это не Q.'}
 ]
};
function stage6SemanticChecks(moduleId){stage6Spec(moduleId);return STAGE6_SEMANTIC_CHECKS[moduleId].map(x=>({...x,options:x.options.slice()}));}
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
function stage6RewriteHint(task){
 if(!task.changed)return 'Не придумывай изменение основы: здесь оно не лицензировано.';
 const a=task.trace.before,b=task.trace.stem;
 if(a.endsWith('қ')&&b.endsWith('ғ'))return 'Для этой словарно разрешённой леммы перед данным POSS действует қ→ғ.';
 if(a.endsWith('к')&&b.endsWith('г'))return 'Для этой словарно разрешённой леммы перед данным POSS действует к→г.';
 if(a.endsWith('п')&&b.endsWith('б'))return 'Для этой словарно разрешённой леммы перед данным POSS действует п→б.';
 if(a.length===b.length+1)return 'Для этой словарно разрешённой леммы действует синкопа ы/і; не переноси её на другие слова автоматически.';
 return 'У этой леммы словарь разрешает изменение основы перед данным POSS.';
}
function stage6Support(moduleId,task){
 const m=stage6Spec(moduleId);
 if(moduleId==='poss'){
  const edge=task.edge==='vowel'?'гласный край':'согласный/негласный фонологический край';
  return m.shortSupport+' Сейчас: '+edge+', ряд '+(task.harmony==='front'?'передний':'задний')+'. '+stage6RewriteHint(task);
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

const STAGE7_MODULE='chains';
const STAGE7_MEANING=['PL','POSS_1SG','POSS_1PL','POSS_3','DAT','ACC','LOC','ABL'];
const STAGE7_GUIDED=[
 {chainId:'A',lemmaId:'n-үй',sequence:['PL','POSS_1PL','ABL']},
 {chainId:'B',lemmaId:'n-кітап',sequence:['POSS_3','DAT']},
 {chainId:'C',lemmaId:'n-кітап',sequence:['PL','POSS_1PL','ABL']},
 {chainId:'plain-DAT',lemmaId:'n-кітап',sequence:['DAT']},
 {chainId:'plain-ACC',lemmaId:'n-кітап',sequence:['ACC']},
 {chainId:'poss3-ACC',lemmaId:'n-кітап',sequence:['POSS_3','ACC']},
 {chainId:'plain-LOC',lemmaId:'n-кітап',sequence:['LOC']},
 {chainId:'poss3-LOC',lemmaId:'n-кітап',sequence:['POSS_3','LOC']},
 {chainId:'plain-ABL',lemmaId:'n-кітап',sequence:['ABL']},
 {chainId:'poss3-ABL',lemmaId:'n-кітап',sequence:['POSS_3','ABL']},
 {chainId:'poss1-DAT',lemmaId:'n-кітап',sequence:['POSS_1SG','DAT']},
 {chainId:'poss1pl-DAT',lemmaId:'n-кітап',sequence:['POSS_1PL','DAT']}
];
function stage7Spec(){const row=T.modules.find(x=>x.id===STAGE7_MODULE);if(!row)throw Error('Unknown Stage 7 module');return row;}
function stage7MeaningReady(state){return STAGE7_MEANING.every(f=>!!S?.teachingEvidence(state,{familyId:f}).semanticIntroCompleted);}
function stage7MissingMeaning(state){return STAGE7_MEANING.find(f=>!S?.teachingEvidence(state,{familyId:f}).semanticIntroCompleted)||null;}
function stage7Owner(familyId){if(familyId==='PL')return 'plural';if(String(familyId).startsWith('POSS_'))return 'poss';if(familyId==='DAT'||familyId==='LOC')return 'harmony';if(familyId==='ACC'||familyId==='ABL')return 'nasal';return STAGE7_MODULE;}
function stage7PrerequisitesReady(state){return stage7Spec().prerequisites.every(id=>!!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted);}
function stage7MissingPrerequisite(state){return stage7Spec().prerequisites.find(id=>!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted)||null;}
function stage7Ready(state){return stage7PrerequisitesReady(state)&&stage7MeaningReady(state);}
function stage7Trace(lemmaId,sequence){return E.form(lemmaId,sequence).trace;}
function stage7Options(step,laterAfter){
 const variants=E.data.families[step.morpheme].variants,expected=step.after,blocked=new Set(laterAfter||[]);
 const raw=variants.map(v=>step.stem+(step.space?' ':'')+v);
 if(step.changed)raw.unshift(step.before+(step.space?' ':'')+step.suffix);
 const pool=[...new Set(raw)].filter(f=>f!==expected&&!blocked.has(f));
 const ranked=pool.map(f=>({f,codes:E.errors({expected,trace:[step]},f)}));
 const picked=[expected];
 for(const code of ['MORPH_STATE','STEM_CHANGE','HARMONY','ONSET_CLASS']){const hit=ranked.find(x=>x.codes.includes(code)&&!picked.includes(x.f));if(hit)picked.push(hit.f);if(picked.length===4)break;}
 for(const row of ranked){if(picked.length===4)break;if(!picked.includes(row.f))picked.push(row.f);}
 return picked;
}
function stage7View(lemmaId,sequence,junction){
 const trace=stage7Trace(lemmaId,sequence),step=trace[junction];if(!step)throw Error('Stage 7 junction is outside the chain');
 const later=trace.slice(junction+1),lemma=E.data.lemmas.find(l=>l.id===lemmaId);
 let operation='';try{operation=E.itemFor(lemmaId,[step.morpheme]).operation;}catch{operation=E.data.families[step.morpheme].label;}
 const options=stage7Options(step,later.map(t=>t.after));
 return {lemmaId,lemma:lemma.text,gloss:lemma.gloss,sequence:sequence.slice(),junction,total:trace.length,morpheme:step.morpheme,before:step.before,after:step.after,stem:step.stem,suffix:step.suffix,seenEdge:step.edge,nextEdge:E.edge(step.after),poss:step.poss,kase:step.kase,changed:step.changed,operation,options,laterSuffixes:later.map(t=>t.suffix),laterAfter:later.map(t=>t.after)};
}
function stage7Errors(view,response){
 const codes=E.errors({expected:view.after,trace:[{...view,before:view.before,stem:view.stem,suffix:view.suffix,space:false,morpheme:view.morpheme,poss:view.poss,edge:view.seenEdge}]},response);
 const answer=E.norm(response);
 if(E.norm(view.before)!==E.norm(view.lemma)&&answer.startsWith(E.norm(view.lemma))&&!answer.startsWith(E.norm(view.before))&&!codes.includes('MORPHEME_BOUNDARY'))codes.unshift('MORPHEME_BOUNDARY');
 if(codes.length>1&&!codes.includes('MULTIPLE_FEATURES'))codes.push('MULTIPLE_FEATURES');
 return codes;
}
function stage7Feedback(view,codes){
 const row=stage7Spec();
 if(codes.includes('MORPH_STATE'))return row.feedbackTemplates.MORPH_STATE;
 if(codes.includes('MORPHEME_BOUNDARY'))return row.feedbackTemplates.MORPHEME_BOUNDARY;
 if(codes.includes('STEM_CHANGE'))return 'Перед этим шагом словарь разрешает изменение основы. Следующий стык считается уже от новой формы.';
 return E.reason({expected:view.after,trace:[{before:view.before,stem:view.stem,suffix:view.suffix,space:false,morpheme:view.morpheme,poss:view.poss,edge:view.seenEdge,changed:view.changed,harmony:E.data.lemmas.find(l=>l.id===view.lemmaId).harmony}]},codes);
}
function stage7Support(){return stage7Spec().shortSupport;}
function stage7Works(lemmaId,sequence){try{E.form(lemmaId,sequence);return E.data.lemmas.find(l=>l.id===lemmaId)?.split==='train';}catch{return false;}}
function stage7RepairFor(view,exclude=[],pos='noun'){
 const blocked=new Set([view.lemmaId,...exclude]);
 const prefix=view.sequence.slice(0,view.junction+1);
 const same=E.data.lemmas.filter(l=>l.pos===pos&&l.split==='train'&&!blocked.has(l.id)&&l.harmony===E.data.lemmas.find(x=>x.id===view.lemmaId).harmony&&stage7Works(l.id,prefix));
 const any=E.data.lemmas.filter(l=>l.pos===pos&&l.split==='train'&&!blocked.has(l.id)&&stage7Works(l.id,prefix));
 const lemma=(same[0]||any[0]);if(!lemma)throw Error('No Stage 7 repair lemma');
 const repair=stage7View(lemma.id,prefix,prefix.length-1);
 if(repair.lemmaId===view.lemmaId)throw Error('Stage 7 repair reused the source lemma');
 return repair;
}
function stage7GuidedPlan(){STAGE7_GUIDED.forEach(c=>{if(!stage7Works(c.lemmaId,c.sequence))throw Error('Mandatory chain is not a train chain');});return STAGE7_GUIDED.map(c=>({chainId:c.chainId,lemmaId:c.lemmaId,sequence:c.sequence.slice()}));}
function stage7IndependentPlan({excludeLemmas=[]}={}){
 const shapes=[{chainId:'A',sequence:['PL','POSS_1PL','ABL']},{chainId:'B',sequence:['POSS_3','DAT']},{chainId:'C',sequence:['PL','POSS_1PL','ABL']}];
 const used=new Set(['n-үй','n-кітап',...excludeLemmas]);
 return shapes.map(shape=>{
  const lemma=E.data.lemmas.find(l=>l.pos==='noun'&&l.split==='train'&&!used.has(l.id)&&stage7Works(l.id,shape.sequence));
  if(!lemma)throw Error('No independent Stage 7 lemma for '+shape.chainId);
  used.add(lemma.id);return {chainId:shape.chainId,lemmaId:lemma.id,sequence:shape.sequence.slice()};
 });
}
function createStage7Run(lane,responseMode,now=Date.now(),opts={}){
 if(!['guided','independent'].includes(lane)||!['choice','input'].includes(responseMode))throw Error('Invalid Stage 7 run');
 const chains=lane==='guided'?stage7GuidedPlan():stage7IndependentPlan(opts);
 return {id:'morph-stage7-'+lane+'-'+responseMode+'-'+now,version:1,dataVersion:E.data.version,contentVersion:T.version,lane,responseMode,chains,chainIndex:0,junction:0,phase:'question',draft:'',result:null,repair:null,acceptedEventIds:[],exposedRepairLemmas:[...(opts.excludeLemmas||[])],startedAt:now,updatedAt:now};
}
function stage7Current(chain){
 if(!chain||chain.phase==='complete')return null;
 if(chain.phase==='repair')return stage7View(chain.repair.repairLemmaId,chain.repair.sequence,chain.repair.sequence.length-1);
 const row=chain.chains[chain.chainIndex];if(!row)return null;
 return {...stage7View(row.lemmaId,row.sequence,chain.junction),chainId:row.chainId};
}
const STAGE8_SEMANTIC=[
 {id:'q-neg',prompt:'Где глагольное отрицание, а не вопрос?',options:['адам ба?','жазба'],expected:'жазба',explain:'адам ба? — вопрос Q. жазба — отрицание действия NEG. Похожий ряд ма/ба/па их не объединяет.'},
 {id:'past-ptcp',prompt:'Где форма описывает человека через действие, а не просто говорит о прошлом?',options:['келді','келген кісі'],expected:'келген кісі',explain:'келді — простое прошедшее. келген кісі — пришедший человек. Это не одно и то же.'},
 {id:'ptcp-cvb',prompt:'Где дополнительное действие связано с главным, а не описывает существительное?',options:['келген кісі','киініп, шықты'],expected:'киініп, шықты',explain:'келген кісі описывает человека. киініп, шықты связывает дополнительное действие с выходом.'},
 {id:'cop-agr',prompt:'Где лицо добавлено после прошедшего глагола, а не после имени?',options:['адаммын','келдім'],expected:'келдім',explain:'адаммын — сказуемое при имени, COP. келдім — лицо после прошедшей формы, AGR_SHORT. Это не POSS и не полная COP-серия.'}
];
const STAGE8_GUIDED=[
 {chainId:'NEG',lemmaId:'v-жаз',sequence:['NEG'],context:'Не писать.'},
 {chainId:'PAST',lemmaId:'v-кел',sequence:['PAST'],context:'Простое прошедшее: действие уже произошло.'},
 {chainId:'PAST-AGR',lemmaId:'v-кел',sequence:['PAST','AGR_SHORT_1SG'],context:'Сначала прошедшее. Лицо добавляется только после него.'},
 {chainId:'COND',lemmaId:'v-кел',sequence:['COND'],context:'Если это произойдёт, тогда произойдёт другое.'},
 {chainId:'COND-AGR',lemmaId:'v-кел',sequence:['COND','AGR_SHORT_1SG'],context:'Условие уже есть. Теперь лицо этого условия.'},
 {chainId:'NEG-PAST-AGR',lemmaId:'v-кел',sequence:['NEG','PAST','AGR_SHORT_1PL'],context:'Сначала отрицание, потом прошедшее, и только затем лицо.'},
 {chainId:'PTCP',lemmaId:'v-кел',sequence:['PTCP_GAN'],context:'Пришедший человек. Собери форму глагола для этого описания.'},
 {chainId:'CVB',lemmaId:'v-сөйле',sequence:['CVB_IP'],context:'Дополнительное действие при главном, не законченное время.'},
 {chainId:'CVB-REWRITE',lemmaId:'v-жап',sequence:['CVB_IP'],context:'У этой основы словарь разрешает перестройку. Не переноси её на все глаголы.'}
];
function stage8Spec(){const row=T.modules.find(x=>x.id==='verbs');if(!row)throw Error('Unknown Stage 8 module');return row;}
function stage8PrerequisitesReady(state){return stage8Spec().prerequisites.every(id=>!!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted);}
function stage8MissingPrerequisite(state){return stage8Spec().prerequisites.find(id=>!S?.teachingEvidence(state,{moduleId:id}).moduleCompleted)||null;}
function stage8Context(chainId){return (STAGE8_GUIDED.find(x=>x.chainId===chainId)||{}).context||'Сначала функция, затем форма этого стыка.';}
function stage8GuidedPlan(){return STAGE8_GUIDED.map(c=>({chainId:c.chainId,lemmaId:c.lemmaId,sequence:c.sequence.slice()}));}
function stage8IndependentPlan({excludeLemmas=[]}={}){
 const shapes=[
  {chainId:'NEG',sequence:['NEG']},
  {chainId:'PAST-AGR',sequence:['PAST','AGR_SHORT_1SG']},
  {chainId:'COND-AGR',sequence:['COND','AGR_SHORT_1SG']},
  {chainId:'PTCP',sequence:['PTCP_GAN']},
  {chainId:'CVB',sequence:['CVB_IP']}
 ];
 const used=new Set(['v-жаз','v-кел','v-сөйле','v-жап',...excludeLemmas]);
 return shapes.map(shape=>{
  const lemma=E.data.lemmas.find(l=>l.pos==='verb'&&l.split==='train'&&!used.has(l.id)&&stage7Works(l.id,shape.sequence));
  if(!lemma)throw Error('No independent Stage 8 verb for '+shape.chainId);
  used.add(lemma.id);return {chainId:shape.chainId,lemmaId:lemma.id,sequence:shape.sequence.slice()};
 });
}
function createStage8Run(lane,responseMode,now=Date.now(),opts={}){
 const run=createStage7Run(lane,responseMode,now,{excludeLemmas:opts.excludeLemmas||[]});
 run.id='morph-stage8-'+lane+'-'+responseMode+'-'+now;
 run.moduleId='verbs';
 run.chains=lane==='guided'?stage8GuidedPlan():stage8IndependentPlan(opts);
 run.chains.forEach(c=>{if(!stage7Works(c.lemmaId,c.sequence))throw Error('Stage 8 chain is not train-licensed');});
 return run;
}
const STAGE9_THRESHOLD={attempts:8,correct:7,lemmas:4};
const STAGE9_CONTRASTS=[
 {id:'dat-loc-abl',families:['DAT','LOC','ABL']},
 {id:'gen-poss',families:['GEN','POSS_3']},
 {id:'cop-agr',families:['COP_1SG','AGR_SHORT_1SG']},
 {id:'q-neg',families:['Q','NEG']},
 {id:'past-ptcp',families:['PAST','PTCP_GAN']},
 {id:'ptcp-cvb',families:['PTCP_GAN','CVB_IP']},
 {id:'pl-groups',families:['PL'],side:e=>e.contextClasses?.[0]||e.sequence.at(-1)}
];
function stage9First(events){
 const seen=new Set(),out=[];
 for(const e of [...(events||[])].filter(e=>e&&e.hinted!==true&&e.transfer!==true&&e.mode!=='transfer'&&e.modality!=='audio'&&e.scored!==false).sort((a,b)=>(a.at||0)-(b.at||0)||String(a.eventId).localeCompare(String(b.eventId)))){
  const key=e.itemId||e.eventId;if(seen.has(key))continue;seen.add(key);out.push(e);
 }
 return out;
}
function stage9Assess(events,{families,side}={}){
 const rows=stage9First(events).filter(e=>!families||families.includes(e.sequence&&e.sequence.at(-1)));
 const sideOf=side||(e=>e.sequence.at(-1));
 const lemmas=new Set(rows.map(e=>e.lemmaId).filter(Boolean));
 const sides=new Set(rows.map(sideOf).filter(Boolean));
 const correct=rows.filter(e=>e.correct===true).length;
 const needSides=families&&families.length===1?2:2;
 return {attempts:rows.length,correct,lemmas:lemmas.size,sides:[...sides],eligible:rows.length>=STAGE9_THRESHOLD.attempts&&correct>=STAGE9_THRESHOLD.correct&&lemmas.size>=STAGE9_THRESHOLD.lemmas&&sides.size>=needSides};
}
function stage9Status(state,contrast){
 const assess=stage9Assess(state?.events,contrast||{});
 const transfer=(state?.events||[]).some(e=>(e.transfer||e.mode==='transfer')&&e.correct===true&&(!contrast||contrast.families.includes(e.sequence.at(-1))));
 if(transfer)return 'перенос проверен';
 const hinted=(state?.events||[]).some(e=>e.hinted&&contrast&&contrast.families.includes(e.sequence.at(-1)));
 const intro=(state?.teaching?.events||[]).some(e=>e.type==='semantic_intro_completed'&&contrast&&contrast.families.includes(e.familyId));
 if(!assess.eligible&&(assess.attempts<STAGE9_THRESHOLD.attempts||assess.lemmas<STAGE9_THRESHOLD.lemmas||assess.sides.length<2))return 'мало данных';
 if(!assess.eligible)return 'нужно повторить';
 const mixed=(state?.events||[]).some(e=>e.level==='mixed'&&!e.hinted&&contrast&&contrast.families.includes(e.sequence.at(-1)));
 if(mixed)return 'в смешивании';
 if(assess.eligible)return 'самостоятельно';
 if(hinted)return 'с подсказкой';
 if(intro)return 'знакомство';
 return 'мало данных';
}
function stage9Eligible(state){return STAGE9_CONTRASTS.filter(c=>stage9Assess(state?.events,c).eligible);}
function stage9Repeated(state,family){return (state?.events||[]).filter(e=>e.correct===false&&e.hinted!==true&&e.sequence?.at(-1)===family).length>=3;}
function stage9Pool(family){return E.bank().filter(i=>i.split==='train'&&i.sequence.length===1&&i.sequence[0]===family).slice().sort((a,b)=>a.lemmaId.localeCompare(b.lemmaId,'kk')||a.id.localeCompare(b.id));}
function stage9RaisesAllAxes(item,responseMode){return !!(item&&item.sequence.length>1&&responseMode==='input'&&item.trace?.some(t=>t.changed));}
function stage9Queue(state,seed=1){
 const eligible=stage9Eligible(state);
 if(!eligible.length)return {items:[],status:'мало данных',reason:'Мало данных: смешивание ещё не предлагается. Нужны 8 самостоятельных ответов, 7 верных и 4 разные основы с обоими значениями контраста.',seed};
 const recent=[...(state.events||[])].filter(e=>e.correct===false&&e.hinted!==true&&e.mode!=='transfer').sort((a,b)=>(b.at||0)-(a.at||0))[0];
 const order=eligible.slice().sort((a,b)=>a.id.localeCompare(b.id));
 const start=Math.abs(seed|0)%order.length;
 const ranked=order.slice(start).concat(order.slice(0,start));
 if(recent&&eligible.some(c=>c.families.includes(recent.sequence.at(-1))))ranked.sort((a,b)=>Number(b.families.includes(recent.sequence.at(-1)))-Number(a.families.includes(recent.sequence.at(-1))));
 const items=[],used=new Set(),counts={};
 function take(family,reason){
  if(items.length>=8||counts[family]>=2||stage9Repeated(state,family))return;
  const row=stage9Pool(family).find(i=>!used.has(i.lemmaId)&&!stage9RaisesAllAxes(i,'choice'));
  if(!row)return;
  used.add(row.lemmaId);counts[family]=(counts[family]||0)+1;
  items.push({id:row.id,lemmaId:row.lemmaId,sequence:row.sequence.slice(),options:row.options.slice(),reason,family});
 }
 if(recent&&eligible.some(c=>c.families.includes(recent.sequence.at(-1)))&&!stage9Repeated(state,recent.sequence.at(-1)))take(recent.sequence.at(-1),'Повторяем эту функцию, потому что здесь была ошибка.');
 for(const contrast of ranked)for(const family of contrast.families)take(family,stage9Repeated(state,family)?'Эту функцию лучше открыть в полном объяснении: одна и та же ошибка уже повторялась.':'Смешиваем уже знакомую функцию.');
 const repeated=STAGE9_CONTRASTS.some(c=>c.families.some(f=>stage9Repeated(state,f)));
 return {items,status:items.length?'в смешивании':repeated?'нужно повторить':'мало данных',reason:items[0]?.reason||(repeated?'Эту функцию лучше открыть в полном объяснении: одна и та же ошибка уже повторялась.':'Мало данных.'),seed,repeated};
}
const STAGE10_DELAY=86400000;
const STAGE10_SHORT_BANK='Недостаточно новых основ для полной проверки этого поднавыка.';
function stage10WilsonLower(correct,total,z=1.96){
 if(!total)return 0;
 const p=correct/total,z2=z*z,denom=1+z2/total,center=p+z2/(2*total),margin=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total));
 return (center-margin)/denom;
}
function stage10StrongClaim({correct=0,total=0,approaches=0,sides=0}={}){
 const lower=stage10WilsonLower(correct,total),rate=total?correct/total:0;
 const ready=total>=40&&approaches>=2&&sides>=2;
 const pass=ready&&rate>=0.9&&lower>=0.8;
 return {pass,lower,rate,total,correct,approaches,sides,status:!ready?'мало данных':pass?'перенос проверен':'нужно повторить'};
}
function stage10Approach(event){const id=String(event?.eventId||'');const cut=id.lastIndexOf(':');return cut>0?id.slice(0,cut):id||'one';}
function stage10StrongFromEvents(events){
 const rows=(events||[]).filter(e=>e&&(e.transfer||e.mode==='transfer')&&e.hinted!==true&&e.modality!=='audio');
 const seen=new Set(),fresh=[];
 for(const e of rows){if(seen.has(e.lemmaId))continue;seen.add(e.lemmaId);fresh.push(e);}
 const sides=new Set(fresh.map(e=>e.sequence?.at(-1)).filter(Boolean));
 const approaches=new Set(fresh.map(stage10Approach));
 return stage10StrongClaim({correct:fresh.filter(e=>e.correct).length,total:fresh.length,approaches:approaches.size,sides:sides.size});
}
function stage10Retention(events){
 const rows=[...(events||[])].filter(e=>e&&e.hinted!==true&&e.modality!=='audio'&&e.scored!==false).sort((a,b)=>(a.at||0)-(b.at||0));
 const first=new Map(),kept=[];
 for(const e of rows){
  const key=e.itemId||e.lemmaId;
  const prev=first.get(key);
  if(prev&&stage10Approach(prev)!==stage10Approach(e)&&e.mode!=='transfer'&&!e.transfer&&(e.at||0)-(prev.at||0)>=STAGE10_DELAY)kept.push(e);
  if(!prev)first.set(key,e);
 }
 return {count:kept.length,label:kept.length?'есть отложенная проверка':'нет отложенной проверки'};
}
function stage10ContaminatedLemmas(){
 const ids=new Set();
 try{for(const row of stage7GuidedPlan())ids.add(row.lemmaId);}catch{}
 try{for(const row of stage8GuidedPlan())ids.add(row.lemmaId);}catch{}
 for(const module of T.modules||[])for(const example of module.examples||[])for(const id of example.lemmaIds||[])ids.add(id);
 const blob=(T.modules||[]).map(m=>[...(m.fullExplanation||[]),m.shortSupport||'',JSON.stringify(m.examples||[])].join('\n')).join('\n');
 for(const lemma of E.data.lemmas){
  if(lemma.split!=='transfer'||!lemma.text)continue;
  const escaped=lemma.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(new RegExp('(?:^|[^\\p{L}])'+escaped+'(?:[^\\p{L}]|$)','u').test(blob))ids.add(lemma.id);
 }
 return [...ids];
}
function stage9Repair(item,exclude=[]){
 const key=item.sequence.join('.'),pool=E.bank().filter(i=>i.split==='train'&&i.sequence.join('.')===key&&i.lemmaId!==item.lemmaId&&!exclude.includes(i.lemmaId)).sort((a,b)=>a.lemmaId.localeCompare(b.lemmaId,'kk'));
 if(!pool.length)throw Error('No mixed repair lemma');
 return pool[0];
}
function stage7Evidence(state){
 const teaching=(state?.teaching?.events||[]).filter(e=>e.moduleId==='chains');
 const answers=(state?.events||[]).filter(e=>e.level==='chains');
 const count=(list,pred)=>{const rows=list.filter(pred);return {attempts:rows.length,correct:rows.filter(x=>x.correct===true).length};};
 const guided=count(teaching,e=>e.type==='guided_attempt');
 const corrections=count(teaching,e=>e.type==='correction_after_feedback');
 const independentChoice=count(answers,e=>e.responseMode!=='input'&&!e.hinted);
 const independentInput=count(answers,e=>e.responseMode==='input'&&!e.hinted);
 const extra=count(teaching,e=>e.type==='chain_junction_attempt'&&e.hinted!==true);
 independentChoice.attempts+=extra.attempts;independentChoice.correct+=extra.correct;
 const lemmas=new Set([...teaching.map(e=>e.lemmaId),...answers.map(e=>e.lemmaId)].filter(Boolean));
 const wrong=[...teaching.filter(e=>e.correct===false),...answers.filter(e=>e.correct===false)];
 return {guided,corrections,independentChoice,independentInput,moduleCompleted:teaching.some(e=>e.type==='teaching_module_completed'),uniqueLemmas:lemmas.size,errorJunctions:wrong.map(e=>e.familyId).filter(Boolean)};
}

function pilotAnswerRows(state){return (state?.events||[]).filter(e=>e&&e.modality!=='audio'&&e.scored!==false);}
function pilotFirstIndependent(rows){
 const seen=new Set(),out=[];
 for(const e of rows.filter(e=>e.mode!=='transfer'&&!e.transfer&&e.hinted!==true)){
  const key=e.itemId||e.eventId;if(!key||seen.has(key))continue;seen.add(key);out.push(e);
 }
 return out;
}
function pilotErrorCounts(rows){
 const counts={};
 for(const e of rows)if(e.correct===false)for(const code of e.errorCodes||[])counts[code]=(counts[code]||0)+1;
 return counts;
}
function pilotRepeatedError(rows){
 const seen=new Map();let n=0;
 for(const e of [...rows].filter(e=>e.correct===false).sort((a,b)=>(a.at||0)-(b.at||0))){
  for(const code of e.errorCodes||[]){
   const prev=seen.get(code);
   if(prev&&prev!==e.lemmaId)n++;
   if(!prev&&e.lemmaId)seen.set(code,e.lemmaId);
  }
 }
 return n;
}
function pilotPublicEvent(e){
 return {eventId:e.eventId||'',at:e.at||0,type:e.type||'',itemId:e.itemId||'',lemmaId:e.lemmaId||'',familyId:e.familyId||'',sequence:e.sequence||[],level:e.level||'',mode:e.mode||'',responseMode:e.responseMode||'',correct:e.correct===true,hinted:e.hinted===true,errorCodes:e.errorCodes||[],transfer:!!(e.transfer||e.mode==='transfer')};
}
function pilotSummary(state){
 const rows=pilotAnswerRows(state),first=pilotFirstIndependent(rows),transfer=rows.filter(e=>e.transfer||e.mode==='transfer'),hinted=rows.filter(e=>e.hinted===true);
 const claim=stage10StrongFromEvents(transfer),retention=stage10Retention(rows);
 const narrow=first.length<8?'мало данных':'описательный итог, не доказательство метода';
 return {n:first.length,correct:first.filter(e=>e.correct===true).length,uniqueLemmas:new Set(first.map(e=>e.lemmaId).filter(Boolean)).size,families:[...new Set(first.map(e=>e.sequence&&e.sequence.at(-1)).filter(Boolean))],hintedAnswers:hinted.length,hintRate:rows.length?hinted.length/rows.length:0,errorCounts:pilotErrorCounts(rows),repeatedErrorOnOtherLemma:pilotRepeatedError(rows),transfer:{n:transfer.length,status:claim.status,pass:false},retention:{count:retention.count,label:retention.label},claim:narrow,audioRecordings:0};
}
function pilotExport(state){
 const teaching=(state?.teaching?.events||[]).filter(e=>e&&e.modality!=='audio');
 return {kind:'qazaqsha-morph-pilot',privacy:'без имени, без микрофона и без аудиозаписи',dataVersion:state?.dataVersion||'',contentVersion:state?.teaching?.contentVersion||'',events:pilotAnswerRows(state).map(pilotPublicEvent),teaching:teaching.map(pilotPublicEvent),summary:pilotSummary(state)};
}
const api={MODULES,TARGETS,spec,featureKey,basePool,guidedPlan,taskForItem,repairFor,reservedLemmaIds,independentPlan,createIndependentSession,support,evaluate,previousModule,prerequisitesReady,fullStage5Ready,STAGE6_MODULES,STAGE6_TARGETS,STAGE6_SEMANTIC_CHECKS,stage6Spec,stage6SemanticChecks,stage6FeatureKey,stage6BasePool,stage6GuidedPlan,stage6TaskForItem,stage6RepairFor,stage6ReservedLemmaIds,stage6IndependentPlan,createStage6IndependentSession,stage6RewriteHint,stage6Support,fullStage6Ready,stage6PrerequisitesReady,stage6MissingPrerequisite,stage6NextModule,STAGE7_MODULE,STAGE7_GUIDED,stage7Spec,stage7MeaningReady,stage7MissingMeaning,stage7Owner,stage7PrerequisitesReady,stage7MissingPrerequisite,stage7Ready,stage7View,stage7Errors,stage7Feedback,stage7Support,stage7RepairFor,stage7GuidedPlan,stage7IndependentPlan,createStage7Run,stage7Current,stage7Evidence,stage7Works,STAGE8_SEMANTIC,stage8Spec,stage8PrerequisitesReady,stage8MissingPrerequisite,stage8Context,stage8GuidedPlan,stage8IndependentPlan,createStage8Run,STAGE9_THRESHOLD,STAGE9_CONTRASTS,stage9Assess,stage9Status,stage9Eligible,stage9Queue,stage9Repair,stage9RaisesAllAxes,stage9Pool,STAGE10_DELAY,STAGE10_SHORT_BANK,stage10WilsonLower,stage10StrongClaim,stage10StrongFromEvents,stage10Retention,stage10ContaminatedLemmas,pilotAnswerRows,pilotFirstIndependent,pilotErrorCounts,pilotRepeatedError,pilotSummary,pilotExport};
if(node)module.exports=api;else root.MorphTeachingPractice=api;
})(typeof window!=='undefined'?window:globalThis);
