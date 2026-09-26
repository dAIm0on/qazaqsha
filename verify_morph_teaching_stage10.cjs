'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8');

test('Train and transfer lemmas do not overlap',()=>{
 const train=new Set(E.data.lemmas.filter(l=>l.split==='train').map(l=>l.id));
 const transfer=E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id);
 assert.equal(transfer.some(id=>train.has(id)),false);
 assert.ok(transfer.length>0&&train.size>0);
});
test('Teaching plans and examples do not use transfer lemmas',()=>{
 const transfer=new Set(E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id));
 for(const row of [...P.stage7GuidedPlan(),...P.stage8GuidedPlan()])assert.equal(transfer.has(row.lemmaId),false,row.lemmaId);
 const named=P.stage10ContaminatedLemmas().filter(id=>transfer.has(id));
 const session=E.createSession({mode:'transfer',level:'harmony',seed:3,knownLemmas:P.stage10ContaminatedLemmas()});
 assert.equal(session.queue.some(q=>named.includes(E.getItem(q.id).lemmaId)),false);
});
test('Strong transfer claim needs 40 items, two approaches, both sides and the Wilson bound',()=>{
 assert.equal(P.stage10StrongClaim({correct:36,total:40,approaches:2,sides:2}).pass,false);
 assert.equal(P.stage10StrongClaim({correct:37,total:40,approaches:2,sides:2}).pass,true);
 assert.equal(P.stage10StrongClaim({correct:39,total:39,approaches:2,sides:2}).status,'мало данных');
 assert.equal(P.stage10StrongClaim({correct:40,total:40,approaches:1,sides:2}).status,'мало данных');
 assert.equal(P.stage10StrongClaim({correct:40,total:40,approaches:2,sides:1}).status,'мало данных');
 assert.ok(P.stage10WilsonLower(37,40)>=0.8);
 assert.ok(P.stage10WilsonLower(36,40)<0.8);
});
test('One transfer block stays a narrow incomplete claim and does not update FSRS',()=>{
 const before=JSON.stringify({seen:1});
 const session=E.createSession({mode:'transfer',level:'person',seed:2,responseMode:'input'});
 assert.equal(session.hinted,false);
 assert.equal(E.reveal(session).hint,false);
 assert.equal(E.reveal({...session,phase:'feedback'}).expected,false);
 assert.ok(session.transferNote.includes('только вопрос'));
 assert.equal(ui.includes('COP полностью проверен'),false);
 assert.equal(ui.includes('person transfer mastered'),false);
 const claim=P.stage10StrongFromEvents(session.queue.map((q,i)=>({eventId:session.id+':'+i,lemmaId:E.getItem(q.id).lemmaId,sequence:E.getItem(q.id).sequence,correct:true,transfer:true,hinted:false,modality:'text',at:i+1})));
 assert.equal(claim.pass,false);assert.equal(claim.status,'мало данных');
 assert.equal(S.scheduleUpdate({transfer:true,mode:'transfer',correct:true,responseMode:'input',at:10}),null);
 assert.equal(JSON.stringify({seen:1}),before);
});
test('Same-session success is not retention and a delayed review is',()=>{
 const same=[{eventId:'s:0',itemId:'a',lemmaId:'n-a',at:1000,hinted:false,modality:'text',mode:'learn',correct:true},{eventId:'s:1',itemId:'a',lemmaId:'n-a',at:2000,hinted:false,modality:'text',mode:'learn',correct:true}];
 assert.equal(P.stage10Retention(same).count,0);
 const later=[{eventId:'old:0',itemId:'a',lemmaId:'n-a',at:1000,hinted:false,modality:'text',mode:'transfer',transfer:true,correct:true},{eventId:'new:0',itemId:'a',lemmaId:'n-a',at:1000+P.STAGE10_DELAY,hinted:false,modality:'text',mode:'learn',correct:true}];
 assert.equal(P.stage10Retention(later).count,1);
 assert.equal(P.stage10Retention(later).label,'есть отложенная проверка');
});
test('Exposed transfer lemma is not offered again as new',()=>{
 const first=E.createSession({mode:'transfer',level:'harmony',seed:8});
 const seen=first.queue.map(q=>E.getItem(q.id).lemmaId);
 const second=E.createSession({mode:'transfer',level:'harmony',seed:8,knownLemmas:seen});
 assert.equal(second.queue.some(q=>seen.includes(E.getItem(q.id).lemmaId)),false);
 const saved=S.putSession(S.empty(),first);
 assert.ok(seen.every(id=>saved.exposed.includes(id)));
 const merged=S.merge(saved,{version:1,events:[],exposed:[],session:null});
 assert.ok(seen.every(id=>merged.exposed.includes(id)));
});
test('Short bank copy and delayed feedback stay in the transfer UI',()=>{
 assert.equal(P.STAGE10_SHORT_BANK,'Недостаточно новых основ для полной проверки этого поднавыка.');
 assert.equal(P.STAGE10_SHORT_BANK,'Недостаточно новых основ для полной проверки этого поднавыка.');
 assert.ok(ui.includes('STAGE10_SHORT_BANK'));
 assert.ok(ui.includes('Проверены новые реальные основы'));
 assert.ok(ui.includes('Удержание:'));
 assert.equal(ui.includes('максимальное обобщение и не удержание'),true);
 new vm.Script(ui);
 assert.equal(E.bank().length,2231);
 assert.equal(E.writtenRelease.audioPlayback,false);
});
console.log('MORPH_STAGE10_OK',n,'checks');
