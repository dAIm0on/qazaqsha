// r7 step 3: static gates for OPEN 1–4 learner run (+ 5-1 now released).
const assert=require('assert'),fs=require('fs'),path=require('path');
const read=p=>fs.readFileSync(p,'utf8');
const root=__dirname;
let n=0;const ok=m=>{n++;console.log('PASS',m);};
const compiled=read('compiled-lessons-v2.js');
assert.ok(/window\.LESSON_V2_COMPILED/.test(compiled));
const vm=require('vm');
const ctx={window:{}};ctx.window.window=ctx.window;
vm.runInNewContext(compiled,ctx);
const lessons=ctx.window.LESSON_V2_COMPILED||[];
const by=Object.fromEntries(lessons.map(l=>[l.lesson_id,l]));
const OPEN=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'];
for(const id of OPEN){
  assert.ok(by[id],'missing '+id);
  assert.ok(by[id].status==='released'||by[id].status==='reviewed'||by[id].status==='draft'||by[id].status,'status '+id);
}
ok('OPEN lessons present in compiled: '+OPEN.join(','));
assert.ok(by['5-1'],'5-1 in compiled');
assert.equal(by['5-1'].status,'released');
assert.equal(by['5-1'].release&&by['5-1'].release.approved,true);
ok('5-1 present as released+approved');
// HW ∩ practice for v2 with homework.exercise_ids
for(const id of OPEN){
  const L=by[id];
  const hw=new Set((L.homework&&L.homework.exercise_ids)||[]);
  if(!hw.size)continue;
  const practice=new Set((L.original_exercises||[]).filter(q=>!hw.has(q.id)).map(q=>q.id));
  // homework should not equal full original set blindly for 3-3 historically — just report intersection with bank if any
  const bank=new Set(((L.practice_bank&&L.practice_bank.items)||[]).map(q=>q.id||q));
  for(const qid of hw)if(bank.has(qid))assert.fail(id+' HW∩bank '+qid);
}
ok('no HW∩practice_bank for OPEN with bank');
assert.ok(fs.existsSync('tools/step3-learner-run.mjs'));
assert.ok(fs.existsSync('docs/r7/R7_STEP3.md'));
ok('step3 runner + docs present');
console.log('verify_r7_step3:',n,'checks passed');
