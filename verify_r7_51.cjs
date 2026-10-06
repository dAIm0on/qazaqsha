// r7 #64: lesson 5-1 from PASS-DOC r2.3 (local case) + PDF Drive + draft-gate.
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let n=0;const ok=m=>{n++;console.log('PASS '+m);};

{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  assert.equal(L.lesson_id,'5-1');
  assert.equal(L.content_revision,'5-1.r1');
  assert.equal(L.status,'draft');
  assert.ok(L.theory.length>=10,'theory chapters');
  assert.ok(L.vocabulary.filter(v=>v.role==='target').length>=8,'R2 targets');
  assert.equal(L.homework.source_items.length,4);
  assert.ok(L.homework.external_tasks.some(t=>/PadezhMestnyi/.test(t.url)));
  assert.ok(L.homework.word_ids.includes('vocab:5-1:bolme'));
  assert.ok(L.original_exercises.length>=20);
  assert.equal((JSON.stringify(L).match(/\u0301/g)||[]).length,0,'no stress in 5-1');
  assert.equal(L.homework.exercise_ids.length,10,'xfer stubs → «0 из 10»');
}
ok('5-1 lesson.json: draft/theory/vocab/hw/PadezhMestnyi/10 stubs/no U+0301');

{
  const S=JSON.parse(read('lessons/5-1/sources.json'));
  const by=Object.fromEntries(S.sources.map(s=>[s.id,s]));
  for(const id of ['school-method','school-exercises','school-homework']){
    assert.ok(by[id],'missing '+id);
    assert.ok(/^https:\/\/drive\.google\.com\/file\/d\//.test(by[id].url),id+' Drive URL');
    assert.ok(!/example\.invalid/.test(by[id].url),id+' not placeholder');
  }
  assert.equal(by['school-method'].url,'https://drive.google.com/file/d/1mkSTmE2h69RG-HQWIUp13_AEzLVUImpi/view');
  assert.equal(by['school-exercises'].url,'https://drive.google.com/file/d/1kzrAMy3q7MNPxeXhufrPSMDSXpS6T_pt/view');
  assert.equal(by['school-homework'].url,'https://drive.google.com/file/d/1P2qNErsPIcbGERWlRdih0UsgqnPw83Zb/view');
}
ok('5-1 sources: live Drive PDFs (method/exercises/homework)');

{
  const c=read('compiled-lessons-v2.js');
  assert.ok(c.includes('"lesson_id": "5-1"')||c.includes('"lesson_id":"5-1"'));
  assert.ok(!c.includes('example.invalid'),'compiled has no example.invalid');
  assert.ok(c.includes('1mkSTmE2h69RG-HQWIUp13_AEzLVUImpi'));
  assert.ok(c.includes('1P2qNErsPIcbGERWlRdih0UsgqnPw83Zb'));
  // draft must NOT live in legacy COURSE (gate would be bypassed)
  assert.ok(!read('explain-bank-adapter.js').includes("{id:'5-1'"),'5-1 not in legacy COURSE');
  assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261006-r7-51-2'"));
}
ok('compiled Drive URLs + no COURSE 5-1 + SW r7-51-2');

{
  const reg=read('lesson-registry.js');
  const rt=read('lesson-v2-runtime.js');
  assert.ok(reg.includes('qaV2Preview')&&reg.includes('v2qa=1'),'registry QA bypass');
  assert.ok(rt.includes('qaV2Preview')&&rt.includes('v2qa=1'),'runtime QA bypass');
  assert.ok(reg.includes('productionReady')&&rt.includes('productionReady'));
  // ordinary host: drafts hidden unless productionReady or qa flag
  assert.ok(reg.includes('v2Visible')||reg.includes('productionReady(x)||qaV2Preview()'));
  assert.ok(rt.includes('productionReady(raw)||qaV2Preview()'));
}
ok('draft-gate: qaV2Preview (?v2qa=1 / localStorage / localhost)');

console.log('verify_r7_51: '+n+' checks passed');
