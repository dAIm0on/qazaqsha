/* Links to the full texts the author named. Not a copy of those files and not explain-bank medium. */
(function(root){
 'use strict';
 const L31=[
  {title:'S31. Менің, сенің, оның',url:'https://drive.google.com/file/d/1ARCqTuPPWGbE_bza36x8CDr6bZWWHYzT/view',note:'Первый полный текст урока 3–1.'},
  {title:'Методичка 3–1',url:'https://drive.google.com/file/d/1B2c2UJKpvBvty-LhSlkoC8ubPGZC9-aQ/view'},
  {title:'Упражнения 3–1',url:'https://drive.google.com/file/d/1SXf2AzFXedKI_VpCyhqlAO_1DyvkRI1E/view'},
  {title:'Домашка 3–1',url:'https://drive.google.com/file/d/1X2BqOVav3sb01ni8MIe4f-J-JO2UHAyo/view'},
  {title:'Конструктор: 7 шагов, 8 рецептов',url:'https://drive.google.com/file/d/1FwEG-5kO_qnwhJuYA9ePFLexFlNKsG1l/view'}
 ];
 const T2=[{title:'Ученик. Множественное',url:'https://drive.google.com/file/d/1BWSkmMB0nxTS4mEddNkN-LVG6zv-nKv-/view',note:'Ученический файл. Его номер не склеивать с номером банка.'}];
 const FACE=[{title:'Ученик. Лицо и емес',url:'https://drive.google.com/file/d/1SDBw6ZV3-FpPEjMs1l9nJrzUxFBjEq8i/view',note:'Файл называется T3. Это не Bank T3 и не GRAM_T3.'}];
 const ASK=[{title:'Ученик. Вопрос',url:'https://drive.google.com/file/d/11Z2iSP8VYKDIQTWaxQVlH27ciWpuMzz-/view',note:'Файл называется T14. В банке вопрос записан как T10. Номера не склеивать.'}];
 const GRAM=[{title:'Индекс GRAM',url:'https://drive.google.com/file/d/1_GnQic7ePVPQt_bzbCoT8b5YlncfMlNU/view',note:'Указатель папки исследований. Это не полный текст одного правила.'}];
 const MAP={
  T20_POSS:L31,T21_POSS_ASSIM:L31,T22_BAR_ZHOK:L31,T23_POSS_PL:L31,
  T2_PLURAL_LDT:T2,
  T6_PERSON_SG:FACE,T7_EMES:FACE,T8_PERSON_PL:FACE,
  T10_QUESTION:ASK
 };
 function forRule(id){
  const rows=(MAP[id]||(id?GRAM:[])).map(row=>Object.assign({},row));
  if(id==='T21_POSS_ASSIM'&&rows[0])rows[0].note=(rows[0].note?rows[0].note+' ':'')+'Ключи оқушысым и доссы и формулировка T21 спорны, не исправлять.';
  return rows;
 }
 const api={forRule,MAP};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.FullSources=api;
})(typeof window!=='undefined'?window:globalThis);
