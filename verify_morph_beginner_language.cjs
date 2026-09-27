'use strict';
const assert=require('node:assert/strict');
const L=require('./morph-learner-v2.js');
const E=require('./morph-engine.js');
const forbidden=/\b(DAT|LOC|ABL|ACC|GEN|INS|PL|NEG|PAST|COND|POSS_\w*|COP_\w*|PTCP_\w*|CVB_\w*|AGR_SHORT_\w*|morphState|currentForm|currentEdge|holdout|FSRS)\b/;
for(const row of L.lessons)for(const mode of ['opening','full','contrast']){
  const html=L.render(row,mode);
  assert.equal(forbidden.test(html),false,row.id+' '+mode);
  assert.equal(/редактор добавит|TODO|PLACEHOLDER/.test(html),false);
}
const dat=E.itemFor('n-мектеп',['DAT']);
const poss=E.itemFor('n-кітап',['POSS_1SG']);
for(const text of [L.feedback(dat,['ONSET_CLASS']),L.feedback(poss,['STEM_CHANGE']),L.chainNote({morpheme:'DAT',before:'кітабы',stem:'кітабы',after:'кітабына',suffix:'на',changed:false},['MORPH_STATE']),L.operation(E.itemFor('n-үй',['PL','POSS_1PL','ABL']))]){
  assert.equal(forbidden.test(text),false,text);
  assert.equal(text.includes('POSS'),false);
}
assert.equal(L.feedback(E.itemFor('n-қала',['LOC']),[]),null);
assert.ok(L.unavailable().includes('временно недоступен'));
assert.equal(L.unavailable().includes('MODULE'),false);
const missing=L.render({id:'x',title:'Нет',blocks:[]},'full');
assert.ok(missing.includes('временно недоступен'));
assert.equal(missing.includes('morphState'),false);
console.log('MORPH_LEARNER_LANGUAGE_OK');
