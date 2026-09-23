/* Phase 3 lesson 3-1 closed pack. Session A only: менің + T20/T21. Not installed into COURSE. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;

 function clone(x){return JSON.parse(JSON.stringify(x));}
 function field({id,order,title,stimulus,answers,rule,error_type,explanation,kind='fields',session='A'}){
  return {
   id,source:'phase3-31',group:'3-1-'+session,part:String(order),lessonId:'3-1',topic:'possessive',kind,
   title,stimulus,
   fields:[{label:'Ответ',kind:'text',answers:Array.isArray(answers)?answers:[answers]}],
   explanation,
   ruleIds:Array.isArray(rule)?rule:[rule],
   vocabIds:[],
   practiceOnly:true,
   phase3:{lesson:'3-1',session,order,error_type,closed_pack:true}
  };
 }
 function two(spec){
  const q=field(Object.assign({answers:spec.stems||['—']},spec));
  q.fields=[
   {label:'Основа',kind:'text',answers:spec.stems},
   {label:'Владелец',kind:'text',answers:spec.owners}
  ];
  return q;
 }
 const SESSION_A=[
  field({
   id:'p3-31-a-g1-ake',order:1,title:'Менің: одна форма',stimulus:'Менің + әке → ?',
   answers:['әкем','Менің әкем'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің + әке → әкем. После гласной для менің добавляется -м.'
  }),
  field({
   id:'p3-31-a-g2-kitap',order:2,title:'Менің: собери форму',stimulus:'Менің + кітап → ?',
   answers:['кітабым','Менің кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ым → кітабым: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-a-g2-qala',order:3,title:'Менің: собери форму',stimulus:'Менің + қала → ?',
   answers:['қалам','Менің қалам'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің + қала → қалам. После гласной добавляется -м.'
  }),
  field({
   id:'p3-31-a-g6-ake',order:4,title:'Найди ошибку и перепиши',stimulus:'Менің әке',
   answers:['Менің әкем','әкем'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Менің без притяжательной наклейки справа неполно: әке + м → әкем.'
  }),
  field({
   id:'p3-31-a-g6-kitap-missing',order:5,title:'Найди ошибку и перепиши',stimulus:'Менің кітап',
   answers:['Менің кітабым','кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_suffix_missing',
   explanation:'Нужна притяжательная форма: кітап + ым, при этом п→б → кітабым.'
  }),
  field({
   id:'p3-31-a-g6-kitapym',order:6,title:'Найди ошибку и перепиши',stimulus:'Менің кітапым',
   answers:['Менің кітабым','кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'Перед гласной -ым конечная п озвончается: кітап + ым → кітабым.'
  })
 ];
 const SESSION_B=[
  field({
   id:'p3-31-b-g2-ake',order:1,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + әке → ?',
   answers:['әкең','Сенің әкең'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сенің + әке → әкең. После гласной для сенің добавляется -ң.'
  }),
  field({
   id:'p3-31-b-g2-kitap',order:2,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + кітап → ?',
   answers:['кітабың','Сенің кітабың'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ың → кітабың: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-b-g2-dos',order:3,session:'B',title:'Сенің: собери форму',stimulus:'Сенің + дос → ?',
   answers:['досың','Сенің досың'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сенің + дос → досың. После согласной здесь добавляется -ың.'
  })
 ];
 const SESSION_C=[
  field({
   id:'p3-31-c-g2-qala',order:1,session:'C',title:'Оның: собери форму',stimulus:'Оның + қала → ?',
   answers:['қаласы','Оның қаласы'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Оның + қала → қаласы. После гласной для оның добавляется -сы/-сі.'
  }),
  field({
   id:'p3-31-c-g2-ul',order:2,session:'C',title:'Оның: собери форму',stimulus:'Оның + ұл → ?',
   answers:['ұлы','Оның ұлы'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Оның + ұл → ұлы. После согласной здесь добавляется -ы.'
  }),
  field({
   id:'p3-31-c-g2-mektep',order:3,session:'C',title:'Оның: собери форму',stimulus:'Оның + мектеп → ?',
   answers:['мектебі','Оның мектебі'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'мектеп + і → мектебі: перед гласной притяжательного окончания п озвончается в б.'
  }),
  field({
   id:'p3-31-c-g2-kitap',order:4,session:'C',title:'Оның: собери форму',stimulus:'Оның + кітап → ?',
   answers:['кітабы','Оның кітабы'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'кітап + ы → кітабы: перед гласной притяжательного окончания п озвончается в б.'
  })
 ];
 const SESSION_D=[
  field({
   id:'p3-31-d-g2-ata',order:1,session:'D',title:'Сіздің: собери форму',stimulus:'Сіздің + ата → ?',
   answers:['атаңыз','Сіздің атаңыз'],rule:'T20_POSS',error_type:'poss_suffix_missing',
   explanation:'Сіздің + ата → атаңыз. После гласной в этой форме добавляется -ңыз/-ңіз.'
  }),
  field({
   id:'p3-31-d-g2-kolik',order:2,session:'D',title:'Сіздің: собери форму',stimulus:'Сіздің + көлік → ?',
   answers:['көлігіңіз','Сіздің көлігіңіз'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'көлік + іңіз → көлігіңіз: перед гласной притяжательного окончания к озвончается в г.'
  })
 ];
 const SESSION_E=[
  field({
   id:'p3-31-e-g5-bar',order:1,session:'E',title:'Бар: у меня есть',stimulus:'Менің көлігім — есть → ?',
   answers:['Менің көлігім бар','көлігім бар'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',
   explanation:'Менің көлігім бар = у меня есть машина. Бар говорит о наличии.'
  }),
  field({
   id:'p3-31-e-g5-zhok',order:2,session:'E',title:'Жоқ: у меня нет',stimulus:'Менің көлігім — нет → ?',
   answers:['Менің көлігім жоқ','көлігім жоқ'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',
   explanation:'Менің көлігім жоқ = у меня нет машины. Жоқ говорит об отсутствии.'
  }),
  field({
   id:'p3-31-e-g5-question',order:3,session:'E',title:'Бар ма?: есть ли?',stimulus:'Сенің ағаң — есть? → ?',
   answers:['Сенің ағаң бар ма','ағаң бар ма'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',
   explanation:'Сенің ағаң бар ма? = у тебя есть старший брат? Здесь бар + знакомая вопросительная частица ма.'
  }),
  field({
   id:'p3-31-e-g6-emes',order:4,session:'E',title:'Жоқ ≠ емес',stimulus:'Менің көлігім емес',
   answers:['Менің көлігім жоқ','көлігім жоқ'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_not_emes',
   explanation:'Для отсутствия нужен жоқ: Менің көлігім жоқ. Емес означает «не является», а не «у меня нет».'
  })
 ];
 const SESSION_F=[
  field({
   id:'p3-31-f-g2-kitaptarym',order:1,session:'F',title:'Сначала множественное',stimulus:'Менің + кітаптар → ?',
   answers:['кітаптарым','Менің кітаптарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'кітап + тар + ым → кітаптарым. Сначала множественное, потом притяжательное.'
  }),
  field({
   id:'p3-31-f-g2-sausaktaryn',order:2,session:'F',title:'Сначала множественное',stimulus:'Сенің + саусақтар → ?',
   answers:['саусақтарың','Сенің саусақтарың'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'саусақ + тар + ың → саусақтарың. Притяжательное окончание ставится после множественного.'
  }),
  field({
   id:'p3-31-f-g2-uldarym',order:3,session:'F',title:'Сначала множественное',stimulus:'Менің + ұлдар → ?',
   answers:['ұлдарым','Менің ұлдарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'ұл + дар + ым → ұлдарым.'
  }),
  field({
   id:'p3-31-f-g2-mysyktarym',order:4,session:'F',title:'Сначала множественное',stimulus:'Менің + мысықтар → ?',
   answers:['мысықтарым','Менің мысықтарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'мысық + тар + ым → мысықтарым. После -тар притяжательное окончание уже не касается конечной қ.'
  }),
  field({
   id:'p3-31-f-g6-kitabymdar',order:5,session:'F',title:'Исправь порядок',stimulus:'Менің кітабымдар',
   answers:['Менің кітаптарым','кітаптарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'Не кітабым + дар. Правильно: кітап + тар + ым → кітаптарым.'
  }),
  field({
   id:'p3-31-f-g6-mysygymdar',order:6,session:'F',title:'Исправь порядок',stimulus:'Менің мысығымдар',
   answers:['Менің мысықтарым','мысықтарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',
   explanation:'Не мысығым + дар. Правильно: мысық + тар + ым → мысықтарым.'
  })
 ];
 const SESSION_G=[
  field({id:'p3-31-g-g4-heart',order:1,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Менің жүрегім',answers:['моё сердце','мое сердце'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'Менің жүрегім = моё сердце.'}),
  field({id:'p3-31-g-g4-fingers',order:2,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Сенің саусақтарың',answers:['твои пальцы'],rule:['T20_POSS','T23_POSS_PL'],error_type:'poss_phrase',explanation:'Сенің саусақтарың = твои пальцы.'}),
  field({id:'p3-31-g-g4-his-book',order:3,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Оның кітабы',answers:['его книга','её книга','ее книга'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'Оның кітабы = его/её книга.'}),
  field({id:'p3-31-g-g4-my-guest',order:4,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Менің қонағым',answers:['мой гость'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'Менің қонағым = мой гость.'}),
  field({id:'p3-31-g-g4-friend-girl',order:5,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Оның құрбысы',answers:['его подруга','её подруга','ее подруга'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'Оның құрбысы = его/её подруга.'}),
  field({id:'p3-31-g-g4-your-friend',order:6,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Сенің досың',answers:['твой друг'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'Сенің досың = твой друг.'}),
  field({id:'p3-31-g-g4-teacher',order:7,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Оның мұғалімі',answers:['его учитель','её учитель','ее учитель'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'Оның мұғалімі = его/её учитель.'}),
  field({id:'p3-31-g-g4-my-finger',order:8,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Менің саусағым',answers:['мой палец'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'Менің саусағым = мой палец.'}),
  field({id:'p3-31-g-g4-your-friends',order:9,session:'G',kind:'phrase',title:'KK → RU',stimulus:'Сенің достарың',answers:['твои друзья'],rule:['T20_POSS','T23_POSS_PL'],error_type:'poss_phrase',explanation:'Сенің достарың = твои друзья.'}),

  field({id:'p3-31-g-g3-my-book',order:10,session:'G',kind:'phrase',title:'RU → KK',stimulus:'моя книга',answers:['менің кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'моя книга → менің кітабым.'}),
  field({id:'p3-31-g-g3-your-friend',order:11,session:'G',kind:'phrase',title:'RU → KK',stimulus:'твой друг',answers:['сенің досың'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'твой друг → сенің досың.'}),
  field({id:'p3-31-g-g3-teacher',order:12,session:'G',kind:'phrase',title:'RU → KK',stimulus:'его/её учитель',answers:['оның мұғалімі'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'его/её учитель → оның мұғалімі.'}),
  field({id:'p3-31-g-g3-beard',order:13,session:'G',kind:'phrase',title:'RU → KK',stimulus:'моя борода',answers:['менің сақалым'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'моя борода → менің сақалым.'}),
  field({id:'p3-31-g-g3-your-books',order:14,session:'G',kind:'phrase',title:'RU → KK',stimulus:'твои книги',answers:['сенің кітаптарың'],rule:['T20_POSS','T23_POSS_PL'],error_type:'poss_phrase',explanation:'твои книги → сенің кітаптарың.'}),
  field({id:'p3-31-g-g3-guest',order:15,session:'G',kind:'phrase',title:'RU → KK',stimulus:'его/её гость',answers:['оның қонағы'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'его/её гость → оның қонағы.'}),
  field({id:'p3-31-g-g3-heart',order:16,session:'G',kind:'phrase',title:'RU → KK',stimulus:'моё сердце',answers:['менің жүрегім'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_phrase',explanation:'моё сердце → менің жүрегім.'}),
  field({id:'p3-31-g-g3-cat-bald',order:17,session:'G',kind:'phrase',title:'RU → KK',stimulus:'мой кот лысый',answers:['менің мысығым таз'],rule:'T20_POSS',error_type:'poss_phrase',explanation:'мой кот лысый → менің мысығым таз.'}),
  field({id:'p3-31-g-g3-cats-bald',order:18,session:'G',kind:'phrase',title:'RU → KK',stimulus:'мои котики лысые',answers:['менің мысықтарым таз'],rule:['T20_POSS','T23_POSS_PL'],error_type:'poss_phrase',explanation:'мои котики лысые → менің мысықтарым таз.'})
 ];
 const ERROR_PACK=[
  field({
   id:'p3-31-x-g6-zhurekim',order:1,session:'G6',title:'Исправь озвончение',stimulus:'Менің жүрекім',
   answers:['Менің жүрегім','жүрегім'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'жүрек + ім → жүрегім: перед гласной притяжательного окончания к озвончается в г.'
  }),
  field({
   id:'p3-31-x-g6-sausakym',order:2,session:'G6',title:'Исправь озвончение',stimulus:'Менің саусақым',
   answers:['Менің саусағым','саусағым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',
   explanation:'саусақ + ым → саусағым: перед гласной притяжательного окончания қ озвончается в ғ.'
  }),
  field({
   id:'p3-31-x-g6-onyn-qalam',order:3,session:'G6',title:'Исправь форму владельца',stimulus:'Оның + қала → Оның қалам',
   answers:['Оның қаласы','қаласы'],rule:'T20_POSS',error_type:'poss_owner_form',
   explanation:'Для оның нужна форма третьего лица: қала → қаласы. -м относится к менің.'
  })
 ];
 const SESSION_H=[
  field({id:'p3-31-h-ake-mine',order:1,session:'H',title:'Чей әкем?',stimulus:'әкем → чей?',answers:['менің','Менің'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Окончание -м кодирует менің.'}),
  field({id:'p3-31-h-ake-yours',order:2,session:'H',title:'Чей әкең?',stimulus:'әкең → чей?',answers:['сенің','Сенің'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Окончание -ң кодирует сенің.'}),
  field({id:'p3-31-h-ake-siz',order:3,session:'H',title:'Чей әкеңіз?',stimulus:'әкеңіз → чей?',answers:['сіздің','Сіздің'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Окончание -ңіз кодирует сіздің.'}),
  field({id:'p3-31-h-ake-his',order:4,session:'H',title:'Чей әкесі?',stimulus:'әкесі → чей?',answers:['оның','Оның'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Окончание -сі кодирует оның.'}),
  field({id:'p3-31-h-dos-mine',order:5,session:'H',title:'Выбери «мой»',stimulus:'досым / досың / досыңыз / досы — какой вариант значит «мой»?',answers:['досым'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'«Мой» здесь досым: -ым = менің.'}),
  field({id:'p3-31-h-dos-his',order:6,session:'H',title:'Выбери «его/её»',stimulus:'досым / досың / досыңыз / досы — какой вариант значит «его/её»?',answers:['досы'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'После согласной для оның здесь -ы: досы, не доссы.'}),
  field({id:'p3-31-h-qala-m',order:7,session:'H',title:'қала + м',stimulus:'қала + м → какой владелец?',answers:['менің','Менің'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Кусок м после гласной — это менің. Не читай эту склейку как «ручка».'}),
  field({id:'p3-31-h-qala-sy',order:8,session:'H',title:'қала + сы',stimulus:'қала + сы → какой владелец?',answers:['оның','Оның'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Кусок сы после гласной — это оның.'})
 ];
 const SESSION_PEN=[
  field({id:'p3-31-h-pen',order:1,session:'H',title:'Слово «ручка»',stimulus:'ручка',answers:['қалам'],rule:'T20_POSS',error_type:'lexical_retrieval',explanation:'«Ручка» — слово қалам. Это не тест формы «мой город».'})
 ];
 const SESSION_I=[
  field({id:'p3-31-i-edge-ake',order:1,session:'I',title:'Край әке',stimulus:'әке: край?',answers:['гласная','гласный'],rule:'T20_POSS',error_type:'poss_edge',explanation:'әке кончается на гласную, поэтому наклейка короткая.'}),
  field({id:'p3-31-i-edge-dos',order:2,session:'I',title:'Край дос',stimulus:'дос: край?',answers:['согласная','согласный'],rule:'T20_POSS',error_type:'poss_edge',explanation:'дос кончается на согласную, поэтому в наклейке есть ы/і.'}),
  field({id:'p3-31-i-row-zhumys',order:3,session:'I',title:'Ряд жұмыс',stimulus:'жұмыс: ряд?',answers:['твёрдый','твердый'],rule:'T20_POSS',error_type:'poss_harmony',explanation:'жұмыс — твёрдый ряд, поэтому ы, не і.'}),
  field({id:'p3-31-i-row-pater',order:4,session:'I',title:'Ряд пәтер',stimulus:'пәтер: ряд?',answers:['мягкий'],rule:'T20_POSS',error_type:'poss_harmony',explanation:'В пәтер последний релевантный ряд мягкий, поэтому і, не ы.'}),
  field({id:'p3-31-i-suf-dos',order:5,session:'I',title:'-ым или -ім',stimulus:'менің + дос: -ым или -ім?',answers:['-ым','ым'],rule:'T20_POSS',error_type:'poss_harmony',explanation:'дос твёрдый и на согласную: -ым.'}),
  field({id:'p3-31-i-suf-pater',order:6,session:'I',title:'-ым или -ім',stimulus:'менің + пәтер: -ым или -ім?',answers:['-ім','ім'],rule:'T20_POSS',error_type:'poss_harmony',explanation:'пәтер мягкий и на согласную: -ім.'}),
  field({id:'p3-31-i-suf-ana',order:7,session:'I',title:'-ң или -ың',stimulus:'сенің + ана: -ң или -ың?',answers:['-ң','ң'],rule:'T20_POSS',error_type:'poss_edge',explanation:'ана кончается на гласную, поэтому короткое -ң.'}),
  field({id:'p3-31-i-suf-mugalim',order:8,session:'I',title:'-ыңыз или -іңіз',stimulus:'сіздің + мұғалім: -ыңыз или -іңіз?',answers:['-іңіз','іңіз'],rule:'T20_POSS',error_type:'poss_harmony',explanation:'мұғалім мягкий и на согласную: -іңіз.'})
 ];
 const SESSION_J=[
  two({id:'p3-31-j-kitap',order:1,session:'J',title:'Разбери кітабым',stimulus:'кітабым',stems:['кітап'],owners:['менің','Менің'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_parse',explanation:'кітабым = кітап + менің. П озвончилась в б.'}),
  two({id:'p3-31-j-kolik',order:2,session:'J',title:'Разбери көлігің',stimulus:'көлігің',stems:['көлік'],owners:['сенің','Сенің'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_parse',explanation:'көлігің = көлік + сенің.'}),
  two({id:'p3-31-j-qonaq',order:3,session:'J',title:'Разбери қонағыңыз',stimulus:'қонағыңыз',stems:['қонақ'],owners:['сіздің','Сіздің'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_parse',explanation:'қонағыңыз = қонақ + сіздің. Қ озвончилась в ғ.'}),
  two({id:'p3-31-j-mektep',order:4,session:'J',title:'Разбери мектебі',stimulus:'мектебі',stems:['мектеп'],owners:['оның','Оның'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_parse',explanation:'мектебі = мектеп + оның.'}),
  two({id:'p3-31-j-mamandyq',order:5,session:'J',title:'Разбери мамандығым',stimulus:'мамандығым',stems:['мамандық'],owners:['менің','Менің'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_parse',explanation:'мамандығым = мамандық + менің.'}),
  two({id:'p3-31-j-pater',order:6,session:'J',title:'Разбери пәтерің',stimulus:'пәтерің',stems:['пәтер'],owners:['сенің','Сенің'],rule:'T20_POSS',error_type:'poss_parse',explanation:'пәтерің = пәтер + сенің.'}),
  two({id:'p3-31-j-qala',order:7,session:'J',title:'Разбери қаласы',stimulus:'қаласы',stems:['қала'],owners:['оның','Оның'],rule:'T20_POSS',error_type:'poss_parse',explanation:'қаласы = қала + оның.'}),
  two({id:'p3-31-j-azhe',order:8,session:'J',title:'Разбери әжеңіз',stimulus:'әжеңіз',stems:['әже'],owners:['сіздің','Сіздің'],rule:'T20_POSS',error_type:'poss_parse',explanation:'әжеңіз = әже + сіздің.'})
 ];
 const SESSION_K=[
  field({id:'p3-31-k-kitap',order:1,session:'K',title:'П→Б',stimulus:'кітап + ым → ?',answers:['кітабым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'кітап + ым: П стоит прямо перед гласной, поэтому П→Б → кітабым.'}),
  field({id:'p3-31-k-mektep',order:2,session:'K',title:'П→Б',stimulus:'мектеп + ім → ?',answers:['мектебім'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'мектеп + ім: П→Б → мектебім.'}),
  field({id:'p3-31-k-kolik',order:3,session:'K',title:'К→Г',stimulus:'көлік + ің → ?',answers:['көлігің'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'көлік + ің: К стоит прямо перед гласной, поэтому К→Г → көлігің.'}),
  field({id:'p3-31-k-qonaq',order:4,session:'K',title:'Қ→Ғ',stimulus:'қонақ + ы → ?',answers:['қонағы'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'қонақ + ы: Қ→Ғ → қонағы.'}),
  field({id:'p3-31-k-su',order:5,session:'K',title:'суым',stimulus:'су + ым → ?',answers:['суым','менің суым'],rule:'T21_POSS_ASSIM',error_type:'poss_glide',explanation:'Запомни целевую запись: суым. Здесь полная форма с ы сохраняется.'}),
  field({id:'p3-31-k-mi',order:6,session:'K',title:'миым',stimulus:'ми + ым → ?',answers:['миым','менің миым'],rule:'T21_POSS_ASSIM',error_type:'poss_glide',explanation:'Запомни целевую запись: миым. Здесь полная форма с ы сохраняется.'}),
  field({id:'p3-31-k-ayu',order:7,session:'K',title:'аюым',stimulus:'аю + ым → ?',answers:['аюым','менің аюым'],rule:'T21_POSS_ASSIM',error_type:'poss_glide',explanation:'Запомни целевую запись: аюым. Здесь полная форма с ы сохраняется.'})
 ];
 const SESSION_L=[
  field({id:'p3-31-l-oqushy',order:1,session:'L',title:'Исправь лицо',stimulus:'*Менің оқушысым',answers:['Менің оқушым','менің оқушым'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'После гласной для менің нужно -м: Менің оқушым. Форма оқушысым сюда не подходит.'}),
  field({id:'p3-31-l-dos',order:2,session:'L',title:'Исправь его друга',stimulus:'*Оның доссы',answers:['Оның досы','оның досы'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'После согласной для оның здесь -ы/-і, не -сы/-сі: Оның досы.'}),
  field({id:'p3-31-l-aken',order:3,session:'L',title:'Исправь ң',stimulus:'*Сенің әкен',answers:['Сенің әкең','сенің әкең'],rule:'T20_POSS',error_type:'poss_wrong_person',explanation:'Для сенің после гласной нужна ң, не н: Сенің әкең.'}),
  field({id:'p3-31-l-qonaq',order:4,session:'L',title:'Исправь Қ→Ғ',stimulus:'*Сіздің қонақыңыз',answers:['Сіздің қонағыңыз','сіздің қонағыңыз'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'Қ стоит прямо перед гласной наклейкой: Қ→Ғ → Сіздің қонағыңыз.'}),
  field({id:'p3-31-l-qaryndas',order:5,session:'L',title:'Исправь гласную наклейки',stimulus:'*Менің қарындасм',answers:['Менің қарындасым','менің қарындасым'],rule:'T20_POSS',error_type:'poss_buffer',explanation:'После согласной нужна гласная полного окончания: Менің қарындасым.'}),
  field({id:'p3-31-l-kitap',order:6,session:'L',title:'Исправь порядок',stimulus:'*Менің кітабымдар',answers:['Менің кітаптарым','менің кітаптарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',explanation:'Сначала множественное, потом притяжательное: кітап + тар + ым → кітаптарым. П через тар не озвончается.'})
 ];
 const SESSION_M=[
  field({id:'p3-31-m-bastyq',order:1,session:'M',title:'Новая форма',stimulus:'менің + бастық → ?',answers:['бастығым','менің бастығым'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'бастық + ым: Қ→Ғ → бастығым.'}),
  field({id:'p3-31-m-mamandyq',order:2,session:'M',title:'Новая форма',stimulus:'сенің + мамандық → ?',answers:['мамандығың','сенің мамандығың'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'мамандық + ың: Қ→Ғ → мамандығың.'}),
  field({id:'p3-31-m-kolik',order:3,session:'M',title:'Новая форма',stimulus:'сіздің + көлік → ?',answers:['көлігіңіз','сіздің көлігіңіз'],rule:['T20_POSS','T21_POSS_ASSIM'],error_type:'poss_assim_voice',explanation:'көлік + іңіз: К→Г → көлігіңіз.'}),
  field({id:'p3-31-m-tate',order:4,session:'M',title:'Новая форма',stimulus:'оның + тәте → ?',answers:['тәтесі','оның тәтесі'],rule:'T20_POSS',error_type:'poss_suffix_missing',explanation:'тәте кончается на гласную: для его/её форма тәтесі.'}),
  field({id:'p3-31-m-zhok',order:5,session:'M',title:'Нет книги',stimulus:'у меня нет книги',answers:['менің кітабым жоқ','Менің кітабым жоқ'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_not_emes',explanation:'Нет книги — это отсутствие: менің кітабым жоқ, не емес.'}),
  field({id:'p3-31-m-books',order:6,session:'M',title:'Мои книги',stimulus:'мои книги',answers:['менің кітаптарым','Менің кітаптарым'],rule:'T23_POSS_PL',error_type:'poss_plural_order',explanation:'мои книги → кітап + тар + ым → менің кітаптарым.'})
 ];
 const SESSION_E_PLUS=[
  field({id:'p3-31-e-aga-bar',order:5,session:'E2',title:'Брат есть',stimulus:'У меня есть старший брат',answers:['Менің ағам бар','ағам бар'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',explanation:'Наличие: Менің ағам бар.'}),
  field({id:'p3-31-e-aga-zhok',order:6,session:'E2',title:'Брата нет',stimulus:'У меня нет старшего брата',answers:['Менің ағам жоқ','ағам жоқ'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_not_emes',explanation:'Отсутствие: Менің ағам жоқ. Емес здесь не значит «нет».'}),
  field({id:'p3-31-e-aga-emes',order:7,session:'E2',title:'Не является братом',stimulus:'Он не мой старший брат',answers:['Ол менің ағам емес','ол ағам емес'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',explanation:'«Не является» — емес: Ол менің ағам емес. Это не «у меня нет брата».'}),
  field({id:'p3-31-e-aga-question',order:8,session:'E2',title:'Есть ли брат?',stimulus:'У тебя есть старший брат?',answers:['Сенің ағаң бар ма','Сенің ағаң бар ма?'],rule:'T22_BAR_ZHOK',error_type:'bar_zhok_choice',explanation:'Вопрос о наличии: Сенің ағаң бар ма?'})
 ];

 const REV='t-integration-v1';
 const STAGE_CORE={
  '31-owner':['p3-31-a-g1-ake','p3-31-a-g2-kitap','p3-31-a-g6-kitapym','p3-31-a-g2-qala','p3-31-a-g6-ake','p3-31-h-ake-mine','p3-31-h-dos-mine','p3-31-h-qala-m'],
  '31-compare':['p3-31-b-g2-ake','p3-31-b-g2-kitap','p3-31-b-g2-dos','p3-31-c-g2-qala','p3-31-c-g2-ul','p3-31-c-g2-mektep','p3-31-c-g2-kitap','p3-31-h-ake-yours','p3-31-h-ake-his','p3-31-h-dos-his','p3-31-h-qala-sy'],
  '31-edge':['p3-31-d-g2-ata','p3-31-d-g2-kolik','p3-31-i-edge-dos','p3-31-i-suf-dos','p3-31-i-suf-pater','p3-31-i-suf-ana','p3-31-i-suf-mugalim','p3-31-k-kitap','p3-31-k-qonaq','p3-31-k-su','p3-31-k-mi','p3-31-k-ayu'],
  '31-repair':['p3-31-e-g5-bar','p3-31-e-g5-zhok','p3-31-e-g5-question','p3-31-e-g6-emes','p3-31-e-aga-emes','p3-31-e-aga-zhok','p3-31-l-oqushy','p3-31-l-dos','p3-31-l-qonaq','p3-31-l-kitap'],
  '31-transfer':['p3-31-f-g2-kitaptarym','p3-31-f-g2-sausaktaryn','p3-31-f-g2-uldarym','p3-31-f-g2-mysyktarym','p3-31-f-g6-kitabymdar','p3-31-f-g6-mysygymdar','p3-31-m-bastyq','p3-31-m-mamandyq','p3-31-m-zhok','p3-31-m-books'],
  '31-phrase':['p3-31-g-g4-heart','p3-31-g-g4-fingers','p3-31-g-g4-his-book','p3-31-g-g4-my-guest','p3-31-g-g4-friend-girl','p3-31-g-g4-your-friend','p3-31-g-g3-my-book','p3-31-g-g3-your-friend','p3-31-g-g3-teacher','p3-31-g-g3-beard','p3-31-g-g3-your-books','p3-31-g-g3-guest']
 };
 const STAGE_ORDER=['31-owner','31-compare','31-edge','31-repair','31-transfer','31-phrase'];
 function sessionA(){return SESSION_A.map(clone);}
 function sessionB(){return SESSION_B.map(clone);}
 function sessionC(){return SESSION_C.map(clone);}
 function sessionD(){return SESSION_D.map(clone);}
 function sessionE(){return SESSION_E.map(clone);}
 function sessionF(){return SESSION_F.map(clone);}
 function sessionG(){return SESSION_G.map(clone);}
 function sessionH(){return SESSION_H.map(clone);}
 function sessionI(){return SESSION_I.map(clone);}
 function sessionJ(){return SESSION_J.map(clone);}
 function sessionK(){return SESSION_K.map(clone);}
 function sessionL(){return SESSION_L.map(clone);}
 function sessionM(){return SESSION_M.map(clone);}
 function errorPack(){return ERROR_PACK.map(clone);}
 function extraQuestions(){return [...SESSION_H,...SESSION_PEN,...SESSION_I,...SESSION_J,...SESSION_K,...SESSION_L,...SESSION_M,...SESSION_E_PLUS].map(clone);}
 function lessonSession(){return [...sessionA(),...sessionB(),...sessionC(),...sessionD(),...sessionE(),...sessionF(),...errorPack(),...sessionG()];}
 function grammarQuestions(){return [...sessionA(),...sessionB(),...sessionC(),...sessionD(),...sessionE(),...sessionF(),...errorPack()];}
 function all(){return [...lessonSession()];}
 function bank(){return [...SESSION_A,...SESSION_B,...SESSION_C,...SESSION_D,...SESSION_E,...SESSION_F,...SESSION_G,...ERROR_PACK,...SESSION_H,...SESSION_PEN,...SESSION_I,...SESSION_J,...SESSION_K,...SESSION_L,...SESSION_M,...SESSION_E_PLUS];}
 function byId(id){const q=bank().find(x=>x.id===id);return q?clone(q):null;}
 function stagePlan(stageId){
  const core=STAGE_CORE[stageId];
  if(!core)return null;
  const at=STAGE_ORDER.indexOf(stageId);
  return {
   lessonId:'3-1',contentRevision:REV,stageId,
   kind:stageId==='31-repair'?'repair':'learning',
   coreIds:core.slice(),
   requiredIndependentIds:core.slice(),
   ruleIds:[],
   nextStageId:STAGE_ORDER[at+1]||null,
   minIndependentRatio:1,
   maxPresentations:24,
   final:stageId==='31-phrase',
   presentations:0,
   limitReached:false
  };
 }
 function stagePlans(){return STAGE_ORDER.map(stagePlan);}
 function stageOf(id){
  for(const stageId of STAGE_ORDER)if(STAGE_CORE[stageId].includes(id))return stageId;
  return null;
 }
 function independentAnswer(e,id){
  return !!(e&&e.type==='answer'&&e.card_id===id&&e.correct&&!e.hinted&&!e.peek&&!e.rule_peek&&e.first_try_correct!==0);
 }
 function stageSatisfied(events,stage){
  const done=(events||[]).some(e=>e&&e.type==='course_stage_completed'&&e.lesson_id==='3-1'&&e.stage_id===stage.stageId&&e.content_revision===REV);
  if(done)return true;
  return stage.requiredIndependentIds.every(id=>(events||[]).some(e=>independentAnswer(e,id)));
 }
 function phrasesUnlocked(records,opts){
  void records;
  const events=opts&&opts.events||[];
  return STAGE_ORDER.filter(id=>id!=='31-phrase').every(id=>stageSatisfied(events,stagePlan(id)));
 }
 function remediationFor(events,stage){
  const at=STAGE_ORDER.indexOf(stage.stageId);
  const ids=[];
  for(const stageId of STAGE_ORDER.slice(0,at)){
   for(const id of STAGE_CORE[stageId]){
    const answers=(events||[]).filter(e=>e&&e.type==='answer'&&e.card_id===id);
    if(!answers.length||answers.some(e=>independentAnswer(e,id)))continue;
    ids.push(id);
   }
  }
  return ids.filter(id=>!stage.coreIds.includes(id)).slice(0,3);
 }
 function courseSession(records,opts){
  const before=records?JSON.stringify(records):null;
  const events=opts&&opts.events||[];
  const plans=stagePlans();
  const stage=plans.find(item=>!stageSatisfied(events,item))||plans[plans.length-1];
  const remediationIds=remediationFor(events,stage);
  const core=stage.coreIds.map(byId).filter(Boolean);
  const remediation=remediationIds.map(byId).filter(Boolean);
  if(records&&JSON.stringify(records)!==before)throw new Error('courseSession mutated records');
  return {stage,cards:[...core,...remediation],coreIds:stage.coreIds.slice(),remediationIds};
 }
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions)||!gate||!gate.allows||!gate.allows('possessive',catalog))return [];
  course.sources=course.sources||{};
  const drive31='https://drive.google.com/file/d/1B2c2UJKpvBvty-LhSlkoC8ubPGZC9-aQ/view';
  course.sources['phase3-31']=Object.assign({title:'Урок 3–1 · притяжательные формы',url:drive31,additional:true,lesson_id:'3-1'},course.sources['phase3-31']||{});
  if(!course.sources['phase3-31'].url||course.sources['phase3-31'].url==='#')course.sources['phase3-31'].url=drive31;
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of grammarQuestions()){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-1 closed pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function isClosed(){return true;}

 const api={SESSION_A,SESSION_B,SESSION_C,SESSION_D,SESSION_E,SESSION_F,SESSION_G,SESSION_H,SESSION_I,SESSION_J,SESSION_K,SESSION_L,SESSION_M,ERROR_PACK,sessionA,sessionB,sessionC,sessionD,sessionE,sessionF,sessionG,sessionH,sessionI,sessionJ,sessionK,sessionL,sessionM,errorPack,extraQuestions,lessonSession,grammarQuestions,all,byId,check,isClosed,install,courseSession,stageOf,stagePlans,phrasesUnlocked};
 if(node)module.exports=api;else root.Lesson31Pack=api;
})(typeof window!=='undefined'?window:globalThis);
