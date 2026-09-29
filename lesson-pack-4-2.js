/* Catalog pack for lesson 4-2. Grammar cards live in lesson42-pack.js. */
(function(root){
 'use strict';
 const verbs=[
  ['түсіну','понимать'],['бару','идти'],['жүру','ходить'],['жату','лежать'],
  ['отыру','сидеть'],['тұру','стоять'],['ашу','открывать'],['жабу','закрывать'],
  ['тігу','шить'],['сөйлеу',['разговаривать','говорить']],['жазу','писать'],
  ['кету','уходить'],['алу','брать'],['беру','давать'],['келу','приходить'],
  ['іздеу','искать'],['көру','видеть'],['кіру','входить'],['қарау','смотреть'],
  ['шығу','выходить'],['кешігу','опаздывать'],['табу','находить'],['асығу','спешить'],
  ['жұмыс істеу','работать'],['ойлау','думать'],['ойнау','играть'],['сену','верить'],
  ['күту','ждать'],['айту',['говорить','сказать']]
 ];
 const pack={
  lesson_id:'4-2',
  lesson_title:'Урок 4–2 · прошедшее время',
  dependencies:['3-3'],
  sources:{
   m42:{title:'Методичка 4-2 · прошедшее время',url:'https://drive.google.com/drive/folders/1rMemueb4Eap6YPUciXrjQtsCGzsGGhhk',lesson_id:'4-2'},
   e42:{title:'Упражнения 4-2 · прошедшее время',url:'https://drive.google.com/drive/folders/1rMemueb4Eap6YPUciXrjQtsCGzsGGhhk',lesson_id:'4-2'},
   hw42:{title:'Домашка 4-2 · прошедшее время',url:'https://drive.google.com/drive/folders/1rMemueb4Eap6YPUciXrjQtsCGzsGGhhk',lesson_id:'4-2'}
  },
  rules:[
   {id:'T35_PAST_MEANING',title:'Уже было: одна форма на делал и сделал'},
   {id:'T36_DY_TY',title:'Ды / ді / ты / ті'},
   {id:'T37_PERSON2',title:'Кто-2, не мын из 4-1'},
   {id:'T38_OL_ZERO_PAST',title:'Ол и олар без кто-2'},
   {id:'T39_PAST_ASSIM',title:'Ғ г б снова қ к п'},
   {id:'T40_PAST_NEG',title:'Не к основе, потом всегда ды/ді'},
   {id:'T41_PAST_Q',title:'Вопрос после готовой формы; да/де отдельно'},
   {id:'T42_PAST_EXCEPT',title:'Оқу есту қою сүю; жатырмын нет'}
  ],
  target_vocabulary:verbs.map(([kazakh,translation])=>({kazakh,translation:Array.isArray(translation)?translation:[translation]})),
  examples:[
   {kazakh:'Бардым.',translation:'Я пошёл / ходил.'},
   {kazakh:'Ол сөйледі.',translation:'Он говорил.'},
   {kazakh:'Достарым кешікті.',translation:'Мои друзья опоздали.'}
  ],
  original_exercises:[],
  generated_exercises:[]
 };
 if(typeof window!=='undefined')window.LESSON_PACKS=(window.LESSON_PACKS||[]).concat([pack]);
 if(typeof module!=='undefined'&&module.exports)module.exports=pack;
})(typeof window!=='undefined'?window:globalThis);
