/* Installs compiled v2 lesson data into existing Qazaqsha registries. No lesson-specific branches. */
(function(root){
 'use strict';
 const schema=root.LessonV2Schema;
 const installed=new Map(); const shells=new Map();
 function productionReady(raw){return !!(raw&&raw.status==='released'&&raw.release&&raw.release.approved===true&&/^[0-9a-f]{40}$/i.test(raw.release.preview_head||'')&&/^https:\/\//.test(raw.release.preview_url||''));}
 // r7 51: same learner gate as LessonRegistry — draft/reviewed only with ?v2qa=1 / localStorage / localhost.
 function qaV2Preview(){
   try{
     const h=root.location&&root.location.hostname||'';
     if(h==='localhost'||h==='127.0.0.1')return true;
     if(/[?&]v2qa=1(?:&|$)/.test(String(root.location&&root.location.search||'')))return true;
     if(root.localStorage&&root.localStorage.getItem('qazaqsha-v2qa')==='1')return true;
   }catch(_){}
   return false;
 }
 function publishable(raw){return productionReady(raw)||qaV2Preview();}
 function questionCopy(q,lessonId){
   const K=root.ResponseKinds,keep=!!(K&&K.isSupportKind(q.kind)&&K.allowedLesson(lessonId)&&q.payload);
   return Object.assign({},q,{lessonId,kind:keep?q.kind:'fields',fields:keep?[]:q.fields,source:q.source||('v2-'+lessonId),group:q.group||q.id,part:q.part||'1',ruleIds:(q.ruleIds||q.rule_ids||[]).slice(),associationKeys:(q.associationKeys||[]).slice()});
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
 function stableSlug(v){return String(v||'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,100);}
 function pathLesson(p){
   if(Array.isArray(p.canonical_core)&&p.canonical_core.length){
     const chapters=p.canonical_core.map((c,i)=>({
       id:'v2-'+stableSlug(c.id||('section-'+(i+1))),
       title:c.title||('Шаг '+(i+1)),
       rule_ids:(c.rule_ids||[]).slice(),
       fullExplanation:c.body||'',
       source_refs:[],
       beats:[{k:'core',t:c.title||('Шаг '+(i+1)),b:c.body||''}]
     }));
     return {id:p.lesson_id,title:p.name||p.title,chapters};
   }
   const chapters=(p.theory||[]).map((t,i)=>{
     const beats=[
       {k:'goal',t:t.meaning},
       ...explanationBeats(t),
       {k:'algo',t:'Как действовать',items:t.decisionSteps}
     ];
     // r7 QA F2: a v2 example is one Kazakh line. Show an arrow only for a real «было → стало» pair
     // written in the data; never invent the slot or repeat the same word on both sides (қол → қол).
     for(const e of t.examples||[]){
       const kk=String(e.kazakh||'').trim(),pair=kk.split(/\s*(?:→|->)\s*/);
       const beat={k:'ex',from:kk,ru:e.translation,why:e.why||''};
       if(pair.length===2&&pair[0]&&pair[1]&&pair[0]!==pair[1]){beat.from=pair[0];beat.to=pair[1];}
       beats.push(beat);
     }
     for(const c of t.contrastExamples||[])beats.push({k:'trap',bad:c.bad,good:c.good,why:c.why});
     for(const note of t.limitations||[])beats.push({k:'fold',t:'Граница урока',b:note});
     for(const check of t.checks||[])beats.push({k:'ask',id:check.id,type:check.type,prompt:check.prompt,answer:check.answers[0],answers:check.answers,error_key:check.error_key,rule_line:check.rule_line||t.shortHint});
     return {id:'v2-'+stableSlug(t.id),title:t.title,rule_ids:[t.rule_id],fullExplanation:t.fullExplanation,source_refs:(t.source_refs||[]).slice(),beats};
   });
   return {id:p.lesson_id,title:p.name||p.title,chapters};
 }
 // Append-only id index of course.questions (rebuilt if the array shrinks). Replaces an O(n) scan per added card.
 const questionIdIndex=new WeakMap();
 function hasQuestionId(course,id){
   const qs=course.questions||[];let e=questionIdIndex.get(qs);
   if(!e||e.len>qs.length){e={len:0,ids:new Set()};questionIdIndex.set(qs,e);}
   for(;e.len<qs.length;e.len++){const x=qs[e.len];if(x)e.ids.add(x.id);}
   return e.ids.has(id);
 }
 function addQuestion(course,catalog,q){
   if(hasQuestionId(course,q.id))return;
   const row=root.Canonical?root.Canonical.applyQuestion(questionCopy(q,q.lessonId)):questionCopy(q,q.lessonId);
   course.questions.push(row);
   for(const wid of row.vocabIds||[]){const w=catalog.words.find(x=>x.id===wid);if(w&&!w.card_ids.includes(row.id))w.card_ids.push(row.id);}
 }
 function addVocabQuestions(p,course,catalog){
   const norm=s=>root.TrainerCore&&root.TrainerCore.normalize?root.TrainerCore.normalize(s):String(s||'').trim().toLowerCase();
   // r7 C-ROLE: source vocab-ID -> catalog word-ID, recorded instead of re-derived from a normalizer.
   const bindings=Object.create(null);
   const hwWords=new Set((p.homework&&p.homework.word_ids)||[]);
   const ownIds=new Set([...(p.original_exercises||[]),...(p.generated_questions||[]),...((p.practice_bank&&p.practice_bank.items)||[])].map(q=>q&&q.id));
   for(const v of p.vocabulary||[]){
     const w=catalog.addWord(v.lemma,v.translations,p.lesson_id,v.role);
     bindings[v.id]=w.id;
     const forms=(v.forms&&v.forms.length?v.forms:[v.lemma]).slice();
     w.aliases=w.aliases||[];
     for(const form of forms)if(!w.aliases.includes(form))w.aliases.push(form);
     const lemmaKey=norm(v.lemma);
     const lessonRank=id=>{const m=String(id||'').match(/^(\d+)-(\d+)$/);return m?Number(m[1])*100+Number(m[2]):null;};
     const rankedTarget=v.role==='target'&&lessonRank(p.lesson_id)!=null;
     const taken=(course.questions||[]).some(q=>{
       if(!q||q.topic!=='vocab')return false;
       // r7 Q5-06: a free bank card (no lesson) never blocks a lesson target's own cards — also when it
       // is already bound to the catalog word (before, only the same-lemma path had this exception).
       const bound=(q.vocabIds||[]).includes(w.id);
       const sameLemma=bound||norm(q.stimulus)===lemmaKey||((q.fields||[]).flatMap(f=>f.answers||[])).some(a=>norm(a)===lemmaKey);
       if(!sameLemma)return false;
       if(rankedTarget&&(q.source==='bank'||lessonRank(q.lessonId)==null))return false;
       return true;
     });
     // r7 2b (казакша, решение 3): a required homework word (homework.word_ids) that has no card of THIS
     // lesson still gets its own cards — new question-IDs only (old records/progress are not touched).
     // The usual id is used when it is free; if a school card already holds it, the id gets «-hw-».
     const hwOwn=taken&&hwWords.has(v.id)&&!(course.questions||[]).some(q=>q&&q.lessonId===p.lesson_id&&q.topic==='vocab'&&q.wordRole==='must'&&(q.vocabIds||[]).includes(w.id));
     if(taken&&!hwOwn)continue;
     const slug=String(v.id).split(':').at(-1);
     let base='v2-'+p.lesson_id+'-vocab-'+slug;
     const exists=id=>ownIds.has(id)||hasQuestionId(course,id);
     if(hwOwn&&[base+'-ru',base+'-kk',base+'-ru-1',base+'-kk-set'].some(exists))base='v2-'+p.lesson_id+'-hw-'+slug;
     const roleOf=hwOwn?'must':(v.role==='target'?'must':'used');
     const rows=[];
     if(forms.length===1){
       rows.push(
         {id:base+'-ru',origin:'generated',topic:'vocab',kind:'fields',title:'Переведи на русский',stimulus:forms[0],fields:[{label:'Ответ',kind:'text',answers:v.accept_also?[...v.translations,...v.accept_also]:v.translations}],explanation:forms[0]+' — '+v.translations.join(' / '),lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:roleOf,vocabIds:[w.id],ruleIds:[]},
         {id:base+'-kk',origin:'generated',topic:'vocab',kind:'fields',title:'Переведи на казахский',stimulus:v.translations[0],fields:[{label:'Ответ',kind:'text',answers:[forms[0]]}],explanation:forms[0]+' — '+v.translations.join(' / '),lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:roleOf,vocabIds:[w.id],ruleIds:[]}
       );
     }else{
       forms.forEach((form,i)=>{
         // r7 2b QA m5/m6: the first form is the dictionary form (infinitive), the others keep their own gloss.
         const gloss=v.form_translations&&v.form_translations[i]?[v.form_translations[i]]:v.translations;
         const what=i===0?'словарная форма':'форма';
         rows.push({id:base+'-ru-'+(i+1),origin:'generated',topic:'vocab',kind:'fields',title:i===0?'Узнай слово (словарная форма)':'Узнай форму',stimulus:form,fields:[{label:'Перевод',kind:'text',answers:gloss}],explanation:form+' ('+what+') — '+gloss.join(' / ')+'. Формы: '+forms.join(' / ')+'.',lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:roleOf,vocabIds:[w.id],ruleIds:[]});
       });
       rows.push({id:base+'-kk-set',origin:'generated',topic:'vocab',kind:'fields',title:'Напиши все формы',stimulus:v.translations[0],fields:[{label:'Все формы через пробел или /',kind:'set-text',answers:forms}],explanation:forms.join(' / ')+' — '+v.translations.join(' / ')+'.',lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:roleOf,vocabIds:[w.id],ruleIds:[]});
       // r7 W-2=C: one typed card per mandatory form (same source vocab-ID / catalog word, new question-IDs only).
       (v.form_checks||[]).forEach((c,i)=>rows.push({id:base+'-kk-form-'+(i+1),origin:'generated',topic:'vocab',kind:'fields',title:'Напиши форму',stimulus:c.prompt,fields:[{label:'Ответ',kind:'text',answers:[c.form]}],explanation:c.form+' — '+c.prompt+'. Все формы: '+forms.join(' / ')+'.',lessonId:p.lesson_id,source:'v2-'+p.lesson_id+'-vocab',wordRole:roleOf,vocabIds:[w.id],ruleIds:[],formCheck:{source_id:v.id,form:c.form}}));
     }
     for(const q of rows){addQuestion(course,catalog,q);if(!w.card_ids.includes(q.id))w.card_ids.push(q.id);}
   }
   return bindings;
 }
 // r7 Q5-A runtime: the lesson's homework word queue follows homework.word_ids (source vocab-IDs)
 // through the recorded catalog binding, not the global must/target role. With the current
 // data (word_ids == every target of the lesson) this is the same set as before.
 function homeworkWordQuestionIds(lessonId,wordIds,bindings,questions){
   const own=(questions||[]).filter(q=>q&&q.lessonId===lessonId&&q.topic==='vocab'&&q.wordRole==='must');
   // r7 2b (казакша b): «Напиши все формы» duplicates the per-form checks (W-2=C: four separate typed
   // forms + four recognitions). Where a word has form checks, the combined card stays in practice but
   // leaves the homework queue (it never counted toward the 4/4 anyway).
   const formWords=new Set(own.filter(q=>q.formCheck).flatMap(q=>q.vocabIds||[]));
   const all=own.filter(q=>!(/-kk-set$/.test(q.id)&&(q.vocabIds||[]).some(w=>formWords.has(w))));
   if(!bindings)return all.map(q=>q.id);
   const wanted=new Set((wordIds||[]).map(id=>bindings[id]).filter(Boolean));
   return all.filter(q=>(q.vocabIds||[]).some(w=>wanted.has(w))).map(q=>q.id);
 }
 // r7 QA F4/M1: which required homework words (homework.word_ids, source order) have their own card in this
 // lesson's homework word set. Hub and button use it: the button shows only when every word is covered.
 function homeworkWordCoverage(lessonId){
   const p=byId(lessonId)||ensure(lessonId);
   if(!p||!p.homework)return null;
   const ids=(p.homework.word_ids||[]).slice();
   const qs=root.COURSE&&root.COURSE.questions||[];
   const qids=homeworkWordQuestionIds(lessonId,ids,p.vocab_bindings,qs);
   const byQ=new Map(qs.map(q=>[q.id,q]));
   const bound=new Set(qids.flatMap(id=>(byQ.get(id)&&byQ.get(id).vocabIds)||[]));
   const lemma=new Map((p.vocabulary||[]).map(v=>[v.id,v.lemma]));
   const words=ids.map(id=>{const w=p.vocab_bindings&&p.vocab_bindings[id];return {id,catalog_id:w||null,lemma:lemma.get(id)||'',covered:!!(w&&bound.has(w))};});
   const covered=words.filter(w=>w.covered).length;
   return {lesson_id:lessonId,total:words.length,covered,complete:words.length>0&&covered===words.length,words,question_ids:qids};
 }
 function learningTracks(p,allQuestions){
   const byId=new Map(allQuestions.map(q=>[q.id,q]));
   const topicForIds=ids=>{
     const topics=[...new Set(ids.map(id=>byId.get(id)).filter(Boolean).map(q=>q.topic).filter(Boolean))];
     return topics.length===1?topics[0]:'rules';
   };
   return (p.stages||[]).map((s,i)=>{
     const ids=s.core_ids.filter(id=>byId.has(id));
     const items=ids.slice(0,4).map(id=>{const q=byId.get(id);return {front:q.stimulus,back:(q.fields&&q.fields[0]&&q.fields[0].answers||[])[0]||'',cue:q.explanation||''};});
     return {id:'v2-track-'+stableSlug(s.id),title:s.title,topic:topicForIds(ids),courseLesson:p.lesson_id,intro:'Практика после объяснения. Можно повторять столько, сколько нужно.',items:[],questionIds:ids,chunks:[{title:s.title,explanation:'Сначала попробуй без подсказки. Ошибка вернётся позже на другом примере.',items,questionIds:ids,associationKey:'stage:'+s.id}]};
   });
 }
 // r7 2b: one hub track per bank group («Банк · …»); voluntary practice, own origin 'bank'.
 const BANK_GROUPS=[['choice','Банк · выбери'],['tap','Банк · отметь в строке'],['sort','Банк · разложи'],['build','Банк · собери'],['detect','Банк · найди ошибку']];
 function bankTracks(p){
   const items=(p.practice_bank&&p.practice_bank.items)||[];if(!items.length)return [];
   return BANK_GROUPS.map(([g,title])=>{
     const ids=items.filter(q=>q.group===g).map(q=>q.id);if(!ids.length)return null;
     const chunks=[];for(let i=0;i<ids.length;i+=6)chunks.push({title,explanation:'Банк заданий урока: выбор, отметка, сортировка и сборка. Это тренировка с опорой, не домашка.',items:[],questionIds:ids.slice(i,i+6),associationKey:'bank:'+p.lesson_id+':'+g});
     return {id:'b34-track-'+p.lesson_id+'-'+g,title,topic:'bank',bank:true,courseLesson:p.lesson_id,intro:'Задания с вариантами. Они тренируют узнавание и не заменяют самостоятельный ввод.',items:[],questionIds:ids,chunks};
   }).filter(Boolean);
 }
 function stagePlans(p){
   return (p.stages||[]).map((s,i)=>({
     lessonId:p.lesson_id,contentRevision:p.content_revision,stageId:s.id.replace(/:/g,'-'),kind:s.kind,
     coreIds:s.core_ids.slice(),requiredIndependentIds:s.required_independent_ids.slice(),ruleIds:s.rule_ids.slice(),
     nextStageId:(p.stages[i+1]&&p.stages[i+1].id||'').replace(/:/g,'-')||null,minIndependentRatio:s.min_independent_ratio,maxPresentations:s.max_presentations,final:s.final
   }));
 }
 function releaseHeavy(raw){
   if(!raw||typeof raw!=='object')return;
   const list=root.LESSON_V2_COMPILED;
   if(!Array.isArray(list))return;
   const i=list.indexOf(raw);
   if(i<0)return;
   // Replace array slot (do not mutate shared object graphs used by tests/clones).
   list[i]={
     lesson_id:raw.lesson_id,content_revision:raw.content_revision,title:raw.title,label:raw.label,name:raw.name||raw.title,
     status:raw.status,release:raw.release||null,sources:raw.sources||[],prerequisites:raw.prerequisites||{lessons:[]},
     rules:raw.rules||[],homework:raw.homework||null,_hydrated:true
   };
 }
 function installShell(raw){
   if(!publishable(raw))return null;
   const course=root.COURSE,catalog=root.CURRICULUM,chapters=root.GRAMMAR_CHAPTERS;
   if(!course||!catalog||!chapters)throw Error('Lesson v2 runtime loaded before base registries');
   const id=raw.lesson_id;if(!id||shells.has(id))return shells.get(id)||null;
   for(const s of raw.sources||[])if(s&&s.url)course.sources['v2-'+id+'-'+s.id]={title:s.title,url:s.url,additional:s.role!=='SCHOOL_NORM'};
   for(const r of raw.rules||[])if(r&&r.id&&!catalog.rules.some(x=>x.id===r.id))catalog.rules.push({id:r.id,title:r.title,lesson_first_seen:id});
   if(!catalog.lessons.some(x=>x.id===id))catalog.lessons.push({id,title:raw.title,active:true,status:raw.status,depends_on:((raw.prerequisites&&raw.prerequisites.lessons)||[]).slice(),rules:(raw.rules||[]).map(r=>r.id),sources:(raw.sources||[]).filter(s=>s&&s.url).map(s=>s.url)});
   // Light grammar shell so path hub lists chapters without materializing exercise banks.
   const light={lesson_id:id,title:raw.title,name:raw.name||raw.title,theory:raw.theory||[],canonical_core:raw.canonical_core||[],rules:raw.rules||[]};
   const gLesson=pathLesson(light);const at=chapters.LESSONS.findIndex(x=>x.id===id);if(at<0)chapters.LESSONS.push(gLesson);else chapters.LESSONS[at]=gLesson;
   shells.set(id,{lesson_id:id,content_revision:raw.content_revision,status:raw.status});return shells.get(id);
 }
 function installOne(raw){
   if(!publishable(raw))return null;
   const p=schema.validate(raw);if(installed.has(p.lesson_id))return installed.get(p.lesson_id);
   const course=root.COURSE,catalog=root.CURRICULUM,learning=root.LEARNING,chapters=root.GRAMMAR_CHAPTERS;
   if(!course||!catalog||!learning||!chapters)throw Error('Lesson v2 runtime loaded before base registries');
   installShell(raw);
   for(const s of p.sources)if(s.url)course.sources['v2-'+p.lesson_id+'-'+s.id]={title:s.title,url:s.url,additional:s.role!=='SCHOOL_NORM'};
   for(const r of p.rules)if(!catalog.rules.some(x=>x.id===r.id))catalog.rules.push({id:r.id,title:r.title,lesson_first_seen:p.lesson_id});
   const vocabBindings=addVocabQuestions(p,course,catalog);
   for(const q of [...p.original_exercises,...p.generated_questions])addQuestion(course,catalog,q);
   // r7 2b: independent practice bank of blocks 3–4 (origin bank, support kinds only, never homework).
   const bank=(p.practice_bank&&p.practice_bank.items)||[];
   for(const q of bank)addQuestion(course,catalog,Object.assign({},q,{origin:'bank',bank:true,source:'b34-'+p.lesson_id,lessonId:p.lesson_id}));
   if(!catalog.lessons.some(x=>x.id===p.lesson_id))catalog.lessons.push({id:p.lesson_id,title:p.title,active:true,status:p.status,depends_on:p.prerequisites.lessons.slice(),rules:p.rules.map(r=>r.id),sources:p.sources.filter(s=>s.url).map(s=>s.url)});
   const gLesson=pathLesson(p);const at=chapters.LESSONS.findIndex(x=>x.id===p.lesson_id);if(at<0)chapters.LESSONS.push(gLesson);else chapters.LESSONS[at]=gLesson;
   const existing=new Set((learning.lessons||[]).map(x=>x.id));for(const l of [...learningTracks(p,course.questions),...bankTracks(p)])if(!existing.has(l.id)){learning.lessons.push(l);existing.add(l.id);}
   if(root.CourseProgress&&root.CourseProgress.registerStages)root.CourseProgress.registerStages(p.lesson_id,stagePlans(p));
   // Keep metadata only in installed map; questions live in COURSE, theory in GRAMMAR_CHAPTERS.
   const kept={lesson_id:p.lesson_id,content_revision:p.content_revision,status:p.status,title:p.title,name:p.name||p.title,release:p.release||null,homework:p.homework,migrations:p.migrations||[],sources:p.sources,rules:p.rules,stages:p.stages,vocab_bindings:vocabBindings,practice_bank:p.practice_bank?{prefix:p.practice_bank.prefix,counts:p.practice_bank.counts,homework_intersection:p.practice_bank.homework_intersection,ids:p.practice_bank.items.map(q=>q.id)}:null,vocabulary:(p.vocabulary||[]).map(v=>({id:v.id,lemma:v.lemma,forms:v.forms.slice()})),canonical_core:p.canonical_core||[],references:p.references||[],practice_policy:p.practice_policy||null};
   installed.set(p.lesson_id,kept);
   releaseHeavy(raw);
   return kept;
 }
 function ensure(id){
   if(!id)return null;
   if(installed.has(id))return installed.get(id);
   const raw=(root.LESSON_V2_COMPILED||[]).find(x=>x&&x.lesson_id===id);
   if(!raw)return null;
   return installOne(raw);
 }
 function installAll(){const out=[];for(const raw of root.LESSON_V2_COMPILED||[]){const p=installOne(raw);if(p)out.push(p);}return out;}
 function installShells(){const out=[];for(const raw of root.LESSON_V2_COMPILED||[]){const p=installShell(raw);if(p)out.push(p);}return out;}
 function byId(id){return installed.get(id)||null;}
 function migrationChain(lessonId,fromRevision){
   const p=byId(lessonId);if(!p)return null;
   if(!fromRevision||fromRevision===p.content_revision)return [];
   const byFrom=new Map((p.migrations||[]).map(m=>[m.from_revision,m]));
   const chain=[],seen=new Set();let rev=fromRevision;
   while(rev!==p.content_revision){
     if(seen.has(rev)||chain.length>=20)return null;
     seen.add(rev);const m=byFrom.get(rev);if(!m)return null;
     chain.push(m);rev=m.to_revision;
   }
   return chain;
 }
 function migrateId(lessonId,fromRevision,kind,value){
   if(!['question_ids','chapter_ids','stage_ids','vocab_ids'].includes(kind))return null;
   const chain=migrationChain(lessonId,fromRevision);if(chain===null)return null;
   let v=value;
   for(const m of chain){
     if(kind==='question_ids'&&(m.drop_question_ids||[]).includes(v))return null;
     v=(m[kind]&&m[kind][v])||v;
   }
   return v;
 }
 function migrateIds(lessonId,fromRevision,kind,values){
   const out=[];for(const value of values||[]){const v=migrateId(lessonId,fromRevision,kind,value);if(!v)return null;if(!out.includes(v))out.push(v);}return out;
 }
 function isV2(id){return installed.has(id)||shells.has(id)||(root.LessonRegistry&&root.LessonRegistry.isV2(id));}
 function homeworkMeta(raw){
   if(!raw||!publishable(raw)||!raw.homework)return null;
   const h=raw.homework,ext=h.external_tasks||[],id=raw.lesson_id;
   const src=k=>(raw.sources||[]).find(s=>s&&s.id===k)||{};
   const method=src('school-method'),hwPdf=src('school-homework');
   const installedQs=(root.COURSE&&root.COURSE.questions||[]).filter(q=>q.lessonId===id);
   return {lesson_id:id,content_revision:raw.content_revision,homework:{title:h.title,word_ids:(h.word_ids||[]).slice(),exercise_ids:(h.exercise_ids||[]).slice(),word_question_ids:installedQs.filter(q=>q.topic==='vocab'&&q.wordRole==='must').map(q=>q.id),rule_map:Object.fromEntries((h.exercise_ids||[]).map(qid=>{const q=installedQs.find(q=>q.id===qid);return [qid,(q&&q.ruleIds&&q.ruleIds[0])||''];}).filter(x=>x[1])),external_test_url:ext[0]&&ext[0].url||'',external_tests:ext.map(x=>x.url),checklist:(h.checklist||[]).slice(),extras:[],method_title:method.title||('Методичка '+id),method_url:method.url||'',homework_pdf_title:hwPdf.title||('Домашка '+id),homework_pdf_url:hwPdf.url||'',source_items:(h.source_items||[]).slice()}};
 }
 function homework(id){
   // Do not ensure() here: Homework.packs() maps every lesson id for the picker.
   // App calls ensure(id) before starting a sheet so questions exist in COURSE.
   const p=byId(id);
   if(p){
     const h=p.homework,ext=h.external_tasks||[];const src=k=>p.sources.find(s=>s.id===k)||{};const method=src('school-method'),hwPdf=src('school-homework');
     return {lesson_id:id,content_revision:p.content_revision,homework:{title:h.title,word_ids:h.word_ids.slice(),exercise_ids:h.exercise_ids.slice(),word_question_ids:homeworkWordQuestionIds(id,h.word_ids,p.vocab_bindings,root.COURSE.questions),rule_map:Object.fromEntries(h.exercise_ids.map(qid=>{const q=root.COURSE.questions.find(q=>q.id===qid);return [qid,(q&&q.ruleIds&&q.ruleIds[0])||''];}).filter(x=>x[1])),external_test_url:ext[0]&&ext[0].url||'',external_tests:ext.map(x=>x.url),checklist:h.checklist.slice(),extras:[],method_title:method.title||('Методичка '+id),method_url:method.url||'',homework_pdf_title:hwPdf.title||('Домашка '+id),homework_pdf_url:hwPdf.url||'',source_items:h.source_items.slice()}};
   }
   const raw=(root.LESSON_V2_COMPILED||[]).find(x=>x&&x.lesson_id===id);
   return homeworkMeta(raw);
 }
 function referenceForRule(lessonId,ruleId){
   const p=installed.get(lessonId);
   if(!p||!ruleId)return null;
   const rows=p.references||[];
   return rows.find(r=>(r.rule_ids||[]).includes(ruleId))||null;
 }
 function referenceById(lessonId,referenceId){
   const p=installed.get(lessonId);
   if(!p||!referenceId)return null;
   return (p.references||[]).find(r=>r.id===referenceId)||null;
 }
 function practiceForRule(lessonId,ruleId,limit=12){
   const p=installed.get(lessonId);
   if(!p||!root.COURSE||!ruleId)return [];
   const lessonRows=(root.COURSE.questions||[]).filter(q=>q&&q.lessonId===lessonId&&!q.bank);
   const byId=new Map(lessonRows.map(q=>[q.id,q]));
   const candidateIds=[],seen=new Set();
   const add=id=>{if(id&&byId.has(id)&&!seen.has(id)){seen.add(id);candidateIds.push(id);}};
   // Stage mapping is a fallback for legacy/non-verb banks that do not carry ruleIds.
   // A multi-rule stage becomes eligible only after every rule attached to that stage
   // has already appeared in theory, so optional practice cannot leak future material.
   const grammarLesson=root.GRAMMAR_CHAPTERS&&root.GRAMMAR_CHAPTERS.LESSONS&&root.GRAMMAR_CHAPTERS.LESSONS.find(x=>x&&x.id===lessonId);
   const ruleOrder=new Map();
   for(const [i,ch] of ((grammarLesson&&grammarLesson.chapters)||[]).entries())for(const rid of ch.rule_ids||[])if(!ruleOrder.has(rid))ruleOrder.set(rid,i);
   const currentOrder=ruleOrder.get(ruleId);
   for(const s of p.stages||[]){
     const stageRules=s.rule_ids||[];
     if(!stageRules.includes(ruleId))continue;
     const safe=stageRules.length<=1||(currentOrder!=null&&stageRules.every(rid=>!ruleOrder.has(rid)||ruleOrder.get(rid)<=currentOrder));
     if(safe)for(const id of s.core_ids||[])add(id);
   }
   // Direct ruleIds are precise and remain supported for every topic.
   for(const q of lessonRows)if((q.ruleIds||[]).includes(ruleId))add(q.id);
   const rows=candidateIds.map(id=>byId.get(id)).filter(Boolean);
   const groups=new Map();
   for(const q of rows){
     const key=q.generator&&q.generator.lexeme_id||String(q.stimulus||q.id).split(/[+—]/)[1]||q.id;
     if(!groups.has(key))groups.set(key,[]);
     groups.get(key).push(q);
   }
   const shuffle=a=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
   const buckets=shuffle([...groups.values()].map(shuffle));
   const picked=[];
   let round=0;
   while(picked.length<limit){
     let added=false;
     for(const bucket of buckets){
       if(bucket[round]){picked.push(bucket[round].id);added=true;if(picked.length>=limit)break;}
     }
     if(!added)break;
     round++;
   }
   return picked;
 }
 const api={installAll,installOne,installShells,ensure,byId,isV2,homework,homeworkWordQuestionIds,homeworkWordCoverage,practiceForRule,referenceForRule,referenceById,migrationChain,migrateId,migrateIds,installed,shells,stagePlans,pathLesson};
 root.LessonV2Runtime=api;
 // P0 Chrome Error 9: do not materialize every lesson pack (4-1 has 345 generated Qs) at boot.
 // Shells keep path/learn navigation; ensure(id) hydrates exercises on first open.
 installShells();
})(typeof window!=='undefined'?window:globalThis);
