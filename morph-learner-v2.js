(function(root){
'use strict';
const VERSION='learner-ru-v2-c1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS={
 PL:'несколько',
 DAT:'куда или кому',
 LOC:'где',
 ABL:'откуда',
 GEN:'чей или чего',
 ACC:'кого или что именно',
 INS:'чем или с кем',
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
 const byFamily={DAT:'learner.dat.kuda',LOC:'learner.loc.where',PL:'learner.pl.several',GEN:'learner.nasal.senses',ACC:'learner.nasal.senses',ABL:'learner.nasal.senses',INS:'learner.nasal.senses'};
 const lessonId=byFamily[id]||seq.map(x=>byFamily[x]).find(Boolean);
 return lessonId?lessonTarget(lessonId):null;
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
 if(id==='LOC')return 'Сначала реши: где уже находится. Потом подбери конец. Это опора, не самостоятельный ответ.';
 if(id==='PL')return 'Сначала реши: несколько предметов. Потом выбери л, д или т и букву а или е. Это опора, не самостоятельный ответ.';
 if(id==='GEN'||id==='ACC'||id==='ABL'||id==='INS')return 'Сначала реши, что хочешь сказать. Одинаковый конец слова не даёт одно окончание на все вопросы. Это опора, не самостоятельный ответ.';
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
 if(!label(id))return null;
 const name=label(id)||'это значение';
 const bits=['Для значения «'+name+'» у слова '+item.stem+' («'+item.gloss+'») здесь получается '+item.expected+'.'];
 if(step.changed&&step.before&&step.stem)bits.push('Перед добавкой слово меняется: '+step.before+' → '+step.stem+'.');
 if(step.suffix)bits.push('Добавленная часть: -'+step.suffix+'.');
 const list=codes||[];
 if(list.includes('HARMONY'))bits.push('Буква а/е или ы/і в добавке не совпала с этим словом.');
 if(list.includes('ONSET_CLASS'))bits.push('Первая буква добавки не подходит к концу этого слова.');
 if(list.includes('MORPH_STATE'))bits.push('Форма уже показывает, чья это вещь. Здесь не обычное окончание от первого слова.');
 if(list.includes('CATEGORY'))bits.push('Похожая форма отвечает на другой вопрос. Сначала реши, что нужно сказать.');
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
 if(!opts||!opts.lessons){if(rows.length!==5)errors.push('expected five ready lessons');}
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
const locBlocks=[
 {id:'loc.1',slot:'opening',type:'subheading',text:'Где он уже'},
 {id:'loc.2',slot:'opening',type:'paragraph',text:'Человек уже в городе, не в дороге. Мы говорим, где он находится.'},
 {id:'loc.3',slot:'opening',type:'example',lemmaId:'n-қала',sequence:['LOC'],before:'қала',beforeRu:'город',added:'-да',after:'қалада',afterRu:'в городе'},
 {id:'loc.4',slot:'opening',type:'paragraph',text:'В русском «город» стало «в городе». В казахском к қала добавили -да. Это место, где он уже есть.'},
 {id:'loc.5',slot:'opening',type:'warning',text:'Русское «в» здесь не равно добавке «куда». «В городе» — қалада. «В город», когда человек ещё идёт, — қалаға.'},
 {id:'loc.6',slot:'opening',type:'subheading',text:'Три места'},
 {id:'loc.7',slot:'opening',type:'table',caption:'Где уже находится',headers:['Было','Что добавили','Получилось','По-русски'],rows:[['қала — город','-да','қалада','в городе'],['үй — дом','-де','үйде','в доме'],['мектеп — школа','-те','мектепте','в школе']]},
 {id:'loc.8',slot:'contrast',type:'table',caption:'Сначала вопрос, потом конец',headers:['Вопрос','Форма','Смысл'],rows:[['Где?','қалада','в городе'],['Куда?','қалаға','в город'],['Откуда?','қаладан','из города']]},
 {id:'loc.9',slot:'contrast',type:'example',lemmaId:'n-қала',sequence:['DAT'],before:'қала',beforeRu:'город',added:'-ға',after:'қалаға',afterRu:'в город'},
 {id:'loc.10',slot:'contrast',type:'example',lemmaId:'n-қала',sequence:['ABL'],before:'қала',beforeRu:'город',added:'-дан',after:'қаладан',afterRu:'из города'},
 {id:'loc.11',slot:'full',type:'subheading',text:'Два выбора'},
 {id:'loc.12',slot:'full',type:'paragraph',text:'Для обычных слов этого урока конец бывает -да, -де, -та, -те. Сначала а или е. Потом д или т.'},
 {id:'loc.13',slot:'full',type:'paragraph',text:'а, о, ұ, ы → в добавке а. ә, ө, ү, і, е → в добавке е. қалада: в слове а. үйде: в слове ү. мектепте: в слове е.'},
 {id:'loc.14',slot:'full',type:'paragraph',text:'Если слово заканчивается на гласный, на й или на обычный неглухой звук, первая буква добавки д: қалада, үйде, адамда. Если конец глухой, первая буква т.'},
 {id:'loc.15',slot:'full',type:'table',caption:'В этом наборе т после таких концов',headers:['Конец','Пример','Добавка','Получилось'],rows:[['п','кітап — книга','-та','кітапта'],['п','мектеп — школа','-те','мектепте'],['т','ат — имя','-та','атта']]},
 {id:'loc.16',slot:'full',type:'paragraph',text:'Ат в карточке тренажёра значит «имя», поэтому атта — «в имени». Буквы к, қ и с у обычных слов этой группы тоже берут вариант с т. Буквы б, в, г, д сами по себе не дают это правило: у части заимствованных слов класс записан отдельно.'},
 {id:'loc.17',slot:'full',type:'warning',text:'Буквы и и у не решают ряд сами. В этом наборе су — вода и тау — гора уже имеют проверенный класс. Другие такие слова по одной последней букве не угадываем.'},
 {id:'loc.18',slot:'full',type:'subheading',text:'Вместе'},
 {id:'loc.19',slot:'full',type:'paragraph',text:'Человек уже в школе. 1. Вопрос «где?». 2. Слово мектеп, «школа». 3. В слове е. 4. Конец п, поэтому т. 5. мектеп + те → мектепте.'},
 {id:'loc.20',slot:'full',type:'try',prompt:'Человек уже в школе. Что выбрать?',options:['мектепте','мектепке'],answer:'мектепте',good:'мектепте — в школе.',bad:'мектепке — в школу, когда туда идут. Сейчас он уже там: мектепте.'},
 {id:'loc.21',slot:'full',type:'subheading',text:'Когда форма уже «его или её»'},
 {id:'loc.22',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','LOC'],before:'кітап',beforeRu:'книга',added:'-нда после кітабы',after:'кітабында',afterRu:'в его или её книге'},
 {id:'loc.23',slot:'full',type:'paragraph',text:'кітапта — в книге. кітабында — в его или её книге. После формы «его или её» здесь -нда или -нде, не обычное -да. Подробный разбор принадлежности в теме «Чей предмет».'},
 {id:'loc.24',slot:'full',type:'link',lessonId:'learner.poss.owner',text:'Открыть разбор «Чей предмет»'},
 {id:'loc.25',slot:'full',type:'warning',text:'В полном описании у этого вопроса есть и значение «когда». В заданиях этого урока спрашиваем, где уже находится человек или предмет. Время сюда само не подставляем.'},
 {id:'loc.26',slot:'full',type:'term',text:'В учебниках это местный падеж. Название для первого ответа не нужно.'}
];
const plBlocks=[
 {id:'pl.1',slot:'opening',type:'subheading',text:'Несколько, не один'},
 {id:'pl.2',slot:'opening',type:'paragraph',text:'Один ребёнок — бала. Несколько детей — балалар. Сначала решаем, что предметов несколько. Потом выбираем конец.'},
 {id:'pl.3',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['PL'],before:'бала',beforeRu:'ребёнок',added:'-лар',after:'балалар',afterRu:'дети'},
 {id:'pl.4',slot:'opening',type:'example',lemmaId:'n-кітап',sequence:['PL'],before:'кітап',beforeRu:'книга',added:'-тар',after:'кітаптар',afterRu:'книги'},
 {id:'pl.5',slot:'opening',type:'example',lemmaId:'n-адам',sequence:['PL'],before:'адам',beforeRu:'человек',added:'-дар',after:'адамдар',afterRu:'люди'},
 {id:'pl.6',slot:'opening',type:'paragraph',text:'Смысл один: несколько. Концы разные: -лар, -тар, -дар. Таблица ниже относится только к этому смыслу. Её нельзя переносить на «чей», «кого» или «откуда».'},
 {id:'pl.7',slot:'full',type:'subheading',text:'Шесть концов, два выбора'},
 {id:'pl.8',slot:'full',type:'paragraph',text:'Письменных вариантов шесть: лар, лер, дар, дер, тар, тер. Сначала л, д или т. Потом а или е.'},
 {id:'pl.9',slot:'full',type:'paragraph',text:'а, о, ұ, ы → а. ә, ө, ү, і, е → е. балалар с а. әкелер с е: әке — отец.'},
 {id:'pl.10',slot:'full',type:'table',caption:'Семь групп конца. Р и л здесь не одно и то же',headers:['Чем кончается слово','Задний ряд, буква а','Передний ряд, буква е'],rows:[['гласный','балалар — дети','әкелер — отцы'],['й или у','таулар — горы','үйлер — дома'],['р','қарлар — снега','жерлер — земли'],['л','жолдар — дороги','көлдер — озёра'],['м, н или ң','адамдар — люди','әндер — песни'],['з или ж','қыздар — девушки','сөздер — слова'],['глухой: п, к, қ, т, с','кітаптар — книги','мектептер — школы']]},
 {id:'pl.11',slot:'full',type:'warning',text:'После р берём л: қарлар, жерлер. После л берём д: жолдар, көлдер. Не меняй эти две строки местами.'},
 {id:'pl.12',slot:'full',type:'paragraph',text:'Глухой конец в этом наборе: п, к, қ, т, с. Поэтому кітаптар и мектептер. У кітап перед -тар буква п остаётся п. Это не то изменение, которое бывает в «моя книга».'},
 {id:'pl.13',slot:'full',type:'subheading',text:'Эта таблица только про «несколько»'},
 {id:'pl.14',slot:'full',type:'paragraph',text:'Одно и то же слово адам после м даёт разные концы, потому что вопросы разные. Несколько людей — адамдар. Чей, от человека как владельца — адамның. От человека, откуда — адамнан. Не говори «после м всегда д» и не говори «после м всегда н».'},
 {id:'pl.15',slot:'full',type:'example',lemmaId:'n-адам',sequence:['GEN'],before:'адам',beforeRu:'человек',added:'-ның',after:'адамның',afterRu:'человека, чей'},
 {id:'pl.16',slot:'full',type:'example',lemmaId:'n-адам',sequence:['ABL'],before:'адам',beforeRu:'человек',added:'-нан',after:'адамнан',afterRu:'от человека'},
 {id:'pl.17',slot:'full',type:'try',prompt:'Нужно сказать «дети», несколько. Что выбрать?',options:['балалар','балаға'],answer:'балалар',good:'балалар — дети.',bad:'балаға — ребёнку или к ребёнку. Для нескольких детей нужно балалар.'},
 {id:'pl.18',slot:'full',type:'term',text:'В учебниках это множественное число. Название для первого ответа не нужно.'},
 {id:'pl.19',slot:'contrast',type:'list',items:['балалар — несколько детей','балаға — ребёнку','адамдар — несколько людей','адамның — человека, когда он владелец','қарлар — после р буква л','жолдар — после л буква д']}
];
const nasalBlocks=[
 {id:'nas.1',slot:'opening',type:'subheading',text:'Сначала вопрос'},
 {id:'nas.2',slot:'opening',type:'paragraph',text:'Слово адам кончается на м. От этого м не появляется одно окончание на все случаи. Сначала решаем, что хотим сказать.'},
 {id:'nas.3',slot:'opening',type:'table',caption:'Один человек, разные вопросы',headers:['Что хотим сказать','Форма','По-русски'],rows:[['несколько','адамдар','люди'],['чей, от кого как владельца','адамның','человека'],['кого именно','адамды','этого человека'],['где','адамда','у человека'],['откуда, от кого','адамнан','от человека'],['с кем','адаммен','с человеком']]},
 {id:'nas.4',slot:'opening',type:'warning',text:'Нельзя сказать «после м, н или ң всегда н» или «всегда д». Ответ зависит от вопроса.'},
 {id:'nas.5',slot:'full',type:'subheading',text:'Чей или чего'},
 {id:'nas.6',slot:'full',type:'paragraph',text:'Здесь называем владельца или то, к чему относится вещь. баланың — ребёнка. Вместе с формой вещи: баланың кітабы — книга ребёнка. Кітабы здесь значит «его или её книга». Это не то же самое, что баласы — «его или её ребёнок», и не то же самое, что балам — «мой ребёнок».'},
 {id:'nas.7',slot:'full',type:'example',lemmaId:'n-бала',sequence:['GEN'],before:'бала',beforeRu:'ребёнок',added:'-ның',after:'баланың',afterRu:'ребёнка'},
 {id:'nas.8',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3'],before:'кітап',beforeRu:'книга',added:'-ы, п меняется на б',after:'кітабы',afterRu:'его или её книга'},
 {id:'nas.9',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_3'],before:'бала',beforeRu:'ребёнок',added:'-сы',after:'баласы',afterRu:'его или её ребёнок'},
 {id:'nas.10',slot:'full',type:'paragraph',text:'Другие обычные концы этого вопроса: үйдің — дома, мектептің — школы, қаланың — города. Гласная а или е и первая буква н, д или т выбираются по слову. Сначала всё равно вопрос «чей или чего», не таблица «несколько».'},
 {id:'nas.11',slot:'full',type:'example',lemmaId:'n-үй',sequence:['GEN'],before:'үй',beforeRu:'дом',added:'-дің',after:'үйдің',afterRu:'дома'},
 {id:'nas.12',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['GEN'],before:'мектеп',beforeRu:'школа',added:'-тің',after:'мектептің',afterRu:'школы'},
 {id:'nas.13',slot:'full',type:'example',lemmaId:'n-қала',sequence:['GEN'],before:'қала',beforeRu:'город',added:'-ның',after:'қаланың',afterRu:'города'},
 {id:'nas.14',slot:'full',type:'subheading',text:'Кого или что именно'},
 {id:'nas.15',slot:'full',type:'paragraph',text:'Речь об этой книге, не о книге вообще. кітапты — эту книгу. әнді — эту песню. Если предмет не определён, это окончание само не ставится. В задании этого урока всегда ясно: «эту» или «этого».'},
 {id:'nas.16',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['ACC'],before:'кітап',beforeRu:'книга',added:'-ты',after:'кітапты',afterRu:'эту книгу'},
 {id:'nas.17',slot:'full',type:'example',lemmaId:'n-ән',sequence:['ACC'],before:'ән',beforeRu:'песня',added:'-ді',after:'әнді',afterRu:'эту песню'},
 {id:'nas.18',slot:'full',type:'example',lemmaId:'n-бала',sequence:['ACC'],before:'бала',beforeRu:'ребёнок',added:'-ны',after:'баланы',afterRu:'этого ребёнка'},
 {id:'nas.19',slot:'full',type:'example',lemmaId:'n-адам',sequence:['ACC'],before:'адам',beforeRu:'человек',added:'-ды',after:'адамды',afterRu:'этого человека'},
 {id:'nas.20',slot:'full',type:'warning',text:'адамның и адамды оба могут стоять рядом с человеком, но вопросы разные: «чей, кого как владельца» и «кого именно, этого».'},
 {id:'nas.21',slot:'full',type:'subheading',text:'Откуда или от кого'},
 {id:'nas.22',slot:'full',type:'paragraph',text:'Человек выходит из дома или получает вещь от кого-то. Первый слой: откуда, от кого, от чего. үйден — из дома. адамнан — от человека. қаладан — из города. мектептен — из школы.'},
 {id:'nas.23',slot:'full',type:'example',lemmaId:'n-үй',sequence:['ABL'],before:'үй',beforeRu:'дом',added:'-ден',after:'үйден',afterRu:'из дома'},
 {id:'nas.24',slot:'full',type:'example',lemmaId:'n-адам',sequence:['ABL'],before:'адам',beforeRu:'человек',added:'-нан',after:'адамнан',afterRu:'от человека'},
 {id:'nas.25',slot:'full',type:'example',lemmaId:'n-қала',sequence:['ABL'],before:'қала',beforeRu:'город',added:'-дан',after:'қаладан',afterRu:'из города'},
 {id:'nas.26',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['ABL'],before:'мектеп',beforeRu:'школа',added:'-тен',after:'мектептен',afterRu:'из школы'},
 {id:'nas.27',slot:'full',type:'paragraph',text:'После м, н или ң в этом вопросе первая буква н: адамнан. Это не адамдар и не адамның.'},
 {id:'nas.28',slot:'full',type:'subheading',text:'С кем'},
 {id:'nas.29',slot:'full',type:'paragraph',text:'Человек идёт не один. адаммен — с человеком. Это совместность. Сначала учим её отдельно от средства.'},
 {id:'nas.30',slot:'full',type:'example',lemmaId:'n-адам',sequence:['INS'],before:'адам',beforeRu:'человек',added:'-мен',after:'адаммен',afterRu:'с человеком'},
 {id:'nas.31',slot:'full',type:'subheading',text:'Чем, с помощью чего'},
 {id:'nas.32',slot:'full',type:'paragraph',text:'Другая ситуация: называем средство. сумен — водой, когда вода и есть средство. кітаппен — книгой. Окончание то же по виду, но задание должно прямо сказать «чем» или «с кем». По одной добавке эти два смысла не угадываем.'},
 {id:'nas.33',slot:'full',type:'example',lemmaId:'n-су',sequence:['INS'],before:'су',beforeRu:'вода',added:'-мен',after:'сумен',afterRu:'водой'},
 {id:'nas.34',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['INS'],before:'кітап',beforeRu:'книга',added:'-пен',after:'кітаппен',afterRu:'книгой'},
 {id:'nas.35',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['INS'],before:'мектеп',beforeRu:'школа',added:'-пен',after:'мектеппен',afterRu:'школой'},
 {id:'nas.36',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['INS'],before:'қыз',beforeRu:'девушка',added:'-бен',after:'қызбен',afterRu:'с девушкой'},
 {id:'nas.37',slot:'full',type:'warning',text:'В -мен, -бен и -пен буква е остаётся. адаммен не превращается в форму с а. После глухого конца п: кітаппен, мектеппен. После з буква б: қызбен. В остальных обычных случаях этого набора м: адаммен, сумен.'},
 {id:'nas.38',slot:'full',type:'subheading',text:'Похожие слова, другой вопрос'},
 {id:'nas.39',slot:'full',type:'paragraph',text:'Рядом с адам есть ещё три формы. адаммын — я человек. адамбыз — мы люди. адам ба — это вопрос «человек ли». Они не отвечают на «чей», «откуда» или «с кем». Пробел в адам ба обязателен: частица пишется отдельно.'},
 {id:'nas.40',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_1SG'],before:'адам',beforeRu:'человек',added:'-мын',after:'адаммын',afterRu:'я человек'},
 {id:'nas.41',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_1PL'],before:'адам',beforeRu:'человек',added:'-быз',after:'адамбыз',afterRu:'мы люди'},
 {id:'nas.42',slot:'full',type:'example',lemmaId:'n-адам',sequence:['Q'],before:'адам',beforeRu:'человек',added:' ба',after:'адам ба',afterRu:'человек ли'},
 {id:'nas.43',slot:'full',type:'try',prompt:'Нужно сказать «от человека». Что выбрать?',options:['адамнан','адамның','адамдар'],answer:'адамнан',good:'адамнан — от человека.',bad:'адамның — человека как владельца. адамдар — несколько людей. От человека: адамнан.'},
 {id:'nas.44',slot:'full',type:'try',prompt:'Нужно сказать «с человеком», вместе. Что выбрать?',options:['адаммен','адам ба'],answer:'адаммен',good:'адаммен — с человеком.',bad:'адам ба — вопрос «человек ли». Вместе с человеком: адаммен.'},
 {id:'nas.45',slot:'full',type:'term',text:'В учебниках у этих вопросов разные названия. Для первого ответа достаточно самого вопроса: чей, кого именно, откуда, с кем или чем.'},
 {id:'nas.46',slot:'contrast',type:'list',items:['адамның — чей, владелец','адамды — этого человека','адамнан — от человека','адаммен — с человеком','адамдар — несколько людей','адаммын — я человек','адам ба — человек ли']}
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
 },
 {
  id:'learner.loc.where',
  title:'Где он уже',
  status:'READY',
  contentVersion:VERSION,
  modules:['harmony','voice'],
  families:['LOC'],
  home:{moduleId:'harmony',familyId:'LOC'},
  sourceNotes:['32 D','32 E','34 место'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['вопрос «где», человек или предмет уже там','какая гласная группа','глухой ли конец','не форма ли это уже «его или её»'],
  steps:['реши, где уже находится','возьми слово и перевод','выбери а или е','выбери д или т','если форма уже «его или её», открой отдельный разбор'],
  requiredBlockIds:['loc.3','loc.7','loc.8','loc.15','loc.20','loc.22','loc.25'],
  blocks:locBlocks
 },
 {
  id:'learner.pl.several',
  title:'Несколько предметов',
  status:'READY',
  contentVersion:VERSION,
  modules:['plural'],
  families:['PL'],
  home:{moduleId:'plural',familyId:'PL'},
  sourceNotes:['32 F','34 множественное'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['нужно несколько предметов','группа конца: гласный, й или у, р, л, м н ң, з ж, глухой','буква а или е','эта таблица только для «несколько»'],
  steps:['убедись, что предметов несколько','выбери л, д или т','выбери а или е','собери слово'],
  requiredBlockIds:['pl.3','pl.10','pl.11','pl.14','pl.17'],
  blocks:plBlocks
 },
 {
  id:'learner.nasal.senses',
  title:'Похожий конец, другой вопрос',
  status:'READY',
  contentVersion:VERSION,
  modules:['nasal'],
  families:['GEN','ACC','ABL','INS'],
  home:{moduleId:'nasal',familyId:'GEN'},
  sourceNotes:['32 G','34 §§3–6'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['какой вопрос: чей, кого именно, откуда, с кем или чем','конец слова','таблица именно этого вопроса','не таблица «несколько»'],
  steps:['назови вопрос','возьми слово и перевод','выбери добавку этой группы','не переноси правило соседнего вопроса'],
  requiredBlockIds:['nas.3','nas.6','nas.16','nas.24','nas.30','nas.32','nas.37','nas.39','nas.43'],
  blocks:nasalBlocks
 }
];
const api={version:VERSION,lessons:LESSONS,label,forFamily,lessonTarget,openTarget,operation,supportLine,feedback,chainNote,render,unavailable,visibleText,check};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MorphLearner=api;
})(typeof window!=='undefined'?window:globalThis);
