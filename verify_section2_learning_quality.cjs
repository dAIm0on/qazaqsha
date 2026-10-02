#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Schema=require('./lesson-v2-schema.js');

const compiledText=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
const compiledJson=compiledText.replace(/^.*?window\.LESSON_V2_COMPILED\s*=\s*/s,'').replace(/;\s*$/s,'');
const all=JSON.parse(compiledJson);

const expected={
  '2-1':{
    revision:'2-1.r2',core:10,refs:4,canonicalPractice:79,prereq:['1-3'],
    anchors:[/основа/i,/П\s*[\/,]\s*Б\s*[\/,]\s*М/i,/емес/i,/ба\s*\/\s*бе/i,/BatylBol/i]
  },
  '2-2':{
    revision:'2-2.r2',core:11,refs:6,canonicalPractice:83,prereq:['2-1'],
    anchors:[/біз/i,/сендер/i,/сіздер/i,/сыңдар/i,/сіңдер/i,/сыздар/i,/сіздер/i,/BatylBol/i]
  },
  '2-3':{
    revision:'2-3.r2',core:15,refs:7,canonicalPractice:88,prereq:['2-2'],
    anchors:[/олар/i,/ыншы/i,/інші/i,/ншы/i,/нші/i,/жиырмасыншы/i,/қырқыншы/i,/па\s*\/\s*пе/i,/ба\s*\/\s*бе/i,/ма\s*\/\s*ме/i,/BatylBol/i]
  }
};

const forbiddenStudentCodes=[
  /\b(?:DAT|LOC|ABL|ACC|COP|AGR|PTCP|CVB|POSS(?:_\d+)?)\b/,
  /\brule_ids?\b/i,/\bsource_refs?\b/i,/\bcore_ids?\b/i,/\bdiagnostic_codes?\b/i
];

