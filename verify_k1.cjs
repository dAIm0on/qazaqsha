'use strict';

const assert=require('assert');
const fs=require('fs');
const P=require('./progress.js');
const Bank=require('./explain-bank-adapter.js');
const CP=require('./course-progress.js');

let passed=0;
function test(name,fn){
  try{fn();passed++;console.log('PASS',name);}
  catch(error){console.error('FAIL',name);throw error;}
}
const clone=v=>JSON.parse(JSON.stringify(v));
const ids=()=>Bank.COURSE.map(x=>x.id);
const app=()=>fs.readFileSync('app.js','utf8');
const dash=()=>fs.readFileSync('dashboard.js','utf8');
const tutor=()=>fs.readFileSync('tutor-ui.js','utf8');

test('K1-A schema 6 -> 7 preserves learning stores and derives resume',()=>{
  const now=1700000000000;
  const seed=P.migrate({schema:6,records:{card:{seen:2,correct_count:1,wrong_count:1,correct_streak:0,next_review:now+1000}},skills:{},events:[]},now);
  const stable=clone(seed.records.card);
  const raw={
    schema:6,records:{card:stable},skills:{},
    events:[{type:'answer',card_id:'card',at:now-10,correct:true,hinted:false,answers:['x']}],
    homeworkAttempts:{'1-2':{lessonId:'1-2',started_at:1,items:[]}},
    aiTutor:{errors:{E:{error_code:'E',count_total:1,count_recent:1,lesson_id:'1-2'}},recent:[]},
    grammarPath:{lessonId:'2-1',chapterId:'2-1-emes',beat:3,phase:'beat',completedChapters:{},pathDraft:{lessonId:'2-1',chapterId:'2-1-emes',beat:3,value:'draft'}},
    session:{mode:'course',courseBlock:'3-1',queue:['q1','q2'],position:1,answered:false,view:'practice'}
  };
  const s=P.migrate(raw,now);
  assert.equal(s.schema,7);
  assert.deepEqual(s.records.card.fsrs,stable.fsrs);
  assert.equal(s.events.length,1);
  assert.ok(s.homeworkAttempts['1-2']);
  assert.equal(s.aiTutor.errors.E.count_total,1);
  assert.equal(s.grammarPath.lessonId,'2-1');
  assert.equal(s.courseProgress.resumePointer.lessonId,'3-1');
  assert.equal(s.courseProgress.resumePointer.surface,'practice');
  assert.deepEqual(s.courseProgress.lessons['3-1'].practiceSession.queue,['q1','q2']);
  assert.equal(s.courseProgress.lessons['3-1'].status,'in_progress');
});

test('K1-B picker open/close has no resume mutation hook',()=>{
  const d=dash();
  const open=d.match(/openPicker\.onclick=([^;]+;){0,3}/)?.[0]||'';
  const close=d.match(/closePicker\.onclick=([^;]+;){0,3}/)?.[0]||'';
  assert.ok(open&&close);
  assert.ok(!/setResume|markLessonStarted|api\.action/.test(open+close));
});

test('K1-C view-only lesson open is distinct from meaningful start',()=>{
  const a=app();
  assert.ok(/lesson-view:[^']*'\)\)\{openPathLesson\(next\.slice\(12\)\)/.test(a)||a.includes("if(next.startsWith('lesson-view:')){openPathLesson(next.slice(12));return;}"));
  assert.ok(a.includes("if(next.startsWith('lesson-start:')){continueLesson(next.slice(13));return;}"));
  const start=a.indexOf('function openPathLesson');
  const end=a.indexOf('function filterSummary',start);
  const body=a.slice(start,end);
  assert.ok(body.includes('const meaningful=!!(options&&options.meaningful)'));
  assert.ok(body.includes("if(meaningful)"));
});

test('K1-C2 view-only state survives opening a chapter',()=>{
  const a=app();
  const start=a.indexOf('function openChapter'),end=a.indexOf('function openPathLesson',start),body=a.slice(start,end);
  assert.ok(body.includes("viewOnlyPathLesson!==lessonId"));
  const open=a.slice(a.indexOf('function openPathLesson'),a.indexOf('function filterSummary'));
  assert.ok(open.includes("viewOnlyPathLesson=meaningful?null:lessonId"));
  const cont=a.slice(a.indexOf('function continueLesson'),a.indexOf('function resetCounts'));
  assert.ok(cont.includes('viewOnlyPathLesson=null'));
});

