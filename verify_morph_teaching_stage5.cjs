'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),T=require('./morph-teaching-data'),P=require('./morph-teaching-practice');

let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');

test('Stage 5 runtime is limited to modules 1–4',()=>{
 assert.deepEqual(P.MODULES,['harmony','voice','plural','nasal']);
 for(const id of P.MODULES)assert.ok(T.modules.find(x=>x.id===id));
 for(const id of ['poss','person','chains','verbs','mixed'])assert.equal(P.MODULES.includes(id),false);
});

test('Browser load order provides data, engine, state, practice, then UI',()=>{
 new vm.Script(fs.readFileSync('morph-teaching-practice.js','utf8'));new vm.Script(ui);
 const order=['morph-teaching-data.js','morph-engine.js','morph-state.js','morph-teaching-practice.js','morph-ui.js'].map(x=>html.indexOf('src="'+x+'"'));
 assert.ok(order.every(x=>x>0));for(let i=1;i<order.length;i++)assert.ok(order[i]>order[i-1],order.join(','));
});

test('Offline cache contains the Stage 5 runtime',()=>{
 const assets=JSON.parse(sw.match(/ASSETS=(\[[^;]+\]);/)[1]);
 assert.ok(assets.includes('morph-teaching-practice.js'));
 assert.ok(fs.existsSync('morph-teaching-practice.js'));
});

test('Guided plans use admitted train items and module families only',()=>{
 for(const id of P.MODULES){
  const m=T.modules.find(x=>x.id===id),plan=P.guidedPlan(id);assert.ok(plan.length>=4,id);
  for(const x of plan){const item=E.getItem(x.itemId);assert.equal(item.split,'train');assert.equal(item.sequence.length,1);assert.ok(m.families.includes(x.familyId));}
 }
});

test('Guided plans cover the intended controlled contrasts',()=>{
 assert.deepEqual(P.guidedPlan('harmony').map(x=>x.feature),['back','front','back','front']);
 assert.deepEqual(P.guidedPlan('voice').map(x=>x.feature),['nonvoiceless','voiceless','nonvoiceless','voiceless']);
 assert.deepEqual(P.guidedPlan('plural').map(x=>x.feature),['L','D','T','L','D','T']);
 assert.deepEqual(P.guidedPlan('nasal').map(x=>x.familyId),['GEN','ACC','ABL','INS']);
});

test('Nasal guided contrast holds the same nasal lemma across four families',()=>{
 const p=P.guidedPlan('nasal'),lemmas=[...new Set(p.map(x=>x.lemmaId))];assert.equal(lemmas.length,1);
 for(const x of p)assert.equal(E.getItem(x.itemId).trace.at(-1).edge,'nasal');
});

test('Independent choice and input do not reuse guided lemmas',()=>{
 for(const id of P.MODULES){
  const guided=new Set(P.guidedPlan(id).map(x=>x.lemmaId));
  for(const mode of ['choice','input'])for(const x of P.independentPlan(id,mode))assert.equal(guided.has(x.lemmaId),false,id+' '+mode+' '+x.lemmaId);
 }
});

test('Independent choice and input do not repeat the same exact item',()=>{
 for(const id of P.MODULES){
  const choice=new Set(P.independentPlan(id,'choice').map(x=>x.itemId));
  for(const x of P.independentPlan(id,'input'))assert.equal(choice.has(x.itemId),false,id+' '+x.itemId);
 }
});

test('Independent plans preserve contrast coverage',()=>{
 for(const id of ['harmony','voice','plural']){
  const choice=P.independentPlan(id,'choice').map(x=>x.feature),input=P.independentPlan(id,'input').map(x=>x.feature);
  for(const f of [...new Set(P.TARGETS[id].choice)])assert.ok(choice.includes(f),id+' choice '+f);
  for(const f of [...new Set(P.TARGETS[id].input)])assert.ok(input.includes(f),id+' input '+f);
 }
 const nasalChoice=P.independentPlan('nasal','choice').map(x=>x.familyId),nasalInput=P.independentPlan('nasal','input').map(x=>x.familyId);
 for(const f of ['GEN','ACC','ABL','INS'])assert.ok(nasalChoice.includes(f)||nasalInput.includes(f),f);
});

