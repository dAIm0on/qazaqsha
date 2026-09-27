'use strict';
const assert=require('node:assert/strict');
const E=require('./morph-engine.js');
const L=require('./morph-learner-v2.js');
const T=require('./morph-teaching-data.js');
const families=Object.keys(E.data.families);
const missing=families.filter(id=>!L.lessons.some(row=>row.status==='READY'&&row.families.includes(id)));
assert.deepEqual(missing,[]);
for(const module of T.modules){
 if(module.id==='mixed')continue;
 for(const familyId of module.families){
  const row=L.forFamily(module.id,familyId);
  assert.ok(row,module.id+' '+familyId);
 }
}
assert.ok(L.unavailable().includes('временно недоступен'));
console.log('MORPH_LEARNER_FALLBACK_OK',families.length);