test('K1-D explicit start changes resume and marks in_progress',()=>{
  const s=P.empty();
  P.setResumePointer(s,'2-1','path',10);
  const p=P.markLessonStarted(s,'1-2','path',20);
  assert.equal(s.courseProgress.resumePointer.lessonId,'1-2');
  assert.equal(s.courseProgress.resumePointer.surface,'path');
  assert.equal(p.status,'in_progress');
  assert.equal(p.startedAt,20);
});

test('K1-E per-lesson path checkpoints remain independent',()=>{
  const s=P.empty();
  P.saveLessonPath(s,'2-1',{chapterId:'A',beat:7,phase:'beat',pathDraft:{lessonId:'2-1',chapterId:'A',beat:7,value:'x'}},100);
  P.saveLessonPath(s,'1-2',{chapterId:'B',beat:3,phase:'beat'},200);
  assert.equal(s.courseProgress.lessons['2-1'].path.chapterId,'A');
  assert.equal(s.courseProgress.lessons['2-1'].path.beat,7);
  assert.equal(s.courseProgress.lessons['1-2'].path.chapterId,'B');
  assert.equal(s.courseProgress.lessons['1-2'].path.beat,3);
});

test('K1-F practice snapshot preserves queue position draft epoch and scores',()=>{
  const s=P.empty(),snap={topic:'all',mode:'course',courseBlock:'2-1',queue:['q1','q2','q3'],position:2,answered:false,view:'practice',practiceIds:['q1','q2','q3'],stepEvidence:{q1:true},variants:{q2:1},hinted:false,elapsed_ms:99,queueEpoch:123,presented:'123:2',draft:{token:'123:2',exerciseId:'q3',answers:['abc']},sessionAttempts:4,sessionCorrect:3,sessionAssisted:1};
  P.saveLessonPractice(s,'2-1',snap,500);
  const got=s.courseProgress.lessons['2-1'].practiceSession;
  assert.deepEqual(got.queue,snap.queue);
  assert.equal(got.position,2);
  assert.deepEqual(got.draft,snap.draft);
  assert.equal(got.queueEpoch,123);
  assert.equal(got.sessionAttempts,4);
  assert.equal(got.sessionCorrect,3);
});

test('K1-G serialize/migrate preserves primary resume and checkpoints',()=>{
  const s=P.empty();
  P.markLessonStarted(s,'3-1','practice',100);
  P.saveLessonPractice(s,'3-1',{mode:'course',courseBlock:'3-1',queue:['q1','q2'],position:1,answered:false,queueEpoch:7,draft:{token:'7:1',exerciseId:'q2',answers:['x']}},110);
  P.saveLessonPath(s,'2-1',{chapterId:'C',beat:4,phase:'beat'},90);
  const restored=P.migrate(JSON.parse(P.serialize(s)),120);
  assert.equal(restored.courseProgress.resumePointer.lessonId,'3-1');
  assert.equal(restored.courseProgress.lessons['3-1'].practiceSession.position,1);
  assert.equal(restored.courseProgress.lessons['2-1'].path.beat,4);
});

