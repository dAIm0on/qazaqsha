/* Productive grammar only after the school lesson that introduces it. Vocab TARGET may exist earlier. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const INTRODUCED={
  '1-1':['harmony_row','sounds'],
  '1-2':['plural','plural_ldt','harmony_row'],
  '1-3':['plural_after_num','numerals','phone'],
  '2-1':['person_sg','emes','question_ba_be'],
  '2-2':['person_pl','adjective_predicate','greetings','question_after_r'],
  '2-3':['ordinal','question_full','third_person','farewell'],
  '3-1':['possessive','existence'],
  '3-2':['poss_biz','poss_sender','poss_olar','deixis']
 };
 const FUTURE=['case','possessive','labial','degrees','existence','imperative_paradigm'];
 const FUTURE_RE=/падеж|посессив|притяжательн|губн(ая|ой) гармо|степен(и|ей) сравнен|менің \S+ым|кітабым|бар ма\?|labial|comparative/i;
 const ALWAYS_FUTURE_RE=/падеж|губн(ая|ой) гармо|степен(и|ей) сравнен|labial|comparative/i;
 const POSS_FUTURE_RE=/посессив|притяжательн|менің \S+ым|кітабым/i;
 const EXIST_FUTURE_RE=/бар ма\?/i;
 function lessonRank(id){
  const m=String(id||'').match(/^(\d)-(\d)$/);
  return m?Number(m[1])*10+Number(m[2]):0;
 }
 function installedLessons(catalog){
  const src=catalog||(typeof window!=='undefined'?window.CURRICULUM:null);
  const list=(src&&src.lessons)||[];
  return list.filter(l=>l.active!==false).map(l=>l.id).filter(id=>/^\d-\d$/.test(id));
 }
 function currentMax(catalog){
  return installedLessons(catalog).reduce((a,id)=>Math.max(a,lessonRank(id)),0);
 }
 function introducedAt(skill){
  for(const [les,skills] of Object.entries(INTRODUCED))if(skills.includes(skill))return les;
  return null;
 }
 function allows(skill,catalog){
  const at=introducedAt(skill);if(!at)return !FUTURE.includes(skill);
  return lessonRank(at)<=currentMax(catalog);
 }
 function blob(q){
  return JSON.stringify({
   title:q&&q.title,stimulus:q&&q.stimulus,expl:q&&q.explanation,
   rules:q&&q.ruleIds,skills:q&&q.skillBindings,id:q&&q.id
  });
 }
 function isVocabOnly(q){
  return q&&(q.topic==='vocab'||(q.source||'').startsWith('hw'))&&!(q.ruleIds||[]).some(r=>/possess|case|exist|labial|degree/.test(r));
 }
 function isPossessiveProduction(q){
  if(isVocabOnly(q)&&/менің|сенің|сіздің|оның/.test((q.stimulus||'')+' '+((q.fields||[]).flatMap(f=>f.answers||[]).join(' ')))){
   const answers=((q.fields||[]).flatMap(f=>f.answers||[])).join(' ');
   if(/\S+(ым|ің|іңіз|ы)\b/.test(answers)&&/менің|сенің/.test(answers))return true;
   return false;
  }
  return /менің \S+(ым|ім)|сенің \S+(ың|ің)/i.test(blob(q))&&q.topic!=='vocab';
 }
 function isExistenceGrammar(q){
  if(isVocabOnly(q))return false;
  return /(кітап бар|ат бар|жоқ па)\b/i.test(blob(q))&&!(q.topic==='vocab');
 }
 function isCaseDrill(q){
  if(isVocabOnly(q)||q.topic==='vocab'||q.topic==='rules')return false;
  return /падежн|барыс|табыс|жатыс|шығыс|көмектес/i.test(blob(q));
 }
 function isLabialRule(q){
  return /губн(ая|ой) гармо|labial harmony/i.test(blob(q));
 }
 function isDegreeDrill(q){
  return /степен(и|ей) сравнен|comparative|ең \S+рақ/i.test(blob(q));
 }
 function futureHits(questions,catalog){
  const possBlocked=!allows('possessive',catalog),existBlocked=!allows('existence',catalog);
  return (questions||[]).filter(q=>{
   const b=blob(q),learnerGrammar=!isVocabOnly(q)&&q.topic!=='rules';
   if(isCaseDrill(q)||isLabialRule(q)||isDegreeDrill(q)||ALWAYS_FUTURE_RE.test(b)&&learnerGrammar)return true;
   if(possBlocked&&(isPossessiveProduction(q)||POSS_FUTURE_RE.test(b)&&learnerGrammar))return true;
   if(existBlocked&&(isExistenceGrammar(q)||EXIST_FUTURE_RE.test(b)&&learnerGrammar))return true;
   return false;
  });
 }
 function questionParticleScope(q){
  const les=q&&(q.lessonId||q.lesson_id)||'';
  if(les==='2-1')return 'ba_be';
  if(les==='2-2')return 'ba_be_ma_me_r';
  if(les==='2-3')return 'full';
  return 'none';
 }
 function examEligible(q,catalog){
  if(!q||q.contextOnly||q.source==='phrase'||q.kind==='phrase'||q.practiceOnly)return false;
  if(futureHits([q],catalog).length)return false;
  const skill=(q.ruleIds||[])[0];
  if(['case','possessive','labial','degrees','existence'].includes(skill)&&!allows(skill,catalog))return false;
  return true;
 }
 const api={INTRODUCED,FUTURE,lessonRank,installedLessons,currentMax,introducedAt,allows,isPossessiveProduction,isExistenceGrammar,isCaseDrill,isLabialRule,isDegreeDrill,futureHits,questionParticleScope,isVocabOnly,examEligible};
 if(node)module.exports=api;else root.CurriculumGate=api;
})(typeof window!=='undefined'?window:globalThis);
