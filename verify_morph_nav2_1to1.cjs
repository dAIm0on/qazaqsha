'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const learner=require('./morph-learner-v2.js');
const practiceCfg=require('./free-practice-config.js');
const practiceContent=require('./free-practice-content.js');
const navSource=fs.readFileSync('./morph-nav2.js','utf8');
const catalogSource=fs.readFileSync('./morph-nav2-catalog.js','utf8');
const stateSource=fs.readFileSync('./free-practice-state.js','utf8');
const practiceView=fs.readFileSync('./free-practice-view.js','utf8');

const ctx={window:{}};
vm.runInNewContext(catalogSource,ctx,{filename:'morph-nav2-catalog.js'});
const cat=ctx.window.MorphNav2Catalog;
assert(cat,'MorphNav2Catalog missing');
assert.strictEqual(cat.version,'NAV-2.3-1TO1');
assert.strictEqual(cat.lessons.length,40,'must keep 40 NAV2 lessons');

const sourceRows=[];
const byId=new Map();
for(const lesson of learner.lessons){
 for(let i=0;i<lesson.blocks.length;i++){
  const block=lesson.blocks[i];
  assert(block.id,'source block without id');
  assert(!byId.has(block.id),'duplicate source id '+block.id);
  const row={lessonId:lesson.id,index:i,block};
  sourceRows.push(row);byId.set(block.id,row);
 }
}
assert(sourceRows.length>0);

const rendered=new Map();
let totalScreens=0;
for(const lesson of cat.lessons){
 assert(Array.isArray(lesson.orderedSourceUnitIds)&&lesson.orderedSourceUnitIds.length,'empty orderedSourceUnitIds '+lesson.id);
 assert(Array.isArray(lesson.steps)&&lesson.steps.length,'empty screens '+lesson.id);
 totalScreens+=lesson.steps.length;
 const flat=lesson.steps.flatMap(s=>{
  assert(Array.isArray(s.sourceUnitIds)&&s.sourceUnitIds.length,'screen without sourceUnitIds '+s.id);
  assert(!('sourceHeadingId' in s),'sourceHeadingId must not drive NAV2 screens: '+s.id);
  return s.sourceUnitIds;
 });
 assert.deepStrictEqual(flat,lesson.orderedSourceUnitIds,'screen/source order mismatch '+lesson.id);
 for(const id of flat){
  assert(byId.has(id),'unknown source unit '+id+' in '+lesson.id);
  if(!rendered.has(id))rendered.set(id,[]);
  rendered.get(id).push(lesson.id);
 }
 if(lesson.practiceMode==='observation_only'){
  assert.strictEqual(lesson.finalUnaidedTask,null,'observation-only lesson must not fake an unaided gate '+lesson.id);
 }else{
  assert(Array.isArray(lesson.practiceRoutes)&&lesson.practiceRoutes.length,'productive lesson without practice routes '+lesson.id);
  assert(lesson.finalUnaidedTask&&lesson.finalUnaidedTask.kind==='free_practice_full_input','productive lesson without final unaided task '+lesson.id);
  let linkedMicro=0;
  const lessonHeadings=(lesson.orderedSourceUnitIds||[]).filter(id=>byId.get(id)&&byId.get(id).block.type==='subheading');
  for(const route of lesson.practiceRoutes){
   const [blockId,subcase='']=route.split(':');
   assert(practiceCfg.config.enabledBlockIds.includes(blockId),'practice route not enabled '+route+' in '+lesson.id);
   const cards=practiceContent.forBlock(blockId,subcase);
   assert(cards.length>0,'practice route has no licensed cards '+route+' in '+lesson.id);
   const uniqueLemmas=new Set(cards.map(card=>card.normalizedLemmaKey));
   if(blockId!=='free.harmony.limits')assert(uniqueLemmas.size>=2,'practice route lacks H/new-word transfer '+route+' in '+lesson.id);
   const exact=blockId+':'+subcase;
   if(lessonHeadings.some(h=>(practiceContent.anchorsFor(h)||[]).some(a=>a.blockId+':'+(a.subcase||'')===exact)))linkedMicro++;
  }
  assert(linkedMicro>0,'productive lesson has no source-linked micro-practice '+lesson.id);
 }
}

const missing=sourceRows.filter(r=>!rendered.has(r.block.id));
assert.strictEqual(missing.length,0,'unmapped source units: '+missing.map(x=>x.block.id).join(', '));

