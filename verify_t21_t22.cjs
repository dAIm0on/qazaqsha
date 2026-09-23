#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Canon = require('./canonical.js');
const Bank = require('./explain-bank.js');
const Chapters = require('./grammar-chapters.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

function packExercises(file) {
  const box = { window: { LESSON_PACKS: [] } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), box);
  return (box.window.LESSON_PACKS || []).flatMap(p => p.original_exercises || []);
}

function answersOf(q) {
  return (q.fields || []).flatMap(f => f.answers || []);
}

const qs21 = packExercises('lesson-pack-2-1.js');
const qs22 = packExercises('lesson-pack-2-2.js');
const fix21 = qs21.find(q => q.id === 'e21-fix-8');
const fix22 = qs22.find(q => q.id === 'e22-5-8');
assert.ok(fix21 && fix22);

fix21.fields[0].answers.push('Сен мұғалімсің емессің.');
fix22.fields[0].answers.push('Сендер құрбысыңдар емессіңдер.');
Canon.applyAll([fix21, fix22]);
Canon.applyAll([fix21, fix22]);

assert.ok(answersOf(fix21).some(a => a === 'Сен мұғалім емессің.'));
assert.ok(!answersOf(fix21).some(a => /мұғалімсің емессің/i.test(a)));
assert.ok(!/принимаются оба/i.test(fix21.explanation));
assert.equal(answersOf(fix21).filter(a => a === 'Сен мұғалім емессің.').length, 1);

assert.ok(answersOf(fix22).some(a => a === 'Сендер құрбы емессіңдер.'));
assert.ok(!answersOf(fix22).some(a => /құрбысыңдар емессіңдер/i.test(a)));
assert.ok(!/принимаются оба/i.test(fix22.explanation));
assert.ok(fix22.fields[1].answers.includes('вы не подруги'));
ok('C01 two canonical corrections accept/reject and stay idempotent');

const glue = Chapters.LESSONS.find(l => l.id === '2-1').chapters.find(c => c.id === '2-1-glue');
assert.equal(glue.id, '2-1-glue');
assert.deepEqual(glue.beats.filter(b => b.k === 'ask').map(b => b.id), ['21g1', '21g2', '21g3']);
const glueText = JSON.stringify(glue);
assert.ok(glueText.includes('Мен дәрігермін'));
assert.ok(glueText.includes('Мен дәрігер емеспін'));
assert.ok(glueText.includes('Сен дәрігерсің бе?'));
assert.ok(!/ол қонақ па/.test(glueText));
const t12 = Bank.byId('T12_GLUE');
const t12text = JSON.stringify(t12);
assert.ok(t12.examples.includes('Мен дәрігермін'));
assert.ok(t12.examples.includes('Мен дәрігер емеспін'));
assert.ok(t12.examples.includes('Сен дәрігерсің бе?'));
assert.ok(!/ол қонақ па|сендер доссыңдар ма/.test(t12text));
ok('C02 2-1 glue chain replaces future ол/question table in the active explanation');

const Diag = require('./diagnostics.js');
const lesson21 = Chapters.LESSONS.find(l => l.id === '2-1');
const lesson22 = Chapters.LESSONS.find(l => l.id === '2-2');
const cp21 = lesson21.chapters.find(c => c.id === '2-1-checkpoint');
const cp22 = lesson22.chapters.find(c => c.id === '2-2-checkpoint');
const asks21 = cp21.beats.filter(b => b.k === 'ask');
const asks22 = cp22.beats.filter(b => b.k === 'ask');
assert.equal(asks21.length, 8);
assert.equal(asks22.length, 10);
assert.deepEqual(asks21.filter(b => b.required).map(b => b.id), ['cp21-4', 'cp21-6', 'cp21-8']);
assert.deepEqual(asks22.filter(b => b.required).map(b => b.id), ['cp22-2', 'cp22-6', 'cp22-7', 'cp22-9']);
assert.ok(asks21.find(b => b.id === 'cp21-8').answers.includes('Сен мұғалім емессің.'));
assert.ok(asks22.find(b => b.id === 'cp22-2').answers.includes('Біз ғалымбыз.'));
assert.ok(asks22.find(b => b.id === 'cp22-7').answers.includes('Сендер жазушысыңдар ма?'));
const hi = JSON.stringify(lesson22.chapters.find(c => c.id === '2-2-hi'));
assert.ok(hi.includes('сау бол') && hi.includes('сау болыңыздар'));
assert.ok(!/прощания сау болыңыздар — урок 2-3/.test(JSON.stringify(lesson22)));
ok('checkpoints 8 and 10 keep required items; 2-2 farewells are ready phrases');

