#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CP = require('./course-progress.js');
const Progress = require('./progress.js');
const P = CP;

const passed = [];
function ok(name) { passed.push(name); console.log('PASS', name); }

const base = {
  lessonId: '2-1',
  contentRevision: P.STAGE_REVISION,
  stageId: 'person-basic',
  kind: 'learning',
  coreIds: ['a', 'b', 'c', 'd', 'e'],
  requiredIndependentIds: ['d', 'e'],
  minIndependentRatio: 0.8,
  maxPresentations: 24,
  final: false
};
const ctx = P.normalizeStageContext(base);
assert.ok(ctx);
assert.equal(P.normalizeStageContext(Object.assign({}, base, { lessonId: '9-9' })), null);
assert.equal(P.normalizeStageContext(Object.assign({}, base, { contentRevision: 'other' })), null);
assert.equal(P.normalizeStageContext(Object.assign({}, base, { coreIds: [] })), null);

const snap = { mode: 'course', courseBlock: '2-1', queue: ['a', 'b'], position: 0, stageContext: base };
const saved = { courseProgress: P.empty() };
P.savePractice(saved, '2-1', snap, 5);
assert.equal(saved.courseProgress.lessons['2-1'].practiceSession.stageContext.stageId, 'person-basic');
const legacy = { mode: 'course', courseBlock: '2-1', queue: ['q1', 'q2'], position: 1, answered: true };
P.savePractice(saved, '1-2', legacy, 6);
assert.equal(saved.courseProgress.lessons['1-2'].practiceSession.stageContext, undefined);
assert.equal(saved.courseProgress.lessons['1-2'].practiceSession.queue[1], 'q2');
const bad = { courseProgress: P.empty() };
P.savePractice(bad, '2-1', Object.assign({}, snap, { stageContext: { lessonId: 'nope', stageId: 'x', contentRevision: P.STAGE_REVISION, coreIds: ['a'] } }), 7);
assert.equal(bad.courseProgress.lessons['2-1'].practiceSession.stageContext, undefined);
assert.deepEqual(bad.courseProgress.lessons['2-1'].practiceSession.queue, ['a', 'b']);
ok('R02 stageContext roundtrip is optional and rejects an unknown lesson');

function ans(id, extra) {
  return Object.assign({ type: 'answer', card_id: id, lesson_id: '2-1', stage_id: 'person-basic', content_revision: P.STAGE_REVISION, at: extra.at, correct: true, hinted: false, peek: 0, rule_peek: 0, first_try_correct: 1 }, extra);
}
const shownOnly = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ type: 'shown', card_id: id, at: i + 1 }));
assert.equal(P.evaluateStage(shownOnly, ctx).pass, false);
assert.equal(P.evaluateStage(shownOnly, ctx).attempted.length, 0);
const hinted = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ans(id, { at: i + 1, hinted: true, first_try_correct: 0 }));
assert.equal(P.evaluateStage(hinted, ctx).pass, false);
const four = ['a', 'b', 'c', 'd'].map((id, i) => ans(id, { at: i + 1 }));
assert.equal(P.evaluateStage(four, ctx).pass, false);
const five = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ans(id, { at: i + 1 }));
const good = P.evaluateStage(five, ctx);
assert.equal(good.pass, true);
assert.equal(P.lessonStatusAfterStage('in_progress', ctx, good), 'in_progress');
assert.equal(P.lessonStatusAfterStage('in_progress', Object.assign({}, ctx, { final: true }), good), 'completed');
assert.equal(P.lessonStatusAfterStage('completed', ctx, { pass: false }), 'completed');
const repeat = five.slice();
repeat.push(ans('a', { at: 10, correct: false, confusion_tag: 'person_sg_initial' }));
repeat.push(ans('b', { at: 11, correct: false, confusion_tag: 'person_sg_initial' }));
assert.equal(P.evaluateStage(repeat, ctx).pass, false);
ok('R00/R03 shown and hints do not pass a stage, and a mini-stage does not complete the lesson');

const limitCtx = Object.assign({}, ctx, { limitReached: true });
assert.equal(P.evaluateStage(five, limitCtx).pass, false);
assert.equal(P.lessonStatusAfterStage('in_progress', limitCtx, P.evaluateStage(five, limitCtx)), 'in_progress');
ok('R05 the presentation limit does not count as a pass');

const events = [];
const first = P.pushStageCompletion(events, ctx, good.independent, 100);
assert.ok(first && first.type === 'course_stage_completed' && first.card_id === 'course-stage:2-1:person-basic');
events.push(first);
assert.equal(P.pushStageCompletion(events, ctx, good.independent, 200), null);
const again = P.pushStageCompletion([], ctx, good.independent, 300);
const merged = Progress.merge(
  Object.assign(Progress.empty(), { events: [first] }),
  Object.assign(Progress.empty(), { events: [again] })
);
assert.equal(merged.events.filter(e => e.type === 'course_stage_completed').length, 1);
assert.equal(merged.schema, 7);
ok('R06 stage completion is one event across two devices');

P.registerStages('2-1', [
  base,
  Object.assign({}, base, { stageId: 'person-check', kind: 'checkpoint', final: true, nextStageId: null })
]);
assert.equal(P.nextRegistered('2-1', []).stageId, 'person-basic');
assert.equal(P.nextRegistered('2-1', events).stageId, 'person-check');
assert.equal(P.nextRegistered('3-2', events), null);
const known = new Map([['a', {}], ['b', {}]]);
assert.deepEqual(P.unknownQueueIds(['a', 'gone', 'b'], known), ['gone']);
ok('resume chooses the unfinished stage and an unknown id stays visible');

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const empty = app.slice(app.indexOf('function renderEmpty'), app.indexOf('function startRemedy'));
assert.ok(empty.indexOf('if(stageContext)') < empty.indexOf('markLessonCompleted(lessonId)'));
const cont = app.slice(app.indexOf('function continueLesson'), app.indexOf('function resetCounts'));
assert.ok(cont.includes('viewOnlyPathLesson=null'));
assert.ok(cont.indexOf('restoreLessonPractice(id)') < cont.indexOf('nextRegistered'));
assert.ok(cont.indexOf('nextRegistered') < cont.indexOf('openPathLesson'));
const start = app.slice(app.indexOf('function startCourse'), app.indexOf('function startTransfer'));
assert.ok(start.indexOf('restoreLessonPractice(block)') < start.indexOf('practiceHold'));
assert.ok(start.indexOf('practiceHold') < start.indexOf('lessonSession'));
assert.ok(!/course_stage_completed/.test(app.slice(app.indexOf('function openPathLesson'), app.indexOf('function filterSummary'))));
ok('R01 old queue restore stays ahead of a new stage, and reading chapters does not complete one');

console.log('STAGE_OK', passed.length);
