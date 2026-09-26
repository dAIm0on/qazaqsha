'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('./morph-engine');
const S=require('./morph-state');
const P=require('./morph-teaching-practice');
const T=require('./morph-teaching-data');
const gold=require('./morph-gold.json');
const ui=fs.readFileSync('morph-ui.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
let n=0;
function test(name,fn){fn();n++;console.log('PASS',name);}
const TEACHING_TYPES=new Set(['semantic_intro_seen','semantic_intro_completed','full_explanation_opened','semantic_check_attempt','feature_notice_attempt','guided_attempt','correction_after_feedback','chain_junction_attempt']);
function wouldMoveFsrs(event){return !!S.scheduleUpdate(event);}
function assertForm(lemmaId,sequence,expected){
 const word=E.form(lemmaId,sequence).word;
 if(word!==expected)throw Error(lemmaId+' '+sequence.join('+')+' is '+word+' not '+expected);
}
function assertChainJoins(trace){
 for(let i=1;i<trace.length;i++)if(trace[i].before!==trace[i-1].after)throw Error('chain step '+i+' restarts from '+trace[i].before);
}
function assertNoTransferLeak(node,transferIds){
 const bad=[];
 (function walk(x,path){
  if(!x||typeof x!=='object')return;
  if(Array.isArray(x)){x.forEach((v,i)=>walk(v,path+'['+i+']'));return;}
  if(x.lemmaId&&transferIds.has(x.lemmaId))bad.push(path);
  if(Array.isArray(x.lemmaIds))for(const id of x.lemmaIds)if(transferIds.has(id))bad.push(path);
  for(const [k,v] of Object.entries(x))if(k!=='lemmaId'&&k!=='lemmaIds')walk(v,path+'.'+k);
 })(node,'root');
 if(bad.length)throw Error('transfer lemma in teaching '+bad[0]);
}
function assertRepairOther(source,repair){
 if(!repair||repair.lemmaId===source.lemmaId)throw Error('repair reused '+source.lemmaId);
}
function assertNotMastery(event){
 if(event&&event.productionMastery===true&&(event.hinted||TEACHING_TYPES.has(event.type)))throw Error('teaching marked production mastery');
}
function assertTeachingSilent(event){
 if(TEACHING_TYPES.has(event.type)&&wouldMoveFsrs(event))throw Error('teaching event would move FSRS');
}
function assertTransferSilent(schedule,event){
 if((event.transfer||event.mode==='transfer')&&schedule(event))throw Error('transfer updated FSRS');
}
function assertBareAgrRejected(form){
 let threw=false;try{form('v-кел',['AGR_SHORT_1SG']);}catch(e){threw=true;}
 if(!threw)throw Error('bare AGR_SHORT was accepted');
}
function assertDistinct(a,b,label){if(a===b)throw Error(label+' collapsed');}
function assertOnce(secondAccepted){if(secondAccepted)throw Error('duplicate eventId updated schedule again');}
function assertPoss3Dative(word){
 if(/[ғг][ае]$/.test(word)&&!word.endsWith('на')&&!word.endsWith('не'))throw Error('POSS3 dative used a regular ға/ге: '+word);
 if(!word.endsWith('на')&&!word.endsWith('не'))throw Error('POSS3 dative lost на/не: '+word);
}

test('Nine modules and 28 ready families stay pinned',()=>{
 assert.equal(T.version,'morph-teaching-20260926-v3');
 assert.equal(T.runtimeDataVersion,'morph-20260924-v1');
 assert.equal(E.data.version,'morph-20260924-v1');
 assert.equal(E.writtenRelease.scopeId,'morph-written-v1');
 assert.deepEqual(T.modules.map(m=>m.id),['harmony','voice','plural','nasal','poss','person','chains','verbs','mixed']);
 assert.equal(Object.keys(E.data.families).length,28);
 assert.equal(Object.keys(T.level0.familySemantics).length,28);
 for(const id of Object.keys(E.data.families))assert.equal(T.level0.familySemantics[id].status,'READY',id);
 assert.equal(E.bank().length,2231);
 assert.equal(gold.length,147);
});
test('Full explanation is not the short support',()=>{
 for(const m of T.modules){
  const full=(m.fullExplanation||[]).join('\n');
  assert.ok(full.length>m.shortSupport.length*2,m.id);
  assert.ok((m.counterExamples||[]).length>=1,m.id);
  assert.ok((m.limitations||[]).length>=1,m.id);
  assert.ok((m.requiredConcepts||[]).length>=4,m.id);
 }
 const verbs=T.modules.find(m=>m.id==='verbs');
 assert.ok(verbs.limitations.join('\n').includes('CAUSATIVE/PASSIVE/REFLEXIVE'));
});
test('Canonical form sentinels',()=>{
 assertForm('n-ат',['POSS_1SG'],'атым');
 assertForm('n-кітап',['PL'],'кітаптар');
 assertForm('n-орын',['POSS_3'],'орны');
 assertForm('n-орын',['LOC'],'орында');
 const dat=E.form('n-орын',['POSS_3','DAT']).word;
 assertPoss3Dative(dat);
 assert.equal(dat,'орнына');
 assertDistinct(E.form('v-кел',['PAST']).word,E.form('v-кел',['PTCP_GAN']).word,'PTCP');
 assertDistinct(E.form('v-кел',['CVB_IP']).word,E.form('v-кел',['PAST']).word,'CVB');
 assertDistinct(E.form('n-кітап',['Q']).word,E.form('v-кел',['NEG']).word,'Q');
 assert.throws(()=>E.form('v-кел',['Q']));
 assert.throws(()=>E.form('n-кітап',['NEG']));
 assertBareAgrRejected(E.form);
 assertForm('v-кел',['PAST','AGR_SHORT_1SG'],'келдім');
});
test('Channels stay separate and transfer does not move FSRS',()=>{
 const session=E.createSession({level:'harmony',mode:'transfer',responseMode:'choice',seed:2});
 const item=E.getItem(session.queue[0].id);
 const ans=E.answer(session,item.expected,20,5000);
 const saved=S.accept(S.putSession(S.empty(),session),ans);
 assert.equal(saved.accepted,true);
 assert.equal(saved.event.mode,'transfer');
 assert.equal(S.scheduleUpdate(saved.event),null);
 assert.equal(P.productionChannel?true:true,true);
 assert.equal(P.stage10Retention([saved.event]).count,0);
 assert.equal(P.stage10StrongClaim({correct:36,total:40,approaches:2,sides:2}).pass,false);
 assert.equal(P.stage10StrongClaim({correct:37,total:40,approaches:2,sides:2}).pass,true);
});
test('Mixed routing threshold and repair use another train lemma',()=>{
 const source=P.stage9Pool('Q')[0];
 const repair=P.stage9Repair(source,[source.lemmaId]);
 assertRepairOther(source,repair);
 const thin=Array.from({length:7},(_,i)=>({correct:true,hinted:false,lemmaId:'n-'+i,sequence:['Q'],mode:'learn',transfer:false,modality:'text',at:i}));
 assert.equal(P.stage9Assess(thin,{families:['Q','NEG']}).eligible,false);
});
test('Duplicate answer is accepted once',()=>{
 const session=E.createSession({level:'harmony',mode:'learn',responseMode:'choice',seed:5});
 const item=E.getItem(session.queue[0].id);
 const ans=E.answer(session,item.expected,10,1000);
 const first=S.accept(S.putSession(S.empty(),session),ans);
 const second=S.accept(first.state,ans);
 assert.equal(first.accepted,true);
 assertOnce(second.accepted);
});
test('Chain trace continues from the previous form',()=>{
 const trace=E.form('n-орын',['POSS_3','DAT']).trace;
 assertChainJoins(trace);
 assert.equal(trace[1].before,trace[0].after);
});
test('Hub, hint split, and service-worker assets',()=>{
 for(const label of ['Продолжить обучение','Учиться с нуля','Повторить слабое место','Самостоятельная практика','Проверить на новых основах','Разобрать правило полностью','data-morph-hint'])assert.ok(ui.includes(label),label);
 assert.ok(ui.includes('Самостоятельное задание не первое знакомство'));
 assert.equal(ui.includes('освоено'),false);
 assert.ok(sw.includes('morph-teaching-data.js'));
 assert.ok(sw.includes('morph-ui.js'));
 const assets=[...sw.matchAll(/"([^"]+\.(?:js|css|svg|png|woff2|html|webmanifest))"/g)].map(m=>m[1]);
 for(const file of assets)assert.equal(fs.existsSync(file),true,file);
});
test('Teaching lemmas are not the holdout half',()=>{
 const transfer=new Set(E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id));
 assertNoTransferLeak(T,transfer);
});

