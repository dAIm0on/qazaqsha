(function(){
 'use strict';
 const C=window.CURRICULUM,course=window.COURSE,installed=new Map(),baseLessons=new Set(C.lessons.filter(l=>l.active).map(l=>l.id));
 function prepare(raws){
   const pending=window.LessonPackageSchema.merge([],raws),available=new Set(baseLessons);
   const todo=[...pending],ordered=[];
   for(const p of pending)if(baseLessons.has(p.lesson_id))throw Error('Урок '+p.lesson_id+' уже встроен в тренажёр. Его исходник не заменён.');
   while(todo.length){const i=todo.findIndex(p=>p.dependencies.every(id=>available.has(id)));if(i<0)throw Error('Не найдены предыдущие уроки: '+todo.map(p=>p.dependencies.filter(id=>!available.has(id)).join(', ')).join('; '));const [p]=todo.splice(i,1);available.add(p.lesson_id);ordered.push(p);}
   for(const p of ordered)if(installed.has(p.lesson_id)&&JSON.stringify(installed.get(p.lesson_id))!==JSON.stringify(p))throw Error('Этот урок уже добавлен в другой версии. Исходник не заменён.');
   const used=new Set(course.questions.map(q=>q.id));
   for(const p of ordered)if(!installed.has(p.lesson_id))for(const q of p.exercises){const key='import-'+p.lesson_id+'-'+q.id;if(used.has(key))throw Error('Совпали идентификаторы упражнений: '+key);used.add(key);}
   return ordered;
 }
 function install(raws){
   for(const p of prepare(raws)){
     if(installed.has(p.lesson_id))continue;
     const source='import-'+p.lesson_id,prefix=source+'-';course.sources[source]={title:p.source.title,url:p.source.url};
     for(const w of p.words)C.addWord(w.kazakh,w.translation,p.lesson_id,'target');
     const qs=p.exercises.map(q=>{const row=window.Canonical?window.Canonical.applyQuestion({...q}):{...q};return {...row,id:prefix+q.id,kind:'fields',lessonId:p.lesson_id,source,group:q.id,part:'1',vocabIds:C.words.filter(w=>w.aliases.some(a=>window.TrainerCore.normalize(q.stimulus)===a||q.fields.some(f=>f.answers.some(x=>window.TrainerCore.normalize(x)===a)))).map(w=>w.id),ruleIds:row.ruleIds||[],phase:'По полученному уроку'};});
     course.questions.push(...qs);qs.forEach(q=>window.Knowledge.register(q));
     C.lessons.push({id:p.lesson_id,title:p.lesson_title,active:true,status:'user-reviewed',depends_on:p.dependencies,rules:[],sources:[p.source.url]});
     window.LEARNING.lessons.push({id:source,title:p.lesson_title,topic:qs[0].topic,courseLesson:p.lesson_id,intro:p.blocks[0].explanation,items:[],questionIds:qs.map(q=>q.id),chunks:p.blocks.map(b=>({title:b.title,explanation:b.explanation,items:b.examples.map(e=>({front:e.kazakh,back:e.translation,cue:''})),questionIds:b.question_ids.map(id=>prefix+id),associationKey:'lesson:'+source}))});
     installed.set(p.lesson_id,p);
   }
 }
 window.LessonPackages={prepare,install,installed};
})();
