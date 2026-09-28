/* Pure next-card picker. No DOM, storage, or FSRS. */
(function(root){
'use strict';
const cfg=typeof module!=='undefined'&&module.exports?require('./free-practice-config.js'):root.FreePracticeConfig;
function keyOf(card){return String(card.normalizedLemmaKey||'').toLocaleLowerCase('kk');}
function questions(history,cycle){return (history||[]).filter(h=>h.exposureKind==='question'&&h.cycle===cycle);}
function touches(history,cycle){return (history||[]).filter(h=>(h.exposureKind==='question'||h.exposureKind==='worked_example')&&h.cycle===cycle);}
function countQuestions(history,lemmaKey,cycle){return questions(history,cycle).filter(h=>h.normalizedLemmaKey===lemmaKey).length;}
function distinctSince(history,lemmaKey,cycle){
 const rows=touches(history,cycle);
 let last=-1;
 for(let i=rows.length-1;i>=0;i--)if(rows[i].normalizedLemmaKey===lemmaKey){last=i;break;}
 if(last<0)return Infinity;
 return new Set(rows.slice(last+1).map(h=>h.normalizedLemmaKey).filter(k=>k!==lemmaKey)).size;
}
function consecutiveSubcase(history,cycle){
 const rows=questions(history,cycle);
 if(!rows.length)return {subcase:null,n:0};
 const subcase=rows[rows.length-1].subcase||'';
 let n=0;
 for(let i=rows.length-1;i>=0&&(rows[i].subcase||'')===subcase;i--)n++;
 return {subcase,n};
}
function allowed(card){
 if(!card||card.holdout)return false;
 if(card.split&&card.split!=='train'&&card.split!=='practice_only_reviewed')return false;
 return card.admissionStatus==='synthetic'||card.admissionStatus==='runtime_approved';
}
function eligible(pool,state){
 const selected=new Set(state.selectedBlockIds||[]);
 const explained=new Set(state.explainedBlockIds||[]);
 const cycle=state.currentCycle;
 const rows=(pool||[]).filter(card=>{
  if(!allowed(card))return false;
  if(selected.size&&!selected.has(card.blockId))return false;
  if(!explained.has(card.blockId))return false;
  const lemma=keyOf(card);
  const n=countQuestions(state.history,lemma,cycle);
  if(n>=cfg.config.maxQuestionPresentationsPerLemma)return false;
  if(n>=1&&distinctSince(state.history,lemma,cycle)<cfg.config.minDistinctOtherLemmasBetween)return false;
  return true;
 });
 const run=consecutiveSubcase(state.history,cycle);
 if(run.n>=cfg.config.maxConsecutiveSameSubcaseWhenAlternatives&&rows.some(card=>(card.subcase||'')!==run.subcase))return rows.filter(card=>(card.subcase||'')!==run.subcase);
 return rows;
}
function rng(seed,step){
 let n=(seed>>>0)||1;
 for(let i=0;i<step;i++)n=(1664525*n+1013904223)>>>0;
 return {n,next(){this.n=(1664525*this.n+1013904223)>>>0;return this.n/4294967296;},steps:step};
}
function shuffle(list,random){
 const a=list.slice();
 let used=0;
 for(let i=a.length-1;i>0;i--){const j=Math.floor(random.next()*(i+1));used++;[a[i],a[j]]=[a[j],a[i]];}
 return {list:a,used};
}
function score(card,state){
 const lemma=keyOf(card);
 const seen=countQuestions(state.history,lemma,state.currentCycle);
 let value=0;
 if(!seen)value+=8;
 const subSeen=questions(state.history,state.currentCycle).some(h=>h.subcase===card.subcase);
 if(!subSeen)value+=2;
 const err=state.recentError;
 if(err&&err.skillId&&(card.targetSkillIds||[]).includes(err.skillId)&&lemma!==err.lemmaKey)value+=4;
 const last=questions(state.history,state.currentCycle).at(-1);
 if(last&&last.exerciseType&&last.exerciseType===card.exerciseType)value-=1;
 return value;
}
function nextCard(pool,state){
 const rows=eligible(pool,state);
 if(!rows.length)return {status:'EXHAUSTED',reason:'NO_ELIGIBLE',seedStep:state.seedStep||0};
 const max=Math.max(...rows.map(card=>score(card,state)));
 const top=rows.filter(card=>score(card,state)===max);
 const random=rng(state.seed,state.seedStep||0);
 const shuffled=shuffle(top,random);
 const card=shuffled.list[0];
 const options=shuffle((card.options||[]).slice(),random);
 return {status:'CARD',card,optionOrder:options.list,seedStep:(state.seedStep||0)+shuffled.used+options.used};
}
const api={keyOf,eligible,nextCard,countQuestions,distinctSince};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.FreePracticeQueue=api;
})(typeof window!=='undefined'?window:globalThis);
