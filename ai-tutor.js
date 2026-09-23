/* Client AI tutor layer. Does not judge correctness. No FSRS weights. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const C=node?require('./ai-contract.js'):root.AiContract;
 const R=node?require('./ai-rules.js'):root.AiRules;
 const Diag=node?require('./diagnostics.js'):root.ErrorDiagnostics;
 const KEY='qazaqsha.aiTutor.v1';
 const RECENT=10;
 function reset(){store={errors:Object.create(null),recent:[]};if(!node)try{localStorage.removeItem(KEY);}catch{}}
 function load(){
  if(node)return {errors:Object.create(null),recent:[]};
  try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(s&&typeof s==='object')return {errors:s.errors||Object.create(null),recent:Array.isArray(s.recent)?s.recent.slice(-80):[]};}}catch{}
  return {errors:Object.create(null),recent:[]};
 }
 function save(st){if(node)return;try{localStorage.setItem(KEY,JSON.stringify({v:1,errors:st.errors,recent:st.recent.slice(-80)}));}catch{}}
 function snapshot(){
  return JSON.parse(JSON.stringify({errors:store.errors,recent:(store.recent||[]).slice(-80)}));
 }
 function restore(data){
  if(!data||typeof data!=='object')return snapshot();
  const local=snapshot();
  const incoming=data.errors||data.recent?data:{errors:{},recent:[]};
  const errors=Object.assign({},local.errors||{});
  for(const [k,v] of Object.entries(incoming.errors||{})){
   const old=errors[k];
   if(!old||(v.count_total||0)>=(old.count_total||0))errors[k]=v;
  }
  const recent=[],seen=new Set();
  for(const e of [...(local.recent||[]),...(incoming.recent||[])].sort((a,b)=>(a.at||0)-(b.at||0))){
   const id=String(e.at||0)+'|'+String(e.code||'')+'|'+String(e.id||'');
   if(seen.has(id))continue;
   seen.add(id);recent.push(e);
  }
  store.errors=errors;store.recent=recent.slice(-80);save(store);
  return snapshot();
 }
 let store=load();
 function mapDiag(type,expected,actual){
  const lesson33=['PERSON_VS_POSS','OWNER_SUBJECT_SWAP','OWNER_WRONG','SUBJECT_WRONG','POSS_PERSON_STACK','PERSON_AFTER_POSS_WRONG','PERSON_AFTER_POSS_MISSING','THIRD_PERSON_EXTRA_PERSONAL','EMES_PERSON_POSITION','EMES_POSS_DROPPED','OTBASY_DOUBLE_POSS','ADJ_ROLE_ORDER','INTERROGATIVE_CHOICE','MULTI_ERROR'];
  if(lesson33.includes(type))return type;
  if(type==='plural_after_numeral')return 'PLURAL_AFTER_NUMBER';
  if(type==='vowel_harmony')return 'PLURAL_HARMONY_AE';
  if(type==='plural_initial_consonant')return 'PLURAL_INITIAL_LDT';
  if(type==='emes_position')return 'EMES_SUFFIX_POSITION';
  if(type==='ordinal_20')return 'ORDINAL_SUFFIX';
  if(type==='ol_suffix')return 'OL_OLAR';
  if(type==='person_sen_siz')return /сыз|сіз/.test(expected||'')?'PERSON_SIZ_ENDING':'PERSON_SEN_ENDING';
  if(type==='lexical_retrieval')return 'VOCAB_RECALL';
  if(type==='letter_confusion')return 'KAZAKH_SPELLING';
  if(type==='number_order')return 'NUMERAL_COMPOSITION';
  if(type==='question_class')return 'QUESTION_PARTICLE';
  if(type==='poss_suffix_missing'||type==='poss_phrase')return 'POSS_PERSON_SUFFIX';
  if(type==='poss_assim_voice')return 'POSS_ASSIM_VOICE';
  if(type==='poss_plural_order')return 'POSS_PLURAL_ORDER';
  if(type==='poss_owner_form'||type==='poss_parse')return 'POSS_PRONOUN';
  if(type==='poss_wrong_person')return 'POSS_PERSON_SUFFIX';
  if(type==='poss_harmony')return 'POSS_HARMONY';
  if(type==='poss_edge'||type==='poss_buffer'||type==='poss_glide')return 'POSS_VOWEL_BUFFER';
  if(type==='bar_zhok_choice'||type==='bar_zhok_not_emes')return 'BAR_ZHOK';
  if(type==='POSS_NO_SUFFIX')return 'POSS_PERSON_SUFFIX';
  if(type==='POSS_ASSIM'||type==='POSS_GLIDE')return 'POSS_ASSIM_VOICE';
  if(type==='POSS_ORDER')return 'POSS_PLURAL_ORDER';
  if(type==='POSS_WRONG_PERSON'||type==='PERSON_ON_POSS'||type==='POSS_2PL_NO_PL'||type==='POSS_OLAR_FORCE_PL'||type==='POSS_2PL_READINGS')return 'POSS_OWNER_FORM';
  if(type==='DEIXIS_BARE'||type==='DEIXIS_OL')return 'WORD_ORDER_CURRENT';
  if(type==='number_confusion'){
   const b=(expected||'')+' '+(actual||'');
   if(/алты|алпыс/.test(b))return 'NUMERAL_CONFUSION_6_60';
   if(/жеті|жетпіс/.test(b))return 'NUMERAL_CONFUSION_7_70';
   if(/сегіз|сексен/.test(b))return 'NUMERAL_CONFUSION_8_80';
   if(/тоғыз|тоқсан/.test(b))return 'NUMERAL_CONFUSION_9_90';
   return 'NUMERAL_LEXEME';
  }
  return 'UNKNOWN';
 }
 function classify(q,expected,actual){
  expected=String(expected||'');actual=String(actual||'');
  const types=(Diag&&Diag.classify)?Diag.classify(expected,actual,q||{},{}):[];
  const codes=types.map(t=>mapDiag(t,expected,actual));
  const a=actual.toLowerCase(),e=expected.toLowerCase();
  if(/кітаптар|студенттер|адамдар/.test(a)&&/\b(бес|он|екі|үш|алты|жеті|бір|аз|көп|қанша)\b/.test(a+e+(q&&q.stimulus||''))){
   if(!codes.includes('PLURAL_AFTER_NUMBER')&&!codes.includes('QUANTIFIER_NO_PLURAL')){
    if(/\b(аз|көп|қанша|неше)\b/.test(a+' '+(q&&q.stimulus||'')))codes.unshift('QUANTIFIER_NO_PLURAL');
    else codes.unshift('PLURAL_AFTER_NUMBER');
   }
  }
  if(/ларсыңдар|лерсіңдер|ларсыздар/.test(a.replace(/\s/g,'')))codes.unshift('NO_EXTRA_PLURAL_WITH_PERSON');
  const uniq=[];
  for(const c of codes)if(C.ERROR_CODES.includes(c)&&!uniq.includes(c))uniq.push(c);
  if(uniq.includes('PLURAL_HARMONY_AE')&&uniq.includes('PLURAL_INITIAL_LDT')){
   uniq.unshift('PLURAL_FORM_COMBINED');
  }
  if(!uniq.length)uniq.push('UNKNOWN');
  return uniq;
 }
 function recOf(code){
  const cur=store.errors[code]||{error_code:code,rule_id:'',lesson_id:'',count_total:0,count_recent:0,last_seen:null,last_exercise_ids:[],hint_count_recent:0,successful_retrievals_after_error:0,remediation_due:false};
  store.errors[code]=cur;return cur;
 }
 function noteAnswer(q,answers,result,hinted,errors,now=Date.now()){
  const expected=(q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'';
  const actual=Array.isArray(answers)?String(answers[0]||''):String(answers||'');
  const codes=(!result||result.correct)?[]:classify(q,expected,actual);
  store.recent.push({code:codes[0]||(result&&result.correct?'OK':null),at:now,correct:!!(result&&result.correct),hinted:!!hinted,id:q&&q.id});
  store.recent=store.recent.slice(-80);
  if(result&&result.correct&&!hinted){
   const related=new Set();
   for(const card of R.cardsFor(q,''))for(const code of card.error_codes||[])related.add(code);
   const phase=q&&(q.phase3||q.phase2b);
   if(phase&&phase.error_type)related.add(String(phase.error_type).toUpperCase());
   for(const rec of Object.values(store.errors)){
    if(!rec||!rec.count_recent||!related.has(rec.error_code))continue;
    rec.successful_retrievals_after_error=(rec.successful_retrievals_after_error||0)+1;
    if(rec.successful_retrievals_after_error>=2){rec.count_recent=Math.max(0,(rec.count_recent||0)-1);rec.remediation_due=false;rec.successful_retrievals_after_error=0;}
   }
   save(store);return codes;
  }
  if(hinted&&result&&result.correct){save(store);return codes;}
  const primary=codes[0];
  if(!primary||primary==='OK'){save(store);return codes;}
  const rec=recOf(primary);
  rec.count_total=(rec.count_total||0)+1;
  rec.last_seen=new Date(now).toISOString();
  rec.last_exercise_ids=[q&&q.id,...(rec.last_exercise_ids||[])].filter(Boolean).slice(0,6);
  rec.successful_retrievals_after_error=0;
  const cards=R.cardsFor(q,primary);
  if(cards[0]){rec.rule_id=cards[0].rule_id;rec.lesson_id=cards[0].lesson_id;}
  if(hinted)rec.hint_count_recent=(rec.hint_count_recent||0)+1;
  const window=store.recent.filter(e=>e.code===primary&&!e.correct).slice(-RECENT);
  rec.count_recent=window.length;
  if(rec.count_recent>=3)rec.remediation_due=true;
  save(store);return codes;
 }
 function sameErrorCount(code){
  return store.recent.filter(e=>e.code===code&&!e.correct).slice(-RECENT).length;
 }
 function shouldOfferExplain(code){return code&&sameErrorCount(code)>=2;}
 function dueRemediation(){return Object.values(store.errors).filter(r=>r&&r.remediation_due).sort((a,b)=>b.count_recent-a.count_recent);}
 function explainBankGet(ruleId){
  try{
   const Bank=node?(function(){try{return require('./explain-bank.js');}catch{return null;}}()):root.ExplainBank;
   if(!Bank||!ruleId)return null;
   if(typeof Bank.get==='function')return Bank.get(ruleId);
   return Bank[ruleId]||null;
  }catch{return null;}
 }
 function toContext(card){
  if(!card)return null;
  const bank=explainBankGet(card.rule_id);
  const src=bank||card;
  if(R.toRuleContext)return R.toRuleContext(src);
  return {
   rule_id:src.rule_id,title_ru:src.title_ru,
   ru_refresh:src.ru_refresh||'',short:src.short||src.title_ru,
   medium:src.medium||src.explanation_ru,
   explanation_ru:src.explanation_ru||src.medium,
   examples_correct:src.examples_correct||[],examples_wrong:src.examples_wrong||[],
   traps:src.traps||[]
  };
 }
 function localFallback(q,codes,mode,req){
  const lesson=(req&&req.lesson_id)||(q&&q.lessonId)||'';
  const code=codes&&codes[0];
  const card=(R.cardsFor(q,code)||[])[0];
  const ctx=toContext(card);
  return C.localExplain({
   mode:mode||'explain_error',
   surface:(req&&req.surface)||'practice',
   lesson_id:lesson,
   user_answer:(req&&req.user_answer)||'',
   expected_answer:(req&&req.expected_answer)||(q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'',
   candidate_error_codes:codes||[],
   rule_context:ctx?[ctx]:[],
   user_question:(req&&req.user_question)||''
  });
 }
 function canonicalExpected(q,extra){
  extra=extra||{};
  let expected=(q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||extra.expected_answer||'';
  const Canon=node?require('./canonical.js'):root.Canonical;
  if(Canon&&Canon.applyQuestion){
   const clone={stimulus:q&&q.stimulus,title:q&&q.title,explanation:q&&q.explanation,fields:[{answers:[expected].concat((q&&q.fields&&q.fields[0]&&q.fields[0].answers)||[])}]};
   Canon.applyQuestion(clone);
   if(clone.fields&&clone.fields[0]&&clone.fields[0].answers&&clone.fields[0].answers[0])expected=clone.fields[0].answers[0];
  }
  return expected;
 }
 function buildRequest(mode,q,extra){
  extra=extra||{};
  const lesson=C.ALLOWED_LESSONS.includes(q&&q.lessonId)?q.lessonId:(C.ALLOWED_LESSONS.includes(extra.lesson_id)?extra.lesson_id:'');
  const lessons=lesson?C.lessonsThrough(lesson):[];
  const expected=canonicalExpected(q,extra);
  const codes=extra.codes||[];
  const cards=R.cardsFor(q,codes[0]).slice(0,2);
  const related=new Set((codes||[]).filter(Boolean));
  for(const card of cards)for(const code of card.error_codes||[])related.add(code);
  const summary={};
  for(const [k,v] of Object.entries(store.errors))if(v&&v.count_recent&&related.has(k))summary[k]=v.count_recent;
  const ctx=cards.map(toContext).filter(Boolean);
  return {
    mode,locale:'ru',
    surface:C.SURFACES.includes(extra.surface)?extra.surface:'practice',
    lesson_id:lesson,
    exercise_id:q&&q.id||'',
    prompt:(q&&(q.title||'')+' '+(q.stimulus||'')).trim(),
    user_answer:extra.user_answer||'',
    expected_answer:mode==='hint'?'':expected,
    is_correct:!!extra.is_correct,
    hint_used:!!extra.hint_used,
    repeat_count:extra.repeat_count!=null?extra.repeat_count:(codes[0]?sameErrorCount(codes[0]):0),
    rule_ids:cards.map(c=>c.rule_id),
    allowed_rule_ids:R.allowedRuleIds(lessons),
    allowed_vocab:R.allowedVocab(lessons),
    allowed_lesson_ids:lessons,
    candidate_error_codes:codes.filter(c=>C.ERROR_CODES.includes(c)).slice(0,8),
    recent_error_summary:summary,
    rule_context:ctx,
    user_question:extra.user_question||'',
    conversation_tail:C.clipTail(extra.conversation_tail)
  };
 }
 function isLiveMessage(s){
  s=String(s||'').trim();
  if(s.length<12)return false;
  return !/короткий разбор|разбор по правилу урока сейчас короткий|Правило уже на карточке|недоступен|Проверь форму по правилу|Проверь правило текущего урока|Полный ответ не показываю|Не разобрала этот вопрос|Разбор сессии сейчас короткий/i.test(s);
 }
 async function callTutor(req,timeoutMs,opts){
  opts=opts||{};
  if(timeoutMs==null)timeoutMs=C.CLIENT_TIMEOUT_MS||25000;
  if(req&&req.surface==='exam')return C.examBlocked(req.mode);
  const v=C.validateRequest(req||{});
  if(!v.ok){
   if(v.error==='missing_lesson')return C.missingLesson(req&&req.mode);
   if((req&&req.surface)==='exam')return C.examBlocked(req&&req.mode);
   return localFallback(null,req&&req.candidate_error_codes,req&&req.mode,req);
  }
  if(v.req.surface==='exam')return C.examBlocked(v.req.mode);
  if(v.req.mode!=='explain_error'&&C.looksFuture(v.req.user_question,v.req.lesson_id))return C.futureBlocked(v.req.mode);
  if(typeof fetch!=='function')return localFallback(null,v.req.candidate_error_codes,v.req.mode,v.req);
  const own=(!opts.signal&&typeof AbortController!=='undefined')?new AbortController():null;
  const signal=opts.signal||(own&&own.signal);
  const t=setTimeout(()=>{try{own&&own.abort();}catch{}},timeoutMs);
  try{
    const body=Object.assign({},v.req);
    if(body.mode==='hint')body.expected_answer='';
    const res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal});
    clearTimeout(t);
    let json=null;
    try{json=await res.json();}catch{json=null;}
    if(json&&typeof json.message_ru==='string'&&json.message_ru.trim()){
      const checked=C.validateResponse(json,v.req);
      const resp=checked.resp;
      resp.message_ru=json.message_ru.trim().slice(0,C.maxMessage(v.req.mode));
      if(json.meta)resp.meta=json.meta;
      if(v.req.mode==='hint'&&hintLeaks(resp,req&&req.expected_answer))return localFallback(null,v.req.candidate_error_codes,'hint',v.req);
      return resp;
    }
    return localFallback(null,v.req.candidate_error_codes,v.req.mode,v.req);
  }catch(err){
    clearTimeout(t);
    if(err&&(err.name==='AbortError'||err.message==='The user aborted a request.')){
      const r=C.emptyResp(v.req.mode,false);r.aborted=true;r.meta={request_id:null,source:'local'};return r;
    }
    return localFallback(null,v.req.candidate_error_codes,v.req.mode,v.req);
  }
 }
 function askTutor(context,question,extra){
  extra=extra||{};
  const q=context&&context.q?context.q:context;
  const req=buildRequest('ask_tutor',q,{
   user_answer:extra.user_answer||'',
   is_correct:!!extra.is_correct,
   hint_used:!!extra.hint_used,
   codes:extra.codes||[],
   surface:extra.surface||(context&&context.surface)||'practice',
   lesson_id:extra.lesson_id||(q&&q.lessonId)||(context&&context.lesson_id)||'',
   user_question:question||'',
   conversation_tail:extra.conversation_tail||(context&&context.conversation_tail)||[],
   repeat_count:extra.repeat_count
  });
  return callTutor(req,C.CLIENT_TIMEOUT_MS||25000,extra);
 }
 const TEMPLATES={
  PLURAL_AFTER_NUMBER:[
   {ru:'три книги',kk:'үш кітап',n:'үш',w:'кітап'},
   {ru:'пять студентов',kk:'бес студент',n:'бес',w:'студент'},
   {ru:'десять городов',kk:'он қала',n:'он',w:'қала'}
  ],
  NUMERAL_CONFUSION_6_60:[{ru:'6',kk:'алты'},{ru:'60',kk:'алпыс'},{ru:'6',kk:'алты'}],
  NUMERAL_CONFUSION_7_70:[{ru:'7',kk:'жеті'},{ru:'70',kk:'жетпіс'},{ru:'7',kk:'жеті'}],
  PLURAL_INITIAL_LDT:[{ru:'люди (мн.)',kk:'адамдар',w:'адам'},{ru:'книги (мн.)',kk:'кітаптар',w:'кітап'},{ru:'места (мн.)',kk:'жерлер',w:'жер'}],
  VOCAB_RECALL:[{ru:'человек',kk:'адам',w:'адам'},{ru:'книга',kk:'кітап',w:'кітап'},{ru:'друг',kk:'дос',w:'дос'}]
 };
 function templateQuestions(code,now=Date.now()){
  const rows=TEMPLATES[code];
  if(!rows)return [];
  const vocab=new Set(R.allowedVocab(C.ALLOWED_LESSONS).map(w=>w.toLowerCase()));
  return rows.slice(0,3).map((row,i)=>{
   const kk=row.kk,used=(row.w? [row.w,row.n]:kk.split(' ')).filter(Boolean);
   if(used.some(w=>w&&!vocab.has(String(w).toLowerCase())&&!/^\d+$/.test(w)))return null;
   return {
    id:'ai-remed:'+code+':'+now+':'+(i+1),
    source:'ai-remed',topic:code.indexOf('NUMERAL')===0?'numbers':code==='VOCAB_RECALL'?'vocab':'plural',kind:'fields',
    title:'Скажи по-казахски',stimulus:row.ru,
    fields:[{label:'Ответ',kind:'text',answers:[kk]}],
    explanation:'Временная проверка навыка. Не входит в банк 220 ID.',
    ruleIds:code==='PLURAL_AFTER_NUMBER'?['quantity']:code==='VOCAB_RECALL'?[]:['plural'],
    contextOnly:false
   };
  }).filter(Boolean);
 }
 const GAP_PHRASE='Отдельного упражнения для этой ошибки нет.';
 function coverageGaps(){
  return dueRemediation().filter(r=>!templateQuestions(r.error_code).length).map(r=>{
   const name=label(r.error_code);
   return {error_code:r.error_code,label:name===r.error_code?'':name,phrase:GAP_PHRASE};
  });
 }
 function takeRemediation(byId){
  const ready=dueRemediation().find(r=>templateQuestions(r.error_code).length);
  if(!ready)return [];
  const items=templateQuestions(ready.error_code);
  for(const q of items)if(byId&&q)byId.set(q.id,q);
  ready.remediation_due=false;save(store);
  return items;
 }
 function spliceRemediation(queue,position,ids){
  if(!ids||!ids.length)return queue;
  let at=Math.min(position+2,queue.length);
  for(let i=0;i<ids.length;i++){
    queue.splice(Math.min(at,queue.length),0,ids[i]);
    at+=2;
  }
  return queue;
 }
 function topWeak(n=3){
  return Object.values(store.errors).filter(r=>r&&(r.count_recent||r.count_total)).sort((a,b)=>(b.count_recent||0)-(a.count_recent||0)).slice(0,n);
 }
 function label(code){
  return {
    PLURAL_AFTER_NUMBER:'Множественное после числа',
    NUMERAL_CONFUSION_6_60:'6 и 60',NUMERAL_CONFUSION_7_70:'7 и 70',
    NUMERAL_CONFUSION_8_80:'8 и 80',NUMERAL_CONFUSION_9_90:'9 и 90',
    PLURAL_INITIAL_LDT:'Множественное Л/Д/Т',PLURAL_HARMONY_AE:'Множественное А/Е',
    EMES_SUFFIX_POSITION:'Емес: место окончания',ORDINAL_SUFFIX:'Порядковое',
    POSS_PERSON_SUFFIX:'Притяжательное окончание',POSS_ASSIM_VOICE:'Притяжательное П/К/Қ',POSS_PLURAL_ORDER:'Порядок множественного и притяжательного',POSS_PRONOUN:'Форма владельца',BAR_ZHOK:'Бар / жоқ',
    VOCAB_RECALL:'Слово'
  }[code]||code;
 }
 function hintLeaks(resp,expected){
  return C.containsExpected(resp,expected);
 }
 const api={KEY,classify,mapDiag,noteAnswer,sameErrorCount,shouldOfferExplain,dueRemediation,coverageGaps,localFallback,isLiveMessage,buildRequest,callTutor,askTutor,templateQuestions,takeRemediation,spliceRemediation,topWeak,label,hintLeaks,canonicalExpected,store,load,save,reset,snapshot,restore};
 if(node)module.exports=api;else root.AiTutor=api;
})(typeof window!=='undefined'?window:globalThis);
