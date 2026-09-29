#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Schema=require('./lesson-v2-schema.js');
const Nonpast=require('./nonpast-engine.js');

const base=path.join(__dirname,'lessons','4-1');
const raw=JSON.parse(fs.readFileSync(path.join(base,'lesson.json'),'utf8'));
raw.sources=JSON.parse(fs.readFileSync(path.join(base,'sources.json'),'utf8')).sources;
raw.corrections=JSON.parse(fs.readFileSync(path.join(base,'corrections.json'),'utf8')).corrections;
const fixtures=JSON.parse(fs.readFileSync(path.join(base,'qa-fixtures.json'),'utf8'));
const p=Schema.validate(raw);
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};

assert.equal(p.lesson_id,'4-1');
assert.ok(p.theory.length>=8);
assert.ok(p.sources.filter(x=>x.role==='SCHOOL_NORM').length>=3);
assert.ok(p.sources.filter(x=>x.role==='RESEARCH_VERIFIED').length>=5);
ok('schema + source/research coverage');

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
assert.ok(expanded.length>=250,'practice bank too small');
assert.equal(new Set(expanded.map(x=>x.id)).size,expanded.length);
ok('large deterministic practice bank + stable unique ids');

const corr=new Map(p.corrections.map(x=>[x.source_item_id,x]));
assert.equal(corr.get('6-1.4').corrected.includes('Ол жазады'),true);
assert.equal(corr.get('6-2.3').corrected.includes('Сіз таппайсыз'),true);
for(const f of fixtures.known_bad){
  const c=p.corrections.find(x=>x.qa_fixture_id===f.id);
  assert.ok(c,'missing correction '+f.id);
  assert.ok(c.corrected.includes(f.expected.replace(/[.]$/,'')),f.id);
}
ok('known-bad source keys are explicit reviewed corrections');

const practiceBlob=JSON.stringify([...p.original_exercises,...p.generated_questions,...expanded]);
for(const blocked of fixtures.blocked_future)assert.equal(practiceBlob.includes(blocked),false,'future grammar leaked into practice: '+blocked);
ok('future grammar blocked from practice');

assert.ok(p.homework.source_items.length===4);
assert.ok(p.homework.exercise_ids.length>=50);
assert.ok(p.homework.external_tasks.some(x=>/PerehVremyaBezIsk/.test(x.url)));
assert.equal(p.vocabulary.filter(x=>x.role==='target').length,10);
ok('homework source fidelity + target vocabulary');

assert.ok(p.stages.length>=6);
assert.equal(p.stages.at(-1).final,true);
for(const s of p.stages)assert.ok(s.core_ids.length>=3,s.id);
ok('stage progression + final gate');

const ids=[];
for(const group of [p.rules,p.theory,p.vocabulary,p.original_exercises,p.generated_questions,p.practice_generators,p.corrections,p.stages])for(const x of group)ids.push(x.id);
assert.equal(new Set(ids).size,ids.length);
ok('persistent ids unique');

const dummy={
 schema_version:2,lesson_id:'9-9',content_revision:'9-9.r1',title:'Fixture',status:'draft',
 sources:[{id:'m',role:'SCHOOL_NORM',title:'m',url:'https://example.com/m'},{id:'e',role:'SCHOOL_NORM',title:'e',url:'https://example.com/e'},{id:'h',role:'SCHOOL_NORM',title:'h',url:'https://example.com/h'}],
 prerequisites:{lessons:[],skills_required:[],skills_review:[]},scope:{allowed:['x'],blocked_future:[]},
 rules:[{id:'v2:9-9:x',title:'X'}],
 theory:[{id:'theory:9-9:x',rule_id:'v2:9-9:x',title:'X',meaning:'X',fullExplanation:'Полное объяснение.',shortHint:'X',decisionSteps:['X'],examples:[{kazakh:'бар',translation:'есть'}],contrastExamples:[],limitations:[],commonConfusions:[],source_refs:['m'],checks:[{id:'check:9-9:x',type:'one_prod',prompt:'X?',answers:['x'],error_key:'x'}]}],
 vocabulary:[],original_exercises:[{id:'src:9-9:x',origin:'school',topic:'verbs',title:'X',stimulus:'X',fields:[{label:'Ответ',kind:'text',answers:['x']}],explanation:'X'}],
 generated_questions:[],practice_generators:[],corrections:[],
 stages:[{id:'stage:9-9:x',title:'X',kind:'checkpoint',core_ids:['src:9-9:x'],required_independent_ids:['src:9-9:x'],rule_ids:['v2:9-9:x'],final:true}],
 homework:{source_items:[{id:'hw:9-9:1',number:'1',text:'X',source_ref:'h'}],word_ids:[],exercise_ids:['src:9-9:x'],external_tasks:[],checklist:['exercises']}
};
assert.equal(Schema.validate(dummy).lesson_id,'9-9');
ok('generic second lesson validates without lesson-specific code');

console.log('LESSON_V2_VERIFY_OK',passed);
