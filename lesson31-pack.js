/* Phase 3 lesson 3-1 closed pack. Session A only: менің + T20/T21. Not installed into COURSE. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;

 function clone(x){return JSON.parse(JSON.stringify(x));}
 function field({id,order,title,stimulus,answers,rule,error_type,explanation,kind='fields'}){
  return {
   id,source:'phase3-31',group:'3-1-A',part:String(order),lessonId:'3-1',topic:'possessive',kind,
   title,stimulus,
   fields:[{label:'Ответ',kind:'text',answers:Array.isArray(answers)?answers:[answers]}],
   explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   vocabIds:[],
   practiceOnly:true,
   phase3:{lesson:'3-1',session:'A',order,error_type,closed_pack:true}
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

 function sessionA(){return SESSION_A.map(clone);}
 function all(){return sessionA();}
 function byId(id){return SESSION_A.find(q=>q.id===id)?clone(SESSION_A.find(q=>q.id===id)):null;}
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-1 Session A unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function isClosed(){return true;}

 const api={SESSION_A,sessionA,all,byId,check,isClosed};
 if(node)module.exports=api;else root.Lesson31Pack=api;
})(typeof window!=='undefined'?window:globalThis);
