/* Phase 2B P1a Phrase Drill. Local checking; no word-FSRS binding; no 3-1. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const banks=node?require('./phrase-banks.js'):root.PhraseBanks;
 const ORDER=['1-1','1-2','1-3','2-1','2-2','2-3'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const pad=n=>String(n).padStart(2,'0');
 function allowedThrough(lessonId){
  const i=ORDER.indexOf(lessonId);return i<0?[]:ORDER.slice(0,i+1);
 }
 function variant(pair,dir){
  const ru=pair.ru||[],ruPrompt=ru[0]||'';
  const ruKk=dir==='ru-kk';
  const id='phrase:'+pair.lesson_id+':'+dir+':'+pad(pair.n);
  return {
   id,source:'phrase',group:'PHRASE',part:pad(pair.n),lessonId:pair.lesson_id,topic:'phrase',kind:'phrase',
   dir,pair_key:pair.pair_key,root_lesson:pair.root_lesson,
   title:ruKk?'Переведи фразу на казахский':'Переведи фразу на русский',
   stimulus:ruKk?ruPrompt:pair.kz,
   fields:[{label:ruKk?'Фраза по-казахски':'Перевод на русский',kind:'text',answers:ruKk?[pair.kz]:ru.slice()}],
   explanation:pair.kz+' — '+ruPrompt+'.',
   ruleIds:pair.rule_ids.slice(),allowed_lesson_ids:allowedThrough(pair.lesson_id),
   vocabIds:[],errorTargets:(pair.error_targets||[]).slice(),morph:pair.morph||'',contrast:pair.contrast||'',
   phase2b:{genre:'PHRASE',phrase:true,error_type:pair.error_type||'',pair_key:pair.pair_key,root_lesson:pair.root_lesson}
  };
 }
 function forLesson(lessonId){
  return banks.forLesson(lessonId).flatMap(p=>[variant(p,'ru-kk'),variant(p,'kk-ru')]);
 }
 function allQuestions(){return ['1-2','1-3'].flatMap(forLesson);}
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
 function session(lessonId,opts={}){
  if(!['1-2','1-3'].includes(lessonId))return [];
  const random=typeof opts.random==='function'?opts.random:Math.random;
  const weak=weaknessKeys(opts.error_profile),seen=new Set(opts.seen_ids||[]);
  let pairs=banks.forLesson(lessonId);
  const requested=Math.max(1,Math.floor(Number(opts.count)||12));
  const count=Math.min(requested,pairs.length); // 1-2 safely caps at 11 unique semantic pairs.
  pairs=shuffled(pairs,random).sort((a,b)=>pairScore(b,weak,seen)-pairScore(a,weak,seen));
  const minEarlier=Math.ceil(count*.70);
  const earlier=pairs.filter(p=>p.root_lesson!==lessonId);
  const picked=[];
  for(const p of earlier){if(picked.length>=Math.min(minEarlier,count))break;picked.push(p);}
  for(const p of pairs){if(picked.length>=count)break;if(!picked.some(x=>x.pair_key===p.pair_key))picked.push(p);}
  const selected=shuffled(picked,random);
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
   return variant(p,dir);
  });
 }
 function install(course){
  if(!course||!Array.isArray(course.questions))return [];
  course.sources=course.sources||{};
  if(!course.sources.phrase)course.sources.phrase={title:'Phrase Drill',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of allQuestions()){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 const api={ORDER,allowedThrough,variant,forLesson,allQuestions,session,install};
 if(node)module.exports=api;
 else{root.PhraseDrill=api;if(root.COURSE)install(root.COURSE);}
})(typeof window!=='undefined'?window:globalThis);
