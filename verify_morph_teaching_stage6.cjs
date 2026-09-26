'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),T=require('./morph-teaching-data'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8');

test('Stage 6 scope is poss/person and Stage 5 scope is unchanged',()=>{
 assert.deepEqual(P.STAGE6_MODULES,['poss','person']);
 assert.deepEqual(P.MODULES,['harmony','voice','plural','nasal']);
});
test('Stage 6 families match the canonical runtime modules',()=>{
 assert.deepEqual(T.modules.find(x=>x.id==='poss').families,['POSS_1SG','POSS_2SG','POSS_1PL','POSS_2POL','POSS_3']);
 assert.deepEqual(T.modules.find(x=>x.id==='person').families,['COP_1SG','COP_1PL','COP_2SG','COP_2POL','COP_2PL','COP_2PL_POL','Q']);
});
test('Stage 6 uses restored canonical content, not shortSupport as full rule',()=>{
 const poss=T.modules.find(x=>x.id==='poss'),person=T.modules.find(x=>x.id==='person');
 assert.ok(poss.fullExplanationBlocks?.length>10);assert.ok(person.fullExplanationBlocks?.length>10);
 assert.equal(poss.fullExplanationRef,'DOC32#H');assert.equal(person.fullExplanationRef,'DOC32#I');
 const pb=JSON.stringify(poss),pr=JSON.stringify(person);
 for(const token of ['атым','кітабым','кітаптар','орын','орында'])assert.ok(pb.includes(token),token);
 for(const token of ['адаммын','адамбыз','адам ба','POSS','AGR_SHORT','NEG'])assert.ok(pr.includes(token),token);
});
test('Level 0 keeps full POSS/COP/AGR semantic groups available',()=>{
 const groups=T.level0.semanticGroups,blob=id=>JSON.stringify(groups.find(x=>x.id===id)?.blocks||[]);
 assert.ok(blob('POSS').includes('менің кітабым'));
 assert.ok(blob('COP').includes('студентпін'));
 assert.ok(blob('AGR_SHORT').includes('PAST')||blob('AGR_SHORT').includes('келді'));
});
test('Canonical stem-change and counterexample forms remain exact in engine',()=>{
 assert.equal(E.getItem('morph:v1:n-ат:POSS_1SG').expected,'атым');
 assert.equal(E.getItem('morph:v1:n-кітап:POSS_1SG').expected,'кітабым');
 assert.equal(E.getItem('morph:v1:n-көлік:POSS_1SG').expected,'көлігім');
 assert.equal(E.getItem('morph:v1:n-қонақ:POSS_1SG').expected,'қонағым');
 assert.equal(E.getItem('morph:v1:n-орын:POSS_3').expected,'орны');
 assert.equal(E.getItem('morph:v1:n-кітап:PL').expected,'кітаптар');
 assert.equal(E.getItem('morph:v1:n-орын:LOC').expected,'орында');
});
test('Stage 6 semantic checks teach function before form',()=>{
 const poss=P.stage6SemanticChecks('poss'),person=P.stage6SemanticChecks('person');
 assert.deepEqual(poss.map(x=>x.expected),['GEN','POSS']);
 assert.deepEqual(person.map(x=>x.expected),['COP','POSS','AGR_SHORT','Q','NEG']);
 assert.ok(poss.some(x=>x.prompt.includes('менің кітабым')));
 assert.ok(person.some(x=>x.prompt.includes('я студент')));
 assert.ok(person.some(x=>x.prompt.includes('я пришёл')));
 assert.ok(person.some(x=>x.prompt.includes('адам ба')));
 assert.ok(person.some(x=>x.prompt.includes('жазба')));
});

test('Stage 6 semantic checks are teaching evidence and never production mastery',()=>{
 let state=S.empty();
 const r=S.recordTeaching(state,{eventId:'semcheck',type:'semantic_check_attempt',moduleId:'person',familyId:null,at:1,responseMode:'choice',answer:'COP',correct:true,hinted:false});
 assert.equal(r.accepted,true);assert.equal(r.event.productionMastery,false);
 const e=S.teachingEvidence(r.state,{moduleId:'person'});assert.equal(e.semanticChecks.attempts,1);assert.equal(e.semanticChecks.correct,1);
 assert.equal(r.state.events.length,0);
});

test('Stage 6 UI renders semantic checks before guided morphology',()=>{
 assert.ok(ui.includes('data-stage6-semantic-answer'));
 assert.ok(ui.includes('data-stage6-semantic-next'));
 assert.ok(ui.includes("type:'semantic_check_attempt'"));
 assert.ok(ui.includes("const checks=P.stage6SemanticChecks(module.id)"));
 assert.ok(ui.indexOf("if(i<checks.length)")>0);
});

