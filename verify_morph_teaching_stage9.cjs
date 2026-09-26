'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),T=require('./morph-teaching-data'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const mixed=T.modules.find(x=>x.id==='mixed');
const text=mixed.fullExplanation.join('\n');
function ev(i,{family,lemma,correct=true,hinted=false,at=1,transfer=false,context}={}){
 const item=E.itemFor(lemma,[family]);
 return {eventId:'e'+at+':'+item.id,itemId:item.id,lemmaId:lemma,sequence:[family],contextClasses:context?[context]:item.trace.map(t=>t.edge),level:'mixed',mode:transfer?'transfer':'learn',modality:'text',responseMode:'choice',response:item.expected,expected:item.expected,correct,hinted,transfer,at};
}
const nouns=E.data.lemmas.filter(l=>l.pos==='noun'&&l.split==='train'&&l.predicate).slice(0,4).map(l=>l.id);
const verbs=E.data.lemmas.filter(l=>l.pos==='verb'&&l.split==='train').slice(0,4).map(l=>l.id);

test('Mixed canonical text keeps the routing criterion and does not replace it with the short line',()=>{
 assert.equal(mixed.families.length,28);
 assert.equal(mixed.shortSupport,'Сначала значение формы, затем её условие. У каждого семейства собственные группы.');
 assert.ok(text.includes('минимум 8 независимых первых ответов'));
 assert.ok(text.includes('минимум 4 основы'));
 assert.ok(text.includes('минимум 7 правильных'));
 assert.ok(text.includes('не научный сертификат'));
 assert.equal(text===mixed.shortSupport,false);
 assert.deepEqual(P.STAGE9_THRESHOLD,{attempts:8,correct:7,lemmas:4});
});
test('7 of 8 with only 3 lemmas is not eligible',()=>{
 const three=E.data.lemmas.filter(l=>l.pos==='noun'&&l.split==='train').slice(0,3).map(l=>l.id);
 const fams=['DAT','LOC','ABL'],events=[];
 for(const lemma of three)for(const family of fams){if(events.length<8)events.push(ev(events.length,{family,lemma,correct:events.length<7,at:events.length+1}));}
 const gate=P.stage9Assess(events,{families:fams});
 assert.equal(gate.attempts,8);assert.equal(gate.correct,7);assert.equal(gate.lemmas,3);assert.equal(gate.eligible,false);
 assert.equal(P.stage9Status({events},{families:fams}),'мало данных');
});
test('Eight attempts on one side of a contrast are not eligible',()=>{
 const many=E.data.lemmas.filter(l=>l.pos==='noun'&&l.split==='train').slice(0,8).map(l=>l.id);
 const events=many.map((lemma,i)=>ev(i,{family:'DAT',lemma,correct:true,at:i+1}));
 const gate=P.stage9Assess(events,{families:['DAT','LOC','ABL']});
 assert.equal(gate.attempts,8);assert.equal(gate.sides.length,1);assert.equal(gate.eligible,false);
});
test('Hinted attempts are excluded from the first-attempt gate',()=>{
 const hinted=nouns.concat(verbs).map((lemma,i)=>ev(i,{family:i<4?'Q':'NEG',lemma,correct:true,hinted:true,at:i+1}));
 assert.equal(P.stage9Assess(hinted,{families:['Q','NEG']}).attempts,0);
 const clean=[];
 for(let i=0;i<4;i++)clean.push(ev(i,{family:'Q',lemma:nouns[i],at:i+1}));
 for(let i=0;i<4;i++)clean.push(ev(i+4,{family:'NEG',lemma:verbs[i],at:i+5}));
 const gate=P.stage9Assess(clean,{families:['Q','NEG']});
 assert.equal(gate.eligible,true);assert.ok(gate.lemmas>=4);assert.equal(gate.correct,8);
});
test('A ready contrast queues only train items, prefers the recent error, and stays finite',()=>{
 const events=[];
 for(let i=0;i<4;i++)events.push(ev(i,{family:'Q',lemma:nouns[i],at:i+1}));
 for(let i=0;i<4;i++)events.push(ev(i+4,{family:'NEG',lemma:verbs[i],correct:i<3,at:i+5}));
 const state={events};
 const first=P.stage9Queue(state,7),second=P.stage9Queue(state,7);
 assert.deepEqual(first.items.map(i=>i.id),second.items.map(i=>i.id));
 assert.ok(first.items.length>=1&&first.items.length<=8);
 assert.equal(first.items[0].family,'NEG');
 assert.ok(first.items[0].reason.includes('ошибка'));
 assert.equal(first.items.every(i=>E.getItem(i.id).split==='train'),true);
 assert.equal(first.items.some(i=>P.stage9RaisesAllAxes(E.getItem(i.id),'choice')),false);
 const counts={};for(const item of first.items)counts[item.family]=(counts[item.family]||0)+1;
 assert.ok(Object.values(counts).every(n=>n<=2));
});
test('Repair uses another train lemma and refuses the same one',()=>{
 const source=P.stage9Pool('NEG')[0];
 const repair=P.stage9Repair(source,[source.lemmaId]);
 assert.notEqual(repair.lemmaId,source.lemmaId);
 assert.equal(repair.split,'train');
 assert.deepEqual(repair.sequence,source.sequence);
 assert.throws(()=>P.stage9Repair(source,P.stage9Pool('NEG').map(i=>i.lemmaId)));
});
test('Holdout cannot enter the mixed queue and transfer is a separate status',()=>{
 const events=[];
 for(let i=0;i<4;i++)events.push(ev(i,{family:'Q',lemma:nouns[i],at:i+1}));
 for(let i=0;i<4;i++)events.push(ev(i+4,{family:'NEG',lemma:verbs[i],at:i+5}));
 const queued=P.stage9Queue({events},1);
 assert.equal(queued.items.some(i=>E.data.lemmas.find(l=>l.id===i.lemmaId).split==='transfer'),false);
 const holdout=E.data.lemmas.find(l=>l.pos==='verb'&&l.split==='transfer');
 events.push(ev(20,{family:'NEG',lemma:holdout.id,transfer:true,at:30}));
 assert.equal(P.stage9Status({events},{families:['Q','NEG']}),'перенос проверен');
 assert.equal(P.stage9Queue({events:events.filter(e=>!e.transfer)},3).items.some(i=>i.lemmaId===holdout.id),false);
});
test('Mixed session keeps queue order and a production answer is stored once',()=>{
 const events=[];
 for(let i=0;i<4;i++)events.push(ev(i,{family:'Q',lemma:nouns[i],at:i+1}));
 for(let i=0;i<4;i++)events.push(ev(i+4,{family:'NEG',lemma:verbs[i],at:i+5}));
 const built=P.stage9Queue({events},4);
 const session={id:'stage9',version:1,dataVersion:E.data.version,level:'mixed',mode:'learn',responseMode:'choice',modality:'text',queue:built.items.map(i=>({id:i.id,options:i.options,reason:i.reason})),cursor:0,phase:'question',draft:'',hinted:false,result:null,startedAt:1,updatedAt:1,results:[],complete:false,closesLevel:false,transferNote:'',holdoutNote:'',unscoredFamilies:[]};
 const saved=S.putSession(S.empty(),session);
 const back=S.migrate(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(back.session.queue.map(q=>q.id),built.items.map(i=>i.id));
 assert.equal(back.session.queue[0].reason,built.items[0].reason);
 const answer=E.answer(back.session,E.getItem(back.session.queue[0].id).expected,20,40);
 const once=S.accept(back,answer),twice=S.accept(once.state,answer);
 assert.equal(once.accepted,true);assert.equal(twice.accepted,false);assert.equal(once.state.events.length,1);
 assert.equal(S.scheduleUpdate(once.event).hinted,false);
});
test('Stage 9 UI explains the queue and does not open a random bank when data is thin',()=>{
 const ui=fs.readFileSync('morph-ui.js','utf8');
 assert.ok(ui.includes('Повторяем эту функцию, потому что здесь была ошибка.')||ui.includes('P.stage9Queue'));
 assert.ok(ui.includes("level==='mixed'&&mode==='learn'"));
 assert.ok(ui.includes('data-stage9-repair'));
 assert.ok(ui.includes('Это исправление. Оно не считается самостоятельным ответом'));
 new vm.Script(ui);
 assert.equal(E.bank().length,2231);
 assert.equal(E.writtenRelease.audioPlayback,false);
});
console.log('MORPH_STAGE9_OK',n,'checks');
