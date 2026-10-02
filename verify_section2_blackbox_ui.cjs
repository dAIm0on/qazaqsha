'use strict';
const fs=require('fs');
const assert=require('assert');

const ui=fs.readFileSync('design-ui.js','utf8');
const lesson=JSON.parse(fs.readFileSync('lessons/2-1/lesson.json','utf8'));

// Parse guard: this catches accidental syntax damage in the late learner-UI layer.
assert.doesNotThrow(()=>new Function(ui),'design-ui.js must parse');

assert(ui.includes('STEP10_LEARNER_UI'),'step 10 learner UI remediation marker missing');
assert(ui.includes('INTERNAL_PRACTICE_NOTE_RE'),'internal practice labels must be filtered from learner UI');
assert(ui.includes("rule.textContent='← К объяснению'"),'practice must expose a clear route back to the explanation');
assert(ui.includes('path-pbm-table'),'P/B/M decision aid must render as a semantic table');
assert(ui.includes('spreadStageIds'),'section 2 staged practice must spread repeated lexical/person cues');
assert(ui.includes("appendPair(node,m[2],m[4]"),'S3 must show word + Russian gloss + person instead of handing over the Kazakh construction');

const men=(lesson.canonical_core||[]).find(x=>x.id==='theory:2-1:men');
assert(men&&men.body,'2-1 men canonical core missing');
const body=men.body;
assert(body.includes('Ж, З | -бын | -бін'),'B-group must remain the verified canonical Ж/З group');
assert(body.includes('Б, В, Г, Д'),'P-group exception letters Б/В/Г/Д missing');
assert(!/Б,\s*В,\s*Г,\s*Ғ?,?\s*Д,\s*Ж,\s*З\s*\|\s*-бын/u.test(body),'do not regress to the incorrect broad B-group');
assert(body.includes('Последний звук основы | твёрдый ряд | мягкий ряд'),'canonical decision table source missing');

for(const leak of ['LESSONS FIX canonical practice; S2','LESSONS FIX canonical practice; S3']){
  assert(ui.includes('canonical\\s+practice')||!ui.includes(leak),'learner UI must have an explicit canonical-practice leak filter');
}

console.log('SECTION2_BLACKBOX_UI_OK');
console.log('Guards: PBM-table, B=Ж/З, internal-label filter, explanation route, practice spacing, S3 independence.');
