'use strict';
const assert=require('node:assert/strict');
const E=require('./morph-engine.js');
const S=require('./morph-state.js');

function prove(){
 const errors=[];
 let m=S.putSession(S.empty(),E.createSession({level:'plural',seed:31,responseMode:'choice'}));
 const saved=m.session;
 const restored=S.putSession(m,saved);
 if(!restored.session||restored.session.cursor!==saved.cursor||restored.session.phase!=='question')errors.push('resume-before-answer');
 const q=E.getItem(restored.session.queue[restored.session.cursor].id);
 const answered=E.answer(restored.session,q.expected,400,11);
 const first=S.accept(restored,answered);
 if(!first.accepted)errors.push('first-answer');
 const again=S.accept(first.state,answered);
 if(again.accepted)errors.push('duplicate-answer');
 const same=first.state.events.filter(e=>e.eventId===answered.event.eventId);
 if(same.length!==1)errors.push('event-count '+same.length);
 const guided=S.recordTeaching(first.state,{eventId:'guided:probe',type:'guided_attempt',moduleId:'plural',familyId:'PL',at:1700000001000,responseMode:'choice',answer:'x',correct:true,hinted:true});
 if(!guided.accepted)errors.push('guided-not-stored');
 if(guided.state.events.length!==first.state.events.length)errors.push('guided-wrote-production');
 const reopened=S.putSession(first.state,first.state.session);
 if(reopened.events.length!==first.state.events.length)errors.push('reopen-duplicated');
 return {ok:errors.length===0,errors,events:first.state?first.state.events.length:0};
}

if(require.main===module){
 const result=prove();
 assert.equal(result.ok,true,result.errors.join(','));
 console.log('MORPH_RESUME_RUNTIME_OK');
}

module.exports={prove};
