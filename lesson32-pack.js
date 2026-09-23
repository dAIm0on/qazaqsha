/* Lesson 3-2 pack. Sessions A–H from S32. Texts from explain-bank T24–T27. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;

 function clone(x){return JSON.parse(JSON.stringify(x));}
 function field({id,order,title,stimulus,answers,rule,error_type,explanation,kind='fields',session='A',fieldKind='text'}){
  return {
   id,source:'phase3-32',group:'3-2-'+session,part:String(order),lessonId:'3-2',topic:'possessive',kind,
   title,stimulus,
   fields:[{label:'Ответ',kind:fieldKind,answers:Array.isArray(answers)?answers:[answers]}],
   explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   vocabIds:[],
   practiceOnly:true,
   phase3:{lesson:'3-2',session,order,error_type,closed_pack:false}
  };
 }

 const SESSION_A=[
  field({id:'p3-32-a-g2-ake',order:1,title:'Біздің: собери форму',stimulus:'Біздің + әке → ?',
   answers:['әкеміз','біздің әкеміз'],rule:'T24_POSS_BIZ',error_type:'POSS_NO_SUFFIX',
   explanation:'Біздің + әке → әкеміз. Наклейка как у сіздің, Ң→М.'}),
  field({id:'p3-32-a-g2-ui',order:2,title:'Біздің: собери форму',stimulus:'Біздің + үй → ?',
   answers:['үйіміз','біздің үйіміз'],rule:'T24_POSS_BIZ',error_type:'POSS_NO_SUFFIX',
   explanation:'Біздің + үй → үйіміз.'}),
  field({id:'p3-32-a-g2-kolik',order:3,title:'Біздің: озвончение',stimulus:'Біздің + көлік → ?',
   answers:['көлігіміз','біздің көлігіміз'],rule:['T24_POSS_BIZ','T21_POSS_ASSIM'],error_type:'POSS_ASSIM',
   explanation:'көлік + іміз → көлігіміз: к→г.'}),
  field({id:'p3-32-a-g2-mektep',order:4,title:'Біздің: озвончение',stimulus:'Біздің + мектеп → ?',
   answers:['мектебіміз','біздің мектебіміз'],rule:['T24_POSS_BIZ','T21_POSS_ASSIM'],error_type:'POSS_ASSIM',
   explanation:'мектеп + іміз → мектебіміз: п→б.'}),
  field({id:'p3-32-a-g2-bala',order:5,title:'Біздің баламыз — ребёнок',stimulus:'Біздің + бала → ? (один ребёнок)',
   answers:['баламыз','біздің баламыз'],rule:'T24_POSS_BIZ',error_type:'POSS_NO_SUFFIX',
   explanation:'баламыз = наш ребёнок. Наши дети = балаларымыз. Не копировать подпись «дети» на баламыз.'}),
  field({id:'p3-32-a-g6-ake',order:6,title:'Найди ошибку и перепиши',stimulus:'Біздің әке',
   answers:['біздің әкеміз','әкеміз'],rule:'T24_POSS_BIZ',error_type:'POSS_NO_SUFFIX',
   explanation:'Для біздің нужна наклейка справа: әке → әкеміз.'}),
  field({id:'p3-32-a-g6-kolikimiz',order:7,title:'Исправь озвончение',stimulus:'біздің көлікіміз',
   answers:['біздің көлігіміз','көлігіміз'],rule:['T24_POSS_BIZ','T21_POSS_ASSIM'],error_type:'POSS_ASSIM',
   explanation:'Перед гласной наклейкой к озвончается: көлігіміз, не *көлікіміз.'}),
  field({id:'p3-32-a-g6-sumiz',order:8,title:'Исправь стык',stimulus:'біздің суміз',
   answers:['біздің суымыз','суымыз'],rule:'T24_POSS_BIZ',error_type:'POSS_GLIDE',
   explanation:'У — согласный. Нужна связка ы: суымыз, не *суміз.'})
 ];

 const SESSION_B=[
  field({id:'p3-32-b-g2-kitap',order:1,session:'B',title:'Сначала много, потом чьё',stimulus:'Біздің + кітаптар → ?',
   answers:['кітаптарымыз','біздің кітаптарымыз'],rule:['T24_POSS_BIZ','T23_POSS_PL'],error_type:'POSS_ORDER',
   explanation:'кітап + тар + ымыз → кітаптарымыз.'}),
  field({id:'p3-32-b-g2-bas',order:2,session:'B',title:'Тело 1 лица без «много»',stimulus:'Біздің + бас → ?',
   answers:['басымыз','біздің басымыз'],rule:'T24_POSS_BIZ',error_type:'POSS_NO_SUFFIX',
   explanation:'Части тела в 1 лице обычно без «много»: басымыз. бастарымыз — акцент «много», не единственная норма.'}),
  field({id:'p3-32-b-g2-ayak',order:3,session:'B',title:'Тело 1 лица без «много»',stimulus:'Біздің + аяқ → ?',
   answers:['аяғымыз','біздің аяғымыз'],rule:['T24_POSS_BIZ','T21_POSS_ASSIM'],error_type:'POSS_ASSIM',
   explanation:'аяқ + ымыз → аяғымыз. *аяқтарымыз не единственный ответ.'}),
  field({id:'p3-32-b-g6-order',order:4,session:'B',title:'Исправь порядок',stimulus:'біздің кітабымыздар',
   answers:['біздің кітаптарымыз','кітаптарымыз'],rule:['T24_POSS_BIZ','T23_POSS_PL'],error_type:'POSS_ORDER',
   explanation:'Не кітабымыз + дар. Сначала тар, потом ымыз: кітаптарымыз.'})
 ];

 const SESSION_C=[
  field({id:'p3-32-c-g2-dos',order:1,session:'C',title:'Сендердің: в модели урока «много»',stimulus:'Сендердің + дос → ?',
   answers:['достарың','сендердің достарың'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'Сендердің достарың. Не *досың. В модели этого урока сначала «много».'}),
  field({id:'p3-32-c-g2-kol',order:2,session:'C',title:'Сендердің: руки',stimulus:'Сендердің + қол → ?',
   answers:['қолдарың','сендердің қолдарың'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'Пилот круга C: сендердің қолдарың, не қолың. Тело не исключение.'}),
  field({id:'p3-32-c-g2-ata',order:3,session:'C',title:'Сендердің: дедушка',stimulus:'Сендердің + ата → ?',
   answers:['аталарың','сендердің аталарың'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'сендердің аталарың. Форма держит несколько чтений ключа.'}),
  field({id:'p3-32-c-g6-kolyn',order:4,session:'C',title:'Исправь: нет голого ң',stimulus:'сендердің қолың',
   answers:['сендердің қолдарың','қолдарың'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'У сендердің кусок «много» обязателен: қолдарың, не *қолың.'}),
  field({id:'p3-32-c-g6-dosyn',order:5,session:'C',title:'Исправь: нет голого ң',stimulus:'сендердің досың',
   answers:['сендердің достарың','достарың'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'Не *сендердің досың. Это сенің. Для сендердің — достарың.'})
 ];

 const SESSION_D=[
  field({id:'p3-32-d-g2-bastyk',order:1,session:'D',title:'Сіздердің: начальник',stimulus:'Сіздердің + бастық → ?',
   answers:['бастықтарыңыз','сіздердің бастықтарыңыз'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'сіздердің бастықтарыңыз. Сначала «много», потом ыңыз. қ спряталась за тар.'}),
  field({id:'p3-32-d-g2-kol',order:2,session:'D',title:'Сіздердің: руки',stimulus:'Сіздердің + қол → ?',
   answers:['қолдарыңыз','сіздердің қолдарыңыз'],rule:'T25_POSS_SENDER',error_type:'POSS_2PL_NO_PL',
   explanation:'Сіздердің қолдарыңыз — с LAr. Не смешивать с сіздің қолыңыз.'}),
  field({id:'p3-32-d-g6-aken',order:3,session:'D',title:'Исправь чужое лицо',stimulus:'сіздердің әкелерің',
   answers:['сіздердің әкелеріңіз','әкелеріңіз'],rule:'T25_POSS_SENDER',error_type:'POSS_WRONG_PERSON',
   explanation:'ң от сендердің. Для сіздердің нужен хвост ыңыз: әкелеріңіз.'}),
  field({id:'p3-32-d-g6-balanyzdar',order:4,session:'D',title:'Исправь «кто есть» на «чьё»',stimulus:'сіздің балаңыздар',
   answers:['сіздің балаларыңыз','балаларыңыз'],rule:['T25_POSS_SENDER','T8_PERSON_PL'],error_type:'PERSON_ON_POSS',
   explanation:'*балаңыздар — «кто есть» не туда. Нужно балаларыңыз: сначала много, потом чьё.'})
 ];

 const SESSION_E=[
  field({id:'p3-32-e-g2-ini',order:1,session:'E',title:'Олардың: один объект',stimulus:'Олардың + іні → ?',
   answers:['інісі','олардың інісі'],rule:'T26_POSS_OLAR',error_type:'POSS_NO_SUFFIX',
   explanation:'олардың інісі. «Много» не обязательно на один объект.'}),
  field({id:'p3-32-e-g2-bala',order:2,session:'E',title:'Олардың: ребёнок',stimulus:'Олардың + бала → ? (один)',
   answers:['баласы','олардың баласы'],rule:'T26_POSS_OLAR',error_type:'POSS_NO_SUFFIX',
   explanation:'олардың баласы. Не требовать балалары на один объект.'}),
  field({id:'p3-32-e-g2-kolik',order:3,session:'E',title:'Олардың: много машин',stimulus:'Олардың + көліктер → ?',
   answers:['көліктері','олардың көліктері'],rule:'T26_POSS_OLAR',error_type:'POSS_OLAR_FORCE_PL',
   explanation:'олардың көліктері. «Много» по числу объектов.'}),
  field({id:'p3-32-e-g2-qala',order:4,session:'E',title:'Олардың: их город',stimulus:'Олардың + қала → ? (один город)',
   answers:['қаласы','олардың қаласы','қалалары','олардың қалалары'],rule:'T26_POSS_OLAR',error_type:'POSS_OLAR_FORCE_PL',
   explanation:'қаласы — первый ответ «их город». қалалары можно, если ученица хочет «города».'}),
  field({id:'p3-32-e-g6-ini',order:5,session:'E',title:'Найди ошибку',stimulus:'олардың іні',
   answers:['олардың інісі','інісі'],rule:'T26_POSS_OLAR',error_type:'POSS_NO_SUFFIX',
   explanation:'Для олардың нужна наклейка: інісі, не голое іні.'})
 ];

 const SESSION_F=[
  field({id:'p3-32-f-g4-atalaryn',order:1,session:'F',kind:'fields',fieldKind:'set-text',title:'Все чтения: аталарың',
   stimulus:'аталарың — напиши все чтения ключа',
   answers:['твои дедушки','ваш дедушка','ваши дедушки'],rule:'T26_POSS_OLAR',error_type:'POSS_2PL_READINGS',
   explanation:'аталарың = твои дедушки / ваш дедушка / ваши дедушки. Один перевод неполный.'}),
  field({id:'p3-32-f-g4-dostaryn',order:2,session:'F',kind:'fields',fieldKind:'set-text',title:'Все чтения: сендердің достарың',
   stimulus:'сендердің достарың — напиши чтения ключа',
   answers:['ваш друг','ваши друзья'],rule:['T25_POSS_SENDER','T26_POSS_OLAR'],error_type:'POSS_2PL_READINGS',
   explanation:'При сендердің достарың = ваш друг / ваши друзья. Без местоимения ещё «твои друзья».'}),
  field({id:'p3-32-f-g4-qalasy',order:3,session:'F',kind:'fields',fieldKind:'set-text',title:'Все чтения: қаласы',
   stimulus:'қаласы — напиши все чтения ключа',
   answers:['его город','их город'],rule:'T26_POSS_OLAR',error_type:'POSS_2PL_READINGS',
   explanation:'қаласы = его город / их город.'})
 ];

 const SESSION_G=[
  field({id:'p3-32-g-g2-myna',order:1,session:'G',title:'Указательные: при слове',stimulus:'эта книга хорошая → ?',
   answers:['мына кітап жақсы','осы кітап жақсы'],rule:'T27_DEIXIS',error_type:'DEIXIS_BARE',
   explanation:'мына кітап жақсы / осы кітап жақсы. *мына — кітап в упражнении не принимается. Сол кітап тренируем так же, при слове.'}),
  field({id:'p3-32-g-g2-mynau',order:2,session:'G',title:'Указательные: одно',stimulus:'это — книга (рядом) → ?',
   answers:['мынау — кітап','бұл — кітап','мынау кітап','бұл кітап'],rule:'T27_DEIXIS',error_type:'DEIXIS_BARE',
   explanation:'мынау / бұл могут стоять одни. *мына — кітап в упражнении не принимается. Самостоятельные осы и сол в языке не запрещаем.'}),
  field({id:'p3-32-g-g6-bare',order:3,session:'G',title:'Исправь голое мына',stimulus:'мына — кітап',
   answers:['мына кітап','мынау — кітап','мынау кітап'],rule:'T27_DEIXIS',error_type:'DEIXIS_BARE',
   explanation:'В модели урока мына пишем при слове. Нужно мына кітап или мынау — кітап. Осы кітап и сол кітап — те же учебные формы при слове.'}),
  field({id:'p3-32-g-g5-bar',order:4,session:'G',title:'Recycle 3-1: бар ма',stimulus:'У нас есть машина? → ?',
   answers:['біздің көлігіміз бар ма','көлігіміз бар ма'],rule:['T24_POSS_BIZ','T22_BAR_ZHOK'],error_type:'bar_zhok_choice',
   explanation:'біздің көлігіміз бар ма. Бар/жоқ не новая глава 3-2.'}),
  field({id:'p3-32-g-g5-bar2',order:5,session:'G',title:'Recycle 3-1: бар',stimulus:'У нас есть машина → ?',
   answers:['біздің көлігіміз бар','көлігіміз бар'],rule:['T24_POSS_BIZ','T22_BAR_ZHOK'],error_type:'bar_zhok_choice',
   explanation:'біздің көлігіміз бар. Не *біз көлік бар. Не *көлігіміз емес.'})
 ];

 const SESSION_H=[]; /* Circle H = phrase-banks['3-2'], wired in phrase-drill.js */

 const ERROR_PACK=[
  field({id:'p3-32-x-g6-korshisin',order:1,session:'G6',title:'Дыра ключа: не «твой сосед»',stimulus:'сенің көршісің  (ключ писал «твой сосед» — исправь)',
   answers:['сенің көршің','көршің'],rule:['T20_POSS','T25_POSS_SENDER'],error_type:'PERSON_ON_POSS',
   explanation:'көршісің = ты сосед, не «твой сосед». Живое: сенің көршің. Ключ сборника 6-2.1 — дыра.'}),
  field({id:'p3-32-x-g6-aganiz',order:2,session:'G6',title:'Исправь чужое лицо',stimulus:'біздің ағаңыз',
   answers:['біздің ағамыз','ағамыз'],rule:'T24_POSS_BIZ',error_type:'POSS_WRONG_PERSON',
   explanation:'ңыз — наклейка сіздің. Для біздің нужно ағамыз.'})
 ];

 function sessionA(){return SESSION_A.map(clone);}
 function sessionB(){return SESSION_B.map(clone);}
 function sessionC(){return SESSION_C.map(clone);}
 function sessionD(){return SESSION_D.map(clone);}
 function sessionE(){return SESSION_E.map(clone);}
 function sessionF(){return SESSION_F.map(clone);}
 function sessionG(){return SESSION_G.map(clone);}
 function sessionH(){return SESSION_H.map(clone);}
 function errorPack(){return ERROR_PACK.map(clone);}
 function defaultSession(){return [...sessionA(),...sessionB(),...sessionC(),...errorPack()];}
 function lessonSession(){return [...defaultSession(),...sessionD(),...sessionE(),...sessionF(),...sessionG()];}
 function grammarQuestions(){return lessonSession();}
 function all(){return grammarQuestions();}
 function byId(id){
  const q=[...SESSION_A,...SESSION_B,...SESSION_C,...SESSION_D,...SESSION_E,...SESSION_F,...SESSION_G,...ERROR_PACK].find(x=>x.id===id);
  return q?clone(q):null;
 }
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions)||!gate||!gate.allows||!gate.allows('poss_biz',catalog))return [];
  course.sources=course.sources||{};
  if(!course.sources['phase3-32'])course.sources['phase3-32']={title:'Урок 3-2 · наш / ваш / их',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of grammarQuestions()){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-2 pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }

 const api={SESSION_A,SESSION_B,SESSION_C,SESSION_D,SESSION_E,SESSION_F,SESSION_G,SESSION_H,ERROR_PACK,sessionA,sessionB,sessionC,sessionD,sessionE,sessionF,sessionG,sessionH,errorPack,defaultSession,lessonSession,grammarQuestions,all,byId,check,install};
 if(node)module.exports=api;else root.Lesson32Pack=api;
})(typeof window!=='undefined'?window:globalThis);
