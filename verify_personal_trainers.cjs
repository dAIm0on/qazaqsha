'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const H=require('./harmony-letter-trainer.js');

let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}

test('K2.1-01 all 42 Kazakh Cyrillic letters are covered exactly once',()=>{
  const c=H.coverage();
  assert.equal(c.count,42);
  assert.equal(c.unique,42);
  assert.deepEqual(c.duplicates,[]);
});

test('K2.1-02 Й is present and neutral',()=>{
  assert.equal(H.bucketOf('Й'),'NEUTRAL');
  assert.equal(H.labelForLetter('Й'),'Не задаёт ряд');
});

test('K2.1-03 Ё is quarantined and never core hard',()=>{
  assert.equal(H.bucketOf('Ё'),'SPECIAL_LOAN');
  assert.equal(H.BUCKETS.CORE_HARD.includes('Ё'),false);
  const row=H.classifyItems(()=>0.5).find(x=>x.letter==='Ё');
  assert.equal(row.type,'info');
  assert.equal(row.scored,false);
});

test('K2.1-04 И У Ю are context letters',()=>{
  for(const x of ['И','У','Ю'])assert.equal(H.bucketOf(x),'CONTEXT');
});

test('K2.1-05 six required pairs are symmetric and pair round has 12 directions',()=>{
  assert.equal(H.PAIRS.length,6);
  const items=H.pairItems(()=>0.4);
  assert.equal(items.length,12);
  for(const p of H.PAIRS){
    assert.ok(items.some(x=>x.focus===p.hard&&x.correct===p.soft));
    assert.ok(items.some(x=>x.focus===p.soft&&x.correct===p.hard));
  }
});

test('K2.1-06 classify learning bank includes every letter',()=>{
  const rows=H.classifyItems(()=>0.3);
  assert.equal(rows.length,42);
  assert.equal(new Set(rows.map(x=>x.letter)).size,42);
});

test('K2.1-07 free recall requires full set, not partial match',()=>{
  const item=H.recallItems(()=>0.2).find(x=>x.id==='recall-soft');
  assert.equal(H.grade(item,item.correct).correct,true);
  assert.equal(H.grade(item,item.correct.slice(0,-1)).correct,false);
});

test('K2.1-08 canonical word transfer cases match K2',()=>{
  const expected={
    'кітап':'HARD','мұғалім':'SOFT','заңгер':'SOFT','мұхит':'HARD',
    'ит':'SOFT','ми':'HARD','су':'HARD','сүю':'SOFT'
  };
  for(const [word,row] of Object.entries(expected)){
    const hit=H.WORD_BANK.find(x=>x.word===word);
    assert.ok(hit,'missing '+word);
    assert.equal(hit.row,row,word);
  }
});

test('K2.1-09 wrong pair schedules targeted repair of the same item',()=>{
  let s=H.createSession('full',()=>0.4);
  s=H.startStage(s,1,()=>0.4);
  const first=s.queue[0],wrong=first.options.find(x=>x!==first.correct);
  const next=H.answer(s,wrong,900);
  assert.equal(next.lastResult.correct,false);
  assert.ok(next.queue.some(x=>x.repairOf===first.id));
});

test('K2.1-10 correct answer does not schedule a repair',()=>{
  let s=H.createSession('full',()=>0.4);
  s=H.startStage(s,1,()=>0.4);
  const first=s.queue[0],next=H.answer(s,first.correct,900);
  assert.equal(next.lastResult.correct,true);
  assert.equal(next.queue.some(x=>x.repairOf===first.id),false);
});

test('K2.1-11 session JSON roundtrip preserves exact queue and cursor',()=>{
  let s=H.createSession('full',()=>0.4);
  s=H.startStage(s,2,()=>0.4);
  s.cursor=9;
  const restored=JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored.queue,s.queue);
  assert.equal(restored.cursor,9);
  assert.equal(restored.stage,2);
});

test('K2.1-12 default full rounds stay short while full banks remain available',()=>{
  const classify=H.classifyRound(()=>0.4),words=H.wordRound(()=>0.4);
  assert.ok(classify.length>=12&&classify.length<=13);
  assert.equal(words.length,12);
  assert.equal(H.classifyItems(()=>0.4).length,42);
  for(const word of ['кітап','мұғалім','заңгер','мұхит','ит','ми','су','сүю'])assert.ok(words.some(x=>x.word===word&&x.type==='choice'));
});

