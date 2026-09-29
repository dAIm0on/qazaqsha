#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Schema=require('./lesson-v2-schema.js');
const Generators=require('./tools/lesson-generators.cjs');

const root=__dirname,lessonsDir=path.join(root,'lessons');
const legacy=new Set(['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3']);
const dirs=fs.readdirSync(lessonsDir,{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.name.startsWith('_')).map(x=>x.name).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
const built=[],sourceLessons=[];
const ids=new Set(),questionIds=new Set();

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function load(dir){
  const base=path.join(lessonsDir,dir),lessonPath=path.join(base,'lesson.json');
  if(!fs.existsSync(lessonPath))return null;
  const raw=readJson(lessonPath);
  const sources=path.join(base,'sources.json'),corrections=path.join(base,'corrections.json');
  if(fs.existsSync(sources))raw.sources=readJson(sources).sources||[];
  if(fs.existsSync(corrections))raw.corrections=readJson(corrections).corrections||[];
  return Schema.validate(raw);
}

for(const dir of dirs){
  const lesson=load(dir);if(!lesson)continue;
  assert.equal(ids.has(lesson.lesson_id),false,'duplicate lesson '+lesson.lesson_id);ids.add(lesson.lesson_id);
  sourceLessons.push(lesson);

  assert.ok(lesson.theory.length,'no theory '+lesson.lesson_id);
  assert.ok(lesson.rules.length,'no rules '+lesson.lesson_id);
  assert.ok(lesson.stages.length,'no stages '+lesson.lesson_id);
  assert.equal(lesson.stages.filter(x=>x.final).length,1,'exactly one final stage required '+lesson.lesson_id);
  assert.equal(lesson.stages.at(-1).final,true,'final stage must be last '+lesson.lesson_id);

  const school=lesson.sources.filter(x=>x.role==='SCHOOL_NORM');
  if(lesson.status!=='draft')assert.ok(school.length>=3,'reviewed/released lesson needs method+exercise+homework sources '+lesson.lesson_id);
  if(lesson.status==='released')assert.ok(lesson.corrections.every(x=>x.status==='reviewed'),'released lesson has draft correction '+lesson.lesson_id);

  const practiceRules=new Set([...lesson.original_exercises,...lesson.generated_questions].flatMap(q=>q.ruleIds||[]));
  for(const stage of lesson.stages)for(const rid of stage.rule_ids)practiceRules.add(rid);
  for(const t of lesson.theory)assert.ok(practiceRules.has(t.rule_id)||t.checks.length>0,'theory rule has no check/practice '+t.rule_id);

  const generated=Generators.expand(lesson);
  const compiled=JSON.parse(JSON.stringify(lesson));
  compiled.generated_questions=[...(lesson.generated_questions||[]),...generated];
  const normalized=Schema.validate(compiled);
  for(const q of [...normalized.original_exercises,...normalized.generated_questions]){
    assert.equal(questionIds.has(q.id),false,'duplicate question across lessons '+q.id);
    questionIds.add(q.id);
  }
  built.push(normalized);
}

const available=new Set([...legacy,...sourceLessons.map(x=>x.lesson_id)]);
for(const lesson of sourceLessons)for(const dep of lesson.prerequisites.lessons)assert.ok(available.has(dep),'missing prerequisite '+lesson.lesson_id+' -> '+dep);

const graph=new Map(sourceLessons.map(x=>[x.lesson_id,x.prerequisites.lessons.filter(d=>ids.has(d))]));
const visiting=new Set(),done=new Set();
function visit(id){
  if(done.has(id))return;if(visiting.has(id))throw Error('prerequisite cycle at '+id);
  visiting.add(id);for(const dep of graph.get(id)||[])visit(dep);visiting.delete(id);done.add(id);
}
for(const id of graph.keys())visit(id);

const compiledText=fs.readFileSync(path.join(root,'compiled-lessons-v2.js'),'utf8');
const json=compiledText.replace(/^.*?window\.LESSON_V2_COMPILED\s*=\s*/s,'').replace(/;\s*$/s,'');
assert.deepEqual(JSON.parse(json),built,'compiled-lessons-v2.js is stale; run node tools/compile-lessons.cjs');

console.log('LESSON_V2_CONTRACT_OK',JSON.stringify({
  lessons:built.map(x=>x.lesson_id),
  source_questions:sourceLessons.reduce((n,x)=>n+x.original_exercises.length+x.generated_questions.length,0),
  compiled_questions:built.reduce((n,x)=>n+x.original_exercises.length+x.generated_questions.length,0),
  target_words:sourceLessons.reduce((n,x)=>n+x.vocabulary.filter(v=>v.role==='target').length,0)
}));
