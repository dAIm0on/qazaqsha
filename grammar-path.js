/* Grammar path engine. Encoding of a rule, not SRS and not homework. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const data=node?require('./grammar-paths.js'):root.GRAMMAR_PATHS;
 const core=node?require('./core.js'):root.TrainerCore;
 function topic(id){return (data.topics||[]).find(t=>t.id===id)||null;}
 function topics(){return data.topics||[];}
 function lexSet(){return new Set((data.LEX||[]).map(w=>core.normalize(w)));}
 function tokens(s){return String(s||'').split(/[^0-9A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]+/).filter(x=>x&&!/^\d+$/.test(x)&&x.length>1);}
 function lexOk(check){
  const allow=lexSet();
  const blob=[].concat(check.answers||[],check.answer||[],check.stem||'').join(' ');
  return tokens(blob).every(tok=>{
    const n=core.normalize(tok).replace(/^\*/,'');
    if(n.length<=2)return true;
    if(allow.has(n)||[...allow].some(w=>w===n||w.includes(n)||n.includes(w)))return true;
    if(!/[әғқңөұүһіқғ]/.test(n))return true;
    return false;
  });
 }
 function typesOk(checks){
  if(!checks||checks.length<1||checks.length>3)return false;
  const types=checks.map(c=>c.type);
  return new Set(types).size===types.length||checks.length===1;
 }
 function stepMeta(step){
  return {n:(step.checks||[]).length,typesOk:typesOk(step.checks),ids:(step.checks||[]).map(c=>c.id)};
 }
 function mixOf(t){return (t&&t.mix||[]).slice(0,4);}
 function sameTopicMix(t){return mixOf(t).every(c=>String(c.id||'').startsWith(t.id));}
 function tableText(check){
  let text=data.TABLE||'';
  const answers=[].concat(check&&check.answers||[],check&&check.answer?[check.answer]:[]).filter(a=>String(a).length>3);
  for(const a of answers){
    const re=new RegExp('[^\\n]*'+String(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^\\n]*\\n?','iu');
    if(re.test(text))text=text.replace(re,'');
  }
  return text.trim();
 }
 function hasAnswerIn(text,check){
  const blob=String(text||'').toLowerCase();
  return [].concat(check.answers||[],check.answer?[check.answer]:[]).filter(a=>String(a).length>3).some(a=>blob.includes(String(a).toLowerCase()));
 }
 function evalCheck(check,input){
  const got=core.normalize(input||'');
  const opts=[].concat(check.answers||[],check.answer||[]).map(a=>core.normalize(a));
  return opts.includes(got);
 }
 function feedback(check){
  const painted=(check.slots&&check.slots.painted)||'';
  return {
    slot:painted||(check.stem?check.stem+' + …':''),
    lever:check.rule_line||'',
    trap:check.trap||'',
    error_key:check.error_key||'other'
  };
 }
 function schedule(failedId,others){
  return core.blockReviewQueue(failedId,(others||[]).filter(id=>id!==failedId),[],2);
 }
 function emptyProgress(){return {topicId:null,step:0,phase:'pick',queue:[],index:0,peeks:Object.create(null),fails:Object.create(null),passed:Object.create(null),blocked:false,completed:[]};}
 function startTopic(state,topicId){
  const t=topic(topicId);if(!t)return state;
  const gp=state.grammarPath||(state.grammarPath=emptyProgress());
  if(gp.blocked)return gp;
  gp.topicId=topicId;gp.step=0;gp.phase='screen';gp.queue=[];gp.index=0;gp.peeks=Object.create(null);gp.fails=Object.create(null);gp.passed=Object.create(null);
  return gp;
 }
 function beginChecks(gp,t,step){
  gp.phase='checks';gp.queue=(step.checks||[]).map(c=>c.id);gp.index=0;
  return gp;
 }
 function peekRate(gp,stepId){
  const p=gp.peeks[stepId]||{n:0,peek:0};
  return p.n?p.peek/p.n:0;
 }
 function canMix(gp,t){
  const steps=t.steps||[];
  return steps.every(s=>peekRate(gp,s.step_id)<=0.5);
 }
 function notePeek(gp,stepId,peeked){
  const p=gp.peeks[stepId]||(gp.peeks[stepId]={n:0,peek:0});
  p.n++;if(peeked)p.peek++;
 }
 function noteFail(gp,key){
  if(!key)return 0;
  gp.fails[key]=(gp.fails[key]||0)+1;
  if(gp.fails[key]>=3)gp.blocked=true;
  return gp.fails[key];
 }
 function recordPath(state,check,correct,peeked,now=Date.now()){
  const gp=state.grammarPath||(state.grammarPath=emptyProgress());
  const skill='path:'+(gp.topicId||'T')+'::step:'+(gp.step||0);
  state.events=state.events||[];
  state.events.push({type:'path',card_id:check.id,at:now,correct:!!correct,peek:peeked?1:0,first_try_correct:(peeked||!correct)?0:1,item_type:'path',error_key:check.error_key||'',block:'path:'+(gp.topicId||'')});
  if(correct&&!peeked)gp.passed[check.id]=true;
  if(!correct)noteFail(gp,check.error_key);
  notePeek(gp,(topic(gp.topicId)||{steps:[]}).steps[gp.step]&&(topic(gp.topicId).steps[gp.step].step_id),peeked);
  return skill;
 }
 function thousandOk(text){
  if(!/75\s*950|75950/.test(String(text)))return true;
  return /мың/.test(String(text));
 }
 const api={topic,topics,lexOk,typesOk,stepMeta,mixOf,sameTopicMix,tableText,hasAnswerIn,evalCheck,feedback,schedule,emptyProgress,startTopic,beginChecks,peekRate,canMix,recordPath,thousandOk,TABLE:data.TABLE,LEX:data.LEX};
 if(node)module.exports=api;else root.GrammarPath=api;
})(typeof window!=='undefined'?window:globalThis);
