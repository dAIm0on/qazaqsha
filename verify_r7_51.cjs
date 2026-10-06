// r7 #64: lesson 5-1 from PASS-DOC r2.3 (local case).
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let n=0;const ok=m=>{n++;console.log('PASS '+m);};
{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  assert.equal(L.lesson_id,'5-1');
  assert.equal(L.content_revision,'5-1.r1');
  assert.ok(L.theory.length>=10,'theory chapters');
  assert.ok(L.vocabulary.filter(v=>v.role==='target').length>=8,'R2 targets');
  assert.equal(L.homework.source_items.length,4);
  assert.ok(L.homework.external_tasks.some(t=>/PadezhMestnyi/.test(t.url)));
  assert.ok(L.homework.word_ids.includes('vocab:5-1:bolme'));
  assert.ok(L.original_exercises.length>=20);
  assert.equal((JSON.stringify(L).match(/\u0301/g)||[]).length,0,'no stress in 5-1');
}
ok('5-1 lesson.json: theory/vocab/hw/PadezhMestnyi/no U+0301');
{
  const c=read('compiled-lessons-v2.js');
  assert.ok(c.includes('"lesson_id": "5-1"')||c.includes('"lesson_id":"5-1"'));
  assert.ok(read('explain-bank-adapter.js').includes("{id:'5-1'"));
  assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261006-r7-51-1'"));
}
ok('compiled + COURSE + SW r7-51-1');
console.log('verify_r7_51: '+n+' checks passed');