test('Every guided or independent task has a different-lemma repair in its real session context',()=>{
 for(const id of P.MODULES){
  const guided=P.guidedPlan(id),guidedExclude=guided.map(x=>x.lemmaId);
  for(const src of guided){const repair=P.repairFor(id,src,guidedExclude);assert.notEqual(repair.lemmaId,src.lemmaId);}
  for(const mode of ['choice','input']){
   const plan=P.independentPlan(id,mode),exclude=[...guidedExclude,...plan.map(x=>x.lemmaId)];
   for(const src of plan){const repair=P.repairFor(id,src,exclude);assert.notEqual(repair.lemmaId,src.lemmaId);}
  }
 }
});

test('Stage 5 independent sessions are valid existing morph sessions',()=>{
 for(const id of P.MODULES)for(const mode of ['choice','input']){
  const s=P.createIndependentSession(id,mode,1700000000000);assert.ok(S.session(s),id+' '+mode);assert.equal(s.mode,'learn');assert.equal(s.level,id);assert.equal(s.hinted,false);assert.equal(s.closesLevel,false);
  assert.equal(s.queue.length,mode==='choice'?6:4);
 }
});

test('Guided evaluation is exact but remains outside MorphEngine.answer',()=>{
 for(const id of P.MODULES){const x=P.guidedPlan(id)[0];assert.equal(P.evaluate(x,x.expected),true);assert.equal(P.evaluate(x,x.expected+'x'),false);}
 const start=ui.indexOf('function stage5Guided('),end=ui.indexOf('function startStage5Independent('),block=ui.slice(start,end);
 assert.ok(start>0&&end>start);assert.equal(block.includes('E.answer('),false);assert.equal(block.includes('bridge().answer('),false);
});

test('Stage 5 support is visible guidance without leaking the full expected form',()=>{
 for(const id of P.MODULES)for(const x of P.guidedPlan(id)){const support=P.support(id,x);assert.ok(support.length>20);assert.equal(support.includes(x.expected),false,id+' '+x.expected);}
});

test('Stage 5 readiness requires Level 0 completion for every family',()=>{
 for(const id of P.MODULES){
  const m=T.modules.find(x=>x.id===id);let state=S.empty();assert.equal(P.fullStage5Ready(state,id),false);
  for(const familyId of m.families){
   state=S.recordTeaching(state,{eventId:id+':semantic:'+familyId,type:'semantic_intro_completed',moduleId:id,familyId,at:10,responseMode:'view'}).state;
   state=S.recordTeaching(state,{eventId:id+':feature:'+familyId,type:'feature_notice_attempt',moduleId:id,familyId,at:11,responseMode:'choice',correct:true}).state;
  }
  assert.equal(P.fullStage5Ready(state,id),true,id);
 }
});

test('Guided and correction events are explicitly teaching evidence',()=>{
 assert.ok(ui.includes("type:'guided_attempt'"));assert.ok(ui.includes("type:'correction_after_feedback'"));
 assert.ok(ui.includes("hinted:true"));
 let state=S.empty();
 state=S.recordTeaching(state,{eventId:'g',type:'guided_attempt',moduleId:'plural',familyId:'PL',at:1,responseMode:'choice',correct:true,hinted:true}).state;
 state=S.recordTeaching(state,{eventId:'r',type:'correction_after_feedback',moduleId:'plural',familyId:'PL',at:2,responseMode:'choice',correct:true,hinted:true}).state;
 const e=S.teachingEvidence(state,{moduleId:'plural'});
 assert.equal(e.guided.attempts,1);assert.equal(e.corrections.attempts,1);assert.equal(e.independentChoice.attempts,0);assert.equal(e.independentInput.attempts,0);
});

test('Independent Stage 5 practice uses the existing answer bridge and disables hints',()=>{
 assert.ok(ui.includes("['INDEPENDENT_CHOICE','FULL_INPUT']"));
 assert.ok(ui.includes('stage5Independent'));
 assert.ok(ui.includes('!stage5Independent&&view.hint'));
 assert.ok(ui.includes('bridge().answer(result)'));
 assert.ok(ui.includes("P.createIndependentSession(moduleId,responseMode"));
});

test('Wrong independent answer routes to ERROR_REPAIR before next item',()=>{
 assert.ok(ui.includes("setTeachingResume(r.currentModule,'ERROR_REPAIR'"));
 assert.ok(ui.includes("sourceItemId:s.result.itemId"));
 assert.ok(ui.includes("Ответ разобран. Теперь тот же контраст на другой основе."));
});

test('Repair returns to the production session without becoming independent evidence',()=>{
 assert.ok(ui.includes("type:'correction_after_feedback'"));
 assert.ok(ui.includes("saveSession({...E.next(s),updatedAt:Date.now()+2})"));
 assert.ok(ui.includes("это исправление не считается independent"));
});

