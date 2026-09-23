#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Pack = require('./lesson31-pack.js');
const Bank = require('./explain-bank.js');
const Progress = require('./progress.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

const OLD = [
  'p3-31-a-g1-ake','p3-31-a-g2-kitap','p3-31-a-g2-qala','p3-31-a-g6-ake','p3-31-a-g6-kitap-missing','p3-31-a-g6-kitapym',
  'p3-31-b-g2-ake','p3-31-b-g2-kitap','p3-31-b-g2-dos',
  'p3-31-c-g2-qala','p3-31-c-g2-ul','p3-31-c-g2-mektep','p3-31-c-g2-kitap',
  'p3-31-d-g2-ata','p3-31-d-g2-kolik',
  'p3-31-e-g5-bar','p3-31-e-g5-zhok','p3-31-e-g5-question','p3-31-e-g6-emes',
  'p3-31-f-g2-kitaptarym','p3-31-f-g2-sausaktaryn','p3-31-f-g2-uldarym','p3-31-f-g2-mysyktarym','p3-31-f-g6-kitabymdar','p3-31-f-g6-mysygymdar',
  'p3-31-x-g6-zhurekim','p3-31-x-g6-sausakym','p3-31-x-g6-onyn-qalam'
];
assert.equal(Pack.lessonSession().length, 46);
assert.equal(Pack.grammarQuestions().length, 28);
assert.equal(Pack.sessionG().length, 18);
OLD.forEach(id => assert.ok(Pack.byId(id), id));
assert.equal(Pack.sessionH().length, 8);
assert.equal(Pack.sessionI().length, 8);
assert.equal(Pack.sessionJ().length, 8);
assert.equal(Pack.sessionK().length, 7);
assert.equal(Pack.sessionL().length, 6);
assert.equal(Pack.sessionM().length, 6);
ok('old p3-31 ids stay, and H–M are separate groups');

function accepted(id) {
  return (Pack.byId(id).fields || []).flatMap(f => f.answers || []);
}
function rejects(id, answer) {
  const row = Pack.check(id, answer);
  assert.equal(row.result.correct, false, id + ' accepted ' + answer);
  return row;
}
function accepts(id, answer) {
  assert.equal(Pack.check(id, answer).result.correct, true, id + ' rejected ' + answer);
}
accepts('p3-31-l-oqushy', 'Менің оқушым');
rejects('p3-31-l-oqushy', 'Менің оқушысым');
accepts('p3-31-l-dos', 'Оның досы');
rejects('p3-31-l-dos', 'Оның доссы');
accepts('p3-31-k-kitap', 'кітабым');
rejects('p3-31-a-g6-kitapym', 'Менің кітапым');
accepts('p3-31-l-qonaq', 'Сіздің қонағыңыз');
rejects('p3-31-l-qonaq', 'Сіздің қонақыңыз');
accepts('p3-31-l-kitap', 'Менің кітаптарым');
rejects('p3-31-l-kitap', 'Менің кітабымдар');
accepts('p3-31-k-su', 'суым');
accepts('p3-31-k-mi', 'миым');
accepts('p3-31-k-ayu', 'аюым');
accepts('p3-31-e-g5-zhok', 'Менің көлігім жоқ');
rejects('p3-31-e-g6-emes', 'Менің көлігім емес');
accepts('p3-31-e-aga-emes', 'Ол менің ағам емес');
accepts('p3-31-h-pen', 'қалам');
accepts('p3-31-a-g2-qala', 'қалам');
assert.notEqual(Pack.byId('p3-31-h-pen').stimulus, Pack.byId('p3-31-a-g2-qala').stimulus);
assert.ok(!Pack.extraQuestions().some(q => q.stimulus === 'қалам'));
const badAnswers = Pack.extraQuestions().flatMap(q => (q.fields || []).flatMap(f => f.answers || []));
assert.ok(!badAnswers.some(a => /оқушысым|доссы|кітапым|қонақыңыз|кітабымдар|досыңмын|досымсың|біздің әкеміз/.test(a)));
ok('gold forms pass, rejected PDF keys fail, and қалам stays contextual');

assert.equal(Pack.check('p3-31-j-kitap', ['кітап', 'менің']).result.correct, true);
assert.equal(Pack.check('p3-31-j-qonaq', ['қонақ', 'сіздің']).result.correct, true);
assert.equal(Pack.check('p3-31-j-kitap', ['кітап', 'оның']).result.correct, false);
const oq = Pack.check('p3-31-l-oqushy', 'Менің оқушысым');
assert.ok(oq.errors.some(e => e.error_type === 'poss_wrong_person'));
const buf = Pack.check('p3-31-l-qaryndas', 'Менің қарындасм');
assert.ok(buf.errors.some(e => e.error_type === 'poss_buffer'));
const job = Pack.check('p3-31-l-aken', 'Сенің әкен');
assert.ok(job.errors.some(e => e.error_type === 'poss_wrong_person'));
assert.ok(!job.errors.some(e => e.error_type === 'vowel_harmony'));
ok('reverse parse is two fields, and owner/buffer errors are specific');

const fresh = Pack.courseSession({}, { events: [] });
assert.ok(fresh.coreIds.length >= 8 && fresh.coreIds.length <= 12);
assert.ok(fresh.remediationIds.length <= 3);
assert.equal(fresh.stage.stageId, '31-owner');
assert.equal(fresh.stage.final, false);
assert.ok(fresh.coreIds.every(id => Pack.byId(id).phase3.session !== 'G'));
const seenOnly = {};
fresh.coreIds.forEach(id => { seenOnly[id] = { seen: true, fsrs: { stability: 4 }, next_review: 9, mastery_level: 2 }; });
const snap = JSON.stringify(seenOnly);
const still = Pack.courseSession(seenOnly, { events: [] });
assert.equal(still.stage.stageId, '31-owner');
assert.equal(JSON.stringify(seenOnly), snap);
assert.equal(Pack.phrasesUnlocked(seenOnly, { events: [] }), false);
ok('a new course session is 8–12 core, seen does not open the next stage, and records stay put');

function indep(id, at) {
  return { type: 'answer', card_id: id, at, correct: true, hinted: false, peek: 0, rule_peek: 0, first_try_correct: 1 };
}
let events = [];
for (const stage of Pack.stagePlans()) {
  if (stage.stageId === '31-phrase') break;
  stage.coreIds.forEach((id, i) => events.push(indep(id, events.length + 1 + i)));
}
const phrase = Pack.courseSession({}, { events });
assert.equal(phrase.stage.stageId, '31-phrase');
assert.equal(phrase.stage.final, true);
assert.ok(phrase.coreIds.length >= 8 && phrase.coreIds.length <= 12);
const titles = phrase.coreIds.map(id => Pack.byId(id).title);
assert.ok(titles.includes('KK → RU') && titles.includes('RU → KK'));
assert.equal(Pack.phrasesUnlocked({}, { events }), true);
const oneMiss = events.filter(e => e.card_id !== 'p3-31-m-books');
assert.equal(Pack.courseSession({}, { events: oneMiss }).stage.stageId, '31-transfer');
const wrongThenRight = oneMiss.concat([
  { type: 'answer', card_id: 'p3-31-m-books', at: 500, correct: false, hinted: false, peek: 0, rule_peek: 0, first_try_correct: 0 },
  indep('p3-31-m-books', 501)
]);
assert.equal(Pack.courseSession({}, { events: wrongThenRight }).stage.stageId, '31-phrase');
ok('phrase stage is 8–12 in both directions after real answers, and one past miss does not lock the route');

const src = fs.readFileSync(path.join(__dirname, 'lesson-pack-3-1.js'), 'utf8');
assert.ok(src.includes('1B2c2UJKpvBvty-LhSlkoC8ubPGZC9-aQ'));
assert.ok(src.includes('1SXf2AzFXedKI_VpCyhqlAO_1DyvkRI1E'));
assert.ok(src.includes('1X2BqOVav3sb01ni8MIe4f-J-JO2UHAyo'));
const hw = src.slice(src.indexOf('"hw31"'), src.indexOf('"hw31"') + 280);
assert.ok(hw.includes('1X2BqOVav3sb01ni8MIe4f-J-JO2UHAyo'));
assert.ok(!hw.includes('1B2c2UJKpvBvty-LhSlkoC8ubPGZC9-aQ'));
ok('m31, e31 and hw31 point at their own files');

const t20 = Bank.byId('T20_POSS');
assert.ok(t20.short.includes('-ым/-ім'));
assert.ok(t20.short.includes('-ы/-і'));
assert.ok(String(t20.medium).length < 500);
assert.ok(Bank.byId('T21_POSS_ASSIM').short.includes('кітаптарым'));
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const start = app.slice(app.indexOf('function startCourse'), app.indexOf('function startTransfer'));
assert.ok(start.indexOf('restoreLessonPractice(block)') < start.indexOf('courseSession'));
assert.ok(start.includes('lessonSession'));
assert.equal(Progress.STAGE_REVISION, 't-integration-v1');
assert.equal(typeof Progress.registerStages, 'function');
ok('explanations name the owner table, and the saved queue still comes before a new 3-1 stage');

console.log('LESSON31_OK', passed.length);
