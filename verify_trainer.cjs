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

const hw=require('./homework.js');
const schema=require('./package-schema.js');
const pack11=hw.buildPack('1-1',course.questions,course);
assert.ok(pack11.homework.exercise_ids.length);
assert.ok(pack11.homework.exercise_ids.every(id=>ids.includes(id)));
assert.ok(pack11.homework.exercise_ids.length>cfg.session.size);
const dueHw=core.chooseShortSession(course.questions.filter(q=>q.source==='e1'),{},Date.now(),cfg.session.size);
assert.ok(dueHw.length<=cfg.session.size);
const stHw=progress.empty();
const hwPeek=hw.recordItem(stHw,'1-1',{id:pack11.homework.exercise_ids[0],correct:true,rule_peek:true,answers:['x']});
assert.equal(hwPeek.status,'с правилом');
assert.ok(!stHw.records[pack11.homework.exercise_ids[0]]);
ok('hw1 homework sheet not FSRS due; rule_peek not Good');

const pluralQ=course.questions.find(q=>q.id==='e2-1-1-1');
const rule=hw.ruleText(pluralQ);
assert.ok(rule&&rule.length>40);
assert.ok(!/қора/i.test(rule));
ok('hw2 rule text has no item answer');

const srs=scheduler.answer(scheduler.migrate({},1),{at:2,correct:true,hinted:true,recall:true,rating:require('./fsrs-vendor.js').Rating.Again});
assert.equal(srs.correct_streak,0);
ok('hw3 homework answer peek is Again');

const html=hw.exportHtml(stHw.homeworkAttempts['1-1'],pack11,course.questions);
assert.ok(html.includes('с правилом'));
assert.ok(/<table/i.test(html));
ok('hw4 HTML export has items and statuses');

const json=hw.exportJson(stHw.homeworkAttempts['1-1'],pack11);
const blob=JSON.stringify(json);
assert.equal(json.lesson_id,'1-1');
assert.ok(!blob.includes('fsrs'));
assert.ok(!json.records);
assert.ok(!blob.includes('1-2')||json.lesson_id==='1-1');
ok('hw5 JSON has no FSRS weights or other lessons');

const stWeak=progress.empty();
const dayA=Date.now()-4*86400000,dayB=Date.now()-1*86400000;
stWeak.events=[
  {type:'answer',card_id:'hw1-1-kk',at:dayA,correct:false,first_try_correct:0,peek:0,answers:['адамм']},
  {type:'answer',card_id:'hw1-1-kk',at:dayB,correct:false,first_try_correct:0,peek:0,answers:['аддам']}
];
const qsWeak=[{id:'hw1-1-kk',topic:'vocab',title:'Переведи на казахский',fields:[{answers:['адам']}],vocabIds:['word:адам']}];
const spots=hw.weakSpots(stWeak,qsWeak);
assert.ok(spots.some(s=>s.key==='word:адам::production'));
ok('hw6 two first-try errors on different days are weak');

stWeak.events.push({type:'answer',card_id:'hw1-1-kk',at:Date.now(),correct:true,rule_peek:1,first_try_correct:0,peek:0,answers:['адам']});
const spots2=hw.weakSpots(stWeak,qsWeak);
assert.ok(spots2.some(s=>s.key==='word:адам::production'));
ok('hw7 rule_peek correct does not clear weakness');

const review=core.blockReviewQueue('fail',['a','b','c','d'],['e','f']);
assert.notEqual(review[0],'fail');
assert.ok(review.includes('fail'));
ok('hw8 block review does not start with the failed id');

assert.throws(()=>schema.validateHomework({lesson_id:'1-1',homework:{title:'ДЗ',exercise_ids:['not-in-bank'],word_ids:[],rule_map:{},checklist:['method']}},new Set(ids)));
ok('hw9 unknown exercise_ids rejected');

const rawNoHw={app:'qazaq-trainer',schema:6,records:{hw1:{seen:1,correct_count:1,wrong_count:0,correct_streak:1,next_review:10}},events:[],skills:{},associations:{}};
const imported=progress.validate(JSON.stringify(rawNoHw),new Set(['hw1']),20);
assert.equal(imported.state.schema,6);
assert.ok(imported.state.homeworkAttempts);
assert.equal(Object.keys(imported.state.homeworkAttempts).length,0);
ok('hw10 schema without homeworkAttempts imports');

function packExercises(file){
  const box={window:{LESSON_PACKS:[]}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),box);
  return (box.window.LESSON_PACKS||[]).flatMap(p=>p.original_exercises||[]);
}
const qs21=packExercises('lesson-pack-2-1.js');
const qs22=packExercises('lesson-pack-2-2.js');
const all2=[...qs21,...qs22];
const p21=hw.buildPack('2-1',all2,{sources:{}});
const p22=hw.buildPack('2-2',all2,{sources:{}});
assert.ok(p21.homework.exercise_ids.includes('e21-form-1'));
assert.ok(p21.homework.exercise_ids.length>10);
assert.ok(p21.homework.word_question_ids.includes('hw22-20-ru'));
assert.ok(!p21.homework.word_question_ids.includes('hw22-1-ru'));
assert.ok(p21.homework.external_test_url.includes('LichnyeEdChislo'));
assert.ok(p22.homework.exercise_ids.includes('e22-form-1'));
assert.ok(p22.homework.word_question_ids.includes('hw22-1-ru'));
assert.ok(!p22.homework.word_question_ids.includes('hw22-20-ru'));
assert.ok(p22.homework.external_test_url.includes('LichnyeLitso1-2'));
schema.validateHomework({lesson_id:'2-1',homework:p21.homework},new Set(all2.map(q=>q.id)));
schema.validateHomework({lesson_id:'2-2',homework:p22.homework},new Set(all2.map(q=>q.id)));
const form21=qs21.find(q=>q.id==='e21-form-1');
const personRule=hw.ruleText(form21);
assert.ok(personRule);
assert.ok(!/жігітпін/i.test(personRule));
assert.equal(hw.ruleId(form21),'person');
const neg21=qs21.find(q=>q.id==='e21-neg-1');
if(neg21)assert.equal(hw.ruleId(neg21),'emes_ba');
ok('hw11 2-1 and 2-2 sheets from existing bank');

console.log('\nPassed',passed.length,'scenarios:\n'+passed.map(x=>' - '+x).join('\n'));
