'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('./morph-teaching-practice');
const ui=fs.readFileSync('morph-ui.js','utf8');
const analyzer=fs.readFileSync('analyze_morph_pilot.cjs','utf8');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const row=(over)=>({eventId:'e'+Math.random(),at:1,itemId:'morph:v1:n-a:DAT',lemmaId:'n-a',sequence:['DAT'],level:'harmony',mode:'learn',responseMode:'choice',correct:true,hinted:false,errorCodes:[],modality:'text',scored:true,...over});
test('First independent count ignores hints, transfer, and a repeated item',()=>{
 const rows=[row({eventId:'a',itemId:'i1',hinted:true,correct:false}),row({eventId:'b',itemId:'i1',correct:true,at:2}),row({eventId:'c',itemId:'i1',correct:false,at:3}),row({eventId:'d',itemId:'i2',mode:'transfer',transfer:true,correct:true})];
 const first=P.pilotFirstIndependent(rows);
 assert.deepEqual(first.map(e=>e.eventId),['b']);
});
test('A repeated code on another lemma is counted once as a pattern, not a diagnosis',()=>{
 const rows=[row({eventId:'1',at:1,lemmaId:'n-a',correct:false,errorCodes:['HARMONY']}),row({eventId:'2',at:2,lemmaId:'n-b',correct:false,errorCodes:['HARMONY']})];
 assert.equal(P.pilotRepeatedError(rows),1);
 assert.equal(P.pilotErrorCounts(rows).HARMONY,2);
});
test('Export has the stored events and no microphone or audio recording',()=>{
 const doc=P.pilotExport({dataVersion:'morph-20260924-v1',teaching:{contentVersion:'morph-teaching-20260926-v3',events:[{eventId:'t',type:'guided_attempt',at:1,hinted:true,correct:true,lemmaId:'n-a',modality:'text'}]},events:[row({eventId:'only',correct:true})]});
 const text=JSON.stringify(doc);
 assert.equal(doc.kind,'qazaqsha-morph-pilot');
 assert.equal(doc.events.length,1);
 assert.equal(doc.teaching[0].type,'guided_attempt');
 assert.equal(doc.summary.claim,'мало данных');
 assert.equal(doc.summary.audioRecordings,0);
 assert.equal(text.includes('microphone'),false);
 assert.equal(text.includes('audioAssetId'),false);
 assert.equal(doc.summary.transfer.pass,false);
});
test('Same-day transfer is not called retention',()=>{
 const doc=P.pilotExport({events:[row({eventId:'t1',at:1000,itemId:'i',mode:'transfer',transfer:true}),row({eventId:'t2',at:2000,itemId:'i',mode:'learn'})]});
 assert.equal(doc.summary.retention.count,0);
});
test('Instrumentation does not declare a pedagogy pass',()=>{
 assert.equal(ui.includes('PEDAGOGY_PASS'),false);
 assert.equal(analyzer.includes('PEDAGOGY_PASS'),false);
 assert.ok(ui.includes('data-morph-pilot'));
 assert.ok(ui.includes('Скачать учебный журнал'));
});
console.log('MORPH_PILOT_INSTRUMENTATION_OK',n,'checks');
