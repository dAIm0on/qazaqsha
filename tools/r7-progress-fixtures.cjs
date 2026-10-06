/* r7: builds synthetic OLD-progress fixtures (no real learner data).
   node tools/r7-progress-fixtures.cjs . qa/fixtures/progress-r7 */
// Builds synthetic OLD-progress fixtures (no real learner data). Run with base modules on PATH arg.
const path=require('path'),fs=require('fs');
const repo=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const core=require(path.join(repo,'core.js'));
const T0=Date.UTC(2026,8,20,8,0,0),H=3600000,D=24*H;
const rec=(ok,at,hint=false)=>core.updateRecord(undefined,ok,hint,at,{responseTime:4200,recall:true,rating:ok&&!hint?3:1});
function ev(card,at,ok,answers,extra={}){return {id:'ev:'+at+':'+card,session_id:'1',presentation:0,type:'answer',card_id:card,at,correct:ok,hinted:false,response_time_ms:4200,response_time:4200,latency_ms:4200,recall:true,answers,item_type:'vocab',direction:'kk',first_try_correct:ok?1:0,peek:0,retype_after_peek_ok:null,confusion_tag:'',confuse_pair_id:'',official_like:0,predicted_R:null,hours_since_last:null,rule_peek:0,homework:0,block:'',...extra};}
const fixtures={};
// 1) Pre-schema-5 profile (no courseProgress, old field names).
fixtures['schema4-early-learner']={app:'qazaq-trainer',schema:4,records:{'m1-1-1':{attempts:3,correct:2,streak:1,dueAt:T0+D,last_seen:T0},'m1-2-1':rec(true,T0+H)},skills:{},vocabulary:{'word:сәлем':{times_seen:4,last_seen:T0,last_seen_lesson:'1-1',target_or_context:'target'}},associations:{'word:сәлем':'салам — привет'},events:[ev('m1-2-1',T0+H,true,['сәлем'])],learning:{lessonId:'1-1',notes:{'1-1':'гласные'},steps:{'1-1':2},completedSteps:{'1-1:0':true}},grammarPath:{topicId:null,step:0,phase:'hub',completed:['1-1']}};
// 2) Schema-7 profile mid lesson 4-2 with homework done the old aggregate way.
const qal=['қалайсың','қалайсыңдар','қалайсыз','қалайсыздар'];
const r42={};
r42['v2-4-2-vocab-qalaisyn-ru-1']=rec(true,T0+2*D);
r42['v2-4-2-vocab-qalaisyn-kk-set']=rec(true,T0+2*D+H);
r42['v2-4-2-vocab-oqu-kk-set']=rec(false,T0+2*D+2*H);
r42['e42-w11-men-yes']=rec(true,T0+2*D+3*H,true);
const sk={};sk['word:қалайсың::recognition']={...rec(true,T0+2*D),item_id:'word:қалайсың',skill_type:'recognition',lesson_id:'4-2',successful_prompts:['қалайсың'],error_history:[]};
sk['word:түсіну::production']={...rec(true,T0+D),item_id:'word:түсіну',skill_type:'production',lesson_id:'4-1',successful_prompts:['понимать'],error_history:[]};
const events=[ev('v2-4-2-vocab-qalaisyn-ru-1',T0+2*D,true,['как дела']),ev('v2-4-2-vocab-qalaisyn-kk-set',T0+2*D+H,true,[qal.join(' ')]),ev('v2-4-2-vocab-oqu-kk-set',T0+2*D+2*H,false,['оқу оқыдым']),ev('hw42-x',T0+3*D,true,['Мен түсіндім'],{homework:1})];
fixtures['schema7-lesson-4-2-homework']={app:'qazaq-trainer',schema:7,exported_at:'2026-09-24T10:00:00.000Z',records:r42,skills:sk,errors:[{error_type:'wrong_form',timestamp:T0+2*D+2*H,card_id:'v2-4-2-vocab-oqu-kk-set'}],issueLog:[],associations:{'word:қалайсың':{text:'как дела — қалайсың',updated_at:T0+2*D}},confusions:{},vocabulary:{'word:қалайсың':{times_seen:6,last_seen:T0+2*D,last_seen_lesson:'4-2',target_or_context:'target'},'word:түсіну':{times_seen:9,last_seen:T0+D,last_seen_lesson:'4-1',target_or_context:'target'}},events,learning:{lessonId:'4-2',notes:{},steps:{},completedSteps:{}},prefs:{letters:true,lettersChosen:true},homeworkAttempts:{'4-2':{lessonId:'4-2',started_at:T0+3*D,items:[{id:'v2-4-2-vocab-qalaisyn-kk-set',answers:[qal.join(' ')],correct:true,rule_peek:false,answer_peek:false,skipped:false,expected:qal.join(' / '),at:T0+3*D,status:'done',event_id:'ev:x'}],rule_peeks:0,answer_peeks:0,submitted_at:T0+3*D+H,export_rev:1,cursor:null,checklist:{method:true,exercises:true,words:true,external_test:true,keyboard:false,cheat:false},previous:[]},'4-1':{lessonId:'4-1',started_at:T0+D,items:[],rule_peeks:0,answer_peeks:0,submitted_at:null,export_rev:0,cursor:null,checklist:{method:true,exercises:false,words:true,external_test:false,keyboard:false,cheat:false},previous:[]}},courseProgress:{lessons:{'4-1':{status:'completed',path:{chapterId:null,beat:0,phase:'hub'},startedAt:T0,completedAt:T0+D,updatedAt:T0+D},'4-2':{status:'in_progress',path:{chapterId:'v2-theory-4-2-past',beat:2,phase:'beat',contentRevision:'4-2.r1'},startedAt:T0+2*D,updatedAt:T0+3*D}},resumePointer:{lessonId:'4-2',surface:'path',updatedAt:T0+3*D}},grammarPath:{lessonId:'4-2',chapterId:'v2-theory-4-2-past',beat:2,phase:'beat'},lesson_packages:[],savings:{}};
// 3) Corrupted / hostile evidence blob (must be sanitized, core untouched, no throw).
fixtures['schema7-corrupt-evidence']={...JSON.parse(JSON.stringify(fixtures['schema7-lesson-4-2-homework'])),evidence:{v:1,attempts:[null,7,{id:'__proto__',q:'x'},{id:'ok-1',q:'v2-4-2-vocab-qalaisyn-ru-1',at:'NaN',fields:'bad',forms:[{src:'vocab:4-2:qalaisyn',form:5}]}],forms:{'__proto__':{x:1},'vocab:4-2:qalaisyn':{'қалайсыз':{keys:{'produce|single':{indep_at:-5,indep_n:'2'},'evil|x':{}}}}},migrations:'nope',legacy:[]}};
// 4) Written by a FUTURE build (evidence v2): must pass through untouched.
fixtures['schema7-future-evidence-v2']={...JSON.parse(JSON.stringify(fixtures['schema7-lesson-4-2-homework'])),evidence:{v:2,something_new:{a:[1,2,3]},migrations:{'r8-x':{at:1}}}};
fs.mkdirSync(out,{recursive:true});
for(const [k,v] of Object.entries(fixtures))fs.writeFileSync(path.join(out,k+'.json'),JSON.stringify(v,null,1)+'\n');
console.log(Object.keys(fixtures));
