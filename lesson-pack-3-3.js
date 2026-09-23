/* Catalog pack for lesson 3-3. Grammar cards live in lesson33-pack.js. */
(function(root){
 'use strict';
 const verbs=[
  ['келу','приходить'],['кету','уходить'],['кіру','входить'],['шығу','выходить'],
  ['іздеу','искать'],['табу','находить'],['асығу','торопиться'],['кешігу','опаздывать'],
  ['жұмыс істеу','работать'],['жазу','писать'],['сөйлеу',['разговаривать','говорить']],
  ['алу',['брать','получать']],['беру','давать'],['көру','видеть'],['қарау','смотреть']
 ];
 const pack={
  lesson_id:'3-3',
  lesson_title:'Урок 3–3 · кто и чей вместе',
  dependencies:['3-2'],
  sources:{
   m33:{title:'Банк 3–3',url:'https://docs.google.com/document/d/1RuRa5LXvtULl-iYvn97-e84eicUFmhoI01wXW-y42Xk/edit',lesson_id:'3-3'},
   e33:{title:'Gold set 3–3',url:'https://docs.google.com/document/d/1FCdu8nYY8WGs-dCXOx5SfI8wWjF31bw-6bnLansZ474/edit',lesson_id:'3-3'},
   hw33:{title:'Домашка 3–3',url:'https://docs.google.com/document/d/1oLaH6CzQIIR64VQhHxlRIgHkcPfspNstwDzU--k3020/edit',lesson_id:'3-3'}
  },
  rules:[
   {id:'T28_OWNER_SUBJECT',title:'Кто и чей — разные места'},
   {id:'T29_POSS_PERSON_STACK',title:'Сначала чьё, потом кто'},
   {id:'T30_THIRD_ZERO',title:'Ол без личного хвоста'},
   {id:'T31_EMES_STACK',title:'Емес забирает личное'},
   {id:'T32_OTBASY',title:'Отбасы без лишней сы'},
   {id:'T33_ADJ_ROLE',title:'Признак слева или справа'},
   {id:'T34_INTERROGATIVE',title:'Кім, не, қандай, қай, нешінші'}
  ],
  target_vocabulary:verbs.map(([kazakh,translation])=>({kazakh,translation:Array.isArray(translation)?translation:[translation]})),
  examples:[
   {kazakh:'Мен сенің досыңмын.',translation:'Я твой друг.'},
   {kazakh:'Ол менің досым.',translation:'Он мой друг.'},
   {kazakh:'Сен оның отбасысың.',translation:'Ты его семья.'}
  ],
  original_exercises:[],
  generated_exercises:[]
 };
 if(typeof window!=='undefined')window.LESSON_PACKS=(window.LESSON_PACKS||[]).concat([pack]);
 if(typeof module!=='undefined'&&module.exports)module.exports=pack;
})(typeof window!=='undefined'?window:globalThis);
