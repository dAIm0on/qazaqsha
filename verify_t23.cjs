#!/usr/bin/env node
'use strict';
const assert = require('assert');
const Chapters = require('./grammar-chapters.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

const lesson = Chapters.LESSONS.find(l => l.id === '2-3');
const suf = lesson.chapters.find(c => c.id === '2-3-suf');
const ord = lesson.chapters.find(c => c.id === '2-3-ord');
const ex = lesson.chapters.find(c => c.id === '2-3-ex');
const sufText = JSON.stringify(suf);
const ordText = JSON.stringify(ord);
const ask = suf.beats.find(b => b.id === '23o5');

assert.ok(/алты \(ы\)/.test(sufText));
assert.ok(/алты \+ ншы/.test(sufText));
assert.ok(!/алты \(т\)/.test(sufText));
assert.ok(!/т в алты/.test(sufText));
assert.ok(!/т — согласная, число твёрдое → ыншы/.test(sufText));
const alty = suf.beats.find(b => b.k === 'ex' && b.from === 'алты');
assert.equal(alty.slot, 'ншы');
assert.equal(ord.beats.find(b => b.k === 'ex' && b.from === 'алты').slot, 'ншы');
assert.deepEqual(ask.answers, ['нші']);
assert.ok(!ask.answers.includes('інші'));
assert.ok(!/елу/.test(sufText));
assert.ok(/Елу здесь не берём как прозрачный пример/.test(JSON.stringify(ex)));
ok('C02 алты ends in ы, 23o5 accepts only нші, елу is not the transparent demo');

const Phase = require('./phase2b-practice.js');
const old23 = ['p2b-23-g1-qonaq','p2b-23-g1-mugalim','p2b-23-g1-korshi','p2b-23-g2-qonaq','p2b-23-g2-adam','p2b-23-g2-aqyldy','p2b-23-g2-ordinal20','p2b-23-g3-he-guest-q','p2b-23-g3-he-not-teacher-q','p2b-23-g6-ol-mugalimmin','p2b-23-g6-konak-ba','p2b-23-g6-missing-question'];
for (const id of old23) assert.ok(Phase.byId(id), id);
assert.equal(Phase.cardsFor('2-3','G4').length, 4);
assert.equal(Phase.cardsFor('2-3','G5').length, 4);
assert.equal(Phase.byId('p2b-23-g3-ord-21').skillBindings[0].skill_type, 'last_component');
assert.equal(Phase.byId('p2b-23-g2-ordinal20').id, 'p2b-23-g2-ordinal20');
assert.ok(Phase.checkTask('p2b-23-g2-alty','алтыншы').result.correct);
assert.ok(Phase.checkTask('p2b-23-g2-eki-piece','нші').result.correct);
assert.equal(Phase.checkTask('p2b-23-g2-eki-piece','інші').result.correct, false);
assert.ok(Phase.checkTask('p2b-23-g5-21-ord','жиырма бірінші').result.correct);
assert.equal(Phase.checkTask('p2b-23-g5-21-ord','жиырмасыншы').result.correct, false);
assert.ok(Phase.checkTask('p2b-23-g6-zhyirman','Олар жиырмасыншы ма').result.correct);
assert.ok(Phase.checkTask('p2b-23-g4-bye-siz','до свидания одному уважительно').result.correct);
assert.ok(!Phase.cardsFor('2-1','G3').some(q => (q.ruleIds || []).includes('T10_QUESTION')));
const order = Phase.lessonSession('2-3').map(q => q.phase2b.lesson_order);
assert.ok(order.every((n, i) => i === 0 || n >= order[i - 1]));
assert.ok(order[0] === 1 && order[order.length - 1] === 9);
ok('C04 2-3 keeps the old 12 cards and covers G4/G5, ordinals, and farewells');

console.log('T23_OK', passed.length);
