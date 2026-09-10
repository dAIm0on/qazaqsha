(function(){
 'use strict';
 const data=window.LEARNING,core=window.TrainerCore,c=window.COURSE;
 const byId=new Map(c.questions.map(q=>[q.id,q]));
 const key=s=>core.normalize(s).replace(/\s*→.*$/,'').replace(/\s*\(.*$/,'');
 for(const l of data.lessons){
   l.courseLesson=l.courseLesson||(l.topic==='sounds'||l.topic==='vocab'?'1-1':'1-2');
   if(l.chunks?.length)continue;
   l.chunks=[];
   if(l.id.startsWith('plural-')){
     for(const [letter,rule,explanation] of [
       ['л','plural-l','После гласной, Р, Й, У выбираем ЛАР или ЛЕР. Последний слог подскажет А или Е.'],
       ['д','plural-d','После Л, М, Н, Ң, Ж, З выбираем ДАР или ДЕР. Запоминалка: согласные в «ЛиМоН» + Ң, Ж, З.'],
       ['т','plural-t','После глухих согласных (К, Қ, П, С, Т и других), а также Б, В, Г, Д на конце заимствований выбираем ТАР или ТЕР.']
     ]){
       const ids=l.questionIds.filter(id=>byId.get(id)?.fields?.[1]?.answers?.[0]===letter);if(!ids.length)continue;
       const qs=ids.map(id=>byId.get(id));
       const examples=qs.map(q=>({front:q.stimulus,back:q.fields[2].answers[0],cue:'Сначала гласная по последнему слогу, затем '+letter.toUpperCase()+'.'}));
       const forms=new Set(qs.map(q=>key(q.fields[2].answers[0])));
       const original=c.questions.filter(q=>q.source!=='plus'&&q.kind==='fields'&&q.fields.length===1&&forms.has(key(q.fields[0].answers[0]))).map(q=>q.id);
       l.chunks.push({title:'Начало окончания: '+letter.toUpperCase(),explanation,items:examples,questionIds:[...new Set([...ids,...original])].slice(0,4),associationKey:'rule:'+rule});
     }
   }else if(l.id==='number-build'){
     for(const [title,explanation,ids] of [
       ['Десятки и единицы','Сначала десятки, потом единицы: 47 = 40 + 7 → қырық жеті. Слова пишем раздельно, без «и».',[14,17,24,38]],
       ['Другие десятки','Сохрани порядок: 76 = 70 + 6 → жетпіс алты. Не меняй местами части числа.',[47,59,62,76,83]],
       ['Сотни и нули','243 = 200 + 40 + 3 → екі жүз қырық үш. В 508 нулевые десятки пропускаем: бес жүз сегіз.',[95,126,243,508,999]],
       ['Тысяча и единицы','1001 = 1000 + 1 → мың бір. Не произносим нулевые сотни и десятки.',[1001,126]]
     ])l.chunks.push({title,explanation,items:ids.slice(0,2).map(n=>({front:String(n),back:core.numberToKazakh(n),cue:core.numberParts(n).map(p=>p.value).join(' + ')})),questionIds:ids.map(n=>'learn-compose-'+n),associationKey:'rule:numbers'});
   }else{
     for(let i=0;i<l.items.length;i+=3){
       const items=l.items.slice(i,i+3),keys=new Set(items.flatMap(item=>[key(item.front),key(item.back)]));
       const matching=l.questionIds.filter(id=>{const q=byId.get(id);return q&&(keys.has(key(q.stimulus))||(q.fields||[]).some(f=>f.answers.some(a=>keys.has(key(a)))));});
       const ids=(matching.length?matching:l.questionIds.slice(i,i+4)).slice(0,4);
       if(!ids.length)continue;
       const explanation=l.id==='quantity'?(i===0?'Без количества: кітаптар — книги. Если количество указано, окончание не нужно: екі кітап — две книги.':'Көп и аз уже обозначают количество: көп адам, аз сөз. В этих сочетаниях множественное окончание не добавляем.'):
         l.id==='harmony-syllables'?'В смешанном слове смотри на последний слог. Кі-тап → А, мұ-ға-лім → Е в окончании.':
         l.id==='harmony-pairs'?'Четыре пары: А–Ә, О–Ө, Ұ–Ү, Ы–І. Передняя группа: Ә Ө Ү І Е; задняя: А О Ұ Ы.':
         l.id==='harmony-special'?'И и У сами по себе не подсказывают группу. Запоминай конкретное слово сразу с окончанием.':l.intro;
       l.chunks.push({title:l.items.length>3?l.title+' · часть '+(Math.floor(i/3)+1):l.title,explanation,items,questionIds:ids,associationKey:'lesson:'+l.id});
     }
     // Keep every old lesson card reachable; advanced/reverse practice stays explicit.
     const used=new Set(l.chunks.flatMap(s=>s.questionIds)),rest=l.questionIds.filter(id=>!used.has(id));
     for(let i=0;i<rest.length;i+=4)l.chunks.push({title:'Вспоминаем без опоры · '+(Math.floor(i/4)+1),explanation:'Теперь проверь тот же материал в другом направлении или на другом примере. Сначала вспомни ответ; затем открой подсказку, если нужно.',items:[],questionIds:rest.slice(i,i+4),associationKey:'lesson:'+l.id});
   }
 }
 for(const l of data.lessons)for(const step of l.chunks)if(step.questionIds.length===1){const extra=l.questionIds.find(id=>!step.questionIds.includes(id));if(extra)step.questionIds.push(extra);}
 data.lessons.push({id:'known-context',topic:'plural',courseLesson:'1-2',title:'Знакомые слова в предложении',intro:'Тренируем знакомые слова. Служебные слова для контекста не заучиваем автоматически.',items:[],questionIds:c.questions.filter(q=>q.contextOnly).map(q=>q.id),chunks:[{
   title:'Знакомое слово внутри предложения',explanation:'В предложении Бұл екі кітап. — «Это две книги» — тренируем число и слово кітап. Только одно слово для контекста: бұл — «это». Оно дано с переводом и не попадает в обязательные повторения.',
   items:[{front:'Две книги',back:'екі кітап',cue:'После числа множественное окончание не нужно.'}],questionIds:c.questions.filter(q=>q.contextOnly).map(q=>q.id),associationKey:'rule:quantity'}]});
})();