assert.equal(Diag.microBinding('person_sg_initial').skill_type, 'sg_initial');
assert.equal(Diag.microBinding('person_biz_initial').item_id, 'rule:person-pl');
assert.equal(Diag.microBinding('question_class').skill_type, 'class');

const box = {
  window: {
    TrainerCore: { normalize: s => String(s || '').toLowerCase().replace(/[?.!]+$/u, '').trim() },
    CURRICULUM: { words: [] },
    COURSE: { questions: [] },
    TRAINER_CONFIG: { session: { size: 8 } },
    ErrorDiagnostics: Diag,
    ReviewScheduler: {
      migrate() { return { mastery_level: 'NEW', streak: 0, needsReview: false, next_review: null, fsrs_log: { rating: 0 }, fsrs: {} }; },
      answer(old, ev) {
        return {
          mastery_level: ev.correct ? (old && old.mastery_level === 'MASTERED' ? 'MASTERED' : 'LEARNING') : 'NEW',
          streak: ev.correct ? 1 : 0,
          needsReview: !ev.correct,
          next_review: ev.at,
          last_answer: ev.at,
          fsrs_log: { rating: ev.correct ? 3 : 1 },
          fsrs: { kept: true }
        };
      }
    }
  }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'knowledge.js'), 'utf8'), box);
const Knowledge = box.window.Knowledge;
const kept = { mastery_level: 'MASTERED', streak: 4, needsReview: false, next_review: 50, item_id: 'rule:person', skill_type: 'application' };
const state = { skills: { 'rule:person::application': JSON.parse(JSON.stringify(kept)) }, records: {}, vocabulary: {}, associations: {} };
const fresh = { id: 'cp21-4', lessonId: '2-1', kind: 'fields', topic: 'person', stimulus: 'Я не студент.', fields: [{ kind: 'text', answers: ['Мен студент емеспін.'] }], skillBindings: [{ item_id: 'rule:person-neg', skill_type: 'position', field: 0, facet: null }] };
box.window.COURSE.questions = [fresh];
Knowledge.hydrate(state, [fresh]);
assert.deepEqual(state.skills['rule:person::application'], kept);
assert.equal(state.skills['rule:person-neg::position'], undefined);
const wrongLogs = Knowledge.observe(state, fresh, { correct: false, parts: [false] }, { at: 10, answers: ['Мен студентпін емес'], hinted: false, recall: true }, [{ error_type: 'emes_position', field: 0 }]);
assert.equal(wrongLogs.filter(row => row.skill_id === 'rule:person-neg::position').length, 1);
assert.equal(state.skills['rule:person-neg::position'].fsrs_log.rating, 1);
const rightLogs = Knowledge.observe(state, fresh, { correct: true, parts: [true] }, { at: 20, answers: ['Мен студент емеспін'], hinted: false, recall: true }, []);
assert.equal(rightLogs.filter(row => row.skill_id === 'rule:person-neg::position').length, 1);
assert.equal(state.skills['rule:person-neg::position'].fsrs_log.rating, 3);
assert.deepEqual(state.skills['rule:person::application'], kept);
ok('S01/S02 load keeps old mastery; error and success share one microskill');

console.log('T21_T22_OK', passed.length);
