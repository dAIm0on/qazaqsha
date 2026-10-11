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
const ALLOWED_FILE = /^(app\.js|index\.html|navigation-state\.js|progress\.js|sw\.js|verify_chrome_error9_p0\.cjs|verify_lesson33\.cjs|verify_lesson_2_1_path_migrate\.cjs|verify_lesson_v2\.cjs|verify_navigation_contract\.cjs|verify_navigation_state\.cjs|verify_offline_assets\.cjs|verify_personal_trainers\.cjs|verify_r7_2ta\.cjs|verify_r7_2tb\.cjs|verify_r7_51\.cjs|verify_r7_66\.cjs|verify_r7_runtime_progress_migration\.cjs|verify_r7_support_kinds_mastery\.cjs|verify_r7_ux63\.cjs|verify_r7_x123\.cjs|verify_section2_canonical\.cjs|verify_trainer\.cjs|verify_vocab_pr7_draft_leak\.cjs|verify_vocab_trainer_v1\.cjs)$/;

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
    ['N-TAP-08', 'must summary', 'Продолжить', 'same sitting and open card', ['must-summary.json', 'must-idk.json', 'must-wrong.json'], 'VOC', 'BASELINE'],
    ['N-TAP-09', 'practices', 'secondary Слова по кругу', 'same must launcher', ['must-first-show.json'], 'NAV-05', 'EXPECTED_LATER'],
    ['N-TAP-10', 'theory', 'Назад · пауза', 'origin, path kept', ['theory-draft.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-11', 'must', 'Назад · пауза', 'origin, no summary, sitting kept', ['must-first-show.json', 'must-idk.json', 'must-wrong.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-12', 'course practice', 'Назад · пауза', 'origin, queue and draft kept', ['practice-mid.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['N-TAP-13', 'must summary', 'К тренажёрам', 'practices and closed sitting', ['must-summary.json'], 'VOC', 'BASELINE'],
    ['N-TAP-14', 'visible main menu', 'Форма слова', 'existing morph', ['clean.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-15', 'visible main menu', 'Урок', 'lesson home', ['clean.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['N-TAP-16', 'header', 'Библиотека', 'library', ['clean.json'], 'NAV-06', 'EXPECTED_LATER']
  ].map(item => row(...item));
  const states = [
    ['course-pause-must-course', 'course practice', 'pause then must', 'course', ['practice-mid.json', 'must-first-show.json'], 'NAV-02', 'BASELINE'],
    ['must-save-writes-vocab', 'words must', 'save', 'non-must omits vocab; must writes vocab', ['practice-mid.json', 'must-first-show.json'], 'VOC', 'BASELINE'],
    ['must-wrong-pause-course-must', 'must retype', 'pause', 'course then must', ['must-wrong.json'], 'NAV-04', 'EXPECTED_LATER'],
    ['must-retype-across-learn', 'must retype', 'learn then must', 'learn, then the same retype', ['must-wrong.json'], 'VOC', 'BASELINE'],
    ['theory-practice-words-theory', 'path', 'practice then words', 'theory', ['theory-draft.json'], 'NAV-05', 'EXPECTED_LATER'],
    ['words-catalog-back', 'words', 'catalog', 'words', ['must-first-show.json'], 'VOC', 'BASELINE'],
    ['must-boundary-pause', 'must boundary', 'pause', 'same must portion', ['must-boundary.json'], 'VOC', 'BASELINE'],
    ['summary-continue', 'must summary', 'continue', '#/words', ['must-summary.json'], 'NAV-03', 'EXPECTED_LATER'],
    ['summary-continue-card', 'must summary', 'continue', 'live words session, same card', ['must-summary.json'], 'VOC', 'BASELINE'],
    ['summary-to-trainers', 'must summary', 'trainers', 'personal', ['must-summary.json'], 'NAV-08', 'EXPECTED_LATER'],
    ['reload-three-sessions', 'three open sessions', 'reload', 'each session restored', ['clean.json', 'theory-draft.json', 'practice-mid.json'], 'NAV-02', 'BASELINE'],
    ['import-replace-merge', 'progress import', 'merge', 'session cleared', ['practice-mid.json'], 'NAV-02', 'BASELINE'],
    ['nav02-import-merge-slots', 'progress import', 'merge', 'local slot kept, missing accepted, live must not rolled back', ['practice-mid.json'], 'NAV-02', 'BASELINE'],
    ['nav02-import-replace-copy', 'progress import', 'replace', 'chosen copy plus existing backup', ['practice-mid.json'], 'NAV-02', 'BASELINE'],
    ['applyRemote-during-retry', 'must retry', 'applyRemote', 'live retry kept', ['must-idk.json'], 'VOC', 'BASELINE'],
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
    row('N-VOC', 'words must', 'session.vocab', 'v6 snapshot', ['must-first-show.json', 'must-idk.json', 'must-wrong.json', 'must-boundary.json', 'must-summary.json'], 'VOC', 'BASELINE'),
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
for (const id of ['course-pause-must-course', 'must-save-writes-vocab', 'must-wrong-pause-course-must', 'must-retype-across-learn', 'theory-practice-words-theory', 'words-catalog-back', 'must-boundary-pause', 'summary-continue', 'summary-continue-card', 'summary-to-trainers', 'reload-three-sessions', 'import-replace-merge', 'nav02-import-merge-slots', 'nav02-import-replace-copy', 'applyRemote-during-retry', 'double-click-launcher', 'storage-unavailable']) required.push(id);
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
  assert.ok(['BASELINE', 'BASELINE_DEFECT_OWNED_BY_NAV01', 'EXPECTED_LATER', 'RULE_REGISTERED'].includes(item.status), item.status);
  if (/^K[1-6]$/.test(item.id)) assert.equal(item.status, 'RULE_REGISTERED', item.id + ' must not be claimed as passing');
  console.log('CONTRACT', item.id, item.status, item.owner, item.sourceScreen, '->', item.target);
}
assert.equal(contracts.some(item => item.status === 'EXPECTED_UNTIL_VOC'), false);
for (const id of ['N-TAP-08', 'N-TAP-13', 'must-save-writes-vocab', 'must-retype-across-learn', 'words-catalog-back', 'must-boundary-pause', 'summary-continue-card', 'applyRemote-during-retry', 'N-VOC']) {
  assert.equal(byId.get(id).status, 'BASELINE', id);
  assert.equal(byId.get(id).owner, 'VOC', id);
}
assert.equal(byId.get('course-pause-must-course').status, 'BASELINE');
assert.equal(byId.get('course-pause-must-course').owner, 'NAV-02');
assert.equal(byId.get('course-pause-must-course').control, 'pause then must');
assert.equal(byId.get('course-pause-must-course').target, 'course');
assert.equal(byId.get('reload-three-sessions').status, 'BASELINE');
assert.equal(byId.get('reload-three-sessions').control, 'reload');
assert.equal(byId.get('reload-three-sessions').target, 'each session restored');
assert.equal(byId.get('nav02-import-merge-slots').status, 'BASELINE');
assert.equal(byId.get('nav02-import-merge-slots').target, 'local slot kept, missing accepted, live must not rolled back');
assert.equal(byId.get('nav02-import-replace-copy').status, 'BASELINE');
assert.equal(byId.get('nav02-import-replace-copy').target, 'chosen copy plus existing backup');
assert.equal(byId.get('must-wrong-pause-course-must').status, 'EXPECTED_LATER');
assert.equal(byId.get('must-wrong-pause-course-must').owner, 'NAV-04');
assert.equal(byId.get('must-wrong-pause-course-must').target, 'course then must');
assert.equal(byId.get('summary-continue').status, 'EXPECTED_LATER');
assert.equal(byId.get('summary-continue').owner, 'NAV-03');
assert.equal(byId.get('summary-continue').target, '#/words');
assert.equal(byId.get('must-save-writes-vocab').target, 'non-must omits vocab; must writes vocab');
assert.equal(byId.get('must-retype-across-learn').target, 'learn, then the same retype');
assert.equal(byId.get('summary-continue-card').target, 'live words session, same card');
for (const id of ['N-TAP-03', 'N-TAP-04', 'N-TAP-09', 'N-TAP-11', 'summary-to-trainers', 'N-HISTORY-2', 'N-HISTORY-6']) {
  assert.equal(byId.get(id).status, 'EXPECTED_LATER', id);
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
assert.match(saveBody, /state\.session=captureSessionObject\(\)/);
const capStart = app.indexOf('function captureSessionObject(){');
const capEnd = app.indexOf('function genericQueueKey(');
const capBody = app.slice(capStart, capEnd);
assert.ok(capStart > 0 && capEnd > capStart);
assert.match(capBody, /const session=\{topic,mode,sourceFilter,courseBlock,queue,position,answered:checked/);
assert.match(capBody, /session\.vocab=window\.VocabMust\.snapshot/);
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

const NS = require('./navigation-state.js');
const localSlots = P.migrate({records: {}}, 1700000000000);
assert.equal(NS.put(localSlots, 'vocab:must', {status: 'closed', updatedAt: 5, origin: 'close', snapshot: {kind: 'session', session: {mode: 'words', queue: ['a'], position: 0}}}), true);
assert.equal(NS.put(localSlots, 'queue:ordered:sounds', {status: 'paused', updatedAt: 4, origin: 'local', snapshot: {kind: 'session', session: {mode: 'ordered', topic: 'sounds', queue: ['m1-1-1'], position: 0, queueEpoch: 1700000000000}}}), true);
const incomingSlots = P.migrate({records: {}}, 1700000000000);
assert.equal(NS.put(incomingSlots, 'vocab:must', {status: 'paused', updatedAt: 9, origin: 'cloud', snapshot: {kind: 'session', session: {mode: 'words', queue: ['other'], position: 0}}}), true);
assert.equal(NS.put(incomingSlots, 'course:2-2', {status: 'paused', updatedAt: 3, origin: 'cloud', snapshot: {kind: 'ref', store: 'practiceSession', lessonId: '2-2'}}), true);
const slotMerged = P.merge(localSlots, incomingSlots);
assert.equal(slotMerged.session, null);
assert.equal(slotMerged.navigationResume.slots['vocab:must'].status, 'closed');
assert.equal(slotMerged.navigationResume.slots['vocab:must'].origin, 'close');
assert.equal(slotMerged.navigationResume.slots['queue:ordered:sounds'].origin, 'local');
assert.equal(slotMerged.navigationResume.slots['queue:ordered:sounds'].snapshot.session.queueEpoch, 1700000000000);
assert.equal(slotMerged.navigationResume.slots['course:2-2'].snapshot.kind, 'ref');
assert.equal(slotMerged.navigationResume.slots['course:2-2'].snapshot.lessonId, '2-2');
const chosen = P.migrate({records: {}, session: {mode: 'ordered', queue: ['m1-1-1'], position: 0, queueEpoch: 3}, navigationResume: incomingSlots.navigationResume}, 1700000000000);
assert.equal(chosen.session.queueEpoch, 3);
assert.equal(chosen.navigationResume.slots['course:2-2'].snapshot.lessonId, '2-2');
assert.equal(Object.prototype.hasOwnProperty.call(chosen.navigationResume.slots, 'vocab:must'), true);
const impBody = app.slice(app.indexOf('function importProgress'), app.indexOf('function vocabTable'));
const backupAt = impBody.indexOf('localStorage.setItem(BACKUP,');
const keepAt = impBody.indexOf("importMode!=='replace'");
const replaceAt = impBody.indexOf("importMode==='replace'?P.migrate");
assert.ok(backupAt > 0 && keepAt > backupAt && replaceAt > keepAt);
assert.ok(impBody.includes('restoreMustLive(keep)'));
assert.ok(impBody.includes('next.session=null'));
console.log('BASELINE nav02 import: local slot wins, missing slot accepted, replace keeps the chosen copy and the backup');

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
  const prod = git(['diff', '--name-only', gate, '--', 'pwa.js', 'morph.css', 'theme-redesign.css']).trim();
  assert.equal(prod, '', prod);
  console.log('PROD_GATE', gate);
} else if (process.env.NAV00_SCOPE !== '1') {
  console.log('PROD_GATE SKIP set NAV00_SCOPE=1 to compare product files with origin/main');
}

const {boot, sleep, KEY} = require('./tools/capture_nav_must_fixtures.js');

function hasVocab(session) {
  return !!session && Object.prototype.hasOwnProperty.call(session, 'vocab');
}

(async () => {
  const mustNames = ['must-first-show.json', 'must-idk.json', 'must-wrong.json', 'must-boundary.json', 'must-summary.json'];
  const fixtures = {};
  for (const name of mustNames) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
    assert.equal(Object.prototype.hasOwnProperty.call(fixture, 'fixtureStatus'), false, name);
    assert.equal(Object.prototype.hasOwnProperty.call(fixture, 'structural'), false, name);
    assert.equal(fixture.session.mode, 'words', name);
    assert.equal(fixture.session.trainerReturn, 'vocab:must', name);
    assert.ok(fixture.session.vocab && fixture.session.vocab.sitting.shown.length > 0, name);
    assert.equal(fixture.session.vocab.sitting.legacy, null, name);
    assert.equal(fixture.session.vocab.nearMiss, null, name);
    assert.equal(Object.prototype.hasOwnProperty.call(fixture.session, 'vocabSummary'), false, name);
    fixtures[name] = fixture;
  }
  assert.equal(fixtures['must-idk.json'].session.vocab.retry.kind, 'idk');
  assert.equal(fixtures['must-wrong.json'].session.vocab.retry.kind, 'wrong');
  console.log('BASELINE N-VOC five captured v6 snapshots');

  const plain = boot();
  plain.saveNow();
  assert.equal(hasVocab(plain.session()), false);
  const mustLive = boot();
  mustLive.window.TrainerCatalogBridge.launch('vocab:must');
  mustLive.saveNow();
  assert.equal(hasVocab(mustLive.session()), true);
  assert.equal(mustLive.session().mode, 'words');
  assert.equal(mustLive.session().trainerReturn, 'vocab:must');
  console.log('BASELINE must save() writes session.vocab; a non-must save omits it');

  const practice = JSON.parse(fs.readFileSync(path.join(FIX, 'practice-mid.json'), 'utf8'));
  assert.equal(hasVocab(practice), false);
  assert.equal(hasVocab(fixtures['must-first-show.json'].session), true);
  const midLive = boot(JSON.stringify({session: practice}));
  midLive.saveNow();
  assert.equal(hasVocab(midLive.session()), false);
  assert.equal(midLive.session().queue[0], 'm1-1-1');
  assert.equal(midLive.session().mode, 'ordered');
  console.log('BASELINE must-save-writes-vocab: practice-mid omits vocab, must writes it');

  async function continueFrom(setup) {
    const api = boot();
    api.window.TrainerCatalogBridge.launch('vocab:must');
    if (setup) setup(api);
    api.saveNow();
    const before = api.session();
    api.makeEl('vocab-finish').onclick();
    api.makeEl('vocab-summary-continue').onclick();
    api.saveNow();
    const after = api.session();
    assert.equal(after.queue[after.position], before.queue[before.position]);
    assert.equal(after.queueEpoch, before.queueEpoch);
    assert.equal(JSON.stringify(after.vocab.sitting.shown), JSON.stringify(before.vocab.sitting.shown));
    assert.equal(JSON.stringify(after.vocab.retry), JSON.stringify(before.vocab.retry));
    assert.equal(after.view, 'practice');
    assert.equal(after.mode, 'words');
    assert.equal(after.trainerReturn, 'vocab:must');
    assert.equal(api.window.location.hash, '');
  }
  await continueFrom(null);
  await continueFrom(api => { api.makeEl('reveal-button').onclick(); });
  await continueFrom(api => { api.submit('неттакого'); });
  console.log('BASELINE N-TAP-08 and summary-continue-card keep the card');

  const summary = boot();
  summary.window.TrainerCatalogBridge.launch('vocab:must');
  summary.makeEl('vocab-finish').onclick();
  assert.ok(String(summary.makeEl('exercise').innerHTML).includes('Итог'));
  summary.saveNow();
  assert.equal(Object.prototype.hasOwnProperty.call(summary.session(), 'vocabSummary'), false);
  assert.equal(summary.session().view, 'practice');
  console.log('BASELINE open summary is on screen and is not stored in session.vocab');

  const end = boot();
  end.window.TrainerCatalogBridge.launch('vocab:must');
  end.makeEl('vocab-finish').onclick();
  end.makeEl('vocab-summary-trainers').onclick();
  end.saveNow();
  assert.equal(end.session().view, 'personal');
  assert.equal(hasVocab(end.session()), false);
  assert.equal(end.session().mode, 'ordered');
  console.log('BASELINE N-TAP-13 К тренажёрам closes the must sitting');

  const back = boot();
  back.window.TrainerCatalogBridge.launch('vocab:must');
  back.saveNow();
  const epoch = back.session().queueEpoch;
  const card = back.session().queue[back.session().position];
  back.window.QazaqShell.show('personal');
  back.window.TrainerCatalogBridge.launch('vocab:must');
  back.saveNow();
  assert.equal(back.session().queueEpoch, epoch);
  assert.equal(back.session().queue[back.session().position], card);
  assert.equal(back.session().view, 'practice');
  console.log('BASELINE words-catalog-back keeps the open must card');

  const boundaryFx = fixtures['must-boundary.json'];
  const boundary = boot(JSON.stringify({session: boundaryFx.session}));
  boundary.saveNow();
  const kept = boundary.session();
  assert.equal(kept.queueEpoch, boundaryFx.session.queueEpoch);
  assert.equal(kept.position, boundaryFx.session.position);
  assert.equal(kept.queue[kept.position], boundaryFx.session.queue[boundaryFx.session.position]);
  assert.equal(kept.sessionAttempts, boundaryFx.session.sessionAttempts);
  assert.equal(boundary.window.VocabMust.portionDone(kept.sessionAttempts, kept.vocab.plan.budget, kept.position, kept.queue.length), false);
  console.log('BASELINE must-boundary-pause restores the same portion');

  const trip = boot();
  trip.window.TrainerCatalogBridge.launch('vocab:must');
  trip.submit('неттакого');
  trip.saveNow();
  const tripBefore = trip.session();
  assert.equal(tripBefore.vocab.retry.kind, 'wrong');
  trip.window.QazaqShell.show('learn');
  trip.window.TrainerCatalogBridge.launch('vocab:must');
  trip.saveNow();
  const tripAfter = trip.session();
  assert.equal(tripAfter.vocab.retry.kind, 'wrong');
  assert.equal(tripAfter.vocab.retry.cardId, tripBefore.vocab.retry.cardId);
  assert.equal(tripAfter.queue[tripAfter.position], tripBefore.queue[tripBefore.position]);
  assert.equal(tripAfter.queueEpoch, tripBefore.queueEpoch);
  console.log('BASELINE must-retype-across-learn keeps the retype across a learn visit');

  let pulls = 0;
  const remote = boot(null, w => {
    w.QazaqCloud = {
      configured: true,
      user: null,
      async start() {},
      async pull() {
        pulls += 1;
        const live = JSON.parse(w.localStorage.getItem(KEY));
        live.records = live.records || {};
        live.records['nav-remote-marker'] = {navRemote: 1};
        return live;
      },
      async push() {},
      async login() {},
      async logout() {},
      async register() {}
    };
  });
  remote.window.TrainerCatalogBridge.launch('vocab:must');
  remote.makeEl('reveal-button').onclick();
  remote.saveNow();
  const remoteBefore = remote.session();
  assert.equal(remoteBefore.vocab.retry.kind, 'idk');
  const heard = Date.now() + 2000;
  while (!(remote.listeners['qazaq-cloud-user'] || []).length) {
    if (Date.now() > heard) throw new Error('qazaq-cloud-user listener was not registered');
    await sleep(10);
  }
  remote.window.QazaqCloud.user = {email: 'nav@example.com'};
  remote.window.dispatchEvent(new remote.window.CustomEvent('qazaq-cloud-user'));
  const applied = Date.now() + 2000;
  function remoteMarker() {
    const raw = remote.window.localStorage.getItem(KEY);
    const records = raw && JSON.parse(raw).records;
    return records && records['nav-remote-marker'];
  }
  while (pulls < 1 || !remoteMarker()) {
    if (Date.now() > applied) break;
    await sleep(10);
  }
  assert.equal(pulls, 1, 'pull count');
  assert.equal(remoteMarker() && remoteMarker().navRemote, 1, 'remote marker applied');
  const remoteAfter = remote.session();
  assert.ok(remoteAfter && remoteAfter.vocab && remoteAfter.vocab.retry);
  assert.equal(remoteAfter.vocab.retry.kind, 'idk');
  assert.equal(remoteAfter.vocab.retry.cardId, remoteBefore.vocab.retry.cardId);
  assert.equal(remoteAfter.queue[remoteAfter.position], remoteBefore.queue[remoteBefore.position]);
  console.log('BASELINE applyRemote-during-retry keeps the live idk retype');

  function stored(api) {
    return JSON.parse(api.window.localStorage.getItem(KEY));
  }
  function slotOf(api, key) {
    const resume = stored(api).navigationResume;
    assert.ok(resume && Object.prototype.hasOwnProperty.call(resume, 'slots'));
    assert.ok(Object.prototype.hasOwnProperty.call(resume.slots, key), key);
    return resume.slots[key];
  }
  function answerEvents(raw) {
    return (raw.events || []).filter(event => event && event.type === 'answer');
  }

  const pause = boot(JSON.stringify({session: practice}));
  pause.saveNow();
  const pauseEpoch = pause.session().queueEpoch;
  const pauseEvents = answerEvents(stored(pause)).length;
  const pauseRecordIds = Object.keys(stored(pause).records);
  pause.window.QazaqShell.show('personal');
  const parkedPractice = slotOf(pause, 'queue:ordered:sounds');
  assert.equal(parkedPractice.status, 'paused');
  assert.equal(parkedPractice.snapshot.kind, 'session');
  assert.equal(parkedPractice.snapshot.session.queue[0], 'm1-1-1');
  assert.equal(parkedPractice.snapshot.session.queueEpoch, pauseEpoch);
  assert.equal(parkedPractice.snapshot.session.draft.exerciseId, 'm1-1-1');
  pause.window.TrainerCatalogBridge.launch('vocab:must');
  pause.saveNow();
  const mustSide = pause.session();
  assert.equal(mustSide.mode, 'words');
  assert.equal(mustSide.trainerReturn, 'vocab:must');
  const mustCard = mustSide.queue[mustSide.position];
  const shown = stored(pause).records[mustCard];
  assert.ok(shown, 'must launch writes the existing shown record');
  assert.equal(shown.seen, 1);
  assert.equal(shown.attempts, 1);
  assert.equal(shown.fsrs, null);
  assert.equal(answerEvents(stored(pause)).length, pauseEvents);
  const addedIds = Object.keys(stored(pause).records).filter(id => !pauseRecordIds.includes(id));
  assert.deepEqual(addedIds, [mustCard]);
  assert.equal(pause.window.QazaqShell.restore('queue:ordered:sounds'), 'ok');
  pause.saveNow();
  const restoredPractice = pause.session();
  assert.equal(restoredPractice.mode, 'ordered');
  assert.equal(restoredPractice.topic, 'sounds');
  assert.equal(restoredPractice.view, 'practice');
  assert.equal(restoredPractice.queue[0], 'm1-1-1');
  assert.equal(restoredPractice.position, 0);
  assert.equal(restoredPractice.queueEpoch, pauseEpoch);
  assert.equal(restoredPractice.trainerReturn, null);
  assert.equal(restoredPractice.vocabRole, null);
  assert.equal(restoredPractice.draft.exerciseId, 'm1-1-1');
  assert.equal(answerEvents(stored(pause)).length, pauseEvents);
  assert.deepEqual(Object.keys(stored(pause).records).filter(id => !pauseRecordIds.includes(id)), [mustCard]);
  console.log('BASELINE course-pause-must-course restores queue:ordered:sounds; allowed change is the must shown record');

  const trio = boot();
  trio.window.QazaqShell.openPath('1-1');
  const trioInput = trio.makeEl('path-answer');
  trioInput.value = 'trio-draft';
  trioInput.dataset.lesson = '1-1';
  trioInput.dataset.chapter = '';
  trioInput.dataset.beat = '0';
  trio.window.QazaqShell.startCourse('2-2');
  trio.saveNow();
  assert.equal(trio.session().mode, 'course');
  assert.equal(trio.session().courseBlock, '2-2');
  assert.equal(trio.session().queue[0], 'p2b-22-g1-dos');
  const courseEpoch = trio.session().queueEpoch;
  const courseCard = trio.session().queue[0];
  const coursePos = trio.session().position;
  trio.window.TrainerCatalogBridge.launch('vocab:must');
  trio.saveNow();
  const trioMust = trio.session();
  assert.equal(trioMust.mode, 'words');
  const trioMustEpoch = trioMust.queueEpoch;
  const trioMustCard = trioMust.queue[trioMust.position];
  assert.equal(slotOf(trio, 'theory:1-1').snapshot.kind, 'ref');
  assert.equal(slotOf(trio, 'theory:1-1').snapshot.store, 'path');
  assert.equal(slotOf(trio, 'course:2-2').snapshot.kind, 'ref');
  assert.equal(slotOf(trio, 'course:2-2').snapshot.store, 'practiceSession');
  const reloaded = boot(trio.window.localStorage.getItem(KEY));
  reloaded.saveNow();
  assert.equal(reloaded.session().mode, 'words');
  assert.equal(reloaded.session().queueEpoch, trioMustEpoch);
  assert.equal(reloaded.session().queue[reloaded.session().position], trioMustCard);
  assert.equal(reloaded.window.QazaqShell.restore('course:2-2'), 'ok');
  reloaded.saveNow();
  assert.equal(reloaded.session().mode, 'course');
  assert.equal(reloaded.session().courseBlock, '2-2');
  assert.equal(reloaded.session().queueEpoch, courseEpoch);
  assert.equal(reloaded.session().queue[0], courseCard);
  assert.equal(reloaded.session().position, coursePos);
  assert.equal(reloaded.session().vocabRole, null);
  assert.equal(reloaded.session().trainerReturn, null);
  assert.equal(reloaded.window.QazaqShell.restore('theory:1-1'), 'ok');
  reloaded.saveNow();
  assert.equal(reloaded.session().view, 'path');
  assert.equal(stored(reloaded).grammarPath.lessonId, '1-1');
  assert.equal(stored(reloaded).grammarPath.pathDraft.value, 'trio-draft');
  assert.equal(stored(reloaded).grammarPath.beat, 0);
  console.log('BASELINE reload-three-sessions restores must, course:2-2 and theory:1-1');

  console.log('VERIFY_NAVIGATION_CONTRACT_OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
