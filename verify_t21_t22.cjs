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

console.log('T21_T22_OK', passed.length);
