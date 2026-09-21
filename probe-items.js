/* Grammar slice items A–D. Typed production, not MCQ. Not the timed FSRS exam. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;
 const TITLES={
  T1_HARMONY:['T1','последний слог'],
  T2_PLURAL_LDT:['T2','Л/Д/Т'],
  T4_NO_PLURAL_AFTER_NUMBER:['T4','после числа'],
  T5_NUMERAL_CONFUSION:['T5','6 и 60'],
  T5_NUMERAL_COMPOSE:['T5','сборка числа'],
  T6_PERSON_SG:['T6','кто есть'],
  T7_EMES:['T7','емес'],
  T8_PERSON_PL:['T8','мы и вы'],
  T9_OL:['T9','ол без наклейки'],
  T10_QUESTION:['T10','вопрос'],
  T11_ORDINAL:['T11','порядковое'],
  T20_POSS:['T20','чьё'],
  T21_POSS_ASSIM:['T21','озвончение'],
  T22_BAR_ZHOK:['T22','бар / жоқ'],
  T23_POSS_PL:['T23','сначала много'],
  T24_POSS_BIZ:['T24','біздің'],
  T25_POSS_SENDER:['T25','сендердің'],
  T26_POSS_OLAR:['T26','олардың'],
  T27_DEIXIS:['T27','указательные']
 };
 const SIGNATURES=[
  ['екі кітаптар','T4_NO_PLURAL_AFTER_NUMBER'],
  ['кітаплар','T2_PLURAL_LDT'],
  ['мен дәрігер','T6_PERSON_SG'],
  ['кітапым','T21_POSS_ASSIM'],
  ['кітабымдар','T23_POSS_PL'],
  ['біздің ата','T24_POSS_BIZ'],
  ['біздің әке','T24_POSS_BIZ'],
  ['сендердің қолың','T25_POSS_SENDER']
 ];
 const BLOCKS=[
  {id:'A',title:'Срез A · звук, много, число'},
  {id:'B',title:'Срез B · кто есть, емес, вопрос'},
  {id:'C',title:'Срез C · чьё, 3-1'},
  {id:'D',title:'Срез D · 3-2'}
 ];
 function row(id,block,rule,skill,prompt,answers,holes){
  return {id,block,rule_id:rule,skill,prompt,answers,holes:holes||[]};
 }
 const ITEMS=[
  row('slice:A1','A','T1_HARMONY','harmony_row','Последний слог слова кітап — твёрдый или мягкий? Окончание с А или с Е?',['тап твёрдый → А','твердый → А','твёрдый → А','твёрдый, А'],['мягкий']),
  row('slice:A2','A','T1_HARMONY','harmony_row','Последний слог слова мұғалім — твёрдый или мягкий? Окончание с А или с Е?',['лім мягкий → Е','мягкий → Е','мягкий, Е'],['твёрдый, потому что мұ']),
  row('slice:A3','A','T2_PLURAL_LDT','plural','адам + «много» =',['адамдар'],['адамлар']),
  row('slice:A4','A','T2_PLURAL_LDT','plural','кітап + «много» =',['кітаптар'],['кітаплар','кітаптер']),
  row('slice:A5','A','T2_PLURAL_LDT','plural','жер + «много» =',['жерлер'],['жердер','жерлар']),
  row('slice:A6','A','T4_NO_PLURAL_AFTER_NUMBER','plural_after_num','две книги =',['екі кітап'],['екі кітаптар']),
  row('slice:A7','A','T4_NO_PLURAL_AFTER_NUMBER','plural_after_num','много девушек, слово көп =',['көп қыз'],['көп қыздар']),
  row('slice:A8','A','T5_NUMERAL_CONFUSION','numerals','6 = _____. 60 = _____.',[['алты'],['алпыс']],['алтыс']),
  row('slice:A9','A','T5_NUMERAL_CONFUSION','numerals','8 = _____. 80 = _____.',[['сегіз'],['сексен']],['сегіс']),
  row('slice:A10','A','T5_NUMERAL_COMPOSE','numerals','125 словами =',['жүз жиырма бес'],['жүз және жиырма бес']),
  row('slice:B1','B','T6_PERSON_SG','person_sg','я врач =',['мен дәрігермін'],['мен дәрігер','дәрігерпын']),
  row('slice:B2','B','T6_PERSON_SG','person_sg','ты друг =',['сен доссың'],['сен дос','доссыңдар']),
  row('slice:B3','B','T6_PERSON_SG','person_sg','вы-сіз сосед =',['сіз көршісіз'],['сіз көршісің']),
  row('slice:B4','B','T7_EMES','emes','я не врач =',['мен дәрігер емеспін'],['мен емес дәрігермін','дәрігермін емес']),
  row('slice:B5','B','T8_PERSON_PL','person_pl','мы врачи =',['біз дәрігерміз'],['біз дәрігербыз','біз дәрігер']),
  row('slice:B6','B','T8_PERSON_PL','person_pl','вы-сендер студенты =',['сендер студентсіңдер'],['сендер студентсің','студентсіздер']),
  row('slice:B7','B','T9_OL','third_person','он гость =',['ол қонақ'],['ол қонақтыр','ол қонақсын']),
  row('slice:B8','B','T10_QUESTION','question_full','это книга? =',['бұл кітап па?','бұл кітап па'],['бұл кітап ба','бұл кітаптар ма']),
  row('slice:B9','B','T10_QUESTION','question_full','ты ученик? =',['сен оқушысың ба?','сен оқушысың ба'],['сен оқушы ба']),
  row('slice:B10','B','T11_ORDINAL','ordinal','20-й =',['жиырмасыншы'],['жиырманышы','оншы']),
  row('slice:C1','C','T21_POSS_ASSIM','possessive','моя книга =',['менің кітабым'],['менің кітап','кітапым']),
  row('slice:C2','C','T20_POSS','possessive','твой друг =',['сенің досың'],['сенің дос']),
  row('slice:C3','C','T20_POSS','possessive','его отец =',['оның әкесі'],['оның әке','әкем']),
  row('slice:C4','C','T21_POSS_ASSIM','possessive','ваша-сіз машина =',['сіздің көлігіңіз'],['көлікіңіз','көлігің']),
  row('slice:C5','C','T23_POSS_PL','possessive','мои книги =',['менің кітаптарым'],['кітабымдар','кітаптарымдар']),
  row('slice:C6','C','T22_BAR_ZHOK','existence','у меня есть машина =',['менің көлігім бар'],['менің көлік бар','көлігім емес']),
  row('slice:C7','C','T22_BAR_ZHOK','existence','у меня нет машины =',['менің көлігім жоқ'],['көлігім емес']),
  row('slice:C8','C','T21_POSS_ASSIM','possessive','Исправь: *кітапым',['кітабым'],['кітапым']),
  row('slice:C9','C','T23_POSS_PL','possessive','Исправь: *менің кітабымдар',['менің кітаптарым'],['кітабымдар']),
  row('slice:C10','C','T20_POSS','possessive','Исправь: *менің әке',['менің әкем'],['менің әке']),
  row('slice:D1','D','T24_POSS_BIZ','poss_biz','наш дом =',['біздің үйіміз'],['біздің үй','үйіміздер']),
  row('slice:D2','D','T24_POSS_BIZ','poss_biz','наша машина =',['біздің көлігіміз'],['көлікіміз']),
  row('slice:D3','D','T24_POSS_BIZ','poss_biz','наши книги =',['біздің кітаптарымыз'],['кітабымыздар','баламыз']),
  row('slice:D4','D','T25_POSS_SENDER','poss_sender','ваш-сендер друг / ваши друзья =',['сендердің достарың'],['сендердің досың']),
  row('slice:D5','D','T25_POSS_SENDER','poss_sender','ваши-сендер руки, даже если про одну на всех =',['сендердің қолдарың'],['сендердің қолың']),
  row('slice:D6','D','T26_POSS_OLAR','poss_olar','их ребёнок, один =',['олардың баласы'],['олардың бала','олардың балалары']),
  row('slice:D7','D','T26_POSS_OLAR','poss_olar','их машины =',['олардың көліктері'],['көлікі']),
  row('slice:D8','D','T27_DEIXIS','deixis','эта книга рядом, слово мына =',['мына кітап'],['мына — кітап','мына - кітап']),
  row('slice:D9','D','T25_POSS_SENDER','poss_sender','Исправь: *сендердің қолың',['сендердің қолдарың'],['сендердің қолың']),
  row('slice:D10','D','T27_DEIXIS','deixis','Исправь: *мына — кітап',['мынау — кітап','бұл кітап','мына кітап'],['мына — кітап'])
 ];
 function norm(v){return core.normalize(v);}
 function fieldsOf(item){
  const a=item.answers;
  if(Array.isArray(a[0]))return a.map(col=>({label:'Ответ',kind:'text',answers:col}));
  return [{label:'Ответ',kind:'text',answers:a}];
 }
 function allowed(item,catalog){
  if(!gate||!gate.allows||!item.skill)return true;
  return gate.allows(item.skill,catalog);
 }
 function signatureOf(text){
  const n=norm(text);
  for(const [sig,rule] of SIGNATURES)if(n===norm(sig))return rule;
  return null;
 }
 function toQuestion(item){
  return {
   id:item.id,source:'slice',group:item.block,part:'1',lessonId:'',topic:'rules',kind:'fields',
   title:'Срез '+item.block,stimulus:item.prompt,fields:fieldsOf(item),
   explanation:fieldsOf(item).map(f=>f.answers[0]).join(' · '),
   ruleIds:[item.rule_id],practiceOnly:true,slice:true
  };
 }
 function session(block,catalog){
  const seen=Object.create(null),out=[];
  for(const item of ITEMS){
   if(item.block!==block||!allowed(item,catalog))continue;
   seen[item.rule_id]=(seen[item.rule_id]||0);
   if(seen[item.rule_id]>=2)continue;
   seen[item.rule_id]++;out.push(item);
  }
  return out;
 }
 function openBlocks(catalog){
  return BLOCKS.filter(b=>session(b.id,catalog).length);
 }
 function judge(item,answers,peek){
  const q=toQuestion(item);
  const list=Array.isArray(answers)?answers:[answers];
  const result=peek?{correct:false}:core.evaluate(q,list);
  const blob=list.join(' ');
  const fromHole=(item.holes||[]).some(h=>list.some(a=>norm(a)===norm(h))||norm(blob)===norm(h));
  const sig=signatureOf(blob)||list.map(signatureOf).find(Boolean)||null;
  return {id:item.id,item_rule:item.rule_id,rule_id:sig||item.rule_id,correct:!!result.correct&&!peek,peek:!!peek,signature:!!(sig||fromHole)};
 }
 function summarize(rows){
  const bag=Object.create(null);
  for(const row of rows||[]){
   const key=row.item_rule;
   if(!bag[key])bag[key]={ok:0,n:0,signature:false};
   bag[key].n++;if(row.correct)bag[key].ok++;if(row.signature)bag[key].signature=true;
   if(row.signature&&row.rule_id&&row.rule_id!==key){
    if(!bag[row.rule_id])bag[row.rule_id]={ok:0,n:0,signature:true};
    bag[row.rule_id].signature=true;
   }
  }
  return Object.keys(bag).filter(id=>bag[id].signature||bag[id].ok===0).map(id=>{
   const t=TITLES[id]||[id,id];
   return {rule_id:id,short:t[0],title:t[1]};
  });
 }
 function byId(id){return ITEMS.find(item=>item.id===id)||null;}
 const api={ITEMS,BLOCKS,TITLES,SIGNATURES,signatureOf,toQuestion,session,openBlocks,judge,summarize,byId,allowed};
 if(node)module.exports=api;
 else root.ProbeItems=api;
})(typeof window!=='undefined'?window:globalThis);
