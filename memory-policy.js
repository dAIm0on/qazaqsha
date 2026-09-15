/* T3 memory policy: contrast, item types, incidental cap, exam gate. No FSRS weights. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const cfg=node?require('./config.js'):root.TRAINER_CONFIG;
 const PAIRS=[['алты','алпыс'],['жеті','жетпіс'],['сегіз','сексен'],['тоғыз','тоқсан'],['сен','сіз'],['сың','сіз']];
 const PARTICLES=[['ба','ма'],['бе','ме']];
 function weekKey(at=Date.now()){
   const d=new Date(at);d.setHours(0,0,0,0);
   const one=new Date(d.getFullYear(),0,1);
   const w=Math.floor(((d-one)/86400000+one.getDay()+6)/7);
   return d.getFullYear()+'-W'+String(w).padStart(2,'0');
 }
 function blob(q){
   return ((q&&q.stimulus||'')+' '+((q&&q.fields||[]).flatMap(f=>f.answers||[]).join(' '))+' '+(q&&q.title||'')).toLowerCase();
 }
 function tokenHas(t,w){
   return new RegExp('(?:^|[^\\p{L}])'+w+'(?:$|[^\\p{L}])','iu').test(t);
 }
 function contrastSide(q){
   const t=blob(q);
   for(let i=0;i<PAIRS.length;i++){
     const [a,b]=PAIRS[i];
     if(tokenHas(t,b))return {pair:'lex-'+i,side:1,mate:a,self:b};
     if(tokenHas(t,a))return {pair:'lex-'+i,side:0,mate:b,self:a};
   }
   const answers=((q&&q.fields)||[]).flatMap(f=>f.answers||[]).map(a=>String(a).toLowerCase());
   for(let i=0;i<PARTICLES.length;i++){
     const [a,b]=PARTICLES[i];
     if(answers.includes(b))return {pair:'q-'+i,side:1,mate:a,self:b};
     if(answers.includes(a))return {pair:'q-'+i,side:0,mate:b,self:a};
   }
   return null;
 }
 function isAtomicNumber(n){
   return Number.isInteger(n)&&(n>=0&&n<=10||n===100||n===1000||n>=20&&n<=90&&n%10===0);
 }
 function isAssembleOnlyCard(q){
   if(!q)return false;
   if(q.generatedNumber)return false;
   const id=String(q.id||'');
   if(id.startsWith('learn-compose-'))return true;
   if(q.topic==='numbers'&&id.startsWith('learn-')){
     const n=Number(q.stimulus);
     if(Number.isInteger(n)&&!isAtomicNumber(n))return true;
   }
   return false;
 }
 function answerFlags({hinted,correct}){
   return {
     first_try_correct:hinted?0:(correct?1:0),
     peek:hinted?1:0,
     retype_after_peek_ok:hinted?(correct?1:0):null
   };
 }
 function breakRuns(ids,questions){
   const byId=new Map((questions||[]).map(q=>[q.id,q]));
   const out=[...ids];
   for(let i=2;i<out.length;i++){
     const a=contrastSide(byId.get(out[i-2])),b=contrastSide(byId.get(out[i-1])),c=contrastSide(byId.get(out[i]));
     if(a&&b&&c&&a.pair===b.pair&&b.pair===c.pair&&a.side===b.side&&b.side===c.side){
       const swap=out.findIndex((id,j)=>j>i&&contrastSide(byId.get(id))?.pair===a.pair&&contrastSide(byId.get(id))?.side!==a.side);
       if(swap>0){[out[i],out[swap]]=[out[swap],out[i]];}
     }
   }
   return out;
 }
 function classify(q){
   if(!q)return 'other';
   if(q.item_type)return q.item_type;
   if(q.generatedNumber)return 'assemble';
   if(q.topic==='rules'||(q.id||'').startsWith('rule-'))return 'rule';
   if((q.id||'').startsWith('facet-'))return (q.id.includes('full_form')?'prod':'fade');
   if(q.topic==='numbers'&&Number(q.stimulus)>10&&Number(q.stimulus)%10!==0&&Number(q.stimulus)!==100)return 'assemble';
   if(contrastSide(q))return 'contrast';
   if(q.topic==='vocab'&&/казахск/i.test(q.title||''))return 'prod';
   if(q.topic==='vocab')return 'rec';
   if(q.topic==='plural'||q.topic==='person')return 'prod';
   return 'other';
 }
 function direction(q){
   const t=classify(q);
   if(t==='rule'||t==='fade')return 'rule';
   if(t==='assemble')return 'transcode';
   if(q.topic==='vocab'&&/казахск/i.test(q.title||''))return 'L1L2';
   if(q.topic==='vocab')return 'L2L1';
   if(/цифр/i.test(q.title||''))return 'L2L1';
   return 'L1L2';
 }
 function isContextOnly(q,catalog){
   if(!q)return false;
   if(q.contextOnly||q.wordRole==='used')return true;
   if(!catalog||!q.vocabIds)return false;
   return q.vocabIds.every(id=>{
     const w=(catalog.words||[]).find(x=>x.id===id);
     return w&&w.target_or_context!=='target';
   })&&q.vocabIds.length>0&&!q.ruleIds?.length;
 }
 function examReady(r){
   return !!r&&(r.recall_review_successes||0)>=2;
 }
 function canMasterProduction(q,event){
   if(!q||q.kind==='multi')return false;
   if(event&&(event.hinted||event.rule_peek||event.peek))return false;
   return classify(q)!=='rec';
 }
 function associationFaded(record){
   return (record&&record.recall_review_successes||0)>=2;
 }
 function isChunk(q){
   const t=blob(q);
   return /сәлем|сәлеметсіз|сау бол|ассалаумағалейкум/i.test(t);
 }
 function rulesProbe(questions,state){
   const out=[],stems=new Set();
   for(const q of questions||[]){
     if(!q||q.contextOnly||q.kind!=='fields')continue;
     if(!(q.topic==='plural'||(q.ruleIds||[]).includes('harmony')||(q.ruleIds||[]).includes('plural')))continue;
     const rec=state&&state.records&&state.records[q.id];
     if(!rec||!(rec.recall_review_successes||rec.seen))continue;
     const stem=String(q.stimulus||q.id);
     if(stems.has(stem))continue;
     stems.add(stem);out.push(q.id);
     if(out.length>=3)break;
   }
   return out;
 }
 function incidentalWeek(state,at=Date.now()){
   const key=weekKey(at);
   const cur=state.incidentalWeek&&state.incidentalWeek.key===key?state.incidentalWeek:{key,added:0};
   return cur;
 }
 function canAddIncidental(state,at=Date.now()){
   return incidentalWeek(state,at).added<(cfg.session.incidentalWeekCap||8);
 }
 function confusionTag(q,answers,result){
   if(!q||!result||result.correct)return result&&!String(answers&&answers[0]||'').trim()?'blank':'';
   const t=blob(q);
   if(/алты|алпыс|жеті|жетпіс|сегіз|сексен|тоғыз|тоқсан/.test(t))return 'lexical_confuse';
   if(q.topic==='sounds'||(q.ruleIds||[]).includes('harmony'))return 'harmony';
   if(q.topic==='person'||(q.id||'').includes('ending'))return 'ending';
   if(q.topic==='numbers'||q.generatedNumber)return 'place_value';
   if((q.ruleIds||[]).includes('quantity'))return 'extra_plural';
   return 'other';
 }
 const api={PAIRS,PARTICLES,weekKey,contrastSide,breakRuns,classify,direction,isContextOnly,examReady,canMasterProduction,associationFaded,isChunk,rulesProbe,incidentalWeek,canAddIncidental,confusionTag,isAtomicNumber,isAssembleOnlyCard,answerFlags};
 if(node)module.exports=api;else root.MemoryPolicy=api;
})(typeof window!=='undefined'?window:globalThis);
