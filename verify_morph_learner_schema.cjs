'use strict';
const assert=require('node:assert/strict');
const L=require('./morph-learner-v2.js');
const E=require('./morph-engine.js');
const trainIds=new Set(E.data.lemmas.filter(l=>l.split==='train').map(l=>l.id));
const transferTexts=E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.text);
const opts={formOf:(id,seq)=>E.form(id,seq).word,trainIds,transferTexts};
const report=L.check(opts);
assert.equal(report.ok,true,report.errors.join('\n'));
assert.equal(L.version,'learner-ru-v2-f1');
assert.equal(L.lessons.length,8);
for(const row of L.lessons){
  assert.equal(row.status,'READY');
  assert.ok(row.blocks.every(b=>b.id&&b.type&&b.slot));
  assert.equal(new Set(row.blocks.map(b=>b.id)).size,row.blocks.length);
}
const broken=structuredClone(L.lessons[0]);
broken.blocks=broken.blocks.filter(b=>b.id!=='dat.7');
const bad=L.check({...opts,lessons:[broken]});
assert.equal(bad.ok,false);
assert.ok(bad.errors.some(x=>x.includes('dat.7')));
console.log('MORPH_LEARNER_SCHEMA_OK');
