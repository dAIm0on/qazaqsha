(function(root){
 'use strict';
 const core=typeof module!=='undefined'&&module.exports?require('./core.js'):root.TrainerCore;
 const labels={plural_initial_consonant:'Множественное: Л/Д/Т',vowel_harmony:'Множественное: гармония А/Е',plural_after_numeral:'Множественное после числа',plural_form:'Множественное: два шага',number_order:'Порядок разрядов',number_confusion:'Перепутано число',letter_confusion:'Различие букв',lexical_retrieval:'Вспоминание слова',translation_variant:'Перевод формы',harmony_wrong_edge:'Неверно выбран край слова',person_sg_initial:'Личное окончание: начало после основы',person_marker_missing:'Не хватает личного окончания',person_biz_initial:'Біз: начало личного окончания',plural_on_predicate:'Лишнее множественное на сказуемом',question_particle_missing:'Не хватает вопросительной частицы',harmony_class:'Твёрдый / мягкий ряд',harmony_pair:'Парные гласные',harmony_edge:'Последний релевантный слог',person_sg_form:'Личное окончание: мен',person_sg_piece:'Кусок личного окончания: мен',person_pl_form:'Личное окончание: множественные лица',emes_position:'Емес: куда ставится личное окончание',person_sen_siz:'Сен / сіз',ordinal_20:'Порядковое: 20-е',ol_suffix:'Ол без личного окончания',question_class:'Вопросительная частица',poss_suffix_missing:'Притяжательное: не хватает наклейки',poss_assim_voice:'Притяжательное: озвончение П/К/Қ',bar_zhok_choice:'Бар / жоқ: наличие или отсутствие',bar_zhok_not_emes:'Жоқ ≠ емес',poss_plural_order:'Притяжательное множественное: порядок суффиксов',poss_phrase:'Притяжательная фраза',poss_owner_form:'Притяжательное: форма владельца',POSS_NO_SUFFIX:'Притяжательное: нет наклейки',POSS_WRONG_PERSON:'Притяжательное: чужое лицо',POSS_ORDER:'Притяжательное: порядок много→чьё',POSS_ASSIM:'Притяжательное: озвончение',POSS_GLIDE:'Притяжательное: связка после У/И/Ю',POSS_2PL_NO_PL:'Сендердің: нет куска «много»',POSS_2PL_READINGS:'Одна форма — несколько переводов',POSS_OLAR_FORCE_PL:'Олардың: «много» не всегда',DEIXIS_BARE:'Указательное не живёт одно',DEIXIS_OL:'Ол «он» и ол «тот»',PERSON_ON_POSS:'«Кто есть» вместо «чьё»',unclassified:'Нужно сверить весь ответ'};
 const SKILL={plural_initial_consonant:'rule:plural::ldt',vowel_harmony:'rule:plural::harmony',plural_after_numeral:'rule:plural_after_num',plural_form:'rule:plural',translation_variant:'rule:translation::recognition',harmony_wrong_edge:'rule:harmony',person_sg_initial:'rule:person::sg',person_marker_missing:'rule:person::sg',person_biz_initial:'rule:person::pl',plural_on_predicate:'rule:person::pl',question_particle_missing:'rule:question::particle',harmony_class:'rule:harmony',harmony_pair:'rule:harmony',harmony_edge:'rule:harmony',person_sg_form:'rule:person::sg',person_sg_piece:'rule:person::sg',person_pl_form:'rule:person::pl',number_order:'rule:numeral::assemble',number_confusion:'rule:numeral::atom',emes_position:'rule:emes::position',person_sen_siz:'rule:person::sen_siz',ordinal_20:'rule:ordinal::exception_20',ol_suffix:'rule:third_person::no_personal_suffix',question_class:'rule:question::consonant_class',poss_suffix_missing:'rule:poss::suffix',poss_assim_voice:'rule:poss::assim_voice',bar_zhok_choice:'rule:bar_zhok',bar_zhok_not_emes:'rule:bar_zhok::not_emes',poss_plural_order:'rule:poss::plural_order',poss_phrase:'rule:poss::phrase',poss_owner_form:'rule:poss::owner_form',POSS_NO_SUFFIX:'rule:poss::suffix',POSS_WRONG_PERSON:'rule:poss::owner_form',POSS_ORDER:'rule:poss::plural_order',POSS_ASSIM:'rule:poss::assim_voice',POSS_GLIDE:'rule:poss::glide',POSS_2PL_NO_PL:'rule:poss::sender_plural',POSS_2PL_READINGS:'rule:poss::readings',POSS_OLAR_FORCE_PL:'rule:poss::olar',DEIXIS_BARE:'rule:deixis::bare',DEIXIS_OL:'rule:deixis::ol',PERSON_ON_POSS:'rule:poss::not_person'};
 function classify(expected,actual,q={},field={}){
   const e=core.normalize(expected,field.kind),a=core.normalize(actual,field.kind);if(e===a)return [];
   const out=[],suffix=/[лдт][ае]р$/u;
   if((q.ruleIds||[]).includes('quantity')||q.skill_type==='plural_suppression'||/\d|екі|он|бес|көп|аз|қанша|неше/.test(q.stimulus||'')){
     const stripped=a.split(' ').map(s=>suffix.test(s)?s.slice(0,-3):s).join(' ');
     if(stripped===e&&a!==e)out.push('plural_after_numeral');
   }
   if(suffix.test(e)&&suffix.test(a)&&e.slice(0,-3)===a.slice(0,-3)){
     if(e.at(-3)!==a.at(-3))out.push('plural_initial_consonant');
     if(e.at(-2)!==a.at(-2))out.push('vowel_harmony');
   }
   if(['а','е'].includes(e)&&['а','е'].includes(a))out.push('vowel_harmony');
   if(['л','д','т'].includes(e)&&['л','д','т'].includes(a))out.push('plural_initial_consonant');
   if(/емес/.test(e)&&/емес/.test(a)&&(e.replace(/емес\s+\S+$/,'емес')!==a.replace(/емес\s+\S+$/,'емес')||/(мын|мін|бын|бін|пын|пін)\s+емес/.test(a)))out.push('emes_position');
   if(/жиырмасыншы/.test(e)&&/жиырманшы/.test(a))out.push('ordinal_20');
   if(/^ол /.test(e)&&/мін$|мын$|сың$|сіз$/.test(a))out.push('ol_suffix');
   if(/сен|сіз/.test(e)&&((/сыз|сіз/.test(e)&&/сың|сің/.test(a))||(/сың|сің/.test(e)&&/сыз|сіз/.test(a))))out.push('person_sen_siz');
   if(!out.length&&q.phase2b&&q.phase2b.error_type)out.push(q.phase2b.error_type);
   if(!out.length&&q.phase3&&q.phase3.error_type)out.push(q.phase3.error_type);
   if(!out.length&&q.topic==='numbers'){
     if(/алты/.test(e)&&/алпыс/.test(a)||/алпыс/.test(e)&&/алты/.test(a))out.push('number_confusion');
     else out.push(e.split(' ').sort().join(' ')===a.split(' ').sort().join(' ')?'number_order':'number_confusion');
   }
   if(!out.length&&e.length===a.length){const diff=[...e].map((c,i)=>[c,a[i]]).filter(([x,y])=>x!==y);if(diff.length===1&&['ыі','ұү','кқ','гғ','нң','аә','оө','иі'].some(pair=>diff[0].every(x=>pair.includes(x))))out.push('letter_confusion');}
   return out.length?out:[q.topic==='vocab'?'lexical_retrieval':'unclassified'];
 }
 const MICRO={
  person_sg_initial:{item_id:'rule:person',skill_type:'sg_initial'},
  person_marker_missing:{item_id:'rule:person',skill_type:'marker_presence'},
  person_sen_siz:{item_id:'rule:person',skill_type:'sen_siz'},
  person_biz_initial:{item_id:'rule:person-pl',skill_type:'biz_initial'},
  plural_on_predicate:{item_id:'rule:person-pl',skill_type:'no_extra_plural'},
  emes_position:{item_id:'rule:person-neg',skill_type:'position'},
  question_particle_missing:{item_id:'rule:person-q',skill_type:'presence'},
  question_class:{item_id:'rule:person-q',skill_type:'class'}
 };
 function microBinding(error_type){
  const row=MICRO[error_type];
  return row?{item_id:row.item_id,skill_type:row.skill_type}:null;
 }
 function ordinalSkill(stimulus,answers){
  const stim=String(stimulus||'');
  const ans=Array.isArray(answers)?answers.join(' '):String(answers||'');
  const blob=stim+' '+ans;
  if(/жиырмасыншы/.test(ans)&&!/бірінші|екінші/.test(ans))return 'exception_20';
  if(/жиырма\s+бірінші|он\s+екінші|қырық\s+бірінші/.test(blob))return 'last_component';
  if(/[мс]ін$|сыңдар|сіздер|мын$/.test(core.normalize(ans))&&/інші|ыншы|нші|ншы/.test(ans))return 'application';
  if(/\s/.test(stim)&&/інші|ыншы|ншы|нші/.test(ans))return 'last_component';
  return 'suffix_family';
 }
 function skillTag(error_type,q,expected,actual){
  if(error_type==='number_confusion'){
    const blob=(expected||'')+' '+(actual||'');
    if(/алты|алпыс/.test(blob))return 'confuse:алты_алпыс';
    if(/сегіз|сексен/.test(blob))return 'confuse:сегіз_сексен';
    if(/жеті|жетпіс/.test(blob))return 'confuse:жеті_жетпіс';
    if(/тоғыз|тоқсан/.test(blob))return 'confuse:тоғыз_тоқсан';
  }
  if(error_type==='lexical_retrieval'&&q&&q.vocabIds&&q.vocabIds[0])return q.vocabIds[0]+'::production';
  return SKILL[error_type]||('card:'+(q&&q.id||''));
 }
 function display(v){return String(v??'').trim().replace(/[?.!]+$/u,'');}
 function pluralForm(v){
  const x=core.normalize(v),m=x.match(/^(.*?)([лдт][ае]р)$/u);
  return m?{stem:m[1],suffix:m[2]}:null;
 }
 function baseFrom(q,fallback){
  const raw=String(q&&q.stimulus||'').split(/[+→·]/u)[0].trim();
  const words=core.normalize(raw).split(/\s+/u).filter(Boolean);
  return words.length?words[words.length-1]:String(fallback||'');
 }
 function lastLetter(v){const a=[...String(v||'')];return (a[a.length-1]||'').toUpperCase();}
 function commonPrefix(a,b){
  const x=core.normalize(a),y=core.normalize(b);let i=0;
  while(i<x.length&&i<y.length&&x[i]===y[i])i++;
  return x.slice(0,i).trim();
 }
 function questionPart(v){
  const x=core.normalize(v),m=x.match(/(?:^|\s)(ма|ме|ба|бе|па|пе)$/u);
  return m?m[1]:'';
 }
 function line(error_type,expected,actual,q){
  const E=display(expected),A=display(actual);
  if(error_type==='plural_initial_consonant'){
    const ep=pluralForm(E),ap=pluralForm(A);
    if(ep&&ap&&ep.suffix!==ap.suffix){
      const base=ep.stem||baseFrom(q,ep.stem),last=lastLetter(base),need=ep.suffix[0].toUpperCase();
      if(last)return 'Ты выбрала -'+ap.suffix+'. После '+last+' множественное начинается с '+need+', поэтому '+E+'.';
    }
  }
  if(error_type==='plural_after_numeral'&&E&&A){
    const n=(core.normalize(E).split(/\s+/u)[0]||core.normalize(q&&q.stimulus||'').split(/\s+/u)[0]||'числа');
    return 'После числа '+n+' множественное окончание не ставится: '+E+', не '+A+'.';
  }
  if(error_type==='person_sg_form'||error_type==='person_sg_piece'){
    const p=commonPrefix(E,A)||baseFrom(q,''),last=lastLetter(p||baseFrom(q,''));
    const eNorm=core.normalize(E),aNorm=core.normalize(A);
    const need=p&&eNorm.startsWith(p)?eNorm.slice(p.length):eNorm;
    const used=p&&aNorm.startsWith(p)?aNorm.slice(p.length):aNorm;
    if(last&&need&&used&&need!==used)return 'Ты выбрала -'+used+'. После '+last+' личное окончание для мен начинается с '+need[0].toUpperCase()+': '+E+'.';
  }
  if(error_type==='person_marker_missing'&&E){
    const en=core.normalize(E),an=core.normalize(A);
    const suffix=an&&en.startsWith(an)?en.slice(an.length):'';
    return 'Не хватает личного окончания'+(suffix?' «-'+suffix+'»':'')+': нужно '+E+'.';
  }
  if(error_type==='person_biz_initial'&&E&&A){
    const p=commonPrefix(E,A)||baseFrom(q,''),last=lastLetter(p||baseFrom(q,''));
    if(last)return 'После '+last+' форма біз начинается с правильного согласного: '+E+', не '+A+'.';
  }
  if(error_type==='emes_position'&&E&&A)return 'Личное окончание должно стоять на емес: '+E+', не '+A+'.';
  if(error_type==='ol_suffix'&&E&&A)return 'У ол/олар личного окончания нет: '+E+', не '+A+'.';
  if(error_type==='question_class'&&E&&A){
    const ep=questionPart(E),ap=questionPart(A);
    // Prefer stem from expected answer: stimulus often ends with the wrong particle (ба?), which must not become lastLetter.
    const fromExpected=core.normalize(E).replace(/\s+(ма|ме|ба|бе|па|пе)$/u,'').split(/\s+/u).pop();
    const fromStim=String(baseFrom(q,fromExpected)||'').replace(/(?:ма|ме|ба|бе|па|пе)$/u,'');
    const base=(fromStim&&!/^(ма|ме|ба|бе|па|пе)$/u.test(fromStim))?fromStim:(fromExpected||'');
    const last=lastLetter(base);
    if(ep&&ap&&last)return 'Ты выбрала '+ap+'. После '+last+' вопросительная частица начинается с '+ep[0].toUpperCase()+': '+ep+', не '+ap+'.';
  }
  if(error_type==='question_particle_missing'&&E)return 'Не хватает отдельной вопросительной частицы: нужно '+E+'.';
  if((error_type==='poss_suffix_missing'||error_type==='POSS_NO_SUFFIX')&&E){
   const raw=core.normalize(q&&q.stimulus||''),m=raw.match(/(менің|сенің|оның|сіздің|біздің|сендердің|сіздердің|олардың)\s*(?:\+\s*|\s+)([а-яәіңғүұқөһ]+)/u);
   const pron=m&&m[1]||'притяжательной формы',base=m&&m[2]||'основы';
   return 'Для '+pron+' нужна притяжательная наклейка справа: '+base+' → '+E+'.';
  }
  if((error_type==='poss_assim_voice'||error_type==='POSS_ASSIM')&&E){
   const en=core.normalize(E),an=core.normalize(A),pairs={'п':'б','к':'г','қ':'ғ'};
   let from='',to='';
   const n=Math.min(en.length,an.length);
   for(let i=0;i<n;i++){
    if(en[i]===an[i])continue;
    for(const [f,t] of Object.entries(pairs)){
     if(an[i]===f&&en[i]===t){from=f.toUpperCase();to=t.toUpperCase();break;}
    }
    if(from)break;
   }
   if(!from){
    const raw=core.normalize(q&&q.stimulus||'');
    from=/кітап|мектеп/.test(raw)?'П':/жүрек/.test(raw)?'К':/саусақ|қонақ/.test(raw)?'Қ':'П/К/Қ';
    to=from==='П'?'Б':from==='К'?'Г':from==='Қ'?'Ғ':'звонкую пару';
   }
   return 'Перед гласной притяжательного окончания '+from+' озвончается в '+to+': нужно '+E+'.';
  }
  if(error_type==='bar_zhok_not_emes'&&E)return 'Здесь речь об отсутствии: нужно жоқ, не емес. Емес = «не является», жоқ = «нет / отсутствует»: '+E+'.';
  if(error_type==='bar_zhok_choice'&&E&&A)return 'Для наличия используй бар, для отсутствия — жоқ. Правильная форма: '+E+'.';
  if((error_type==='poss_plural_order'||error_type==='POSS_ORDER')&&E){
   const raw=core.normalize(q&&q.stimulus||'');
   if(/кітабымыздар/.test(raw)||/кітаптарымыз/.test(E))return 'Порядок такой: кітап + тар + ымыз → кітаптарымыз. Сначала «много», потом «чьё»; поэтому не кітабымыздар.';
   if(/кітабымдар/.test(raw)||/кітап/.test(E))return 'Порядок такой: кітап + тар + ым → кітаптарым. Сначала множественное, потом притяжательное; поэтому не кітабымдар и П не озвончается.';
   if(/мысығымдар/.test(raw)||/мысық/.test(E))return 'Порядок такой: мысық + тар + ым → мысықтарым. Сначала множественное, потом притяжательное; поэтому не мысығымдар и Қ не озвончается.';
   return 'Сначала ставится множественное окончание, потом притяжательное: нужно '+E+'.';
  }
  if(error_type==='poss_phrase'&&E)return 'Собери всю притяжательную фразу: владелец + правильная форма слова. Правильный ответ: '+E+'.';
  if(error_type==='poss_owner_form'&&E&&A)return 'Для оның нужна форма третьего лица: қала → қаласы. Окончание -м относится к менің, поэтому '+A+' здесь неверно. Нужно '+E+'.';
  if(error_type==='POSS_WRONG_PERSON'&&E&&A)return 'Чужая наклейка «чьё»: в '+A+' хвост не от этого владельца. Нужно '+E+'.';
  if(error_type==='POSS_GLIDE'&&E)return 'У / и / ю — согласные, нужна связка ы/і: '+E+', не '+A+'.';
  if(error_type==='POSS_2PL_NO_PL'&&E)return 'В модели этого урока у сендердің / сіздердің кусок «много» ставится даже для одной руки: сендердің қолдарың, не *қолың. Нужно '+E+'.';
  if(error_type==='POSS_2PL_READINGS'&&E)return 'Эта форма держит несколько чтений ключа. Один перевод неполный. Нужны все: '+E+'.';
  if(error_type==='POSS_OLAR_FORCE_PL'&&E)return 'У олардың «много» можно, не обязательно на один объект. Живое: '+E+'.';
  if(error_type==='DEIXIS_BARE'&&E)return 'В модели урока мына пишем при слове: *мына — кітап в упражнении не принимается. Осы кітап и сол кітап тренируем. Нужно '+E+'.';
  if(error_type==='DEIXIS_OL'&&E)return 'Ол «он» и ол «тот» — разные чтения. Нужно '+E+'.';
  if(error_type==='PERSON_ON_POSS'&&E)return 'Сюда попал кусок «кто есть», а нужен «чьё». көршісің = ты сосед, не «твой сосед». Живое: '+E+'.';
  return {
    vowel_harmony:'Гармония: гласная окончания неверна.',
    plural_initial_consonant:'Стык Л/Д/Т выбран неверно.',
    plural_after_numeral:'После числа множественное окончание не нужно.',
    plural_form:'Проверь оба шага множественного: гласную А/Е и начало Л/Д/Т.',
    translation_variant:'Проверь значение всей формы и число: единственное или множественное.',
    harmony_wrong_edge:'Ошибка в выборе края: для окончания решает последний релевантный слог.',
    person_sg_initial:'Проверь стык: после С личное окончание для мен начинается с П.',
    person_marker_missing:'Не хватает личного окончания — куска «кто есть».',
    person_biz_initial:'После М в форме біз начало личного окончания — Б.',
    plural_on_predicate:'Множественность уже задана местоимением; отдельное -тар на сказуемом не нужно.',
    question_particle_missing:'В закрытом вопросе не хватает отдельной вопросительной частицы.',
    harmony_class:'Неверно определён твёрдый или мягкий ряд.',
    harmony_pair:'Неверно выбрана парная гласная другого ряда.',
    harmony_edge:'Для окончания смотри на последний релевантный слог справа.',
    person_sg_form:'Проверь личное окончание по лицу и последнему звуку основы.',
    person_sg_piece:'Проверь первый звук личного окончания по последнему звуку основы.',
    person_pl_form:'Проверь личное окончание множественного лица по последнему звуку основы.',
    emes_position:'Личное окончание должно стоять на емес.',
    person_sen_siz:'Перепутаны сен и сіз.',
    ordinal_20:'Правильно: жиырмасыншы, не жиырманшы.',
    ol_suffix:'У ол/олар личного окончания нет.',
    question_class:'Неверная семья частицы па/ба/ма.',
    poss_suffix_missing:'Не хватает притяжательной наклейки справа.',
    poss_assim_voice:'Перед гласной притяжательного окончания нужно озвончение П/К/Қ.',
    bar_zhok_choice:'Выбери бар для наличия или жоқ для отсутствия.',
    bar_zhok_not_emes:'Для отсутствия нужен жоқ, а не емес.',
    poss_plural_order:'Сначала множественное окончание, потом притяжательное.',
    poss_phrase:'Проверь владельца и притяжательную форму целиком.',
    poss_owner_form:'Притяжательная форма должна соответствовать владельцу.',
    POSS_NO_SUFFIX:'Не хватает притяжательной наклейки справа.',
    POSS_WRONG_PERSON:'Чужая наклейка «чьё».',
    POSS_ORDER:'Сначала «много», потом «чьё».',
    POSS_ASSIM:'Перед гласной наклейкой П/К/Қ оживают.',
    POSS_GLIDE:'После у/и/ю нужна связка ы/і.',
    POSS_2PL_NO_PL:'В модели урока у сендердің сначала «много».',
    POSS_2PL_READINGS:'Нужны все чтения ключа, не одно.',
    POSS_OLAR_FORCE_PL:'У олардың «много» не обязательно.',
    DEIXIS_BARE:'В модели урока это указательное пишем при слове.',
    DEIXIS_OL:'Не мешай ол «он» и ол «тот».',
    PERSON_ON_POSS:'Это кусок «кто есть», не «чьё».',
    number_confusion:'Перепутаны похожие числа.'
  }[error_type]||'';
 }
 function diagnose(q,answers,result,at){
   if(q.kind!=='fields'&&q.kind!=='phrase')return [];
   return q.fields.flatMap((f,i)=>result.parts[i]?[]:classify(f.answers[0],answers[i],q,f).map(error_type=>({expected_answer:f.answers[0],actual_answer:String(answers[i]||''),error_type,skill_tag:skillTag(error_type,q,f.answers[0],answers[i]),timestamp:at,field:i,card_id:q.id})));
 }
 function pauseLine(kind,value){
  if(kind==='savings')return String(value);
  if(kind==='first-try'||kind==='peek-rate'||kind==='transfer-rate')return kind+' '+value;
  return String(value||'');
 }
 const api={classify,diagnose,labels,skillTag,line,pauseLine,SKILL,MICRO,microBinding,ordinalSkill};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ErrorDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
