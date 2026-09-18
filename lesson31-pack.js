/* Phase 3 lesson 3-1 closed pack. Session A only: менің + T20/T21. Not installed into COURSE. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;

 function clone(x){return JSON.parse(JSON.stringify(x));}
 function field({id,order,title,stimulus,answers,rule,error_type,explanation,kind='fields',session='A'}){
  return {
   id,source:'phase3-31',group:'3-1-'+session,part:String(order),lessonId:'3-1',topic:'possessive',kind,
   title,stimulus,
   fields:[{label:'Ответ',kind:'text',answers:Array.isArray(answers)?answers:[answers]}],
   explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   vocabIds:[],
   practiceOnly:true,
   phase3:{lesson:'3-1',session,order,error_type,closed_pack:true}
  };
 }
 const SESSION_A=[
  field({
   id:'p3-31-a-g1-ake',order:1,title:'Менің: одна форма',stimulus:'Менің + әке → ?',
   answers:['әкем','Менің әкем'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің + әке → әкем. После гласной для менің добавляется -м.'
  }),
  field({
   id:'p3-31-a-g2-kitap',order:2,title:'Менің: собери форму',stimulus:'Менің + кітап → ?',
   answers:['кітабым','Менің кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ым → кітабым: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-a-g2-qala',order:3,title:'Менің: собери форму',stimulus:'Менің + қала → ?',
   answers:['қалам','Менің қалам'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің + қала → қалам. После гласной добавляется -м.'
  }),
  field({
   id:'p3-31-a-g6-ake',order:4,title:'Найди ошибку и перепиши',stimulus:'Менің әке',
   answers:['Менің әкем','әкем'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің без притяжательной наклейки справа неполно: әке + м → әкем.'
  }),
  field({
   id:'p3-31-a-g6-kitap-missing',order:5,title:'Найди ошибку и перепиши',stimulus:'Менің кітап',
   answers:['Менің кітабым','кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_suffix_missing',
   explanation:'Нужна притяжательная форма: кітап + ым, при этом п→б → кітабым.'
  }),
  field({
   id:'p3-31-a-g6-kitapym',order:6,title:'Найди ошибку и перепиши',stimulus:'Менің кітапым',
   answers:['Менің кітабым','кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'Перед гласной -ым конечная п озвончается: кітап + ым → кітабым.'
  })
 ];
 const SESSION_B=[
  field({
   id:'p3-31-b-g2-ake',order:1,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + әке → ?',
   answers:['әкең','Сенің әкең'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сенің + әке → әкең. После гласной для сенің добавляется -ң.'
  }),
  field({
   id:'p3-31-b-g2-kitap',order:2,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + кітап → ?',
   answers:['кітабың','Сенің кітабың'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ың → кітабың: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-b-g2-dos',order:3,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + дос → ?',
   answers:['досың','Сенің досың'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сенің + дос → досың. После согласной здесь добавляется -ың.'
  })
 ];
 const SESSION_C=[
  field({
   id:'p3-31-c-g2-qala',order:1,session:'C',title:'Оның: собери форму',stimulus:'Оның + қала → ?',
   answers:['қаласы','Оның қаласы'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Оның + қала → қаласы. После гласной для оның добавляется -сы/-сі.'
  }),
  field({
   id:'p3-31-c-g2-ul',order:2,session:'C',title:'Оның: собери форму',stimulus:'Оның + ұл → ?',
   answers:['ұлы','Оның ұлы'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Оның + ұл → ұлы. После согласной здесь добавляется -ы.'
  }),
  field({
   id:'p3-31-c-g2-mektep',order:3,session:'C',title:'Оның: собери форму',stimulus:'Оның + мектеп → ?',
   answers:['мектебі','Оның мектебі'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'мектеп + і → мектебі: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-c-g2-kitap',order:4,session:'C',title:'Оның: собери форму',stimulus:'Оның + кітап → ?',
   answers:['кітабы','Оның кітабы'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ы → кітабы: перед гласной притяжательного окончания п озвончается в б.'
  })
 ];
 const SESSION_D=[
  field({
   id:'p3-31-d-g2-ata',order:1,session:'D',title:'Сіздің: собери форму',stimulus:'Сіздің + ата → ?',
   answers:['атаңыз','Сіздің атаңыз'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сіздің + ата → атаңыз. После гласной в этой форме добавляется -ңыз/-ңіз.'
  }),
  field({
   id:'p3-31-d-g2-kolik',order:2,session:'D',title:'Сіздің: собери форму',stimulus:'Сіздің + көлік → ?',
   answers:['көлігіңіз','Сіздің көлігіңіз'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'көлік + іңіз → көлігіңіз: перед гласной притяжательного окончания к озвончается в г.'
  })
 ];

 function sessionA(){return SESSION_A.map(clone);}
 function sessionB(){return SESSION_B.map(clone);}
 function sessionC(){return SESSION_C.map(clone);}
 function sessionD(){return SESSION_D.map(clone);}
 function all(){return [...sessionA(),...sessionB(),...sessionC(),...sessionD()];}
 function byId(id){const q=[...SESSION_A,...SESSION_B,...SESSION_C,...SESSION_D].find(x=>x.id===id);return q?clone(q):null;}
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-1 closed pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function isClosed(){return true;}

 const api={SESSION_A,SESSION_B,SESSION_C,SESSION_D,sessionA,sessionB,sessionC,sessionD,all,byId,check,isClosed};
 if(node)module.exports=api;else root.Lesson31Pack=api;
})(typeof window!=='undefined'?window:globalThis);
