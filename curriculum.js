/* Reviewed content registry. Adding a lesson is explicit; Drive is not auto-ingested. */
(function(){
 'use strict';
 const c=window.COURSE,core=window.TrainerCore,words=[],rules=[
   {id:'harmony',title:'Гармония гласных',lesson_first_seen:'1-1'},
   {id:'plural-l',title:'Окончания -лар / -лер',lesson_first_seen:'1-2'},
   {id:'plural-d',title:'Окончания -дар / -дер',lesson_first_seen:'1-2'},
   {id:'plural-t',title:'Окончания -тар / -тер',lesson_first_seen:'1-2'},
   {id:'quantity',title:'Количество перед существительным',lesson_first_seen:'1-2'},
   {id:'numbers',title:'Числительные по частям',lesson_first_seen:'1-2'}
 ];
 function addWord(k,translation,lesson,category='target',aliases=[],examples=[]){
   const id='word:'+core.normalize(k);let existing=words.find(w=>w.id===id);if(existing){if(category==='target'){existing.target_or_context='target';existing.target_lesson=lesson;}return existing;}
   const w={id,kazakh:k.toLowerCase(),translation:Array.isArray(translation)?translation:[translation],lesson_first_seen:lesson,target_lesson:category==='target'?lesson:null,target_or_context:category,aliases:[k,...aliases].map(x=>core.normalize(x)),examples,card_ids:[]};words.push(w);return w;
 }
 for(const [k,r] of c.vocabulary)addWord(k,r,'1-1');
 for(const [k,r] of c.numbers)addWord(k,r,'1-2','target',k.split(' / '));
 for(const a of window.LEARNING.analyses){const w=words.find(w=>w.aliases.includes(a.word));if(w){w.aliases.push(a.plural);w.examples.push({kazakh:a.plural,translation:'форма множественного числа',level:'phrase'});}}
 for(const q of c.questions)if(q.translation&&/^[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+$/.test(q.stimulus))addWord(q.stimulus,q.translation,q.source.includes('1')?'1-1':'1-2','context');
 addWord('бұл','это','1-2','context');
 addWord('менде','у меня (готовая конструкция)','1-2','context');addWord('бар','есть / имеется','1-2','context');
 const lessonCatalog=[
   {id:'1-1',title:'Урок 1–1 · звуки и первые слова',active:true,depends_on:[],rules:['harmony']},
   {id:'1-2',title:'Урок 1–2 · окончания и числа',active:true,depends_on:['1-1'],rules:['plural-l','plural-d','plural-t','quantity','numbers']},
   {id:'1-3',title:'Урок 1–3 · материалы получены',active:false,status:'needs-key-review',depends_on:['1-2'],rules:[],note:'Материалы найдены на Диске. В ключах есть расхождения; в обязательную практику пока не добавлены.',sources:[
     'https://drive.google.com/file/d/1aRI_-yJlZNU-HIzat11Z5pT2NXNTGmI8/view',
     'https://drive.google.com/file/d/1uMjHivX6bb25chBRCK12eYr--aDqR7W0/view',
     'https://drive.google.com/file/d/1HwRDYC7mpcoplaDJIKnoBb6MJd2mbPUX/view']}
 ];
 for(const pack of window.LESSON_PACKS||[]){
   if(window.Canonical){window.Canonical.applyAll(pack.original_exercises||[]);window.Canonical.applyAll(pack.generated_exercises||[]);}
   Object.assign(c.sources,pack.sources||{});
   for(const w of pack.target_vocabulary||[])addWord(w.kazakh,w.translation,pack.lesson_id,'target');
   for(const r of pack.rules||[])if(!rules.some(x=>x.id===r.id))rules.push({...r,lesson_first_seen:pack.lesson_id});
   const meta=lessonCatalog.find(x=>x.id===pack.lesson_id)||{};
   Object.assign(meta,{id:pack.lesson_id,title:pack.lesson_title,active:true,status:'reviewed-with-notes',depends_on:pack.dependencies,rules:pack.rules.map(r=>r.id),note:'Исходники сохранены. Расхождения с ключами отмечены в заданиях.'});
   if(!lessonCatalog.includes(meta))lessonCatalog.push(meta);
   for(const q of [...pack.original_exercises,...pack.generated_exercises])if(!c.questions.some(x=>x.id===q.id))c.questions.push(q);
   const sectionMap={
     '1-3':[
       ['words','Новые слова 1–3','vocab',q=>q.source==='hw3','Сначала пойми слово, затем вспомни его в обе стороны. Местоимения здесь — словарь; новые грамматические окончания не вводятся.'],
       ['quantity','Количество: окончание не нужно','plural',q=>q.topic==='plural','С числом, көп, аз, қанша и неше окончание множественного числа не добавляем. Сравни: кітаптар — книги; екі кітап — две книги.'],
       ['numbers','Большие числа из урока 1–3','numbers',q=>q.topic==='numbers'&&!q.skillBindings?.some(b=>b.item_id==='rule:phone-groups'),'Это уже после обычных сотен и тысяч. 21 760 = жиырма бір мың жеті жүз алпыс. Сначала лестница: цифры → двузначные → трёхзначные.'],
       ['phone','Телефонные номера — в самом конце','numbers',q=>q.skillBindings?.some(b=>b.item_id==='rule:phone-groups'),'Только когда цифры, двузначные, трёхзначные и тысячи уже идут. Телефон делим на группы после +7. Для 022 — нөл жиырма екі.']
     ],
     '2-1':[
       ['endings','Мен, сен, сіз','person',q=>q.group==='form','К слову добавляем окончание: мен пың/бын/мын, сен сың/сің, сіз сыз/сіз. Ударение на основу.'],
       ['sent','Я / ты / вы такой-то','person',q=>q.group==='sent','Можно без местоимения: адаммын уже значит «я человек».'],
       ['neg','Отрицание емес','person',q=>q.group==='neg','Основа + емес + окончание. Мен заңгер емеспін, не заңгермін емес.'],
       ['ask','Вопрос ба / бе','person',q=>q.group==='ask','В этом уроке только ба/бе после Н, Ң, З. Без частицы вопрос неправильный.'],
       ['fix','Найди ошибку','person',q=>q.group==='fix','Если уже верно — перепиши как есть.']
     ],
     '2-3':[
       ['words','Слова домашки 2–3','vocab',q=>q.source==='hw23','Семья и быт — выучить звучание. Менің/бар/жоқ пока слова, не правило принадлежности.'],
       ['endings','Ол / олар и все лица','person',q=>q.group==='form','Ол и олар без бирки. Остальные лица — как в 2-1 и 2-2.'],
       ['ol','Они / он без мын','person',q=>q.group==='ol','Не *ол мұғаліммін. Множественное после олар — только если задание просит.'],
       ['ask','Полный вопрос па/ба/ма','person',q=>q.group==='ask','Частица смотрит на последнюю букву последнего слова. Ол қонақ па?'],
       ['ord','Порядковые','numbers',q=>q.group==='ord','Наклейка только на последнее слово. Жиырмасыншы, қырқыншы.'],
       ['num','Числа словами','numbers',q=>q.group==='num','Сборка разрядов. Мың не выкидывать.'],
       ['fix','Найди ошибку','person',q=>q.group==='fix','Дыры ключей помечены в объяснении.']
     ],
     '2-2':[
       ['words','Новые слова 2–2','vocab',q=>q.source==='hw22','Слова домашки и методички 2–2 в обе стороны. Для сәлем / сау бол смотри, к кому обращаешься.'],
       ['endings','Біз, сендер, сіздер','person',q=>q.group==='form','К слову добавляем личное окончание. С сендер и сіздер множественное -лар не ставим: сендер студентсіңдер, не студенттерсіңдер.'],
       ['sent','Переведи «мы / вы такие-то»','person',q=>q.group==='sent','Пиши местоимение и форму. Русское «вы» без пометки недостаточно: в задании уже сказано сендер, сіз или сіздер.'],
       ['neg','Отрицание емес','person',q=>q.group==='neg','Отрицание: основа + емес + окончание. Сараңмын → сараң емеспін. Не сараңмын емес.'],
       ['ask','Вопрос ба / бе и ма / ме','person',q=>q.group==='ask','После Н, Ң, З — ба/бе. После Р (сыңдар, сіздер) — ма/ме. Гласная частицы следует гармонии.'],
       ['fix','Найди ошибку','person',q=>q.group==='fix','Если предложение уже верное, перепиши его как есть. Исправление пиши целиком.']
     ],
     'bank':[
       ['used','Слова из материалов','vocab',q=>q.source==='bank','Это не список «выучить», а все остальные казахские слова, которые встречались в методичках и упражнениях. Сначала пойми, потом напиши в обе стороны.']
     ]
   };
   const sections=sectionMap[pack.lesson_id]||[];
   for(const [key,title,topic,match,intro] of sections){const qs=pack.original_exercises.filter(match);if(!qs.length)continue;const chunks=[];
     for(let i=0;i<qs.length;i+=4){
       const group=qs.slice(i,i+4);if(group.length===1&&i)group.unshift(qs[i-1]);
       const seen=new Set(),items=[];
       for(const q of group){
         if(!q.fields?.length)continue;
         const toKk=/на казахский|по-казахски|на казахском/i.test(q.title);
         const kk=toKk?q.fields[0].answers[0]:q.stimulus,ru=toKk?q.stimulus:q.fields[0].answers[0],keyWord=core.normalize(kk||q.id);
         if(seen.has(keyWord))continue;seen.add(keyWord);
         items.push({front:kk||q.stimulus,back:ru||q.fields.map(f=>f.answers[0]).join(' · '),cue:q.note||q.explanation||''});
       }
       chunks.push({title:title+' · '+(Math.floor(i/4)+1),explanation:intro,items:items.length?items:group.slice(0,2).map(q=>({front:q.stimulus,back:q.fields.map(f=>f.answers[0]).join(' · '),cue:q.note||''})),questionIds:group.map(q=>q.id),associationKey:'lesson:school-'+pack.lesson_id+'-'+key});
     }
     window.LEARNING.lessons.push({id:'school-'+pack.lesson_id+'-'+key,title,topic,courseLesson:pack.lesson_id,intro,items:[],questionIds:qs.map(q=>q.id),chunks});
   }
 }
 const examples=[
   {id:'context-books',kazakh:'Бұл екі кітап.',translation:'Это две книги.',target:['екі','кітап'],answer:'екі',prompt:'Бұл ___ кітап.',rule:'quantity'},
   {id:'context-books-five',kazakh:'Бұл бес кітап.',translation:'Это пять книг.',target:['бес','кітап'],answer:'кітап',prompt:'Бұл бес ___.',rule:'quantity'},
   {id:'context-words',kazakh:'Бұл үш сөз.',translation:'Это три слова.',target:['үш','сөз'],answer:'үш',prompt:'Бұл ___ сөз.',rule:'quantity'}
 ];
 for(const ex of examples){
   c.questions.push({id:ex.id,source:'plus',group:ex.id,part:'1',topic:'plural',kind:'fields',title:'Заполни пропуск знакомым словом',stimulus:ex.prompt,translation:ex.translation,
     fields:[{label:'Только пропущенное слово',answers:[ex.answer],kind:'text'}],explanation:ex.kazakh+' Количество уже указано: существительное без множественного окончания.',
     phase:'Применить в предложении',contextGloss:[{word:'Бұл',translation:'это'}],
     prerequisites:ex.target.map(w=>'word:'+w),contextOnly:true,ruleIds:['quantity']});
   for(const word of ex.target){const w=words.find(w=>w.id==='word:'+word);if(w)w.examples.push({kazakh:ex.kazakh,translation:ex.translation,level:'sentence'});}
 }
 const tokens=s=>core.normalize(s).match(/[а-яёәғқңөұүһі]+|\d+/gu)||[];
 for(const q of c.questions){
   q.lessonId=q.lessonId||(q.source==='m1'||q.source==='e1'||q.source==='hw1'||q.topic==='sounds'||q.topic==='vocab'?'1-1':'1-2');
   const text=[q.stimulus,...(q.fields||[]).flatMap(f=>f.answers),...(q.correct||[])].join(' '),parts=new Set(tokens(text));
   q.vocabIds=words.filter(w=>w.aliases.some(a=>a.includes(' ')?core.normalize(text).includes(a):parts.has(a))).map(w=>w.id);
   if(q.source==='hw2'){const w=words[c.vocabulary.length+Number(q.group)-1];if(w&&!q.vocabIds.includes(w.id))q.vocabIds.push(w.id);}
   q.ruleIds=q.ruleIds|| (q.topic==='sounds'?['harmony']:q.topic==='numbers'?['numbers']:q.topic==='plural'?['plural-l','plural-d','plural-t']:[]);
   if(q.id.includes('quantity'))q.ruleIds=['quantity'];
   const form=q.fields?.[0]?.answers?.[0]?.toLowerCase()||'';
   if(q.topic==='plural'&&!q.id.includes('quantity')&&!q.contextOnly){const suffix=form.slice(-3),key={лар:'plural-l',лер:'plural-l',дар:'plural-d',дер:'plural-d',тар:'plural-t',тер:'plural-t'}[suffix];if(key)q.ruleIds=[key];}
   q.associationKeys=[...q.vocabIds,...q.ruleIds.map(r=>'rule:'+r),'card:'+q.id];
   const suffixes=[...new Set((q.fields||[]).flatMap(f=>f.answers).map(a=>a.toLowerCase().slice(-3)).filter(s=>['лар','лер','дар','дер','тар','тер'].includes(s)))];q.associationKeys.push(...suffixes.map(s=>'ending:'+s));
   for(const id of q.vocabIds){const w=words.find(w=>w.id===id);if(w)w.card_ids.push(q.id);}
 }
 const stable=r=>['FAMILIAR','REMEMBERED','MASTERED'].includes(r?.mastery_level);
 function known(w,state){return !!w&&['recognition','production','digit_to_word','word_to_digit'].some(type=>stable(state.skills?.[w.id+'::'+type]));}
 function missingPrerequisites(q,state){return !q.contextOnly?[]:(q.prerequisites||[]).filter(id=>!['production','digit_to_word'].some(type=>stable(state.skills?.[id+'::'+type])));}
 function eligible(q,state){return missingPrerequisites(q,state).length===0;}
 function wordStats(w,state){
   const rows=w.card_ids.map(id=>state.records[id]).filter(Boolean),rank=['NEW','LEARNING','FAMILIAR','REMEMBERED','MASTERED'];
   const recallRows=w.card_ids.filter(id=>{const q=c.questions.find(q=>q.id===id);return q?.kind==='fields'&&q.fields.some(f=>f.kind!=='select');}).map(id=>state.records[id]).filter(Boolean);
   const primary=w.card_ids.filter(id=>id.startsWith('hw')||id.startsWith('promoted-'));
   let best=primary.length?Math.min(...primary.map(id=>rank.indexOf(state.records[id]?.mastery_level||'NEW'))):recallRows.reduce((a,r)=>Math.max(a,rank.indexOf(r.mastery_level)),0);
   if(best===0&&rows.some(r=>r.seen>0))best=1;
   const current=window.LEARNING.lessons.find(l=>l.id===state.learning.lessonId)?.courseLesson||'1-1';
   const role=state.vocabulary[w.id]?.target_or_context||w.target_or_context;
   const status=role==='context'?'CONTEXT':(w.target_lesson||w.lesson_first_seen)<current&&known(w,state)?'KNOWN':'TARGET';
   const skills=window.Knowledge?.wordSkills(w,state)||[],production=skills.find(x=>['production','digit_to_word'].includes(x.type))?.record;
   best=production?Math.max(0,rank.indexOf(production.mastery_level)):skills.some(x=>x.record?.review_count)?1:0;
   if(best===4&&skills.some(x=>x.type==='context')&&!skills.find(x=>x.type==='context')?.record?.correct_streak)best=3;
   return {vocabulary_status:status,last_seen_lesson:state.vocabulary[w.id]?.last_seen_lesson||null,times_seen:state.vocabulary[w.id]?.times_seen||rows.reduce((n,r)=>n+r.seen,0),mastery:rank[best],wrong:rows.reduce((a,r)=>a+r.wrong_count,0),weak:skills.length?skills.some(s=>s.record?.needsReview):rows.some(r=>r.needsReview),target_or_context:state.vocabulary[w.id]?.target_or_context||w.target_or_context,association:state.associations[w.id]?.text||''};
 }
 function compareLesson(draft){
   const existingWords=new Set(words.map(w=>core.normalize(w.kazakh))),existingRules=new Set(rules.map(r=>r.id));
   return {newWords:(draft.vocabulary||[]).filter(w=>!existingWords.has(core.normalize(w.kazakh))),knownWords:(draft.vocabulary||[]).filter(w=>existingWords.has(core.normalize(w.kazakh))),newRules:(draft.rules||[]).filter(r=>!existingRules.has(r.id)),knownRules:(draft.rules||[]).filter(r=>existingRules.has(r.id))};
 }
 function activatePromotions(state){
   for(const w of words)if(w.target_or_context==='context'&&state.vocabulary[w.id]?.target_or_context==='target')for(const direction of ['kk','ru']){
     const id='promoted-'+w.id+'-'+direction;if(c.questions.some(q=>q.id===id))continue;
     const q={id,source:'plus',group:'словарь',part:'1',topic:'vocab',kind:'fields',title:direction==='kk'?'Переведи на казахский':'Переведи на русский',stimulus:direction==='kk'?w.translation[0]:w.kazakh,
       fields:[{label:'Ответ',kind:'text',answers:direction==='kk'?[w.kazakh]:w.translation}],explanation:w.kazakh+' — '+w.translation.join(' / '),phase:'Вспомнить',lessonId:w.lesson_first_seen,vocabIds:[w.id],ruleIds:[],associationKeys:[w.id,'card:'+id],promotedWord:w.id};
     c.questions.push(q);w.card_ids.push(id);
   }
 }
 if(window.Canonical)window.Canonical.applyAll(c.questions);
 window.CURRICULUM={words,rules,lessons:lessonCatalog,known,eligible,missingPrerequisites,wordStats,compareLesson,activatePromotions,examples,addWord};
})();
