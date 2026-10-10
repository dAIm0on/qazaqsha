#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Schema=require('./lesson-v2-schema.js');

const compiledText=fs.readFileSync(path.join(__dirname,'compiled-lessons-v2.js'),'utf8');
const compiledJson=compiledText.replace(/^.*?window\.LESSON_V2_COMPILED\s*=\s*/s,'').replace(/;\s*$/s,'');
const all=JSON.parse(compiledJson);
assert.ok(all.length>=11,'compiled snapshot unexpectedly shrank');

const expected={
  '2-1':{revision:'2-1.r3',core:10,refs:4,depends:['1-3']},
  '2-2':{revision:'2-2.r3',core:11,refs:6,depends:['2-1']},
  '2-3':{revision:'2-3.r3',core:15,refs:7,depends:['2-2']}
};
const packs={};
for(const [id,e] of Object.entries(expected)){
  const raw=all.find(x=>x.lesson_id===id);
  assert.ok(raw,'compiled package missing '+id);
  const p=Schema.validate(raw);packs[id]=p;
  assert.equal(p.content_revision,e.revision,id+' revision');
  assert.equal(p.canonical_core.length,e.core,id+' canonical core count');
  assert.equal(p.references.length,e.refs,id+' reference count');
  assert.deepEqual(p.prerequisites.lessons,e.depends,id+' prerequisites');
  assert.deepEqual(p.practice_policy.stages,['S1','S2','S3','S4','S5','S6','S7','S8'],id+' S1-S8');
  assert.equal(p.practice_policy.no_answer_before_attempt,true,id+' answer leak policy');
  assert.equal(p.practice_policy.translation_every_occurrence,true,id+' translation policy');
  assert.equal(p.practice_policy.repair_min_intervening,3,id+' repair min');
  assert.equal(p.practice_policy.repair_preferred_intervening,4,id+' repair preferred');
  assert.equal(p.practice_policy.final_reference_default,'closed',id+' final reference default');
  for(const c of p.canonical_core){
    assert.ok(c.body.length>100,id+' empty canonical section '+c.id);
    for(const rid of c.rule_ids)assert.ok(p.rules.some(r=>r.id===rid),id+' unknown core rule '+rid);
  }
  for(const r of p.references){
    assert.ok(r.body.length>100,id+' empty reference '+r.id);
    for(const rid of r.rule_ids)assert.ok(p.rules.some(x=>x.id===rid),id+' unknown ref rule '+rid);
  }
}


// P0 author/product leak scan: learner-facing canonical_core bodies must not carry editorial meta.
const AUTHOR_LEAK=/Статус документа|канонический CORE|должен открываться|открывается справочник|prerequisite|нельзя сокращать|Источник курса прямо требует|^УРОК 2–/m;
for(const [id,p] of Object.entries(packs)){
  for(const c of p.canonical_core){
    const hit=String(c.body||'').match(AUTHOR_LEAK);
    assert.equal(hit,null,id+' author/product leak in '+c.id+': '+(hit&&hit[0]));
    const title=String(c.title||'').trim();
    const firstLine=String(c.body||'').split(/\n/)[0].trim();
    assert.notEqual(firstLine,title,id+' duplicates title inside body of '+c.id);
  }
}

const registered={};
const mock={
  LessonV2Schema:Schema,
  LESSON_V2_COMPILED:Object.values(packs),
  COURSE:{questions:[],sources:{}},
  LEARNING:{lessons:[]},
  GRAMMAR_CHAPTERS:{LESSONS:[]},
  CURRICULUM:{
    words:[],rules:[],lessons:[],
    addWord(kazakh,translation,lesson,role){
      let w=this.words.find(x=>x.kazakh===kazakh);
      if(!w){w={id:'word:'+lesson+':'+this.words.length,kazakh,translation:[...translation],card_ids:[],aliases:[kazakh],role};this.words.push(w);}
      return w;
    }
  },
  CourseProgress:{registerStages(id,stages){registered[id]=stages;}},
  Canonical:null
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'lesson-v2-runtime.js'),'utf8'),{window:mock,globalThis:mock,console});
mock.LessonV2Runtime.installAll();

for(const [id,e] of Object.entries(expected)){
  const p=packs[id];
  const pathLesson=mock.LessonV2Runtime.pathLesson(p);
  assert.equal(pathLesson.chapters.length,e.core,id+' runtime chapter count');
  assert.ok(pathLesson.chapters.every(ch=>ch.beats.length===1&&ch.beats[0].k==='core'),id+' must render full core beats');
  assert.equal(pathLesson.chapters.flatMap(ch=>ch.beats).filter(b=>b.k==='fold').length,0,id+' canonical core must not fold');
  for(const ref of p.references){
    for(const rid of ref.rule_ids){
      const got=mock.LessonV2Runtime.referenceForRule(id,rid);
      assert.ok(got,id+' missing reference lookup '+rid);
      assert.equal(got.id,ref.id,id+' wrong reference for '+rid);
    }
  }
  assert.equal((mock.LEARNING.lessons.filter(x=>x.courseLesson===id)).length,8,id+' must expose S1-S8 tracks');
}

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
assert.match(app,/const canRule=.*referenceForRule/s,'practice Rule button must use v2 reference registry');
assert.match(app,/function showRule\(q\)[\s\S]{0,2400}referenceForRule/,'showRule must load v2 reference');
assert.match(app,/updateRecord\(previous,result\.correct,\(hinted\|\|rulePeeked\)/,'rule peek must be assisted for scheduler');
assert.match(app,/stepEvidence\[q\.id\]=result\.correct&&!hinted&&!rulePeeked/,'rule peek must not count as independent evidence');
assert.match(app,/beat\.k==='core'/,'app must render canonical core beat');
assert.match(app,/<em>/,'core/reference translations need italic support');
assert.match(app,/answerTokens[\s\S]{0,900}safe=/,'practice reference must filter current answer examples');

const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert.match(sw,/compiled-lessons-v2\.js/,'service worker must cache compiled lessons');
assert.match(sw,/section2-canonical|section2-1|section2-2|20261007-section2|20261002|20261007-51-live|51-live|s2-core-clean|20261010-nav01|20261010-vocab-qa|20261010-vocab-pr2/i,'service worker cache version must be bumped for section 2');

console.log('SECTION2_CANONICAL_VERIFY_OK',{
  lessons:Object.keys(expected),
  compiled:all.length,
  core:Object.fromEntries(Object.entries(expected).map(([id,e])=>[id,e.core])),
  refs:Object.fromEntries(Object.entries(expected).map(([id,e])=>[id,e.refs]))
});
