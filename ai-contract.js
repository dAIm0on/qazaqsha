/* AI tutor contract: model-agnostic. No FSRS. No bank IDs. */
(function(root){
 'use strict';
 const PRIMARY_MODEL='@cf/zai-org/glm-4.7-flash';
 const FALLBACK_MODEL='@cf/qwen/qwen3-30b-a3b-fp8';
 const MODEL_ID=PRIMARY_MODEL;
 const FALLBACK=FALLBACK_MODEL;
 const MODES=['explain_error','hint','explain_rule','simplify','ask_tutor','session_summary','remediation'];
 const SURFACES=['practice','path','rules','homework','review','exam','learn'];
 const ERROR_CODES=['HARMONY_FRONT_BACK','HARMONY_AMBIGUOUS_I_U_YU','PLURAL_HARMONY_AE','PLURAL_INITIAL_LDT','PLURAL_FORM_COMBINED','PLURAL_AFTER_NUMBER','QUANTIFIER_NO_PLURAL','NUMERAL_LEXEME','NUMERAL_CONFUSION_6_60','NUMERAL_CONFUSION_7_70','NUMERAL_CONFUSION_8_80','NUMERAL_CONFUSION_9_90','NUMERAL_COMPOSITION','NUMERAL_HUNDREDS_THOUSANDS','PERSON_MEN_ENDING','PERSON_SEN_ENDING','PERSON_SIZ_ENDING','EMES_SUFFIX_POSITION','PREDICATIVE_ADJECTIVE','PERSON_BIZ_ENDING','PERSON_SENDER_ENDING','PERSON_SIZDER_ENDING','NO_EXTRA_PLURAL_WITH_PERSON','OL_OLAR','QUESTION_PARTICLE','QUESTION_PARTICLE_HARMONY','QUESTION_PARTICLE_PHONOLOGY','ORDINAL_SUFFIX','KAZAKH_SPELLING','WORD_ORDER_CURRENT','VOCAB_RECALL','POSS_PRONOUN','POSS_PERSON_SUFFIX','POSS_HARMONY','POSS_VOWEL_BUFFER','POSS_ASSIM_VOICE','POSS_PLURAL_ORDER','POSS_ADJ_POSITION','POSS_OWNER_FORM','BAR_ZHOK','MULTI_ERROR','UNKNOWN'];
 const ALLOWED_LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2'];
 const RULE_BY_LESSON={'1-1':['T1_HARMONY'],'1-2':['T1_HARMONY','T2_PLURAL_LDT'],'1-3':['T1_HARMONY','T2_PLURAL_LDT','T4_NO_PLURAL_AFTER_NUMBER','T5_NUMERAL_CONFUSION','T5_NUMERAL_COMPOSE'],'2-1':['T1_HARMONY','T6_PERSON_SG','T7_EMES'],'2-2':['T1_HARMONY','T6_PERSON_SG','T7_EMES','T8_PERSON_PL','T8_ADJ_PRED'],'2-3':['T1_HARMONY','T6_PERSON_SG','T7_EMES','T8_PERSON_PL','T8_ADJ_PRED','T9_OL','T10_QUESTION','T11_ORDINAL'] ,'3-1':['T20_POSS','T21_POSS_ASSIM','T22_BAR_ZHOK','T23_POSS_PL'],'3-2':['T24_POSS_BIZ','T25_POSS_SENDER','T26_POSS_OLAR','T27_DEIXIS']};
 const VOCAB_BY_LESSON={'1-1':['адам','қыз','ұл','жігіт','кітап','жер','су','ту','сөз','қала','көше'],'1-2':['нөл','бір','екі','үш','төрт','бес','алты','жеті','сегіз','тоғыз','он','жиырма','отыз','қырық','елу','алпыс','жетпіс','сексен','тоқсан','жүз','мың','аз','көп','қанша'],'1-3':['дос','құрбы','мұғалім','ғалым','дәрігер','заңгер','оқушы','студент','мен','біз','сен','сендер','сіз','сіздер','ол','олар','иә','жоқ','емес'],'2-1':['әдемі','сұлу','ақылды','жомарт','сараң','бай','кедей','жас','зейнеткер','есепші','жұмыссыз','жұмысшы','бастық','жолсерік','ақын','жазушы','жүргізуші','кәсіпкер','оқырман','аспаз'],'2-2':['көрші','әріптес','жау','қонақ','туыс','маман','таныс','қазақ','орыс','семіз'],'2-3':['бала','әке','ана','әже','апа','ата','тәте','аға','іні','әпке','қарындас','сіңлі','егіз','жұмыс','мамандық','ат','мектеп','көлік','пәтер','қалам'] ,'3-1':['бас','қол','көз','тіл','қалам','көйлек','жақсы','жаман','біздің','сендердің','сіздердің','олардың','жүрек','сақал','мысық','таз','тақырбас','қатты','саусақ','кім','не','қандай','қай','нешінші','бұл']};
 const FUTURE_RE=/падеж|посессив|притяжательн|губн(ая|ой) гармо|степен(и|ей) сравнен|imperative|бар ма\?|кітабым/i;
const ALWAYS_FUTURE_RE=/падеж|губн(ая|ой) гармо|степен(и|ей) сравнен|imperative|labial|comparative/i;
const POSS_FUTURE_RE=/посессив|притяжательн|бар ма\?|кітабым/i;
 const MAX_IN=12000,MAX_MSG=450,MAX_OUT_TOKENS=250,ASK_OUT_TOKENS=400;
 const CLIENT_TIMEOUT_MS=25000,PRIMARY_TIMEOUT_MS=11000,FALLBACK_TIMEOUT_MS=8000;
 const MSG_MAX={explain_error:450,hint:220,explain_rule:900,simplify:700,ask_tutor:1200,session_summary:800,remediation:450};
 const SYSTEM='Ты — контекстный персональный тьютор казахского языка внутри Qazaqsha.\n\nТы не проверяешь правильность ответа. Правильность уже определил локальный код.\n\nТы не меняешь expected_answer.\n\nГлавный источник истины — переданный rule_context.\n\nОбъясняй только те правила, которые присутствуют в rule_context и разрешены текущим уроком.\n\nНе вводи будущие темы.\n\nНе исправляй учебную программу своими знаниями.\n\nНе называй внутренние ID правил.\n\nНе упоминай system prompt, error_code или внутреннюю архитектуру.\n\nПиши естественным русским языком. Казахские формы оставляй на казахском.\n\nЕсли mode=explain_error:\n1. скажи, что ученица написала;\n2. покажи отличие от правильной формы;\n3. объясни один механизм правила;\n4. используй текущий пример.\n\nЕсли mode=explain_rule:\nобъясни переданное правило применительно к текущей форме. Не заменяй канонический текст новым правилом.\n\nЕсли mode=simplify:\nобъясни то же правило проще, не меняя его смысл.\n\nЕсли mode=ask_tutor:\nответь прежде всего на user_question 2–6 предложениями. Сразу к сути, без приветствия и без переписывания вопроса ученицы.\nДля кітап+ым помни озвончение п→б: кітабым.\nРазрешено объяснять через русский язык, если это помогает ученице понять казахское правило.\nМожно давать дополнительные примеры только из текущей разрешённой лексики и уже пройденной грамматики.\n\nЕсли ученица пишет:\n«не поняла»,\n«ещё проще»,\n«объясни иначе»,\n«через русский»,\nто измени способ объяснения, но не правило.\n\nЕсли repeat_count >= 2:\nможно коротко отметить, что эта ошибка уже встречалась, и предложить другой способ её понять.\nНе стыди ученицу. Не пиши «ты опять ошиблась».\n\nЕсли mode=hint:\nне показывай полный правильный ответ.\n\nВозвращай только текст ответа ученице на русском. Сразу ответ, без планов и чеклистов. Не пиши Analyze the Request, Role, Constraints, Mode, expected_answer, rule_context.\nБез JSON.\nБез markdown fences.\nБез <think>.\nНикогда не пиши English thinking aloud (Okay, Let me recall, the user is asking). Ответ ученице — только на русском.';
 function clip(s,n){s=String(s==null?'':s);return s.length<=n?s:s.slice(0,n);}
 function sentenceClip(s,n){
  s=String(s==null?'':s).trim();
  if(s.length<=n)return s;
  const head=s.slice(0,n+1);
  let cut=-1;
  for(let i=head.length-1;i>=0;i--){
   if(/[.!?…»"]/.test(head[i])){cut=i;break;}
  }
  return cut>=40?head.slice(0,cut+1).trim():'';
 }
 function contextClip(s,n){
  s=String(s==null?'':s);
  if(s.length<=n)return s;
  return sentenceClip(s,n)||clip(s,n);
 }
 function asArr(v){return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}
 function maxMessage(mode){return MSG_MAX[mode]||MAX_MSG;}
 function lessonsThrough(currentLesson){
  const i=ALLOWED_LESSONS.indexOf(currentLesson);
  if(i<0)return [];
  return ALLOWED_LESSONS.slice(0,i+1);
 }
 function normKey(s){return String(s??'').normalize('NFC').toLocaleLowerCase('ru').replace(/[.!?,;:]+$/g,'').replace(/\s+/g,' ').trim();}
 function resolveCurriculum(lessonId, _clientIds){
  const use=lessonsThrough(lessonId);
  const rules=[],vocab=[];
  for(const id of use){
   for(const r of RULE_BY_LESSON[id]||[])if(!rules.includes(r))rules.push(r);
   for(const w of VOCAB_BY_LESSON[id]||[])if(!vocab.includes(w))vocab.push(w);
  }
  return {allowed_lesson_ids:use,allowed_rule_ids:rules,allowed_vocab:vocab};
 }
 function collectStrings(o,out){
  if(typeof o==='string')out.push(o);
  else if(Array.isArray(o))o.forEach(x=>collectStrings(x,out));
  else if(o&&typeof o==='object')Object.values(o).forEach(x=>collectStrings(x,out));
  return out;
 }
 function containsExpected(payload,expected){
  const exp=normKey(expected);
  if(!exp||exp.length<3)return false;
  const blob=normKey(collectStrings(payload,[]).join(' '));
  return blob.includes(exp);
 }
 function clipTail(tail){
  if(!Array.isArray(tail))return [];
  const out=[];
  let total=0;
  const rows=tail.slice(-4);
  for(const m of rows){
   if(!m||typeof m!=='object')continue;
   const role=m.role==='assistant'?'assistant':'user';
   const content=clip(m.content,400).trim();
   if(!content)continue;
   total+=content.length;
   if(total>1600)break;
   out.push({role,content});
  }
  return out;
 }
 function clipRuleContext(arr,allowRules){
  const allow=allowRules instanceof Set?allowRules:new Set(allowRules||[]);
  const out=[];
  for(const c of (Array.isArray(arr)?arr:[]).slice(0,4)){
   if(!c||typeof c!=='object')continue;
   const id=clip(c.rule_id,40).trim();
   if(!id||(allow.size&&!allow.has(id)))continue;
   const fullMed=String(c.medium||c.explanation_ru||'');
   const fullRu=String(c.ru_refresh||'');
   const medium=contextClip(fullMed,700);
   const next=String(c.medium_next||(fullMed.length>700?fullMed.slice(medium.length):''));
   out.push({
    rule_id:id,
    block_id:id,
    block_label:clip(c.block_label||c.title_ru,120),
    part:1,
    clipped:!!c.clipped||fullMed.length>700||fullRu.length>400,
    title_ru:clip(c.title_ru,120),
    ru_refresh:contextClip(fullRu,400),
    short:contextClip(c.short||c.title_ru,160),
    medium,
    explanation_ru:contextClip(c.explanation_ru||c.medium,700),
    medium_next:contextClip(next,700),
    examples_correct:asArr(c.examples_correct).slice(0,4),
    examples_wrong:asArr(c.examples_wrong).slice(0,4),
    traps:asArr(c.traps).slice(0,4)
   });
  }
  return out;
 }
 function extractJson(text){
  let t=String(text||'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
  const fence=t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fence)t=fence[1].trim();
  const i=t.indexOf('{'),j=t.lastIndexOf('}');
  if(i<0||j<=i)return null;
  try{return JSON.parse(t.slice(i,j+1));}catch{return null;}
 }
 function normalizeModelText(out){
  let t='';
  if(out==null)t='';
  else if(typeof out==='string')t=out;
  else if(typeof out.message_ru==='string'&&out.message_ru.trim())t=out.message_ru;
  else if(typeof out.response==='string')t=out.response;
  else if(out.response&&typeof out.response==='object'){
   if(typeof out.response.message_ru==='string')t=out.response.message_ru;
   else if(typeof out.response.content==='string')t=out.response.content;
   else if(typeof out.response.response==='string')t=out.response.response;
  }
  if(!t&&out&&typeof out==='object'){
   const choice=out.choices&&out.choices[0];
   const msg=choice&&(choice.message||choice.delta);
   if(msg){
    if(typeof msg.content==='string')t=msg.content;
    else if(Array.isArray(msg.content))t=msg.content.map(p=>typeof p==='string'?p:(p&&(p.text||p.content))||'').join('');
   }
   if(!t&&typeof out.text==='string')t=out.text;
   if(!t&&out.result&&typeof out.result.response==='string')t=out.result.response;
  }
  t=String(t||'');
  t=t.replace(/<think>[\s\S]*?<\/think>/gi,'');
  // Keep orphan </think> for cleanTutorReply (longest-segment); only strip paired tags here.
  const fence=t.match(/```(?:json|text)?\s*([\s\S]*?)```/i);
  if(fence)t=fence[1];
  t=t.replace(/^```(?:json|text)?\s*/i,'').replace(/\s*```$/,'').trim();
  t=t.replace(/^\s*message_ru\s*:\s*/i,'').replace(/^\s*Ответ\s*:\s*/i,'');
  if((t.startsWith('"')&&t.endsWith('"'))||(t.startsWith('«')&&t.endsWith('»')))t=t.slice(1,-1).trim();
  if(t.charAt(0)==='{'){
   const j=extractJson(t);
   if(j&&typeof j.message_ru==='string'&&j.message_ru.trim())t=j.message_ru.trim();
  }
  return t.trim();
 }
 function needsKitabymMechanism(req){
  return !!(req&&req.mode==='ask_tutor'&&/кітаб(ым|ымдар|ымы)|кітапым/i.test(String(req.user_question||'')+' '+String(req.prompt||'')));
 }
 function hasKitabymMechanism(t){
  t=String(t||'');
  return /п\s*[→\-–]\s*б|озвонч|после\s*п|п\s+становится\s*б|кітап\s*\+|наклейк|кусок справа|-ым\b|-ім\b|притяжательн/i.test(t);
 }
 function looksLikeBadTutorReply(t){
  t=String(t||'').trim();
  if(!t)return false;
  const compact=t.replace(/\s+/g,' ').trim();
  if(compact.length>=120){
    for(let n=40;n<=Math.min(160,Math.floor(compact.length/3));n++){
      const chunk=compact.slice(0,n);
      if(chunk.length<40)break;
      let hits=0,idx=0;
      while((idx=compact.indexOf(chunk,idx))!==-1){hits++;idx+=chunk.length;if(hits>=3)return true;}
    }
  }
  if(/мой книга/i.test(t))return true;
  if(/^(добрый день|здравствуй(те)?|привет)[!.,]?\s/i.test(t))return true;
  if(/Объясни,?\s*пожалуйста/i.test(t)&&/Спасибо/i.test(t))return true;
  if(/\n\s*(Здравствуйте|Добрый день)!/i.test(t))return true;
  if(/^\.\s*Добрый/i.test(t))return true;
  if(/как правильно будет\s*[«"]?кітабым/i.test(t)&&/Нужно объяснить/i.test(t))return true;
  if(/Нужно объяснить/i.test(t))return true;
  if(/^\s*(ученица|ученик|пользователь)\s+(просит|спрашивает|хочет|пытается|интересуется)(?=\s|[,:—-])/i.test(t))return true;
  if(/^\s*(задача|цель)\s*[:—-]/i.test(t))return true;
  if(/^\s*(мне|нам)\s+(нужно|надо|следует)\s+(объяснить|ответить|показать|сказать)/i.test(t))return true;
  if(/^\s*(нужно|надо|следует)\s+(объяснить|ответить|показать|сказать|учесть)(?=\s|[,:—-])/i.test(t))return true;
  if(/^(Итак,? |Нужно |Следует |Я (должен|должна|сейчас) )/i.test(t)&&t.length<220)return true;
  // truncated mid-thought / unfinished clause
  if(/\.{3}\s*$/.test(t)&&t.length<240)return true;
  if(/и притяжательн\w*\s*$/i.test(t))return true;
  if(/что\s*\.{3}/i.test(t))return true;
  if(t.length>=40&&!/[.!?…»"')\]]\s*$/u.test(t))return true;
  if(/^Хорошо,?\s*$/i.test(t))return true;
  return false;
 }
   function cleanTutorReply(t){
   t=String(t||'').trim().replace(/^\.+\s*/,'');
   t=t.replace(/<think>[\s\S]*?<\/think>/gi,'');
   // Drop echoed meta-instructions; keep the student-facing answer
   t=t.replace(/Теперь ответь на вопрос ученицы[\s\S]*?Ваш ответ:\s*/gi,'');
   t=t.replace(/^[\s\S]*?Ваш ответ:\s*/i,'');
   t=t.replace(/используя только данные из\s*rule_context[\s\S]*?(?=[«"А-ЯЁВ])/gi,'');
   // Orphan </think>: keep the longest cleaned segment (final short echo is often truncated)
   if(/<\/think>/i.test(t)){
     const parts=t.split(/<\/think>/i);
     let best='';
     for(const p of parts){
       const c=String(p||'').replace(/<think>/gi,'').trim();
       if(c.length>best.length)best=c;
     }
     t=best||parts[parts.length-1].trim();
   }
   t=t.replace(/<\/?think>/gi,'').trim();
   const solid=t.match(/(В русском[\s\S]*)$/i);
   if(solid&&/(кітабым|наклейк|п\s*[→\-–]\s*б|озвонч|-ым)/i.test(solid[1]))t=solid[1];
   const chunks=t.split(/(?<=[.!?…»])\s+/).map(s=>s.trim()).filter(Boolean);
   const seen=new Set();
   const uniq=[];
   for(const s of chunks){
     const k=s.replace(/\s+/g,' ').toLowerCase();
     if(k.length>=12&&seen.has(k))continue;
     if(k.length>=12)seen.add(k);
     uniq.push(s);
   }
   t=uniq.join(' ').trim();
   t=t.replace(/^(добрый день|здравствуй(те)?|привет)[!.,]?\s+/i,'');
   t=t.replace(/^[\s\S]{0,240}?Спасибо!\s*/i,'');
   t=t.replace(/^(здравствуй(те)?|добрый день)[!.,]?\s*/i,'');
   return t.trim();
 }
 function looksLikePromptLeak(t){
  t=String(t||'');
  if(/Analyze the Request/i.test(t))return true;
  if(/\*\*\s*Role\s*\*\*/i.test(t)&&/Constraint/i.test(t))return true;
  if(/Mode:\s*`?(ask_tutor|explain_error|hint)`?/i.test(t)&&/(rule_context|expected_answer)/i.test(t))return true;
  if(/\bexpected_answer\b/.test(t)&&/\brule_context\b/.test(t)&&/\bmode\b/i.test(t))return true;
  if(/^\s*1\.\s*\*?\*?Analyze/i.test(t))return true;
  if(/Теперь ответь на вопрос ученицы/i.test(t))return true;
  if(/\bВаш ответ:\s*/i.test(t)&&/инструкц/i.test(t))return true;
  if(/<\/?think>/i.test(t))return true;
  if(/Okay,?\s+the user is asking/i.test(t))return true;
  if(/Let me recall (the )?(rule )?context/i.test(t))return true;
  if(/the user is (asking|confused)/i.test(t))return true;
  if(/\bWait,?\s+the user\b/i.test(t))return true;
  if(/I need to (explain|recall|think|check)/i.test(t)&&/rule/i.test(t))return true;
  const cyr=(t.match(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/g)||[]).length;
  const lat=(t.match(/[A-Za-z]/g)||[]).length;
  if(lat>=80&&cyr<20&&/\b(the|user|rule|explain|asking|recall)\b/i.test(t))return true;
  return false;
 }
 function isUsableText(t){
  t=String(t||'').trim();
  if(t.length<12)return false;
  if(looksLikePromptLeak(t))return false;
  if(looksLikeBadTutorReply(t))return false;
  if(/<\/?think>/i.test(t)&&t.replace(/<think>[\s\S]*?<\/think>/gi,'').trim().length<12)return false;
  if(/^\s*(sorry|i cannot|as an ai)\b/i.test(t)&&t.length<48)return false;
  return true;
 }
 function emptyResp(mode,ok=false){
  return {ok,mode,primary_error_code:null,secondary_error_codes:[],rule_ids_used:[],message_ru:'',micro_rule_ru:null,contrast:{wrong:null,correct:null},next_action_ru:null,needs_rule_context:!ok,confidence:ok?'medium':'low',remediation:null,meta:{request_id:null,source:'local'}};
 }
 function examBlocked(mode){
  const r=emptyResp(mode||'ask_tutor',true);
  r.message_ru='Разбор будет доступен после завершения проверки.';
  r.confidence='high';
  r.needs_rule_context=false;
  r.meta={request_id:null,source:'local'};
  return r;
 }
 function futureBlocked(mode){
  const r=emptyResp(mode||'ask_tutor',true);
  r.message_ru='Этой темы в текущем уроке ещё нет. Сейчас держимся правила, которое уже открыто.';
  r.confidence='high';
  r.needs_rule_context=false;
  r.meta={request_id:null,source:'local'};
  return r;
 }
 function missingLesson(mode){
  const r=emptyResp(mode||'explain_error',true);
  r.message_ru='Нет контекста урока. Открой упражнение или главу и спроси ещё раз.';
  r.confidence='medium';
  r.needs_rule_context=true;
  r.meta={request_id:null,source:'local'};
  return r;
 }
 function leverLine(code,ctx){
  const medium=(ctx&&(ctx.medium||ctx.explanation_ru))||'';
  return {
   PLURAL_AFTER_NUMBER:'После конкретного числа окончание множественного числа здесь не ставится.',
   QUANTIFIER_NO_PLURAL:'После аз, көп, қанша существительное остаётся без окончания множественного.',
   NUMERAL_CONFUSION_6_60:'6 — алты, 60 — алпыс. Это разные слова одной семьи.',
   NUMERAL_CONFUSION_7_70:'7 — жеті, 70 — жетпіс. Это разные слова одной семьи.',
   NUMERAL_CONFUSION_8_80:'8 — сегіз, 80 — сексен. Это разные слова одной семьи.',
   NUMERAL_CONFUSION_9_90:'9 — тоғыз, 90 — тоқсан. Это разные слова одной семьи.',
   PLURAL_INITIAL_LDT:'После м/н/ң/л/ж/з множественное начинается с д: -дар/-дер, не -лар.',
   PLURAL_HARMONY_AE:'Гласная окончания смотрит на последний слог: задний ряд → а, передний → е.',
   PLURAL_FORM_COMBINED:'Нужны и стык Л/Д/Т, и гармония А/Е.',
   EMES_SUFFIX_POSITION:'Личное окончание ставится на емес, не на основу перед емес.'
  }[code]||medium||'Проверь форму по правилу текущего урока.';
 }
 function localExplain(req){
  const mode=(req&&req.mode)||'explain_error';
  if((req&&req.surface)==='exam')return examBlocked(mode);
  if(mode!=='explain_error'&&looksFuture(req&&req.user_question,req&&req.lesson_id))return futureBlocked(mode);
  const ctx=(req&&req.rule_context&&req.rule_context[0])||{};
  const medium=ctx.medium||ctx.explanation_ru||'';
  const ru=ctx.ru_refresh||'';
  const wrote=(req&&req.user_answer)||'';
  const expected=(req&&req.expected_answer)||'';
  const code=(req&&req.candidate_error_codes&&req.candidate_error_codes[0])||'';
  const r=emptyResp(mode,true);
  r.primary_error_code=code||null;
  r.rule_ids_used=ctx.rule_id?[ctx.rule_id]:[];
  r.micro_rule_ru=ctx.short||ctx.title_ru||null;
  r.contrast={wrong:wrote||null,correct:mode==='hint'?null:(expected||null)};
  r.needs_rule_context=false;
  r.confidence='medium';
  r.meta={request_id:(req&&req.request_id)||null,source:'local'};
  const lever=leverLine(code,ctx);
  if(mode==='hint'){
   r.message_ru='Проверь правило текущего урока и слот окончания. Полный ответ не показываю.';
   r.next_action_ru='Введи форму целиком.';
   r.contrast.correct=null;
   return r;
  }
  if(mode==='explain_error'&&wrote){
   r.message_ru=(expected?'Ты написала «'+wrote+'», нужно «'+expected+'». ':'Ты написала «'+wrote+'». ')+lever;
  }else if(mode==='ask_tutor'||mode==='explain_rule'||mode==='simplify'){
   r.message_ru=[medium,ru].filter(Boolean).join('\n')||lever;
  }else if(mode==='session_summary'){
   r.message_ru='Разбор сессии сейчас короткий. Локальные слабые места сохранены.';
  }else r.message_ru=lever;
  r.next_action_ru='Введи правильную форму целиком.';
  r.message_ru=sentenceClip(r.message_ru,maxMessage(mode))||sentenceClip(lever,maxMessage(mode))||clip(lever,maxMessage(mode));
  return r;
 }
 function assembleResponse(req,text,meta){
  const mode=(req&&req.mode)||'explain_error';
  const source=(meta&&meta.source)||'primary';
  const r=emptyResp(mode,true);
  r.message_ru=sentenceClip(cleanTutorReply(String(text||'').trim()),maxMessage(mode));
  r.primary_error_code=(req&&req.candidate_error_codes&&req.candidate_error_codes[0])||null;
  r.secondary_error_codes=asArr(req&&req.candidate_error_codes).slice(1,4);
  r.rule_ids_used=((req&&req.rule_context)||[]).map(c=>c&&c.rule_id).filter(Boolean).slice(0,6);
  const ctx=(req&&req.rule_context&&req.rule_context[0])||{};
  r.micro_rule_ru=ctx.short||ctx.title_ru||null;
  r.contrast={wrong:(req&&req.user_answer)||null,correct:mode==='hint'?null:((req&&req.expected_answer)||null)};
  r.next_action_ru=mode==='hint'?'Введи форму целиком, не копируй готовый ответ.':'Введи правильную форму целиком.';
  r.needs_rule_context=false;
  r.confidence=source==='local'?'medium':'high';
  r.remediation=null;
  r.meta={request_id:(meta&&meta.request_id)||null,source,model:(meta&&meta.model)||null,latency_ms:(meta&&meta.latency_ms)||null};
  if(mode==='hint'&&containsExpected(r,req&&req.expected_answer)){
   const leak=localExplain(req);
   leak.meta=r.meta;leak.meta.source='local';
   leak.message_ru='Подсказка не должна содержать готовый ответ. Проверь правило, затем введи форму целиком.';
   return leak;
  }
  if(looksFuture(r.message_ru,req&&req.lesson_id))return null;
  if(!isUsableText(r.message_ru))return null;
  if(needsKitabymMechanism(req)&&!hasKitabymMechanism(r.message_ru))return null;
  return r;
 }
 function validateRequest(raw){
  if(!raw||typeof raw!=='object')return {ok:false,error:'bad_body'};
  const mode=String(raw.mode||'');
  if(!MODES.includes(mode))return {ok:false,error:'bad_mode'};
  const json=JSON.stringify(raw);
  if(json.length>MAX_IN)return {ok:false,error:'too_large'};
  const surface=SURFACES.includes(raw.surface)?raw.surface:'practice';
  const lesson_id=ALLOWED_LESSONS.includes(raw.lesson_id)?raw.lesson_id:'';
  if(!lesson_id)return {ok:false,error:'missing_lesson'};
  const resolved=resolveCurriculum(lesson_id);
  const allowRules=new Set(resolved.allowed_rule_ids);
  const allowVocab=new Set(resolved.allowed_vocab.map(w=>normKey(w)));
  const clientRules=asArr(raw.allowed_rule_ids);
  const clientVocab=asArr(raw.allowed_vocab);
  const rules=clientRules.length?clientRules.filter(id=>allowRules.has(id)):resolved.allowed_rule_ids.slice();
  const vocab=clientVocab.length?clientVocab.filter(w=>allowVocab.has(normKey(w))):resolved.allowed_vocab.slice();
  return {ok:true,req:{
    mode,surface,locale:raw.locale==='kk'?'kk':'ru',
    lesson_id,
    exercise_id:clip(raw.exercise_id,80),
    prompt:clip(raw.prompt,400),
    user_answer:clip(raw.user_answer,400),
    expected_answer:clip(raw.expected_answer,400),
    is_correct:!!raw.is_correct,
    hint_used:!!raw.hint_used,
    repeat_count:Math.max(0,parseInt(raw.repeat_count,10)||0),
    rule_ids:asArr(raw.rule_ids).filter(id=>allowRules.has(id)).slice(0,12),
    allowed_rule_ids:rules.length?rules:resolved.allowed_rule_ids,
    allowed_vocab:vocab.length?vocab:resolved.allowed_vocab,
    allowed_lesson_ids:resolved.allowed_lesson_ids,
    candidate_error_codes:asArr(raw.candidate_error_codes).filter(c=>ERROR_CODES.includes(c)).slice(0,8),
    recent_error_summary:raw.recent_error_summary&&typeof raw.recent_error_summary==='object'?raw.recent_error_summary:{},
    rule_context:clipRuleContext(raw.rule_context,allowRules),
    user_question:clip(raw.user_question,400),
    conversation_tail:clipTail(raw.conversation_tail)
  }};
 }
 function validateResponse(raw,req){
  const mode=(req&&req.mode)||'explain_error';
  const allowedRules=new Set((req&&req.allowed_rule_ids)||[]);
  const allowedCodes=new Set(((req&&req.candidate_error_codes)||ERROR_CODES));
  if(!raw||typeof raw!=='object')return {ok:false,resp:fallback(mode,req,'bad_json')};
  const out=emptyResp(mode,true);
  out.ok=raw.ok!==false;
  out.mode=MODES.includes(raw.mode)?raw.mode:mode;
  const code=raw.primary_error_code;
  out.primary_error_code=(code&&allowedCodes.has(code))?code:null;
  out.secondary_error_codes=asArr(raw.secondary_error_codes).filter(c=>allowedCodes.has(c)).slice(0,4);
  out.rule_ids_used=asArr(raw.rule_ids_used).filter(id=>!allowedRules.size||allowedRules.has(id)).slice(0,6);
  out.message_ru=sentenceClip(cleanTutorReply(raw.message_ru||''),maxMessage(out.mode));
  out.micro_rule_ru=raw.micro_rule_ru?clip(raw.micro_rule_ru,220):null;
  const c=raw.contrast&&typeof raw.contrast==='object'?raw.contrast:{};
  out.contrast={wrong:c.wrong?clip(c.wrong,80):null,correct:c.correct?clip(c.correct,80):null};
  out.next_action_ru=raw.next_action_ru?clip(raw.next_action_ru,180):null;
  out.needs_rule_context=!!raw.needs_rule_context;
  out.confidence=['high','medium','low'].includes(raw.confidence)?raw.confidence:'medium';
  out.meta=raw.meta&&typeof raw.meta==='object'?{
    request_id:raw.meta.request_id||null,
    source:['primary','fallback','local'].includes(raw.meta.source)?raw.meta.source:'local',
    model:raw.meta.model||null,
    latency_ms:raw.meta.latency_ms||null,
    recovery:raw.meta.recovery===true||undefined,
    primary_error:raw.meta.primary_error?clip(raw.meta.primary_error,240):null,
    fallback_error:raw.meta.fallback_error?clip(raw.meta.fallback_error,240):null,
    recovery_error:raw.meta.recovery_error?clip(raw.meta.recovery_error,240):null
  }:{request_id:null,source:'local',model:null,latency_ms:null,recovery:undefined,primary_error:null,fallback_error:null,recovery_error:null};
  if(out.mode==='hint'){
    out.contrast.correct=null;
    if(containsExpected({message_ru:out.message_ru,micro_rule_ru:out.micro_rule_ru,next_action_ru:out.next_action_ru,contrast:out.contrast},req&&req.expected_answer)){
      return {ok:false,resp:fallback('hint',req,'hint_leak')};
    }
  }
  out.remediation=null;
  if(!out.message_ru||!isUsableText(out.message_ru)){
    const local=localExplain(req||{mode});
    local.meta={
      request_id:out.meta&&out.meta.request_id||null,
      source:'local',
      model:null,
      latency_ms:out.meta&&out.meta.latency_ms||null,
      recovery:out.meta&&out.meta.recovery===true||undefined,
      primary_error:out.meta&&out.meta.primary_error||null,
      fallback_error:out.meta&&out.meta.fallback_error||null,
      recovery_error:out.meta&&out.meta.recovery_error||null
    };
    return {ok:false,resp:local};
  }
  return {ok:true,resp:out};
 }
 function fallback(mode,req,reason){
  const r=emptyResp(mode,false);
  r.needs_rule_context=reason==='no_context'||reason==='conflict';
  if(mode==='hint')r.message_ru='Проверь правило текущего урока и слот окончания. Полный ответ не показываю.';
  if(reason==='hint_leak')r.message_ru='Подсказка не должна содержать готовый ответ. Проверь правило, затем введи форму целиком.';
  else if(mode==='explain_rule'||mode==='simplify'||mode==='ask_tutor')r.message_ru=(req&&req.rule_context&&req.rule_context[0]&&(req.rule_context[0].medium||req.rule_context[0].explanation_ru||req.rule_context[0].ru_refresh))||'Правило уже на карточке. Можно продолжить упражнение.';
  else if(mode==='session_summary')r.message_ru='Разбор сессии сейчас короткий. Локальные слабые места сохранены.';
  else r.message_ru='Разбор по правилу урока сейчас короткий. Можно продолжить упражнение.';
  r.confidence='low';
  r.meta={request_id:null,source:'local'};
  return r;
 }
 function looksFuture(text,lessonId){const v=String(text||'');return ALWAYS_FUTURE_RE.test(v)||(lessonId!=='3-1'&&lessonId!=='3-2'&&POSS_FUTURE_RE.test(v));}
 function outTokens(mode){return mode==='ask_tutor'?ASK_OUT_TOKENS:MAX_OUT_TOKENS;}
 const api={PRIMARY_MODEL,FALLBACK_MODEL,MODEL_ID,FALLBACK,MODES,SURFACES,ERROR_CODES,ALLOWED_LESSONS,RULE_BY_LESSON,VOCAB_BY_LESSON,FUTURE_RE,MAX_OUT_TOKENS,ASK_OUT_TOKENS,CLIENT_TIMEOUT_MS,PRIMARY_TIMEOUT_MS,FALLBACK_TIMEOUT_MS,SYSTEM,validateRequest,validateResponse,extractJson,normalizeModelText,isUsableText,looksLikePromptLeak,looksLikeBadTutorReply,cleanTutorReply,needsKitabymMechanism,hasKitabymMechanism,emptyResp,fallback,localExplain,assembleResponse,examBlocked,futureBlocked,missingLesson,looksFuture,clip,sentenceClip,contextClip,normKey,resolveCurriculum,lessonsThrough,containsExpected,clipTail,clipRuleContext,maxMessage,outTokens,leverLine};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AiContract=api;
})(typeof window!=='undefined'?window:globalThis);
