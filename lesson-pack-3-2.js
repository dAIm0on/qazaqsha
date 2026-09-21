/* Catalog pack for lesson 3-2. Grammar cards live in lesson32-pack.js. */
(function(root){
 'use strict';
 function vocabPair(n,kk,ru){
  const id='hw32-'+String(n).padStart(2,'0');
  const ruA=Array.isArray(ru)?ru:[ru];
  return [
   {id:id+'-ru',source:'hw32',group:'words',part:String(n).padStart(2,'0')+'-ru',lessonId:'3-2',topic:'vocab',kind:'fields',
    title:'Переведи на русский',stimulus:kk,translation:ruA[0],
    fields:[{label:'Ответ',kind:'text',answers:ruA}],explanation:kk+' — '+ruA[0]+'.',hint:ruA[0],ruleIds:['poss-vocab']},
   {id:id+'-kk',source:'hw32',group:'words',part:String(n).padStart(2,'0')+'-kk',lessonId:'3-2',topic:'vocab',kind:'fields',
    title:'Переведи на казахский',stimulus:ruA[0],
    fields:[{label:'Ответ',kind:'text',answers:[kk]}],explanation:ruA[0]+' — '+kk+'.',hint:kk,ruleIds:['poss-vocab']}
  ];
 }
 const words=[
  ['бас','голова'],['қол','рука'],['көз','глаз'],['тіл','язык'],['қалам','ручка'],
  ['көйлек','платье'],['жақсы',['хороший','хорошо']],['жаман',['плохой','плохо']],
  ['біздің',['наш','наша','наше']],['сендердің',['ваш','ваша','ваше']],
  ['сіздердің',['Ваш','Ваша','Ваше']],['олардың','их'],
  ['бұл',['этот','это']],['мынау',['вот этот','это']],['осы','этот'],['мына','этот'],
  ['анау',['вон тот','то']],['ана','тот'],['ол',['он','тот']],['сол','тот'],
  ['сынып','класс'],['сыныптас','одноклассник'],['отбасы','семья'],['баба','предок'],
  ['іс','дело'],['аяқ','нога'],['кім','кто'],['не','что'],
  ['қандай','какой'],['қай','какой'],['нешінші','какой по счёту']
 ];
 const original_exercises=words.flatMap((w,i)=>vocabPair(i+1,w[0],w[1]));
 const pack={
  lesson_id:'3-2',
  lesson_title:'Урок 3–2 · наш / ваш / их',
  dependencies:['3-1'],
  sources:{
   m32:{title:'Методичка 3–2 · біздің / сендердің / сіздердің / олардың',url:'https://qazaqsha.pages.dev/',lesson_id:'3-2'},
   hw32:{title:'Слова домашней работы 3–2',url:'https://qazaqsha.pages.dev/',lesson_id:'3-2'}
  },
  rules:[
   {id:'T24_POSS_BIZ',title:'Наш: мыз вместо ңыз'},
   {id:'T25_POSS_SENDER',title:'Сендердің и сіздердің: сначала всегда много'},
   {id:'T26_POSS_OLAR',title:'Их: наклейка как у оның'},
   {id:'T27_DEIXIS',title:'Это и тот — не все слова живут одни'}
  ],
  target_vocabulary:words.map(([kazakh,translation])=>({kazakh,translation:Array.isArray(translation)?translation:[translation]})),
  examples:[
   {kazakh:'Біздің әкеміз.',translation:'Наш отец.'},
   {kazakh:'Сендердің қолдарың.',translation:'Ваша рука / ваши руки.'},
   {kazakh:'Олардың інісі.',translation:'Их младший брат.'}
  ],
  original_exercises,
  generated_exercises:[]
 };
 if(typeof window!=='undefined')window.LESSON_PACKS=(window.LESSON_PACKS||[]).concat([pack]);
 if(typeof module!=='undefined'&&module.exports)module.exports=pack;
})(typeof window!=='undefined'?window:globalThis);
