/* Phase 2B P1a closed phrase banks. Lessons 1-2 and 1-3 only. */
(function(root){
 'use strict';
 const pair=(lesson,n,kz,ru,rootLesson,rule,errorTargets,errorType,morph,contrast)=>({
  lesson_id:lesson,n,pair_key:lesson+':'+String(n).padStart(2,'0'),
  kz:Array.isArray(kz)?kz:[kz],ru:Array.isArray(ru)?ru:[ru],root_lesson:rootLesson,
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
  ],
  '3-2':[
   pair('3-2',1,'Біздің әкеміз','наш отец','3-1','poss_biz',['POSS_NO_SUFFIX'],'POSS_NO_SUFFIX','әке + іміз','*біздің әке → біздің әкеміз'),
   pair('3-2',2,'Біздің көлігіміз','наша машина','3-1','poss_biz',['POSS_ASSIM'],'POSS_ASSIM','көлік + іміз','*көлікіміз → көлігіміз'),
   pair('3-2',3,'Сендердің достарың',['ваш друг','ваши друзья'],'3-2','poss_sender',['POSS_2PL_NO_PL'],'POSS_2PL_NO_PL','дос + тар + ың','*сендердің досың → сендердің достарың'),
   pair('3-2',4,'Сіздердің аталарыңыз',['ваш дедушка','ваши дедушки'],'3-2','poss_sender',['POSS_WRONG_PERSON'],'POSS_WRONG_PERSON','ата + лар + ыңыз','*әкелерің'),
   pair('3-2',5,'Олардың інісі','их младший брат','3-2','poss_olar',['POSS_NO_SUFFIX'],'POSS_NO_SUFFIX','іні + сі','*олардың іні → олардың інісі'),
   pair('3-2',6,'Біздің кітаптарымыз','наши книги','3-1','poss_biz',['POSS_ORDER'],'POSS_ORDER','кітап + тар + ымыз','*кітабымыздар → кітаптарымыз'),
   pair('3-2',7,'Сендердің қолдарың',['ваша рука','ваши руки'],'3-2','poss_sender',['POSS_2PL_NO_PL'],'POSS_2PL_NO_PL','қол + дар + ың','*сендердің қолың → сендердің қолдарың'),
   pair('3-2',8,'Біздің басымыз',['наша голова','наши головы'],'3-2','poss_biz',['POSS_NO_SUFFIX'],'POSS_NO_SUFFIX','бас + ымыз','тело без обязательного «много»'),
   pair('3-2',9,'Олардың көліктері','их машины','3-2','poss_olar',['POSS_OLAR_FORCE_PL'],'POSS_OLAR_FORCE_PL','көлік + тер + і','көліктері'),
   pair('3-2',10,'Мына кітап жақсы','эта книга хорошая','3-2','deixis',['DEIXIS_BARE'],'DEIXIS_BARE','мына + кітап','*мына — кітап'),
   pair('3-2',11,'Бұл — сынып','это класс','3-2','deixis',['DEIXIS_BARE'],'DEIXIS_BARE','бұл','бұл может стоять одно'),
   pair('3-2',12,'Ол мұғалім ақылды','тот учитель умный','3-2','deixis',['DEIXIS_OL'],'DEIXIS_OL','ол + мұғалім + ақылды','ол он / ол тот'),
   pair('3-2',13,'біздің қаламыз','наш город','3-1','poss_biz',['POSS_NO_SUFFIX'],'POSS_NO_SUFFIX','қала + мыз','*біздің қала'),
   pair('3-2',14,'біздің мектебіміз','наша школа','3-1','poss_biz',['POSS_ASSIM'],'POSS_ASSIM','мектеп + іміз','*мектепіміз'),
   pair('3-2',15,'сендердің достарың','ваш (сендердің) друг','3-2','poss_sender',['POSS_2PL_NO_PL'],'POSS_2PL_NO_PL','дос + тар + ың','*сендердің досың'),
   pair('3-2',16,'сендердің көйлектерің','ваши (сендердің) платья','3-2','poss_sender',['POSS_2PL_NO_PL'],'POSS_2PL_NO_PL','көйлек + тер + ің','*сендердің көйлегің'),
   pair('3-2',17,'олардың інісі','их младший брат','3-2','poss_olar',['POSS_NO_SUFFIX'],'POSS_NO_SUFFIX','іні + сі','інісі'),
   pair('3-2',18,['олардың қаласы','олардың қалалары'],'их город','3-2','poss_olar',['POSS_OLAR_FORCE_PL'],'POSS_OLAR_FORCE_PL','қала + сы','қаласы первый ответ; қалалары можно'),
   pair('3-2',19,'біздің көршілеріміз','наши соседи','3-2','poss_biz',['POSS_ORDER'],'POSS_ORDER','көрші + лер + іміз','көршілеріміз'),
   pair('3-2',20,'сіздердің бастықтарыңыз','ваш (сіздердің) начальник','3-2','poss_sender',['POSS_WRONG_PERSON'],'POSS_WRONG_PERSON','бастық + тар + ыңыз','бастықтарыңыз'),
   pair('3-2',21,'біздің аяғымыз','наши ноги','3-2','poss_biz',['POSS_ASSIM'],'POSS_ASSIM','аяқ + ымыз','аяғымыз; аяқтарымыз не единственный ответ'),
   pair('3-2',22,['мына кітап жақсы','осы кітап жақсы'],'эта книга хорошая','3-2','deixis',['DEIXIS_BARE'],'DEIXIS_BARE','мына кітап','осы кітап жақсы тоже'),
   pair('3-2',23,['анау — кітап','мынау — кітап'],'то — книга','3-2','deixis',['DEIXIS_BARE'],'DEIXIS_BARE','анау','*ана — кітап *мына — кітап'),
   pair('3-2',24,'біздің көлігіміз бар','у нас есть машина','3-1',['poss_biz','bar_zhok'],['BAR_ZHOK'],'bar_zhok_choice','көлігіміз + бар','*біз көлік бар *көлігіміз емес')
  ]
 };
 function forLesson(id){return (BANKS[id]||[]).map(x=>JSON.parse(JSON.stringify(x)));}
 const api={BANKS,forLesson};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhraseBanks=api;
})(typeof window!=='undefined'?window:globalThis);