function norm(s){
  return String(s||'').toLocaleLowerCase('kk-KZ').replace(/[«»“”"'`.,!?;:()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();
}
function bodyText(p){return [...p.canonical_core,...p.references].map(x=>x.body).join('\n');}
function assertNoInternalCodes(text,label){
  for(const re of forbiddenStudentCodes)assert.ok(!re.test(text),label+' leaked internal code '+re);
}
function assertStageLinks(p){
  const qById=new Map(p.original_exercises.map(q=>[q.id,q]));
  const stages=p.stages;
  assert.equal(stages.length,8,p.lesson_id+' must have exactly S1-S8 stages');
  const wanted=['S1','S2','S3','S4','S5','S6','S7','S8'];
  stages.forEach((s,i)=>{
    assert.ok(s.id.endsWith(':'+wanted[i]),p.lesson_id+' stage order '+wanted[i]);
    assert.ok(s.core_ids.length>0,p.lesson_id+' '+wanted[i]+' empty core');
    assert.ok(s.required_independent_ids.length>0,p.lesson_id+' '+wanted[i]+' empty independent set');
    const core=new Set(s.core_ids);
    for(const id of s.required_independent_ids)assert.ok(core.has(id),p.lesson_id+' '+wanted[i]+' independent id outside core '+id);
    for(const id of s.core_ids){
      const q=qById.get(id);
      assert.ok(q,p.lesson_id+' '+wanted[i]+' missing exercise '+id);
      assert.equal(q.origin,'canonical',p.lesson_id+' '+wanted[i]+' must use canonical item '+id);
    }
    if(i<7)assert.equal(s.final,false,p.lesson_id+' only S8 may be final');
  });
  assert.equal(stages[7].final,true,p.lesson_id+' S8 must be final');
  assert.ok(stages[7].min_independent_ratio>=0.8,p.lesson_id+' S8 independent threshold regressed');
  assert.ok(stages[7].required_independent_ids.length>=12,p.lesson_id+' S8 mastery set unexpectedly small');
}
function assertNoProductionLeak(p){
  const qById=new Map(p.original_exercises.map(q=>[q.id,q]));
  const productionStages=p.stages.filter(s=>/:S(?:4|5|7|8)$/.test(s.id));
  for(const s of productionStages){
    for(const id of s.core_ids){
      const q=qById.get(id); if(!q||!q.fields||!q.fields.length)continue;
      const stimulus=norm(q.stimulus);
      const first=q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0];
      const answer=norm(first);
      if(answer.length<3)continue;
      assert.ok(!stimulus.includes(answer),p.lesson_id+' answer leak before attempt in '+id+': '+first);
    }
  }
}

for(const [lessonId,e] of Object.entries(expected)){
  const compiled=all.find(x=>x.lesson_id===lessonId);
  assert.ok(compiled,'compiled package missing '+lessonId);
  const p=Schema.validate(compiled);

  assert.equal(p.content_revision,e.revision,lessonId+' revision');
  assert.equal(p.status,'reviewed',lessonId+' must stay reviewed until black-box approval');
  assert.equal(p.release.approved,false,lessonId+' must not release before black-box approval');
  assert.deepEqual(p.prerequisites.lessons,e.prereq,lessonId+' prerequisite chain');
  assert.equal(p.canonical_core.length,e.core,lessonId+' canonical core count');
  assert.equal(p.references.length,e.refs,lessonId+' reference count');

  const canonical=p.original_exercises.filter(q=>q.origin==='canonical');
  assert.equal(canonical.length,e.canonicalPractice,lessonId+' canonical practice count');
  assert.equal(new Set(canonical.map(q=>q.id)).size,canonical.length,lessonId+' duplicate canonical practice ids');

  const coreChars=p.canonical_core.reduce((n,x)=>n+x.body.length,0);
  const refChars=p.references.reduce((n,x)=>n+x.body.length,0);
  assert.ok(coreChars>=e.core*700,lessonId+' canonical CORE shrank too far: '+coreChars);
  assert.ok(refChars>=e.refs*450,lessonId+' references shrank too far: '+refChars);
  for(const c of p.canonical_core)assert.ok(c.body.length>=250,lessonId+' suspiciously short CORE '+c.id+' '+c.body.length);
  for(const r of p.references)assert.ok(r.body.length>=180,lessonId+' suspiciously short reference '+r.id+' '+r.body.length);

  const studentText=bodyText(p);
  for(const re of e.anchors)assert.ok(re.test(studentText),lessonId+' missing canonical concept '+re);
  assertNoInternalCodes(studentText,lessonId+' CORE/reference');

  assert.deepEqual(p.practice_policy.stages,['S1','S2','S3','S4','S5','S6','S7','S8'],lessonId+' practice ladder');
  assert.equal(p.practice_policy.no_answer_before_attempt,true,lessonId+' answer policy');
  assert.equal(p.practice_policy.translation_every_occurrence,true,lessonId+' translation policy');
  assert.equal(p.practice_policy.final_reference_default,'closed',lessonId+' final references must start closed');
  assert.ok(p.practice_policy.repair_min_intervening>=3,lessonId+' repair spacing too small');
  assert.ok(p.practice_policy.repair_preferred_intervening>=4,lessonId+' preferred repair spacing too small');

  assertStageLinks(p);
  assertNoProductionLeak(p);

  const batyl=(p.homework.external_tasks||[]).filter(x=>/batylbol\.kz/i.test(x.url));
  assert.ok(batyl.length>=1,lessonId+' missing BatylBol reinforcement link');
}

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
assert.match(app,/if\(beat\.k==='core'\)[\s\S]{0,1200}fmtCoreLine/,'canonical CORE renderer missing');
assert.match(app,/match\(\/\^\(\.\+\?\)\\s\+—\\s\+\(\.\+\)\$\//,'CORE translation-pair recognizer missing');
assert.match(app,/fmtCoreLine[\s\S]{0,700}<em>/,'paired Russian translation must render italic');
assert.match(app,/answerTokens[\s\S]{0,1200}safe=/,'context reference answer-leak filter missing');
assert.match(app,/updateRecord\(previous,result\.correct,\(hinted\|\|rulePeeked\)/,'reference peek must remain assisted');

console.log('SECTION2_LEARNING_QUALITY_OK',{
  lessons:Object.keys(expected),
  canonicalPractice:Object.fromEntries(Object.entries(expected).map(([id,e])=>[id,e.canonicalPractice])),
  guarantees:['anti-shrink','canonical-stage-links','no-internal-codes','no-production-answer-leak','BatylBol','translation-renderer','review-gate']
});
