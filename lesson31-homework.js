/* Closed Homework specification for lesson 3-1. Not wired to live Homework until lesson gate opens. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const pack=node?require('./lesson31-pack.js'):root.Lesson31Pack;

 const EXERCISE_IDS=[
  'p3-31-a-g2-kitap',
  'p3-31-b-g2-dos',
  'p3-31-c-g2-mektep',
  'p3-31-e-g6-emes',
  'p3-31-f-g6-kitabymdar',
  'p3-31-x-g6-zhurekim'
 ];
 const PHRASE_IDS=[
  'p3-31-g-g3-my-book',
  'p3-31-g-g3-your-friend',
  'p3-31-g-g4-heart',
  'p3-31-g-g4-your-friends'
 ];
 const RULE_MAP={
  'p3-31-a-g2-kitap':'T21_POSS_ASSIM',
  'p3-31-b-g2-dos':'T20_POSS',
  'p3-31-c-g2-mektep':'T21_POSS_ASSIM',
  'p3-31-e-g6-emes':'T22_BAR_ZHOK',
  'p3-31-f-g6-kitabymdar':'T23_POSS_PL',
  'p3-31-x-g6-zhurekim':'T21_POSS_ASSIM',
  'p3-31-g-g3-my-book':'T21_POSS_ASSIM',
  'p3-31-g-g3-your-friend':'T20_POSS',
  'p3-31-g-g4-heart':'T21_POSS_ASSIM',
  'p3-31-g-g4-your-friends':'T23_POSS_PL'
 };
 const TARGET_VOCAB=[
  ['бас','голова'],['қол','рука'],['көз','глаз'],['тіл','язык'],
  ['қалам','ручка'],['көйлек','платье'],['жақсы','хороший'],['жаман','плохой'],
  ['біздің','наш'],['сендердің','ваш'],['сіздердің','Ваш'],['олардың','их']
 ].map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'3-1',target:true}));
 const SUPPLEMENTAL_VOCAB=[
  ['кім','кто'],['не','что'],['қандай','какой (характеристика)'],
  ['қай','какой (из)'],['нешінші','какой (по счёту)'],['бұл','этот']
 ].map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'3-1',target:false}));

 function resolve(ids){
  if(!pack||!pack.byId)return [];
  return ids.map(id=>pack.byId(id)).filter(Boolean);
 }
 function build({sessionGUnlocked=false}={}){
  const exercise_ids=EXERCISE_IDS.slice();
  const phrase_ids=sessionGUnlocked?PHRASE_IDS.slice():[];
  const ids=[...exercise_ids,...phrase_ids];
  const rule_map=Object.fromEntries(ids.map(id=>[id,RULE_MAP[id]]));
  return {
   lesson_id:'3-1',
   title:'Домашка · 3-1 · Притяжательные формы',
   closed:true,
   live:false,
   exercise_ids,
   phrase_ids,
   item_ids:ids,
   rule_map,
   rule_ids:['T20_POSS','T21_POSS_ASSIM','T22_BAR_ZHOK','T23_POSS_PL'],
   target_vocabulary:TARGET_VOCAB.map(x=>({...x})),
   supplemental_vocabulary:SUPPLEMENTAL_VOCAB.map(x=>({...x})),
   external_test_url:'https://batylbol.kz/test/PrityazhEdChislo.html',
   checklist:['repeat','exercises','words','phrases_after_G','external_test'],
   items:resolve(ids)
  };
 }
 function validate(){
  const locked=build({sessionGUnlocked:false}),open=build({sessionGUnlocked:true});
  const missing=open.item_ids.filter(id=>!pack||!pack.byId||!pack.byId(id));
  const futureWords=[...TARGET_VOCAB,...SUPPLEMENTAL_VOCAB].filter(w=>!w.id.startsWith('word:'));
  return {
   ok:missing.length===0&&futureWords.length===0&&locked.phrase_ids.length===0&&open.phrase_ids.length===4,
   missing,
   locked_phrase_count:locked.phrase_ids.length,
   open_phrase_count:open.phrase_ids.length
  };
 }

 const api={EXERCISE_IDS,PHRASE_IDS,RULE_MAP,TARGET_VOCAB,SUPPLEMENTAL_VOCAB,build,validate};
 if(node)module.exports=api;else root.Lesson31Homework=api;
})(typeof window!=='undefined'?window:globalThis);
