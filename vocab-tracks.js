/* Two vocab tracks: homework «выучить» vs words that only appear in materials.
   Method: retrieval + small batches + keyword cue that fades. FSRS already schedules. */
(function(){
 'use strict';
 const c=window.COURSE,L=window.LEARNING,core=window.TrainerCore,B=window.WORD_BANK||{all:[]};
 const must=new Set((B.all||[]).filter(w=>w.role==='must').map(w=>core.normalize(w.kazakh)));
 const from21=new Set(((B.must||{})['2-1']||[]).map(w=>core.normalize(w.kazakh)));
 function formOf(q){
   if(/на казахский/i.test(q.title||''))return core.normalize((q.fields&&q.fields[0].answers||[])[0]||'');
   return core.normalize(q.stimulus||'');
 }
 for(const q of c.questions){
   if(q.topic!=='vocab')continue;
   if(q.source==='bank'){q.wordRole='used';continue;}
   q.wordRole='must';
   if(from21.has(formOf(q)))q.lessonId='2-1';
 }
 function addTrack(id,title,intro,ids,note){
   if(!ids.length)return;
   const chunks=[];
   for(let i=0;i<ids.length;i+=4){
     const slice=ids.slice(i,i+4);
     const items=slice.map(id=>{
       const q=c.questions.find(x=>x.id===id);if(!q)return {front:'',back:'',cue:''};
       return {front:q.stimulus,back:(q.fields[0].answers||[]).join(' / '),cue:q.hint||'Сначала вспомни, потом открой.'};
     });
     chunks.push({title:title+' · '+(Math.floor(i/4)+1),explanation:intro,items,questionIds:slice,associationKey:'track:'+id});
   }
   L.lessons.push({id,topic:'vocab',courseLesson:'bank',title,intro,note,questionIds:ids,chunks,method:'Вспомнить без подглядывания'});
 }
 const mustIds=c.questions.filter(q=>q.topic==='vocab'&&q.wordRole==='must').map(q=>q.id);
 const usedSee=c.questions.filter(q=>q.wordRole==='used'&&/-ru$/.test(q.id)).map(q=>q.id);
 const usedSay=c.questions.filter(q=>q.wordRole==='used'&&/-kk$/.test(q.id)).map(q=>q.id);
 addTrack('vocab-must','Слова, которые задали выучить',
   'Это списки «выучить» из домашек. Шаг: 1) посмотри пару, 2) закрой и скажи вслух, 3) напиши без подсказки. Свою ассоциацию — в «Моя подсказка», потом убери: иначе мозг привыкнет к костылю.',
   mustIds,'Исследования: retrieval practice + интервал (FSRS) сильнее перечитывания. Keyword-образ помогает на 1–2 раза, потом только извлечение.');
 addTrack('vocab-seen','Слова, которые просто встречались · узнать',
   'Эти слова не задавали зубрить. Сначала только казахский → русский: узнать значение, если снова встретится в тексте.',
   usedSee,'Не смешивай с обязательным списком. Сначала узнавание, не письмо.');
 addTrack('vocab-seen-write','Слова, которые просто встречались · написать',
   'Тот же набор, но уже русский → казахский. Только после того, как узнавание стало лёгким.',
   usedSay,'Если путаешь с обязательными словами — вернись к «узнать».');
})();
