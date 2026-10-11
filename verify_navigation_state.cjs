'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const FIX = path.join(ROOT, 'fixtures', 'navigation');
const NOW = 1700000000000;
const P = require('./progress.js');
const cfg = require('./config.js');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
}
function canon(value) {
  return JSON.parse(JSON.stringify(value));
}
function scrub(value) {
  const copy = canon(value);
  delete copy.exported_at;
  const migrations = copy.evidence && copy.evidence.migrations;
  if (migrations) for (const marker of Object.values(migrations)) if (marker && typeof marker.at === 'number') marker.at = 0;
  return copy;
}

const clean = load('clean.json');
assert.equal(clean.app, 'qazaq-trainer');
assert.equal(clean.schema, 7);
assert.equal(clean.policy_version, cfg.version);
assert.equal(clean.scheduler_config.implementation, cfg.algorithm);
assert.equal(clean.scheduler_config.desired_retention, cfg.fsrs.desired_retention);
assert.equal(clean.scheduler_config.standard_weights, true);
assert.equal(clean.session, null);
const fromClean = P.migrate(clean, NOW);
assert.equal(fromClean.schema, 7);
const fresh = P.migrate(P.empty(), NOW);
assert.equal(fresh.schema, 7);
assert.deepEqual(scrub(fromClean), scrub(fresh));
const cleanAgain = P.migrate(JSON.parse(P.serialize(fromClean)), NOW);
assert.equal(cleanAgain.schema, 7);
assert.deepEqual(scrub(cleanAgain), scrub(fromClean));
console.log('BASELINE clean migrate keeps schema 7');

const theory = load('theory-draft.json');
assert.equal(theory.schema, 7);
const theoryOnce = P.migrate(theory, NOW);
assert.equal(theoryOnce.grammarPath.lessonId, '1-1');
assert.equal(theoryOnce.grammarPath.beat, 0);
assert.deepEqual(theoryOnce.grammarPath.pathDraft, {lessonId: '1-1', chapterId: null, beat: 0, value: 'nav00-draft'});
assert.equal(/secret|password|token|api[_-]?key|@/.test(theoryOnce.grammarPath.pathDraft.value), false);
const theoryTwice = P.migrate(JSON.parse(P.serialize(theoryOnce)), NOW);
assert.deepEqual(theoryTwice.grammarPath.pathDraft, theoryOnce.grammarPath.pathDraft);
assert.equal(theoryTwice.grammarPath.lessonId, '1-1');
assert.equal(theoryTwice.grammarPath.beat, 0);
console.log('BASELINE theory draft survives migrate');

const mid = load('practice-mid.json');
assert.deepEqual(Object.keys(mid).sort(), ['activeLesson', 'activeStep', 'answered', 'courseBlock', 'draft', 'elapsed_ms', 'hinted', 'hwLesson', 'hwPart', 'hwSection', 'mode', 'pathPracticeReturn', 'position', 'practiceIds', 'presented', 'queue', 'queueEpoch', 'remediation', 'sessionAssisted', 'sessionAttempts', 'sessionCorrect', 'sessionOrigin', 'sourceFilter', 'stageContext', 'stepEvidence', 'topic', 'trainerEpoch', 'trainerReturn', 'variants', 'view'].sort());
assert.equal(mid.queue[0], 'm1-1-1');
assert.equal(mid.draft.exerciseId, 'm1-1-1');
const data = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
assert.ok(data.includes('"id":"m1-1-1"'), 'm1-1-1 must be a real course id');
const kept = P.migrate({records: {}, session: mid}, NOW);
assert.deepEqual(canon(kept.session), canon(mid));
console.log('RESOLVED practice-mid id m1-1-1 from data.js; session preserved by migrate');

const bad = load('practice-incompatible.json');
assert.ok(bad.queue.includes('missing-question-nav00'));
assert.equal(data.includes('missing-question-nav00'), false);
const keptBad = P.migrate({records: {}, session: bad}, NOW);
assert.deepEqual(keptBad.session.queue, bad.queue);
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert.match(app, /savedSession\.queue\.every\(id=>byId\.has\(id\)\)/);
console.log('INCOMPATIBLE missing-question-nav00 recorded by migrate, not fixed. validSaved still rejects unknown ids.');

