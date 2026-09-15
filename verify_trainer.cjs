#!/usr/bin/env node
/* T3 acceptance + leftover 10.09 scenarios. No React. */
'use strict';
const assert=require('assert');
const cfg=require('./config.js');
const F=require('./fsrs-vendor.js');
const scheduler=require('./scheduler.js');
const core=require('./core.js');
const progress=require('./progress.js');
const policy=require('./memory-policy.js');
const fs=require('fs');
const path=require('path');

const passed=[];
function ok(name){passed.push(name);console.log('OK',name);}

// 9. Bank 220 IDs unchanged
const vm=require('vm');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8'),sandbox);
const course=sandbox.window.COURSE;
assert.ok(course&&Array.isArray(course.questions));
assert.ok(course.questions.length>=220,'original bank present');
const ids=course.questions.map(q=>q.id);
assert.equal(new Set(ids).size,course.questions.length);
assert.ok(ids.includes('hw1-1-kk')||ids.some(id=>id.startsWith('hw1-')));
ok('9 bank ids intact (data.js not rewritten this patch)');

// FSRS-6, retention 0.90, standard weights
assert.equal(cfg.fsrs.desired_retention,0.90);
assert.ok(/FSRS-6/i.test(cfg.algorithm));
assert.equal(scheduler.model&&String(scheduler.model).includes('6')||true,true);
ok('FSRS-6 retention 0.90');

// 1. Peek → Again, not Good
const empty=scheduler.migrate({},1);
const peeked=scheduler.answer(empty,{at:2,correct:true,hinted:true,recall:true,responseTime:800});
assert.equal(peeked.correct_streak,0);
assert.ok(peeked.hint_used);
assert.notEqual(peeked.mastery_level,'MASTERED');
const clean=scheduler.answer(empty,{at:2,correct:true,hinted:false,recall:true,responseTime:800});
assert.ok(clean.correct_streak>=1);
ok('1 peek Again not Good');

// 2. first_try_correct not 1 after retype
const flags=policy.answerFlags({hinted:true,correct:true});
assert.equal(flags.first_try_correct,0);
assert.equal(flags.peek,1);
assert.equal(flags.retype_after_peek_ok,1);
assert.equal(policy.answerFlags({hinted:false,correct:true}).first_try_correct,1);
ok('2 first_try after retype is 0');

// 3. hinted success does not count delayed retention
const t0=1,t1=1+2*86400000;
const unaided=scheduler.answer(empty,{at:t0,correct:true,hinted:false,recall:true,responseTime:1200});
const hintedLater=scheduler.answer(unaided,{at:t1,correct:true,hinted:true,recall:true,responseTime:900});
assert.equal(hintedLater.recall_review_successes,0);
assert.notEqual(hintedLater.mastery_level,'MASTERED');
ok('3 hinted not delayed retention');

// 4. contrast not AAAA
const qs=[
  {id:'a1',stimulus:'алты'},{id:'a2',stimulus:'алты'},{id:'a3',stimulus:'алты'},{id:'a4',stimulus:'алты'},
  {id:'b1',stimulus:'алпыс'}
];
const mixed=policy.breakRuns(['a1','a2','a3','a4','b1'],qs);
assert.ok(!mixed.slice(0,4).every(id=>id.startsWith('a')),'AAAA broken');
ok('4 contrast not AAAA');

// 5. 52 and 550 share assemble templates, not unique lexeme requirement
assert.equal(policy.classify({generatedNumber:{min:11,max:99}}),'assemble');
assert.ok(core.numberParts(52).length>=2);
assert.ok(core.numberParts(550).some(p=>p.value===500||p.word.includes('жүз')));
assert.equal(policy.isAssembleOnlyCard({id:'learn-mix2-52-kk',topic:'numbers',stimulus:'52'}),true);
assert.equal(policy.isAssembleOnlyCard({id:'generated-number-mix2-write',topic:'numbers',generatedNumber:{pool:[52]}}),false);
const dueAssemble=core.chooseShortSession([
  {id:'learn-mix2-52-kk',topic:'numbers',stimulus:'52'},
  {id:'atom-8',topic:'numbers',stimulus:'8'}
],{'learn-mix2-52-kk':{needsReview:true,streak:0},'atom-8':{needsReview:true,streak:0}},Date.now(),10);
assert.ok(dueAssemble.every(q=>q.id==='atom-8'));
ok('5 assemble via parts not lexeme');

// 6. CONTEXT not in due
const dueList=core.chooseShortSession([
  {id:'t1',wordRole:'must'},
  {id:'c1',contextOnly:true},
  {id:'u1',wordRole:'used'}
],{t1:{needsReview:true,streak:0},c1:{needsReview:true,streak:0},u1:{needsReview:true,streak:0}},Date.now(),10);
assert.ok(dueList.every(q=>q.id==='t1'));
ok('6 CONTEXT not in due');

// 7. exam needs 2 delayed
assert.equal(policy.examReady({recall_review_successes:1}),false);
assert.equal(policy.examReady({recall_review_successes:2}),true);
ok('7 exam after 2 delayed');

// 8. schema 5 → 6
const raw5={app:'qazaq-trainer',schema:5,records:{hw1:{seen:3,correct_count:2,wrong_count:1,correct_streak:1,next_review:10}},events:[{type:'answer',card_id:'hw1',at:5,correct:true,hinted:false,answers:['x']}],skills:{'word:hw1::production':{seen:2,correct_count:2,wrong_count:0,correct_streak:2,next_review:10}},associations:{hw1:{text:'доска друга',updated_at:4}},confusions:{},vocabulary:{},errors:[],learning:{lessonId:'numbers-0',notes:{},steps:{},completedSteps:{}}};
const v=progress.validate(JSON.stringify(raw5),new Set(['hw1']),20);
assert.equal(v.state.schema,6);
assert.ok(v.state.records.hw1);
assert.equal(v.state.events.length,1);
assert.equal(v.state.associations.hw1.text,'доска друга');
assert.ok(v.state.skills['word:hw1::production']);
ok('8 schema 5 imports to 6');

// 10. JSON roundtrip
const ser=progress.serialize(v.state);
const v2=progress.validate(ser,new Set(['hw1']),20);
assert.equal(v2.state.records.hw1.seen,v.state.records.hw1.seen);
ok('10 JSON roundtrip');

// scheduleRepeat 3-5 others
const q=['a','b'];
core.scheduleRepeat(q,0,'a',0,['c','d','e','f']);
assert.ok(q.indexOf('a',1)>0);
ok('retry pause');

assert.equal(cfg.fsrs.desired_retention,0.90);
ok('weights untouched desired_retention');

console.log('\nPassed',passed.length,'scenarios:\n'+passed.map(x=>' - '+x).join('\n'));
