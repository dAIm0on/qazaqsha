/* Homework sheets, weak spots, block error review. No FSRS weights. No BatylBol automation. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const schema=node?require('./package-schema.js'):root.LessonPackageSchema;
 const core=node?require('./core.js'):root.TrainerCore;
 const phase2b=node?require('./phase2b-practice.js'):root.Phase2BPractice;
 const lesson31Homework=node?require('./lesson31-homework.js'):root.Lesson31Homework;
 const explainNode=node?require('./explain-bank.js'):null;
 function explainBank(){return explainNode||root.ExplainBank||null;}
 const DAY=86400000;
 const RULES={
   harmony:'Для окончания смотри последний слог, не первое впечатление от слова.\nЗадний ряд А О Ұ Ы → в окончании гласная А.\nПередний ряд Ә Ө Ү І Е → в окончании гласная Е.\nПары курса: Ә—А, Ө—О, І—Ы, Ү—Ұ, К—Қ, Г—Ғ.\nИ и У сами по себе ряд не задают: смотри слово целиком.',
   plural:'Два шага, не шесть отдельных окончаний.\n1. Последний слог → А или Е.\n2. Последняя буква → начало окончания.\nГласные, Р, Й, У → лар / лер.\nЛ, М, Н, Ң, Ж, З → дар / дер.\nГлухие и Б, В, Г, Д → тар / тер.',
   quantity:'После числительного множественное окончание не ставится.\nТо же после аз, көп, қанша, неше.\nКоличество уже сказано числом или словом количества.\nБез числа окончание нужно: это другой случай.',
   numbers:'Составное число — сборка разрядов, не новое слово.\nСначала большая часть, потом меньшая. Между частями пробел, без «и».\n0–10 и круглые десятки — отдельные слова.\n100 = жүз. 1001–1999 начинай с бір мың.',
   contrast:'Единица и десяток одной семьи различаются окончанием, не началом.\n6 алты — 60 алпыс.\n7 жеті — 70 жетпіс.\n8 сегіз — 80 сексен.\n9 тоғыз — 90 тоқсан.',
   'phone-groups':'Телефон читаем группами после +7, не одной длинной лентой.\nНоль в группе — нөл, затем уже знакомые разряды.\nСначала цифры и сотни, потом номер.',
   person:'Мен: пың / бын / мын — по последнему звуку основы.\nСен: сың / сің. Сіз: сыз / сіз.\nГласная окончания следует гармонии основы.\nФорма уже показывает лицо: местоимение можно не писать.\nУдарение на основу, не на окончание.',
   'person-pl':'Біз: пыз / быз / мыз. После м, н, ң — быз / біз.\nСендер: сыңдар / сіңдер. Сіздер: сыздар / сіздер.\nС сендер и сіздер множественное -лар на основу не ставим.\nС біз в упражнениях пишем без -лар на основу.',
   emes_ba:'Отрицание: основа + емес + окончание. Не наоборот.\nВопрос после н, ң, з — ба / бе.\nПосле р (сыңдар, сіздер) — ма / ме.\nГласная частицы — по гармонии последнего слога.\nБез частицы вопрос неправильный.',
   ol:'Ол и олар бирки мын/сың/сыз не берут.\nОл мұғалім. Не *ол мұғаліммін.\nПосле олар множественное на слове — только если задание просит.\nемес множественного не получает.',
   ordinal:'Сначала собери обычное число. Потом наклейка только на последнее слово.\nНа согласную — ыншы/інші. На гласную — ншы/нші.\nЖиырмасыншы, не жиырманшы. Қырқыншы, не қырықыншы.',
   question:'Частица смотрит на последнюю букву последнего слова, не на ол.\nГлухие → па/пе. М Н Ң Ж З → ба/бе. Иначе ма/ме.\nОл қонақ па? Мен сараңмын ба?'
 };
 const EXTERNAL={
   '1-1':'https://batylbol.kz/test/Zvuki.html',
   '1-2':'https://batylbol.kz/test/MnozhChislo.html',
   '1-3':'https://batylbol.kz/test/Chislitielniye.html',
   '2-1':'https://batylbol.kz/test/LichnyeEdChislo.html',
   '2-2':'https://batylbol.kz/test/LichnyeLitso1-2.html',
   '2-3':['https://batylbol.kz/test/Lichnye.html','https://batylbol.kz/test/VoprositelnyeChastitsy.html'],
   '3-1':'https://batylbol.kz/test/PrityazhEdChislo.html'
 };
 const EXTRAS={'1-1':['keyboard','cheat'],'1-2':['keyboard'],'1-3':[],'2-1':[],'2-2':[],'2-3':[],'3-1':[]};
 const WORD_LEMMAS={
   '1-1':['адам','қыз','ұл','жігіт','кітап','жер','су','ту','сөз','қала','көше'],
   '1-2':['нөл','бір','екі','үш','төрт','бес','алты','жеті','сегіз','тоғыз','он','жиырма','отыз','қырық','елу','алпыс','жетпіс','сексен','тоқсан','жүз','мың','аз','көп','қанша'],
   '1-3':['дос','құрбы','мұғалім','ғалым','дәрігер','заңгер','оқушы','студент','мен','біз','сен','сендер','сіз','сіздер','ол','олар','иә','жоқ','емес'],
   '2-1':['әдемі','сұлу','ақылды','жомарт','сараң','бай','кедей','жас','зейнеткер','есепші','жұмыссыз','жұмысшы','бастық','жолсерік','ақын','жазушы','жүргізуші','кәсіпкер','оқырман','аспаз','сәлем','сәлеметсіз бе','сәлеметсіздер ме','ассалаумағалейкум','уағалейкумассалам'],
   '2-2':['көрші','әріптес','жау','қонақ','туыс','маман','таныс','қазақ','орыс','семіз','сау бол','сау болыңдар','сау болыңыз','сау болыңыздар'],
   '2-3':['бала','әке','ана','әже','апа','ата','тәте','аға','іні','әпке','қарындас','сіңлі','егіз','жұмыс','мамандық','ат','мектеп','көлік','пәтер','қалам','ми','аю','менің','сенің','сіздің','оның','бар','жоқ'],
   '3-1':['бас','қол','көз','тіл','қалам','көйлек','жақсы','жаман','біздің','сендердің','сіздердің','олардың','жүрек','сақал','мысық','таз','тақырбас','қатты','саусақ','кім','не','қандай','қай','нешінші','бұл']
 };
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function bySource(questions,source){return (questions||[]).filter(q=>q&&q.source===source&&q.id);}
 function wordId(lemma){return 'word:'+(core?core.normalize(lemma):String(lemma).toLowerCase());}
 function inferRule(q){
   if(!q)return '';
   const ids=q.ruleIds||[];
   if(ids.includes('quantity')||q.topic==='plural'&&/после (числ|количеств)|без окончания|\bкөп\b|\bаз\b|\bқанша\b|\bнеше\b/i.test((q.title||'')+' '+(q.explanation||'')))return 'quantity';
   if((q.skillBindings||[]).some(b=>b.item_id==='rule:phone-groups')||ids.includes('phone-groups'))return 'phone-groups';
   const n=Number(q.stimulus);
   if((q.topic==='numbers'||ids.includes('numbers'))&&[6,60,7,70,8,80,9,90].includes(n))return 'contrast';
   if(q.topic==='numbers'||ids.includes('numbers')||ids.includes('number-composition'))return 'numbers';
   if(q.topic==='sounds'||ids.includes('harmony'))return 'harmony';
   if(q.topic==='plural')return 'plural';
   if(ids.includes('ordinal')||q.group==='ord')return 'ordinal';
   if(ids.includes('ol-zero')||q.group==='ol')return 'ol';
   if(ids.includes('person-q')||q.group==='ask'||q.group==='qa')return 'question';
   if(ids.includes('person-neg')||q.group==='neg')return 'emes_ba';
   if(ids.some(id=>['person-biz','person-sender','person-sizder'].includes(id))||q.lessonId==='2-2'&&q.topic==='person'&&q.group==='form')return 'person-pl';
   if(q.topic==='person'||ids.includes('person-sg'))return 'person';
   return '';
 }
 function canonicalRuleId(q){
   if(!q||!q.phase2b)return '';
   const bank=explainBank(),ids=q.ruleIds||[];
   const type=String(q.phase2b.error_type||'');
   const preferred=/question/.test(type)?'T10_QUESTION':/emes/.test(type)?'T7_EMES':/plural_after_numeral/.test(type)?'T4_NO_PLURAL_AFTER_NUMBER':'';
   if(preferred&&ids.includes(preferred)&&bank&&bank.byId&&bank.byId(preferred))return preferred;
   return ids.find(id=>bank&&bank.byId&&bank.byId(id))||'';
 }
 function cleanRuleText(text,q){
   const answers=((q&&q.fields)||[]).flatMap(f=>f.answers||[]).concat(q&&q.stimulus?[q.stimulus]:[]).map(a=>String(a).trim()).filter(a=>a.length>2);
   return String(text||'').split('\n').filter(line=>!answers.some(a=>line.includes(a))).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 }
 function ruleText(q,ruleId){
   const id=ruleId||canonicalRuleId(q)||inferRule(q);
   const bank=explainBank(),card=bank&&bank.byId&&bank.byId(id);
   if(card)return cleanRuleText(card.medium||card.short||card.ru_refresh||'',q);
   if(!id||!RULES[id])return '';
   return cleanRuleText(RULES[id],q);
 }
 function ruleId(q){
   const canonical=canonicalRuleId(q);
   if(canonical)return canonical;
   const id=inferRule(q);return RULES[id]?id:'';
 }
 function missingRules(questions){
   const miss=new Set();
   for(const q of questions||[]){
     const id=inferRule(q);
     if(id&&!RULES[id])miss.add(id);
   }
   return [...miss];
 }
 function orderedWords(list){
   const ru=list.filter(q=>/-ru$/.test(q.id)).sort((a,b)=>a.id.localeCompare(b.id,'ru'));
   const kk=list.filter(q=>/-kk$/.test(q.id)&&!/-rev$/.test(q.id)).sort((a,b)=>a.id.localeCompare(b.id,'ru'));
   return [...ru,...kk].filter(q=>!/-rev$/.test(q.id));
 }
 function methodSource(lessonId,course){
   const key={ '1-1':'m1','1-2':'m2','1-3':'m3','2-1':'m21','2-2':'m22','2-3':'m23','3-1':'m31' }[lessonId];
   const s=course&&course.sources&&course.sources[key];
   return s?{title:s.title,url:s.url}:{title:'Методичка '+lessonId,url:''};
 }
 function vocabLemma(q){
   if(!q||q.topic!=='vocab')return '';
   if(/казахск/i.test(q.title||''))return core.normalize((q.fields&&q.fields[0]&&q.fields[0].answers&&q.fields[0].answers[0])||'');
   return core.normalize(q.stimulus||'');
 }
 function wordsForLesson(questions,lessonId){
   const hwSource={ '1-1':'hw1','1-2':'hw2','1-3':'hw3','2-3':'hw23' }[lessonId];
   if(hwSource)return orderedWords(bySource(questions,hwSource));
   const lemmas=new Set((WORD_LEMMAS[lessonId]||[]).map(w=>core.normalize(w)));
   return orderedWords((questions||[]).filter(q=>lemmas.has(vocabLemma(q))));
 }
 function buildPack(lessonId,questions,course,opts={}){
   if(lessonId==='3-1'&&lesson31Homework){
     const spec=lesson31Homework.build({sessionGUnlocked:!!opts.sessionGUnlocked});
     const qById=new Map((questions||[]).map(q=>[q.id,q]));
     const target=new Set((spec.target_vocabulary||[]).map(w=>core.normalize(w.kazakh)));
     const words=orderedWords((questions||[]).filter(q=>q&&q.source==='hw31'&&target.has(vocabLemma(q))));
     const method=methodSource(lessonId,course);
     return {lesson_id:'3-1',homework:{title:spec.title,word_ids:(spec.target_vocabulary||[]).map(w=>w.id),exercise_ids:spec.item_ids.filter(id=>qById.has(id)),word_question_ids:words.map(q=>q.id),rule_map:{...spec.rule_map},external_test_url:spec.external_test_url,external_tests:[spec.external_test_url],checklist:['method','exercises','words','external_test'],extras:[],method_title:method.title,method_url:method.url}};
   }
   const exSource={ '1-1':'e1','1-2':'e2','1-3':'e3','2-1':'e21','2-2':'e22','2-3':'e23' }[lessonId];
   const original=bySource(questions,exSource);
   const qById=new Map((questions||[]).map(q=>[q.id,q]));
   const phaseIds=phase2b&&phase2b.homeworkIdsFor?phase2b.homeworkIdsFor(lessonId):[];
   const phaseExercises=phaseIds.map(id=>qById.get(id)).filter(Boolean);
   const exercises=[...original,...phaseExercises];
   const words=wordsForLesson(questions,lessonId);
   const all=[...exercises,...words];
   const rule_map=Object.create(null);
   for(const q of all){const r=ruleId(q);if(r)rule_map[q.id]=r;}
   const method=methodSource(lessonId,course);
   return {
     lesson_id:lessonId,
     homework:{
       title:'Домашка '+lessonId.replace('-','–'),
       word_ids:(WORD_LEMMAS[lessonId]||[]).map(wordId),
       exercise_ids:exercises.map(q=>q.id),
       word_question_ids:words.map(q=>q.id),
       rule_map,
       external_test_url:(Array.isArray(EXTERNAL[lessonId])?EXTERNAL[lessonId][0]:EXTERNAL[lessonId])||'',
       external_tests:Array.isArray(EXTERNAL[lessonId])?EXTERNAL[lessonId]:(EXTERNAL[lessonId]?[EXTERNAL[lessonId]]:[]),
       checklist:['method','exercises','words','external_test'],
       extras:EXTRAS[lessonId]||[],
       method_title:method.title,
       method_url:method.url
     }
   };
 }
 function packs(questions,course,opts={}){
   return ['1-1','1-2','1-3','2-1','2-2','2-3','3-1'].map(id=>buildPack(id,questions,course,opts)).filter(p=>p.homework.exercise_ids.length||p.homework.word_ids.length);
 }
 function validateHomework(raw,knownIds){
   return schema.validateHomework(raw,knownIds);
 }
 function emptyAttempt(lessonId,now=Date.now()){
   return {lessonId,started_at:now,items:[],rule_peeks:0,answer_peeks:0,submitted_at:null,export_rev:0,checklist:{method:false,exercises:false,words:false,external_test:false,keyboard:false,cheat:false},previous:[]};
 }
 function ensureAttempt(state,lessonId,now=Date.now()){
   state.homeworkAttempts=state.homeworkAttempts||Object.create(null);
   if(!state.homeworkAttempts[lessonId])state.homeworkAttempts[lessonId]=emptyAttempt(lessonId,now);
   return state.homeworkAttempts[lessonId];
 }
 function newAttempt(state,lessonId,now=Date.now()){
   const cur=ensureAttempt(state,lessonId,now);
   if(cur.items.length||cur.submitted_at){
     cur.previous=cur.previous||[];
     cur.previous.push({started_at:cur.started_at,items:cur.items,rule_peeks:cur.rule_peeks,answer_peeks:cur.answer_peeks,submitted_at:cur.submitted_at,export_rev:cur.export_rev,checklist:{...cur.checklist}});
   }
   const previous=cur.previous;
   Object.assign(cur,emptyAttempt(lessonId,now));
   cur.previous=previous;
   return cur;
 }
 function statusOf(item){
   if(!item||item.skipped)return 'пропуск';
   if(!item.correct)return 'ошибка';
   if(item.answer_peek)return 'с ответом';
   if(item.rule_peek)return 'с правилом';
   return 'сама';
 }
 function recordItem(state,lessonId,payload,now=Date.now()){
   const attempt=ensureAttempt(state,lessonId,now);
   const item={id:payload.id,answers:payload.answers||[],correct:!!payload.correct,rule_peek:!!payload.rule_peek,answer_peek:!!payload.answer_peek,skipped:!!payload.skipped,expected:payload.expected||'',at:now,status:''};
   item.status=statusOf(item);
   const idx=attempt.items.findIndex(x=>x.id===item.id);
   if(idx>=0)attempt.items[idx]=item;else attempt.items.push(item);
   if(item.rule_peek)attempt.rule_peeks++;
   if(item.answer_peek)attempt.answer_peeks++;
   attempt.cursor=item.id;
   return item;
 }
 function resumeIndex(ids,attempt){
   const list=ids||[];
   if(!list.length)return 0;
   const done=new Set((attempt&&attempt.items||[]).map(i=>i.id));
   const fromCursor=attempt&&attempt.cursor?list.indexOf(attempt.cursor):-1;
   if(fromCursor>=0&&fromCursor+1<list.length)return fromCursor+1;
   const firstOpen=list.findIndex(id=>!done.has(id));
   return firstOpen<0?0:firstOpen;
 }
 const HW_SECTION=20;
 function sliceSection(ids,section){
   const n=Math.max(0,Math.floor(Number(section)||0));
   return (ids||[]).slice(n*HW_SECTION,(n+1)*HW_SECTION);
 }
 function sectionCount(ids){return Math.max(1,Math.ceil((ids||[]).length/HW_SECTION));}
 function sectionOf(index){return Math.floor(Math.max(0,Number(index)||0)/HW_SECTION);}
 function partProgress(attempt,ids){
   const done=new Set((attempt&&attempt.items||[]).map(i=>i.id));
   const list=ids||[];
   return {done:list.filter(id=>done.has(id)).length,total:list.length};
 }
 function vocabDirections(wordQuestionIds){
   const ids=wordQuestionIds||[];
   const ru=ids.filter(id=>/-ru$/.test(id)),kk=ids.filter(id=>/-kk$/.test(id)&&!/-rev$/.test(id));
   const missing=[];
   for(const id of kk){
     const rec=id.replace(/-kk$/,'-ru');
     if(!ids.includes(rec))missing.push(id);
   }
   const firstRu=ids.findIndex(id=>/-ru$/.test(id)),firstKk=ids.findIndex(id=>/-kk$/.test(id)&&!/-rev$/.test(id));
   return {recognition:ru,production:kk,missing_recognition:missing,ru_before_kk:firstRu>=0&&firstKk>=0&&firstRu<firstKk};
 }
 const WEAK_LABELS={
   'rule:plural::ldt':'Множественное: Л/Д/Т',
   'rule:plural::harmony':'Множественное: А/Е',
   'rule:plural_after_num':'Множественное после числа',
   'rule:emes::position':'Емес: куда ставится личное окончание',
   'rule:person::sen_siz':'Сен / сіз',
   'rule:person::men':'Личное окончание',
   'rule:ordinal::exception_20':'Порядковое: 20-е',
   'rule:ordinal::suffix_family':'Порядковое окончание',
   'rule:ordinal::last_component':'Порядковое: наклейка на последний кусок',
   'rule:numeral::assemble':'Сборка числа',
   'confuse:алты_алпыс':'6 и 60',
   'confuse:сегіз_сексен':'8 и 80',
   'confuse:жеті_жетпіс':'7 и 70',
   'confuse:тоғыз_тоқсан':'9 и 90'
 };
 function weakLabel(key){
   if(WEAK_LABELS[key])return WEAK_LABELS[key];
   if(String(key).startsWith('word:')&&String(key).endsWith('::production'))return 'Слово: написать по-казахски';
   if(String(key).startsWith('word:')&&String(key).endsWith('::recognition'))return 'Слово: узнать перевод';
   return key;
 }
 function markChecklist(state,lessonId,key,value){
   const attempt=ensureAttempt(state,lessonId);
   if(key in attempt.checklist)attempt.checklist[key]=!!value;
   return attempt;
 }
 function sheetReady(attempt,pack){
   if(!attempt||!pack)return false;
   const need=new Set(pack.homework.exercise_ids.concat(pack.homework.word_question_ids||[]));
   const done=new Set((attempt.items||[]).map(i=>i.id));
   for(const id of need)if(!done.has(id))return false;
   return true;
 }
 function exportJson(attempt,pack){
   const lesson=pack.lesson_id;
   return {
     app:'qazaq-homework',
     lesson_id:lesson,
     title:pack.homework.title,
     started_at:attempt.started_at,
     submitted_at:attempt.submitted_at,
     export_rev:attempt.export_rev,
     checklist:attempt.checklist,
     external_test_url:pack.homework.external_test_url,
     external_test_done:!!attempt.checklist.external_test,
     items:(attempt.items||[]).filter(i=>i.id).map(i=>({id:i.id,answers:i.answers,status:i.status,correct:!!i.correct,rule_peek:!!i.rule_peek,answer_peek:!!i.answer_peek})),
     weak_tags:(attempt.weak_tags||[])
   };
 }
 function exportHtml(attempt,pack,questions){
   const byId=new Map((questions||[]).map(q=>[q.id,q]));
   const date=new Date(attempt.submitted_at||attempt.started_at||Date.now());
   const stamp=date.toISOString().slice(0,10);
   const check=attempt.checklist||{};
   const rows=(attempt.items||[]).map((it,i)=>{
     const q=byId.get(it.id);
     const task=q?(q.title||'')+' · '+(q.stimulus||''):it.id;
     return '<tr><td>'+(i+1)+'</td><td>'+esc(task)+'</td><td lang="kk">'+esc((it.answers||[]).join(' / '))+'</td><td>'+esc(it.status)+'</td></tr>';
   }).join('');
   const missed=(attempt.items||[]).filter(it=>it.status==='ошибка'||it.status==='пропуск');
   const weak=(attempt.weak_tags||[]).map(t=>esc(t)).join(', ')||'нет';
   return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Домашка ${esc(pack.lesson_id)} · ${stamp}</title>
<style>body{font:16px/1.45 Georgia,serif;color:#111;background:#fff;margin:16px}h1,h2{font-weight:700}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px 8px;vertical-align:top}th{text-align:left}@media print{body{margin:12mm;color:#000;background:#fff}a{color:#000;text-decoration:none}nav,.no-print{display:none!important}}</style></head>
<body><h1>Домашка ${esc(pack.homework.title)} · ${stamp}</h1>
<p>Чеклист: методичка ${check.method?'да':'нет'} · упражнения ${check.exercises?'да':'нет'} · слова ${check.words?'да':'нет'} · тест сайта ${check.external_test?'отмечен':'не отмечен'}</p>
<p>Тест сайта: ${pack.homework.external_test_url?esc(pack.homework.external_test_url):'ссылка не найдена в PDF'}. Результат сайта здесь не проверяется.</p>
<table><thead><tr><th>№</th><th>Задание</th><th>Мой ответ</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Не сошлось</h2><p>${missed.length?missed.map(it=>esc(it.id)+' — '+esc((it.answers||[]).join(' / '))).join('; '):'нет'}</p>
<p>Слабые места этого листа: ${weak}</p>
</body></html>`;
 }
 function fileStamp(at=Date.now()){return new Date(at).toISOString().slice(0,10);}
 function weaknessKey(event,q){
   const D=typeof window!=='undefined'?window.ErrorDiagnostics:(typeof require==='function'?require('./diagnostics.js'):null);
   const actual=(event.answers||[])[0]||event.actual_answer||'';
   const expected=(q&&q.fields&&q.fields[0]&&q.fields[0].answers[0])||event.expected_answer||'';
   if(D&&D.classify&&q){
     const types=D.classify(expected,actual,q,q.fields&&q.fields[0]||{});
     if(types[0]&&D.skillTag)return D.skillTag(types[0],q,expected,actual);
   }
   if(event.confuse_pair_id==='lex-0'||/алты|алпыс/.test((q&&q.stimulus||'')+' '+(event.answers||[]).join(' ')))return 'confuse:алты_алпыс';
   if(event.confuse_pair_id==='lex-2'||/сегіз|сексен/.test((q&&q.stimulus||'')+' '+actual))return 'confuse:сегіз_сексен';
   if(q&&(q.ruleIds||[]).includes('quantity'))return 'rule:plural_after_num';
   if(event.confusion_tag==='harmony'||(q&&q.topic==='sounds'))return 'rule:plural::harmony';
   if(q&&q.topic==='plural')return event.confusion_tag==='harmony'?'rule:plural::harmony':'rule:plural::ldt';
   if(q&&(q.ruleIds||[]).includes('ordinal'))return /жиырманшы/.test(actual)?'rule:ordinal::exception_20':'rule:ordinal::suffix_family';
   if(q&&q.topic==='numbers')return 'rule:numeral::assemble';
   if(q&&q.topic==='person'){
     if(/емес/.test((q.stimulus||'')+expected))return 'rule:emes::position';
     if(/сен|сіз/.test(expected+actual))return 'rule:person::sen_siz';
     return 'rule:person::men';
   }
   if(q&&q.topic==='vocab'){
     const lemma=(q.vocabIds&&q.vocabIds[0])||(q.fields&&q.fields[0]&&/казахск/i.test(q.title||'')?'word:'+core.normalize(q.fields[0].answers[0]):'word:'+core.normalize(q.stimulus||q.id));
     return lemma+'::production';
   }
   if(event.skills&&event.skills[0]&&event.skills[0].skill_id)return event.skills[0].skill_id;
   return 'card:'+(event.card_id||'');
 }
 function isTargetKey(key,packWordIds){
   if(!key.startsWith('word:'))return true;
   const lemma=key.split('::')[0];
   return !packWordIds||packWordIds.has(lemma);
 }
 function firstTryFail(e){
   if(e.rule_peek&&e.correct)return false;
   if(e.peek||e.answer_peek||e.hinted)return false;
   if(e.first_try_correct===0)return true;
   return e.type==='answer'&&e.correct===false;
 }
 function weakSpots(state,questions,now=Date.now(),opts={}){
   const cutoff=now-14*DAY;
   const byId=new Map((questions||[]).map(q=>[q.id,q]));
   const targetWords=new Set(opts.word_ids||[]);
   const buckets=Object.create(null);
   function add(key,at,expected,actual,cardId,target){
     if(!key||at<cutoff)return;
     const b=buckets[key]||(buckets[key]={key,n:0,days:new Set(),lastAt:0,expected:'',actual:'',cardId:'',target:false});
     b.n++;b.days.add(new Date(at).toISOString().slice(0,10));if(at>=b.lastAt){b.lastAt=at;b.expected=expected||b.expected;b.actual=actual||b.actual;b.cardId=cardId||b.cardId;}
     b.target=b.target||target;
   }
   for(const e of state.events||[]){
     if(e.at<cutoff||e.type!=='answer')continue;
     const q=byId.get(e.card_id);
     if(e.confusion_tag==='lexical_confuse'||e.confuse_pair_id){
       const pair=e.confuse_pair_id==='lex-0'?'confuse:алты_алпыс':('confuse:'+(e.confuse_pair_id||'pair'));
       add(pair,e.at,e.expected_answer,(e.answers||[])[0],e.card_id,true);
     }
     if(!firstTryFail(e))continue;
     const key=weaknessKey(e,q);
     add(key,e.at,(q&&q.fields&&q.fields[0]&&q.fields[0].answers[0])||'',(e.answers||[])[0],e.card_id,isTargetKey(key,targetWords));
   }
   for(const attempt of Object.values(state.homeworkAttempts||{})){
     const list=[attempt,...(attempt.previous||[])];
     for(const a of list)for(const it of a.items||[]){
       if(it.at<cutoff)continue;
       const q=byId.get(it.id);
       if(it.status==='ошибка'){
         const key=weaknessKey({type:'answer',card_id:it.id,answers:it.answers,first_try_correct:0,correct:false},q);
         add(key,it.at,it.expected,(it.answers||[])[0],it.id,isTargetKey(key,targetWords));
       }
     }
   }
   const out=[];
   for(const b of Object.values(buckets)){
     const days=b.days.size;
     const weak=days>=2&&b.n>=2||b.n>=3||(String(b.key).startsWith('confuse:')&&b.n>=2);
     if(!weak)continue;
     if(blindCloseDays(state,questions,b.key,b.lastAt)>=2)continue;
     const recency=1/(1+(now-b.lastAt)/DAY);
     const cost=b.n*(b.target?1.4:1)* (0.5+recency);
     out.push({key:b.key,count:b.n,days,lastAt:b.lastAt,expected:b.expected,actual:b.actual,cardId:b.cardId,target:b.target,cost});
   }
   return out.sort((a,b)=>b.cost-a.cost).slice(0,8);
 }
 function blindCloseDays(state,questions,key,afterAt){
   const byId=new Map((questions||[]).map(q=>[q.id,q]));
   const days=new Set();
   for(const e of state.events||[]){
     if(e.type!=='answer'||!(e.at>afterAt))continue;
     if(e.peek||e.hinted||e.answer_peek||e.rule_peek)continue;
     if(e.first_try_correct===0||e.correct===false)continue;
     if(!(e.correct||e.first_try_correct===1))continue;
     const q=byId.get(e.card_id);
     if(weaknessKey(e,q)!==key)continue;
     days.add(new Date(e.at).toISOString().slice(0,10));
   }
   return days.size;
 }
 function stillWeak(spots,key){return (spots||[]).some(s=>s.key===key);}
 function inferBlock(q,mode,lessonId,activeLesson){
   if(mode==='homework')return 'homework:'+(lessonId||'');
   if(mode==='lesson'||activeLesson)return 'learn';
   if(!q)return 'practice';
   if(q.topic==='numbers')return 'numbers';
   if(q.topic==='vocab')return 'words';
   return 'practice:'+(q.topic||'all');
 }
 function blockReviewQueue(failedId,isolatedIds,fillers,minIntervening=3){
   const iso=[...new Set((isolatedIds||[]).filter(id=>id&&id!==failedId))].slice(0,4);
   const extra=(fillers||[]).filter(id=>id&&id!==failedId&&!iso.includes(id));
   while(iso.length<Math.min(4,Math.max(2,minIntervening))&&extra.length)iso.push(extra.shift());
   const out=iso.slice();
   if(failedId)out.push(failedId);
   if(out[0]===failedId&&out.length>1){out.shift();out.push(failedId);}
   return out;
 }
 function isolatedFor(failed,questions,state){
   if(!failed)return [];
   const seen=id=>!!(state&&state.records&&state.records[id]&&state.records[id].seen);
   const stem=core.normalize(String(failed.stimulus||'').split(/\s+/)[0]||'');
   const rule=inferRule(failed);
   const pool=(questions||[]).filter(q=>{
     if(!q||q.id===failed.id||q.contextOnly)return false;
     if(rule){if(inferRule(q)!==rule)return false;}
     else if(q.topic!==failed.topic)return false;
     if(!(seen(q.id)||String(q.id).startsWith('facet-')||q.source==='plus'))return false;
     const other=core.normalize(String(q.stimulus||'').split(/\s+/)[0]||'');
     return !stem||other!==stem||String(q.id).startsWith('facet-');
   });
   return pool.slice(0,4).map(q=>q.id);
 }
 function otherTopicFillers(failed,questions,state,n=5){
   if(!failed)return [];
   const seen=id=>!!(state&&state.records&&state.records[id]&&state.records[id].seen);
   const pool=(questions||[]).filter(q=>q&&q.id!==failed.id&&q.topic!==failed.topic&&!q.contextOnly);
   const known=pool.filter(q=>seen(q.id));
   const rest=pool.filter(q=>!seen(q.id));
   return [...known,...rest].slice(0,Math.max(3,n)).slice(0,5).map(q=>q.id);
 }
 function remediationQueue(failedId,isolatedIds,otherIds){
   const iso=[...new Set((isolatedIds||[]).filter(id=>id&&id!==failedId))].slice(0,4);
   const others=[...new Set((otherIds||[]).filter(id=>id&&id!==failedId&&!iso.includes(id)))].slice(0,5);
   const out=iso.slice();
   if(failedId)out.push(failedId);
   if(others.length){
     out.push(...others);
     if(failedId)out.push(failedId);
   }
   return out;
 }
 const api={RULES,EXTERNAL,WORD_LEMMAS,inferRule,ruleId,ruleText,missingRules,buildPack,packs,validateHomework,emptyAttempt,ensureAttempt,newAttempt,statusOf,recordItem,resumeIndex,sliceSection,sectionCount,sectionOf,partProgress,vocabDirections,HW_SECTION,markChecklist,sheetReady,exportJson,exportHtml,fileStamp,weakSpots,stillWeak,inferBlock,blockReviewQueue,isolatedFor,otherTopicFillers,remediationQueue,blindCloseDays,firstTryFail,weaknessKey,weakLabel,WEAK_LABELS};
 if(node)module.exports=api;else root.Homework=api;
})(typeof window!=='undefined'?window:globalThis);
