// r7 ux63: chapter_ids v2-theory fix; stress off in grammar-chapters/explain-bank/canon-texts; HG-19/20; Today counts path answers.
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
{
  for(const f of ['grammar-chapters.js','explain-bank.js','canon-texts.js']){
    assert.equal((read(f).match(/\u0301/g)||[]).length,0,f+' no stress');
  }
  for(const id of ['3-1','3-2','3-3','4-1','4-2']){
    assert.equal((read('lessons/'+id+'/lesson.json').match(/\u0301/g)||[]).length,0);
  }
}
ok('U+0301 gone in grammar-chapters/explain-bank/canon-texts + lessons 3–4');
{
  const m=JSON.parse(read('lessons/3-2/lesson.json')).migrations.find(x=>x.chapter_ids&&x.chapter_ids['v2-theory-3-2-j']);
  assert.ok(m); assert.equal(m.chapter_ids['v2-theory-3-2-j'],'v2-theory-3-2-i');
  assert.equal(JSON.parse(read('lessons/3-2/lesson.json')).content_revision,'3-2.r3');
}
ok('3-2 chapter_ids use v2-theory-* and revision r3');
{
  const app=read('app.js');
  assert.ok(app.includes("e.type==='answer'||e.type==='path'"),'Today counts path answers');
  assert.ok(app.includes('function startPreExam'),'HG-19 startPreExam');
  assert.ok(read('learning.js').includes('data-preexam')||read('learning.js').includes('PreExam.panelHtml'));
  assert.ok(read('pre-exam.js').includes('HG-19')&&read('pre-exam.js').includes('HG-20'));
  assert.ok(read('index.html').includes('pre-exam.js'));
  assert.ok(read('sw.js').includes('pre-exam.js')&&read('sw.js').includes("CACHE='qazaq-offline-live-20261006-r7-ux63-1'"));
}
ok('HG-19/20 wired; Today path answers; SW r7-ux63-1');
console.log('verify_r7_ux63: '+passed+' checks passed');
