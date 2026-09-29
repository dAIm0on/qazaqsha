/* Lesson 4-2 pack. Past tense. School PDFs + research 4-2. Gold is the etalon. */
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
   id:spec.id,source:'phase3-42',group:'4-2-'+spec.session,part:String(spec.n),lessonId:'4-2',topic:'person',kind:'fields',
   title:spec.title,stimulus:spec.stimulus,fields,explanation:spec.explanation,
   ruleIds:[spec.rule],vocabIds:[],practiceOnly:true,
   phase3:{lesson:'4-2',session:spec.session,order:spec.n,error_type:spec.error,gold:spec.gold||'',codes:spec.codes||null,closed_pack:false}
  };
 }
 const SPECS=[
  {id:"p4-42-a01",session:"A",n:1,title:"Я закрываю",stimulus:"Я закрываю. / Я закрою.",answers:["Жабамын","Мен жабамын"],explanation:"Повтор 4-1. Жабу твёрдое, край гласная после озвончения: жабамын. Не прошедшее.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G001",rejects:["Жаптым","Жабамынмын"]},
  {id:"p4-42-a02",session:"A",n:2,title:"Я не закрываю",stimulus:"Я не закрываю.",answers:["Жаппаймын","Мен жаппаймын"],explanation:"Повтор 4-1. Б→п, стоп-знак па, й, кто-1 мын. Не жаппадым.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G002",rejects:["Жаппадым","Жабамын"]},
  {id:"p4-42-a03",session:"A",n:3,title:"Я говорю",stimulus:"Я говорю. / Я заговорю.",answers:["Сөйлеймін","Мен сөйлеймін"],explanation:"Повтор 4-1. Сөйле + й + мін. Это не сөйледім.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G003",rejects:["Сөйледім"]},
  {id:"p4-42-a04",session:"A",n:4,title:"Я не говорю",stimulus:"Я не говорю.",answers:["Сөйлемеймін","Мен сөйлемеймін"],explanation:"Повтор 4-1. Стоп-знак ме + й + мін. Не сөйлемедім.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G004",rejects:["Сөйлемедім"]},
  {id:"p4-42-a05",session:"A",n:5,title:"Он говорит",stimulus:"Он говорит. / Он заговорит.",answers:["Ол сөйлейді","Сөйлейді"],explanation:"4-1: ды у ол = кто. Ещё не прошедшее.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G005",rejects:["Ол сөйледі","Сөйледі"]},
  {id:"p4-42-a06",session:"A",n:6,title:"Мы выходим",stimulus:"Мы выходим.",answers:["Шығамыз","Біз шығамыз"],explanation:"Повтор 4-1. Шығу → шығамыз. Не шықтық.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G006",rejects:["Шықтық","Шықтымыз"]},
  {id:"p4-42-a07",session:"A",n:7,title:"Я пишу",stimulus:"Я пишу.",answers:["Жазамын","Мен жазамын"],explanation:"Повтор 4-1. Жазамын, не жаздым.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G007",rejects:["Жаздым"]},
  {id:"p4-42-a08",session:"A",n:8,title:"Я не пишу",stimulus:"Я не пишу.",answers:["Жазбаймын","Мен жазбаймын"],explanation:"Повтор 4-1. З → ба + й + мын. Не жазбадым.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G008",rejects:["Жазбадым"]},
  {id:"p4-42-b01",session:"B",n:1,title:"Я пошёл",stimulus:"Я пошёл. / Я ходил.",answers:["Бардым","Мен бардым"],explanation:"Уже было. Бар + ды + м. Не бардыммын.",rule:"T35_PAST_MEANING",error:"PERSON2",gold:"G009",rejects:["Бардыммын","Барамын"]},
  {id:"p4-42-b02",session:"B",n:2,title:"Он пошёл",stimulus:"Он пошёл. / Он ходил.",answers:["Барды","Ол барды"],explanation:"У ол наклейки кто нет. Барды уже он/они.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G010",rejects:["Бардыды","Бардым","Ол бардым"]},
  {id:"p4-42-b03",session:"B",n:3,title:"Я написал",stimulus:"Я написал. / Я писал.",answers:["Жаздым","Мен жаздым"],explanation:"Делал и сделал — одна форма. Жаз + ды + м. З не глухая, не ты.",rule:"T35_PAST_MEANING",error:"DY_TY",gold:"G011",rejects:["Жазтым","Жазамын","Жаздымын"]},
  {id:"p4-42-b04",session:"B",n:4,title:"Он написал",stimulus:"Он написал. / Он писал.",answers:["Жазды","Ол жазды"],explanation:"Ол без кто-2. Не жаздыды.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G012",rejects:["Жаздыды","Ол жаздым"]},
  {id:"p4-42-b05",session:"B",n:5,title:"Я ушёл",stimulus:"Я ушёл. / Я уходил.",answers:["Кеттім","Мен кеттім"],explanation:"Кет глухая мягкая → ті + м.",rule:"T36_DY_TY",error:"DY_TY",gold:"G013",rejects:["Кетдім","Кетемін"]},
  {id:"p4-42-b06",session:"B",n:6,title:"Он ушёл",stimulus:"Он ушёл.",answers:["Кетті","Ол кетті"],explanation:"Ол: кетті. Пусто после ті.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G014",rejects:["Кеттіді","Ол кеттім"]},
  {id:"p4-42-b07",session:"B",n:7,title:"Он лежал",stimulus:"Он лежал. / Он лёг.",answers:["Ол жатты","Жатты"],explanation:"Жату: т глухая твёрдая → ты. Жатырмын ещё нет.",rule:"T35_PAST_MEANING",error:"WRONG_TENSE",gold:"G015",rejects:["Жатырмын","Жатды"]},
  {id:"p4-42-b08",session:"B",n:8,title:"Одна форма",stimulus:"Вчера писал и вчера написал — сколько форм 4-2?",answers:["одна","1","одна форма"],explanation:"Вид русский. Казахская форма одна.",rule:"T35_PAST_MEANING",error:"ASPECT",gold:"G016",rejects:["две","2"]},
  {id:"p4-42-b09",session:"B",n:9,title:"Я открыл",stimulus:"Я открыл.",answers:["Аштым","Мен аштым"],explanation:"Аш глухая → ты + м.",rule:"T36_DY_TY",error:"DY_TY",gold:"G017",rejects:["Ашдым"]},
  {id:"p4-42-b10",session:"B",n:10,title:"Мы открыли",stimulus:"Мы открыли.",answers:["Аштық","Біз аштық"],explanation:"Біз твёрдое → қ. Не аштымыз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G018",rejects:["Аштымыз","Аштык"]},
  {id:"p4-42-c01",session:"C",n:1,title:"Кусок времени бар",stimulus:"бару → кусок времени?",answers:["ды"],explanation:"Р не глухая, твёрдое → ды.",rule:"T36_DY_TY",error:"DY_TY",gold:"G019",rejects:["ты","ді"]},
  {id:"p4-42-c02",session:"C",n:2,title:"Кусок времени аш",stimulus:"ашу → кусок времени?",answers:["ты"],explanation:"Ш глухая твёрдая → ты.",rule:"T36_DY_TY",error:"DY_TY",gold:"G020",rejects:["ды","ті"]},
  {id:"p4-42-c03",session:"C",n:3,title:"Кусок времени кет",stimulus:"кету → кусок времени?",answers:["ті"],explanation:"Т глухая мягкая → ті.",rule:"T36_DY_TY",error:"DY_TY",gold:"G021",rejects:["ді","ты"]},
  {id:"p4-42-c04",session:"C",n:4,title:"Кусок времени жаз",stimulus:"жазу → кусок времени?",answers:["ды"],explanation:"З не глухая. Не ты.",rule:"T36_DY_TY",error:"DY_TY",gold:"G022",rejects:["ты"]},
  {id:"p4-42-c05",session:"C",n:5,title:"Я ждал",stimulus:"Я ждал.",answers:["Күттім","Мен күттім"],explanation:"Күт глухая мягкая → ті. Не күтдім.",rule:"T36_DY_TY",error:"DY_TY",gold:"G023",rejects:["Күтдім"]},
  {id:"p4-42-c06",session:"C",n:6,title:"Я сказал",stimulus:"Я сказал.",answers:["Айттым","Мен айттым"],explanation:"Айт глухая твёрдая → ты.",rule:"T36_DY_TY",error:"DY_TY",gold:"G024",rejects:["Айтдым"]},
  {id:"p4-42-c07",session:"C",n:7,title:"Я понял",stimulus:"Я понял.",answers:["Түсіндім","Мен түсіндім"],explanation:"Н не глухая, мягкое → ді.",rule:"T36_DY_TY",error:"DY_TY",gold:"G025",rejects:["Түсінтім"]},
  {id:"p4-42-c08",session:"C",n:8,title:"Я сидел",stimulus:"Я сидел.",answers:["Отырдым","Мен отырдым"],explanation:"Р не глухая, твёрдое → ды.",rule:"T36_DY_TY",error:"DY_TY",gold:"G026",rejects:["Отырттым"]},
  {id:"p4-42-c09",session:"C",n:9,title:"Я стоял",stimulus:"Я стоял.",answers:["Тұрдым","Мен тұрдым"],explanation:"Тұру: р → ды.",rule:"T36_DY_TY",error:"DY_TY",gold:"G027",rejects:["Тұрттым"]},
  {id:"p4-42-c10",session:"C",n:10,title:"Я ходил",stimulus:"Я ходил / двигался.",answers:["Жүрдім","Мен жүрдім"],explanation:"Жүру мягкое, р → ді.",rule:"T36_DY_TY",error:"DY_TY",gold:"G028",rejects:["Жүрттім"]},
  {id:"p4-42-d01",session:"D",n:1,title:"Мы пошли",stimulus:"Мы пошли.",answers:["Бардық","Біз бардық"],explanation:"Біз твёрдое → қ. Не бардымыз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G029",rejects:["Бардымыз","Бардык"]},
  {id:"p4-42-d02",session:"D",n:2,title:"Мы видели",stimulus:"Мы видели.",answers:["Көрдік","Біз көрдік"],explanation:"Көру мягкое → к, не қ.",rule:"T37_PERSON2",error:"HARMONY",gold:"G030",rejects:["Көрдіқ","Көрдімыз"]},
  {id:"p4-42-d03",session:"D",n:3,title:"Ты пошёл",stimulus:"Ты пошёл.",answers:["Бардың","Сен бардың"],explanation:"Сен → ң. Не сың из 4-1.",rule:"T37_PERSON2",error:"PERSON2",gold:"G031",rejects:["Бардыңсың","Бардысың"]},
  {id:"p4-42-d04",session:"D",n:4,title:"Вы-свои пошли",stimulus:"Вы (сендер) пошли.",answers:["Бардыңдар","Сендер бардыңдар"],explanation:"Сендер → ңдар. Не ңыздар.",rule:"T37_PERSON2",error:"SENDER",gold:"G032",rejects:["Бардыңыздар","Бардың"]},
  {id:"p4-42-d05",session:"D",n:5,title:"Вы-сіз пошли",stimulus:"Вы (сіз) пошли.",answers:["Бардыңыз","Сіз бардыңыз"],explanation:"Сіз → ңыз. Не сыз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G033",rejects:["Бардысыз","Бардыңдар"]},
  {id:"p4-42-d06",session:"D",n:6,title:"Вы-сіздер сидели",stimulus:"Вы (сіздер) сидели.",answers:["Отырдыңыздар","Сіздер отырдыңыздар"],explanation:"Сіздер → ңыздар.",rule:"T37_PERSON2",error:"SIZDER",gold:"G034",rejects:["Отырдыңдар"]},
  {id:"p4-42-d07",session:"D",n:7,title:"Вы-свои не брали",stimulus:"Вы (сендер) не брали.",answers:["Алмадыңдар","Сендер алмадыңдар"],explanation:"Сендер держит ңдар и в отрицании.",rule:"T37_PERSON2",error:"SENDER",gold:"G035",rejects:["Алмадың","Алмадыңыздар"]},
  {id:"p4-42-d08",session:"D",n:8,title:"Вы-сіз не лежали",stimulus:"Вы (сіз) не лежали.",answers:["Жатпадыңыз","Сіз жатпадыңыз"],explanation:"Сіз → ңыз, не сыз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G036",rejects:["Жатпадысыз"]},
  {id:"p4-42-d09",session:"D",n:9,title:"Контраст я пишу / писал",stimulus:"Я пишу. А прошедшее того же корня?",answers:["Жаздым","Мен жаздым"],explanation:"Жазамын — кто-1. Жаздым — кто-2.",rule:"T37_PERSON2",error:"WRONG_TENSE",gold:"G037",rejects:["Жазамын","Жаздымын"]},
  {id:"p4-42-d10",session:"D",n:10,title:"Контраст мы выходим / вышли",stimulus:"Мы выходим. А прошедшее?",answers:["Шықтық","Біз шықтық"],explanation:"Шығамыз vs шықтық. Не шықтымыз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G038",rejects:["Шықтымыз","Шығамыз"]},
  {id:"p4-42-d11",session:"D",n:11,title:"Они пошли",stimulus:"Они пошли.",answers:["Барды","Олар барды"],explanation:"Олар как ол: ноль.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G039",rejects:["Бардылар","Бардық"]},
  {id:"p4-42-d12",session:"D",n:12,title:"Я написал коротко",stimulus:"Напиши прошедшее «я писал» без местоимения.",answers:["Жаздым"],explanation:"Жаздым уже содержит я.",rule:"T37_PERSON2",error:"PRONOUN",gold:"G040",rejects:["Мен жаздыммын"]},
  {id:"p4-42-e01",session:"E",n:1,title:"Он говорил",stimulus:"Он говорил.",answers:["Ол сөйледі","Сөйледі"],explanation:"Ды здесь = когда. Кто у ол пустой.",rule:"T38_OL_ZERO_PAST",error:"WRONG_TENSE",gold:"G041",rejects:["Ол сөйлейді","Сөйлейді"]},
  {id:"p4-42-e02",session:"E",n:2,title:"Он говорит не прошлое",stimulus:"Он говорит / заговорит.",answers:["Ол сөйлейді","Сөйлейді"],explanation:"Это 4-1. Не перепутай с сөйледі.",rule:"T38_OL_ZERO_PAST",error:"WRONG_TENSE",gold:"G042",rejects:["Ол сөйледі"]},
  {id:"p4-42-e03",session:"E",n:3,title:"Без местоимения я пошёл",stimulus:"Скажи «я пошёл» одним словом.",answers:["Бардым"],explanation:"Бардым уже я + прошлое + идти.",rule:"T37_PERSON2",error:"PRONOUN",gold:"G043",rejects:["Мен барды"]},
  {id:"p4-42-e04",session:"E",n:4,title:"Она сшила",stimulus:"Она сшила.",answers:["Ол тікті","Тікті"],explanation:"Тігу → тік + ті. Ол без кто.",rule:"T38_OL_ZERO_PAST",error:"ASSIM",gold:"G044",rejects:["Ол тігді","Тігдім"]},
  {id:"p4-42-e05",session:"E",n:5,title:"Он искал",stimulus:"Он искал.",answers:["Ол іздеді","Іздеді"],explanation:"Іздеу: гласная → ді.",rule:"T38_OL_ZERO_PAST",error:"DY_TY",gold:"G045",rejects:["Ол іздедім"]},
  {id:"p4-42-e06",session:"E",n:6,title:"Он смотрел",stimulus:"Он смотрел.",answers:["Ол қарады","Қарады"],explanation:"Қарау твёрдое → ды.",rule:"T38_OL_ZERO_PAST",error:"DY_TY",gold:"G046",rejects:["Ол қарадым"]},
  {id:"p4-42-e07",session:"E",n:7,title:"Мой учитель не пришёл",stimulus:"Мой учитель не пришёл.",answers:["Мұғалімім келмеді"],explanation:"Третье лицо: келмеді, не келмедім.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G047",rejects:["Мұғалімім келмедім"]},
  {id:"p4-42-e08",session:"E",n:8,title:"Достарым",stimulus:"Мои друзья опоздали.",answers:["Достарым кешікті"],explanation:"Достарым — третье лицо. Не кешіктім. Ключ 7-2.2 школы сломан.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G048",rejects:["Достарым кешіктім"]},
  {id:"p4-42-f01",session:"F",n:1,title:"Я вышел",stimulus:"Я вышел.",answers:["Шықтым","Мен шықтым"],explanation:"Шығу: ғ→қ до ты.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G049",rejects:["Шығтым","Шығдым"]},
  {id:"p4-42-f02",session:"F",n:2,title:"Я нашёл",stimulus:"Я нашёл.",answers:["Таптым","Мен таптым"],explanation:"Табу: б→п до ты.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G050",rejects:["Табтым","Табым"]},
  {id:"p4-42-f03",session:"F",n:3,title:"Я опоздал",stimulus:"Я опоздал.",answers:["Кешіктім","Мен кешіктім"],explanation:"Кешігу: г→к до ті.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G051",rejects:["Кешігдім"]},
  {id:"p4-42-f04",session:"F",n:4,title:"Я закрыл",stimulus:"Я закрыл.",answers:["Жаптым","Мен жаптым"],explanation:"Жабу: б→п. Контраст жабамын.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G052",rejects:["Жабтым","Жабамын"]},
  {id:"p4-42-f05",session:"F",n:5,title:"Я сшил",stimulus:"Я сшил.",answers:["Тіктім","Мен тіктім"],explanation:"Тігу: г→к до ті.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G053",rejects:["Тігдім"]},
  {id:"p4-42-f06",session:"F",n:6,title:"Я спешил",stimulus:"Я спешил.",answers:["Асықтым","Мен асықтым"],explanation:"Асығу: ғ→қ. Не асығтым.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G054",rejects:["Асығтым"]},
  {id:"p4-42-f07",session:"F",n:7,title:"Мы вышли",stimulus:"Мы вышли.",answers:["Шықтық","Біз шықтық"],explanation:"Оглушение + біз қ.",rule:"T39_PAST_ASSIM",error:"PERSON2",gold:"G055",rejects:["Шықтымыз","Шығтық"]},
  {id:"p4-42-f08",session:"F",n:8,title:"Он нашёл",stimulus:"Он нашёл.",answers:["Тапты","Ол тапты"],explanation:"Тап + ты. Ол пусто.",rule:"T39_PAST_ASSIM",error:"ASSIM",gold:"G056",rejects:["Табты","Таптым"]},
  {id:"p4-42-f09",session:"F",n:9,title:"Они опоздали",stimulus:"Они опоздали.",answers:["Кешікті","Олар кешікті"],explanation:"Третье лицо: кешікті.",rule:"T39_PAST_ASSIM",error:"OL_EXTRA",gold:"G057",rejects:["Кешіктім","Кешігді"]},
  {id:"p4-42-f10",session:"F",n:10,title:"Мы закрыли",stimulus:"Мы закрыли.",answers:["Жаптық","Біз жаптық"],explanation:"Жап + ты + қ.",rule:"T39_PAST_ASSIM",error:"PERSON2",gold:"G058",rejects:["Жаптымыз","Жабтық"]},
  {id:"p4-42-g01",session:"G",n:1,title:"Я не писал",stimulus:"Я не писал. / Я не написал.",answers:["Жазбадым","Мен жазбадым"],explanation:"З → ба, потом всегда ды. Не жазбатым. Не не жаздым.",rule:"T40_PAST_NEG",error:"NEG_TY",gold:"G059",rejects:["Жазбатым","Не жаздым","Жаздым емес"]},
  {id:"p4-42-g02",session:"G",n:2,title:"Я не ушёл",stimulus:"Я не ушёл.",answers:["Кетпедім","Мен кетпедім"],explanation:"После пе всегда ді, не ті.",rule:"T40_PAST_NEG",error:"NEG_TY",gold:"G060",rejects:["Кетпетім"]},
  {id:"p4-42-g03",session:"G",n:3,title:"Я не вышел",stimulus:"Я не вышел.",answers:["Шықпадым","Мен шықпадым"],explanation:"Қ край → па + ды.",rule:"T40_PAST_NEG",error:"NEG",gold:"G061",rejects:["Шықпатым","Шықмадым"]},
  {id:"p4-42-g04",session:"G",n:4,title:"Я не нашёл",stimulus:"Я не нашёл.",answers:["Таппадым","Мен таппадым"],explanation:"Б→п, потом па. Две п. Не тападым.",rule:"T40_PAST_NEG",error:"ASSIM",gold:"G062",rejects:["Тападым","Тапмадым"]},
  {id:"p4-42-g05",session:"G",n:5,title:"Мы не закрыли",stimulus:"Мы не закрыли.",answers:["Жаппадық","Біз жаппадық"],explanation:"Жаппа + ды + қ.",rule:"T40_PAST_NEG",error:"NEG",gold:"G063",rejects:["Жаппатық","Жабамадық"]},
  {id:"p4-42-g06",session:"G",n:6,title:"Он не ушёл",stimulus:"Он не ушёл.",answers:["Ол кетпеді","Кетпеді"],explanation:"Ол: кетпеді.",rule:"T40_PAST_NEG",error:"OL_EXTRA",gold:"G064",rejects:["Ол кетпедім"]},
  {id:"p4-42-g07",session:"G",n:7,title:"Твой ученик не понял",stimulus:"Твой ученик не понял.",answers:["Оқушың түсінбеді"],explanation:"Край н → бе, не ме. Ключ 7-1.5 живой.",rule:"T40_PAST_NEG",error:"NEG_PART",gold:"G065",rejects:["Оқушың түсінмеді"]},
  {id:"p4-42-g08",session:"G",n:8,title:"Я не лежал",stimulus:"Я не лежал.",answers:["Жатпадым","Мен жатпадым"],explanation:"Т глухая → па + ды.",rule:"T40_PAST_NEG",error:"NEG",gold:"G066",rejects:["Жатпатым"]},
  {id:"p4-42-g09",session:"G",n:9,title:"Мы не опоздали",stimulus:"Мы не опоздали.",answers:["Кешікпедік","Біз кешікпедік"],explanation:"Кешік + пе + ді + к.",rule:"T40_PAST_NEG",error:"NEG",gold:"G067",rejects:["Кешікпетік","Кешікпедіқ"]},
  {id:"p4-42-g10",session:"G",n:10,title:"Вы-свои не смотрели",stimulus:"Вы (сендер) не смотрели.",answers:["Қарамадыңдар","Сендер қарамадыңдар"],explanation:"Қара + ма + ды + ңдар.",rule:"T40_PAST_NEG",error:"SENDER",gold:"G068",rejects:["Қарамадың","Қарамадыңыздар"]},
  {id:"p4-42-g11",session:"G",n:11,title:"Я не верил",stimulus:"Я не верил.",answers:["Сенбедім","Мен сенбедім"],explanation:"Н → бе + ді.",rule:"T40_PAST_NEG",error:"NEG_PART",gold:"G069",rejects:["Сенмедім"]},
  {id:"p4-42-g12",session:"G",n:12,title:"Я не думал",stimulus:"Я не думал.",answers:["Ойламадым","Мен ойламадым"],explanation:"Ойла + ма + ды + м.",rule:"T40_PAST_NEG",error:"NEG",gold:"G070",rejects:["Ойлабатым"]},
  {id:"p4-42-h01",session:"H",n:1,title:"Ты понял?",stimulus:"Ты понял?",answers:["Түсіндің бе?","Түсіндің бе","Сен түсіндің бе?","Сен түсіндің бе"],explanation:"После ң → бе. Не ме.",rule:"T41_PAST_Q",error:"QUESTION",gold:"G071",rejects:["Түсіндің ме","Түсіндіңме"]},
  {id:"p4-42-h02",session:"H",n:2,title:"Ты нашёл?",stimulus:"Ты нашёл?",answers:["Таптың ба?","Таптың ба","Сен таптың ба?","Сен таптың ба"],explanation:"После ң твёрдое → ба.",rule:"T41_PAST_Q",error:"QUESTION",gold:"G072",rejects:["Таптың ма"]},
  {id:"p4-42-h03",session:"H",n:3,title:"Мы не опоздали?",stimulus:"Мы не опоздали?",answers:["Кешікпедік пе?","Кешікпедік пе","Біз кешікпедік пе?","Біз кешікпедік пе"],explanation:"После к глухой → пе.",rule:"T41_PAST_Q",error:"QUESTION",gold:"G073",rejects:["Кешікпедік ме"]},
  {id:"p4-42-h04",session:"H",n:4,title:"Вы-сіздер пришли?",stimulus:"Вопрос к келдіңіздер.",answers:["Келдіңіздер ме?","Келдіңіздер ме"],explanation:"После гласной → ме. Не бе.",rule:"T41_PAST_Q",error:"QUESTION",gold:"G074",rejects:["Келдіңіздер бе"]},
  {id:"p4-42-h05",session:"H",n:5,title:"Я тоже пошёл",stimulus:"Я тоже пошёл.",answers:["Мен де бардым"],explanation:"Де — отдельное слово, не кусок времени.",rule:"T41_PAST_Q",error:"DE",gold:"G075",rejects:["Менде бардым","Мен дебардым"]},
  {id:"p4-42-h06",session:"H",n:6,title:"Он тоже не пришёл",stimulus:"Он тоже не пришёл.",answers:["Ол да келмеді"],explanation:"Да после л. Не кусок ды.",rule:"T41_PAST_Q",error:"DE",gold:"G076",rejects:["Олда келмеді"]},
  {id:"p4-42-h07",session:"H",n:7,title:"Книга тоже",stimulus:"Кітап + тоже.",answers:["Кітап та"],explanation:"После глухой п → та.",rule:"T41_PAST_Q",error:"DE",gold:"G077",rejects:["Кітап да","Кітапта"]},
  {id:"p4-42-h08",session:"H",n:8,title:"Человек тоже",stimulus:"Адам + тоже.",answers:["Адам да"],explanation:"После м не глухой → да.",rule:"T41_PAST_Q",error:"DE",gold:"G078",rejects:["Адам та"]},
  {id:"p4-42-i01",session:"I",n:1,title:"Я читал",stimulus:"Я читал. / Я учился.",answers:["Оқыдым","Мен оқыдым"],explanation:"Исключение школы: оқы, не оқ. Не оқтым.",rule:"T42_PAST_EXCEPT",error:"EXCEPT",gold:"G079",rejects:["Оқтым","Оқудым"]},
  {id:"p4-42-i02",session:"I",n:2,title:"Я слышал",stimulus:"Я слышал.",answers:["Естідім","Мен естідім"],explanation:"Исключение: есті, не ест. Не есттім.",rule:"T42_PAST_EXCEPT",error:"EXCEPT",gold:"G080",rejects:["Есттім","Естудім"]},
  {id:"p4-42-i03",session:"I",n:3,title:"Я положил",stimulus:"Я положил.",answers:["Қойдым","Мен қойдым"],explanation:"Қою → қой. Не қодым. В Без Иск не ставить.",rule:"T42_PAST_EXCEPT",error:"EXCEPT",gold:"G081",rejects:["Қодым"]},
  {id:"p4-42-i04",session:"I",n:4,title:"Я любил",stimulus:"Я любил.",answers:["Сүйдім","Мен сүйдім"],explanation:"Сүю → сүй. Не сүдім. В Без Иск не ставить.",rule:"T42_PAST_EXCEPT",error:"EXCEPT",gold:"G082",rejects:["Сүдім"]},
  {id:"p4-42-i05",session:"I",n:5,title:"Он читал",stimulus:"Он читал.",answers:["Оқыды","Ол оқыды"],explanation:"Оқы + ды. Ол пусто.",rule:"T42_PAST_EXCEPT",error:"EXCEPT",gold:"G083",rejects:["Оқты","Оқуды"]},
  {id:"p4-42-i06",session:"I",n:6,title:"Жату щит",stimulus:"Прошедшее от жату, я.",answers:["Жаттым","Мен жаттым"],explanation:"Жатырмын ещё не открыто.",rule:"T42_PAST_EXCEPT",error:"WRONG_TENSE",gold:"G084",rejects:["Жатырмын"]},
  {id:"p4-42-i07",session:"I",n:7,title:"Как дела ты",stimulus:"Қалай + ты. Это не прошедшее.",answers:["Қалайсың"],explanation:"Бытовой блок ДЗ: лица-1 из 4-1.",rule:"T42_PAST_EXCEPT",error:"WRONG_TENSE",gold:"G085",rejects:["Қалайдың"]},
  {id:"p4-42-i08",session:"I",n:8,title:"Спасибо",stimulus:"Спасибо по-казахски из блока ДЗ.",answers:["Рақмет"],explanation:"Не прошедшее.",rule:"T42_PAST_EXCEPT",error:"OTHER",gold:"G086",rejects:["Рақметтім"]},
  {id:"p4-42-i09",session:"I",n:9,title:"Я работал",stimulus:"Я работал.",answers:["Жұмыс істедім","Мен жұмыс істедім"],explanation:"Меняется істеу.",rule:"T42_PAST_EXCEPT",error:"DY_TY",gold:"G087",rejects:["Жұмыс істетым"]},
  {id:"p4-42-i10",session:"I",n:10,title:"Я играл",stimulus:"Я играл.",answers:["Ойнадым","Мен ойнадым"],explanation:"Ойна + ды + м.",rule:"T36_DY_TY",error:"DY_TY",gold:"G088",rejects:["Ойнатым"]},
  {id:"p4-42-j01",session:"J",n:1,title:"Я пошёл",stimulus:"Бардым. По-русски?",answers:["Я пошёл","Я ходил","Пошёл","Ходил"],explanation:"Мини-банк школы.",rule:"T35_PAST_MEANING",error:"MEANING",gold:"G089",rejects:["Я иду"]},
  {id:"p4-42-j02",session:"J",n:2,title:"Я написал RU→KK",stimulus:"Я написал.",answers:["Жаздым","Мен жаздым"],explanation:"Мини-банк.",rule:"T35_PAST_MEANING",error:"DY_TY",gold:"G090",rejects:["Жазтым"]},
  {id:"p4-42-j03",session:"J",n:3,title:"Он не ушёл RU→KK",stimulus:"Он не ушёл.",answers:["Ол кетпеді","Кетпеді"],explanation:"После не — ді.",rule:"T40_PAST_NEG",error:"NEG",gold:"G091",rejects:["Ол кетпеті"]},
  {id:"p4-42-j04",session:"J",n:4,title:"Мы опоздали",stimulus:"Мы опоздали.",answers:["Біз кешіктік","Кешіктік"],explanation:"Мягкое → к.",rule:"T39_PAST_ASSIM",error:"HARMONY",gold:"G092",rejects:["Біз кешіктіқ","Біз кешіктіміз"]},
  {id:"p4-42-j05",session:"J",n:5,title:"Вы-сіз поняли",stimulus:"Вы (сіз) поняли.",answers:["Түсіндіңіз","Сіз түсіндіңіз"],explanation:"Сіз → ңіз.",rule:"T37_PERSON2",error:"PERSON2",gold:"G093",rejects:["Түсіндіңіздер","Түсіндің"]},
  {id:"p4-42-j06",session:"J",n:6,title:"Ты не закрыл",stimulus:"Ты не закрыл.",answers:["Жаппадың","Сен жаппадың"],explanation:"Жаппа + ды + ң.",rule:"T40_PAST_NEG",error:"NEG",gold:"G094",rejects:["Жаппадыңдар"]},
  {id:"p4-42-j07",session:"J",n:7,title:"Мы не опоздали вопрос",stimulus:"Мы не опоздали?",answers:["Кешікпедік пе?","Кешікпедік пе","Біз кешікпедік пе?","Біз кешікпедік пе"],explanation:"Вопрос после готовой формы.",rule:"T41_PAST_Q",error:"QUESTION",gold:"G095",rejects:["Кешікпедік ме"]},
  {id:"p4-42-j08",session:"J",n:8,title:"Я работал мини",stimulus:"Я работал.",answers:["Жұмыс істедім","Мен жұмыс істедім"],explanation:"Мини-банк 11.",rule:"T35_PAST_MEANING",error:"DY_TY",gold:"G096",rejects:["Жұмыс істедым"]},
  {id:"p4-42-j09",session:"J",n:9,title:"Он говорил мини",stimulus:"Он говорил.",answers:["Ол сөйледі","Сөйледі"],explanation:"Не сөйлейді.",rule:"T38_OL_ZERO_PAST",error:"WRONG_TENSE",gold:"G097",rejects:["Ол сөйлейді"]},
  {id:"p4-42-j10",session:"J",n:10,title:"Біз жаппадық",stimulus:"Біз жаппадық. По-русски?",answers:["Мы не закрыли","Не закрыли"],explanation:"Мини-банк.",rule:"T40_PAST_NEG",error:"MEANING",gold:"G098",rejects:["Мы закрыли"]},
  {id:"p4-42-j11",session:"J",n:11,title:"Достарым ещё раз",stimulus:"Достарым кешіктім — живая форма?",answers:["Достарым кешікті","Кешікті"],explanation:"Дыра ключа 7-2.2.",rule:"T38_OL_ZERO_PAST",error:"OL_EXTRA",gold:"G099",rejects:["Достарым кешіктім"]},
  {id:"p4-42-j12",session:"J",n:12,title:"Я не нашёл мини",stimulus:"Я не нашёл.",answers:["Таппадым","Мен таппадым"],explanation:"Две п.",rule:"T40_PAST_NEG",error:"ASSIM",gold:"G100",rejects:["Тападым"]}
 ];
 const EXTRA=[];
 const BUILT=SPECS.concat(EXTRA).map(one);
 function bySession(letter){return BUILT.filter(q=>q.phase3.session===letter).map(clone);}
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
 function extras(){return [];}
 function all(){return lessonSession();}
 function byId(id){const q=BUILT.find(x=>x.id===id);return q?clone(q):null;}
 function install(course,catalog){
  if(!course||!Array.isArray(course.questions)||!gate||!gate.allows||!gate.allows('past_simple',catalog))return [];
  course.sources=course.sources||{};
  if(!course.sources['phase3-42'])course.sources['phase3-42']={title:'Урок 4-2 · прошедшее время',url:'#',additional:true};
  const known=new Set(course.questions.map(q=>q.id)),added=[];
  for(const q of all()){if(known.has(q.id))continue;course.questions.push(clone(q));known.add(q.id);added.push(q.id);}
  return added;
 }
 const CP=node?require('./course-progress.js'):root.CourseProgress;
 const REV='t-integration-v1';
 function ids(session,from,to){
  const out=[];
  for(let n=from;n<=to;n++)out.push('p4-42-'+session+String(n).padStart(2,'0'));
  return out;
 }
 const SPEC=[
  ['42-a','T35_PAST_MEANING',ids('a',1,8),['p4-42-a01','p4-42-a05'],6/8,false],
  ['42-b','T35_PAST_MEANING',ids('b',1,10),['p4-42-b01','p4-42-b02'],8/10,false],
  ['42-c','T36_DY_TY',ids('c',1,10),['p4-42-c02','p4-42-c05'],8/10,false],
  ['42-d','T37_PERSON2',ids('d',1,12),['p4-42-d01','p4-42-d02','p4-42-d07'],10/12,false],
  ['42-e','T38_OL_ZERO_PAST',ids('e',1,8),['p4-42-e01','p4-42-e08'],6/8,false],
  ['42-f','T39_PAST_ASSIM',ids('f',1,10),['p4-42-f01','p4-42-f02','p4-42-f06'],8/10,false],
  ['42-g','T40_PAST_NEG',ids('g',1,12),['p4-42-g01','p4-42-g02','p4-42-g04','p4-42-g07'],10/12,false],
  ['42-h','T41_PAST_Q',ids('h',1,8),['p4-42-h01','p4-42-h05'],6/8,false],
  ['42-i','T42_PAST_EXCEPT',ids('i',1,10),['p4-42-i01','p4-42-i02','p4-42-i06'],8/10,false],
  ['42-j','T38_OL_ZERO_PAST',ids('j',1,12),['p4-42-j03','p4-42-j11','p4-42-j12'],10/12,true]
 ];
 function fullPlan(row){
  const [stageId,rule,coreIds,required,ratio,final]=row;
  return {
   lessonId:'4-2',contentRevision:REV,stageId,kind:'learning',
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
  return (events||[]).some(e=>e&&e.type==='course_stage_completed'&&e.lesson_id==='4-2'&&e.content_revision===REV&&(e.stage_id===stageId||e.stage_id===stageId+'-fix'));
 }
 function tried(events,stageId){
  return (events||[]).some(e=>e&&e.type==='answer'&&e.lesson_id==='4-2'&&e.stage_id===stageId&&e.content_revision===REV);
 }
 function fixPlan(full,events){
  const report=CP&&CP.evaluateStage?CP.evaluateStage(events,full):{independent:[]};
  const missed=full.requiredIndependentIds.filter(id=>!(report.independent||[]).includes(id));
  const core=(missed.length?missed:full.requiredIndependentIds).slice(0,2);
  const fallback=core.length?core:full.coreIds.slice(0,1);
  return {
   lessonId:'4-2',contentRevision:REV,stageId:full.stageId+'-fix',kind:'repair',
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
 function stageClosed(stageId,events){return closed(events,stageId);}
 function phraseUnlocked(){return true;}
 function goldRows(){
  const rows=[];
  for(const spec of SPECS){
   rows.push({id:spec.gold,card:spec.id,accepts:spec.answers.slice(),rejects:(spec.rejects||[]).slice()});
  }
  return rows;
 }
 function check(cardOrId,answer){
  const q=typeof cardOrId==='string'?byId(cardOrId):clone(cardOrId);
  if(!q||!core||!core.evaluate)throw new Error('Lesson 4-2 pack unavailable');
  const answers=Array.isArray(answer)?answer.map(x=>String(x??'')):[String(answer??'')];
  const result=core.evaluate(q,answers);
  const errors=result.correct||!diagnostics||!diagnostics.diagnose?[]:diagnostics.diagnose(q,answers,result,Date.now());
  return {question:q,result,errors};
 }
 const api={
  sessionA,sessionB,sessionC,sessionD,sessionE,sessionF,sessionG,sessionH,sessionI,sessionJ,
  lessonSession,grammarQuestions,extras,all,byId,check,install,
  stagePlan,stagePlans,stageSession,nextStage,courseSession,stageClosed,phraseUnlocked,goldRows
 };
 if(node)module.exports=api;else root.Lesson42Pack=api;
})(typeof window!=='undefined'?window:globalThis);
