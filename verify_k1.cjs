'use strict';

const assert = require('assert');
const fs = require('fs');
const P = require('./progress.js');
const Bank = require('./explain-bank-adapter.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS', name);
  } catch (error) {
    console.error('FAIL', name);
    throw error;
  }
}
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function ids(){ return Bank.COURSE.map(x=>x.id); }

test('K1-A empty state is schema 7 with canonical courseProgress', () => {
  const s=P.empty();
  assert.equal(s.schema,7);
  assert.deepEqual(Object.keys(s.courseProgress.lessons),ids());
  assert.ok(s.courseProgress.resumePointer);
});

test('K1-B source of truth is ExplainBankUI.COURSE', () => {
  assert.deepEqual(P.courseIds(),ids());
  assert.deepEqual(ids(),['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2']);
});

test('K1-C schema6 migration preserves legacy state and creates per-lesson path', () => {
  const raw={
    schema:6, records:{}, skills:{}, events:[], associations:{}, vocabulary:{}, homeworkAttempts:{},
    grammarPath:{lessonId:'2-1',chapterId:'2-1-emes',beat:3,phase:'beat',completedChapters:{'1-1:x':true},pathDraft:{lessonId:'2-1',chapterId:'2-1-emes',beat:3,value:'draft'},canonShownFor:'2-1-emes'}
  };
  const s=P.migrate(raw,1000);
  assert.equal(s.schema,7);
  assert.equal(s.grammarPath.lessonId,'2-1');
  assert.equal(s.courseProgress.lessons['2-1'].path.chapterId,'2-1-emes');
  assert.equal(s.courseProgress.lessons['2-1'].path.beat,3);
  assert.equal(s.courseProgress.lessons['2-1'].path.pathDraft.value,'draft');
  assert.equal(s.courseProgress.resumePointer.lessonId,'2-1');
});

test('K1-D live study session wins migration resume priority', () => {
  const raw={schema:6,records:{},skills:{},grammarPath:{lessonId:'1-2',chapterId:'1-2-a',beat:1,phase:'beat'},session:{mode:'course',courseBlock:'3-1',queue:['x'],position:0,answered:false}};
  const s=P.migrate(raw,2000);
  assert.equal(s.courseProgress.resumePointer.lessonId,'3-1');
  assert.equal(s.courseProgress.resumePointer.surface,'practice');
});

test('K1-E homework never becomes primary resume', () => {
  const raw={schema:6,records:{},skills:{},grammarPath:{lessonId:'2-1',chapterId:'2-1-emes',beat:1,phase:'beat'},place:{surface:'homework',lessonId:'1-1',mode:'homework'},session:{mode:'homework',courseBlock:'1-1',hwLesson:'1-1',queue:['x'],position:0}};
  const s=P.migrate(raw,3000);
  assert.equal(s.courseProgress.resumePointer.lessonId,'2-1');
  assert.notEqual(s.courseProgress.resumePointer.surface,'homework');
});

