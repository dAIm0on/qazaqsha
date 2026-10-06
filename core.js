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
  const NUM_U={нөл:0,бір:1,екі:2,үш:3,төрт:4,бес:5,алты:6,жеті:7,сегіз:8,тоғыз:9};
  const NUM_T={он:10,жиырма:20,отыз:30,қырық:40,елу:50,алпыс:60,жетпіс:70,сексен:80,тоқсан:90};
  function numberValue(s){
    const t=normalize(s).split(/\s+/).filter(Boolean);
    if(!t.length)return null;
    let i=0;
    function upToHundreds(){
      let n=0;
      if(t[i]==='жүз'){i++;n=100;}
      else if(NUM_U[t[i]]!=null&&t[i+1]==='жүз'){n=NUM_U[t[i]]*100;i+=2;}
      if(NUM_T[t[i]]!=null){n+=NUM_T[t[i]];i++;}
      if(NUM_U[t[i]]!=null){n+=NUM_U[t[i]];i++;}
      return n;
    }
    let total=0;
    const my=t.indexOf('мың');
    if(my>=0){
      const left=t.slice(0,my);
      const save=t.slice();
      t.length=0;t.push(...left);
      const thou=left.length?upToHundreds():1;
      t.length=0;t.push(...save);
      i=my+1;
      total=thou*1000+upToHundreds();
    }else total=upToHundreds();
    if(i!==t.length&&t.some(w=>NUM_U[w]==null&&NUM_T[w]==null&&w!=='жүз'&&w!=='мың'))return null;
    return Number.isFinite(total)?total:null;
  }
  // r7 2b QA m4: a Russian answer to a number card may be the digit or the Russian word (нөл → «0» или «ноль»).
  const RU_NUM={ноль:0,нуль:0,один:1,одна:1,одно:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,
    одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,
    двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,
    сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
  function ruNumberValue(s){
    const t=normalize(s).replace(/ё/g,'е').split(/\s+/).filter(Boolean);if(!t.length)return null;
    let total=0,cur=0;
    for(const w of t){
      if(/^(тысяча|тысячи|тысяч)$/.test(w)){total+=(cur||1)*1000;cur=0;continue;}
      if(RU_NUM[w]==null)return null;cur+=RU_NUM[w];
    }
    return total+cur;
  }
  function digitWordMatch(expected,actual){
    const e=normalize(expected).replace(/\s+/g,''),a=normalize(actual).replace(/\s+/g,'');
    if(/^\d+$/.test(e)){const v=ruNumberValue(actual);return v!=null&&v===Number(e);}
    if(/^\d+$/.test(a)){const v=ruNumberValue(expected);return v!=null&&v===Number(a);}
    return false;
  }
  // r7 2b QA m5/m6: Russian glosses — «любить / целовать» is one reference of two accepted meanings,
  // «я читал(а)» stands for «я читал» and «я читала». Kazakh answers are never split or expanded.
  const KK_LETTER=/[әғқңөұүһі]/i;
  function glossVariants(a){
    const s=String(a||'');
    if(KK_LETTER.test(s)||!/[а-яё]/i.test(s))return [s];
    const out=new Set(),pron=(/^(я|ты|он\(а\)|он|она|оно|мы|вы|они)\s+/i.exec(s.trim())||[])[1]||'';
    const pieces=s.split(/\s*[\/;]\s*/);
    // a reference «я читал(а) / прочитал(а)» means «я читал(а)» or «я прочитал(а)»: later parts inherit the pronoun.
    const own=x=>/^(я|ты|он|она|оно|мы|вы|они)[\s(]/i.test(x.trim());
    for(const part of [s,...pieces.map(x=>pron&&!own(x)?pron+' '+x:x)]){
      if(!part.trim())continue;
      const forms=/\([а-яё]{1,3}\)/i.test(part)?[part,part.replace(/\(([а-яё]{1,3})\)/gi,''),part.replace(/\(([а-яё]{1,3})\)/gi,'$1')]:[part];
      for(const f of forms)out.add(f);
    }
    return [...out];
  }
  function glossMatch(answers,actual,kind){
    if(kind&&kind!=='text')return false;
    const ok=new Set((answers||[]).flatMap(glossVariants).map(x=>normalize(x)));
    const a=normalize(actual);if(!a)return false;
    if(ok.has(a))return true;
    const parts=a.split(/\s*[\/,;]\s*/).filter(Boolean);
    return parts.length>1&&parts.every(p=>ok.has(p));
  }
  function numberMatch(expected,actual,kind){
    if(normalize(expected,kind)===normalize(actual,kind))return true;
    const ev=numberValue(actual),ex=numberValue(expected);
    return ev!=null&&ex!=null&&ev===ex;
  }
  function evaluate(q,answers){
    const kinds=typeof module!=='undefined'&&module.exports?require('./response-kinds.js'):root.ResponseKinds;
    if(kinds&&kinds.isSupportKind(q.kind))return kinds.evaluate(q,answers);
    if(q.kind==='multi'){
      const actual=new Set((answers||[]).map(x=>normalize(x)));
      const expected=new Set(q.correct.map(x=>normalize(x)));
      const correct=actual.size===expected.size&&[...expected].every(x=>actual.has(x));
      return {correct,parts:q.options.map(x=>actual.has(normalize(x))===expected.has(normalize(x)))};
    }
    const phone=!!(q.ruleIds||[]).includes('phone-groups')||(q.skillBindings||[]).some(b=>b.item_id==='rule:phone-groups');
    const parts=q.fields.map((f,i)=>{
      if(f.kind==='set-text')return sameSet(tokens(answers[i]),expectedTokens(f));
      if(f.answers.some(a=>normalize(a,f.kind)===normalize(answers[i],f.kind)))return true;
      if((phone||f.kind==='number-text'||q.topic==='numbers')&&f.answers.some(a=>numberMatch(a,answers[i],f.kind)))return true;
      if((!f.kind||f.kind==='text'||f.kind==='number-text')&&f.answers.some(a=>digitWordMatch(a,answers[i])))return true;
      if(glossMatch(f.answers,answers[i],f.kind||'text'))return true;
      return false;
    });
    return {correct:parts.every(Boolean),parts};
  }
  const DAY=86400000;
  function migrateRecord(previous,now=Date.now()){
    return scheduler.migrate(previous,now);
  }
  function isDue(r,now=Date.now()){return scheduler.due(r,now);}
  function isDay0Learning(record,now=Date.now()){
    const r=record||{};
    if((r.recall_review_successes||0)>=1)return false;
    if(Number(r.last_successful_review)>0&&now-r.last_successful_review>=config.schedule.minSpacedMs)return false;
    return true;
  }
  function pauseReady(record,now=Date.now()){
    if(!record||isDay0Learning(record,now))return false;
    const days=record.fsrs&&Number(record.fsrs.scheduled_days);
    if(!(days>=(config.schedule.pauseIntervalDays||21)))return false;
    const dueAt=Number(record.next_review||record.dueAt||0);
    return dueAt>0&&dueAt<=now+DAY;
  }
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
  function letterBreakdownOnly(q){
    const pol=typeof module!=='undefined'&&module.exports?require('./memory-policy.js'):root.MemoryPolicy;
    return !!(pol&&pol.isLetterBreakdown&&pol.isLetterBreakdown(q));
  }
  function lemmaKey(q){
    if(!q)return 'id:';
    const fromBind=(q.skillBindings||[]).map(b=>b&&b.item_id).find(id=>String(id||'').startsWith('word:'));
    if(fromBind)return fromBind;
    if(q.vocabIds&&q.vocabIds.length)return q.vocabIds[0];
    const id=String(q.id||'');
    const base=id.replace(/-kk-rev$|-ru-rev$|-kk$|-ru$|-rev$/,'');
    if(base&&base!==id)return 'cardbase:'+base;
    if(q.stimulus)return 'stim:'+normalize(q.stimulus);
    return 'id:'+id;
  }
  function dedupeByLemma(list){
    const seen=new Set(),out=[];
    for(const q of list||[]){
      const k=lemmaKey(q);
      if(seen.has(k))continue;
      seen.add(k);out.push(q);
    }
    return out;
  }
  function chooseShortSession(items,records,now=Date.now(),limit=config.session.size,opts={}){
    items=(items||[]).filter(q=>q&&!q.contextOnly&&(opts.allowUsed||q.wordRole!=='used')&&!String(q.id||'').startsWith('learn-compose-')&&!assembleOnly(q)&&!letterBreakdownOnly(q));
    const newLimit=Math.max(0,Number(config.session.newLimit)||0);
    const isNew=q=>{const r=records&&records[q.id];return !(r&&r.seen);};
    const errors=items.filter(q=>records[q.id]?.needsReview);
    const due=items.filter(q=>!records[q.id]?.needsReview&&isDue(records[q.id],now)).sort((a,b)=>(records[a.id].dueAt||0)-(records[b.id].dueAt||0));
    const fresh=items.filter(isNew);
    const learning=items.filter(q=>!isNew(q)&&!records[q.id]?.needsReview&&!isDue(records[q.id],now)&&(records[q.id]?.streak||0)<2);
    const review=dedupeByLemma([...errors,...due]);
    const news=dedupeByLemma(fresh);
    const learn=dedupeByLemma(learning);
    const reservedNew=Math.min(newLimit,limit,news.length);
    const reviewCap=Math.max(0,limit-reservedNew);
    const out=[],used=new Set();
    const take=(list,cap)=>{
      let n=0;
      for(const q of list){
        if(out.length>=limit||n>=cap)break;
        const k=lemmaKey(q);
        if(used.has(k))continue;
        used.add(k);out.push(q);n++;
      }
    };
    take(review,reviewCap);
    take(news,reservedNew);
    take(learn,limit);
    return out;
  }
  function scheduleRepeat(queue,index,id,streak,fillers=[],opts={}){
    const blinds=Number.isFinite(opts.sessionBlinds)?opts.sessionBlinds:streak;
    const appearCap=Number.isFinite(opts.lemmaAppearCap)?opts.lemmaAppearCap:(config.schedule.learningSessionBlinds||3);
    const appearCount=queue.filter(x=>x===id).length;
    if(appearCount>=appearCap){
      for(let i=queue.length-1;i>index;i--)if(queue[i]===id)queue.splice(i,1);
      return queue;
    }
    if(opts.learning){
      if(blinds>=(config.schedule.learningSessionBlinds||3)){
        for(let i=queue.length-1;i>index;i--)if(queue[i]===id)queue.splice(i,1);
        return queue;
      }
    }else if(opts.review){
      if(blinds>=1)return queue;
    }else if(streak>=config.schedule.cleanAnswersToConsolidate)return queue;
    const minGap=opts.learning?(config.schedule.learningIntervening||2):config.session.minIntervening;
    const future=queue.indexOf(id,index+1);
    if(future>=0&&new Set(queue.slice(index+1,future)).size>=minGap)return queue;
    for(let i=queue.length-1;i>index;i--)if(queue[i]===id)queue.splice(i,1);
    for(const filler of [...new Set(fillers)]){
      if(new Set(queue.slice(index+1)).size>=minGap)break;
      if(filler!==id&&!queue.slice(index+1).includes(filler))queue.push(filler);
    }
    if(new Set(queue.slice(index+1)).size>=minGap)
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
  function shareVocabAlts(questions){
    const toKk=q=>/на казахский|по-казахски|на казахском/i.test(q&&q.title||'');
    const short=a=>{const n=normalize(a);return n&&!/[.?!]/.test(n)&&n.split(/\s+/).length<=2?n:null;};
    const groups=new Map();
    for(const q of questions||[]){
      if(!q||q.kind!=='fields'||q.topic!=='vocab'||!toKk(q)||!q.fields||!q.fields[0])continue;
      const key=normalize(q.stimulus);
      if(!key||key.split(/\s+/).length>2)continue;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(q);
    }
    for(const qs of groups.values()){
      if(qs.length<2)continue;
      const alts=[];
      for(const q of qs)for(const a of q.fields[0].answers||[]){
        const n=short(a);if(!n)continue;
        if(!alts.some(x=>normalize(x)===n))alts.push(a);
      }
      const names=alts.map(normalize);
      if(alts.length<2)continue;
      if(names.includes('жоқ')&&names.includes('емес'))continue;
      for(const q of qs){
        const have=(q.fields[0].answers||[]).map(normalize);
        for(const a of alts)if(!have.includes(normalize(a)))q.fields[0].answers.push(a);
      }
    }
    return questions;
  }
  // r7 X minor: Russian count forms. forms = [1 / 21, 2–4 / 22–24, 5–20 / 0 / 25…]: ruPlural(4,['карточка','карточки','карточек']).
  function ruPlural(n,forms){const k=Math.abs(Math.trunc(Number(n)||0)),m10=k%10,m100=k%100;return forms[m10===1&&m100!==11?0:m10>=2&&m10<=4&&(m100<12||m100>14)?1:2];}
  function ruCount(n,forms){return n+' '+ruPlural(n,forms);}
  const api={ruPlural,ruCount,normalize,evaluate,migrateRecord,updateRecord,isDue,isDay0Learning,pauseReady,scheduleRepeat,chooseShortSession,lemmaKey,dedupeByLemma,spaceRecent,blockReviewQueue,numberParts,numberToKazakh,numberValue,numberMatch,tokens,DAY,shareVocabAlts};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrainerCore=api;
})(typeof window!=='undefined'?window:globalThis);
