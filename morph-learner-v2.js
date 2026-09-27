(function(root){
'use strict';
const VERSION='learner-ru-v2-b';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS={
 PL:'несколько',
 DAT:'куда или кому',
 LOC:'где',
 ABL:'откуда',
 POSS_1SG:'мой, моя',
 POSS_2SG:'твой, твоя',
 POSS_1PL:'наш, наша',
 POSS_2POL:'ваш, ваша',
 POSS_3:'его или её'
};
function label(id){return LABELS[id]||null;}
function lesson(id){return LESSONS.find(x=>x.id===id)||null;}
function forFamily(moduleId,familyId){
 const row=LESSONS.find(x=>x.status==='READY'&&x.modules.includes(moduleId)&&x.families.includes(familyId));
 return row||null;
}
function lessonTarget(id){
 const row=lesson(id);if(!row)return null;
 return {lessonId:row.id,moduleId:row.home.moduleId,familyId:row.home.familyId};
}
function openTarget(item){
 if(!item)return null;
 const seq=Array.isArray(item.sequence)?item.sequence:[];
 const id=item.morpheme||item.familyId||seq.at(-1);
 if(seq.some(x=>String(x).startsWith('POSS_'))||String(id||'').startsWith('POSS_'))return lessonTarget('learner.poss.owner');
 if(seq.includes('DAT')||id==='DAT')return lessonTarget('learner.dat.kuda');
 return null;
}
function operation(item){
 if(!item)return null;
 const step=item.morpheme||item.familyId;
 if(step&&label(step))return label(step);
 const seq=Array.isArray(item.sequence)?item.sequence:[];
 if(seq.length&&seq.every(label))return seq.map(label).join(' → ');
 return null;
}
function supportLine(id){
 if(id==='DAT')return 'Сначала реши: куда или кому. Потом подбери конец слова. Это опора, не самостоятельный ответ.';
 if(String(id||'').startsWith('POSS_'))return 'Сначала реши, чей это предмет. Потом посмотри на конец слова. Это опора, не самостоятельный ответ.';
 return null;
}
function traceOf(item){
 const trace=item&&item.trace;
 if(Array.isArray(trace))return trace.at(-1)||null;
 return trace&&typeof trace==='object'?trace:null;
}
function feedback(item,codes){
 const step=traceOf(item);if(!step)return null;
 const id=step.morpheme||item.familyId||item.morpheme;
 if(id!=='DAT'&&!String(id||'').startsWith('POSS_'))return null;
 const name=label(id)||'это значение';
 const bits=['Для значения «'+name+'» у слова '+item.stem+' («'+item.gloss+'») здесь получается '+item.expected+'.'];
 if(step.changed&&step.before&&step.stem)bits.push('Перед добавкой слово меняется: '+step.before+' → '+step.stem+'.');
 if(step.suffix)bits.push('Добавленная часть: -'+step.suffix+'.');
 const list=codes||[];
 if(list.includes('HARMONY'))bits.push('Буква а/е или ы/і в добавке не совпала с этим словом.');
 if(list.includes('ONSET_CLASS'))bits.push('Первая буква добавки не подходит к концу этого слова.');
 if(list.includes('MORPH_STATE'))bits.push('Форма уже показывает, чья это вещь. Здесь не обычное окончание от первого слова.');
 if(list.includes('OTHER_FORM'))bits.push('Ответ не совпал с нужной формой. Одна причина по этой записи не назначается.');
 return bits.join(' ');
}
function chainNote(view,codes){
 if(!view)return null;
 const id=view.morpheme;
 if(!label(id))return null;
 const list=codes||[];
 if(list.includes('MORPH_STATE'))return 'Здесь уже есть форма «мой», «твой» или «его/её». Окончание берётся от этой готовой формы, а не заново от первого слова.';
 if(list.includes('MORPHEME_BOUNDARY'))return 'Ошибка на этом шаге. Сначала восстанови форму предыдущего шага и продолжай от неё.';
 if(list.includes('STEM_CHANGE')||view.changed)return 'Перед этим шагом у слова записанное изменение: '+view.before+' → '+view.stem+'. Дальше работаем уже с '+view.stem+'.';
 return 'Сейчас нужно сказать «'+label(id)+'». Получается '+view.after+'. Добавили -'+view.suffix+'.';
}
function renderTry(b){
 const buttons=b.options.map(o=>'<button type="button" class="secondary-button" lang="kk" data-learner-try="'+esc(o)+'" data-learner-ok="'+esc(b.answer)+'" data-learner-good="'+esc(b.good)+'" data-learner-bad="'+esc(b.bad)+'">'+esc(o)+'</button>').join('');
 return '<div class="morph-learner-trybox"><p>'+esc(b.prompt)+'</p><div class="morph-choices">'+buttons+'</div><p data-learner-note role="status"></p><p class="small">Этот выбор только разбирает пример. Он не записывается как самостоятельный ответ.</p></div>';
}
function renderBlock(b){
 if(b.type==='subheading')return '<h3>'+esc(b.text)+'</h3>';
 if(b.type==='paragraph')return '<p>'+esc(b.text)+'</p>';
 if(b.type==='list')return '<ul class="morph-teach-list">'+b.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
 if(b.type==='ordered-list')return '<ol class="morph-teach-list">'+b.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
 if(b.type==='warning')return '<div class="morph-rule"><p>'+esc(b.text)+'</p></div>';
 if(b.type==='term')return '<p class="small">'+esc(b.text)+'</p>';
 if(b.type==='example')return '<p><span lang="kk">'+esc(b.before)+'</span> — '+esc(b.beforeRu)+(b.added?' → добавили '+esc(b.added):'')+' → <span lang="kk">'+esc(b.after)+'</span> — '+esc(b.afterRu)+'</p>';
 if(b.type==='contrast')return '<p>'+esc(b.text)+'</p>';
 if(b.type==='link')return '<p><button type="button" class="text-button" data-learner-open="'+esc(b.lessonId)+'">'+esc(b.text)+'</button></p>';
 if(b.type==='try')return renderTry(b);
 if(b.type==='table'){
  const head='<tr>'+b.headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr>';
  const body=b.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('');
  return '<div class="morph-matrix morph-learner-table" role="region" aria-label="'+esc(b.caption||'Таблица')+'"><p>'+esc(b.caption||'')+'</p><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table><p class="small">На узком экране таблицу можно листать вбок.</p></div>';
 }
 return '';
}
function render(row,mode){
 const blocks=(row.blocks||[]).filter(b=>mode==='full'||b.slot===mode||(mode==='opening'&&b.slot==='opening')||(mode==='contrast'&&b.slot==='contrast'));
 const body=blocks.map(renderBlock).join('')||'<p role="status">'+esc(unavailable())+'</p>';
 return '<p class="eyebrow">ПРОСТОЙ РАЗБОР</p><h2>'+esc(row.title)+'</h2>'+body;
}
function unavailable(){return 'Этот разбор временно недоступен. Можно вернуться к разделу. Уже введённый ответ сохранён.';}
function visibleText(row,mode){
 return render(row,mode).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
const TYPES=new Set(['paragraph','subheading','list','ordered-list','example','contrast','table','warning','term','link','try']);
function check(opts){
 const errors=[],formOf=opts&&opts.formOf,trainIds=opts&&opts.trainIds,transferTexts=opts&&opts.transferTexts||[],rows=opts&&opts.lessons||LESSONS;
 const seen=new Set();
 if(!opts||!opts.lessons){if(rows.length!==2)errors.push('expected two ready lessons');}
 for(const row of rows){
  if(row.status!=='READY')errors.push(row.id+' not ready');
  if(seen.has(row.id))errors.push('duplicate '+row.id);seen.add(row.id);
  if(!row.blocks||!row.blocks.length)errors.push(row.id+' empty');
  const ids=new Set();
  for(const b of row.blocks||[]){
   if(!TYPES.has(b.type))errors.push(row.id+' bad type '+b.type);
   if(!b.id||ids.has(b.id))errors.push(row.id+' bad block id '+b.id);else ids.add(b.id);
   if(b.type==='example'){
    if(!trainIds||!trainIds.has(b.lemmaId))errors.push(b.id+' lemma not train '+b.lemmaId);
    if(formOf&&formOf(b.lemmaId,b.sequence)!==b.after)errors.push(b.id+' form mismatch '+b.after);
   }
   if(b.type==='try'&&(!b.answer||!b.options.includes(b.answer)))errors.push(b.id+' try answer');
  }
  for(const id of row.requiredBlockIds||[])if(!ids.has(id))errors.push(row.id+' missing '+id);
  const full=visibleText(row,'full'),opening=visibleText(row,'opening');
  if(full.length<=opening.length)errors.push(row.id+' full is not longer than opening');
  const blob=[render(row,'full'),render(row,'opening'),render(row,'contrast')].join('\n');
  if(/редактор добавит|TODO|PLACEHOLDER|потом объясним|дальше редактор/i.test(blob))errors.push(row.id+' placeholder');
  if(/\b(DAT|LOC|ABL|ACC|GEN|INS|PL|NEG|PAST|COND|POSS_\w*|COP_\w*|PTCP_\w*|CVB_\w*|AGR_SHORT_\w*|morphState|currentForm|currentEdge|holdout|FSRS)\b/.test(blob))errors.push(row.id+' code leak');
  const tokens=new Set(blob.toLocaleLowerCase('kk').match(/[а-яәіңғүұқөһ]+/giu)||[]);
  for(const word of transferTexts)if(tokens.has(String(word).toLocaleLowerCase('kk')))errors.push(row.id+' transfer lexeme '+word);
 }
 return {ok:errors.length===0,errors};
}
const datBlocks=[
 {id:'dat.1',slot:'opening',type:'subheading',text:'Что скажем'},
 {id:'dat.2',slot:'opening',type:'paragraph',text:'Представь: человек ещё дома и собирается в город. Мы хотим сказать, куда он идёт.'},
 {id:'dat.3',slot:'opening',type:'example',lemmaId:'n-қала',sequence:['DAT'],before:'қала',beforeRu:'город',added:'-ға',after:'қалаға',afterRu:'в город'},
 {id:'dat.4',slot:'opening',type:'paragraph',text:'В русском «город» превратился в «в город»: появилось отдельное слово «в». В казахском к қала добавили -ға. Получилось қалаға.'},
 {id:'dat.5',slot:'opening',type:'warning',text:'Это сравнение для нашей ситуации. Не нужно переводить каждое русское «в» как -ға: дальше увидим другие случаи.'},
 {id:'dat.6',slot:'opening',type:'subheading',text:'Посмотрим ещё'},
 {id:'dat.7',slot:'opening',type:'table',caption:'Три примера на вопрос «куда?»',headers:['Было','Что добавили','Получилось','По-русски'],rows:[['қала — город','-ға','қалаға','в город'],['үй — дом','-ге','үйге','домой, к дому — когда идут к дому'],['мектеп — школа','-ке','мектепке','в школу']]},
 {id:'dat.8',slot:'opening',type:'paragraph',text:'Все три формы сейчас отвечают на вопрос «куда?». Добавленная часть отличается. Сейчас разберём, как её выбрать. Заучивать всю таблицу сразу не требуется.'},
 {id:'dat.9',slot:'opening',type:'subheading',text:'Сначала различим «куда» и «где»'},
 {id:'dat.10',slot:'opening',type:'paragraph',text:'Человек только идёт в школу: «куда?» — мектепке. Человек уже находится в школе: «где?» — мектепте.'},
 {id:'dat.11',slot:'opening',type:'paragraph',text:'Сравни русский: «в школу» и «в школе». Слово «в» одинаковое, но смысл отличается. В казахском различие тоже видно в конце: мектепке и мектепте.'},
 {id:'dat.12',slot:'opening',type:'paragraph',text:'Вопрос: человек едет в город. Мы сообщаем, где он уже находится или куда едет? Ответ: куда едет. Если выбрано «где»: сейчас важно место, к которому он движется. Поэтому спрашиваем «куда?». «Где?» спросили бы о месте, в котором он находится.'},
 {id:'dat.13',slot:'full',type:'subheading',text:'Два выбора по отдельности'},
 {id:'dat.14',slot:'full',type:'paragraph',text:'Для обычных слов в этих примерах используются -ға, -ге, -қа, -ке. Сначала разбираем а или е. Затем — первую букву добавки. У слов, уже означающих «мой» или «его предмет», бывают особые продолжения. К ним нельзя без проверки применять только эти четыре варианта.'},
 {id:'dat.15',slot:'full',type:'link',lessonId:'learner.poss.owner',text:'Открыть разбор «Чей предмет»'},
 {id:'dat.16',slot:'full',type:'subheading',text:'А или е'},
 {id:'dat.17',slot:'full',type:'paragraph',text:'Посмотри на гласные буквы в выбранных простых словах. Гласные — например а, о, ы, е. Для этой группы учебных слов ориентир такой: а, о, ұ, ы → в добавке выбираем а. ә, ө, ү, і, е → в добавке выбираем е.'},
 {id:'dat.18',slot:'full',type:'example',lemmaId:'n-қала',sequence:['DAT'],before:'қала',beforeRu:'город',added:'-ға',after:'қалаға',afterRu:'в город'},
 {id:'dat.19',slot:'full',type:'example',lemmaId:'n-үй',sequence:['DAT'],before:'үй',beforeRu:'дом',added:'-ге',after:'үйге',afterRu:'к дому'},
 {id:'dat.20',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['DAT'],before:'мектеп',beforeRu:'школа',added:'-ке',after:'мектепке',afterRu:'в школу'},
 {id:'dat.21',slot:'full',type:'warning',text:'Это наблюдение работает в выбранных регулярных словах. Его нельзя превращать в правило «ищи любую такую букву в любом слове». Буквы и и у, некоторые заимствованные слова и некоторые слова с ә требуют отдельного разбора. Для них тренажёр показывает уже проверенный вариант, а не просит угадать. В этом наборе су — вода даёт суға, тау — гора даёт тауға: класс этих двух слов уже записан. Другие слова на и или у по одной последней букве не угадываем.'},
 {id:'dat.22',slot:'full',type:'subheading',text:'Почему ғ/г или қ/к'},
 {id:'dat.23',slot:'full',type:'paragraph',text:'Теперь смотрим, как заканчивается обычное слово. Сравним два случая с а.'},
 {id:'dat.24',slot:'full',type:'example',lemmaId:'n-бала',sequence:['DAT'],before:'бала',beforeRu:'ребёнок',added:'-ға',after:'балаға',afterRu:'ребёнку'},
 {id:'dat.25',slot:'full',type:'example',lemmaId:'n-ат',sequence:['DAT'],before:'ат',beforeRu:'имя',added:'-қа',after:'атқа',afterRu:'имени, к имени'},
 {id:'dat.26',slot:'full',type:'paragraph',text:'Конец а: выбираем -ға. Конец т: выбираем -қа. В карточке этого тренажёра ат значит «имя», поэтому атқа — «имени, к имени».'},
 {id:'dat.27',slot:'full',type:'paragraph',text:'Два случая с е: үй заканчивается на й, поэтому үйге. мектеп заканчивается на п, поэтому мектепке.'},
 {id:'dat.28',slot:'full',type:'table',caption:'В обычных словах этого набора первая буква қ или к выбирается после этих концов',headers:['Конец слова','Пример','Добавка','Получилось'],rows:[['п','мектеп — школа','-ке','мектепке'],['к','көлік — транспорт','-ке','көлікке'],['қ','қонақ — гость','-қа','қонаққа'],['т','ат — имя','-қа','атқа'],['с','дос — друг','-қа','досқа']]},
 {id:'dat.29',slot:'full',type:'paragraph',text:'У других глухих концов обычных слов этой группы действует тот же принцип. В обычных неглухих случаях выбираем вариант с ғ или г. Буквы б, в, г, д в обычных примерах этого урока так не работают: у части заимствованных слов это отдельный записанный класс. Не нужно угадывать неизвестное слово по последней букве.'},
 {id:'dat.30',slot:'full',type:'paragraph',text:'Так для мектеп получаем: в слове е → нужен вариант с е; в конце п → нужен вариант с к; вместе -ке; мектепке.'},
 {id:'dat.31',slot:'full',type:'subheading',text:'Сделаем вместе'},
 {id:'dat.32',slot:'full',type:'paragraph',text:'мектеп — школа. Нужно сказать «в школу», человек туда идёт. 1. Вопрос «куда?». 2. Работаем со словом мектеп. 3. В слове е: выбираем е. 4. В конце п: из нужных вариантов берём -ке. 5. Прибавляем: мектеп + ке → мектепке.'},
 {id:'dat.33',slot:'full',type:'try',prompt:'Попробуй выбрать форму для «в школу».',options:['мектепте','мектепке'],answer:'мектепке',good:'мектепке — в школу.',bad:'мектепте означает «в школе». Сейчас нужно «в школу». Поэтому мектепке.'},
 {id:'dat.34',slot:'full',type:'try',prompt:'қала — город. Человек едет в город. Выбери форму.',options:['қалада','қалаға'],answer:'қалаға',good:'қалаға — в город. В қала гласные а, конец а; для этого обычного слова добавляем -ға.',bad:'қалада — в городе, а қалаға — в город.'},
 {id:'dat.35',slot:'full',type:'paragraph',text:'Дальше тренажёр попросит выбрать и написать форму уже на другом разрешённом учебном слове. Повтор этой же формы после готового ответа не считается новым самостоятельным успехом.'},
 {id:'dat.36',slot:'full',type:'subheading',text:'Та же форма: «кому?»'},
 {id:'dat.37',slot:'full',type:'paragraph',text:'Теперь другая ситуация: книгу дают ребёнку. Никто не обязан идти в другое место. Вопрос здесь «кому дают?».'},
 {id:'dat.38',slot:'full',type:'example',lemmaId:'n-бала',sequence:['DAT'],before:'бала',beforeRu:'ребёнок',added:'-ға',after:'балаға',afterRu:'ребёнку'},
 {id:'dat.39',slot:'full',type:'paragraph',text:'Мен балаға кітап бердім. — Я дал(а) ребёнку книгу. Пока не нужно разбирать все слова этого предложения: оно показывает ситуацию. Важно балаға — ребёнку. Та же группа добавок используется в наших примерах и для «куда?», и для «кому?». Сначала учимся различать эти значения на отдельных ситуациях, затем выбираем форму.'},
 {id:'dat.40',slot:'full',type:'paragraph',text:'Проверка: «Книгу дали ребёнку». Что сообщает балаға: кому дали или кто дал? Ответ: кому дали.'},
 {id:'dat.41',slot:'contrast',type:'subheading',text:'Полезное сравнение'},
 {id:'dat.42',slot:'contrast',type:'table',caption:'Сначала смысл, потом конец слова',headers:['Вопрос','Форма','Смысл'],rows:[['Куда?','қалаға','в город'],['Где?','қалада','в городе'],['Откуда?','қаладан','из города']]},
 {id:'dat.43',slot:'contrast',type:'example',lemmaId:'n-қала',sequence:['LOC'],before:'қала',beforeRu:'город',added:'-да',after:'қалада',afterRu:'в городе'},
 {id:'dat.44',slot:'contrast',type:'example',lemmaId:'n-қала',sequence:['ABL'],before:'қала',beforeRu:'город',added:'-дан',after:'қаладан',afterRu:'из города'},
 {id:'dat.45',slot:'contrast',type:'warning',text:'Похожее написание не означает одинаковый смысл.'},
 {id:'dat.46',slot:'full',type:'subheading',text:'Когда нужен другой разбор'},
 {id:'dat.47',slot:'full',type:'paragraph',text:'Если слово уже означает «его или её книга», получаем кітабы. Продолжение «к его или её книге» — кітабына. Здесь добавили -на, а не обычное -ға. После форм со смыслом «мой» и «твой» тоже есть особые продолжения. Они разобраны в теме «Чей предмет», а не отменяются этой короткой таблицей.'},
 {id:'dat.48',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','DAT'],before:'кітап',beforeRu:'книга',added:'-на после кітабы',after:'кітабына',afterRu:'к его или её книге'},
 {id:'dat.49',slot:'full',type:'warning',text:'Не все значения этих форм исчерпываются движением. Есть и другие употребления, включая цель. Этот урок подробно вводит два начальных смысла: «куда?» и «кому?». Он не заменяет весь разбор соседних вопросов.'},
 {id:'dat.50',slot:'full',type:'warning',text:'Отдельная граница: «с кем-то или с помощью» у слова адам — адаммен. Буква е здесь остаётся. Не делай из неё адамман по похожести на а/е в других окончаниях.'},
 {id:'dat.51',slot:'full',type:'term',text:'В учебниках эта группа форм относится к дательному падежу. Название сейчас запоминать не обязательно.'},
 {id:'dat.52',slot:'full',type:'paragraph',text:'Сегодня разобрали «куда?» и «кому?», сравнили их с «где?» и «откуда?», увидели два шага выбора окончания. Тренажёр отдельно покажет, какие задания получилось выполнить без подсказки.'}
];
const possBlocks=[
 {id:'poss.1',slot:'opening',type:'subheading',text:'Зачем меняем слово'},
 {id:'poss.2',slot:'opening',type:'paragraph',text:'На столе лежит книга. Слово кітап означает «книга». Если хотим сказать «моя книга», нужно кітабым.'},
 {id:'poss.3',slot:'opening',type:'example',lemmaId:'n-кітап',sequence:['POSS_1SG'],before:'кітап',beforeRu:'книга',added:'-ым, и п меняется на б',after:'кітабым',afterRu:'моя книга'},
 {id:'poss.4',slot:'opening',type:'paragraph',text:'В русском мы говорим отдельное слово «моя». В казахском в конце названия вещи появляется часть, которая тоже показывает, чья это вещь. Можно назвать и самого человека: менің кітабым — моя книга. Здесь смысл «моя» связан не только с отдельным менің: конец кітабым тоже важен.'},
 {id:'poss.5',slot:'opening',type:'paragraph',text:'В кітабым видны сразу два изменения: п стало б, и добавилось -ым. Разберём их отдельно. Сначала потренируем смысл на слове без такого изменения.'},
 {id:'poss.6',slot:'opening',type:'subheading',text:'Мой или твой'},
 {id:'poss.7',slot:'opening',type:'example',lemmaId:'n-үй',sequence:['POSS_1SG'],before:'үй',beforeRu:'дом',added:'-ім',after:'үйім',afterRu:'мой дом'},
 {id:'poss.8',slot:'opening',type:'example',lemmaId:'n-үй',sequence:['POSS_2SG'],before:'үй',beforeRu:'дом',added:'-ің',after:'үйің',afterRu:'твой дом'},
 {id:'poss.9',slot:'opening',type:'paragraph',text:'Видим один и тот же предмет — дом. Меняется, чей он: мой или твой. В этих формах -ім показывает «мой», -ің — «твой».'},
 {id:'poss.10',slot:'opening',type:'example',lemmaId:'n-дос',sequence:['POSS_1SG'],before:'дос',beforeRu:'друг',added:'-ым',after:'досым',afterRu:'мой друг'},
 {id:'poss.11',slot:'opening',type:'example',lemmaId:'n-дос',sequence:['POSS_2SG'],before:'дос',beforeRu:'друг',added:'-ың',after:'досың',afterRu:'твой друг'},
 {id:'poss.12',slot:'opening',type:'paragraph',text:'Здесь говорим о близкой связи, а не о владении человеком как вещью. Начальная опора «чей предмет» помогает, но не исчерпывает все употребления.'},
 {id:'poss.13',slot:'opening',type:'warning',text:'Русские «мой» и «моя» различаются в зависимости от слова: мой дом, моя книга. В казахском выбор букв в этих формах устроен по правилам казахского слова, а не по русскому «мой/моя».'},
 {id:'poss.14',slot:'opening',type:'subheading',text:'Его или её'},
 {id:'poss.15',slot:'opening',type:'example',lemmaId:'n-кітап',sequence:['POSS_3'],before:'кітап',beforeRu:'книга',added:'-ы, п меняется на б',after:'кітабы',afterRu:'его или её книга'},
 {id:'poss.16',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['POSS_3'],before:'бала',beforeRu:'ребёнок',added:'-сы',after:'баласы',afterRu:'его или её ребёнок'},
 {id:'poss.17',slot:'opening',type:'paragraph',text:'Сама эта форма не разделяет русские «его» и «её». О ком идёт речь, выясняем из разговора. Не нужно угадывать мужчину или женщину по последней букве.'},
 {id:'poss.18',slot:'opening',type:'list',items:['кітабым — моя книга','кітабың — твоя книга','кітабы — его или её книга']},
 {id:'poss.19',slot:'opening',type:'paragraph',text:'В полной фразе можно явно назвать, чья вещь: менің кітабым — моя книга. Менің сообщает «мой/моя», а кітабым — «моя книга». Не нужно переводить это как «моя моя книга»: казахская конструкция устроена иначе. Форма менің кітап без нужного изменения названия вещи не заменяет эту конструкцию.'},
 {id:'poss.20',slot:'full',type:'subheading',text:'Почему бывает -м, а бывает -ым или -ім'},
 {id:'poss.21',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_1SG'],before:'бала',beforeRu:'ребёнок',added:'-м',after:'балам',afterRu:'мой ребёнок'},
 {id:'poss.22',slot:'full',type:'example',lemmaId:'n-ат',sequence:['POSS_1SG'],before:'ат',beforeRu:'имя',added:'-ым',after:'атым',afterRu:'моё имя'},
 {id:'poss.23',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_1SG'],before:'үй',beforeRu:'дом',added:'-ім',after:'үйім',afterRu:'мой дом'},
 {id:'poss.24',slot:'full',type:'paragraph',text:'После последнего а в бала добавляется -м. После т в ат добавляется -ым. После й в үй добавляется -ім. Для обычных слов этого набора сначала смотрим, заканчивается слово на гласный или согласный. После гласного для «мой» достаточно -м. После согласного нужны -ым или -ім. Ы или і выбираются по уже разобранной группе гласных слова. Ат в карточке тренажёра — «имя», поэтому атым — «моё имя».'},
 {id:'poss.25',slot:'full',type:'warning',text:'Если не помнишь, что такое гласные, ориентир на этих словах такой: а, о, ұ, ы ведут к варианту с ы; ә, ө, ү, і, е ведут к варианту с і. Слова с и или у разбираются отдельно: написанная буква не всегда даёт достаточную подсказку о конце слова.'},
 {id:'poss.26',slot:'full',type:'subheading',text:'Все пять смыслов'},
 {id:'poss.27',slot:'full',type:'paragraph',text:'Таблица открывается после знакомства с примерами и остаётся доступной всегда. «Вариант с ы» и «вариант с і» выбираются по гласным конкретного слова.'},
 {id:'poss.28',slot:'full',type:'table',caption:'Пять смыслов. Обе колонки нужны целиком',headers:['Что хотим сказать','После обычного согласного конца','После обычного гласного конца'],rows:[['мой, моя','-ым / -ім','-м'],['твой, твоя, обращение на «ты»','-ың / -ің','-ң'],['наш, наша','-ымыз / -іміз','-мыз / -міз'],['ваш, ваша, вежливое обращение','-ыңыз / -іңіз','-ңыз / -ңіз'],['его или её','-ы / -і','-сы / -сі']]},
 {id:'poss.29',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_2SG'],before:'үй',beforeRu:'дом',added:'-ің',after:'үйің',afterRu:'твой дом'},
 {id:'poss.30',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_1PL'],before:'үй',beforeRu:'дом',added:'-іміз',after:'үйіміз',afterRu:'наш дом'},
 {id:'poss.31',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_2POL'],before:'бала',beforeRu:'ребёнок',added:'-ңыз',after:'балаңыз',afterRu:'ваш ребёнок'},
 {id:'poss.32',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_3'],before:'бала',beforeRu:'ребёнок',added:'-сы',after:'баласы',afterRu:'его или её ребёнок'},
 {id:'poss.33',slot:'full',type:'example',lemmaId:'n-дос',sequence:['POSS_1PL'],before:'дос',beforeRu:'друг',added:'-ымыз',after:'досымыз',afterRu:'наш друг'},
 {id:'poss.34',slot:'full',type:'example',lemmaId:'n-дос',sequence:['POSS_2POL'],before:'дос',beforeRu:'друг',added:'-ыңыз',after:'досыңыз',afterRu:'ваш друг'},
 {id:'poss.35',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_1PL'],before:'бала',beforeRu:'ребёнок',added:'-мыз',after:'баламыз',afterRu:'наш ребёнок'},
 {id:'poss.36',slot:'full',type:'example',lemmaId:'n-дос',sequence:['POSS_3'],before:'дос',beforeRu:'друг',added:'-ы',after:'досы',afterRu:'его или её друг'},
 {id:'poss.37',slot:'full',type:'warning',text:'Таблица не разрешает придумывать формы для неизвестных слов. Каждый новый пример берётся из уже допущенных учебных слов.'},
 {id:'poss.38',slot:'full',type:'subheading',text:'Почему п стало б'},
 {id:'poss.39',slot:'full',type:'paragraph',text:'В слове кітап перед этим гласным продолжением последняя п меняется на б: кітап → кітаб- + ым → кітабым.'},
 {id:'poss.40',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['PL'],before:'кітап',beforeRu:'книга',added:'-тар',after:'кітаптар',afterRu:'книги'},
 {id:'poss.41',slot:'full',type:'paragraph',text:'В форме «книги» перед -тар буква п остаётся п. Значит, нельзя выучить «в слове кітап всегда заменяем п».'},
 {id:'poss.42',slot:'full',type:'example',lemmaId:'n-көлік',sequence:['POSS_1SG'],before:'көлік',beforeRu:'транспорт',added:'-ім, к меняется на г',after:'көлігім',afterRu:'мой транспорт'},
 {id:'poss.43',slot:'full',type:'example',lemmaId:'n-қонақ',sequence:['POSS_1SG'],before:'қонақ',beforeRu:'гость',added:'-ым, қ меняется на ғ',after:'қонағым',afterRu:'мой гость'},
 {id:'poss.44',slot:'full',type:'paragraph',text:'Здесь к стало г, а қ стало ғ. Эти примеры не превращаются в разрешение менять любую последнюю согласную. Ат → атым: т остаётся т. Слово принципі из канона — пример, где п сохраняется. В начале можно говорить «у этого слова такое изменение», затем сопоставлять разрешённые случаи и исключения. Принципі не даётся отдельным упражнением: его нет среди учебных заданий банка.'},
 {id:'poss.45',slot:'full',type:'example',lemmaId:'n-орын',sequence:['POSS_3'],before:'орын',beforeRu:'место',added:'-ы, ы внутри пропадает',after:'орны',afterRu:'его или её место'},
 {id:'poss.46',slot:'full',type:'example',lemmaId:'n-ерін',sequence:['POSS_3'],before:'ерін',beforeRu:'губа',added:'-і, і внутри пропадает',after:'ерні',afterRu:'его или её губа'},
 {id:'poss.47',slot:'full',type:'example',lemmaId:'n-орын',sequence:['LOC'],before:'орын',beforeRu:'место',added:'-да',after:'орында',afterRu:'на месте'},
 {id:'poss.48',slot:'full',type:'example',lemmaId:'n-ерін',sequence:['LOC'],before:'ерін',beforeRu:'губа',added:'-де',after:'ерінде',afterRu:'на губе'},
 {id:'poss.49',slot:'full',type:'warning',text:'орын → орны теряет ы, но орын → орында ы сохраняет. ерін → ерні теряет і, но ерін → ерінде і сохраняет. Нельзя удалять букву при любом добавлении. Каждое такое слово и подходящее продолжение проверяются отдельно.'},
 {id:'poss.50',slot:'full',type:'subheading',text:'Вместе и самостоятельно'},
 {id:'poss.51',slot:'full',type:'try',prompt:'үй — дом. Нужно «мой дом».',options:['үйім','үйің'],answer:'үйім',good:'үйім — мой дом.',bad:'үйің — твой дом. Нам нужен мой дом: үйім. Сравни последние буквы: м и ң.'},
 {id:'poss.52',slot:'full',type:'paragraph',text:'Самостоятельно тренажёр попросит другое слово. Например, дос — друг, нужно «твой друг»: досың. Если получилось досым: досым — мой друг. Здесь нужен твой друг: досың.'},
 {id:'poss.53',slot:'full',type:'paragraph',text:'Отдельное задание после разбора изменения: кітап — книга, нужно «моя книга». Ответ кітабым. Если кітапым: нужный конец -ым здесь есть, но у слова кітап перед ним п меняется на б: кітабым. Это показывает видимое совпадение конца, а не знание всех правил сразу.'},
 {id:'poss.54',slot:'full',type:'paragraph',text:'Следующий тренировочный пример берётся на другой разрешённой основе. Выбор и ввод учитываются отдельно. Повтор после готового ответа не повышает самостоятельный результат.'},
 {id:'poss.55',slot:'full',type:'subheading',text:'Следующее окончание — уже к изменённому слову'},
 {id:'poss.56',slot:'full',type:'paragraph',text:'Хотим выразить «к его или её книге». Шаг 1. Книга — кітап. Шаг 2. Его или её книга — кітабы. Шаг 3. К его или её книге — кітабына. К готовому кітабы добавляем -на.'},
 {id:'poss.57',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['DAT'],before:'кітап',beforeRu:'книга',added:'-қа',after:'кітапқа',afterRu:'к книге'},
 {id:'poss.58',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','DAT'],before:'кітап',beforeRu:'книга',added:'-на после кітабы',after:'кітабына',afterRu:'к его или её книге'},
 {id:'poss.59',slot:'full',type:'paragraph',text:'Сравни: кітапқа — к книге; кітабына — к его или её книге. После формы со значением «его или её» в этом случае выбирается -на или -не. Нельзя снова брать -ға только потому, что кітабы заканчивается на гласную.'},
 {id:'poss.60',slot:'full',type:'table',caption:'После формы «его или её». Каждая строка на проверенном примере',headers:['Что сказать дальше','Что добавляется','Пример'],rows:[['куда или кому','-на / -не','кітабына — к его или её книге'],['кого или что именно','-н','кітабын — его или её книгу, когда речь об этой книге'],['где','-нда / -нде','кітабында — у его или её книги, в ней'],['откуда или от кого','-нан / -нен','кітабынан — от его или её книги']]},
 {id:'poss.61',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','ACC'],before:'кітап',beforeRu:'книга',added:'-н',after:'кітабын',afterRu:'его или её книгу'},
 {id:'poss.62',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','LOC'],before:'кітап',beforeRu:'книга',added:'-нда',after:'кітабында',afterRu:'в его или её книге'},
 {id:'poss.63',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','ABL'],before:'кітап',beforeRu:'книга',added:'-нан',after:'кітабынан',afterRu:'от его или её книги'},
 {id:'poss.64',slot:'full',type:'warning',text:'Это не правило «добавляй н перед всем». У других продолжений собственные правила.'},
 {id:'poss.65',slot:'full',type:'paragraph',text:'После форм «мой» и «твой» в значении «куда или кому» добавляются -а или -е: балама — моему ребёнку, үйіңе — к твоему дому. После «наш» и вежливого «ваш» используется обычная группа -ға, -ге, -қа, -ке с учётом уже получившегося слова: үйімізге — к нашему дому, балаңызға — вашему ребёнку.'},
 {id:'poss.66',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_1SG','DAT'],before:'бала',beforeRu:'ребёнок',added:'-а после балам',after:'балама',afterRu:'моему ребёнку'},
 {id:'poss.67',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_2SG','DAT'],before:'үй',beforeRu:'дом',added:'-е после үйің',after:'үйіңе',afterRu:'к твоему дому'},
 {id:'poss.68',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_1PL','DAT'],before:'үй',beforeRu:'дом',added:'-ге после үйіміз',after:'үйімізге',afterRu:'к нашему дому'},
 {id:'poss.69',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_2POL','DAT'],before:'бала',beforeRu:'ребёнок',added:'-ға после балаңыз',after:'балаңызға',afterRu:'вашему ребёнку'},
 {id:'poss.70',slot:'full',type:'subheading',text:'Длинное слово по маленьким шагам'},
 {id:'poss.71',slot:'full',type:'example',lemmaId:'n-үй',sequence:['PL'],before:'үй',beforeRu:'дом',added:'-лер',after:'үйлер',afterRu:'дома'},
 {id:'poss.72',slot:'full',type:'example',lemmaId:'n-үй',sequence:['PL','POSS_1PL'],before:'үй',beforeRu:'дом',added:'-іміз после үйлер',after:'үйлеріміз',afterRu:'наши дома'},
 {id:'poss.73',slot:'full',type:'example',lemmaId:'n-үй',sequence:['PL','POSS_1PL','ABL'],before:'үй',beforeRu:'дом',added:'-ден после үйлеріміз',after:'үйлерімізден',afterRu:'из наших домов'},
 {id:'poss.74',slot:'full',type:'paragraph',text:'После первого шага работаем с үйлер, после второго — с үйлеріміз. Перед последним шагом слово заканчивается на з. Нельзя выбирать всё сразу от первоначального үй. В учебном показе видна вся цепочка. В самостоятельном задании следующий правильный конец заранее не показывается.'},
 {id:'poss.75',slot:'full',type:'term',text:'В учебниках это называется притяжательными формами. Название не требуется для первого задания.'},
 {id:'poss.76',slot:'full',type:'paragraph',text:'Разобрали, как показать «мой», «твой», «его или её», «наш», «ваш»; почему бывает изменение внутри слова; почему следующий шаг зависит от уже получившейся формы.'},
 {id:'poss.77',slot:'contrast',type:'subheading',text:'Что не перепутать'},
 {id:'poss.78',slot:'contrast',type:'list',items:['үйім — мой дом, үйің — твой дом','кітабым — моя книга, кітабы — его или её книга','кітапқа — к книге, кітабына — к его или её книге','орын → орны, но орын → орында']}
];
const LESSONS=[
 {
  id:'learner.dat.kuda',
  title:'В город, в школу. Кому дать книгу?',
  status:'READY',
  contentVersion:VERSION,
  modules:['harmony','voice'],
  families:['DAT'],
  home:{moduleId:'harmony',familyId:'DAT'},
  sourceNotes:['32 D','32 E','34 §13'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['что хотим сказать: куда или кому','с каким словом работаем','какая гласная группа у этого слова','чем слово заканчивается','не собрана ли уже форма «мой» или «его»'],
  steps:['реши, куда или кому','возьми слово и его перевод','выбери а или е','выбери первую букву добавки','если форма уже «его» или «мой», открой отдельный разбор'],
  requiredBlockIds:['dat.3','dat.7','dat.12','dat.28','dat.33','dat.38','dat.42','dat.48','dat.50'],
  blocks:datBlocks
 },
 {
  id:'learner.poss.owner',
  title:'Моя книга, твой дом, его или её вещь',
  status:'READY',
  contentVersion:VERSION,
  modules:['poss'],
  families:['POSS_1SG','POSS_2SG','POSS_1PL','POSS_2POL','POSS_3'],
  home:{moduleId:'poss',familyId:'POSS_1SG'},
  sourceNotes:['32 H','32 J','34 §7'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation','chains.step'],
  lookAt:['чей это предмет','гласный или согласный конец','какая гласная группа','есть ли у этого слова записанное изменение','какое следующее значение, если форма уже собрана'],
  steps:['реши, чей предмет','посмотри на конец слова','выбери добавку','если внутри слова есть записанное изменение, примени только его','следующий шаг считай от уже получившейся формы'],
  requiredBlockIds:['poss.3','poss.28','poss.44','poss.49','poss.51','poss.60','poss.65','poss.73'],
  blocks:possBlocks
 }
];
const api={version:VERSION,lessons:LESSONS,label,forFamily,lessonTarget,openTarget,operation,supportLine,feedback,chainNote,render,unavailable,visibleText,check};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MorphLearner=api;
})(typeof window!=='undefined'?window:globalThis);
