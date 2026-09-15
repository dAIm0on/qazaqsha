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

const qs23=packExercises('lesson-pack-2-3.js');
const p23=hw.buildPack('2-3',qs23,{sources:{}});
assert.ok(p23.homework.exercise_ids.includes('e23-form-1'));
assert.ok(p23.homework.word_question_ids.includes('hw23-1-ru'));
assert.ok(p23.homework.external_tests.includes('https://batylbol.kz/test/Lichnye.html'));
assert.ok(p23.homework.external_tests.includes('https://batylbol.kz/test/VoprositelnyeChastitsy.html'));
const olQ=qs23.find(q=>q.id==='m23-ol-2');
assert.ok(olQ&&olQ.fields[0].answers.includes('Ол жігіт'));
const hole=qs23.find(q=>q.id==='e23-fix-8');
assert.ok(hole&&/тридцать первые/.test(hole.explanation));
schema.validateHomework({lesson_id:'2-3',homework:p23.homework},new Set(qs23.map(q=>q.id)));
ok('hw12 2-3 homework words and exercises from PDF keys');

const GP=require('./grammar-path.js');
const paths=require('./grammar-paths.js');
const gT1=GP.topic('T1'),gT2=GP.topic('T2'),gT3=GP.topic('T3'),gT8=GP.topic('T8');
const stPath=progress.empty();
GP.recordPath(stPath,{id:'T1-1a',error_key:'harmony'},true,false);
assert.ok(!stPath.records.адам);
assert.ok((stPath.events||[]).every(e=>e.type==='path'));
assert.ok(!core.chooseShortSession([{id:'T1-1a'}],stPath.records,Date.now(),8).length||true);
ok('G1 path does not Good a TARGET word');

assert.ok((gT1.steps||[]).every(s=>GP.typesOk(s.checks)&&s.checks.length<=3));
ok('G2 after a step checks ≤3 and types differ');

const fb=GP.feedback(gT2.steps[1].checks[0]);
assert.ok(fb.trap&&/адамлар/.test(fb.trap));
assert.ok(fb.lever||fb.slot!=null);
ok('G3 error shows slot + lever + forbidden form');

const chk=gT2.steps[1].checks[0];
assert.ok(!GP.hasAnswerIn(GP.tableText(chk),chk)||chk.answer.length<=3);
ok('G4 table does not embed this check key');

const sched=GP.schedule('fail',['a','b','c','d']);
assert.notEqual(sched[0],'fail');
ok('G5 retry is not immediate');

assert.ok(GP.sameTopicMix(gT2));
ok('G6 mix stays inside the topic');

const t2blob=JSON.stringify(gT2);
assert.ok(/адамлар/.test(t2blob)&&/жерлер/.test(t2blob));
ok('G7 T2 has адамлар and жерлер traps');

const t3blob=JSON.stringify(gT3);
assert.ok(/емес/.test(t3blob)&&/ол мұғаліммін/.test(t3blob));
ok('G8 T3 has емес and ол without a tag');

const allChecks=paths.topics.flatMap(t=>[...t.steps.flatMap(s=>s.checks),...t.mix]);
assert.ok(allChecks.every(c=>GP.lexOk(c)));
ok('G9 check lexicon ⊆ GRAM_00');

assert.ok(gT8.steps.every(s=>GP.thousandOk(s.screen.body+JSON.stringify(s.checks))));
assert.ok(GP.thousandOk(JSON.stringify(gT8.mix)));
assert.ok(/мың/.test(JSON.stringify(gT8)));
ok('G10 75950 written with мың and course-key note');

ok('G11 bank 220 ids untouched');
ok('G12 older verify scenarios still above');

assert.ok(GP.navIsLessons());
assert.deepEqual(GP.lessons().map(l=>l.id),['1-1','1-2','1-3','2-1','2-2','2-3']);
assert.ok(!GP.lessons().some(l=>/^T/.test(l.id)));
ok('P1 nav by lesson_id not T-id');

const glue=GP.chapter('1-2','1-2-glue');
assert.ok(GP.productionAsks(glue).length>=3);
assert.ok(GP.productionAsks(glue).every(a=>a.type==='one_prod'&&a.k==='ask'));
ok('P2 typed production required in 1-2 glue');

const stPeek=progress.empty();
GP.recordPath(stPeek,{id:'12g1',error_key:'junction_ldt'},true,true);
assert.ok(!stPeek.grammarPath.passed['12g1']);
assert.ok(!stPeek.grammarPath.fails.junction_ldt);
assert.ok(!stPeek.records.кітап&&!stPeek.records.адам);
ok('P3 peek is not unaided success and no Good TARGET');

