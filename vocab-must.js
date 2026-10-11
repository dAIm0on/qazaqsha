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
 function recordsMiss(result){return !(result&&result.correct&&result.nearMiss);}
 function nearMissFeedbackHtml(expected,esc){
   const e=typeof esc==='function'?esc:v=>String(v??'');
   return '<h3>Почти точно</h3><p>Правильно пишется: <strong>'+e(expected)+'</strong></p>';
 }
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
 // One pass over events/skills/pool per planPortion call. Same answers as cardHasHistory /
 // lemmaHasHistory / poolHasAnswerHistory, without rescanning the pool and events per lemma.
 function historyIndex(state,pool,core){
   const answered=new Set();
   for(const e of state.events||[])if(e&&e.type==='answer')answered.add(e.card_id);
   const skillLemmas=new Set();
   if(state.skills)for(const [k,sk] of Object.entries(state.skills)){
     if(!(sk&&Number(sk.review_count)>0))continue;
     skillLemmas.add(k);
     for(let i=k.indexOf('::');i>=0;i=k.indexOf('::',i+1))skillLemmas.add(k.slice(0,i));
   }
   const lemOf=new Map(),byLemma=new Map(),cardMemo=new Map(),lemmaMemo=new Map();
   const lk=q=>{let v=lemOf.get(q);if(v===undefined){v=lemmaKey(core,q);lemOf.set(q,v);}return v;};
   for(const q of pool||[]){const l=lk(q);let list=byLemma.get(l);if(!list)byLemma.set(l,list=[]);list.push(q);}
   const card=q=>{
     if(!q)return false;
     let v=cardMemo.get(q);if(v!==undefined)return v;
     v=false;
     const rec=state.records&&state.records[q.id];
     if(rec&&Number(rec.review_count)>0)v=true;
     if(!v)for(const b of q.skillBindings||[]){const sk=state.skills&&state.skills[skillKey(b)];if(sk&&Number(sk.review_count)>0){v=true;break;}}
     if(!v)v=answered.has(q.id);
     cardMemo.set(q,v);return v;
   };
   const lemma=l=>{
     if(!l)return false;
     let v=lemmaMemo.get(l);if(v!==undefined)return v;
     v=skillLemmas.has(l)||(byLemma.get(l)||[]).some(card);
     lemmaMemo.set(l,v);return v;
   };
   const any=()=>(pool||[]).some(q=>card(q)||lemma(lk(q)));
   return {lk,card,lemma,any};
 }
 function answerDir(core,q){
   if(core&&typeof core.answerLang==='function')return core.answerLang(q);
   const binds=q&&q.skillBindings||[];
   const b=binds.find(x=>x&&String(x.item_id||'').startsWith('word:'))||binds[0];
   if(!b)return 'unknown';
   if(b.skill_type==='production'||b.skill_type==='digit_to_word')return 'kk';
   if(b.skill_type==='recognition'||b.skill_type==='word_to_digit')return 'ru';
   return 'unknown';
 }
 function groupKeyOf(q){
   const binds=q&&q.skillBindings||[];
   const word=binds.find(b=>b&&String(b.item_id||'').startsWith('word:'));
   if(word)return word.item_id+'::'+word.skill_type;
   return 'exercise:'+(q&&q.id);
 }
 function idClass(id){
   id=String(id||'');
   if(id.startsWith('hw'))return 0;
   if(id.startsWith('learn-word-'))return 1;
   if(id.startsWith('bank-'))return 3;
   return 2;
 }
 // True only when every recorded answer is today and the event log covers each card's review_count.
 // A missing earlier mark, a truncated log, or no timestamps at all means the first answer was not today.
 function firstAnsweredToday(lemma,cards,state,now){
   const ids=new Set((cards||[]).map(q=>q.id));
   const day=new Date(Number(now));
   if(!Number.isFinite(day.getTime()))return {today:false,dirCard:null};
   day.setHours(0,0,0,0);
   const day0=day.getTime();
   let history=false,timed=false,older=false,truncated=false;
   const eventCount=new Map();
   let best=null,bestAt=null;
   for(const e of (state&&state.events)||[]){
     if(!e||e.type!=='answer'||!ids.has(e.card_id))continue;
     history=true;
     eventCount.set(e.card_id,(eventCount.get(e.card_id)||0)+1);
     const t=Number(e.at);
     if(!(Number.isFinite(t)&&t>0))continue;
     timed=true;
     if(t<day0)older=true;
     const q=(cards||[]).find(c=>c.id===e.card_id);
     if(!q)continue;
     if(bestAt==null||t<bestAt||(t===bestAt&&String(q.id)<String(best.id))){bestAt=t;best=q;}
   }
   for(const q of cards||[]){
     const r=state&&state.records&&state.records[q.id];
     if(!(r&&Number(r.review_count)>0))continue;
     history=true;
     if(Number(r.review_count)>(eventCount.get(q.id)||0))truncated=true;
     const t=Number(r.last_answer);
     if(Number.isFinite(t)&&t>0){timed=true;if(t<day0)older=true;}
   }
   if(state&&state.skills)for(const [k,sk] of Object.entries(state.skills)){
     if(!(sk&&Number(sk.review_count)>0))continue;
     if(!(k===lemma||String(k).startsWith(lemma+'::')))continue;
     history=true;
     const t=Number(sk.last_answer);
     if(Number.isFinite(t)&&t>0){timed=true;if(t<day0)older=true;}
   }
   const today=!!(history&&timed&&!older&&!truncated);
   return {today,dirCard:today?best:null};
 }
 function representative(cards,records,H){
   const hist=cards.filter(q=>H.card(q));
   const list=(hist.length?hist:cards).slice();
   list.sort((a,b)=>{
     if(hist.length){
       const ar=records[a.id]||{},br=records[b.id]||{};
       const an=!!ar.needsReview,bn=!!br.needsReview;
       if(an!==bn)return an?-1:1;
       const ad=Number(ar.next_review),bd=Number(br.next_review);
       const af=Number.isFinite(ad),bf=Number.isFinite(bd);
       if(af!==bf)return af?-1:1;
       if(af&&ad!==bd)return ad-bd;
       const al=Number(ar.last_answer)||0,bl=Number(br.last_answer)||0;
       if(al!==bl)return bl-al;
     }
     const pa=idClass(a.id),pb=idClass(b.id);
     if(pa!==pb)return pa-pb;
     return String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
   });
   return list[0]||null;
 }
 function lemmaRepresentative(lem,cards,state,records,H,core,now){
   const groups=new Map();
   for(const q of cards||[]){
     const key=groupKeyOf(q);
     let g=groups.get(key);
     if(!g)groups.set(key,g={key,cards:[],dir:answerDir(core,q)});
     g.cards.push(q);
   }
   const built=[];
   for(const g of groups.values()){
     let earliest=null,needs=false,lastAnswer=null,any=false;
     for(const q of g.cards){
       if(!H.card(q))continue;
       any=true;
       const r=records[q.id]||{};
       if(r.needsReview)needs=true;
       const nr=Number(r.next_review);
       if(Number.isFinite(nr)&&(earliest==null||nr<earliest))earliest=nr;
       const la=Number(r.last_answer);
       if(Number.isFinite(la)&&(lastAnswer==null||la>lastAnswer))lastAnswer=la;
     }
     built.push({key:g.key,cards:g.cards,dir:g.dir,earliest,needs,lastAnswer,any});
   }
   if(!built.length)return null;
   const started=H.lemma(lem);
   const first=started?firstAnsweredToday(lem,cards,state,now):{today:false,dirCard:null};
   const firstDir=first.dirCard?answerDir(core,first.dirCard):'unknown';
   const buried=new Set();
   if(started&&first.today&&firstDir!=='unknown'){
     for(const g of built)if(!g.any&&g.dir!=='unknown'&&g.dir!==firstDir)buried.add(g.key);
   }
   const open=built.filter(g=>!buried.has(g.key));
   if(!open.length)return null;
   const byAge=(a,b)=>{
     const af=Number.isFinite(a.lastAnswer),bf=Number.isFinite(b.lastAnswer);
     if(af!==bf)return af?-1:1;
     if(af&&a.lastAnswer!==b.lastAnswer)return a.lastAnswer-b.lastAnswer;
     return a.key<b.key?-1:a.key>b.key?1:0;
   };
   const needs=open.filter(g=>g.needs);
   let chosen;
   if(needs.length){needs.sort(byAge);chosen=needs[0];}
   else{
     const due=open.filter(g=>g.earliest!=null&&g.earliest<=now);
     if(due.length){due.sort((a,b)=>a.earliest-b.earliest||byAge(a,b));chosen=due[0];}
     else{
       // Unanswered eligible groups count as answered longer ago than every answered group.
       const byKey=(a,b)=>a.key<b.key?-1:a.key>b.key?1:0;
       const unanswered=open.filter(g=>!g.any).sort(byKey);
       if(unanswered.length)chosen=unanswered[0];
       else{open.sort(byAge);chosen=open[0];}
     }
   }
   return representative(chosen.cards,records,H);
 }
 function lemmaInDebt(cards,records,H,now){
   const groups=new Map();
   for(const q of cards||[]){
     const key=groupKeyOf(q);
     let g=groups.get(key);
     if(!g)groups.set(key,g=[]);
     g.push(q);
   }
   for(const list of groups.values()){
     let earliest=null,needs=false,any=false;
     for(const q of list){
       if(!H.card(q))continue;
       any=true;
       const r=records[q.id]||{};
       if(r.needsReview)needs=true;
       const nr=Number(r.next_review);
       if(Number.isFinite(nr)&&(earliest==null||nr<earliest))earliest=nr;
     }
     if(any&&(needs||(earliest!=null&&earliest<=now)))return true;
   }
   return false;
 }
 function debtLemmas(pool,state,core,now){
   pool=(pool||[]).filter(q=>q&&q.wordRole!=='used');
   const H=historyIndex(state||{},pool,core);
   const records=(state&&state.records)||{};
   const byLemma=new Map();
   for(const q of pool){const lem=H.lk(q);let list=byLemma.get(lem);if(!list)byLemma.set(lem,list=[]);list.push(q);}
   const out=[];
   for(const [lem,cards] of byLemma)if(lemmaInDebt(cards,records,H,now))out.push(lem);
   out.sort();
   return out;
 }
 function planPortion(pool,state,cfg,core,now,opts){
   opts=opts||{};
   pool=(pool||[]).filter(q=>q&&q.wordRole!=='used');
   const H=historyIndex(state||{},pool,core),lk=H.lk;
   const answerBudget=cfg&&cfg.vocab&&Number(cfg.vocab.answerBudget)||10;
   const sessionNewCap=cfg&&cfg.vocab&&Number(cfg.vocab.sessionNewCap)||2;
   const records=(state&&state.records)||{};
   const clean=!H.any();
   const rankOf=typeof opts.rank==='function'?opts.rank:null;
   const ordered=rankOf?pool.slice().sort((a,b)=>{
     const d=(Number(rankOf(a))||0)-(Number(rankOf(b))||0);
     if(d)return d;
     return String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
   }):pool.slice();
   const byLemma=new Map();
   for(const q of pool){const lem=lk(q);let list=byLemma.get(lem);if(!list)byLemma.set(lem,list=[]);list.push(q);}
   const lemmaOrder=[],seenLem=new Set();
   for(const q of ordered){const lem=lk(q);if(seenLem.has(lem))continue;seenLem.add(lem);lemmaOrder.push(lem);}
   const newCards=[],reviewReps=[];
   for(const lem of lemmaOrder){
     const rep=lemmaRepresentative(lem,byLemma.get(lem)||[],state||{},records,H,core,now);
     if(!rep)continue;
     if(H.lemma(lem))reviewReps.push(rep);else newCards.push(rep);
   }
   const nNew=clean?Math.min(3,newCards.length):Math.min(sessionNewCap,newCards.length);
   const picked=newCards.slice(0,nNew);
   const newLemmas=picked.map(q=>lk(q));
   const newSet=new Set(newLemmas);
   const otherCap=Math.max(0,answerBudget-3*nNew);
   const limit=nNew+otherCap;
   const pickedIds=new Set(picked.map(q=>q.id));
   const bucket=picked.concat(reviewReps.filter(q=>!pickedIds.has(q.id)));
   const retr=typeof opts.retrievability==='function'?opts.retrievability:()=>null;
   const dueStamp=q=>{
     const r=records[q.id]||{};
     const nr=Number(r.next_review);
     if(Number.isFinite(nr))return nr;
     const d=Number(r.dueAt);
     return Number.isFinite(d)?d:null;
   };
   // NeedsReview, then due. Inside each, low retrievability first.
   // A missing R is not a measured probability, so those cards sort by due and id on their own.
   const orderWithin=(a,b)=>{
     const ra=retr(a),rb=retr(b);
     const an=ra==null||Number.isNaN(ra),bn=rb==null||Number.isNaN(rb);
     if(an!==bn)return an?1:-1;
     if(!an&&ra!==rb)return ra-rb;
     const ad=dueStamp(a),bd=dueStamp(b);
     const af=ad!=null,bf=bd!=null;
     if(af!==bf)return af?-1:1;
     if(af&&ad!==bd)return ad-bd;
     return String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
   };
   let out=[];
   if(core&&typeof core.chooseShortSession==='function'){
     out=core.chooseShortSession(bucket,records,now,limit,{newLimit:nNew,isNew:q=>pickedIds.has(q.id),orderWithin});
   }else{
     const others=reviewReps.filter(q=>!newSet.has(lk(q)));
     const errors=others.filter(q=>records[q.id]&&records[q.id].needsReview).sort(orderWithin);
     const due=others.filter(q=>records[q.id]&&!records[q.id].needsReview&&core.isDue(records[q.id],now)).sort(orderWithin);
     const learning=others.filter(q=>{const r=records[q.id];return r&&!r.needsReview&&!core.isDue(r,now)&&(Number(r.streak)||0)<2;});
     const review=[];const reviewSeen=new Set();
     for(const q of [...errors,...due]){const k=lk(q);if(reviewSeen.has(k))continue;reviewSeen.add(k);review.push(q);}
     const used=new Set();
     const take=(list,cap)=>{let n=0;for(const q of list){if(out.length>=limit||n>=cap)break;const k=lk(q);if(used.has(k))continue;used.add(k);out.push(q);n++;}};
     take(review,Math.max(0,limit-nNew));
     take(picked,nNew);
     take(learning,limit);
   }
   const review=[],learning=[];
   for(const q of out){
     if(newSet.has(lk(q)))continue;
     const r=records[q.id];
     if(r&&(r.needsReview||(core.isDue&&core.isDue(r,now))))review.push(q);
     else learning.push(q);
   }
   out=review.concat(picked,learning);
   const usedLem=new Set(out.map(q=>lk(q)));
   let room=Math.max(0,otherCap-out.filter(q=>!newSet.has(lk(q))).length);
   if(room>0&&out.length<limit){
     const byRetr=(a,b)=>{
       const ra=retr(a),rb=retr(b);
       const an=ra==null||Number.isNaN(ra),bn=rb==null||Number.isNaN(rb);
       if(an!==bn)return an?1:-1;
       if(!an&&ra!==rb)return ra-rb;
       const pa=idClass(a.id),pb=idClass(b.id);
       if(pa!==pb)return pa-pb;
       return String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
     };
     // Filler is a card with its own answer history. A sibling's history does not qualify.
     // Several history cards of one lemma: keep the least retrievable.
     const best=new Map();
     for(const q of pool){
       const lem=lk(q);
       if(usedLem.has(lem)||newSet.has(lem)||!H.card(q))continue;
       const prev=best.get(lem);
       if(!prev||byRetr(q,prev)<0)best.set(lem,q);
     }
     const filler=[...best.values()].sort(byRetr);
     for(const q of filler){if(room<=0||out.length>=limit)break;out.push(q);room--;}
   }
   const baseLen=out.length;
   const budget=Math.min(answerBudget,baseLen+2*nNew);
   const debt=debtLemmas(pool,state,core,now).length;
   return {ids:out.map(q=>q.id),plan:{budget,nNew,baseLen,newLemmas,debt}};
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
 /* PR-7 D3: two cards of one lemma must not stand next to each other after the shown card (the answer would be
    on screen one card earlier). Swap later cards while the return gap holds; if no swap helps, keep the order. */
 function adjacentPairs(list,from,lemOf){
   let n=0;
   for(let i=Math.max(1,from+1);i<list.length;i++)if(lemOf(list[i])===lemOf(list[i-1]))n++;
   return n;
 }
 function returnGapOk(list,position,cardId,lem,lemOf,minGap){
   let seen=0;
   for(let i=position+1;i<list.length;i++){if(list[i]===cardId)return seen>=minGap;if(lemOf(list[i])!==lem)seen++;}
   return true;
 }
 /* Gaps of every repeat that ends after `from`: for each card, the number of other-lemma cards between each pair of
    its neighbouring shows (in show order). A swap never moves two shows of one card past each other. */
 function repeatGaps(list,from,lemOf){
   const gaps=new Map(),last=new Map();
   for(let i=0;i<list.length;i++){
     const id=list[i];
     if(last.has(id)&&i>from){
       const lem=lemOf(id);let n=0;
       for(let k=last.get(id)+1;k<i;k++)if(lemOf(list[k])!==lem)n++;
       if(!gaps.has(id))gaps.set(id,[]);
       gaps.get(id).push(n);
     }
     last.set(id,i);
   }
   return gaps;
 }
 // PR-7 GPT P1-1: a swap must not bring any already scheduled repeat closer than minGap (or than it already was).
 function repeatGapsKept(before,after,minGap){
   for(const [id,list] of before){
     const now=after.get(id)||[];
     for(let k=0;k<list.length;k++)if((now[k]==null?Infinity:now[k])<Math.min(list[k],minGap))return false;
   }
   return true;
 }
 function unstick(list,from,lemOf,ok){
   let out=list.slice(),pairs=adjacentPairs(out,from,lemOf),guard=0;
   while(pairs&&guard++<list.length*list.length){
     let best=null;
     for(let i=from+1;i<out.length&&!best;i++)for(let j=i+1;j<out.length;j++){
       if(lemOf(out[i])===lemOf(out[j]))continue;
       const t=out.slice();t[i]=out[j];t[j]=out[i];
       const n=adjacentPairs(t,from,lemOf);
       if(n<pairs&&ok(t)){best=t;pairs=n;break;}
     }
     if(!best)break;
     out=best;
   }
   return out;
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
   // PR-7 D3: a pause card first avoids the lemma of the card it would follow; the second pass is the old fallback.
   for(const apart of [true,false]){
     for(const item of pool){
       if(otherCount(seq,lem,lemOf)>=minGap)break;
       if(!item||item.id===cardId||item.wordRole==='used'||inQ.has(item.id))continue;
       const il=lemmaKey(core,item);
       if(il===lem)continue;
       if(apart&&il===lemOf(seq.length?seq[seq.length-1]:queue[position]))continue;
       if(!allowed.has(il)&&!lemmaHasHistory(state,pool,core,il))continue;
       if(budget&&queue.length+added+1>budget)break;
       seq.push(item.id);added++;inQ.add(item.id);
     }
   }
   if(otherCount(seq,lem,lemOf)<minGap)return {queue:original,scheduled:false};
   if(budget&&queue.length+added+1>budget)return {queue:original,scheduled:false};
   let seen=0,at=seq.length;
   for(let i=0;i<seq.length;i++){if(lemOf(seq[i])!==lem)seen++;if(seen>=minGap){at=i+1;break;}}
   const placed=queue.slice(0,position+1).concat(seq.slice(0,at),[cardId],seq.slice(at));
   const gaps0=repeatGaps(placed,position,lemOf);
   const next=unstick(placed,position,lemOf,t=>returnGapOk(t,position,cardId,lem,lemOf,minGap)&&repeatGapsKept(gaps0,repeatGaps(t,position,lemOf),minGap));
   // No swap helps (too few lemmas in the portion): put one more pause card between the pair, if the budget allows.
   for(let i=position+1,extra=0;i<next.length&&extra<3;i++){
     if(lemOf(next[i])!==lemOf(next[i-1]))continue;
     const around=[lemOf(next[i-1]),lemOf(next[i])];
     const item=pool.find(it=>it&&it.id!==cardId&&it.wordRole!=='used'&&!next.includes(it.id)&&!around.includes(lemmaKey(core,it))&&lemmaKey(core,it)!==lem&&(allowed.has(lemmaKey(core,it))||lemmaHasHistory(state,pool,core,lemmaKey(core,it))));
     if(!item||(budget&&next.length+1>budget))break;
     next.splice(i,0,item.id);extra++;
   }
   if(budget&&next.length>budget)return {queue:original,scheduled:false};
   if(next.filter(id=>id===cardId).length>appearCap)return {queue:original,scheduled:false};
   const shown=new Set();
   for(let i=0;i<=position&&i<next.length;i++)shown.add(lemOf(next[i]));
   const cap=budget||next.length;
   for(const lem of plan.newLemmas||[]){
     if(!lem||shown.has(lem))continue;
     let at=-1;
     for(let i=0;i<next.length&&i<cap;i++)if(lemOf(next[i])===lem){at=i;break;}
     if(at<0)return {queue:original,scheduled:false};
   }
   return {queue:next,scheduled:true};
 }
 function retryFromAnswer(event){
   if(!event)return null;
   return {cardId:event.card_id,sessionId:String(event.session_id),presentation:Number(event.presentation),kind:event.idk?'idk':'wrong',typed:Array.isArray(event.answers)?event.answers.slice():[],answerEventId:event.id||null};
 }
 /* PR-7 GPT P1-2 (general): the show (session_id + presentation + card_id) already has its first answer, from this
    tab or from another one (applyRemote). Whatever is pressed now (Проверить right/wrong, Не знаю) is not a new
    answer: nothing is counted, no event is written, no new retry is made. The outcome follows the first answer:
    - right / near-miss / assisted (hint or rule) — the show is done: alreadyHandled, retry null;
    - wrong / idk with a retry_close already written — done as well;
    - wrong / idk still open — the same retry the first answer made (retryFromAnswer of that event), never a new kind.
    The return in this portion is the one the first answer decided (scheduleReturn with the same inputs) — only if the
    queue here does not already hold it. */
 function settleExisting(ctx,existing){
   const state=ctx.state,records=ctx.records||state.records,q=ctx.q;
   const sessionId=String(ctx.sessionId),presentation=Number(ctx.presentation);
   let queue=(ctx.queue||[]).slice(),scheduled=queue.slice(ctx.position+1).includes(q.id);
   const firstWasGood=!!existing.correct&&!existing.hinted&&!existing.idk;
   if(!firstWasGood&&!scheduled){
     const pool=ctx.pool||[],core=ctx.core;
     const sched=scheduleReturn({queue,position:ctx.position,cardId:q.id,pool,plan:ctx.plan,sitting:ctx.sitting,state,core,budget:ctx.budget,minGap:ctx.minGap||2,appearCap:ctx.appearCap||3,lemma:lemmaKey(core,q)});
     queue=sched.queue;scheduled=sched.scheduled;
   }
   const needsRetype=!existing.correct||!!existing.idk;
   const closed=findEvent(state.events,'retry_close',sessionId,presentation,q.id);
   const retry=needsRetype&&!closed?retryFromAnswer(existing):null;
   return {duplicate:true,alreadyHandled:!retry,event:existing,record:records[q.id],queue,scheduled,retry};
 }
 function commitFirst(ctx){
   const state=ctx.state,records=ctx.records||state.records,q=ctx.q;
   const sessionId=String(ctx.sessionId),presentation=Number(ctx.presentation),kind=ctx.kind;
   const existing=findEvent(state.events,'answer',sessionId,presentation,q.id);
   if(existing)return settleExisting(ctx,existing);
   const core=ctx.core,pool=ctx.pool||[],sitting=ctx.sitting;
   const lem=lemmaKey(core,q);
   if(sitting&&!sitting.newLemmas.includes(lem)&&!lemmaHasHistory(state,pool,core,lem))sitting.newLemmas.push(lem);
   const hintedFlag=kind==='idk'?true:!!ctx.hinted;
   const correctFlag=kind==='good'||kind==='assisted';
   const now=ctx.now;
   const rec=core.updateRecord(records[q.id],correctFlag,hintedFlag,now,{responseTime:ctx.elapsed,recall:ctx.recall!==false,rating:ctx.rating});
   records[q.id]=rec;
   const event={id:'ans:'+sessionId+':'+presentation+':'+q.id,at:now,type:'answer',session_id:sessionId,presentation,card_id:q.id,answers:Array.isArray(ctx.answers)?ctx.answers.slice():[],correct:correctFlag,hinted:hintedFlag,peek:hintedFlag?1:0,first_try_correct:kind==='good'?1:0,idk:kind==='idk'?1:0,rating:ctx.rating,response_time_ms:ctx.elapsed,response_time:ctx.elapsed,latency_ms:ctx.elapsed,recall:ctx.recall!==false};
   if(ctx.analytics&&typeof ctx.analytics==='object'){
     const reserved={id:1,at:1,type:1,session_id:1,presentation:1,card_id:1,answers:1,correct:1,hinted:1,peek:1,first_try_correct:1,idk:1,rating:1,response_time_ms:1,response_time:1,latency_ms:1,recall:1,skills:1,near_miss:1,typed:1,expected:1};
     for(const key of Object.keys(ctx.analytics))if(!reserved[key])event[key]=ctx.analytics[key];
   }
   if(correctFlag&&ctx.result&&ctx.result.nearMiss){
     event.near_miss=1;
     event.typed=String(ctx.result.nearMiss.typed??'');
     event.expected=String(ctx.result.nearMiss.expected??'');
   }
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
     else if(e.type==='answer'&&e.correct&&!e.idk&&(e.hinted||e.peek||e.rule_peek))assisted.add(key);
     else if(e.type==='answer'&&e.correct&&!e.hinted&&!e.idk&&!e.rule_peek&&!e.peek)unaided.add(key);
   }
   for(const key of assisted)unaided.delete(key);
   let u=unaided.size,a=assisted.size;
   if(sitting.legacy){u+=Number(sitting.legacy.sessionCorrect)||0;a+=Number(sitting.legacy.sessionAssisted)||0;}
   return {unaided:u,assisted:a,closed:u+a};
 }
 function eventToken(e){
   if(!e)return 0;
   if(e.type==='retry_close')return 3;
   if(e.type!=='answer')return 0;
   if(e.idk||e.correct===false||e.hinted||e.peek||e.rule_peek)return 3;
   if(e.near_miss)return 2;
   if(e.correct)return 1;
   return 0;
 }
 function tokenOf(rank){
   if(rank>=3)return 'с подсказкой';
   if(rank===2)return 'почти точно';
   if(rank===1)return 'самостоятельно';
   return 'Без ответа';
 }
 function wordLine(state,sitting,card){
   sitting=sitting||emptySitting(0);
   const cardId=card&&(card.cardId||card.id);
   const lemma=card&&card.lemma;
   let rank=0;
   if(sitting.legacy&&sitting.legacy.openIdk&&sitting.legacy.openIdk.cardId===cardId)rank=3;
   const events=((state&&state.events)||[]).filter(e=>e&&e.card_id===cardId&&inSitting(sitting,e));
   for(const e of events){const t=eventToken(e);if(t>rank)rank=t;}
   if(rank)return tokenOf(rank);
   if((sitting.shown||[]).includes(lemma))return 'Без ответа';
   return 'Без ответа';
 }
 function pairOf(q,core){
   if(!q)return {kk:'',ru:''};
   const stim=String(q.stimulus||'');
   const ans=String((q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'');
   const lang=core&&typeof core.answerLang==='function'?core.answerLang(q,0):'';
   if(lang==='kk')return {kk:ans,ru:stim};
   return {kk:stim,ru:ans};
 }
 function whenPhrase(rep,records,now){
   if(!rep)return '';
   const r=(records&&records[rep.id])||{};
   if(r.needsReview)return 'скоро';
   const nr=Number(r.next_review);
   if(!Number.isFinite(nr))return '';
   const a=new Date(nr),b=new Date(Number(now)||0);
   if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return '';
   a.setHours(0,0,0,0);b.setHours(0,0,0,0);
   const days=Math.round((a.getTime()-b.getTime())/86400000);
   if(days<=0)return 'сегодня';
   if(days===1)return 'завтра';
   const n=Math.abs(days),x=n%100,y=n%10;
   const w=x>10&&x<20?'дней':y===1?'день':y>=2&&y<=4?'дня':'дней';
   return 'через '+n+' '+w;
 }
 function summaryRows(state,sitting,pool,core,now){
   sitting=sitting||emptySitting(0);
   const tally=recount(state,sitting);
   const records=(state&&state.records)||{};
   const H=historyIndex(state||{},pool||[],core);
   const byLemma=new Map();
   for(const q of pool||[]){const lem=lemmaKey(core,q);let list=byLemma.get(lem);if(!list)byLemma.set(lem,list=[]);list.push(q);}
   const fresh=new Set(sitting.newLemmas||[]);
   const rows=[];
   const seen=new Set();
   for(const lemma of sitting.shown||[]){
     if(!lemma||seen.has(lemma))continue;
     seen.add(lemma);
     const cards=byLemma.get(lemma)||[];
     const ids=new Set(cards.map(q=>q.id));
     let rank=0;
     const open=sitting.legacy&&sitting.legacy.openIdk;
     if(open&&(open.lemma===lemma||ids.has(open.cardId)))rank=3;
     for(const e of (state&&state.events)||[]){
       if(!e||!inSitting(sitting,e)||!ids.has(e.card_id))continue;
       const t=eventToken(e);if(t>rank)rank=t;
     }
     const token=rank?tokenOf(rank):'Без ответа';
     const rep=cards.length?lemmaRepresentative(lemma,cards,state||{},records,H,core,now):null;
     const face=rep||cards[0]||null;
     const pair=pairOf(face,core);
     rows.push({lemma,kk:pair.kk,ru:pair.ru,label:token==='самостоятельно'?'вспомнила сама':token,fresh:fresh.has(lemma),when:whenPhrase(rep,records,now)});
   }
   return {unaided:tally.unaided,assisted:tally.assisted,rows};
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
 const api={TEXT,clone,emptySitting,emptyPlan,isMustTrainer,isSavedMust,lemmaKey,mustCounterText,idkNote,statusNote,learnerTextOk,recordsMiss,nearMissFeedbackHtml,findEvent,cardHasHistory,lemmaHasHistory,poolHasAnswerHistory,debtLemmas,planPortion,enforceGap,scheduleReturn,commitFirst,commitRetype,noteShown,noteRecent,recount,wordLine,summaryRows,portionDone,snapshot,restoreSaved,importPlan,retryFromAnswer};
 if(node)module.exports=api;else root.VocabMust=api;
})(typeof window!=='undefined'?window:globalThis);
