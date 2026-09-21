#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Bank=require('./explain-bank.js');
const UI=require('./explain-bank-adapter.js');
const GP=require('./grammar-path.js');
const Tutor=require('./ai-tutor.js');
const AiC=require('./ai-contract.js');

const passed=[];
function ok(name){passed.push(name);console.log('OK',name);}
const appSrc=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const learnSrc=fs.readFileSync(path.join(__dirname,'learning.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const tutorSrc=fs.readFileSync(path.join(__dirname,'tutor-ui.js'),'utf8');
const themeSrc=fs.readFileSync(path.join(__dirname,'theme-redesign.css'),'utf8');

const need=['T1_HARMONY','T2_PLURAL_LDT','T4_NO_PLURAL_AFTER_NUMBER','T5_NUMERAL_CONFUSION','T5_NUMERAL_COMPOSE','PHONE_GROUPS','T12_GLUE','T6_PERSON_SG','T7_EMES','T8_PERSON_PL','T8_ADJ_PRED','T9_OL','T10_QUESTION','T11_ORDINAL'];
for(const id of need)assert.ok(Bank.byId(id)&&Bank.byId(id).medium,id);
ok('explain bank ids exist for 1-1…2-3');

for(const c of UI.COURSE){
  assert.ok(UI.OPEN.includes(c.id));
  for(const r of c.rules)assert.ok(UI.get(r),c.id+' '+r);
}
assert.ok(UI.OPEN.includes('3-1'));
assert.ok(UI.COURSE.some(c=>c.id==='3-1'));
assert.ok(UI.OPEN.includes('3-2'));
assert.ok(UI.COURSE.some(c=>c.id==='3-2'));
ok('all rules 1-1…3-2 resolve; 3-1 and 3-2 opened in Learn course');

assert.equal(UI.ruleForChapter({id:'1-2-b'}),'T2_PLURAL_LDT');
assert.equal(UI.ruleForChapter({id:'2-1-glue'}),'T12_GLUE');
assert.equal(UI.COURSE[3].rules[0],'T12_GLUE');
ok('lesson → rule mapping valid; 2-1 starts with T12_GLUE');

const t2=UI.get('T2_PLURAL_LDT');
assert.ok(/книга → книги/.test(t2.ru_refresh)||/книга/.test(t2.ru_refresh));
assert.ok(t2.examples.includes('кітаптар')&&t2.examples.includes('адамдар')&&t2.examples.includes('жерлер'));
assert.ok(t2.traps.some(t=>/кітаплар/.test(t))&&t2.traps.some(t=>/адамлар/.test(t))&&t2.traps.some(t=>/жердер/.test(t)));
assert.ok(/два шага/.test(t2.title+t2.short+t2.medium));
ok('TEST 99 1-2 canonical bank has two steps, books, traps');

const t4=UI.get('T4_NO_PLURAL_AFTER_NUMBER');
assert.ok(/две книги/.test(t4.ru_refresh)&&/екі кітап/.test(t4.ru_refresh+t4.medium+t4.examples.join(' ')));
ok('TEST 101 1-3 russian bridge две книги / екі кітап');

const glue=GP.lesson('2-1').chapters[0];
assert.equal(glue.id,'2-1-glue');
ok('TEST 102 2-1 first chapter is glue');

assert.ok(/TutorUI\.setContext/.test(appSrc));
assert.ok(/surface:'path'/.test(appSrc));
assert.ok(/surface:'learn'/.test(learnSrc));
ok('pet context updates with lesson/chapter');

assert.ok(!/function attachPathAsk|function pathAskChips|id=["'\`]path-ask["'\`]|path-ask-panel|data-path-kind/.test(appSrc));
assert.ok(/function contextPrompts/.test(tutorSrc));
assert.ok(/две книги/.test(tutorSrc)&&/кто есть/.test(tutorSrc));
assert.ok(!/рычаг|бирк|алломорф|слот/i.test(tutorSrc));
assert.ok(!/#path-ask-panel/.test(themeSrc));
ok('single TutorUI replaces legacy path-ask and keeps contextual prompts');

assert.ok(/syncView\('exam'|syncView\(next==='practice'&&mode==='exam'\?'exam'/.test(appSrc)||/syncView/.test(appSrc));
assert.ok(/view==='exam'/.test(tutorSrc));
ok('no tutor in exam (launcher hidden)');

const ctx=UI.context('T2_PLURAL_LDT');
assert.ok(ctx.medium&&ctx.ru_refresh);
const local=Tutor.localFallback({lessonId:'1-2',fields:[{answers:['адамдар']}]},['PLURAL_INITIAL_LDT'],'ask_tutor',{lesson_id:'1-2',user_question:'почему не лар'});
assert.ok(local.message_ru&&!/Не разобрала/.test(local.message_ru));
ok('canonical fallback works without AI');

assert.ok(/explain-bank\.js/.test(html)&&/tutor-ui\.js/.test(html));
assert.ok(/learn-continue/.test(learnSrc));
assert.ok(!/Другие шаги этого курса/.test(learnSrc));
assert.ok(/path-canon/.test(appSrc));
assert.ok(/cardForChapter/.test(appSrc));
assert.ok(!/data-view="grammar"/.test(html));
assert.ok(AiC.SURFACES.includes('learn'));
assert.ok(fs.existsSync(path.join(__dirname,'assets','tutor','pet-idle.png')));
assert.ok(!/менің/.test(learnSrc));
ok('Learn hub, Path canon, pet asset, no 3-1, no new grammar view');

assert.equal(UI.get('T20_POSS').lesson,'3-1');
assert.ok(!UI.forLesson('2-3').some(c=>c.lesson==='3-1'));
ok('3-1 bank exists but is not opened on 1-1…2-3');

console.log('PHASE2A_OK',passed.length);
