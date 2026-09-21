/* Homework specification for lesson 3-2. G1–G6 from school modules. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const pack=node?require('./lesson32-pack.js'):root.Lesson32Pack;

 const EXERCISE_IDS=[
  'p3-32-a-g2-ake',
  'p3-32-a-g2-kolik',
  'p3-32-b-g2-kitap',
  'p3-32-c-g2-kol',
  'p3-32-d-g2-bastyk',
  'p3-32-e-g2-ini',
  'p3-32-g-g2-myna',
  'p3-32-g-g5-bar',
  'p3-32-a-g6-ake',
  'p3-32-c-g6-kolyn',
  'p3-32-x-g6-korshisin'
 ];
 const PHRASE_IDS=[
  'phrase:3-2:kk-ru:01',
  'phrase:3-2:kk-ru:07',
  'phrase:3-2:ru-kk:15',
  'phrase:3-2:ru-kk:24'
 ];
 const RULE_MAP={
  'p3-32-a-g2-ake':'T24_POSS_BIZ',
  'p3-32-a-g2-kolik':'T24_POSS_BIZ',
  'p3-32-b-g2-kitap':'T24_POSS_BIZ',
  'p3-32-c-g2-kol':'T25_POSS_SENDER',
  'p3-32-d-g2-bastyk':'T25_POSS_SENDER',
  'p3-32-e-g2-ini':'T26_POSS_OLAR',
  'p3-32-g-g2-myna':'T27_DEIXIS',
  'p3-32-g-g5-bar':'T22_BAR_ZHOK',
  'p3-32-a-g6-ake':'T24_POSS_BIZ',
  'p3-32-c-g6-kolyn':'T25_POSS_SENDER',
  'p3-32-x-g6-korshisin':'T20_POSS',
  'phrase:3-2:kk-ru:01':'T24_POSS_BIZ',
  'phrase:3-2:kk-ru:07':'T25_POSS_SENDER',
  'phrase:3-2:ru-kk:15':'T25_POSS_SENDER',
  'phrase:3-2:ru-kk:24':'T24_POSS_BIZ'
 };
 const SCREEN_VOCAB=[
  ['бас','голова'],['қол','рука'],['көз','глаз'],['тіл','язык'],
  ['қалам','ручка'],['көйлек','платье'],['жақсы','хороший'],['жаман','плохой'],
  ['біздің','наш'],['сендердің','ваш'],['сіздердің','Ваш'],['олардың','их'],
  ['бұл','этот'],['мынау','вот этот'],['осы','этот'],['мына','этот (только при слове)'],
  ['анау','вон тот'],['ана','тот (только при слове)'],['ол','он / тот'],['сол','тот']
 ].map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'3-2',target:true}));
 const HW_VOCAB=[
  ['сынып','класс'],['сыныптас','одноклассник'],['отбасы','семья'],['баба','предок'],
  ['іс','дело'],['аяқ','нога'],['кім','кто'],['не','что'],
  ['қандай','какой (характеристика)'],['қай','какой (из)'],['нешінші','какой (по счёту)']
 ].map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'3-2',target:true}));

 function resolve(ids){
  if(!pack||!pack.byId)return [];
  return ids.map(id=>pack.byId(id)).filter(Boolean);
 }
 function build({sessionCUnlocked=false,sessionHUnlocked=false}={}){
  const exercise_ids=EXERCISE_IDS.slice();
  const phrase_ids=sessionHUnlocked?PHRASE_IDS.slice():[];
  const ids=[...exercise_ids,...phrase_ids];
  const rule_map=Object.fromEntries(ids.map(id=>[id,RULE_MAP[id]]).filter(([,v])=>v));
  return {
   lesson_id:'3-2',
   title:'Домашка · 3-2 · Наш / ваш / их',
   closed:false,
   live:true,
   exercise_ids,
   phrase_ids,
   item_ids:ids,
   rule_map,
   rule_ids:['T24_POSS_BIZ','T25_POSS_SENDER','T26_POSS_OLAR','T27_DEIXIS'],
   target_vocabulary:[...SCREEN_VOCAB,...HW_VOCAB].map(x=>({...x})),
   supplemental_vocabulary:[],
   external_test_url:'https://batylbol.kz/test/Prityazh.html',
   checklist:['repeat','exercises','words','phrases_after_H','external_test'],
   items:resolve(ids)
  };
 }
 function validate(){
  const locked=build({sessionHUnlocked:false}),open=build({sessionHUnlocked:true});
  const missing=locked.exercise_ids.filter(id=>!pack||!pack.byId||!pack.byId(id));
  return {ok:missing.length===0&&locked.phrase_ids.length===0&&open.phrase_ids.length===4,missing};
 }

 const api={EXERCISE_IDS,PHRASE_IDS,RULE_MAP,SCREEN_VOCAB,HW_VOCAB,build,validate};
 if(node)module.exports=api;else root.Lesson32Homework=api;
})(typeof window!=='undefined'?window:globalThis);
