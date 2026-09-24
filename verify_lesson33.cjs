#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Pack = require('./lesson33-pack.js');
const Pack31 = require('./lesson31-pack.js');
const Pack32 = require('./lesson32-pack.js');
const CP = require('./course-progress.js');
const PD = require('./phrase-drill.js');
const PB = require('./phrase-banks.js');
const Bank = require('./explain-bank.js');
const Gate = require('./curriculum-gate.js');
const HW = require('./homework.js');
const H33 = require('./lesson33-homework.js');
const Diag = require('./diagnostics.js');
const Contract = require('./ai-contract.js');
const core = require('./core.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }
const REV = CP.STAGE_REVISION;
const cat33 = { lessons: ['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3'].map(id => ({ id, active: true })) };

const lesson = Pack.lessonSession();
assert.equal(lesson.length, 142);
assert.equal(new Set(lesson.map(q => q.id)).size, 142);
assert.equal(Pack.sessionA().length, 12);
assert.equal(Pack.sessionB().length, 12);
assert.equal(Pack.sessionC().length, 12);
assert.equal(Pack.sessionD().length, 16);
assert.equal(Pack.sessionE().length, 12);
assert.equal(Pack.sessionF().length, 14);
assert.equal(Pack.sessionG().length, 15);
assert.equal(Pack.sessionH().length, 12);
assert.equal(Pack.sessionI().length, 17);
assert.equal(Pack.sessionJ().length, 20);
lesson.forEach(q => assert.ok(/^p3-33-[a-j]\d{2}$/.test(q.id), q.id));
ok('L33-01 the grammar bank is 142 unique A–J cards');

const gold = Pack.goldRows();
const goldIds = gold.map(row => row.id);
for (let i = 1; i <= 126; i++) {
  const id = 'G' + String(i).padStart(3, '0');
  if (['G102','G103','G106','G107','G108'].includes(id)) continue;
  assert.ok(goldIds.includes(id), id);
  const row = gold.find(item => item.id === id);
  assert.ok(row.accepts && row.accepts.length, id);
  const q = Pack.byId(row.card);
  assert.ok(q, id + ' ' + row.card);
  for (const acc of row.accepts) {
    const ans = Array.isArray(acc) ? acc : [acc];
    assert.equal(core.evaluate(q, ans).correct, true, id + ' accept ' + JSON.stringify(ans));
  }
  for (const rej of row.rejects || []) {
    const ans = Array.isArray(rej) ? rej : [rej];
    assert.equal(core.evaluate(q, ans).correct, false, id + ' reject ' + JSON.stringify(ans));
  }
}
ok('L33-02 Gold G001–G126 accepts are local and rejects are incorrect');

const oldGold = [
  ['G102','p3-31-x-g6-zhurekim','Менің жүрегім','Менің жүрекім', Pack31],
  ['G103','p3-31-x-g6-sausakym','Менің саусағым','Менің саусақым', Pack31],
  ['G106','p3-32-a-g6-kolikimiz','біздің көлігіміз','біздің көлікіміз', Pack32],
  ['G107','p3-31-f-g6-kitabymdar','Менің кітаптарым','Менің кітабымдар', Pack31],
  ['G108','p3-32-e-g6-ini','олардың інісі','олардың іні', Pack32]
];
assert.equal(Pack31.check('p3-31-a-g6-kitapym','Менің кітабым').result.correct, true);
assert.equal(Pack31.check('p3-31-a-g6-kitapym','Менің кітапым').result.correct, false);
for (const [id, card, good, bad, owner] of oldGold) {
  assert.equal(owner.check(card, good).result.correct, true, id);
  assert.equal(owner.check(card, bad).result.correct, false, id);
}
assert.equal(Pack32.check('p3-32-c-g6-dosyn','сендердің достарың').result.correct, true);
assert.equal(Pack32.check('p3-32-c-g6-dosyn','сендердің досың').result.correct, false);
assert.equal(Pack32.check('p3-32-d-g6-aken','сіздердің әкелеріңіз').result.correct, true);
assert.equal(Pack32.check('p3-32-d-g6-aken','сіздердің әкелерің').result.correct, false);
ok('L33-03 G101–G108 still fail on the 3-1 and 3-2 cards');

const q33 = { lessonId: '3-3', phase3: { lesson: '3-3' }, fields: [{ answers: ['Оның отбасы'] }] };
assert.deepEqual(Diag.classify('Сен оның отбасысың', 'Сен оның отбасысың', q33, {}), []);
assert.ok(Diag.classify('Оның отбасы', 'Оның отбасысы', q33, {}).includes('OTBASY_DOUBLE_POSS'));
assert.ok(Diag.classify('Сен оның отбасысың', 'Сен оның отбасысысың', q33, {}).includes('OTBASY_DOUBLE_POSS'));
assert.ok(!Diag.classify('Сен оның отбасысың', 'Сен оның отбасы', q33, {}).includes('OTBASY_DOUBLE_POSS'));
assert.equal(Pack.check('p3-33-h06', 'Сен оның отбасысың').result.correct, true);
assert.equal(Pack.check('p3-33-h06', 'Сен оның отбасысысың').result.correct, false);
assert.equal(Pack.check('p3-33-h01', 'Оның отбасы').result.correct, true);
assert.equal(Pack.check('p3-33-h01', 'Оның отбасысы').result.correct, false);
ok('L33-04 отбасы checks the right form before any double-сы diagnosis');

assert.equal(Pack.check('p3-33-h10', ['біздің қала', 'біздің қаламыз']).result.correct, true);
assert.equal(Pack.check('p3-33-h10', ['біздің қаламыз', 'біздің қала']).result.correct, false);
assert.equal(Pack.check('p3-33-c05', 'біздің сынып').result.correct, true);
assert.equal(Pack.check('p3-33-c05', 'біздің сыныбымыз').result.correct, true);
assert.equal(Pack.check('p3-33-c05', 'сынып').result.correct, false);
assert.equal(Pack.check('p3-33-b01', ['мен', 'сен']).result.correct, true);
assert.equal(Pack.check('p3-33-b01', ['сен', 'мен']).result.correct, false);
ok('L33-05 H10 is two fields, біздің keeps both variants, and B keeps who/whose apart');

const fresh = Pack.courseSession({}, { events: [] });
assert.equal(fresh.stage.stageId, '33-a');
assert.equal(fresh.coreIds.length, 12);
assert.equal(fresh.stage.final, false);
assert.deepEqual(fresh.stage.requiredIndependentIds, ['p3-33-a09', 'p3-33-a10']);
assert.equal(CP.evaluateStage([], fresh.stage).need, 10);
const plans = Pack.stagePlans();
plans.forEach(plan => {
  if (plan.stageId === '33-mix') {
    assert.equal(plan.coreIds.length, 24);
    assert.equal(plan.final, true);
    assert.equal(CP.evaluateStage([], plan).need, 20);
  } else {
    assert.ok(plan.coreIds.length <= 12, plan.stageId);
    assert.equal(plan.final, false);
  }
  plan.coreIds.forEach(id => {
    if (String(id).startsWith('phrase:')) return;
    assert.ok(Pack.byId(id), plan.stageId + ' ' + id);
  });
});
ok('L33-06 fresh practice is 33-a, portions stay within 12, and the mix is 20/24');

function done(stageId, at) {
  return { type: 'course_stage_completed', lesson_id: '3-3', stage_id: stageId, content_revision: REV, card_id: 'course-stage:3-3:' + stageId, at };
}
let events = plans.filter(plan => plan.stageId !== '33-mix').map((plan, i) => done(plan.stageId, i + 1));
const mix = Pack.nextStage(events);
assert.equal(mix.stageId, '33-mix');
assert.equal(mix.final, true);
const missed = [{ type: 'answer', lesson_id: '3-3', stage_id: '33-a', content_revision: REV, card_id: 'p3-33-a01', correct: false, at: 1, hinted: false, peek: 0, rule_peek: 0, first_try_correct: 0 }];
const repair = Pack.nextStage(missed);
assert.equal(repair.stageId, '33-a-fix');
assert.ok(repair.coreIds.length >= 1 && repair.coreIds.length <= 2);
assert.equal(repair.kind, 'repair');
ok('L33-07 the mix waits for the portions, and a miss opens a short repair');

assert.equal(Pack.phraseUnlocked('phrase:3-3:kk-ru:01', { events: [] }), false);
assert.equal(Pack.phraseUnlocked('phrase:3-3:kk-ru:01', { events: [done('33-d2', 1)] }), true);
assert.equal(Pack.phraseUnlocked('phrase:3-3:ru-kk:13', { events: [done('33-d2', 1)] }), false);
assert.equal(Pack.phraseUnlocked('phrase:3-3:kk-ru:13', { events: [done('33-g2', 1)] }), true);
assert.equal(Pack.phraseUnlocked('phrase:3-3:kk-ru:19', { events: [done('33-h', 1)] }), true);
assert.equal(Pack.phraseUnlocked('phrase:3-3:kk-ru:20', { events: [done('33-i2', 1)] }), true);
assert.equal(PB.forLesson('3-3').length, 24);
assert.equal(PD.forLesson('3-3').length, 0);
assert.equal(PD.forLesson('3-3', cat33).length, 48);
assert.equal(PD.session('3-3', { catalog: cat33, events: [] }).length, 0);
assert.equal(PD.session('3-3', { catalog: cat33, events: [done('33-d2', 1)], count: 12 }).length, 12);
assert.equal(PD.forLesson('3-2', cat33).length, 24);
ok('L33-08 phrases unlock by rule, and 3-2 stays 24');

const future33 = ['p3-33-d01','p3-33-g01','p3-33-h06','p3-33-i01','p3-33-i10','p3-33-j01','p3-33-c12'];
const locked = H33.build({ events: [] });
assert.equal(locked.phrase_ids.length, 0);
assert.equal(locked.exercise_ids.length, 0);
assert.equal(locked.item_ids.length, 0);
assert.ok(future33.every(id => !locked.item_ids.includes(id)));
assert.equal(locked.target_vocabulary.length, 15);
assert.equal(locked.external_test_url, 'https://batylbol.kz/test/LichPrityazh.html');
const seenOnly = H33.build({ events: [{ type: 'answer', lesson_id: '3-3', stage_id: '33-h', content_revision: REV, card_id: 'p3-33-h06', at: 1 }] });
assert.equal(seenOnly.item_ids.length, 0);
const partial = H33.build({ events: [done('33-a', 1)] });
assert.ok(partial.item_ids.includes('p3-33-b01'));
assert.ok(['p3-33-k1','p3-33-k2','p3-33-k3'].every(id => partial.item_ids.includes(id)));
assert.ok(future33.every(id => !partial.item_ids.includes(id)));
assert.equal(partial.phrase_ids.length, 0);
assert.ok(partial.exercise_ids.length > 0);
const openD = H33.build({ events: [done('33-d2', 1)] });
assert.deepEqual(openD.phrase_ids, ['phrase:3-3:kk-ru:01','phrase:3-3:kk-ru:02','phrase:3-3:kk-ru:03','phrase:3-3:kk-ru:04']);
assert.ok(!openD.item_ids.includes('p3-33-h06') && !openD.item_ids.includes('phrase:3-3:kk-ru:13'));
const openAll = H33.build({ events: [done('33-a', 1), done('33-c', 2), done('33-d2', 3), done('33-f2', 4), done('33-g1', 5), done('33-g2', 6), done('33-h', 7), done('33-i1', 8), done('33-i2', 9)] });
assert.ok(openAll.phrase_ids.includes('phrase:3-3:kk-ru:13'));
assert.ok(openAll.phrase_ids.includes('phrase:3-3:kk-ru:19'));
assert.ok(openAll.phrase_ids.includes('phrase:3-3:kk-ru:20'));
assert.ok(openAll.phrase_ids.length < 12);
assert.ok(future33.every(id => openAll.item_ids.includes(id)));
assert.ok(openAll.exercise_ids.length > 0);
const phraseCards = PD.forLesson('3-3', cat33);
const catalog33 = Pack.all().concat(phraseCards);
const sheetLocked = HW.buildPack('3-3', catalog33, { sources: { m33: { title: '3-3', url: '#' } } }, { events: [] });
assert.equal(sheetLocked.homework.exercise_ids.length, 0);
assert.equal(sheetLocked.homework.external_test_url, 'https://batylbol.kz/test/LichPrityazh.html');
assert.equal(sheetLocked.homework.word_ids.length, 15);
const fullEvents = [done('33-a', 1), done('33-c', 2), done('33-d2', 3), done('33-f2', 4), done('33-g1', 5), done('33-g2', 6), done('33-h', 7), done('33-i1', 8), done('33-i2', 9)];
const sheetFull = HW.buildPack('3-3', catalog33, { sources: { m33: { title: '3-3', url: '#' } } }, { events: fullEvents });
assert.ok(sheetFull.homework.exercise_ids.length > 0);
assert.equal(sheetFull.homework.missing_ids.length, 0);
assert.ok(sheetFull.homework.exercise_ids.includes('phrase:3-3:kk-ru:01'));
assert.ok(sheetFull.homework.exercise_ids.includes('p3-33-h06'));
assert.ok(future33.every(id => sheetFull.homework.exercise_ids.includes(id)));
assert.ok(sheetFull.homework.exercise_ids.every(id => Pack.byId(id) || phraseCards.some(q => q.id === id)));
assert.equal(H33.validate().ok, true);
ok('L33-09 homework unlocks by completed stage and does not stay empty');

const src = fs.readFileSync(path.join(__dirname, 'lesson33-pack.js'), 'utf8');
const banned = ['падеж','барыс','табыс','жатыс','шығыс','көмектес','comparative','imperative','өткен шақ','осы шақ','келемін','жазамын','келесің','бардым'];
banned.forEach(word => assert.equal(src.includes(word), false, word));
const grammar = Pack.lessonSession();
grammar.forEach(q => {
  const blob = JSON.stringify(q);
  assert.equal(/келемін|келесің|бардым|жазамын/.test(blob), false, q.id);
});
ok('L33-10 grammar cards do not teach later verb forms');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
assert.ok(html.indexOf('lesson33-pack.js') < html.indexOf('phrase-banks.js'));
assert.ok(html.indexOf('lesson33-pack.js') < html.indexOf('app.js'));
assert.ok(html.indexOf('lesson-pack-3-3.js') < html.indexOf('curriculum.js'));
assert.ok(app.indexOf('Lesson33Pack?.install') < app.indexOf('PhraseDrill?.install'));
assert.ok(/if\(courseBlock==='3-3'\)return;/.test(app));
assert.ok(/const CACHE='qazaq-offline-live-20260924-t-integration-catalog'/.test(sw));
assert.ok(sw.includes("new URL('./',self.registration.scope)") && sw.includes("new URL('update',self.registration.scope)"));
assert.ok(sw.includes('response.redirected'));
assert.ok(app.includes('function homeworkOpts()') && app.includes('events:state.events'));
assert.equal((app.match(/\.packs\(questions,course,homeworkOpts\(\)\)/g) || []).length, 3);
assert.ok(sw.includes('lesson33-pack.js') && sw.includes('lesson33-homework.js') && sw.includes('lesson-pack-3-3.js'));
assert.ok(Contract.ALLOWED_LESSONS.includes('3-3'));
assert.ok(!Contract.ALLOWED_LESSONS.some(id => /^3-[4-9]$/.test(id) || /^[4-9]-/.test(id)));
assert.ok(Contract.RULE_BY_LESSON['3-3'].includes('T32_OTBASY'));
assert.ok(Contract.ERROR_CODES.includes('OTBASY_DOUBLE_POSS'));
assert.ok(Contract.ERROR_CODES.includes('OWNER_SUBJECT_SWAP'));
['T28_OWNER_SUBJECT','T29_POSS_PERSON_STACK','T30_THIRD_ZERO','T31_EMES_STACK','T32_OTBASY','T33_ADJ_ROLE','T34_INTERROGATIVE'].forEach(id => {
  assert.ok(Bank.byId(id), id);
  assert.ok(String(Bank.byId(id).medium).length < 500, id);
});
assert.ok(Gate.INTRODUCED['3-3'].includes('poss_person_stack'));
assert.equal(Pack.install({ questions: [] }, { lessons: [] }).length, 0);
assert.ok(Pack.install({ questions: [] }, cat33).length >= 142);
ok('L33-11 script order, cache, whitelist and install gate');

console.log('verify_lesson33', passed.length);
