#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Schema=require('./lesson-v2-schema.js');
const Nonpast=require('./nonpast-engine.js');
const Diagnostics=require('./diagnostics.js');
const CourseProgress=require('./course-progress.js');

const base=path.join(__dirname,'lessons','4-1');
const raw=JSON.parse(fs.readFileSync(path.join(base,'lesson.json'),'utf8'));
raw.sources=JSON.parse(fs.readFileSync(path.join(base,'sources.json'),'utf8')).sources;
raw.corrections=JSON.parse(fs.readFileSync(path.join(base,'corrections.json'),'utf8')).corrections;
const fixtures=JSON.parse(fs.readFileSync(path.join(base,'qa-fixtures.json'),'utf8'));
const p=Schema.validate(raw);
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};

assert.equal(p.lesson_id,'4-1');
assert.equal(p.content_revision,'4-1.r1');
assert.ok(p.theory.length>=10);
assert.ok(p.sources.filter(x=>x.role==='SCHOOL_NORM').length>=3);
assert.ok(p.sources.filter(x=>x.role==='RESEARCH_VERIFIED').length>=5);
for(const t of p.theory){
  assert.ok(t.fullExplanation.length>=80,t.id+' explanation too short');
  assert.ok(t.decisionSteps.length>=1,t.id+' no decision steps');
  assert.ok(t.examples.length>=1,t.id+' no examples');
  assert.ok(t.source_refs.length>=1,t.id+' no source refs');
  assert.ok(t.checks.length>=1,t.id+' no checks');
}
ok('schema + source/research + full theory contract');

const gen=p.practice_generators[0],byLemma=new Map(gen.lexemes.map(x=>[x.id,x]));
const form=(id,person,polarity)=>Nonpast.form(byLemma.get(id),person,polarity);
assert.equal(form('kelu','1sg','affirmative'),'келемін');
assert.equal(form('zhazu','1sg','affirmative'),'жазамын');
assert.equal(form('qarau','1sg','affirmative'),'қараймын');
assert.equal(form('zhazu','3','affirmative'),'жазады');
assert.equal(form('zhazu','1sg','negative'),'жазбаймын');
assert.equal(form('shygu','1sg','negative'),'шықпаймын');
assert.equal(form('tabu','1sg','negative'),'таппаймын');
assert.equal(form('keshigu','1sg','negative'),'кешікпеймін');
assert.equal(form('zhabu','1sg','negative'),'жаппаймын');
assert.equal(form('tigu','1sg','negative'),'тікпеймін');
ok('deterministic nonpast engine');

const expanded=Nonpast.expand(p.lesson_id,gen);
assert.equal(expanded.length,322);
assert.equal(new Set(expanded.map(x=>x.id)).size,expanded.length);
const sharedSkills=new Set(expanded.flatMap(q=>(q.skillBindings||[]).map(b=>b.item_id)));
assert.ok(sharedSkills.size<=4,'generated practice exploded into too many FSRS items');
assert.ok([...sharedSkills].every(x=>x.startsWith('rule:v2:4-1:')));
ok('322 generated variants share a small rule-level FSRS skill set');

const corr=new Map(p.corrections.map(x=>[x.source_item_id,x]));
assert.equal(corr.get('6-1.4').corrected.includes('Ол жазады'),true);
assert.equal(corr.get('6-2.3').corrected.includes('Сіз таппайсыз'),true);
for(const f of fixtures.known_bad){
  const c=p.corrections.find(x=>x.qa_fixture_id===f.id);
  assert.ok(c,'missing correction '+f.id);
  assert.ok(c.corrected.includes(f.expected.replace(/[.]$/,'')),f.id);
}
ok('known-bad school keys are explicit reviewed corrections');

