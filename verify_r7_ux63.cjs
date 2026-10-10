// r7 ux63: chapter_ids v2-theory; stress off; HG-19/20 (codes not in learner DOM); Today path; startPreExam/subset safe.
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
  assert.ok(app.includes('function startPreExam'),'startPreExam');
  // A: no undeclared reveal=; activeLesson cleared for pre-exam
  assert.ok(!/reveal\s*=\s*false/.test(app.match(/function startPreExam\(\)\{[\s\S]*?\n \}/)[0]),'startPreExam no reveal=');
  assert.ok(/activeLesson\s*=\s*null/.test(app.match(/function startPreExam\(\)\{[\s\S]*?\n \}/)[0]),'startPreExam activeLesson=null');
  // B: subset guards missing LEARNING track
  assert.ok(app.includes('if(!les||!Array.isArray(les.questionIds))return []'),'subset guards questionIds');
  const pe=read('pre-exam.js');
  // C: learner DOM copy has no HG-19/20; Russian trainer labels
  assert.ok(!/HG-19|HG-20/.test(pe.replace(/^\/\*[\s\S]*?\*\//,'')),'no HG codes outside file header comment');
  assert.ok(!/>HG-1[90]/.test(pe)&&!/HG-1[90]:/.test(pe),'no HG in panel strings');
  assert.ok(pe.includes('Звуки и ряд')&&pe.includes('Множественное число'),'Russian BatylBol labels');
  assert.ok(!/\blabel:'Zvuki'/.test(pe)&&!/\blabel:'MnozhChislo'/.test(pe),'latin trainer labels gone');
  assert.ok(read('learning.js').includes('PreExam.panelHtml'));
  assert.ok(read('index.html').includes('pre-exam.js'));
  assert.ok(read('sw.js').includes('pre-exam.js')&&read('sw.js').includes("CACHE='qazaq-offline-live-20261011-vocab-pr2-gap'"));
}
ok('A–C: startPreExam safe; subset guarded; no HG in UI; RU labels; SW r7-51-7');
console.log('verify_r7_ux63: '+passed+' checks passed');