test('POSS guided plan covers all five families and required lexical contrasts',()=>{
 const p=P.stage6GuidedPlan('poss'),forms=p.map(x=>x.expected);
 for(const f of ['POSS_1SG','POSS_2SG','POSS_1PL','POSS_2POL','POSS_3'])assert.ok(p.some(x=>x.familyId===f),f);
 for(const x of ['балам','атым','кітабым','көлігім','қонағым','үйің','әкеміз','қалаңыз','орны','көшесі'])assert.ok(forms.includes(x),x);
});
test('Person guided plan covers every COP family plus Q and same-base nasal contrast',()=>{
 const p=P.stage6GuidedPlan('person');
 for(const f of ['COP_1SG','COP_1PL','COP_2SG','COP_2POL','COP_2PL','COP_2PL_POL','Q'])assert.ok(p.some(x=>x.familyId===f),f);
 const adam=p.filter(x=>x.lemmaId==='n-адам');assert.deepEqual(adam.map(x=>x.familyId),['COP_1SG','COP_1PL','Q']);
 assert.deepEqual(adam.map(x=>x.expected),['адаммын','адамбыз','адам ба']);
});
test('All Stage 6 guided tasks are admitted train items',()=>{
 for(const id of P.STAGE6_MODULES)for(const x of P.stage6GuidedPlan(id)){const i=E.getItem(x.itemId);assert.equal(i.split,'train');assert.equal(i.sequence.length,1);}
});
test('POSS guided support names only the licensed lexical rewrite class',()=>{
 const p=P.stage6GuidedPlan('poss'),by=x=>P.stage6Support('poss',p.find(t=>t.expected===x));
 assert.ok(by('кітабым').includes('п→б'));
 assert.ok(by('көлігім').includes('к→г'));
 assert.ok(by('қонағым').includes('қ→ғ'));
 assert.ok(by('орны').includes('синкопа'));
 assert.ok(by('атым').includes('не лицензировано'));
});

