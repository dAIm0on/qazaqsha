'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const ui=fs.readFileSync('morph-ui.js','utf8');
const css=fs.readFileSync('morph.css','utf8');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
test('Hub exposes the five teaching routes',()=>{
 for(const label of ['Продолжить обучение','Учиться с нуля','Повторить слабое место','Самостоятельная практика','Проверить на новых основах'])assert.ok(ui.includes(label),label);
 assert.ok(ui.includes('data-morph-continue'));
 assert.ok(ui.includes('data-morph-weak'));
 assert.ok(ui.includes('data-morph-start'));
 assert.ok(ui.includes('data-morph-transfer'));
 assert.ok(ui.includes('Проверить на новых словах'));
});
test('Topic keeps the full explanation and does not grade theory as mastery',()=>{
 for(const label of ['Что изучаем','Полное объяснение','Примеры','На что смотреть','Попробовать с опорой','Самостоятельно','Мой прогресс','Разобрать правило полностью'])assert.ok(ui.includes(label),label);
 assert.equal(ui.includes('освоено'),false);
 assert.equal(ui.includes('выучено'),false);
 assert.equal(ui.includes('mastered'),false);
 assert.ok(ui.includes('Удержание:'));
});
test('Continue and weak-spot routes do not open a scored session',()=>{
 const cont=ui.slice(ui.indexOf('function continueLearning'),ui.indexOf('function learnFromZero'));
 const weak=ui.slice(ui.indexOf('function repeatWeak'),ui.indexOf('function openTopicStep'));
 assert.equal(cont.includes('createSession'),false);
 assert.equal(cont.includes('E.answer('),false);
 assert.equal(weak.includes('createSession'),false);
 assert.equal(weak.includes('E.answer('),false);
 assert.ok(weak.includes('FULL_EXPLANATION'));
 assert.ok(ui.includes('Самостоятельное задание не первое знакомство'));
});
test('Old practice hint and transfer honesty stay',()=>{
 assert.ok(ui.includes('data-morph-hint'));
 assert.ok(ui.includes('STAGE10_SHORT_BANK'));
 assert.ok(ui.includes('Проверены новые реальные основы'));
 assert.ok(ui.includes('без записи FSRS'));
 assert.equal(ui.includes('слух позже'),false);
 assert.equal(ui.includes('аудио недоступно'),false);
 assert.ok(css.includes('min-height:44px'));
 assert.ok(css.includes('safe-area-inset-bottom'));
 assert.ok(css.includes('.morph-routes'));
});
console.log('MORPH_STAGE11_OK',n,'checks');
