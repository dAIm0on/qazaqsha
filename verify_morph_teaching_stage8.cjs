'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),T=require('./morph-teaching-data'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8');
const verbs=T.modules.find(x=>x.id==='verbs');
const text=verbs.fullExplanation.join('\n');

test('Stage 8 keeps the restored verb explanation and its boundaries',()=>{
 assert.equal(T.version,'morph-teaching-20260926-v3');
 assert.equal(E.data.version,'morph-20260924-v1');
 assert.deepEqual(verbs.families,['NEG','PAST','PTCP_GAN','COND','CVB_IP','AGR_SHORT_1SG','AGR_SHORT_1PL','AGR_SHORT_2SG','AGR_SHORT_2POL']);
 assert.deepEqual(verbs.prerequisites,['harmony','voice']);
 assert.equal(verbs.shortSupport,'Сначала выбери глагольную функцию и порядок цепочки; затем применяй фонологическое правило каждого стыка.');
 for(const part of ['жаз → жазба','кел → келді','келген кісі','оқыған кітап','айтқан сөз','көрген кино','киініп, шықты','оқып, түсінді','күліп сөйледі','NEG ≠ Q','келмедік'])assert.ok(text.includes(part),part);
 for(const line of verbs.counterExamples)assert.ok(text.includes(line)||verbs.counterExamples.includes(line));
 assert.deepEqual(verbs.counterExamples,['PTCP_GAN нельзя преподавать как просто прошедшее','CVB_IP нельзя преподавать как самостоятельное время','AGR_SHORT нельзя присоединять к bare verb']);
 assert.deepEqual(verbs.limitations,['не расширять runtime до CAUSATIVE/PASSIVE/REFLEXIVE без admission','контекст должен лицензировать semantic operation']);
 assert.equal(P.stage8Spec().shortSupport.includes(verbs.fullExplanation.join('')),false);
});
test('Four function contrasts stay distinct and come before the form',()=>{
 const ids=P.STAGE8_SEMANTIC.map(x=>x.id);
 assert.deepEqual(ids,['q-neg','past-ptcp','ptcp-cvb','cop-agr']);
 assert.equal(P.STAGE8_SEMANTIC[0].expected,'жазба');
 assert.equal(P.STAGE8_SEMANTIC[1].expected,'келген кісі');
 assert.equal(P.STAGE8_SEMANTIC[2].expected,'киініп, шықты');
 assert.equal(P.STAGE8_SEMANTIC[3].expected,'келдім');
 assert.ok(ui.indexOf('function stage8Semantic(')<ui.indexOf('function stage8FormScreen('));
 assert.ok(ui.includes('Сначала функция'));
});
test('Approved verb chains match the engine and do not start from bare agreement',()=>{
 assert.equal(E.form('v-жаз',['NEG']).word,'жазба');
 assert.equal(E.form('v-кел',['PAST']).word,'келді');
 assert.equal(E.form('v-кел',['COND']).word,'келсе');
 assert.equal(E.form('v-кел',['PTCP_GAN']).word,'келген');
 assert.equal(E.form('v-кел',['COND','AGR_SHORT_1SG']).word,'келсем');
 assert.equal(E.form('v-кел',['NEG','PAST','AGR_SHORT_1PL']).word,'келмедік');
 assert.equal(E.form('v-жап',['CVB_IP']).word,'жауып');
 assert.throws(()=>E.form('v-кел',['AGR_SHORT_1SG']),/Short agreement context/);
 const chain=E.form('v-кел',['NEG','PAST','AGR_SHORT_1PL']);
 assert.deepEqual(chain.trace.map(t=>t.after),['келме','келмеді','келмедік']);
 for(let i=1;i<chain.trace.length;i++)assert.equal(chain.trace[i].before,chain.trace[i-1].after);
});
test('Guided contexts do not leak the junction answer and stay on train verbs',()=>{
 for(const row of P.stage8GuidedPlan()){
  const lemma=E.data.lemmas.find(l=>l.id===row.lemmaId);
  assert.equal(lemma.pos,'verb');assert.equal(lemma.split,'train');
  const ctx=P.stage8Context(row.chainId),trace=E.form(row.lemmaId,row.sequence).trace;
  for(const step of trace)assert.equal(ctx.includes(step.after),false,row.chainId+' '+step.after);
  for(let i=0;i<trace.length;i++){
   const view=P.stage7View(row.lemmaId,row.sequence,i);
   for(const later of trace.slice(i+1))assert.equal(view.options.includes(later.after),false);
  }
 }
 const independent=P.stage8IndependentPlan({excludeLemmas:['v-бар']});
 assert.equal(independent.some(row=>['v-жаз','v-кел','v-сөйле','v-жап','v-бар'].includes(row.lemmaId)),false);
 assert.equal(independent.every(row=>E.data.lemmas.find(l=>l.id===row.lemmaId).split==='train'),true);
});
test('A verb chain resumes and a repeated semantic check is not a second event',()=>{
 const run=P.createStage8Run('guided','choice',1700000000000);
 const saved=S.putChain(S.empty(),run);
 assert.equal(saved.chain.moduleId,'verbs');
 assert.equal(S.migrate(JSON.parse(JSON.stringify(saved))).chain.chains[5].chainId,'NEG-PAST-AGR');
 const event={eventId:'stage8-sem:q-neg',type:'semantic_check_attempt',moduleId:'verbs',familyId:null,at:5,responseMode:'choice',answer:'адам ба?',correct:false,hinted:false};
 const first=S.recordTeaching(S.empty(),event),second=S.recordTeaching(first.state,event);
 assert.equal(first.accepted,true);assert.equal(first.event.productionMastery,false);assert.equal(second.accepted,false);
});
test('Verb repair is another train verb and guided practice does not call for new families',()=>{
 const view=P.stage7View('v-кел',['PAST','AGR_SHORT_1SG'],1);
 const repair=P.stage7RepairFor(view,['v-жаз'],'verb');
 assert.equal(repair.morpheme,'AGR_SHORT_1SG');
 assert.notEqual(repair.lemmaId,'v-кел');
 assert.equal(E.data.lemmas.find(l=>l.id===repair.lemmaId).split,'train');
 const practice=fs.readFileSync('morph-teaching-practice.js','utf8');
 const block=practice.slice(practice.indexOf('const STAGE8_GUIDED'),practice.indexOf('function stage8Spec('));
 for(const banned of ['CAUSATIVE','PASSIVE','REFLEXIVE'])assert.equal(block.includes(banned),false,banned);
});
test('Stage 8 UI teaches function before form and keeps the pending step harmless',()=>{
 assert.ok(ui.includes('data-stage8-semantic'));
 assert.ok(ui.includes('data-stage8-pending'));
 assert.ok(ui.includes('Шаг глагола ещё не готов'));
 assert.ok(ui.includes('stage8-sem:'));
 new vm.Script(ui);
});
test('Stage 8 does not expand the bank or turn on audio',()=>{
 assert.equal(E.bank().length,2231);
 assert.equal(E.writtenRelease.audioPlayback,false);
 assert.equal(Object.keys(E.data.families).length,28);
 let state=S.empty();
 assert.equal(P.stage8PrerequisitesReady(state),false);
 for(const id of ['harmony','voice'])state=S.recordTeaching(state,{eventId:'done:'+id,type:'teaching_module_completed',moduleId:id,familyId:null,at:2,responseMode:'view'}).state;
 assert.equal(P.stage8PrerequisitesReady(state),true);
});
console.log('MORPH_STAGE8_OK',n,'checks');
