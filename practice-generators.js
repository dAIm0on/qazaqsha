/* Bounded templates over received lessons; no card per possible integer. */
(function(){
 'use strict';
 const c=window.COURSE,L=window.LEARNING,core=window.TrainerCore;
 const make=(id,topic,title,stimulus,answer,extras={})=>({id,source:'plus',group:'практика',part:'1',lessonId:'1-2',topic,kind:'fields',title,stimulus,fields:[{label:'Ответ',kind:'text',answers:[answer]}],phase:'Применить',explanation:'',...extras});
 const stages=[['harmony','Шаг А: только гласная','Последний слог определяет гласную окончания: задний → А, передний → Е. Начальную согласную сейчас не выбираем.','vowel'],['initial_consonant','Шаг Б: только Л / Д / Т','Гласная уже известна. Теперь последняя буква слова определяет начало окончания: гласная, Р, Й, У → Л; Л, М, Н, Ң, Ж, З → Д; глухие и Б, В, Г, Д → Т.','start'],['full_form','Шаг В: напиши целую форму','Соедини два решения: гласная по последнему слогу; первая согласная по последней букве.','plural']];
 for(const [skill,title,intro,property] of stages){
   const qs=L.analyses.slice(0,8).map((a,i)=>make('facet-'+skill+'-'+i,'plural',skill==='harmony'?'А или Е в окончании?':skill==='initial_consonant'?'Л, Д или Т в начале окончания?':'Напиши множественное число',a.word,a[property],{explanation:a.split+' → '+a.plural+'. '+a.reason,ruleIds:[skill==='harmony'?'harmony':'plural-'+({л:'l',д:'d',т:'t'}[a.start])],skillBindings:[{item_id:'rule:plural',skill_type:skill,field:0}]}));
   c.questions.push(...qs);const chunks=[];for(let i=0;i<qs.length;i+=4)chunks.push({title,explanation:intro,items:L.analyses.slice(i,i+2).map(a=>({front:a.word,back:a[property],cue:a.split})),questionIds:qs.slice(i,i+4).map(q=>q.id),associationKey:'rule:plural'});
   const index=L.lessons.findIndex(l=>l.id==='plural-1');L.lessons.splice(index,0,{id:'facet-'+skill,title,topic:'plural',courseLesson:'1-2',intro,items:[],questionIds:qs.map(q=>q.id),chunks});
 }
 const definitions=[['composition',11,99,'1-2'],['hundreds',101,999,'1-2'],['thousands',1001,999999,'1-3']];
 const templates=[];
 for(const [range,min,max,lesson] of definitions)for(const reverse of [false,true]){
   const id='generated-number-'+range+'-'+(reverse?'read':'write');
   const q=make(id,'numbers',reverse?'Запиши число цифрами':'Запиши число словами','47','қырық жеті',{lessonId:lesson,generatedNumber:{min,max,reverse,range},numberRange:range,ruleIds:['numbers'],skillBindings:[{item_id:'rule:number-composition',skill_type:(reverse?'read_':'')+range,field:0}]});templates.push(q);c.questions.push(q);
 }
 function prepare(q,variants,random=Math.random){
   if(!q.generatedNumber)return;
   const {min,max,reverse}=q.generatedNumber;
   const n=Number.isInteger(variants[q.id])&&variants[q.id]>=min&&variants[q.id]<=max?variants[q.id]:min+Math.floor(random()*(max-min+1));variants[q.id]=n;
   q.stimulus=reverse?core.numberToKazakh(n):String(n);q.fields[0].kind=reverse?'number-text':'text';
   const spoken=core.numberToKazakh(n);
   q.fields[0].answers=reverse?[String(n)]:[spoken];
   if(!reverse&&n>=1000&&n<2000&&spoken.startsWith('бір '))q.fields[0].answers.push(spoken.slice(4));
   q.hint=core.numberParts(n).map(p=>p.value).join(' + ');q.explanation=n+' = '+core.numberToKazakh(n)+'. '+core.numberParts(n).map(p=>p.value).join(' + ')+'.';
 }
 function session(range,state){
   const generated=templates.filter(q=>q.generatedNumber.range===range),atoms=c.questions.filter(q=>q.topic==='numbers'&&q.source==='hw2');
   const extras=atoms.sort(()=>Math.random()-.5).slice(0,4);return [...generated,...extras].sort(()=>Math.random()-.5);
 }
 // One short template sentence; only this is a CONTEXT word, glossed immediately.
 const forms=[['кітап','кітаптар','книги'],['қыз','қыздар','девушки'],['ұл','ұлдар','сыновья'],['жігіт','жігіттер','парни'],['қала','қалалар','города'],['көше','көшелер','улицы'],['сөз','сөздер','слова']];
 for(const [word,form,tr] of forms){const q=make('context-plural-'+word,'plural','Вставь форму множественного числа','Бұл ___.',form,{translation:'Это '+tr+'.',contextOnly:true,prerequisites:['word:'+word],contextGloss:[{word:'Бұл',translation:'это'}],explanation:'Бұл '+form+'. — Это '+tr+'.',ruleIds:['plural'],vocabIds:['word:'+word],associationKeys:['word:'+word,'rule:plural'],skillBindings:[{item_id:'word:'+word,skill_type:'context',field:0},{item_id:'rule:plural',skill_type:'context',field:0}]});c.questions.push(q);const w=window.CURRICULUM.words.find(w=>w.id==='word:'+word);if(w){w.card_ids.push(q.id);w.examples.push({kazakh:'Бұл '+form+'.',translation:'Это '+tr+'.',level:'sentence'});}}
 const contextQs=c.questions.filter(q=>q.id.startsWith('context-plural-'));
 L.lessons.push({id:'plural-context',title:'Шаг Г: форма внутри предложения',topic:'plural',courseLesson:'1-2',intro:'Все существительные уже встречались. Бұл — «это», дано для контекста.',items:[],questionIds:contextQs.map(q=>q.id),chunks:[contextQs.slice(0,4),contextQs.slice(4)].map(qs=>({title:'Форма в коротком предложении',explanation:'Напиши нужную форму. Это те же окончания, которые ты уже собрала отдельно.',items:[{front:'Это девушки.',back:'Бұл қыздар.',cue:'Бұл — это.'}],questionIds:qs.map(q=>q.id),associationKey:'rule:plural'}))});
 window.NumberPractice={prepare,session,templates};
})();
