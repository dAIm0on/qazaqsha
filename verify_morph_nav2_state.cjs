'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function storage(){
 const m=new Map();
 return {
  getItem:k=>m.has(k)?m.get(k):null,
  setItem:(k,v)=>m.set(k,String(v)),
  removeItem:k=>m.delete(k),
  clear:()=>m.clear()
 };
}
global.window=global;
global.sessionStorage=storage();
global.history={pushState(){}};
global.MorphLearner=require('./morph-learner-v2.js');
vm.runInThisContext(fs.readFileSync('./morph-nav2-catalog.js','utf8'),{filename:'morph-nav2-catalog.js'});
const cat=global.MorphNav2Catalog;
assert(cat&&cat.lessons.length===40);

function fresh(){
 delete require.cache[require.resolve('./morph-nav2.js')];
 return require('./morph-nav2.js');
}

let checked=0;
for(const lesson of cat.lessons){
 const aliases=lesson.legacyStepAliases||{};
 for(const [oldStepId,newStepId] of Object.entries(aliases)){
  const target=lesson.steps.findIndex(s=>s.id===newStepId);
  assert(target>=0,'alias target missing '+lesson.id+' '+oldStepId+' -> '+newStepId);
  sessionStorage.clear();
  const seed={
   schemaVersion:2,catalogVersion:'NAV-2.2-CHERNILA',migrated:true,bookmarkApplied:true,
   screen:null,part:lesson.part,lessonId:lesson.id,homeLessonId:lesson.id,step:999,tab:'learn',pick:'',outcome:'',
   fromLesson:false,viewed:{},log:{},explained:{},
   perLessonCursors:{[lesson.id]:{step:999,stepId:oldStepId,tab:'learn',pick:'',outcome:''}},
   draftAnswers:{},navBack:[],excursionOrigin:null,find:'',aliasId:'',aliasChoices:[],pendingAlias:'',
   aliasDismissed:false,oldViews:{},activeMode:'learn'
  };
  sessionStorage.setItem('qazaqsha-nav2-v1',JSON.stringify(seed));
  let nav=fresh();
  assert(nav.openBookmark(lesson.id),'bookmark did not open '+lesson.id);
  assert.strictEqual(nav.debug().step,target,'legacy step not mapped '+lesson.id+' '+oldStepId);
  const first=JSON.parse(sessionStorage.getItem('qazaqsha-nav2-v1'));
  assert(first,'state not persisted '+lesson.id);
  nav=fresh();
  const reloaded=nav.debug();
  assert.strictEqual(reloaded.step,target,'reload changed migrated cursor '+lesson.id+' '+oldStepId);
  assert.strictEqual(reloaded.lessonId,lesson.id,'reload changed lesson '+lesson.id);
  assert.strictEqual(reloaded.catalogVersion,cat.version,'catalogVersion not upgraded '+lesson.id);
  checked++;
 }
}

for(const lesson of cat.lessons){
 sessionStorage.clear();
 const seed={
  schemaVersion:2,catalogVersion:'NAV-2.2-CHERNILA',migrated:true,bookmarkApplied:true,
  screen:null,part:lesson.part,lessonId:lesson.id,homeLessonId:lesson.id,step:999999,tab:'learn',
  pick:'draft-choice',outcome:'wrong',fromLesson:false,viewed:{},log:{},explained:{},
  perLessonCursors:{[lesson.id]:{step:999999,tab:'learn',pick:'draft-choice',outcome:'wrong'}},
  draftAnswers:{},navBack:[],excursionOrigin:null,find:'',aliasId:'',aliasChoices:[],pendingAlias:'',
  aliasDismissed:false,oldViews:{},activeMode:'learn'
 };
 sessionStorage.setItem('qazaqsha-nav2-v1',JSON.stringify(seed));
 const nav=fresh();
 nav.openBookmark(lesson.id);
 const state=nav.debug();
 assert.strictEqual(state.step,lesson.steps.length-1,'numeric cursor not clamped '+lesson.id);
 assert.strictEqual(state.pick,'draft-choice','saved pick lost '+lesson.id);
 assert.strictEqual(state.outcome,'wrong','saved outcome lost '+lesson.id);
}

console.log('VERIFY_MORPH_NAV2_STATE PASS '+checked+' legacy step aliases + 40 clamped cursors');
