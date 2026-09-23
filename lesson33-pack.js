/* Lesson 3-3 pack. Short stages on the shared contract. Gold is the etalon. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const core=node?require('./core.js'):root.TrainerCore;
 const diagnostics=node?require('./diagnostics.js'):root.ErrorDiagnostics;
 const gate=node?require('./curriculum-gate.js'):root.CurriculumGate;
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function one(spec){
  const fields=spec.fields||[{label:'Ответ',kind:'text',answers:spec.answers.slice()}];
  return {
   id:spec.id,source:'phase3-33',group:'3-3-'+spec.session,part:String(spec.n),lessonId:'3-3',topic:'possessive',kind:'fields',
   title:spec.title,stimulus:spec.stimulus,fields,explanation:spec.explanation,
   ruleIds:[spec.rule],vocabIds:[],practiceOnly:true,
   phase3:{lesson:'3-3',session:spec.session,order:spec.n,error_type:spec.error,gold:spec.gold||'',codes:spec.codes||null,closed_pack:false}
  };
 }
 const SPECS=[
  {"id": "p3-33-a01", "session": "A", "n": 1, "title": "Я гость", "stimulus": "Я гость.", "answers": ["Мен қонақпын", "Қонақпын"], "explanation": "Я гость — личный хвост: Мен қонақпын. Қонағым отвечает на «мой», не на «я».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G001", "codes": null, "rejects": ["қонағым"]},
  {"id": "p3-33-a02", "session": "A", "n": 2, "title": "Мой гость", "stimulus": "Мой гость.", "answers": ["Менің қонағым", "Қонағым"], "explanation": "Мой гость — наклейка владельца: Менің қонағым. Қонақпын — это «я гость».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G002", "codes": null, "rejects": ["қонақпын"]},
  {"id": "p3-33-a03", "session": "A", "n": 3, "title": "Я учитель", "stimulus": "Я учитель.", "answers": ["Мен мұғаліммін", "Мұғаліммін"], "explanation": "Я учитель — личный хвост мын: Мен мұғаліммін. Мұғалімім — «мой учитель».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G003", "codes": null, "rejects": ["мұғалімім"]},
  {"id": "p3-33-a04", "session": "A", "n": 4, "title": "Мой учитель", "stimulus": "Мой учитель.", "answers": ["Менің мұғалімім", "Мұғалімім"], "explanation": "Мой учитель — наклейка: Менің мұғалімім. Мұғаліммін — «я учитель».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G004", "codes": null, "rejects": ["мұғаліммін"]},
  {"id": "p3-33-a05", "session": "A", "n": 5, "title": "Ты начальник", "stimulus": "Ты начальник.", "answers": ["Сен бастықсың", "Бастықсың"], "explanation": "Ты начальник — личный хвост сың: Сен бастықсың. Бастығың — «твой начальник».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G005", "codes": null, "rejects": ["бастығың"]},
  {"id": "p3-33-a06", "session": "A", "n": 6, "title": "Твой начальник", "stimulus": "Твой начальник.", "answers": ["Сенің бастығың", "Бастығың"], "explanation": "Твой начальник — наклейка: Сенің бастығың. Бастықсың — «ты начальник».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G006", "codes": null, "rejects": ["бастықсың"]},
  {"id": "p3-33-a07", "session": "A", "n": 7, "title": "Ты отец", "stimulus": "Ты отец.", "answers": ["Сен әкесің", "Әкесің"], "explanation": "Ты отец — личный хвост: Сен әкесің. Әкең — «твой отец».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G007", "codes": null, "rejects": ["әкең"]},
  {"id": "p3-33-a08", "session": "A", "n": 8, "title": "Твой отец", "stimulus": "Твой отец.", "answers": ["Сенің әкең", "Әкең"], "explanation": "Твой отец — наклейка: Сенің әкең. Әкесің — «ты отец».", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G008", "codes": null, "rejects": ["әкесің"]},
  {"id": "p3-33-a09", "session": "A", "n": 9, "title": "Мы дети", "stimulus": "Мы дети.", "answers": ["Біз баламыз"], "explanation": "Біз баламыз — кто: мы дети. Біздің баламыз — наш ребёнок. Не меняй местами.", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G009", "codes": null, "rejects": ["Біздің баламыз"]},
  {"id": "p3-33-a10", "session": "A", "n": 10, "title": "Наш ребёнок", "stimulus": "Наш ребёнок.", "answers": ["Біздің баламыз"], "explanation": "Біздің баламыз — чей: наш ребёнок. Біз баламыз — мы дети. Не меняй местами.", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G010", "codes": null, "rejects": ["Біз баламыз"]},
  {"id": "p3-33-a11", "session": "A", "n": 11, "title": "Чей хвост", "stimulus": "В строке «Біздің баламыз» хвост -мыз отвечает на вопрос", "answers": ["чьё", "чей", "притяжательное"], "explanation": "При Біздің хвост -мыз отвечает «чьё»: наш ребёнок.", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G011r", "codes": null, "rejects": ["кто", "кто мы", "личное"]},
  {"id": "p3-33-a12", "session": "A", "n": 12, "title": "Кто хвост", "stimulus": "В строке «Біз баламыз» хвост -мыз отвечает на вопрос", "answers": ["кто", "кто мы", "личное"], "explanation": "При Біз хвост -мыз отвечает «кто»: мы дети.", "rule": "T28_OWNER_SUBJECT", "error": "PERSON_VS_POSS", "gold": "G012r", "codes": null, "rejects": ["чьё", "чей", "притяжательное"]},
  {"id": "p3-33-c01", "session": "C", "n": 1, "title": "сенің + дос", "stimulus": "сенің + дос → ?", "answers": ["досың", "сенің досың"], "explanation": "Владелец сен: сенің досың. Не досым.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_WRONG_PERSON", "gold": "G011", "codes": null, "rejects": ["досым"]},
  {"id": "p3-33-c02", "session": "C", "n": 2, "title": "менің + қонақ", "stimulus": "менің + қонақ → ?", "answers": ["қонағым", "менің қонағым"], "explanation": "Владелец мен: менің қонағым. Не қонағың.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_WRONG_PERSON", "gold": "G012", "codes": null, "rejects": ["қонағың"]},
  {"id": "p3-33-c03", "session": "C", "n": 3, "title": "сіздің + оқушы", "stimulus": "сіздің + оқушы → ?", "answers": ["оқушыңыз", "сіздің оқушыңыз"], "explanation": "Владелец сіз: сіздің оқушыңыз. Не оқушың.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_WRONG_PERSON", "gold": "G013", "codes": null, "rejects": ["оқушың"]},
  {"id": "p3-33-c04", "session": "C", "n": 4, "title": "оның + қала", "stimulus": "оның + қала → ?", "answers": ["қаласы", "оның қаласы"], "explanation": "Владелец ол: оның қаласы. Не қалам.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_WRONG_PERSON", "gold": "G014", "codes": null, "rejects": ["қалам"]},
  {"id": "p3-33-c05", "session": "C", "n": 5, "title": "біздің + сынып", "stimulus": "Біздің + сынып → ?", "answers": ["сыныбымыз", "біздің сыныбымыз", "біздің сынып"], "explanation": "Для біздің живы оба варианта этого урока: біздің сынып и біздің сыныбымыз. Голое сынып не равно сыныбымыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G071", "codes": null, "rejects": ["сынып", "менің сынып"]},
  {"id": "p3-33-c06", "session": "C", "n": 6, "title": "сендердің + сыныптас", "stimulus": "сендердің + сыныптас → ?", "answers": ["сыныптастарың", "сендердің сыныптастарың"], "explanation": "В модели урока у сендердің сначала «много»: сыныптастарың, не сыныптасың.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_NO_PL", "gold": "G018", "codes": null, "rejects": ["сыныптасың"]},
  {"id": "p3-33-c07", "session": "C", "n": 7, "title": "сіздердің + іс", "stimulus": "сіздердің + іс → ?", "answers": ["істеріңіз", "сіздердің істеріңіз"], "explanation": "В модели урока у сіздердің сначала «много»: істеріңіз. ісіңіз не единственный ответ.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_NO_PL", "gold": "G019", "codes": null, "rejects": ["ісіңіз"]},
  {"id": "p3-33-c08", "session": "C", "n": 8, "title": "олардың + қонақ", "stimulus": "олардың + қонақ (один гость) → ?", "answers": ["қонағы", "олардың қонағы"], "explanation": "Один гость: олардың қонағы. қонақтары не требуем.", "rule": "T30_THIRD_ZERO", "error": "POSS_OLAR_FORCE_PL", "gold": "G020", "codes": null, "rejects": ["қонағым"]},
  {"id": "p3-33-c09", "session": "C", "n": 9, "title": "менің + мектеп", "stimulus": "менің + мектеп → ?", "answers": ["мектебім", "менің мектебім"], "explanation": "мектеп + ім → мектебім: п оживает в б.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_ASSIM", "gold": "G015", "codes": null, "rejects": ["мектепім"]},
  {"id": "p3-33-c10", "session": "C", "n": 10, "title": "сенің + аяқ", "stimulus": "сенің + аяқ → ?", "answers": ["аяғың", "сенің аяғың"], "explanation": "аяқ + ың → аяғың: қ оживает в ғ.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_ASSIM", "gold": "G016", "codes": null, "rejects": ["аяқың"]},
  {"id": "p3-33-c11", "session": "C", "n": 11, "title": "біздің + бастық", "stimulus": "біздің + бастық → ?", "answers": ["бастығымыз", "біздің бастығымыз"], "explanation": "бастық + ымыз → бастығымыз: қ оживает в ғ.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_ASSIM", "gold": "G017", "codes": null, "rejects": ["бастықымыз"]},
  {"id": "p3-33-c12", "session": "C", "n": 12, "title": "оның + отбасы", "stimulus": "оның + отбасы → ?", "answers": ["отбасы", "оның отбасы"], "explanation": "оның отбасы. Лишняя сы не нужна: не оның отбасысы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G060c", "codes": null, "rejects": ["оның отбасысы"]},
  {"id": "p3-33-d01", "session": "D", "n": 1, "title": "Я твой друг", "stimulus": "Я твой друг.", "answers": ["Мен сенің досыңмын."], "explanation": "Владелец сен: сенің досың. Субъект мен: личное мын. Мен сенің досыңмын.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "G021", "codes": null, "rejects": ["Мен сенің досымсың"]},
  {"id": "p3-33-d02", "session": "D", "n": 2, "title": "Ты мой друг", "stimulus": "Ты мой друг.", "answers": ["Сен менің досымсың."], "explanation": "Владелец мен: менің досым. Субъект сен: личное сың. Сен менің досымсың.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "G022", "codes": null, "rejects": ["Сен менің досыңмын"]},
  {"id": "p3-33-d03", "session": "D", "n": 3, "title": "Вы мой гость", "stimulus": "Вы мой гость.", "answers": ["Сіз менің қонағымсыз."], "explanation": "Владелец мен: менің қонағым. Субъект сіз: личное сыз. Сіз менің қонағымсыз.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G023", "codes": null, "rejects": ["Сіз менің қонағымсың"]},
  {"id": "p3-33-d04", "session": "D", "n": 4, "title": "Я Ваш гость", "stimulus": "Я Ваш гость.", "answers": ["Мен сіздің қонағыңызбын."], "explanation": "Владелец сіз: сіздің қонағыңыз. Субъект мен: личное бын. Мен сіздің қонағыңызбын.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G024", "codes": null, "rejects": ["Мен сіздің қонағыңызмын"]},
  {"id": "p3-33-d05", "session": "D", "n": 5, "title": "Я Ваш учитель", "stimulus": "Я Ваш учитель.", "answers": ["Мен сіздің мұғаліміңізбін."], "explanation": "Владелец сіз: сіздің мұғаліміңіз. Субъект мен: личное бін. Мен сіздің мұғаліміңізбін.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G025", "codes": null, "rejects": ["Мен сіздің мұғаліміңізмін"]},
  {"id": "p3-33-d06", "session": "D", "n": 6, "title": "Вы мой учитель", "stimulus": "Вы мой учитель.", "answers": ["Сіз менің мұғалімімсіз."], "explanation": "Владелец мен: менің мұғалімім. Субъект сіз: личное сіз. Сіз менің мұғалімімсіз.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G026", "codes": null, "rejects": ["Сіз менің мұғалімімсің"]},
  {"id": "p3-33-d07", "session": "D", "n": 7, "title": "Я твой одноклассник", "stimulus": "Я твой одноклассник.", "answers": ["Мен сенің сыныптасыңмын."], "explanation": "Владелец сен: сенің сыныптасың. Субъект мен: личное мын. Мен сенің сыныптасыңмын.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "G027", "codes": null, "rejects": ["Мен сенің сыныптасымын"]},
  {"id": "p3-33-d08", "session": "D", "n": 8, "title": "Ты мой враг", "stimulus": "Ты мой враг.", "answers": ["Сен менің жауымсың."], "explanation": "Владелец мен: менің жауым. Субъект сен: личное сың. Сен менің жауымсың.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "G028", "codes": null, "rejects": ["Сен менің жауыңсың"]},
  {"id": "p3-33-d09", "session": "D", "n": 9, "title": "Я её парень", "stimulus": "Я её парень.", "answers": ["Мен оның жігітімін."], "explanation": "Владелец ол: оның жігіті. Субъект мен: личное мін. Наклейка чьего не пропадает.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G029", "codes": null, "rejects": ["Мен оның жігітпін"]},
  {"id": "p3-33-d10", "session": "D", "n": 10, "title": "Ты её младшая сестра", "stimulus": "Ты её младшая сестра.", "answers": ["Сен оның сіңлісісің."], "explanation": "Владелец ол: оның сіңлісі. Субъект сен: личное сің. Сен оның сіңлісісің.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "G030", "codes": null, "rejects": ["Сен оның сіңлісімсің"]},
  {"id": "p3-33-d11", "session": "D", "n": 11, "title": "Вы моя тётя", "stimulus": "Вы моя тётя.", "answers": ["Сіз менің тәтемсіз."], "explanation": "Владелец мен: менің тәтем. Субъект сіз: личное сіз. Без наклейки смысл «моя» теряется.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_MISSING", "gold": "G031", "codes": null, "rejects": ["Сіз менің тәтесіз"]},
  {"id": "p3-33-d12", "session": "D", "n": 12, "title": "Вы мой родственник", "stimulus": "Вы мой родственник.", "answers": ["Сіз менің туысымсыз."], "explanation": "Владелец мен: менің туысым. Субъект сіз: личное сыз. Сіз менің туысымсыз.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_MISSING", "gold": "G032", "codes": null, "rejects": ["Сіз менің туыссыз"]},
  {"id": "p3-33-d13", "session": "D", "n": 13, "title": "Я твой сосед", "stimulus": "Я твой сосед.", "answers": ["Мен сенің көршіңмін."], "explanation": "Владелец сен: сенің көршің. Субъект мен: личное мін, не бін. Мен сенің көршіңмін.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G033", "codes": null, "rejects": ["Мен сенің көршіңбін"]},
  {"id": "p3-33-d14", "session": "D", "n": 14, "title": "Я Ваш знакомый", "stimulus": "Я Ваш знакомый.", "answers": ["Мен сіздің танысыңызбын."], "explanation": "Владелец сіз: сіздің танысыңыз. Субъект мен: личное бын. Мен сіздің танысыңызбын.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G034", "codes": null, "rejects": ["Мен сіздің танысыңызмын"]},
  {"id": "p3-33-d15", "session": "D", "n": 15, "title": "Ты мой сын", "stimulus": "Ты мой сын.", "answers": ["Сен менің ұлымсың."], "explanation": "Владелец мен: менің ұлым. Субъект сен: личное сың. Сен менің ұлымсың.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "G035", "codes": null, "rejects": ["Сен менің ұлыңсың"]},
  {"id": "p3-33-d16", "session": "D", "n": 16, "title": "Он Ваш гость", "stimulus": "Он Ваш гость.", "answers": ["Ол сіздің қонағыңыз."], "explanation": "Владелец сіз: сіздің қонағыңыз. Субъект ол: личного хвоста нет. Ол сіздің қонағыңыз.", "rule": "T29_POSS_PERSON_STACK", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "G036", "codes": null, "rejects": ["Ол сіздің қонағыңызсыз", "қонағыңызсың"]},
  {"id": "p3-33-e01", "session": "E", "n": 1, "title": "Владелец → сіз", "stimulus": "Мен сенің досыңмын. Поменяй владельца на сіз.", "answers": ["Мен сіздің досыңызбын."], "explanation": "Поменялся владелец: сенің досың → сіздің досыңыз. Субъект мен и личное бын остались.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e02", "session": "E", "n": 2, "title": "Субъект → сіз", "stimulus": "Мен сенің досыңмын. Поменяй субъект на сіз.", "answers": ["Сіз менің досымсыз."], "explanation": "Поменялся субъект: мен → сіз, личное сыз. Владелец мен: менің досым.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e03", "session": "E", "n": 3, "title": "Субъект → сен", "stimulus": "Сіз менің қонағымсыз. Поменяй субъект на сен.", "answers": ["Сен менің қонағымсың."], "explanation": "Поменялся субъект: сіз → сен, личное сың. Владелец мен: менің қонағым.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e04", "session": "E", "n": 4, "title": "Владелец → сен", "stimulus": "Мен сіздің оқушыңызбын. Поменяй владельца на сен.", "answers": ["Мен сенің оқушыңмын."], "explanation": "Поменялся владелец: сіздің оқушыңыз → сенің оқушың. Субъект мен: мын.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e05", "session": "E", "n": 5, "title": "Субъект → ол", "stimulus": "Сен оның сіңлісісің. Поменяй субъект на ол.", "answers": ["Ол оның сіңлісі."], "explanation": "Поменялся субъект на ол: личный хвост уходит. Владелец ол: оның сіңлісі.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G051", "codes": null, "rejects": []},
  {"id": "p3-33-e06", "session": "E", "n": 6, "title": "Субъект → сіз", "stimulus": "Сен менің көршімсің. Поменяй субъект на сіз.", "answers": ["Сіз менің көршімсіз."], "explanation": "Поменялся субъект: сен → сіз, личное сіз. Владелец мен: менің көршім.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e07", "session": "E", "n": 7, "title": "Владелец → сіз", "stimulus": "Мен сенің бастығыңмын. Поменяй владельца на сіз.", "answers": ["Мен сіздің бастығыңызбын."], "explanation": "Поменялся владелец: сенің бастығың → сіздің бастығыңыз. Субъект мен: бын.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e08", "session": "E", "n": 8, "title": "Владелец → мен", "stimulus": "Сіз оның ағасыз. Поменяй владельца на мен.", "answers": ["Сіз менің ағамсыз."], "explanation": "Поменялся владелец: оның ағасы → менің ағам. Субъект сіз: сыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e09", "session": "E", "n": 9, "title": "Субъект → мен", "stimulus": "Сіз менің қонағымсыз. Поменяй субъект на мен.", "answers": ["Мен сіздің қонағыңызбын."], "explanation": "Поменялся субъект: сіз → мен, личное бын. Владелец сіз: сіздің қонағыңыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e10", "session": "E", "n": 10, "title": "Владелец → ол", "stimulus": "Сен менің ұлымсың. Поменяй владельца на ол.", "answers": ["Сен оның ұлысың."], "explanation": "Поменялся владелец: менің ұлым → оның ұлы, плюс личное сың субъекта сен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e11", "session": "E", "n": 11, "title": "Владелец → сен", "stimulus": "Мен оның жігітімін. Поменяй владельца на сен.", "answers": ["Мен сенің жігітіңмін."], "explanation": "Поменялся владелец: оның жігіті → сенің жігітің. Субъект мен: мін.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-e12", "session": "E", "n": 12, "title": "Владелец → ол", "stimulus": "Сіз менің мұғалімімсіз. Поменяй владельца на ол.", "answers": ["Сіз оның мұғалімісіз."], "explanation": "Поменялся владелец: менің мұғалімім → оның мұғалімі. Субъект сіз: сіз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null, "rejects": []},
  {"id": "p3-33-f01", "session": "F", "n": 1, "title": "Досымсың", "stimulus": "Досымсың", "answers": ["Ты мой друг"], "explanation": "Досым — мой, сың — ты. Это «ты мой друг», не «я твой друг».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G037", "codes": null, "rejects": ["Я твой друг"]},
  {"id": "p3-33-f02", "session": "F", "n": 2, "title": "Бастығыңмын", "stimulus": "Бастығыңмын", "answers": ["Я твой начальник"], "explanation": "Бастығың — твой, мын — я. Это «я твой начальник».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G038", "codes": null, "rejects": ["Ты мой начальник"]},
  {"id": "p3-33-f03", "session": "F", "n": 3, "title": "Балаңызбын", "stimulus": "Балаңызбын", "answers": ["Я Ваш ребёнок", "Я Ваш (сіздің) ребёнок"], "explanation": "Балаңыз — Ваш (сіз), бын — я. Это «я Ваш ребёнок».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G039", "codes": null, "rejects": ["Вы мой ребёнок"]},
  {"id": "p3-33-f04", "session": "F", "n": 4, "title": "Ұлымсың", "stimulus": "Ұлымсың", "answers": ["Ты мой сын"], "explanation": "Ұлым — мой, сың — ты. Это «ты мой сын».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G040", "codes": null, "rejects": ["Я твой сын"]},
  {"id": "p3-33-f05", "session": "F", "n": 5, "title": "Туысымсыз", "stimulus": "Туысымсыз", "answers": ["Вы мой родственник", "Вы (сіз) мой родственник"], "explanation": "Туысым — мой, сыз — вы (сіз). В переводе нужен субъект.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G041", "codes": null, "rejects": ["мой родственник"]},
  {"id": "p3-33-f06", "session": "F", "n": 6, "title": "Әріптесімсіз", "stimulus": "Әріптесімсіз", "answers": ["Вы мой коллега", "Вы (сіз) мой коллега"], "explanation": "Әріптесім — мой, сіз — вы. Это «вы мой коллега».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G042", "codes": null, "rejects": ["Я ваш коллега"]},
  {"id": "p3-33-f07", "session": "F", "n": 7, "title": "Бастығысың", "stimulus": "Бастығысың", "answers": ["Ты его начальник", "Ты её начальник", "Ты их начальник"], "explanation": "Бастығы — его/её/их, сың — ты. Не перевод без «ты».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G043", "codes": null, "rejects": ["его начальник"]},
  {"id": "p3-33-f08", "session": "F", "n": 8, "title": "Қарындасымын", "stimulus": "Қарындасымын", "answers": ["Я его младшая сестра", "Я её младшая сестра", "Я их младшая сестра"], "explanation": "Қарындасы — третье «чьё», мын — я. Не голая личная форма.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G044", "codes": null, "rejects": ["Я младшая сестра"]},
  {"id": "p3-33-f09", "session": "F", "n": 9, "title": "Қызыңмын", "stimulus": "Қызыңмын", "answers": ["Я твоя дочь", "Я твоя девушка"], "explanation": "Қызың — твоя, мын — я. Оба чтения: дочь и девушка.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G045", "codes": null, "rejects": ["Ты моя дочь"]},
  {"id": "p3-33-f10", "session": "F", "n": 10, "title": "Бабамсыз", "stimulus": "Бабамсыз", "answers": ["Вы мой предок", "Вы (сіз) мой предок"], "explanation": "Бабам — мой, сыз — вы. Это «вы мой предок».", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G046", "codes": null, "rejects": ["Я ваш предок"]},
  {"id": "p3-33-f11", "session": "F", "n": 11, "title": "Он мой друг", "stimulus": "Он мой друг.", "answers": ["Ол менің досым"], "explanation": "Субъект ол без личного хвоста. Владелец мен: менің досым. Ол менің досым.", "rule": "T30_THIRD_ZERO", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "G047", "codes": null, "rejects": ["Ол менің досымсың", "Ол менің досыммын"]},
  {"id": "p3-33-f12", "session": "F", "n": 12, "title": "Он Ваш гость", "stimulus": "Он Ваш гость.", "answers": ["Ол сіздің қонағыңыз"], "explanation": "Субъект ол без личного хвоста. Владелец сіз: сіздің қонағыңыз.", "rule": "T30_THIRD_ZERO", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "G049", "codes": null, "rejects": ["Ол сіздің қонағыңызсыз"]},
  {"id": "p3-33-f13", "session": "F", "n": 13, "title": "Он мой учитель", "stimulus": "Он мой учитель.", "answers": ["Ол менің мұғалімім"], "explanation": "Субъект ол без личного хвоста. Владелец мен: менің мұғалімім.", "rule": "T30_THIRD_ZERO", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "F13", "codes": null, "rejects": ["Ол менің мұғалімімсіз"]},
  {"id": "p3-33-f14", "session": "F", "n": 14, "title": "Она твоя подруга", "stimulus": "Она твоя подруга.", "answers": ["Ол сенің құрбың"], "explanation": "Субъект ол без личного хвоста. Владелец сен: сенің құрбың.", "rule": "T30_THIRD_ZERO", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "G048", "codes": null, "rejects": ["Ол сенің құрбыңсың"]},
  {"id": "p3-33-g01", "session": "G", "n": 1, "title": "Ты не мой враг", "stimulus": "Ты не мой враг.", "answers": ["Сен менің жауым емессің."], "explanation": "Личное сың садится на емес. Наклейка жауым остаётся. Сен менің жауым емессің.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G052", "codes": null, "rejects": ["Сен менің жауымсың емес"]},
  {"id": "p3-33-g02", "session": "G", "n": 2, "title": "Я не твой ребёнок", "stimulus": "Я не твой ребёнок.", "answers": ["Мен сенің балаң емеспін."], "explanation": "Личное пін на емес. Наклейка балаң остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G053", "codes": null, "rejects": ["Мен сенің балаңмын емес"]},
  {"id": "p3-33-g03", "session": "G", "n": 3, "title": "Вы не мой сосед", "stimulus": "Вы не мой сосед.", "answers": ["Сіз менің көршім емессіз."], "explanation": "Личное сіз на емес. Наклейка көршім остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G054", "codes": null, "rejects": ["көршімсіз емес"]},
  {"id": "p3-33-g04", "session": "G", "n": 4, "title": "Я не Ваш учитель", "stimulus": "Я не Ваш учитель.", "answers": ["Мен сіздің мұғаліміңіз емеспін."], "explanation": "Личное пін на емес. Наклейка мұғаліміңіз остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G055", "codes": null, "rejects": ["мұғаліміңізбін емес"]},
  {"id": "p3-33-g05", "session": "G", "n": 5, "title": "Она не его младшая сестра", "stimulus": "Она не его младшая сестра.", "answers": ["Ол оның қарындасы емес."], "explanation": "Субъект ол: на емес нет личного хвоста. Наклейка қарындасы остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G056", "codes": null, "rejects": ["Ол оның қарындасы емессің", "Ол оның қарындасы емеспін"]},
  {"id": "p3-33-g06", "session": "G", "n": 6, "title": "Ты не мой старший брат", "stimulus": "Ты не мой старший брат.", "answers": ["Сен менің ағам емессің."], "explanation": "Личное сың на емес. Наклейка ағам остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G006b", "codes": null, "rejects": ["Сен менің ағамсың емес"]},
  {"id": "p3-33-g07", "session": "G", "n": 7, "title": "Вы не его старший брат", "stimulus": "Вы не его старший брат.", "answers": ["Сіз оның ағасы емессіз."], "explanation": "Личное сіз на емес. Наклейка ағасы остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G057", "codes": null, "rejects": ["Сіз оның ағасысыз емес"]},
  {"id": "p3-33-g08", "session": "G", "n": 8, "title": "Я не Ваш сын", "stimulus": "Я не Ваш сын.", "answers": ["Мен сіздің ұлыңыз емеспін."], "explanation": "Личное пін на емес. Наклейка ұлыңыз остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G058", "codes": null, "rejects": ["Мен сіздің ұл емеспін"]},
  {"id": "p3-33-g09", "session": "G", "n": 9, "title": "Ты не его семья", "stimulus": "Ты не его семья.", "answers": ["Сен оның отбасы емессің."], "explanation": "Личное сың уходит на емес и оставляет отбасы. Лишней сы нет.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G067", "codes": null, "rejects": ["Сен оның отбасысы емессің"]},
  {"id": "p3-33-g10", "session": "G", "n": 10, "title": "Вы не моя бабушка", "stimulus": "Вы не моя бабушка.", "answers": ["Сіз менің апам емессіз."], "explanation": "Личное сіз на емес. Наклейка апам остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G059", "codes": null, "rejects": ["Сіз менің апа емессіз"]},
  {"id": "p3-33-g11", "session": "G", "n": 11, "title": "Я не твой ребёнок, ещё раз", "stimulus": "Я не твой ребёнок, ещё раз.", "answers": ["Мен сенің балаң емеспін."], "explanation": "Личное пін на емес. Наклейка балаң остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G053b", "codes": null, "rejects": ["Мен сенің балаңмын емес"]},
  {"id": "p3-33-g12", "session": "G", "n": 12, "title": "Ты не мой старший брат, ещё раз", "stimulus": "Ты не мой старший брат, ещё раз.", "answers": ["Сен менің ағам емессің."], "explanation": "Личное сың на емес. Наклейка ағам остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G006c", "codes": null, "rejects": ["Сен менің ағамсың емес"]},
  {"id": "p3-33-g13", "session": "G", "n": 13, "title": "Вы не мой сосед, ещё раз", "stimulus": "Вы не мой сосед, ещё раз.", "answers": ["Сіз менің көршім емессіз."], "explanation": "Личное сіз на емес. Наклейка көршім остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G054b", "codes": null, "rejects": ["көршімсіз емес"]},
  {"id": "p3-33-g14", "session": "G", "n": 14, "title": "Я не Ваш учитель, ещё раз", "stimulus": "Я не Ваш учитель, ещё раз.", "answers": ["Мен сіздің мұғаліміңіз емеспін."], "explanation": "Личное пін на емес. Наклейка мұғаліміңіз остаётся.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G055b", "codes": null, "rejects": ["мұғаліміңізбін емес"]},
  {"id": "p3-33-g15", "session": "G", "n": 15, "title": "Она не его младшая сестра, ещё раз", "stimulus": "Она не его младшая сестра, ещё раз.", "answers": ["Ол оның қарындасы емес."], "explanation": "Субъект ол: емес без личного хвоста.", "rule": "T31_EMES_STACK", "error": "EMES_PERSON_POSITION", "gold": "G056b", "codes": null, "rejects": ["емессің", "емеспін"]},
  {"id": "p3-33-h01", "session": "H", "n": 1, "title": "Его семья", "stimulus": "Его/её семья.", "answers": ["Оның отбасы"], "explanation": "Оның отбасы. Форма отбасысы здесь лишняя.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G060", "codes": null, "rejects": ["Оның отбасысы"]},
  {"id": "p3-33-h02", "session": "H", "n": 2, "title": "Исправь отбасысы", "stimulus": "Оның отбасысы", "answers": ["Оның отбасы"], "explanation": "Лишняя сы. Живое: Оның отбасы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G069", "codes": null, "rejects": ["Оның отбасысы"]},
  {"id": "p3-33-h03", "session": "H", "n": 3, "title": "Моя семья", "stimulus": "менің + отбасы → ?", "answers": ["менің отбасым", "отбасым"], "explanation": "Школьная форма: менің отбасым. Голое менің отбасы здесь не ответ.", "rule": "T32_OTBASY", "error": "POSS_PERSON_STACK", "gold": "G061", "codes": null, "rejects": ["менің отбасы"]},
  {"id": "p3-33-h04", "session": "H", "n": 4, "title": "Ваша семья", "stimulus": "сіздің + отбасы → ?", "answers": ["сіздің отбасыңыз", "отбасыңыз"], "explanation": "Школьная форма: сіздің отбасыңыз.", "rule": "T32_OTBASY", "error": "POSS_PERSON_STACK", "gold": "G063", "codes": null, "rejects": ["сіздің отбасы"]},
  {"id": "p3-33-h05", "session": "H", "n": 5, "title": "Наша семья", "stimulus": "біздің + отбасы → ?", "answers": ["біздің отбасымыз", "отбасымыз"], "explanation": "біздің отбасымыз. Не переписывай в отбасысы.", "rule": "T32_OTBASY", "error": "POSS_PERSON_STACK", "gold": "G064", "codes": null, "rejects": ["отбасысы"]},
  {"id": "p3-33-h06", "session": "H", "n": 6, "title": "Ты его семья", "stimulus": "Ты его/её семья.", "answers": ["Сен оның отбасысың"], "explanation": "Сен оның отбасысың: личное сың на отбасы. Вторая сы не нужна.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G065", "codes": null, "rejects": ["Сен оның отбасысысың"]},
  {"id": "p3-33-h07", "session": "H", "n": 7, "title": "Исправь двойную сы", "stimulus": "Сен оның отбасысысың", "answers": ["Сен оның отбасысың"], "explanation": "Лишняя сы. Живое: Сен оның отбасысың.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G070", "codes": null, "rejects": ["Сен оның отбасысысың"]},
  {"id": "p3-33-h08", "session": "H", "n": 8, "title": "Біздің сынып", "stimulus": "Біздің сынып", "answers": ["Наш класс"], "explanation": "Біздің сынып — наш класс. Этот нулевой вариант жив только у біздің в этом уроке.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G071b", "codes": null, "rejects": []},
  {"id": "p3-33-h09", "session": "H", "n": 9, "title": "Біздің сыныбымыз", "stimulus": "Біздің сыныбымыз", "answers": ["Наш класс"], "explanation": "Біздің сыныбымыз — тоже наш класс. Рядом с нулевым вариантом, не вместо него.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G072b", "codes": null, "rejects": []},
  {"id": "p3-33-h10", "session": "H", "n": 10, "title": "Два варианта города", "stimulus": "Наш город. Напиши оба варианта.", "answers": [], "explanation": "Оба варианта біздің: біздің қала и біздің қаламыз. Это не правило для менің.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G075", "codes": null, "rejects": [], "fields": [{"label": "Без притяжательного окончания", "kind": "text", "answers": ["біздің қала"]}, {"label": "С окончанием", "kind": "text", "answers": ["біздің қаламыз"]}]},
  {"id": "p3-33-h11", "session": "H", "n": 11, "title": "Исправь семью в строке", "stimulus": "Оның отбасысы жақсы", "answers": ["Оның отбасы жақсы"], "explanation": "Лишняя сы. Живое: Оның отбасы жақсы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G068", "codes": null, "rejects": ["Оның отбасысы жақсы"]},
  {"id": "p3-33-h12", "session": "H", "n": 12, "title": "Отрицание семьи", "stimulus": "Ты не его/её семья.", "answers": ["Сен оның отбасы емессің"], "explanation": "В отрицании личное уходит на емес: Сен оның отбасы емессің. Не отбасысы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G067b", "codes": null, "rejects": ["Сен оның отбасысы емессің"]},
  {"id": "p3-33-i01", "session": "I", "n": 1, "title": "Умный ребёнок", "stimulus": "Умный ребёнок.", "answers": ["Ақылды бала"], "explanation": "Ақылды бала — признак слева, определение. Не подменяй сказуемым Бала ақылды.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G076", "codes": null, "rejects": ["Бала ақылды"]},
  {"id": "p3-33-i02", "session": "I", "n": 2, "title": "Ребёнок умный", "stimulus": "Ребёнок умный.", "answers": ["Бала ақылды"], "explanation": "Бала ақылды — признак справа, сказуемое. Не подменяй определением Ақылды бала.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G077", "codes": null, "rejects": ["Ақылды бала"]},
  {"id": "p3-33-i03", "session": "I", "n": 3, "title": "Мой класс хороший", "stimulus": "Мой класс хороший.", "answers": ["Менің сыныбым жақсы"], "explanation": "Менің сыныбым жақсы. Наклейка на сынып, признак справа.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G078", "codes": null, "rejects": []},
  {"id": "p3-33-i04", "session": "I", "n": 4, "title": "Его ребёнок плохой", "stimulus": "Его ребёнок плохой.", "answers": ["Оның баласы жаман"], "explanation": "Оның баласы жаман.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G079", "codes": null, "rejects": []},
  {"id": "p3-33-i05", "session": "I", "n": 5, "title": "Ваш одноклассник умный", "stimulus": "Ваш одноклассник умный (сендердің).", "answers": ["Сендердің сыныптастарың ақылды"], "explanation": "Сендердің сыныптастарың ақылды.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G080", "codes": null, "rejects": []},
  {"id": "p3-33-i06", "session": "I", "n": 6, "title": "Молодой специалист бедный", "stimulus": "Молодой специалист бедный.", "answers": ["Жас маман кедей"], "explanation": "Жас маман кедей.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G081", "codes": null, "rejects": []},
  {"id": "p3-33-i07", "session": "I", "n": 7, "title": "Ваше дело хорошее", "stimulus": "Ваше дело хорошее (сіздердің).", "answers": ["Сіздердің істеріңіз жақсы"], "explanation": "Сіздердің істеріңіз жақсы.", "rule": "T33_ADJ_ROLE", "error": "ADJ_ROLE_ORDER", "gold": "G082", "codes": null, "rejects": []},
  {"id": "p3-33-i08", "session": "I", "n": 8, "title": "Кто?", "stimulus": "Кто?", "answers": ["кім", "Кім"], "explanation": "Кто — кім.", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G083", "codes": null, "rejects": ["не"]},
  {"id": "p3-33-i09", "session": "I", "n": 9, "title": "Что?", "stimulus": "Что?", "answers": ["не", "Не"], "explanation": "Что — не.", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G084", "codes": null, "rejects": ["кім"]},
  {"id": "p3-33-i10", "session": "I", "n": 10, "title": "Какой по признаку?", "stimulus": "Какой? (характеристика)", "answers": ["қандай", "Қандай"], "explanation": "Характеристика — қандай.", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G085", "codes": null, "rejects": ["қай", "нешінші"]},
  {"id": "p3-33-i11", "session": "I", "n": 11, "title": "Какой из?", "stimulus": "Какой / который из нескольких?", "answers": ["қай", "Қай"], "explanation": "Выбор из нескольких — қай.", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G086", "codes": null, "rejects": ["қандай", "нешінші"]},
  {"id": "p3-33-i12", "session": "I", "n": 12, "title": "Который по счёту?", "stimulus": "Который по счёту?", "answers": ["нешінші", "Нешінші"], "explanation": "Порядок по счёту — нешінші.", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G087", "codes": null, "rejects": ["қандай", "қай"]},
  {"id": "p3-33-i13", "session": "I", "n": 13, "title": "Кто это?", "stimulus": "Кто это?", "answers": ["Бұл кім?"], "explanation": "Кто это — Бұл кім?", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G088", "codes": null, "rejects": ["Бұл не?"]},
  {"id": "p3-33-i14", "session": "I", "n": 14, "title": "Что это?", "stimulus": "Что это?", "answers": ["Бұл не?"], "explanation": "Что это — Бұл не?", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G089", "codes": null, "rejects": ["Бұл кім?"]},
  {"id": "p3-33-i15", "session": "I", "n": 15, "title": "Какой дом?", "stimulus": "Какой дом? (характеристика)", "answers": ["Қандай үй?"], "explanation": "Характеристика дома — Қандай үй?", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G090", "codes": null, "rejects": ["Қай үй?"]},
  {"id": "p3-33-i16", "session": "I", "n": 16, "title": "Который дом?", "stimulus": "Какой дом из нескольких?", "answers": ["Қай үй?"], "explanation": "Выбор дома — Қай үй?", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G091", "codes": null, "rejects": ["Қандай үй?", "Нешінші үй?"]},
  {"id": "p3-33-i17", "session": "I", "n": 17, "title": "Который по счёту дом?", "stimulus": "Который по счёту дом?", "answers": ["Нешінші үй?"], "explanation": "Дом по счёту — Нешінші үй?", "rule": "T34_INTERROGATIVE", "error": "INTERROGATIVE_CHOICE", "gold": "G092", "codes": null, "rejects": ["Қандай үй?"]},
  {"id": "p3-33-j01", "session": "J", "n": 1, "title": "Исправь", "stimulus": "Мен сенің досымсың", "answers": ["Мен сенің досыңмын."], "explanation": "Владелец сен требует досың, субъект мен требует мын. Мен сенің досыңмын.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "G096", "codes": null, "rejects": ["Мен сенің досымсың"]},
  {"id": "p3-33-j02", "session": "J", "n": 2, "title": "Исправь", "stimulus": "Сіз менің қонағымсың", "answers": ["Сіз менің қонағымсыз."], "explanation": "Субъект сіз: личное сыз, не сың. Сіз менің қонағымсыз.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G097", "codes": null, "rejects": ["Сіз менің қонағымсың"]},
  {"id": "p3-33-j03", "session": "J", "n": 3, "title": "Исправь", "stimulus": "Мен сенің көршіңбін", "answers": ["Мен сенің көршіңмін."], "explanation": "После ң личное субъекта мен — мін, не бін.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "G098", "codes": null, "rejects": ["Мен сенің көршіңбін"]},
  {"id": "p3-33-j04", "session": "J", "n": 4, "title": "Исправь", "stimulus": "Мен сіздің сыныптасыңмын", "answers": ["Мен сіздің сыныптасыңызбын."], "explanation": "Владелец сіз: сыныптасыңыз, не сыныптасың. Субъект мен: бын, не мын.", "rule": "T29_POSS_PERSON_STACK", "error": "MULTI_ERROR", "gold": "G099", "codes": ["POSS_WRONG_PERSON", "PERSON_AFTER_POSS_WRONG"], "rejects": ["Мен сіздің сыныптасыңмын"]},
  {"id": "p3-33-j05", "session": "J", "n": 5, "title": "Исправь", "stimulus": "Сіз менің апам", "answers": ["Сіз менің апамсыз."], "explanation": "Субъекту сіз не хватает личного сыз: Сіз менің апамсыз.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_MISSING", "gold": "G100", "codes": null, "rejects": ["Сіз менің апам"]},
  {"id": "p3-33-j06", "session": "J", "n": 6, "title": "Исправь", "stimulus": "Сен оның отбасысысың", "answers": ["Сен оның отбасысың."], "explanation": "Лишняя сы. Живое: Сен оның отбасысың.", "rule": "T29_POSS_PERSON_STACK", "error": "OTBASY_DOUBLE_POSS", "gold": "G094", "codes": null, "rejects": ["Сен оның отбасысысың"]},
  {"id": "p3-33-j07", "session": "J", "n": 7, "title": "Исправь", "stimulus": "Сен менің мұғалімім емесімсің", "answers": ["Сен менің мұғалімім емессің."], "explanation": "Личное сың садится на емес один раз. Наклейка мұғалімім остаётся.", "rule": "T29_POSS_PERSON_STACK", "error": "EMES_PERSON_POSITION", "gold": "G095", "codes": null, "rejects": ["Сен менің мұғалімім емесімсің"]},
  {"id": "p3-33-j08", "session": "J", "n": 8, "title": "Исправь", "stimulus": "Мен сенің досыммын", "answers": ["Мен сенің досыңмын."], "explanation": "Владелец сен: досың, не досым. Субъект мен: мын.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "J08", "codes": null, "rejects": ["Мен сенің досыммын"]},
  {"id": "p3-33-j09", "session": "J", "n": 9, "title": "Исправь", "stimulus": "Сен менің досыңсың", "answers": ["Сен менің досымсың."], "explanation": "Владелец мен: досым, не досың. Субъект сен: сың.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "J09", "codes": null, "rejects": ["Сен менің досыңсың"]},
  {"id": "p3-33-j10", "session": "J", "n": 10, "title": "Исправь", "stimulus": "Ол менің досымсың", "answers": ["Ол менің досым."], "explanation": "Субъект ол без личного хвоста: Ол менің досым.", "rule": "T29_POSS_PERSON_STACK", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "J10", "codes": null, "rejects": ["Ол менің досымсың"]},
  {"id": "p3-33-j11", "session": "J", "n": 11, "title": "Исправь", "stimulus": "Мен сіздің мұғаліміңізмін", "answers": ["Мен сіздің мұғаліміңізбін."], "explanation": "После з личное субъекта мен — бін, не мін.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "J11", "codes": null, "rejects": ["Мен сіздің мұғаліміңізмін"]},
  {"id": "p3-33-j12", "session": "J", "n": 12, "title": "Исправь", "stimulus": "Сіз менің бастығымсың", "answers": ["Сіз менің бастығымсыз."], "explanation": "Субъект сіз: сыз, не сың.", "rule": "T29_POSS_PERSON_STACK", "error": "PERSON_AFTER_POSS_WRONG", "gold": "J12", "codes": null, "rejects": ["Сіз менің бастығымсың"]},
  {"id": "p3-33-j13", "session": "J", "n": 13, "title": "Исправь", "stimulus": "Мен оның жігітімсің", "answers": ["Мен оның жігітімін."], "explanation": "Владелец ол: жігіті, не жігітім. Субъект мен: мін.", "rule": "T29_POSS_PERSON_STACK", "error": "OWNER_SUBJECT_SWAP", "gold": "J13", "codes": null, "rejects": ["Мен оның жігітімсің"]},
  {"id": "p3-33-j14", "session": "J", "n": 14, "title": "Исправь", "stimulus": "Сен оның сіңлісімсің", "answers": ["Сен оның сіңлісісің."], "explanation": "Владелец ол: сіңлісі, не сіңлісім. Субъект сен: сің.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "J14", "codes": null, "rejects": ["Сен оның сіңлісімсің"]},
  {"id": "p3-33-j15", "session": "J", "n": 15, "title": "Исправь", "stimulus": "Оның отбасысы", "answers": ["Оның отбасы."], "explanation": "Лишняя сы. Живое: Оның отбасы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G093", "codes": null, "rejects": ["Оның отбасысы"]},
  {"id": "p3-33-j16", "session": "J", "n": 16, "title": "Исправь", "stimulus": "Мен сіздің ұлыңмын", "answers": ["Мен сіздің ұлыңызбын."], "explanation": "Владелец сіз: ұлыңыз, не ұлың. Субъект мен: бын, не мын.", "rule": "T29_POSS_PERSON_STACK", "error": "MULTI_ERROR", "gold": "J16", "codes": ["POSS_WRONG_PERSON", "PERSON_AFTER_POSS_WRONG"], "rejects": ["Мен сіздің ұлыңмын"]},
  {"id": "p3-33-j17", "session": "J", "n": 17, "title": "Исправь", "stimulus": "Менің дос", "answers": ["Менің досым."], "explanation": "Нужна наклейка: Менің досым.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "J17", "codes": null, "rejects": ["Менің дос"]},
  {"id": "p3-33-j18", "session": "J", "n": 18, "title": "Исправь", "stimulus": "Менің кітапым", "answers": ["Менің кітабым."], "explanation": "п оживает: Менің кітабым.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_ASSIM", "gold": "G101", "codes": null, "rejects": ["Менің кітапым"]},
  {"id": "p3-33-j19", "session": "J", "n": 19, "title": "Исправь", "stimulus": "Сендердің досың", "answers": ["Сендердің достарың."], "explanation": "В модели урока у сендердің сначала «много»: достарың.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_NO_PL", "gold": "G104", "codes": null, "rejects": ["Сендердің досың"]},
  {"id": "p3-33-j20", "session": "J", "n": 20, "title": "Исправь", "stimulus": "Сіздердің әкелерің", "answers": ["Сіздердің әкелеріңіз."], "explanation": "Хвост сіздер — ыңыз: әкелеріңіз, не әкелерің.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_WRONG_PERSON", "gold": "G105", "codes": null, "rejects": ["Сіздердің әкелерің"]},
  {"id": "p3-33-x-g050", "session": "X", "n": 50, "title": "Она его младшая сестра", "stimulus": "Она его младшая сестра (владелец мужчина).", "answers": ["Ол оның қарындасы"], "explanation": "Субъект ол без личного хвоста. Владелец: оның қарындасы.", "rule": "T30_THIRD_ZERO", "error": "THIRD_PERSON_EXTRA_PERSONAL", "gold": "G050", "codes": null, "rejects": ["Ол оның қарындасысың"]},
  {"id": "p3-33-x-g062", "session": "X", "n": 62, "title": "Твоя семья", "stimulus": "Твоя семья.", "answers": ["Сенің отбасың", "отбасың"], "explanation": "Сенің отбасың. Голое сенің отбасы не ответ.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G062", "codes": null, "rejects": ["сенің отбасы"]},
  {"id": "p3-33-x-g066", "session": "X", "n": 66, "title": "Вы его семья", "stimulus": "Вы (сіз) его/её семья.", "answers": ["Сіз оның отбасысыз"], "explanation": "Сіз оның отбасысыз: личное сыз на отбасы, без лишней сы.", "rule": "T32_OTBASY", "error": "OTBASY_DOUBLE_POSS", "gold": "G066", "codes": null, "rejects": ["Сіз оның отбасысысыз"]},
  {"id": "p3-33-x-g073", "session": "X", "n": 73, "title": "Наш город", "stimulus": "Наш город.", "answers": ["Біздің қала", "Біздің қаламыз"], "explanation": "Для біздің живы оба: біздің қала и біздің қаламыз. Голое қала не ответ. На менің этот нуль не переносится.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G073", "codes": null, "rejects": ["қала", "менің қала"]},
 ];
 const BSPEC=[
  {"id": "p3-33-b01", "session": "B", "n": 1, "title": "Я твой друг", "stimulus": "Я твой друг.", "answers": [], "explanation": "Кто: мен. Чей (основа, не сенің): сен.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B01", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["мен"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["сен"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b02", "session": "B", "n": 2, "title": "Ты мой друг", "stimulus": "Ты мой друг.", "answers": [], "explanation": "Кто: сен. Чей (основа, не сенің): мен.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B02", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["сен"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["мен"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b03", "session": "B", "n": 3, "title": "Вы (сіз) мой начальник", "stimulus": "Вы (сіз) мой начальник.", "answers": [], "explanation": "Кто: сіз. Чей (основа, не сенің): мен.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B03", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["сіз"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["мен"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b04", "session": "B", "n": 4, "title": "Я Ваш (сіздің) ученик", "stimulus": "Я Ваш (сіздің) ученик.", "answers": [], "explanation": "Кто: мен. Чей (основа, не сенің): сіз.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B04", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["мен"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["сіз"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b05", "session": "B", "n": 5, "title": "Она его младшая сестра", "stimulus": "Она его младшая сестра.", "answers": [], "explanation": "Кто: ол. Чей (основа, не сенің): ол.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B05", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["ол"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["ол"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b06", "session": "B", "n": 6, "title": "Мы ваши (сендердің) соседи", "stimulus": "Мы ваши (сендердің) соседи.", "answers": [], "explanation": "Кто: біз. Чей (основа, не сенің): сендер.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B06", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["біз"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["сендер"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b07", "session": "B", "n": 7, "title": "Вы (сендер) наши знакомые", "stimulus": "Вы (сендер) наши знакомые.", "answers": [], "explanation": "Кто: сендер. Чей (основа, не сенің): біз.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B07", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["сендер"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["біз"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b08", "session": "B", "n": 8, "title": "Вы (сіздер) его гости", "stimulus": "Вы (сіздер) его гости.", "answers": [], "explanation": "Кто: сіздер. Чей (основа, не сенің): ол.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B08", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["сіздер"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["ол"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b09", "session": "B", "n": 9, "title": "Ты его семья", "stimulus": "Ты его семья.", "answers": [], "explanation": "Кто: сен. Чей (основа, не сенің): ол.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B09", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["сен"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["ол"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b10", "session": "B", "n": 10, "title": "Я её парень", "stimulus": "Я её парень.", "answers": [], "explanation": "Кто: мен. Чей (основа, не сенің): ол.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B10", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["мен"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["ол"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b11", "session": "B", "n": 11, "title": "Он Ваш гость", "stimulus": "Он Ваш гость.", "answers": [], "explanation": "Кто: ол. Чей (основа, не сенің): сіз.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B11", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["ол"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["сіз"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
  {"id": "p3-33-b12", "session": "B", "n": 12, "title": "Мы твои родственники", "stimulus": "Мы твои родственники.", "answers": [], "explanation": "Кто: біз. Чей (основа, не сенің): сен.", "rule": "T28_OWNER_SUBJECT", "error": "OWNER_SUBJECT_SWAP", "gold": "B12", "codes": null, "fields": [{"label": "Кто?", "kind": "text", "answers": ["біз"], "error_type": "SUBJECT_WRONG"}, {"label": "Чей?", "kind": "text", "answers": ["сен"], "error_type": "OWNER_WRONG"}], "skillBindings": [{"field": 0, "item_id": "T28_OWNER_SUBJECT", "skill_type": "subject"}, {"field": 1, "item_id": "T28_OWNER_SUBJECT", "skill_type": "owner"}]},
 ];
 const EXTRA=[
  {"id": "p3-33-s3-01", "session": "S3", "n": 1, "title": "Сенің ағалар...", "stimulus": "Сенің ағалар...", "answers": ["ағаларың"], "explanation": "Сначала «много», потом чьё: ағаларың.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-02", "session": "S3", "n": 2, "title": "Біз мұғалім...", "stimulus": "Біз мұғалім...", "answers": ["мұғалімбіз"], "explanation": "Кто мы: мұғалімбіз.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-03", "session": "S3", "n": 3, "title": "Сіздің әже...", "stimulus": "Сіздің әже...", "answers": ["әжеңіз"], "explanation": "сіздің әжеңіз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-04", "session": "S3", "n": 4, "title": "Мен бастық...", "stimulus": "Мен бастық...", "answers": ["бастықпын"], "explanation": "Кто я: бастықпын.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-05", "session": "S3", "n": 5, "title": "Сендердің әріптес...", "stimulus": "Сендердің әріптес...", "answers": ["әріптестерің"], "explanation": "В модели урока: әріптестерің.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-06", "session": "S3", "n": 6, "title": "Сіздің қол...", "stimulus": "Сіздің қол...", "answers": ["қолыңыз"], "explanation": "сіздің қолыңыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-07", "session": "S3", "n": 7, "title": "Біздің бала...", "stimulus": "Біздің бала...", "answers": ["баламыз", "біздің баламыз", "біздің бала"], "explanation": "Біздің баламыз. Нуль біздің бала тоже жив. Баламыз одно не закрывает оба чтения.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-08", "session": "S3", "n": 8, "title": "Мен ата...", "stimulus": "Мен ата...", "answers": ["атамын"], "explanation": "Кто я: атамын.", "rule": "T28_OWNER_SUBJECT", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-09", "session": "S3", "n": 9, "title": "Сіздердің баба...", "stimulus": "Сіздердің баба...", "answers": ["бабаларыңыз"], "explanation": "сіздердің бабаларыңыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s3-10", "session": "S3", "n": 10, "title": "Оның қала...", "stimulus": "Оның қала...", "answers": ["қаласы"], "explanation": "оның қаласы.", "rule": "T30_THIRD_ZERO", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-01", "session": "S4", "n": 1, "title": "Ұлсыңдар", "stimulus": "Ұлсыңдар", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["вы сыновья", "Вы сыновья"]}], "explanation": "Ұлсыңдар.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-02", "session": "S4", "n": 2, "title": "Көршімін", "stimulus": "Көршімін", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["я сосед", "Я сосед"]}], "explanation": "Көршімін.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-03", "session": "S4", "n": 3, "title": "Анамыз", "stimulus": "Анамыз", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["наша мать", "Наша мать"]}], "explanation": "Анамыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-04", "session": "S4", "n": 4, "title": "Танысыңыз", "stimulus": "Танысыңыз", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["Ваш знакомый"]}], "explanation": "Танысыңыз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-05", "session": "S4", "n": 5, "title": "Достарың", "stimulus": "достарың — все чтения", "answers": [], "fields": [{"label": "Ответ", "kind": "set-text", "answers": ["твои друзья", "ваш друг", "ваши друзья"]}], "explanation": "достарың — все чтения.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_READINGS", "gold": "", "codes": null},
  {"id": "p3-33-s4-06", "session": "S4", "n": 6, "title": "Әкелеріңіз", "stimulus": "әкелеріңіз — чтения, не одно", "answers": [], "fields": [{"label": "Ответ", "kind": "set-text", "answers": ["ваши отцы", "ваш отец"]}], "explanation": "әкелеріңіз — чтения, не одно.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_READINGS", "gold": "", "codes": null},
  {"id": "p3-33-s4-07", "session": "S4", "n": 7, "title": "Баламыз", "stimulus": "баламыз — оба чтения", "answers": [], "fields": [{"label": "Ответ", "kind": "set-text", "answers": ["мы дети", "наш ребёнок"]}], "explanation": "баламыз — оба чтения.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_2PL_READINGS", "gold": "", "codes": null},
  {"id": "p3-33-s4-08", "session": "S4", "n": 8, "title": "Туыстарым", "stimulus": "Туыстарым", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["мои родственники"]}], "explanation": "Туыстарым.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-09", "session": "S4", "n": 9, "title": "Қонағы", "stimulus": "Қонағы", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["его гость", "её гость", "их гость"]}], "explanation": "Қонағы.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-s4-10", "session": "S4", "n": 10, "title": "Құрбысыздар", "stimulus": "Құрбысыздар", "answers": [], "fields": [{"label": "Ответ", "kind": "text", "answers": ["вы подруги", "Вы (сіздер) подруги"]}], "explanation": "Құрбысыздар.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m01", "session": "M", "n": 1, "title": "Сен менің сыныптасымсың.", "stimulus": "Сен менің сыныптасымсың.", "answers": ["Сен менің сыныптасымсың"], "explanation": "Полная связка: владелец мен, субъект сен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m02", "session": "M", "n": 2, "title": "Сіз оның отбасысыз.", "stimulus": "Сіз оның отбасысыз.", "answers": ["Сіз оның отбасысыз"], "explanation": "Личное сыз на отбасы, без лишней сы.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "G066", "codes": null},
  {"id": "p3-33-m03", "session": "M", "n": 3, "title": "Мен сенің құрбыңмын.", "stimulus": "Мен сенің құрбыңмын.", "answers": ["Мен сенің құрбыңмын"], "explanation": "Владелец сен, субъект мен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m04", "session": "M", "n": 4, "title": "Сен менің інімсің.", "stimulus": "Сен менің інімсің.", "answers": ["Сен менің інімсің"], "explanation": "Владелец мен, субъект сен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m05", "session": "M", "n": 5, "title": "Мен сіздің балаңыз емеспін.", "stimulus": "Мен сіздің балаңыз емеспін.", "answers": ["Мен сіздің балаңыз емеспін"], "explanation": "Личное на емес, наклейка балаңыз остаётся.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m06", "session": "M", "n": 6, "title": "Мен оның сіңлісімін.", "stimulus": "Мен оның сіңлісімін.", "answers": ["Мен оның сіңлісімін"], "explanation": "Владелец ол, субъект мен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m07", "session": "M", "n": 7, "title": "Сен менің отбасымсың.", "stimulus": "Сен менің отбасымсың.", "answers": ["Сен менің отбасымсың"], "explanation": "Владелец мен: отбасым, субъект сен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m08", "session": "M", "n": 8, "title": "Мен сіздің оқушыңызбын.", "stimulus": "Мен сіздің оқушыңызбын.", "answers": ["Мен сіздің оқушыңызбын"], "explanation": "Владелец сіз, субъект мен.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-m09", "session": "M", "n": 9, "title": "Сіз менің бастығымсыз.", "stimulus": "Сіз менің бастығымсыз.", "answers": ["Сіз менің бастығымсыз"], "explanation": "Владелец мен, субъект сіз.", "rule": "T29_POSS_PERSON_STACK", "error": "POSS_PERSON_STACK", "gold": "", "codes": null},
  {"id": "p3-33-k1", "session": "K", "n": 1, "title": "Атың кім?", "stimulus": "Атың кім?", "answers": ["Как тебя зовут?", "Как тебя зовут"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G124", "codes": null},
  {"id": "p3-33-k2", "session": "K", "n": 2, "title": "Сенің ше?", "stimulus": "Сенің ше?", "answers": ["А тебя?", "А тебя"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G125", "codes": null},
  {"id": "p3-33-k3", "session": "K", "n": 3, "title": "Танысқаныма қуаныштымын.", "stimulus": "Танысқаныма қуаныштымын.", "answers": ["Приятно познакомиться.", "Приятно познакомиться"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G126", "codes": null},
  {"id": "p3-33-k1r", "session": "K", "n": 4, "title": "Как тебя зовут?", "stimulus": "Как тебя зовут?", "answers": ["Атың кім?", "Атың кім"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G124r", "codes": null},
  {"id": "p3-33-k2r", "session": "K", "n": 5, "title": "А тебя?", "stimulus": "А тебя?", "answers": ["Сенің ше?", "Сенің ше"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G125r", "codes": null},
  {"id": "p3-33-k3r", "session": "K", "n": 6, "title": "Приятно познакомиться.", "stimulus": "Приятно познакомиться.", "answers": ["Танысқаныма қуаныштымын.", "Танысқаныма қуаныштымын"], "explanation": "Готовая фраза урока. Запоминай пару целиком.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G126r", "codes": null},
  {"id": "p3-33-v01-ru", "session": "V", "n": 1, "title": "Слово на русский", "stimulus": "келу", "answers": ["приходить"], "explanation": "келу — приходить.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G109", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v01-kk", "session": "V", "n": 1, "title": "Слово на казахский", "stimulus": "приходить", "answers": ["келу"], "explanation": "приходить — келу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G109k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v02-ru", "session": "V", "n": 2, "title": "Слово на русский", "stimulus": "кету", "answers": ["уходить"], "explanation": "кету — уходить.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G110", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v02-kk", "session": "V", "n": 2, "title": "Слово на казахский", "stimulus": "уходить", "answers": ["кету"], "explanation": "уходить — кету.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G110k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v03-ru", "session": "V", "n": 3, "title": "Слово на русский", "stimulus": "кіру", "answers": ["входить"], "explanation": "кіру — входить.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G111", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v03-kk", "session": "V", "n": 3, "title": "Слово на казахский", "stimulus": "входить", "answers": ["кіру"], "explanation": "входить — кіру.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G111k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v04-ru", "session": "V", "n": 4, "title": "Слово на русский", "stimulus": "шығу", "answers": ["выходить"], "explanation": "шығу — выходить.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G112", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v04-kk", "session": "V", "n": 4, "title": "Слово на казахский", "stimulus": "выходить", "answers": ["шығу"], "explanation": "выходить — шығу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G112k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v05-ru", "session": "V", "n": 5, "title": "Слово на русский", "stimulus": "іздеу", "answers": ["искать"], "explanation": "іздеу — искать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G113", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v05-kk", "session": "V", "n": 5, "title": "Слово на казахский", "stimulus": "искать", "answers": ["іздеу"], "explanation": "искать — іздеу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G113k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v06-ru", "session": "V", "n": 6, "title": "Слово на русский", "stimulus": "табу", "answers": ["находить"], "explanation": "табу — находить.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G114", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v06-kk", "session": "V", "n": 6, "title": "Слово на казахский", "stimulus": "находить", "answers": ["табу"], "explanation": "находить — табу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G114k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v07-ru", "session": "V", "n": 7, "title": "Слово на русский", "stimulus": "асығу", "answers": ["торопиться"], "explanation": "асығу — торопиться.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G115", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v07-kk", "session": "V", "n": 7, "title": "Слово на казахский", "stimulus": "торопиться", "answers": ["асығу"], "explanation": "торопиться — асығу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G115k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v08-ru", "session": "V", "n": 8, "title": "Слово на русский", "stimulus": "кешігу", "answers": ["опаздывать"], "explanation": "кешігу — опаздывать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G116", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v08-kk", "session": "V", "n": 8, "title": "Слово на казахский", "stimulus": "опаздывать", "answers": ["кешігу"], "explanation": "опаздывать — кешігу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G116k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v09-ru", "session": "V", "n": 9, "title": "Слово на русский", "stimulus": "жұмыс істеу", "answers": ["работать"], "explanation": "жұмыс істеу — работать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G117", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v09-kk", "session": "V", "n": 9, "title": "Слово на казахский", "stimulus": "работать", "answers": ["жұмыс істеу"], "explanation": "работать — жұмыс істеу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G117k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v10-ru", "session": "V", "n": 10, "title": "Слово на русский", "stimulus": "жазу", "answers": ["писать"], "explanation": "жазу — писать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G118", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v10-kk", "session": "V", "n": 10, "title": "Слово на казахский", "stimulus": "писать", "answers": ["жазу"], "explanation": "писать — жазу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G118k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v11-ru", "session": "V", "n": 11, "title": "Слово на русский", "stimulus": "сөйлеу", "answers": ["разговаривать", "говорить"], "explanation": "сөйлеу — разговаривать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G119", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v11-kk", "session": "V", "n": 11, "title": "Слово на казахский", "stimulus": "разговаривать", "answers": ["сөйлеу"], "explanation": "разговаривать — сөйлеу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G119k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v12-ru", "session": "V", "n": 12, "title": "Слово на русский", "stimulus": "алу", "answers": ["брать", "получать"], "explanation": "алу — брать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G120", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v12-kk", "session": "V", "n": 12, "title": "Слово на казахский", "stimulus": "брать", "answers": ["алу"], "explanation": "брать — алу.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G120k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v13-ru", "session": "V", "n": 13, "title": "Слово на русский", "stimulus": "беру", "answers": ["давать"], "explanation": "беру — давать.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G121", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v13-kk", "session": "V", "n": 13, "title": "Слово на казахский", "stimulus": "давать", "answers": ["беру"], "explanation": "давать — беру.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G121k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v14-ru", "session": "V", "n": 14, "title": "Слово на русский", "stimulus": "көру", "answers": ["видеть"], "explanation": "көру — видеть.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G122", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v14-kk", "session": "V", "n": 14, "title": "Слово на казахский", "stimulus": "видеть", "answers": ["көру"], "explanation": "видеть — көру.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G122k", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v15-ru", "session": "V", "n": 15, "title": "Слово на русский", "stimulus": "қарау", "answers": ["смотреть"], "explanation": "қарау — смотреть.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G123", "codes": null, "topic": "vocab"},
  {"id": "p3-33-v15-kk", "session": "V", "n": 15, "title": "Слово на казахский", "stimulus": "смотреть", "answers": ["қарау"], "explanation": "смотреть — қарау.", "rule": "T28_OWNER_SUBJECT", "error": "VOCAB_RECALL", "gold": "G123k", "codes": null, "topic": "vocab"},
 ];

 function build(spec){
  const q=one(spec);
  if(spec.topic)q.topic=spec.topic;
  if(spec.skillBindings)q.skillBindings=spec.skillBindings;
  if(spec.fields)q.fields=spec.fields.map(f=>Object.assign({kind:'text'},f,{answers:f.answers.slice()}));
  return q;
 }
 const BUILT=SPECS.concat(BSPEC).concat(EXTRA).map(build);
 function bySession(s){return BUILT.filter(q=>q.phase3.session===s).map(clone);}
 function sessionA(){return bySession('A');}
 function sessionB(){return bySession('B');}
 function sessionC(){return bySession('C');}
 function sessionD(){return bySession('D');}
 function sessionE(){return bySession('E');}
 function sessionF(){return bySession('F');}
 function sessionG(){return bySession('G');}
 function sessionH(){return bySession('H');}
 function sessionI(){return bySession('I');}
 function sessionJ(){return bySession('J');}
 function lessonSession(){return ['A','B','C','D','E','F','G','H','I','J'].flatMap(bySession);}
 function grammarQuestions(){return lessonSession();}
 function extras(){return BUILT.filter(q=>!'ABCDEFGHIJ'.includes(q.phase3.session)).map(clone);}
 function all(){return lessonSession().concat(extras());}
 function byId(id){const q=BUILT.find(x=>x.id===id);return q?clone(q):null;}
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions)||!gate||!gate.allows||!gate.allows('poss_person_stack',catalog))return [];
  course.sources=course.sources||{};
  if(!course.sources['phase3-33'])course.sources['phase3-33']={title:'Урок 3-3 · кто и чей вместе',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of all()){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 const CP=node?require('./course-progress.js'):root.CourseProgress;
 const REV='t-integration-v1';
 function ids(session,from,to){
  const out=[];
  for(let n=from;n<=to;n++)out.push('p3-33-'+session+String(n).padStart(2,'0'));
  return out;
 }
 const PHRASE_D=['01','02','03','04','11','24'].flatMap(n=>['phrase:3-3:kk-ru:'+n,'phrase:3-3:ru-kk:'+n]);
 const PHRASE_G=['13','14','15','16','17'].flatMap(n=>['phrase:3-3:kk-ru:'+n,'phrase:3-3:ru-kk:'+n]);
 const PHRASE_H=['18','19'].flatMap(n=>['phrase:3-3:kk-ru:'+n,'phrase:3-3:ru-kk:'+n]);
 const PHRASE_I=['20','21','22','23'].flatMap(n=>['phrase:3-3:kk-ru:'+n,'phrase:3-3:ru-kk:'+n]);
 const MIX=[
  'p3-33-b01','p3-33-b02','p3-33-b03','p3-33-b04',
  'p3-33-c01','p3-33-c02','p3-33-c09','p3-33-c12',
  'p3-33-d01','p3-33-d02','p3-33-d05','p3-33-d16',
  'p3-33-e01','p3-33-f01','p3-33-f11','p3-33-f13',
  'p3-33-g01','p3-33-g05','p3-33-g09',
  'p3-33-j01','p3-33-j06','p3-33-j10',
  'p3-33-h06','p3-33-i01'
 ];
 const SPEC=[
  ['33-a','T28_OWNER_SUBJECT',ids('a',1,12),['p3-33-a09','p3-33-a10'],10/12,false],
  ['33-b','T28_OWNER_SUBJECT',ids('b',1,12),['p3-33-b01','p3-33-b02','p3-33-b03','p3-33-b04','p3-33-b05'],10/12,false],
  ['33-c','T29_POSS_PERSON_STACK',ids('c',1,12),['p3-33-c12'],10/12,false],
  ['33-d1','T29_POSS_PERSON_STACK',ids('d',1,8),['p3-33-d01','p3-33-d02','p3-33-d04'],0.8,false],
  ['33-d2','T29_POSS_PERSON_STACK',ids('d',9,16),['p3-33-d16'],0.8,false],
  ['33-phrase-d','T29_POSS_PERSON_STACK',PHRASE_D,[],0.8,false],
  ['33-e','T29_POSS_PERSON_STACK',ids('e',1,12),[],10/12,false],
  ['33-f1','T29_POSS_PERSON_STACK',ids('f',1,8),[],0.8,false],
  ['33-f2','T30_THIRD_ZERO',ids('f',9,14),['p3-33-f11','p3-33-f12','p3-33-f13','p3-33-f14'],0.8,false],
  ['33-g1','T31_EMES_STACK',ids('g',1,8),['p3-33-g01','p3-33-g04','p3-33-g05'],0.8,false],
  ['33-g2','T31_EMES_STACK',ids('g',9,15),['p3-33-g09'],0.8,false],
  ['33-phrase-g','T31_EMES_STACK',PHRASE_G,[],0.8,false],
  ['33-h','T32_OTBASY',ids('h',1,12),['p3-33-h02','p3-33-h06','p3-33-h07','p3-33-h10','p3-33-h12'],0.8,false],
  ['33-phrase-h','T32_OTBASY',PHRASE_H,[],0.8,false],
  ['33-i1','T33_ADJ_ROLE',ids('i',1,7),['p3-33-i01','p3-33-i02'],0.8,false],
  ['33-i2','T34_INTERROGATIVE',ids('i',8,17),['p3-33-i10','p3-33-i11','p3-33-i12'],0.8,false],
  ['33-phrase-i','T33_ADJ_ROLE',PHRASE_I,[],0.8,false],
  ['33-j1','T29_POSS_PERSON_STACK',ids('j',1,10),['p3-33-j01','p3-33-j06','p3-33-j07','p3-33-j10'],0.8,false],
  ['33-j2','T29_POSS_PERSON_STACK',ids('j',11,20),[],0.8,false],
  ['33-mix','T29_POSS_PERSON_STACK',MIX,['p3-33-j01','p3-33-f11','p3-33-g01','p3-33-h06'],20/24,true]
 ];
 function fullPlan(row){
  const [stageId,rule,coreIds,required,ratio,final]=row;
  return {
   lessonId:'3-3',contentRevision:REV,stageId,kind:'learning',
   coreIds:coreIds.slice(),requiredIndependentIds:required.slice(),ruleIds:[rule],
   nextStageId:null,minIndependentRatio:ratio,maxPresentations:24,
   final:!!final,presentations:0,limitReached:false
  };
 }
 function stagePlans(){
  const rows=SPEC.map(fullPlan);
  rows.forEach((plan,i)=>{plan.nextStageId=rows[i+1]?rows[i+1].stageId:null;});
  return rows;
 }
 function stagePlan(stageId){return stagePlans().find(plan=>plan.stageId===stageId)||null;}
 function stageSession(stageId){
  const plan=stagePlan(stageId);
  return plan?plan.coreIds.map(byId).filter(Boolean):[];
 }
 function closed(events,stageId){
  return (events||[]).some(e=>e&&e.type==='course_stage_completed'&&e.lesson_id==='3-3'&&e.content_revision===REV&&(e.stage_id===stageId||e.stage_id===stageId+'-fix'));
 }
 function tried(events,stageId){
  return (events||[]).some(e=>e&&e.type==='answer'&&e.lesson_id==='3-3'&&e.stage_id===stageId&&e.content_revision===REV);
 }
 function fixPlan(full,events){
  const report=CP&&CP.evaluateStage?CP.evaluateStage(events,full):{independent:[]};
  const missed=full.requiredIndependentIds.filter(id=>!(report.independent||[]).includes(id));
  const core=(missed.length?missed:full.requiredIndependentIds).slice(0,2);
  const fallback=core.length?core:full.coreIds.slice(0,1);
  return {
   lessonId:'3-3',contentRevision:REV,stageId:full.stageId+'-fix',kind:'repair',
   coreIds:fallback,requiredIndependentIds:fallback.slice(),ruleIds:full.ruleIds.slice(),
   nextStageId:full.nextStageId,minIndependentRatio:1,maxPresentations:24,
   final:full.final,presentations:0,limitReached:false
  };
 }
 function nextStage(events){
  const plans=stagePlans();
  for(const plan of plans){
   if(closed(events,plan.stageId))continue;
   const report=CP&&CP.evaluateStage?CP.evaluateStage(events,plan):{pass:false};
   if(report.pass)continue;
   if(!tried(events,plan.stageId))return plan;
   return fixPlan(plan,events);
  }
  return plans[plans.length-1];
 }
 function courseSession(records,opts){
  void records;
  const events=opts&&opts.events||[];
  const stage=nextStage(events);
  const clean=Object.assign({},stage);
  delete clean.remediationIds;
  return {stage:clean,cards:clean.coreIds.map(byId).filter(Boolean),coreIds:clean.coreIds.slice(),remediationIds:[]};
 }
 function phraseNumber(id){
  const m=String(id||'').match(/^phrase:3-3:(?:kk-ru|ru-kk):(\d+)$/);
  return m?Number(m[1]):0;
 }
 function phraseGroup(n){
  if((n>=1&&n<=12)||n===24)return 'd';
  if(n>=13&&n<=17)return 'g';
  if(n===18||n===19)return 'h';
  if(n>=20&&n<=23)return 'i';
  return '';
 }
 function phraseUnlocked(id,opts){
  const n=phraseNumber(id);
  if(!n)return true;
  const events=opts&&opts.events||[];
  const group=phraseGroup(n);
  const need={d:'33-d2',g:'33-g2',h:'33-h',i:'33-i2'}[group];
  return !!(need&&closed(events,need));
 }
 const GOLD_EXTRA=[
  {id:'G072',card:'p3-33-c05',accepts:['біздің сыныбымыз'],rejects:['сынып']},
  {id:'G074',card:'p3-33-x-g073',accepts:['Біздің қаламыз'],rejects:['қала','менің қала']},
  {id:'G075',card:'p3-33-h10',accepts:[['біздің қала','біздің қаламыз']],rejects:[['біздің қаламыз','біздің қала']]}
 ];
 function goldRows(){
  const rows=[];
  for(const spec of SPECS.concat(EXTRA)){
   if(!spec.gold||spec.gold.endsWith('b')||spec.gold.endsWith('r')||spec.gold.endsWith('k')||spec.gold.endsWith('c'))continue;
   if(!/^G\d+$/.test(spec.gold))continue;
   const accepts=spec.fields? [spec.fields.map(f=>f.answers[0])] : spec.answers.slice();
   rows.push({id:spec.gold,card:spec.id,accepts,rejects:(spec.rejects||[]).slice()});
  }
  const map=new Map();
  for(const row of rows.concat(GOLD_EXTRA))map.set(row.id,Object.assign({},row));
  return [...map.values()];
 }
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 3-3 pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 const api={
  sessionA,sessionB,sessionC,sessionD,sessionE,sessionF,sessionG,sessionH,sessionI,sessionJ,
  lessonSession,grammarQuestions,extras,all,byId,check,install,
  stagePlan,stagePlans,stageSession,nextStage,courseSession,phraseUnlocked,phraseGroup,goldRows
 };
 if(node)module.exports=api;else root.Lesson33Pack=api;
})(typeof window!=='undefined'?window:globalThis);

