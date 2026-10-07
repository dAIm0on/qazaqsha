const assert=require('assert'),fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
const L=JSON.parse(read('lessons/5-1/lesson.json'));
const by=Object.fromEntries(L.original_exercises.map(q=>[q.id,q]));
let n=0; const ok=(m)=>{n++; console.log('PASS',m);};
assert.ok(!/решение владелицы/i.test(by['src:5-1:mastery:D7'].note||''));
assert.ok(/аулада/.test(by['src:5-1:mastery:D7'].note)&&/далада/.test(by['src:5-1:mastery:D7'].note));
ok('D7 note without owner clause');
const want={
  'stage:5-1:micro-1':'Часть слова или «чьё»',
  'stage:5-1:micro-2':'Место, время или возраст',
  'stage:5-1:micro-3':'Т или Д в окончании «где»',
  'stage:5-1:micro-4':'Нужно ли Н после «чьё»',
  'stage:5-1:micro-5':'А или Е в окончании «где»',
  'stage:5-1:micro-6':'Уже есть «чьё» 3-го лица?'
};
for(const s of L.stages){
  assert.ok(!/Изолированные рычаги/i.test(s.title||''),'lever '+s.id);
  if(want[s.id])assert.equal(s.title,want[s.id]);
}
ok('micro stages RU titles');
assert.ok(read('app.js').includes("['locative','Местный падеж «где»','09']"));
ok('locative topic RU label in app.js');
assert.ok(read('sw.js').includes("CACHE='qazaq-offline-live-20261007-51-live'"));
ok('SW r7-51-7');
assert.equal(L.status,'released');
assert.equal(L.release&&L.release.approved,true);
ok('5-1 released+approved');
console.log('verify_r7_66:',n,'checks passed');
