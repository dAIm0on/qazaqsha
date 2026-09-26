'use strict';
const assert=require('node:assert/strict');
const T=require('./morph-teaching-data');
const D=require('./morph-data');

let n=0;
function test(name,fn){fn();n++;console.log('PASS',name);}

const runtimeFamilies=Object.keys(D.families).sort();
const teachingFamilies=Object.keys(T.level0.familySemantics).sort();
const runtimeLevels=D.levels.map(x=>x.id);
const moduleIds=T.modules.map(x=>x.id);
const sourceIds=new Set(Object.keys(T.sources));
const trainIds=new Set(D.lemmas.filter(x=>x.split==='train').map(x=>x.id));
const transferIds=new Set(D.lemmas.filter(x=>x.split==='transfer').map(x=>x.id));
const transferTexts=new Set(D.lemmas.filter(x=>x.split==='transfer').map(x=>x.text));

test('Teaching data is pinned to the current written runtime',()=>{
  assert.equal(T.runtimeDataVersion,D.version);
  assert.equal(T.runtimeDataVersion,'morph-20260924-v1');
  assert.equal(T.scopeId,'morph-written-teaching-v1');
  assert.equal(T.release.audio,false);
  assert.equal(T.release.tts,false);
  assert.equal(T.release.asr,false);
  assert.equal(T.release.speechAssessment,false);
});

test('Level 0 covers exactly all 28 admitted runtime families',()=>{
  assert.equal(runtimeFamilies.length,28);
  assert.deepEqual(teachingFamilies,runtimeFamilies);
  for(const id of runtimeFamilies){
    const x=T.level0.familySemantics[id];
    assert.equal(x.status,'READY',id);
    assert.ok(x.title&&x.meaning.length>=40,id+': meaning');
    assert.ok(x.contrast&&x.contrast.length>=25,id+': contrast');
    assert.ok(Array.isArray(x.sourceRefs)&&x.sourceRefs.length>=2,id+': sources');
  }
});

test('Nine teaching modules match the runtime level catalog exactly',()=>{
  assert.equal(T.modules.length,9);
  assert.deepEqual(moduleIds,runtimeLevels);
  for(const m of T.modules){
    const live=D.levels.find(x=>x.id===m.id);
    assert.ok(live,m.id);
    assert.equal(m.contentStatus,'READY',m.id);
    assert.equal(m.semanticStatus,'READY',m.id);
    assert.deepEqual([...m.families].sort(),[...live.families].sort(),m.id+': family scope drift');
  }
});

test('Full explanations are substantive and never replaced by short support',()=>{
  for(const m of T.modules){
    assert.ok(Array.isArray(m.fullExplanation)&&m.fullExplanation.length>=3,m.id);
    const full=m.fullExplanation.join('\n');
    assert.ok(full.length>=450,m.id+': full explanation too short');
    assert.ok(m.shortSupport.length<full.length/2,m.id+': short support is acting as full theory');
    assert.ok(Array.isArray(m.requiredConcepts)&&m.requiredConcepts.length>=4,m.id+': content locks');
  }
});

test('Canonical preservation locks remain visible in full explanations',()=>{
  // 2026-09-26: tokens follow verbatim DOC32, not the previous shortened paraphrase.
  const must={
    harmony:['кириллические и/у','INS','currentForm','последнюю написанную гласную'],
    voice:['қ/к','ғ/г','д после','фиксированное'],
    plural:['лар, лер','қол','GEN'],
    nasal:['GEN н','ACC н','ABL д','Q м'],
    poss:['қонақ','кітап','орын','атым'],
    person:['адаммын','адамбыз','адам ба','transfer'],
    chains:['currentForm','currentEdge','morphState','на/не'],
    verbs:['келмедік','CVB','AGR'],
    mixed:['holdout','8','освоен']
  };
  for(const m of T.modules){
    const full=m.fullExplanation.join('\n');
    for(const token of must[m.id])assert.ok(full.includes(token),m.id+': missing canonical concept '+token);
  }
});

test('Every teaching source reference resolves',()=>{
  function check(refs,where){
    for(const ref of refs||[])assert.ok(sourceIds.has(ref),where+': '+ref);
  }
  check(T.level0.sourceRefs,'level0');
  for(const [id,x] of Object.entries(T.level0.familySemantics))check(x.sourceRefs,'semantic '+id);
  for(const m of T.modules)check(m.sourceRefs,'module '+m.id);
});

