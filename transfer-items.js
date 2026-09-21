/* Transfer probes: same open rule, other known root. Not a new view. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;
 const ROOTS=['кітап','дос','әке','ата','қала','көлік','адам','қыз','жер','оқушы','дәрігер','үй','мектеп'];
 const TAUGHT_ON={
  T2_PLURAL_LDT:'кітап',T21_POSS_ASSIM:'кітап',T23_POSS_PL:'кітап',T4_NO_PLURAL_AFTER_NUMBER:'кітап',
  T20_POSS:'әке',T6_PERSON_SG:'дәрігер',T7_EMES:'дәрігер',T12_GLUE:'адам',
  T24_POSS_BIZ:'әке',T25_POSS_SENDER:'дос',T26_POSS_OLAR:'іні',T27_DEIXIS:'бұл кітап'
 };
 const TAUGHT_ALSO={T25_POSS_SENDER:['қол'],T26_POSS_OLAR:['қала']};
 const FORMS={
  T2_PLURAL_LDT:{жер:'жерлер',қыз:'қыздар',адам:'адамдар',дос:'достар',қала:'қалалар',үй:'үйлер'},
  T21_POSS_ASSIM:{көлік:'менің көлігім',мектеп:'менің мектебім',кітап:'менің кітабым'},
  T20_POSS:{дос:'менің досым',қала:'менің қалам',әке:'менің әкем',үй:'менің үйім'},
  T6_PERSON_SG:{оқушы:'оқушымын',адам:'адаммын',дәрігер:'дәрігермін'},
  T4_NO_PLURAL_AFTER_NUMBER:{жер:'екі жер',қыз:'екі қыз',адам:'екі адам',дос:'екі дос'},
  T23_POSS_PL:{дос:'менің достарым',қала:'менің қалаларым'},
  T24_POSS_BIZ:{дос:'біздің досымыз',қала:'біздің қаламыз',үй:'біздің үйіміз',көлік:'біздің көлігіміз'},
  T25_POSS_SENDER:{қала:'сендердің қалаларың',ата:'сіздердің аталарыңыз',үй:'сендердің үйлерің'},
  T26_POSS_OLAR:{дос:'олардың досы',үй:'олардың үйі',көлік:'олардың көлігі'},
  T27_DEIXIS:{осы:'осы қала',анау:'анау үй',сол:'сол мектеп'}
 };
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function allowedRule(id,catalog){
  if(!gate||!gate.allows)return true;
  const skill={T2_PLURAL_LDT:'plural',T4_NO_PLURAL_AFTER_NUMBER:'plural_after_num',T6_PERSON_SG:'person_sg',T7_EMES:'emes',
   T20_POSS:'possessive',T21_POSS_ASSIM:'possessive',T23_POSS_PL:'possessive',T12_GLUE:'person_sg',
   T24_POSS_BIZ:'poss_biz',T25_POSS_SENDER:'poss_sender',T26_POSS_OLAR:'poss_olar',T27_DEIXIS:'deixis'}[id];
  if(!skill)return !gate.FUTURE.includes(id);
  return gate.allows(skill,catalog);
 }
 function card(ruleId,root,form){
  const deixis=ruleId==='T27_DEIXIS';
  return {
   id:'transfer:'+ruleId+':'+root,
   source:'transfer',group:'перенос',part:'1',lessonId:'',topic:'rules',kind:'fields',
   title:'Перенос: то же правило, другой корень',
   stimulus:deixis?'бұл кітап → '+root+' …':root+' → ?',
   fields:[{label:'Ответ',kind:'text',answers:[form]}],
   explanation:(deixis?'Другая рамка, не бұл кітап. ':'')+form+'.',
   ruleIds:[ruleId],
   transfer:true,
   transfer_of:{rule_id:ruleId,taught_on_root:TAUGHT_ON[ruleId]||''},
   practiceOnly:true
  };
 }
 function forRule(ruleId,opts={}){
  if(!allowedRule(ruleId,opts.catalog))return [];
  const taught=opts.excludeRoot||TAUGHT_ON[ruleId];
  const skip=new Set([taught,...(TAUGHT_ALSO[ruleId]||[])].filter(Boolean));
  const table=FORMS[ruleId]||{};
  return Object.keys(table).filter(root=>root!==taught&&!skip.has(root)&&(ruleId==='T27_DEIXIS'||ROOTS.includes(root))).map(root=>card(ruleId,root,table[root]));
 }
 function oneForRule(ruleId,opts={}){
  const list=forRule(ruleId,opts);
  return list.length?clone(list[0]):null;
 }
 function oneForPath(chapter,lesson,opts={}){
  const ids=(chapter&&chapter.rule_ids)||[];
  for(const id of ids){
   const item=oneForRule(id,opts);
   if(item){item.lessonId=lesson&&lesson.id||'';return item;}
  }
  return null;
 }
 function session(ruleId,opts={}){
  const list=forRule(ruleId,opts);
  return list.length?list:forRule('T20_POSS',opts);
 }
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions))return [];
  course.sources=course.sources||{};
  if(!course.sources.transfer)course.sources.transfer={title:'Перенос',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  const rules=Object.keys(FORMS);
  for(const ruleId of rules){
   for(const q of forRule(ruleId,{catalog})){
    if(known.has(q.id))continue;
    course.questions.push(clone(q));known.add(q.id);added.push(q.id);
   }
  }
  return added;
 }
 const api={ROOTS,TAUGHT_ON,FORMS,forRule,oneForRule,oneForPath,session,install,card};
 if(node)module.exports=api;
 else{root.TransferItems=api;}
})(typeof window!=='undefined'?window:globalThis);
