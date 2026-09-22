/* Grammar path engine. Encoding of a rule, not SRS and not homework. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const data=node?require('./grammar-paths.js'):root.GRAMMAR_PATHS;
 const core=node?require('./core.js'):root.TrainerCore;
 function topic(id){return (data.topics||[]).find(t=>t.id===id)||null;}
 function topics(){return data.topics||[];}
 function lexSet(){return new Set((data.LEX||[]).map(w=>core.normalize(w)));}
 function tokens(s){return String(s||'').split(/[^0-9A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]+/).filter(x=>x&&!/^\d+$/.test(x)&&x.length>1);}
 function lexOk(check){
  const allow=lexSet();
  const blob=[].concat(check.answers||[],check.answer||[],check.stem||'').join(' ');
  return tokens(blob).every(tok=>{
    const n=core.normalize(tok).replace(/^\*/,'');
    if(n.length<=2)return true;
    if(allow.has(n)||[...allow].some(w=>w===n||w.includes(n)||n.includes(w)))return true;
    if(!/[әғқңөұүһіқғ]/.test(n))return true;
    return false;
  });
 }
 function typesOk(checks){
  if(!checks||checks.length<1||checks.length>3)return false;
  const types=checks.map(c=>c.type);
  return new Set(types).size===types.length||checks.length===1;
 }
 function stepMeta(step){
  return {n:(step.checks||[]).length,typesOk:typesOk(step.checks),ids:(step.checks||[]).map(c=>c.id)};
 }
 function mixOf(t){return (t&&t.mix||[]).slice(0,4);}
 function sameTopicMix(t){return mixOf(t).every(c=>String(c.id||'').startsWith(t.id));}
 function tableText(check){
  let text=data.TABLE||'';
  const answers=[].concat(check&&check.answers||[],check&&check.answer?[check.answer]:[]).filter(a=>String(a).length>3);
  for(const a of answers){
    const re=new RegExp('[^\\n]*'+String(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^\\n]*\\n?','iu');
    if(re.test(text))text=text.replace(re,'');
  }
  return text.trim();
 }
 function hasAnswerIn(text,check){
  const blob=String(text||'').toLowerCase();
  return [].concat(check.answers||[],check.answer?[check.answer]:[]).filter(a=>String(a).length>3).some(a=>blob.includes(String(a).toLowerCase()));
 }
 function evalCheck(check,input){
  const got=core.normalize(input||'');
  const opts=[].concat(check.answers||[],check.answer||[]).map(a=>core.normalize(a));
  return opts.includes(got);
 }
 function feedback(check){
  const painted=(check.slots&&check.slots.painted)||'';
  return {
    slot:painted||(check.stem?check.stem+' + …':''),
    lever:check.rule_line||'',
    trap:check.trap||'',
    error_key:check.error_key||'other'
  };
 }
 function schedule(failedId,others){
  return core.blockReviewQueue(failedId,(others||[]).filter(id=>id!==failedId),[],2);
 }
 function emptyProgress(){return {topicId:null,step:0,phase:'hub',queue:[],index:0,peeks:Object.create(null),fails:Object.create(null),passed:Object.create(null),blocked:false,completed:[],lessonId:null,chapterId:null,beat:0,completedChapters:Object.create(null),legacyCompleted:[]};}
 function startTopic(state,topicId){
  const t=topic(topicId);if(!t)return state;
  const gp=state.grammarPath||(state.grammarPath=emptyProgress());
  if(gp.blocked)return gp;
  gp.topicId=topicId;gp.step=0;gp.phase='screen';gp.queue=[];gp.index=0;gp.peeks=Object.create(null);gp.fails=Object.create(null);gp.passed=Object.create(null);
  return gp;
 }
 function beginChecks(gp,t,step){
  gp.phase='checks';gp.queue=(step.checks||[]).map(c=>c.id);gp.index=0;
  return gp;
 }
 function peekRate(gp,stepId){
  const p=gp.peeks[stepId]||{n:0,peek:0};
  return p.n?p.peek/p.n:0;
 }
 function canMix(gp,t){
  const steps=t.steps||[];
  return steps.every(s=>peekRate(gp,s.step_id)<=0.5);
 }
 function notePeek(gp,stepId,peeked){
  const p=gp.peeks[stepId]||(gp.peeks[stepId]={n:0,peek:0});
  p.n++;if(peeked)p.peek++;
 }
 function noteFail(gp,key){
  if(!key)return 0;
  gp.fails[key]=(gp.fails[key]||0)+1;
  if(gp.fails[key]>=3)gp.blocked=true;
  return gp.fails[key];
 }
 function recordPath(state,check,correct,peeked,now,detail){
  if(now&&typeof now==='object'){detail=now;now=Date.now();}
  now=now||Date.now();
  detail=detail||{};
  const gp=state.grammarPath||(state.grammarPath=emptyProgress());
  const skill='path:'+(gp.lessonId||gp.topicId||'T')+'::step:'+(gp.chapterId||gp.step||0);
  const eventId=typeof detail.event_id==='string'&&detail.event_id?detail.event_id.slice(0,120):('path:'+(check&&check.id||'step')+':'+now);
  const actual=detail.actual!=null?String(detail.actual).slice(0,300):'';
  const expected=detail.expected!=null?String(detail.expected).slice(0,300):'';
  const codes=Array.isArray(detail.codes)?detail.codes.filter(x=>typeof x==='string').slice(0,8):[];
  state.events=state.events||[];
  const event={id:eventId,type:'path',card_id:check.id,at:now,correct:!!correct,peek:peeked?1:0,hinted:!!peeked,first_try_correct:(peeked||!correct)?0:1,item_type:'path',error_key:check.error_key||'',block:'path:'+(gp.lessonId||gp.topicId||''),answers:actual?[actual]:[],actual_answer:actual,expected_answer:expected,codes,lesson_id:gp.lessonId||'',chapter_id:gp.chapterId||'',skill};
  if(Array.isArray(detail.skills))event.skills=detail.skills;
  state.events.push(event);
  if(correct&&!peeked)gp.passed[check.id]=true;
  if(!correct&&!peeked)noteFail(gp,check.error_key);
  notePeek(gp,(topic(gp.topicId)||{steps:[]}).steps[gp.step]&&(topic(gp.topicId).steps[gp.step].step_id),peeked);
  return event;
 }
 function thousandOk(text){
  if(!/75\s*950|75950/.test(String(text)))return true;
  return /мың/.test(String(text));
 }
 const chData=node?require('./grammar-chapters.js'):root.GRAMMAR_CHAPTERS;
 function lessons(){return (chData&&chData.LESSONS)||[];}
 function lesson(id){return lessons().find(l=>l.id===id)||null;}
 function chapter(lessonId,chapterId){const l=lesson(lessonId);return l&&(l.chapters||[]).find(c=>c.id===chapterId)||null;}
 function asksOf(ch){return (ch&&ch.beats||[]).filter(b=>b.k==='ask');}
 function productionAsks(ch){return asksOf(ch).filter(b=>b.type==='one_prod');}
 function flattenText(lessonsList){return JSON.stringify(lessonsList||lessons());}
 function navIsLessons(){return lessons().every(l=>/^\d-\d$/.test(l.id))&&!lessons().some(l=>/^T\d/.test(l.id));}
 function chapterLabel(c){return (c.title||'')+' '+(c.rule_ids||[]).join(' ');}
 function questionTableLesson(){return lessons().filter(l=>l.id==='2-3'&&l.chapters.some(c=>c.id==='2-3-q'||/^Полная таблица вопроса$/i.test(c.title)));}
 function ordinalLessons(){return lessons().filter(l=>l.chapters.some(c=>(c.rule_ids||[]).includes('порядковые')));}
 function hasPossessiveGrammar(){return lessons().some(l=>(l.chapters||[]).some(c=>/посессив|притяжательн|губн(ая|ой) гармо|степен(и|ей) сравнен|падеж/i.test(chapterLabel(c))));}
 function hasMeningGrammar(){return lessons().some(l=>(l.chapters||[]).some(c=>/менің|сенің|сіздің|оның|бар\/жоқ|(^|\s)(бар|жоқ)(\s|$)/i.test(chapterLabel(c))));}
 function respectfulBye(){return /уважительн/i.test(flattenText())&&/сау болыңыздар/.test(flattenText());}
 function diagnoseProd(expected,actual){
  const e=core.normalize(expected||''),a=core.normalize(actual||'');
  if(e===a)return 'Верно.';
  if(/тар$|тер$/.test(e)&&/лар$|лер$/.test(a))return 'Ты выбрала стык Л, а нужна Т: после глухой — тар/тер.';
  if(/дар$|дер$/.test(e)&&/лар$|лер$/.test(a))return 'Ты выбрала стык Л, а нужна Д: после М/Н/З — дар/дер. Не *адамлар.';
  if(/лар$|лер$/.test(e)&&/дар$|дер$/.test(a))return 'После Р и гласных нужна Л, не Д: жерлер, не жердер.';
  if(/дар$|дер$/.test(e)&&/тар$|тер$/.test(a))return 'Стык Т, а нужна Д.';
  if(/а/.test(e.slice(-2))&&/е/.test(a.slice(-2)))return 'Гармония: слово твёрдое, гласная А, не Е.';
  if(/е/.test(e.slice(-2))&&/а/.test(a.slice(-2)))return 'Гармония: слово мягкое, гласная Е, не А.';
  if(/мын$|мін$/.test(e)&&!/(мын|мін)$/.test(a))return 'Нужно окончание лица. *Мен дәрігер по курсу нельзя.';
  if(/емес/.test(e)&&/емес/.test(a)===false)return 'Отрицание: окончание переезжает на емес.';
  return 'Сверь край: основа + нужный кусок справа.';
 }
 function migrateProgress(gp){
  if(!gp)return emptyProgress();
  if(!gp.completedChapters)gp.completedChapters=Object.create(null);
  if(!gp.legacyCompleted)gp.legacyCompleted=Array.isArray(gp.completed)?gp.completed.slice():[];
  if(gp.phase==='pick')gp.phase='hub';
  if(gp.lessonId==null)gp.lessonId=null;
  if(gp.chapterId==null)gp.chapterId=null;
  if(!Number.isInteger(gp.beat))gp.beat=0;
  return gp;
 }
 function startLesson(state,lessonId){
  const gp=migrateProgress(state.grammarPath||(state.grammarPath=emptyProgress()));
  gp.lessonId=lessonId;gp.chapterId=null;gp.beat=0;gp.phase='lesson';
  return gp;
 }
 function startChapter(state,lessonId,chapterId){
  const gp=migrateProgress(state.grammarPath||(state.grammarPath=emptyProgress()));
  gp.lessonId=lessonId;gp.chapterId=chapterId;gp.beat=0;gp.phase='beat';
  return gp;
 }
 function markChapterDone(gp,lessonId,chapterId){
  gp.completedChapters=gp.completedChapters||Object.create(null);
  gp.completedChapters[lessonId+':'+chapterId]=true;
 }
 function keepChapter(gp,lessonId){
  if(!gp||gp.lessonId!==lessonId||!gp.chapterId)return false;
  if(gp.phase!=='beat'&&gp.phase!=='lesson')return false;
  if(gp.completedChapters&&gp.completedChapters[lessonId+':'+gp.chapterId])return false;
  return true;
 }
 const api={topic,topics,lexOk,typesOk,stepMeta,mixOf,sameTopicMix,tableText,hasAnswerIn,evalCheck,feedback,schedule,emptyProgress,startTopic,beginChecks,peekRate,canMix,recordPath,thousandOk,TABLE:data.TABLE,LEX:data.LEX,lessons,lesson,chapter,asksOf,productionAsks,navIsLessons,questionTableLesson,ordinalLessons,hasPossessiveGrammar,hasMeningGrammar,respectfulBye,diagnoseProd,migrateProgress,startLesson,startChapter,markChapterDone,keepChapter,FORBIDDEN:(chData&&chData.FORBIDDEN)||[]};
 if(node)module.exports=api;else root.GrammarPath=api;
})(typeof window!=='undefined'?window:globalThis);
