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
 let store=load();
 function mapDiag(type,expected,actual){
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
   for(const rec of Object.values(store.errors)){
    if(!rec||!rec.count_recent)continue;
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
 function localFallback(q,codes,mode){
  const code=codes&&codes[0];
  const card=(R.cardsFor(q,code)||[])[0];
  const line=card?card.explanation_ru:'';
  if(mode==='hint')return C.fallback('hint',{rule_context:card?[card]:[]});
  const expected=(q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'';
  const msg=code==='PLURAL_AFTER_NUMBER'?'После конкретного числа множественное окончание не нужно.':(Diag&&Diag.line&&codes&&codes[0]&&Diag.line(null))||line||'Проверь форму по правилу текущего урока.';
  const r=C.emptyResp(mode||'explain_error',true);
  r.primary_error_code=code||null;
  r.rule_ids_used=card?[card.rule_id]:[];
  r.message_ru=msg;
  r.micro_rule_ru=card?card.title_ru:null;
  r.contrast={wrong:null,correct:mode==='hint'?null:expected||null};
  r.next_action_ru='Введи правильную форму целиком.';
  r.needs_rule_context=false;
  r.confidence='medium';
  return r;
 }
 function buildRequest(mode,q,extra){
  extra=extra||{};
  const lessons=C.ALLOWED_LESSONS;
  const expected=(q&&q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||extra.expected_answer||'';
  const codes=extra.codes||[];
  const cards=R.cardsFor(q,codes[0]).slice(0,2);
  const summary={};
  for(const [k,v] of Object.entries(store.errors))if(v&&v.count_recent)summary[k]=v.count_recent;
  return {
    mode,locale:'ru',lesson_id:q&&q.lessonId||extra.lesson_id||'',
    exercise_id:q&&q.id||'',
    prompt:(q&&(q.title||'')+' '+(q.stimulus||'')).trim(),
    user_answer:extra.user_answer||'',
    expected_answer:expected,
    is_correct:!!extra.is_correct,
    hint_used:!!extra.hint_used,
    rule_ids:cards.map(c=>c.rule_id),
    allowed_rule_ids:R.allowedRuleIds(lessons),
    allowed_vocab:R.allowedVocab(lessons),
    allowed_lesson_ids:lessons,
    candidate_error_codes:codes.filter(c=>C.ERROR_CODES.includes(c)).slice(0,8),
    recent_error_summary:summary,
    rule_context:cards.map(c=>({rule_id:c.rule_id,title_ru:c.title_ru,explanation_ru:c.explanation_ru,examples_correct:c.examples_correct,examples_wrong:c.examples_wrong})),
    user_question:extra.user_question||''
  };
 }
 async function callTutor(req,timeoutMs=8000){
  const v=C.validateRequest(req);
  if(!v.ok)return C.fallback(req&&req.mode,'','bad_req');
  if(typeof fetch!=='function')return localFallback(null,req.candidate_error_codes,req.mode);
  const ac=typeof AbortController!=='undefined'?new AbortController():null;
  const t=setTimeout(()=>{try{ac&&ac.abort();}catch{}},timeoutMs);
  try{
    const res=await fetch('/api/tutor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v.req),signal:ac?ac.signal:undefined});
    clearTimeout(t);
    if(!res.ok)return localFallback(null,v.req.candidate_error_codes,v.req.mode);
    const json=await res.json();
    const checked=C.validateResponse(json,v.req);
    return checked.resp;
  }catch{
    clearTimeout(t);
    return localFallback(null,v.req.candidate_error_codes,v.req.mode);
  }
 }
 const TEMPLATES={
  PLURAL_AFTER_NUMBER:[
   {ru:'три книги',kk:'үш кітап',n:'үш',w:'кітап'},
   {ru:'пять студентов',kk:'бес студент',n:'бес',w:'студент'},
   {ru:'десять городов',kk:'он қала',n:'он',w:'қала'}
  ],
  NUMERAL_CONFUSION_6_60:[{ru:'6',kk:'алты'},{ru:'60',kk:'алпыс'},{ru:'6',kk:'алты'}],
  NUMERAL_CONFUSION_7_70:[{ru:'7',kk:'жеті'},{ru:'70',kk:'жетпіс'},{ru:'7',kk:'жеті'}],
  PLURAL_INITIAL_LDT:[{ru:'люди (мн.)',kk:'адамдар',w:'адам'},{ru:'книги (мн.)',kk:'кітаптар',w:'кітап'},{ru:'места (мн.)',kk:'жерлер',w:'жер'}]
 };
 function templateQuestions(code,now=Date.now()){
  const rows=TEMPLATES[code]||TEMPLATES.PLURAL_AFTER_NUMBER;
  const vocab=new Set(R.allowedVocab(C.ALLOWED_LESSONS).map(w=>w.toLowerCase()));
  return rows.slice(0,3).map((row,i)=>{
   const kk=row.kk,used=(row.w? [row.w,row.n]:kk.split(' ')).filter(Boolean);
   if(used.some(w=>w&&!vocab.has(String(w).toLowerCase())&&!/^\d+$/.test(w)))return null;
   return {
    id:'ai-remed:'+code+':'+now+':'+(i+1),
    source:'ai-remed',topic:code.indexOf('NUMERAL')===0?'numbers':'plural',kind:'fields',
    title:'Скажи по-казахски',stimulus:row.ru,
    fields:[{label:'Ответ',kind:'text',answers:[kk]}],
    explanation:'Временная проверка навыка. Не входит в банк 220 ID.',
    ruleIds:code==='PLURAL_AFTER_NUMBER'?['quantity']:['plural'],
    contextOnly:false
   };
  }).filter(Boolean);
 }
 function takeRemediation(byId){
  const due=dueRemediation()[0];if(!due)return [];
  const items=templateQuestions(due.error_code);
  for(const q of items)if(byId&&q)byId.set(q.id,q);
  due.remediation_due=false;save(store);
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
    VOCAB_RECALL:'Слово'
  }[code]||code;
 }
 function hintLeaks(resp,expected){
  if(!resp||!expected)return false;
  const exp=String(expected).trim().toLowerCase();
  if(exp.length<3)return false;
  const blob=((resp.message_ru||'')+' '+((resp.contrast&&resp.contrast.correct)||'')+' '+(resp.next_action_ru||'')).toLowerCase();
  return blob.includes(exp);
 }
 const api={KEY,classify,mapDiag,noteAnswer,sameErrorCount,shouldOfferExplain,dueRemediation,localFallback,buildRequest,callTutor,templateQuestions,takeRemediation,spliceRemediation,topWeak,label,hintLeaks,store,load,save,reset};
 if(node)module.exports=api;else root.AiTutor=api;
})(typeof window!=='undefined'?window:globalThis);
