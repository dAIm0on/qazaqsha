'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Schema=require('./lesson-v2-schema.js');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const compiled={window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/compiled-lessons-v2.js','utf8'),compiled);
const rows=compiled.window.LESSON_V2_COMPILED;
const runtime=fs.readFileSync(__dirname+'/lesson-v2-runtime.js','utf8');
const ensure=app.slice(app.indexOf(' function ensureV2('),app.indexOf(' function openPathLesson('));
// Execute the real boot restore path, including its validation and assignments.
const restore=app.slice(app.indexOf(' renderRules();renderMaterials();')+' renderRules();renderMaterials();'.length,app.indexOf(' const hasMorphResume='));
assert.ok(restore.includes('const validSaved='));

function boot(session,grammarPath){
  const root={LessonV2Schema:Schema,LESSON_V2_COMPILED:JSON.parse(JSON.stringify(rows)),
    COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){
      const w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,
        target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};
      this.words.push(w);return w;
    }},CourseProgress:{registerStages(){}},Knowledge:{hydrate(){}},Canonical:null};
  vm.runInNewContext(runtime,{window:root,globalThis:root,console});
  assert.equal(root.LessonV2Runtime.installed.size,0,'boot remains lazy');
  const ctx={window:root,course:root.COURSE,questions:root.COURSE.questions,byId:new Map(),
    state:{grammarPath},savedSession:session,topics:[['all']],P:{answerIndex(){return {};},normalizeStageContext(x){return x;}},
    cfg:{session:{maxAttempts:40}},coerceTyped(){},confusionIndex:{},queueEpoch:0,
    render(){},renderStats(){}};
  vm.createContext(ctx);
  vm.runInContext(ensure+restore+'\nthis.valid=!!validSaved;',ctx);
  return {ctx,root};
}

assert.equal(boot(null).root.LessonV2Runtime.installed.size,0,'fresh visitor loads no banks');
function prefixIds(lessonId){
  const idx=rows.findIndex(r=>r&&r.lesson_id===lessonId);
  return rows.slice(0,idx+1).map(r=>r.lesson_id);
}
for(const [lessonId,mode] of [['4-1','course'],['4-2','homework']]){
  const row=rows.find(r=>r.lesson_id===lessonId);
  const queue=row.homework.exercise_ids.slice(0,20);
  const session={topic:'all',mode,view:'practice',courseBlock:lessonId,
    hwLesson:mode==='homework'?lessonId:null,hwPart:'exercises',hwSection:0,
    queue,practiceIds:queue,position:1,answered:false,queueEpoch:42,
    draft:{token:'42:1',exerciseId:queue[1],answers:['unfinished answer']}};
  const before=JSON.stringify(session);
  const {ctx,root}=boot(session);
  assert.equal(ctx.valid,true,lessonId+' saved queue resolves after lazy hydration');
  const expect=prefixIds(lessonId);
  assert.equal(root.LessonV2Runtime.installed.size,expect.length,'resume hydrates the course prefix through '+lessonId+' so vocab card ids stay stable');
  for(const id of expect)assert.ok(root.LessonV2Runtime.byId(id),id);
  for(const id of rows.slice(expect.length).map(r=>r.lesson_id))assert.equal(root.LessonV2Runtime.byId(id),null,id+' stays lazy');
  assert.equal(ctx.position,1);
  assert.equal(ctx.queue[ctx.position],queue[1]);
  assert.equal(JSON.stringify(ctx.draft),JSON.stringify(session.draft),'draft and token retained');
  assert.equal(JSON.stringify(session),before,'saved session is not rewritten during hydration');
  if(mode==='homework')assert.equal(ctx.hwLesson,'4-2');
  assert.equal(boot({...session,answered:true}).ctx.position,2,'answered card advances once');
  assert.equal(boot({...session,queue:['missing-question']}).ctx.valid,false,'unknown cards remain rejected');
  console.log('PASS',lessonId,'cold reload restores queue, position and unfinished answer');
}
const path=boot({topic:'all',mode:'ordered',view:'path',queue:[],position:0},{lessonId:'4-1'});
assert.equal(path.root.LessonV2Runtime.installed.size,prefixIds('4-1').length,'resumed theory hydrates the course prefix through its lesson');
assert.equal(path.root.LessonV2Runtime.byId('5-1'),null);
console.log('VERIFY_V2_SESSION_RESUME_P0_OK');