test('Stage 6 support never contains the full expected answer',()=>{
 for(const id of P.STAGE6_MODULES)for(const x of P.stage6GuidedPlan(id)){const z=P.stage6Support(id,x);assert.ok(z.length>25);assert.equal(z.includes(x.expected),false,id+' '+x.expected);}
});
test('Every Stage 6 guided task has a different-lemma repair',()=>{
 for(const id of P.STAGE6_MODULES){const p=P.stage6GuidedPlan(id),ex=p.map(x=>x.lemmaId);for(const x of p)assert.notEqual(P.stage6RepairFor(id,x,ex).lemmaId,x.lemmaId);}
});
test('Stage 6 choice and input plans use train items and no guided lemma',()=>{
 for(const id of P.STAGE6_MODULES){const g=new Set(P.stage6GuidedPlan(id).map(x=>x.lemmaId));for(const mode of ['choice','input'])for(const x of P.stage6IndependentPlan(id,mode)){assert.equal(E.getItem(x.itemId).split,'train');assert.equal(g.has(x.lemmaId),false,id+' '+mode+' '+x.lemmaId);}}
});
test('Stage 6 choice and input do not repeat the same exact item',()=>{
 for(const id of P.STAGE6_MODULES){const c=P.stage6IndependentPlan(id,'choice'),ids=new Set(c.map(x=>x.itemId));const i=P.stage6IndependentPlan(id,'input',{excludeItemIds:[...ids]});for(const x of i)assert.equal(ids.has(x.itemId),false,id+' '+x.itemId);}
});
test('Every real Stage 6 independent task has repair room outside its active queue',()=>{
 for(const id of P.STAGE6_MODULES){const g=P.stage6GuidedPlan(id),gl=g.map(x=>x.lemmaId),c=P.stage6IndependentPlan(id,'choice'),i=P.stage6IndependentPlan(id,'input',{excludeItemIds:c.map(x=>x.itemId)});for(const plan of [c,i]){const ex=[...new Set([...gl,...plan.map(x=>x.lemmaId)])];for(const x of plan)assert.notEqual(P.stage6RepairFor(id,x,ex).lemmaId,x.lemmaId,id+' '+x.itemId);}}
});
test('Stage 6 independent sessions are ordinary learn sessions with hints off',()=>{
 for(const id of P.STAGE6_MODULES)for(const mode of ['choice','input']){const s=P.createStage6IndependentSession(id,mode,1700000000000);assert.ok(S.session(s));assert.equal(s.mode,'learn');assert.equal(s.level,id);assert.equal(s.hinted,false);assert.equal(s.closesLevel,false);}
});
test('Stage 6 readiness requires semantic completion and feature notice for every family',()=>{
 for(const id of P.STAGE6_MODULES){const m=T.modules.find(x=>x.id===id);let state=S.empty();assert.equal(P.fullStage6Ready(state,id),false);for(const familyId of m.families){state=S.recordTeaching(state,{eventId:id+':s:'+familyId,type:'semantic_intro_completed',moduleId:id,familyId,at:1,responseMode:'view'}).state;state=S.recordTeaching(state,{eventId:id+':f:'+familyId,type:'feature_notice_attempt',moduleId:id,familyId,at:2,responseMode:'choice',correct:true}).state;}assert.equal(P.fullStage6Ready(state,id),true,id);}
});
test('Stage 6 prerequisites come from canonical module prerequisites',()=>{
 let state=S.empty();assert.equal(P.stage6PrerequisitesReady(state,'poss'),false);for(const id of ['harmony','voice','nasal'])state=S.recordTeaching(state,{eventId:'done:'+id,type:'stage5_module_completed',moduleId:id,familyId:null,at:3,responseMode:'view'}).state;assert.equal(P.stage6PrerequisitesReady(state,'poss'),true);
 let p=S.empty();for(const id of ['harmony','nasal'])p=S.recordTeaching(p,{eventId:'done:'+id,type:'stage5_module_completed',moduleId:id,familyId:null,at:3,responseMode:'view'}).state;assert.equal(P.stage6PrerequisitesReady(p,'person'),true);
});
test('Generic Stage 6 completion is routing evidence only',()=>{
 const r=S.recordTeaching(S.empty(),{eventId:'done:poss',type:'teaching_module_completed',moduleId:'poss',familyId:null,at:10,responseMode:'view'});assert.equal(r.accepted,true);assert.equal(r.event.productionMastery,false);assert.equal(S.teachingEvidence(r.state,{moduleId:'poss'}).moduleCompleted,true);
});
test('Old Stage 5 completion remains readable after generic completion support',()=>{
 const r=S.recordTeaching(S.empty(),{eventId:'done:h',type:'stage5_module_completed',moduleId:'harmony',familyId:null,at:10,responseMode:'view'});assert.equal(r.accepted,true);assert.equal(S.teachingEvidence(r.state,{moduleId:'harmony'}).moduleCompleted,true);
});
test('Stage 6 guided UI remains outside production answer path',()=>{
 const a=ui.indexOf('function stage6Guided('),b=ui.indexOf('function startStage6Independent('),block=ui.slice(a,b);assert.ok(a>0&&b>a);assert.equal(block.includes('E.answer('),false);assert.equal(block.includes('bridge().answer('),false);
});
test('Stage 6 independent UI uses normal answer bridge and disables hints',()=>{
 assert.ok(ui.includes('P.createStage6IndependentSession'));
 assert.ok(ui.includes("P?.STAGE6_MODULES?.includes"));
 assert.ok(ui.includes('!teachingIndependent&&view.hint'));
 assert.ok(ui.includes('bridge().answer(result)'));
});
test('Wrong Stage 6 independent answer routes to repair before next item',()=>{
 assert.ok(ui.includes("P?.STAGE6_MODULES?.includes(r.currentModule)"));
 assert.ok(ui.includes("setTeachingResume(r.currentModule,'ERROR_REPAIR'"));
 assert.ok(ui.includes('data-stage6-repair-answer'));
});
test('Stage 6 repair is teaching evidence and returns to paused production session',()=>{
 assert.ok(ui.includes("type:'correction_after_feedback'"));
 assert.ok(ui.includes("P.stage6RepairFor"));
 assert.ok(ui.includes("saveSession({...E.next(active),updatedAt:Date.now()+2})"));
});
test('Full rule remains reachable from guided even when guided resume has no family id',()=>{
 assert.ok(ui.includes("family=r.familyId||module?.families?.[0]||null"));
});
test('Stage 6 completion is honest about mastery transfer and COP transfer limits',()=>{
 assert.ok(ui.includes("recordOnce('teaching_module_completed'"));
 assert.ok(ui.includes('не заявление «навык освоен»'));
 assert.ok(ui.includes('Для person текущий transfer честно ограничен доступным банком.'));
});
test('Stage 6 does not expand runtime families or audio scope',()=>{
 assert.equal(E.data.version,'morph-20260924-v1');assert.equal(E.writtenRelease.scopeId,'morph-written-v1');assert.equal(E.writtenRelease.audioPlayback,false);
 assert.deepEqual(P.STAGE6_MODULES,['poss','person']);
});
test('Teaching content remains the restored v3 content release',()=>{
 assert.equal(T.version,'morph-teaching-20260926-v3');
 assert.ok(T.modules.find(x=>x.id==='poss').fullExplanationBlocks.length>0);
 assert.ok(T.modules.find(x=>x.id==='person').fullExplanationBlocks.length>0);
});
new vm.Script(fs.readFileSync('morph-ui.js','utf8'));
new vm.Script(fs.readFileSync('morph-teaching-practice.js','utf8'));
console.log('MORPH_STAGE6_OK',n,'checks;',P.STAGE6_MODULES.join(','));
