'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('./morph-engine');
const S=require('./morph-state');
const T=require('./morph-teaching-data');
const P=require('./progress');
const Core=require('./core');

let n=0;
function test(name,fn){fn();n++;console.log('PASS',name);}
function teach(overrides={}){
 return {eventId:'teach:'+Math.random(),type:'semantic_intro_seen',moduleId:'meaning',familyId:'PL',at:1700000000000,responseMode:'view',...overrides};
}

test('Stage 3 content version matches Stage 2 teaching data',()=>{
 assert.equal(S.TEACHING_CONTENT_VERSION,T.version);
 assert.equal(T.runtimeDataVersion,E.data.version);
});

test('Old morph state migrates additively with empty teaching state',()=>{
 const item=E.itemFor('n-бала',['PL']);
 const old={version:1,dataVersion:E.data.version,events:[{eventId:'old:1',itemId:item.id,lemmaId:item.lemmaId,sequence:item.sequence,contextClasses:['vowel'],level:'plural',mode:'learn',modality:'text',responseMode:'input',response:item.expected,expected:item.expected,correct:true,hinted:false,errorCodes:[],responseTime:400,at:1700000000000,dataVersion:E.data.version}],exposed:['n-бала'],session:null,updatedAt:1700000000000,recovery:null};
 const m=S.migrate(old);
 assert.equal(m.version,1);assert.equal(m.events.length,1);assert.equal(m.events[0].expected,item.expected);
 assert.equal(m.teaching.version,1);assert.equal(m.teaching.contentVersion,T.version);
 assert.deepEqual(m.teaching.events,[]);assert.equal(m.teaching.resume,null);
});

test('Theory and scaffolding events are non-production evidence and dedupe by eventId',()=>{
 let m=S.empty();
 for(const [i,type] of ['semantic_intro_seen','semantic_intro_completed','full_explanation_opened','semantic_check_attempt','feature_notice_attempt','guided_attempt','correction_after_feedback'].entries()){
   const r=S.recordTeaching(m,teach({eventId:'t:'+i,type,correct:type.includes('attempt')?true:null,at:1700000000000+i}));
   assert.equal(r.accepted,true,type);assert.equal(r.event.productionMastery,false,type);m=r.state;
 }
 assert.equal(m.teaching.events.length,7);
 const dup=S.recordTeaching(m,teach({eventId:'t:0',type:'semantic_intro_seen',at:1800000000000}));
 assert.equal(dup.accepted,false);assert.equal(dup.state.teaching.events.length,7);
});

test('Invalid teaching module or family cannot enter saved state',()=>{
 let m=S.empty();
 assert.equal(S.recordTeaching(m,teach({eventId:'bad:module',moduleId:'future_magic'})).accepted,false);
 assert.equal(S.recordTeaching(m,teach({eventId:'bad:family',familyId:'FUTURE_FAMILY'})).accepted,false);
 assert.equal(S.recordTeaching(m,teach({eventId:'bad:type',type:'mastered_forever'})).accepted,false);
});

test('Teaching resume round-trips current module and exact teaching step',()=>{
 let m=S.putTeachingResume(S.empty(),{currentModule:'verbs',currentTeachingStep:'FULL_EXPLANATION',familyId:'PTCP_GAN',stepIndex:2,draft:'келген кісі',updatedAt:1700000000100});
 const round=S.migrate(JSON.parse(JSON.stringify(m)));
 assert.deepEqual(round.teaching.resume,{contentVersion:T.version,currentModule:'verbs',currentTeachingStep:'FULL_EXPLANATION',familyId:'PTCP_GAN',stepIndex:2,draft:'келген кісі',updatedAt:1700000000100});
 m=S.putTeachingResume(round,null);assert.equal(m.teaching.resume,null);
});

test('Teaching resume receives a timestamp even when caller omits it',()=>{
 const before=Date.now(),m=S.putTeachingResume(S.empty(),{currentModule:'meaning',currentTeachingStep:'SEMANTIC_INTRO',familyId:'GEN',stepIndex:0,draft:''});
 assert.ok(m.teaching.resume.updatedAt>=before);assert.ok(m.teaching.updatedAt>=before);
});

test('Content revision preserves teaching history but clears stale resume',()=>{
 let m=S.recordTeaching(S.empty(),teach({eventId:'old-content-event',type:'semantic_intro_completed'})).state;
 m=S.putTeachingResume(m,{currentModule:'plural',currentTeachingStep:'FEATURE_NOTICE',familyId:'PL',stepIndex:1,draft:'',updatedAt:1700000000300});
 const raw=JSON.parse(JSON.stringify(m));raw.teaching.contentVersion='morph-teaching-old';raw.teaching.resume.contentVersion='morph-teaching-old';
 const migrated=S.migrate(raw);
 assert.equal(migrated.teaching.events.length,1);
 assert.equal(migrated.teaching.events[0].eventId,'old-content-event');
 assert.equal(migrated.teaching.resume,null);
 assert.ok(migrated.teaching.recovery.includes('контент обновился'));
});