test('K1-F invalid practiceSession normalizes to null without losing completion', () => {
  const raw={schema:7,records:{},skills:{},courseProgress:{lessons:{'1-1':{status:'completed',completedAt:123,practiceSession:{queue:'bad'}}},resumePointer:{lessonId:'1-1',surface:'path',updatedAt:5}}};
  const s=P.migrate(raw,4000);
  assert.equal(s.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(s.courseProgress.lessons['1-1'].completedAt,123);
  assert.equal(s.courseProgress.lessons['1-1'].practiceSession,null);
});

test('K1-G invalid resumePointer falls back to a canonical lesson', () => {
  const raw={schema:7,records:{},skills:{},courseProgress:{lessons:{},resumePointer:{lessonId:'9-9',surface:'path',updatedAt:9}}};
  const s=P.migrate(raw,5000);
  assert.ok(ids().includes(s.courseProgress.resumePointer.lessonId));
});

test('K1-H completed is monotonic across merge', () => {
  const a=P.migrate({schema:7,records:{},skills:{},courseProgress:{lessons:{'1-1':{status:'completed',completedAt:111,updatedAt:900}},resumePointer:{lessonId:'2-1',surface:'path',updatedAt:900}}},6000);
  const b=P.migrate({schema:7,records:{},skills:{},courseProgress:{lessons:{'1-1':{status:'in_progress',completedAt:null,updatedAt:1000}},resumePointer:{lessonId:'1-2',surface:'path',updatedAt:1000}}},6000);
  const m=P.merge(a,b);
  assert.equal(m.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(m.courseProgress.lessons['1-1'].completedAt,111);
  assert.equal(m.courseProgress.resumePointer.lessonId,'1-2');
});

test('K1-I resumePointer tie is deterministic and keeps current', () => {
  const a=P.migrate({schema:7,records:{},skills:{},courseProgress:{resumePointer:{lessonId:'2-1',surface:'path',updatedAt:100}}},7000);
  const b=P.migrate({schema:7,records:{},skills:{},courseProgress:{resumePointer:{lessonId:'1-2',surface:'practice',updatedAt:100}}},7000);
  assert.equal(P.merge(a,b).courseProgress.resumePointer.lessonId,'2-1');
});

test('K1-J schema7 serialize/validate roundtrip', () => {
  const s=P.empty();
  const text=P.serialize(s);
  const raw=JSON.parse(text);
  assert.equal(raw.schema,7);
  const v=P.validate(text,new Set(),8000);
  assert.equal(v.state.schema,7);
  assert.deepEqual(Object.keys(v.state.courseProgress.lessons),ids());
});

test('K1-K app contains per-lesson path/practice helpers and completion hook', () => {
  const app=fs.readFileSync('app.js','utf8');
  for(const token of ['persistLessonPath','loadLessonPath','persistLessonPractice','restoreLessonPractice','markLessonCompleted','resumePointer']) assert.ok(app.includes(token),token);
});

test('K1-L startCourse restores saved session before generating PhraseDrill', () => {
  const app=fs.readFileSync('app.js','utf8');
  const start=app.indexOf('function startCourse');
  const phrase=app.indexOf('PhraseDrill.session',start);
  const restore=app.indexOf('restoreLessonPractice',start);
  assert.ok(start>=0&&restore>start&&phrase>restore,'restore must precede PhraseDrill.session');
});

test('K1-M primary resume is not derived from state.place', () => {
  const app=fs.readFileSync('app.js','utf8');
  const start=app.indexOf('function namedCourse');
  const end=app.indexOf('function stepNow',start);
  const body=app.slice(start,end);
  assert.ok(body.includes('resumePointer'));
  assert.ok(!body.includes('state.place'),'namedCourse must not use state.place');
});

test('K1-N dashboard picker derives rows from ExplainBankUI.COURSE', () => {
  const dash=fs.readFileSync('dashboard.js','utf8');
  assert.ok(dash.includes('ExplainBankUI.COURSE'));
  assert.ok(dash.includes('lesson-picker'));
  assert.ok(!dash.includes("const courseTitles={'1-1'"),'remove duplicated manual titles');
});

test('K1-O navigation-only code does not touch scheduler implementation', () => {
  const app=fs.readFileSync('app.js','utf8');
  const mark=app.slice(app.indexOf('function markPlace'),app.indexOf('function filterSummary'));
  assert.ok(!mark.includes('ReviewScheduler'));
  assert.ok(!mark.includes('.fsrs'));
});

test('K1-P cloud still strips runtime session but not courseProgress', () => {
  const cloud=fs.readFileSync('cloud.js','utf8');
  assert.ok(cloud.includes('copy.session=null'));
  assert.ok(!cloud.includes('delete copy.courseProgress'));
  assert.ok(!cloud.includes('copy.courseProgress=null'));
});

console.log('K1 verify PASS:',passed,'tests');