test('Stage 5 completion does not claim mastery or transfer',()=>{
 assert.ok(ui.includes('Это завершённый учебный блок, а не заявление «навык освоен»'));
 assert.ok(ui.includes('Перенос и удержание проверяются отдельно'));
 assert.equal(ui.includes('Stage 5 mastered'),false);
});

test('Stage 5 prerequisite chain is harmony then voice then plural then nasal',()=>{
 assert.equal(P.previousModule('harmony'),null);assert.equal(P.previousModule('voice'),'harmony');assert.equal(P.previousModule('plural'),'voice');assert.equal(P.previousModule('nasal'),'plural');
 let state=S.empty();assert.equal(P.prerequisitesReady(state,'harmony'),true);assert.equal(P.prerequisitesReady(state,'voice'),false);
 state=S.recordTeaching(state,{eventId:'done:harmony',type:'stage5_module_completed',moduleId:'harmony',familyId:null,at:1,responseMode:'view'}).state;
 assert.equal(P.prerequisitesReady(state,'voice'),true);assert.equal(P.prerequisitesReady(state,'plural'),false);
});

test('Stage 5 completion event is routing evidence, not production mastery',()=>{
 const r=S.recordTeaching(S.empty(),{eventId:'done:plural',type:'stage5_module_completed',moduleId:'plural',familyId:null,at:1,responseMode:'view'});
 assert.equal(r.accepted,true);assert.equal(r.event.productionMastery,false);assert.equal(S.teachingEvidence(r.state,{moduleId:'plural'}).moduleCompleted,true);
 assert.ok(ui.includes("recordOnce('stage5_module_completed'"));assert.ok(ui.includes('Перенос и удержание проверяются отдельно'));
});

test('Stage 5 keeps later modules out of the new guided route',()=>{
 assert.ok(ui.includes("P.MODULES.includes(module.id)"));
 assert.ok(ui.includes('Guided Stage 5 доступен только для первых четырёх модулей.'));
});

test('Repair teaching events persist the exposed item and lemma identity',()=>{
 const source=P.guidedPlan('harmony')[0],repair=P.repairFor('harmony',source,P.guidedPlan('harmony').map(x=>x.lemmaId));
 const r=S.recordTeaching(S.empty(),{eventId:'repair:identity',type:'correction_after_feedback',moduleId:'harmony',familyId:repair.familyId,itemId:repair.itemId,lemmaId:repair.lemmaId,at:1,responseMode:'choice',answer:repair.expected,correct:true,hinted:true});
 assert.equal(r.accepted,true);assert.equal(r.event.itemId,repair.itemId);assert.equal(r.event.lemmaId,repair.lemmaId);assert.equal(r.event.productionMastery,false);
});

test('Actual repair-exposed lemmas stay out of later independent blocks',()=>{
 for(const id of P.MODULES){
  const guided=P.guidedPlan(id),guidedLemmas=guided.map(x=>x.lemmaId),guidedRepair=P.repairFor(id,guided[0],guidedLemmas);
  const choice=P.independentPlan(id,'choice',[guidedRepair.lemmaId]);assert.equal(choice.some(x=>x.lemmaId===guidedRepair.lemmaId),false,id+' choice repair leak');
  const choiceLemmas=[...new Set(choice.map(x=>x.lemmaId))],choiceRepair=P.repairFor(id,choice[0],[...guidedLemmas,...choiceLemmas]);
  const exclude=[guidedRepair.lemmaId,choiceRepair.lemmaId,...choiceLemmas],input=P.independentPlan(id,'input',exclude);
  assert.equal(input.some(x=>exclude.includes(x.lemmaId)),false,id+' input exposed-lemma leak');assert.equal(input.length,4,id+' input length');
 }
});

test('Service worker caches the existing update.html file without pretty-route 404',()=>{
 assert.ok(sw.includes("if(asset==='update.html')return new URL('update.html',self.registration.scope).href;"));
 assert.equal(sw.includes("if(asset==='update.html')return new URL('update',self.registration.scope).href;"),false);
 assert.ok(fs.existsSync('update.html'));
});

test('Existing runtime version and written release remain unchanged',()=>{
 assert.equal(E.data.version,'morph-20260924-v1');assert.equal(E.writtenRelease.scopeId,'morph-written-v1');assert.equal(E.writtenRelease.audioPlayback,false);
});

console.log('MORPH_STAGE5_OK',n,'checks;',P.MODULES.join(','));
