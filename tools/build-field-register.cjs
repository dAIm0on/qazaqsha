#!/usr/bin/env node
'use strict';
/* r7 FREG: builds field-register.js (runtime sidecar) from qa/freg/field-address-register-r7.json.
   Keys are fixed at register revision freg-r7-1 (= field index in the archived source at that revision).
   The builder never re-derives keys from current indexes: it only checks that every mounted lesson field
   still has the registered SHA-256 and stores the runtime fingerprint used by evidence-state
   (after canonical.js, i.e. the field as the learner answers it).
   Usage: node tools/build-field-register.cjs [--check] */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.join(__dirname,'..');
const reg=JSON.parse(fs.readFileSync(path.join(root,'qa/freg/field-address-register-r7.json'),'utf8'));
const st=v=>Array.isArray(v)?v.map(st):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,st(v[k])])):v);
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(st(v))).digest('hex');
const FR=require(path.join(root,'field-register.js'));
// The runtime fingerprint is taken AFTER the single correction layer (canonical.js), exactly as the app
// installs the question (lesson-v2-runtime addQuestion → Canonical.applyQuestion); evidence uses that.
const Canon=require(path.join(root,'canonical.js'));
const runtimeQ=(q,lesson)=>Canon.applyQuestion(JSON.parse(JSON.stringify(Object.assign({},q,{lessonId:lesson,ruleIds:(q.ruleIds||[]).slice(),associationKeys:[]}))));
const ctx={window:{}};ctx.window.window=ctx.window;vm.runInNewContext(fs.readFileSync(path.join(root,'compiled-lessons-v2.js'),'utf8'),ctx);
const lessons=Object.fromEntries(ctx.window.LESSON_V2_COMPILED.map(l=>[l.lesson_id,l]));
const data={};let mounted=0;const errors=[];
for(const r of reg.fields){
  if(r.key!=='fk:'+r.qid+'#'+r.index)errors.push('key shape '+r.key);
  if(!r.lesson)continue;
  const m=r.path.match(/^\$\.(original_exercises|generated_questions)\[(\d+)\]\.fields\[(\d+)\]$/);
  const q=m&&lessons[r.lesson]&&lessons[r.lesson][m[1]][+m[2]];
  const f=q&&q.fields&&q.fields[+m[3]];
  if(!q||q.id!==r.qid||+m[3]!==r.index){errors.push('address '+r.key);continue;}
  if(sha(f)!==r.sha256){errors.push('sha256 '+r.key);continue;}
  const rq=runtimeQ(q,r.lesson);if(!rq||!rq.fields||rq.fields.length!==q.fields.length){errors.push('runtime fields '+r.key);continue;}
  (data[r.qid]=data[r.qid]||[])[r.index]=FR.fieldFingerprint(rq.fields[r.index]);mounted++;
}
for(const [qid,row] of Object.entries(data))if(row.some(x=>!x))errors.push('gap '+qid);
if(errors.length){console.error('FREG build failed:\n'+errors.slice(0,20).join('\n'));process.exit(1);}
const body=Object.keys(data).sort().map(q=>JSON.stringify(q)+':'+JSON.stringify(data[q].join(','))).join(',\n');
const file=path.join(root,'field-register.js'),src=fs.readFileSync(file,'utf8');
const next=src.replace(/\/\* DATA:BEGIN \*\/[\s\S]*\/\* DATA:END \*\//,'/* DATA:BEGIN */\n'+body+'\n/* DATA:END */')
  .replace(/const TOTAL=\d+,BANK12=\d+,MOUNTED=\d+;/,`const TOTAL=${reg.fields.length},BANK12=${reg.fields.filter(r=>r.bank12).length},MOUNTED=${mounted};`);
if(process.argv.includes('--check')){if(next!==src){console.error('field-register.js is stale: run node tools/build-field-register.cjs');process.exit(1);}console.log('FREG ok',mounted,'mounted of',reg.fields.length);}
else{fs.writeFileSync(file,next);console.log('FREG written',mounted,'mounted of',reg.fields.length);}
