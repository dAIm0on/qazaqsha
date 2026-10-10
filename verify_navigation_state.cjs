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

for (const name of ['must-first-show.json', 'must-idk.json', 'must-wrong.json', 'must-boundary.json', 'must-summary.json']) {
  const fixture = load(name);
  assert.equal(fixture.fixtureStatus, 'EXPECTED_UNTIL_VOC');
  assert.equal(fixture.structural, true);
  assert.equal(fixture.session.mode, 'words');
  assert.equal(fixture.session.trainerReturn, 'vocab:must');
  assert.ok(fixture.session.vocab);
  console.log('EXPECTED_UNTIL_VOC', name, 'structural placeholder, not product behavior');
}
const saveBody = app.slice(app.indexOf('function save(){'), app.indexOf('function subset(){'));
assert.match(saveBody, /state\.session=\{/);
assert.doesNotMatch(saveBody, /\bvocab\s*:/);
console.log('EXPECTED_UNTIL_VOC save() does not write session.vocab on this baseline');
console.log('VERIFY_NAVIGATION_STATE_OK');
