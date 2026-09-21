/* One grammar hole, ten quiet days. Does not stop a word's own FSRS card. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Transfer=node?require('./transfer-items.js'):root.TransferItems;
 const DAY=86400000,QUIET_DAYS=10;
 const PAPER='Перед набором выпиши на лист, что помнишь про это. Потом сверка с Правилами.';
 function short(rule){const m=String(rule||'').match(/^T\d+/);return m?m[0]:String(rule||'');}
 function forms(ruleId){return (Transfer&&Transfer.FORMS&&Transfer.FORMS[ruleId])||{};}
 function card(ruleId,rootName,answer){
  return {
   id:'repair:'+ruleId+':'+rootName,source:'repair',group:'ремонт',part:'1',lessonId:'',topic:'rules',kind:'fields',
   title:'Ремонт: '+short(ruleId),stimulus:rootName+' → ?',
   fields:[{label:'Ответ',kind:'text',answers:[answer]}],explanation:answer+'.',
   ruleIds:[ruleId],practiceOnly:true,repairRoot:rootName
  };
 }
 function splitRoots(ruleId){
  const keys=Object.keys(forms(ruleId));
  if(keys.length<=2)return {day0:keys.slice(0,1),day10:keys.slice(1)};
  const cut=Math.max(1,keys.length-2);
  return {day0:keys.slice(0,cut),day10:keys.slice(cut)};
 }
 function day0Cards(ruleId){
  const table=forms(ruleId);
  return splitRoots(ruleId).day0.filter(rootName=>table[rootName]).map(rootName=>card(ruleId,rootName,table[rootName]));
 }
 function day10Cards(ruleId,rootsUsed){
  const used=new Set(rootsUsed||[]);
  const table=forms(ruleId);
  return splitRoots(ruleId).day10.filter(rootName=>table[rootName]&&!used.has(rootName)).slice(0,2).map(rootName=>card(ruleId,rootName,table[rootName]));
 }
 function busy(state,now){
  const repair=state&&state.repair;
  return !!(repair&&now<Number(repair.quiet_until));
 }
 function start(state,ruleId,now,roots){
  if(!state||busy(state,now))return false;
  const used=(roots&&roots.length?roots:splitRoots(ruleId).day0).slice(0,6);
  state.repair={rule_id:ruleId,started:new Date(now).toISOString(),quiet_until:now+QUIET_DAYS*DAY,roots_used:used,attempts:0,blinds:0};
  return true;
 }
 function blocksProbe(q,state,now){
  const repair=state&&state.repair;
  if(!repair||!(now<Number(repair.quiet_until)))return false;
  return (q&&q.ruleIds||[]).includes(repair.rule_id);
 }
 function dayNumber(state,now){
  const repair=state&&state.repair;if(!repair)return 0;
  const startMs=Date.parse(repair.started);const from=Number.isFinite(startMs)?startMs:now;
  return Math.min(QUIET_DAYS,Math.max(1,Math.floor((now-from)/DAY)+1));
 }
 function detail(state,now){
  const repair=state&&state.repair;if(!repair)return '';
  return short(repair.rule_id)+' · день '+dayNumber(state,now)+'/'+QUIET_DAYS;
 }
 function ribbon(state,now){
  const bit=detail(state,now);return bit?'Дыра в ремонте · '+bit:'';
 }
 function note(state,correct){
  const repair=state&&state.repair;if(!repair)return null;
  repair.attempts=(repair.attempts||0)+1;
  if(correct)repair.blinds=(repair.blinds||0)+1;else repair.blinds=0;
  if(repair.blinds>=3){
   state.savings=state.savings||Object.create(null);
   state.savings[repair.rule_id]=repair.attempts;
   return repair.attempts;
  }
  return null;
 }
 function failDay10(state,now){
  if(!state||!state.repair)return;
  state.repair.started=new Date(now).toISOString();
  state.repair.quiet_until=now+QUIET_DAYS*DAY;
  state.repair.blinds=0;
 }
 function passDay10(state){
  if(!state||!state.repair)return;
  const repair=state.repair;
  state.savings=state.savings||Object.create(null);
  if(state.savings[repair.rule_id]==null)state.savings[repair.rule_id]=repair.attempts||0;
  state.repair=null;
 }
 function savingsLine(state,ruleId){
  const n=state&&state.savings&&state.savings[ruleId];
  if(n==null)return '';
  return short(ruleId)+' savings '+n;
 }
 function metricParts(state,events){
  const last=(events||[]).filter(e=>e&&e.type==='answer').slice(-20);
  const parts=[];
  if(last.length){
   parts.push({kind:'first-try',value:last.filter(e=>e.correct&&!e.hinted&&!e.peek).length+'/'+last.length});
   parts.push({kind:'peek-rate',value:last.filter(e=>e.hinted||e.peek).length+'/'+last.length});
   const transfers=last.filter(e=>e.transfer);
   if(transfers.length)parts.push({kind:'transfer-rate',value:transfers.filter(e=>e.correct&&!e.hinted&&!e.peek).length+'/'+transfers.length});
  }
  for(const ruleId of Object.keys((state&&state.savings)||{})){
   const line=savingsLine(state,ruleId);
   if(line)parts.push({kind:'savings',value:line});
  }
  return parts;
 }
 const api={DAY,QUIET_DAYS,PAPER,short,day0Cards,day10Cards,busy,start,blocksProbe,dayNumber,detail,ribbon,note,failDay10,passDay10,savingsLine,metricParts};
 if(node)module.exports=api;
 else root.RepairState=api;
})(typeof window!=='undefined'?window:globalThis);