const types=[...new Set(sourceRows.map(r=>r.block.type))];
for(const type of types){
 const spell=type==='ordered-list' ? ["b.type==='ordered-list'","b.type==='ordered_list'"] : ["b.type==='"+type+"'"];
 assert(spell.some(s=>navSource.includes(s)),'renderer does not handle source type '+type);
}
assert(navSource.includes('sourceUnits(step.sourceUnitIds||[])'),'main lesson route must resolve canonical units by id');
assert(!navSource.includes('step.sourceHeadingId?slice'),'selective sourceHeading slice returned to main lesson route');
assert(navSource.includes("if(b.type==='try')"),'source try renderer missing');
assert(navSource.includes("if(b.type==='link')"),'source link renderer missing');
assert(navSource.includes('<caption>')||navSource.includes("'<caption>'"),'table captions are not rendered');

assert(stateSource.includes("preferences:{supportLevel:'try_myself'"),'new free-practice state must start unaided');
assert(stateSource.includes('everSupported'), 'assisted history must survive switching back to unaided UI');
assert(practiceView.includes("const options=!independent&&!scaffoldActive&&!c.decisionSpec?"),'form scaffold must never expose legacy full-word choices');
assert(practiceView.includes('!finished&&!independent&&!scaffoldActive&&!c.decisionSpec&&c.showExpectedBeforeAnswer'),'unaided/scaffold modes must hide expected form');
assert(practiceView.includes('Напишите форму самостоятельно'),'unaided full-form input missing');
assert(practiceView.includes('Правильный ответ не показан'),'wrong full-input answer must not reveal expected form');
assert(practiceView.includes('Разбор. Это не самостоятельный ответ.'),'reveal must be distinct from unaided success');
assert(practiceView.includes('data-free-step-answer'),'B-E scaffold controls missing');
assert(practiceView.includes('data-free-step-form'),'F suffix assembly missing');
assert(practiceView.includes('data-free-key-target'),'Kazakh keyrail must target active input');
assert(navSource.includes('sourcePracticeHtml(row,st().step||0)'),'source-section practice is not embedded in NAV2 learning flow');
assert(navSource.includes('data-nav2-source-practice'),'source-section practice marker missing');

const allPracticeCards=practiceContent.all();
const formCards=allPracticeCards.filter(c=>c.exerciseType!=='meaning');
assert(formCards.length>0,'no productive form cards');
for(const card of formCards){
 assert(card.decisionSpec,'form card lacks engine-derived decisionSpec '+card.cardId);
 const levels=card.decisionSpec.levels||{};
 assert(levels.F&&levels.F.kind==='input','form card lacks F suffix assembly '+card.cardId);
 assert(levels.G&&levels.G.kind==='input','form card lacks G full input '+card.cardId);
 assert.strictEqual(levels.G.answer,card.answer,'G must verify canonical full answer '+card.cardId);
 assert(Array.isArray(card.practiceLevels)&&card.practiceLevels.join('')==='ABCDEFGHI','A-I declaration missing '+card.cardId);
 for(const key of ['B','C','D','E']){
  const level=levels[key];if(!level)continue;
  for(const option of level.options||[])assert.notStrictEqual(option,card.answer,'guided level leaks full word '+card.cardId+' '+key);
 }
}
const semanticCards=allPracticeCards.filter(c=>c.exerciseType==='meaning');
assert(semanticCards.every(c=>Array.isArray(c.practiceLevels)&&c.practiceLevels.includes('G')),'semantic card lacks independent G path');


const specialTypes=['table','example','warning','list','ordered-list','try','term','link'];
const special={};
for(const type of specialTypes){
 const ids=sourceRows.filter(r=>r.block.type===type).map(r=>r.block.id);
 special[type]={source:ids.length,mapped:ids.filter(id=>rendered.has(id)).length};
 assert.strictEqual(special[type].mapped,special[type].source,'special block coverage '+type);
}

const summary={
 lessons:cat.lessons.length,
 sourceUnits:sourceRows.length,
 mappedSourceUnits:rendered.size,
 sourceCoverage:rendered.size/sourceRows.length,
 totalScreens,
 productiveLessons:cat.lessons.filter(x=>x.practiceMode!=='observation_only').length,
 observationOnly:cat.lessons.filter(x=>x.practiceMode==='observation_only').map(x=>x.id),
 practiceCards:allPracticeCards.length,
 productiveFormCards:formCards.length,
 semanticCards:semanticCards.length,
 special
};
console.log('VERIFY_MORPH_NAV2_1TO1 PASS');
console.log(JSON.stringify(summary,null,2));
