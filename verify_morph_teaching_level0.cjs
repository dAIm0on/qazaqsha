'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('./morph-teaching-data'),D=require('./morph-data'),S=require('./morph-state');

let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}

const ui=fs.readFileSync('morph-ui.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('morph.css','utf8');

test('Stage 4 scripts parse and teaching data loads before morphology UI',()=>{
 new vm.Script(ui);new vm.Script(app);
 const dataAt=html.indexOf('src="morph-teaching-data.js"'),engineAt=html.indexOf('src="morph-engine.js"'),uiAt=html.indexOf('src="morph-ui.js"');
 assert.ok(dataAt>0);assert.ok(dataAt<engineAt);assert.ok(dataAt<uiAt);
});

test('Offline cache contains morphology teaching data',()=>{
 const assets=JSON.parse(sw.match(/ASSETS=(\[[^;]+\]);/)[1]);
 assert.ok(assets.includes('morph-teaching-data.js'));
 assert.ok(fs.existsSync('morph-teaching-data.js'));
});

test('Level 0 source remains complete for all current runtime families',()=>{
 const runtime=Object.keys(D.families).sort(),semantic=Object.keys(T.level0.familySemantics).sort();
 assert.equal(runtime.length,28);assert.deepEqual(semantic,runtime);
 assert.equal(T.modules.length,9);
 for(const x of Object.values(T.level0.familySemantics))assert.equal(x.status,'READY');
});

test('Hub exposes zero-knowledge route and keeps independent practice separate',()=>{
 for(const token of ['Учиться с нуля','Самостоятельная практика','Если тема новая, сначала пройди','Просмотр теории и работа с опорой не двигают FSRS'])assert.ok(ui.includes(token),token);
 assert.ok(ui.includes('data-morph-learn-zero'));
 assert.ok(ui.includes('data-morph-start'));
 assert.ok(ui.includes('data-morph-transfer'));
});

test('Level 0 implements the four approved Stage 4 steps',()=>{
 for(const step of ['SEMANTIC_INTRO','FULL_EXPLANATION','CONTRAST_EXAMPLES','FEATURE_NOTICE'])assert.ok(ui.includes(step),step);
 for(const label of ['ШАГ 1 · СМЫСЛ','ШАГ 2 · ПОЛНОЕ ОБЪЯСНЕНИЕ','ШАГ 3 · КОНТРАСТЫ','ШАГ 4 · НА ЧТО СМОТРЕТЬ'])assert.ok(ui.includes(label),label);
});

test('Semantic intro uses canonical meaning, contrast and examples rather than generated text',()=>{
 assert.ok(ui.includes('semantic.meaning'));
 assert.ok(ui.includes('semantic.contrast'));
 assert.ok(ui.includes('semantic.examples'));
 assert.ok(ui.includes("recordOnce('semantic_intro_seen'"));
 assert.ok(ui.includes("recordOnce('semantic_intro_completed'"));
});

test('Full explanation renders canonical paragraphs, counterexamples and limitations',()=>{
 assert.ok(ui.includes('module.fullExplanation.map'));
 assert.ok(ui.includes('module.counterExamples'));
 assert.ok(ui.includes('module.limitations'));
 assert.ok(ui.includes("recordOnce('full_explanation_opened'"));
 assert.ok(ui.includes('Полное объяснение не заменяется короткой подсказкой'));
});

test('Contrast screen uses canonical examples and contrastSets',()=>{
 assert.ok(ui.includes('module.examples'));
 assert.ok(ui.includes('module.contrastSets'));
 assert.ok(ui.includes('Сравни похожие случаи'));
});

test('Feature notice uses canonical whatToLookAt and decisionSteps',()=>{
 assert.ok(ui.includes('module.whatToLookAt.map'));
 assert.ok(ui.includes('module.decisionSteps.map'));
 assert.ok(ui.includes("type:'feature_notice_attempt'"));
 assert.ok(ui.includes("productionMastery"));
});

test('Teaching flow cannot call production answer engine or scheduler',()=>{
 const start=ui.indexOf('function semanticIntro('),end=ui.indexOf('function finish(');
 const teaching=ui.slice(start,end);
 assert.ok(start>0&&end>start);
 assert.equal(teaching.includes('E.answer('),false);
 assert.equal(teaching.includes('bridge().answer('),false);
 assert.equal(teaching.includes('scheduleUpdate('),false);
});

test('Teaching state bridge is additive and separate from answer bridge',()=>{
 assert.ok(app.includes('teaching(event){'));
 assert.ok(app.includes('window.MorphState.recordTeaching'));
 assert.ok(app.includes('teachingResume(value){'));
 assert.ok(app.includes('window.MorphState.putTeachingResume'));
 assert.ok(app.includes('answer(result){'));
 assert.ok(app.includes('window.MorphState.scheduleUpdate(e)'));
});

test('Teaching resume participates in app resume without replacing exercise session',()=>{
 assert.ok(app.includes('state.morphTrainer.session||(state.morphTrainer.teaching&&state.morphTrainer.teaching.resume)'));
 assert.ok(app.includes('window.MorphState.resumeSurface'));
});

test('Level 0 progress is derived from evidence rather than a fabricated mastery percentage',()=>{
 assert.ok(ui.includes('S.teachingEvidence'));
 assert.ok(ui.includes('semanticIntroCompleted'));
 assert.equal(/mastery\s*=|masteryPercent|scoreTeaching/i.test(ui),false);
});

test('All module families are reachable through module and family selectors',()=>{
 assert.ok(ui.includes('T.modules.map'));
 assert.ok(ui.includes('module.families.map'));
 assert.ok(ui.includes('data-teach-module'));
 assert.ok(ui.includes('data-teach-family'));
 const covered=new Set(T.modules.flatMap(m=>m.families));
 assert.deepEqual([...covered].sort(),Object.keys(D.families).sort());
});

test('Feature notice is scaffolding and incomplete selection stays in Level 0',()=>{
 assert.ok(ui.includes("const correct=all.length>0&&selected.length===all.length"));
 assert.ok(ui.includes("Отметь все признаки"));
 assert.ok(ui.includes("setTeachingResume(r.currentModule,'FEATURE_NOTICE',r.familyId,1"));
});

test('Completion text explicitly avoids a false mastery claim',()=>{
 assert.ok(ui.includes('Это ещё не самостоятельное владение формой'));
 assert.ok(ui.includes('guided и production-практика остаются отдельными этапами'));
});

test('Existing written practice and transfer code remains present',()=>{
 for(const token of ['E.createSession({level,mode,responseMode','function submit(response)','data-morph-hint','E.next(data().module.session)','Проверить на новых словах'])assert.ok(ui.includes(token),token);
 assert.equal(D.version,'morph-20260924-v1');
});

test('Stage 4 styles are mobile-safe and do not introduce fixed widths',()=>{
 assert.ok(css.includes('.morph-teach-panel'));
 assert.ok(css.includes('.morph-teach-nav'));
 assert.ok(css.includes('@media(max-width:620px)'));
 const teachingCss=css.slice(css.indexOf('.morph-teach-panel'));
 assert.equal(/(?:^|[;{]\s*)width:\s*[4-9][0-9]{2}px/m.test(teachingCss),false);
});

test('Teaching events remain non-production in state layer',()=>{
 let m=S.empty();
 const r=S.recordTeaching(m,{eventId:'stage4:semantic',type:'semantic_intro_seen',moduleId:'plural',familyId:'PL',at:1,responseMode:'view'});
 assert.equal(r.accepted,true);assert.equal(r.event.productionMastery,false);
 assert.equal(S.teachingEvidence(r.state,{moduleId:'plural',familyId:'PL'}).independentChoice.attempts,0);
 assert.equal(S.teachingEvidence(r.state,{moduleId:'plural',familyId:'PL'}).independentInput.attempts,0);
});

console.log('MORPH_LEVEL0_OK',n,'checks;',Object.keys(T.level0.familySemantics).length,'families;',T.modules.length,'modules');