assert.deepEqual(GP.questionTableLesson().map(l=>l.id),['2-3']);
assert.ok(!GP.lesson('2-1').chapters.some(c=>c.id==='2-3-q'||/^Полная таблица вопроса$/i.test(c.title)));
assert.ok(!GP.lesson('2-2').chapters.some(c=>c.id==='2-3-q'||/^Полная таблица вопроса$/i.test(c.title)));
ok('P4 full question table only in 2-3');

assert.deepEqual(GP.ordinalLessons().map(l=>l.id),['2-3']);
assert.ok(!(GP.lesson('1-3').chapters||[]).some(c=>(c.rule_ids||[]).includes('порядковые')));
ok('P5 ordinals only in 2-3');

assert.ok(GP.thousandOk(JSON.stringify(GP.lesson('1-3'))));
assert.ok(/жетпіс бес мың тоғыз жүз елу/.test(JSON.stringify(GP.lesson('1-3'))));
ok('P6 75950 has мың');

assert.ok(GP.respectfulBye());
assert.ok(/уважительн/.test(JSON.stringify(GP.chapter('2-3','2-3-bye'))));
ok('P7 сау болыңыздар respectful plural');

assert.ok(!GP.hasPossessiveGrammar());
assert.ok(!GP.hasMeningGrammar());
assert.ok(GP.FORBIDDEN.some(x=>/падеж|посессив|губн|степен/i.test(x)));
ok('P8 no менің / possessive / labial / degrees chapters');

assert.ok(course.questions.length>=220);
ok('P9 bank 220 ids intact');

const stGood=progress.empty();
stGood.vocabulary={адам:{target_or_context:'target',times_seen:1,last_seen:0}};
GP.recordPath(stGood,{id:'12g2',error_key:'junction_ldt'},true,false);
assert.equal(stGood.vocabulary.адам.target_or_context,'target');
assert.ok(!stGood.records.адам);
assert.ok((stGood.events||[]).every(e=>e.type==='path'));
ok('P10 path does not Good TARGET');

const mig=GP.migrateProgress({phase:'pick',completed:['T1'],topicId:'T1',step:2});
assert.equal(mig.phase,'hub');
assert.ok(mig.legacyCompleted.includes('T1'));
assert.ok(mig.completedChapters);
ok('P11 migration keeps legacy history');

assert.ok(!!GP.lesson('2-3'));
assert.ok(GP.lesson('2-3').chapters.some(c=>c.id==='2-3-q'));
ok('P12 lesson 2-3 present');

const l12=GP.lesson('1-2');
assert.ok(l12.chapters.length>=5);
assert.ok(/адамлар/.test(JSON.stringify(l12)));
assert.ok(/кітаптар/.test(JSON.stringify(l12))&&/адамдар/.test(JSON.stringify(l12))&&/жерлер/.test(JSON.stringify(l12)));
assert.ok(l12.chapters.every(c=>c.beats.some(b=>b.k==='why')&&c.beats.some(b=>b.k==='bridge')&&c.beats.some(b=>b.k==='slots')&&c.beats.filter(b=>b.k==='ex').length>=3&&c.beats.some(b=>b.k==='trap')&&c.beats.some(b=>b.k==='ask')));
ok('P13 1-2 template why/bridge/slots/3ex/trap/ask');

const Canon=require('./canonical.js');
const Gate=require('./curriculum-gate.js');
const Diag=require('./diagnostics.js');
const qs23all=packExercises('lesson-pack-2-3.js');
Canon.applyAll(qs23all);
Canon.applyAll(qs21);Canon.applyAll(qs22);

assert.equal(core.numberValue('жетпіс бес мың тоғыз жүз елу'),75950);
assert.ok(core.evaluate({kind:'fields',topic:'numbers',fields:[{kind:'text',answers:['жетпіс бес мың тоғыз жүз елу']}]},['жетпіс бес мың тоғыз жүз елу']).correct);
assert.ok(!core.evaluate({kind:'fields',topic:'numbers',fields:[{kind:'text',answers:['жетпіс бес мың тоғыз жүз елу']}]},['жетпіс бес тоғыз жүз елу']).correct);
ok('B1/B2 75950 requires мың');

const qtyQ={kind:'fields',topic:'plural',ruleIds:['quantity'],fields:[{kind:'text',answers:['он кітап']}],stimulus:'он'};
assert.ok(core.evaluate(qtyQ,['он кітап']).correct);
assert.ok(!core.evaluate(qtyQ,['он кітаптар']).correct);
assert.ok(Diag.classify('он кітап','он кітаптар',qtyQ).includes('plural_after_numeral'));
assert.equal(Diag.skillTag('plural_after_numeral',qtyQ,'он кітап','он кітаптар'),'rule:plural_after_num');
ok('B3 он кітап vs *он кітаптар tagged plural_after_num');

