/* Homework specification for lesson 3-3. Short set, phrases only after their stage. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const pack=node?require('./lesson33-pack.js'):root.Lesson33Pack;
 const GRAMMAR=[
  'p3-33-d01','p3-33-g01','p3-33-h06','p3-33-i01','p3-33-i10','p3-33-j01','p3-33-c12','p3-33-b01'
 ];
 const CHUNKS=['p3-33-k1','p3-33-k2','p3-33-k3'];
 const PHRASE_CANDIDATES=[
  ['phrase:3-3:kk-ru:01','T29_POSS_PERSON_STACK'],
  ['phrase:3-3:kk-ru:02','T29_POSS_PERSON_STACK'],
  ['phrase:3-3:kk-ru:03','T29_POSS_PERSON_STACK'],
  ['phrase:3-3:kk-ru:04','T29_POSS_PERSON_STACK'],
  ['phrase:3-3:kk-ru:13','T31_EMES_STACK'],
  ['phrase:3-3:kk-ru:19','T32_OTBASY'],
  ['phrase:3-3:kk-ru:20','T33_ADJ_ROLE']
 ];
 const VERBS=[
  ['келу','приходить'],['кету','уходить'],['кіру','входить'],['шығу','выходить'],
  ['іздеу','искать'],['табу','находить'],['асығу','торопиться'],['кешігу','опаздывать'],
  ['жұмыс істеу','работать'],['жазу','писать'],['сөйлеу','разговаривать'],
  ['алу','брать'],['беру','давать'],['көру','видеть'],['қарау','смотреть']
 ];
 const VOCAB=VERBS.map(([kazakh,translation])=>({id:'word:'+kazakh,kazakh,translation,lesson_first_seen:'3-3',target:true}));
 const RULE_STAGE={
  T28_OWNER_SUBJECT:'33-a',
  T29_POSS_PERSON_STACK:'33-c',
  T30_THIRD_ZERO:'33-f2',
  T31_EMES_STACK:'33-g1',
  T32_OTBASY:'33-h',
  T33_ADJ_ROLE:'33-i1',
  T34_INTERROGATIVE:'33-i2'
 };
 const CARD_RULE={
  'p3-33-d01':'T29_POSS_PERSON_STACK',
  'p3-33-g01':'T31_EMES_STACK',
  'p3-33-h06':'T32_OTBASY',
  'p3-33-i01':'T33_ADJ_ROLE',
  'p3-33-i10':'T34_INTERROGATIVE',
  'p3-33-j01':'T29_POSS_PERSON_STACK',
  'p3-33-c12':'T32_OTBASY',
  'p3-33-b01':'T28_OWNER_SUBJECT',
  'p3-33-k1':'T28_OWNER_SUBJECT',
  'p3-33-k2':'T28_OWNER_SUBJECT',
  'p3-33-k3':'T28_OWNER_SUBJECT'
 };
 function ruleUnlocked(ruleId,events){
  const stage=RULE_STAGE[ruleId];
  return !!(stage&&pack&&pack.stageClosed&&pack.stageClosed(stage,events));
 }
 function build({events=[]}={}){
  const phrase_ids=PHRASE_CANDIDATES.map(([id])=>id).filter(id=>pack&&pack.phraseUnlocked&&pack.phraseUnlocked(id,{events}));
  const exercise_ids=GRAMMAR.filter(id=>ruleUnlocked(CARD_RULE[id],events));
  const chunks=CHUNKS.filter(id=>ruleUnlocked(CARD_RULE[id],events));
  const item_ids=exercise_ids.concat(chunks,phrase_ids);
  const rule_map=Object.assign({},CARD_RULE);
  phrase_ids.forEach(id=>{const row=PHRASE_CANDIDATES.find(([pid])=>pid===id);if(row)rule_map[id]=row[1];});
  return {
   lesson_id:'3-3',
   title:'Домашка · 3-3 · Кто и чей',
   closed:false,
   live:true,
   exercise_ids,
   phrase_ids,
   item_ids,
   rule_map,
   rule_ids:['T28_OWNER_SUBJECT','T29_POSS_PERSON_STACK','T30_THIRD_ZERO','T31_EMES_STACK','T32_OTBASY','T33_ADJ_ROLE','T34_INTERROGATIVE'],
   target_vocabulary:VOCAB.map(x=>({...x})),
   supplemental_vocabulary:[],
   external_test_url:'https://batylbol.kz/test/LichPrityazh.html',
   checklist:['repeat','exercises','words','phrases_when_unlocked','chunks','external_test'],
   items:(pack&&pack.byId)?item_ids.map(id=>pack.byId(id)).filter(Boolean):[]
  };
 }
 function validate(){
  const locked=build({events:[]});
  const full=build({events:['33-a','33-c','33-d2','33-f2','33-g1','33-g2','33-h','33-i1','33-i2'].map((stageId,i)=>({type:'course_stage_completed',lesson_id:'3-3',stage_id:stageId,content_revision:'t-integration-v1',at:i+1}))});
  const future=['p3-33-d01','p3-33-g01','p3-33-h06','p3-33-i01','p3-33-i10','p3-33-j01','p3-33-c12'];
  const missing=full.item_ids.filter(id=>!String(id).startsWith('phrase:')&&(!pack||!pack.byId||!pack.byId(id)));
  const lockedOk=locked.phrase_ids.length===0&&locked.exercise_ids.length===0&&locked.item_ids.length===0;
  const fullOk=full.exercise_ids.length>0&&future.every(id=>full.item_ids.includes(id))&&CHUNKS.every(id=>full.item_ids.includes(id))&&full.phrase_ids.length>=7&&missing.length===0&&future.every(id=>!locked.item_ids.includes(id));
  return {ok:lockedOk&&fullOk,missing};
 }
 const api={GRAMMAR,CHUNKS,PHRASE_CANDIDATES,VERBS,VOCAB,CARD_RULE,ruleUnlocked,build,validate};
 if(node)module.exports=api;else root.Lesson33Homework=api;
})(typeof window!=='undefined'?window:globalThis);