const merged = P.merge(P.migrate({records: {}, session: mid}, NOW), P.migrate({records: {}, session: Object.assign({}, mid, {position: 1})}, NOW));
assert.equal(merged.session, null);
assert.match(fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'), /out\.session=null;/);
console.log('BASELINE merge clears session');

const {boot, sleep} = require('./tools/capture_nav_must_fixtures.js');
const MUST_NAMES = ['must-first-show.json', 'must-idk.json', 'must-wrong.json', 'must-boundary.json', 'must-summary.json'];

function hasVocab(session) {
  return !!session && Object.prototype.hasOwnProperty.call(session, 'vocab');
}
function cardId(session) {
  return session.queue[session.position];
}
function normVocab(v) {
  const plan = v && v.plan || {};
  const sitting = v && v.sitting || {};
  return {
    plan: {budget: plan.budget, nNew: plan.nNew, baseLen: plan.baseLen, newLemmas: plan.newLemmas || [], debt: plan.debt},
    sitting: {
      startedAt: sitting.startedAt,
      sessions: sitting.sessions || [],
      newLemmas: sitting.newLemmas || [],
      answers: sitting.answers,
      shown: sitting.shown || [],
      recent: sitting.recent || [],
      legacy: sitting.legacy
    },
    retry: v.retry,
    closed: v.closed || [],
    unaided: v.unaided || {},
    blindFails: v.blindFails || {},
    nearMiss: v.nearMiss
  };
}
// v6 format of session.vocab as written by save() -> VocabMust.snapshot() (vocab-must.js) and of session.draft
// (app.js captureDraft). Presence is checked with hasOwnProperty before any comparison, so a field that save()
// stops writing fails here instead of being filled back in by a default.
const V6_VOCAB_KEYS = ['plan', 'sitting', 'retry', 'closed', 'unaided', 'blindFails', 'nearMiss'];
const V6_PLAN_KEYS = ['budget', 'nNew', 'baseLen', 'newLemmas', 'debt'];
const V6_SITTING_KEYS = ['startedAt', 'sessions', 'newLemmas', 'answers', 'shown', 'recent', 'legacy'];
const V6_DRAFT_KEYS = ['token', 'exerciseId', 'answers'];
function own(obj, key) {
  return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}
function assertKeys(obj, keys, label) {
  assert.ok(obj && typeof obj === 'object' && !Array.isArray(obj), label + ' is an object');
  for (const key of keys) assert.ok(own(obj, key), label + ' missing ' + key);
  assert.deepEqual(Object.keys(obj).sort(), keys.slice().sort(), label + ' keys');
}
function assertV6Vocab(v, label) {
  assertKeys(v, V6_VOCAB_KEYS, label + ' vocab');
  assertKeys(v.plan, V6_PLAN_KEYS, label + ' vocab.plan');
  assertKeys(v.sitting, V6_SITTING_KEYS, label + ' vocab.sitting');
  for (const key of ['closed']) assert.ok(Array.isArray(v[key]), label + ' vocab.' + key + ' array');
  for (const key of ['unaided', 'blindFails']) assert.ok(v[key] && typeof v[key] === 'object' && !Array.isArray(v[key]), label + ' vocab.' + key + ' object');
  assert.ok(Array.isArray(v.plan.newLemmas), label + ' vocab.plan.newLemmas array');
  for (const key of ['sessions', 'newLemmas', 'shown', 'recent']) assert.ok(Array.isArray(v.sitting[key]), label + ' vocab.sitting.' + key + ' array');
}
function assertV6Draft(d, label) {
  assertKeys(d, V6_DRAFT_KEYS, label + ' draft');
  assert.ok(Array.isArray(d.answers), label + ' draft.answers array');
}
function normDraft(d) {
  if (!d) return null;
  return {token: d.token, exerciseId: d.exerciseId, answers: d.answers || []};
}
function previousAnswer(api, session) {
  if (!session || session.position < 1) return null;
  return api.answerOf(api.cardOf({queue: session.queue, position: session.position - 1}));
}
function draftLeaked(draft, answer) {
  if (!answer) return false;
  return ((draft && draft.answers) || []).some(item => item === answer);
}

(async () => {
  const fixtures = {};
  for (const name of MUST_NAMES) {
    const fixture = load(name);
    assert.equal(Object.prototype.hasOwnProperty.call(fixture, 'fixtureStatus'), false, name);
    assert.equal(Object.prototype.hasOwnProperty.call(fixture, 'structural'), false, name);
    assert.equal(fixture.capturedBy, 'tools/capture_nav_must_fixtures.js', name);
    assert.match(fixture.capturedFrom, /^[0-9a-f]{40}$/, name);
    assert.equal(fixture.session.mode, 'words', name);
    assert.equal(fixture.session.trainerReturn, 'vocab:must', name);
    assert.equal(fixture.session.vocabRole, 'must', name);
    assert.equal(fixture.session.topic, 'vocab', name);
    assert.ok(fixture.session.vocab && fixture.session.vocab.plan && fixture.session.vocab.sitting, name);
    assertV6Vocab(fixture.session.vocab, name + ' fixture');
    assertV6Draft(fixture.session.draft, name + ' fixture');
    assert.equal(fixture.session.vocab.nearMiss, null, name);
    assert.equal(fixture.session.vocab.sitting.legacy, null, name);
    assert.ok(fixture.session.vocab.sitting.shown.length > 0, name);
    assert.equal(Object.prototype.hasOwnProperty.call(fixture.session, 'vocabSummary'), false, name);
    assert.equal(String(fixture.session.queue[0]).includes('structural'), false, name);
    fixtures[name] = fixture;
    console.log('BASELINE', name, fixture.scene, 'card', cardId(fixture.session));
  }
  assert.equal(fixtures['must-first-show.json'].session.vocab.retry, null);
  assert.equal(fixtures['must-idk.json'].session.vocab.retry.kind, 'idk');
  assert.equal(fixtures['must-idk.json'].session.hinted, true);
  assert.equal(fixtures['must-idk.json'].session.sessionAttempts, 0);
  assert.equal(fixtures['must-wrong.json'].session.vocab.retry.kind, 'wrong');
  assert.equal(fixtures['must-wrong.json'].session.hinted, false);
  assert.equal(fixtures['must-wrong.json'].session.sessionAttempts, 0);
  const boundary = fixtures['must-boundary.json'].session;
  assert.equal(boundary.position, boundary.queue.length - 1);
  assert.ok(boundary.sessionAttempts < boundary.vocab.plan.budget);
  assert.equal(boundary.vocab.retry, null);

  const live = boot();
  live.window.TrainerCatalogBridge.launch('vocab:must');
  live.saveNow();
  const saved = live.session();
  assert.equal(saved.mode, 'words');
  assert.equal(saved.trainerReturn, 'vocab:must');
  assert.equal(saved.vocabRole, 'must');
  assert.equal(hasVocab(saved), true);
  assert.ok(saved.vocab.plan && saved.vocab.sitting);
  assertV6Vocab(saved.vocab, 'live save()');
  assert.equal(saved.vocab.nearMiss, null);
  assert.equal(saved.vocab.sitting.legacy, null);
  assert.ok(saved.vocab.sitting.shown.length > 0);
  assert.equal(saved.queueEpoch, saved.trainerEpoch);
  console.log('BASELINE must save() writes session.vocab');

  const plain = boot();
  plain.saveNow();
  assert.equal(hasVocab(plain.session()), false);
  assert.notEqual(plain.session().mode, 'words');
  console.log('BASELINE non-must save() omits session.vocab');

  const midLive = boot(JSON.stringify({session: mid}));
  midLive.saveNow();
  const midSaved = midLive.session();
  assert.equal(hasVocab(midSaved), false);
  assert.equal(midSaved.mode, 'ordered');
  assert.equal(midSaved.queue[0], 'm1-1-1');
  console.log('BASELINE practice-mid restore still omits session.vocab');

  for (const name of MUST_NAMES) {
    const fixture = fixtures[name];
    const again = boot(JSON.stringify({session: fixture.session}));
    again.saveNow();
    const got = again.session();
    assert.equal(got.mode, 'words', name);
    assert.equal(got.trainerReturn, 'vocab:must', name);
    assert.equal(cardId(got), cardId(fixture.session), name + ' card');
    assert.equal(got.position, fixture.session.position, name + ' position');
    assert.equal(got.sessionAttempts, fixture.session.sessionAttempts, name + ' attempts');
    assert.equal(got.queueEpoch, fixture.session.queueEpoch, name + ' epoch');
    assert.equal(got.queue.length, fixture.session.queue.length, name + ' queue');
    const prevAnswer = previousAnswer(again, fixture.session);
    assert.equal(draftLeaked(fixture.session.draft, prevAnswer), false, name + ' fixture draft leaked ' + prevAnswer);
    assert.equal(draftLeaked(got.draft, prevAnswer), false, name + ' restored draft leaked ' + prevAnswer);
    assertV6Vocab(got.vocab, name + ' restored');
    assertV6Draft(got.draft, name + ' restored');
    assert.deepEqual(normVocab(got.vocab), normVocab(fixture.session.vocab), name + ' vocab');
    assert.deepEqual(canon(got.vocab), canon(fixture.session.vocab), name + ' vocab exact');
    const retry = fixture.session.vocab.retry;
    if (retry && retry.kind === 'wrong') {
      assert.deepEqual(fixture.session.draft.answers, retry.typed, name + ' typed answer is on the capture');
      assert.deepEqual((got.draft && got.draft.answers) || [], retry.typed.map(() => ''), name + ' restore clears the field');
      assert.equal(got.draft && got.draft.exerciseId, fixture.session.draft.exerciseId, name + ' draft card');
    } else {
      assert.deepEqual(normDraft(got.draft), normDraft(fixture.session.draft), name + ' draft');
      assert.deepEqual(canon(got.draft), canon(fixture.session.draft), name + ' draft exact');
    }
    assert.equal(again.window.VocabMust.portionDone(got.sessionAttempts, got.vocab.plan.budget, got.position, got.queue.length), false, name + ' portion rolled');
    console.log('BASELINE restore', name);
  }

  const walked = boot();
  walked.window.TrainerCatalogBridge.launch('vocab:must');
  for (let i = 0; i < 2; i++) {
    walked.saveNow();
    const step = walked.session();
    const answer = walked.answerOf(walked.cardOf(step));
    assert.ok(answer, 'walk card has an answer');
    walked.submit(answer);
    await sleep(700);
  }
  walked.saveNow();
  const walkedSession = walked.session();
  assert.ok(walkedSession.position > 0, 'walk left the first card');
  const walkedPrev = previousAnswer(walked, walkedSession);
  assert.equal(draftLeaked(walkedSession.draft, walkedPrev), false, 'live draft leaked previous answer ' + walkedPrev);
  console.log('BASELINE current draft is not the previous card answer');

  const leave = boot();
  leave.window.TrainerCatalogBridge.launch('vocab:must');
  leave.saveNow();
  const beforeEvents = JSON.parse(leave.window.localStorage.getItem('qazaq-kris-course-v1')).events.length;
  leave.makeEl('vocab-finish').onclick();
  leave.window.QazaqShell.show('vocabulary');
  leave.saveNow();
  const afterEvents = JSON.parse(leave.window.localStorage.getItem('qazaq-kris-course-v1')).events;
  assert.equal(afterEvents.length, beforeEvents);
  assert.equal(afterEvents.filter(e => e && (e.hint_kind === 'reference' || e.type === 'hint')).length, 0);
  console.log('BASELINE open summary leave writes no hint');

  const once = boot();
  once.window.TrainerCatalogBridge.launch('vocab:must');
  once.saveNow();
  const holdCard = cardId(once.session());
  once.makeEl('vocab-finish').onclick();
  once.makeEl('vocab-summary-continue').onclick();
  once.makeEl('hint-button').onclick();
  once.window.QazaqShell.show('vocabulary');
  once.window.QazaqShell.show('practice');
  once.saveNow();
  assert.equal(once.session().hinted, true);
  assert.equal(cardId(once.session()), holdCard);
  console.log('BASELINE continue consumes the one-shot hold; a later hint stays');

  const auto = boot();
  auto.window.TrainerCatalogBridge.launch('vocab:must');
  auto.saveNow();
  const autoCard = auto.cardOf(auto.session());
  const autoAnswer = auto.answerOf(autoCard);
  assert.ok(autoAnswer, 'first card has an answer');
  auto.submit(autoAnswer);
  auto.makeEl('vocab-finish').onclick();
  auto.makeEl('vocab-summary-continue').onclick();
  await sleep(1000);
  auto.saveNow();
  const autoSaved = auto.session();
  assert.equal(autoSaved.position, 1);
  assert.equal(autoSaved.sessionAttempts, 1);
  assert.notEqual(cardId(autoSaved), autoCard.id);
  assert.equal(hasVocab(autoSaved), true);
  console.log('BASELINE continue restarts the scheduled advance');

  const rev = live.window.COURSE.questions.find(q => /-kk-rev$/.test(q.id) && q.wordRole === 'must');
  assert.ok(rev, 'must -kk-rev card');
  assert.equal(live.window.TrainerCore.answerLang(rev, 0), 'ru');
  console.log('BASELINE', rev.id, 'answerLang ru');

  console.log('VERIFY_NAVIGATION_STATE_OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