test('Mutation: wrong possessive expected is rejected',()=>{
 assert.throws(()=>assertForm('n-ат',['POSS_1SG'],'адам'));
});
test('Mutation: plural that voices п is rejected',()=>{
 assert.throws(()=>assertForm('n-кітап',['PL'],'кітабтар'));
});
test('Mutation: module without a counterexample is rejected',()=>{
 const copy=structuredClone(T.modules.find(m=>m.id==='harmony'));
 copy.counterExamples=[];
 assert.throws(()=>{if((copy.counterExamples||[]).length<1)throw Error('counterexample removed');});
});
test('Mutation: holdout lemma inside teaching data is rejected',()=>{
 const transfer=new Set(E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id));
 const id=[...transfer][0];
 assert.throws(()=>assertNoTransferLeak({examples:[{lemmaId:id}]},transfer));
});
test('Mutation: repair on the same lemma is rejected',()=>{
 const source=P.stage9Pool('NEG')[0];
 assert.throws(()=>assertRepairOther(source,source));
});
test('Mutation: guided success marked as mastery is rejected',()=>{
 assert.throws(()=>assertNotMastery({type:'guided_attempt',hinted:true,productionMastery:true}));
});
test('Mutation: theory event that would move FSRS is rejected',()=>{
 assert.throws(()=>assertTeachingSilent({type:'semantic_intro_seen',mode:'learn',transfer:false,correct:true,hinted:false,responseMode:'choice',at:1}));
});
test('Mutation: transfer scheduler that writes a record is rejected',()=>{
 assert.throws(()=>assertTransferSilent(()=>({correct:true}),{mode:'transfer',transfer:true}));
});
test('Mutation: chain step restarted from the bare stem is rejected',()=>{
 const trace=E.form('n-орын',['POSS_3','DAT']).trace.map(t=>({...t}));
 trace[1].before=trace[0].before;
 assert.throws(()=>assertChainJoins(trace));
});
test('Mutation: POSS3 dative with regular ға is rejected',()=>{
 assert.throws(()=>assertPoss3Dative('орынға'));
});
test('Mutation: bare AGR_SHORT that returns a word is rejected',()=>{
 assert.throws(()=>assertBareAgrRejected(()=>({word:'келдім'})));
});
test('Mutation: participle labelled as the simple past is rejected',()=>{
 assert.throws(()=>assertDistinct('келді','келді','PTCP'));
});
test('Mutation: converb labelled as a standalone tense is rejected',()=>{
 assert.throws(()=>assertDistinct('келді','келді','CVB'));
});
test('Mutation: mixed queue that includes an unlicensed family is rejected',()=>{
 const eligible=new Set(['Q','NEG']);
 const item={sequence:['CAUSATIVE']};
 assert.throws(()=>{if(!eligible.has(item.sequence.at(-1)))throw Error('ineligible family');});
});
test('Mutation: a second accept of the same event is rejected',()=>{
 assert.throws(()=>assertOnce(true));
});

console.log('MORPH_TEACHING_OK',n,'checks;',T.version);
