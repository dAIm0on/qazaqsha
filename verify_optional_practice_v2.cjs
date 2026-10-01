#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Schema=require('./lesson-v2-schema.js');

const lessonIds=['2-1','2-2','2-3'];
const rawLessons=lessonIds.map(id=>JSON.parse(fs.readFileSync(path.join(__dirname,'lessons',id,'lesson.json'),'utf8')));
const packages=rawLessons.map(Schema.validate);
const registered={};

const mock={
  LessonV2Schema:Schema,
  LESSON_V2_COMPILED:packages,
  COURSE:{questions:[],sources:{}},
  LEARNING:{lessons:[]},
  GRAMMAR_CHAPTERS:{LESSONS:[]},
  CURRICULUM:{
    words:[],rules:[],lessons:[],
    addWord(kazakh,translation,lesson,role){
      let w=this.words.find(x=>x.kazakh===kazakh);
      if(!w){
        w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};
        this.words.push(w);
      }
      return w;
    }
  },
  CourseProgress:{
    registerStages(lessonId,stages){
      registered[lessonId]=JSON.parse(JSON.stringify(stages));
      return stages;
    }
  },
  Canonical:null
};

vm.runInNewContext(
  fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),
  {window:mock,globalThis:mock,console}
);
mock.LessonV2Runtime.installAll();

const question=id=>mock.COURSE.questions.find(q=>q.id===id);
const stageCoreFor=(lessonId,ruleId)=>{
  const p=packages.find(x=>x.lesson_id===lessonId);
  return new Set((p.stages||[]).filter(s=>(s.rule_ids||[]).includes(ruleId)).flatMap(s=>s.core_ids||[]));
};
const directFor=(lessonId,ruleId)=>new Set(
  mock.COURSE.questions
    .filter(q=>q.lessonId===lessonId&&(q.ruleIds||[]).includes(ruleId))
    .map(q=>q.id)
);

// 2-1 proves a non-verb topic can drive optional practice directly by ruleIds.
const p21=mock.LessonV2Runtime.practiceForRule('2-1','v2:2-1:men',12);
assert.ok(p21.length>0,'2-1 optional practice should not be blocked by topic=person');
assert.ok(p21.every(id=>question(id)&&question(id).topic==='person'));
assert.equal(new Set(p21).size,p21.length);

// 2-2 proves legacy/non-verb banks without question.ruleIds are reachable through stage rule_ids -> core_ids.
const r22='v2:2-2:biz';
const stage22=stageCoreFor('2-2',r22);
const direct22=directFor('2-2',r22);
assert.ok(stage22.size>0,'2-2 fixture needs stage mapping');
assert.equal(direct22.size,0,'2-2 fixture must exercise stage-only fallback');
const p22=mock.LessonV2Runtime.practiceForRule('2-2',r22,999);
assert.ok(p22.length>0,'2-2 stage-only optional practice should produce cards');
assert.ok(p22.every(id=>stage22.has(id)||direct22.has(id)));
assert.ok(p22.some(id=>stage22.has(id)));

// 2-3 proves the same contract works for a different grammar topic.
const r23='v2:2-3:ord';
const stage23=stageCoreFor('2-3',r23);
assert.ok(stage23.size>0,'2-3 ordinal stage mapping missing');
const p23=mock.LessonV2Runtime.practiceForRule('2-3',r23,12);
assert.ok(p23.length>0,'2-3 optional practice should produce cards');
assert.ok(p23.every(id=>question(id)&&['person','numbers'].includes(question(id).topic)));

// Direct non-verb fallback must work even when no stage mentions the rule.
mock.COURSE.questions.push({
  id:'fixture-direct-nonverb',
  lessonId:'2-1',
  topic:'possessive',
  ruleIds:['v2:fixture:direct'],
  stimulus:'Менің + кітап',
  fields:[{label:'Ответ',kind:'text',answers:['кітабым']}]
});
mock.COURSE.questions.push({
  id:'fixture-other-lesson',
  lessonId:'2-2',
  topic:'possessive',
  ruleIds:['v2:fixture:direct'],
  stimulus:'Сенің + кітап',
  fields:[{label:'Ответ',kind:'text',answers:['кітабың']}]
});
assert.deepEqual(
  Array.from(mock.LessonV2Runtime.practiceForRule('2-1','v2:fixture:direct',12)),
  ['fixture-direct-nonverb']
);

// Unknown/unmapped rules stay empty instead of inventing unrelated practice.
assert.deepEqual(Array.from(mock.LessonV2Runtime.practiceForRule('2-1','v2:fixture:none',12)),[]);

// Limit and de-duplication remain intact.
const limited=mock.LessonV2Runtime.practiceForRule('2-2',r22,3);
assert.equal(limited.length,3);
assert.equal(new Set(limited).size,3);

// Optional pool lookup must not mutate staged-practice registration.
const beforeStages=JSON.stringify(registered);
for(let i=0;i<3;i++)mock.LessonV2Runtime.practiceForRule('2-2',r22,12);
assert.equal(JSON.stringify(registered),beforeStages);

// Learning tracks must reflect their real topic instead of classifying every v2 stage as verbs.
const tracks22=mock.LEARNING.lessons.filter(x=>x.courseLesson==='2-2');
assert.ok(tracks22.length>0);
assert.ok(tracks22.every(x=>x.topic==='person'),'2-2 tracks should be person, not verbs');
const ordTrack=mock.LEARNING.lessons.find(x=>x.id==='v2-track-stage-2-3-ord');
assert.ok(ordTrack,'2-3 ordinal track missing');
assert.equal(ordTrack.topic,'numbers');

console.log('OPTIONAL_PRACTICE_V2_VERIFY_OK',{
  p21:p21.length,
  p22:p22.length,
  p23:p23.length,
  tracks22:tracks22.length
});
