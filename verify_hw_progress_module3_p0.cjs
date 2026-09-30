#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const hw=require('./homework.js');

function ok(msg){console.log('OK',msg);}

// 1) resumeIndex: first undone, no wrap-to-0, ignores stale cursor
const ids=Array.from({length:100},(_,i)=>'e-'+i);
const items=ids.slice(0,73).map(id=>({id,correct:true}));
assert.equal(hw.resumeIndex(ids,{items,cursor:ids[72]}),73);
assert.equal(hw.resumeIndex(ids,{items,cursor:ids[5]}),73,'stale early cursor must not roll back');
assert.equal(hw.resumeIndex(ids,{items,cursor:null}),73);
assert.equal(hw.resumeIndex(ids,{items:ids.map(id=>({id})),cursor:ids[99]}),100,'all done → past end, not 0');
ok('resumeIndex prefers first-undone and does not wrap');

// 2) newAttempt clears cursor
const state={homeworkAttempts:{}};
hw.ensureAttempt(state,'3-1');
state.homeworkAttempts['3-1'].items=items.slice();
state.homeworkAttempts['3-1'].cursor=ids[72];
hw.newAttempt(state,'3-1');
assert.equal(state.homeworkAttempts['3-1'].cursor,null);
assert.equal(state.homeworkAttempts['3-1'].items.length,0);
assert.equal(hw.resumeIndex(ids,state.homeworkAttempts['3-1']),0);
ok('newAttempt clears cursor');

// 3) section continue landing
const resumeAt=hw.resumeIndex(ids,{items,cursor:ids[5]});
const sec=hw.sectionOf(resumeAt);
const queue=hw.sliceSection(ids,sec);
const pos=hw.resumeIndex(queue,{items,cursor:ids[5]});
assert.equal(sec,3);
assert.equal(queue[pos],'e-73');
ok('continue lands on next undone in correct section');

// Browser-ish install for lessonId binding + PDF urls
const sandbox={
  console,Date,Math,JSON,Array,Object,Map,Set,String,Number,Boolean,Error,RegExp,parseInt,parseFloat,isNaN,isFinite,Infinity,undefined,NaN,Promise,
  location:{hostname:'localhost',href:'http://localhost/',protocol:'http:'},
  document:{documentElement:{getAttribute:()=>null},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},body:{},head:{},createElement:()=>({style:{},setAttribute(){},appendChild(){}})},
  localStorage:{_d:Object.create(null),getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
  matchMedia:()=>({matches:false,addListener(){},addEventListener(){}}),
  addEventListener(){},removeEventListener(){},
  TextEncoder,TextDecoder,
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.self=sandbox;
function load(file){
  const code=fs.readFileSync(path.join(__dirname,file),'utf8');
  vm.runInNewContext(code,sandbox,{filename:file});
}
const skip=new Set(['app.js','pwa.js','design-ui.js','cloud.js','firebase-config.js','dashboard.js','morph-ui.js','morph-nav2.js','personal-trainers.js','free-practice-view.js','tutor-ui.js']);
const order=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/src="([^"]+\.js)"/g).map(s=>s.slice(5,-1));
for(const f of order){if(skip.has(f))continue;try{load(f);}catch(e){/* noncritical */}}

assert.ok(sandbox.LessonV2Runtime,'V2 runtime');
for(const id of ['3-1','3-2','3-3','2-1']){
  const pack=sandbox.LessonV2Runtime.homework(id);
  assert.ok(pack,id+' pack');
  assert.equal(pack.lesson_id,id);
  const wq=pack.homework.word_question_ids||[];
  assert.ok(wq.length>0,id+' has word cards');
  for(const qid of wq.slice(0,12)){
    const q=sandbox.COURSE.questions.find(q=>q.id===qid);
    assert.ok(q,id+' word card exists '+qid);
    assert.equal(q.lessonId,id,id+' word card lessonId bound (got '+qid+' → '+q.lessonId+')');
  }
  if(id==='3-1'||id==='3-2'||id==='3-3'){
    assert.ok(pack.homework.method_url,id+' method_url');
    assert.ok(pack.homework.homework_pdf_url,id+' homework_pdf_url');
    assert.ok(/^https:\/\/drive\.google\.com\//.test(pack.homework.method_url),id+' method drive');
    assert.ok(/^https:\/\/drive\.google\.com\//.test(pack.homework.homework_pdf_url),id+' hw pdf drive');
  }
  // progress key is full lessonId
  const st={homeworkAttempts:{}};
  hw.recordItem(st,id,{id:pack.homework.exercise_ids[0],answers:['x'],correct:true});
  assert.ok(st.homeworkAttempts[id],'attempt keyed by '+id);
  assert.equal(Object.keys(st.homeworkAttempts).length,1);
}
ok('3-1/3-2/3-3/2-1 words bound to lessonId + PDF urls for m3');

// Regression: 2-1 resume still works
const ids21=Array.from({length:80},(_,i)=>'e21-'+i);
const a21={items:ids21.slice(0,25).map(id=>({id})),cursor:ids21[10]};
assert.equal(hw.resumeIndex(ids21,a21),25);
ok('2-1 resume no regression');

console.log('VERIFY_HW_PROGRESS_MODULE3_P0_OK');
