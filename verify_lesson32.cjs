#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Pack = require('./lesson32-pack.js');
const CP = require('./course-progress.js');
const PD = require('./phrase-drill.js');
const Bank = require('./explain-bank.js');
const Gate = require('./curriculum-gate.js');
const HW = require('./homework.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

const oldIds = [...Pack.sessionA(), ...Pack.sessionB(), ...Pack.sessionC(), ...Pack.sessionD(), ...Pack.sessionE(), ...Pack.sessionF(), ...Pack.sessionG(), ...Pack.errorPack()].map(q => q.id);
assert.equal(new Set(oldIds).size, oldIds.length);
oldIds.forEach(id => assert.ok(Pack.byId(id), id));
assert.equal(Pack.lessonSession().length, oldIds.length - 0);
assert.equal(Pack.sessionA().length, 8);
assert.equal(Pack.sessionH().length, 0);
ok('T32-02 old p3-32 ids stay');

const fresh = Pack.courseSession({}, { events: [] });
assert.equal(fresh.stage.stageId, '32-biz-basic');
assert.ok(fresh.coreIds.length >= 3 && fresh.coreIds.length <= 12);
assert.ok(fresh.coreIds.every(id => Pack.byId(id) && /біздің/i.test(Pack.byId(id).stimulus + Pack.byId(id).explanation)));
assert.equal(fresh.coreIds.filter(id => String(id).startsWith('phrase:')).length, 0);
assert.equal(fresh.stage.final, false);
Pack.stagePlans().forEach(plan => {
  assert.ok(plan.coreIds.length <= 12, plan.stageId);
  assert.ok(plan.coreIds.length >= 3, plan.stageId);
});
ok('T32-04/05 fresh 3-2 stage is short and starts with біздің');

function indep(stage, id, at, extra) {
  return Object.assign({ type: 'answer', card_id: id, lesson_id: '3-2', stage_id: stage, content_revision: CP.STAGE_REVISION, at, correct: true, hinted: false, peek: 0, rule_peek: 0, first_try_correct: 1 }, extra);
}
const hinted = fresh.coreIds.map((id, i) => indep('32-biz-basic', id, i + 1, { hinted: true, first_try_correct: 0 }));
assert.equal(CP.evaluateStage(hinted, fresh.stage).pass, false);
assert.notEqual(Pack.nextStage(hinted).stageId, '32-biz-assim');
ok('T32-07 a hint is not a clean pass');

let events = [];
for (const plan of Pack.stagePlans()) {
  if (plan.stageId === '32-mix') break;
  plan.coreIds.forEach((id, i) => events.push(indep(plan.stageId, id, events.length + 1 + i)));
}
const mix = Pack.nextStage(events);
assert.equal(mix.stageId, '32-mix');
assert.equal(mix.final, true);
assert.ok(mix.coreIds.length <= 12);
const phrases = mix.coreIds.filter(id => String(id).startsWith('phrase:'));
assert.ok(phrases.length >= 2 && phrases.length <= 4);
assert.ok(phrases.some(id => id.includes('kk-ru')) && phrases.some(id => id.includes('ru-kk')));
assert.ok(phrases.length < 24);
ok('T32-06/10 the next stage follows, and the mix keeps 2–4 phrases not all 24');

const cat = { lessons: ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2'].map(id => ({ id, active: true })) };
assert.equal(PD.forLesson('3-2', cat).length, 24);
ok('T32-09 the phrase bank still has 24 directed items');

assert.equal(Pack.transferRule({}), 'T24_POSS_BIZ');
assert.equal(Pack.transferRule({ stageId: '32-sender' }), 'T25_POSS_SENDER');
assert.equal(Pack.transferRule({ stageId: '32-olar-fix' }), 'T26_POSS_OLAR');
assert.equal(Pack.transferRule({ stageId: '32-deixis' }), 'T27_DEIXIS');
const wrongOlar = [{ type: 'answer', lesson_id: '3-2', card_id: 'p3-32-e-g2-ini', correct: false, at: 1 }];
assert.equal(Pack.transferRule({ events: wrongOlar }), 'T26_POSS_OLAR');
ok('T32-11 transfer follows the stage, then the last weak rule, then T24');

assert.equal(Pack.check('p3-32-a-g2-bala', 'баламыз').result.correct, true);
assert.equal(Pack.check('p3-32-a-g2-bala', 'балаларымыз').result.correct, false);
assert.equal(Pack.check('p3-32-x-g6-korshisin', 'сенің көршің').result.correct, true);
assert.equal(Pack.check('p3-32-x-g6-korshisin', 'сенің көршісің').result.correct, false);
ok('T32-12/13 баламыз is one child, and көршің is not көршісің');

assert.ok(/модели этого урока/.test(Bank.byId('T25_POSS_SENDER').medium));
assert.ok(/не запрещаются/.test(Bank.byId('T27_DEIXIS').medium));
assert.ok(!/всегда во всём языке/.test(Bank.byId('T25_POSS_SENDER').medium + Bank.byId('T27_DEIXIS').medium));
ok('T32-14/15 T25 and T27 stay inside the course model');

const hw = HW.buildPack('3-2', Pack.all(), { sources: { m32: { title: 'Методичка 3-2', url: '#' } } });
assert.equal(hw.homework.external_test_url, 'https://batylbol.kz/test/Prityazh.html');
assert.equal(Gate.examEligible(Pack.sessionA()[0], cat), false);
const blob = JSON.stringify(Pack.stagePlans());
assert.ok(!/падеж|глагол|досыңмын|досымсың/.test(blob));
ok('T32-16/17/18 homework link, exam exclusion, and no later grammar');

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const start = app.slice(app.indexOf('function startCourse'), app.indexOf('function startTransfer'));
assert.ok(start.indexOf('restoreLessonPractice(block)') < start.indexOf('beginPacked'));
assert.ok(/T2\[4-7\]_/.test(app.slice(app.indexOf('ExplainDepth'), app.indexOf('ExplainDepth') + 500)));
const missed = fresh.coreIds.map((id, i) => indep('32-biz-basic', id, i + 1, { correct: false, first_try_correct: 0, confusion_tag: 'POSS_NO_SUFFIX' }));
const repair = Pack.nextStage(missed);
assert.equal(repair.kind, 'repair');
assert.ok(repair.coreIds.length >= 1 && repair.coreIds.length <= 2);
assert.ok(repair.stageId.endsWith('-fix'));
assert.notEqual(repair.stageId, '32-biz-assim');
ok('a failed stage becomes a short repair, and the saved queue still comes first');

console.log('LESSON32_OK', passed.length);
