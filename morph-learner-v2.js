(function(root){
'use strict';
const VERSION='learner-ru-v2-f8';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS={
 PL:'несколько',
 DAT:'куда или кому',
 LOC:'где',
 ABL:'откуда',
 GEN:'чей или чего',
 ACC:'кого или что именно',
 INS:'чем или с кем',
 COP_1SG:'я — кто',
 COP_1PL:'мы — кто',
 COP_2SG:'ты — кто',
 COP_2POL:'Вы — кто',
 COP_2PL:'вы — кто',
 COP_2PL_POL:'Вы, несколько — кто',
 Q:'вопрос ли',
 NEG:'не делать',
 PAST:'уже сделал',
 PTCP_GAN:'предмет через действие',
 COND:'если',
 CVB_IP:'добавочное действие',
 AGR_SHORT_1SG:'я, к уже сказанному действию',
 AGR_SHORT_1PL:'мы, к уже сказанному действию',
 AGR_SHORT_2SG:'ты, к уже сказанному действию',
 AGR_SHORT_2POL:'Вы, к уже сказанному действию',
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
 const verbFamily={'NEG':1,'PAST':1,'PTCP_GAN':1,'COND':1,'CVB_IP':1,'AGR_SHORT_1SG':1,'AGR_SHORT_1PL':1,'AGR_SHORT_2SG':1,'AGR_SHORT_2POL':1};
 if(verbFamily[id]||seq.some(x=>verbFamily[x]))return lessonTarget('learner.verbs.steps');
 if(seq.length>1)return lessonTarget('learner.chains.steps');
 if(String(id||'').startsWith('POSS_'))return lessonTarget('learner.poss.owner');
 const byFamily={DAT:'learner.dat.kuda',LOC:'learner.loc.where',PL:'learner.pl.several',GEN:'learner.nasal.senses',ACC:'learner.nasal.senses',ABL:'learner.nasal.senses',INS:'learner.nasal.senses',COP_1SG:'learner.person.roles',COP_1PL:'learner.person.roles',COP_2SG:'learner.person.roles',COP_2POL:'learner.person.roles',COP_2PL:'learner.person.roles',COP_2PL_POL:'learner.person.roles',Q:'learner.person.roles'};
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
 if(String(id||'').startsWith('COP_'))return 'Сначала реши, кто это говорит о себе: я, мы, ты или Вы. Это не «моя вещь». Это опора, не самостоятельный ответ.';
 if(id==='Q')return 'Сначала реши, что это вопрос. Частица пишется отдельно. Это не «не делать». Это опора, не самостоятельный ответ.';
 if(id==='NEG')return 'Сначала реши: не делать. Это не вопрос. Это опора, не самостоятельный ответ.';
 if(id==='PAST')return 'Сначала реши: действие уже произошло. Потом выбери ды, ді, ты или ті. Это опора, не самостоятельный ответ.';
 if(id==='PTCP_GAN')return 'Эта форма описывает предмет через действие. Это не «он сделал». Это опора, не самостоятельный ответ.';
 if(id==='COND')return 'Сначала реши: если так будет. Конец са или се. Это опора, не самостоятельный ответ.';
 if(id==='CVB_IP')return 'Это добавочное действие рядом с главным. Само по себе оно не значит «он сделал». Это опора, не самостоятельный ответ.';
 if(String(id||'').startsWith('AGR_SHORT_'))return 'Лицо добавляется к уже собранной форме. Это не «я человек». Это опора, не самостоятельный ответ.';
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
 if(list.includes('HARMONY'))bits.push((id==='PL'?'Л, д или т уже подходят. Л, д или т выбрано правильно. Теперь поменяй только гласную ряда.':'Стык выбран верно. Тип стыка выбран верно; поменяй только гармонический вариант. Поменяй только гласную ряда.')+' Буква а/е или ы/і в добавке не совпала с этим словом.');
 if(list.includes('ONSET_CLASS')){
  if(id==='PL')bits.push('Сейчас нужно «несколько». Для этого вопроса по концу слова выбирается л, д или т. Таблицу «несколько» не переноси на другой вопрос.');
  else bits.push('Первая буква добавки не подходит к концу этого слова. Край слова тот же, но у этого вопроса своя группа. Не бери правило соседнего вопроса. Край основы тот же, но у соседнего вопроса собственная группа. Не применяй правило соседнего вопроса.');
 }
 if(list.includes('MORPH_STATE'))bits.push('Слово уже показывает, чья это вещь. Сначала учитываем это состояние, и только потом обычный конец. Ты применила обычную форму, но слово уже находится в состоянии «мой», «твой» или «его или её». У этого вопроса после такого состояния свой конец.');
 if(list.includes('STEM_CHANGE'))bits.push('Конец семьи верный, но у этого слова перед ним записана замена внутри. Это не общее правило для всех слов. Окончание выбрано по нужному смыслу, но у этого слова есть проверенное изменение основы перед таким продолжением.');
 if(list.includes('CATEGORY'))bits.push('Похожая форма отвечает на другой вопрос. Ответ относится к другому вопросу. Сначала выбери, что нужно сказать, и только потом конец. Ответ относится к другой грамматической операции. В этом задании требуется названный смысл.');
 if(list.includes('OTHER_FORM'))bits.push('Ответ не совпал с нужной формой. Одна причина по этой записи не назначается. Разбор называет видимое отличие, стык и эталон. Выдуманной причины «почему так вышло у человека» здесь нет.');
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
function pieces(row,mode){
 const blocks=(row.blocks||[]).filter(b=>mode==='full'||b.slot===mode||(mode==='opening'&&b.slot==='opening')||(mode==='contrast'&&b.slot==='contrast'));
 const out=[];
 let bucket=[];
 let id=null;
 const flush=()=>{if(!bucket.length)return;out.push({id,html:bucket.map(renderBlock).join('')});bucket=[];};
 for(const b of blocks){
  if(b.type==='subheading'){flush();id=b.id;}
  bucket.push(b);
 }
 flush();
 return out;
}
function render(row,mode){
 const body=pieces(row,mode).map(p=>p.html).join('')||'<p role="status">'+esc(unavailable())+'</p>';
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
 if(!opts||!opts.lessons){if(rows.length!==8)errors.push('expected eight ready lessons');}
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
 {id:'dat.1',slot:'opening',type:'subheading',text:'Что скажем: куда? кому?'},
 {id:'dat.2',slot:'opening',type:'paragraph',text:'Заголовок: Куда? Кому? Представь: человек ещё дома и собирается в город. Мы хотим сказать, куда он идёт. Первый слой здесь два смысла: движение к месту, қалаға, и адресат, мұғалімге или әкеге. После формы «его или её» это уже не обычный ряд, а -на или -не.'},
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
 {id:'dat.17b',slot:'full',type:'warning',text:'Это не правило «смотри всегда на последнюю написанную гласную». Буквы и и у сами ряд не решают: нужно знать слово. Часть заимствований записана отдельным классом. Отдельные слова с ә тоже не всегда идут одной общей привычкой: их класс зависит от слова и от вопроса. В длинной форме ряд смотрят уже по получившемуся слову, а не заново по первому. В этих уроках такие слова — те, что уже показаны с проверенной формой, начиная с әке. Отдельного тайного списка сверх показанных форм здесь нет.'},
 {id:'dat.17c',slot:'full',type:'paragraph',text:'Первые задания здесь — куда и кому, и их лучше не смешивать в одной серии. В полном описании у этого вопроса есть ещё цель. Русское «к» не равно этой добавке во всех случаях.'},
 {id:'dat.18',slot:'full',type:'example',lemmaId:'n-қала',sequence:['DAT'],before:'қала',beforeRu:'город',added:'-ға',after:'қалаға',afterRu:'в город'},
 {id:'dat.19',slot:'full',type:'example',lemmaId:'n-үй',sequence:['DAT'],before:'үй',beforeRu:'дом',added:'-ге',after:'үйге',afterRu:'к дому'},
 {id:'dat.20',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['DAT'],before:'мектеп',beforeRu:'школа',added:'-ке',after:'мектепке',afterRu:'в школу'},
 {id:'dat.20b',slot:'full',type:'example',lemmaId:'n-әке',sequence:['DAT'],before:'әке',beforeRu:'отец',added:'-ге',after:'әкеге',afterRu:'отцу'},
 {id:'dat.20c',slot:'full',type:'example',lemmaId:'n-көше',sequence:['DAT'],before:'көше',beforeRu:'улица',added:'-ге',after:'көшеге',afterRu:'на улицу'},
 {id:'dat.20d',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['DAT'],before:'мұғалім',beforeRu:'учитель',added:'-ге',after:'мұғалімге',afterRu:'учителю'},
 {id:'dat.20e',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['DAT'],before:'қыз',beforeRu:'девушка',added:'-ға',after:'қызға',afterRu:'девушке'},
 {id:'dat.20f',slot:'full',type:'example',lemmaId:'n-ит',sequence:['DAT'],before:'ит',beforeRu:'собака',added:'-ке',after:'итке',afterRu:'собаке'},
 {id:'dat.20g',slot:'full',type:'example',lemmaId:'n-тау',sequence:['DAT'],before:'тау',beforeRu:'гора',added:'-ға',after:'тауға',afterRu:'к горе'},
 {id:'dat.20h',slot:'full',type:'example',lemmaId:'n-су',sequence:['DAT'],before:'су',beforeRu:'вода',added:'-ға',after:'суға',afterRu:'к воде'},
 {id:'dat.20i',slot:'full',type:'example',lemmaId:'n-аға',sequence:['DAT'],before:'аға',beforeRu:'старший брат',added:'-ға',after:'ағаға',afterRu:'старшему брату'},
 {id:'dat.20j',slot:'full',type:'example',lemmaId:'n-жол',sequence:['DAT'],before:'жол',beforeRu:'дорога',added:'-ға',after:'жолға',afterRu:'на дорогу'},
 {id:'dat.20k',slot:'full',type:'example',lemmaId:'n-аң',sequence:['DAT'],before:'аң',beforeRu:'зверь',added:'-ға',after:'аңға',afterRu:'зверю'},
 {id:'dat.20l',slot:'full',type:'example',lemmaId:'n-ерін',sequence:['DAT'],before:'ерін',beforeRu:'губа',added:'-ге',after:'ерінге',afterRu:'к губе'},
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
 {id:'dat.49',slot:'full',type:'warning',text:'Не все значения этих форм исчерпываются движением. Есть и другие употребления, включая цель. Этот урок подробно вводит два начальных смысла: «куда?» и «кому?». Он не заменяет весь разбор соседних вопросов. Прочие значения дательного падежа в полном описании: цель, причина и сравнение. Первые задания оставляют только «куда» и «кому».'},
 {id:'dat.50',slot:'full',type:'warning',text:'Отдельная граница: «с кем-то или с помощью» у слова адам — адаммен. Буква е здесь остаётся. Не делай из неё адамман по похожести на а/е в других окончаниях.'},
 {id:'dat.51',slot:'full',type:'term',text:'В учебниках эта группа форм относится к дательному падежу. Название сейчас запоминать не обязательно.'},
 {id:'dat.53',slot:'full',type:'paragraph',text:'Ряд гласных и первая буква — два разных выбора. Сначала решаем, что сказать. Потом смотрим на уже получившееся слово, не на первую догадку по последней букве. Для «куда или кому» после обычного неглухого конца берём ғ или г, после глухого қ или к, и уже внутри пары а или е. Для «где» другая группа: после обычного неглухого д, после глухого т. Глухой конец не значит «всегда т»: он выбирает глухой кусок именно этого вопроса. Окончание -шы из-за похожей буквы само не становится -жы. У части заимствований на б, в, г или д первая буква добавки может быть глухой: класс записан у слова.'},
 {id:'dat.52',slot:'full',type:'paragraph',text:'Сегодня разобрали «куда?» и «кому?», сравнили их с «где?» и «откуда?», увидели два шага выбора окончания. Тренажёр отдельно покажет, какие задания получилось выполнить без подсказки.'},
 {id:'dat.54',slot:'full',type:'paragraph',text:'Карточка «куда или кому». Опора новичка: «куда?». После формы «его или её» конец особый и важнее обычного ряда с ғ или г. Обычный пример: балаға. После «его или её книга»: кітабына. Ряд гласных и первая буква — два разных решения. Сначала смысл, потом особое состояние уже собранного слова, потом ғ или г против қ или к, и уже внутри пары а или е. На переднем ряде тот же контраст первой буквы: үйге рядом с мектепке. «Куда или кому» и «где» не делят одну первую букву. Глухой конец не значит «всегда т»: он выбирает глухой кусок именно этого вопроса. У части заимствований на б, в, г или д первая буква может быть глухой: класс записан у слова, а не угадывается по одной букве.'},
 {id:'dat.55',slot:'full',type:'paragraph',text:'Название в учебнике: направление и адресат. Два ясных первых смысла: движение к месту и адресат. Движение: қалаға барды. Адресат, образец источника, не отдельное задание: кісіге берді. Для меняющегося начала глухой край выбирает глухой вариант, неглухой — звонкий, и только у тех вопросов, где начало вообще меняется. Здесь после разрешённого неглухого края первая буква ғ или г. У вопроса «где» после такого края первая буква д. У многих концов есть передний и задний ряд, а на экране одна настоящая форма. Для допущенного слова ряд уже записан: задача — заметить его, а не угадать любую форму. Буквы и и у без самого слова ряд не задают. Заимствования могут иметь свой класс. Отдельные слова на ә ведут себя по записи этого слова и этого вопроса.'}
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
 {id:'poss.11b',slot:'full',type:'example',lemmaId:'n-аға',sequence:['POSS_1SG'],before:'аға',beforeRu:'старший брат',added:'-м',after:'ағам',afterRu:'мой старший брат'},
 {id:'poss.11c',slot:'full',type:'example',lemmaId:'n-аға',sequence:['POSS_2SG'],before:'аға',beforeRu:'старший брат',added:'-ң',after:'ағаң',afterRu:'твой старший брат'},
 {id:'poss.11d',slot:'full',type:'example',lemmaId:'n-аға',sequence:['POSS_3'],before:'аға',beforeRu:'старший брат',added:'-сы',after:'ағасы',afterRu:'его или её старший брат'},
 {id:'poss.11e',slot:'full',type:'example',lemmaId:'n-сіңлі',sequence:['POSS_1SG'],before:'сіңлі',beforeRu:'младшая сестра',added:'-м',after:'сіңлім',afterRu:'моя младшая сестра'},
 {id:'poss.11f',slot:'full',type:'example',lemmaId:'n-сіңлі',sequence:['POSS_2SG'],before:'сіңлі',beforeRu:'младшая сестра',added:'-ң',after:'сіңлің',afterRu:'твоя младшая сестра'},
 {id:'poss.11g',slot:'full',type:'example',lemmaId:'n-сіңлі',sequence:['POSS_1PL'],before:'сіңлі',beforeRu:'младшая сестра',added:'-міз',after:'сіңліміз',afterRu:'наша младшая сестра'},
 {id:'poss.11h',slot:'full',type:'example',lemmaId:'n-ит',sequence:['POSS_1SG'],before:'ит',beforeRu:'собака',added:'-ім',after:'итім',afterRu:'моя собака'},
 {id:'poss.11i',slot:'full',type:'example',lemmaId:'n-ит',sequence:['POSS_2SG'],before:'ит',beforeRu:'собака',added:'-ің',after:'итің',afterRu:'твоя собака'},
 {id:'poss.11j',slot:'full',type:'example',lemmaId:'n-ит',sequence:['POSS_3'],before:'ит',beforeRu:'собака',added:'-і',after:'иті',afterRu:'его или её собака'},
 {id:'poss.11k',slot:'full',type:'example',lemmaId:'n-тау',sequence:['POSS_1SG'],before:'тау',beforeRu:'гора',added:'-ым',after:'тауым',afterRu:'моя гора'},
 {id:'poss.11l',slot:'full',type:'example',lemmaId:'n-тау',sequence:['POSS_2POL'],before:'тау',beforeRu:'гора',added:'-ыңыз',after:'тауыңыз',afterRu:'ваша гора'},
 {id:'poss.11m',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['POSS_1SG'],before:'қыз',beforeRu:'девушка',added:'-ым',after:'қызым',afterRu:'моя девушка, близкая'},
 {id:'poss.11n',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['POSS_1PL'],before:'қыз',beforeRu:'девушка',added:'-ымыз',after:'қызымыз',afterRu:'наша девушка, близкая'},
 {id:'poss.11o',slot:'full',type:'example',lemmaId:'n-әке',sequence:['POSS_1SG'],before:'әке',beforeRu:'отец',added:'-м',after:'әкем',afterRu:'мой отец'},
 {id:'poss.11p',slot:'full',type:'example',lemmaId:'n-әке',sequence:['POSS_2POL'],before:'әке',beforeRu:'отец',added:'-ңіз',after:'әкеңіз',afterRu:'ваш отец'},
 {id:'poss.11q',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['POSS_1SG'],before:'мұғалім',beforeRu:'учитель',added:'-ім, к меняется на г',after:'мұғалімім',afterRu:'мой учитель'},
 {id:'poss.11r',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['POSS_3'],before:'мұғалім',beforeRu:'учитель',added:'-і, к меняется на г',after:'мұғалімі',afterRu:'его или её учитель'},
 {id:'poss.12',slot:'opening',type:'paragraph',text:'Здесь говорим о близкой связи, а не о владении человеком как вещью. Начальная опора «чей предмет» помогает, но не исчерпывает все употребления.'},
 {id:'poss.13',slot:'opening',type:'warning',text:'Русские «мой» и «моя» различаются в зависимости от слова: мой дом, моя книга. В казахском выбор букв в этих формах устроен по правилам казахского слова, а не по русскому «мой/моя».'},
 {id:'poss.14',slot:'opening',type:'subheading',text:'Его или её'},
 {id:'poss.15',slot:'opening',type:'example',lemmaId:'n-кітап',sequence:['POSS_3'],before:'кітап',beforeRu:'книга',added:'-ы, п меняется на б',after:'кітабы',afterRu:'его или её книга'},
 {id:'poss.16',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['POSS_3'],before:'бала',beforeRu:'ребёнок',added:'-сы',after:'баласы',afterRu:'его или её ребёнок'},
 {id:'poss.17',slot:'opening',type:'paragraph',text:'Сама эта форма не разделяет русские «его» и «её». О ком идёт речь, выясняем из разговора. Не нужно угадывать мужчину или женщину по последней букве.'},
 {id:'poss.18',slot:'opening',type:'list',items:['кітабым — моя книга','кітабың — твоя книга','кітабы — его или её книга']},
 {id:'poss.19',slot:'opening',type:'paragraph',text:'В полной фразе можно явно назвать, чья вещь: менің кітабым — моя книга. Менің сообщает «мой/моя», а кітабым — «моя книга». Не нужно переводить это как «моя моя книга»: казахская конструкция устроена иначе. Форма менің кітап без нужного изменения названия вещи не заменяет эту конструкцию. Явная пара владельца и вещи: адамның кітабы — книга этого человека.'},
 {id:'poss.20',slot:'full',type:'subheading',text:'Почему бывает -м, а бывает -ым или -ім'},
 {id:'poss.21',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_1SG'],before:'бала',beforeRu:'ребёнок',added:'-м',after:'балам',afterRu:'мой ребёнок'},
 {id:'poss.22',slot:'full',type:'example',lemmaId:'n-ат',sequence:['POSS_1SG'],before:'ат',beforeRu:'имя',added:'-ым',after:'атым',afterRu:'моё имя'},
 {id:'poss.23',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_1SG'],before:'үй',beforeRu:'дом',added:'-ім',after:'үйім',afterRu:'мой дом'},
 {id:'poss.24',slot:'full',type:'paragraph',text:'После последнего а в бала добавляется -м. После т в ат добавляется -ым. После й в үй добавляется -ім. Для обычных слов этого набора сначала смотрим, заканчивается слово на гласный или согласный. После гласного для «мой» достаточно -м. После согласного нужны -ым или -ім. Ы или і выбираются по уже разобранной группе гласных слова. Ат в карточке тренажёра — «имя», поэтому атым — «моё имя».'},
 {id:'poss.25',slot:'full',type:'warning',text:'Если не помнишь, что такое гласные, ориентир на этих словах такой: а, о, ұ, ы ведут к варианту с ы; ә, ө, ү, і, е ведут к варианту с і. Слова с и или у разбираются отдельно: написанная буква не всегда даёт достаточную подсказку о конце слова.'},
 {id:'poss.26',slot:'full',type:'subheading',text:'Все пять смыслов'},
 {id:'poss.27',slot:'full',type:'paragraph',text:'Таблица открывается после знакомства с примерами и остаётся доступной всегда. «Вариант с ы» и «вариант с і» выбираются по гласным конкретного слова.'},
 {id:'poss.28',slot:'full',type:'table',caption:'Пять смыслов. Обе колонки нужны целиком',headers:['Что хотим сказать','После обычного согласного конца','После обычного гласного конца'],rows:[['мой, моя','-ым / -ім','-м'],['твой, твоя, обращение на «ты»','-ың / -ің','-ң'],['наш, наша','-ымыз / -іміз','-мыз / -міз'],['ваш, ваша, вежливое обращение','-ыңыз / -іңіз','-ңыз / -ңіз'],['его или её','-ы / -і','-сы / -сі']]},
 {id:'poss.28b',slot:'full',type:'paragraph',text:'Сначала решаем, чей это предмет: мой, твой, наш, ваш или его. Потом смотрим, кончается ли уже получившееся слово на гласный. После согласного для «мой» берём -ым или -ім, после гласного -м. Для «твой»: -ың, -ің или -ң. Для «наш»: -ымыз, -іміз, -мыз или -міз. Для вежливого «ваш»: -ыңыз, -іңіз, -ңыз или -ңіз. Для «его или её»: -ы, -і, -сы или -сі. Буквы и и у сами не говорят, гласный ли это край. Если семья верная, а слово меняется внутри, замена записана у этого слова. Если стык верный, меняем только гласную ряда. Слово «мой» здесь только вход в первый смысл, не закон для всех пяти. Для первого шага рядом можно назвать владельца: менің — мой, сенің — твой, біздің — наш, сіздің — ваш, оның — его или её. Форма «чей» показывает владельца. Конец на самой вещи показывает отношение вещи к этому владельцу. Владелец может быть назван отдельно или быть понятен из конца вещи. «Чей предмет», «кто я» и «кто сделал» — три разных дела, даже если буква похожа.'},
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
 {id:'poss.79',slot:'full',type:'paragraph',text:'Пять смыслов принадлежности. Мой, одно лицо: после согласного заднего ряда -ым, переднего -ім, после гласного -м. Твой, неформально: -ың, -ің или -ң. Наш: -ымыз, -іміз, -мыз или -міз. Ваш, вежливо: -ыңыз, -іңіз, -ңыз или -ңіз. Его или её: -ы, -і, -сы или -сі. Выбор «после гласного или после согласного» смотрит на звуковой край допущенного слова. Буквы и и у сами этот край не классифицируют. Примеры с заменой внутри: кітабым, көлігім, қонағым. Это не закон «п всегда становится б»: атым не доказывает такой закон для всех слов. Буква ы или і пропадает только у записанных слов: орын даёт орны, но орында ы сохраняет; ерін даёт ерні, но ерінде і сохраняет. Порядок: чей предмет, уже получившееся слово, ряд, гласный или согласный край, записанная замена, затем конец. Если конец семьи верный, а внутри записана замена, это словарный случай, не общее правило. Если тип стыка верный, меняем только гласную.'},
 {id:'poss.80',slot:'full',type:'paragraph',text:'Название: принадлежность. Минимальный смысл: мой — одному лицу; твой — второму лицу неформально; наш — нам; ваш — вежливому Вы; его или её — третьему лицу. Слово «мой» только вход в первый смысл. Ваш, вежливо: после согласного задний ряд -ыңыз, передний -іңіз, после гласного заднего ряда -ңыз. Его или её: после согласного задний ряд -ы, передний -і, после гласного заднего ряда -сы. Буква п не всегда озвончается: это контрпример к безусловному правилу. Сначала смысл «чей предмет», затем уже получившееся слово, затем ряд, затем гласный или согласный край, затем записанная замена внутри, затем вариант конца. Новую форму и новое состояние берём дальше. Если после этого будет вопрос места или направления, следующий шаг считается уже от формы «чей предмет». Тәуелдік — отношение принадлежности или зависимости, и оно стоит концом на самой вещи. Форма сразу говорит, что отношение есть, и чья это вещь. Владелец может быть назван формой «чей» или быть понятен из конца. сіздің — ваш, вежливо. Записанная замена внутри и сам конец — две разные вещи. «Мой предмет», «кто я» и «кто сделал» — три разных дела. Явные входы: менің — мой, сенің — твой, біздің — наш, сіздің — ваш, оның — его или её. Сначала словарно разрешённое изменение основы, затем конец «чей предмет». В контрасте показываем пару целиком, даже если карточка спрашивает только владельца. Вопросы такие: чей предмет, сделай форму владельца; кого или чего как отношение двух имён.'},
 {id:'poss.78',slot:'contrast',type:'list',items:['үйім — мой дом, үйің — твой дом','кітабым — моя книга, кітабы — его или её книга','кітапқа — к книге, кітабына — к его или её книге','орын → орны, но орын → орында']}
];
const locBlocks=[
 {id:'loc.1',slot:'opening',type:'subheading',text:'Где? Когда?'},
 {id:'loc.2',slot:'opening',type:'paragraph',text:'Человек уже в городе, не в дороге. Мы говорим, где он находится.'},
 {id:'loc.3',slot:'opening',type:'example',lemmaId:'n-қала',sequence:['LOC'],before:'қала',beforeRu:'город',added:'-да',after:'қалада',afterRu:'в городе'},
 {id:'loc.4',slot:'opening',type:'paragraph',text:'В русском «город» стало «в городе». В казахском к қала добавили -да. Это место, где он уже есть.'},
 {id:'loc.5',slot:'opening',type:'warning',text:'Русское «в» здесь не равно добавке «куда». «В городе» — қалада. «В город», когда человек ещё идёт, — қалаға.'},
 {id:'loc.6',slot:'opening',type:'subheading',text:'Три места'},
 {id:'loc.7',slot:'opening',type:'table',caption:'Где уже находится',headers:['Было','Что добавили','Получилось','По-русски'],rows:[['қала — город','-да','қалада','в городе'],['үй — дом','-де','үйде','в доме'],['мектеп — школа','-те','мектепте','в школе']]},
 {id:'loc.7b',slot:'opening',type:'example',lemmaId:'n-көше',sequence:['LOC'],before:'көше',beforeRu:'улица',added:'-де',after:'көшеде',afterRu:'на улице'},
 {id:'loc.7c',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['LOC'],before:'мұғалім',beforeRu:'учитель',added:'-де',after:'мұғалімде',afterRu:'у учителя'},
 {id:'loc.7d',slot:'opening',type:'example',lemmaId:'n-қыз',sequence:['LOC'],before:'қыз',beforeRu:'девушка',added:'-да',after:'қызда',afterRu:'у девушки'},
 {id:'loc.7e',slot:'opening',type:'example',lemmaId:'n-ит',sequence:['LOC'],before:'ит',beforeRu:'собака',added:'-те',after:'итте',afterRu:'у собаки'},
 {id:'loc.7f',slot:'opening',type:'example',lemmaId:'n-тау',sequence:['LOC'],before:'тау',beforeRu:'гора',added:'-да',after:'тауда',afterRu:'на горе'},
 {id:'loc.7g',slot:'opening',type:'example',lemmaId:'n-ән',sequence:['LOC'],before:'ән',beforeRu:'песня',added:'-де',after:'әнде',afterRu:'в песне'},
 {id:'loc.7h',slot:'opening',type:'example',lemmaId:'n-жол',sequence:['LOC'],before:'жол',beforeRu:'дорога',added:'-да',after:'жолда',afterRu:'на дороге'},
 {id:'loc.7i',slot:'opening',type:'example',lemmaId:'n-аға',sequence:['LOC'],before:'аға',beforeRu:'старший брат',added:'-да',after:'ағада',afterRu:'у старшего брата'},
 {id:'loc.7j',slot:'opening',type:'example',lemmaId:'n-сіңлі',sequence:['LOC'],before:'сіңлі',beforeRu:'младшая сестра',added:'-де',after:'сіңліде',afterRu:'у младшей сестры'},
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
 {id:'loc.25',slot:'full',type:'warning',text:'В полном описании это место или время: где человек или предмет уже есть, или где и когда происходит действие. Например: в городе, в школе, ночью. В первых заданиях спрашиваем, где уже находится. Время в эти задания само не подставляем. Это и не универсальное «да/де»: после формы «его или её» здесь другое продолжение, и носовой механизм «чей» сюда не переносится. Значение «когда» названо: ночью, в тот момент, когда действие уже происходит. Дополнительные смыслы места — внутри и на поверхности — в первых заданиях тоже не дробятся.'},
 {id:'loc.26',slot:'full',type:'term',text:'В учебниках это местный падеж. Название для первого ответа не нужно.'},
 {id:'loc.27',slot:'full',type:'paragraph',text:'Задний ряд вопроса «где»: қалада. Передний ряд того же вопроса: көшеде и үйде. Контраст направления: балаға и үйге. Контрпример совместности: адаммен, не адамман. Три вопроса одной оси, формы разные: куда — движение к месту, где — место или время, где уже находится, откуда — движение из. «Где» описывает и место, и время, и противопоставлено движению «куда» и «откуда» как более спокойное «уже там». Это не универсальные «да» и «де». После «его или её» здесь -нда или -нде. Носовой механизм «чей» и «откуда» на обычное «где» не переносится. Рядом кітапта, мектепте и кітабында.'},
 {id:'loc.28',slot:'full',type:'paragraph',text:'Название в учебнике: место и время. Это физическое место или время, где уже находится, и оно противопоставлено движению. Три вопроса описывают одну ось и берут разные формы. Поэтому контраст қалаға, қалада, қаладан полезен. «Где» не является универсальным «да» или «де».'}
];
const plBlocks=[
 {id:'pl.1',slot:'opening',type:'subheading',text:'Несколько, не один'},
 {id:'pl.2',slot:'opening',type:'paragraph',text:'Один ребёнок — бала. Несколько детей — балалар. Сначала решаем, что предметов несколько. Потом выбираем конец.'},
 {id:'pl.3',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['PL'],before:'бала',beforeRu:'ребёнок',added:'-лар',after:'балалар',afterRu:'дети'},
 {id:'pl.4',slot:'opening',type:'example',lemmaId:'n-кітап',sequence:['PL'],before:'кітап',beforeRu:'книга',added:'-тар',after:'кітаптар',afterRu:'книги'},
 {id:'pl.5',slot:'opening',type:'example',lemmaId:'n-адам',sequence:['PL'],before:'адам',beforeRu:'человек',added:'-дар',after:'адамдар',afterRu:'люди'},
 {id:'pl.5b',slot:'opening',type:'example',lemmaId:'n-әке',sequence:['PL'],before:'әке',beforeRu:'отец',added:'-лер',after:'әкелер',afterRu:'отцы'},
 {id:'pl.5c',slot:'opening',type:'example',lemmaId:'n-ит',sequence:['PL'],before:'ит',beforeRu:'собака',added:'-тер',after:'иттер',afterRu:'собаки'},
 {id:'pl.5d',slot:'opening',type:'example',lemmaId:'n-аң',sequence:['PL'],before:'аң',beforeRu:'зверь',added:'-дар',after:'аңдар',afterRu:'звери'},
 {id:'pl.5e',slot:'opening',type:'example',lemmaId:'n-ерін',sequence:['PL'],before:'ерін',beforeRu:'губа',added:'-дер',after:'еріндер',afterRu:'губы'},
 {id:'pl.5f',slot:'opening',type:'example',lemmaId:'n-орын',sequence:['PL'],before:'орын',beforeRu:'место',added:'-дар',after:'орындар',afterRu:'места'},
 {id:'pl.5g',slot:'opening',type:'example',lemmaId:'n-аға',sequence:['PL'],before:'аға',beforeRu:'старший брат',added:'-лар',after:'ағалар',afterRu:'старшие братья'},
 {id:'pl.5h',slot:'opening',type:'example',lemmaId:'n-сіңлі',sequence:['PL'],before:'сіңлі',beforeRu:'младшая сестра',added:'-лер',after:'сіңлілер',afterRu:'младшие сёстры'},
 {id:'pl.5i',slot:'opening',type:'example',lemmaId:'n-қонақ',sequence:['PL'],before:'қонақ',beforeRu:'гость',added:'-тар',after:'қонақтар',afterRu:'гости'},
 {id:'pl.5j',slot:'opening',type:'example',lemmaId:'n-көлік',sequence:['PL'],before:'көлік',beforeRu:'транспорт',added:'-тер',after:'көліктер',afterRu:'транспорт, несколько'},
 {id:'pl.5k',slot:'opening',type:'example',lemmaId:'n-дос',sequence:['PL'],before:'дос',beforeRu:'друг',added:'-тар',after:'достар',afterRu:'друзья'},
 {id:'pl.5l',slot:'opening',type:'example',lemmaId:'n-су',sequence:['PL'],before:'су',beforeRu:'вода',added:'-лар',after:'сулар',afterRu:'воды'},
 {id:'pl.6',slot:'opening',type:'paragraph',text:'Смысл один: несколько. Концы разные: -лар, -тар, -дар. Таблица ниже относится только к этому смыслу. Её нельзя переносить на «чей», «кого» или «откуда».'},
 {id:'pl.7',slot:'full',type:'subheading',text:'Шесть концов, два выбора'},
 {id:'pl.8',slot:'full',type:'paragraph',text:'Письменных вариантов шесть: лар, лер, дар, дер, тар, тер. Сначала л, д или т. Потом а или е.'},
 {id:'pl.9',slot:'full',type:'paragraph',text:'а, о, ұ, ы → а. ә, ө, ү, і, е → е. балалар с а. әкелер с е: әке — отец.'},
 {id:'pl.10',slot:'full',type:'table',caption:'Семь групп конца. Р и л здесь не одно и то же',headers:['Чем кончается слово','Задний ряд, буква а','Передний ряд, буква е'],rows:[['гласный','балалар — дети','әкелер — отцы'],['й или у','таулар — горы','үйлер — дома'],['р','қарлар — снега','жерлер — земли'],['л','жолдар — дороги','көлдер — озёра'],['м, н или ң','адамдар — люди','әндер — песни'],['з или ж','қыздар — девушки','сөздер — слова'],['глухой: п, к, қ, т, с','кітаптар — книги','мектептер — школы']]},
 {id:'pl.11',slot:'full',type:'warning',text:'После р берём л: қарлар, жерлер. После л берём д: жолдар, көлдер. Не меняй эти две строки местами.'},
 {id:'pl.11b',slot:'full',type:'paragraph',text:'Если первая буква не сошлась: сейчас нужно именно «несколько». По концу этого слова для «несколько» выбирается л, д или т. Эту таблицу не переноси на «чей», «где», «откуда» или другой вопрос.'},
 {id:'pl.11c',slot:'full',type:'paragraph',text:'Выбор «несколько» состоит из двух независимых частей. Сначала первая буква: после гласного, после й и после р берём л; после л, после м, н или ң и после з или ж берём д; после глухого берём т. Потом гласная ряда: задний ряд а, передний е. Поэтому балалар, адамдар, көлдер, кітаптар, мектептер. Эта таблица только про «несколько» и не является правилом для всех добавок. После м у «несколько» буква д: адамдар. У «чей» буква н: адамның. У «откуда» буква н: адамнан. Не переноси группы «несколько» на «чей». Сначала знаем вопрос, потом открываем таблицу этого вопроса. Если л, д или т уже верные, меняем только гласную ряда. Слово қол в учебный список форм не входит, поэтому отдельный пример «несколько» для него здесь не строим. После р буква л видна на учебном слове қарлар.'},
 {id:'pl.12',slot:'full',type:'paragraph',text:'Глухой конец в этом наборе: п, к, қ, т, с. Поэтому кітаптар и мектептер. У кітап перед -тар буква п остаётся п. Это не то изменение, которое бывает в «моя книга».'},
 {id:'pl.13',slot:'full',type:'subheading',text:'Эта таблица только про «несколько»'},
 {id:'pl.14',slot:'full',type:'paragraph',text:'Одно и то же слово адам после м даёт разные концы, потому что вопросы разные. Несколько людей — адамдар. Чей, от человека как владельца — адамның. От человека, откуда — адамнан. Не говори «после м всегда д» и не говори «после м всегда н».'},
 {id:'pl.15',slot:'full',type:'example',lemmaId:'n-адам',sequence:['GEN'],before:'адам',beforeRu:'человек',added:'-ның',after:'адамның',afterRu:'человека, чей'},
 {id:'pl.16',slot:'full',type:'example',lemmaId:'n-адам',sequence:['ABL'],before:'адам',beforeRu:'человек',added:'-нан',after:'адамнан',afterRu:'от человека'},
 {id:'pl.17',slot:'full',type:'try',prompt:'Нужно сказать «дети», несколько. Что выбрать?',options:['балалар','балаға'],answer:'балалар',good:'балалар — дети.',bad:'балаға — ребёнку или к ребёнку. Для нескольких детей нужно балалар.'},
 {id:'pl.18',slot:'full',type:'term',text:'В учебниках это множественное число. Название для первого ответа не нужно.'},
 {id:'pl.20',slot:'full',type:'paragraph',text:'Название: несколько предметов. Новичковая задача: нужно сказать несколько предметов. Сначала этот смысл, затем конец по краю и по ряду. Пример: балалар. Часть первая, начальная буква: после гласного л; после й и после согласного у л; после р л; после л д; после м, н или ң д; после з или ж д; после глухого т. Часть вторая, гласная: задний ряд а, передний е. Поэтому балалар, адамдар, көлдер, кітаптар, мектептер. Образец источника, не задание: қолдар. Эта таблица только про «несколько» и не закон всех добавок. После носового рядом адамдар, адамның, адамнан, адам ба и адаммын. Сначала знаем вопрос, потом открываем таблицу этого вопроса. Три коротких контраста: балалар, адамдар, кітаптар. Край делим на группу л, группу д и группу т. Нельзя после м автоматически брать н только потому, что у «несколько» там д. Нельзя считать любое р поводом для д: у «несколько» после р буква л. Группы «несколько» на «чей» не переносим. Если л, д или т уже верные, меняем только гласную ряда.'},
 {id:'pl.21',slot:'full',type:'paragraph',text:'Название в учебнике: множественное число. Действие: сначала выбрать смысл «несколько», затем нужный вариант по краю и по ряду гласных. Пример: балалар. Сначала ученик знает этот вопрос и только потом открывает таблицу именно его. Показ из трёх контрастов: балалар, адамдар, кітаптар. Край классифицируют на группу л, группу д и группу т. Самостоятельный ответ — целая форма. Группы «несколько» нельзя переносить на «чей»: адамдар, адамның и адамнан — три разных вопроса.'},
 {id:'pl.19',slot:'contrast',type:'list',items:['балалар — несколько детей','балаға — ребёнку','адамдар — несколько людей','адамның — человека, когда он владелец','қарлар — после р буква л','жолдар — после л буква д']}
];
const nasalBlocks=[
 {id:'nas.1',slot:'opening',type:'subheading',text:'Сначала вопрос'},
 {id:'nas.2',slot:'opening',type:'paragraph',text:'Слово адам кончается на м. От этого м не появляется одно окончание на все случаи. Сначала решаем, что хотим сказать.'},
 {id:'nas.3',slot:'opening',type:'table',caption:'Один человек, разные вопросы',headers:['Что хотим сказать','Форма','По-русски'],rows:[['несколько','адамдар','люди'],['чей, от кого как владельца','адамның','человека'],['кого именно','адамды','этого человека'],['где','адамда','у человека'],['откуда, от кого','адамнан','от человека'],['с кем','адаммен','с человеком']]},
 {id:'nas.4',slot:'opening',type:'warning',text:'Нельзя сказать «после м, н или ң всегда н» или «всегда д». Ответ зависит от вопроса.'},
 {id:'nas.4b',slot:'opening',type:'example',lemmaId:'n-қыз',sequence:['GEN'],before:'қыз',beforeRu:'девушка',added:'-дың',after:'қыздың',afterRu:'девушки'},
 {id:'nas.4c',slot:'opening',type:'example',lemmaId:'n-қыз',sequence:['ACC'],before:'қыз',beforeRu:'девушка',added:'-ды',after:'қызды',afterRu:'эту девушку'},
 {id:'nas.4d',slot:'opening',type:'example',lemmaId:'n-қыз',sequence:['ABL'],before:'қыз',beforeRu:'девушка',added:'-дан',after:'қыздан',afterRu:'от девушки'},
 {id:'nas.4e',slot:'opening',type:'example',lemmaId:'n-қыз',sequence:['INS'],before:'қыз',beforeRu:'девушка',added:'-бен',after:'қызбен',afterRu:'с девушкой'},
 {id:'nas.4f',slot:'opening',type:'example',lemmaId:'n-мектеп',sequence:['GEN'],before:'мектеп',beforeRu:'школа',added:'-тің',after:'мектептің',afterRu:'школы'},
 {id:'nas.4g',slot:'opening',type:'example',lemmaId:'n-мектеп',sequence:['ACC'],before:'мектеп',beforeRu:'школа',added:'-ті',after:'мектепті',afterRu:'эту школу'},
 {id:'nas.4h',slot:'opening',type:'example',lemmaId:'n-мектеп',sequence:['ABL'],before:'мектеп',beforeRu:'школа',added:'-тен',after:'мектептен',afterRu:'из школы'},
 {id:'nas.4i',slot:'opening',type:'example',lemmaId:'n-мектеп',sequence:['INS'],before:'мектеп',beforeRu:'школа',added:'-пен',after:'мектеппен',afterRu:'школой'},
 {id:'nas.4j',slot:'opening',type:'example',lemmaId:'n-әке',sequence:['GEN'],before:'әке',beforeRu:'отец',added:'-нің',after:'әкенің',afterRu:'отца'},
 {id:'nas.4k',slot:'opening',type:'example',lemmaId:'n-әке',sequence:['ACC'],before:'әке',beforeRu:'отец',added:'-ні',after:'әкені',afterRu:'этого отца'},
 {id:'nas.4l',slot:'opening',type:'example',lemmaId:'n-әке',sequence:['ABL'],before:'әке',beforeRu:'отец',added:'-ден',after:'әкеден',afterRu:'от отца'},
 {id:'nas.4m',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['GEN'],before:'мұғалім',beforeRu:'учитель',added:'-нің',after:'мұғалімнің',afterRu:'учителя'},
 {id:'nas.4n',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['ACC'],before:'мұғалім',beforeRu:'учитель',added:'-ді',after:'мұғалімді',afterRu:'этого учителя'},
 {id:'nas.4o',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['ABL'],before:'мұғалім',beforeRu:'учитель',added:'-нен',after:'мұғалімнен',afterRu:'от учителя'},
 {id:'nas.5',slot:'full',type:'subheading',text:'Чей или чего'},
 {id:'nas.6',slot:'full',type:'paragraph',text:'Здесь называем владельца или то, к чему относится вещь. баланың — ребёнка. Вместе с формой вещи: баланың кітабы — книга ребёнка. Кітабы здесь значит «его или её книга». Это не то же самое, что баласы — «его или её ребёнок», и не то же самое, что балам — «мой ребёнок».'},
 {id:'nas.7',slot:'full',type:'example',lemmaId:'n-бала',sequence:['GEN'],before:'бала',beforeRu:'ребёнок',added:'-ның',after:'баланың',afterRu:'ребёнка'},
 {id:'nas.8',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3'],before:'кітап',beforeRu:'книга',added:'-ы, п меняется на б',after:'кітабы',afterRu:'его или её книга'},
 {id:'nas.9',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_3'],before:'бала',beforeRu:'ребёнок',added:'-сы',after:'баласы',afterRu:'его или её ребёнок'},
 {id:'nas.10',slot:'full',type:'paragraph',text:'Другие обычные концы этого вопроса: үйдің — дома, мектептің — школы, қаланың — города. Гласная а или е и первая буква н, д или т выбираются по слову. Сначала всё равно вопрос «чей или чего», не таблица «несколько».'},
 {id:'nas.10b',slot:'full',type:'ordered-list',items:['Сначала реши смысл: чей или чего.','Возьми уже готовое текущее слово.','Посмотри, чем оно сейчас кончается.','Определи ряд гласных этого слова.','Только потом выбери первую букву из группы этого вопроса: н, д или т. Эту группу не переноси на «несколько» или «откуда» как общий закон.']},
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
 {id:'nas.22',slot:'full',type:'paragraph',text:'Заголовок: Откуда? От кого или чего? Человек выходит из дома или получает вещь от кого-то. Первый слой: откуда, от кого, от чего. Дополнительные смыслы исходного падежа в полном описании: причина, сравнение и материал. Первые задания их не спрашивают. үйден — из дома. адамнан — от человека. қаладан — из города. мектептен — из школы.'},
 {id:'nas.23',slot:'full',type:'example',lemmaId:'n-үй',sequence:['ABL'],before:'үй',beforeRu:'дом',added:'-ден',after:'үйден',afterRu:'из дома'},
 {id:'nas.24',slot:'full',type:'example',lemmaId:'n-адам',sequence:['ABL'],before:'адам',beforeRu:'человек',added:'-нан',after:'адамнан',afterRu:'от человека'},
 {id:'nas.25',slot:'full',type:'example',lemmaId:'n-қала',sequence:['ABL'],before:'қала',beforeRu:'город',added:'-дан',after:'қаладан',afterRu:'из города'},
 {id:'nas.26',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['ABL'],before:'мектеп',beforeRu:'школа',added:'-тен',after:'мектептен',afterRu:'из школы'},
 {id:'nas.27',slot:'full',type:'paragraph',text:'После м, н или ң в этом вопросе первая буква н: адамнан. Это не адамдар и не адамның. Первый слой: откуда, от кого, от чего, исходная точка. В полном описании бывают ещё материал, сравнение и управление отдельных глаголов. В первые задания их не ставим и не сводим всё к одному русскому «из».'},
 {id:'nas.28',slot:'full',type:'subheading',text:'С кем'},
 {id:'nas.29',slot:'full',type:'paragraph',text:'Человек идёт не один. адаммен — с человеком. Это совместность. Сначала учим её отдельно от средства.'},
 {id:'nas.30',slot:'full',type:'example',lemmaId:'n-адам',sequence:['INS'],before:'адам',beforeRu:'человек',added:'-мен',after:'адаммен',afterRu:'с человеком'},
 {id:'nas.31',slot:'full',type:'subheading',text:'Чем, с помощью чего'},
 {id:'nas.32',slot:'full',type:'paragraph',text:'Другая ситуация: называем средство. сумен — водой, когда вода и есть средство. кітаппен — книгой. Окончание то же по виду, но задание должно прямо сказать «чем» или «с кем». По одной добавке эти два смысла не угадываем.'},
 {id:'nas.33',slot:'full',type:'example',lemmaId:'n-су',sequence:['INS'],before:'су',beforeRu:'вода',added:'-мен',after:'сумен',afterRu:'водой'},
 {id:'nas.34',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['INS'],before:'кітап',beforeRu:'книга',added:'-пен',after:'кітаппен',afterRu:'книгой'},
 {id:'nas.35',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['INS'],before:'мектеп',beforeRu:'школа',added:'-пен',after:'мектеппен',afterRu:'школой'},
 {id:'nas.36',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['INS'],before:'қыз',beforeRu:'девушка',added:'-бен',after:'қызбен',afterRu:'с девушкой'},
 {id:'nas.37',slot:'full',type:'warning',text:'В -мен, -бен и -пен буква е остаётся. адаммен не превращается в форму с а. После гласного, й, р, л или носового обычно м: адаммен. После з или ж буква б: қызбен. После глухого конца п: кітаппен, мектеппен.'},
 {id:'nas.37b',slot:'full',type:'paragraph',text:'В источнике есть готовые обороты. Это не отдельные задания и не новые слова банка: қаламмен жазу — писать ручкой; күрекпен қазу — копать лопатой.'},
 {id:'nas.37c',slot:'full',type:'paragraph',text:'Кроме средства и совместности в полном описании бывают способ, путь, транспорт, время или причина. В первых заданиях спрашиваем прямо «чем» или «с кем» и эти смыслы не сливаем. После гласного, й, р, л или носового обычно мен. После з или ж — бен. После глухого — пен.'},
 {id:'nas.37d',slot:'full',type:'paragraph',text:'Конец -мен, -бен или -пен на названии вещи — это «чем» или «с кем». Отдельное слово мен, бен или пен в роли «и» — другая единица, не эта форма. Буква е здесь фиксирована: не ман, не бан и не пан.'},
 {id:'nas.47',slot:'full',type:'subheading',text:'Первая буква по семи концам и девяти вопросам'},
 {id:'nas.48',slot:'full',type:'paragraph',text:'Таблица целиком относится только к этим девяти вопросам. Она не закон для любого добавления. Окончание -шы само не становится -жы. После м, н или ң нет одной группы на все вопросы. На адам рядом стоят адамдар, адамның, адамды, адамда, адамнан, адам ба, адаммын, адамбыз и адаммен. Сравниваем разные вопросы на одной основе. Опора «откуда» для адамнан уже есть в этом уроке.'},
 {id:'nas.49',slot:'full',type:'table',caption:'Семь концов и девять вопросов. Каждая клетка — первая буква добавки',headers:['Чем кончается слово','несколько','чей или чего','кого или что именно','где','откуда','вопрос ли','я','мы','чем или с кем'],rows:[['гласный','л','н','н','д','д','м','м','м','м'],['й или согласный у','л','д','д','д','д','м','м','м','м'],['р','л','д','д','д','д','м','м','м','м'],['л','д','д','д','д','д','м','м','м','м'],['м, н или ң','д','н','д','д','н','б','м','б','м'],['з или ж','д','д','д','д','д','б','б','б','б'],['глухой','т','т','т','т','т','п','п','п','п']]},
 {id:'nas.38',slot:'full',type:'subheading',text:'Похожие слова, другой вопрос'},
 {id:'nas.39',slot:'full',type:'paragraph',text:'Рядом с адам есть ещё три формы. адаммын — я человек. адамбыз — мы люди. адам ба — это вопрос «человек ли». Они не отвечают на «чей», «откуда» или «с кем». Пробел в адам ба обязателен: частица пишется отдельно.'},
 {id:'nas.40',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_1SG'],before:'адам',beforeRu:'человек',added:'-мын',after:'адаммын',afterRu:'я человек'},
 {id:'nas.41',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_1PL'],before:'адам',beforeRu:'человек',added:'-быз',after:'адамбыз',afterRu:'мы люди'},
 {id:'nas.42',slot:'full',type:'example',lemmaId:'n-адам',sequence:['Q'],before:'адам',beforeRu:'человек',added:' ба',after:'адам ба',afterRu:'человек ли'},
 {id:'nas.43',slot:'full',type:'try',prompt:'Нужно сказать «от человека». Что выбрать?',options:['адамнан','адамның','адамдар'],answer:'адамнан',good:'адамнан — от человека.',bad:'адамның — человека как владельца. адамдар — несколько людей. От человека: адамнан.'},
 {id:'nas.44',slot:'full',type:'try',prompt:'Нужно сказать «с человеком», вместе. Что выбрать?',options:['адаммен','адам ба'],answer:'адаммен',good:'адаммен — с человеком.',bad:'адам ба — вопрос «человек ли». Вместе с человеком: адаммен.'},
 {id:'nas.45',slot:'full',type:'term',text:'В учебниках у этих вопросов разные названия. Для первого ответа достаточно самого вопроса: чей, кого именно, откуда, с кем или чем.'},
 {id:'nas.50',slot:'full',type:'paragraph',text:'Заголовок: Чей? Чего? Это отношение между двумя именами: кто владелец и какая вещь. Форма «чей» стоит на имени владельца. Вопросы к ней: кімнің? ненің? В явной паре вещь получает свой конец: адамның кітабы. «Чей» помечает владельца. «Чей предмет» помечает саму вещь по лицу владельца. После носового «чей» может начинаться на н, адамның, а «кого именно» на д, адамды. Различие задаёт вопрос, не один звук. Пару показываем целиком, даже если карточка сейчас спрашивает одну часть.'},
 {id:'nas.51',slot:'full',type:'paragraph',text:'Заголовок: Кого? Что именно? Это прямой объект, когда человек или предмет конкретный. Прочитать эту книгу — кітапты. Увидеть этого человека — адамды. Эту песню — әнді. Эту школу — мектепті. Для первого шага не оставляем расплывчатое «просто книгу», если из него не ясно, что предмет определён. Так вопрос становится однозначным. Голое слово без этого конца — другой случай: тренажёр заранее задаёт ситуацию, где нужен именно этот вопрос. После «его или её книга» получается кітабын.'},
 {id:'nas.52',slot:'full',type:'paragraph',text:'«Чей или чего» стоит на имени владельца. Вопросы к владельцу: кімнің и ненің. Основной способ назвать отношение — форма владельца вместе с формой вещи: адамның кітабы. Минимальная модель: владелец и предмет. В объяснении показываем пару целиком, даже если карточка спрашивает одну часть. «Кого или чего» здесь — отношение двух имён, не «кого именно». «Чей» помечает владельца. Конец на самой вещи помечает предмет по лицу владельца. После носового «чей» начинается на н, адамның, а «кого именно» на д, адамды. Различие задаёт вопрос, не один звук.'},
 {id:'nas.53',slot:'full',type:'paragraph',text:'Если действие направлено прямо на конкретный предмет или человека, именно его читают, видят или берут: прочитать эту книгу, увидеть этого человека. Для первого шага не оставляем «просто книгу», из которого не ясно, что предмет определён. Так операция становится однозначной. Шаги: сначала смысл «кого или что именно»; затем уже получившееся слово; затем край и ряд; затем конец, а после «его или её» отдельное н, кітабын. Неопределённый предмет без этого конца источник допускает, поэтому задание заранее говорит, что нужен именно этот вопрос. Рядом әнді, кітапты и мектепті.'},
 {id:'nas.54',slot:'full',type:'paragraph',text:'Две вывески одного конца, отдельные контрасты. «Чем?» — средство. «С кем? С чем вместе?» — совместность. В полном описании ещё бывают способ, путь, время и причина, но первые задания спрашивают прямо и эти смыслы не сливают. После гласного, после й, после р, после л или носового — мен. После з или ж — бен. После глухого — пен. Буква е фиксирована: не ман, не бан и не пан. адаммен не становится адамман из-за заднего ряда. Конец на названии вещи не равен отдельному слову «и», даже если буквы мен, бен или пен похожи. Опора «откуда» для адамнан уже в этом уроке: после носового и после «его или её» здесь нан или нен, адамнан и кітабынан.'},
 {id:'nas.55',slot:'full',type:'paragraph',text:'Название: исходный. Опора «откуда?» уже есть в этом уроке. После носового края и после «его или её» действует нан или нен. адамнан. кітабынан. Ключевой набор после носового на адам: адамдар, адамның, адамды, адамда, адамнан, адам ба, адаммын, адамбыз, адаммен. После м, н или ң нет одной группы на все вопросы. Название: вопросительная частица. Задача — построить вопрос, не «не делать». адам ба. Совместность — контрпример против слишком широкого правила ряда: письменные мен, бен и пен не меняют е на а. После гласного, й, р, л или носового — мен. После з или ж — бен. После глухого и после записанного глухого заимствования — пен. Ключевая граница: е остаётся. В первом случае это форма вещи со смыслом «чем» или «с кем». Во втором — отдельная соединительная единица «и». Для «кого именно» шаги такие: смотрим, не собрана ли уже форма «его или её»; если да, буква н, кітабын; иначе обычный ряд и гласная по ряду. Этот вопрос не равен голому предмету без конца. Неопределённый предмет без конца источник допускает, поэтому тренажёр заранее задаёт ситуацию, где конец нужен. Для первого шага не даём расплывчатое «просто читать книгу», если из него не ясно, что книга определённая. Различие задаёт вопрос, не один звук. Ілік вместе с тәуелдік — основной способ назвать принадлежность: адамның кітабы. Сравниваем вопрос при максимально одинаковой основе.'},
 {id:'nas.46',slot:'contrast',type:'list',items:['адамның — чей, владелец','адамды — этого человека','адамнан — от человека','адаммен — с человеком','адамдар — несколько людей','адаммын — я человек','адам ба — человек ли']}
];
const personBlocks=[
 {id:'per.1',slot:'opening',type:'subheading',text:'Кто я, не чья вещь'},
 {id:'per.2',slot:'opening',type:'paragraph',text:'Человек говорит, кто он сам. адаммын — я человек. Это не «мой человек» и не «моя книга».'},
 {id:'per.3',slot:'opening',type:'example',lemmaId:'n-адам',sequence:['COP_1SG'],before:'адам',beforeRu:'человек',added:'-мын',after:'адаммын',afterRu:'я человек'},
 {id:'per.4',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['COP_1SG'],before:'бала',beforeRu:'ребёнок',added:'-мын',after:'баламын',afterRu:'я ребёнок'},
 {id:'per.5',slot:'opening',type:'example',lemmaId:'n-бала',sequence:['POSS_1SG'],before:'бала',beforeRu:'ребёнок',added:'-м',after:'балам',afterRu:'мой ребёнок'},
 {id:'per.6',slot:'opening',type:'warning',text:'баламын — я ребёнок. балам — мой ребёнок. Одинаковое «я» в русском не делает эти формы одной.'},
 {id:'per.7',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['COP_1SG'],before:'мұғалім',beforeRu:'учитель',added:'-мін',after:'мұғаліммін',afterRu:'я учитель'},
 {id:'per.8',slot:'opening',type:'example',lemmaId:'n-мұғалім',sequence:['POSS_1SG'],before:'мұғалім',beforeRu:'учитель',added:'-ім, к меняется на г',after:'мұғалімім',afterRu:'мой учитель'},
 {id:'per.9',slot:'full',type:'subheading',text:'Я'},
 {id:'per.10',slot:'full',type:'paragraph',text:'Для «я» конец бывает -мын, -мін, -бын, -бін, -пын, -пін. Буква ы или і идёт по гласным слова. Первая буква м, б или п идёт по концу слова. После м, н или ң у «я» остаётся м: адаммын, мұғаліммін. После з буква б: қызбын. После глухого п: қонақпын.'},
 {id:'per.11',slot:'full',type:'example',lemmaId:'n-әке',sequence:['COP_1SG'],before:'әке',beforeRu:'отец',added:'-мін',after:'әкемін',afterRu:'я отец'},
 {id:'per.12',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['COP_1SG'],before:'қыз',beforeRu:'девушка',added:'-бын',after:'қызбын',afterRu:'я девушка'},
 {id:'per.13',slot:'full',type:'example',lemmaId:'n-егіз',sequence:['COP_1SG'],before:'егіз',beforeRu:'близнец',added:'-бін',after:'егізбін',afterRu:'я близнец'},
 {id:'per.14',slot:'full',type:'example',lemmaId:'n-қонақ',sequence:['COP_1SG'],before:'қонақ',beforeRu:'гость',added:'-пын',after:'қонақпын',afterRu:'я гость'},
 {id:'per.15',slot:'full',type:'example',lemmaId:'n-әріптес',sequence:['COP_1SG'],before:'әріптес',beforeRu:'коллега',added:'-пін',after:'әріптеспін',afterRu:'я коллега'},
 {id:'per.16',slot:'full',type:'example',lemmaId:'n-дос',sequence:['COP_1SG'],before:'дос',beforeRu:'друг',added:'-пын',after:'доспын',afterRu:'я друг'},
 {id:'per.17',slot:'full',type:'example',lemmaId:'n-ұл',sequence:['COP_1SG'],before:'ұл',beforeRu:'сын',added:'-мын',after:'ұлмын',afterRu:'я сын'},
 {id:'per.18',slot:'full',type:'example',lemmaId:'n-сіңлі',sequence:['COP_1SG'],before:'сіңлі',beforeRu:'младшая сестра',added:'-мін',after:'сіңлімін',afterRu:'я младшая сестра'},
 {id:'per.19',slot:'full',type:'example',lemmaId:'n-аға',sequence:['COP_1SG'],before:'аға',beforeRu:'старший брат',added:'-мын',after:'ағамын',afterRu:'я старший брат'},
 {id:'per.20',slot:'full',type:'subheading',text:'Мы'},
 {id:'per.21',slot:'full',type:'paragraph',text:'Для «мы» похожий конец, но другая буква в начале. После м, н или ң у «мы» уже б, не м: адамбыз, мұғалімбіз. Поэтому адаммын и адамбыз нельзя выбрать одной привычкой «после м всегда м».'},
 {id:'per.22',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_1PL'],before:'адам',beforeRu:'человек',added:'-быз',after:'адамбыз',afterRu:'мы люди'},
 {id:'per.23',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['COP_1PL'],before:'мұғалім',beforeRu:'учитель',added:'-біз',after:'мұғалімбіз',afterRu:'мы учителя'},
 {id:'per.24',slot:'full',type:'example',lemmaId:'n-бала',sequence:['COP_1PL'],before:'бала',beforeRu:'ребёнок',added:'-мыз',after:'баламыз',afterRu:'мы дети'},
 {id:'per.25',slot:'full',type:'example',lemmaId:'n-әке',sequence:['COP_1PL'],before:'әке',beforeRu:'отец',added:'-міз',after:'әкеміз',afterRu:'мы отцы'},
 {id:'per.26',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['COP_1PL'],before:'қыз',beforeRu:'девушка',added:'-быз',after:'қызбыз',afterRu:'мы девушки'},
 {id:'per.27',slot:'full',type:'example',lemmaId:'n-қонақ',sequence:['COP_1PL'],before:'қонақ',beforeRu:'гость',added:'-пыз',after:'қонақпыз',afterRu:'мы гости'},
 {id:'per.28',slot:'full',type:'example',lemmaId:'n-дос',sequence:['COP_1PL'],before:'дос',beforeRu:'друг',added:'-пыз',after:'доспыз',afterRu:'мы друзья'},
 {id:'per.29',slot:'full',type:'subheading',text:'Ты и Вы'},
 {id:'per.30',slot:'full',type:'paragraph',text:'«Ты» здесь -сың или -сің. Вежливое «Вы» — -сыз или -сіз. Несколько людей на «ты» — -сыңдар или -сіңдер. Вежливое «Вы» о нескольких — -сыздар или -сіздер.'},
 {id:'per.31',slot:'full',type:'example',lemmaId:'n-бала',sequence:['COP_2SG'],before:'бала',beforeRu:'ребёнок',added:'-сың',after:'баласың',afterRu:'ты ребёнок'},
 {id:'per.32',slot:'full',type:'example',lemmaId:'n-бала',sequence:['COP_2POL'],before:'бала',beforeRu:'ребёнок',added:'-сыз',after:'баласыз',afterRu:'Вы ребёнок'},
 {id:'per.33',slot:'full',type:'example',lemmaId:'n-бала',sequence:['COP_2PL'],before:'бала',beforeRu:'ребёнок',added:'-сыңдар',after:'баласыңдар',afterRu:'вы дети'},
 {id:'per.34',slot:'full',type:'example',lemmaId:'n-бала',sequence:['COP_2PL_POL'],before:'бала',beforeRu:'ребёнок',added:'-сыздар',after:'баласыздар',afterRu:'Вы дети'},
 {id:'per.35',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['COP_2SG'],before:'мұғалім',beforeRu:'учитель',added:'-сің',after:'мұғалімсің',afterRu:'ты учитель'},
 {id:'per.36',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['COP_2POL'],before:'мұғалім',beforeRu:'учитель',added:'-сіз',after:'мұғалімсіз',afterRu:'Вы учитель'},
 {id:'per.37',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['COP_2PL'],before:'мұғалім',beforeRu:'учитель',added:'-сіңдер',after:'мұғалімсіңдер',afterRu:'вы учителя'},
 {id:'per.38',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['COP_2PL_POL'],before:'мұғалім',beforeRu:'учитель',added:'-сіздер',after:'мұғалімсіздер',afterRu:'Вы учителя'},
 {id:'per.39',slot:'full',type:'example',lemmaId:'n-әке',sequence:['COP_2SG'],before:'әке',beforeRu:'отец',added:'-сің',after:'әкесің',afterRu:'ты отец'},
 {id:'per.40',slot:'full',type:'example',lemmaId:'n-әке',sequence:['COP_2POL'],before:'әке',beforeRu:'отец',added:'-сіз',after:'әкесіз',afterRu:'Вы отец'},
 {id:'per.41',slot:'full',type:'example',lemmaId:'n-адам',sequence:['COP_2SG'],before:'адам',beforeRu:'человек',added:'-сың',after:'адамсың',afterRu:'ты человек'},
 {id:'per.42',slot:'full',type:'example',lemmaId:'n-дос',sequence:['COP_2POL'],before:'дос',beforeRu:'друг',added:'-сыз',after:'доссыз',afterRu:'Вы друг'},
 {id:'per.43',slot:'full',type:'subheading',text:'Это вопрос'},
 {id:'per.44',slot:'full',type:'paragraph',text:'Вопрос «ли» пишется отдельно: адам ба, бала ма, мұғалім бе, қонақ па. Буквы ма, ме, ба, бе, па, пе похожи на другие добавки, но здесь есть пробел и это вопрос, не имя вещи и не «не делать».'},
 {id:'per.45',slot:'full',type:'example',lemmaId:'n-адам',sequence:['Q'],before:'адам',beforeRu:'человек',added:' ба',after:'адам ба',afterRu:'человек ли'},
 {id:'per.46',slot:'full',type:'example',lemmaId:'n-бала',sequence:['Q'],before:'бала',beforeRu:'ребёнок',added:' ма',after:'бала ма',afterRu:'ребёнок ли'},
 {id:'per.47',slot:'full',type:'example',lemmaId:'n-әке',sequence:['Q'],before:'әке',beforeRu:'отец',added:' ме',after:'әке ме',afterRu:'отец ли'},
 {id:'per.48',slot:'full',type:'example',lemmaId:'n-мұғалім',sequence:['Q'],before:'мұғалім',beforeRu:'учитель',added:' бе',after:'мұғалім бе',afterRu:'учитель ли'},
 {id:'per.49',slot:'full',type:'example',lemmaId:'n-қыз',sequence:['Q'],before:'қыз',beforeRu:'девушка',added:' ба',after:'қыз ба',afterRu:'девушка ли'},
 {id:'per.50',slot:'full',type:'example',lemmaId:'n-қонақ',sequence:['Q'],before:'қонақ',beforeRu:'гость',added:' па',after:'қонақ па',afterRu:'гость ли'},
 {id:'per.51',slot:'full',type:'example',lemmaId:'n-әріптес',sequence:['Q'],before:'әріптес',beforeRu:'коллега',added:' пе',after:'әріптес пе',afterRu:'коллега ли'},
 {id:'per.52',slot:'full',type:'example',lemmaId:'n-егіз',sequence:['Q'],before:'егіз',beforeRu:'близнец',added:' бе',after:'егіз бе',afterRu:'близнец ли'},
 {id:'per.53',slot:'full',type:'example',lemmaId:'n-аға',sequence:['Q'],before:'аға',beforeRu:'старший брат',added:' ма',after:'аға ма',afterRu:'старший брат ли'},
 {id:'per.54',slot:'full',type:'example',lemmaId:'n-сіңлі',sequence:['Q'],before:'сіңлі',beforeRu:'младшая сестра',added:' ме',after:'сіңлі ме',afterRu:'младшая сестра ли'},
 {id:'per.55',slot:'full',type:'warning',text:'После м, н или ң три разных ответа: адаммын — я человек, адамбыз — мы люди, адам ба — человек ли. Одна привычка «после м» их не выбирает.'},
 {id:'per.55b',slot:'full',type:'paragraph',text:'Проверка «я, мы, ты» на новых словах пока честно не закрывается: для неё не хватает новых учебных пар. Одни вопросы «ли» этот навык не доказывают. Это не владение темой. Итог проверки говорят по отдельным вопросам, а не фразой «лицо освоено».'},
 {id:'per.55c',slot:'full',type:'paragraph',text:'Для «мы» бывают концы -мыз, -міз, -быз, -біз, -пыз и -піз. В учебных словах: баламыз, әкеміз, қызбыз, мұғалімбіз, қонақпыз, әріптеспіз. Для «ты» концы -сың или -сің. Для вежливого «Вы» — -сыз или -сіз. Для нескольких «вы» — -сыңдар или -сіңдер. Для вежливых нескольких — -сыздар или -сіздер. «Я человек» не равно «мой предмет»: одна идея первого лица не делает окончания одинаковыми. Вопрос и «не делать» могут начинаться на те же буквы, но это разные действия и разные границы. Полный ряд «я, мы, ты» не заменяет короткую добавку к уже сказанному действию. Вопрос «ли» можно учить отдельно от «не делать». Заголовок шага: Кто я, кто мы, кто ты. Сначала лицо: я, мы, ты, Вы или несколько вы. Фраза задаёт смысл, а тренажёр проверяет форму слова: мен мұғаліммін — я учитель, біз мұғалімбіз — мы учителя, сіз мұғалімсіз — Вы учитель. Одинаковый край слова сам вопрос не выбирает.'},
 {id:'per.55d',slot:'full',type:'example',lemmaId:'n-әріптес',sequence:['COP_1PL'],before:'әріптес',beforeRu:'коллега',added:'-піз',after:'әріптеспіз',afterRu:'мы коллеги'},
 {id:'per.56',slot:'full',type:'subheading',text:'Не «не делать»'},
 {id:'per.57',slot:'full',type:'paragraph',text:'У глагола «не делать» буквы тоже бывают ба, бе, па, пе, ма, ме, но это другое действие и другое слово. жазба — не пиши. Это не вопрос «пишешь ли» и не «я человек».'},
 {id:'per.58',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['NEG'],before:'жаз',beforeRu:'писать',added:'-ба',after:'жазба',afterRu:'не пиши'},
 {id:'per.59',slot:'full',type:'try',prompt:'Нужно сказать «я человек». Что выбрать?',options:['адаммын','адамбыз','адам ба'],answer:'адаммын',good:'адаммын — я человек.',bad:'адамбыз — мы люди. адам ба — вопрос «человек ли». Я человек: адаммын.'},
 {id:'per.60',slot:'full',type:'try',prompt:'Нужно сказать «мой ребёнок», не «я ребёнок». Что выбрать?',options:['балам','баламын'],answer:'балам',good:'балам — мой ребёнок.',bad:'баламын — я ребёнок. Мой ребёнок: балам.'},
 {id:'per.63',slot:'full',type:'paragraph',text:'Отдельные концы. «Ты»: -сың или -сің, баласың. Вежливое «Вы»: -сыз или -сіз, мұғалімсіз. Несколько «вы»: -сыңдар или -сіңдер. Вежливые несколько: -сыздар или -сіздер. «Я»: адаммын, мұғаліммін, қызбын. «Мы»: адамбыз и баламыз. После м, н или ң нет одной группы на все вопросы. «Я человек» не равно «мой предмет»: одна идея первого лица не делает окончания одинаковыми. Вопрос и «не делать» могут делить буквы ма, ме, ба, бе, па и пе, но это разные действия и разные границы. Полный ряд «я, мы, ты» не заменяет короткую добавку к уже сказанному действию. Короткую серию вводят отдельно. Вопрос «ли» можно учить отдельно от «не делать». Слово «предикация» для первого шага не нужно: достаточно «кто я, кто мы, кто ты». Одинаковый край сам вопрос не выбирает. Одинаковые буквы не делают «чей предмет» и «кто я» одной задачей. Сказуемые я, мы, ты и вы здесь не оцениваются. Проверка одних вопросов не оценивает «я, мы, ты»: среди отложенных основ нет готовых пар для этого, и одни вопросы этот навык не закрывают. На экране смысл задаёт фраза: мен мұғаліммін — я учитель, біз мұғалімбіз — мы учителя, сіз мұғалімсіз — Вы учитель. Тренажёр проверяет форму слова, а смысл держит эта фраза. Начинающий контраст: адам ба — вопрос, жазба — «не делать».'},
 {id:'per.64',slot:'full',type:'paragraph',text:'«Я человек» не равно «мой предмет». Буквы ма, ме, ба, бе, па и пе совпадают у вопроса и у «не делать», но «не делать» — отрицание глагола, и граница другая. Короткую серию после глагола вводят отдельной конструкцией. Она не заменяет полный ряд «я, мы, ты». Проверка одних вопросов не закрывает «я, мы, ты»: среди отложенных основ нет готовых пар, и фразу «лицо освоено» здесь не ставят. Сначала выбираем, кто: мы, ты или Вы, и только потом конец. Экран показывает местоимение рядом с формой: мен мұғаліммін, біз мұғалімбіз, сіз мұғалімсіз. Образец источника, не задание банка: мен студентпін. Тренажёр проверяет форму слова, а смысл задаёт эта фраза. Одинаковый край не выбирает вопрос. «Чей предмет» говорит, чья вещь и какое лицо владельца. «Кто я» говорит, кто сам человек. Жіктік — лицо того, кто назван, не принадлежность вещи.'},
 {id:'per.61',slot:'contrast',type:'list',items:['баламын — я ребёнок','балам — мой ребёнок','мұғаліммін — я учитель','мұғалімім — мой учитель','адаммын — я','адамбыз — мы','адам ба — вопрос','жазба — не пиши']},
 {id:'per.62',slot:'full',type:'term',text:'В учебниках это личные окончания при имени и отдельная вопросительная частица. Для первого ответа достаточно: я, мы, ты, Вы или вопрос.'}
];
const chainBlocks=[
 {id:'ch.1',slot:'opening',type:'subheading',text:'Шаг за шагом'},
 {id:'ch.2',slot:'opening',type:'paragraph',text:'Длинное слово собирается не от первого слова сразу. После каждого шага работаем уже с тем, что получилось.'},
 {id:'ch.3',slot:'opening',type:'example',lemmaId:'n-үй',sequence:['PL'],before:'үй',beforeRu:'дом',added:'-лер',after:'үйлер',afterRu:'дома'},
 {id:'ch.4',slot:'opening',type:'example',lemmaId:'n-үй',sequence:['PL','POSS_1PL'],before:'үй',beforeRu:'дом',added:'-іміз после үйлер',after:'үйлеріміз',afterRu:'наши дома'},
 {id:'ch.5',slot:'opening',type:'example',lemmaId:'n-үй',sequence:['PL','POSS_1PL','ABL'],before:'үй',beforeRu:'дом',added:'-ден после үйлеріміз',after:'үйлерімізден',afterRu:'из наших домов'},
 {id:'ch.6',slot:'opening',type:'paragraph',text:'Перед последним шагом слово үйлеріміз кончается на з. Отсюда -ден, не от голого үй.'},
 {id:'ch.7',slot:'full',type:'subheading',text:'Его или её, потом вопрос'},
 {id:'ch.8',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3'],before:'кітап',beforeRu:'книга',added:'-ы, п меняется на б',after:'кітабы',afterRu:'его или её книга'},
 {id:'ch.9',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','DAT'],before:'кітап',beforeRu:'книга',added:'-на',after:'кітабына',afterRu:'к его или её книге'},
 {id:'ch.10',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','ACC'],before:'кітап',beforeRu:'книга',added:'-н',after:'кітабын',afterRu:'его или её книгу'},
 {id:'ch.11',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','LOC'],before:'кітап',beforeRu:'книга',added:'-нда',after:'кітабында',afterRu:'в его или её книге'},
 {id:'ch.12',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_3','ABL'],before:'кітап',beforeRu:'книга',added:'-нан',after:'кітабынан',afterRu:'от его или её книги'},
 {id:'ch.13',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['POSS_1SG','DAT'],before:'кітап',beforeRu:'книга',added:'-а после кітабым',after:'кітабыма',afterRu:'к моей книге'},
 {id:'ch.14',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['PL','LOC'],before:'кітап',beforeRu:'книга',added:'-да после кітаптар',after:'кітаптарда',afterRu:'в книгах'},
 {id:'ch.15',slot:'full',type:'example',lemmaId:'n-кітап',sequence:['PL','POSS_1PL','ABL'],before:'кітап',beforeRu:'книга',added:'-дан после кітаптарымыз',after:'кітаптарымыздан',afterRu:'из наших книг'},
 {id:'ch.16',slot:'full',type:'subheading',text:'Где внутри слова меняется буква'},
 {id:'ch.17',slot:'full',type:'paragraph',text:'У мектеп перед гласной добавкой п становится б. Сначала мектебі — его или её школа. Уже от мектебі идём дальше.'},
 {id:'ch.18',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['POSS_3'],before:'мектеп',beforeRu:'школа',added:'-і, п меняется на б',after:'мектебі',afterRu:'его или её школа'},
 {id:'ch.19',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['POSS_3','DAT'],before:'мектеп',beforeRu:'школа',added:'-не',after:'мектебіне',afterRu:'к его или её школе'},
 {id:'ch.20',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['POSS_1SG','DAT'],before:'мектеп',beforeRu:'школа',added:'-е после мектебім',after:'мектебіме',afterRu:'к моей школе'},
 {id:'ch.21',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['PL','LOC'],before:'мектеп',beforeRu:'школа',added:'-де после мектептер',after:'мектептерде',afterRu:'в школах'},
 {id:'ch.22',slot:'full',type:'example',lemmaId:'n-мектеп',sequence:['PL','POSS_3','DAT'],before:'мектеп',beforeRu:'школа',added:'-не после мектептері',after:'мектептеріне',afterRu:'к его или её школам'},
 {id:'ch.23',slot:'full',type:'subheading',text:'Ещё несколько цепочек'},
 {id:'ch.24',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_1SG','DAT'],before:'бала',beforeRu:'ребёнок',added:'-а',after:'балама',afterRu:'моему ребёнку'},
 {id:'ch.25',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_3','DAT'],before:'бала',beforeRu:'ребёнок',added:'-на после баласы',after:'баласына',afterRu:'к его или её ребёнку'},
 {id:'ch.26',slot:'full',type:'example',lemmaId:'n-бала',sequence:['POSS_3','LOC'],before:'бала',beforeRu:'ребёнок',added:'-нда',after:'баласында',afterRu:'у его или её ребёнка'},
 {id:'ch.27',slot:'full',type:'example',lemmaId:'n-бала',sequence:['PL','LOC'],before:'бала',beforeRu:'ребёнок',added:'-да после балалар',after:'балаларда',afterRu:'у детей'},
 {id:'ch.28',slot:'full',type:'example',lemmaId:'n-бала',sequence:['PL','POSS_1PL','ABL'],before:'бала',beforeRu:'ребёнок',added:'-дан',after:'балаларымыздан',afterRu:'от наших детей'},
 {id:'ch.29',slot:'full',type:'example',lemmaId:'n-дос',sequence:['POSS_3','DAT'],before:'дос',beforeRu:'друг',added:'-на после досы',after:'досына',afterRu:'к его или её другу'},
 {id:'ch.30',slot:'full',type:'example',lemmaId:'n-дос',sequence:['POSS_2SG','ABL'],before:'дос',beforeRu:'друг',added:'-нан после досың',after:'досыңнан',afterRu:'от твоего друга'},
 {id:'ch.31',slot:'full',type:'example',lemmaId:'n-дос',sequence:['PL','POSS_1PL','ABL'],before:'дос',beforeRu:'друг',added:'-дан',after:'достарымыздан',afterRu:'от наших друзей'},
 {id:'ch.32',slot:'full',type:'example',lemmaId:'n-қала',sequence:['POSS_3','DAT'],before:'қала',beforeRu:'город',added:'-на после қаласы',after:'қаласына',afterRu:'в его или её город'},
 {id:'ch.33',slot:'full',type:'example',lemmaId:'n-қала',sequence:['PL','LOC'],before:'қала',beforeRu:'город',added:'-да после қалалар',after:'қалаларда',afterRu:'в городах'},
 {id:'ch.34',slot:'full',type:'example',lemmaId:'n-қала',sequence:['PL','POSS_1PL','ABL'],before:'қала',beforeRu:'город',added:'-дан',after:'қалаларымыздан',afterRu:'из наших городов'},
 {id:'ch.35',slot:'full',type:'example',lemmaId:'n-ат',sequence:['POSS_3','DAT'],before:'ат',beforeRu:'имя',added:'-на после аты',after:'атына',afterRu:'к его или её имени'},
 {id:'ch.36',slot:'full',type:'example',lemmaId:'n-ат',sequence:['PL','LOC'],before:'ат',beforeRu:'имя',added:'-да после аттар',after:'аттарда',afterRu:'в именах'},
 {id:'ch.37',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_3','DAT'],before:'үй',beforeRu:'дом',added:'-не после үйі',after:'үйіне',afterRu:'к его или её дому'},
 {id:'ch.38',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_1SG','DAT'],before:'үй',beforeRu:'дом',added:'-е после үйім',after:'үйіме',afterRu:'к моему дому'},
 {id:'ch.39',slot:'full',type:'example',lemmaId:'n-үй',sequence:['POSS_2SG','ABL'],before:'үй',beforeRu:'дом',added:'-нен после үйің',after:'үйіңнен',afterRu:'из твоего дома'},
 {id:'ch.40',slot:'full',type:'example',lemmaId:'n-үй',sequence:['PL','LOC'],before:'үй',beforeRu:'дом',added:'-де после үйлер',after:'үйлерде',afterRu:'в домах'},
 {id:'ch.41',slot:'full',type:'try',prompt:'Нужно «из наших домов». Последний шаг от үйлеріміз. Что получится?',options:['үйлерімізден','үйден'],answer:'үйлерімізден',good:'үйлерімізден — из наших домов.',bad:'үйден — из дома, ещё без «наши». Здесь уже үйлеріміз, поэтому үйлерімізден.'},
 {id:'ch.42',slot:'full',type:'warning',text:'В самостоятельном задании следующий конец заранее не показывают. Смотри на слово, которое уже есть на экране, и делай один шаг. Экран длинной цепочки показывает: что было, какой смысл выбран, что получилось, и только потом следующий шаг.'},
 {id:'ch.44',slot:'full',type:'paragraph',text:'После «его или её» для «куда или кому» берём -на или -не, не обычное -ға. После «мой» и «твой» — -а или -е. После «наш», «ваш» и у голого слова — обычный ряд ғ или г, қ или к. Для «кого именно» буква н стоит только после «его или её»: кітабын. Иначе обычный ряд. Для «где» после «его или её» — -нда или -нде, иначе -да или -де. Для «откуда» -нан или -нен после «его или её» и после носового конца, иначе -дан или -ден. Нельзя учить «после его или её всегда н»: «чей» и «с кем» проверяются отдельно. В цепочке үй, үйлер, үйлеріміз, үйлерімізден последний шаг видит з, не исходный й. В кітап, кітаптар, кітаптарымыз, кітаптарымыздан перед -тар буква п не становится б, потому что «несколько» начинается с согласного. В кітап, кітабы, кітабына сразу три вещи: у этого слова п меняется на б, смысл «его или её», и особое -на. Любые куски подряд без смысла не собираем: сначала значение и порядок, потом буквы. Для имени путь такой: основа, число, чей предмет, затем вопрос места или направления.'},
 {id:'ch.45',slot:'full',type:'paragraph',text:'Для имени обычный путь: основа, затем число, затем чей предмет, затем вопрос места или направления. Куски без смысла подряд не собираем: сначала значение и порядок, потом буквы. үй и «несколько» дают үйлер. Дальше текущее слово — үйлер, край р, не голое үй. үйлер и «наш» дают үйлеріміз. үйлеріміз и «откуда» дают үйлерімізден: последний шаг видит з, не исходный й. кітап и «его или её»: у этого слова п меняется на б, получается кітабы, затем «куда» даёт кітабына. Это сразу записанная замена, смысл «его или её» и особое на. кітап и «несколько» дают кітаптар: перед -тар п не становится б, потому что «несколько» начинается с согласного. Дальше кітаптарымыз и кітаптарымыздан. После «его или её» для «куда или кому» берём на или не. После «мой» и «твой» — а или е. После «наш», «ваш» и у голого слова — обычный ряд. Для «кого именно» буква н только после «его или её», иначе обычный ряд: кітабын против кітапты. Для «где» после «его или её» — нда или нде, иначе да или де. Для «откуда» нан или нен после «его или её» и после носового края, иначе дан или ден. Нельзя учить «после его или её всегда н»: «чей» и «с кем» проверяются отдельно. Экран длинной цепочки показывает, что было, какой смысл выбран, что получилось, какой теперь край, и только потом следующий шаг.'},
 {id:'ch.46',slot:'full',type:'paragraph',text:'Дом, затем несколько, затем наш: үйлер, потом үйлеріміз. Куски без смысла подряд не собираем: морфология здесь подчинена смыслу. Экран показывает выбранный смысл и обновлённый край перед следующим шагом. Ты выбрала обычный конец, но слово уже показывает, чья это вещь. Сначала это состояние, потом обычный звук. После «его или её» для «куда» берём на или не. После «мой» и «твой» — а или е. После «наш», «ваш» и у голого слова — обычный ряд по уже получившемуся слову.'},
 {id:'ch.43',slot:'contrast',type:'list',items:['үйден — из дома','үйлерімізден — из наших домов','кітапқа — к книге','кітабына — к его или её книге','мектепке — в школу','мектебіне — к его или её школе']}
];
const verbBlocks=[
 {id:'vb.1',slot:'opening',type:'subheading',text:'Сначала какое действие'},
 {id:'vb.2',slot:'opening',type:'paragraph',text:'У глагола тоже сначала смысл, потом буквы. «Не делать», «уже сделал», «если», «предмет через действие» и добавочное действие — разные задачи.'},
 {id:'vb.3',slot:'opening',type:'example',lemmaId:'v-жаз',sequence:['NEG'],before:'жаз',beforeRu:'писать',added:'-ба',after:'жазба',afterRu:'не пиши'},
 {id:'vb.4',slot:'opening',type:'example',lemmaId:'v-жаз',sequence:['PAST'],before:'жаз',beforeRu:'писать',added:'-ды',after:'жазды',afterRu:'написал'},
 {id:'vb.5',slot:'opening',type:'example',lemmaId:'v-кел',sequence:['PAST'],before:'кел',beforeRu:'приходить',added:'-ді',after:'келді',afterRu:'пришёл'},
 {id:'vb.6',slot:'opening',type:'example',lemmaId:'v-кел',sequence:['NEG'],before:'кел',beforeRu:'приходить',added:'-ме',after:'келме',afterRu:'не приходи'},
 {id:'vb.7',slot:'full',type:'subheading',text:'Не делать'},
 {id:'vb.8',slot:'full',type:'paragraph',text:'Концы: ма, ме, ба, бе, па, пе. После з или ж буква б: жазба, сезбе. После глухого п: кетпе, айтпа, жаппа. В остальных обычных случаях этого набора м: келме, барма, көрме, алма, ойнама, сөйлеме. Это не вопрос «делаешь ли»: вопрос пишется отдельно и про другое слово.'},
 {id:'vb.9',slot:'full',type:'example',lemmaId:'v-бар',sequence:['NEG'],before:'бар',beforeRu:'идти',added:'-ма',after:'барма',afterRu:'не иди'},
 {id:'vb.10',slot:'full',type:'example',lemmaId:'v-көр',sequence:['NEG'],before:'көр',beforeRu:'видеть',added:'-ме',after:'көрме',afterRu:'не смотри'},
 {id:'vb.11',slot:'full',type:'example',lemmaId:'v-кет',sequence:['NEG'],before:'кет',beforeRu:'уходить',added:'-пе',after:'кетпе',afterRu:'не уходи'},
 {id:'vb.12',slot:'full',type:'example',lemmaId:'v-айт',sequence:['NEG'],before:'айт',beforeRu:'сказать',added:'-па',after:'айтпа',afterRu:'не говори'},
 {id:'vb.13',slot:'full',type:'example',lemmaId:'v-ал',sequence:['NEG'],before:'ал',beforeRu:'брать',added:'-ма',after:'алма',afterRu:'не бери'},
 {id:'vb.14',slot:'full',type:'example',lemmaId:'v-ойна',sequence:['NEG'],before:'ойна',beforeRu:'играть',added:'-ма',after:'ойнама',afterRu:'не играй'},
 {id:'vb.15',slot:'full',type:'example',lemmaId:'v-сөйле',sequence:['NEG'],before:'сөйле',beforeRu:'говорить',added:'-ме',after:'сөйлеме',afterRu:'не говори'},
 {id:'vb.16',slot:'full',type:'example',lemmaId:'v-сез',sequence:['NEG'],before:'сез',beforeRu:'чувствовать',added:'-бе',after:'сезбе',afterRu:'не чувствуй'},
 {id:'vb.17',slot:'full',type:'subheading',text:'Уже сделал'},
 {id:'vb.18',slot:'full',type:'paragraph',text:'Концы: ды, ді, ты, ті. После глухого т: кетті, айтты, жапты. В остальных обычных случаях д: келді, жазды, барды, алды, ойнады, сөйледі. Это сообщение, что действие произошло. Не путай с формой, которая описывает предмет.'},
 {id:'vb.19',slot:'full',type:'example',lemmaId:'v-бар',sequence:['PAST'],before:'бар',beforeRu:'идти',added:'-ды',after:'барды',afterRu:'пошёл'},
 {id:'vb.20',slot:'full',type:'example',lemmaId:'v-ал',sequence:['PAST'],before:'ал',beforeRu:'брать',added:'-ды',after:'алды',afterRu:'взял'},
 {id:'vb.21',slot:'full',type:'example',lemmaId:'v-көр',sequence:['PAST'],before:'көр',beforeRu:'видеть',added:'-ді',after:'көрді',afterRu:'увидел'},
 {id:'vb.22',slot:'full',type:'example',lemmaId:'v-кет',sequence:['PAST'],before:'кет',beforeRu:'уходить',added:'-ті',after:'кетті',afterRu:'ушёл'},
 {id:'vb.23',slot:'full',type:'example',lemmaId:'v-айт',sequence:['PAST'],before:'айт',beforeRu:'сказать',added:'-ты',after:'айтты',afterRu:'сказал'},
 {id:'vb.24',slot:'full',type:'example',lemmaId:'v-ойна',sequence:['PAST'],before:'ойна',beforeRu:'играть',added:'-ды',after:'ойнады',afterRu:'играл'},
 {id:'vb.25',slot:'full',type:'example',lemmaId:'v-сөйле',sequence:['PAST'],before:'сөйле',beforeRu:'говорить',added:'-ді',after:'сөйледі',afterRu:'говорил'},
 {id:'vb.26',slot:'full',type:'example',lemmaId:'v-жап',sequence:['PAST'],before:'жап',beforeRu:'закрывать',added:'-ты',after:'жапты',afterRu:'закрыл'},
 {id:'vb.27',slot:'full',type:'subheading',text:'Кто сделал'},
 {id:'vb.28',slot:'full',type:'paragraph',text:'К уже готовому «сделал» или «если» можно добавить, кто делает действие. Это лицо участника действия, не «мой предмет» и не принадлежность, даже если буква похожа на конец формы «мой». Голое первое слово без уже собранного «сделал» или «если» так не заканчиваем. Это и не адаммын — «я человек». келдім — я пришёл. келдік — мы пришли. келдің — ты пришёл. келдіңіз — Вы пришли.'},
 {id:'vb.29',slot:'full',type:'example',lemmaId:'v-кел',sequence:['PAST','AGR_SHORT_1SG'],before:'кел',beforeRu:'приходить',added:'-м после келді',after:'келдім',afterRu:'я пришёл'},
 {id:'vb.30',slot:'full',type:'example',lemmaId:'v-кел',sequence:['PAST','AGR_SHORT_1PL'],before:'кел',beforeRu:'приходить',added:'-к после келді',after:'келдік',afterRu:'мы пришли'},
 {id:'vb.31',slot:'full',type:'example',lemmaId:'v-кел',sequence:['PAST','AGR_SHORT_2SG'],before:'кел',beforeRu:'приходить',added:'-ң после келді',after:'келдің',afterRu:'ты пришёл'},
 {id:'vb.32',slot:'full',type:'example',lemmaId:'v-кел',sequence:['PAST','AGR_SHORT_2POL'],before:'кел',beforeRu:'приходить',added:'-ңіз после келдің',after:'келдіңіз',afterRu:'Вы пришли'},
 {id:'vb.33',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['PAST','AGR_SHORT_1SG'],before:'жаз',beforeRu:'писать',added:'-м',after:'жаздым',afterRu:'я написал'},
 {id:'vb.34',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['PAST','AGR_SHORT_1PL'],before:'жаз',beforeRu:'писать',added:'-қ',after:'жаздық',afterRu:'мы написали'},
 {id:'vb.35',slot:'full',type:'example',lemmaId:'v-айт',sequence:['PAST','AGR_SHORT_1SG'],before:'айт',beforeRu:'сказать',added:'-м',after:'айттым',afterRu:'я сказал'},
 {id:'vb.36',slot:'full',type:'example',lemmaId:'v-айт',sequence:['PAST','AGR_SHORT_2POL'],before:'айт',beforeRu:'сказать',added:'-ңыз',after:'айттыңыз',afterRu:'Вы сказали'},
 {id:'vb.37',slot:'full',type:'example',lemmaId:'v-бар',sequence:['PAST','AGR_SHORT_1PL'],before:'бар',beforeRu:'идти',added:'-қ',after:'бардық',afterRu:'мы пошли'},
 {id:'vb.38',slot:'full',type:'example',lemmaId:'v-көр',sequence:['PAST','AGR_SHORT_2SG'],before:'көр',beforeRu:'видеть',added:'-ң',after:'көрдің',afterRu:'ты увидел'},
 {id:'vb.39',slot:'full',type:'subheading',text:'Если'},
 {id:'vb.40',slot:'full',type:'paragraph',text:'«Если» — удобный первый мостик, но форма не равна одному русскому слову «если» во всех случаях. Задний ряд берёт са, передний се. Начальная с здесь не прыгает на д, т, м, б или п. келсе — если придёт. жазса — если напишет. Образец из источника, не задание банка: Жаңбыр жауса, ... — если пойдёт дождь, ... Дальше можно добавить, кто: келсем — если я приду, айтсаң — если ты скажешь. «Если» — са или се. Это не единственное значение условного.'},
 {id:'vb.41',slot:'full',type:'example',lemmaId:'v-кел',sequence:['COND'],before:'кел',beforeRu:'приходить',added:'-се',after:'келсе',afterRu:'если придёт'},
 {id:'vb.42',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['COND'],before:'жаз',beforeRu:'писать',added:'-са',after:'жазса',afterRu:'если напишет'},
 {id:'vb.43',slot:'full',type:'example',lemmaId:'v-бар',sequence:['COND'],before:'бар',beforeRu:'идти',added:'-са',after:'барса',afterRu:'если пойдёт'},
 {id:'vb.44',slot:'full',type:'example',lemmaId:'v-айт',sequence:['COND'],before:'айт',beforeRu:'сказать',added:'-са',after:'айтса',afterRu:'если скажет'},
 {id:'vb.45',slot:'full',type:'example',lemmaId:'v-кел',sequence:['COND','AGR_SHORT_1SG'],before:'кел',beforeRu:'приходить',added:'-м после келсе',after:'келсем',afterRu:'если я приду'},
 {id:'vb.46',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['COND','AGR_SHORT_1PL'],before:'жаз',beforeRu:'писать',added:'-қ',after:'жазсақ',afterRu:'если мы напишем'},
 {id:'vb.47',slot:'full',type:'example',lemmaId:'v-айт',sequence:['COND','AGR_SHORT_2SG'],before:'айт',beforeRu:'сказать',added:'-ң',after:'айтсаң',afterRu:'если ты скажешь'},
 {id:'vb.48',slot:'full',type:'example',lemmaId:'v-сөйле',sequence:['COND'],before:'сөйле',beforeRu:'говорить',added:'-се',after:'сөйлесе',afterRu:'если будет говорить'},
 {id:'vb.49',slot:'full',type:'subheading',text:'Предмет через действие'},
 {id:'vb.50',slot:'full',type:'paragraph',text:'Келген адам — пришедший человек. Жазған сөз — написанное слово. Айтқан сөз — сказанное слово. Ойнаған бала — ребёнок, который играл. Это описание предмета, не сообщение «он пришёл» или «он написал».'},
 {id:'vb.51',slot:'full',type:'example',lemmaId:'v-кел',sequence:['PTCP_GAN'],before:'кел',beforeRu:'приходить',added:'-ген',after:'келген',afterRu:'пришедший'},
 {id:'vb.52',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['PTCP_GAN'],before:'жаз',beforeRu:'писать',added:'-ған',after:'жазған',afterRu:'написавший или написанное'},
 {id:'vb.53',slot:'full',type:'example',lemmaId:'v-айт',sequence:['PTCP_GAN'],before:'айт',beforeRu:'сказать',added:'-қан',after:'айтқан',afterRu:'сказавший или сказанное'},
 {id:'vb.54',slot:'full',type:'example',lemmaId:'v-ойна',sequence:['PTCP_GAN'],before:'ойна',beforeRu:'играть',added:'-ған',after:'ойнаған',afterRu:'игравший'},
 {id:'vb.55',slot:'full',type:'example',lemmaId:'v-көр',sequence:['PTCP_GAN'],before:'көр',beforeRu:'видеть',added:'-ген',after:'көрген',afterRu:'видевший или виденное'},
 {id:'vb.56',slot:'full',type:'example',lemmaId:'v-бар',sequence:['PTCP_GAN'],before:'бар',beforeRu:'идти',added:'-ған',after:'барған',afterRu:'ходивший'},
 {id:'vb.57',slot:'full',type:'warning',text:'Келді — пришёл. Келген адам — пришедший человек. Это описание предмета через действие, не просто «он пришёл». Куски бывают ған, ген, қан и кен: жазған, келген, айтқан. Дальше такая форма может получать окончания имени и строить более длинную фразу. Дальнейшие формы после этой ступени: описание при имени, келген адам, и тот же кусок с окончанием имени, когда фраза длиннее одного глагола. В этом уроке не разбираем тонкость «кто сделал» и «что сделано» сверх ясного примера.'},
 {id:'vb.58',slot:'full',type:'subheading',text:'Добавочное действие'},
 {id:'vb.59',slot:'full',type:'paragraph',text:'Келіп само не значит «он пришёл». Это добавка к другому, главному действию: способ, обстоятельство или шаг перед ним, не только потом. Не любое склеивание двух глаголов. Целая конструкция из слов банка: келіп айтты — придя, сказал. После согласного обычно ып или іп. После гласного п: алып, ойнап, сөйлеп. Две целые конструкции из источника, не задания банка: киініп, шықты — оделся и вышел; оқып, түсінді — прочитал и понял.'},
 {id:'vb.60',slot:'full',type:'example',lemmaId:'v-кел',sequence:['CVB_IP'],before:'кел',beforeRu:'приходить',added:'-іп',after:'келіп',afterRu:'придя, как добавка'},
 {id:'vb.61',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['CVB_IP'],before:'жаз',beforeRu:'писать',added:'-ып',after:'жазып',afterRu:'написав, как добавка'},
 {id:'vb.62',slot:'full',type:'example',lemmaId:'v-ал',sequence:['CVB_IP'],before:'ал',beforeRu:'брать',added:'-п',after:'алып',afterRu:'взяв, как добавка'},
 {id:'vb.63',slot:'full',type:'example',lemmaId:'v-ойна',sequence:['CVB_IP'],before:'ойна',beforeRu:'играть',added:'-п',after:'ойнап',afterRu:'играя, как добавка'},
 {id:'vb.64',slot:'full',type:'example',lemmaId:'v-сөйле',sequence:['CVB_IP'],before:'сөйле',beforeRu:'говорить',added:'-п',after:'сөйлеп',afterRu:'говоря, как добавка'},
 {id:'vb.65',slot:'full',type:'example',lemmaId:'v-көр',sequence:['CVB_IP'],before:'көр',beforeRu:'видеть',added:'-іп',after:'көріп',afterRu:'видя, как добавка'},
 {id:'vb.66',slot:'full',type:'example',lemmaId:'v-бар',sequence:['CVB_IP'],before:'бар',beforeRu:'идти',added:'-ып',after:'барып',afterRu:'сходив, как добавка'},
 {id:'vb.67',slot:'full',type:'subheading',text:'Два особых слова'},
 {id:'vb.68',slot:'full',type:'paragraph',text:'Жап в «уже закрыл» остаётся жапты. В добавочном действии основа меняется: жауып. Так же у тап получается тауып. Сеп в «уже посеял» — септі, а в добавке — сеуіп. Это записано у этих слов. Не делай так с каждым словом на п.'},
 {id:'vb.69',slot:'full',type:'example',lemmaId:'v-жап',sequence:['CVB_IP'],before:'жап',beforeRu:'закрывать',added:'-ып, внутри жау',after:'жауып',afterRu:'закрыв, как добавка'},
 {id:'vb.70',slot:'full',type:'example',lemmaId:'v-сеп',sequence:['CVB_IP'],before:'сеп',beforeRu:'сеять',added:'-іп, внутри сеу',after:'сеуіп',afterRu:'посеяв, как добавка'},
 {id:'vb.71',slot:'full',type:'example',lemmaId:'v-сеп',sequence:['PAST'],before:'сеп',beforeRu:'сеять',added:'-ті',after:'септі',afterRu:'посеял'},
 {id:'vb.72',slot:'full',type:'subheading',text:'Сначала «не», потом остальное'},
 {id:'vb.73',slot:'full',type:'paragraph',text:'Кел → келме → келмеді → келмедік. Каждый шаг видит предыдущее слово. «Мы не пришли» не собирается одной догадкой от кел.'},
 {id:'vb.74',slot:'full',type:'example',lemmaId:'v-кел',sequence:['NEG','PAST'],before:'кел',beforeRu:'приходить',added:'-ді после келме',after:'келмеді',afterRu:'не пришёл'},
 {id:'vb.75',slot:'full',type:'example',lemmaId:'v-кел',sequence:['NEG','PAST','AGR_SHORT_1PL'],before:'кел',beforeRu:'приходить',added:'-к после келмеді',after:'келмедік',afterRu:'мы не пришли'},
 {id:'vb.76',slot:'full',type:'example',lemmaId:'v-кел',sequence:['NEG','PAST','AGR_SHORT_1SG'],before:'кел',beforeRu:'приходить',added:'-м',after:'келмедім',afterRu:'я не пришёл'},
 {id:'vb.77',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['NEG','PAST'],before:'жаз',beforeRu:'писать',added:'-ды после жазба',after:'жазбады',afterRu:'не написал'},
 {id:'vb.78',slot:'full',type:'example',lemmaId:'v-жаз',sequence:['NEG','PAST','AGR_SHORT_1SG'],before:'жаз',beforeRu:'писать',added:'-м',after:'жазбадым',afterRu:'я не написал'},
 {id:'vb.79',slot:'full',type:'example',lemmaId:'v-айт',sequence:['NEG','COND','AGR_SHORT_2SG'],before:'айт',beforeRu:'сказать',added:'-ң после айтпаса',after:'айтпасаң',afterRu:'если ты не скажешь'},
 {id:'vb.80',slot:'full',type:'try',prompt:'Нужно «мы не пришли». Последний шаг от келмеді. Что выбрать?',options:['келмедік','келдік'],answer:'келмедік',good:'келмедік — мы не пришли.',bad:'келдік — мы пришли, без «не». Здесь уже келмеді, поэтому келмедік.'},
 {id:'vb.81',slot:'full',type:'warning',text:'Тренажёр не собирает «заставить сделать», страдательное и возвратное. Эти значения сюда не подставляем и форм для них не выдумываем. Свободно не берём и форму без ясного смысла.'},
 {id:'vb.83',slot:'full',type:'paragraph',text:'Сначала решаем, какое действие разрешено и в каком порядке. Потом выбираем буквы. Схема этого урока: если нужно «не делать», оно идёт раньше; затем «уже сделал», «если», описание предмета или добавочное действие; затем кто, если эта добавка разрешена. «Не делать»: ма, ме, ба, бе, па, пе. Это не вопрос «ли», даже если буквы те же, и граница другая. «Уже сделал»: ды, ді, ты, ті. Первая буква по краю, гласная по ряду. После «уже сделал» и после «если» короткая серия лица: я — м, келдім и келсем; мы — қ или к, келдік; ты — ң, келдің; Вы — ңыз или ңіз, келдіңіз. Для «он» отдельного конца нет: келді, келсе. Для нескольких «вы» после этих форм отдельной короткой серии здесь нет. Эта серия не заменяет «я человек» и не заменяет «мой предмет»: в одном случае я делаю действие, в другом вещь моя. Описание предмета: ған, ген, қан, кен. Первая буква как у «куда или кому», гласная по ряду. Показываем пару, не голый глагол: келген адам — пришедший человек. Это не сообщение «он пришёл». Такой кусок может дальше получать окончания имени и не является концом любого предложения. В этом уроке не проверяем сверх ясного примера, кто сделал действие и на что оно направлено. Добавочное действие: после согласного ып или іп, после гласного п. Оно характеризует главное действие и само не значит «он сделал». Это не самостоятельное время и не способ склеить два любых глагола. Берём только разобранную пару из урока.'},
 {id:'vb.84',slot:'full',type:'paragraph',text:'Глагольная цепочка — не мешок похожих концов. Сначала разрешаем смысл и порядок, потом буквы. Схема: «заставить», страдательное и возвратное сюда не входят; если нужно «не делать», оно раньше; затем форма; затем кто. «Не делать»: ма, ме, ба, бе, па, пе. Первая буква по краю и по ряду основы. жаз даёт жазба. Это не вопрос «ли»: даже при тех же буквах другая операция и другая граница. «Уже сделал»: ды, ді, ты, ті. кел даёт келді. Первая буква по краю, гласная по ряду. К уже собранному «уже сделал» или «если» добавляют, кто, только в разрешённой цепочке. Описание предмета: ған, ген, қан, кен. айт даёт айтқан. Первая буква как у «куда или кому», гласная по ряду. Эту форму практикуют после того, как её уже объяснили. Иначе блок неполный. «Если»: са или се. кел даёт келсе. Гласная по ряду. Начальная с не превращается в ряд м, б, п и не в ряд д, т. Это условие другого действия: если это произойдёт, тогда другое может произойти или нет. В живой речи бывают другие оттенки, поэтому первый шаг берёт только ясное «если». Не учи, что са или се всегда значит только русское «если». Добавочное действие: ып, іп или п. кел даёт келіп. После согласного ып или іп по ряду. После гласного общий конец п, как алып. жауып — записанная замена этого слова, не общий образец на п. Короткая серия: я — м, келдім и келсем; мы — қ или к, келдік; ты — ң, келдің; Вы — ңыз или ңіз, келдіңіз. Для «он» отдельного конца нет. Для нескольких «вы» после этих форм отдельной короткой серии здесь нет. Эта серия не заменяет «я человек» и не заменяет «мой предмет»: там я делаю действие, здесь вещь моя. Сначала ясно, какая форма уже собрана, и только потом короткое лицо. Цепочка: кел, затем келме, затем келмеді, затем келмедік. Не собираем «заставить», страдательное, возвратное, форму без ясного смысла и слово вне списка. Описание предмета ставим при имени: келген адам, не голый глагол. Это не сообщение «он пришёл» и не то же самое, что «уже сделал», хотя оба связаны с прошедшим. Такой кусок может получать окончания имени и не является концом любого предложения. Сверх ясного примера не проверяем, кто сделал и на что направлено. Добавка характеризует главное действие: способ, обстоятельство, причину, цель или шаг перед ним. Сама она несамостоятельна. Это не самостоятельное время, не «уже сделал» и не способ склеить два любых глагола. Берём только разобранную пару. Другие обороты источника в задания не переносим.'},
 {id:'vb.85',slot:'full',type:'paragraph',text:'Название: простое прошедшее. Варианты: ды, ді, ты, ті. Название описания предмета: форма, которая называет вещь через законченное действие и может стоять при имени, как пришедший человек, и дальше получать окончания имени. келген адам. Образцы источника, не задания: көрген кино и оқыған кітап. На первом шаге не проверяем, подлежащее это или дополнение: контекст однозначный. Первая буква по текущему краю, гласная по ряду. Это не то же самое, что «уже сделал». Название: условное. Начальная с здесь фиксирована и не прыгает в другой ряд. К «если» и к «уже сделал» лицо добавляют короткой серией, и только если такая цепочка есть в заданиях: я — м, мы — қ или к, ты — ң, Вы — ңыз или ңіз. Особое спряжение именно у ды, ді, ты, ті и у са, се. -м у «я сделал» не равно -м у «мой предмет»: там я делаю действие, здесь предмет принадлежит мне. Короткая серия не равна полному «кто я». После имени — полный ряд. После «уже сделал» и «если» — короткая. Сначала ясно, какая конструкция уже выбрана, и только потом короткое лицо. Цепочка «не делать», затем «уже сделал», затем «мы»: келмедік. Не берём свободное «заставить», произвольное страдательное и возвратное и не обещаем все записи каталога. Практиковать форму можно только после того, как её уже объяснили. Название и пример «если» есть. Другие оттенки живой речи в первый шаг не входят. Добавка -ып, -іп или -п связывает действие с другим, главным: что-то делают, уже совершив или делая другое. Образцы источника, не задания: дауыстап оқу; киініп, шығып кетті; сәлем беріп. Форма несамостоятельна и не равна «уже сделал». Она стоит в цепочке перед главным действием. После согласного края — ып или іп по ряду. После гласного общий конец п. Цепочка разрешена только если её смысл есть в проверенных заданиях. Эти уроки открыты, потому что источник их уже поддерживает. Обе операции делят буквы ма, ме, ба, бе, па и пе, но это разные единицы. Начинающий контраст: адам ба — вопрос, жазба — не делать. Форма на ған, ген, қан или кен стоит при имени как определение и может входить в дальнейшую конструкцию, не только как голый глагол. Она может дальше получать окончания имени и стоять там, где имя бывает сказуемым. Это не сообщение «он сделал». Көсемше в зависимом употреблении несамостоятельна. Если добавить лицо, некоторые такие формы в языке могут стать сказуемым, но этот тренажёр так не собирает. Конец ып, іп или п стоит в цепочке действий и при вспомогательном глаголе, не как отдельное время.'},
 {id:'vb.82',slot:'contrast',type:'list',items:['келді — пришёл','келген адам — пришедший человек','келіп — придя, как добавка','келме — не приходи','келдім — я пришёл','келмедік — мы не пришли','жапты — закрыл','жауып — закрыв']}
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
  requiredBlockIds:['nas.3','nas.6','nas.16','nas.24','nas.30','nas.32','nas.37','nas.39','nas.43','nas.49'],
  blocks:nasalBlocks
 },
 {
  id:'learner.person.roles',
  title:'Я, мы и вопрос',
  status:'READY',
  contentVersion:VERSION,
  modules:['person'],
  families:['COP_1SG','COP_1PL','COP_2SG','COP_2POL','COP_2PL','COP_2PL_POL','Q'],
  home:{moduleId:'person',familyId:'COP_1SG'},
  sourceNotes:['32 I','34 лицо и вопрос'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['я, мы, ты, Вы или вопрос','это не «моя вещь»','после м, н, ң у «я», «мы» и вопроса разные буквы','вопрос пишется отдельно'],
  steps:['реши, кто говорит о себе или это вопрос','возьми слово и перевод','выбери конец этой роли','не путай с «мой» и с «не делать»'],
  requiredBlockIds:['per.3','per.5','per.21','per.33','per.45','per.55','per.58','per.59'],
  blocks:personBlocks
 },
 {
  id:'learner.chains.steps',
  title:'Шаг за шагом',
  status:'READY',
  contentVersion:VERSION,
  modules:['chains'],
  families:['PL','POSS_1SG','POSS_2SG','POSS_1PL','POSS_2POL','POSS_3','DAT','ACC','LOC','ABL'],
  home:{moduleId:'chains',familyId:'PL'},
  sourceNotes:['32 J','34 цепочки'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation','chains.step'],
  lookAt:['какое слово уже есть на экране','один следующий вопрос','не первое слово, если шаг не первый','записанное изменение внутри слова'],
  steps:['посмотри на слово, которое уже получилось','реши, что добавить на этом шаге','сделай один конец','не собирай всю цепочку от первого слова'],
  requiredBlockIds:['ch.5','ch.9','ch.19','ch.24','ch.41'],
  blocks:chainBlocks
 },
 {
  id:'learner.verbs.steps',
  title:'Не делать, уже сделал, если',
  status:'READY',
  contentVersion:VERSION,
  modules:['verbs'],
  families:['NEG','PAST','PTCP_GAN','COND','CVB_IP','AGR_SHORT_1SG','AGR_SHORT_1PL','AGR_SHORT_2SG','AGR_SHORT_2POL'],
  home:{moduleId:'verbs',familyId:'NEG'},
  sourceNotes:['32 K','34 глагол'],
  renderTargets:['teaching.meaning','teaching.full','teaching.contrast','practice.feedback','practice.operation'],
  lookAt:['не делать, уже сделал, если, предмет через действие или добавка','какой шаг уже сделан','кто добавляется только к готовой форме','не «я человек» и не вопрос'],
  steps:['назови действие','если это не первый шаг, смотри на уже собранное слово','выбери конец этого шага','не выдумывай заставить, страдательное и возвратное'],
  requiredBlockIds:['vb.3','vb.29','vb.51','vb.60','vb.69','vb.75','vb.80','vb.81'],
  blocks:verbBlocks
 }
];
const CALC_ORDER=['PL','POSS_1SG','POSS_2SG','POSS_1PL','POSS_2POL','POSS_3','GEN','ACC','DAT','LOC','ABL','INS','COP_1SG','COP_1PL','COP_2SG','COP_2POL','COP_2PL','COP_2PL_POL','Q','NEG','PAST','PTCP_GAN','COND','CVB_IP','AGR_SHORT_1SG','AGR_SHORT_1PL','AGR_SHORT_2SG','AGR_SHORT_2POL'];
function resolveLemma(text,lemmas){
 const n=String(text||'').trim().toLocaleLowerCase('kk');
 if(!n)return {kind:'empty'};
 const train=(lemmas||[]).filter(l=>l.split==='train'&&String(l.text).toLocaleLowerCase('kk')===n);
 if(train.length===1)return {kind:'train',lemma:train[0]};
 if(train.length>1)return {kind:'ambiguous',options:train.map(l=>({id:l.id,text:l.text,gloss:l.gloss}))};
 return {kind:'unknown',message:'Для этого слова пока нет проверенного разбора. Выбери слово из списка или другое проверенное слово. Это не считается твоей ошибкой.'};
}
function tryForm(formOf,lemmaId,sequence){
 try{const built=formOf(lemmaId,sequence);return built&&built.word?built:null;}catch(e){return null;}
}
function nextMeanings(lemma,sequence,formOf){
 if(!lemma||lemma.split!=='train'||!formOf)return [];
 const base=Array.isArray(sequence)?sequence:[];
 return CALC_ORDER.filter(id=>label(id)&&tryForm(formOf,lemma.id,base.concat(id))).map(id=>({id,label:label(id)}));
}
function explain(lemma,sequence,formOf){
 if(!lemma||lemma.split!=='train')return {ok:false,kind:'unknown',message:'Для этого слова пока нет проверенного разбора. Выбери слово из списка или другое проверенное слово. Это не считается твоей ошибкой.'};
 const seq=Array.isArray(sequence)?sequence.slice(0,5):[];
 if(!seq.length)return {ok:false,kind:'need-meaning',message:'Выбери, что хочешь сказать.',choices:nextMeanings(lemma,[],formOf)};
 const built=tryForm(formOf,lemma.id,seq);
 if(!built)return {ok:false,kind:'chain',message:'Такая цепочка пока не поддерживается в тренажёре. Это не считается твоей ошибкой.',choices:nextMeanings(lemma,seq.slice(0,-1),formOf)};
 const steps=built.trace.map((step,i)=>{
  const name=label(step.morpheme)||'этот смысл';
  const added=step.space?'отдельно «'+step.suffix+'»':'-'+step.suffix;
  const why=step.changed?'Перед добавкой в этом слове есть записанная замена: '+step.before+' → '+step.stem+'.':(i?'Этот шаг считается от уже собранного слова, не от первого.':'Конец выбран по этому слову.');
  return {meaning:name,before:step.before,added,after:step.after,why};
 });
 const target=openTarget({sequence:seq,morpheme:seq.at(-1)});
 return {ok:true,stem:lemma.text,gloss:lemma.gloss,word:built.word,steps,lessonId:target&&target.lessonId,choices:nextMeanings(lemma,seq,formOf),note:'Это только разбор. Он не записывается как ответ и не меняет расписание повторений.'};
}
const api={version:VERSION,lessons:LESSONS,label,forFamily,lessonTarget,openTarget,operation,supportLine,feedback,chainNote,render,pieces,unavailable,visibleText,check,resolveLemma,nextMeanings,explain};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MorphLearner=api;
})(typeof window!=='undefined'?window:globalThis);
