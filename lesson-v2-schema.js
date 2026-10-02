/* Lesson Package v2: data-only contract for reviewed course lessons. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const fail=m=>{throw Error('Lesson v2: '+m);};
 function str(v,label,max=12000,allowEmpty=false){
   if(typeof v!=='string'||(!allowEmpty&&!v.trim())||v.length>max)fail('проверь '+label);
   return allowEmpty?v:v.trim();
 }
 function id(v,label='id'){const s=str(v,label,160);if(!/^[a-z0-9][a-z0-9:._-]*$/i.test(s))fail(label+' содержит недопустимые символы');return s;}
 function list(v,label,min=0,max=1000){if(!Array.isArray(v)||v.length<min||v.length>max)fail('проверь список '+label);return v;}
 function strings(v,label,min=0,max=500){return list(v,label,min,max).map((x,i)=>str(x,label+'['+i+']',500));}
 function source(s){
   if(!obj(s))fail('source object');
   const out={id:id(s.id,'source.id'),role:str(s.role,'source.role',80),title:str(s.title,'source.title',240)};
   if(s.url){out.url=str(s.url,'source.url',2000);if(!/^https:\/\//.test(out.url))fail('source.url должен быть https');}
   if(s.note)out.note=str(s.note,'source.note',2000);
   return out;
 }
 function field(f){
   if(!obj(f))fail('exercise field');
   const kinds=['text','number-text','set-text','select','syllables'];
   if(!kinds.includes(f.kind))fail('exercise field.kind');
   const out={label:str(f.label,'field.label',240),kind:f.kind,answers:strings(f.answers,'field.answers',1,30)};
   if(f.options)out.options=strings(f.options,'field.options',2,40);
   return out;
 }
 function exercise(q,lessonId){
   if(!obj(q))fail('exercise object');
   const out={
     id:id(q.id,'exercise.id'),origin:str(q.origin||'school','exercise.origin',40),
     topic:str(q.topic||'verbs','exercise.topic',40),kind:'fields',
     title:str(q.title,'exercise.title',400),stimulus:str(q.stimulus,'exercise.stimulus',1400,true),
     fields:list(q.fields,'exercise.fields',1,24).map(field),
     explanation:str(q.explanation||'Сверь форму по правилу урока.','exercise.explanation',5000),
     lessonId:lessonId
   };
   if(q.source_item)out.source_item=str(q.source_item,'exercise.source_item',240);
   if(q.prompt_original)out.prompt_original=str(q.prompt_original,'exercise.prompt_original',1600);
   const ruleInput=q.rule_ids||q.ruleIds;if(ruleInput)out.ruleIds=strings(ruleInput,'exercise.rule_ids',0,20).map(x=>id(x,'rule_id'));
   const sourceInput=q.source_refs||q.sourceRefs;if(sourceInput)out.source_refs=strings(sourceInput,'exercise.source_refs',0,20).map(x=>id(x,'source_ref'));
   if(q.diagnostic_codes)out.diagnostic_codes=strings(q.diagnostic_codes,'exercise.diagnostic_codes',0,20).map(x=>id(x,'diagnostic_code'));
   if(q.note)out.note=str(q.note,'exercise.note',1600);
   if(q.translation)out.translation=str(q.translation,'exercise.translation',1200);
   if(q.stage)out.stage=str(q.stage,'exercise.stage',40);
   if(q.error_key)out.error_key=id(q.error_key,'exercise.error_key');
   if(q.reference_id)out.reference_id=id(q.reference_id,'exercise.reference_id');
   if(q.translation_visibility)out.translation_visibility=str(q.translation_visibility,'exercise.translation_visibility',40);
   if(q.item_type)out.item_type=str(q.item_type,'exercise.item_type',60);
   if(q.direction)out.direction=str(q.direction,'exercise.direction',60);
   if(q.plural_instruction)out.plural_instruction=str(q.plural_instruction,'exercise.plural_instruction',60);
   if(q.is_core!=null)out.is_core=!!q.is_core;
   if(q.recall_eligible!=null)out.recall_eligible=!!q.recall_eligible;
   if(q.production_eligible!=null)out.production_eligible=!!q.production_eligible;
   if(q.contrast_group)out.contrast_group=id(q.contrast_group,'exercise.contrast_group');
   return out;
 }
 function theory(t){
   if(!obj(t))fail('theory object');
   const out={
     id:id(t.id,'theory.id'),rule_id:id(t.rule_id,'theory.rule_id'),title:str(t.title,'theory.title',240),
     meaning:str(t.meaning,'theory.meaning',4000),fullExplanation:str(t.fullExplanation,'theory.fullExplanation',20000),
     shortHint:str(t.shortHint,'theory.shortHint',1200),
     decisionSteps:strings(t.decisionSteps||[],'theory.decisionSteps',1,30),
     examples:list(t.examples||[],'theory.examples',1,30).map(e=>({kazakh:str(e.kazakh,'example.kazakh',500),translation:str(e.translation,'example.translation',700),why:e.why?str(e.why,'example.why',1000):''})),
     contrastExamples:list(t.contrastExamples||[],'theory.contrastExamples',0,30).map(e=>({bad:str(e.bad,'contrast.bad',500),good:str(e.good,'contrast.good',500),why:str(e.why,'contrast.why',1200)})),
     limitations:strings(t.limitations||[],'theory.limitations',0,30),
     commonConfusions:strings(t.commonConfusions||[],'theory.commonConfusions',0,30),
     source_refs:strings(t.source_refs||[],'theory.source_refs',1,30).map(x=>id(x,'source_ref')),
     checks:list(t.checks||[],'theory.checks',1,8).map(c=>({id:id(c.id,'check.id'),type:str(c.type||'one_prod','check.type',40),prompt:str(c.prompt,'check.prompt',700),answers:strings(c.answers,'check.answers',1,20),error_key:id(c.error_key||'other','check.error_key'),rule_line:c.rule_line?str(c.rule_line,'check.rule_line',1000):''}))
   };
   return out;
 }
 function reference(r){
   if(!obj(r))fail('reference object');
   const out={
     id:id(r.id,'reference.id'),
     title:str(r.title,'reference.title',240),
     version:str(r.version||'1','reference.version',40),
     rule_ids:strings(r.rule_ids||[],'reference.rule_ids',1,40).map(x=>id(x,'reference.rule_id')),
     quick_lines:strings(r.quick_lines||[],'reference.quick_lines',1,80),
     full_lines:strings(r.full_lines||r.quick_lines||[],'reference.full_lines',1,160),
     examples:list(r.examples||[],'reference.examples',0,30).map(e=>({
       kazakh:str(e.kazakh,'reference.example.kazakh',500),
       translation:str(e.translation,'reference.example.translation',700),
       why:e.why?str(e.why,'reference.example.why',1200):''
     }))
   };
   if(r.section)out.section=id(r.section,'reference.section');
   return out;
 }
 function vocabulary(w,lessonId){
   if(!obj(w))fail('vocabulary object');
   const role=w.role==='context'?'context':'target';
   const lemma=str(w.lemma,'vocab.lemma',120),forms=strings(w.forms||[lemma],'vocab.forms',1,20);
   return {id:id(w.id,'vocab.id'),lemma,forms,translations:strings(w.translations,'vocab.translations',1,12),role,introduced_in:lessonId,source_refs:strings(w.source_refs||[],'vocab.source_refs',1,20).map(x=>id(x,'source_ref'))};
 }
 function generator(g){
   if(!obj(g))fail('generator object');
   if(g.kind!=='nonpast')fail('generator.kind пока поддерживает только nonpast');
   return {
     id:id(g.id,'generator.id'),kind:g.kind,
     lexemes:list(g.lexemes,'generator.lexemes',1,100).map(x=>({
       id:id(x.id,'lexeme.id'),lemma:str(x.lemma,'lexeme.lemma',120),translation:str(x.translation,'lexeme.translation',240),
       stem:str(x.stem,'lexeme.stem',120),negative_stem:str(x.negative_stem||x.stem,'lexeme.negative_stem',120),
       harmony:x.harmony==='front'?'front':'back'
     })),
     persons:strings(g.persons||['1sg','1pl','2sg','2pl','2pol','2polpl','3'],'generator.persons',1,7),
     polarities:strings(g.polarities||['affirmative','negative'],'generator.polarities',1,2)
   };
 }
 function stage(s){
   if(!obj(s))fail('stage object');
   return {
     id:id(s.id,'stage.id'),title:str(s.title,'stage.title',240),kind:['learning','repair','checkpoint'].includes(s.kind)?s.kind:'learning',
     core_ids:strings(s.core_ids,'stage.core_ids',1,24).map(x=>id(x,'stage.core_id')),
     required_independent_ids:strings(s.required_independent_ids||s.core_ids,'stage.required_independent_ids',1,24).map(x=>id(x,'stage.required_id')),
     rule_ids:strings(s.rule_ids||[],'stage.rule_ids',0,20).map(x=>id(x,'rule_id')),
     min_independent_ratio:Number.isFinite(Number(s.min_independent_ratio))?Math.min(1,Math.max(0,Number(s.min_independent_ratio))):0.8,
     max_presentations:Number.isFinite(Number(s.max_presentations))?Math.min(24,Math.max(1,Math.floor(Number(s.max_presentations)))):24,
     final:s.final===true
   };
 }
 function homework(h,knownIds,lessonId){
   if(!obj(h))fail('homework object');
   const ids=strings(h.exercise_ids||[],'homework.exercise_ids',0,1000).map(x=>id(x,'homework.exercise_id'));
   const known=knownIds instanceof Set?knownIds:new Set(knownIds||[]);
   const miss=ids.filter(x=>!known.has(x));if(miss.length)fail('homework exercise_ids не найдены: '+miss.slice(0,10).join(', '));
   return {
     lesson_id:lessonId,title:str(h.title||('Домашка '+lessonId),'homework.title',240),
     source_items:list(h.source_items||[],'homework.source_items',1,30).map(x=>({id:id(x.id,'homework.source_item.id'),number:str(x.number,'homework.source_item.number',40),text:str(x.text,'homework.source_item.text',1200),source_ref:id(x.source_ref,'homework.source_item.source_ref')})),
     word_ids:strings(h.word_ids||[],'homework.word_ids',0,200).map(x=>id(x,'homework.word_id')),
     exercise_ids:ids,
     external_tasks:list(h.external_tasks||[],'homework.external_tasks',0,20).map(x=>({id:id(x.id,'external.id'),type:str(x.type||'external_test','external.type',60),label:str(x.label,'external.label',300),url:str(x.url,'external.url',2000)})),
     checklist:strings(h.checklist||['method','exercises','words','external_test'],'homework.checklist',1,20)
   };
 }
 function correction(c){
   if(!obj(c))fail('correction object');
   return {id:id(c.id,'correction.id'),source_ref:id(c.source_ref,'correction.source_ref'),source_item_id:str(c.source_item_id,'correction.source_item_id',160),original:str(c.original,'correction.original',1200),corrected:str(c.corrected,'correction.corrected',1200),reason:str(c.reason,'correction.reason',3000),status:c.status==='reviewed'?'reviewed':'draft',qa_fixture_id:id(c.qa_fixture_id,'correction.qa_fixture_id')};
 }
 function idMap(v,label){
   if(v==null)return {};
   if(!obj(v))fail(label+' должен быть object');
   const out={},entries=Object.entries(v);if(entries.length>300)fail(label+' слишком большой');
   for(const [from,to] of entries)out[id(from,label+'.from')]=id(to,label+'.to');
   return out;
 }
 function migration(m,currentRevision){
   if(!obj(m))fail('migration object');
   const from=id(m.from_revision,'migration.from_revision'),to=id(m.to_revision||currentRevision,'migration.to_revision');
   if(from===to)fail('migration from_revision и to_revision совпадают');
   return {
     from_revision:from,to_revision:to,
     question_ids:idMap(m.question_ids,'migration.question_ids'),
     chapter_ids:idMap(m.chapter_ids,'migration.chapter_ids'),
     stage_ids:idMap(m.stage_ids,'migration.stage_ids'),
     vocab_ids:idMap(m.vocab_ids,'migration.vocab_ids'),
     drop_question_ids:strings(m.drop_question_ids||[],'migration.drop_question_ids',0,300).map(x=>id(x,'migration.drop_question_id'))
   };
 }
 function releaseInfo(v,status){
   const r=obj(v)?v:{};
   const out={
     approved:r.approved===true,
     preview_head:typeof r.preview_head==='string'?r.preview_head.trim():'',
     preview_url:typeof r.preview_url==='string'?r.preview_url.trim():'',
     approved_at:typeof r.approved_at==='string'?r.approved_at.trim():'',
     note:typeof r.note==='string'?r.note.trim().slice(0,2000):''
   };
   if(out.preview_url&&!/^https:\/\//.test(out.preview_url))fail('release.preview_url должен быть https');
   if(status==='released'){
     if(!out.approved)fail('released lesson требует release.approved=true');
     if(!/^[0-9a-f]{40}$/i.test(out.preview_head))fail('released lesson требует release.preview_head SHA40');
     if(!out.preview_url)fail('released lesson требует release.preview_url');
   }
   return out;
 }
 function validate(raw){
   if(!obj(raw)||raw.schema_version!==2)fail('нужен schema_version=2');
   const lessonId=str(raw.lesson_id,'lesson_id',30);if(!/^\d+-\d+$/.test(lessonId))fail('lesson_id вида 4-1');
   const status=['draft','reviewed','released'].includes(raw.status)?raw.status:'draft';
   const out={
     schema_version:2,lesson_id:lessonId,content_revision:id(raw.content_revision,'content_revision'),
     title:str(raw.title,'title',240),label:str(raw.label||lessonId.replace('-', '–'),'label',40),name:str(raw.name||raw.title,'name',240),
     status,
     release:releaseInfo(raw.release,status),
     sources:list(raw.sources,'sources',3,100).map(source),
     prerequisites:{lessons:strings(raw.prerequisites&&raw.prerequisites.lessons||[],'prerequisites.lessons',0,50),skills_required:strings(raw.prerequisites&&raw.prerequisites.skills_required||[],'skills_required',0,100),skills_review:strings(raw.prerequisites&&raw.prerequisites.skills_review||[],'skills_review',0,100)},
     scope:{allowed:strings(raw.scope&&raw.scope.allowed||[],'scope.allowed',1,100),blocked_future:strings(raw.scope&&raw.scope.blocked_future||[],'scope.blocked_future',0,100)},
     rules:list(raw.rules,'rules',1,100).map(r=>({id:id(r.id,'rule.id'),title:str(r.title,'rule.title',240)})),
     theory:list(raw.theory,'theory',1,100).map(theory),
     references:list(raw.references||[],'references',0,100).map(reference),
     vocabulary:list(raw.vocabulary||[],'vocabulary',0,500).map(w=>vocabulary(w,lessonId)),
     original_exercises:list(raw.original_exercises||[],'original_exercises',0,1000).map(q=>exercise(q,lessonId)),
     practice_generators:list(raw.practice_generators||[],'practice_generators',0,50).map(generator),
     corrections:list(raw.corrections||[],'corrections',0,100).map(correction),
     migrations:list(raw.migrations||[],'migrations',0,50).map(m=>migration(m,raw.content_revision))
   };
   const sourceIds=new Set(out.sources.map(s=>s.id)),ruleIds=new Set(out.rules.map(r=>r.id));
   for(const t of out.theory){
     if(!ruleIds.has(t.rule_id))fail('theory rule_id не найден: '+t.rule_id);
     for(const ref of t.source_refs)if(!sourceIds.has(ref))fail('theory source_ref не найден: '+ref);
   }
   for(const ref of out.references)for(const rid of ref.rule_ids)if(!ruleIds.has(rid))fail('reference rule_id не найден: '+rid);
   for(const w of out.vocabulary)for(const ref of w.source_refs)if(!sourceIds.has(ref))fail('vocab source_ref не найден: '+ref);
   for(const q of out.original_exercises){
     for(const ref of q.source_refs||[])if(!sourceIds.has(ref))fail('exercise source_ref не найден: '+ref);
     for(const rid of q.ruleIds||[])if(!ruleIds.has(rid))fail('exercise rule_id не найден: '+rid);
   }
   for(const c of out.corrections)if(!sourceIds.has(c.source_ref))fail('correction source_ref не найден: '+c.source_ref);
   const ids=new Set();
   const take=(x,label)=>{if(ids.has(x))fail('duplicate id '+x+' ('+label+')');ids.add(x);};
   out.rules.forEach(x=>take(x.id,'rule'));out.theory.forEach(x=>take(x.id,'theory'));out.references.forEach(x=>take(x.id+':'+x.version,'reference'));out.vocabulary.forEach(x=>take(x.id,'vocabulary'));out.original_exercises.forEach(x=>take(x.id,'exercise'));out.practice_generators.forEach(x=>take(x.id,'generator'));out.corrections.forEach(x=>take(x.id,'correction'));
   out.generated_questions=list(raw.generated_questions||[],'generated_questions',0,5000).map(q=>exercise(q,lessonId));
   out.generated_questions.forEach(x=>{
     take(x.id,'generated question');
     for(const ref of x.source_refs||[])if(!sourceIds.has(ref))fail('generated source_ref не найден: '+ref);
     for(const rid of x.ruleIds||[])if(!ruleIds.has(rid))fail('generated rule_id не найден: '+rid);
   });
   const qids=new Set([...out.original_exercises,...out.generated_questions].map(q=>q.id));
   out.stages=list(raw.stages||[],'stages',0,100).map(stage);out.stages.forEach(st=>{
     take(st.id,'stage');
     for(const q of st.core_ids)if(!qids.has(q))fail('stage core_id не найден: '+q);
     for(const q of st.required_independent_ids)if(!st.core_ids.includes(q))fail('stage required_id не входит в core_ids: '+q);
     for(const rid of st.rule_ids)if(!ruleIds.has(rid))fail('stage rule_id не найден: '+rid);
   });
   out.homework=homework(raw.homework||{source_items:[{id:'missing',number:'?',text:'TBD',source_ref:out.sources[0].id}]},qids,lessonId);
   for(const row of out.homework.source_items)if(!sourceIds.has(row.source_ref))fail('homework source_ref не найден: '+row.source_ref);
   const vocabIds=new Set(out.vocabulary.map(v=>v.id));
   for(const wid of out.homework.word_ids)if(!vocabIds.has(wid))fail('homework word_id не найден: '+wid);
   const migrationFrom=new Set();
   for(const m of out.migrations){
     if(migrationFrom.has(m.from_revision))fail('duplicate migration from_revision '+m.from_revision);
     migrationFrom.add(m.from_revision);
   }
   return out;
 }
 const api={validate,id};
 if(node)module.exports=api;else root.LessonV2Schema=api;
})(typeof window!=='undefined'?window:globalThis);
