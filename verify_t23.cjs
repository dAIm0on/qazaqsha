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

console.log('T23_OK', passed.length);
