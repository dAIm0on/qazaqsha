(function(root){
  'use strict';
  const scheduler=typeof module!=='undefined'&&module.exports?require('./scheduler.js'):root.ReviewScheduler;
  const config=typeof module!=='undefined'&&module.exports?require('./config.js'):root.TRAINER_CONFIG;
  function normalize(value,kind='text'){
    let s=String(value??'').normalize('NFC').toLocaleLowerCase('ru').trim();
    if(kind==='syllables')return s.replace(/[\s\u2010-\u2015/·.]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    if(kind==='number-text')return s.replace(/\s+/g,'');
    return s.replace(/[.!?,;:]+$/g,'').replace(/\s+/g,' ').trim();
  }
  function tokens(value){
    return [...new Set(normalize(value).split(/[\s,;/+]+/).filter(Boolean))];
  }
  function sameSet(a,b){
    const A=new Set(a),B=new Set(b);
    return A.size===B.size&&[...A].every(x=>B.has(x));
  }
  function expectedTokens(f){
    return [...new Set(f.answers.flatMap(a=>tokens(a)))];
  }
  function evaluate(q,answers){
    if(q.kind==='multi'){
      const actual=new Set((answers||[]).map(x=>normalize(x)));
      const expected=new Set(q.correct.map(x=>normalize(x)));
      const correct=actual.size===expected.size&&[...expected].every(x=>actual.has(x));
      return {correct,parts:q.options.map(x=>actual.has(normalize(x))===expected.has(normalize(x)))};
    }
    const parts=q.fields.map((f,i)=>f.kind==='set-text'?sameSet(tokens(answers[i]),expectedTokens(f)):f.answers.some(a=>normalize(a,f.kind)===normalize(answers[i],f.kind)));
    return {correct:parts.every(Boolean),parts};
  }
  const DAY=86400000;
  function migrateRecord(previous,now=Date.now()){
    return scheduler.migrate(previous,now);
  }
  function isDue(r,now=Date.now()){return scheduler.due(r,now);}
  function updateRecord(previous,correct,hinted,now=Date.now(),details={}){
    return scheduler.answer(previous,{at:now,correct,hinted,responseTime:details.responseTime,recall:!!details.recall,rating:details.rating});
  }
  const UNITS=['нөл','бір','екі','үш','төрт','бес','алты','жеті','сегіз','тоғыз'];
  const TENS=['','он','жиырма','отыз','қырық','елу','алпыс','жетпіс','сексен','тоқсан'];
  function numberParts(value){
    const n=Number(value);
    if(value===''||!Number.isInteger(n)||n<0||n>999999)return null;
    if(n===0)return [{value:0,word:UNITS[0]}];
    const parts=[];let rest=n;
    for(const [size,label] of [[1000,'мың'],[100,'жүз']]){
      const digit=Math.floor(rest/size);
      if(digit){
        const omitCount=digit===1&&(label==='жүз'||n===1000);
        parts.push({value:digit*size,word:(omitCount?'':numberToKazakh(digit)+' ')+label});
        rest%=size;
      }
    }
    const tens=Math.floor(rest/10);if(tens)parts.push({value:tens*10,word:TENS[tens]});
    if(rest%10)parts.push({value:rest%10,word:UNITS[rest%10]});
    return parts;
  }
  function numberToKazakh(value){const parts=numberParts(value);return parts?parts.map(p=>p.word).join(' '):null;}
  function assembleOnly(q){
    const pol=typeof module!=='undefined'&&module.exports?require('./memory-policy.js'):root.MemoryPolicy;
    return !!(pol&&pol.isAssembleOnlyCard(q));
  }
  function chooseShortSession(items,records,now=Date.now(),limit=config.session.size){
    items=(items||[]).filter(q=>q&&!q.contextOnly&&q.wordRole!=='used'&&!String(q.id||'').startsWith('learn-compose-')&&!assembleOnly(q));
    const errors=items.filter(q=>records[q.id]?.needsReview);
    const due=items.filter(q=>!records[q.id]?.needsReview&&isDue(records[q.id],now)).sort((a,b)=>records[a.id].dueAt-records[b.id].dueAt);
    const learning=items.filter(q=>!records[q.id]?.needsReview&&!isDue(records[q.id],now)&&(records[q.id]?.streak||0)<2);
    return [...errors,...due,...learning].slice(0,limit);
  }
  function scheduleRepeat(queue,index,id,streak,fillers=[]){
    if(streak>=config.schedule.cleanAnswersToConsolidate)return queue;
    const future=queue.indexOf(id,index+1);
    if(future>=0&&new Set(queue.slice(index+1,future)).size>=config.session.minIntervening)return queue;
    for(let i=queue.length-1;i>index;i--)if(queue[i]===id)queue.splice(i,1);
    for(const filler of [...new Set(fillers)]){
      if(new Set(queue.slice(index+1)).size>=config.session.minIntervening)break;
      if(filler!==id&&!queue.slice(index+1).includes(filler))queue.push(filler);
    }
    if(new Set(queue.slice(index+1)).size>=config.session.minIntervening)
      queue.splice(Math.min(index+1+config.session.preferredIntervening,queue.length),0,id);
    return queue;
  }
  function spaceRecent(items,recent=[]){
    const blocked=new Set(recent.slice(-config.session.minIntervening));
    const fresh=items.filter(q=>!blocked.has(q.id)),rest=items.filter(q=>blocked.has(q.id));
    // A new approach does not erase the gap: defer recent prompts if there are too few fillers.
    return fresh.length>=config.session.minIntervening?[...fresh,...rest]:fresh;
  }
  function blockReviewQueue(failedId,isolatedIds,fillers=[],min=config.session.minIntervening){
    const iso=[...new Set((isolatedIds||[]).filter(id=>id&&id!==failedId))].slice(0,4);
    const extra=(fillers||[]).filter(id=>id&&id!==failedId&&!iso.includes(id));
    while(iso.length<Math.min(4,Math.max(2,min))&&extra.length)iso.push(extra.shift());
    const out=iso.slice();
    if(failedId)out.push(failedId);
    if(out[0]===failedId&&out.length>1){out.shift();out.push(failedId);}
    return out;
  }
  const api={normalize,evaluate,migrateRecord,updateRecord,isDue,scheduleRepeat,chooseShortSession,spaceRecent,blockReviewQueue,numberParts,numberToKazakh,DAY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrainerCore=api;
})(typeof window!=='undefined'?window:globalThis);