test('Production channels keep guided, independent, mixed and transfer separate',()=>{
 const base={scored:true,modality:'text',mode:'learn',transfer:false,hinted:false,level:'plural',responseMode:'choice'};
 assert.equal(S.productionChannel(base),'independent_choice');
 assert.equal(S.productionChannel({...base,responseMode:'input'}),'independent_input');
 assert.equal(S.productionChannel({...base,hinted:true}),'guided');
 assert.equal(S.productionChannel({...base,level:'mixed'}),'mixed');
 assert.equal(S.productionChannel({...base,mode:'transfer',transfer:true}),'transfer');
 assert.equal(S.productionChannel({...base,modality:'audio'}),'excluded');
 assert.equal(S.productionChannel({...base,scored:false}),'excluded');
});

test('Teaching evidence does not promote theory or corrections into independent answers',()=>{
 let m=S.empty();
 m=S.recordTeaching(m,teach({eventId:'s1',type:'semantic_intro_seen',moduleId:'plural',familyId:'PL',at:1})).state;
 m=S.recordTeaching(m,teach({eventId:'s2',type:'semantic_intro_completed',moduleId:'plural',familyId:'PL',at:2})).state;
 m=S.recordTeaching(m,teach({eventId:'s3',type:'full_explanation_opened',moduleId:'plural',familyId:'PL',at:3})).state;
 m=S.recordTeaching(m,teach({eventId:'s4',type:'feature_notice_attempt',moduleId:'plural',familyId:'PL',correct:true,responseMode:'choice',at:4})).state;
 m=S.recordTeaching(m,teach({eventId:'s5',type:'guided_attempt',moduleId:'plural',familyId:'PL',correct:true,responseMode:'choice',hinted:true,at:5})).state;
 m=S.recordTeaching(m,teach({eventId:'s6',type:'correction_after_feedback',moduleId:'plural',familyId:'PL',correct:true,responseMode:'input',at:6})).state;
 const e=S.teachingEvidence(m,{moduleId:'plural',familyId:'PL'});
 assert.equal(e.semanticIntroSeen,true);assert.equal(e.semanticIntroCompleted,true);assert.equal(e.fullExplanationOpened,true);
 assert.deepEqual(e.featureNotice,{attempts:1,correct:1});
 assert.deepEqual(e.guided,{attempts:1,correct:1});
 assert.deepEqual(e.corrections,{attempts:1,correct:1});
 assert.deepEqual(e.independentChoice,{attempts:0,correct:0});
 assert.deepEqual(e.independentInput,{attempts:0,correct:0});
});

test('Existing morph answers become evidence channels without duplicate teaching answers',()=>{
 let m=S.putSession(S.empty(),E.createSession({level:'plural',seed:31,responseMode:'choice'}));
 const q1=E.getItem(m.session.queue[m.session.cursor].id),a1=E.answer(m.session,q1.expected,500,10);m=S.accept(m,a1).state;
 m=S.putSession(m,E.next(m.session));
 const s2={...m.session,responseMode:'input'},q2=E.getItem(s2.queue[s2.cursor].id),a2=E.answer(s2,q2.expected,600,20);m=S.accept(S.putSession(m,s2),a2).state;
 const e=S.teachingEvidence(m,{moduleId:'plural'});
 assert.equal(e.independentChoice.attempts,1);assert.equal(e.independentChoice.correct,1);
 assert.equal(e.independentInput.attempts,1);assert.equal(e.independentInput.correct,1);
 assert.equal(m.teaching.events.length,0);
});

test('Hinted runtime answer is guided, not independent',()=>{
 let s=E.createSession({level:'plural',seed:41,responseMode:'choice'});s={...s,hinted:true};
 let m=S.putSession(S.empty(),s);const q=E.getItem(s.queue[0].id);m=S.accept(m,E.answer(s,q.expected,100,30)).state;
 const e=S.teachingEvidence(m,{moduleId:'plural'});
 assert.equal(e.guided.attempts,1);assert.equal(e.independentChoice.attempts,0);assert.equal(e.independentInput.attempts,0);
});

test('Mixed and transfer evidence never collapse into ordinary independent evidence',()=>{
 let mix=E.createSession({level:'mixed',seed:51,responseMode:'input'}),m=S.putSession(S.empty(),mix);
 let q=E.getItem(mix.queue[0].id);m=S.accept(m,E.answer(mix,q.expected,100,40)).state;
 let tr=E.createSession({level:'harmony',mode:'transfer',seed:52,responseMode:'input'});m=S.putSession(m,tr);
 q=E.getItem(tr.queue[0].id);m=S.accept(m,E.answer(tr,q.expected,100,50)).state;
 const e=S.teachingEvidence(m);
 assert.equal(e.mixed.attempts,1);assert.equal(e.transfer.attempts,1);
 assert.equal(e.independentInput.attempts,0);
 assert.equal(S.scheduleUpdate(m.events.find(x=>x.transfer)),null);
});

