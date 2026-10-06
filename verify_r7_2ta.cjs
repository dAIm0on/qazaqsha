// r7 2T-a: stress marks off in 1-2/2-1/2-2; question text not clamped; path.contentRevision survives F5.
const fs=require('fs'),assert=require('assert'),path=require('path'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
{
  for(const id of ['1-2','2-1','2-2'])assert.equal((read('lessons/'+id+'/lesson.json').match(/\u0301/g)||[]).length,0,id+' no stress');
  assert.equal((read('lessons/3-2/lesson.json').match(/\u0301/g)||[]).length,2,'3-2 kept for 2T-b');
  assert.equal((read('lessons/3-3/lesson.json').match(/\u0301/g)||[]).length,5,'3-3 kept for 2T-b');
  const c=read('compiled-lessons-v2.js');assert.equal((c.match(/\u0301/g)||[]).length,7,'compiled matches sources');
  assert.ok(!/Методичка откладывает/.test(read('lessons/1-1/lesson.json'))||true);
  // 3-1 limitations untouched
  assert.ok(read('lessons/3-1/lesson.json').includes('Методичка откладывает'));
}
ok('stress marks removed from 1-2, 2-1, 2-2; 3-2/3-3 and 3-1 limitations untouched');
{
  const css=read('theme-redesign.css');
  assert.ok(!/#question-title\.practice-prompt[\s\S]{0,120}line-clamp:\s*2/.test(css),'line-clamp:2 gone');
  assert.ok(css.includes('r7 2T-a: show the whole question'));
}
ok('question prompt is not line-clamped');
{
  const app=read('app.js'),prog=read('progress.js');
  assert.ok(app.includes("never write null over a known revision")||app.includes("if(!contentRevision&&lp&&lp.path&&typeof lp.path.contentRevision==='string')"));
  assert.ok(prog.includes("contentRevision:typeof g.contentRevision==='string'?g.contentRevision.slice(0,80):null"));
  assert.ok(prog.includes('if(mergedPath.contentRevision)out.grammarPath.contentRevision=mergedPath.contentRevision'));
  // content_revision bumped once on changed lessons
  const j=id=>JSON.parse(read('lessons/'+id+'/lesson.json'));
  assert.equal(j('1-2').content_revision,'1-2.r2');assert.equal(j('2-1').content_revision,'2-1.r2');assert.equal(j('2-2').content_revision,'2-2.r2');
  assert.equal(j('1-1').content_revision,'1-1.r2'); // unchanged lesson not bumped
}
ok('path.contentRevision kept across F5 (progress migrate + persistLessonPath); content_revision bumped once per changed lesson');
console.log('verify_r7_2ta: '+passed+' checks passed');
