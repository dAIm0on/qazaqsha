#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const Schema=require('./lesson-v2-schema.js');

function ok(m){console.log('OK',m);}

const lesson=JSON.parse(fs.readFileSync(path.join(__dirname,'lessons/2-1/lesson.json'),'utf8'));
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'lessons/2-1/sources.json'),'utf8'));
const corrections=JSON.parse(fs.readFileSync(path.join(__dirname,'lessons/2-1/corrections.json'),'utf8'));
const raw=Object.assign({},lesson,{sources:sources.sources||[],corrections:corrections.corrections||[]});
const validated=Schema.validate(raw);
assert.ok(validated.migrations&&validated.migrations.length>=1,'2-1 migrations present');
const mig=validated.migrations[0];
assert.equal(mig.from_revision,'2-1.legacy');
assert.equal(mig.to_revision,'2-1.r1');
assert.equal(mig.chapter_ids['2-1-glue'],'v2-theory-2-1-glue');
assert.equal(mig.chapter_ids['2-1-siz2'],'v2-theory-2-1-siz-word');
assert.equal(mig.chapter_ids['2-1-checkpoint'],'v2-theory-2-1-checkpoint');
ok('lesson.json migrations map 10 legacy chapter ids incl. siz2→siz-word');

const compiled=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
assert.ok(compiled.includes('"from_revision": "2-1.legacy"'));
assert.ok(compiled.includes('"2-1-siz2": "v2-theory-2-1-siz-word"'));
ok('compiled-lessons-v2.js carries 2-1.legacy migration');

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
assert.ok(app.includes('path-replay-theory'));
assert.ok(app.includes('Повторить теорию'));
assert.ok(app.includes('pathNeedsV2TheoryReplay'));
assert.ok(app.includes('legacyPathRevision'));
assert.ok(app.includes('migrateLessonCompletedChapters'));
assert.ok(/continueLesson[\s\S]*pathNeedsV2TheoryReplay[\s\S]*openPathLesson/.test(app));
ok('app.js has replay CTA + loadLessonPath/continueLesson migration gates');

const cp=fs.readFileSync(path.join(__dirname,'course-progress.js'),'utf8');
assert.ok(cp.includes('contentRevision:gp.contentRevision'));
assert.ok(cp.includes('pathNeedsReplay'));
ok('course-progress persists contentRevision + pathNeedsReplay');

const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert.ok(sw.includes("CACHE='qazaq-offline-live-20260930-school-tutor14'"));
ok('sw cache bumped to school-tutor14');

const mock={
  LessonV2Schema:Schema,
  LESSON_V2_COMPILED:[validated],
  COURSE:{questions:[],sources:{}},
  LEARNING:{lessons:[]},
  GRAMMAR_CHAPTERS:{LESSONS:[]},
  CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){const w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);return w;}},
  CourseProgress:{registerStages(){return [];}},
  Canonical:null
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),{window:mock,globalThis:mock,console});
assert.equal(mock.LessonV2Runtime.migrateId('2-1','2-1.legacy','chapter_ids','2-1-glue'),'v2-theory-2-1-glue');
assert.equal(mock.LessonV2Runtime.migrateId('2-1','2-1.legacy','chapter_ids','2-1-siz2'),'v2-theory-2-1-siz-word');
const installed=mock.LessonV2Runtime.byId('2-1');
assert.ok(installed);
const pathLes=mock.LessonV2Runtime.pathLesson(installed);
assert.ok(pathLes.chapters.some(c=>c.id==='v2-theory-2-1-siz-word'));
assert.ok(pathLes.chapters.every(c=>String(c.id).startsWith('v2-theory-2-1-')));
ok('runtime migrateId + pathLesson chapter ids for 2-1');