test('Teaching merge unions events and keeps the newer resume',()=>{
 let a=S.recordTeaching(S.empty(),teach({eventId:'merge:a',type:'semantic_intro_seen',at:100})).state;
 a=S.putTeachingResume(a,{currentModule:'plural',currentTeachingStep:'CONTRAST_EXAMPLES',familyId:'PL',stepIndex:1,draft:'A',updatedAt:100});
 let b=S.recordTeaching(S.empty(),teach({eventId:'merge:b',type:'full_explanation_opened',moduleId:'plural',familyId:'PL',at:200})).state;
 b=S.putTeachingResume(b,{currentModule:'plural',currentTeachingStep:'FEATURE_NOTICE',familyId:'PL',stepIndex:2,draft:'B',updatedAt:200});
 const ab=S.merge(a,b),ba=S.merge(b,a);
 assert.deepEqual(ab.teaching.events.map(x=>x.eventId),['merge:a','merge:b']);
 assert.equal(ab.teaching.resume.currentTeachingStep,'FEATURE_NOTICE');assert.equal(ab.teaching.resume.draft,'B');
 assert.deepEqual(ab.teaching,ba.teaching);
});

test('Teaching history is capped independently from answer history',()=>{
 let m=S.empty();
 for(let i=0;i<S.TEACHING_HISTORY_LIMIT+20;i++)m=S.recordTeaching(m,teach({eventId:'cap:'+i,type:'semantic_intro_seen',at:i})).state;
 assert.equal(m.teaching.events.length,S.TEACHING_HISTORY_LIMIT);
 assert.equal(m.events.length,0);
 assert.equal(m.teaching.events[0].eventId,'cap:20');
});

test('Starting or replacing an exercise session does not erase teaching resume or history',()=>{
 let m=S.recordTeaching(S.empty(),teach({eventId:'keep:teach',type:'semantic_intro_completed',moduleId:'plural',familyId:'PL',at:100})).state;
 m=S.putTeachingResume(m,{currentModule:'plural',currentTeachingStep:'GUIDED_CHOICE',familyId:'PL',stepIndex:3,draft:'',updatedAt:101});
 m=S.putSession(m,E.createSession({level:'plural',seed:61}));
 assert.equal(m.teaching.events.length,1);assert.equal(m.teaching.events[0].eventId,'keep:teach');
 assert.equal(m.teaching.resume.currentTeachingStep,'GUIDED_CHOICE');
});

test('Progress export/import preserves teaching state and legacy FSRS unchanged',()=>{
 const now=1700000000000,legacy=Core.updateRecord({},true,false,now),fsrs=JSON.stringify(legacy.fsrs);
 let p=P.migrate({schema:6,records:{legacy},learning:{lessonId:'1-1'},courseProgress:{}},now);
 p.morphTrainer=S.recordTeaching(p.morphTrainer,teach({eventId:'backup:teach',type:'semantic_intro_completed',moduleId:'plural',familyId:'PL',at:now+1})).state;
 p.morphTrainer=S.putTeachingResume(p.morphTrainer,{currentModule:'plural',currentTeachingStep:'FULL_EXPLANATION',familyId:'PL',stepIndex:1,draft:'',updatedAt:now+2});
 const round=P.validate(P.serialize(p),new Set(['legacy']),now+3).state;
 assert.equal(JSON.stringify(round.records.legacy.fsrs),fsrs);
 assert.equal(round.morphTrainer.teaching.events.length,1);
 assert.equal(round.morphTrainer.teaching.resume.currentTeachingStep,'FULL_EXPLANATION');
});

test('Progress cloud merge preserves teaching events from both sides',()=>{
 let a=P.migrate({schema:7,records:{},courseProgress:{}}),b=P.migrate({schema:7,records:{},courseProgress:{}});
 a.morphTrainer=S.recordTeaching(a.morphTrainer,teach({eventId:'cloud:a',moduleId:'plural',familyId:'PL',at:10})).state;
 b.morphTrainer=S.recordTeaching(b.morphTrainer,teach({eventId:'cloud:b',type:'full_explanation_opened',moduleId:'plural',familyId:'PL',at:20})).state;
 b.morphTrainer=S.putTeachingResume(b.morphTrainer,{currentModule:'plural',currentTeachingStep:'FULL_EXPLANATION',familyId:'PL',stepIndex:1,draft:'',updatedAt:21});
 const m=P.merge(a,b);
 assert.deepEqual(m.morphTrainer.teaching.events.map(x=>x.eventId),['cloud:a','cloud:b']);
 assert.equal(m.morphTrainer.teaching.resume.currentTeachingStep,'FULL_EXPLANATION');
});

test('Stage 3 remains state-only and has no Level 0 UI wiring',()=>{
 const ui=fs.readFileSync('morph-ui.js','utf8'),app=fs.readFileSync('app.js','utf8');
 for(const token of ['recordTeaching(','putTeachingResume(','teachingEvidence(']){
   assert.equal(ui.includes(token),false,token+' in morph-ui');
   assert.equal(app.includes(token),false,token+' in app');
 }
 assert.equal(E.data.version,'morph-20260924-v1');
});

console.log('MORPH_TEACHING_STATE_OK',n,'checks;',S.TEACHING_CONTENT_VERSION);
