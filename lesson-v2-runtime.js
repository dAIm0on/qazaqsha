/* Installs compiled v2 lesson data into existing Qazaqsha registries. No lesson-specific branches. */
(function(root){
 'use strict';
 const schema=root.LessonV2Schema,engine=root.NonpastEngine;
 const installed=new Map();
 function questionCopy(q,lessonId){
   return Object.assign({},q,{lessonId,kind:'fields',source:q.source||('v2-'+lessonId),group:q.group||q.id,part:q.part||'1',ruleIds:(q.ruleIds||q.rule_ids||[]).slice(),associationKeys:(q.associationKeys||[]).slice()});
 }
 function explanationBeats(t){
   const raw=String(t.fullExplanation||'').trim();
   const paras=raw.split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
   const chunks=[];
   for(const para of (paras.length?paras:[raw])){
     if(para.length<=620){chunks.push(para);continue;}
     const sentences=para.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[para];
     let buf='';
     for(const sentence of sentences){
       const next=(buf+' '+sentence.trim()).trim();
       if(buf&&next.length>620){chunks.push(buf);buf=sentence.trim();}
       else buf=next;
     }
     if(buf)chunks.push(buf);
   }
   return chunks.map((b,i)=>({k:i===0?'why':'fold',t:i===0?t.title:'Ещё один шаг',b}));
 }
 function pathLesson(p){
   const chapters=(p.theory||[]).map((t,i)=>{
     const beats=[
       {k:'goal',t:t.meaning},
       ...explanationBeats(t),
       {k:'algo',t:'Как действовать',items:t.decisionSteps}
     ];
     for(const e of t.examples||[])beats.push({k:'ex',from:e.kazakh,to:e.kazakh,ru:e.translation,why:e.why||''});
     for(const c of t.contrastExamples||[])beats.push({k:'trap',bad:c.bad,good:c.good,why:c.why});
     for(const note of t.limitations||[])beats.push({k:'fold',t:'Граница урока',b:note});
     for(const check of t.checks||[])beats.push({k:'ask',id:check.id,type:check.type,prompt:check.prompt,answer:check.answers[0],answers:check.answers,error_key:check.error_key,rule_line:check.rule_line||t.shortHint});
     return {id:p.lesson_id+'-v2-'+String(i+1).padStart(2,'0'),title:t.title,rule_ids:[t.rule_id],beats};
   });
   return {id:p.lesson_id,title:p.name||p.title,chapters};
 }
 function addQuestion(course,catalog,q){
   if(course.questions.some(x=>x.id===q.id))return;
   const row=root.Canonical?root.Canonical.applyQuestion(questionCopy(q,q.lessonId)):questionCopy(q,q.lessonId);
   course.questions.push(row);
   for(const wid of row.vocabIds||[]){const w=catalog.words.find(x=>x.id===wid);if(w&&!w.card_ids.includes(row.id))w.card_ids.push(row.id);}
 }
 function addVocabQuestions(p,course,catalog){
   for(const v of p.vocabulary||[]){
     const w=catalog.addWord(v.lemma,v.translations,p.lesson_id,v.role);
     const base='v2-'+p.lesson_id+'-vocab-'+String(v.id).split(':').at(-1);
     const rows=[
       {id:base+'-ru',origin:'generated',topic:'vocab',kind:'fields',title:'Переведи на русский',stimulus:v.lemma,fields:[{label:'Ответ',kind:'text',answers:v.translations}],explanation:v.lemma+' — '+v.translations.join(' / '),lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:v.role==='target'?'must':'used',vocabIds:[w.id],ruleIds:[]},
       {id:base+'-kk',origin:'generated',topic:'vocab',kind:'fields',title:'Переведи на казахский',stimulus:v.translations[0],fields:[{label:'Ответ',kind:'text',answers:[v.lemma]}],explanation:v.lemma+' — '+v.translations.join(' / '),lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:v.role==='target'?'must':'used',vocabIds:[w.id],ruleIds:[]}
     ];
     for(const q of rows){addQuestion(course,catalog,q);if(!w.card_ids.includes(q.id))w.card_ids.push(q.id);}
   }
 }
 function learningTracks(p,allQuestions){
   const byId=new Map(allQuestions.map(q=>[q.id,q]));
   return (p.stages||[]).map((s,i)=>{
     const ids=s.core_ids.filter(id=>byId.has(id));
     const items=ids.slice(0,4).map(id=>{const q=byId.get(id);return {front:q.stimulus,back:(q.fields&&q.fields[0]&&q.fields[0].answers||[])[0]||'',cue:q.explanation||''};});
     return {id:'v2-stage-'+p.lesson_id+'-'+String(i+1).padStart(2,'0'),title:s.title,topic:'verbs',courseLesson:p.lesson_id,intro:'Практика после объяснения. Можно повторять столько, сколько нужно.',items:[],questionIds:ids,chunks:[{title:s.title,explanation:'Сначала попробуй без подсказки. Ошибка вернётся позже на другом примере.',items,questionIds:ids,associationKey:'stage:'+s.id}]};
   });
 }
 function stagePlans(p){
   return (p.stages||[]).map((s,i)=>({
     lessonId:p.lesson_id,contentRevision:p.content_revision,stageId:s.id.replace(/:/g,'-'),kind:s.kind,
     coreIds:s.core_ids.slice(),requiredIndependentIds:s.required_independent_ids.slice(),ruleIds:s.rule_ids.slice(),
     nextStageId:(p.stages[i+1]&&p.stages[i+1].id||'').replace(/:/g,'-')||null,minIndependentRatio:s.min_independent_ratio,maxPresentations:s.max_presentations,final:s.final
   }));
 }
 function installOne(raw){
   const p=schema.validate(raw);if(installed.has(p.lesson_id))return installed.get(p.lesson_id);
   const course=root.COURSE,catalog=root.CURRICULUM,learning=root.LEARNING,chapters=root.GRAMMAR_CHAPTERS;
   if(!course||!catalog||!learning||!chapters)throw Error('Lesson v2 runtime loaded before base registries');
   for(const s of p.sources)if(s.url)course.sources['v2-'+p.lesson_id+'-'+s.id]={title:s.title,url:s.url,additional:s.role!=='SCHOOL_NORM'};
   for(const r of p.rules)if(!catalog.rules.some(x=>x.id===r.id))catalog.rules.push({id:r.id,title:r.title,lesson_first_seen:p.lesson_id});
   addVocabQuestions(p,course,catalog);
   for(const g of p.practice_generators||[]){
     for(const q of engine.expand(p.lesson_id,g))addQuestion(course,catalog,q);
   }
   for(const q of [...p.original_exercises,...p.generated_questions])addQuestion(course,catalog,q);
   if(!catalog.lessons.some(x=>x.id===p.lesson_id))catalog.lessons.push({id:p.lesson_id,title:p.title,active:true,status:p.status,depends_on:p.prerequisites.lessons.slice(),rules:p.rules.map(r=>r.id),sources:p.sources.filter(s=>s.url).map(s=>s.url)});
   const gLesson=pathLesson(p);if(!chapters.LESSONS.some(x=>x.id===p.lesson_id))chapters.LESSONS.push(gLesson);
   const existing=new Set((learning.lessons||[]).map(x=>x.id));for(const l of learningTracks(p,course.questions))if(!existing.has(l.id)){learning.lessons.push(l);existing.add(l.id);}
   if(root.CourseProgress&&root.CourseProgress.registerStages)root.CourseProgress.registerStages(p.lesson_id,stagePlans(p));
   installed.set(p.lesson_id,p);return p;
 }
 function installAll(){const out=[];for(const raw of root.LESSON_V2_COMPILED||[])out.push(installOne(raw));return out;}
 function byId(id){return installed.get(id)||null;}
 function isV2(id){return installed.has(id)||(root.LessonRegistry&&root.LessonRegistry.isV2(id));}
 function homework(id){const p=byId(id);if(!p)return null;const h=p.homework,ext=h.external_tasks||[];return {lesson_id:id,homework:{title:h.title,word_ids:h.word_ids.slice(),exercise_ids:h.exercise_ids.slice(),word_question_ids:root.COURSE.questions.filter(q=>q.lessonId===id&&q.topic==='vocab'&&q.wordRole==='must').map(q=>q.id),rule_map:Object.fromEntries(h.exercise_ids.map(qid=>{const q=root.COURSE.questions.find(q=>q.id===qid);return [qid,(q&&q.ruleIds&&q.ruleIds[0])||''];}).filter(x=>x[1])),external_test_url:ext[0]&&ext[0].url||'',external_tests:ext.map(x=>x.url),checklist:h.checklist.slice(),extras:[],method_title:(p.sources.find(s=>s.id==='school-method')||{}).title||('Методичка '+id),method_url:(p.sources.find(s=>s.id==='school-method')||{}).url||'',source_items:h.source_items.slice()}};}
 const api={installAll,installOne,byId,isV2,homework,installed,stagePlans,pathLesson};
 root.LessonV2Runtime=api;
 installAll();
})(typeof window!=='undefined'?window:globalThis);
