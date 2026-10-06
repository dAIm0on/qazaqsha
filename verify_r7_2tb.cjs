// r7 2T-b: chapter map 46→39; stress off in 3-x; limitations line removed; SW r7-2tb-1.
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const j=id=>JSON.parse(read('lessons/'+id+'/lesson.json'));
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};

{
  const counts={ '3-1':6,'3-2':5,'3-3':8,'4-1':10,'4-2':10 };
  for(const [id,n] of Object.entries(counts)){
    assert.equal(j(id).theory.length,n,id+' chapter count');
    assert.equal(j(id).content_revision,id+'.r2',id+' revision');
  }
  assert.equal(j('3-1').theory[0].id,'theory:3-1:micro-3-0');
  assert.equal(j('3-3').theory.find(t=>t.id==='theory:3-3:bridge-words').title,'Слова на вырост');
  assert.equal(j('4-1').theory[0].id,'theory:4-1:stem');
  assert.equal(j('4-2').theory[0].id,'theory:4-2:contrast');
  assert.ok(j('4-1').theory.find(t=>t.id==='theory:4-1:alternation').fullExplanation.includes('Меняй только'));
  assert.ok(j('4-1').theory.find(t=>t.id==='theory:4-1:alternation').fullExplanation.includes('второе -ДЫ')||j('4-1').theory.find(t=>t.id==='theory:4-1:alternation').fullExplanation.toLowerCase().includes('второе -ды'));
  assert.ok(j('3-3').theory.find(t=>t.id==='theory:3-3:ask').fullExplanation.includes('Фразы урока'));
}
ok('chapter map counts/order/revision (6/5/8/10/10)');

{
  const map32=j('3-2').migrations.find(m=>m.to_revision==='3-2.r2').chapter_ids;
  assert.deepEqual(map32,{
    'theory:3-2:b':'theory:3-2:a','theory:3-2:d':'theory:3-2:c',
    'theory:3-2:f':'theory:3-2:e','theory:3-2:g':'theory:3-2:e','theory:3-2:j':'theory:3-2:i'
  });
  assert.equal(j('4-1').migrations.find(m=>m.to_revision==='4-1.r2').chapter_ids['theory:4-1:linker'],'theory:4-1:stem');
  const m42=j('4-2').migrations.find(m=>m.to_revision==='4-2.r2').chapter_ids;
  assert.equal(m42['theory:4-2:drop'],'theory:4-2:person');
  assert.equal(m42['theory:4-2:neg'],'theory:4-2:assim');
  assert.equal(m42['theory:4-2:da'],'theory:4-2:question');
}
ok('chapter_ids migrations for merges');

{
  assert.ok(!read('lessons/3-1/lesson.json').includes('Методичка откладывает'));
  assert.ok(j('3-2').original_exercises.some(x=>x.id==='v2-3-2-repair-j1'));
  const ct=j('4-2').theory.find(t=>t.id==='theory:4-2:contrast').checks;
  assert.ok(ct.every(c=>c.type==='choice'||!String(c.id).startsWith('42ct')||String(c.id).endsWith('-choice')));
  assert.ok(ct.some(c=>String(c.id).includes('choice')));
}
ok('3-1 limitations line gone; 32j1→practice; 42ct→choice');

{
  const hits=[];
  for(const id of ['3-1','3-2','3-3','4-1','4-2']){
    const t=read('lessons/'+id+'/lesson.json');
    if(t.includes('\u0301'))hits.push(id+':'+ (t.match(/\u0301/g)||[]).length);
  }
  assert.equal(hits.length,0,'stress leftovers '+hits.join(','));
  assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261006-r7-2tb-1'"));
}
ok('no U+0301 in 3-1…4-2; SW r7-2tb-1');

console.log('verify_r7_2tb: '+passed+' checks passed');
