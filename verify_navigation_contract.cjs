'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const BASE = '0dab333adac7c95c2dd486b85eaaf1c20cff6f5f';
const ROOT = __dirname;
const FIX = path.join(ROOT, 'fixtures', 'navigation');
const ROUTES = Object.freeze([
  '#/lesson/theory',
  '#/practice',
  '#/words',
  '#/practices/session?kind=vocab&id=used',
  '#/practices/letters',
  '#/practices/numbers',
  '#/morph',
  '#/ready/homework/:id',
  '#/ready/exam',
  '#/dict',
  '#/results',
  '#/materials',
  '#/rules'
]);
const PROTECTED = [
  'morph-ui.js',
  'morph-nav2.js',
  'morph.css',
  'free-practice-config.js',
  'free-practice-queue.js',
  'free-practice-state.js',
  'free-practice-content.js',
  'free-practice-view.js'
];
const ALLOWED_FILE = /^(verify_navigation_(contract|state|ui)\.cjs|fixtures\/navigation\/(README\.md|[A-Za-z0-9._-]+\.json))$/;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function git(args) {
  return execFileSync('git', args, {cwd: ROOT, encoding: 'utf8'}).replace(/\r\n/g, '\n');
}
function ensureBase() {
  try { git(['cat-file', '-e', BASE + '^{commit}']); return true; }
  catch {
    try { git(['fetch', '--depth', '1', 'origin', BASE]); return true; }
    catch (error) {
      console.log('BASE_DIFF NOT_RUN', error && error.message ? error.message.split('\n')[0] : 'base commit unavailable');
      return false;
    }
  }
}
function ensureMain() {
  try { git(['cat-file', '-e', 'origin/main^{commit}']); return true; }
  catch {
    try { git(['fetch', '--depth', '1', 'origin', 'refs/heads/main:refs/remotes/origin/main']); return true; }
    catch (error) {
      console.log('MAIN_DIFF NOT_RUN', error && error.message ? error.message.split('\n')[0] : 'origin/main unavailable');
      return false;
    }
  }
}
function futureRoute(row) {
  const id = row.id;
  const topic = row.topic || '';
  const trainerKind = row.trainerKind || '';
  const target = row.target || '';
  if (id === 'morphophonology' || trainerKind === 'morph') return '#/morph';
  if (id === 'harmony_letters' || trainerKind === 'cat' || /^harmony-/.test(id)) return '#/practices/letters';
  if (id === 'numbers' || trainerKind === 'numbers' || topic === 'numbers') return '#/practices/numbers';
  if (id === 'vocab_must' || id === 'vocab-must' || target === 'vocab:must') return '#/words';
  if (id === 'vocab_used' || id === 'vocab-seen' || id === 'vocab-seen-write' || target === 'vocab:used') return '#/practices/session?kind=vocab&id=used';
  if (id === 'rules-core' || topic === 'rules') return '#/rules';
  return '#/practice';
}
function track(partial) {
  const row = {
    id: partial.id,
    kind: partial.kind || 'track',
    sourceFile: partial.sourceFile,
    currentLauncher: partial.currentLauncher,
    oldEntry: partial.oldEntry || ((partial.kind === 'trainer' ? 'trainer:' : 'track:') + partial.id),
    topic: partial.topic || null,
    trainerKind: partial.trainerKind || null,
    target: partial.target || null
  };
  row.futureRoute = partial.futureRoute || futureRoute(row);
  return row;
}
function buildEntryRows() {
  const rows = [];
  const learningData = read('learning-data.js');
  for (const m of learningData.matchAll(/numberLesson\('([^']+)','([^']*)'/g)) {
    rows.push(track({id: m[1], currentLauncher: m[2], topic: 'numbers', sourceFile: 'learning-data.js'}));
  }
  for (const m of learningData.matchAll(/lessons\.push\(\{id:'([^']+)',topic:'([^']+)',title:'([^']*)'/g)) {
    rows.push(track({id: m[1], topic: m[2], currentLauncher: m[3], sourceFile: 'learning-data.js'}));
  }
  const vocabLoop = learningData.match(/for\(const \[id,title,indices,intro\] of \[([\s\S]*?)\]\)lessons\.push\(\{id:'vocab-'\+id/);
  assert.ok(vocabLoop, 'vocab lesson loop missing');
  for (const m of vocabLoop[1].matchAll(/\['([^']+)','([^']*)'/g)) {
    rows.push(track({id: 'vocab-' + m[1], topic: 'vocab', currentLauncher: m[2], sourceFile: 'learning-data.js'}));
  }
  const pluralLoop = learningData.match(/for\(const \[id,title,indices\] of \[([\s\S]*?)\]\)lessons\.push\(\{id,topic:'plural'/);
  assert.ok(pluralLoop, 'plural lesson loop missing');
  for (const m of pluralLoop[1].matchAll(/\['([^']+)','([^']*)'/g)) {
    rows.push(track({id: m[1], topic: 'plural', currentLauncher: m[2], sourceFile: 'learning-data.js'}));
  }
  const vocabTracks = read('vocab-tracks.js');
  for (const m of vocabTracks.matchAll(/addTrack\('([^']+)','([^']*)'/g)) {
    rows.push(track({id: m[1], topic: 'vocab', currentLauncher: m[2], sourceFile: 'vocab-tracks.js'}));
  }
  const ladder = read('number-ladder.js');
  for (const m of ladder.matchAll(/id:'(numbers-(?:contrast|teens|mix2|echo-2|echo-3|echo-4))',topic:'numbers',title:'([^']*)'/g)) {
    rows.push(track({id: m[1], topic: 'numbers', currentLauncher: m[2], sourceFile: 'number-ladder.js'}));
  }
  const micro = read('microsteps.js');
  const known = micro.match(/id:'known-context',topic:'plural',courseLesson:'1-2',title:'([^']*)'/);
  assert.ok(known, 'known-context missing');
  rows.push(track({id: 'known-context', topic: 'plural', currentLauncher: known[1], sourceFile: 'microsteps.js'}));
  const gen = read('practice-generators.js');
  const stagesLine = gen.split('\n').find(line => line.includes('const stages='));
  assert.ok(stagesLine, 'facet stages missing');
  for (const m of stagesLine.matchAll(/\['([^']+)','([^']*)'/g)) {
    rows.push(track({id: 'facet-' + m[1], topic: 'plural', currentLauncher: m[2], sourceFile: 'practice-generators.js'}));
  }
  const pluralContext = gen.match(/id:'plural-context',title:'([^']*)',topic:'plural'/);
  assert.ok(pluralContext, 'plural-context missing');
  rows.push(track({id: 'plural-context', topic: 'plural', currentLauncher: pluralContext[1], sourceFile: 'practice-generators.js'}));
  const rules = read('rules-drill.js');
  const rulesCore = rules.match(/id:'rules-core',topic:'rules',courseLesson:'1-2',title:'([^']*)'/);
  assert.ok(rulesCore, 'rules-core missing');
  rows.push(track({id: 'rules-core', topic: 'rules', currentLauncher: rulesCore[1], sourceFile: 'rules-drill.js'}));
  const trainers = read('personal-trainers.js');
  const registry = trainers.slice(trainers.indexOf('const REGISTRY'), trainers.indexOf(']);'));
  for (const line of registry.split('\n')) {
    const m = line.match(/id:'([^']+)',order:\d+,title:'([^']*)'.*kind:'([^']+)'(?:,target:'([^']*)')?/);
    if (!m) continue;
    rows.push(track({
      id: m[1],
      kind: 'trainer',
      currentLauncher: m[2],
      trainerKind: m[3],
      target: m[4] || null,
      sourceFile: 'personal-trainers.js',
      topic: m[3] === 'numbers' ? 'numbers' : null
    }));
  }
  const shells = [
    ['shell:lesson-theory', 'Уроки и правила', '#path-view', '#/lesson/theory'],
    ['shell:lesson-practice', 'Практика', '#practice-view', '#/practice'],
    ['shell:homework', 'Домашка', '#homework-view', '#/ready/homework/:id'],
    ['shell:exam', 'Экзамен', '#exam-view', '#/ready/exam'],
    ['shell:dictionary', 'Мой словарь', '#vocabulary-view', '#/dict'],
    ['shell:results', 'Мой результат', '#review-view', '#/results'],
    ['shell:materials', 'Материалы', '#materials-view', '#/materials'],
    ['shell:rules', 'Правила и словарь', '#rules-view', '#/rules']
  ];
  for (const [id, launcher, oldEntry, route] of shells) {
    rows.push(track({
      id,
      kind: 'shell',
      sourceFile: 'index.html',
      currentLauncher: launcher,
      oldEntry,
      futureRoute: route
    }));
  }
  const seen = new Set();
  for (const row of rows) {
    assert.equal(seen.has(row.id), false, 'duplicate entry ' + row.id);
    seen.add(row.id);
    assert.ok(ROUTES.includes(row.futureRoute), row.id + ' route ' + row.futureRoute);
  }
  rows.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return rows;
}
function row(id, sourceScreen, control, target, fixtures, owner, status) {
  return {id, sourceScreen, control, target, fixtures, owner, status};
}
function registry() {
  const taps = [
    ['N-TAP-01', 'lesson', 'Теория блока', 'theory beat of the current lesson', ['clean.json', 'theory-draft.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-02', 'lesson', 'Практика блока', 'current lesson exercise', ['practice-mid.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-03', 'lesson', 'Слова по кругу', 'vocab:must card or restored retry', ['must-first-show.json', 'must-idk.json', 'must-wrong.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-04', 'visible main menu', 'Слова', 'same must launcher', ['must-first-show.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-05', 'visible main menu', 'Практика', 'current lesson practice', ['practice-mid.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-06', 'lesson hero', 'Продолжить when target is theory', 'promised chapter and beat', ['theory-draft.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-07', 'lesson hero', 'Продолжить when target is practice', 'promised course position', ['practice-mid.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-08', 'must summary', 'Продолжить', 'same sitting and open card', ['must-summary.json', 'must-idk.json', 'must-wrong.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['N-TAP-09', 'practices', 'secondary Слова по кругу', 'same must launcher', ['must-first-show.json'], 'NAV-05', 'EXPECTED_LATER'],
    ['N-TAP-10', 'theory', 'Назад · пауза', 'origin, path kept', ['theory-draft.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-11', 'must', 'Назад · пауза', 'origin, no summary, sitting kept', ['must-first-show.json', 'must-idk.json', 'must-wrong.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-12', 'course practice', 'Назад · пауза', 'origin, queue and draft kept', ['practice-mid.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-13', 'must summary', 'К тренажёрам', 'practices and closed sitting', ['must-summary.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['N-TAP-14', 'visible main menu', 'Форма слова', 'existing morph', ['clean.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-15', 'visible main menu', 'Урок', 'lesson home', ['clean.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-16', 'header', 'Библиотека', 'library', ['clean.json'], 'NAV-06', 'EXPECTED_LATER']
  ].map(item => row(...item));
  const states = [
    ['course-pause-must-course', 'course practice', 'pause then must', 'course', ['practice-mid.json', 'must-first-show.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['must-wrong-pause-course-must', 'must retype', 'pause', 'course then must', ['must-wrong.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['theory-practice-words-theory', 'path', 'practice then words', 'theory', ['theory-draft.json'], 'NAV-05', 'EXPECTED_LATER'],
    ['words-catalog-back', 'words', 'catalog', 'words', ['must-first-show.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['must-boundary-pause', 'must boundary', 'pause', 'same must portion', ['must-boundary.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['summary-continue', 'must summary', 'continue', '#/words', ['must-summary.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['summary-to-trainers', 'must summary', 'trainers', 'personal', ['must-summary.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['reload-three-sessions', 'three open sessions', 'reload', 'each session restored', ['clean.json', 'theory-draft.json', 'practice-mid.json'], 'NAV-02', 'EXPECTED_LATER'],
    ['import-replace-merge', 'progress import', 'merge', 'session cleared', ['practice-mid.json'], 'NAV-02', 'BASELINE'],
    ['applyRemote-during-retry', 'must retry', 'applyRemote', 'live retry kept', ['must-idk.json'], 'VOC', 'EXPECTED_UNTIL_VOC'],
    ['double-click-launcher', 'personal', 'trainer card', 'one launch', ['entry-map.json'], 'NAV-07', 'EXPECTED_LATER'],
    ['storage-unavailable', 'any', 'qazaq-before-update', 'preventDefault', [], 'NAV-01', 'BASELINE']
  ].map(item => row(...item));
  const history = [
    ['N-HISTORY-1', 'lesson', 'library then results then Back Back Forward', 'one external entry per hop', ['clean.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['N-HISTORY-2', 'lesson', 'words, pause, practice, browser Back, Слова', 'must restored from parked, no second launch', ['must-first-show.json', 'practice-mid.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['N-HISTORY-3', 'lesson theory', 'Предыдущий шаг then pause', 'internal step is not an external history entry', ['theory-draft.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['N-HISTORY-4', 'lesson morph', 'internal nav2/fs2 then library then Back', 'morph stack survives the external trip', ['clean.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['N-HISTORY-5', 'practice', 'skip-link #main then browser Back', 'focus moves, queue does not restart', ['practice-mid.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['N-HISTORY-6', 'cold URL', '#/words with saved morph, #/lesson with saved must', 'explicit route wins, parked data stays', ['must-first-show.json'], 'NAV-03', 'EXPECTED_LATER']
  ].map(item => row(...item));
  const pwa = [
    ['N-PWA-01', 'two tabs', 'update on tab A', 'tab B does not reload', [], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-02', 'practice', 'update after typing', 'normal draft rules only', ['practice-mid.json'], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-03', 'first load', 'controllerchange', 'no second load', [], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-04', 'controlled page', 'one update click', 'one reload', [], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-05', 'waiting worker', 'offline update', 'one cache reload or no load', [], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-06', 'update', 'storage setItem throws', 'event cancelled, no reload', [], 'NAV-01', 'EXPECTED_LATER'],
    ['N-PWA-07', 'waiting worker', 'close without click', 'no location.reload', [], 'NAV-01', 'EXPECTED_LATER']
  ].map(item => row(...item));
  const groups = [
    row('N-REACH', 'learn tracks', 'tracksFor', 'entry-map future route', ['entry-map.json'], 'NAV-00', 'BASELINE'),
    row('N-MORPH', 'morph', 'Форма слова', '#/morph', ['entry-map.json'], 'NAV-06', 'BASELINE'),
    row('N-TEXT', 'bottom-nav', 'current labels', 'Учёба / Форма слова / Тренажёры', [], 'NAV-08', 'BASELINE'),
    row('N-UI', 'bottom-nav', 'future 4-item menu', 'Урок / Слова / Практика / Форма слова', [], 'NAV-08', 'EXPECTED_LATER'),
    row('N-READY', 'homework and exam', 'open', '#/ready/homework/:id and #/ready/exam', ['entry-map.json'], 'NAV-09', 'EXPECTED_LATER'),
    row('N-DICT', 'vocabulary', 'Мой словарь', '#/dict', ['entry-map.json'], 'NAV-10', 'EXPECTED_LATER'),
    row('N-VOC', 'words must', 'session.vocab', 'v6 snapshot', ['must-first-show.json', 'must-idk.json', 'must-wrong.json', 'must-boundary.json', 'must-summary.json'], 'VOC', 'EXPECTED_UNTIL_VOC'),
    row('PWA-CONTROLLERCHANGE-RELOAD', 'pwa', 'controllerchange', 'first controller does not reload', [], 'NAV-01', 'BASELINE')
  ];
  const rules = [
    ['K1', 'lesson and menu', 'Теория / Практика / Слова', 'one tap, no extra start', 'NAV-08'],
    ['K2', 'words', 'every words entry', 'launches v6 vocab:must only', 'NAV-02'],
    ['K3', 'lesson', 'visible navigation copy', 'no daily goal or portion-end screen', 'NAV-08'],
    ['K4', 'lesson', 'homework and tests', 'secondary, at most two taps', 'NAV-09'],
    ['K5', 'session', 'pause and Back', 'exact resume and one-tap exit', 'NAV-02'],
    ['K6', 'menu', 'Форма слова', 'existing morph module, no duplicate card', 'NAV-08']
  ].map(([id, source, control, target, owner]) => row(id, source, control, target, [], owner, 'RULE_REGISTERED'));
  return [...taps, ...states, ...history, ...pwa, ...groups, ...rules];
}

module.exports = {BASE, ROUTES, PROTECTED, buildEntryRows, registry, futureRoute};

if (require.main !== module) return;

const required = [];
for (let n = 1; n <= 16; n++) required.push('N-TAP-' + String(n).padStart(2, '0'));
for (const id of ['course-pause-must-course', 'must-wrong-pause-course-must', 'theory-practice-words-theory', 'words-catalog-back', 'must-boundary-pause', 'summary-continue', 'summary-to-trainers', 'reload-three-sessions', 'import-replace-merge', 'applyRemote-during-retry', 'double-click-launcher', 'storage-unavailable']) required.push(id);
for (let n = 1; n <= 6; n++) required.push('N-HISTORY-' + n);
for (let n = 1; n <= 7; n++) required.push('N-PWA-0' + n);
for (const id of ['N-REACH', 'N-MORPH', 'N-TEXT', 'N-UI', 'N-READY', 'N-DICT', 'N-VOC', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6']) required.push(id);

const contracts = registry();
const byId = new Map(contracts.map(item => [item.id, item]));
assert.equal(byId.size, contracts.length, 'duplicate contract id');
for (const id of required) assert.ok(byId.has(id), 'missing contract ' + id);
for (const item of contracts) {
  for (const key of ['id', 'sourceScreen', 'control', 'target', 'fixtures', 'owner', 'status']) assert.ok(Object.prototype.hasOwnProperty.call(item, key), item.id + ' ' + key);
  assert.match(item.owner, /^(NAV-(0\d|10)|VOC)$/);
  assert.ok(['BASELINE', 'BASELINE_DEFECT_OWNED_BY_NAV01', 'EXPECTED_LATER', 'EXPECTED_UNTIL_VOC', 'RULE_REGISTERED'].includes(item.status), item.status);
  if (/^K[1-6]$/.test(item.id)) assert.equal(item.status, 'RULE_REGISTERED', item.id + ' must not be claimed as passing');
  console.log('CONTRACT', item.id, item.status, item.owner, item.sourceScreen, '->', item.target);
}
const counts = {};
for (const item of contracts) counts[item.status] = (counts[item.status] || 0) + 1;
console.log('CONTRACT_COUNTS', JSON.stringify(counts), 'total', contracts.length);
console.log('BASELINE_SHA', BASE);

const sw = read('sw.js');
const cacheNames = sw.match(/CACHE='[^']+'/g) || [];
assert.equal(cacheNames.length, 1);
assert.match(cacheNames[0], /^CACHE='qazaq-offline-live-\d{8}-[a-z0-9-]+'$/);
assert.equal(sw.includes('fixtures/navigation'), false);

const app = read('app.js');
assert.match(app, /window\.addEventListener\('qazaq-before-update',e=>\{pauseTimer\(\);save\(\);if\(!storageAvailable\)e\.preventDefault\(\);\}\);/);
const saveStart = app.indexOf('function save(){');
const saveEnd = app.indexOf('function subset(){');
const saveBody = app.slice(saveStart, saveEnd);
assert.match(saveBody, /state\.session=\{/);
assert.doesNotMatch(saveBody, /\bvocab\s*:/);
const applyStart = app.indexOf('function applyRemote(incoming){');
const applyEnd = app.indexOf('function paintAccount(){');
const applyBody = app.slice(applyStart, applyEnd);
assert.match(applyBody, /state=P\.merge\(state,incoming\)/);
assert.match(applyBody, /save\(\)/);
assert.match(app, /savedSession\.queue\.every\(id=>byId\.has\(id\)\)/);

const pwa = read('pwa.js');
assert.match(pwa, /addEventListener\('controllerchange'/);
assert.match(pwa, /if\(!controllerKnown\)/);
assert.match(pwa, /if\(reloadRequested\)\{reloadOnce\(\);return;\}/);
assert.doesNotMatch(pwa, /controllerchange',\(\)=>\{if\(!reloading\)\{reloading=true/);
assert.equal(byId.get('PWA-CONTROLLERCHANGE-RELOAD').status, 'BASELINE');
console.log('BASELINE pwa.js first controllerchange does not reload');

const progress = read('progress.js');
assert.match(progress, /out\.session=null;/);
const P = require('./progress.js');
const merged = P.merge(P.migrate({records: {}}, 1700000000000), P.migrate({records: {}, session: {mode: 'ordered', queue: ['m1-1-1'], position: 0}}, 1700000000000));
assert.equal(merged.session, null);
assert.equal(byId.get('import-replace-merge').status, 'BASELINE');
console.log('BASELINE merge clears session');

const html = read('index.html');
const bottom = html.match(/<nav class="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/);
const labels = [...bottom[1].matchAll(/>([^<]+)<\/button>/g)].map(m => m[1]);
assert.deepEqual(labels, ['Учёба', 'Форма слова', 'Тренажёры']);
assert.equal(html.includes('fixtures/navigation'), false);
assert.equal(byId.get('N-TEXT').status, 'BASELINE');
assert.equal(byId.get('N-UI').status, 'EXPECTED_LATER');
console.log('EXPECTED_LATER NAV-08 future menu Урок / Слова / Практика / Форма слова is not required today');

const morph = read('morph.css');
assert.ok(morph.includes('body[data-morph-immersive="1"] .bottom-nav{display:none}'));
assert.ok(html.includes('id="morph-view"'));
assert.equal(byId.get('N-MORPH').status, 'BASELINE');

const rows = buildEntryRows();
const map = JSON.parse(fs.readFileSync(path.join(FIX, 'entry-map.json'), 'utf8'));
assert.equal(map.baseline, BASE);
assert.deepEqual(map.rows, rows);
const learningIds = [...new Set([...read('learning.js').matchAll(/\.id==='([^']+)'/g)].map(m => m[1]))];
assert.ok(learningIds.includes('vocab-must'));
for (const id of learningIds) assert.ok(rows.some(item => item.id === id), 'learning.js track has no row: ' + id);
const trainerIds = [...read('personal-trainers.js').matchAll(/id:'([^']+)',order:/g)].map(m => m[1]);
for (const id of trainerIds) assert.ok(rows.some(item => item.id === id), 'trainer has no row: ' + id);
for (const id of ['vocab-must', 'harmony_letters', 'morphophonology', 'numbers', 'vocab_must', 'vocab_used', 'plural-1', 'numbers-0', 'rules-core', 'known-context', 'facet-harmony']) {
  assert.ok(rows.some(item => item.id === id), 'missing row ' + id);
}
assert.equal(byId.get('N-REACH').status, 'BASELINE');
console.log('N-REACH rows', rows.length, 'learning.js tracks', learningIds.join(','));

const hashes = JSON.parse(fs.readFileSync(path.join(FIX, 'protected-sha256.json'), 'utf8'));
assert.equal(hashes.baseline, BASE);
assert.equal(hashes.algorithm, 'sha256');
assert.deepEqual(Object.keys(hashes.files), PROTECTED);
for (const name of PROTECTED) {
  const digest = crypto.createHash('sha256').update(Buffer.from(fs.readFileSync(path.join(ROOT, name), 'utf8').replace(/\r\n/g, '\n'), 'utf8')).digest('hex');
  assert.equal(digest, hashes.files[name], name);
}
if (process.env.NAV00_SCOPE === '1' && ensureBase() && ensureMain()) {
  const gate = 'origin/main';
  const protectedDiff = git(['diff', '--name-only', gate, '--', ...PROTECTED]).trim();
  assert.equal(protectedDiff, '', protectedDiff);
  const changed = new Set();
  for (const line of git(['status', '--porcelain', '-uall']).split('\n').filter(Boolean)) {
    let file = line.slice(3).trim();
    if (file.includes(' -> ')) file = file.split(' -> ').pop().trim();
    changed.add(file.replace(/\\/g, '/'));
  }
  for (const line of git(['diff', '--name-only', gate]).split('\n').filter(Boolean)) changed.add(line.replace(/\\/g, '/'));
  for (const file of changed) assert.match(file, ALLOWED_FILE, 'unexpected path ' + file);
  const prod = git(['diff', '--name-only', gate, '--', 'pwa.js', 'sw.js', 'app.js', 'index.html', 'morph.css', 'theme-redesign.css']).trim();
  assert.equal(prod, '', prod);
  console.log('PROD_GATE', gate);
} else if (process.env.NAV00_SCOPE !== '1') {
  console.log('PROD_GATE SKIP set NAV00_SCOPE=1 to compare product files with origin/main');
}
console.log('VERIFY_NAVIGATION_CONTRACT_OK');
