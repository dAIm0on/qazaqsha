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
 function finish(q,extra){
  if(!extra)return q;
  if(extra.skills)q.skillBindings=extra.skills;
  if(extra.practiceOnly)q.practiceOnly=true;
  return q;
 }
 const skill=(item,type)=>({item_id:item,skill_type:type,field:0,facet:null});
 function cell({id,lesson,order,topic,title,stimulus,answers,rule,error_type,explanation,label='Ответ',extra}){
  return finish({
   id,source:'p2b',group:'G1',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G1',cell:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 function suffix({id,lesson,order,topic,title,stimulus,answers,rule,error_type,explanation,label='Кусок справа',extra}){
  return finish({
   id,source:'p2b',group:'G2',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G2',suffix:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 function produce({id,lesson,order,topic,title='Переведи на казахский',stimulus,answers,rule,error_type,explanation,label='Ответ на казахском',extra}){
  return finish({
   id,source:'p2b',group:'G3',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G3',production:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 function recognize({id,lesson,order,topic,title='Переведи на русский',stimulus,answers,rule,error_type='translation_variant',explanation,label='Ответ',kind='text',extra}){
  return finish({
   id,source:'p2b',group:'G4',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label,kind)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G4',recognition:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 function transform({id,lesson,order,topic,title,stimulus,answers,rule,error_type,explanation,label='Новая форма',extra}){
  return finish({
   id,source:'p2b',group:'G5',part:String(order),lessonId:lesson,topic,kind:'fields',
   title,stimulus,fields:[field(answers,label)],explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G5',transform:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 function rewrite({id,lesson,order,topic,stimulus,answers,fields,rule,error_type,explanation,label='Исправленная форма',extra}){
  return finish({
   id,source:'p2b',group:'G6',part:String(order),lessonId:lesson,topic,kind:'fields',
   title:'Найди ошибку и перепиши',stimulus,
   fields:fields?fields.map(x=>field(x.answers,x.label||'Ответ',x.kind||'text')):[field(answers,label)],
   explanation,ruleIds:Array.isArray(rule)?rule:[rule],
   phase2b:{genre:'G6',rewrite:true,lesson_order:order,error_type:error_type||''}
  },extra);
 }
 const HOMEWORK={
  '1-1':['p2b-11-g1-edge-kitap','p2b-11-g6-kitap-edge'],
  '1-2':['p2b-12-g2-kitap','p2b-12-g3-people','p2b-12-g6-kitaplar'],
  '1-3':['p2b-13-g3-n32','p2b-13-g3-two-books','p2b-13-g6-eki-kitaptar'],
  '2-1':['p2b-21-g3-scientist','p2b-21-g5-neg-qyz','p2b-21-g6-dosmyn'],
  '2-2':['p2b-22-g3-we-friends','p2b-22-g5-neg-reader','p2b-22-g6-adammiz'],
  '2-3':['p2b-23-g2-qonaq','p2b-23-g3-he-guest-q','p2b-23-g6-konak-ba']
 };
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
   cell({id:'p2b-22-g1-sender-student',lesson:'2-2',order:2,topic:'person',title:'Одна клетка: сендер + основа',stimulus:'Сендер + студент',answers:['студентсіңдер'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Сендер + студент → студентсіңдер. Отдельное -тар на студент не нужно.'}),
   cell({id:'p2b-22-g1-adj-aqyldy',lesson:'2-2',order:5,topic:'person',title:'Признак как сказуемое',stimulus:'Біз + ақылды',answers:['ақылдымыз'],rule:['T8_PERSON_PL','T8_ADJ_PRED'],error_type:'person_pl_form',explanation:'Ақылды — сказуемое-признак. Біз + ақылды → ақылдымыз.'})
  ],
  '2-3':[
   cell({id:'p2b-23-g1-qonaq',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + қонақ',answers:['қонақ'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол қонақ.'}),
   cell({id:'p2b-23-g1-mugalim',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + мұғалім',answers:['мұғалім'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол мұғалім.'}),
   cell({id:'p2b-23-g1-korshi',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: ол + основа',stimulus:'Ол + көрші',answers:['көрші'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После ол личного окончания нет: ол көрші.'}),
   cell({id:'p2b-23-g1-olar-semiz',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: олар + основа',stimulus:'Олар + семіз',answers:['семіз'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После олар личного окончания нет: олар семіз.',extra:{practiceOnly:true,skills:[skill('rule:T9_OL','application')]}}),
   cell({id:'p2b-23-g1-olar-maman',lesson:'2-3',order:1,topic:'person',title:'Одна клетка: олар + основа',stimulus:'Олар + маман',answers:['маман'],rule:'T9_OL',error_type:'ol_suffix',explanation:'После олар личного окончания нет: олар маман.',extra:{practiceOnly:true,skills:[skill('rule:T9_OL','application')]}})
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
   suffix({id:'p2b-23-g2-aqyldy',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Олар ақылды + ___ ?',answers:['ма'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Последнее слово оканчивается гласной; ряд твёрдый, поэтому ма.'}),
   suffix({id:'p2b-23-g2-ordinal20',lesson:'2-3',order:4,topic:'numbers',title:'Сделай порядковое число',stimulus:'жиырма → ___',answers:['жиырмасыншы'],rule:'T11_ORDINAL',error_type:'ordinal_20',explanation:'20-й — жиырмасыншы. Это закреплённая форма курса.',label:'Порядковая форма'}),
   suffix({id:'p2b-23-g2-zhigit',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Ол жігіт + ___ ?',answers:['пе'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Жігіт мягкое и заканчивается на Т, поэтому пе.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   suffix({id:'p2b-23-g2-semiz',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Ол семіз + ___ ?',answers:['бе'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Семіз заканчивается на З, ряд твёрдый, поэтому бе.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   suffix({id:'p2b-23-g2-emes',lesson:'2-3',order:2,topic:'person',title:'Дополни вопросительную частицу',stimulus:'Олар туыс емес + ___ ?',answers:['пе'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Частица смотрит на емес: мягкое С даёт пе.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   suffix({id:'p2b-23-g2-bir',lesson:'2-3',order:4,topic:'numbers',title:'Сделай порядковое число',stimulus:'бір → ___',answers:['бірінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Р — согласная, бір мягкое → інші.',label:'Порядковая форма',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}}),
   suffix({id:'p2b-23-g2-eki',lesson:'2-3',order:4,topic:'numbers',title:'Сделай порядковое число',stimulus:'екі → ___',answers:['екінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'І — гласная, поэтому короткая нші.',label:'Порядковая форма',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}}),
   suffix({id:'p2b-23-g2-alty',lesson:'2-3',order:4,topic:'numbers',title:'Сделай порядковое число',stimulus:'алты → ___',answers:['алтыншы'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Алты заканчивается на ы. Это гласная: алты + ншы → алтыншы.',label:'Порядковая форма',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}}),
   suffix({id:'p2b-23-g2-qyryq',lesson:'2-3',order:4,topic:'numbers',title:'Сделай порядковое число',stimulus:'қырық → ___',answers:['қырқыншы'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'40-й в курсе — қырқыншы.',label:'Порядковая форма',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}}),
   suffix({id:'p2b-23-g2-eki-piece',lesson:'2-3',order:4,topic:'numbers',title:'Какая наклейка после гласной?',stimulus:'екі + ___',answers:['нші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'После гласной в екі нужна нші. Інші здесь не принимается.',label:'Наклейка',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}})
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
   {id:'p2b-13-g3-phone',source:'p2b',group:'G3',part:'3',lessonId:'1-3',topic:'numbers',kind:'fields',title:'Запиши четыре группы словами',stimulus:'+7 711 388 00 11',fields:[field(['жеті жүз он бір'],'Группа 1'),field(['үш жүз сексен сегіз'],'Группа 2'),field(['нөл нөл'],'Группа 3'),field(['он бір'],'Группа 4')],explanation:'+7 — код страны. Проверяем четыре группы после него; ведущие нули сохраняются.',ruleIds:['PHONE_GROUPS'],phase2b:{genre:'G3',production:true,lesson_order:3,error_type:''}},
   produce({id:'p2b-13-g3-two-books',lesson:'1-3',order:4,topic:'plural',stimulus:'две книги',answers:['екі кітап'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'Количество уже выражено словом екі, поэтому кітап остаётся без множественного окончания.'}),
   produce({id:'p2b-13-g3-five-books',lesson:'1-3',order:4,topic:'plural',stimulus:'пять книг',answers:['бес кітап'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'После бес существительное остаётся без множественного окончания: бес кітап.'})
  ],
  '2-1':[
   produce({id:'p2b-21-g3-scientist',lesson:'2-1',order:5,topic:'person',stimulus:'Я учёный.',answers:['Мен ғалыммын.','Мен ғалыммын','Ғалыммын.','Ғалыммын'],rule:'T6_PERSON_SG',error_type:'person_sg_form',explanation:'Мен + ғалым → Мен ғалыммын.'}),
   produce({id:'p2b-21-g3-not-doctor',lesson:'2-1',order:5,topic:'person',stimulus:'Ты не врач.',answers:['Сен дәрігер емессің.','Сен дәрігер емессің'],rule:'T7_EMES',error_type:'emes_position',explanation:'Отрицание: дәрігер + емес; личное окончание стоит на емес → емессің.'}),
   produce({id:'p2b-21-g3-polite-teacher-q',lesson:'2-1',order:5,topic:'person',stimulus:'Вы учитель?',answers:['Сіз мұғалімсіз бе?','Сіз мұғалімсіз бе'],rule:'T6_PERSON_SG',error_type:'question_class',explanation:'Сіз мұғалімсіз бе? Вопросительная частица стоит отдельно в конце.'})
  ],
  '2-2':[
   produce({id:'p2b-22-g3-we-friends',lesson:'2-2',order:4,topic:'person',stimulus:'Мы друзья.',answers:['Біз доспыз.','Біз доспыз'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Біз + дос → Біз доспыз.'}),
   produce({id:'p2b-22-g3-you-bosses',lesson:'2-2',order:4,topic:'person',stimulus:'Вы (сендер) начальники.',answers:['Сендер бастықсыңдар.','Сендер бастықсыңдар'],rule:'T8_PERSON_PL',error_type:'person_pl_form',explanation:'Сендер уже показывает множественность; сказуемое: бастықсыңдар.'})
  ],
  '2-3':[
   produce({id:'p2b-23-g3-he-guest-q',lesson:'2-3',order:3,topic:'person',stimulus:'Он гость?',answers:['Ол қонақ па?','Ол қонақ па'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'После ол личного окончания нет; после қ в қонақ выбираем па.'}),
   produce({id:'p2b-23-g3-he-not-teacher-q',lesson:'2-3',order:3,topic:'person',stimulus:'Он не учитель?',answers:['Ол мұғалім емес пе?','Ол мұғалім емес пе'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'Ол мұғалім емес пе? Частицу выбираем по последнему слову емес: пе.'}),
   produce({id:'p2b-23-g3-they-smart',lesson:'2-3',order:3,topic:'person',stimulus:'Они умные?',answers:['Олар ақылды ма?','Олар ақылды ма'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'Олар без личного окончания. Ақылды на гласную, твёрдый ряд → ма.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   produce({id:'p2b-23-g3-they-not-kin',lesson:'2-3',order:3,topic:'person',stimulus:'Они не родственники?',answers:['Олар туыстар емес пе?','Олар туыстар емес пе'],rule:['T9_OL','T10_QUESTION'],error_type:'question_class',explanation:'Частица смотрит на емес: пе.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   produce({id:'p2b-23-g3-you-colleague',lesson:'2-3',order:3,topic:'person',stimulus:'Ты коллега?',answers:['Сен әріптессің бе?','Сен әріптессің бе'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Личная форма уже собрана. После ң в этом вопросе бе.',extra:{practiceOnly:true,skills:[skill('rule:T10_QUESTION','application')]}}),
   produce({id:'p2b-23-g3-sender-generous',lesson:'2-3',order:3,topic:'person',stimulus:'Вы (сендер) щедрые?',answers:['Сендер жомартсыңдар ма?','Сендер жомартсыңдар ма'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Сыңдар кончается на р, поэтому ма.',extra:{practiceOnly:true,skills:[skill('rule:person-q','class')]}}),
   produce({id:'p2b-23-g3-ord-12',lesson:'2-3',order:5,topic:'numbers',stimulus:'12-й',answers:['он екінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Порядковая наклейка только на последнем слове: он екінші.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','last_component')]}}),
   produce({id:'p2b-23-g3-ord-21',lesson:'2-3',order:5,topic:'numbers',stimulus:'21-й',answers:['жиырма бірінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Жиырма бірінші проверяет последний компонент, не форму жиырмасыншы.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','last_component')]}}),
   produce({id:'p2b-23-g3-ord-41',lesson:'2-3',order:5,topic:'numbers',stimulus:'41-й',answers:['қырық бірінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Наклейка на бірінші, қырық остаётся.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','last_component')]}}),
   produce({id:'p2b-23-g3-i-first',lesson:'2-3',order:5,topic:'numbers',stimulus:'Я первый',answers:['біріншімін','Мен біріншімін'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Сначала порядковое, потом знакомая бирка мен.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','application')]}}),
   produce({id:'p2b-23-g3-i-twentieth',lesson:'2-3',order:5,topic:'numbers',stimulus:'Я двадцатый',answers:['жиырмасыншымын','Мен жиырмасыншымын'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Исключение 20-го плюс бирка мен: жиырмасыншымын.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','application')]}}),
   produce({id:'p2b-23-g3-you-42',lesson:'2-3',order:5,topic:'numbers',stimulus:'Вы (сендер) 42-е',answers:['қырық екіншісіңдер','Сендер қырық екіншісіңдер'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Наклейка на последнем компоненте, затем сыңдар.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','last_component')]}}),
   produce({id:'p2b-23-g3-bye-sen',lesson:'2-3',order:6,topic:'person',title:'Готовая фраза прощания',stimulus:'До свидания одному на ты',answers:['сау бол'],rule:'T9_OL',error_type:'farewell_address',explanation:'Сен → сау бол. Глагол бол не разбираем.',extra:{practiceOnly:true,skills:[skill('rule:farewell','application')]}}),
   produce({id:'p2b-23-g3-bye-sizder',lesson:'2-3',order:6,topic:'person',title:'Готовая фраза прощания',stimulus:'До свидания многим уважительно',answers:['сау болыңыздар'],rule:'T9_OL',error_type:'farewell_address',explanation:'Сіздер → сау болыңыздар. Это чанк, не урок императива.',extra:{practiceOnly:true,skills:[skill('rule:farewell','application')]}})
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
  '2-3':[
   recognize({id:'p2b-23-g4-olar-semiz',lesson:'2-3',order:7,topic:'person',stimulus:'Олар семіз',answers:['они толстые','они толстые.'],rule:'T9_OL',explanation:'Олар семіз — они толстые. Личного окончания нет.',extra:{practiceOnly:true,skills:[skill('rule:T9_OL','recognition')]}}),
   recognize({id:'p2b-23-g4-i-twentieth',lesson:'2-3',order:7,topic:'numbers',stimulus:'Жиырмасыншымын',answers:['я двадцатый','я двадцатая'],rule:'T11_ORDINAL',explanation:'Жиырмасыншымын — я двадцатый.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','recognition')]}}),
   recognize({id:'p2b-23-g4-bye-sender',lesson:'2-3',order:7,topic:'person',stimulus:'Сау болыңдар',answers:['до свидания нескольким на ты','до свидания своим многим'],rule:'T9_OL',explanation:'Сау болыңдар — прощание с несколькими на ты.',extra:{practiceOnly:true,skills:[skill('rule:farewell','recognition')]}}),
   recognize({id:'p2b-23-g4-bye-siz',lesson:'2-3',order:7,topic:'person',stimulus:'Сау болыңыз',answers:['до свидания одному уважительно','до свидания одному на вы'],rule:'T9_OL',explanation:'Сау болыңыз — прощание одному уважительно.',extra:{practiceOnly:true,skills:[skill('rule:farewell','recognition')]}})
  ]
 };
 const G5={
  '1-1':[],
  '1-2':[],
  '1-3':[],
  '2-1':[
   transform({id:'p2b-21-g5-neg-qyz',lesson:'2-1',order:3,topic:'person',title:'Сделай отрицание',stimulus:'Қызбын.',answers:['Қыз емеспін.','Қыз емеспін'],rule:'T7_EMES',error_type:'emes_position',explanation:'Отрицание строится через емес; личное окончание стоит на емес: қыз емеспін.'}),
   transform({id:'p2b-21-g5-question-doctor',lesson:'2-1',order:4,topic:'person',title:'Сделай вопрос',stimulus:'Мен дәрігермін.',answers:['Мен дәрігермін бе?','Мен дәрігермін бе'],rule:'T6_PERSON_SG',error_type:'question_class',explanation:'Вопросительная частица стоит отдельным словом в конце: Мен дәрігермін бе?'})
  ],
  '2-2':[
   transform({id:'p2b-22-g5-neg-reader',lesson:'2-2',order:3,topic:'person',title:'Сделай отрицание',stimulus:'Оқырмансыңдар.',answers:['Оқырман емессіңдер.','Оқырман емессіңдер'],rule:['T8_PERSON_PL','T7_EMES'],error_type:'emes_position',explanation:'При отрицании личное окончание стоит на емес: оқырман емессіңдер.'}),
   transform({id:'p2b-22-g5-neg-students',lesson:'2-2',order:3,topic:'person',title:'Сделай отрицание',stimulus:'Біз студентпіз.',answers:['Біз студент емеспіз.','Біз студент емеспіз'],rule:['T8_PERSON_PL','T7_EMES'],error_type:'emes_position',explanation:'Біз студент емеспіз: показатель лица стоит на емес.'})
  ],
  '2-3':[
   transform({id:'p2b-23-g5-ol-teacher',lesson:'2-3',order:8,topic:'person',title:'Замени мен на ол',stimulus:'Мен мұғаліммін',answers:['Ол мұғалім','Ол мұғалім.'],rule:'T9_OL',error_type:'ol_suffix',explanation:'Меняется один слой: ол не берёт личное окончание.',extra:{practiceOnly:true,skills:[skill('rule:T9_OL','application')]}}),
   transform({id:'p2b-23-g5-eki-ord',lesson:'2-3',order:8,topic:'numbers',title:'Сделай порядковым',stimulus:'екі',answers:['екінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Один слой: екі → екінші.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}}),
   transform({id:'p2b-23-g5-21-ord',lesson:'2-3',order:8,topic:'numbers',title:'Сделай порядковым',stimulus:'жиырма бір',answers:['жиырма бірінші'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Наклейка только на бір. Это не жиырмасыншы.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','last_component')]}}),
   transform({id:'p2b-23-g5-i-first',lesson:'2-3',order:8,topic:'numbers',title:'Скажи «я первый»',stimulus:'бірінші',answers:['біріншімін','Мен біріншімін'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'Один добавленный слой: бирка мен.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','application')]}})
  ]
 };
 const G6={
  '1-1':[
   rewrite({id:'p2b-11-g6-kitap-edge',lesson:'1-1',order:5,topic:'sounds',stimulus:'«кітап — мягкое, потому что кі»',fields:[{label:'Какой слог решает?',answers:['тап']},{label:'Какой ряд?',answers:['твёрдый','твердый']}],rule:'T1_HARMONY',error_type:'harmony_wrong_edge',explanation:'Ошибка в выборе края: ты посмотрела на начало. Для окончания решает тап, поэтому ряд твёрдый.'})
  ],
  '1-2':[
   rewrite({id:'p2b-12-g6-kitaplar',lesson:'1-2',order:5,topic:'plural',stimulus:'кітаплар',answers:['кітаптар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'Ты выбрала -лар. После П множественное начинается с Т, поэтому кітаптар.'}),
   rewrite({id:'p2b-12-g6-adamlar',lesson:'1-2',order:5,topic:'plural',stimulus:'адамлар',answers:['адамдар'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'После М множественное начинается с Д: адамдар.'}),
   rewrite({id:'p2b-12-g6-zherder',lesson:'1-2',order:5,topic:'plural',stimulus:'жердер',answers:['жерлер'],rule:'T2_PLURAL_LDT',error_type:'plural_form',explanation:'После Р множественное начинается с Л; мягкий ряд даёт Е: жерлер.'})
  ],
  '1-3':[
   rewrite({id:'p2b-13-g6-kop-adamdar',lesson:'1-3',order:5,topic:'plural',stimulus:'көп адамдар',answers:['көп адам'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'После көп отдельное множественное окончание не нужно: көп адам.'}),
   rewrite({id:'p2b-13-g6-eki-kitaptar',lesson:'1-3',order:5,topic:'plural',stimulus:'екі кітаптар',answers:['екі кітап'],rule:'T4_NO_PLURAL_AFTER_NUMBER',error_type:'plural_after_numeral',explanation:'После числа екі множественное окончание не ставится: екі кітап.'})
  ],
  '2-1':[
   rewrite({id:'p2b-21-g6-dosmyn',lesson:'2-1',order:6,topic:'person',stimulus:'досмын',answers:['доспын'],rule:'T6_PERSON_SG',error_type:'person_sg_initial',explanation:'Ты выбрала М. После С форма для мен начинается с П: доспын.'}),
   rewrite({id:'p2b-21-g6-missing-person',lesson:'2-1',order:6,topic:'person',stimulus:'Мен дәрігер',answers:['Мен дәрігермін','Мен дәрігермін.'],rule:'T6_PERSON_SG',error_type:'person_marker_missing',explanation:'В этой фразе не хватает личного окончания: Мен дәрігермін.'}),
   rewrite({id:'p2b-21-g6-emesbin',lesson:'2-1',order:6,topic:'person',stimulus:'қыз емесбін',answers:['қыз емеспін'],rule:'T7_EMES',error_type:'person_sg_initial',explanation:'Смотри на край емес: он заканчивается на С, поэтому ПІН → қыз емеспін.'})
  ],
  '2-2':[
   rewrite({id:'p2b-22-g6-adammiz',lesson:'2-2',order:6,topic:'person',stimulus:'Біз адаммыз',answers:['Біз адамбыз','Біз адамбыз.'],rule:'T8_PERSON_PL',error_type:'person_biz_initial',explanation:'После М в форме біз начало Б: адамбыз.'}),
   rewrite({id:'p2b-22-g6-dostar',lesson:'2-2',order:6,topic:'person',stimulus:'Сендер достарсыңдар',answers:['Сендер доссыңдар','Сендер доссыңдар.'],rule:'T8_PERSON_PL',error_type:'plural_on_predicate',explanation:'Лишнее -тар: сендер уже показывает, что людей несколько. Нужно: Сендер доссыңдар.'})
  ],
  '2-3':[
   rewrite({id:'p2b-23-g6-ol-mugalimmin',lesson:'2-3',order:9,topic:'person',stimulus:'Ол мұғаліммін',answers:['Ол мұғалім','Ол мұғалім.'],rule:'T9_OL',error_type:'ol_suffix',explanation:'Лишнее -мін: у ол личного окончания нет. Нужно: Ол мұғалім.'}),
   rewrite({id:'p2b-23-g6-konak-ba',lesson:'2-3',order:9,topic:'person',stimulus:'Ол қонақ ба?',answers:['Ол қонақ па?','Ол қонақ па'],rule:'T10_QUESTION',error_type:'question_class',explanation:'Қонақ заканчивается на Қ, поэтому вопросительная частица начинается с П: қонақ па?'}),
   rewrite({id:'p2b-23-g6-missing-question',lesson:'2-3',order:9,topic:'person',stimulus:'Ол қонақ?',answers:['Ол қонақ па?','Ол қонақ па'],rule:'T10_QUESTION',error_type:'question_particle_missing',explanation:'Для закрытого вопроса здесь нужна отдельная частица: Ол қонақ па?'}),
   rewrite({id:'p2b-23-g6-zhyirman',lesson:'2-3',order:9,topic:'numbers',stimulus:'Олар жиырманшы ма?',answers:['Олар жиырмасыншы ма?','Олар жиырмасыншы ма'],rule:'T11_ORDINAL',error_type:'ordinal_20',explanation:'20-й — жиырмасыншы, не жиырманшы.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','exception_20')]}}),
   rewrite({id:'p2b-23-g6-qyryqynshy',lesson:'2-3',order:9,topic:'numbers',stimulus:'Қырықыншы',answers:['Қырқыншы'],rule:'T11_ORDINAL',error_type:'ordinal',explanation:'40-й в курсе пишется қырқыншы.',extra:{practiceOnly:true,skills:[skill('rule:ordinal','suffix_family')]}})
  ]
 };
 function clone(q){return JSON.parse(JSON.stringify(q));}
 function cardsFor(lessonId,genre='G1'){
  const bank=genre==='G1'?G1:genre==='G2'?G2:genre==='G3'?G3:genre==='G4'?G4:genre==='G5'?G5:genre==='G6'?G6:null;
  return bank?(bank[lessonId]||[]).map(clone):[];
 }
 function allG1(){return Object.keys(G1).flatMap(id=>cardsFor(id,'G1'));}
 function allG2(){return Object.keys(G2).flatMap(id=>cardsFor(id,'G2'));}
 function allG3(){return Object.keys(G3).flatMap(id=>cardsFor(id,'G3'));}
 function allG4(){return Object.keys(G4).flatMap(id=>cardsFor(id,'G4'));}
 function allG5(){return Object.keys(G5).flatMap(id=>cardsFor(id,'G5'));}
 function allG6(){return Object.keys(G6).flatMap(id=>cardsFor(id,'G6'));}
 function all(){return [...allG1(),...allG2(),...allG3(),...allG4(),...allG5(),...allG6()];}
 function byId(id){return all().find(q=>q.id===id)||null;}
 function homeworkIdsFor(lessonId){return (HOMEWORK[lessonId]||[]).slice();}
 function homeworkFor(lessonId){return homeworkIdsFor(lessonId).map(byId).filter(Boolean);}
 function checkCell(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Phase 2B card/core unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function lessonSession(lessonId){
  const priority={G1:1,G2:2,G3:3,G4:4,G5:5,G6:6};
  return ['G1','G2','G3','G4','G5','G6']
   .flatMap(g=>cardsFor(lessonId,g))
   .sort((a,b)=>{
    const ao=Number(a.phase2b&&a.phase2b.lesson_order||99),bo=Number(b.phase2b&&b.phase2b.lesson_order||99);
    if(ao!==bo)return ao-bo;
    return (priority[a.phase2b&&a.phase2b.genre]||99)-(priority[b.phase2b&&b.phase2b.genre]||99);
   });
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
 const api={G1,G2,G3,G4,G5,G6,HOMEWORK,cardsFor,allG1,allG2,allG3,allG4,allG5,allG6,all,byId,homeworkIdsFor,homeworkFor,checkCell,checkTask:checkCell,install,lessonSession};
 if(node)module.exports=api;
 else{
  root.Phase2BPractice=api;
  if(root.COURSE)install(root.COURSE);
 }
})(typeof window!=='undefined'?window:globalThis);
