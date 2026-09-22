/* Search the existing corpus. Does not invent rules, cards, or FSRS history. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 function core(){return node?require('./core.js'):root.TrainerCore;}
 function bank(){return node?require('./explain-bank.js'):root.ExplainBank;}
 function chapters(){return node?require('./grammar-chapters.js'):root.GRAMMAR_CHAPTERS;}
 function rulesApi(){return node?require('./ai-rules.js'):root.AiRules;}
 function norm(value){const c=core();return c&&c.normalize?c.normalize(value):String(value||'').toLocaleLowerCase('ru').trim();}
 const ALIASES=[
  ['кітаптарым','T23_POSS_PL'],
  ['кітабымдар','T23_POSS_PL'],
  ['кітапым','T21_POSS_ASSIM'],
  ['менің','T20_POSS'],
  ['сенің','T20_POSS'],
  ['сіздің','T20_POSS'],
  ['оның','T20_POSS'],
  ['біздің','T24_POSS_BIZ'],
  ['притяжательн','T20_POSS'],
  ['озвончен','T21_POSS_ASSIM'],
  ['мой','T20_POSS'],
  ['моя','T20_POSS'],
  ['моё','T20_POSS'],
  ['мое','T20_POSS'],
  ['мои','T23_POSS_PL'],
  ['бар','T22_BAR_ZHOK'],
  ['жоқ','T22_BAR_ZHOK'],
  ['жок','T22_BAR_ZHOK']
 ];
 function strings(node,out){
  if(node==null)return;
  if(typeof node==='string'){out.push(node);return;}
  if(Array.isArray(node)){node.forEach(item=>strings(item,out));return;}
  if(typeof node==='object'){
   for(const key of Object.keys(node)){
    if(key==='k'||key==='id'||key==='type'||key==='error_key'||key==='rule_ids')continue;
    strings(node[key],out);
   }
  }
 }
 function beatBlob(ch){
  const out=[ch&&ch.title||''];
  strings(ch&&ch.beats,out);
  return out.filter(Boolean).join('\n');
 }
 let cache=null;
 function ruleIndex(){
  if(cache)return cache;
  const B=bank(),G=chapters(),R=rulesApi();
  const extra=Object.create(null);
  for(const les of (G&&G.LESSONS)||[]){
   for(const ch of les.chapters||[]){
    const blob=beatBlob(ch);
    for(const id of ch.rule_ids||[]){
     extra[id]=(extra[id]?extra[id]+'\n':'')+blob;
    }
   }
  }
  cache=Object.keys((B&&B.BANK)||{}).map(id=>{
   const card=B.BANK[id]||{};
   const air=R&&R.byId?R.byId(id):null;
   const examples=[].concat(card.examples||[],card.traps||[],air&&air.examples_correct||[],air&&air.examples_wrong||[],air&&air.traps||[]);
   const raw=[card.title,card.short,card.medium,card.ru_refresh,air&&air.title_ru,air&&air.explanation_ru,air&&air.ru_refresh,examples.join('\n'),extra[id]||''].filter(Boolean).join('\n');
   return {id,kind:'rule',title:card.title||(air&&air.title_ru)||'Правило',lesson:card.lesson||(air&&air.lesson_id)||'',examples,text:norm(raw)};
  });
  return cache;
 }
 function aliasOf(query){
  const n=norm(query);
  if(!n)return '';
  const tokens=n.split(/[^0-9a-zа-яёәғқңөұүһі]+/i).filter(Boolean);
  let best='',len=0;
  for(const [key,id] of ALIASES){
   const hit=key.length>=5?n.includes(norm(key)):tokens.includes(norm(key))||n===norm(key);
   if(hit&&key.length>len){best=id;len=key.length;}
  }
  return best;
 }
 function score(rule,n){
  let s=0;
  if(aliasOf(n)===rule.id)s+=80;
  if(norm(rule.title).includes(n))s+=40;
  if((rule.examples||[]).some(ex=>norm(ex).includes(n)))s+=25;
  if(rule.text.includes(n))s+=10;
  return s;
 }
 function wordList(){
  const out=[],seen=new Set();
  function push(kaz,ru,lesson){
   const title=String(kaz||'').trim();
   if(!title)return;
   const key=norm(title);
   if(seen.has(key))return;
   seen.add(key);
   const gloss=Array.isArray(ru)?ru.filter(Boolean).join(' '):String(ru||'');
   out.push({kind:'word',id:'word:'+key,title,lesson:lesson||'',gloss,text:norm(title+' '+gloss)});
  }
  const B=root.WORD_BANK;
  if(B&&B.all)for(const w of B.all)push(w.kazakh,w.translation,w.from_lesson);
  const cat=root.CURRICULUM;
  if(cat&&cat.words)for(const w of cat.words)push(w.kazakh,w.translation,w.lesson_first_seen);
  return out;
 }
 function search(query,opt){
  opt=opt||{};
  const n=norm(query);
  const kind=opt.kind||'';
  const lesson=opt.lesson||'';
  if(!n)return {rules:[],words:[],best:null};
  let rules=kind==='word'?[]:ruleIndex().filter(rule=>!lesson||rule.lesson===lesson).map(rule=>{
   const s=score(rule,n);
   return {id:rule.id,kind:'rule',title:rule.title,lesson:rule.lesson,score:s,exampleHit:(rule.examples||[]).some(ex=>norm(ex).includes(n))};
  }).filter(rule=>rule.score>0);
  if(kind==='example')rules=rules.filter(rule=>rule.exampleHit);
  rules.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'ru'));
  const words=kind==='rule'||kind==='example'?[]:wordList().filter(w=>(!lesson||w.lesson===lesson)&&w.text.includes(n)).slice(0,8);
  return {rules:rules.slice(0,8),words,best:rules[0]||null};
 }
 function bestRule(query){return search(query,{kind:'rule'}).best;}
 function todayQueue(state,questions,now,hooks){
  hooks=hooks||{};
  const isDue=hooks.isDue||function(){return false;};
  const rows=[],seen=new Set();
  const repair=state&&state.repair;
  if(repair){
   const ripe=now>=Number(repair.quiet_until);
   rows.push({id:'repair:'+(repair.rule_id||''),reason:ripe?'проверим на новом слове':'вернёмся после паузы',label:hooks.ruleTitle?hooks.ruleTitle(repair.rule_id):'это правило',action:ripe?'repair':'wait'});
  }
  for(const item of hooks.remediation||[]){
   if(!item||seen.has(item.id))continue;
   seen.add(item.id);
   rows.push({id:item.id,reason:'проверим на новом слове',label:item.stimulus||item.title||'',action:'review'});
  }
  for(const q of questions||[]){
   const rec=state&&state.records&&state.records[q.id];
   if(!rec||seen.has(q.id))continue;
   if(rec.needsReview){
    seen.add(q.id);
    rows.push({id:q.id,reason:(rec.wrong_count||0)>=2?'дважды путала окончание':'ещё раз это окончание',label:q.stimulus||q.title||'',action:'review'});
   }else if(isDue(rec,now)){
    seen.add(q.id);
    rows.push({id:q.id,reason:'пора вспомнить',label:q.stimulus||q.title||'',action:'review'});
   }
  }
  return rows;
 }
 const api={search,bestRule,todayQueue,aliasOf};
 if(node)module.exports=api;
 else root.CorpusSearch=api;
})(typeof window!=='undefined'?window:globalThis);
