// r7 #65: 5-1 full bank 142/186 + mastery D; draft-gate kept; SW r7-51-7.
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let n=0;const ok=m=>{n++;console.log('PASS '+m);};
const Schema=require('./lesson-v2-schema.js');

{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  const S=JSON.parse(read('lessons/5-1/sources.json'));
  L.sources=S.sources;
  assert.equal(L.lesson_id,'5-1');
  assert.equal(L.content_revision,'5-1.r2');
  assert.equal(L.status,'released');
  assert.equal(L.release&&L.release.approved,true);
  const p=Schema.validate(L);
  assert.equal(p.original_exercises.length,432);
  const ids=p.original_exercises.map(q=>q.id);
  const micro=ids.filter(id=>id.includes(':mp:')).length;
  const bw=ids.filter(id=>id.includes(':bw:')).length;
  const bs=ids.filter(id=>id.includes(':bs:')).length;
  const bb=ids.filter(id=>id.includes(':bb:')).length;
  const min=ids.filter(id=>id.includes(':min:')).length;
  const det=ids.filter(id=>id.includes(':det:')).length;
  const sort=ids.filter(id=>id.includes(':sort:')).length;
  assert.equal(micro,142,'§11 micro 142');
  assert.equal(bw+bs+bb+min+det+sort,186,'§12 productive 186');
  assert.equal(bw,76);assert.equal(bs,56);assert.equal(bb,12);assert.equal(min,16);assert.equal(det,18);assert.equal(sort,8);
  assert.equal((JSON.stringify(L).match(/\u0301/g)||[]).length,0,'no U+0301');
  assert.ok(!JSON.stringify(L).includes('example.invalid'));
}
ok('5-1 bank: 142 micro + 186 productive; released+approved; no stress/placeholder');

{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  const hw=L.homework.exercise_ids;
  assert.equal(hw.length,75,'school workbook 75 in HW');
  assert.ok(hw.every(id=>id.includes(':sch:')),'HW ids are school');
  assert.ok(!hw.some(id=>id.includes('xfer')),'no xfer stubs in HW');
  const practice=new Set(L.original_exercises.filter(q=>q.id.includes(':mp:')||q.id.includes(':bw:')||q.id.includes(':bs:')||q.id.includes(':bb:')||q.id.includes(':min:')||q.id.includes(':det:')||q.id.includes(':sort:')).map(q=>q.id));
  assert.equal([...hw].filter(id=>practice.has(id)).length,0,'HW ∩ practice = 0');
}
ok('HW counter: 75 school exercises; no xfer stubs; ∩ practice = 0');

{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  const by=Object.fromEntries(L.original_exercises.map(q=>[q.id,q]));
  for(const id of ['src:5-1:mastery:D1','src:5-1:mastery:D2','src:5-1:mastery:D3']){
    assert.ok(by[id],'missing '+id);
    assert.ok((by[id].fields[0].answers||[]).length>=1);
  }
  const fin=L.stages.find(s=>s.id==='stage:5-1:final');
  assert.ok(fin&&fin.final===true);
  assert.deepEqual(fin.required_independent_ids,['src:5-1:mastery:D1','src:5-1:mastery:D2','src:5-1:mastery:D3']);
  // D-7
  const d7=by['src:5-1:mastery:D7'];
  assert.ok(d7);
  const a7=d7.fields[0].answers.map(x=>x.toLowerCase());
  assert.ok(a7.some(x=>x.includes('аулада')));
  assert.ok(a7.some(x=>x.includes('далада')));
  // D-1 = A
  const d1=by['src:5-1:sch:1-3:4'];
  assert.ok(d1&&d1.fields[0].answers.includes('туда'));
  assert.ok(/D-1=A|флаге|опечатк/i.test(d1.note||''));
  // no revived disputed ids as open blockers
  assert.ok(!JSON.stringify(L).includes('D-2 ожидает')&&!JSON.stringify(L).includes('D-8 ожидает'));
}
ok('mastery D: D1+D2+D3 required; D-7 аулада+далада; D-1=A; no revived D');

{
  const c=read('compiled-lessons-v2.js');
  assert.ok(c.includes('"lesson_id": "5-1"'));
  assert.ok(c.includes('"content_revision": "5-1.r2"')||c.includes('"content_revision":"5-1.r2"'));
  assert.ok(!c.includes('example.invalid'));
  assert.ok(!read('explain-bank-adapter.js').includes("{id:'5-1'}"),'5-1 not in legacy COURSE');
  assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261010-vocab-pr2-fix'"));
  assert.ok(read('lesson-registry.js').includes('qaV2Preview')&&read('lesson-v2-runtime.js').includes('v2qa=1'));
}
ok('compiled r2 + SW section2-2 + release-gate intact');

{
  const L=JSON.parse(read('lessons/5-1/lesson.json'));
  const by=Object.fromEntries(L.original_exercises.map(q=>[q.id,q]));
  // P0: аула → где только аулада
  const a=by['src:5-1:bw:simple:16'].fields[0].answers;
  assert.deepEqual(a,['аулада']);
  let dual=0;
  for(const q of L.original_exercises){
    const ans=q.fields.flatMap(f=>f.answers||[]);
    const hasA=ans.some(x=>/аулада/i.test(x)), hasD=ans.some(x=>/далада/i.test(x));
    if(hasA&&hasD){dual++; assert.equal(q.id,'src:5-1:mastery:D7','dual only on D7, got '+q.id);}
  }
  assert.equal(dual,1);
  // P1 titles
  for(const q of L.original_exercises){
    assert.ok(!/Mastery/i.test(q.title||''), 'Mastery in title '+q.id);

    assert.ok(!/Mastery|mastery D/i.test(q.note||''), 'Mastery in note '+q.id);

    assert.ok(!/\bD-\d/.test(q.title||''), 'D-N in title '+q.id);
    assert.ok(!/^Сборник 1-1/.test(q.title||'') && !/Сборник 1-1/.test(q.title||''), 'Сборник 1-1 '+q.id+' '+q.title);
  }
  assert.ok(by['src:5-1:mastery:D1'].fields.length===2 && by['src:5-1:mastery:D1'].fields.every(f=>f.kind==='select'));
  assert.ok(by['src:5-1:mastery:D2'].fields.length===2 && by['src:5-1:mastery:D2'].fields.every(f=>f.kind==='select'));
  assert.ok(/Упражнения 5–1/.test(by['src:5-1:sch:1-1:1'].title));
  for(const s of L.stages||[]){
    assert.ok(!/Mastery/i.test(s.title||''), 'Mastery in stage '+s.id);
    assert.ok(!/\bD-\d/.test(s.title||''), 'D-N in stage '+s.id+' '+s.title);
  }
}
ok('P0/P1: аула≠далада except D7; RU titles; school 5-1 labels; D1/D2 select');

{
  const app=read('app.js');
  assert.ok(!/f\.kind==='select'\)\{f\.kind='text'/.test(app),'coerceTyped must keep select');
  assert.ok(app.includes("f.kind==='select'&&Array.isArray(f.options)"),'answerMarkup renders select chips');
}
ok('select fields kept + tap chips in practice UI');



console.log('verify_r7_51: '+n+' checks passed');