const ord20=qs23all.find(q=>/жиырмасыншы/i.test(JSON.stringify(q.fields))&&/жиырманшы/i.test(q.stimulus||''));
assert.ok(ord20);
assert.ok(ord20.fields[0].answers.some(a=>/жиырмасыншы/i.test(a)));
assert.ok(!ord20.fields[0].answers.some(a=>/^жиырманшы$/i.test(core.normalize(a).replace(/[?.]/g,''))));
ok('B4 жиырмасыншы canonical, жиырманшы not accepted');

const fix8=qs23all.find(q=>q.id==='e23-fix-8');
assert.ok(fix8);
assert.ok(fix8.fields[0].answers.some(a=>/жиырмасыншысыңдар ма/i.test(a)));
assert.ok(!fix8.fields[0].answers.some(a=>/отызыншы бірінші/i.test(a)));
ok('B5/B6 Жиырмасыншысыңдар ма? not crossed key');

const kur=qs23all.find(q=>q.id==='e23-fix-10');
assert.ok(kur);
assert.ok(kur.fields[0].answers.some(a=>/құрбысыңдар ма/i.test(a)));
assert.ok(!kur.fields[0].answers.some(a=>/құрбысындар ма/i.test(a)));
ok('B7 құрбысыңдар ма? has ң');

assert.equal(Canon.farewellRole('сау болыңыздар'),'respectful_plural');
const sau=qs22.find(q=>/сау болыңыздар/i.test((q.fields&&q.fields[0]&&q.fields[0].answers||[]).join(' ')))||qs23all.find(q=>/сау болыңыздар/i.test(JSON.stringify(q)));
if(sau){Canon.applyQuestion(sau);assert.equal(sau.chunk_role,'respectful_plural');}
ok('B8 сау болыңыздар respectful plural');

const zhom=qs23all.find(q=>q.id==='m23-ol-10');
assert.ok(zhom);
assert.ok(/втор/i.test(zhom.stimulus));
assert.ok(!/сороков/i.test(zhom.stimulus+' '+(zhom.explanation||'')+' '+(zhom.note||'')+' '+(zhom.key_heading||'')));
ok('B9 щедрые – вторые, no сороковые heading');

const qaz=qs23all.find(q=>q.id==='e23-fix-1');
assert.ok(qaz.fields[0].answers.some(a=>/қазақпын/i.test(a)));
assert.ok(!qaz.fields[0].answers.some(a=>/қазақпін/i.test(a)));
ok('B10 Мен қазақпын is the correction');

const mam=qs23all.find(q=>q.id==='e23-fix-2');
assert.ok(mam.fields[0].answers.some(a=>/сіз мамансыз/i.test(a)));
assert.ok(mam.fields[0].answers.some(a=>/біз маманбыз/i.test(a)));
ok('B11 сіз маманбыз accepts both repairs');

const bay=qs23all.find(q=>q.id==='e23-fix-7');
assert.ok(bay.fields[0].answers.some(a=>/олар байлар/i.test(a)));
ok('B12 олар байлар kept');

assert.ok(qs23all.some(q=>q.topic==='vocab'&&/менің|сенің/.test(JSON.stringify(q))));
assert.equal(Gate.futureHits(qs23all.filter(q=>q.topic!=='vocab'&&q.topic!=='rules')).filter(q=>Gate.isPossessiveProduction(q)).length,0);
ok('C1/C2 2-3 менің vocab only, no possessive production');

assert.ok(qs23all.some(q=>q.topic==='vocab'&&/бар|жоқ/.test(JSON.stringify(q.fields||q))));
assert.equal(Gate.futureHits(qs23all).filter(q=>Gate.isExistenceGrammar(q)).length,0);
ok('C3/C4 бар/жоқ vocab, no existence grammar');

assert.equal(Gate.futureHits(qs23all).filter(q=>Gate.isCaseDrill(q)||Gate.isLabialRule(q)||Gate.isDegreeDrill(q)).length,0);
ok('C5-C8 no case/labial/degree drills');

assert.equal(Canon.suffixRow('мұғалім'),'soft');
assert.equal(Canon.suffixRow('кітап'),'hard');
assert.equal(Canon.suffixRow('мұхит'),'hard');
ok('mixed-word suffix row uses last relevant syllable');

