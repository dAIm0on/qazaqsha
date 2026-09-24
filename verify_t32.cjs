#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Bank = require('./explain-bank.js');
const Rules = require('./ai-rules.js');
const Diag = require('./diagnostics.js');
const CanonTexts = require('./canon-texts.js');

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

const t25 = Bank.byId('T25_POSS_SENDER');
const t27 = Bank.byId('T27_DEIXIS');
assert.ok(/модели этого урока/.test(t25.ru_refresh));
assert.ok(/не закон всего языка/.test(t25.ru_refresh));
assert.ok(t25.examples.includes('сендердің қолдарың'));
assert.ok(t25.examples.includes('сіздердің бастықтарыңыз'));
assert.ok(!/во всём языке/.test(t25.title + t25.medium + t25.ru_refresh));
assert.ok(/осы кітап/.test(t27.short));
assert.ok(/сол кітап/.test(t27.ru_refresh));
assert.ok(/не запрещаются/.test(t27.medium));

const ai25 = Rules.byId('T25_POSS_SENDER');
const ai27 = Rules.byId('T27_DEIXIS');
assert.ok(/модели урока/.test(ai25.title_ru + ai25.explanation_ru));
assert.ok(/осы кітап/.test(ai27.explanation_ru) && /сол кітап/.test(ai27.explanation_ru));

const line = Diag.line('POSS_2PL_NO_PL', 'сендердің қолдарың', 'сендердің қолың', { stimulus: 'қол' });
assert.match(line, /қолдарың/);
assert.match(line, /модели этого урока/);
assert.ok(!/всегда, даже/.test(line));
const bare = Diag.line('DEIXIS_BARE', 'мына кітап', 'мына — кітап', { stimulus: 'мына' });
assert.match(bare, /осы кітап/i);
assert.ok(!/не живёт одно/.test(bare));

const shown = CanonTexts.packFor('T25_POSS_SENDER').docs.map(d => d.text).join('\n')
  + CanonTexts.packFor('T27_DEIXIS').docs.map(d => d.text).join('\n');
assert.ok(shown.includes('Біздің — наш'));
assert.ok(shown.includes('Разжёвано для ученика'));
assert.ok(shown.includes('Что открыл курс'));
assert.ok(/модели этого урока/.test(shown));
assert.ok(/осы кітап/.test(shown) && /сол кітап/.test(shown));
assert.ok(!/Сначала всегда «много»/.test(shown));
assert.ok(!/эти слова не живут одни/.test(shown));
assert.ok(!/LAr ставится всегда, даже/.test(shown));

const pack = fs.readFileSync(path.join(__dirname, 'lesson32-pack.js'), 'utf8');
assert.ok(!/«Много» всегда/.test(pack));
assert.ok(/осы кітап жақсы/.test(pack));
ok('C05 T25/T27 active copies keep the course answers and drop the absolute ban');

console.log('T32_OK', passed.length);
