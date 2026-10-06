#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const Schema=require('./lesson-v2-schema.js');

function ok(m){console.log('OK',m);}

const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert.ok(sw.includes("CACHE='qazaq-offline-live-20261006-r7-51-6'"));
ok('SW pin words-error-lemma (error9 runtime kept)');

const runtime=fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8');
assert.ok(runtime.includes('function ensure('));
assert.ok(runtime.includes('installShells()'));
assert.ok(runtime.includes('releaseHeavy'));
assert.ok(!/root\.LessonV2Runtime=api;\s*installAll\(\);/.test(runtime),'boot must not call installAll()');
ok('runtime exposes ensure + installShells; boot is lazy');

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
assert.ok(app.includes('function ensureV2'));
assert.ok(app.includes('ensureV2(lessonId)'));
assert.ok(app.includes('ensureV2(block)'));
assert.ok(app.includes('byId.set(q.id,q)'),'ensureV2 must sync byId after lazy install');
assert.ok(app.includes('Lazy install pushes into COURSE.questions'),'ensureV2 documents byId sync');
ok('app ensures v2 packs on path/homework/course open + byId sync');

const knowledge=fs.readFileSync(path.join(__dirname,'knowledge.js'),'utf8');
assert.ok(knowledge.includes('// P0 Error 9: sync only this card'));
assert.ok(!knowledge.includes('sync(state,window.COURSE.questions);return logs;'));
ok('Knowledge.observe no longer syncs entire COURSE.questions');

const compiled=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(compiled,ctx);
const rows=ctx.window.LESSON_V2_COMPILED;
const l41=rows.find(x=>x.lesson_id==='4-1');
const l42=rows.find(x=>x.lesson_id==='4-2');
const l33=rows.find(x=>x.lesson_id==='3-3');
assert.ok(l41&&(l41.generated_questions||[]).length>=300,'4-1 generated content intact');
assert.ok(l42&&(l42.original_exercises||[]).length>=180,'4-2 exercises intact');
assert.ok(l33&&(l33.homework.exercise_ids||[]).length===64,'3-3 HW 64 items intact');
ok('lesson content for 3-3/4-1/4-2 not cut');

function freshMock(list){
  // r7 51: draft-gate — verify under localhost QA bypass so all shells install for nav.
  return {
    location:{hostname:'localhost'},LessonV2Schema:Schema,LESSON_V2_COMPILED:JSON.parse(JSON.stringify(list)),
    COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){const w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);return w;}},
    CourseProgress:{registerStages(){return [];}},Canonical:null
  };
}

const boot=freshMock(rows);
vm.runInNewContext(runtime,{window:boot,globalThis:boot,console});
assert.equal(boot.LessonV2Runtime.installed.size,0,'boot installs zero full packs');
assert.ok(boot.LessonV2Runtime.shells.size>=11,'boot installs shells for navigation');
assert.ok(boot.GRAMMAR_CHAPTERS.LESSONS.find(x=>x.id==='4-2'),'4-2 path shell present');
assert.equal(boot.COURSE.questions.length,0,'no exercise banks at boot');
ok('boot: shells only, no question materialization');

boot.LessonV2Runtime.ensure('4-2');
assert.ok(boot.LessonV2Runtime.byId('4-2'));
assert.ok(boot.COURSE.questions.filter(q=>q.lessonId==='4-2').length>=180);
assert.equal(boot.COURSE.questions.filter(q=>q.lessonId==='4-1').length,0,'4-1 still lazy');
ok('ensure(4-2) hydrates only that lesson');

boot.LessonV2Runtime.ensure('4-1');
assert.ok(boot.COURSE.questions.filter(q=>q.lessonId==='4-1').length>=400);
ok('ensure(4-1) hydrates generated bank without dropping content');

boot.LessonV2Runtime.ensure('3-3');
const hw=boot.LessonV2Runtime.homework('3-3');
assert.equal((hw.homework.exercise_ids||[]).length,64);
ok('ensure(3-3) keeps 64 HW exercise ids');

console.log('VERIFY_CHROME_ERROR9_P0_OK');
