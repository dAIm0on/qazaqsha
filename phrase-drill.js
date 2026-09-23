/* Phase 2B P1a Phrase Drill. Local checking; no word-FSRS binding; no 3-1. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const banks=node?require('./phrase-banks.js'):root.PhraseBanks;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;
 const lesson31=node?require('./lesson31-pack.js'):root.Lesson31Pack;
 const ORDER=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const pad=n=>String(n).padStart(2,'0');
 function allowedThrough(lessonId){
  const i=ORDER.indexOf(lessonId);return i<0?[]:ORDER.slice(0,i+1);
 }
 function kzList(pair){const z=pair&&pair.kz;return Array.isArray(z)?z.slice():[z];}
 function variant(pair,dir){
  const ru=pair.ru||[],ruPrompt=ru[0]||'',kz=kzList(pair),kzPrompt=kz[0]||'';
  const ruKk=dir==='ru-kk';
  const id='phrase:'+pair.lesson_id+':'+dir+':'+pad(pair.n);
  return {
   id,source:'phrase',group:'PHRASE',part:pad(pair.n),lessonId:pair.lesson_id,topic:'phrase',kind:'phrase',
   dir,pair_key:pair.pair_key,root_lesson:pair.root_lesson,
   title:ruKk?'Переведи фразу на казахский':'Переведи фразу на русский',
   stimulus:ruKk?ruPrompt:kzPrompt,
   fields:[{label:ruKk?'Фраза по-казахски':'Перевод на русский',kind:'text',answers:ruKk?kz:ru.slice()}],
   explanation:kzPrompt+' — '+ruPrompt+'.',
   ruleIds:pair.rule_ids.slice(),allowed_lesson_ids:allowedThrough(pair.lesson_id),
   vocabIds:[],errorTargets:(pair.error_targets||[]).slice(),morph:pair.morph||'',contrast:pair.contrast||'',
   phase2b:{genre:'PHRASE',phrase:true,error_type:pair.error_type||'',pair_key:pair.pair_key,root_lesson:pair.root_lesson}
  };
 }
 function lesson31Open(catalog){return !!(gate&&gate.allows&&gate.allows('possessive',catalog));}
 function lesson32Open(catalog){return !!(gate&&gate.allows&&gate.allows('poss_biz',catalog));}
 function lesson33Open(catalog){return !!(gate&&gate.allows&&gate.allows('poss_person_stack',catalog));}
 function forLesson(lessonId,catalog){
  if(lessonId==='3-1'){
   if(!lesson31Open(catalog)||!lesson31||!lesson31.sessionG)return [];
   return lesson31.sessionG().map(clone);
  }
  if(lessonId==='3-2'){
   if(!lesson32Open(catalog))return [];
   return banks.forLesson('3-2').map(p=>variant(p,p.n<=12?'kk-ru':'ru-kk'));
  }
  if(lessonId==='3-3'){
   if(!lesson33Open(catalog))return [];
   return banks.forLesson('3-3').flatMap(p=>[variant(p,'kk-ru'),variant(p,'ru-kk')]);
  }
  return banks.forLesson(lessonId).flatMap(p=>[variant(p,'ru-kk'),variant(p,'kk-ru')]);
 }
 function allQuestions(catalog){return [...['1-2','1-3'].flatMap(id=>forLesson(id,catalog)),...forLesson('3-1',catalog),...forLesson('3-2',catalog),...forLesson('3-3',catalog)];}
 function weaknessKeys(profile){
  if(!profile)return new Set();
  if(Array.isArray(profile))return new Set(profile.flatMap(x=>typeof x==='string'?[x]:[x&&x.error_code,x&&x.error_type,x&&x.skill_tag].filter(Boolean)));
  if(typeof profile==='object')return new Set(Object.entries(profile).filter(([,v])=>!!v).map(([k])=>k));
  return new Set();
 }
 function shuffled(list,random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function pairScore(p,weak,seen){
  const vars=[variant(p,'ru-kk'),variant(p,'kk-ru')];
  const weakHit=(p.error_targets||[]).some(x=>weak.has(x))||weak.has(p.error_type);
  const unseen=vars.some(q=>!seen.has(q.id));
  return (weakHit?4:0)+(unseen?2:0);
 }
 function rulesApi(){
  if(node){if(!rulesApi.mod){try{rulesApi.mod=require('./ai-rules.js');}catch{rulesApi.mod=null;}}return rulesApi.mod;}
  return root.AiRules||null;
 }
 function tutorApi(){
  if(node){if(!tutorApi.mod){try{tutorApi.mod=require('./ai-tutor.js');}catch{tutorApi.mod=null;}}return tutorApi.mod;}
  return root.AiTutor||null;
 }
 function cardHits(q,weak){
  if(!q||!weak||!weak.size)return false;
  const bits=[];
  const add=x=>{if(typeof x==='string'&&x)bits.push(x);};
  (q.errorTargets||[]).forEach(add);
  if(q.phase2b)add(q.phase2b.error_type);
  if(q.phase3)add(q.phase3.error_type);
  (q.ruleIds||[]).forEach(add);
  const T=tutorApi();
  if(T&&T.mapDiag){
   if(q.phase3&&q.phase3.error_type)add(T.mapDiag(q.phase3.error_type,'',''));
   if(q.phase2b&&q.phase2b.error_type)add(T.mapDiag(q.phase2b.error_type,'',''));
  }
  const R=rulesApi();
  if(R&&R.byId)for(const id of q.ruleIds||[]){const card=R.byId(id);if(card&&card.error_codes)card.error_codes.forEach(add);}
  return bits.some(x=>weak.has(x));
 }
 function byWeak(list,weak,seen,random){
  return shuffled(list,random).sort((a,b)=>{
   const d=Number(cardHits(b,weak))-Number(cardHits(a,weak));
   if(d)return d;
   return Number(!seen.has(b.id))-Number(!seen.has(a.id));
  });
 }
 function session(lessonId,opts={}){
  const catalog=opts.catalog||(typeof window!=='undefined'?window.CURRICULUM:null);
  if(lessonId==='3-1'){
   if(!lesson31Open(catalog))return [];
   const random=typeof opts.random==='function'?opts.random:Math.random,seen=new Set(opts.seen_ids||[]),weak=weaknessKeys(opts.error_profile);
   const cards=forLesson('3-1',catalog),requested=Math.max(2,Math.floor(Number(opts.count)||12)),count=Math.min(requested,cards.length);
   const byDir=dir=>byWeak(cards.filter(q=>q.title===dir),weak,seen,random);
   const ruCount=Math.ceil(count/2),kkCount=count-ruCount;
   return shuffled([...byDir('RU → KK').slice(0,ruCount),...byDir('KK → RU').slice(0,kkCount)],random);
  }
  if(lessonId==='3-2'){
   if(!lesson32Open(catalog))return [];
   const random=typeof opts.random==='function'?opts.random:Math.random,seen=new Set(opts.seen_ids||[]),weak=weaknessKeys(opts.error_profile);
   const cards=forLesson('3-2',catalog),requested=Math.max(2,Math.floor(Number(opts.count)||24)),count=Math.min(requested,cards.length);
   return byWeak(cards,weak,seen,random).slice(0,count);
  }
  if(lessonId==='3-3'){
   if(!lesson33Open(catalog))return [];
   const random=typeof opts.random==='function'?opts.random:Math.random,seen=new Set(opts.seen_ids||[]),weak=weaknessKeys(opts.error_profile);
   const pack33=node?require('./lesson33-pack.js'):root.Lesson33Pack;
   let cards=forLesson('3-3',catalog);
   if(pack33&&pack33.phraseUnlocked)cards=cards.filter(q=>pack33.phraseUnlocked(q.id,{events:opts.events||[]}));
   const requested=Math.max(2,Math.floor(Number(opts.count)||12)),count=Math.min(requested,cards.length);
   return byWeak(cards,weak,seen,random).slice(0,count);
  }
  if(!['1-2','1-3'].includes(lessonId))return [];
  const random=typeof opts.random==='function'?opts.random:Math.random;
  const weak=weaknessKeys(opts.error_profile),seen=new Set(opts.seen_ids||[]);
  let pairs=banks.forLesson(lessonId);
  const requested=Math.max(1,Math.floor(Number(opts.count)||12));
  const count=Math.min(requested,pairs.length); // 1-2 safely caps at 11 unique semantic pairs.
  pairs=shuffled(pairs,random).sort((a,b)=>pairScore(b,weak,seen)-pairScore(a,weak,seen));
  const minEarlier=Math.ceil(count*.70);
  const isWeak=p=>(p.error_targets||[]).some(x=>weak.has(x))||weak.has(p.error_type);
  const unseenFirst=list=>list.slice().sort((a,b)=>Number(bothUnseen(b))-Number(bothUnseen(a)));
  function bothUnseen(p){return !seen.has(variant(p,'ru-kk').id)&&!seen.has(variant(p,'kk-ru').id);}
  const picked=[],targetedPairs=new Set();
  const weakEarly=unseenFirst(pairs.filter(p=>isWeak(p)&&p.root_lesson!==lessonId));
  const weakCurrent=unseenFirst(pairs.filter(p=>isWeak(p)&&p.root_lesson===lessonId));
  const weakCap=Math.min(4,count);
  for(const p of weakEarly){if(picked.length>=weakCap)break;picked.push(p);targetedPairs.add(p.pair_key);}
  const currentWeakCap=Math.max(0,count-minEarlier);
  let currentWeak=0;
  for(const p of weakCurrent){
   if(picked.length>=weakCap||currentWeak>=currentWeakCap)break;
   if(!picked.some(x=>x.pair_key===p.pair_key)){picked.push(p);targetedPairs.add(p.pair_key);currentWeak++;}
  }
  const earlier=unseenFirst(pairs.filter(p=>p.root_lesson!==lessonId));
  while(picked.filter(p=>p.root_lesson!==lessonId).length<Math.min(minEarlier,count)){
   const p=earlier.find(x=>!picked.some(y=>y.pair_key===x.pair_key));if(!p)break;picked.push(p);
  }
  for(const p of unseenFirst(pairs)){if(picked.length>=count)break;if(!picked.some(x=>x.pair_key===p.pair_key))picked.push(p);}
  const selected=shuffled(picked.slice(0,count),random);
  const ruTarget=Math.ceil(selected.length/2);
  let ruUsed=0,kkUsed=0;
  return selected.map((p,i)=>{
   let dir=ruUsed<ruTarget?'ru-kk':'kk-ru';
   const want=variant(p,dir),alt=variant(p,dir==='ru-kk'?'kk-ru':'ru-kk');
   if(seen.has(want.id)&&!seen.has(alt.id)){
    const altRu=alt.dir==='ru-kk';
    if((altRu&&ruUsed<ruTarget)||(!altRu&&kkUsed<selected.length-ruTarget))dir=alt.dir;
   }
   if(dir==='ru-kk')ruUsed++;else kkUsed++;
   const q=variant(p,dir);q.phase2b.weakness_targeted=targetedPairs.has(p.pair_key);return q;
  });
 }
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions))return [];
  course.sources=course.sources||{};
  if(!course.sources.phrase)course.sources.phrase={title:'Phrase Drill',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of allQuestions(catalog)){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 const api={ORDER,allowedThrough,variant,forLesson,allQuestions,session,install};
 if(node)module.exports=api;
 else{root.PhraseDrill=api;if(root.COURSE)install(root.COURSE,root.CURRICULUM);}
})(typeof window!=='undefined'?window:globalThis);
