/* Single correction layer. Lesson packs cannot overwrite these overrides. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 function n(s){return core.normalize(s);}
 const ITEMS=[
  {id:'n75950',lesson:'1-3',type:'factual',wrong:['жетпіс бес тоғыз жүз елу'],canonical:['жетпіс бес мың тоғыз жүз елу'],reason:'ключ 1-3 без мың',scope:'all',keep:false},
  {id:'ord20',lesson:'2-3',type:'factual',wrong:['жиырманшы'],canonical:['жиырмасыншы'],reason:'исключение 20-го',scope:'all',keep:false},
  {id:'ord20p',lesson:'2-3',type:'factual',wrong:['жиырманшысыңдар ма?','жиырманшысыңдар ма'],canonical:['жиырмасыншысыңдар ма?','жиырмасыншысыңдар ма'],reason:'та же дыра + лицо',scope:'all',keep:false},
  {id:'ord20-cross',lesson:'2-3',type:'key_mapping',wrong:['отызыншы біріншісіңдер ме?','отызыншы біріншісіңдер ме'],canonical:[],reason:'чужой ответ другой строки',scope:'all',keep:false,forbid_for_prompt:/жиырманшы/i},
  {id:'kurby',lesson:'2-3',type:'spelling',wrong:['құрбысындар ма?','құрбысындар ма'],canonical:['құрбысыңдар ма?','құрбысыңдар ма'],reason:'пропущено ң',scope:'all',keep:false},
  {id:'qazaq-pyn',lesson:'2-3',type:'trap',wrong:['мен қазақпін','мен қазақпін.'],canonical:['мен қазақпын','мен қазақпын.'],reason:'гармония пын, не пін',scope:'error-exercise',keep:false},
  {id:'olar-baylar',lesson:'2-3',type:'keep',wrong:[],canonical:['олар байлар'],reason:'субстантивация курса, не чинить на олар бай',scope:'all',keep:true},
  {id:'zhomart',lesson:'2-3',type:'metadata',wrong:[],canonical:['жомарттар екінші'],reason:'заголовок «сороковые» — разъезд ключа; смысл «вторые»',scope:'all',keep:false,strip:/сороков/i},
  {id:'sau-role',lesson:'2-3',type:'label',wrong:[],canonical:['сау болыңыздар'],reason:'уважительное множественное / сіздер',scope:'all',keep:false,role:'respectful_plural'}
 ];
 const MIXED={
  'мұғалім':'soft','мұхит':'hard','заңгер':'hard','кітап':'hard','іссапар':'hard','адам':'hard','сөз':'soft','жігіт':'soft'
 };
 const ROW_SOFT=/[әөіүе]/i,ROW_HARD=/[аоыұ]/i;
 function suffixRow(word){
  const w=n(word);
  if(MIXED[w])return MIXED[w];
  const parts=w.split(/(?=[аәеёиоөұүыі])/i).filter(Boolean);
  for(let i=parts.length-1;i>=0;i--){
    if(ROW_SOFT.test(parts[i]))return 'soft';
    if(ROW_HARD.test(parts[i]))return 'hard';
  }
  if(ROW_SOFT.test(w))return 'soft';
  if(ROW_HARD.test(w))return 'hard';
  return 'unknown';
 }
 function isTrapItem(q){
  return (q&&q.type==='trap_choice')||(q&&q.k==='ask'&&q.type==='trap_choice');
 }
 function isKeepForm(s){
  const x=n(s);
  return x==='олар байлар'||x==='олар байлар.';
 }
 function rewriteAnswer(ans,q){
  const raw=String(ans??'');
  const x=n(raw);
  if(isKeepForm(raw))return raw;
  if(isTrapItem(q))return raw;
  for(const it of ITEMS){
   if(it.keep)continue;
   if(it.forbid_for_prompt&&it.forbid_for_prompt.test(q&&q.stimulus||'')&&it.wrong.some(w=>n(w)===x))return null;
   const wi=it.wrong.findIndex(w=>n(w)===x);
   if(wi>=0&&it.canonical[0]){
    const canon=it.canonical[0];
    return /[A-ZА-ЯӘҒҚҢӨҰҮҺІ]/.test(raw[0]||'')?canon[0].toUpperCase()+canon.slice(1):canon;
   }
  }
  return raw;
 }
 function applyQuestion(q){
  if(!q||typeof q!=='object')return q;
  if(q.fields)for(const f of q.fields){
   if(!Array.isArray(f.answers))continue;
   const next=[];
   for(const a of f.answers){
    const r=rewriteAnswer(a,q);
    if(r==null)continue;
    if(!next.some(x=>n(x)===n(r)))next.push(r);
   }
   if(!isTrapItem(q)){
    for(const it of ITEMS){
     if(it.keep||!it.canonical.length)continue;
     if(it.wrong.some(w=>f.answers.some(a=>n(a)===n(w)))||(q.stimulus&&it.wrong.some(w=>n(q.stimulus).includes(n(w).replace(/[?.]/g,''))))){
      for(const c of it.canonical)if(!next.some(x=>n(x)===n(c)))next.push(c);
     }
    }
   }
   if(next.length)f.answers=next;
  }
  const blob=(q.explanation||'')+' '+(q.note||'')+' '+(q.title||'');
  if(/сау болыңыздар/i.test(blob)||/сау болыңыздар/i.test(q.stimulus||'')){
   q.chunk_role='respectful_plural';
   if(q.explanation)q.explanation=q.explanation.replace(/фамильярн[а-я]*/gi,'уважительное множественное');
   if(q.note)q.note=String(q.note).replace(/фамильярн[а-я]*/gi,'уважительное множественное');
  }
  if(/щедр/i.test(q.stimulus||'')&&/втор/i.test(q.stimulus||'')){
   q.explanation=String(q.explanation||'').replace(/сороков[а-я]*/gi,'вторые');
   q.note=q.note?String(q.note).replace(/сороков[а-я]*/gi,'вторые'):q.note;
   q.key_heading='вторые';
  }
  applyIdFix(q);
  return q;
 }
 const ID_FIX={
  'e21-fix-8':{
   lesson:'2-1',
   drop:['сен мұғалімсің емессің.','сен мұғалімсің емессің'],
   keep:['Сен мұғалім емессің.','Сен мұғалім емессің'],
   explanation:'По правилу урока личное окончание стоит только на емес: Сен мұғалім емессің. Форма с окончанием и на основу, и на емес не принимается.'
  },
  'e22-5-8':{
   lesson:'2-2',
   drop:['сендер құрбысыңдар емессіңдер.','сендер құрбысыңдар емессіңдер'],
   keep:['Сендер құрбы емессіңдер.','Сендер құрбы емессіңдер'],
   explanation:'По правилу урока личное окончание стоит только на емес: Сендер құрбы емессіңдер. Форма с окончанием и на основу, и на емес не принимается.'
  }
 };
 function applyIdFix(q){
  const fix=q&&ID_FIX[q.id];
  if(!fix)return;
  if(q.lessonId&&q.lessonId!==fix.lesson)return;
  for(const f of q.fields||[]){
   if(!Array.isArray(f.answers))continue;
   const russian=/русск/i.test(f.label||'');
   const next=[];
   for(const a of f.answers){
    if(!russian&&fix.drop.includes(n(a)))continue;
    if(!next.some(x=>n(x)===n(a)))next.push(a);
   }
   if(!russian)for(const c of fix.keep)if(!next.some(x=>n(x)===n(c)))next.push(c);
   if(next.length)f.answers=next;
  }
  q.explanation=fix.explanation;
 }
 function applyAll(list){
  for(const q of list||[])applyQuestion(q);
  return list;
 }
 function forbidsWrong(form){
  const x=n(form);
  return ITEMS.some(it=>!it.keep&&it.wrong.some(w=>n(w)===x));
 }
 function canonicalOf(form){
  const x=n(form);
  const it=ITEMS.find(i=>i.wrong.some(w=>n(w)===x));
  return it&&it.canonical[0]||null;
 }
 function farewellRole(form){
  const x=n(form);
  if(x==='сау бол')return 'familiar_sg';
  if(/сау болыңдар/.test(x))return 'familiar_pl';
  if(/сау болыңыздар/.test(x))return 'respectful_plural';
  if(/сау болыңыз/.test(x))return 'respectful_sg';
  return null;
 }
 function isAccepted(q,input,field=0){
  const f=q&&q.fields&&q.fields[field];if(!f)return false;
  const got=n(input,f.kind);
  if(f.answers.some(a=>n(a,f.kind)===got))return true;
  if(core.numberValue&&f.answers.some(a=>{
   const ev=core.numberValue(input),ex=core.numberValue(a);
   return ev!=null&&ex!=null&&ev===ex;
  }))return true;
  return false;
 }
 const api={ITEMS,MIXED,ID_FIX,suffixRow,applyQuestion,applyAll,forbidsWrong,canonicalOf,farewellRole,isTrapItem,isAccepted,isKeepForm};
 if(node)module.exports=api;else root.Canonical=api;
})(typeof window!=='undefined'?window:globalThis);
