/* Progressive number ladder from the Kazakh numerals research:
   units → independent tens → contrast 6/60… → echo compounds → mixed.
   Early hundreds/thousands reuse the same digit in units and tens (8+80, 5+50). */
(function(){
 'use strict';
 const c=window.COURSE,L=window.LEARNING,core=window.TrainerCore;
 const f=(label,answers,kind='text')=>({label,answers:Array.isArray(answers)?answers:[answers],kind});
 function card(id,title,stimulus,fields,explanation,hint){
   const q={id:'learn-'+id,source:'plus',group:'числа',part:'1',lessonId:'1-2',topic:'numbers',kind:'fields',title,stimulus,fields,explanation,hint,phase:'Вспомнить',ruleIds:['numbers']};
   c.questions.push(q);return q.id;
 }
 function both(id,n,note){
   const kk=core.numberToKazakh(n),parts=core.numberParts(n).map(p=>p.value+' → '+p.word).join(' + ');
   const expl=n+' = '+kk+'. '+parts+'. '+(note||'Сначала большая часть, потом меньшая. Между словами пробел, без «и».');
   const hint=parts;
   const alt=n>=1000&&n<2000&&kk.startsWith('бір ')?[kk,kk.slice(4)]:[kk];
   return [
     card(id+'-kk','Напиши число словами',String(n),[f('По-казахски',alt)],expl,hint),
     card(id+'-ru','Запиши число цифрами',kk,[f('Цифры',String(n),'number-text')],expl,hint)
   ];
 }
 const PAIR=[[6,60,'алты','алпыс','-ты / -пыс'],[7,70,'жеті','жетпіс','-ті / -піс'],[8,80,'сегіз','сексен','сегіз / сексен'],[9,90,'тоғыз','тоқсан','тоғыз / тоқсан']];
 const contrastIds=[];
 for(const [u,t,uw,tw,diff] of PAIR){
   contrastIds.push(...both('contrast-'+u,u,'Пара с '+t+': '+uw+' ↔ '+tw+'. Смотри на окончание ('+diff+'), не только на начало.'));
   contrastIds.push(...both('contrast-'+t,t,'Пара с '+u+': '+tw+' ↔ '+uw+'. Не путай с единицей.'));
 }
 function chunked(title,intro,ids,items){
   const chunks=[];
   for(let i=0;i<ids.length;i+=4)chunks.push({title:title+' · '+(Math.floor(i/4)+1),explanation:intro,items:items.slice(i/2,i/2+2),questionIds:ids.slice(i,i+4),associationKey:'rule:numbers'});
   return chunks;
 }
 L.lessons.push({
   id:'numbers-contrast',topic:'numbers',title:'Пары 6/60, 7/70, 8/80, 9/90',courseLesson:'1-2',
   intro:'Алты и алпыс начинаются одинаково — мозг хватает «ал-» и путает 6 с 60. Чередуем их, чтобы смотреть на окончание. Не считай по порядку.',
   method:'Контраст вперемешку',tool:'number',
   note:'Исследование по числительным: blocked practice (сначала все 6, потом все 60) даёт ложное чувство прогресса. Нужно чередование.',
   items:PAIR.map(([u,t,uw,tw])=>({front:u+' ↔ '+t,back:uw+' ↔ '+tw,cue:'разные окончания'})),
   questionIds:contrastIds,
   chunks:chunked('Пара единица / десяток','Напиши слово или цифры. Рядом всегда парное число.',contrastIds,PAIR.map(([u,t,uw,tw])=>({front:String(u)+' и '+t,back:uw+' / '+tw,cue:'не путать'})))
 });

 const echo2=[55,66,77,88,99,50,60,70,80,90];
 const echo2Ids=echo2.flatMap(n=>both('echo2-'+n,n,n%11===0?'В одном числе одна и та же цифра: десяток и единица. ':'Круглый десяток из той же семьи, что единица '+((n/10)|0)+'.'));
 L.lessons.push({
   id:'numbers-echo-2',topic:'numbers',title:'Сборка 11–99: сначала 55, 88, 66',courseLesson:'1-2',
   intro:'Не учи каждое двузначное как новое слово. Собери десяток + единицу. Сначала числа, где цифра повторяется: 88 = сексен + сегіз — мозг видит 8 и 80 сразу.',
   method:'Поразрядная сборка',tool:'number',
   items:[{front:'88',back:'сексен сегіз',cue:'80 + 8'},{front:'55',back:'елу бес',cue:'50 + 5'},{front:'66',back:'алпыс алты',cue:'60 + 6'}],
   questionIds:echo2Ids,
   chunks:chunked('Повторяющаяся цифра','88, 55, 66 — в одном числе десяток и единица одной семьи.',echo2Ids,echo2.slice(0,6).map(n=>({front:String(n),back:core.numberToKazakh(n),cue:core.numberParts(n).map(p=>p.value).join(' + ')})))
 });

 const echo3=[100,200,500,800,505,550,555,508,580,588,606,660,666,707,770,777,808,880,888,909,990,999];
 const echo3Ids=echo3.flatMap(n=>both('echo3-'+n,n,'Сотни: жүз. Если цифра 1, говорим просто жүз, не бір жүз. Здесь единицы и десятки нарочно из той же семьи (5 и 50, 8 и 80).'));
 L.lessons.push({
   id:'numbers-echo-3',topic:'numbers',title:'Сотни: сначала 550, 880, 808',courseLesson:'1-3',
   intro:'Сто — жүз. Потом добавляем уже знакомые десятки и единицы. Первое время в одном числе снова 5 и 50 или 8 и 80: бес жүз елу, сегіз жүз сексен.',
   method:'Чанкинг сотен',tool:'number',
   items:[{front:'550',back:'бес жүз елу',cue:'5 + 100 и 50'},{front:'880',back:'сегіз жүз сексен',cue:'8 + 100 и 80'},{front:'808',back:'сегіз жүз сегіз',cue:'8 + 100 и 8'}],
   questionIds:echo3Ids,
   chunks:chunked('Сотни с эхом','550 = 5 и 50 в одном числе. 880 = 8 и 80.',echo3Ids,echo3.slice(0,8).map(n=>({front:String(n),back:core.numberToKazakh(n),cue:core.numberParts(n).map(p=>p.value).join(' + ')})))
 });

 const echo4=[1000,1505,1550,1555,1808,1880,1888,5000,5050,5500,5555,8000,8008,8080,8088,8800,8880,8888];
 const echo4Ids=echo4.flatMap(n=>both('echo4-'+n,n,'Тысячи: мың. Для 1000–1999 пишем бір мың …. Снова 5 с 50 и 8 с 80 внутри числа.'));
 L.lessons.push({
   id:'numbers-echo-4',topic:'numbers',title:'Тысячи: сначала 1550, 8080, 1888',courseLesson:'1-3',
   intro:'Тысяча — мың. 1550 = бір мың бес жүз елу: снова 5 и 50. 8080 = сегіз мың сексен: 8 и 80. Когда это станет легко — любые тысячи.',
   method:'Чанкинг тысяч',tool:'number',
   items:[{front:'1550',back:'бір мың бес жүз елу',cue:'1000 + 5+100 + 50'},{front:'8080',back:'сегіз мың сексен',cue:'8+1000 + 80'},{front:'1888',back:'бір мың сегіз жүз сексен сегіз',cue:'8 везде'}],
   questionIds:echo4Ids,
   chunks:chunked('Тысячи с эхом','Сначала повторяющиеся 5/50 и 8/80 внутри большого числа.',echo4Ids,echo4.slice(0,8).map(n=>({front:String(n),back:core.numberToKazakh(n),cue:core.numberParts(n).map(p=>p.value).join(' + ')})))
 });

 const POOLS={
   tens:[10,20,30,40,50,60,70,80,90],
   contrast:[6,60,7,70,8,80,9,90],
   echo2:[55,66,77,88,99,50,60,70,80,90,15,16,17,18,19],
   echo3:[100,200,500,800,505,550,555,508,580,588,606,660,666,707,770,777,808,880,888,909,990,999],
   echo4:[1000,1505,1550,1555,1808,1880,1888,5000,5050,5500,5555,8000,8008,8080,8088,8800,8880,8888]
 };
 function pickFrom(pool,key,variants,random){
   const last=variants[key+'_last'];
   let n,g=0;
   do{n=pool[Math.floor(random()*pool.length)];g++;}while(n===last&&pool.length>1&&g<10);
   variants[key]=n;variants[key+'_last']=n;return n;
 }
 function pickRange(min,max,key,variants,random){
   const last=variants[key+'_last'];
   let n,g=0;
   do{n=min+Math.floor(random()*(max-min+1));g++;}while((n===last||n===last+1||n===last-1)&&g<20);
   variants[key]=n;variants[key+'_last']=n;return n;
 }

 const prev=window.NumberPractice||{prepare(){},session(){return [];},templates:[]};
 const extraTemplates=[];
 for(const [range,pool] of Object.entries(POOLS))for(const reverse of [false,true]){
   extraTemplates.push({
     id:'generated-number-'+range+'-'+(reverse?'read':'write'),
     source:'plus',group:'практика',part:'1',lessonId:range.startsWith('echo4')||range==='echo3'?'1-3':'1-2',
     topic:'numbers',kind:'fields',title:reverse?'Запиши число цифрами':'Запиши число словами',
     stimulus:'88',fields:[{label:'Ответ',kind:reverse?'number-text':'text',answers:['сексен сегіз']}],
     phase:'Применить',generatedNumber:{pool,reverse,range},numberRange:range,ruleIds:['numbers']
   });
 }
 c.questions.push(...extraTemplates);

 function prepare(q,variants,random=Math.random){
   if(q.generatedNumber?.pool){
     const n=pickFrom(q.generatedNumber.pool,q.id,variants,random);
     const spoken=core.numberToKazakh(n);
     q.stimulus=q.generatedNumber.reverse?spoken:String(n);
     q.fields[0].kind=q.generatedNumber.reverse?'number-text':'text';
     q.fields[0].answers=q.generatedNumber.reverse?[String(n)]:[spoken];
     if(!q.generatedNumber.reverse&&n>=1000&&n<2000&&spoken.startsWith('бір '))q.fields[0].answers.push(spoken.slice(4));
     q.hint=core.numberParts(n).map(p=>p.value+' → '+p.word).join(' + ');
     q.explanation=n+' = '+spoken+'. '+core.numberParts(n).map(p=>p.value).join(' + ')+'.';
     return;
   }
   if(q.generatedNumber){
     const {min,max}=q.generatedNumber;
     const n=pickRange(min,max,q.id,variants,random);
     variants[q.id]=n;
   }
   prev.prepare(q,variants,random);
 }
 function session(range,state){
   const generated=c.questions.filter(q=>q.generatedNumber&&q.generatedNumber.range===range);
   const atoms=c.questions.filter(q=>q.topic==='numbers'&&q.source==='hw2');
   return [...generated,...atoms.sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
 }
 window.NumberPractice={prepare,session,templates:[...prev.templates,...extraTemplates],POOLS};

 const ORDER=['numbers-0','numbers-1','tens-1','tens-2','numbers-contrast','numbers-echo-2','number-build','numbers-echo-3','hundreds','numbers-echo-4','school-1-3-numbers','school-1-3-phone'];
 (function reorderNumberLessons(){
   const byId=new Map(L.lessons.map(l=>[l.id,l]));
   const placed=new Set();
   const numbers=ORDER.map(id=>{placed.add(id);return byId.get(id);}).filter(Boolean)
     .concat(L.lessons.filter(l=>l.topic==='numbers'&&!placed.has(l.id)));
   const out=[];let inserted=false;
   for(const l of L.lessons){
     if(l.topic==='numbers'){if(!inserted){out.push(...numbers);inserted=true;}continue;}
     out.push(l);
   }
   L.lessons.splice(0,L.lessons.length,...out);
 })();

 function isPhone(q){
   if(!q)return false;
   if(q.ruleIds?.includes('phone-groups'))return true;
   if(q.skillBindings?.some(b=>b.item_id==='rule:phone-groups'))return true;
   const t=String(q.stimulus||'');
   return t.includes('+7')||/\d\s+\d{3}\s+\d{2}/.test(t)||(q.id||'').includes('phone');
 }
 function extractN(q){
   if(isPhone(q))return Infinity;
   const texts=[q.stimulus,...(q.fields||[]).flatMap(f=>f.answers||[])];
   for(const raw of texts){
     const s=String(raw).replace(/\s/g,'');
     if(/^\d{1,6}$/.test(s))return Number(s);
   }
   return null;
 }
 function band(n){
   if(n==null)return 1;
   if(n===Infinity)return 4;
   if(n<=10)return 0;
   if(n<=99)return 1;
   if(n<=999)return 2;
   return 3;
 }
 function practiced(records,pred){
   const qs=c.questions.filter(q=>q.topic==='numbers'&&pred(q));
   if(!qs.length)return 1;
   return qs.filter(q=>(records[q.id]?.streak||0)>=1).length/qs.length;
 }
 function capBand(records){
   if(practiced(records,q=>band(extractN(q))===0)<0.55)return 0;
   if(practiced(records,q=>band(extractN(q))===1)<0.4)return 1;
   if(practiced(records,q=>band(extractN(q))===2)<0.35)return 2;
   return 3;
 }
 function allowed(q,state){
   if(state&&state._numberOverride)return true;
   const n=extractN(q);
   const cap=capBand(state?.records||{});
   if(isPhone(q))return cap>=3&&practiced(state?.records||{},q=>band(extractN(q))===3)>=0.3;
   return band(n)<=cap;
 }
 function filter(list,state){return list.filter(q=>allowed(q,state));}
 function parkLearn(learning,records){
   if(!learning)return;
   if(learning.lessonId==='school-1-3-phone'&&capBand(records)<3)learning.lessonId='numbers-0';
   if(learning.lessonId==='school-1-3-numbers'&&capBand(records)<2)learning.lessonId='numbers-0';
 }
 window.NumberLadder={isPhone,extractN,band,capBand,allowed,filter,parkLearn,ORDER};
})();
