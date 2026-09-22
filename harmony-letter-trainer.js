(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HarmonyLetterTrainer=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  const BUCKETS=Object.freeze({
    CORE_HARD:Object.freeze(['А','О','Ы','Ұ','Қ','Ғ']),
    CORE_SOFT:Object.freeze(['Ә','Ө','І','Ү','Е','К','Г']),
    CONTEXT:Object.freeze(['И','У','Ю']),
    SECONDARY_HARD:Object.freeze(['Я']),
    LOAN_SOFT:Object.freeze(['Э']),
    NEUTRAL:Object.freeze(['Б','В','Д','Ж','З','Й','Л','М','Н','Ң','П','Р','С','Т','Ф','Х','Һ','Ц','Ч','Ш','Щ']),
    SIGNS:Object.freeze(['Ъ','Ь']),
    SPECIAL_LOAN:Object.freeze(['Ё'])
  });

  const BUCKET_LABELS=Object.freeze({
    CORE_HARD:'Твёрдый ряд',
    CORE_SOFT:'Мягкий ряд',
    CONTEXT:'Нужен контекст',
    SECONDARY_HARD:'Твёрдый ряд',
    LOAN_SOFT:'Мягкий ряд',
    NEUTRAL:'Не задаёт ряд',
    SIGNS:'Не задаёт ряд',
    SPECIAL_LOAN:'Особый случай'
  });

  const PAIRS=Object.freeze([
    {id:'A_AE',hard:'А',soft:'Ә',error_code:'HARMONY_PAIR_A_AE'},
    {id:'O_OE',hard:'О',soft:'Ө',error_code:'HARMONY_PAIR_O_OE'},
    {id:'Y_I',hard:'Ы',soft:'І',error_code:'HARMONY_PAIR_Y_I'},
    {id:'U_UE',hard:'Ұ',soft:'Ү',error_code:'HARMONY_PAIR_U_UE'},
    {id:'Q_K',hard:'Қ',soft:'К',error_code:'HARMONY_PAIR_Q_K'},
    {id:'GH_G',hard:'Ғ',soft:'Г',error_code:'HARMONY_PAIR_GH_G'}
  ]);

  const WORD_BANK=Object.freeze([
    {id:'word-qol',word:'қол',signal:'О',row:'HARD',note:'О → твёрдый ряд'},
    {id:'word-kol',word:'көл',signal:'Ө',row:'SOFT',note:'Ө → мягкий ряд'},
    {id:'word-un-hard',word:'ұн',signal:'Ұ',row:'HARD',note:'Ұ → твёрдый ряд'},
    {id:'word-un-soft',word:'үн',signal:'Ү',row:'SOFT',note:'Ү → мягкий ряд'},
    {id:'word-ort',word:'өрт',signal:'Ө',row:'SOFT',note:'Ө → мягкий ряд'},
    {id:'word-qar',word:'қар',signal:'А',row:'HARD',note:'А → твёрдый ряд'},
    {id:'word-duken',word:'дүкен',signal:'Е',row:'SOFT',note:'Правый сигнал Е → мягкий ряд'},
    {id:'word-adam',word:'адам',signal:'А',row:'HARD',note:'А → твёрдый ряд'},
    {id:'word-qyz',word:'қыз',signal:'Ы',row:'HARD',note:'Ы → твёрдый ряд'},
    {id:'word-ul',word:'ұл',signal:'Ұ',row:'HARD',note:'Ұ → твёрдый ряд'},
    {id:'word-su',word:'су',signal:'У',row:'HARD',note:'Только У → твёрдое слово по правилу курса'},
    {id:'word-tu',word:'ту',signal:'У',row:'HARD',note:'Только У → твёрдое слово по правилу курса'},
    {id:'word-soz',word:'сөз',signal:'Ө',row:'SOFT',note:'Ө → мягкий ряд'},
    {id:'word-qala',word:'қала',signal:'А',row:'HARD',note:'Последний А → твёрдый ряд'},
    {id:'word-koshe',word:'көше',signal:'Е',row:'SOFT',note:'Последний Е → мягкий ряд'},
    {id:'word-it',word:'ит',signal:'И',row:'SOFT',note:'Только И → мягкое; исключение отдельно: ми'},
    {id:'word-mi',word:'ми',signal:'И',row:'HARD',note:'ми — исключение курса: твёрдое'},
    {id:'word-muhit',word:'мұхит',signal:'Ұ',row:'HARD',note:'хит не даёт однозначного ряда → идём влево к Ұ'},
    {id:'word-zanger',word:'заңгер',signal:'Е',row:'SOFT',note:'Правый край гер → Е → мягкий ряд'},
    {id:'word-kitap',word:'кітап',signal:'А',row:'HARD',note:'Правый край тап → А → твёрдый ряд'},
    {id:'word-mugalim',word:'мұғалім',signal:'І',row:'SOFT',note:'Правый край лім → І → мягкий ряд'},
    {id:'word-issapar',word:'іссапар',signal:'А',row:'HARD',note:'Последний А → твёрдый ряд'},
    {id:'word-amankeldi',word:'Аманкелді',signal:'І',row:'SOFT',note:'Правый край ді → І → мягкий ряд'},
    {id:'word-uya',word:'ұя',signal:'Я',row:'HARD',note:'Я = Й+А → твёрдый учебный сигнал'},
    {id:'word-ayu',word:'аю',signal:'А',row:'HARD',note:'А задаёт твёрдый ряд; Ю смотрим в контексте'},
    {id:'word-suyu',word:'сүю',signal:'Ү',row:'SOFT',note:'Ү задаёт мягкий ряд; Ю смотрим в контексте'}
  ]);

  const ALL_LETTERS=Object.freeze(Object.values(BUCKETS).flat());

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function shuffled(rows,random=Math.random){
    const out=[...rows];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function bucketOf(letter){
    for(const [bucket,letters] of Object.entries(BUCKETS))if(letters.includes(letter))return bucket;
    return null;
  }
  function labelForLetter(letter){const bucket=bucketOf(letter);return bucket?BUCKET_LABELS[bucket]:null;}
  function coverage(){
    const unique=new Set(ALL_LETTERS);
    return {count:ALL_LETTERS.length,unique:unique.size,duplicates:ALL_LETTERS.filter((x,i,a)=>a.indexOf(x)!==i),letters:[...unique]};
  }

  function pairItems(random=Math.random){
    const rows=[];
    for(const pair of PAIRS){
      rows.push({id:'pair-'+pair.id+'-hs',type:'choice',stage:1,prompt:pair.hard+' → ?',focus:pair.hard,correct:pair.soft,options:[pair.soft,...PAIRS.filter(p=>p.id!==pair.id).map(p=>p.soft).slice(0,2)],error_code:pair.error_code,feedback:pair.hard+' ↔ '+pair.soft});
      rows.push({id:'pair-'+pair.id+'-sh',type:'choice',stage:1,prompt:pair.soft+' → ?',focus:pair.soft,correct:pair.hard,options:[pair.hard,...PAIRS.filter(p=>p.id!==pair.id).map(p=>p.hard).slice(0,2)],error_code:pair.error_code,feedback:pair.hard+' ↔ '+pair.soft});
    }
    return shuffled(rows.map(row=>({...row,options:shuffled(row.options,random)})),random);
  }

  function classifyItems(random=Math.random){
    const rows=[];
    for(const letter of ALL_LETTERS){
      const bucket=bucketOf(letter);
      if(bucket==='SPECIAL_LOAN'){
        rows.push({id:'class-'+letter,type:'info',stage:2,letter,scored:false,prompt:letter,feedback:'Ё — заимствованный особый случай. Не учим формулу «всегда твёрдая».'});
        continue;
      }
      rows.push({
        id:'class-'+letter,type:'choice',stage:2,letter,prompt:letter,correct:BUCKET_LABELS[bucket],
        options:['Твёрдый ряд','Мягкий ряд','Не задаёт ряд','Нужен контекст'],
        error_code:bucket==='CONTEXT'?'HARMONY_'+letter+'_CONTEXT':bucket==='NEUTRAL'||bucket==='SIGNS'?'HARMONY_NEUTRAL_AS_SIGNAL':'HARMONY_CLASS_HARD_SOFT',
        feedback:bucket==='CONTEXT'?letter+' — сам по себе не решает: нужен контекст слова.':letter+' → '+BUCKET_LABELS[bucket]
      });
    }
    return shuffled(rows,random);
  }

  function recallItems(random=Math.random){
    const neutral=['М','Н','Л','Р','Й','Ң','Ш'];
    const hard=BUCKETS.CORE_HARD,soft=BUCKETS.CORE_SOFT,context=BUCKETS.CONTEXT;
    return [
      {id:'recall-soft',type:'recall',stage:3,prompt:'Выбери ВСЕ мягкие сигналы',correct:[...soft],options:shuffled([...soft,...hard.slice(0,4),...neutral.slice(0,3),...context],random),error_code:'HARMONY_CLASS_HARD_SOFT',feedback:'Мягкие: '+soft.join(' ')},
      {id:'recall-hard',type:'recall',stage:3,prompt:'Выбери ВСЕ твёрдые сигналы',correct:[...hard],options:shuffled([...hard,...soft.slice(0,5),...neutral.slice(0,3),...context],random),error_code:'HARMONY_CLASS_HARD_SOFT',feedback:'Твёрдые: '+hard.join(' ')},
      {id:'recall-context',type:'recall',stage:3,prompt:'Каким буквам нужен контекст?',correct:[...context],options:shuffled([...context,'А','Ә','М','Й','К','Қ','Е'],random),error_code:'HARMONY_IUYU_CONTEXT',feedback:'Контекст: И У Ю'},
      {id:'recall-pairs',type:'pairs',stage:3,prompt:'Собери пары',pairs:PAIRS.map(p=>[p.hard,p.soft]),correct:PAIRS.map(p=>p.hard+':'+p.soft),error_code:'HARMONY_PAIR_RECALL',feedback:'А–Ә · О–Ө · Ы–І · Ұ–Ү · Қ–К · Ғ–Г'}
    ];
  }

  function wordItems(random=Math.random){
    const required=['word-kitap','word-mugalim','word-zanger','word-muhit','word-it','word-mi','word-su','word-suyu'];
    const extras=WORD_BANK.filter(w=>!required.includes(w.id));
    const chosen=[...required.map(id=>WORD_BANK.find(w=>w.id===id)),...shuffled(extras,random).slice(0,4)];
    const rows=[];
    for(const w of chosen){
      rows.push({id:w.id+'-signal',type:'signal',stage:4,word:w.word,prompt:'Какая буква справа решает ряд?',correct:w.signal,error_code:'HARMONY_LAST_RELEVANT_VOWEL',feedback:w.note});
      rows.push({id:w.id+'-row',type:'choice',stage:4,word:w.word,prompt:'Какой ряд?',correct:w.row==='HARD'?'Твёрдый ряд':'Мягкий ряд',options:['Твёрдый ряд','Мягкий ряд'],error_code:w.id==='word-mi'?'HARMONY_MI_EXCEPTION':'HARMONY_MIXED_WORD_RIGHT_EDGE',feedback:w.note});
    }
    return rows;
  }

  function fluencyItems(random=Math.random){
    const letters=shuffled([
      ...BUCKETS.CORE_HARD.map(letter=>({kind:'letter',letter,correct:'Твёрдый ряд'})),
      ...BUCKETS.CORE_SOFT.map(letter=>({kind:'letter',letter,correct:'Мягкий ряд'})),
      ...BUCKETS.NEUTRAL.slice(0,6).map(letter=>({kind:'letter',letter,correct:'Не задаёт ряд'})),
      ...BUCKETS.CONTEXT.map(letter=>({kind:'letter',letter,correct:'Нужен контекст'}))
    ],random).slice(0,10);
    const words=shuffled(WORD_BANK,random).slice(0,10).map(w=>({kind:'word',word:w.word,correct:w.row==='HARD'?'Твёрдый ряд':'Мягкий ряд',note:w.note}));
    return shuffled([...letters,...words],random).map((x,i)=>({
      id:'fluency-'+i+'-'+(x.letter||x.word),type:'choice',stage:5,prompt:x.letter||x.word,letter:x.letter,word:x.word,
      correct:x.correct,options:x.kind==='letter'?['Твёрдый ряд','Мягкий ряд','Не задаёт ряд','Нужен контекст']:['Твёрдый ряд','Мягкий ряд'],
      error_code:'HARMONY_FLUENCY',feedback:x.note||((x.letter||'')+' → '+x.correct)
    }));
  }

  function buildStage(stage,random=Math.random){
    if(stage===1)return pairItems(random);
    if(stage===2)return classifyItems(random);
    if(stage===3)return recallItems(random);
    if(stage===4)return wordItems(random);
    if(stage===5)return fluencyItems(random);
    return [];
  }

  function emptyStats(){return {attempts:0,correct:0,byStage:{},problemPairs:{},responseMs:[],completedStages:[]};}
  function createSession(mode='full',random=Math.random){
    if(mode==='quick'){
      const quick=shuffled([...pairItems(random).slice(0,4),...classifyItems(random).filter(x=>x.scored!==false).slice(0,4),...wordItems(random).filter(x=>x.type==='choice').slice(0,4)],random);
      return {version:1,mode:'quick',stage:5,queue:quick,cursor:0,answered:false,lastResult:null,startedAt:Date.now(),updatedAt:Date.now(),complete:false,stats:emptyStats()};
    }
    return {version:1,mode:'full',stage:0,queue:[],cursor:0,answered:false,lastResult:null,startedAt:Date.now(),updatedAt:Date.now(),complete:false,stats:emptyStats()};
  }

  function startStage(session,stage,random=Math.random){
    const s=clone(session);s.stage=stage;s.queue=buildStage(stage,random);s.cursor=0;s.answered=false;s.lastResult=null;s.stageStartedAt=Date.now();s.updatedAt=Date.now();return s;
  }

  function sameSet(a,b){
    const aa=[...(a||[])].sort(),bb=[...(b||[])].sort();
    return aa.length===bb.length&&aa.every((x,i)=>x===bb[i]);
  }

  function grade(item,response){
    if(!item)return {correct:false,expected:null,feedback:'Нет задания.'};
    if(item.type==='info')return {correct:true,expected:null,feedback:item.feedback||'',scored:false};
    if(item.type==='recall')return {correct:sameSet(response,item.correct),expected:item.correct,feedback:item.feedback||''};
    if(item.type==='pairs')return {correct:sameSet(response,item.correct),expected:item.correct,feedback:item.feedback||''};
    return {correct:String(response??'')===String(item.correct??''),expected:item.correct,feedback:item.feedback||''};
  }

  function insertRepair(queue,cursor,item,attempt){
    const cloneItem={...clone(item),id:item.id+'-repair-'+attempt,repairOf:item.repairOf||item.id};
    const at=Math.min(queue.length,cursor+4);
    const next=[...queue];
    next.splice(at,0,cloneItem);
    return next;
  }

  function answer(session,response,responseMs=0){
    const s=clone(session),item=s.queue[s.cursor];
    if(!item||s.answered||s.complete)return s;
    const result=grade(item,response),scored=result.scored!==false;
    s.answered=true;
    s.lastResult={...result,itemId:item.id,response:clone(response),responseMs:Number(responseMs)||0};
    if(scored){
      s.stats.attempts+=1;
      if(result.correct)s.stats.correct+=1;
      const row=s.stats.byStage[String(s.stage)]||(s.stats.byStage[String(s.stage)]={attempts:0,correct:0});
      row.attempts+=1;if(result.correct)row.correct+=1;
      if(responseMs>0)s.stats.responseMs.push(Number(responseMs));
      if(!result.correct){
        if(item.error_code&&String(item.error_code).startsWith('HARMONY_PAIR_'))s.stats.problemPairs[item.error_code]=(s.stats.problemPairs[item.error_code]||0)+1;
        if(!item.repairOf)s.queue=insertRepair(s.queue,s.cursor,item,s.stats.attempts);
      }
    }
    s.updatedAt=Date.now();
    return s;
  }

  function advance(session,random=Math.random){
    let s=clone(session);
    if(s.complete)return s;
    if(s.stage===0)return startStage(s,1,random);
    if(!s.answered)return s;
    s.cursor+=1;s.answered=false;s.lastResult=null;s.updatedAt=Date.now();
    if(s.cursor<s.queue.length)return s;
    if(!s.stats.completedStages.includes(s.stage))s.stats.completedStages.push(s.stage);
    if(s.mode==='quick'||s.stage>=5){s.complete=true;s.completedAt=Date.now();return s;}
    return startStage(s,s.stage+1,random);
  }

  function median(values){
    const rows=(values||[]).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!rows.length)return null;
    const mid=Math.floor(rows.length/2);
    return rows.length%2?rows[mid]:(rows[mid-1]+rows[mid])/2;
  }

  function summary(session){
    const stats=session.stats||emptyStats(),m=median(stats.responseMs);
    return {attempts:stats.attempts,correct:stats.correct,accuracy:stats.attempts?Math.round(stats.correct/stats.attempts*100):0,medianResponseMs:m,fluent:stats.attempts>0&&stats.correct/stats.attempts>=.9&&m!=null&&m<=2200};
  }

  return {BUCKETS,BUCKET_LABELS,PAIRS,WORD_BANK,ALL_LETTERS,bucketOf,labelForLetter,coverage,pairItems,classifyItems,recallItems,wordItems,fluencyItems,buildStage,createSession,startStage,grade,answer,advance,summary,shuffled};
});