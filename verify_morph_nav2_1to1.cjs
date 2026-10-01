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
  for(const route of lesson.practiceRoutes){
   const [blockId,subcase='']=route.split(':');
   assert(practiceCfg.config.enabledBlockIds.includes(blockId),'practice route not enabled '+route+' in '+lesson.id);
   const cards=practiceContent.forBlock(blockId,subcase);
   assert(cards.length>0,'practice route has no licensed cards '+route+' in '+lesson.id);
  }
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
assert(practiceView.includes("const options=independent?''"),'unaided mode must hide answer choices');
assert(practiceView.includes('!independent&&c.showExpectedBeforeAnswer'),'unaided mode must hide expected form');
assert(practiceView.includes('Напишите форму самостоятельно'),'unaided full-form input missing');

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
 special
};
console.log('VERIFY_MORPH_NAV2_1TO1 PASS');
console.log(JSON.stringify(summary,null,2));