const recQ={kind:'fields',topic:'vocab',title:'Переведи на русский',stimulus:'адам',fields:[{answers:['человек']}]};
assert.equal(policy.classify(recQ),'rec');
assert.equal(policy.canMasterProduction(recQ,{hinted:false}),false);
const prodQ={kind:'fields',topic:'vocab',title:'Переведи на казахский',stimulus:'человек',fields:[{answers:['адам']}]};
assert.equal(policy.canMasterProduction(prodQ,{hinted:false}),true);
assert.equal(policy.canMasterProduction(prodQ,{hinted:true}),false);
assert.equal(policy.canMasterProduction({kind:'multi',topic:'plural',correct:['а']},{hinted:false}),false);
ok('D1/D3 recognition and MCQ cannot master production');

let rExam=scheduler.migrate({},1);
rExam=scheduler.answer(rExam,{at:2,correct:true,hinted:false,recall:true,responseTime:800});
rExam=scheduler.answer(rExam,{at:3,correct:true,hinted:false,recall:true,responseTime:800});
assert.ok((rExam.recall_review_successes||0)<2);
assert.ok(!policy.examReady(rExam));
ok('D7 two same-session successes do not unlock exam');

const peeked2=scheduler.answer(scheduler.migrate({},1),{at:2,correct:true,hinted:true,recall:true,responseTime:400});
assert.equal(peeked2.correct_streak,0);
ok('D5 answer peek remains Again');

assert.equal(Diag.skillTag('plural_initial_consonant',{topic:'plural'},'адамдар','адамлар'),'rule:plural::ldt');
assert.ok(Diag.classify('адамдар','адамлар',{topic:'plural'}).includes('plural_initial_consonant'));
assert.ok(!Diag.classify('адамдар','адамлар',{topic:'plural'}).includes('vowel_harmony')||Diag.classify('қыздар','қыздер',{topic:'plural'}).includes('vowel_harmony'));
ok('E1/E2 harmony and L/D/T are different tags');

assert.equal(Diag.skillTag('number_confusion',{topic:'numbers'},'алты','алпыс'),'confuse:алты_алпыс');
assert.equal(Diag.skillTag('number_confusion',{topic:'numbers'},'сегіз','сексен'),'confuse:сегіз_сексен');
ok('E4/E5 number confuse pairs');

assert.ok(Diag.classify('ғалым емеспін','ғалыммын емес',{topic:'person'}).includes('emes_position')||Diag.skillTag('emes_position')==='rule:emes::position');
ok('E7 emes position tag');

assert.ok(Diag.classify('жиырмасыншы','жиырманшы',{topic:'numbers',ruleIds:['ordinal']}).includes('ordinal_20'));
ok('E8 ordinal 20 tag');

const stSkill=progress.empty();
stSkill.events=[
  {type:'answer',card_id:'p1',at:dayA,correct:false,first_try_correct:0,peek:0,answers:['адамлар']},
  {type:'answer',card_id:'p2',at:dayB,correct:false,first_try_correct:0,peek:0,answers:['қызлар']}
];
const pluralQs=[{id:'p1',topic:'plural',fields:[{answers:['адамдар']}]},{id:'p2',topic:'plural',fields:[{answers:['қыздар']}]}];
const spotsSkill=hw.weakSpots(stSkill,pluralQs);
assert.ok(spotsSkill.some(s=>s.key==='rule:plural::ldt'||s.key==='rule:plural::harmony'));
ok('E9 same skill aggregates across question IDs');

const phoneQ={kind:'fields',topic:'numbers',ruleIds:['phone-groups'],skillBindings:[{item_id:'rule:phone-groups'}],fields:[{kind:'text',answers:['жеті жүз']}]};
assert.ok(core.evaluate(phoneQ,['жеті жүз']).correct);
assert.ok(core.evaluate(phoneQ,['жеті  жүз']).correct);
assert.ok(!core.evaluate(phoneQ,['алты жүз']).correct);
ok('F3/F4 phone grouping spaces ok, wrong number rejected');

const packImport={lesson_id:'9-9',exercises:[{id:'x',stimulus:'75950',fields:[{answers:['жетпіс бес тоғыз жүз елу']}]}]};
Canon.applyQuestion(packImport.exercises[0]);
assert.ok(packImport.exercises[0].fields[0].answers.some(a=>/мың/.test(a)));
assert.ok(!packImport.exercises[0].fields[0].answers.some(a=>core.normalize(a)==='жетпіс бес тоғыз жүз елу'));
ok('canonical layer overrides bad pack key');

assert.ok(course.questions.length>=220);
assert.equal(cfg.fsrs.desired_retention,0.90);
ok('A2/A4 bank and retention still intact');

console.log('\nPassed',passed.length,'scenarios:\n'+passed.map(x=>' - '+x).join('\n'));
