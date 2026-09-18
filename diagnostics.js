(function(root){
 'use strict';
 const core=typeof module!=='undefined'&&module.exports?require('./core.js'):root.TrainerCore;
 const labels={plural_initial_consonant:'Множественное: Л/Д/Т',vowel_harmony:'Множественное: гармония А/Е',plural_after_numeral:'Множественное после числа',plural_form:'Множественное: два шага',number_order:'Порядок разрядов',number_confusion:'Перепутано число',letter_confusion:'Различие букв',lexical_retrieval:'Вспоминание слова',translation_variant:'Перевод формы',harmony_wrong_edge:'Неверно выбран край слова',person_sg_initial:'Личное окончание: начало после основы',person_marker_missing:'Не хватает личного окончания',person_biz_initial:'Біз: начало личного окончания',plural_on_predicate:'Лишнее множественное на сказуемом',question_particle_missing:'Не хватает вопросительной частицы',harmony_class:'Твёрдый / мягкий ряд',harmony_pair:'Парные гласные',harmony_edge:'Последний релевантный слог',person_sg_form:'Личное окончание: мен',person_sg_piece:'Кусок личного окончания: мен',person_pl_form:'Личное окончание: множественные лица',emes_position:'Емес: куда ставится личное окончание',person_sen_siz:'Сен / сіз',ordinal_20:'Порядковое: 20-е',ol_suffix:'Ол без личного окончания',question_class:'Вопросительная частица',unclassified:'Нужно сверить весь ответ'};
 const SKILL={plural_initial_consonant:'rule:plural::ldt',vowel_harmony:'rule:plural::harmony',plural_after_numeral:'rule:plural_after_num',plural_form:'rule:plural',translation_variant:'rule:translation::recognition',harmony_wrong_edge:'rule:harmony',person_sg_initial:'rule:person::sg',person_marker_missing:'rule:person::sg',person_biz_initial:'rule:person::pl',plural_on_predicate:'rule:person::pl',question_particle_missing:'rule:question::particle',harmony_class:'rule:harmony',harmony_pair:'rule:harmony',harmony_edge:'rule:harmony',person_sg_form:'rule:person::sg',person_sg_piece:'rule:person::sg',person_pl_form:'rule:person::pl',number_order:'rule:numeral::assemble',number_confusion:'rule:numeral::atom',emes_position:'rule:emes::position',person_sen_siz:'rule:person::sen_siz',ordinal_20:'rule:ordinal::exception_20',ol_suffix:'rule:third_person::no_personal_suffix',question_class:'rule:question::consonant_class'};
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
   if(!out.length&&q.topic==='numbers'){
     if(/алты/.test(e)&&/алпыс/.test(a)||/алпыс/.test(e)&&/алты/.test(a))out.push('number_confusion');
     else out.push(e.split(' ').sort().join(' ')===a.split(' ').sort().join(' ')?'number_order':'number_confusion');
   }
   if(!out.length&&e.length===a.length){const diff=[...e].map((c,i)=>[c,a[i]]).filter(([x,y])=>x!==y);if(diff.length===1&&['ыі','ұү','кқ','гғ','нң','аә','оө','иі'].some(pair=>diff[0].every(x=>pair.includes(x))))out.push('letter_confusion');}
   return out.length?out:[q.topic==='vocab'?'lexical_retrieval':'unclassified'];
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
 function line(error_type){
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
    number_confusion:'Перепутаны похожие числа.'
  }[error_type]||'';
 }
 function diagnose(q,answers,result,at){
   if(q.kind!=='fields'&&q.kind!=='phrase')return [];
   return q.fields.flatMap((f,i)=>result.parts[i]?[]:classify(f.answers[0],answers[i],q,f).map(error_type=>({expected_answer:f.answers[0],actual_answer:String(answers[i]||''),error_type,skill_tag:skillTag(error_type,q,f.answers[0],answers[i]),timestamp:at,field:i,card_id:q.id})));
 }
 const api={classify,diagnose,labels,skillTag,line,SKILL};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ErrorDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
