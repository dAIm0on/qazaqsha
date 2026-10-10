/* vocab:must portion state. Other trainers do not call this. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const TEXT={
   idkReturn:'Набери ответ. Потом попробуешь вспомнить его без подсказки.',
   saved:'Ответ сохранён. Позже попробуешь вспомнить это слово без подсказки.',
   queued:'Позже попробуешь вспомнить это слово без подсказки.'
 };
 function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
 function emptySitting(now){return {startedAt:Number(now)||0,sessions:[],newLemmas:[],answers:0,shown:[],recent:[],legacy:null};}
 function emptyPlan(budget){return {budget:Number(budget)||10,nNew:0,baseLen:0,newLemmas:[]};}
 function isMustTrainer(mode,vocabRole,trainerReturn){return mode==='words'&&vocabRole==='must'&&trainerReturn==='vocab:must';}
 function isSavedMust(session){return !!(session&&session.mode==='words'&&session.trainerReturn==='vocab:must');}
 function lemmaKey(core,q){return core&&core.lemmaKey?core.lemmaKey(q||{id:''}):(q&&q.id)||'';}
 function skillKey(b){return b.item_id+'::'+b.skill_type;}
 function mustCounterText(n){return 'Ответов: '+String(Math.max(0,Math.floor(Number(n)||0)));}
 function idkNote(scheduled){return scheduled?TEXT.idkReturn:TEXT.saved;}
 function statusNote(scheduled){return scheduled?TEXT.queued:TEXT.saved;}
 function learnerTextOk(s){return !/FSRS|интервал|retrieval|Again/.test(String(s||''));}
 function findEvent(events,type,sessionId,presentation,cardId){
   return (events||[]).find(e=>e&&e.type===type&&String(e.session_id)===String(sessionId)&&Number(e.presentation)===Number(presentation)&&e.card_id===cardId)||null;
 }
 function cardHasHistory(state,q){
   if(!q)return false;
   const rec=state.records&&state.records[q.id];
   if(rec&&Number(rec.review_count)>0)return true;
   for(const b of q.skillBindings||[]){
     const sk=state.skills&&state.skills[skillKey(b)];
     if(sk&&Number(sk.review_count)>0)return true;
   }
   return (state.events||[]).some(e=>e&&e.type==='answer'&&e.card_id===q.id);
 }
 function lemmaHasHistory(state,pool,core,lemma){
   if(!lemma)return false;
   if(state.skills){
     for(const [k,sk] of Object.entries(state.skills)){
       if(sk&&Number(sk.review_count)>0&&(k===lemma||String(k).startsWith(lemma+'::')))return true;
     }
   }
   const ids=[];
   for(const q of pool||[])if(lemmaKey(core,q)===lemma){ids.push(q.id);if(cardHasHistory(state,q))return true;}
   return (state.events||[]).some(e=>e&&e.type==='answer'&&ids.includes(e.card_id));
 }
 function poolHasAnswerHistory(state,pool,core){
   for(const q of pool||[])if(cardHasHistory(state,q)||lemmaHasHistory(state,pool,core,lemmaKey(core,q)))return true;
   return false;
 }
 function planPortion(pool,state,cfg,core,now){
   pool=(pool||[]).filter(q=>q&&q.wordRole!=='used');
   const answerBudget=cfg&&cfg.vocab&&Number(cfg.vocab.answerBudget)||10;
   const sessionNewCap=cfg&&cfg.vocab&&Number(cfg.vocab.sessionNewCap)||2;
   const records=(state&&state.records)||{};
   const clean=!poolHasAnswerHistory(state||{},pool,core);
   const seen=new Set(),newCards=[];
   for(const q of pool){
     const lem=lemmaKey(core,q);
     if(seen.has(lem))continue;
     seen.add(lem);
     if(lemmaHasHistory(state||{},pool,core,lem))continue;
     newCards.push(q);
   }
   const nNew=clean?Math.min(3,newCards.length):Math.min(sessionNewCap,newCards.length);
   const picked=newCards.slice(0,nNew);
   const newLemmas=picked.map(q=>lemmaKey(core,q));
   const otherCap=Math.max(0,answerBudget-3*nNew);
   const limit=nNew+otherCap;
   const others=pool.filter(q=>!newLemmas.includes(lemmaKey(core,q))&&lemmaHasHistory(state||{},pool,core,lemmaKey(core,q)));
   const errors=others.filter(q=>records[q.id]&&records[q.id].needsReview);
   const due=others.filter(q=>records[q.id]&&!records[q.id].needsReview&&core.isDue(records[q.id],now)).sort((a,b)=>(Number(records[a.id].next_review||records[a.id].dueAt)||0)-(Number(records[b.id].next_review||records[b.id].dueAt)||0));
   const learning=others.filter(q=>{const r=records[q.id];return r&&!r.needsReview&&!core.isDue(r,now)&&(Number(r.streak)||0)<2;});
   const review=[];const reviewSeen=new Set();
   for(const q of [...errors,...due]){const k=lemmaKey(core,q);if(reviewSeen.has(k))continue;reviewSeen.add(k);review.push(q);}
   const out=[];const used=new Set();
   const take=(list,cap)=>{let n=0;for(const q of list){if(out.length>=limit||n>=cap)break;const k=lemmaKey(core,q);if(used.has(k))continue;used.add(k);out.push(q);n++;}};
   take(review,Math.max(0,limit-nNew));
   take(picked,nNew);
   take(learning,limit);
   const baseLen=out.length;
   const budget=Math.min(answerBudget,baseLen+2*nNew);
   return {ids:out.map(q=>q.id),plan:{budget,nNew,baseLen,newLemmas}};
 }
 function gapOk(seq,lemma,minGap){
   let last=-1;
   for(let i=0;i<seq.length;i++)if(seq[i]===lemma)last=i;
   if(last<0)return true;
   return seq.length-1-last>=minGap;
 }
 function enforceGap(ids,sitting,pool,core,minGap){
   minGap=minGap||2;
   const byId=new Map((pool||[]).map(q=>[q.id,q]));
   const lemOf=id=>lemmaKey(core,byId.get(id)||{id});
   const recent=((sitting&&sitting.recent)||[]).map(x=>x.lemma||x.cardId);
   const out=[],deferred=[];
   for(const id of ids||[]){
     const seq=recent.concat(out.map(lemOf));
     if(gapOk(seq,lemOf(id),minGap))out.push(id);
     else deferred.push(id);
   }
   let guard=0;
   while(deferred.length&&guard++<((ids||[]).length+2)){
     let placed=false;
     for(let i=0;i<deferred.length;i++){
       const seq=recent.concat(out.map(lemOf));
       if(!gapOk(seq,lemOf(deferred[i]),minGap))continue;
       out.push(deferred.splice(i,1)[0]);placed=true;break;
     }
     if(!placed)break;
   }
   return out;
 }
 function otherCount(seq,lemma,lemOf){
   const ids=[];
   for(const id of seq)if(lemOf(id)!==lemma&&!ids.includes(id))ids.push(id);
   return ids.length;
 }
 function scheduleReturn(opts){
   const original=(opts.queue||[]).slice();
   const queue=original.slice();
   const position=opts.position|0;
   const cardId=opts.cardId;
   const pool=opts.pool||[];
   const plan=opts.plan||{newLemmas:[]};
   const state=opts.state||{records:{},skills:{},events:[]};
   const core=opts.core;
   const budget=Number(opts.budget)||0;
   const minGap=opts.minGap||2;
   const appearCap=opts.appearCap||3;
   const byId=new Map(pool.map(q=>[q.id,q]));
   const lemOf=id=>lemmaKey(core,byId.get(id)||{id:id});
   const lem=opts.lemma||lemOf(cardId);
   for(let i=queue.length-1;i>position;i--)if(queue[i]===cardId)queue.splice(i,1);
   if(queue.filter(id=>id===cardId).length>=appearCap)return {queue:original,scheduled:false};
   const allowed=new Set(plan.newLemmas||[]);
   const seq=queue.slice(position+1);
   const inQ=new Set(queue);
   let added=0;
   for(const item of pool){
     if(otherCount(seq,lem,lemOf)>=minGap)break;
     if(!item||item.id===cardId||item.wordRole==='used'||inQ.has(item.id))continue;
     const il=lemmaKey(core,item);
     if(il===lem)continue;
     if(!allowed.has(il)&&!lemmaHasHistory(state,pool,core,il))continue;
     if(budget&&queue.length+added+1>budget)break;
     seq.push(item.id);added++;inQ.add(item.id);
   }
   if(otherCount(seq,lem,lemOf)<minGap)return {queue:original,scheduled:false};
   if(budget&&queue.length+added+1>budget)return {queue:original,scheduled:false};
   let seen=0,at=seq.length;
   for(let i=0;i<seq.length;i++){if(lemOf(seq[i])!==lem)seen++;if(seen>=minGap){at=i+1;break;}}
   const next=queue.slice(0,position+1).concat(seq.slice(0,at),[cardId],seq.slice(at));
   if(budget&&next.length>budget)return {queue:original,scheduled:false};
   if(next.filter(id=>id===cardId).length>appearCap)return {queue:original,scheduled:false};
   return {queue:next,scheduled:true};
 }
 function retryFromAnswer(event){
   if(!event)return null;
   return {cardId:event.card_id,sessionId:String(event.session_id),presentation:Number(event.presentation),kind:event.idk?'idk':'wrong',typed:Array.isArray(event.answers)?event.answers.slice():[],answerEventId:event.id||null};
 }
 function commitFirst(ctx){
   const state=ctx.state,records=ctx.records||state.records,q=ctx.q;
   const sessionId=String(ctx.sessionId),presentation=Number(ctx.presentation),kind=ctx.kind;
   const existing=findEvent(state.events,'answer',sessionId,presentation,q.id);
   if(existing){
     const scheduled=(ctx.queue||[]).slice(ctx.position+1).includes(q.id);
     return {duplicate:true,event:existing,record:records[q.id],queue:(ctx.queue||[]).slice(),scheduled,retry:existing.correct&&!existing.hinted&&!existing.idk?null:retryFromAnswer(existing)};
   }
   const core=ctx.core,pool=ctx.pool||[],sitting=ctx.sitting;
   const lem=lemmaKey(core,q);
   if(sitting&&!sitting.newLemmas.includes(lem)&&!lemmaHasHistory(state,pool,core,lem))sitting.newLemmas.push(lem);
   const hintedFlag=kind==='idk'?true:!!ctx.hinted;
   const correctFlag=kind==='good'||kind==='assisted';
   const now=ctx.now;
   const rec=core.updateRecord(records[q.id],correctFlag,hintedFlag,now,{responseTime:ctx.elapsed,recall:ctx.recall!==false,rating:ctx.rating});
   records[q.id]=rec;
   const event={id:'ans:'+sessionId+':'+presentation+':'+q.id,at:now,type:'answer',session_id:sessionId,presentation,card_id:q.id,answers:Array.isArray(ctx.answers)?ctx.answers.slice():[],correct:correctFlag,hinted:hintedFlag,peek:hintedFlag?1:0,first_try_correct:kind==='good'?1:0,idk:kind==='idk'?1:0,rating:ctx.rating,response_time_ms:ctx.elapsed,response_time:ctx.elapsed,latency_ms:ctx.elapsed,recall:ctx.recall!==false};
   if(ctx.observe)event.skills=ctx.observe(state,q,ctx.result||{correct:correctFlag,parts:[]},event,ctx.errors||[],{must:true});
   state.events.push(event);
   let queue=(ctx.queue||[]).slice(),scheduled=false,retry=null;
   if(kind!=='good'){
     const sched=scheduleReturn({queue,position:ctx.position,cardId:q.id,pool,plan:ctx.plan,sitting,state,core,budget:ctx.budget,minGap:ctx.minGap||2,appearCap:ctx.appearCap||3,lemma:lem});
     queue=sched.queue;scheduled=sched.scheduled;
     if(kind!=='assisted')retry={cardId:q.id,sessionId,presentation,kind:kind==='idk'?'idk':'wrong',typed:kind==='wrong'?(Array.isArray(ctx.answers)?ctx.answers.slice():[]):[],answerEventId:event.id};
   }
   if(correctFlag&&sitting)sitting.answers=(Number(sitting.answers)||0)+1;
   return {duplicate:false,event,record:rec,queue,scheduled,retry};
 }
 function commitRetype(ctx){
   const state=ctx.state,sitting=ctx.sitting,retry=ctx.retry||{};
   const sessionId=String(ctx.sessionId!=null?ctx.sessionId:retry.sessionId);
   const presentation=Number(ctx.presentation!=null?ctx.presentation:retry.presentation);
   const cardId=ctx.cardId||retry.cardId;
   if(!ctx.result||!ctx.result.correct){
     return {closed:false,duplicate:false,retry:Object.assign({},retry,{typed:Array.isArray(ctx.answers)?ctx.answers.slice():[]})};
   }
   const existing=findEvent(state.events,'retry_close',sessionId,presentation,cardId);
   if(existing)return {closed:true,duplicate:true,event:existing,retry:null};
   const now=ctx.now;
   const event={id:'rc:'+sessionId+':'+presentation+':'+cardId,at:now,type:'retry_close',session_id:sessionId,presentation,card_id:cardId,answer_event_id:retry.answerEventId||null,assisted:true,correct:true,hinted:true,answers:Array.isArray(ctx.answers)?ctx.answers.slice():[]};
   if(retry.legacy||retry.answerEventId==null&&ctx.legacy)event.legacy=1;
   state.events.push(event);
   if(sitting){
     sitting.answers=(Number(sitting.answers)||0)+1;
     if(sitting.legacy&&sitting.legacy.openIdk&&sitting.legacy.openIdk.cardId===cardId)sitting.legacy.openIdk=null;
   }
   return {closed:true,duplicate:false,event,retry:null,assisted:true,unaided:false};
 }
 function noteShown(sitting,lemma){
   if(!sitting||!lemma)return;
   if(!sitting.shown.includes(lemma))sitting.shown.push(lemma);
 }
 function noteRecent(sitting,entry){
   if(!sitting||!entry)return;
   sitting.recent=sitting.recent||[];
   const key=String(entry.sessionId)+'|'+entry.presentation+'|'+entry.cardId;
   if(sitting.recent.some(x=>String(x.sessionId)+'|'+x.presentation+'|'+x.cardId===key))return;
   sitting.recent.push({cardId:entry.cardId,lemma:entry.lemma,sessionId:String(entry.sessionId),presentation:entry.presentation});
   if(sitting.recent.length>24)sitting.recent=sitting.recent.slice(-24);
 }
 function inSitting(sitting,e){
   const sessions=new Set(((sitting&&sitting.sessions)||[]).map(String));
   if(sessions.size&&e.session_id!=null&&!sessions.has(String(e.session_id)))return false;
   const boundary=sitting&&sitting.legacy&&Number.isFinite(Number(sitting.legacy.boundaryAt))?Number(sitting.legacy.boundaryAt):null;
   if(boundary!=null&&!(Number(e.at)>boundary))return false;
   return true;
 }
 function recount(state,sitting){
   sitting=sitting||emptySitting(0);
   const unaided=new Set(),assisted=new Set();
   for(const e of (state&&state.events)||[]){
     if(!e||!inSitting(sitting,e))continue;
     const key=String(e.session_id)+'|'+String(e.presentation)+'|'+String(e.card_id);
     if(e.type==='retry_close'&&e.correct)assisted.add(key);
     else if(e.type==='answer'&&e.correct&&!e.hinted&&!e.idk&&!e.rule_peek&&!e.peek)unaided.add(key);
   }
   let u=unaided.size,a=assisted.size;
   if(sitting.legacy){u+=Number(sitting.legacy.sessionCorrect)||0;a+=Number(sitting.legacy.sessionAssisted)||0;}
   return {unaided:u,assisted:a,closed:u+a};
 }
 function wordLine(state,sitting,card){
   sitting=sitting||emptySitting(0);
   const cardId=card&&(card.cardId||card.id);
   const lemma=card&&card.lemma;
   if(sitting.legacy&&sitting.legacy.openIdk&&sitting.legacy.openIdk.cardId===cardId)return 'с подсказкой';
   const events=((state&&state.events)||[]).filter(e=>e&&e.card_id===cardId&&inSitting(sitting,e));
   if(events.some(e=>e.type==='retry_close'))return 'с подсказкой';
   const ans=events.find(e=>e.type==='answer');
   if(ans&&ans.correct&&!ans.hinted&&!ans.idk&&!ans.rule_peek&&!ans.peek)return 'самостоятельно';
   if((sitting.shown||[]).includes(lemma)&&!ans)return 'Без ответа';
   if(!ans)return 'Без ответа';
   return 'Без ответа';
 }
 function portionDone(sessionAttempts,budget,position,queueLength){
   return Number(sessionAttempts)>=Number(budget)||Number(position)>=Number(queueLength);
 }
 function snapshot(live){
   live=live||{};
   return {plan:clone(live.plan)||emptyPlan(10),sitting:clone(live.sitting)||emptySitting(0),retry:live.retry?clone(live.retry):null,closed:Array.isArray(live.closed)?live.closed.slice():[],unaided:clone(live.unaided)||{},blindFails:clone(live.blindFails)||{},nearMiss:null};
 }
 function restoreSaved(saved,state,cfg,now){
   saved=saved||{};
   const events=(state&&state.events)||[];
   const budget=cfg&&cfg.vocab&&Number(cfg.vocab.answerBudget)||10;
   if(saved.vocab&&saved.vocab.plan){
     const v=clone(saved.vocab);
     v.nearMiss=null;
     if(!v.sitting)v.sitting=emptySitting(now);
     if(!Array.isArray(v.sitting.sessions))v.sitting.sessions=[];
     if(!Array.isArray(v.sitting.newLemmas))v.sitting.newLemmas=[];
     if(!Array.isArray(v.sitting.shown))v.sitting.shown=[];
     if(!Array.isArray(v.sitting.recent))v.sitting.recent=[];
     if(!Array.isArray(v.closed))v.closed=[];
     if(!v.retry){
       const cardId=(saved.queue||[])[saved.position];
       const ans=findEvent(events,'answer',saved.queueEpoch,saved.position,cardId);
       const close=findEvent(events,'retry_close',saved.queueEpoch,saved.position,cardId);
       if(ans&&(ans.correct===false||ans.idk)&&!close)v.retry=retryFromAnswer(ans);
     }
     return {vocab:v,legacy:false,graded:false};
   }
   const sitting=emptySitting(now);
   sitting.sessions=[String(saved.queueEpoch)];
   sitting.answers=(Number(saved.sessionCorrect)||0)+(Number(saved.sessionAssisted)||0);
   sitting.legacy={sessionCorrect:Number(saved.sessionCorrect)||0,sessionAssisted:Number(saved.sessionAssisted)||0,boundaryAt:now,openIdk:null};
   const cardId=(saved.queue||[])[saved.position];
   const ans=findEvent(events,'answer',saved.queueEpoch,saved.position,cardId);
   const close=findEvent(events,'retry_close',saved.queueEpoch,saved.position,cardId);
   let retry=null;
   if(ans&&(ans.correct===false||ans.idk)&&!close)retry=retryFromAnswer(ans);
   else if(saved.hinted&&!ans&&cardId){
     retry={cardId,sessionId:String(saved.queueEpoch),presentation:Number(saved.position)||0,kind:'idk',typed:[],answerEventId:null,legacy:1};
     sitting.legacy.openIdk={cardId,sessionId:String(saved.queueEpoch),presentation:Number(saved.position)||0,lemma:saved.lemma||null};
   }
   return {vocab:{plan:{budget,nNew:0,baseLen:(saved.queue||[]).length,newLemmas:[]},sitting,retry,closed:[],unaided:{},blindFails:{},nearMiss:null},legacy:true,graded:false};
 }
 function importPlan(local,incoming,mode){
   const session=incoming&&incoming.session;
   if(mode==='replace'){
     if(isSavedMust(session)&&Array.isArray(session.queue))return {action:'restore',session};
     return {action:'reset'};
   }
   if(local&&local.mustUnfinished)return {action:'keep-local'};
   return {action:'reset'};
 }
 const api={TEXT,clone,emptySitting,emptyPlan,isMustTrainer,isSavedMust,lemmaKey,mustCounterText,idkNote,statusNote,learnerTextOk,findEvent,cardHasHistory,lemmaHasHistory,poolHasAnswerHistory,planPortion,enforceGap,scheduleReturn,commitFirst,commitRetype,noteShown,noteRecent,recount,wordLine,portionDone,snapshot,restoreSaved,importPlan,retryFromAnswer};
 if(node)module.exports=api;else root.VocabMust=api;
})(typeof window!=='undefined'?window:globalThis);
