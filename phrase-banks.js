/* Phase 2B P1a closed phrase banks. Lessons 1-2 and 1-3 only. */
(function(root){
 'use strict';
 const pair=(lesson,n,kz,ru,rootLesson,rule,errorTargets,errorType,morph,contrast)=>({
  lesson_id:lesson,n,pair_key:lesson+':'+String(n).padStart(2,'0'),
  kz,ru:Array.isArray(ru)?ru:[ru],root_lesson:rootLesson,
  rule_ids:Array.isArray(rule)?rule:[rule],
  error_targets:errorTargets||[],error_type:errorType||'',
  morph:morph||'',contrast:contrast||''
 });
 const BANKS={
  '1-2':[
   pair('1-2',1,'кітаптар','книги','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT','PLURAL_HARMONY_AE'],'plural_form','кітап + тар','*кітаплар → кітаптар'),
   pair('1-2',2,'қыздар',['девушки','девочки'],'1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','қыз + дар','қыз → қыздар'),
   pair('1-2',3,'сөздер','слова','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT','PLURAL_HARMONY_AE'],'plural_form','сөз + дер','сөз → сөздер'),
   pair('1-2',4,'жігіттер','парни','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT','PLURAL_HARMONY_AE'],'plural_form','жігіт + тер','жігіт → жігіттер'),
   pair('1-2',5,'қалалар','города','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','қала + лар','қала → қалалар'),
   pair('1-2',6,'адамдар','люди','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','адам + дар','*адамлар → адамдар'),
   pair('1-2',7,'көшелер','улицы','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT','PLURAL_HARMONY_AE'],'plural_form','көше + лер','көше → көшелер'),
   pair('1-2',8,'жерлер','земли','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','жер + лер','*жердер → жерлер'),
   pair('1-2',9,'тулар','флаги','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','ту + лар','ту → тулар'),
   pair('1-2',10,'ұлдар',['сыновья','мальчики'],'1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','ұл + дар','ұл → ұлдар'),
   pair('1-2',11,'сулар','воды','1-1','T2_PLURAL_LDT',['PLURAL_INITIAL_LDT'],'plural_form','су + лар','су → сулар')
  ],
  '1-3':[
   pair('1-3',1,'бес кітап','пять книг','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','бес + кітап','*бес кітаптар → бес кітап'),
   pair('1-3',2,'екі қыз','две девушки','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','екі + қыз','*екі қыздар → екі қыз'),
   pair('1-3',3,'он адам','десять человек','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','он + адам','*он адамдар → он адам'),
   pair('1-3',4,'көп сөз','много слов','1-1','T4_NO_PLURAL_AFTER_NUMBER',['QUANTIFIER_NO_PLURAL'],'plural_after_numeral','көп + сөз','*көп сөздер → көп сөз'),
   pair('1-3',5,'аз жігіт','мало парней','1-1','T4_NO_PLURAL_AFTER_NUMBER',['QUANTIFIER_NO_PLURAL'],'plural_after_numeral','аз + жігіт','*аз жігіттер → аз жігіт'),
   pair('1-3',6,'үш қала','три города','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','үш + қала','*үш қалалар → үш қала'),
   pair('1-3',7,'жеті көше','семь улиц','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','жеті + көше','*жеті көшелер → жеті көше'),
   pair('1-3',8,'қанша кітап','сколько книг','1-1','T4_NO_PLURAL_AFTER_NUMBER',['QUANTIFIER_NO_PLURAL'],'plural_after_numeral','қанша + кітап','*қанша кітаптар → қанша кітап'),
   pair('1-3',9,'төрт ту','четыре флага','1-1','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','төрт + ту','*төрт тулар → төрт ту'),
   pair('1-3',10,'екі дос','два друга','1-3','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','екі + дос','*екі достар → екі дос'),
   pair('1-3',11,'үш мұғалім','три учителя','1-3','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','үш + мұғалім','*үш мұғалімдер → үш мұғалім'),
   pair('1-3',12,'екі дәрігер','два врача','1-3','T4_NO_PLURAL_AFTER_NUMBER',['PLURAL_AFTER_NUMBER'],'plural_after_numeral','екі + дәрігер','*екі дәрігерлер → екі дәрігер')
  ]
 };
 function forLesson(id){return (BANKS[id]||[]).map(x=>JSON.parse(JSON.stringify(x)));}
 const api={BANKS,forLesson};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhraseBanks=api;
})(typeof window!=='undefined'?window:globalThis);
