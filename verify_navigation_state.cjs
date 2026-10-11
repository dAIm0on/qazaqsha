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
assert.equal(Object.keys(fromClean.navigationResume.slots).length, 0);
assert.equal(Object.keys(theoryOnce.navigationResume.slots).length, 0);
const legacySlot = kept.navigationResume.slots['queue:ordered:sounds'];
assert.ok(legacySlot);
assert.equal(legacySlot.status, 'paused');
assert.equal(legacySlot.origin, 'legacy-once');
assert.equal(legacySlot.updatedAt, 0);
assert.equal(Object.prototype.hasOwnProperty.call(legacySlot.snapshot, 'kind'), true);
assert.equal(legacySlot.snapshot.kind, 'session');
assert.deepEqual(canon(legacySlot.snapshot.session), canon(mid));
console.log('RESOLVED practice-mid id m1-1-1 from data.js; session preserved by migrate; legacy slot seeded once');

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

const {boot, sleep, KEY} = require('./tools/capture_nav_must_fixtures.js');
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

  function stored(api) {
    return JSON.parse(api.window.localStorage.getItem(KEY));
  }
  function slotOf(api, key) {
    const resume = stored(api).navigationResume;
    assert.ok(resume && Object.prototype.hasOwnProperty.call(resume.slots, key), key);
    return resume.slots[key];
  }
  function answerEvents(raw) {
    return (raw.events || []).filter(event => event && event.type === 'answer');
  }
  function recordIds(raw) {
    return Object.keys(raw.records || {}).sort();
  }

  const course = boot();
  course.window.QazaqShell.startCourse('2-2');
  course.saveNow();
  const courseBefore = course.session();
  assert.equal(courseBefore.mode, 'course');
  assert.equal(courseBefore.topic, 'all');
  assert.equal(courseBefore.courseBlock, '2-2');
  assert.equal(courseBefore.queue[0], 'p2b-22-g1-dos');
  const courseEpoch = courseBefore.queueEpoch;
  const coursePos = courseBefore.position;
  const courseEvents = answerEvents(stored(course)).length;
  const courseRecords = recordIds(stored(course));
  course.window.TrainerCatalogBridge.launch('vocab:must');
  course.saveNow();
  const coursePark = slotOf(course, 'course:2-2');
  assert.equal(coursePark.status, 'paused');
  assert.equal(coursePark.snapshot.kind, 'ref');
  assert.equal(coursePark.snapshot.store, 'practiceSession');
  assert.equal(coursePark.snapshot.lessonId, '2-2');
  const courseMustCard = course.session().queue[course.session().position];
  const courseShown = stored(course).records[courseMustCard];
  assert.ok(courseShown);
  assert.equal(courseShown.seen, 1);
  assert.equal(courseShown.attempts, 1);
  assert.equal(courseShown.fsrs, null);
  assert.equal(answerEvents(stored(course)).length, courseEvents);
  course.window.QazaqShell.startCourse('2-2');
  course.saveNow();
  const courseAfter = course.session();
  assert.equal(courseAfter.mode, 'course');
  assert.equal(courseAfter.queueEpoch, courseEpoch);
  assert.equal(courseAfter.queue[0], 'p2b-22-g1-dos');
  assert.equal(courseAfter.position, coursePos);
  assert.equal(courseAfter.vocabRole, null);
  assert.equal(courseAfter.trainerReturn, null);
  assert.equal(answerEvents(stored(course)).length, courseEvents);
  const courseAdded = recordIds(stored(course)).filter(id => !courseRecords.includes(id));
  assert.ok(courseAdded.includes(courseMustCard));
  for (const id of courseAdded) {
    const rec = stored(course).records[id];
    assert.equal(Object.prototype.hasOwnProperty.call(stored(course).records, id), true, id);
    assert.equal(rec.fsrs, null, id);
    if (id === courseMustCard) {
      assert.equal(rec.seen, 1, id);
      assert.equal(rec.attempts, 1, id);
    } else {
      assert.equal(rec.seen, 0, id);
      assert.equal(rec.attempts, 0, id);
      assert.equal(rec.last_shown, null, id);
    }
  }
  console.log('N-STATE course pause then must then course keeps course:2-2');

  const wrong = boot();
  wrong.window.TrainerCatalogBridge.launch('vocab:must');
  wrong.submit('неттакого');
  wrong.saveNow();
  const wrongBefore = wrong.session();
  assert.equal(wrongBefore.vocab.retry.kind, 'wrong');
  const wrongRetry = canon(wrongBefore.vocab.retry);
  const wrongSitting = canon(wrongBefore.vocab.sitting);
  const wrongPlan = canon(wrongBefore.vocab.plan);
  const wrongEvents = answerEvents(stored(wrong));
  assert.equal(wrongEvents.length, 1);
  assert.equal(wrongEvents[0].card_id, wrongBefore.queue[wrongBefore.position]);
  assert.equal(wrongEvents[0].correct, false);
  wrong.window.QazaqShell.startCourse('2-2');
  wrong.saveNow();
  assert.equal(slotOf(wrong, 'vocab:must').status, 'paused');
  assert.equal(slotOf(wrong, 'vocab:must').snapshot.kind, 'session');
  assert.equal(slotOf(wrong, 'vocab:must').snapshot.session.vocab.retry.kind, 'wrong');
  wrong.window.TrainerCatalogBridge.launch('vocab:must');
  wrong.saveNow();
  const wrongAfter = wrong.session();
  assert.equal(wrongAfter.queueEpoch, wrongBefore.queueEpoch);
  assert.equal(wrongAfter.trainerEpoch, wrongBefore.trainerEpoch);
  assert.deepEqual(canon(wrongAfter.vocab.retry), wrongRetry);
  assert.deepEqual(canon(wrongAfter.vocab.sitting), wrongSitting);
  assert.deepEqual(canon(wrongAfter.vocab.plan), wrongPlan);
  const wrongEventsAfter = answerEvents(stored(wrong));
  assert.equal(wrongEventsAfter.length, 1);
  assert.equal(wrongEventsAfter[0].card_id, wrongEvents[0].card_id);
  assert.equal(wrongEventsAfter[0].at, wrongEvents[0].at);
  console.log('N-STATE must wrong then course then must keeps the same retry');

  const theoryLive = boot();
  theoryLive.window.QazaqShell.openPath('1-1');
  const theoryInput = theoryLive.makeEl('path-answer');
  theoryInput.value = 'nav02-draft';
  theoryInput.dataset.lesson = '1-1';
  theoryInput.dataset.chapter = '';
  theoryInput.dataset.beat = '0';
  theoryLive.saveNow();
  const theoryEvidence = canon(stored(theoryLive).evidence);
  const theoryChapters = canon(stored(theoryLive).grammarPath.completedChapters);
  const theoryEvents = answerEvents(stored(theoryLive)).length;
  theoryLive.window.QazaqShell.startCourse('1-1');
  theoryLive.saveNow();
  theoryLive.window.TrainerCatalogBridge.launch('vocab:must');
  theoryLive.saveNow();
  assert.equal(slotOf(theoryLive, 'theory:1-1').status, 'paused');
  assert.equal(slotOf(theoryLive, 'theory:1-1').snapshot.kind, 'ref');
  assert.equal(slotOf(theoryLive, 'theory:1-1').snapshot.store, 'path');
  assert.equal(theoryLive.window.QazaqShell.restore('theory:1-1'), 'ok');
  theoryLive.saveNow();
  const theoryPath = stored(theoryLive).grammarPath;
  assert.equal(theoryLive.session().view, 'path');
  assert.equal(theoryPath.lessonId, '1-1');
  assert.equal(theoryPath.chapterId, null);
  assert.equal(theoryPath.beat, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(theoryPath, 'pathDraft'), true);
  assert.equal(theoryPath.pathDraft.value, 'nav02-draft');
  assert.deepEqual(canon(theoryPath.completedChapters), theoryChapters);
  assert.deepEqual(canon(stored(theoryLive).evidence), theoryEvidence);
  assert.equal(answerEvents(stored(theoryLive)).length, theoryEvents);
  console.log('N-STATE theory then practice then words then theory keeps the draft');

  const catalog = boot();
  catalog.window.TrainerCatalogBridge.launch('vocab:must');
  catalog.makeEl('answer-0').value = 'черновик';
  catalog.saveNow();
  const catalogEpoch = catalog.session().queueEpoch;
  const catalogCard = cardId(catalog.session());
  const catalogEvents = answerEvents(stored(catalog)).length;
  catalog.window.QazaqShell.show('personal');
  catalog.window.QazaqShell.show('rules');
  assert.equal(slotOf(catalog, 'vocab:must').status, 'paused');
  assert.equal(slotOf(catalog, 'vocab:must').snapshot.session.draft.answers[0], 'черновик');
  catalog.window.TrainerCatalogBridge.launch('vocab:must');
  catalog.saveNow();
  assert.equal(catalog.session().queueEpoch, catalogEpoch);
  assert.equal(cardId(catalog.session()), catalogCard);
  assert.equal(catalog.session().draft.answers[0], 'черновик');
  assert.equal(answerEvents(stored(catalog)).length, catalogEvents);
  console.log('N-STATE words then catalog then rules keeps the draft and writes no answer');

  const boundaryLive = boot(JSON.stringify({session: fixtures['must-boundary.json'].session}));
  boundaryLive.saveNow();
  const boundaryEpoch = boundaryLive.session().queueEpoch;
  const boundaryPos = boundaryLive.session().position;
  const boundaryEvents = answerEvents(stored(boundaryLive)).length;
  boundaryLive.window.QazaqShell.show('personal');
  const boundaryAgain = boot(boundaryLive.window.localStorage.getItem(KEY));
  boundaryAgain.saveNow();
  assert.equal(boundaryAgain.session().queueEpoch, boundaryEpoch);
  assert.equal(boundaryAgain.session().position, boundaryPos);
  assert.equal(boundaryAgain.window.VocabMust.portionDone(boundaryAgain.session().sessionAttempts, boundaryAgain.session().vocab.plan.budget, boundaryAgain.session().position, boundaryAgain.session().queue.length), false);
  assert.equal(answerEvents(stored(boundaryAgain)).length, boundaryEvents);
  console.log('N-STATE must boundary pause and reload does not roll the portion');

  const tomb = boot();
  tomb.window.TrainerCatalogBridge.launch('vocab:must');
  tomb.saveNow();
  const tombEpoch = tomb.session().queueEpoch;
  const tombRecords = recordIds(stored(tomb));
  tomb.makeEl('vocab-finish').onclick();
  tomb.makeEl('vocab-summary-trainers').onclick();
  tomb.saveNow();
  assert.equal(slotOf(tomb, 'vocab:must').status, 'closed');
  assert.equal(Object.prototype.hasOwnProperty.call(slotOf(tomb, 'vocab:must'), 'snapshot'), false);
  assert.equal(tomb.session().view, 'personal');
  assert.equal(hasVocab(tomb.session()), false);
  tomb.window.TrainerCatalogBridge.launch('vocab:must');
  tomb.saveNow();
  assert.notEqual(tomb.session().queueEpoch, tombEpoch);
  assert.equal(tomb.session().mode, 'words');
  assert.equal(slotOf(tomb, 'vocab:must').status, 'paused');
  assert.equal(slotOf(tomb, 'vocab:must').origin, 'launch');
  for (const id of tombRecords) assert.ok(Object.prototype.hasOwnProperty.call(stored(tomb).records, id), id);
  console.log('N-STATE tombstone is not restored; the next launch is a new epoch');

  const three = boot();
  three.window.QazaqShell.openPath('1-1');
  const threeInput = three.makeEl('path-answer');
  threeInput.value = 'three-draft';
  threeInput.dataset.lesson = '1-1';
  threeInput.dataset.chapter = '';
  threeInput.dataset.beat = '0';
  three.window.QazaqShell.startCourse('2-2');
  three.saveNow();
  const threeCourseEpoch = three.session().queueEpoch;
  three.window.TrainerCatalogBridge.launch('vocab:must');
  three.saveNow();
  const threeMustEpoch = three.session().queueEpoch;
  const threeReloaded = boot(three.window.localStorage.getItem(KEY));
  threeReloaded.saveNow();
  assert.equal(threeReloaded.session().mode, 'words');
  assert.equal(threeReloaded.session().queueEpoch, threeMustEpoch);
  assert.equal(threeReloaded.window.QazaqShell.restore('course:2-2'), 'ok');
  assert.equal(threeReloaded.session().queueEpoch, threeCourseEpoch);
  assert.equal(threeReloaded.session().queue[0], 'p2b-22-g1-dos');
  assert.equal(threeReloaded.window.QazaqShell.restore('theory:1-1'), 'ok');
  assert.equal(stored(threeReloaded).grammarPath.pathDraft.value, 'three-draft');
  console.log('N-STATE reload restores the three parked sessions');

  const incompatible = boot(JSON.stringify({session: bad}));
  incompatible.saveNow();
  assert.deepEqual(stored(incompatible).session.queue, bad.queue);
  assert.equal(slotOf(incompatible, 'queue:ordered:sounds').origin, 'incompatible');
  assert.equal(slotOf(incompatible, 'queue:ordered:sounds').status, 'paused');
  assert.ok(String(incompatible.makeEl('exercise').innerHTML).includes('Сохранённая очередь на месте'));
  assert.ok(String(incompatible.makeEl('exercise').innerHTML).includes('missing-question-nav00'));
  console.log('N-STATE incompatible snapshot is kept and diagnosed');

  const NS = require('./navigation-state.js');
  const localNav = P.migrate({records: {}}, NOW);
  NS.put(localNav, 'vocab:must', {status: 'closed', updatedAt: 5, origin: 'close', snapshot: {kind: 'session', session: {mode: 'words', queue: ['a'], position: 0}}});
  NS.put(localNav, 'queue:ordered:sounds', {status: 'paused', updatedAt: 4, origin: 'local', snapshot: {kind: 'session', session: canon(mid)}});
  const incomingNav = P.migrate({records: {}}, NOW);
  NS.put(incomingNav, 'vocab:must', {status: 'paused', updatedAt: 9, origin: 'cloud', snapshot: {kind: 'session', session: {mode: 'words', queue: ['other'], position: 0}}});
  NS.put(incomingNav, 'course:1-1', {status: 'paused', updatedAt: 3, origin: 'cloud', snapshot: {kind: 'ref', store: 'practiceSession', lessonId: '1-1'}});
  const mergedNav = P.merge(localNav, incomingNav);
  assert.equal(mergedNav.session, null);
  assert.equal(mergedNav.navigationResume.slots['vocab:must'].status, 'closed');
  assert.equal(mergedNav.navigationResume.slots['queue:ordered:sounds'].origin, 'local');
  assert.equal(mergedNav.navigationResume.slots['course:1-1'].snapshot.lessonId, '1-1');
  const chosenNav = P.migrate({records: {}, navigationResume: incomingNav.navigationResume}, NOW);
  assert.equal(chosenNav.navigationResume.slots['course:1-1'].snapshot.store, 'practiceSession');
  assert.equal(Object.prototype.hasOwnProperty.call(chosenNav.navigationResume.slots, 'vocab:must'), true);
  const mergedAgain = P.merge(mergedNav, chosenNav);
  assert.equal(mergedAgain.navigationResume.slots['vocab:must'].status, 'closed');
  assert.equal(mergedAgain.navigationResume.slots['queue:ordered:sounds'].origin, 'local');
  console.log('N-STATE import merge keeps the local slot and accepts a missing one');

  let remotePulls = 0;
  const remoteNav = boot(null, w => {
    w.QazaqCloud = {
      configured: true,
      user: null,
      async start() {},
      async pull() {
        remotePulls += 1;
        const live = JSON.parse(w.localStorage.getItem(KEY));
        live.session = {mode: 'ordered', queue: ['m1-1-1'], position: 0, queueEpoch: 1};
        live.navigationResume.slots['vocab:must'] = {status: 'paused', updatedAt: 1, origin: 'cloud', snapshot: {kind: 'session', session: {mode: 'words', queue: ['other'], position: 3, queueEpoch: 1, trainerReturn: 'vocab:must', vocabRole: 'must'}}};
        return live;
      },
      async push() {},
      async login() {},
      async logout() {},
      async register() {}
    };
  });
  remoteNav.window.TrainerCatalogBridge.launch('vocab:must');
  remoteNav.submit('неттакого');
  remoteNav.saveNow();
  const remoteEpoch = remoteNav.session().queueEpoch;
  const remoteCard = cardId(remoteNav.session());
  const remoteAt = answerEvents(stored(remoteNav))[0].at;
  const heardNav = Date.now() + 2000;
  while (!(remoteNav.listeners['qazaq-cloud-user'] || []).length) {
    if (Date.now() > heardNav) throw new Error('qazaq-cloud-user listener was not registered');
    await sleep(10);
  }
  remoteNav.window.QazaqCloud.user = {email: 'nav@example.com'};
  remoteNav.window.dispatchEvent(new remoteNav.window.CustomEvent('qazaq-cloud-user'));
  const appliedNav = Date.now() + 2000;
  function parkedMust() {
    const resume = stored(remoteNav).navigationResume;
    return resume && resume.slots && resume.slots['vocab:must'];
  }
  while (remotePulls < 1 || !parkedMust()) {
    if (Date.now() > appliedNav) break;
    await sleep(10);
  }
  assert.equal(remotePulls, 1);
  assert.equal(parkedMust().snapshot.session.queue[0], 'other');
  remoteNav.saveNow();
  assert.equal(remoteNav.session().queueEpoch, remoteEpoch);
  assert.equal(cardId(remoteNav.session()), remoteCard);
  assert.equal(remoteNav.session().vocab.retry.kind, 'wrong');
  assert.equal(answerEvents(stored(remoteNav)).length, 1);
  assert.equal(answerEvents(stored(remoteNav))[0].at, remoteAt);
  console.log('N-STATE applyRemote during retry does not roll back or relaunch');

  const twice = boot();
  twice.window.TrainerCatalogBridge.launch('vocab:must');
  const twiceEpoch = twice.session().queueEpoch;
  const twiceCard = cardId(twice.session());
  twice.window.TrainerCatalogBridge.launch('vocab:must');
  twice.saveNow();
  assert.equal(twice.session().queueEpoch, twiceEpoch);
  assert.equal(cardId(twice.session()), twiceCard);
  assert.equal(Object.prototype.hasOwnProperty.call(stored(twice).navigationResume.slots, 'vocab:must'), false);
  console.log('N-STATE double launch keeps one epoch');

  const blocked = boot();
  blocked.window.TrainerCatalogBridge.launch('vocab:must');
  blocked.saveNow();
  const blockedEpoch = blocked.session().queueEpoch;
  const blockedCard = cardId(blocked.session());
  blocked.window.localStorage.setItem = () => { throw new Error('full'); };
  blocked.window.QazaqShell.startCourse('2-2');
  assert.equal(blocked.session().mode, 'words');
  assert.equal(blocked.session().queueEpoch, blockedEpoch);
  assert.equal(cardId(blocked.session()), blockedCard);
  assert.equal(blocked.makeEl('save-status').textContent, 'Сохранение недоступно. Экспортируй прогресс перед закрытием.');
  console.log('N-STATE storage failure blocks the switch and keeps the live queue');

  const damaged = boot();
  damaged.window.TrainerCatalogBridge.launch('vocab:must');
  damaged.saveNow();
  const damagedRaw = stored(damaged);
  const damagedEpoch = damaged.session().queueEpoch;
  damagedRaw.navigationResume.slots['queue:ordered:x'] = {status: 'paused', updatedAt: 1, origin: 'park', snapshot: {kind: 'nope'}};
  const damagedNext = boot(JSON.stringify(damagedRaw));
  assert.equal(damagedNext.window.QazaqShell.restore('queue:ordered:x'), 'damaged');
  assert.equal(damagedNext.makeEl('save-status').textContent, 'Снимок очереди повреждён. Новая очередь не собрана.');
  assert.equal(damagedNext.session().mode, 'words');
  assert.equal(damagedNext.session().queueEpoch, damagedEpoch);
  assert.equal(slotOf(damagedNext, 'queue:ordered:x').status, 'paused');
  console.log('N-STATE damaged slot is kept and does not start a new queue');

  const capState = P.migrate({records: {}}, NOW);
  for (let i = 0; i < NS.PAUSED_CAP + 1; i++) {
    assert.equal(NS.put(capState, 'queue:ordered:k' + i, {status: 'paused', updatedAt: i + 1, origin: 'park', snapshot: {kind: 'session', session: {mode: 'ordered', topic: 'sounds', queue: ['m1-1-1'], position: 0, view: 'practice'}}}), true);
  }
  const pausedLeft = Object.entries(capState.navigationResume.slots).filter(([, slot]) => slot.status === 'paused');
  assert.equal(pausedLeft.length, NS.PAUSED_CAP);
  assert.equal(capState.navigationResume.slots['queue:ordered:k0'], undefined);
  assert.ok(capState.navigationResume.slots['queue:ordered:k' + NS.PAUSED_CAP]);
  const closedOnly = P.migrate({records: {}}, NOW);
  assert.equal(NS.put(closedOnly, 'vocab:must', {status: 'closed', updatedAt: 2, origin: 'close', snapshot: {kind: 'session', session: {mode: 'words', queue: ['secret-card'], position: 0}}}), true);
  assert.equal(closedOnly.navigationResume.slots['vocab:must'].status, 'closed');
  assert.equal(Object.prototype.hasOwnProperty.call(closedOnly.navigationResume.slots['vocab:must'], 'snapshot'), false);
  const cloudPaused = P.migrate({records: {}}, NOW);
  NS.put(cloudPaused, 'vocab:must', {status: 'paused', updatedAt: 9, origin: 'cloud', snapshot: {kind: 'session', session: {mode: 'words', queue: ['other'], position: 0}}});
  const closedMerge = P.merge(closedOnly, cloudPaused);
  assert.equal(closedMerge.navigationResume.slots['vocab:must'].status, 'closed');
  assert.equal(closedMerge.navigationResume.slots['vocab:must'].snapshot, undefined);
  console.log('N-STATE paused cap evicts the oldest; a closed tombstone has no snapshot and cloud does not revive it');

  function rowOf(launcher, entry, page) {
    page.saveNow();
    const saved = JSON.parse(page.window.localStorage.getItem(KEY));
    const again = boot(page.window.localStorage.getItem(KEY));
    const after = page.window.QazaqShell.key();
    const reloaded = NS.launchKeyFromRuntime(saved.session);
    assert.equal(after, entry, launcher + ' currentLaunchKey');
    assert.equal(reloaded, entry, launcher + ' reload');
    assert.equal(again.window.QazaqShell.key(), entry, launcher + ' boot key');
    console.log('KEY', launcher, entry, after, reloaded);
    return again;
  }
  const ids = boot().window.COURSE.questions.map(q => q.id).filter(Boolean);
  const customA = [ids[0]];
  const customB = [ids.find(id => id !== ids[0])];
  const customPage = boot();
  const customKeyA = NS.customKey('words', customA);
  const customKeyB = NS.customKey('words', customB);
  customPage.window.QazaqShell.startCustom(customA, 'words');
  const customEpochA = customPage.session().queueEpoch;
  const customQueueA = customPage.session().queue.slice();
  assert.notEqual(customKeyA, 'custom:words');
  rowOf('startCustom A', customKeyA, customPage);
  customPage.window.QazaqShell.startCustom(customB, 'words');
  assert.equal(customPage.window.QazaqShell.key(), customKeyB);
  assert.notEqual(customKeyA, customKeyB);
  assert.equal(customPage.window.QazaqShell.resume().slots[customKeyA].snapshot.session.queueEpoch, customEpochA);
  customPage.window.QazaqShell.startCustom(customA, 'words');
  assert.equal(customPage.session().queueEpoch, customEpochA);
  assert.deepEqual(customPage.session().queue, customQueueA);
  console.log('N-STATE two custom queues keep two slots');

  const slicePage = boot();
  const sliceA = NS.sliceKey('A');
  const sliceB = NS.sliceKey('B');
  slicePage.window.QazaqShell.startSlice('A');
  const sliceEpochA = slicePage.session().queueEpoch;
  const sliceQueueA = slicePage.session().queue.slice();
  assert.notEqual(sliceA, 'slice:probe');
  assert.equal(slicePage.window.QazaqShell.key(), sliceA);
  slicePage.saveNow();
  assert.equal(NS.launchKeyFromRuntime(JSON.parse(slicePage.window.localStorage.getItem(KEY)).session), sliceA);
  slicePage.window.QazaqShell.startSlice('B');
  assert.equal(slicePage.window.QazaqShell.key(), sliceB);
  assert.notEqual(sliceA, sliceB);
  slicePage.window.QazaqShell.startSlice('A');
  assert.equal(slicePage.session().queueEpoch, sliceEpochA);
  assert.deepEqual(slicePage.session().queue, sliceQueueA);
  console.log('KEY startSlice', sliceA, slicePage.window.QazaqShell.key(), sliceA);

  const repairPage = boot();
  const repairListA = [{id: ids[0]}];
  const repairListB = [{id: customB[0]}];
  const repairA = NS.repairKey([ids[0]]);
  const repairB = NS.repairKey([customB[0]]);
  repairPage.window.QazaqShell.launchRepair(repairListA);
  const repairEpochA = repairPage.session().queueEpoch;
  assert.notEqual(repairA, 'repair:day');
  assert.equal(repairPage.window.QazaqShell.key(), repairA);
  repairPage.window.QazaqShell.launchRepair(repairListB);
  assert.equal(repairPage.window.QazaqShell.key(), repairB);
  repairPage.window.QazaqShell.launchRepair(repairListA);
  assert.equal(repairPage.session().queueEpoch, repairEpochA);
  assert.equal(repairPage.session().queue[0], ids[0]);
  console.log('KEY launchRepair', repairA, repairPage.window.QazaqShell.key(), repairA);

  const contrastPage = boot();
  const pairA = {expected_answer: 'bir', wrong_answer_given: 'alty', card_ids: [ids[0]]};
  const pairB = {expected_answer: 'eki', wrong_answer_given: 'zheti', card_ids: [customB[0]]};
  const contrastA = NS.contrastKey(pairA);
  const contrastB = NS.contrastKey(pairB);
  contrastPage.window.QazaqShell.startContrast(pairA);
  assert.notEqual(contrastA, 'contrast:pair');
  if (contrastPage.session() && contrastPage.session().queue && contrastPage.session().queue.length) {
    const contrastEpochA = contrastPage.session().queueEpoch;
    assert.equal(contrastPage.window.QazaqShell.key(), contrastA);
    contrastPage.window.QazaqShell.startContrast(pairB);
    assert.equal(contrastPage.window.QazaqShell.key(), contrastB);
    contrastPage.window.QazaqShell.startContrast(pairA);
    assert.equal(contrastPage.session().queueEpoch, contrastEpochA);
    console.log('KEY startContrast', contrastA, contrastPage.window.QazaqShell.key(), contrastA);
  } else {
    throw new Error('contrast pair A produced no queue');
  }

  const examPage = boot();
  examPage.window.QazaqShell.startExam({topic: 'sounds'});
  const examPlain = NS.examKey('sounds', null);
  assert.equal(examPage.window.QazaqShell.key(), examPlain);
  examPage.saveNow();
  assert.equal(NS.launchKeyFromRuntime(JSON.parse(examPage.window.localStorage.getItem(KEY)).session), examPlain);
  examPage.window.QazaqShell.startExam({topic: 'sounds', courseBlock: '1-1'});
  const examScoped = NS.examKey('sounds', '1-1');
  assert.equal(examPage.window.QazaqShell.key(), examScoped);
  assert.notEqual(examPlain, examScoped);
  console.log('KEY startExam', examScoped, examPage.window.QazaqShell.key(), examScoped);

  const voluntaryPage = boot();
  const voluntaryKey = NS.lessonKey('plural-1');
  voluntaryPage.window.QazaqShell.startLesson('plural-1', 0, {voluntary: true});
  assert.equal(voluntaryPage.window.QazaqShell.key(), voluntaryKey);
  assert.notEqual(voluntaryKey, null);
  voluntaryPage.saveNow();
  const voluntaryBoot = boot(voluntaryPage.window.localStorage.getItem(KEY));
  assert.equal(voluntaryBoot.window.QazaqShell.key(), voluntaryKey);
  console.log('KEY startLesson voluntary', voluntaryKey, voluntaryPage.window.QazaqShell.key(), voluntaryBoot.window.QazaqShell.key());

  const prePage = boot();
  prePage.window.alert = () => {};
  prePage.window.QazaqShell.startPreExam();
  assert.equal(prePage.window.QazaqShell.key(), 'preexam:3-3');
  assert.notEqual(prePage.window.QazaqShell.key(), 'queue:course:all');
  prePage.saveNow();
  const preBoot = boot(prePage.window.localStorage.getItem(KEY));
  assert.equal(preBoot.window.QazaqShell.key(), 'preexam:3-3');
  console.log('KEY startPreExam', 'preexam:3-3', prePage.window.QazaqShell.key(), preBoot.window.QazaqShell.key());

  const coursePage = boot();
  coursePage.window.QazaqShell.startCourse('2-2');
  coursePage.saveNow();
  const courseBoot = boot(coursePage.window.localStorage.getItem(KEY));
  assert.equal(coursePage.window.QazaqShell.key(), 'course:2-2');
  assert.equal(courseBoot.window.QazaqShell.key(), 'course:2-2');
  console.log('KEY startCourse', 'course:2-2', coursePage.window.QazaqShell.key(), courseBoot.window.QazaqShell.key());

  const mustPage = boot();
  mustPage.window.TrainerCatalogBridge.launch('vocab:must');
  mustPage.saveNow();
  const mustBoot = boot(mustPage.window.localStorage.getItem(KEY));
  assert.equal(mustPage.window.QazaqShell.key(), 'vocab:must');
  assert.equal(mustBoot.window.QazaqShell.key(), 'vocab:must');
  console.log('KEY vocab:must', 'vocab:must', mustPage.window.QazaqShell.key(), mustBoot.window.QazaqShell.key());

  const hidden = boot();
  hidden.window.TrainerCatalogBridge.launch('vocab:must');
  hidden.makeEl('answer-0').value = 'visible-a';
  hidden.saveNow();
  const visibleDraft = hidden.session().draft && hidden.session().draft.answers.slice();
  assert.ok(visibleDraft && visibleDraft.indexOf('visible-a') >= 0);
  hidden.makeEl('practice-view').hidden = true;
  hidden.makeEl('answer-form').hidden = true;
  hidden.makeEl('answer-0').value = 'hidden-stale';
  hidden.window.QazaqShell.startCourse('2-2');
  const hiddenSlot = hidden.window.QazaqShell.resume().slots['vocab:must'];
  assert.deepEqual(hiddenSlot.snapshot.session.draft.answers, visibleDraft);
  assert.equal(JSON.stringify(hiddenSlot.snapshot.session.draft).includes('hidden-stale'), false);
  console.log('N-STATE hidden practice form does not rewrite the parked draft');

  const replaceLeft = boot();
  replaceLeft.window.QazaqShell.startCourse('2-2');
  replaceLeft.window.TrainerCatalogBridge.launch('vocab:must');
  replaceLeft.saveNow();
  const chosenCopy = JSON.parse(replaceLeft.window.localStorage.getItem(KEY));
  assert.ok(chosenCopy.navigationResume.slots['course:2-2']);
  const replaceRight = boot();
  replaceRight.window.QazaqShell.startCourse('1-1');
  replaceRight.window.TrainerCatalogBridge.launch('vocab:must');
  replaceRight.saveNow();
  assert.ok(replaceRight.window.QazaqShell.resume().slots['course:1-1']);
  replaceRight.window.QazaqShell.import(chosenCopy, 'replace');
  const backupRaw = replaceRight.window.localStorage.getItem(KEY + '-before-import');
  assert.ok(backupRaw);
  const backupSlots = JSON.parse(backupRaw).navigationResume.slots;
  assert.ok(backupSlots['course:1-1']);
  const replaceBoot = boot(replaceRight.window.localStorage.getItem(KEY));
  assert.ok(replaceBoot.window.QazaqShell.resume().slots['course:2-2']);
  assert.equal(replaceBoot.window.QazaqShell.resume().slots['course:1-1'], undefined);
  console.log('N-STATE import replace keeps the chosen slots and the backup');

  const mergeHost = boot();
  mergeHost.window.QazaqShell.startCourse('2-2');
  mergeHost.window.TrainerCatalogBridge.launch('vocab:must');
  mergeHost.saveNow();
  const mergeIncoming = boot();
  mergeIncoming.window.QazaqShell.startCourse('1-1');
  mergeIncoming.window.QazaqShell.show('today');
  mergeIncoming.saveNow();
  mergeHost.window.QazaqShell.import(JSON.parse(mergeIncoming.window.localStorage.getItem(KEY)), 'merge');
  const mergeBoot = boot(mergeHost.window.localStorage.getItem(KEY));
  assert.ok(mergeBoot.window.QazaqShell.resume().slots['course:2-2']);
  assert.ok(mergeBoot.window.QazaqShell.resume().slots['course:1-1']);
  console.log('N-STATE import merge keeps the local slot and accepts the missing one');

  const quiet = boot();
  quiet.window.TrainerCatalogBridge.launch('vocab:must');
  quiet.makeEl('answer-0').value = 'keep-me';
  quiet.saveNow();
  const quietEpoch = quiet.session().queueEpoch;
  const quietDraft = quiet.session().draft;
  const quietView = quiet.session().view;
  quiet.window.localStorage.setItem = () => { throw new Error('full'); };
  quiet.window.QazaqShell.startCourse('2-2');
  assert.equal(quiet.session().mode, 'words');
  assert.equal(quiet.session().view, quietView);
  assert.equal(quiet.session().queueEpoch, quietEpoch);
  assert.deepEqual(quiet.session().draft, quietDraft);
  assert.equal(quiet.makeEl('launch-block').hidden, false);
  assert.match(quiet.makeEl('launch-block').textContent, /Не получается сохранить текущее занятие/);
  assert.equal(quiet.makeEl('save-status').textContent, 'Сохранение недоступно. Экспортируй прогресс перед закрытием.');
  console.log('N-STATE storage block stays on the same screen and says why');

  console.log('VERIFY_NAVIGATION_STATE_OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