const practiceBlob=JSON.stringify([...p.original_exercises,...p.generated_questions,...expanded]);
for(const blocked of fixtures.blocked_future)assert.equal(practiceBlob.includes(blocked),false,'future grammar leaked: '+blocked);
for(const q of [...p.original_exercises,...p.generated_questions]){
  if(q.topic==='verbs'&&q.stimulus.includes('+'))assert.ok(q.stimulus.includes('—'),q.id+' grammar prompt lacks translation');
}
ok('future grammar blocked + grammar practice can work without vocabulary');

assert.equal(p.original_exercises.length,71);
assert.equal(p.homework.source_items.length,4);
assert.equal(p.homework.exercise_ids.length,71);
assert.ok(p.homework.external_tasks.some(x=>/PerehVremyaBezIsk/.test(x.url)));
assert.equal(p.vocabulary.filter(x=>x.role==='target').length,10);
const also=p.vocabulary.find(x=>x.id==='vocab:4-1:also');
assert.deepEqual(also.forms,['да','де','та','те']);
ok('school homework fidelity + ten target vocabulary items + multi-form particle');

assert.ok(p.stages.length>=6);
assert.equal(p.stages.at(-1).final,true);
for(const s of p.stages){
  assert.ok(s.core_ids.length>=3,s.id);
  for(const id of s.required_independent_ids)assert.ok(s.core_ids.includes(id),s.id+' required id outside core');
}
ok('stage progression + final checkpoint');

const ids=[];
for(const group of [p.rules,p.theory,p.vocabulary,p.original_exercises,p.generated_questions,p.practice_generators,p.corrections,p.stages])for(const x of group)ids.push(x.id);
assert.equal(new Set(ids).size,ids.length);
ok('persistent ids unique');

const compiledText=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
const compiledJson=compiledText.replace(/^.*?window\.LESSON_V2_COMPILED\s*=\s*/s,'').replace(/;\s*$/s,'');
assert.deepEqual(JSON.parse(compiledJson),[p]);
ok('compiled snapshot is fresh and normalized');

const bad=JSON.parse(JSON.stringify(raw));
bad.theory[0].source_refs=['missing-source'];
assert.throws(()=>Schema.validate(bad),/source_ref/);
const badRule=JSON.parse(JSON.stringify(raw));
badRule.generated_questions[0].rule_ids=['v2:4-1:no-such-rule'];
assert.throws(()=>Schema.validate(badRule),/rule_id/);
ok('referential integrity rejects missing sources and rules');

const diagCases=[
 ['verb_linker','жазады','жазайды',{topic:'verbs',ruleIds:['v2:4-1:linker','v2:4-1:third'],lessonId:'4-1'}],
 ['verb_negative_linker','кетпейміз','кетпеміз',{topic:'verbs',ruleIds:['v2:4-1:negative','v2:4-1:person'],lessonId:'4-1'}],
 ['verb_negative_harmony','жазбаймын','жазбеймін',{topic:'verbs',ruleIds:['v2:4-1:negative','v2:4-1:person'],lessonId:'4-1'}],
 ['verb_stem_alternation','асықпаймын','асығпаймын',{topic:'verbs',ruleIds:['v2:4-1:negative','v2:4-1:alternation'],lessonId:'4-1'}],
 ['verb_person','таппайсыз','таппайсыздар',{topic:'verbs',ruleIds:['v2:4-1:negative','v2:4-1:person'],lessonId:'4-1'}],
 ['verb_negative_position','жазбаймын','не жазамын',{topic:'verbs',ruleIds:['v2:4-1:negative','v2:4-1:person'],lessonId:'4-1'}]
];
for(const [want,expected,actual,q] of diagCases)assert.ok(Diagnostics.classify(expected,actual,q,{kind:'text'}).includes(want),want);
ok('targeted 4-1 error diagnostics');

