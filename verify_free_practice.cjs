'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cfg=require('./free-practice-config.js');
const Q=require('./free-practice-queue.js');
const S=require('./free-practice-state.js');
function card(i,extra={}){
 return Object.assign({cardId:'c'+i+':'+(extra.n||0),blockId:'block.a',targetSkillIds:['skill.a'],lemmaId:'l'+i,normalizedLemmaKey:'сөз'+i,subcase:extra.subcase||'a',exerciseType:'choose',split:'train',holdout:false,admissionStatus:'synthetic',options:['а','е'],answer:'а'},extra);
}
function pool(lemmas,per){
 const cards=[];
 for(let i=0;i<lemmas;i++)for(let n=0;n<per;n++)cards.push(card(i,{n,subcase:n%2?'b':'a'}));
 return cards;
}
function exhaust(lemmas,per,seed){
 let state=S.prepare(S.empty(seed),['block.a']).state;
 const cards=pool(lemmas,per);
 let guard=0;
 while(guard++<200){
  const step=S.present(state,cards);
  assert.equal(step.ok,true);
  if(step.picked&&step.picked.status==='EXHAUSTED')return step.state;
  state=step.state;
 }
 throw new Error('did not exhaust');
}
function questions(state){return state.history.filter(h=>h.exposureKind==='question');}
function assertRules(state){
 const rows=questions(state);
 const by=new Map();
 for(const row of rows){
  const n=(by.get(row.normalizedLemmaKey)||0)+1;
  assert.ok(n<=2,row.normalizedLemmaKey);
  by.set(row.normalizedLemmaKey,n);
  const prior=rows.slice(0,rows.indexOf(row)).filter(h=>h.cycle===row.cycle);
  const prev=prior.filter(h=>h.normalizedLemmaKey===row.normalizedLemmaKey);
  if(prev.length){
   const after=prior.slice(prior.lastIndexOf(prev[prev.length-1])+1);
   assert.ok(new Set(after.map(h=>h.normalizedLemmaKey)).size>=8);
  }
 }
}
assert.equal(cfg.config.enabled,true);
assert.ok(cfg.config.enabledBlockIds.includes('free.poss.my'));
assert.ok(cfg.config.enabledBlockIds.includes('free.harmony.meaning_dat'));
assert.equal(cfg.config.namespace,'qazaqsha.freePractice.v1');
for(const name of ['free-practice-config.js','free-practice-queue.js','free-practice-state.js','free-practice-view.js']){
 const text=fs.readFileSync(name,'utf8');
 for(const banned of ['ReviewScheduler','updateRecord','mastery_level','MorphBridge','qazaq-kris-course-v1'])assert.equal(text.includes(banned),false,name+' '+banned);
}
for(const seed of [1,2,3,4,7,8,9,11,20,40]){
 for(const [lemmas,per] of [[4,10],[8,1],[9,1],[20,1]]){
  const state=exhaust(lemmas,per,seed);
  assertRules(state);
  assert.equal(state.currentCycle,1);
  const again=exhaust(lemmas,per,seed);
  assert.deepEqual(questions(again).map(h=>h.cardId),questions(state).map(h=>h.cardId));
 }
}
const eight=exhaust(8,1,1);
assert.equal(questions(eight).length,8);
const four=exhaust(4,10,1);
assert.equal(new Set(questions(four).map(h=>h.normalizedLemmaKey)).size,4);
assert.equal(questions(four).length,4);
const twenty=exhaust(20,1,1);
assert.equal(questions(twenty).length,40);
const start=S.prepare(S.empty(3),['block.a']).state;
const first=S.present(start,pool(9,1));
const second=S.present(start,pool(9,1));
assert.equal(S.commit(first.state,start.revision,second.state).ok,false);
const back=S.roundtrip(first.state);
assert.deepEqual(back.currentCard.renderedOptions,first.state.currentCard.renderedOptions);
assert.equal(back.currentCard.presentationCommitted,true);
let cursor=first.state;
const control={records:{a:{mastery_level:'NEW',fsrs:{stability:1}}},events:[],skills:{}};
const before=JSON.stringify(control);
for(let i=0;i<30;i++){
 const kind=i%5;
 if(kind===0)cursor=S.answer(cursor,'е',false,'skill.a').state;
 else if(kind===1)cursor=S.reveal(cursor).state;
 else if(kind===2)cursor=S.setSupport(cursor,i%2?'try_myself':'supported').state;
 else if(kind===3){const step=S.present(cursor,pool(9,1));if(step.ok)cursor=step.state;}
 else cursor=S.roundtrip(cursor);
}
assert.equal(JSON.stringify(control),before);
assert.equal(cursor.currentCycle,1);
const fresh=S.claim(S.empty(1),'tab-a').state;
assert.equal(S.claim(fresh,'tab-b').ok,false);
assert.equal(S.takeOver(fresh,'tab-b').state.ownerId,'tab-b');
const ui=fs.readFileSync('morph-ui.js','utf8');
assert.ok(ui.includes('function freePracticeEntry'));
assert.equal(fs.readFileSync('free-practice-config.js','utf8').includes('enabled:true'),true);
const view=require('./free-practice-view.js');
const content=require('./free-practice-content.js');
view.open(view.synthetic(2),1);
const html=view.html();
assert.ok(html.includes('слово'));
assert.ok(html.includes('Оценок нет'));
assert.ok(html.includes('Дальше по уроку'));
assert.equal(html.includes('освоено'),false);
assert.equal(html.includes('%'),false);
const cap=content.capacity();
assert.ok(cap.find(x=>x.blockId==='free.poss.my'&&x.cards>0));
assert.ok(cap.find(x=>x.blockId==='free.voice.dat_build'&&x.cards>0));
const L=require('./morph-learner-v2.js');
const dat=L.lessons.find(x=>x.id==='learner.dat.kuda');
const poss=L.lessons.find(x=>x.id==='learner.poss.owner');
assert.ok(L.pieces(dat,'opening').some(p=>p.id==='dat.1'));
assert.ok(L.pieces(poss,'full').some(p=>p.id==='poss.26'));
const C=require('./free-practice-content.js');
for(const [heading,rows] of Object.entries(C.ANCHORS)){
 for(const row of rows){
  if(row.blockId.startsWith('free.mixed.'))continue;
  assert.ok(C.forBlock(row.blockId,row.subcase).length>0,heading+' '+row.blockId+' '+row.subcase);
 }
}
assert.ok(L.visibleText(dat,'full').includes('қалаға'));
assert.ok(L.visibleText(poss,'full').includes('кітабым'));
console.log('FREE_PRACTICE_P3P4_OK',JSON.stringify(cap));