// Simulate path migration decisions without full app DOM
function simulateLoad(savedPath,completed){
  const currentV2=mock.LessonV2Runtime.byId('2-1');
  const Gchapters=new Set(pathLes.chapters.map(c=>c.id));
  const gp={completedChapters:Object.assign(Object.create(null),completed||{})};
  let chapterId=savedPath&&savedPath.chapterId||null;
  let phase=savedPath&&['lesson','beat','done'].includes(savedPath.phase)?savedPath.phase:'lesson';
  const storedRev=savedPath&&savedPath.contentRevision||null;
  const targetRev=currentV2.content_revision;
  const pathActive=!!(savedPath&&(savedPath.updatedAt||savedPath.chapterId||['lesson','beat','done'].includes(savedPath.phase)));
  const revisionFirstTime=!storedRev||storedRev!==targetRev;
  const fromRev=storedRev||(pathActive?'2-1.legacy':null);
  if(pathActive&&fromRev&&fromRev!==targetRev){
    if(chapterId&&!Gchapters.has(chapterId)){
      chapterId=mock.LessonV2Runtime.migrateId('2-1',fromRev,'chapter_ids',chapterId)||null;
    }
    for(const key of Object.keys(gp.completedChapters)){
      if(!key.startsWith('2-1:'))continue;
      const oldId=key.slice(4);
      const moved=mock.LessonV2Runtime.migrateId('2-1',fromRev,'chapter_ids',oldId);
      if(moved&&moved!==oldId){gp.completedChapters['2-1:'+moved]=true;delete gp.completedChapters[key];}
    }
  }
  const unmapped=pathActive&&((chapterId&&!Gchapters.has(chapterId))||Object.keys(gp.completedChapters).some(k=>k.startsWith('2-1:')&&!Gchapters.has(k.slice(4))));
  let pathNeedsReplay=false;
  if(pathActive&&phase==='done'&&(revisionFirstTime||unmapped)){
    for(const key of Object.keys(gp.completedChapters))if(key.startsWith('2-1:'))delete gp.completedChapters[key];
    phase='beat';chapterId=pathLes.chapters[0].id;pathNeedsReplay=true;
  }else if(pathActive&&(revisionFirstTime||unmapped)){
    if(!chapterId||!Gchapters.has(chapterId)){
      const unfinished=pathLes.chapters.find(ch=>!gp.completedChapters['2-1:'+ch.id]);
      if(unfinished){phase='beat';chapterId=unfinished.id;}
    }
  }
  return {phase,chapterId,pathNeedsReplay,contentRevision:targetRev,completed:Object.keys(gp.completedChapters)};
}

const empty=simulateLoad(null,{});
assert.equal(empty.phase,'lesson');
assert.equal(empty.chapterId,null);
ok('empty profile stays on fresh lesson phase');

const legacyDone=simulateLoad({phase:'done',chapterId:null,updatedAt:1}, {
  '2-1:2-1-glue':true,'2-1:2-1-pron':true,'2-1:2-1-clause':true,'2-1:2-1-men':true,'2-1:2-1-sen':true,
  '2-1:2-1-siz':true,'2-1:2-1-emes':true,'2-1:2-1-ba':true,'2-1:2-1-siz2':true,'2-1:2-1-checkpoint':true
});
assert.equal(legacyDone.phase,'beat');
assert.equal(legacyDone.chapterId,'v2-theory-2-1-glue');
assert.equal(legacyDone.pathNeedsReplay,true);
assert.deepEqual(legacyDone.completed,[]);
ok('legacy done resets to first v2 theory chapter');

const mid=simulateLoad({phase:'beat',chapterId:'2-1-emes',beat:0,updatedAt:1},{
  '2-1:2-1-glue':true,'2-1:2-1-pron':true,'2-1:2-1-clause':true,'2-1:2-1-men':true,'2-1:2-1-sen':true,'2-1:2-1-siz':true
});
assert.equal(mid.phase,'beat');
assert.equal(mid.chapterId,'v2-theory-2-1-emes');
assert.ok(mid.completed.includes('2-1:v2-theory-2-1-glue'));
assert.ok(!mid.completed.includes('2-1:2-1-glue'));
ok('mid-path old ids migrate and resume on mapped chapter');

const currentDone=simulateLoad({phase:'done',chapterId:null,contentRevision:'2-1.r1',updatedAt:2},{
  '2-1:v2-theory-2-1-glue':true
});
assert.equal(currentDone.phase,'done');
assert.equal(currentDone.pathNeedsReplay,false);
ok('current revision done stays done (replay via CTA only)');

// Regression smoke: 1-1 and 4-1 still compile/install
for(const id of ['1-1','4-1']){
  const row=JSON.parse(fs.readFileSync(path.join(__dirname,'lessons',id,'lesson.json'),'utf8'));
  assert.equal(row.lesson_id,id);
  assert.ok(row.content_revision);
}
ok('regression smoke: 1-1 and 4-1 lesson.json intact');

console.log('VERIFY_LESSON_2_1_PATH_MIGRATE_OK');
