/* Homework specification for lesson 4-2. Grammar after the matching stage. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const pack=node?require('./lesson42-pack.js'):root.Lesson42Pack;
 const GRAMMAR=[
  'p4-42-b01','p4-42-b02','p4-42-d01','p4-42-e08','p4-42-f01','p4-42-g01','p4-42-g07','p4-42-h01','p4-42-i01','p4-42-j12'
 ];
 const VERBS=[
  ['түсіну','понимать'],['бару','идти'],['жүру','ходить'],['жату','лежать'],
  ['отыру','сидеть'],['тұру','стоять'],['ашу','открывать'],['жабу','закрывать'],
  ['тігу','шить'],['сөйлеу','разговаривать'],['жазу','писать'],['кету','уходить'],
  ['алу','брать'],['беру','давать'],['келу','приходить'],['іздеу','искать'],
  ['көру','видеть'],['кіру','входить'],['қарау','смотреть'],['шығу','выходить'],
  ['кешігу','опаздывать'],['табу','находить'],['асығу','спешить'],['жұмыс істеу','работать'],
  ['ойлау','думать'],['ойнау','играть'],['сену','верить'],['күту','ждать'],['айту','сказать']
 ];
 const VOCAB=VERBS.map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'4-2',target:true}));
 const RULE_STAGE={
  T35_PAST_MEANING:'42-b',
  T36_DY_TY:'42-c',
  T37_PERSON2:'42-d',
  T38_OL_ZERO_PAST:'42-e',
  T39_PAST_ASSIM:'42-f',
  T40_PAST_NEG:'42-g',
  T41_PAST_Q:'42-h',
  T42_PAST_EXCEPT:'42-i'
 };
 const CARD_RULE={
  'p4-42-b01':'T35_PAST_MEANING',
  'p4-42-b02':'T38_OL_ZERO_PAST',
  'p4-42-d01':'T37_PERSON2',
  'p4-42-e08':'T38_OL_ZERO_PAST',
  'p4-42-f01':'T39_PAST_ASSIM',
  'p4-42-g01':'T40_PAST_NEG',
  'p4-42-g07':'T40_PAST_NEG',
  'p4-42-h01':'T41_PAST_Q',
  'p4-42-i01':'T42_PAST_EXCEPT',
  'p4-42-j12':'T40_PAST_NEG'
 };
 function ruleUnlocked(ruleId,events){
  const stage=RULE_STAGE[ruleId];
  return !!(stage&&pack&&pack.stageClosed&&pack.stageClosed(stage,events));
 }
 function build({events=[]}={}){
  const exercise_ids=GRAMMAR.filter(id=>ruleUnlocked(CARD_RULE[id],events));
  return {
   lesson_id:'4-2',
   title:'Домашка · 4-2 · Прошедшее время',
   closed:false,
   live:true,
   exercise_ids,
   phrase_ids:[],
   item_ids:exercise_ids.slice(),
   rule_map:Object.assign({},CARD_RULE),
   rule_ids:Object.keys(RULE_STAGE),
   target_vocabulary:VOCAB.map(x=>({...x})),
   supplemental_vocabulary:[],
   external_test_url:'https://batylbol.kz/test/ProshVremyaBezIsk.html',
   checklist:['repeat','exercises','words','external_test'],
   items:(pack&&pack.byId)?exercise_ids.map(id=>pack.byId(id)).filter(Boolean):[]
  };
 }
 function validate(){
  const locked=build({events:[]});
  const stages=['42-a','42-b','42-c','42-d','42-e','42-f','42-g','42-h','42-i'];
  const full=build({events:stages.map((stageId,i)=>({type:'course_stage_completed',lesson_id:'4-2',stage_id:stageId,content_revision:'t-integration-v1',at:i+1}))});
  const missing=full.item_ids.filter(id=>!pack||!pack.byId||!pack.byId(id));
  return {ok:locked.item_ids.length===0&&full.exercise_ids.length===GRAMMAR.length&&missing.length===0,missing};
 }
 const api={GRAMMAR,VERBS,VOCAB,CARD_RULE,ruleUnlocked,build,validate};
 if(node)module.exports=api;else root.Lesson42Homework=api;
})(typeof window!=='undefined'?window:globalThis);
