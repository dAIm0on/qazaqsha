#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Schema=require('./lesson-v2-schema.js');

const lessonIds=['2-1','2-2','2-3','3-1','3-2','3-3'];
const compiledText=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
const compiledJson=compiledText.replace(/^.*?window\.LESSON_V2_COMPILED\s*=\s*/s,'').replace(/;\s*$/s,'');
const compiledAll=JSON.parse(compiledJson);
const packages=lessonIds.map(id=>{
  const p=compiledAll.find(x=>x.lesson_id===id);
  assert.ok(p,'compiled package missing '+id);
  return Schema.validate(p);
});
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
  const p=mock.LessonV2Runtime.byId(lessonId);
  assert.ok(p,'installed lesson missing '+lessonId);
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

// 2-2 canonical S1-S8 bank carries direct ruleIds. Optional practice must select
// the requested rule without leaking unrelated future rules.
const r22='v2:2-2:sizder';
const stage22=stageCoreFor('2-2',r22);
const direct22=directFor('2-2',r22);
assert.ok(stage22.size>0,'2-2 canonical stages need sizder coverage');
assert.ok(direct22.size>0,'2-2 canonical bank must carry direct ruleIds');
const p22biz=mock.LessonV2Runtime.practiceForRule('2-2','v2:2-2:biz',12);
assert.ok(p22biz.length>0,'2-2 biz optional practice should produce cards');
assert.ok(p22biz.every(id=>question(id)&&(question(id).ruleIds||[]).includes('v2:2-2:biz')),'early biz practice must come from direct biz-tagged items');
const p22=mock.LessonV2Runtime.practiceForRule('2-2',r22,999);
assert.ok(p22.length>0,'2-2 sizder optional practice should produce cards');
assert.ok(p22.every(id=>stage22.has(id)||direct22.has(id)));
assert.ok(p22.some(id=>direct22.has(id)));

// 2-3 canonical ordinal bank also carries direct ruleIds.
const r23='v2:2-3:ordp';
const stage23=stageCoreFor('2-3',r23);
const direct23=directFor('2-3',r23);
assert.ok(stage23.size>0,'2-3 ordinal-person stage mapping missing');
assert.ok(direct23.size>0,'2-3 canonical ordinal-person items need direct ruleIds');
const p23ord=mock.LessonV2Runtime.practiceForRule('2-3','v2:2-3:ord',12);
assert.ok(p23ord.length>0,'2-3 ordinal optional practice should produce cards');
assert.ok(p23ord.every(id=>question(id)&&(question(id).ruleIds||[]).includes('v2:2-3:ord')),'early ordinal practice must stay on ordinal-tagged items');
const p23=mock.LessonV2Runtime.practiceForRule('2-3',r23,12);
assert.ok(p23.length>0,'2-3 ordinal-person optional practice should produce cards');
assert.ok(p23.every(id=>question(id)&&question(id).topic==='rules'));

// 3-x regression: direct non-verb ruleIds must work for possessive/person banks too.
const p31=mock.LessonV2Runtime.practiceForRule('3-1','v2:3-1:poss',12);
assert.ok(p31.length>0,'3-1 possessive optional practice should produce cards');
assert.ok(p31.every(id=>question(id)&&question(id).topic==='possessive'));

const p32=mock.LessonV2Runtime.practiceForRule('3-2','v2:3-2:poss',12);
assert.ok(p32.length>0,'3-2 possessive optional practice should produce cards');
assert.ok(p32.every(id=>question(id)&&question(id).topic==='possessive'));

const p33=mock.LessonV2Runtime.practiceForRule('3-3','v2:3-3:who-whose',12);
assert.ok(p33.length>0,'3-3 person optional practice should produce cards');
assert.ok(p33.every(id=>question(id)&&question(id).topic==='person'));

// Stage-only fallback remains supported for legacy/non-direct banks.
const p22installed=mock.LessonV2Runtime.byId('2-2');
mock.COURSE.questions.push({
  id:'fixture-stage-only-nonverb',
  lessonId:'2-2',
  topic:'person',
  ruleIds:[],
  stimulus:'Біз + жаңа сөз',
  fields:[{label:'Ответ',kind:'text',answers:['форма']}]
});
p22installed.stages.push({
  id:'fixture-stage-only',
  title:'fixture stage-only',
  kind:'learning',
  core_ids:['fixture-stage-only-nonverb'],
  required_independent_ids:['fixture-stage-only-nonverb'],
  rule_ids:['v2:fixture:stage-only'],
  min_independent_ratio:0.8,
  max_presentations:4,
  final:false
});
assert.deepEqual(
  Array.from(mock.LessonV2Runtime.practiceForRule('2-2','v2:fixture:stage-only',12)),
  ['fixture-stage-only-nonverb']
);

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
assert.equal(tracks22.length,8,'2-2 must expose S1-S8 learning tracks');
assert.ok(tracks22.every(x=>x.topic==='person'),'2-2 tracks should be person, not verbs');
const tracks23=mock.LEARNING.lessons.filter(x=>x.courseLesson==='2-3');
assert.equal(tracks23.length,8,'2-3 must expose S1-S8 learning tracks');
assert.ok(tracks23.every(x=>x.topic==='rules'),'2-3 canonical tracks should use rules topic');
const track31=mock.LEARNING.lessons.find(x=>x.id==='v2-track-stage-3-1-1-1');
assert.ok(track31,'3-1 first track missing');
assert.equal(track31.topic,'possessive');
const track32=mock.LEARNING.lessons.find(x=>x.id==='v2-track-stage-3-2-1-1');
assert.ok(track32,'3-2 first track missing');
assert.equal(track32.topic,'possessive');

console.log('OPTIONAL_PRACTICE_V2_VERIFY_OK',{
  p21:p21.length,
  p22:p22.length,
  p23:p23.length,
  p31:p31.length,
  p32:p32.length,
  p33:p33.length,
  tracks22:tracks22.length
});
