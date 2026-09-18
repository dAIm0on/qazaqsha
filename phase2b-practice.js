/* Phase 2B practice registry: G1 one-cell + G2 suffix completion.
   Registry only: lesson flow sequencing is wired after G1-G6 are complete. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;

 const field=(answers,label='Ответ',kind='text')=>({
  label,kind,answers:Array.isArray(answers)?answers:[answers]
 });
 function cell({id,lesson,order,topic,title,stimulus,answers,rule,error_type,explanation,label='Ответ'}){
  return {
   id,source:'p2b',group:'G1',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:[rule],
   phase2b:{genre:'G1',cell:true,lesson_order:order,error_type:error_type||''}
  };
 }
 function suffix({id,lesson,order,topic,title,stimulus,answers,rule,error_type,explanation,label='Кусок справа'}){
  return {
   id,source:'p2b',group:'G2',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:[rule],
   phase2b:{genre:'G2',suffix:true,lesson_order:order,error_type:error_type||''}
  };
 }
 function produce({id,lesson,order,topic,title='Переведи на казахский',stimulus,answers,rule,error_type,explanation,label='Ответ на казахском'}){
  return {
   id,source:'p2b',group:'G3',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G3',production:true,lesson_order:order,error_type:error_type||''}
  };
 }
 function recognize({id,lesson,order,topic,title='Переведи на русский',stimulus,answers,rule,error_type='translation_variant',explanation,label='Ответ',kind='text'}){
  return {
   id,source:'p2b',group:'G4',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label,kind)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G4',recognition:true,lesson_order:order,error_type:error_type||''}
  };
 }
 const G1={
  '1-1':[
   cell({id:'p2b-11-g1-class-ae',lesson:'1-1',order:1,topic:'sounds',title:'Одна клетка: какой ряд?',stimulus:'Ә',answers:['мягкий'],rule:'T1_HARMONY',error_type:'harmony_class',explanation:'Ә относится к мягкому ряду.'}),
   cell({id:'p2b-11-g1-class-qa',lesson:'1-1',order:1,topic:'sounds',title:'Одна клетка: какой ряд?',stimulus:'Қ',answers:['твёрдый','твердый'],rule:'T1_HARMONY',error_type:'harmony_class',explanation:'Қ относится к твёрдому ряду.'}),
   cell({id:'p2b-11-g1-pair-a',lesson:'1-1',order:2,topic:'sounds',title:'Одна клетка: парная гласная',stimulus:'А → ?',answers:['Ә','ә'],rule:'T1_HARMONY',error_type:'harmony_pair',explanation:'Пара ряда: А ↔ Ә.'}),
   cell({id:'p2b-11-g1-edge-kitap',lesson:'1-1',order:3,topic:'sounds',title:'Одна клетка: правый край',stimulus:'кітап · последний слог',answers:['тап'],rule:'T1_HARMONY',error_type:'harmony_edge',explanation:'Для выбора окончания здесь смотрим на последний слог: тап.'}),
   cell({id:'p2b-11-g1-edge-mugalim',lesson:'1-1',order:4,topic:'sounds',title:'Одна клетка: правый край',stimulus:'мұғалім · последний слог',answers:['лім'],rule:'T1_HARMONY',error_type:'harmony_edge',explanation:'Правый край — лім; он ведёт к мягкому варианту окончания.'})
  ],
  '1-2':[
   cell({id:'p2b-12-g1-kitap',lesson:'1-2',order:4,topic:'plural',title:'Одна клетка: единственное → множественное',stimulus:'кітап → ?',answers:['кітаптар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'кітап: последний слог твёрдый → А; после П начало Т → кітаптар.'}),
   cell({id:'p2b-12-g1-adam',lesson:'1-2',order:4,topic:'plural',title:'Одна клетка: единственное → множественное',stimulus:'адам → ?',answers:['адамдар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'адам: твёрдый ряд → А; после М начало Д → адамдар.'}),
   cell({id:'p2b-12-g1-zher',lesson:'1-2',order:4,topic:'plural',title:'Одна клетка: единственное → множественное',stimulus:'жер → ?',answers:['жерлер'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'жер: мягкий ряд → Е; после Р начало Л → жерлер.'})
  ],
  '1-3':[],
  '2-1':[
   cell({id:'p2b-21-g1-adam',lesson:'2-1',order:1,topic:'person',title:'Одна клетка: мен + основа',stimulus:'Мен + адам',answers:['адаммын'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'Мен + адам → адаммын. К основе добавляется личное окончание.'}),
   cell({id:'p2b-21-g1-dos',lesson:'2-1',order:1,topic:'person',title:'Одна клетка: мен + основа',stimulus:'Мен + дос',answers:['доспын'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'После С форма для мен начинается с П: доспын.'}),
   cell({id:'p2b-21-g1-qyz',lesson:'2-1',order:1,topic:'person',title:'Одна клетка: мен + основа',stimulus:'Мен + қыз',answers:['қызбын'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'Мен + қыз → қызбын.'}),
   cell({id:'p2b-21-g1-mugalim',lesson:'2-1',order:1,topic:'person',title:'Одна клетка: мен + основа',stimulus:'Мен + мұғалім',answers:['мұғаліммін'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'Мен + мұғалім → мұғаліммін.'})
  ],
  '2-2':[
   cell({id:'p2b-22-g1-dos',lesson:'2-2',order:1,topic:'person',title:'Одна клетка: біз + основа',stimulus:'Біз + дос',answers:['доспыз'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'После С форма для біз начинается с П: доспыз.'}),
   cell({id:'p2b-22-g1-adam',lesson:'2-2',order:1,topic:'person',title:'Одна клетка: біз + основа',stimulus:'Біз + адам',answers:['адамбыз'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'После М форма для біз начинается с Б: адамбыз.'}),
   cell({id:'p2b-22-g1-student',lesson:'2-2',order:1,topic:'person',title:'Одна клетка: біз + основа',stimulus:'Біз + студент',answers:['студентпіз'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Біз + студент → студентпіз.'}),
   cell({id:'p2b-22-g1-sender-student',lesson:'2-2',order:2,topic:'person',title:'Одна клетка: сендер + основа',stimulus:'Сендер + студент',answers:['студентсіңдер'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Сендер + студент → студентсіңдер. Отдельное -тар на студент не нужно.'})
  ],
  '2-3':[
   cell({id:'p2b-23-g1-qonaq',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + қонақ',answers:['қонақ'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол қонақ.'}),
   cell({id:'p2b-23-g1-mugalim',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + мұғалім',answers:['мұғалім'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол мұғалім.'}),
   cell({id:'p2b-23-g1-korshi',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + көрші',answers:['көрші'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол көрші.'})
  ]
 };
 const G2={
  '1-1':[],
  '1-2':[
   suffix({id:'p2b-12-g2-kitap',lesson:'1-2',order:1,topic:'plural',title:'Дополни окончание',stimulus:'кітап + ___',answers:['тар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'После П множественное начинается с Т; последний слог твёрдый, поэтому тар.'}),
   suffix({id:'p2b-12-g2-adam',lesson:'1-2',order:1,topic:'plural',title:'Дополни окончание',stimulus:'адам + ___',answers:['дар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'После М множественное начинается с Д; ряд твёрдый, поэтому дар.'}),
   suffix({id:'p2b-12-g2-zher',lesson:'1-2',order:1,topic:'plural',title:'Дополни окончание',stimulus:'жер + ___',answers:['лер'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'После Р начало Л; ряд мягкий, поэтому лер.'})
  ],
  '1-3':[],
  '2-1':[
   suffix({id:'p2b-21-g2-dos',lesson:'2-1',order:2,topic:'person',title:'Дополни личное окончание',stimulus:'Мен + дос + ___',answers:['пын'],rule:'T6_PERSON_SG',error_type:'person_sg_piece',explanation:'После С форма для мен начинается с П: дос + пын = доспын.'}),
   suffix({id:'p2b-21-g2-adam',lesson:'2-1',order:2,topic:'person',title:'Дополни личное окончание',stimulus:'Мен + адам + ___',answers:['мын'],rule:'T6_PERSON_SG',error_type:'person_sg_piece',explanation:'После М в этой форме: адам + мын = адаммын.'})
  ],
  '2-2':[],
  '2-3':[
   suffix({id:'p2b-23-g2-qonaq',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Ол қонақ + ___ ?',answers:['па'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Қонақ заканчивается на Қ, поэтому вопросительная частица начинается с П: па.'}),
   suffix({id:'p2b-23-g2-adam',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Ол адам + ___ ?',answers:['ба'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Адам заканчивается на М, поэтому здесь ба.'}),
   suffix({id:'p2b-23-g2-aqyldy',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Олар ақылды + ___ ?',answers:['ма'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Последнее слово оканчивается гласной; ряд твёрдый, поэтому ма.'})
  ]
 };
 const G3={
  '1-1':[],
  '1-2':[
   produce({id:'p2b-12-g3-books',lesson:'1-2',order:2,topic:'plural',stimulus:'книги',answers:['кітаптар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'Кітап во множественном числе: кітаптар.'}),
   produce({id:'p2b-12-g3-people',lesson:'1-2',order:2,topic:'plural',stimulus:'люди',answers:['адамдар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'Адам во множественном числе: адамдар.'}),
   produce({id:'p2b-12-g3-lands',lesson:'1-2',order:2,topic:'plural',stimulus:'земли',answers:['жерлер'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'Жер во множественном числе: жерлер.'}),
   produce({id:'p2b-12-g3-girls',lesson:'1-2',order:2,topic:'plural',stimulus:'девушки',answers:['қыздар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'Қыз во множественном числе: қыздар.'})
  ],
  '1-3':[
   produce({id:'p2b-13-g3-n17',lesson:'1-3',order:1,topic:'numbers',title:'Запиши число по-казахски',stimulus:'17',answers:['он жеті'],rule:'T5_NUMERAL_COMPOSE',explanation:'17 = 10 + 7 → он жеті.'}),
   produce({id:'p2b-13-g3-n32',lesson:'1-3',order:1,topic:'numbers',title:'Запиши число по-казахски',stimulus:'32',answers:['отыз екі'],rule:'T5_NUMERAL_COMPOSE',explanation:'32 = 30 + 2 → отыз екі.'}),
   produce({id:'p2b-13-g3-two-books',lesson:'1-3',order:4,topic:'plural',stimulus:'две книги',answers:['екі кітап'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'Количество уже выражено словом екі, поэтому кітап остаётся без множественного окончания.'}),
   produce({id:'p2b-13-g3-five-books',lesson:'1-3',order:4,topic:'plural',stimulus:'пять книг',answers:['бес кітап'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'После бес существительное остаётся без множественного окончания: бес кітап.'})
  ],
  '2-1':[
   produce({id:'p2b-21-g3-scientist',lesson:'2-1',order:5,topic:'person',stimulus:'Я учёный.',answers:['Мен ғалыммын.','Мен ғалыммын','Ғалыммын.','Ғалыммын'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'Мен + ғалым → Мен ғалыммын.'}),
   produce({id:'p2b-21-g3-not-doctor',lesson:'2-1',order:5,topic:'person',stimulus:'Ты не врач.',answers:['Сен дәрігер емессің.','Сен дәрігер емессің'],rule:'T7_EMES',error_type:'emes_position',explanation:'Отрицание: дәрігер + емес; личное окончание стоит на емес → емессің.'}),
   produce({id:'p2b-21-g3-polite-teacher-q',lesson:'2-1',order:5,topic:'person',stimulus:'Вы учитель?',answers:['Сіз мұғалімсіз бе?','Сіз мұғалімсіз бе'],rule:['T6_PERSON_SG','T10_QUESTION'],error_type:'question_class',explanation:'Сіз мұғалімсіз бе? Вопросительная частица стоит отдельно в конце.'})
  ],
  '2-2':[
   produce({id:'p2b-22-g3-we-friends',lesson:'2-2',order:4,topic:'person',stimulus:'Мы друзья.',answers:['Біз доспыз.','Біз доспыз'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Біз + дос → Біз доспыз.'}),
   produce({id:'p2b-22-g3-you-bosses',lesson:'2-2',order:4,topic:'person',stimulus:'Вы (сендер) начальники.',answers:['Сендер бастықсыңдар.','Сендер бастықсыңдар'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Сендер уже показывает множественность; сказуемое: бастықсыңдар.'})
  ],
  '2-3':[
   produce({id:'p2b-23-g3-he-guest-q',lesson:'2-3',order:3,topic:'person',stimulus:'Он гость?',answers:['Ол қонақ па?','Ол қонақ па'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'После ол личного окончания нет; после қ в қонақ выбираем па.'}),
   produce({id:'p2b-23-g3-he-not-teacher-q',lesson:'2-3',order:3,topic:'person',stimulus:'Он не учитель?',answers:['Ол мұғалім емес пе?','Ол мұғалім емес пе'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'Ол мұғалім емес пе? Частицу выбираем по последнему слову емес: пе.'})
  ]
 };
 const G4={
  '1-1':[],
  '1-2':[
   recognize({id:'p2b-12-g4-books',lesson:'1-2',order:3,topic:'plural',stimulus:'кітаптар',answers:['книги'],rule:'T2_PLURAL_LDT',explanation:'Кітаптар — книги.'}),
   recognize({id:'p2b-12-g4-people',lesson:'1-2',order:3,topic:'plural',stimulus:'адамдар',answers:['люди'],rule:'T2_PLURAL_LDT',explanation:'Адамдар — люди.'}),
   recognize({id:'p2b-12-g4-lands',lesson:'1-2',order:3,topic:'plural',stimulus:'жерлер',answers:['земли'],rule:'T2_PLURAL_LDT',explanation:'Жерлер — земли.'}),
   recognize({id:'p2b-12-g4-girls',lesson:'1-2',order:3,topic:'plural',stimulus:'қыздар',answers:['девушки','девочки'],rule:'T2_PLURAL_LDT',explanation:'Қыздар — девушки / девочки в зависимости от контекста.'})
  ],
  '1-3':[
   recognize({id:'p2b-13-g4-45',lesson:'1-3',order:2,topic:'numbers',title:'Запиши число цифрами',stimulus:'қырық бес',answers:['45'],rule:'T5_NUMERAL_COMPOSE',error_type:'',explanation:'Қырық = 40, бес = 5 → 45.',label:'Число',kind:'number-text'}),
   recognize({id:'p2b-13-g4-17',lesson:'1-3',order:2,topic:'numbers',title:'Запиши число цифрами',stimulus:'он жеті',answers:['17'],rule:'T5_NUMERAL_COMPOSE',error_type:'',explanation:'Он = 10, жеті = 7 → 17.',label:'Число',kind:'number-text'})
  ],
  '2-1':[],
  '2-2':[],
  '2-3':[]
 };

 function clone(q){return JSON.parse(JSON.stringify(q));}
 function cardsFor(lessonId,genre='G1'){
  const bank=genre==='G1'?G1:genre==='G2'?G2:genre==='G3'?G3:genre==='G4'?G4:null;
  return bank?(bank[lessonId]||[]).map(clone):[];
 }
 function allG1(){return Object.keys(G1).flatMap(id=>cardsFor(id,'G1'));}
 function allG2(){return Object.keys(G2).flatMap(id=>cardsFor(id,'G2'));}
 function allG3(){return Object.keys(G3).flatMap(id=>cardsFor(id,'G3'));}
 function allG4(){return Object.keys(G4).flatMap(id=>cardsFor(id,'G4'));}
 function all(){return [...allG1(),...allG2(),...allG3(),...allG4()];}
 function byId(id){return all().find(q=>q.id===id)||null;}
 function checkCell(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Phase 2B card/core unavailable');
  const answers=[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function install(course){
  if(!course||!Array.isArray(course.questions))return [];
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of all()){
   if(known.has(q.id))continue;
   course.questions.push(clone(q));known.add(q.id);added.push(q.id);
  }
  return added;
 }
 const api={G1,G2,G3,G4,cardsFor,allG1,allG2,allG3,allG4,all,byId,checkCell,checkTask:checkCell,install};
 if(node)module.exports=api;else root.Phase2BPractice=api;
})(typeof window!=='undefined'?window:globalThis);
