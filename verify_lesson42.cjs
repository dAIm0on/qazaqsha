#!/usr/bin/env node
'use strict';
const assert = require('assert');
const Pack = require('./lesson42-pack.js');
const HW = require('./lesson42-homework.js');
const Gate = require('./curriculum-gate.js');
const core = require('./core.js');

function ok(name){ console.log('PASS', name); }

const lesson = Pack.lessonSession();
assert.equal(lesson.length, 100);
assert.equal(new Set(lesson.map(q => q.id)).size, 100);
assert.equal(Pack.sessionA().length, 8);
assert.equal(Pack.sessionB().length, 10);
assert.equal(Pack.sessionC().length, 10);
assert.equal(Pack.sessionD().length, 12);
assert.equal(Pack.sessionE().length, 8);
assert.equal(Pack.sessionF().length, 10);
assert.equal(Pack.sessionG().length, 12);
assert.equal(Pack.sessionH().length, 8);
assert.equal(Pack.sessionI().length, 10);
assert.equal(Pack.sessionJ().length, 12);
lesson.forEach(q => assert.ok(/^p4-42-[a-j]\d{2}$/.test(q.id), q.id));
ok('L42-01 bank is 100 unique A–J cards');

const gold = Pack.goldRows();
assert.equal(gold.length, 100);
for (const row of gold) {
  const q = Pack.byId(row.card);
  assert.ok(q, row.id + ' ' + row.card);
  for (const acc of row.accepts) {
    const ans = Array.isArray(acc) ? acc : [acc];
    assert.equal(core.evaluate(q, ans).correct, true, row.id + ' accept ' + JSON.stringify(ans));
  }
  for (const rej of row.rejects || []) {
    const ans = Array.isArray(rej) ? rej : [rej];
    assert.equal(core.evaluate(q, ans).correct, false, row.id + ' reject ' + JSON.stringify(ans));
  }
}
ok('L42-02 gold accepts and rejects');

assert.equal(Pack.check('p4-42-e08', 'Достарым кешікті').result.correct, true);
assert.equal(Pack.check('p4-42-e08', 'Достарым кешіктім').result.correct, false);
assert.equal(Pack.check('p4-42-g01', 'Жазбадым').result.correct, true);
assert.equal(Pack.check('p4-42-g01', 'Жазбатым').result.correct, false);
assert.equal(Pack.check('p4-42-i01', 'Оқыдым').result.correct, true);
assert.equal(Pack.check('p4-42-i01', 'Оқтым').result.correct, false);
ok('L42-03 key hole and exceptions');

const catalog = { lessons: ['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-2'].map(id => ({ id, active: true })) };
assert.equal(Gate.allows('past_simple', catalog), true);
const course = { questions: [], sources: {} };
const added = Pack.install(course, catalog);
assert.equal(added.length, 100);
ok('L42-04 gate + install');

const locked = HW.build({ events: [] });
assert.equal(locked.item_ids.length, 0);
const opened = HW.validate();
assert.equal(opened.ok, true);
ok('L42-05 homework locked then opened');

const plans = Pack.stagePlans();
assert.equal(plans.length, 10);
assert.equal(plans[0].stageId, '42-a');
assert.equal(plans[plans.length-1].final, true);
ok('L42-06 ten stages');

console.log('OK lesson 4-2');
