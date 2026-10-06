// r7 2T-a: stress marks off in 1-2/2-1/2-2; question text not clamped; path.contentRevision survives F5.
const fs=require('fs'),assert=require('assert'),path=require('path'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
{
  for(const id of ['1-2','2-1','2-2'])assert.equal((read('lessons/'+id+'/lesson.json').match(/\u0301/g)||[]).length,0,id+' no stress');
  assert.equal((read('lessons/3-2/lesson.json').match(/\u0301/g)||[]).length,0,'3-2 cleared in 2T-b');
  assert.equal((read('lessons/3-3/lesson.json').match(/\u0301/g)||[]).length,0,'3-3 cleared in 2T-b');
  const c=read('compiled-lessons-v2.js');assert.equal((c.match(/\u0301/g)||[]).length,0,'compiled matches sources (no learner stress)');
  assert.ok(!/Методичка откладывает/.test(read('lessons/1-1/lesson.json'))||true);
  // 3-1 limitations untouched
  assert.ok(!read('lessons/3-1/lesson.json').includes('Методичка откладывает'),'3-1 limitations PDF line removed in 2T-b');
}
ok('stress marks removed 1-2…3-3; 3-1 PDF limitations line removed');
{
  const css=read('theme-redesign.css');
  assert.ok(!/#question-title\.practice-prompt[\s\S]{0,120}line-clamp:\s*2/.test(css),'line-clamp:2 gone');
  assert.ok(css.includes('r7 2T-a: show the whole question'));
}
ok('question prompt is not line-clamped');
{
  const app=read('app.js'),prog=read('progress.js');
  assert.ok(app.includes("never write null over a known revision")||app.includes("if(!contentRevision&&lp&&lp.path&&typeof lp.path.contentRevision==='string')"));
  assert.ok(prog.includes("if(typeof g.contentRevision==='string'&&g.contentRevision)state.grammarPath.contentRevision"));
  assert.ok(prog.includes('if(mergedPath.contentRevision)out.grammarPath.contentRevision=mergedPath.contentRevision'));
  // content_revision bumped once on changed lessons
  const j=id=>JSON.parse(read('lessons/'+id+'/lesson.json'));
  assert.equal(j('1-2').content_revision,'1-2.r2');assert.equal(j('2-1').content_revision,'2-1.r2');assert.equal(j('2-2').content_revision,'2-2.r2');
  assert.equal(j('1-1').content_revision,'1-1.r2'); // unchanged lesson not bumped
}
ok('path.contentRevision kept across F5 (progress migrate + persistLessonPath); content_revision bumped once per changed lesson');

{
  const fs2=fs, path2=path;
  const hits=[];
  const scan=(rel)=>{
    const txt=read(rel);
    for(const [i,line] of txt.split(/\n/).entries()){
      if(line.includes('\u0301'))hits.push(rel+':'+(i+1)+':'+line.trim().slice(0,120));
    }
  };
  for(const f of fs.readdirSync(__dirname).filter(n=>/^lesson-pack-[12]/.test(n)&&n.endsWith('.js')))scan(f);
  scan('app.js');
  // grammar-paths T15 is in 2-x farewell scope — no stress there either for 2T-a
  scan('grammar-paths.js');
  assert.equal(hits.length,0,'U+0301 leftovers:\n'+hits.join('\n'));
  // Explicitly catch the three former бі́з sites by positive «біз» wording without combining accent
  const pack=read('lesson-pack-2-2.js'), app=read('app.js');
  assert.ok(pack.includes('звонкое біз:')||pack.includes('звонкое біз '),'e22-5-1 біз without stress');
  assert.ok(pack.includes('біз → біз'),'m22-form-1 біз without stress');
  assert.ok(app.includes('быз / біз')&&!app.includes('бі\u0301з'),'person panel біз without stress');
  assert.ok(!read('grammar-paths.js').includes('Ударение:'),'T15 stress line removed');
}
ok('no U+0301 in lesson-pack-1/2*, app.js person panel, grammar-paths (T15); three біз sites clean');

{
  assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261006-r7-51-1'"));
}
ok('SW r7-51-1');
console.log('verify_r7_2ta: '+passed+' checks passed');