test('K2.1-13 dashboard exposes the shared trainer catalog',()=>{
  const d=fs.readFileSync(path.join(__dirname,'dashboard.js'),'utf8');
  assert.ok(d.includes('data-action="personal-trainers"'));
  assert.ok(d.includes('<span>Тренажёры</span>'));
  assert.ok(d.includes('Буквы · числа · слова'));
});

test('K2.1-14 standalone view and scripts are wired without adding a nav tab',()=>{
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  assert.ok(html.includes('id="personal-view"'));
  assert.ok(html.includes('harmony-letter-trainer.js'));
  assert.ok(html.includes('personal-trainers.js'));
  const bottom=(html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)||[''])[0];
  assert.equal((bottom.match(/data-view=/g)||[]).length,3);
});

test('K2.1-15 app routes personal trainer without course start semantics',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  assert.ok(app.includes("if(next==='personal-trainers'){showView('personal');return;}"));
  assert.ok(app.includes("if(next==='personal'&&window.PersonalTrainers)window.PersonalTrainers.render()"));
  const personal=fs.readFileSync(path.join(__dirname,'personal-trainers.js'),'utf8');
  assert.ok(personal.includes("qazaqsha-personal-trainers-v1"));
  assert.equal(/markLessonStarted|setResumePointer|courseProgress|fsrs-vendor|scheduler\.js/.test(personal),false);
});

test('K2.1-16 service worker caches both standalone trainer files',()=>{
  const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
  assert.ok(sw.includes('"harmony-letter-trainer.js"'));
  assert.ok(sw.includes('"personal-trainers.js"'));
  assert.ok(sw.includes('20260924-morph-v1'));
});


test('K2.1-17 catalog reuses existing trainer engines instead of copying them',()=>{
  const personal=fs.readFileSync(path.join(__dirname,'personal-trainers.js'),'utf8');
  assert.ok(personal.includes("id:'harmony_letters'"));
  assert.ok(personal.includes("id:'numbers'"));
  assert.ok(personal.includes("target:'vocab:must'"));
  assert.ok(personal.includes("target:'vocab:used'"));
  assert.ok(personal.includes('window.TrainerCatalogBridge'));
  assert.equal(/window\.WORD_BANK\s*=|window\.NumberLadder\s*=/.test(personal),false);
});

test('K2.1-18 encountered-word trainer mixes both directions in one queue',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const personal=fs.readFileSync(path.join(__dirname,'personal-trainers.js'),'utf8');
  assert.ok(app.includes("kind==='vocab:used'?'used':'must'"));
  assert.ok(app.includes("q.topic==='vocab'&&q.wordRole===role"));
  assert.ok(app.includes("list.filter(q=>/-ru$/.test(q.id))"));
  assert.ok(app.includes("list.filter(q=>/-kk$/.test(q.id))"));
  assert.ok(app.includes('Math.random()<0.5'));
  assert.ok(personal.includes('Узнать и написать вперемешку в одном подходе'));
  assert.equal(personal.includes('vocab_seen_write'),false);
});

test('K2.1-19 number catalog preserves NumberLadder gating without lesson progression',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  assert.ok(app.includes('window.NumberLadder&&window.NumberLadder.ORDER'));
  assert.ok(app.includes('window.NumberLadder.allowed(q,state)'));
  assert.ok(app.includes("topic='numbers';vocabRole=null;mode='numbers'"));
  const block=(app.match(/if\(String\(kind\)\.startsWith\('number:'\)\)[\s\S]*?const role=/)||[''])[0];
  assert.ok(block);
  assert.equal(block.includes('startLesson('),false);
  assert.ok(block.includes('activeLesson=null'));
});

test('K2.1-20 trainer-origin sessions return to catalog and survive session save',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  assert.ok(app.includes('trainerReturn'));
  assert.ok(app.includes("trainerReturn=savedSession.trainerReturn||null"));
  assert.ok(app.includes("К тренажёрам"));
  assert.ok(app.includes("showView(trainerReturn?'personal'"));
});


test('K2.1-21 mobile trainer lists clear the fixed bottom navigation',()=>{
  const css=fs.readFileSync(path.join(__dirname,'theme-redesign.css'),'utf8');
  assert.ok(css.includes('#personal-view .personal-trainer-list{padding-bottom:calc(12px + var(--bottom-nav-height,64px))}'));
  assert.ok(css.includes(':root{--bottom-nav-height:calc(64px + env(safe-area-inset-bottom, 0px))}'));
});
console.log('\nK2.1 verify PASS:',passed,'tests');
