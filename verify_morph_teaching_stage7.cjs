'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),T=require('./morph-teaching-data'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8'),app=fs.readFileSync('app.js','utf8');
const chains=T.modules.find(x=>x.id==='chains');
const text=chains.fullExplanation.join('\n');

test('Stage 7 keeps the restored chains explanation and does not teach a universal n',()=>{
 assert.equal(T.version,'morph-teaching-20260926-v3');
 assert.equal(E.data.version,'morph-20260924-v1');
 assert.equal(chains.shortSupport,'Каждое следующее окончание выбирается от уже полученной формы. После шага обнови currentForm, край и morphState.');
 assert.ok(text.includes('основа → число → принадлежность → падеж'));
 assert.ok(text.includes('үй → үйлер'));
 assert.ok(text.includes('үйлерімізден'));
 assert.ok(text.includes('кітабына'));
 assert.ok(text.includes('кітаптарымыздан'));
 assert.ok(text.includes('Нельзя учить «после POSS_3 всегда н перед любым суффиксом».'));
 assert.equal(P.stage7Support().includes('всегда н'),false);
 assert.equal(P.stage7Support().includes('үйлерімізден'),false);
});
test('Mandatory chains A, B and C keep every engine transition',()=>{
 const a=E.form('n-үй',['PL','POSS_1PL','ABL']);
 assert.deepEqual(a.trace.map(t=>t.after),['үйлер','үйлеріміз','үйлерімізден']);
 assert.equal(a.trace[1].edge,'r');
 assert.equal(a.trace[2].edge,'voiced_fricative');
 assert.equal(a.trace[2].before,'үйлеріміз');
 const b=E.form('n-кітап',['POSS_3','DAT']);
 assert.equal(b.trace[0].changed,true);
 assert.equal(b.trace[0].after,'кітабы');
 assert.equal(b.trace[1].suffix,'на');
 assert.notEqual(b.trace[1].suffix,'ға');
 const c=E.form('n-кітап',['PL','POSS_1PL','ABL']);
 assert.equal(c.trace[0].changed,false);
 assert.equal(c.trace[0].after,'кітаптар');
 assert.equal(c.trace[1].before,'кітаптар');
 assert.equal(c.trace[2].after,'кітаптарымыздан');
 for(const form of [a,b,c])for(let i=1;i<form.trace.length;i++)assert.equal(form.trace[i].before,form.trace[i-1].after);
});
test('POSS_3 case matrix stays exact and plain or other possessive cases stay different',()=>{
 const at=(seq)=>E.form('n-кітап',seq).trace.at(-1).suffix;
 assert.equal(at(['POSS_3','DAT']),'на');
 assert.equal(at(['POSS_3','ACC']),'н');
 assert.equal(at(['POSS_3','LOC']),'нда');
 assert.equal(at(['POSS_3','ABL']),'нан');
 assert.equal(at(['DAT']),'қа');
 assert.equal(at(['POSS_1SG','DAT']),'а');
 assert.equal(at(['POSS_1PL','DAT']),'ға');
 assert.notEqual(at(['DAT']),at(['POSS_3','DAT']));
});
test('A junction question does not offer a later form or later suffix',()=>{
 for(const row of P.stage7GuidedPlan()){
  const trace=E.form(row.lemmaId,row.sequence).trace;
  for(let i=0;i<trace.length;i++){
   const view=P.stage7View(row.lemmaId,row.sequence,i);
   assert.equal(view.before,trace[i].before);
   assert.equal(view.after,trace[i].after);
   assert.equal(view.nextEdge,E.edge(trace[i].after));
   assert.ok(view.options.includes(view.after));
   assert.equal(view.operation,E.itemFor(row.lemmaId,[view.morpheme]).operation);
   for(const later of trace.slice(i+1))assert.equal(view.options.includes(later.after),false,row.chainId+' '+i+' '+later.after);
  }
 }
});
test('кітабыға is a morph-state error, not a letter lecture',()=>{
 const view=P.stage7View('n-кітап',['POSS_3','DAT'],1);
 const codes=P.stage7Errors(view,'кітабыға');
 assert.ok(codes.includes('MORPH_STATE'));
 const note=P.stage7Feedback(view,codes);
 assert.equal(note.includes('ты не знаешь букву н'),false);
 assert.ok(note.includes('morphState'));
});
test('Repair uses another train lemma and the same junction',()=>{
 const view=P.stage7View('n-үй',['PL','POSS_1PL','ABL'],1);
 const repair=P.stage7RepairFor(view,['n-кітап']);
 assert.notEqual(repair.lemmaId,'n-үй');
 assert.equal(E.data.lemmas.find(l=>l.id===repair.lemmaId).split,'train');
 assert.deepEqual(repair.sequence,['PL','POSS_1PL']);
 assert.equal(repair.morpheme,'POSS_1PL');
});
test('Guided and independent plans are train-only and do not reuse the guided lemmas',()=>{
 const guided=P.stage7GuidedPlan(),independent=P.stage7IndependentPlan({excludeLemmas:['n-әке']});
 for(const row of [...guided,...independent]){
  const lemma=E.data.lemmas.find(l=>l.id===row.lemmaId);
  assert.equal(lemma.split,'train');
  assert.equal(P.stage7Works(row.lemmaId,row.sequence),true);
 }
 assert.equal(independent.some(row=>row.lemmaId==='n-үй'||row.lemmaId==='n-кітап'||row.lemmaId==='n-әке'),false);
 assert.equal(independent.filter(row=>row.chainId==='A'||row.chainId==='C').map(row=>row.lemmaId).length,2);
});
test('Chain state resumes the same junction and closes cleanly when the bank version changes',()=>{
 const run=P.createStage7Run('guided','choice',1700000000000);
 run.phase='repair';run.junction=1;run.repair={sourceChainId:'A',sourceLemmaId:'n-үй',sourceJunction:1,repairLemmaId:'n-әке',sequence:['PL','POSS_1PL'],response:'үйлер',expected:'үйлеріміз',errorCodes:['MORPHEME_BOUNDARY']};
 const saved=S.putChain(S.empty(),run);
 const back=S.migrate(JSON.parse(JSON.stringify(saved)));
 assert.equal(back.chain.phase,'repair');
 assert.equal(back.chain.junction,1);
 assert.equal(back.chain.repair.repairLemmaId,'n-әке');
 assert.equal(back.chain.repair.response,'үйлер');
 const old=S.migrate({version:1,dataVersion:E.data.version,events:[],exposed:[],session:null,teaching:{version:1,contentVersion:T.version,events:[],resume:null},chain:{version:1,dataVersion:'morph-old'}});
 assert.equal(old.chain,null);
 assert.ok(old.recovery.includes('История ответов и курс сохранены'));
});
test('A guided junction event is idempotent and does not become production mastery',()=>{
 const event={eventId:'stage7:g:0:0',type:'guided_attempt',moduleId:'chains',familyId:'PL',lemmaId:'n-үй',at:10,responseMode:'choice',answer:'үйлер',correct:true,hinted:true};
 const first=S.recordTeaching(S.empty(),event);
 const second=S.recordTeaching(first.state,event);
 assert.equal(first.accepted,true);
 assert.equal(first.event.productionMastery,false);
 assert.equal(second.accepted,false);
 assert.equal(second.state.teaching.events.length,1);
});
test('An independent chain answer updates FSRS once',()=>{
 const item=E.getItem('morph:v1:n-бала:PL');
 const session={id:'stage7-ind-0',version:1,dataVersion:E.data.version,level:'chains',mode:'learn',responseMode:'choice',modality:'text',queue:[{id:item.id,options:item.options.slice()}],cursor:0,phase:'question',draft:'',hinted:false,result:null,startedAt:20,updatedAt:20,results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]};
 let state=S.putSession(S.empty(),session);
 const answer=E.answer(session,item.expected,40,30);
 const once=S.accept(state,answer);
 const twice=S.accept(once.state,answer);
 assert.equal(once.accepted,true);
 assert.equal(twice.accepted,false);
 assert.equal(once.state.events.length,1);
 assert.ok(S.scheduleUpdate(once.event));
 assert.equal(S.scheduleUpdate(once.event).hinted,false);
});
test('Stage 7 UI keeps the current junction, repair and a non-destructive pending state',()=>{
 assert.ok(ui.includes('data-stage7-pending'));
 assert.ok(ui.includes('Шаг цепочки ещё не готов. Прогресс, очередь и учебный шаг не изменены.'));
 assert.ok(ui.includes('data-stage7-retry'));
 assert.ok(ui.includes("type:'correction_after_feedback'"));
 assert.ok(ui.includes('P.stage7RepairFor'));
 assert.equal(ui.includes('ты не знаешь букву н'),false);
 const task=ui.slice(ui.indexOf('function stage7TaskHtml('),ui.indexOf('function stage7RepairScreen('));
 assert.equal(task.includes('view.suffix'),false);
 assert.equal(task.includes('laterSuffixes'),false);
 assert.ok(app.includes('MorphState.putChain'));
 new vm.Script(ui);
});
test('Stage 7 readiness follows poss and nasal plus semantic introduction',()=>{
 let state=S.empty();
 assert.equal(P.stage7Ready(state),false);
 for(const id of ['poss','nasal'])state=S.recordTeaching(state,{eventId:'done:'+id,type:'teaching_module_completed',moduleId:id,familyId:null,at:3,responseMode:'view'}).state;
 for(const familyId of ['PL','POSS_1SG','POSS_1PL','POSS_3','DAT','ACC','LOC','ABL'])state=S.recordTeaching(state,{eventId:'sem:'+familyId,type:'semantic_intro_completed',moduleId:P.stage7Owner(familyId),familyId,at:4,responseMode:'view'}).state;
 assert.equal(P.stage7Ready(state),true);
 assert.equal(P.stage7Owner('DAT'),'harmony');
});
test('Stage 7 does not expand the runtime bank or audio scope',()=>{
 assert.equal(E.bank().length,2231);
 assert.equal(E.writtenRelease.audioPlayback,false);
 assert.equal(E.data.families?Object.keys(E.data.families).length:0,28);
});
console.log('MORPH_STAGE7_OK',n,'checks');
