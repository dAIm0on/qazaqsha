/* Data-only, explicitly reviewed lesson packages. No executable content. */
(function(root){
 'use strict';
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const fail=message=>{throw Error('Пакет урока: '+message);};
 function text(x,label,max=3000){if(typeof x!=='string'||!x.trim()||x.length>max)fail('проверь '+label);return x.trim();}
 function id(x){const s=text(x,'идентификатор',100);if(!/^[a-z0-9][a-z0-9_-]*$/i.test(s))fail('идентификатор может содержать латинские буквы, цифры, - и _');return s;}
 function list(x,label,min=0,max=500){if(!Array.isArray(x)||x.length<min||x.length>max)fail('проверь список '+label);return x;}
 function validate(raw){
   if(!obj(raw)||raw.app!=='qazaq-lesson'||raw.format_version!==1)fail('нужен JSON qazaq-lesson версии 1');
   const p={app:'qazaq-lesson',format_version:1,lesson_id:id(raw.lesson_id),lesson_title:text(raw.lesson_title,'название',200)};
   if(!obj(raw.source))fail('нет ссылки на полученный материал');
   const url=text(raw.source.url,'ссылку',2000);if(!/^https:\/\/[^\s<>"']+$/.test(url))fail('ссылка должна начинаться с https://');
   p.source={title:text(raw.source.title,'название источника',200),url};
   p.dependencies=list(raw.dependencies,'предыдущие уроки',1,50).map(id);
   if(p.dependencies.includes(p.lesson_id))fail('урок не может зависеть от самого себя');
   p.words=list(raw.words,'слова').map(w=>({kazakh:text(w.kazakh,'слово',100),translation:list(w.translation,'переводы',1,10).map(t=>text(t,'перевод',200))}));
   p.exercises=list(raw.exercises,'упражнения',2).map(q=>{
     if(!obj(q)||!['vocab','numbers','plural','sounds'].includes(q.topic))fail('неизвестный раздел упражнения');
     return {id:id(q.id),topic:q.topic,title:text(q.title,'вопрос',300),stimulus:text(q.stimulus,'пример',1000),explanation:text(q.explanation,'объяснение'),
       fields:list(q.fields,'поля ответа',1,12).map(f=>{if(!obj(f)||!['text','number-text','select','set-text','syllables'].includes(f.kind))fail('тип поля');const field={kind:f.kind,label:text(f.label,'подпись',200),answers:list(f.answers,'ответы',1,12).map(a=>text(a,'ответ',300))};if(f.kind==='select'){field.options=list(f.options,'варианты',2,20).map(a=>text(a,'вариант',300));if(field.answers.some(a=>!field.options.includes(a)))fail('ответ отсутствует в вариантах');}return field;})};
   });
   const ids=new Set(p.exercises.map(q=>q.id));if(ids.size!==p.exercises.length)fail('повторяются идентификаторы упражнений');
   p.blocks=list(raw.blocks,'маленькие объяснения',1,250).map(b=>{
     const question_ids=list(b.question_ids,'2–5 проверок',2,5).map(id);if(new Set(question_ids).size!==question_ids.length||question_ids.some(q=>!ids.has(q)))fail('проверки блока не найдены или повторяются');
     return {title:text(b.title,'название шага',200),explanation:text(b.explanation,'объяснение шага'),examples:list(b.examples,'примеры',1,2).map(e=>({kazakh:text(e.kazakh,'пример',1000),translation:text(e.translation,'перевод примера',1000)})),question_ids};
   });
   const covered=new Set(p.blocks.flatMap(b=>b.question_ids));if(p.exercises.some(q=>!covered.has(q.id)))fail('каждому упражнению нужен учебный блок');
   return p;
 }
 function merge(a=[],b=[]){const out=new Map();for(const raw of [...a,...b]){const p=validate(raw),old=out.get(p.lesson_id);if(old&&JSON.stringify(old)!==JSON.stringify(p))fail('разные версии урока '+p.lesson_id+'; существующий материал не заменён');out.set(p.lesson_id,p);}return [...out.values()];}
 function validateHomework(raw,knownIds){
   if(!obj(raw)||typeof raw.lesson_id!=='string'||!obj(raw.homework))fail('нужен объект lesson_id + homework');
   const h=raw.homework,ids=list(h.exercise_ids||[],'exercise_ids',0,800).map(id);
   const known=knownIds instanceof Set?knownIds:new Set(knownIds||[]);
   const unknown=ids.filter(x=>!known.has(x));
   if(unknown.length)fail('exercise_ids не из банка: '+unknown.slice(0,12).join(', '));
   const words=Array.isArray(h.word_ids)?h.word_ids.map(x=>text(String(x),'word_id',80)):[];
   const rule_map=obj(h.rule_map)?h.rule_map:{};
   for(const k of Object.keys(rule_map))if(known.size&&!known.has(k)&&!ids.includes(k))fail('rule_map ссылается на id вне банка: '+k);
   const url=h.external_test_url?text(h.external_test_url,'external_test_url',2000):'';
   if(url&&!/^https:\/\/[^\s<>"']+$/.test(url))fail('ссылка теста должна начинаться с https://');
   return {lesson_id:id(raw.lesson_id),homework:{title:text(h.title||('Домашка '+raw.lesson_id),'title',200),word_ids:words,exercise_ids:ids,rule_map,external_test_url:url,checklist:Array.isArray(h.checklist)&&h.checklist.length?h.checklist.map(x=>text(x,'checklist',40)):['method','exercises','words','external_test']}};
 }
 const api={validate,merge,validateHomework};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LessonPackageSchema=api;
})(typeof window!=='undefined'?window:globalThis);