test('K1-H export/import replace and merge preserve multi-lesson progress',()=>{
  const s=P.empty();
  P.markLessonCompleted(s,'1-1',10);
  P.markLessonStarted(s,'2-1','path',20);
  P.saveLessonPractice(s,'3-1',{mode:'course',courseBlock:'3-1',queue:['q'],position:0,answered:false},30);
  P.setResumePointer(s,'2-1','path',40);
  const replaced=P.migrate(JSON.parse(P.serialize(s)),50);
  assert.equal(replaced.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(replaced.courseProgress.lessons['2-1'].status,'in_progress');
  assert.ok(replaced.courseProgress.lessons['3-1'].practiceSession);
  assert.equal(replaced.courseProgress.resumePointer.lessonId,'2-1');
  const merged=P.merge(P.empty(),replaced);
  assert.equal(merged.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(merged.courseProgress.resumePointer.lessonId,'2-1');
});

test('K1-I cloud merge completion is monotonic and newer pointer wins',()=>{
  const local=P.empty(),remote=P.empty();
  P.markLessonCompleted(local,'1-1',50);
  local.courseProgress.lessons['1-1'].updatedAt=100;
  P.setResumePointer(local,'2-1','path',100);
  P.markLessonStarted(remote,'1-1','path',200);
  P.setResumePointer(remote,'1-2','path',300);
  const m=P.merge(local,remote);
  assert.equal(m.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(m.courseProgress.lessons['1-1'].completedAt,50);
  assert.equal(m.courseProgress.resumePointer.lessonId,'1-2');
});

test('K1-I2 merged course path stays authoritative over legacy grammarPath',()=>{
  const local=P.empty(),remote=P.empty();
  local.grammarPath.lessonId='2-1';local.grammarPath.chapterId='local-old';local.grammarPath.beat=1;local.grammarPath.phase='beat';
  remote.grammarPath.lessonId='2-1';remote.grammarPath.chapterId='remote-new';remote.grammarPath.beat=7;remote.grammarPath.phase='beat';
  local.grammarPath.completedChapters={'1-1:a':true};
  remote.grammarPath.completedChapters={'1-2:b':true};
  P.saveLessonPath(local,'2-1',{chapterId:'local-old',beat:1,phase:'beat'},100);
  P.saveLessonPath(remote,'2-1',{chapterId:'remote-new',beat:7,phase:'beat'},200);
  const m=P.merge(local,remote);
  assert.equal(m.courseProgress.lessons['2-1'].path.chapterId,'remote-new');
  assert.equal(m.grammarPath.chapterId,'remote-new');
  assert.equal(m.grammarPath.beat,7);
  assert.equal(m.grammarPath.completedChapters['1-1:a'],true);
  assert.equal(m.grammarPath.completedChapters['1-2:b'],true);
});

test('K1-J picker IDs equal canonical ExplainBankUI.COURSE',()=>{
  assert.deepEqual(P.courseIds(),ids());
  assert.deepEqual(ids(),['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2']);
  const d=dash();
  assert.ok(d.includes('ExplainBankUI.COURSE'));
  assert.ok(!d.includes("const courseTitles={'1-1'"));
});

test('K1-K navigation helpers do not mutate FSRS records',()=>{
  const s=P.empty();
  s.records.card={fsrs:{stability:5,difficulty:4},next_review:10,dueAt:10,mastery_level:'FAMILIAR',recall_review_successes:1,correct_streak:2,needsReview:false};
  const before=clone(s.records);
  P.ensureCourseProgress(s);
  P.ensureLessonProgress(s,'1-2');
  P.saveLessonPath(s,'1-2',{chapterId:'x',beat:1,phase:'beat'},10);
  assert.deepEqual(s.records,before);
});

test('K1-L completion marks lesson and leaves records untouched',()=>{
  const s=P.empty();s.records.card={fsrs:{stability:1},next_review:99,mastery_level:'LEARNING'};
  P.markLessonStarted(s,'1-1','practice',10);
  const before=clone(s.records);
  const p=P.markLessonCompleted(s,'1-1',20);
  assert.equal(p.status,'completed');
  assert.equal(p.completedAt,20);
  assert.deepEqual(s.records,before);
});

test('K1-M replay completed lesson never clears completion',()=>{
  const s=P.empty();
  P.markLessonCompleted(s,'1-1',20);
  P.markLessonStarted(s,'1-1','practice',30);
  const p=s.courseProgress.lessons['1-1'];
  assert.equal(p.status,'completed');
  assert.equal(p.completedAt,20);
  assert.equal(p.lastAttemptAt,30);
});

test('K1-N homework is excluded from primary resume inference',()=>{
  const raw={schema:6,records:{},skills:{},grammarPath:{lessonId:'2-1',chapterId:'x',beat:1,phase:'beat'},place:{surface:'homework',lessonId:'1-2',mode:'homework'},session:{mode:'homework',courseBlock:'1-2',hwLesson:'1-2',queue:['q'],position:0}};
  const s=P.migrate(raw,100);
  assert.equal(s.courseProgress.resumePointer.lessonId,'2-1');
  assert.notEqual(s.courseProgress.resumePointer.surface,'homework');
});

test('K1-O Phrase Drill saved queue is restored before any generation path',()=>{
  const s=P.empty(),q=['p1','p2','p3','p4','p5','p6'];
  P.saveLessonPractice(s,'3-1',{mode:'phrase',courseBlock:'3-1',queue:q,position:5,answered:false,queueEpoch:77},100);
  assert.deepEqual(s.courseProgress.lessons['3-1'].practiceSession.queue,q);
  assert.equal(s.courseProgress.lessons['3-1'].practiceSession.position,5);
  const a=app(),start=a.indexOf('function startCourse'),restore=a.indexOf('restoreLessonPractice',start),generate=a.indexOf('PhraseDrill.session',start);
  assert.ok(start>=0&&restore>start&&generate>restore);
});

test('K1-O2 phrase mode keeps the generated queue fixed',()=>{
  const a=app();
  const check=a.slice(a.indexOf('const day0=core.isDay0Learning'),a.indexOf('const mate=',a.indexOf('const day0=core.isDay0Learning')));
  assert.ok(check.includes("mode!=='phrase'"));
  assert.ok(/if\(!homeworkMode&&mode!=='phrase'/.test(check));
});

test('K1-P Tutor context follows viewed lesson, not primary resume',()=>{
  const a=app(),t=tutor();
  assert.ok(a.includes("window.TutorUI.setContext({surface:'path',lesson_id:les&&les.id||''"));
  assert.ok(t.includes('req.lesson_id=ctx.lesson_id'));
  const named=a.slice(a.indexOf('function namedCourse'),a.indexOf('function stepNow'));
  assert.ok(named.includes('resumePointer'));
});

test('K1-Q invalid practiceSession normalizes to null without losing status',()=>{
  const s=P.migrate({schema:7,records:{},skills:{},courseProgress:{lessons:{'1-1':{status:'completed',completedAt:123,practiceSession:{queue:'bad'}}},resumePointer:{lessonId:'1-1',surface:'path',updatedAt:5}}},4000);
  assert.equal(s.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(s.courseProgress.lessons['1-1'].completedAt,123);
  assert.equal(s.courseProgress.lessons['1-1'].practiceSession,null);
});

test('K1-R invalid resumePointer lesson falls back safely',()=>{
  const s=P.migrate({schema:7,records:{},skills:{},courseProgress:{lessons:{},resumePointer:{lessonId:'9-9',surface:'path',updatedAt:9}}},5000);
  assert.ok(ids().includes(s.courseProgress.resumePointer.lessonId));
});

test('K1-S completedAt cannot become null after merge',()=>{
  const a=P.empty(),b=P.empty();
  P.markLessonCompleted(a,'1-1',111);
  b.courseProgress.lessons['1-1']={...b.courseProgress.lessons['1-1'],status:'in_progress',completedAt:null,updatedAt:999};
  const m=P.merge(a,b);
  assert.equal(m.courseProgress.lessons['1-1'].status,'completed');
  assert.equal(m.courseProgress.lessons['1-1'].completedAt,111);
});

test('K1-T updatedAt tie is deterministic and keeps current pointer',()=>{
  const a=P.empty(),b=P.empty();
  P.setResumePointer(a,'2-1','path',100);
  P.setResumePointer(b,'1-2','practice',100);
  assert.equal(P.merge(a,b).courseProgress.resumePointer.lessonId,'2-1');
});

test('K1-U schema7 serialize/validate roundtrip',()=>{
  const s=P.empty(),text=P.serialize(s),raw=JSON.parse(text);
  assert.equal(raw.schema,7);
  const v=P.validate(text,new Set(),8000);
  assert.equal(v.state.schema,7);
  assert.deepEqual(Object.keys(v.state.courseProgress.lessons),ids());
});

test('K1-V state.place alone cannot alter primary resume',()=>{
  const s=P.empty();
  P.setResumePointer(s,'2-1','path',100);
  s.place={surface:'path',lessonId:'1-2',mode:'path'};
  P.ensureCourseProgress(s);
  assert.equal(s.courseProgress.resumePointer.lessonId,'2-1');
  const a=app(),named=a.slice(a.indexOf('function namedCourse'),a.indexOf('function stepNow'));
  assert.ok(!named.includes('state.place'));
});

test('K1-W showView(path) has no direct primary-resume mutation',()=>{
  const a=app(),start=a.indexOf('function showView'),end=a.indexOf('function shellTab',start),body=a.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.ok(!body.includes('setResumePointer'));
  assert.ok(!body.includes('markLessonStarted'));
});

test('K1-X startCourse restores existing saved session before generating a new one',()=>{
  const a=app(),start=a.indexOf('function startCourse'),end=a.indexOf('function startTransfer',start),body=a.slice(start,end);
  const restore=body.indexOf('restoreLessonPractice(block)'),phrase=body.indexOf('PhraseDrill.session');
  assert.ok(restore>=0&&phrase>restore);
});

test('K1-BOUNDARIES scheduler and fsrs vendor are not referenced by new course progress layer',()=>{
  const cp=fs.readFileSync('course-progress.js','utf8');
  assert.ok(!/scheduler|fsrs-vendor|ReviewScheduler/.test(cp));
  const cloud=fs.readFileSync('cloud.js','utf8');
  assert.ok(cloud.includes('copy.session=null'));
  assert.ok(!/courseProgress\s*=\s*null|delete\s+copy\.courseProgress/.test(cloud));
});

console.log('K1 verify PASS:',passed,'tests');
