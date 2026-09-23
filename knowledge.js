/* One learning item, independently scheduled skills, multiple question presentations. */
(function(){
 'use strict';
 const core=window.TrainerCore,S=window.ReviewScheduler,C=window.CURRICULUM,items=new Map(),rank=['NEW','LEARNING','FAMILIAR','REMEMBERED','MASTERED'];
 const labels={recognition:'Понимаю перевод',production:'Пишу по-казахски',context:'Применяю в предложении',digit_to_word:'Цифры → слово',word_to_digit:'Слово → цифры',harmony:'А / Е',initial_consonant:'Л / Д / Т',full_form:'Полная форма',plural_suppression:'Без окончания после количества',composition:'Составляю число',visual_recognition:'Различаю варианты',application:'Применяю правило',exception_20:'жиырмасыншы, не жиырманшы',suffix_family:'Порядковый суффикс',last_component:'Наклейка на последний кусок',sg_initial:'П/Б/М на новой основе',marker_presence:'Личное окончание дописано',sen_siz:'Правильный адресат',biz_initial:'Біз после м/н/ң',no_extra_plural:'Без второго множественного в модели урока',position:'Личное окончание на емес',presence:'Вопросительная частица есть',class:'Семья частицы по правому краю'};
 function bindings(q){
   if(q.skillBindings)return q.skillBindings;
   const out=[],bind=(item,skill,field=0,facet=null)=>out.push({item_id:item,skill_type:skill,field,facet});
   if(q.contextOnly){bind(q.prerequisites.find(id=>C.words.find(w=>w.id===id)?.aliases.includes(core.normalize(q.fields[0].answers[0])))||q.prerequisites[0],'context');bind('rule:plural','plural_suppression');}
   else if(q.id.startsWith('learn-compose-')||q.generatedNumber)bind('rule:number-composition',q.numberRange||(Number(q.stimulus)>=1000?'thousands':Number(q.stimulus)>=100?'hundreds':'composition'));
   else if(q.topic==='plural'&&q.kind==='fields'){
     if(q.ruleIds?.includes('quantity')){bind('rule:plural','plural_suppression');for(let i=1;i<q.fields.length;i++)bind('exercise:'+q.id,'recognition',i);}
     else q.fields.forEach((f,i)=>{
       const a=core.normalize(f.answers[0]);
       if(['а','е'].includes(a))bind('rule:plural','harmony',i);
       else if(['л','д','т'].includes(a))bind('rule:plural','initial_consonant',i);
       else if(/[лдт][ае]р$/.test(a)){bind('rule:plural','full_form',i);if(q.fields.length===1){bind('rule:plural','harmony',i,'vowel');bind('rule:plural','initial_consonant',i,'initial');}}
       else bind('exercise:'+q.id,'application',i);
     });
   }else if((q.topic==='person'||q.topic==='rules')&&q.kind==='fields'){
     const rule='rule:'+(q.ruleIds&&q.ruleIds[0]||'person-biz');
     q.fields.forEach((f,i)=>bind(rule,'application',i));
   }else if((q.ruleIds||[]).includes('ordinal')||q.group==='ord'){
     const ans=(q.fields||[]).flatMap(f=>f.answers||[]);
     const skill=window.ErrorDiagnostics&&window.ErrorDiagnostics.ordinalSkill?window.ErrorDiagnostics.ordinalSkill(q.stimulus,ans):(/жиырмасыншы/.test(ans.join(' '))?'exception_20':'suffix_family');
     q.fields.forEach((f,i)=>bind('rule:ordinal',skill,i));
   }else if(q.kind==='fields'&&(q.topic==='vocab'||q.topic==='numbers')){
     const w=C.words.find(w=>(q.vocabIds||[]).includes(w.id)&&w.aliases.some(a=>core.normalize(q.stimulus)===a||q.fields[0].answers.some(v=>core.normalize(v)===a)))||C.words.find(w=>q.vocabIds?.includes(w.id));
     const isKazakh=w&&q.fields[0].answers.some(a=>w.aliases.includes(core.normalize(a)));
     bind(w?.id||'exercise:'+q.id,q.topic==='numbers'?(isKazakh?'digit_to_word':'word_to_digit'):(isKazakh?'production':'recognition'));
   }else if(q.id.startsWith('learn-harmony-')&&q.kind==='fields')bind('rule:plural','harmony');
   else bind('exercise:'+q.id,q.kind==='multi'?'visual_recognition':'application',null);
   q.skillBindings=out;return out;
 }
 function key(b){return b.item_id+'::'+b.skill_type;}
 function register(q){q.vocabIds=q.vocabIds||C.words.filter(w=>w.aliases.includes(core.normalize(q.stimulus))).map(w=>w.id);for(const id of q.vocabIds){const w=C.words.find(w=>w.id===id);if(w&&!w.card_ids.includes(q.id))w.card_ids.push(q.id);}
   q.associationKeys=q.associationKeys||[...q.vocabIds,...bindings(q).map(b=>b.item_id),'card:'+q.id];
   for(const b of bindings(q)){if(!items.has(b.item_id))items.set(b.item_id,{item_id:b.item_id,lesson_id:q.lessonId,item_type:b.item_id.startsWith('word:')?(q.topic==='numbers'?'number':'word'):b.item_id.startsWith('rule:')?'rule':'example',skills:{},card_ids:[]});const item=items.get(b.item_id);item.skills[b.skill_type]=key(b);if(!item.card_ids.includes(q.id))item.card_ids.push(q.id);}return q;}
 function hydrate(state,questions){
   state.skills=state.skills||Object.create(null);for(const q of questions){register(q);const bs=bindings(q),old=state.records[q.id];
     if(bs.length===1&&old?.seen&&!state.skills[key(bs[0])]){
       const candidates=questions.filter(other=>bindings(other).length===1&&key(bindings(other)[0])===key(bs[0])&&state.records[other.id]?.seen).map(other=>state.records[other.id]).sort((a,b)=>(b.last_answer||b.last_seen||0)-(a.last_answer||a.last_seen||0));
       state.skills[key(bs[0])]={...S.migrate(candidates[0]||old),item_id:bs[0].item_id,skill_type:bs[0].skill_type,lesson_id:q.lessonId,history_partial:true};
     }
   }
   sync(state,questions);
 }
 function sync(state,questions){
   for(const q of questions){const rows=bindings(q).map(b=>state.skills[key(b)]).filter(Boolean);if(!rows.length)continue;
     const p=state.records[q.id]||S.migrate();const missing=rows.length<bindings(q).length;
     const minimum=missing?0:Math.min(...rows.map(r=>rank.indexOf(r.mastery_level)));
     const next=Math.min(...rows.map(r=>r.next_review||Infinity));
     state.records[q.id]={...p,next_review:Number.isFinite(next)?next:null,dueAt:Number.isFinite(next)?next:0,mastery_level:rank[minimum]||'NEW',needsReview:rows.some(r=>r.needsReview),streak:missing?0:Math.min(...rows.map(r=>r.streak))};
   }
 }
 const RECOG=new Set(['recognition','visual_recognition','word_to_digit']);
 const PROD=new Set(['production','digit_to_word','full_form','application','suffix_family','exception_20','last_component','sg_initial','marker_presence','sen_siz','biz_initial','no_extra_plural','position','presence','class']);
 function isChoice(q){return q&&q.kind==='multi';}
 function canMasterProduction(q,event){
   if(!q||isChoice(q))return false;
   if(event&&(event.hinted||event.rule_peek||event.peek))return false;
   const types=bindings(q).map(b=>b.skill_type);
   if(types.every(t=>RECOG.has(t)))return false;
   return types.some(t=>PROD.has(t)||t==='harmony'||t==='initial_consonant'||t==='plural_suppression');
 }
 function observe(state,q,result,event,errors){
   register(q);const updates=new Map(),logs=[];
   for(const b of bindings(q)){
     let correct=b.field===null?result.correct:!!result.parts[b.field];
     if(b.facet){const f=q.fields[b.field],e=core.normalize(f.answers[0]),a=core.normalize(event.answers[b.field]);
       if(/[лдт][ае]р$/.test(a)&&e.slice(0,-3)===a.slice(0,-3))correct=b.facet==='vowel'?e.at(-2)===a.at(-2):e.at(-3)===a.at(-3);
     }
     const k=key(b),prev=updates.get(k);updates.set(k,{b,correct:prev?prev.correct&&correct:correct});
   }
   for(const error of errors){const skill={vowel_harmony:'harmony',plural_initial_consonant:'initial_consonant',plural_after_numeral:'plural_suppression'}[error.error_type];if(skill){const b={item_id:'rule:plural',skill_type:skill,field:error.field};updates.set(key(b),{b,correct:false});}}
   if(window.ErrorDiagnostics&&window.ErrorDiagnostics.microBinding){
     for(const error of errors||[]){
       const micro=window.ErrorDiagnostics.microBinding(error.error_type);
       if(!micro)continue;
       const b={item_id:micro.item_id,skill_type:micro.skill_type,field:error.field==null?0:error.field,facet:null};
       updates.set(key(b),{b,correct:false});
     }
   }
   for(const [k,{b,correct}] of updates){
     const recSkill=RECOG.has(b.skill_type)||isChoice(q);
     const old=state.skills[k],recall=!recSkill&&!event.rule_peek&&(event.recall&&!RECOG.has(b.skill_type)||['harmony','initial_consonant'].includes(b.skill_type));
     const r=S.answer(old,{at:event.at,correct,hinted:!!(event.hinted||event.rule_peek),responseTime:event.response_time_ms,recall});
     r.item_id=b.item_id;r.skill_type=b.skill_type;r.lesson_id=q.lessonId;
     r.successful_prompts=Array.from(new Set([...(old?.successful_prompts||[]),...(correct&&!event.hinted&&!event.rule_peek?[q.stimulus||q.id]:[])]));
     if(b.item_id==='rule:plural'&&r.mastery_level==='MASTERED'&&r.successful_prompts.length<2)r.mastery_level='REMEMBERED';
     if(recSkill&&r.mastery_level==='MASTERED')r.mastery_level='FAMILIAR';
     if(PROD.has(b.skill_type)&&!canMasterProduction(q,event)&&r.mastery_level==='MASTERED')r.mastery_level='REMEMBERED';
     r.status=r.mastery_level;
     r.error_history=[...(old?.error_history||[]),...errors.filter(e=>b.field===null||e.field===b.field)];
     state.skills[k]=r;logs.push({skill_id:k,item_id:b.item_id,skill_type:b.skill_type,correct,independent:correct&&!event.hinted&&!event.rule_peek,previous_answer_at:old?.last_answer||null,rating:r.fsrs_log.rating,fsrs_log:r.fsrs_log,fsrs_state:r.fsrs});
   }
   sync(state,window.COURSE.questions);return logs;
 }
 function choose(questions,state,limit=window.TRAINER_CONFIG.session.size){
   const used=new Set(),out=[];
   for(const q of questions){const keys=bindings(q).map(key);if(keys.every(k=>used.has(k)))continue;out.push(q);keys.forEach(k=>used.add(k));if(out.length>=limit)break;}return out;
 }
 function wordSkills(w,state){const item=items.get(w.id);return Object.entries(item?.skills||{}).map(([type,k])=>({type,label:labels[type]||type,record:state.skills[k]}));}
 window.Knowledge={items,labels,bindings,key,register,hydrate,sync,observe,choose,wordSkills,isChoice,canMasterProduction};
})();
