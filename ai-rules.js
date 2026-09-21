/* Grounded rule cards from current open course 1-1…3-1. */
(function(root){
 'use strict';
 const hw=typeof module!=='undefined'&&module.exports?require('./homework.js'):root.Homework;
 const CARDS=[
  {rule_id:'T1_HARMONY',lesson_id:'1-1',course_rule:'harmony',title_ru:'Гармония последнего слога',explanation_ru:'Для окончания смотри последний слог. Задний ряд А О Ұ Ы → А. Передний Ә Ө Ү І Е → Е. И и У сами ряд не задают.',examples_correct:['қалалар','сөздер'],examples_wrong:[],error_codes:['HARMONY_FRONT_BACK','HARMONY_AMBIGUOUS_I_U_YU','PLURAL_HARMONY_AE']},
  {rule_id:'T2_PLURAL_LDT',lesson_id:'1-2',course_rule:'plural',title_ru:'Множественное: Л / Д / Т',explanation_ru:'После гармонии смотри последнюю букву: гласные, Р, Й, У → лар/лер; Л М Н Ң Ж З → дар/дер; глухие и Б В Г Д → тар/тер.',ru_refresh:'В русском множественное часто одно: -ы/-и. В казахском сначала гармония, потом стык Л/Д/Т по последней букве.',examples_correct:['адамдар','кітаптар'],examples_wrong:['адамлар'],traps:['адамлар'],error_codes:['PLURAL_INITIAL_LDT','PLURAL_FORM_COMBINED']},
  {rule_id:'T4_NO_PLURAL_AFTER_NUMBER',lesson_id:'1-3',course_rule:'quantity',title_ru:'После числа множественное не ставится',explanation_ru:'После конкретного числительного существительное без суффикса множественного числа. То же после аз, көп, қанша, неше.',ru_refresh:'В русском «пять книг» — множественное. В казахском число бес уже говорит «сколько», поэтому кітап без окончания множественного: бес кітап.',examples_correct:['бес кітап','он студент'],examples_wrong:['бес кітаптар'],traps:['бес кітаптар'],error_codes:['PLURAL_AFTER_NUMBER','QUANTIFIER_NO_PLURAL']},
  {rule_id:'T5_NUMERAL_CONFUSION',lesson_id:'1-3',course_rule:'contrast',title_ru:'Единица и десяток одной семьи',explanation_ru:'6 алты — 60 алпыс. 7 жеті — 70 жетпіс. 8 сегіз — 80 сексен. 9 тоғыз — 90 тоқсан. Различаются окончанием, не началом.',ru_refresh:'Это как русские шесть и шестьдесят: похожее начало, разные слова, не одно окончание.',examples_correct:['алты','алпыс','жеті','жетпіс'],examples_wrong:[],traps:['алты↔алпыс'],error_codes:['NUMERAL_CONFUSION_6_60','NUMERAL_CONFUSION_7_70','NUMERAL_CONFUSION_8_80','NUMERAL_CONFUSION_9_90']},
  {rule_id:'T5_NUMERAL_COMPOSE',lesson_id:'1-3',course_rule:'numbers',title_ru:'Сборка составного числа',explanation_ru:'Сначала большая часть, потом меньшая. Между частями пробел, без «и». 100 = жүз. 1001–1999 начинай с бір мың.',examples_correct:['жетпіс бес мың тоғыз жүз елу'],examples_wrong:[],error_codes:['NUMERAL_COMPOSITION','NUMERAL_HUNDREDS_THOUSANDS','NUMERAL_LEXEME']},
  {rule_id:'T6_PERSON_SG',lesson_id:'2-1',course_rule:'person',title_ru:'Личные окончания ед. числа',explanation_ru:'Мен: пың/бын/мын. Сен: сың/сің. Сіз: сыз/сіз. Гласная по гармонии. Местоимение можно не писать.',examples_correct:['қазақпын','мамансыз'],examples_wrong:[],error_codes:['PERSON_MEN_ENDING','PERSON_SEN_ENDING','PERSON_SIZ_ENDING']},
  {rule_id:'T7_EMES',lesson_id:'2-1',course_rule:'emes_ba',title_ru:'Емес: окончание на емес',explanation_ru:'Отрицание: основа + емес + личное окончание. Не наоборот.',examples_correct:['ғалым емеспін'],examples_wrong:['ғалыммын емес'],error_codes:['EMES_SUFFIX_POSITION']},
  {rule_id:'T8_PERSON_PL',lesson_id:'2-2',course_rule:'person-pl',title_ru:'Біз / сендер / сіздер',explanation_ru:'Біз: пыз/быз/мыз. Сендер: сыңдар/сіңдер. Сіздер: сыздар/сіздер. С сендер и сіздер -лар на основу не ставим.',examples_correct:['студентсіңдер','құрбысыңдар'],examples_wrong:['студентларсыңдар'],error_codes:['PERSON_BIZ_ENDING','PERSON_SENDER_ENDING','PERSON_SIZDER_ENDING','NO_EXTRA_PLURAL_WITH_PERSON']},
  {rule_id:'T8_ADJ_PRED',lesson_id:'2-2',course_rule:'person-pl',title_ru:'Прилагательное-сказуемое',explanation_ru:'В рамках 2-2 прилагательное может быть сказуемым с личным окончанием по уже введённым лицам.',examples_correct:['Олар байлар'],examples_wrong:[],error_codes:['PREDICATIVE_ADJECTIVE']},
  {rule_id:'T9_OL',lesson_id:'2-3',course_rule:'ol',title_ru:'Ол / олар без личной бирки',explanation_ru:'Ол и олар бирки мын/сың/сыз не берут. Ол мұғалім, не *ол мұғаліммін.',examples_correct:['Ол мұғалім'],examples_wrong:['ол мұғаліммін'],error_codes:['OL_OLAR']},
  {rule_id:'T10_QUESTION',lesson_id:'2-3',course_rule:'question',title_ru:'Вопросительная частица',explanation_ru:'Частица смотрит на последнюю букву последнего слова. Глухие → па/пе. М Н Ң Ж З → ба/бе. Иначе ма/ме. Гласная по гармонии.',examples_correct:['Ол қонақ па?'],examples_wrong:[],error_codes:['QUESTION_PARTICLE','QUESTION_PARTICLE_HARMONY','QUESTION_PARTICLE_PHONOLOGY']},
  {rule_id:'T11_ORDINAL',lesson_id:'2-3',course_rule:'ordinal',title_ru:'Порядковое число',explanation_ru:'Сначала обычное число. Наклейка только на последнее слово. На согласную ыншы/інші, на гласную ншы/нші. Жиырмасыншы, не жиырманшы.',examples_correct:['жиырмасыншы','он екінші'],examples_wrong:['жиырманшы'],error_codes:['ORDINAL_SUFFIX']},
  {rule_id:'T20_POSS',lesson_id:'3-1',course_rule:'possessive',title_ru:'Притяжательная форма',explanation_ru:'Если слева менің, сенің, сіздің или оның, предмет справа получает притяжательное окончание. Менің әкем, сенің досың, оның қаласы.',examples_correct:['менің әкем','сенің досың','оның қаласы'],examples_wrong:['менің әке'],error_codes:['POSS_PRONOUN','POSS_PERSON_SUFFIX','POSS_HARMONY','POSS_VOWEL_BUFFER','POSS_ADJ_POSITION','POSS_OWNER_FORM']},
  {rule_id:'T21_POSS_ASSIM',lesson_id:'3-1',course_rule:'poss-assim',title_ru:'Озвончение П / К / Қ',explanation_ru:'Перед гласным притяжательным окончанием конечные п, к, қ озвончаются: п→б, к→г, қ→ғ. кітап + ым → кітабым.',examples_correct:['кітабым','жүрегім','қонағым'],examples_wrong:['кітапым','жүрекім'],error_codes:['POSS_ASSIM_VOICE']},
  {rule_id:'T22_BAR_ZHOK',lesson_id:'3-1',course_rule:'bar-zhok',title_ru:'Бар / жоқ: наличие и отсутствие',explanation_ru:'Бар = есть/имеется. Жоқ = нет/отсутствует. Емес = не является и не заменяет жоқ в конструкции «у меня нет».',examples_correct:['менің көлігім бар','менің көлігім жоқ'],examples_wrong:['менің көлігім емес'],error_codes:['BAR_ZHOK']},
  {rule_id:'T23_POSS_PL',lesson_id:'3-1',course_rule:'poss-plural',title_ru:'Множественное перед притяжательным',explanation_ru:'Сначала множественное, потом притяжательное: кітап + тар + ым → кітаптарым. Не *кітабымдар.',examples_correct:['кітаптарым','мысықтарым'],examples_wrong:['кітабымдар'],error_codes:['POSS_PLURAL_ORDER']},
  {rule_id:'T24_POSS_BIZ',lesson_id:'3-2',course_rule:'poss_biz',title_ru:'Наш: мыз вместо ңыз',explanation_ru:'',examples_correct:['біздің әкеміз'],examples_wrong:['біздің әке'],error_codes:['POSS_NO_SUFFIX','POSS_ASSIM','POSS_ORDER','POSS_GLIDE','POSS_WRONG_PERSON']},
  {rule_id:'T25_POSS_SENDER',lesson_id:'3-2',course_rule:'poss_sender',title_ru:'Сендердің и сіздердің: сначала всегда много',explanation_ru:'',examples_correct:['сендердің қолдарың'],examples_wrong:['сендердің қолың'],error_codes:['POSS_2PL_NO_PL','POSS_WRONG_PERSON','PERSON_ON_POSS']},
  {rule_id:'T26_POSS_OLAR',lesson_id:'3-2',course_rule:'poss_olar',title_ru:'Их: наклейка как у оның',explanation_ru:'',examples_correct:['олардың інісі'],examples_wrong:['олардың іні'],error_codes:['POSS_NO_SUFFIX','POSS_OLAR_FORCE_PL','POSS_2PL_READINGS']},
  {rule_id:'T27_DEIXIS',lesson_id:'3-2',course_rule:'deixis',title_ru:'Это и тот — не все слова живут одни',explanation_ru:'',examples_correct:['мына кітап жақсы'],examples_wrong:['мына — кітап'],error_codes:['DEIXIS_BARE','DEIXIS_OL']}
 ];
 function byId(id){return CARDS.find(c=>c.rule_id===id)||null;}
 function byCourse(rule){return CARDS.filter(c=>c.course_rule===rule);}
 function byError(code){return CARDS.filter(c=>c.error_codes.includes(code));}
 function cardsFor(q,code){
  const out=[];
  if(code)out.push(...byError(code));
  if(q&&q.ruleIds){
   for(const r of q.ruleIds){
    if(r==='quantity'||r==='без_мн')out.push(...byCourse('quantity'));
    else if(r==='plural'||r==='стык_мн')out.push(...byCourse('plural'));
    else if(r==='harmony'||r==='рычаг_A')out.push(...byCourse('harmony'));
    else if(r==='ordinal'||r==='порядковые')out.push(...byCourse('ordinal'));
    else if(r==='person'||r==='лицо_мен')out.push(...byCourse('person'));
    else if(r==='лицо_биз')out.push(...byCourse('person-pl'));
    else if(r==='емес')out.push(...byCourse('emes_ba'));
    else if(r==='ol'||r==='ол_без_бирки')out.push(...byCourse('ol'));
    else if(r==='question'||r==='вопрос'||r==='ba_me')out.push(...byCourse('question'));
    else if(r==='contrast')out.push(...byCourse('contrast'));
    else if(r==='numbers'||r==='разряды')out.push(...byCourse('numbers'),...byCourse('contrast'));
    else if(r==='T1_HARMONY'||r==='T2_PLURAL_LDT'||r==='T4_NO_PLURAL_AFTER_NUMBER'||r==='T5_NUMERAL_CONFUSION'||r==='T5_NUMERAL_COMPOSE'||r==='T6_PERSON_SG'||r==='T7_EMES'||r==='T8_PERSON_PL'||r==='T8_ADJ_PRED'||r==='T9_OL'||r==='T10_QUESTION'||r==='T11_ORDINAL'||r==='T20_POSS'||r==='T21_POSS_ASSIM'||r==='T22_BAR_ZHOK'||r==='T23_POSS_PL'){const hit=byId(r);if(hit)out.push(hit);}
   }
  }
  const seen=new Set();
  return out.filter(c=>seen.has(c.rule_id)?false:seen.add(c.rule_id));
 }
 function allowedVocab(lessonIds){
  const src=hw&&hw.WORD_LEMMAS||{};
  const ids=lessonIds&&lessonIds.length?lessonIds:['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2'];
  const out=[];
  for(const id of ids)for(const w of src[id]||[])if(!out.includes(w))out.push(w);
  return out;
 }
 function allowedRuleIds(lessonIds){
  const max=new Set(lessonIds&&lessonIds.length?lessonIds:['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2']);
  return CARDS.filter(c=>max.has(c.lesson_id)).map(c=>c.rule_id);
 }
 function toRuleContext(card){
  if(!card)return null;
  const Bank=typeof module!=='undefined'&&module.exports?(function(){try{return require('./explain-bank-adapter.js');}catch{return null;}}()):(typeof window!=='undefined'?window.ExplainBankUI:null);
  const fromBank=Bank&&Bank.context&&card.rule_id?Bank.context(card.rule_id):null;
  if(fromBank&&fromBank.medium)return fromBank;
  const medium=card.medium||card.explanation_ru||'';
  return {
   rule_id:card.rule_id,
   title_ru:card.title_ru,
   ru_refresh:card.ru_refresh||'',
   short:card.short||card.title_ru||'',
   medium,
   explanation_ru:card.explanation_ru||medium,
   examples_correct:card.examples_correct||[],
   examples_wrong:card.examples_wrong||[],
   traps:card.traps||[]
  };
 }
 const api={CARDS,byId,byCourse,byError,cardsFor,allowedVocab,allowedRuleIds,toRuleContext};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AiRules=api;
})(typeof window!=='undefined'?window:globalThis);