const normalizedPractice=CourseProgress.normalizePractice({mode:'course',queue:['x'],position:0,contentRevision:'4-1.r9'});
assert.equal(normalizedPractice.contentRevision,'4-1.r9');
const ctx={lessonId:'3-3',contentRevision:'fixture.r2',stageId:'fixture-stage',kind:'checkpoint',coreIds:['x'],requiredIndependentIds:['x'],ruleIds:[],final:true};
const stale=[{type:'answer',lesson_id:'3-3',stage_id:'fixture-stage',content_revision:'fixture.r1',card_id:'x',correct:true,first_try_correct:1}];
assert.equal(CourseProgress.evaluateStage(stale,ctx).pass,false);
ok('resume keeps content revision and stale stage evidence cannot pass a new revision');

const mock={
  LessonV2Schema:Schema,NonpastEngine:Nonpast,LESSON_V2_COMPILED:[p],
  COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
  CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){
    let w=this.words.find(x=>x.kazakh===kazakh);
    if(!w){w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);}
    return w;
  }},
  CourseProgress:{registerStages(){return [];}},
  Canonical:null
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),{window:mock,globalThis:mock,console});
assert.ok(mock.LessonV2Runtime.byId('4-1'));
assert.equal(mock.COURSE.questions.filter(q=>q.generator).length,322);
assert.equal(mock.COURSE.questions.filter(q=>q.origin==='school').length,71);
assert.equal(mock.COURSE.questions.filter(q=>q.origin==='research').length,23);
assert.equal(mock.COURSE.questions.filter(q=>q.topic==='vocab').length,23);
assert.equal(mock.GRAMMAR_CHAPTERS.LESSONS.find(x=>x.id==='4-1').chapters.length,p.theory.length);
assert.ok(mock.GRAMMAR_CHAPTERS.LESSONS.find(x=>x.id==='4-1').chapters.every(x=>x.fullExplanation.length>=80));
const extra=mock.LessonV2Runtime.practiceForRule('4-1','v2:4-1:negative',12);
assert.equal(extra.length,12);
assert.equal(new Set(extra).size,12);
ok('runtime auto-registers theory, 439 questions, vocabulary and varied optional practice');

const dummy={
 schema_version:2,lesson_id:'9-9',content_revision:'9-9.r1',title:'Fixture',status:'draft',
 sources:[{id:'m',role:'SCHOOL_NORM',title:'m',url:'https://example.com/m'},{id:'e',role:'SCHOOL_NORM',title:'e',url:'https://example.com/e'},{id:'h',role:'SCHOOL_NORM',title:'h',url:'https://example.com/h'}],
 prerequisites:{lessons:[],skills_required:[],skills_review:[]},scope:{allowed:['x'],blocked_future:[]},
 rules:[{id:'v2:9-9:x',title:'X'}],
 theory:[{id:'theory:9-9:x',rule_id:'v2:9-9:x',title:'X',meaning:'X',fullExplanation:'Полное объяснение для независимого второго урока, достаточно длинное для проверки контракта.',shortHint:'X',decisionSteps:['X'],examples:[{kazakh:'бар',translation:'есть'}],contrastExamples:[],limitations:[],commonConfusions:[],source_refs:['m'],checks:[{id:'check:9-9:x',type:'one_prod',prompt:'X?',answers:['x'],error_key:'x'}]}],
 vocabulary:[],original_exercises:[{id:'src:9-9:x',origin:'school',topic:'verbs',title:'X',stimulus:'X',fields:[{label:'Ответ',kind:'text',answers:['x']}],explanation:'X',rule_ids:['v2:9-9:x'],source_refs:['e']}],
 generated_questions:[],practice_generators:[],corrections:[],
 stages:[{id:'stage:9-9:x',title:'X',kind:'checkpoint',core_ids:['src:9-9:x'],required_independent_ids:['src:9-9:x'],rule_ids:['v2:9-9:x'],final:true}],
 homework:{source_items:[{id:'hw:9-9:1',number:'1',text:'X',source_ref:'h'}],word_ids:[],exercise_ids:['src:9-9:x'],external_tasks:[],checklist:['exercises']}
};
assert.equal(Schema.validate(dummy).lesson_id,'9-9');
ok('generic second lesson validates without lesson-specific app code');

console.log('LESSON_V2_VERIFY_OK',passed);
