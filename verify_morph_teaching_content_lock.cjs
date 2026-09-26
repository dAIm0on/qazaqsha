const assert=require('assert'),T=require('./morph-teaching-data.js');
let n=0;
const test=(name,fn)=>{fn();n++;console.log('OK',name);};
function blob(id){
  const m=T.modules.find(x=>x.id===id);
  return JSON.stringify(m.fullExplanationBlocks||[])+'\n'+m.fullExplanation.join('\n');
}
test('Harmony keeps the canonical conditions',()=>{
  const s=blob('harmony');
  for(const token of ['A = а/е','ы/і','наблюдаемых вариантов','один и тот же грамматический элемент','специальное morphState','и/у','заимствования','ә-основы','обновляться','адаммен'])assert.ok(s.includes(token),token);
});
test('Nasal matrix keeps every edge row',()=>{
  const m=T.modules.find(x=>x.id==='nasal');
  const matrix=m.fullExplanationBlocks.find(b=>b.type==='matrix');
  assert.equal(matrix.rows.length,7);
  for(const edge of ['гласный','й / согласный у','Край: р','Край: л','м/н/ң','з/ж','глухой'])assert.ok(matrix.rows.some(r=>r.includes(edge)),edge);
  for(const form of ['адамдар','адамның','адамды','адамда','адамнан','адам ба','адаммын','адамбыз','адаммен'])assert.ok(blob('nasal').includes(form),form);
});
test('Voice, plural, poss and chains keep source conditions',()=>{
  assert.ok(blob('voice').includes('кітапта')&&blob('voice').includes('шы'));
  assert.ok(blob('plural').includes('қолдар')||blob('plural').includes('қол'));
  assert.ok(blob('poss').includes('принципі')||blob('poss').includes('принцип'));
  assert.ok(blob('chains').includes('а/е')&&blob('chains').includes('POSS'));
  assert.ok(blob('mixed').includes('8')&&blob('mixed').includes('7'));
});
test('Level 0 semantic groups keep INS and DAT apart',()=>{
  const groups=T.level0.semanticGroups;
  const ins=groups.find(g=>g.id==='INS');
  const dat=groups.find(g=>g.id==='DAT');
  const text=g=>JSON.stringify(g.blocks);
  assert.ok(text(ins).includes('Чем? С помощью чего?'));
  assert.ok(text(ins).includes('С кем? С чем вместе?'));
  assert.ok(text(dat).includes('куда')||text(dat).includes('Куда')||text(dat).includes('направлен'));
  const ui=require('fs').readFileSync('morph-ui.js','utf8');
  assert.ok(ui.includes('Разобрать смысл полностью'));
  assert.ok(ui.includes('data-teach-semantic-full'));
  const cvb=T.level0.familySemantics.CVB_IP.examples.map(x=>x.text).join('\n');
  assert.equal(cvb.includes('кел → келіп'),false);
});
test('Removing one nasal row or the mixed threshold would fail this lock',()=>{
  const rows=T.modules.find(x=>x.id==='nasal').fullExplanationBlocks.find(b=>b.type==='matrix').rows;
  assert.equal(rows.filter(r=>r.includes('з/ж')).length,1);
  assert.ok(blob('mixed').includes('8'));
});
console.log('CONTENT_LOCK_OK',n);
