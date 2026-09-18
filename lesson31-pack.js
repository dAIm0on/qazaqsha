/* Phase 3 lesson 3-1 closed pack. Session A only: менің + T20/T21. Not installed into COURSE. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;

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

 function sessionA(){return SESSION_A.map(clone);}
 function sessionB(){return SESSION_B.map(clone);}
 function sessionC(){return SESSION_C.map(clone);}
 function sessionD(){return SESSION_D.map(clone);}
 function sessionE(){return SESSION_E.map(clone);}
 function sessionF(){return SESSION_F.map(clone);}
 function sessionG(){return SESSION_G.map(clone);}
 function errorPack(){return ERROR_PACK.map(clone);}
 function all(){return [...sessionA(),...sessionB(),...sessionC(),...sessionD(),...sessionE(),...sessionF(),...sessionG(),...errorPack()];}
 function byId(id){const q=[...SESSION_A,...SESSION_B,...SESSION_C,...SESSION_D,...SESSION_E,...SESSION_F,...SESSION_G,...ERROR_PACK].find(x=>x.id===id);return q?clone(q):null;}
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-1 closed pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 function isClosed(){return true;}

 const api={SESSION_A,SESSION_B,SESSION_C,SESSION_D,SESSION_E,SESSION_F,SESSION_G,ERROR_PACK,sessionA,sessionB,sessionC,sessionD,sessionE,sessionF,sessionG,errorPack,all,byId,check,isClosed};
 if(node)module.exports=api;else root.Lesson31Pack=api;
})(typeof window!=='undefined'?window:globalThis);
