/* Isolated free-practice memory. Never reads or writes the course profile. */
(function(root){
'use strict';
const Q=typeof module!=='undefined'&&module.exports?require('./free-practice-queue.js'):root.FreePracticeQueue;
const cfg=typeof module!=='undefined'&&module.exports?require('./free-practice-config.js'):root.FreePracticeConfig;
function empty(seed){
 return {schemaVersion:1,contentVersion:cfg.config.version,revision:0,currentCycle:1,selectedBlockIds:[],explainedBlockIds:[],theoryCursor:null,preferences:{supportLevel:'try_myself',introSeen:false,repeatNotice:false},seed:(seed>>>0)||1,seedStep:0,currentCard:null,exhaustReason:'',history:[],recentError:null,ownerId:null,lastUpdated:0};
}
function migrate(raw){
 if(!raw||raw.schemaVersion!==1)return empty();
 const out=empty(raw.seed);
 out.revision=Math.max(0,Math.floor(Number(raw.revision)||0));
 out.currentCycle=Math.max(1,Math.floor(Number(raw.currentCycle)||1));
 out.selectedBlockIds=Array.isArray(raw.selectedBlockIds)?raw.selectedBlockIds.slice():[];
 out.explainedBlockIds=Array.isArray(raw.explainedBlockIds)?raw.explainedBlockIds.slice():[];
 out.theoryCursor=raw.theoryCursor||null;
 out.preferences={supportLevel:raw.preferences&&raw.preferences.supportLevel==='try_myself'?'try_myself':'supported',introSeen:!!(raw.preferences&&raw.preferences.introSeen),repeatNotice:!!(raw.preferences&&raw.preferences.repeatNotice),mixedPick:!!(raw.preferences&&raw.preferences.mixedPick),screenOpen:!!(raw.preferences&&raw.preferences.screenOpen)};
 out.exhaustReason=raw.exhaustReason==='empty'||raw.exhaustReason==='cycle'||raw.exhaustReason==='error'?raw.exhaustReason:'';
 out.seedStep=Math.max(0,Math.floor(Number(raw.seedStep)||0));
 out.currentCard=raw.currentCard||null;
 out.history=Array.isArray(raw.history)?raw.history.slice():[];
 out.recentError=raw.recentError||null;
 out.ownerId=raw.ownerId||null;
 out.lastUpdated=Number(raw.lastUpdated)||0;
 return out;
}
function clone(state){return migrate(JSON.parse(JSON.stringify(state)));}
function cas(base,expectedRevision,mutate){
 const state=migrate(base);
 if(state.revision!==expectedRevision)return {ok:false,reason:'conflict',state};
 const next=mutate(clone(state));
 next.revision=state.revision+1;
 next.lastUpdated=state.lastUpdated+1;
 return {ok:true,state:next};
}
function claim(base,tabId){
 const state=migrate(base);
 if(state.ownerId&&state.ownerId!==tabId)return {ok:false,reason:'other-tab',state};
 return cas(base,base.revision,next=>{next.ownerId=tabId;return next;});
}
function takeOver(base,tabId){return cas(base,base.revision,state=>{state.ownerId=tabId;return state;});}
function prepare(base,blockIds){
 const ids=(blockIds||[]).slice();
 return cas(base,base.revision,state=>{state.selectedBlockIds=ids;state.explainedBlockIds=ids;return state;});
}
function present(base,pool){
 let picked;
 try{picked=Q.nextCard(pool,base);}catch(e){picked={status:'EXHAUSTED',reason:'ERROR'};}
 if(picked.status!=='CARD'){
  const reason=picked.reason==='ERROR'?'error':(pool&&pool.length?'cycle':'empty');
  const next=cas(base,base.revision,state=>{state.currentCard=null;state.exhaustReason=reason;return state;});
  if(!next.ok)return next;
  next.picked=picked;
  return next;
 }
 const occurrenceId='occ:'+base.currentCycle+':'+base.history.length+':'+picked.card.cardId;
 if((base.history||[]).some(h=>h.occurrenceId===occurrenceId)||(base.currentCard&&base.currentCard.occurrenceId===occurrenceId&&base.currentCard.presentationCommitted))return {ok:false,reason:'duplicate',state:migrate(base),picked};
 return cas(base,base.revision,state=>{
  const lemma=Q.keyOf(picked.card);
  const n=Q.countQuestions(state.history,lemma,state.currentCycle)+1;
  state.history=state.history.concat([{occurrenceId,normalizedLemmaKey:lemma,lemmaId:picked.card.lemmaId,blockId:picked.card.blockId,cardId:picked.card.cardId,subcase:picked.card.subcase||'',exerciseType:picked.card.exerciseType||'',presentedAtStep:state.history.length,presentationCountInCycle:n,exposureKind:'question',answered:false,revealed:false,supportLevel:state.preferences.supportLevel,createdAt:state.lastUpdated,cycle:state.currentCycle}]);
  const asked=state.history.some(h=>h.exposureKind==='question'&&h.cycle===state.currentCycle);
  if(asked)state.preferences.repeatNotice=false;
  state.exhaustReason='';
  state.currentCard={occurrenceId,cardId:picked.card.cardId,contentRevision:picked.card.contentRevision||cfg.config.version,blockId:picked.card.blockId,renderedOptions:picked.optionOrder.slice(),seedStateBefore:base.seedStep||0,seedStateAfter:picked.seedStep,rawInput:'',supportLevel:state.preferences.supportLevel,revealed:false,answered:false,feedback:null,presentationCommitted:true,card:picked.card};
  state.seedStep=picked.seedStep;
  state.preferences.introSeen=true;
  return state;
 });
}
function mark(base,patch){
 if(!base.currentCard)return {ok:false,reason:'no-card',state:migrate(base)};
 return cas(base,base.revision,state=>{
  state.currentCard=Object.assign({},state.currentCard,patch);
  state.history=state.history.map(h=>h.occurrenceId===state.currentCard.occurrenceId?Object.assign({},h,patch):h);
  return state;
 });
}
function answer(base,rawInput,correct,skillId){
 const marked=mark(base,{rawInput:String(rawInput||''),answered:true,feedback:correct?'yes':'no'});
 if(!marked.ok)return marked;
 if(correct)return marked;
 return cas(marked.state,marked.state.revision,state=>{
  state.recentError={skillId:skillId||(state.currentCard.card.targetSkillIds||[])[0]||'',lemmaKey:Q.keyOf(state.currentCard.card)};
  return state;
 });
}
function reveal(base){return mark(base,{revealed:true,answered:true});}
function setSupport(base,level){
 return cas(base,base.revision,state=>{
  state.preferences.supportLevel=level==='try_myself'?'try_myself':'supported';
  if(state.currentCard)state.currentCard.supportLevel=state.preferences.supportLevel;
  return state;
 });
}
function newCycle(base){return cas(base,base.revision,state=>{state.currentCycle+=1;state.currentCard=null;state.exhaustReason='';state.recentError=null;state.preferences.repeatNotice=true;return state;});}
function replaceStaleCard(base,pool){
 const cur=base.currentCard&&base.currentCard.card;
 if(!cur)return {ok:true,replaced:false,state:migrate(base)};
 const live=(pool||[]).find(c=>c.cardId===cur.cardId);
 if(live&&live.answer===cur.answer)return {ok:true,replaced:false,state:migrate(base)};
 const cleared=cas(base,base.revision,state=>{state.currentCard=null;return state;});
 if(!cleared.ok)return cleared;
 const shown=present(cleared.state,pool||[]);
 shown.replaced=true;
 return shown;
}
function roundtrip(state){return migrate(JSON.parse(JSON.stringify(state)));}
function commit(disk,expectedRevision,next){
 const current=disk?migrate(disk):empty();
 if(current.revision!==expectedRevision)return {ok:false,reason:'conflict',state:current};
 return {ok:true,state:migrate(next)};
}
const api={empty,migrate,clone,cas,claim,takeOver,prepare,present,answer,reveal,setSupport,newCycle,replaceStaleCard,roundtrip,commit,KEY:cfg.config.namespace};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.FreePracticeState=api;
})(typeof window!=='undefined'?window:globalThis);
