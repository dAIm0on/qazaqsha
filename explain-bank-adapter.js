/* Single access layer for explain-bank.js. No second copy of rule texts. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Bank=node?require('./explain-bank.js'):root.ExplainBank;
 const OPEN=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2'];
 const COURSE=[
  {id:'1-1',label:'1–1',name:'Звуки и первые слова',rules:['T1_HARMONY']},
  {id:'1-2',label:'1–2',name:'Окончания и числа',rules:['T2_PLURAL_LDT']},
  {id:'1-3',label:'1–3',name:'Числа, количество и новые слова',rules:['T4_NO_PLURAL_AFTER_NUMBER','T5_NUMERAL_CONFUSION','T5_NUMERAL_COMPOSE','PHONE_GROUPS']},
  {id:'2-1',label:'2–1',name:'Мен, сен, сіз; емес; ба/бе',rules:['T12_GLUE','T6_PERSON_SG','T7_EMES']},
  {id:'2-2',label:'2–2',name:'Біз, сендер, сіздер и прилагательные',rules:['T8_PERSON_PL','T8_ADJ_PRED']},
  {id:'2-3',label:'2–3',name:'Ол / олар, вопрос, порядковые',rules:['T9_OL','T10_QUESTION','T11_ORDINAL']},
  {id:'3-1',label:'3–1',name:'Притяжательные формы: мой / твой / его; бар / жоқ',rules:['T20_POSS','T21_POSS_ASSIM','T22_BAR_ZHOK','T23_POSS_PL']},
  {id:'3-2',label:'3–2',name:'Наш / ваш / их; указательные',rules:['T24_POSS_BIZ','T25_POSS_SENDER','T26_POSS_OLAR','T27_DEIXIS']}
 ];
 const CHAPTER_RULE={
  '1-1-ru':'T1_HARMONY','1-1-row':'T1_HARMONY','1-1-sig':'T1_HARMONY','1-1-iyu':'T1_HARMONY','1-1-mix':'T1_HARMONY','1-1-ae':'T1_HARMONY',
  '1-2-slot':'T2_PLURAL_LDT','1-2-a':'T2_PLURAL_LDT','1-2-b':'T2_PLURAL_LDT','1-2-glue':'T2_PLURAL_LDT','1-2-traps':'T2_PLURAL_LDT',
  '1-3-qty':'T4_NO_PLURAL_AFTER_NUMBER','1-3-qty2':'T4_NO_PLURAL_AFTER_NUMBER',
  '1-3-atoms':'T5_NUMERAL_COMPOSE','1-3-tens':'T5_NUMERAL_COMPOSE','1-3-comp':'T5_NUMERAL_COMPOSE','1-3-hundreds':'T5_NUMERAL_COMPOSE','1-3-thousands':'T5_NUMERAL_COMPOSE',
  '1-3-contrast':'T5_NUMERAL_CONFUSION','1-3-phone':'PHONE_GROUPS',
  '2-1-glue':'T12_GLUE','2-1-pron':'T6_PERSON_SG','2-1-clause':'T6_PERSON_SG','2-1-men':'T6_PERSON_SG','2-1-sen':'T6_PERSON_SG','2-1-siz':'T6_PERSON_SG','2-1-siz2':'T6_PERSON_SG',
  '2-1-emes':'T7_EMES',
  '2-2-glue':'T12_GLUE','2-2-adj':'T8_ADJ_PRED','2-2-biz':'T8_PERSON_PL','2-2-mn':'T8_PERSON_PL','2-2-sender':'T8_PERSON_PL','2-2-sizder':'T8_PERSON_PL','2-2-noextra':'T8_PERSON_PL',
  '2-3-glue':'T12_GLUE','2-3-ol':'T9_OL','2-3-olar':'T9_OL','2-3-q':'T10_QUESTION','2-3-qstem':'T10_QUESTION',
  '2-3-ord':'T11_ORDINAL','2-3-suf':'T11_ORDINAL','2-3-ex':'T11_ORDINAL','2-3-comp':'T11_ORDINAL','2-3-ordp':'T11_ORDINAL',
  '3-1-poss':'T20_POSS','3-1-assim':'T21_POSS_ASSIM','3-1-bar':'T22_BAR_ZHOK','3-1-plural':'T23_POSS_PL',
  '3-2-a':'T24_POSS_BIZ','3-2-b':'T24_POSS_BIZ','3-2-c':'T23_POSS_PL','3-2-d':'T24_POSS_BIZ',
  '3-2-e':'T25_POSS_SENDER','3-2-f':'T25_POSS_SENDER','3-2-g':'T26_POSS_OLAR','3-2-h':'T26_POSS_OLAR',
  '3-2-i':'T27_DEIXIS','3-2-j':'T25_POSS_SENDER'
 };
 const TITLE_FIX={
  '1-2-a':'Гласная А или Е','1-2-b':'Начало Л / Д / Т','1-2-glue':'Сборка двух шагов',
  '2-1-clause':'Я врач — окончание обязательно','2-1-men':'Окончание «я»','2-1-emes':'Емес забирает окончание',
  '2-3-ol':'Ол без окончания лица','2-3-olar':'Олар — тоже без окончания лица','2-3-ordp':'Окончание после порядкового'
 };
 function get(ruleId){
  if(!Bank||!Bank.byId)return null;
  return Bank.byId(ruleId)||null;
 }
 function forLesson(lessonId){
  if(!OPEN.includes(lessonId)||!Bank||!Bank.BANK)return [];
  return Object.keys(Bank.BANK).filter(id=>{
   const card=Bank.BANK[id];
   return card&&card.lesson===lessonId&&OPEN.includes(card.lesson);
  }).map(id=>Bank.BANK[id]);
 }
 function context(ruleId){
  const card=get(ruleId);
  if(!card)return {rule_id:ruleId||'',title_ru:'',ru_refresh:'',short:'',medium:'',explanation_ru:'Объяснение пока не подключено.',examples_correct:[],examples_wrong:[],traps:[]};
  return {
   rule_id:ruleId,
   title_ru:card.title||'',
   ru_refresh:card.ru_refresh||'',
   short:card.short||'',
   medium:card.medium||'',
   explanation_ru:card.medium||card.short||'',
   examples_correct:Array.isArray(card.examples)?card.examples.slice():[],
   examples_wrong:(Array.isArray(card.traps)?card.traps:[]).filter(t=>/^\*/.test(t)),
   traps:Array.isArray(card.traps)?card.traps.slice():[]
  };
 }
 function ruleForChapter(ch){
  if(!ch)return '';
  if(ch.rule_id&&get(ch.rule_id))return ch.rule_id;
  if(CHAPTER_RULE[ch.id])return CHAPTER_RULE[ch.id];
  const ids=ch.rule_ids||[];
  if(ids.some(id=>id==='T12_GLUE'||id==='T1_HARMONY'))return ids.find(id=>get(id))||'';
  return CHAPTER_RULE[ch.id]||'';
 }
 function cardForChapter(ch){return get(ruleForChapter(ch));}
 function courseById(id){return COURSE.find(c=>c.id===id)||null;}
 function chapterTitle(ch){
  if(!ch)return '';
  if(TITLE_FIX[ch.id])return TITLE_FIX[ch.id];
  return String(ch.title||'').replace(/^Рычаг [АAБB]:\s*/,'').replace(/бирка/gi,'окончание').replace(/рычаг(ов|ами|а)?/gi,'шаг');
 }
 function paras(text){
  return String(text||'').split(/\n\n+/).map(p=>p.trim()).filter(Boolean);
 }
 function missing(ruleId){return !get(ruleId);}
 const api={OPEN,COURSE,CHAPTER_RULE,get,forLesson,context,ruleForChapter,cardForChapter,courseById,chapterTitle,paras,missing};
 if(node)module.exports=api;else root.ExplainBankUI=api;
})(typeof window!=='undefined'?window:globalThis);
