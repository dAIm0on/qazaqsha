#!/usr/bin/env node
'use strict';
/* r7 step 2a: 4-2 homework words = T13 (Q5-A), fallback guard (Q5-13), four қалайсың form checks
   (W-2=C), lesson-hub homework words track + header counter (QA #6/#7), path error block (QA #1).
   Acceptance ids: Q5-01…14, H-01/04/05/06/08, ST-06/08/10/11/12. Bank (Q5-14 full, Q6) and FREG (ST-04/05) are step 2b. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('./progress.js'),E=require('./evidence-state.js'),Schema=require('./lesson-v2-schema.js'),Core=require('./core.js');
let passed=0;const ok=n=>{passed++;console.log('PASS',n);};
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const st=v=>Array.isArray(v)?v.map(st):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,st(v[k])])):v);
const h16=v=>crypto.createHash('sha256').update(JSON.stringify(st(v))).digest('hex').slice(0,16);
const plain=v=>JSON.parse(JSON.stringify(v));
const L42=JSON.parse(read('lessons/4-2/lesson.json')),L41=JSON.parse(read('lessons/4-1/lesson.json'));
const T13=['oilau','oinau','senu','kutu','aitu','qoiu','suiu','oqu','estu','qalai','qalaisyn','bari','raqmet'].map(x=>'vocab:4-2:'+x);
const R10=['tusinu','baru','zhuru','zhatu','otyru','turu','ashu','zhabu','tigu','da'].map(x=>'vocab:4-2:'+x);
const QAL='vocab:4-2:qalaisyn',QAL_FORMS=['қалайсың','қалайсыңдар','қалайсыз','қалайсыздар'];

// Q5-01 exact T13.
assert.deepEqual(L42.homework.word_ids,T13,'Q5-01: word_ids must be T13 in source order');
assert.equal(new Set(L42.homework.word_ids).size,13);
assert.ok(R10.every(id=>!L42.homework.word_ids.includes(id)),'Q5-01: no R10');
ok('Q5-01 4-2 homework.word_ids = T13 exactly, source order, no R10/duplicates');

// Q5-02 hw-item:4-2:3 text reflects T13 only.
{
  const it=L42.homework.source_items[2];
  assert.equal(it.id,'hw-item:4-2:3');assert.equal(it.number,'3');assert.equal(it.source_ref,'school-homework');
  const byId=new Map(L42.vocabulary.map(v=>[v.id,v]));
  for(const id of T13)assert.ok(it.text.includes(byId.get(id).lemma),'Q5-02 text misses '+id);
  for(const id of R10)assert.ok(!new RegExp('(^|[\\s,:;])'+byId.get(id).lemma.split('/')[0]+'([\\s,.;/]|$)').test(it.text),'Q5-02 text still names R10 '+id);
  assert.ok(it.text.includes('қалайсың/қалайсыңдар/қалайсыз/қалайсыздар'));
}
ok('Q5-02 hw-item:4-2:3 (index 2, number 3) names the 13 T13 targets and none of R10');

// Q5-03/04/07: everything else in 4-2 is unchanged (pinned to main 465afdf).
{
  const strip=L42.vocabulary.map(v=>{const y={...v};delete y.form_checks;delete y.form_translations;delete y.accept_also;return y;}); // r7 2b QA m6: form_translations is additive too; r7 X: accept_also too
  assert.equal(L42.vocabulary.length,23,'Q5-04: 23 vocabulary objects');
  assert.equal(h16(strip),'266d6e40de7518e6','Q5-04: vocabulary objects changed (beyond the additive form_checks / form_translations)');
  assert.deepEqual(L42.vocabulary.filter(v=>v.form_translations).map(v=>v.id),['vocab:4-2:qoiu','vocab:4-2:suiu','vocab:4-2:oqu','vocab:4-2:estu'],'m6: per-form glosses only on the four past-exception verbs');
  assert.equal(L42.vocabulary.filter(v=>v.form_checks).length,1,'only qalaisyn carries form_checks');
  assert.deepEqual(L42.homework.source_items[3],{id:'hw-item:4-2:4',number:'4',text:'Сделать тест ProshVremyaBezIsk на BatylBol, нажать «Зафиксировать результат» и выполнить его в течение 24 часов.',source_ref:'school-homework'});
  assert.deepEqual(L42.homework.external_tasks,[{id:'ext:4-2:bez-isk',type:'external_test',label:'BatylBol · Прошедшее время без исключений · выполнить за 24 часа',url:'https://batylbol.kz/test/ProshVremyaBezIsk.html'}]);
  assert.equal(h16(L42.homework.source_items.slice(0,2)),'64bc43b3bfd105bf');
  const pins={exercise_ids:[L42.homework.exercise_ids,'efc9f9f22854400e'],checklist:[L42.homework.checklist,'423b404b336f3260'],theory:[L42.theory,'ee3ab5ed3fdbe0f1'],stages:[L42.stages,'da2007ea720d89e7'],rules:[L42.rules,'7f88e5bf6edf775f'],original_exercises:[L42.original_exercises,'e1a2de904139f5f0'],generated_questions:[L42.generated_questions,'172450ba63e61f19'],practice_generators:[L42.practice_generators,'4f53cda18c2baa0c']};
  for(const [k,[v,want]] of Object.entries(pins))assert.equal(h16(v),want,'Q5-07: 4-2 '+k+' changed');
  assert.equal(L42.content_revision,'4-2.r1','theory untouched: no revision bump (a bump would reset a finished 4-2 path)');
}
ok('Q5-03/04/07 hw-item:4-2:4 + ext:4-2:bez-isk, 23 vocab objects, theory/stages/exercises/checklist byte-identical to main 465afdf');

// Q5-05 4-1 keeps its 10 targets.
assert.deepEqual(L41.homework.word_ids,['tusinu','baru','zhuru','zhatu','otyru','turu','ashu','zhabu','tigu','also'].map(x=>'vocab:4-1:'+x));
ok('Q5-05 4-1 homework.word_ids unchanged (R10 stays mandatory in 4-1)');

// Real runtime.
const ctx={window:{}};ctx.window.window=ctx.window;vm.runInNewContext(read('compiled-lessons-v2.js'),ctx);
const compiled=plain(ctx.window.LESSON_V2_COMPILED);
function runtime(list){
  const mock={LessonV2Schema:Schema,LESSON_V2_COMPILED:list,COURSE:{questions:[],sources:{}},LEARNING:{lessons:[]},GRAMMAR_CHAPTERS:{LESSONS:[]},
    CURRICULUM:{words:[],rules:[],lessons:[],addWord(kazakh,translation,lesson,role){let w=this.words.find(x=>x.kazakh===kazakh);if(!w){w={id:'word:'+kazakh,kazakh,translation:[...translation],lesson_first_seen:lesson,target_or_context:role==='target'?'target':'context',card_ids:[],aliases:[kazakh]};this.words.push(w);}return w;}},
    CourseProgress:{registerStages(){return [];}},Canonical:null};
  vm.runInNewContext(read('lesson-v2-runtime.js'),{window:mock,globalThis:mock,console});
  return mock;
}
const rt=runtime(plain(compiled));rt.LessonV2Runtime.installAll();
const Q=new Map(rt.COURSE.questions.map(q=>[q.id,q]));
const p42=rt.LessonV2Runtime.byId('4-2'),p41=rt.LessonV2Runtime.byId('4-1');
const hw42=rt.LessonV2Runtime.homework('4-2').homework;

// Q5-06 / ST-12 trace source-ID -> catalog -> question.
{
  assert.deepEqual(plain(hw42.word_ids),T13);
  const t13Words=new Set(T13.map(id=>p42.vocab_bindings[id]));assert.equal(t13Words.size,13);
  const r10Words=new Set(R10.map(id=>p42.vocab_bindings[id]));
  assert.ok(hw42.word_question_ids.length>=13);
  for(const qid of hw42.word_question_ids){const q=Q.get(qid);assert.ok(q&&q.lessonId==='4-2'&&q.topic==='vocab'&&q.wordRole==='must',qid);assert.ok(q.vocabIds.some(w=>t13Words.has(w)),'Q5-06: '+qid+' not bound to T13');assert.ok(!q.vocabIds.some(w=>r10Words.has(w)),'Q5-06: R10 in queue '+qid);}
  for(const w of t13Words)assert.ok(hw42.word_question_ids.some(qid=>Q.get(qid).vocabIds.includes(w)),'Q5-06: T13 word without a card '+w);
  // particle keeps its own source binding; qalaisyn is one catalog word.
  assert.equal(p42.vocab_bindings['vocab:4-2:da'],'word:да');
  assert.equal(rt.CURRICULUM.words.filter(w=>w.id===p42.vocab_bindings[QAL]).length,1);
}
ok('Q5-06/ST-12 V2 word queue traces T13 source-ID → catalog word → question; R10 never enters; particle/qalaisyn bindings explicit');

// Q5-06 (browser gap): a free bank card already bound to a T13 word (сүю: bank-50-*) must not block 4-2's own cards.
{
  const rt2=runtime(plain(compiled));
  rt2.CURRICULUM.addWord('сүю',['любить'],'bank','context');
  rt2.COURSE.questions.push({id:'bank-50-kk',lessonId:'bank',source:'bank',topic:'vocab',wordRole:'used',kind:'fields',title:'Переведи на казахский',stimulus:'любить',fields:[{kind:'text',answers:['сүю']}],vocabIds:['word:сүю']});
  rt2.LessonV2Runtime.installAll();
  const h=rt2.LessonV2Runtime.homework('4-2').homework,b=rt2.LessonV2Runtime.byId('4-2').vocab_bindings;
  const Q2=new Map(rt2.COURSE.questions.map(q=>[q.id,q]));
  for(const id of T13)assert.ok(h.word_question_ids.some(qid=>Q2.get(qid).vocabIds.includes(b[id])),'T13 word without a 4-2 card next to a bank card: '+id);
  assert.ok(h.word_question_ids.includes('v2-4-2-vocab-suiu-kk-set'));assert.ok(!h.word_question_ids.includes('bank-50-kk'));
  const r1=runtime(plain(compiled));r1.COURSE.questions.push({id:'l41-baru',lessonId:'4-1',source:'v2-4-1-vocab',topic:'vocab',wordRole:'must',kind:'fields',title:'x',stimulus:'бару',fields:[{kind:'text',answers:['идти']}],vocabIds:['word:бару']});
  r1.CURRICULUM.addWord('бару',['идти'],'4-1','target');r1.LessonV2Runtime.installAll();
  assert.ok(!r1.COURSE.questions.some(q=>q.id==='v2-4-2-vocab-baru-ru'),'a lesson card still takes the word (no duplicate R10 cards in 4-2)');
}
ok('Q5-06 a bank card bound to a T13 word no longer blocks the 4-2 card (сүю); lesson-owned cards still take the word');

// Q5-10/11 + ST-06: shared lemmas share one catalog word; da vs also stay distinct keys.
{
  for(const id of R10.filter(x=>x!=='vocab:4-2:da'))assert.equal(p42.vocab_bindings[id],p41.vocab_bindings[id.replace('4-2','4-1')],'Q5-10 '+id);
  assert.notEqual(p41.vocab_bindings['vocab:4-1:also'],p42.vocab_bindings['vocab:4-2:da'],'Q5-11: different catalog keys are not merged by guess');
  const before=JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json'));
  const m=P.migrate(before,1791270000000);
  for(const k of ['records','skills','vocabulary','associations','errors'])assert.deepEqual(plain(m[k]),plain(P.migrate(JSON.parse(JSON.stringify(before)),1791270000000)[k]));
  for(const [k,v] of Object.entries(before.skills||{}))assert.ok(m.skills[k],'ST-06 skill key lost '+k);
  for(const k of Object.keys(before.records||{}))assert.ok(m.records[k],'ST-06 record lost '+k);
}
ok('Q5-10/11/ST-06 nine shared lemmas keep one catalog word; vocab:4-1:also ≠ vocab:4-2:da; skill/record keys of old 4-2 progress kept (data change adds no IDs)');

// Q5-12 / H-04 / W-2=C: qalaisyn is one source-ID with four separate typed form checks.
{
  const v=L42.vocabulary.find(x=>x.id===QAL);
  assert.deepEqual(v.forms,QAL_FORMS);
  assert.deepEqual(v.form_checks.map(c=>c.form),QAL_FORMS);
  assert.deepEqual(v.form_checks.map(c=>c.prompt),['Как дела? (ты)','Как дела? (вы, на «ты»)','Как дела? (Вы)','Как дела? (вы, уважительно)']);
  assert.equal(L42.vocabulary.filter(x=>/qalaisyn/.test(x.id)).length,1,'no new vocab-IDs');
  assert.ok(!rt.CURRICULUM.words.some(w=>QAL_FORMS.slice(1).includes(w.kazakh)),'H-04: no new catalog word per form');
  const word=p42.vocab_bindings[QAL];
  const cards=QAL_FORMS.map((f,i)=>Q.get('v2-4-2-vocab-qalaisyn-kk-form-'+(i+1)));
  cards.forEach((q,i)=>{assert.ok(q,'form card '+(i+1));assert.equal(q.kind,'fields');assert.deepEqual(plain(q.fields[0].answers),[QAL_FORMS[i]]);assert.deepEqual(plain(q.vocabIds),[word]);assert.ok(hw42.word_question_ids.includes(q.id));
    const hits=E.formHits(q,[QAL_FORMS[i]],{correct:true,parts:[true]},['typed']);assert.deepEqual(plain(hits.map(x=>[x.form,x.dir,x.ctx])),[[QAL_FORMS[i],'produce','single']]);
    assert.equal(Core.evaluate(q,[QAL_FORMS[i][0].toUpperCase()+QAL_FORMS[i].slice(1)+'?']).correct,true);
    for(let j=0;j<4;j++)if(j!==i)assert.equal(Core.evaluate(q,[QAL_FORMS[j]]).correct,false,'form '+i+' must not accept '+QAL_FORMS[j]);});
  // full credit only 4/4 independent, no hint.
  const s=P.empty();let at=1791300000000;
  const ans=(q,a,extra={})=>E.observe(s,{q,answers:[a],result:Core.evaluate(q,[a]),event:{id:'e'+(at++),at,...extra},responseModes:['typed'],origin:'homework'});
  ans(cards[0],QAL_FORMS[0]);ans(cards[1],QAL_FORMS[1]);ans(cards[2],QAL_FORMS[2],{hinted:true});
  let fs4=E.formStatus(s,QAL);assert.equal(fs4.done,2);assert.equal(fs4.full_credit,false);
  ans(Q.get('v2-4-2-vocab-qalaisyn-kk-set'),QAL_FORMS.join(' '));
  ans(cards[3],QAL_FORMS[3]);fs4=E.formStatus(s,QAL);assert.equal(fs4.done,3);assert.equal(fs4.full_credit,false,'hinted form does not count');
  ans(cards[2],QAL_FORMS[2]);fs4=E.formStatus(s,QAL);assert.equal(fs4.done,4);assert.equal(fs4.full_credit,true);
  // schema guards
  const C42=compiled.find(x=>x.lesson_id==='4-2'),C41=compiled.find(x=>x.lesson_id==='4-1');
  assert.doesNotThrow(()=>Schema.validate(plain(C42)));
  const bad=plain(C42);bad.vocabulary[20].form_checks.push({form:'қалайсыңыз',prompt:'x'});
  assert.throws(()=>Schema.validate(bad),/form_checks/);
  const dup=plain(C42);dup.vocabulary[20].form_checks[1].form='қалайсың';
  assert.throws(()=>Schema.validate(dup),/повтор/);
  const noChecks=Schema.validate(plain(C41));assert.ok(noChecks.vocabulary.every(x=>!('form_checks' in x)),'absent form_checks stays absent');
}
ok('Q5-12/H-04 one qalaisyn source-ID + one catalog word, four typed produce|single checks; full credit only after 4/4 independent without hint');

// Q5-08 header counter in homework words = distinct homework words (13), not all eligible cards.
const appSrc=read('app.js');
const grab=name=>{const i=appSrc.indexOf(' function '+name+'(');assert.ok(i>0,name);const j=appSrc.indexOf('\n function ',i+5);return appSrc.slice(i,j);};
{
  const box={};
  const records={};
  vm.runInNewContext(grab('answeredSet')+'\n'+grab('homeworkCounter')+grab('wordGroupCounter')+'\nbox.f=homeworkCounter;',{box,records,hwPart:'words',byId:Q,state:{events:[],homeworkAttempts:{}}});
  const ids=plain(hw42.word_question_ids);
  let c=box.f(ids);assert.deepEqual(plain(c),{tried:0,total:13});
  records[ids[0]]={attempts:1,review_count:1};records[ids[1]]={attempts:1,review_count:1};
  const sameWord=Q.get(ids[0]).vocabIds[0]===Q.get(ids[1]).vocabIds[0];
  c=box.f(ids);assert.equal(c.tried,sameWord?1:2);assert.equal(c.total,13);
  for(let i=1;i<=4;i++)records['v2-4-2-vocab-qalaisyn-kk-form-'+i]={attempts:1,review_count:1};
  c=box.f(ids);assert.equal(c.tried,(sameWord?1:2)+1,'four form cards are one word');
  const box2={};vm.runInNewContext(grab('answeredSet')+'\n'+grab('homeworkCounter')+grab('wordGroupCounter')+'\nbox.f=homeworkCounter;',{box:box2,records,hwPart:'exercises',byId:Q,state:{events:[],homeworkAttempts:{}}});
  assert.deepEqual(plain(box2.f(['a','b',ids[0]])),{tried:1,total:3});
  const rs=grab('renderStats');assert.ok(/homeworkScope\(\)/.test(rs)&&/homeworkCounter\(hw\)/.test(rs),'renderStats uses the homework scope');
}
ok('Q5-08 homework words counter = words of the homework (4-2: N из 13), several cards of one word count once');

// QA #6: counter recounts right after the card is marked as shown.
{
  const ac=grab('activateCard');
  const i=ac.indexOf('ReviewScheduler.shown'),j=ac.indexOf('renderStats()');
  assert.ok(i>0&&j>i,'activateCard must repaint the counter after marking the card shown');
}
ok('QA #6 «Встречалось» is recounted after the shown mark (no stale value until F5)');

// QA #1: path error shows one «Ты написала» line; badge follows the check error_key.
{
  const labels=require('./diagnostics.js').labels;
  const constLine=appSrc.match(/ const PATH_KEY_LABEL=\{[^\n]*\};/);assert.ok(constLine);
  const box={};vm.runInNewContext(constLine[0]+grab('pathErrorBadges')+'\nbox.f=pathErrorBadges;',{box,window:{ErrorDiagnostics:{labels}}});
  assert.deepEqual(plain(box.f({error_key:'harmony'},[{error_type:'verb_form'}])),[labels.harmony_class]);
  assert.deepEqual(plain(box.f({error_key:'person_sen_siz'},[{error_type:'verb_form'}])),[labels.person_sen_siz]);
  assert.deepEqual(plain(box.f({error_key:'past_dy'},[{error_type:'verb_form'}])),[],'generic verb_form is not shown for a check with its own key');
  assert.deepEqual(plain(box.f({},[{error_type:'verb_form'}])),[labels.verb_form||'verb_form'],'no error_key: old behaviour');
  assert.ok(!box.f({error_key:'harmony'},[{error_type:'verb_form'}]).includes('Глагол: сборка формы'));
  const dl=appSrc.match(/ const chainBody=[^\n]*;\n *const diffLine=[^\n]*;/);assert.ok(dl);
  const EO=require('./explain-open.js');
  const pathQ={id:'path:1-1:x:y',lessonId:'1-1',kind:'fields',stimulus:'көл',title:'ряд?',fields:[{kind:'text',answers:['мягкий']}],ruleIds:[],vocabIds:[],topic:'sounds'};
  for(const [chain,val] of [[EO.chainHtml(pathQ,'твёрдый'),'твёрдый'],['','твёрдый'],[EO.chainHtml(pathQ,''),'']]){
    const b={};vm.runInNewContext(dl[0]+'\nb.out=diffLine+chainBody;',{b,chain,val,esc:x=>String(x)});
    const html=b.out;
    assert.ok(html.startsWith('<p data-error-diff>Ты написала'),'the diff line comes first');
    assert.equal((html.match(/Ты написала/g)||[]).length,1,'exactly one «Ты написала» line: '+html);
  }
  const b0=appSrc.indexOf(' const chainBody=');const block=appSrc.slice(b0,appSrc.indexOf("id=\"path-go\">Дальше</button>');",b0));assert.ok(block.length>200);
  assert.equal((block.match(/Ты написала/g)||[]).length,1);
  assert.ok(/const why=pathErrorBadges\(beat,noted\.diagErrors\)/.test(appSrc));
  assert.ok(/showPathFb\('error',diffLine\+\(why\.length/.test(appSrc)&&/studentCopy\(chainBody\)/.test(appSrc),'order: diff line, badge, chain body');
}
ok('QA #1 path error block: one «Ты написала» line; badge from error_key (harmony → «Твёрдый / мягкий ряд»), never the generic verb_form');

// Q5-13 fallback guard.
{
  const H=require('./homework.js'),L42H=require('./lesson42-homework.js');
  const verbsOnly=L42H.VERBS.map(v=>v[0]).filter(k=>!['ойлау','ойнау','сену','күту','айту'].includes(k));
  assert.equal(L42H.VERBS.length,29);
  const legacyQs=L42H.VERBS.flatMap(([kk,ru])=>[{id:'l42v-'+kk+'-ru',lessonId:'4-2',topic:'vocab',title:'Переведи на русский',stimulus:kk,fields:[{answers:[ru]}]},{id:'l42v-'+kk+'-kk',lessonId:'4-2',topic:'vocab',title:'Переведи на казахский',stimulus:ru,fields:[{answers:[kk]}]}]);
  const all=[...rt.COURSE.questions,...legacyQs];
  const pack=H.buildPack('4-2',all,{lessons:[]},{events:[]});
  assert.deepEqual(plain(pack.homework.word_ids),T13,'Q5-13: fallback word_ids = T13, not the 29 verbs');
  const lem=q=>Core.normalize(/казахск/i.test(q.title)?q.fields[0].answers[0]:q.stimulus);
  const qs=pack.homework.word_question_ids.map(id=>all.find(q=>q.id===id));
  assert.ok(qs.length>0);
  assert.ok(qs.every(q=>!verbsOnly.includes(lem(q))),'Q5-13: a 29-verb-only lemma entered the 4-2 words');
  assert.ok(hw42.word_question_ids.every(id=>pack.homework.word_question_ids.includes(id)),'fallback covers the V2 T13 cards');
  assert.ok(!JSON.stringify(pack.homework.word_ids).includes('word:сөйлеу'));
  // Browser route without the V2 source: no mandatory words at all, never the 29 verbs.
  const win={TrainerCore:Core,Lesson42Homework:L42H,LessonPackageSchema:require('./package-schema.js'),Lesson42Pack:{byId:()=>null}};
  vm.runInNewContext(read('homework.js'),{window:win,console});
  const bare=win.Homework.buildPack('4-2',legacyQs,{lessons:[]},{events:[]});
  assert.deepEqual(plain(bare.homework.word_ids),[]);assert.deepEqual(plain(bare.homework.word_question_ids),[]);
  const win2={...win,LESSON_V2_COMPILED:compiled};vm.runInNewContext(read('homework.js'),{window:win2,console});
  const withV2=win2.Homework.buildPack('4-2',legacyQs,{lessons:[]},{events:[]});
  assert.deepEqual(plain(withV2.homework.word_ids),T13);
  assert.ok(withV2.homework.word_question_ids.every(id=>!verbsOnly.some(v=>id==='l42v-'+v+'-ru'||id==='l42v-'+v+'-kk')));
  // the generic route (no Lesson42Homework) also never uses WORD_LEMMAS['4-2'] (29 verbs).
  const win3={TrainerCore:Core,LessonPackageSchema:require('./package-schema.js'),LESSON_V2_COMPILED:compiled};vm.runInNewContext(read('homework.js'),{window:win3,console});
  const gen=win3.Homework.buildPack('4-2',legacyQs,{lessons:[]},{events:[]});
  if(gen){assert.deepEqual(plain(gen.homework.word_ids),T13);assert.ok(gen.homework.word_question_ids.every(id=>!verbsOnly.some(v=>id.startsWith('l42v-'+v+'-'))));}
}
ok('Q5-13 fallback Homework.buildPack never uses the 29-verb list as the 4-2 norm (node, browser, no-V2 and generic routes)');

// Q5-09 legacy aggregate not converted; Q5-14 origin separation (bank content itself is step 2b).
{
  const raw=JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json'));
  const m=P.migrate(raw,1791270000000);
  assert.equal(m.homeworkAttempts['4-2'].checklist.words,true);
  const fsq=E.formStatus(m,QAL);assert.equal(fsq.full_credit,false);assert.equal(fsq.legacy_status,'insufficient_evidence');
  assert.ok(/function evidenceOrigin\(homeworkMode,voluntary\)\{return homeworkMode\?'homework'/.test(appSrc));
  const exIds=new Set(L42.homework.exercise_ids);
  assert.ok(rt.COURSE.questions.filter(q=>q.origin==='bank').every(q=>!exIds.has(q.id)),'Q5-14: no bank-ID equals a homework exercise id');
}
ok('Q5-09 old checklist.words kept as a fact (insufficient evidence, not 4/4); Q5-14 homework vs bank origin kept apart');

// ST-08/ST-10: step-2 data does not change migrate/merge of old progress.
{
  const raw=JSON.parse(read('qa/fixtures/progress-r7/schema7-lesson-4-2-homework.json'));
  const m1=P.migrate(raw,1791270000000),m2=P.migrate(JSON.parse(P.serialize(m1)),1791270000000+86400000);
  assert.deepEqual(plain(m2.evidence),plain(m1.evidence));assert.equal(m2.events.length,m1.events.length);
  const merged=P.merge(m1,m2);assert.deepEqual(plain(merged.evidence.forms),plain(m1.evidence.forms));
}
ok('ST-08/ST-10 migration stays idempotent and merge keeps evidence after the T13 data change');

// ST-11: homework word credit does not complete a lesson.
{
  const s=P.empty();const q=Q.get('v2-4-2-vocab-qalaisyn-kk-form-1');
  E.observe(s,{q,answers:['қалайсың'],result:{correct:true,parts:[true]},event:{id:'x1',at:1},responseModes:['typed'],origin:'homework'});
  assert.ok(!s.courseProgress||!s.courseProgress.lessons||!s.courseProgress.lessons['4-1']||!s.courseProgress.lessons['4-1'].completed);
  assert.ok(!(s.courseProgress&&s.courseProgress.lessons&&s.courseProgress.lessons['4-2']&&s.courseProgress.lessons['4-2'].completed));
}
ok('ST-11 a word/form credit writes evidence only; it does not complete 4-1 or 4-2');

// H-01/H-05/H-06/H-08.
{
  const L33=read('lessons/3-3/lesson.json');
  assert.ok(L33.includes('досыңмын'),'H-01 Q4=A: досыңмын stays');
  assert.ok(L33.includes('Мен сіздің мұғаліміңіз емеспін'),'H-01 OPEN-NORM-1=A');
  assert.ok(!read('lessons/3-3/corrections.json').includes('corr:3-3:L-01'),'H-01: no corr:3-3:L-01');
  const all=read('compiled-lessons-v2.js');
  assert.ok(!/(оқу|есту|қою|сүю)[^"]{0,40}не исключени/i.test(all)&&!/L-07/.test(all),'H-06: L-07 is not mounted');
  // r7 2T-a: stress marks removed from 1-2, 2-1, 2-2 (owner decision). Remaining: 3-2 (2) + 3-3 (5) = 7 for 2T-b.
  assert.equal((all.match(/\u0301/g)||[]).length,7,'H-08: 2T-a removed 1-2/2-1/2-2 marks; 3-2/3-3 kept for 2T-b');
  assert.equal((read('lessons/1-2/lesson.json').match(/\u0301/g)||[]).length,0);
  assert.equal((read('lessons/2-1/lesson.json').match(/\u0301/g)||[]).length,0);
  assert.equal((read('lessons/2-2/lesson.json').match(/\u0301/g)||[]).length,0);
  assert.equal((read('lessons/4-2/lesson.json').match(/\u0301/g)||[]).length,0);
  const plan=read('docs/r7/R7_STEP2.md');assert.ok(/Q1–Q3[^\n]*открыт/.test(plan),'H-05: Q1–Q3 stay open in the plan');
}
ok('H-01/05/06/08 Q4=A + OPEN-NORM-1=A data kept, no L-01 correction, L-07 not mounted, stress marks untouched, Q1–Q3 open');

// Hub track wiring (behaviour itself is covered by the headless smoke).
{
  const ls=read('learning.js');
  assert.ok(/api\.homeworkWordsTrack\(lessonId\)/.test(ls)&&/l\.id==='vocab-must'\?hw:l/.test(ls));
  assert.ok(/homeworkWordsTrack,/.test(appSrc)&&/id==='vocab-must'\|\|String\(id\)\.startsWith\(HW_WORDS_PREFIX\)/.test(appSrc));
  const t=grab('homeworkWordsTrack');assert.ok(/word_question_ids/.test(t)&&/title:'Слова, которые задали выучить'/.test(t));
}
ok('lesson hub: «Слова, которые задали выучить» is the lesson homework words track (replaces global vocab-must there)');

console.log('r7 step 2a homework/T13 checks passed: '+passed);