test('No explicit teaching example consumes a transfer lemma',()=>{
  const refs=[];
  function walk(x,path='root'){
    if(!x||typeof x!=='object')return;
    if(Array.isArray(x)){x.forEach((v,i)=>walk(v,path+'['+i+']'));return;}
    if(Object.hasOwn(x,'lemmaId')&&x.lemmaId)refs.push([x.lemmaId,path+'.lemmaId']);
    if(Array.isArray(x.lemmaIds))for(const id of x.lemmaIds)refs.push([id,path+'.lemmaIds']);
    for(const [k,v] of Object.entries(x))if(k!=='lemmaId'&&k!=='lemmaIds')walk(v,path+'.'+k);
  }
  walk(T);
  assert.ok(refs.length>0,'expected explicit train references');
  for(const [id,path] of refs){
    assert.ok(trainIds.has(id),path+': teaching lemma is not train: '+id);
    assert.ok(!transferIds.has(id),path+': transfer leakage '+id);
  }
});

test('Teaching prose does not name holdout lexemes',()=>{
  const strings=[];
  function walk(x){
    if(typeof x==='string'){strings.push(x);return;}
    if(Array.isArray(x)){for(const v of x)walk(v);return;}
    if(x&&typeof x==='object')for(const v of Object.values(x))walk(v);
  }
  walk(T.level0);
  walk(T.modules);
  const tokens=new Set(strings.join(' ').toLocaleLowerCase('kk').match(/[а-яәіңғүұқөһ]+/giu)||[]);
  const leaked=[...transferTexts].filter(x=>tokens.has(x.toLocaleLowerCase('kk')));
  assert.deepEqual(leaked,[]);
});

test('Mixed module covers all current families but cannot admit future ones',()=>{
  const mixed=T.modules.find(x=>x.id==='mixed');
  assert.deepEqual([...mixed.families].sort(),runtimeFamilies);
  assert.equal(T.contentLock.futureFamilyRequiresAdmission,true);
  assert.equal(T.contentLock.buildMayNotGenerateMissingTheory,true);
  assert.equal(T.contentLock.shortSupportDoesNotReplaceFullExplanation,true);
});

test('Level 0 has the required semantic contrasts',()=>{
  const byId=Object.fromEntries(T.level0.contrastSets.map(x=>[x.id,x]));
  for(const id of ['space_axis','ownership','person_roles','q_neg','past_ptcp','ptcp_cvb'])assert.ok(byId[id],id);
  assert.deepEqual(byId.space_axis.families,['DAT','LOC','ABL']);
  assert.deepEqual(byId.q_neg.families,['Q','NEG']);
  assert.deepEqual(byId.past_ptcp.families,['PAST','PTCP_GAN']);
  assert.deepEqual(byId.ptcp_cvb.families,['PTCP_GAN','CVB_IP']);
  assert.equal(T.level0.evidencePolicy.featureNoticeIsProductionMastery,false);
  assert.equal(T.level0.evidencePolicy.semanticDiscriminationIsProductionMastery,false);
});

test('Teaching step taxonomy preserves guided, independent, transfer and retention separation',()=>{
  for(const id of ['SEMANTIC_INTRO','FULL_EXPLANATION','CONTRAST_EXAMPLES','FEATURE_NOTICE','GUIDED_CHOICE','INDEPENDENT_CHOICE','FULL_INPUT','ERROR_REPAIR','MIXED_PRACTICE','TRANSFER_BLOCK','RETENTION_REVIEW']){
    assert.ok(T.teachingStepTypes.includes(id),id);
  }
});

test('Feedback remains observational and does not invent auditory diagnoses',()=>{
  const text=Object.values(T.feedback).filter(x=>typeof x==='string').join(' ');
  for(const bad of ['ты не слышишь','не слышишь твёрд','не слышишь мягк','у тебя плохой слух'])assert.equal(text.toLocaleLowerCase('ru').includes(bad),false,bad);
  for(const id of ['HARMONY','ONSET_CLASS','STEM_CHANGE','MORPH_STATE','MORPHEME_BOUNDARY','CATEGORY','LEXICAL_EXCEPTION','MULTIPLE_FEATURES','OTHER_FORM','UNSCORABLE'])assert.ok(T.feedback[id],id);
});

test('Stage 2 adds data only: runtime engine and existing level rules stay untouched',()=>{
  assert.equal(D.version,'morph-20260924-v1');
  assert.equal(D.levels.length,9);
  assert.equal(Object.keys(D.families).length,28);
  assert.equal(T.contentLock.currentRuntimeFamiliesReady,true);
});

console.log('MORPH_TEACHING_DATA_OK',n,'checks;',runtimeFamilies.length,'families;',T.modules.length,'modules');
