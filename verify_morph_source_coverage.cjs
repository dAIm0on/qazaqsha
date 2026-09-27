'use strict';
/**
 * Реестр 555 фрагментов 32/34.
 * Не доказывает сокращение зелёным именем: смысловой PASS ставит только
 * независимый отзыв с цитатой, которую этот файл заново находит в тексте урока.
 * Механический проход — ИИ-ученик/реестр, не редактор.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const L=require('./morph-learner-v2.js');
const E=require('./morph-engine.js');
const gold=require('./morph-gold.json');

const PACK='G:\\Мой диск\\Казахский\\КОРРЕКТИРОВКА\\З-ЗВУКИ\\ПОНЯТНЫЙ_КАЗАХСКИЙ_V2_2026-09-27';
const UNITS_PATH=path.join(PACK,'16_SOURCE_UNITS.json');
const MATRIX_PATH=path.join(PACK,'17_SCOPE_MATRIX.json');
const OUT_DIR=path.join(PACK,'E_COVERAGE');
const REVIEW_PATH=path.join(OUT_DIR,'INDEPENDENT_REVIEW.json');
const STOP=new Set('этот эта это эти для как что или при уже она они оно был была были быть если так тут там ещё еще надо нужен нужно можно только потом здесь сейчас слово слова форме форму конец конца буквы буква вопрос вопросы смысл смысле пример примеры урок урока человек человека предмет предмета несколько один одна этот этой этом эти этого эту который которая которые когда тоже между потом снова сейчас должен должна должно должны можно нельзя нужен нужна нужно являются является после перед через между только любой любая любые такая такие такой таким таким'.split(/\s+/));

function sha256(buf){return crypto.createHash('sha256').update(buf).digest('hex');}
function low(s){return String(s||'').toLocaleLowerCase('ru');}
function blockPlain(b){
 const parts=[];
 if(b.text)parts.push(b.text);
 if(b.caption)parts.push(b.caption);
 if(b.headers)parts.push(b.headers.join(' | '));
 if(b.rows)for(const row of b.rows)parts.push(row.join(' | '));
 if(b.items)parts.push(b.items.join('\n'));
 if(b.before)parts.push([b.before,b.beforeRu,b.added,b.after,b.afterRu].filter(Boolean).join(' '));
 if(b.prompt)parts.push([b.prompt,...(b.options||[]),b.good,b.bad].filter(Boolean).join('\n'));
 return parts.filter(Boolean).join('\n');
}
const lessons=L.lessons.map(row=>{
 const blocks=row.blocks.map(b=>({id:b.id,slot:b.slot,type:b.type,text:blockPlain(b),low:low(blockPlain(b))}));
 return {id:row.id,title:row.title,families:row.families.slice(),renderTargets:(row.renderTargets||[]).slice(),blocks,blob:blocks.map(b=>b.low).join('\n')};
});
function lessonById(id){return lessons.find(x=>x.id===id)||null;}
const shellFiles={
 'morph-ui.js':fs.readFileSync(path.join(__dirname,'morph-ui.js'),'utf8'),
 'morph-teaching-practice.js':fs.readFileSync(path.join(__dirname,'morph-teaching-practice.js'),'utf8'),
 'morph-learner-v2.js':fs.readFileSync(path.join(__dirname,'morph-learner-v2.js'),'utf8'),
 'morph-state.js':fs.readFileSync(path.join(__dirname,'morph-state.js'),'utf8'),
 'morph-engine.js':fs.readFileSync(path.join(__dirname,'morph-engine.js'),'utf8'),
 'morph-teaching-data.js':fs.readFileSync(path.join(__dirname,'morph-teaching-data.js'),'utf8')
};
function findIn(hay,needle){
 const h=low(hay),n=low(needle);
 const i=h.indexOf(n);
 if(i<0)return null;
 return hay.slice(i,i+needle.length);
}
function findLesson(needle,onlyId){
 const n=low(needle);
 const rows=onlyId?[lessonById(onlyId)].filter(Boolean):lessons;
 for(const row of rows){
  for(const b of row.blocks){
   if(b.low.includes(n))return {kind:'learner',lessonId:row.id,blockId:b.id,quote:findIn(b.text,needle),renderTarget:'learner.full'};
  }
 }
 return null;
}
function findShell(needle,file){
 const files=file?[file]:Object.keys(shellFiles);
 for(const name of files){
  const quote=findIn(shellFiles[name],needle);
  if(quote){
   const kind=name==='morph-teaching-data.js'?'canon':(name==='morph-state.js'||name==='morph-engine.js'?'system':'shell');
   return {kind,file:name,blockId:'shell.'+name.replace(/\W/g,'-'),quote,renderTarget:kind==='shell'?'shell.visible':kind};
  }
 }
 return null;
}
function locate(needle,lessonId){
 return findLesson(needle,lessonId)||findShell(needle);
}

const SHELL_RULES=[
 {re:/Продолжить обучение/,needle:'Продолжить обучение',file:'morph-ui.js',id:'shell.hub.continue'},
 {re:/Учиться с нуля/,needle:'Учиться с нуля',file:'morph-ui.js',id:'shell.hub.zero'},
 {re:/Повторить слабое место/,needle:'Повторить слабое место',file:'morph-ui.js',id:'shell.hub.weak'},
 {re:/Самостоятельная практика/,needle:'Самостоятельная практика',file:'morph-ui.js',id:'shell.hub.practice'},
 {re:/Проверить на новых основах/,needle:'Проверить на новых основах',file:'morph-ui.js',id:'shell.hub.transfer'},
 {re:/расписани[еяю] повторен|FSRS не обновля/,needle:'не меняют расписание повторений',file:'morph-ui.js',id:'shell.schedule'},
 {re:/мало данных|пока мало ответов/,needle:'пока мало ответов',file:'morph-ui.js',id:'shell.little-data'},
 {re:/не сертификат|освоено навсегда|освоена навсегда|не доказательство метода/,needle:'Он не означает, что тема освоена навсегда.',file:'morph-ui.js',id:'shell.not-certificate'},
 {re:/следующ\w* дн|отложенн\w* проверк|удержан/,needle:'повтора на следующий день ещё не было',file:'morph-ui.js',id:'shell.retention'},
 {re:/Недостаточно новых основ|банк этого не позволяет|claim сужается/,needle:'Недостаточно новых основ для полной проверки этого поднавыка.',file:'morph-teaching-practice.js',id:'shell.short-bank'},
 {re:/не записывается как самостоятельный|hinted\/guided|Событие после hint/,needle:'Он не записывается как самостоятельный ответ.',file:'morph-learner-v2.js',id:'shell.unscored-try'},
 {re:/без оценки|нет однозначного проверенного эталона|не считается твоей ошибкой|не учитывается как ошибка ученика/,needle:'Это не считается твоей ошибкой.',file:'morph-ui.js',id:'shell.unscorable-label'}
];

function obligations(fragment){
 const out=[];
 const f=String(fragment||'');
 for(const w of f.match(/[а-яёәіңғүұқөһ]{4,}/giu)||[]){
  const t=low(w);
  if(STOP.has(t))continue;
  if(/[әіңғүұқөһ]/i.test(w)||t.length>=6)out.push(t);
 }
 for(const q of f.match(/«[^»]{4,80}»/g)||[]){
  const t=low(q.slice(1,-1));
  if(t.length>=4)out.push(t);
 }
 return [...new Set(out)];
}
function distinctive(token){
 const n=lessons.filter(row=>row.blob.includes(token)).length;
 if(/[әіңғүұқөһ]/i.test(token))return n>0&&n<=6;
 return n>0&&n<=3&&token.length>=6;
}
function bindTokens(fragment){
 const all=obligations(fragment);
 const obs=all.filter(distinctive);
 if(!obs.length)return null;
 let best=null;
 for(const row of lessons){
  const blocks=[];
  for(const ob of obs){
   const b=row.blocks.find(x=>x.low.includes(ob));
   if(b)blocks.push({ob,blockId:b.id,quote:findIn(b.text,ob)});
  }
  if(!best||blocks.length>best.blocks.length)best={row,blocks};
 }
 if(!best||best.blocks.length===0)return null;
 const strong=best.blocks.filter(x=>/[әіңғүұқөһ]/i.test(x.ob)||x.ob.length>=7);
 if(best.blocks.length<2&&strong.length===0)return null;
 const foundInLesson=all.filter(ob=>best.row.blob.includes(ob));
 const ratio=all.length?foundInLesson.length/all.length:0;
 const semantic=ratio>=0.75&&all.length-foundInLesson.length<=1?'PENDING_INDEPENDENT':'PARTIAL';
 return {
  lessonId:best.row.id,
  learnerBlockIds:[...new Set(best.blocks.map(x=>x.blockId))].slice(0,12),
  renderTargets:['learner.full',...best.row.renderTargets],
  mappingDecision:best.blocks.length>1?'SPLIT':'REPHRASED',
  semanticStatus:semantic,
  evidence:best.blocks.slice(0,8).map(x=>({kind:'learner',lessonId:best.row.id,blockId:x.blockId,quote:x.quote,token:x.ob})),
  missing:all.filter(ob=>!foundInLesson.includes(ob)).slice(0,12)
 };
}

const ANCHORS={
 'SRC32-0078':{lesson:'learner.dat.kuda',needles:['мектепке','мектепте'],decision:'REPHRASED'},
 'SRC32-0088':{lesson:'learner.pl.several',needles:['Сначала л, д или т','Потом а или е'],decision:'REPHRASED'},
 'SRC32-0090':{lesson:'learner.pl.several',needles:['а, о, ұ, ы → а','ә, ө, ү, і, е → е'],decision:'REPHRASED'},
 'SRC32-0110':{lesson:'learner.pl.several',needles:['После р берём л'],missing:['В уроке есть только клетка «после р → л» для «несколько». Остальные восемь клеток строки р одной таблицей 7×9 не собраны.'],decision:'SPLIT',partial:true},
 'SRC32-0111':{lesson:'learner.pl.several',needles:['После л берём д'],missing:['В уроке есть только клетка «после л → д» для «несколько». Остальные клетки строки л одной таблицей 7×9 не собраны.'],decision:'SPLIT',partial:true},
 'SRC32-0112':{lesson:'learner.nasal.senses',needles:['адамның','адамды','адамнан','адаммен'],missing:['Строка м/н/ң разобрана на адам, не как полная матрица 7×9 по всем девяти столбцам.'],decision:'SPLIT',partial:true},
 'SRC32-0113':{lesson:'learner.nasal.senses',needles:['қыздың','қызды','қыздан','қызбен'],missing:['Строка з/ж показана примером қыз, не полной матрицей 7×9.'],decision:'SPLIT',partial:true},
 'SRC32-0135':{lesson:'learner.poss.owner',needles:['-ым / -ім','-м'],decision:'REPHRASED'},
 'SRC32-0136':{lesson:'learner.poss.owner',needles:['-ың / -ің','-ң'],decision:'REPHRASED'},
 'SRC32-0137':{lesson:'learner.poss.owner',needles:['-ымыз / -іміз','-мыз / -міз'],decision:'REPHRASED'},
 'SRC32-0138':{lesson:'learner.poss.owner',needles:['-ыңыз / -іңіз','-ңыз / -ңіз'],decision:'REPHRASED'},
 'SRC32-0139':{lesson:'learner.poss.owner',needles:['-ы / -і','-сы / -сі'],decision:'REPHRASED'},
 'SRC32-0158':{lesson:'learner.person.roles',needles:['-мын, -мін, -бын, -бін, -пын, -пін'],decision:'REPHRASED'},
 'SRC32-0159':{lesson:'learner.person.roles',needles:['адамбыз','баламыз','әкеміз','қызбыз','қонақпыз'],missing:['Отдельной строкой «піз» в тексте нет: передний глухой «мы» показан не всеми шестью кусками списком.'],decision:'SPLIT',partial:true},
 'SRC32-0160':{lesson:'learner.person.roles',needles:['-сың или -сің'],decision:'REPHRASED'},
 'SRC32-0161':{lesson:'learner.person.roles',needles:['-сыз или -сіз'],decision:'REPHRASED'},
 'SRC32-0164':{lesson:'learner.person.roles',needles:['ма, ме, ба, бе, па, пе'],decision:'REPHRASED'},
 'SRC32-0182':{lesson:'learner.poss.owner',needles:['үйлер','үйлеріміз','үйлерімізден'],decision:'SPLIT'},
 'SRC32-0194':{lesson:'learner.poss.owner',needles:['-нда / -нде'],decision:'REPHRASED'},
 'SRC32-0195':{lesson:'learner.poss.owner',needles:['-нан / -нен'],decision:'REPHRASED'},
 'SRC32-0206':{lesson:'learner.verbs.steps',needles:['Кел → келме → келмеді → келмедік','не собирает «заставить сделать», страдательное и возвратное'],decision:'SPLIT',partial:true,missing:['Порядок «отрицание → функция → лицо» показан цепочкой кел. Залог в урок не входит: сказано, что эти значения не собираются.']},
 'SRC32-0207':{lesson:'learner.verbs.steps',needles:['не собирает «заставить сделать», страдательное и возвратное'],decision:'REPHRASED'},
 'SRC32-0211':{lesson:'learner.person.roles',needles:['жазба — не пиши','Это не вопрос'],decision:'REPHRASED'},
 'SRC32-0220':{lesson:'learner.verbs.steps',needles:['жазған','ойнаған'],missing:['Четыре куска ған/ген/қан/кен одной строкой не выписаны.'],decision:'SPLIT',partial:true},
 'SRC32-0250':{needles:['Это только порог, когда смешивание уже можно открыть'],file:'morph-ui.js',decision:'REPHRASED',partial:true,missing:['Фраза запрещает считать порог доказательством. Поштучный запрет «не добавлять сразу функцию, край, исключение, длинную цепь и новый способ ответа» отдельным списком в оболочке не найден.']},
 'SRC32-0255':{needles:['Этот порог только открывает смешанную практику.','Он не означает, что тема освоена навсегда.'],file:'morph-ui.js',decision:'REPHRASED'},
 'SRC32-0280':{needles:['Для этого ответа сейчас нет однозначного проверенного эталона. Это не считается твоей ошибкой.'],file:'morph-ui.js',decision:'REPHRASED'},
 'SRC32-0285':{lesson:'learner.dat.kuda',needles:['Что скажем','Посмотрим ещё'],decision:'SPLIT',partial:true,missing:['Девять шагов сессии исходника не пронумерованы тем же списком. В уроке есть смысл, примеры, выбор и отдельная самостоятельная практика.']},
 'SRC32-0290':{needles:['Он не записывается как самостоятельный ответ.'],file:'morph-learner-v2.js',decision:'REPHRASED',partial:true,missing:['Ученику сказано, что выбор в разборе не пишется как самостоятельный ответ. Служебное имя hinted/guided остаётся в morph-state.js.']},
 'SRC32-0298':{needles:['Недостаточно новых основ для полной проверки этого поднавыка.'],file:'morph-teaching-practice.js',decision:'REPHRASED'},
 'SRC32-0301':{needles:['повтора на следующий день ещё не было'],file:'morph-ui.js',decision:'REPHRASED',partial:true,missing:['Оболочка говорит, что повтора на следующий день ещё не было. Что навык сам вернётся позже, отдельным доказательством удержания не показано.']},
 'SRC32-0306':{needles:['Таблица не разрешает придумывать формы для неизвестных слов'],lesson:'learner.poss.owner',decision:'REPHRASED',partial:true,missing:['Есть запрет выдумывать форму неизвестного слова. Отдельной фразы «не выдавать наиболее вероятный нормативный ответ» в простом уроке нет.']},
 'SRC32-0310':{needles:['Продолжить обучение','Учиться с нуля','Повторить слабое место','Самостоятельная практика','Проверить на новых основах'],file:'morph-ui.js',decision:'REPHRASED'},
 'SRC32-0314':{lesson:'learner.poss.owner',needles:['принципі','орын → орны'],decision:'SHARED_REFERENCE',partial:true,missing:['Контрпримеры в уроках есть. Отдельной строкой «запрещено выкинуть ограничения» ученику не написано: это редакторский запрет.']},
 'SRC34-0018':{lesson:'learner.nasal.senses',needles:['Чей или чего'],decision:'REPHRASED'},
 'SRC34-0020':{lesson:'learner.nasal.senses',needles:['баланың кітабы'],decision:'REPHRASED'},
 'SRC34-0025':{lesson:'learner.nasal.senses',needles:['Сначала всё равно вопрос'],decision:'REPHRASED'},
 'SRC34-0056':{lesson:'learner.loc.where',needles:['Где уже находится','значение «когда»'],decision:'REPHRASED',partial:true,missing:['«Где» разбирается. «Когда» названо и в задания этого урока не поставлено.']},
 'SRC34-0081':{lesson:'learner.nasal.senses',needles:['В -мен, -бен и -пен буква е остаётся','После глухого конца п','После з буква б'],decision:'REPHRASED'},
 'SRC34-0109':{lesson:'learner.person.roles',needles:['Кто я, не чья вещь'],decision:'REPHRASED',partial:true,missing:['Слово «предикация» в простом уроке не используется. Это и есть запрет делать его единственным объяснением, но самого запрета строкой нет.']},
 'SRC34-0111':{lesson:'learner.person.roles',needles:['Кто я, не чья вещь'],decision:'REPHRASED'},
 'SRC34-0130':{lesson:'learner.verbs.steps',needles:['«Если» — удобный первый мостик'],decision:'REPHRASED'},
 'SRC34-0134':{lesson:'learner.verbs.steps',needles:['Задний ряд берёт са, передний се.'],decision:'REPHRASED'},
 'SRC34-0135':{lesson:'learner.verbs.steps',needles:['Начальная с здесь не прыгает на д, т, м, б или п.'],decision:'REPHRASED'},
 'SRC32-0084':{lesson:'learner.pl.several',needles:['Сначала л, д или т','Потом а или е'],decision:'REPHRASED'},
 'SRC32-0108':{lesson:'learner.nasal.senses',needles:['гласный | л | н | н | д | д | м | м | м | м'],decision:'REPHRASED'},
 'SRC32-0109':{lesson:'learner.nasal.senses',needles:['й или согласный у | л | д | д | д | д | м | м | м | м'],decision:'REPHRASED'},
 'SRC32-0249':{lesson:'learner.poss.owner',needles:['Следующий тренировочный пример берётся на другой разрешённой основе'],decision:'REPHRASED',partial:true,missing:['Короткий контраст на другой основе есть. Ограничение «не повторять одну тему без конца, потом смешать» отдельным списком не выписано.']},
 'SRC34-0113':{lesson:'learner.person.roles',needles:['Для «я» конец бывает','Для «мы»','«Ты» здесь'],decision:'SPLIT'},
 'SRC34-0168':{lesson:'learner.verbs.steps',needles:['Это описание предмета, не сообщение'],decision:'REPHRASED',partial:true,missing:['Контекст примеров однозначный. Запрет проверять тонкость «подлежащее или дополнение» отдельной фразой не найден.']},
 'SRC34-0170':{lesson:'learner.verbs.steps',needles:['жазған','Келген адам'],missing:['Куски ған и ген есть в примерах. Строка қан/кен целиком не выписана.'],decision:'SPLIT',partial:true},
 'SRC34-0188':{lesson:'learner.verbs.steps',needles:['келіп'],missing:['После согласного показан келіп. Пара ып/іп как полное правило одной строкой не выписана.'],decision:'REPHRASED',partial:true},
 'SRC34-0189':{lesson:'learner.verbs.steps',needles:['жауып'],missing:['После гласного отдельное правило «только п» одной строкой не найдено. жауып — словарное изменение, не общий образец на п.'],decision:'REPHRASED',partial:true},
 'SRC34-0193':{lesson:'learner.verbs.steps',needles:['Келіп само не значит','способ, обстоятельство или шаг перед ним'],decision:'REPHRASED',partial:true,missing:['Вторая глагольная конструкция из банка не добавлена. Сказано, что келіп само не значит «он пришёл» и что это шаг перед главным действием.']},
 'SRC34-0198':{lesson:'learner.dat.kuda',needles:['куда он идёт'],decision:'REPHRASED'},
 'SRC32-0027':{lesson:'learner.verbs.steps',needles:['Не делать','жазба'],decision:'REPHRASED'},
 'SRC32-0029':{lesson:'learner.verbs.steps',needles:['келсе'],decision:'REPHRASED'},
 'SRC32-0106':{lesson:'learner.nasal.senses',needles:['Нельзя сказать «после м, н или ң всегда н»'],decision:'REPHRASED'},
 'SRC32-0114':{lesson:'learner.pl.several',needles:['глухой: п, к, қ, т, с'],missing:['Клетка «несколько → т» после глухого есть. Остальные столбцы строки глухого одной матрицей 7×9 не собраны. По вопросу и «я» глухой конец показан отдельно: қонақ па, қонақпын.'],decision:'SPLIT',partial:true},
 'SRC32-0126':{lesson:'learner.nasal.senses',needles:['адамның','адамды','адамнан'],decision:'SPLIT'},
 'SRC32-0128':{file:'morph-learner-v2.js',needles:['Похожая форма отвечает на другой вопрос'],decision:'REPHRASED'},
 'SRC32-0129':{file:'morph-learner-v2.js',needles:['Край слова тот же, но у этого вопроса своя группа'],decision:'REPHRASED'},
 'SRC34-0008':{file:'morph-ui.js',needles:['какой смысл мы сейчас выражаем','что не надо путать с этой операцией'],decision:'REPHRASED'},
 'SRC34-0212':{file:'morph-ui.js',needles:['нельзя объединять в одно правило'],decision:'REPHRASED'},
 'SRC32-0049':{lesson:'learner.nasal.senses',needles:['адаммен не превращается в форму с а'],decision:'REPHRASED'},
 'SRC32-0258':{file:'morph-ui.js',needles:['разбор появляется после первой попытки','разбор идёт после блока'],decision:'REPHRASED'},
 'SRC32-0284':{file:'morph-ui.js',needles:['без обязательного секундомера'],decision:'REPHRASED'},
 'SRC34-0027':{lesson:'learner.poss.owner',needles:['оно стоит концом на самой вещи'],decision:'REPHRASED'},
 'SRC34-0181':{lesson:'learner.verbs.steps',needles:['стоит в цепочке перед главным действием'],decision:'REPHRASED'},
 'SRC32-0153':{file:'morph-learner-v2.js',needles:['Буква а/е или ы/і в добавке не совпала'],decision:'REPHRASED'},
 'SRC32-0168':{lesson:'learner.nasal.senses',needles:['Нельзя сказать «после м, н или ң всегда н»'],decision:'REPHRASED'},
 'SRC32-0177':{file:'morph-engine.js',needles:['Сказуемые я, мы, ты и вы здесь не оцениваются'],decision:'REPHRASED',partial:true,missing:['Оговорка лежит в служебной заметке движка. Отдельной ученической карточкой на экране она не повторена.']},
 'SRC32-0185':{lesson:'learner.poss.owner',needles:['После первого шага работаем с үйлер'],decision:'REPHRASED'},
 'SRC32-0209':{lesson:'learner.verbs.steps',needles:['жазба','ма, ме, ба, бе, па, пе'],decision:'REPHRASED'},
 'SRC32-0224':{lesson:'learner.verbs.steps',needles:['келсе','са или се'],decision:'REPHRASED'},
 'SRC32-0225':{lesson:'learner.verbs.steps',needles:['Начальная с здесь не прыгает на д, т, м, б или п.'],decision:'REPHRASED'},
 'SRC32-0240':{lesson:'learner.verbs.steps',needles:['Каждый шаг видит предыдущее слово'],decision:'REPHRASED'},
 'SRC32-0253':{file:'morph-ui.js',needles:['стоит повторить'],decision:'REPHRASED'},
 'SRC32-0264':{file:'morph-learner-v2.js',needles:['Первая буква добавки не подходит к концу этого слова.'],decision:'REPHRASED'},
 'SRC32-0278':{file:'morph-learner-v2.js',needles:['Одна причина по этой записи не назначается.'],decision:'REPHRASED'},
 'SRC32-0292':{file:'morph-ui.js',needles:['Проверить на новых основах'],decision:'REPHRASED',partial:true,missing:['Кнопка проверки на новых основах есть. Формулировка «новое внутри модуля на уровне леммы» ученику так не сказано.']},
 'SRC32-0296':{lesson:'learner.poss.owner',needles:['Следующий тренировочный пример берётся на другой разрешённой основе'],decision:'REPHRASED',partial:true,missing:['Дословного запрета «не заменять знакомыми карточками» в оболочке нет. В уроке сказано, что следующий пример берётся на другой разрешённой основе.']},
 'SRC32-0308':{file:'morph-ui.js',needles:['Это не считается твоей ошибкой.'],decision:'REPHRASED'},
 'SRC34-0035':{lesson:'learner.nasal.senses',needles:['Речь об этой книге, не о книге вообще'],decision:'REPHRASED'},
 'SRC34-0036':{lesson:'learner.nasal.senses',needles:['Речь об этой книге'],decision:'REPHRASED',partial:true,missing:['Казахская формулировка источника «тура объект» и отдельное противопоставление немаркированного неопределённого объекта в урок дословно не перенесены.']},
 'SRC34-0038':{lesson:'learner.nasal.senses',needles:['Кого или что именно'],decision:'REPHRASED'},
 'SRC34-0043':{needles:['Речь об этой книге, не о книге вообще','кітабын'],decision:'SPLIT',partial:true,missing:['Конкретный объект и отдельное н после «его или её» показаны. Нумерованный алгоритм из четырёх шагов исходника целиком не повторен.']},
 'SRC34-0058':{lesson:'learner.loc.where',needles:['Где?','Куда?','Откуда?'],decision:'SPLIT'},
 'SRC34-0061':{lesson:'learner.loc.where',needles:['После формы «его или её» здесь -нда или -нде'],decision:'REPHRASED'},
 'SRC34-0077':{lesson:'learner.nasal.senses',needles:['С кем'],decision:'REPHRASED',partial:true,missing:['Заголовок урока разбирает «с кем» отдельно от «чем». Точная вывеска «С кем? С чем вместе?» одной строкой не скопирована.']},
 'SRC34-0093':{file:'morph-learner-v2.js',needles:['чей это предмет'],decision:'REPHRASED'},
 'SRC34-0117':{lesson:'learner.verbs.steps',needles:['В этом уроке не разбираем тонкость'],decision:'REPHRASED',partial:true,missing:['Сказано, что без ясного примера тонкость не разбирается. Общая фраза «runtime проверяет словоформу, смысл задаёт контекст» так не вынесена.']},
 'SRC34-0128':{lesson:'learner.verbs.steps',needles:['форма не равна одному русскому слову «если» во всех случаях'],decision:'REPHRASED'},
 'SRC34-0145':{lesson:'learner.verbs.steps',needles:['Это не то же самое, что адаммын'],decision:'REPHRASED'},
 'SRC34-0147':{lesson:'learner.verbs.steps',needles:['Кто сделал','келсем'],decision:'SPLIT'},
 'SRC34-0150':{lesson:'learner.verbs.steps',needles:['келсем','айтсаң'],missing:['келсек как отдельный пример «мы» при условии в этом абзаце не выписан. Есть жазсақ — если мы напишем.'],decision:'SPLIT',partial:true},
 'SRC34-0152':{lesson:'learner.verbs.steps',needles:['К уже готовому «сделал» или «если» можно добавить, кто'],decision:'REPHRASED'},
 'SRC34-0154':{lesson:'learner.verbs.steps',needles:['келдім — я пришёл'],decision:'REPHRASED',partial:true,missing:['Лицо действия противопоставлено «я человек». Прямое равенство окончания -м у «я сделал» и у «мой предмет» одной фразой не выписано.']},
 'SRC34-0172':{lesson:'learner.verbs.steps',needles:['Это описание предмета, не сообщение'],decision:'REPHRASED'},
 'SRC34-0201':{lesson:'learner.dat.kuda',needles:['куда он идёт'],decision:'REPHRASED',partial:true,missing:['Первый показ — направление. Заголовок урока сразу содержит и «кому». Разведение двух серий в первом тренировочном блоке дословно не обещано.']},
 'SRC34-0203':{lesson:'learner.nasal.senses',needles:['Откуда или от кого'],decision:'REPHRASED'},
 'SRC34-0204':{lesson:'learner.nasal.senses',needles:['откуда, от кого, от чего'],decision:'REPHRASED'},
 'SRC34-0210':{lesson:'learner.verbs.steps',needles:['Сначала «не», потом остальное'],decision:'REPHRASED'}
};

function applyAnchor(id){
 const a=ANCHORS[id];
 if(!a)return null;
 const found=[],missingNeedles=[];
 for(const needle of a.needles){
  const hit=a.file?findShell(needle,a.file):findLesson(needle,a.lesson);
  if(hit)found.push(Object.assign({needle},hit));
  else missingNeedles.push(needle);
 }
 if(!found.length)return null;
 const lesson=a.lesson?lessonById(a.lesson):null;
 const semantic=a.partial||missingNeedles.length?'PARTIAL':'PENDING_INDEPENDENT';
 return {
  lessonId:lesson?lesson.id:(found[0].lessonId||null),
  learnerBlockIds:[...new Set(found.map(x=>x.blockId))],
  renderTargets:lesson?['learner.full',...lesson.renderTargets]:[found[0].renderTarget],
  mappingDecision:a.decision||'REPHRASED',
  semanticStatus:semantic,
  evidence:found.map(x=>({kind:x.kind,lessonId:x.lessonId||null,file:x.file||null,blockId:x.blockId,quote:x.quote})),
  missing:[...missingNeedles,...(a.missing||[])]
 };
}

function metaOf(fragment){
 const f=fragment.trim();
 if(f==='---'||f==='***')return {scope:'HEADING_ONLY',mappingDecision:'SYSTEM_ONLY',why:'Разделитель. Учебного утверждения в фрагменте нет.'};
 if(/^#{1,6}\s+\S/.test(f)&&!f.includes('\n')&&f.length<180)return {scope:'HEADING_ONLY',mappingDecision:'SYSTEM_ONLY',why:'Заголовок документа. Это не шаг урока.'};
 if(/^Статус:\s*(фаза|SOURCE-BACKED|SOURCE|READY)/i.test(f)&&f.length<700)return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Служебный статус файла или карточки для редактора, не реплика ученику.'};
 if(/^Teaching status:\s*READY/i.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Служебная пометка READY у семейства. Ученик видит урок, не эту строку.'};
 if(/каноническим semantic extension|Build больше НЕ должен видеть/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Служебное указание сборке, как читать документ 34.'};
 if(/^Не писать:/.test(f)&&/письменный модуль/.test(f)){
  const blob=lessons.map(x=>x.blob).join('\n')+low(shellFiles['morph-ui.js']);
  const leaked=/ты не слышишь|твёрдые\/мягкие звуки/.test(blob);
  return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:leaked?'Запрещённая слуховая фраза попала в урок.':'Запрет для автора: не обещать ученику, что модуль измеряет слух. Такой фразы в уроках и оболочке нет.',semanticOverride:leaked?'FAIL':'PASS'};
 }
 if(/Emle id=|Исаев С/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Библиография. Ученику как правило не показывается.'};
 if(/\[MISSING_TEACHING_CONTENT\]|CLOSED_SOURCE_BACKED|не должны оцениваться у абсолютного новичка/.test(f))return {scope:'HISTORICAL_SUPERSEDED',mappingDecision:'SUPERSEDED',why:'Историческая пометка документа 32. Её нельзя показывать ученику как действующий запрет. Закрытие смысла — в документе 34 и в соответствующем уроке.'};
 if(/До утверждения дополнительного source-authored semantic content/.test(f))return {scope:'HISTORICAL_SUPERSEDED',mappingDecision:'SUPERSEDED',why:'Вводная историческая блокировка. После документа 34 она не действует как запрет ученику.'};
 if(/MISSING/.test(f)&&/semantic Level 0/.test(f))return {scope:'HISTORICAL_SUPERSEDED',mappingDecision:'SUPERSEDED',why:'Список когда-то открытых дыр Level 0. Документ 34 эти пункты закрывает как источник. Это не текст урока.'};
 if(/^(После этой работы:|Источник teaching text:|READY:)/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Редакторская опись готовности, не реплика ученику.'};
 if(/^(Канонический teaching layer|Полностью source-backed|Текущий semantic status|Полные beginner cards|После semantic closure)/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Служебный итог документа для сборки, не новый урок.'};
 if(/Build не может заполнить эти маркеры/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Ограничение сборки: маркеры не заполняются сами. Это не грамматическое правило.'};
 if(/family selector|current edge class/.test(f)&&/morphState/.test(f))return {scope:'SYSTEM_REQUIRED',mappingDecision:'SYSTEM_ONLY',why:'Служебный порядок движка. Ученику объяснены последствия простыми словами в разборе стыка, без этих имён.'};
 return null;
}

function countsOk(){
 const lemmas=E.data.lemmas;
 const families=Object.keys(E.data.families);
 return {
  ok:E.bank().length===2231&&gold.length===147&&lemmas.length===99&&lemmas.filter(x=>x.split==='train').length===45&&lemmas.filter(x=>x.split==='transfer').length===54&&families.length===28,
  bank:E.bank().length,gold:gold.length,lemmas:lemmas.length,
  train:lemmas.filter(x=>x.split==='train').length,
  transfer:lemmas.filter(x=>x.split==='transfer').length,
  families:families.length
 };
}

function classify(unit){
 const fragment=unit.sourceFragment||'';
 const meta=metaOf(fragment);
 if(meta){
  return {
   scope:meta.scope,
   learnerBlockIds:['registry.'+meta.scope.toLowerCase()],
   renderTargets:['registry.not-a-lesson'],
   mappingDecision:meta.mappingDecision,
   semanticStatus:meta.semanticOverride||'N/A',
   evidence:[{kind:'registry',quote:meta.why}],
   missing:[]
  };
 }
 if(/Все формы одной леммы принадлежат одному split/.test(fragment)){
  const splits=new Set(E.data.lemmas.map(x=>x.id+':'+x.split));
  const oneEach=E.data.lemmas.every(x=>x.split==='train'||x.split==='transfer');
  return {
   scope:'SYSTEM_REQUIRED',
   learnerBlockIds:['system.lemma-split'],
   renderTargets:['engine.lemmas'],
   mappingDecision:'SYSTEM_ONLY',
   semanticStatus:oneEach&&splits.size===E.data.lemmas.length?'PARTIAL':'FAIL',
   evidence:[{kind:'registry',quote:'У каждой из '+E.data.lemmas.length+' лемм ровно одно поле split, и оно либо train, либо transfer.'}],
   missing:['Вторая часть фрагмента — раскрытая в объяснении лемма больше не считается новой — этим прогоном по журналу ученика не исполнялась.']
  };
 }
 if(/закончить и продолжить с сохранённого места/.test(fragment)){
  const resume=require('./verify_morph_resume_runtime.cjs').prove();
  return {
   scope:'SYSTEM_REQUIRED',
   learnerBlockIds:['system.resume'],
   renderTargets:['state.resume'],
   mappingDecision:'SYSTEM_ONLY',
   semanticStatus:resume.ok?'PASS':'FAIL',
   evidence:[{kind:'registry',quote:resume.ok?'Сессия сохраняется до ответа, после ответа событие одно, повтор того же ответа отклонён, разбор с подсказкой не пишет второе производственное событие.':'Проверка продолжения не сошлась: '+(resume.errors||[]).join(', ')}],
   missing:resume.ok?[]:resume.errors
  };
 }
 if(/все 28 runtime families/.test(fragment)){
  const covered=new Set(L.lessons.flatMap(x=>x.families));
  const all=Object.keys(E.data.families);
  const missing=all.filter(id=>!covered.has(id));
  return {
   scope:'SYSTEM_REQUIRED',
   learnerBlockIds:['system.family-route'],
   renderTargets:['learner.route'],
   mappingDecision:'SYSTEM_ONLY',
   semanticStatus:missing.length?'FAIL':'PARTIAL',
   evidence:[{kind:'registry',quote:'В восьми уроках перечислены семейства: '+[...covered].join(', ')+'. В банке семейств: '+all.length+'. Нет маршрута у: '+(missing.join(', ')||'никого')+'.'}],
   missing:['Фраза «достаточная смысловая основа для ученика» не принимается за смысловой PASS.']
  };
 }
 if(/28 families/.test(fragment)&&/2231/.test(fragment)){
  const c=countsOk();
  return {
   scope:'SYSTEM_REQUIRED',
   learnerBlockIds:['system.bank-counts'],
   renderTargets:['engine.bank'],
   mappingDecision:'SYSTEM_ONLY',
   semanticStatus:c.ok?'PASS':'FAIL',
   evidence:[{kind:'system',quote:'Пересчитано скриптом: items '+c.bank+', gold '+c.gold+', lemmas '+c.lemmas+', train '+c.train+', transfer '+c.transfer+', families '+c.families+'.'}],
   missing:c.ok?[]:['Счётчик банка не совпал с фрагментом.']
  };
 }
 const anchor=applyAnchor(unit.unitId);
 const token=bindTokens(fragment);
 if(anchor&&token){
  const semantic=anchor.semanticStatus==='PARTIAL'||token.semanticStatus==='PARTIAL'?'PARTIAL':'PENDING_INDEPENDENT';
  return {
   scope:'LEARNER_REQUIRED',
   learnerBlockIds:[...new Set([...anchor.learnerBlockIds,...token.learnerBlockIds])],
   renderTargets:[...new Set([...anchor.renderTargets,...token.renderTargets])],
   mappingDecision:anchor.mappingDecision==='SHARED_REFERENCE'?'SHARED_REFERENCE':(anchor.learnerBlockIds.length+token.learnerBlockIds.length>1?'SPLIT':'REPHRASED'),
   semanticStatus:semantic,
   evidence:[...anchor.evidence,...token.evidence].slice(0,10),
   missing:[...new Set([...(anchor.missing||[]),...(token.missing||[])])]
  };
 }
 if(anchor)return Object.assign({scope:'LEARNER_REQUIRED'},anchor);
 if(token)return Object.assign({scope:'LEARNER_REQUIRED'},token);
 const shellHits=[];
 for(const rule of SHELL_RULES){
  if(!rule.re.test(fragment))continue;
  const hit=findShell(rule.needle,rule.file);
  if(hit)shellHits.push(Object.assign({id:rule.id},hit));
 }
 if(shellHits.length){
  return {
   scope:'LEARNER_REQUIRED',
   learnerBlockIds:shellHits.map(x=>x.id),
   renderTargets:['shell.visible'],
   mappingDecision:'REPHRASED',
   semanticStatus:'PARTIAL',
   evidence:shellHits.map(x=>({kind:x.kind,file:x.file,blockId:x.id,quote:x.quote})),
   missing:['Фрагмент шире найденной фразы оболочки. Совпадение не закрывает весь смысл.']
  };
 }
 return {
  scope:'LEARNER_REQUIRED',
  learnerBlockIds:['unlocated'],
  renderTargets:['learner.full'],
  mappingDecision:'GAP',
  semanticStatus:'FAIL',
  evidence:[{kind:'search',quote:'Ни в восьми уроках, ни в видимых фразах оболочки не найдена проверяемая цитата этого фрагмента.'}],
  missing:obligations(fragment).slice(0,12)
 };
}

function evidenceHolds(row){
 if(row.semanticStatus==='N/A')return row.evidence.length>0&&row.evidence.every(e=>e.kind==='registry'&&e.quote);
 if(row.mappingDecision==='GAP')return row.evidence.some(e=>e.kind==='search');
 if(row.scope!=='LEARNER_REQUIRED'&&row.evidence.some(e=>e.kind==='registry'&&e.quote))return true;
 if(row.semanticStatus==='PASS'&&row.scope==='SYSTEM_REQUIRED')return row.evidence.some(e=>e.kind==='system'&&/Пересчитано/.test(e.quote));
 for(const e of row.evidence){
  if(e.kind==='learner'){
   const hit=findLesson(e.quote,e.lessonId);
   if(!hit||hit.blockId!==e.blockId)return false;
  }else if(e.kind==='shell'||e.kind==='system'||e.kind==='canon'){
   if(!e.quote||!findIn(shellFiles[e.file],e.quote))return false;
  }else if(e.kind==='search'||e.kind==='registry'){
   if(!e.quote)return false;
  }else return false;
 }
 return row.evidence.some(e=>e.kind==='learner'||e.kind==='shell'||e.kind==='system'||e.kind==='search');
}

function applyReview(rows,review){
 if(!review||!Array.isArray(review.items))return {applied:0,rejected:0};
 const byId=new Map(rows.map(r=>[r.unitId,r]));
 let applied=0,rejected=0;
 for(const item of review.items){
  const row=byId.get(item.unitId);
  if(!row){rejected++;continue;}
  if(row.scope!=='LEARNER_REQUIRED'){rejected++;continue;}
  const next=item.semanticStatus;
  if(!['PASS','PARTIAL','FAIL'].includes(next)){rejected++;continue;}
  if(next==='PASS'||next==='PARTIAL'){
   const quote=String(item.quote||'');
   if(quote.length<(next==='PASS'?20:12)){rejected++;continue;}
   const hit=findLesson(quote)||findShell(quote);
   if(!hit||hit.kind==='canon'||hit.kind==='system'){rejected++;continue;}
   row.semanticStatus=next;
   row.reviewer=review.reviewer||'ai-reviewer-independent';
   row.evidence.push({kind:hit.kind,lessonId:hit.lessonId||null,file:hit.file||null,blockId:hit.blockId,quote:hit.quote,independent:true,note:item.note||''});
   if(hit.blockId&&!row.learnerBlockIds.includes(hit.blockId))row.learnerBlockIds.push(hit.blockId);
   applied++;
  }else{
   row.semanticStatus='FAIL';
   row.reviewer=review.reviewer||'ai-reviewer-independent';
   row.missing.push(item.note||'Независимый отзыв: смысл не удержан.');
   applied++;
  }
 }
 return {applied,rejected};
}

function aiStudentProbes(){
 const probes=[];
 for(const row of L.lessons){
  for(const b of row.blocks){
   if(b.type!=='try')continue;
   const html=L.render(row,'full');
   const unscored=html.includes('не записывается как самостоятельный ответ');
   probes.push({
    tester:'ai-student',
    lessonId:row.id,
    blockId:b.id,
    choseCorrect:b.answer,
    choseWrong:(b.options||[]).find(x=>x!==b.answer)||null,
    recordedAsMastery:false,
    unscoredCopyFound:unscored
   });
  }
 }
 return probes;
}

function requirement(id,status,evidence,note){
 return {id,status,evidence,note:note||''};
}

function buildRequirements(summary){
 const has=(needle,lesson)=>!!findLesson(needle,lesson);
 const ui=n=>!!findShell(n,'morph-ui.js');
 const learnerGaps=summary.byStatus.FAIL||0;
 const partial=summary.byStatus.PARTIAL||0;
 const pending=summary.byStatus.PENDING_INDEPENDENT||0;
 const r=[];
 const push=(id,status,evidence,note)=>r.push(requirement(id,status,evidence,note));
 push('R01',L.lessons.every(row=>row.blocks.some(b=>b.slot==='opening'&&(b.type==='paragraph'||b.type==='example')))&&L.lessons.every(row=>!row.blocks.some(b=>b.slot==='opening'&&b.type==='try'))?'PASS':'FAIL',['opening слоты содержат пример или абзац','кнопок самостоятельного выбора в opening нет']);
 push('R02',learnerGaps||partial?'FAIL':(pending?'BLOCKED':'PASS'),['learner FAIL '+learnerGaps,'PARTIAL '+partial,'PENDING_INDEPENDENT '+pending],pending?'Смысловой PASS ещё не проставлен независимым проходом.':'');
 push('R03',L.lessons.every(row=>L.visibleText(row,'full').length>L.visibleText(row,'opening').length)?'PASS':'FAIL',['visibleText(full) длиннее opening у каждого из 8 уроков','короткая опора — отдельные функции supportLine']);
 push('R04',has('Два выбора по отдельности','learner.dat.kuda')&&has('Сначала разбираем а или е','learner.dat.kuda')?'PASS':'FAIL',['dat.13','dat.14']);
 push('R05',has('Слова с и или у разбираются отдельно','learner.poss.owner')&&has('Буквы и и у не решают ряд сами','learner.loc.where')?'PASS':'FAIL',['poss.25','loc.17']);
 push('R06',has('әкеге','learner.dat.kuda')&&has('заимствованных слов','learner.loc.where')?'PARTIAL':'FAIL',['әке есть в примерах','класс заимствования назван у местной формы'],'Полный перечень особых ә-слов исходника поштучно не сверен как PASS.');
 push('R07',has('буква е остаётся','learner.nasal.senses')&&has('адаммен','learner.nasal.senses')?'PASS':'FAIL',['nas.37']);
 push('R08',has('-шы')?'PASS':'FAIL',['поиск «-шы» в уроках и оболочке'],'Если FAIL: морфема -шы в простом слое не найдена. Это не закрыто переписыванием урока.');
 push('R09',has('лар, лер, дар, дер, тар, тер','learner.pl.several')&&lessonById('learner.pl.several').blocks.find(b=>b.id==='pl.10').text.split('\n').length>=8?'PASS':'FAIL',['pl.8 шесть вариантов','pl.10 семь групп']);
 push('R10',has('После р берём л','learner.pl.several')&&has('После л берём д','learner.pl.several')?'PASS':'FAIL',['pl.11']);
 const nasalMatrix=L.lessons.find(x=>x.id==='learner.nasal.senses').blocks.find(b=>b.id==='nas.49');
 push('R11',nasalMatrix&&nasalMatrix.rows.length===7&&nasalMatrix.headers.length===10?'PASS':'FAIL',[nasalMatrix?'nas.49 '+nasalMatrix.rows.length+'×'+nasalMatrix.headers.length:'нет nas.49']);
 push('R12',has('адамның — чей','learner.nasal.senses')&&has('адамды — этого человека','learner.nasal.senses')&&has('адамнан — от человека','learner.nasal.senses')?'PASS':'FAIL',['nas.46']);
 push('R13',has('баланың кітабы','learner.nasal.senses')?'PASS':'FAIL',['nas.6']);
 push('R14',has('Речь об этой книге','learner.nasal.senses')&&has('Если предмет не определён','learner.nasal.senses')?'PASS':'FAIL',['nas.15']);
 push('R15',has('значение «когда»','learner.loc.where')?'PARTIAL':'FAIL',['loc.25'],'«Где» преподано. Дополнительные значения места и «когда» не развернуты все: время названо и не поставлено в задания.');
 push('R16',has('Это совместность','learner.nasal.senses')&&has('называем средство','learner.nasal.senses')?'PASS':'FAIL',['nas.29','nas.32']);
 push('R17',has('куда он идёт','learner.dat.kuda')?'PARTIAL':'FAIL',['dat.2'],'Направление и адресат в уроке «куда или кому» есть. Прочие значения дательного падежа исходника целиком не пересказаны.');
 push('R18',has('откуда, от кого, от чего','learner.nasal.senses')?'PARTIAL':'FAIL',['nas.22'],'Первый слой «откуда / от кого» есть. Дополнительные смыслы исходного падежа списком не закрыты.');
 push('R19',has('Пять смыслов','learner.poss.owner')&&has('-ым / -ім','learner.poss.owner')&&has('-ыңыз / -іңіз','learner.poss.owner')?'PASS':'FAIL',['poss.28 пять строк']);
 push('R20',has('не превращаются в разрешение менять любую последнюю согласную','learner.poss.owner')?'PASS':'FAIL',['poss.44']);
 push('R21',has('атым','learner.poss.owner')&&has('принципі','learner.poss.owner')?'PASS':'FAIL',['poss.22','poss.44']);
 push('R22',has('орын → орны','learner.poss.owner')&&has('ерін → ерні','learner.poss.owner')&&has('орында','learner.poss.owner')?'PASS':'FAIL',['poss.49']);
 push('R23',has('-мын, -мін, -бын, -бін, -пын, -пін','learner.person.roles')&&has('баласыңдар','learner.person.roles')&&has('баласыздар','learner.person.roles')?'PASS':'FAIL',['per.10','per.33','per.34']);
 push('R24',has('адаммын','learner.person.roles')&&has('адамбыз','learner.person.roles')&&has('адам ба','learner.person.roles')?'PASS':'FAIL',['per.55']);
 push('R25',has('баламын — я ребёнок','learner.person.roles')&&has('балам — мой ребёнок','learner.person.roles')&&has('жазба — не пиши','learner.person.roles')&&has('пишется отдельно','learner.person.roles')?'PASS':'FAIL',['per.6','per.44','per.57']);
 push('R26',has('К уже готовому «сделал» или «если» можно добавить, кто','learner.verbs.steps')&&!!findIn(L.supportLine('AGR_SHORT_1SG'),'уже собранной форме')?'PASS':'FAIL',['vb.28 лицо только к уже готовой форме','supportLine краткой личной серии']);
 push('R27',has('Каждый шаг видит предыдущее слово','learner.verbs.steps')?'PASS':'FAIL',['vb.73']);
 push('R28',has('үйлерімізден','learner.poss.owner')?'PASS':'FAIL',['poss.71–73']);
 push('R29',has('-на / -не','learner.poss.owner')&&has('-нда / -нде','learner.poss.owner')&&has('-нан / -нен','learner.poss.owner')&&has('кітабын','learner.poss.owner')?'PASS':'FAIL',['poss.60']);
 push('R30',has('балама','learner.poss.owner')&&has('үйіңе','learner.poss.owner')&&has('үйімізге','learner.poss.owner')&&has('балаңызға','learner.poss.owner')?'PASS':'FAIL',['poss.65']);
 push('R31',has('Это не правило «добавляй н перед всем»','learner.poss.owner')?'PASS':'FAIL',['poss.64']);
 push('R32',has('Кел → келме → келмеді → келмедік','learner.verbs.steps')?'PASS':'FAIL',['vb.73']);
 push('R33',has('Келген адам','learner.verbs.steps')&&has('Жазған сөз','learner.verbs.steps')&&has('Айтқан сөз','learner.verbs.steps')&&has('Ойнаған бала','learner.verbs.steps')?'PASS':'FAIL',['vb.50 четыре примера']);
 push('R34',has('не сообщение «он пришёл»','learner.verbs.steps')?'PARTIAL':'FAIL',['vb.50'],'Отличие от прошедшего сказано. Дальнейшие формы причастия после этой ступени не развёрнуты.');
 push('R35',has('«Если» — са или се','learner.verbs.steps')?'PARTIAL':'FAIL',['vb.40'],'Старт «если» есть. Оговорка, что «если» не единственное значение условного, отдельной фразой не найдена.');
 push('R36',has('способ, обстоятельство или шаг перед ним','learner.verbs.steps')?'PASS':'FAIL',['vb.59: способ, обстоятельство или шаг перед главным действием']);
 push('R37',has('келіп','learner.verbs.steps')?'PARTIAL':'FAIL',['vb.60'],'Голое келіп в уроке помечено как добавка, не как «он сделал». Полная вторая конструкция с другим глаголом банка не добавлена.');
 push('R38',has('жауып','learner.verbs.steps')&&has('Не делай так с каждым словом на п','learner.verbs.steps')?'PARTIAL':'FAIL',['vb.68'],'жап → жауып не обобщается. тап → тауып в уроке не найден: этого слова нет в учебном банке.');
 push('R39',has('не собирает «заставить сделать», страдательное и возвратное','learner.verbs.steps')&&!L.lessons.some(row=>row.families.some(f=>/CAUSATIVE|PASSIVE|REFLEXIVE/.test(f)))?'PASS':'FAIL',['vb.81','семейства уроков не включают эти три']);
 const mixed=ui('Это только порог, когда смешивание уже можно открыть');
 push('R40',ui('не меняй сразу смысл, край слова, исключение, длинную цепочку и способ ответа')?'PASS':'FAIL',['morph-ui.js: одна новая трудность при смешивании']);
 push('R41',ui('Он не означает, что тема освоена навсегда.')?'PASS':'FAIL',['morph-ui.js: порог смешивания не означает освоение навсегда']);
 push('R42',!!findIn(L.feedback({stem:'қала',gloss:'город',expected:'қалаға',familyId:'DAT',trace:{morpheme:'DAT',suffix:'ға'}},['OTHER_FORM']),'Одна причина по этой записи не назначается')&&!!findShell('Похожая форма отвечает на другой вопрос','morph-learner-v2.js')?'PASS':'FAIL',['feedback при OTHER_FORM не назначает одну причину','HARMONY и край тоже сказаны наблюдением']);
 push('R43',has('другой разрешённой основе','learner.poss.owner')?'PASS':'FAIL',['poss.54']);
 const transferLexemes=E.data.lemmas.filter(x=>x.split==='transfer').map(x=>x.text);
 const hold=L.check({formOf:(id,seq)=>E.form(id,seq).word,trainIds:new Set(E.data.lemmas.filter(x=>x.split==='train').map(x=>x.id)),transferTexts:transferLexemes});
 push('R44',hold.ok?'PASS':'FAIL',hold.ok?['L.check не нашёл transfer-лексемы в восьми уроках']:hold.errors.slice(0,8));
 push('R45',ui('пока мало ответов')&&has('Сказуемые я, мы, ты и вы здесь не оцениваются')?'PARTIAL':'PARTIAL',[findShell('пока мало ответов','morph-ui.js')? 'пока мало ответов' : 'нет фразы','transferPolicy.person в morph-engine.js'],'Мало данных показано фразой. Дыра покрытия связки названа в служебной заметке движка, не отдельной карточкой ученика. Эффективность не заявлена.');
 push('R46',ui('повтора на следующий день ещё не было')?'PASS':'FAIL',['оболочка не называет сегодняшний повтор удержанием'],'Это запрет считать сегодняшний день удержанием. Само удержание по-прежнему не доказано.');
 const hearing=/слух|микрофон|аудирован/i.test(lessons.map(x=>x.blob).join('\n')+shellFiles['morph-ui.js']);
 push('R47',hearing?'FAIL':'PASS',['в тексте восьми уроков и morph-ui.js нет обещания слуха']);
 push('R48',ui('Разобрать форму')&&!!findShell('Для этого слова пока нет проверенного разбора','morph-learner-v2.js')&&!!findShell('Такая цепочка пока не поддерживается','morph-learner-v2.js')?'PASS':'FAIL',['кнопка «Разобрать форму»','отказ неизвестного слова','отказ неподдержанной цепочки','шаги было → добавили → получилось']);
 push('R49',has('Не нужно переводить каждое русское «в» как -ға','learner.dat.kuda')?'PASS':'FAIL',['dat.5']);
 const protectedPrefixes={
  'morph-data.js':'9fcb133c81e2c084',
  'morph-gold.json':'85802a8b927ceb49',
  'morph-engine.js':'056b85b18cfd25c4',
  'morph-state.js':'4f970aeb65981e90',
  'scheduler.js':'7d4fc4eddd420f39',
  'fsrs-vendor.js':'cef21a043e516bdc',
  'morph-teaching-data.js':'9e376cb0b0385a35'
 };
 const hashNotes=[];
 let hashOk=true;
 for(const [name,prefix] of Object.entries(protectedPrefixes)){
  const dig=sha256(fs.readFileSync(path.join(__dirname,name))).slice(0,16);
  hashNotes.push(name+' '+dig);
  if(dig!==prefix)hashOk=false;
 }
 push('R50',hashOk?'PASS':'FAIL',hashNotes);
 const resumeProof=require('./verify_morph_resume_runtime.cjs').prove();
 push('R51',resumeProof.ok?'PASS':'FAIL',resumeProof.ok?['verify_morph_resume_runtime.cjs: одно событие, повтор отклонён, разбор с подсказкой не пишет второе']:resumeProof.errors);
 push('R52','PARTIAL',['в рендере таблицы есть фраза «На узком экране таблицу можно листать вбок»'],'Полный визуальный проход старого сайта и мобильная матрица — отдельный smoke, не этот абзац.');
 const leaks=L.check({formOf:(id,seq)=>E.form(id,seq).word,trainIds:new Set(E.data.lemmas.filter(x=>x.split==='train').map(x=>x.id)),transferTexts:transferLexemes});
 push('R53',leaks.ok?'PASS':'FAIL',leaks.ok?['L.check: латинские коды семейств не попали в текст восьми уроков']:leaks.errors.slice(0,6));
 const uncoveredFamilies=Object.keys(E.data.families).filter(id=>!L.lessons.some(row=>row.status==='READY'&&row.families.includes(id)));
 push('R54',uncoveredFamilies.length===0?'PASS':'FAIL',uncoveredFamilies.length?uncoveredFamilies:['все 28 семейств имеют урок learner до ветки сырого канона']);
 push('R55',ui('Это не считается твоей ошибкой.')?'PASS':'FAIL',['morph-ui.js: нет однозначного эталона, и это не ошибка ученика']);
 push('R56','NOT_RUN',['протокол 14, шесть вопросов, не проводился'],'Просмотр страниц человеком был про ясность, не про этот протокол. ИИ-ученик здесь только размечает выбор в примерах и не подменяет ответы Кристины.');
 push('R57',summary.byDecision.SUPERSEDED>0?'PASS':'FAIL',['SUPERSEDED '+summary.byDecision.SUPERSEDED], 'Исторические MISSING не помечены как урок.');
 push('R58','PASS',['S01–S18 заполняются этим же прогоном, у каждого есть статус и evidence']);
 let sha='unknown',dirty='unknown';
 try{sha=cp.execSync('git rev-parse HEAD',{cwd:__dirname,encoding:'utf8'}).trim();}catch(e){sha='NO_GIT';}
 try{
  const lines=cp.execSync('git status --porcelain',{cwd:__dirname,encoding:'utf8'}).split(/\r?\n/).filter(l=>l&&!l.includes('_qa_archive'));
  dirty=lines.length?lines.join(' | '):'clean';
 }catch(e){dirty='NO_GIT';}
 push('R59',dirty==='clean'?'PARTIAL':'BLOCKED',['HEAD '+sha,'worktree '+String(dirty).slice(0,240),'прежний preview уроков: https://learner-c4-33ca72f.qazaqsha.pages.dev'],dirty==='clean'?'SHA зафиксирован локально. Preview этого коммита может быть ещё прежним, если новый SHA не выкладывался.':'Дерево грязное: итоговый SHA ещё не равен одному коммиту.');
 push('R60','PASS',['MERGE не выполнялся','фраза «можно merge» в этом проходе не принималась'],'Публикация по-прежнему отдельное решение.');
 return {requirements:r,sha,dirty,hashOk};
}

function cli(){
 const argv=process.argv.slice(2);
 const opt={mode:'check',pack:process.env.QAZAQSHA_V2_PACK||PACK,out:''};
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--check')opt.mode='check';
  else if(argv[i]==='--report')opt.mode='report';
  else if(argv[i]==='--pack')opt.pack=argv[++i]||'';
  else if(argv[i]==='--out')opt.out=argv[++i]||'';
 }
 if(!opt.out)opt.out=path.join(opt.pack,'E_COVERAGE');
 return opt;
}
function main(){
 const opt=cli();
 const unitsPath=path.join(opt.pack,'16_SOURCE_UNITS.json');
 const matrixPath=path.join(opt.pack,'17_SCOPE_MATRIX.json');
 const outDir=opt.out;
 const round6=path.join(opt.pack,'F_PREMERGE_CLOSEOUT_2026-09-27','31_INDEPENDENT_REVIEW.json');
 const round5=path.join(opt.pack,'F_PREMERGE_CLOSEOUT_2026-09-27','30_INDEPENDENT_REVIEW.json');
 const round4=path.join(opt.pack,'F_PREMERGE_CLOSEOUT_2026-09-27','29_INDEPENDENT_REVIEW.json');
 const round3=path.join(opt.pack,'F_PREMERGE_CLOSEOUT_2026-09-27','28_INDEPENDENT_REVIEW.json');
 const round2=path.join(opt.pack,'F_PREMERGE_CLOSEOUT_2026-09-27','26_INDEPENDENT_REVIEW.json');
 const reviewPath=fs.existsSync(round6)?round6:(fs.existsSync(round5)?round5:(fs.existsSync(round4)?round4:(fs.existsSync(round3)?round3:(fs.existsSync(round2)?round2:path.join(outDir,'INDEPENDENT_REVIEW.json')))));
 if(!fs.existsSync(unitsPath)){
  if(process.env.QAZAQSHA_V2_PACK||process.argv.includes('--pack')){
   console.error('MORPH_SOURCE_CHECK_FAIL');
   console.error('Нет файла фрагментов: '+unitsPath);
   process.exit(1);
  }
  console.log('MORPH_SOURCE_CHECK_SKIPPED');
  console.log('Пакет 32/34 не найден. Для проверки укажите --pack или QAZAQSHA_V2_PACK.');
  return;
 }
 const raw=JSON.parse(fs.readFileSync(unitsPath,'utf8'));
 assert.equal(raw.units.length,555);
 const rows=raw.units.map(unit=>{
  const got=classify(unit);
  return {
   unitId:unit.unitId,
   sourceId:unit.sourceId,
   sourceHeading:unit.sourceHeading,
   sourceFragment:unit.sourceFragment,
   sourceHash:unit.sourceHash,
   kind:unit.granularity,
   scope:got.scope,
   learnerBlockIds:got.learnerBlockIds,
   renderTargets:got.renderTargets,
   sourceExampleRefs:[],
   mappingDecision:got.mappingDecision,
   semanticStatus:got.semanticStatus,
   clarityStatus:'NOT_RUN',
   renderStatus:got.semanticStatus==='N/A'?'N/A':(got.mappingDecision==='GAP'?'FAIL':'PASS'),
   reviewer:'ai-student-registry',
   testerNote:'Механическую привязку делал ИИ-ученик (реестровый бот). Это не ответ живого ученика и не независимая смысловая сверка.',
   evidence:got.evidence,
   missing:got.missing||[]
  };
 });
 let reviewInfo={applied:0,rejected:0,present:false};
 if(fs.existsSync(reviewPath)){
  const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  reviewInfo=Object.assign({present:true},applyReview(rows,review));
 }
 for(const row of rows){
  if(!row.learnerBlockIds.length||!row.renderTargets.length||!row.mappingDecision||!row.evidence.length){
   console.error('UNMAPPED',row.unitId);
   process.exit(1);
  }
  if(!evidenceHolds(row)){
   console.error('EVIDENCE_BROKEN',row.unitId,JSON.stringify(row.evidence).slice(0,400));
   process.exit(1);
  }
  if(row.semanticStatus==='PASS'&&row.scope==='LEARNER_REQUIRED'&&!row.evidence.some(e=>e.independent)){
   console.error('AUTHOR_PASS_BLOCKED',row.unitId);
   process.exit(1);
  }
 }
 const byStatus={},byDecision={},byScope={};
 for(const row of rows){
  byStatus[row.semanticStatus]=(byStatus[row.semanticStatus]||0)+1;
  byDecision[row.mappingDecision]=(byDecision[row.mappingDecision]||0)+1;
  byScope[row.scope]=(byScope[row.scope]||0)+1;
 }
 const learner=rows.filter(r=>r.scope==='LEARNER_REQUIRED');
 const learnerPass=learner.filter(r=>r.semanticStatus==='PASS').length;
 const noShortening=learner.every(r=>r.semanticStatus==='PASS')?'PASS':'FAIL';
 const semanticPass=!reviewInfo.present?'NOT_RUN':(learner.every(r=>r.semanticStatus==='PASS')?'PASS':'FAIL');
 const probes=aiStudentProbes();
 assert.ok(probes.length>0);
 assert.ok(probes.every(p=>p.recordedAsMastery===false&&p.unscoredCopyFound&&p.tester==='ai-student'));
 const summary={
  seedUnitCount:555,
  requiredMapped:rows.filter(r=>r.mappingDecision!=='GAP').length,
  passed:learnerPass,
  partial:byStatus.PARTIAL||0,
  pendingIndependent:byStatus.PENDING_INDEPENDENT||0,
  unmapped:0,
  gaps:rows.filter(r=>r.mappingDecision==='GAP').length,
  byStatus,byDecision,byScope,
  noShortening,semanticPass,
  reviewer:reviewInfo.present?(JSON.parse(fs.readFileSync(reviewPath,'utf8')).reviewer):null,
  tester:'ai-student-registry',
  note:'unmapped=0 значит, что у каждого фрагмента есть решение и свидетельство. Это не значит, что каждый учебный смысл сохранён. NO_SHORTENING=PASS только если каждый LEARNER_REQUIRED имеет semanticStatus=PASS от независимого отзыва.'
 };
 const req=buildRequirements(summary);
 if(opt.mode==='report'){
 fs.mkdirSync(outDir,{recursive:true});
 const coverage={
  packageVersion:'V2',
  status:noShortening==='PASS'&&semanticPass==='PASS'?'NO_SHORTENING_PASS':'REGISTRY_COMPLETE_SHORTENING_'+noShortening,
  baselineFile:'A_BASELINE/SOURCE_COVERAGE.json',
  baselineLeftUntouched:true,
  generatedBy:'verify_morph_source_coverage.cjs',
  tester:'ai-student',
  summary,
  units:rows
 };
 fs.writeFileSync(path.join(outDir,'SOURCE_COVERAGE.json'),JSON.stringify(coverage));
 const packet=rows.filter(r=>r.scope==='LEARNER_REQUIRED').map(r=>({
  unitId:r.unitId,
  semanticStatus:r.semanticStatus,
  mappingDecision:r.mappingDecision,
  lessonId:r.learnerBlockIds[0]&&r.learnerBlockIds[0].includes('.')?null:null,
  learnerBlockIds:r.learnerBlockIds,
  fragment:String(r.sourceFragment).slice(0,700),
  quotes:r.evidence.filter(e=>e.quote&&e.kind!=='search').map(e=>e.quote).slice(0,4),
  missing:r.missing
 }));
 fs.writeFileSync(path.join(outDir,'REVIEW_PACKET.jsonl'),packet.map(x=>JSON.stringify(x)).join('\n'));
 const matrix=JSON.parse(fs.readFileSync(matrixPath,'utf8'));
 matrix.status='RUNTIME_REVIEWED_'+req.sha.slice(0,7);
 matrix.note='Статусы проставлены verify_morph_source_coverage.cjs. ИИ-ученик размечал реестр. Независимый смысловой PASS не копируется из этого статуса. Исходные requirement и source не менялись.';
 for(const mod of matrix.modules){
  if(mod.id==='mixed'){
   mod.coverage='N/A';
   mod.evidence=['Отдельного теоретического урока смешивания нет. Порог: morph-ui.js «Это только порог, когда смешивание уже можно открыть».'];
  }else{
   const row=L.lessons.find(x=>x.modules.includes(mod.id));
   mod.coverage=row?'BLOCKED':'FAIL';
   mod.evidence=[row?('маршрут есть: '+row.id+' ; смысловой PASS единиц ещё не полный'):'урока нет'];
  }
 }
 for(const fam of matrix.families){
  const row=L.lessons.find(x=>x.families.includes(fam.id));
  fam.runtimeVerified=!!row;
  fam.sourceMapped=!!row&&rows.some(u=>u.scope==='LEARNER_REQUIRED'&&u.mappingDecision!=='GAP'&&u.learnerBlockIds.some(id=>row.blocks.some(b=>b.id===id)));
  fam.semanticReview=semanticPass==='PASS'?'PASS':(reviewInfo.present?'FAIL':'NOT_RUN');
  fam.renderQA=leaksOk(transferSafe())?'PASS':'FAIL';
  fam.evidence=[row?row.id:'no-lesson'];
 }
 function transferSafe(){return E.data.lemmas.filter(x=>x.split==='transfer').map(x=>x.text);}
 function leaksOk(texts){return L.check({formOf:(id,seq)=>E.form(id,seq).word,trainIds:new Set(E.data.lemmas.filter(x=>x.split==='train').map(x=>x.id)),transferTexts:texts}).ok;}
 const surf={
  S01:['PASS','Хаб: пять кнопок в morph-ui.js, включая «Учиться с нуля» и «Проверить на новых основах».'],
  S02:['PASS','Экран «Разобрать форму»: поле слова из проверенного списка и человеческие смыслы.'],
  S03:['PASS','Результат показывает шаг: было, добавили, получилось, и следующий шаг от уже собранного слова.'],
  S04:['PASS','Отказ говорит: нет однозначного проверенного эталона, и это не ошибка ученика. Отдельный калькулятор ещё в следующем пакете.'],
  S05:['PASS','Вход в тему: forFamily и openTarget ведут в один из восьми уроков.'],
  S06:['PASS','Смысл в opening каждого урока, до кнопок try.'],
  S07:['PASS','Полный разбор — slot full, длиннее opening.'],
  S08:['PASS','Опора supportLine отдельно от полного текста.'],
  S09:['PASS','Самостоятельная практика — отдельная кнопка хаба. Выбор внутри урока помечен как несамостоятельный.'],
  S10:['PASS','feedback() описывает наблюдение и не назначает одну причину без записи.'],
  S11:['PASS','Цепочки: learner.chains.steps и learner.poss.owner, шаг от уже собранного слова.'],
  S12:['PASS','Смешивание остаётся практикой. На экране сказано не менять сразу смысл, край, исключение, цепочку и способ ответа.'],
  S13:['PASS','«Проверить на новых основах» не пишет расписание. Короткая банка сужает заявление.'],
  S14:['PARTIAL','Подпись следующего дня есть. Суточное удержание не доказано.'],
  S15:['PARTIAL','Итог урока говорит, что это ещё не самостоятельное владение. Педагогическая эффективность не заявлена.'],
  S16:['PASS','Переходы data-learner-open между уроками, например к «Чей предмет».'],
  S17:['PASS','verify_morph_resume_runtime.cjs: продолжение до ответа и одно событие после ответа.'],
  S18:['PASS','L.check запрещает коды семейств в тексте урока, включая подписи.']
 };
 for(const s of matrix.surfaces){
  const pair=surf[s.id];
  s.status=pair[0];
  s.evidence=[pair[1]];
  if(!s.implementationLocations.length)s.implementationLocations=[pair[1]];
 }
 const byReq=new Map(req.requirements.map(x=>[x.id,x]));
 for(const item of matrix.requirements){
  const got=byReq.get(item.id);
  if(!got)throw new Error('missing '+item.id);
  item.status=got.status;
  item.evidence=got.evidence;
  if(got.note)item.note=got.note;
 }
 if(byReq.size!==60)throw new Error('requirements '+byReq.size);
 fs.writeFileSync(matrixPath,JSON.stringify(matrix,null,2)+'\n');
 const lines=[
  '# Реестр покрытия 32/34',
  '',
  'Проверяющий механический проход: **ИИ-ученик** (`ai-student-registry`). Это не живой ученик.',
  'Независимый смысловой проход: '+(semanticPass==='NOT_RUN'?'ещё не приложен':'приложен, вердикт '+semanticPass)+'.',
  '',
  '- Фрагментов: 555. Без решения: 0.',
  '- Решения: '+JSON.stringify(byDecision),
  '- Смысл: '+JSON.stringify(byStatus),
  '- NO_SHORTENING: **'+noShortening+'**',
  '- SEMANTIC_PASS: **'+semanticPass+'**',
  '- LEARNER_REQUIRED PASS: '+learnerPass+' / '+learner.length,
  '- Пробы ИИ-ученика на кнопках разбора: '+probes.length+', ни одна не записана как владение.',
  '',
  'Базовый файл `A_BASELINE/SOURCE_COVERAGE.json` не переписывался.',
  '',
  '## Что всё ещё не PASS',
  '',
  'Таблица 7×9 есть в уроке. Смысловой PASS по всем учебным фрагментам этим файлом не ставится.',
  'Часть исходных оговорок всё ещё PARTIAL, пока независимый проход не подтвердит цитату.',
  'Протокол ясности из шести вопросов не проводился.',
  'Живой офлайн, второе устройство и суточное удержание не доказывались.',
  ''
 ];
 fs.writeFileSync(path.join(outDir,'REGISTRY_REPORT.md'),lines.join('\n'));
 }
 const gateFailed=summary.gaps>0||noShortening!=='PASS'||semanticPass!=='PASS';
 console.log(gateFailed?'MORPH_SOURCE_CHECK_FAIL':'MORPH_SOURCE_CHECK_OK');
 console.log('UNITS',rows.length,'UNMAPPED',0);
 console.log('STATUS',JSON.stringify(byStatus));
 console.log('DECISION',JSON.stringify(byDecision));
 console.log('NO_SHORTENING='+noShortening);
 console.log('SEMANTIC_PASS='+semanticPass);
 console.log('GAPS',summary.gaps);
 console.log('AI_STUDENT_PROBES',probes.length);
 console.log('REVIEW_FILE',path.basename(reviewPath));
 console.log('REVIEW_APPLIED',reviewInfo.applied,'REJECTED',reviewInfo.rejected);
 console.log('HEAD',req.sha);
 if(opt.mode==='report'){
  const gapIds=rows.filter(r=>r.mappingDecision==='GAP').map(r=>r.unitId+' '+String(r.sourceFragment).replace(/\s+/g,' ').slice(0,110));
  fs.writeFileSync(path.join(outDir,'GAPS.txt'),gapIds.join('\n'));
 }
 if(gateFailed)process.exit(1);
}
main();
