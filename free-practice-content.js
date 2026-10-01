/* P2 pools for the two lessons. A card is kept only when the engine agrees. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports;
const E=node?require('./morph-engine.js'):root.MorphEngine;
const ANCHORS={
 'dat.1':[{blockId:'free.harmony.meaning_dat',subcase:'direction',title:'Потренироваться'}],
 'dat.9':[{blockId:'free.voice.direction_place',subcase:'meaning',title:'Потренироваться'}],
 'dat.16':[{blockId:'free.harmony.vowel_dat',subcase:'vowel',title:'Потренироваться'}],
 'dat.22':[{blockId:'free.voice.dat_onset',subcase:'onset',title:'Потренироваться'}],
 'dat.31':[{blockId:'free.voice.dat_build',subcase:'full',title:'Потренироваться'}],
 'dat.36':[{blockId:'free.harmony.meaning_dat',subcase:'addressee',title:'Потренироваться'}],
 'dat.41':[{blockId:'free.voice.direction_place',subcase:'three',title:'Потренироваться'}],
 'poss.6':[{blockId:'free.poss.my',subcase:'full',title:'Потренироваться: мой'},{blockId:'free.poss.your',subcase:'full',title:'Потренироваться: твой'}],
 'poss.14':[{blockId:'free.poss.third',subcase:'full',title:'Потренироваться: его или её'}],
 'poss.20':[{blockId:'free.poss.stem',subcase:'ending',title:'Потренироваться'}],
 'poss.26':[{blockId:'free.poss.our',subcase:'full',title:'Потренироваться: наш'},{blockId:'free.poss.polite',subcase:'full',title:'Потренироваться: ваш'}],
 'poss.38':[{blockId:'free.poss.stem',subcase:'inner',title:'Потренироваться'}],
 'poss.77':[{blockId:'free.poss.compare',subcase:'owners',title:'Потренироваться'}],
 'dat.46':[{blockId:'free.harmony.limits',subcase:'limits',title:'Потренироваться'}],
 'loc.1':[{blockId:'free.harmony.meaning_loc',subcase:'place',title:'Потренироваться'}],
 'loc.11':[{blockId:'free.harmony.vowel_loc',subcase:'vowel',title:'Потренироваться: гласная'},{blockId:'free.voice.loc_onset',subcase:'onset',title:'Потренироваться: первая буква'}],
 'loc.18':[{blockId:'free.voice.loc_build',subcase:'full',title:'Потренироваться'}],
 'pl.1':[{blockId:'free.plural.meaning',subcase:'several',title:'Потренироваться'}],
 'pl.7':[{blockId:'free.plural.vowel',subcase:'vowel',title:'Потренироваться: гласная'},{blockId:'free.plural.group_vowel',subcase:'vowel',title:'После гласного'},{blockId:'free.plural.group_yw',subcase:'glide',title:'После й или у'},{blockId:'free.plural.group_r',subcase:'r',title:'После р'},{blockId:'free.plural.group_l',subcase:'l',title:'После л'},{blockId:'free.plural.group_nasal',subcase:'nasal',title:'После м, н, ң'},{blockId:'free.plural.group_z',subcase:'z',title:'После з или ж'},{blockId:'free.plural.group_voiceless',subcase:'voiceless',title:'После глухого'}],
 'pl.13':[{blockId:'free.plural.compare',subcase:'compare',title:'Потренироваться'}],
 'nas.5':[{blockId:'free.nasal.gen',subcase:'full',title:'Потренироваться'}],
 'nas.14':[{blockId:'free.nasal.acc',subcase:'full',title:'Потренироваться'}],
 'nas.21':[{blockId:'free.nasal.abl',subcase:'full',title:'Потренироваться'}],
 'nas.28':[{blockId:'free.nasal.ins_with',subcase:'with',title:'Потренироваться: с кем'}],
 'nas.31':[{blockId:'free.nasal.ins_tool',subcase:'tool',title:'Потренироваться: чем'}],
 'nas.38':[{blockId:'free.nasal.contrast',subcase:'contrast',title:'Потренироваться'}],
 'nas.47':[{blockId:'free.nasal.groups',subcase:'groups',title:'Потренироваться'}],
 'per.9':[{blockId:'free.person.i_we',subcase:'i',title:'Потренироваться: я'}],
 'per.20':[{blockId:'free.person.i_we',subcase:'we',title:'Потренироваться: мы'}],
 'per.29':[{blockId:'free.person.you',subcase:'you',title:'Потренироваться: ты и Вы'},{blockId:'free.person.you_many',subcase:'many',title:'Потренироваться: вы, несколько'}],
 'per.43':[{blockId:'free.person.question',subcase:'question',title:'Потренироваться'}],
 'per.56':[{blockId:'free.person.compare',subcase:'compare',title:'Потренироваться'}],
 'ch.7':[{blockId:'free.chains.poss_dat',subcase:'dat',title:'Куда после «его»'},{blockId:'free.chains.third_acc',subcase:'acc',title:'Кого после «его»'},{blockId:'free.chains.third_loc',subcase:'loc',title:'Где после «его»'},{blockId:'free.chains.third_abl',subcase:'abl',title:'Откуда после «его»'}],
 'ch.23':[{blockId:'free.chains.plural_poss',subcase:'plural',title:'Несколько, потом чьё'},{blockId:'free.chains.full',subcase:'full',title:'Целая цепочка'}],
 'vb.7':[{blockId:'free.verbs.negative',subcase:'neg',title:'Потренироваться'}],
 'vb.17':[{blockId:'free.verbs.past',subcase:'past',title:'Потренироваться'}],
 'vb.27':[{blockId:'free.verbs.short_person',subcase:'person',title:'Потренироваться'}],
 'vb.39':[{blockId:'free.verbs.condition',subcase:'cond',title:'Потренироваться'}],
 'vb.49':[{blockId:'free.verbs.participle',subcase:'ptcp',title:'Потренироваться'}],
 'vb.58':[{blockId:'free.verbs.connected',subcase:'cvb',title:'Потренироваться'}],
 'vb.67':[{blockId:'free.verbs.stem',subcase:'stem',title:'Потренироваться'}],
 'vb.72':[{blockId:'free.verbs.combined',subcase:'combined',title:'Потренироваться'}]
};
function formOf(lemma,sequence){try{const built=E.form(lemma.id,sequence);return built&&built.word?built:null;}catch(e){return null;}}
function nouns(){return E.data.lemmas.filter(l=>l.split==='train'&&l.pos==='noun');}
function swap(suffix,kind){
 const map=kind==='vowel'?{а:'е',е:'а',ы:'і',і:'ы'}:{ғ:'қ',қ:'ғ',г:'к',к:'г',д:'т',т:'д'};
 let changed=false;
 const out=[...suffix].map(ch=>{if(!changed&&map[ch]){changed=true;return map[ch];}return ch;}).join('');
 return changed&&out!==suffix?out:null;
}
function wrongWord(built,kind){
 const step=built.trace[built.trace.length-1];
 const next=swap(step.suffix,kind);
 if(!next)return null;
 const word=step.stem+(step.space?' ':'')+next;
 return word===built.word?null:word;
}
const EDGE_LABELS={vowel:'гласная',glide:'й или у',r:'р',l:'л',nasal:'м, н или ң',voiced_fricative:'з или ж',voiceless:'глухая согласная'};
const EDGE_ORDER=['vowel','glide','r','l','nasal','voiced_fricative','voiceless'];
const PRACTICE_VOWELS='аәеоөұүыі';
function unique(xs){return [...new Set((xs||[]).filter(Boolean))];}
function firstVowel(text){return [...String(text||'')].find(ch=>PRACTICE_VOWELS.includes(ch))||'';}
function decisionSpec(built){
 const step=built&&built.trace&&built.trace[built.trace.length-1];
 if(!step)return null;
 const family=E.data&&E.data.families&&E.data.families[step.morpheme];
 const variants=unique((family&&family.variants)||[]);
 const firsts=unique(variants.map(v=>[...String(v)][0]));
 const vowels=unique(variants.map(firstVowel));
 const correctVowel=firstVowel(step.suffix);
 const levels={};
 if(EDGE_LABELS[step.edge]){
  levels.B={kind:'choice',prompt:'На какой тип звука заканчивается слово перед этим окончанием?',context:step.before,options:EDGE_ORDER.map(k=>EDGE_LABELS[k]),answer:EDGE_LABELS[step.edge],hint:'Посмотри только на последнюю букву уже собранного слова.'};
 }
 if(firsts.length>1&&firsts.includes([...String(step.suffix)][0])){
  levels.C={kind:'choice',prompt:'Какую первую букву окончания выбрать?',context:step.before,options:firsts,answer:[...String(step.suffix)][0],hint:'Сейчас выбираем только первую букву окончания, не всю форму.'};
 }
 if(vowels.length>1&&correctVowel&&vowels.includes(correctVowel)){
  levels.D={kind:'choice',prompt:'Какую гласную выбрать в окончании?',context:step.before,options:vowels,answer:correctVowel,hint:'Смотри на ряд гласных исходного слова.'};
 }
 if(variants.length>1&&variants.includes(step.suffix)){
  levels.E={kind:'choice',prompt:'Какое полное окончание подходит?',context:step.before,options:variants,answer:step.suffix,hint:'Основа пока не показывается вместе с готовым ответом: выбери только окончание.'};
 }
 levels.F={kind:'input',prompt:'Впиши только окончание.',context:step.stem+' + ___',answer:step.suffix,hint:'Собираем только последний шаг. Полную форму пока не показываем.'};
 levels.G={kind:'input',prompt:'Собери форму целиком самостоятельно.',context:built.lemma&&built.lemma.text||step.before,answer:built.word,hint:'Применяй шаги по порядку. Готового ответа здесь нет.'};
 return {morpheme:step.morpheme,changed:!!step.changed,levels,order:['B','C','D','E','F','G'].filter(k=>levels[k])};
}
function base(lemma,built,blockId,subcase,skill){
 const step=built.trace[built.trace.length-1];
 return {cardId:blockId+':'+lemma.id+':'+subcase,blockId,subcase,targetSkillIds:[skill],prerequisiteBlockIds:[],lemmaId:lemma.id,normalizedLemmaKey:String(lemma.text).toLocaleLowerCase('kk'),split:'train',holdout:false,admissionStatus:'runtime_approved',engineWord:built.word,expected:built.word,promptSpec:{ru:'',hint:''},translationSpec:{lemma:lemma.text,lemmaRu:lemma.gloss||'',target:'',context:lemma.text,contextRu:lemma.gloss||''},exerciseType:'choose',options:[],answer:built.word,feedbackRu:'',showExpectedBeforeAnswer:false,changed:!!step.changed,decisionSpec:decisionSpec(built),practiceLevels:['A','B','C','D','E','F','G','H','I']};
}
function choice(card,correct,wrongs,prompt,hint,target,feedback){
 const options=[correct].concat(wrongs).filter((x,i,a)=>x&&a.indexOf(x)===i);
 if(options.length<2||!options.includes(correct))return null;
 card.options=options;card.answer=correct;card.promptSpec={ru:prompt,hint};card.translationSpec.target=target;card.feedbackRu=feedback;return card;
}
function meaningCard(id,blockId,subcase,lemma,prompt,answer,other,target){
 return {cardId:id,blockId,subcase,targetSkillIds:['meaning'],prerequisiteBlockIds:[],lemmaId:lemma.id,normalizedLemmaKey:String(lemma.text).toLocaleLowerCase('kk'),split:'train',holdout:false,admissionStatus:'runtime_approved',exerciseType:'meaning',options:[answer,other].filter((x,i,a)=>a.indexOf(x)===i),answer,expected:'',showExpectedBeforeAnswer:false,promptSpec:{ru:prompt,hint:'Смысл решаем до окончания.'},translationSpec:{lemma:lemma.text,lemmaRu:lemma.gloss||'',target,context:lemma.text,contextRu:lemma.gloss||''},feedbackRu:answer==='куда'?'Сейчас человек ещё в пути: куда.':answer==='где'?'Сейчас человек уже на месте: где.':answer==='кому'?'Сейчас важно, кому это дают: кому.':'Смысл: '+answer+'.',practiceLevels:['A','B','G','H','I']};
}
function build(){
 const rows=nouns();
 const cards=[];
 const byText=new Map(rows.map(l=>[l.text,l]));
 const need=['мектеп','қала','бала','үй','кітап','дос'];
 for(const text of need)if(!byText.get(text))return cards;
 const school=byText.get('мектеп'),city=byText.get('қала'),child=byText.get('бала');
 cards.push(meaningCard('mean:school:go','free.harmony.meaning_dat','direction',school,'Человек ещё не в школе и идёт туда. Какой смысл?','куда','где','куда'));
 cards.push(meaningCard('mean:city:go','free.harmony.meaning_dat','direction',city,'Человек едет в город и ещё не приехал. Какой смысл?','куда','где','куда'));
 cards.push(meaningCard('mean:child:give','free.harmony.meaning_dat','addressee',child,'Книгу дают ребёнку. Никто никуда не идёт. Какой смысл?','кому','куда','кому'));
 cards.push(meaningCard('mean:school:in','free.voice.direction_place','meaning',school,'Человек уже находится в школе. Какой смысл?','где','куда','где'));
 cards.push(meaningCard('mean:city:in','free.voice.direction_place','meaning',city,'Человек уже в городе. Какой смысл?','где','куда','где'));
 const three=[['куда','DAT'],['где','LOC'],['откуда','ABL']];
 for(const lemma of [city,school]){
  const forms=three.map(([label,id])=>{const built=formOf(lemma,[id]);return built?{label,word:built.word}:null;});
  if(forms.some(x=>!x))continue;
  cards.push({cardId:'three:'+lemma.id,blockId:'free.voice.direction_place',subcase:'three',targetSkillIds:['meaning'],prerequisiteBlockIds:[],lemmaId:lemma.id,normalizedLemmaKey:lemma.text,split:'train',holdout:false,admissionStatus:'runtime_approved',exerciseType:'meaning',showExpectedBeforeAnswer:true,expected:forms.map(x=>x.word+' — '+x.label).join(', '),options:forms.map(x=>x.label),answer:'куда',promptSpec:{ru:lemma.gloss+': '+forms.map(x=>x.word+' — '+x.label).join('; ')+'. Какой смысл у первой формы?',hint:'Сначала смысл, потом конец.'},translationSpec:{lemma:lemma.text,lemmaRu:lemma.gloss||'',target:'куда, где или откуда',context:lemma.text,contextRu:lemma.gloss||''},feedbackRu:forms[0].word+' — куда.'});
 }
 function addForm(lemma,sequence,blockId,subcase,skill,kind){
  const built=formOf(lemma,sequence);if(!built)return;
  const card=base(lemma,built,blockId,subcase,skill);
  const wrongs=[];
  if(kind==='vowel'||kind==='full'){const w=wrongWord(built,'vowel');if(w)wrongs.push(w);}
  if(kind==='onset'||kind==='full'){const w=wrongWord(built,'onset');if(w)wrongs.push(w);}
  const target=sequence[0]==='DAT'?'куда или кому':sequence[0]==='LOC'?'где':'чей предмет';
  const prompt=lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+target+'.';
  const kept=choice(card,built.word,wrongs,prompt,'Один уже объяснённый шаг.',target,built.word+' — '+target+'.');
  if(kept)cards.push(kept);
 }
 for(const lemma of rows){
  addForm(lemma,['DAT'],'free.harmony.vowel_dat','vowel','DAT.vowel','vowel');
  addForm(lemma,['DAT'],'free.voice.dat_onset','onset','DAT.onset','onset');
  addForm(lemma,['DAT'],'free.voice.dat_build','full','DAT.full_form','full');
 }
 const owners={ 'free.poss.my':['POSS_1SG','мой'], 'free.poss.your':['POSS_2SG','твой'], 'free.poss.our':['POSS_1PL','наш'], 'free.poss.polite':['POSS_2POL','ваш'], 'free.poss.third':['POSS_3','его или её'] };
 for(const lemma of rows){
  for(const [blockId,[seq,ru]] of Object.entries(owners)){
   const built=formOf(lemma,[seq]);if(!built)continue;
   const other=seq==='POSS_1SG'?'POSS_2SG':seq==='POSS_2SG'?'POSS_1SG':seq==='POSS_3'?'POSS_1SG':'POSS_1SG';
   const alt=formOf(lemma,[other]);
   const card=base(lemma,built,blockId,'full','POSS.'+seq);
   const wrongs=alt&&alt.word!==built.word?[alt.word]:[];
   const kept=choice(card,built.word,wrongs,lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'.','Чей предмет уже объяснён.',ru,built.word+' — '+ru+'.'+(alt?' '+alt.word+' — другая принадлежность.':''));
   if(kept)cards.push(kept);
   if(blockId==='free.poss.my'){
    const step=built.trace[0];
    if(!step.changed){
     const bare=swap(step.suffix,'vowel');
     const long=lemma.text+(bare||step.suffix);
     if(long!==built.word){
      const end=base(lemma,built,'free.poss.stem','ending','POSS.ending');
      const keptEnd=choice(end,built.word,[long],lemma.text+' — '+(lemma.gloss||'')+'. После гласного для «мой» какая форма?','После гласного конец короче.','мой',built.word+' — мой.');
      if(keptEnd)cards.push(keptEnd);
     }
    }else{
     const plain=step.before+step.suffix;
     if(plain!==built.word){
      const inner=base(lemma,built,'free.poss.stem','inner','POSS.inner');
      const keptInner=choice(inner,built.word,[plain],lemma.text+' — '+(lemma.gloss||'')+'. Нужно «мой». Внутри слова есть записанная замена.','Не оставляй последнюю букву как была, если у этого слова записана замена.','мой',built.word+' — мой. Замена записана у этого слова.');
      if(keptInner)cards.push(keptInner);
     }
    }
   }
  }
  const mine=formOf(lemma,['POSS_1SG']),yours=formOf(lemma,['POSS_2SG']);
  if(mine&&yours&&mine.word!==yours.word){
   const cmp=base(lemma,mine,'free.poss.compare','owners','POSS.compare');
   const keptCmp=choice(cmp,mine.word,[yours.word],lemma.text+' — '+(lemma.gloss||'')+'. Выбери «мой», не «твой».','Сравни конец: мой и твой.','мой',mine.word+' — мой. '+yours.word+' — твой.');
   if(keptCmp)cards.push(keptCmp);
  }
 }
 addCoverage(cards, rows, byText, addForm);
 return cards;
}
function seriesWrong(suffix){
 const pair={лар:'тар',лер:'тер',дар:'тар',дер:'тер',тар:'лар',тер:'лер'};
 return pair[suffix]||null;
}
function addCoverage(cards, rows, byText, addForm){
 const city=byText.get('қала'), school=byText.get('мектеп');
 if(city)cards.push(meaningCard('mean:city:there','free.harmony.meaning_loc','place',city,'Человек уже в городе, не в дороге. Какой смысл?','где','куда','где'));
 if(school)cards.push(meaningCard('mean:school:there','free.harmony.meaning_loc','place',school,'Человек уже находится в школе. Какой смысл?','где','куда','где'));
 cards.push({cardId:'limit:u',blockId:'free.harmony.limits',subcase:'limits',targetSkillIds:['limits'],prerequisiteBlockIds:[],lemmaId:'n-су',normalizedLemmaKey:'су',split:'train',holdout:false,admissionStatus:'runtime_approved',exerciseType:'meaning',options:['только у этих слов','у любого слова на у'],answer:'только у этих слов',expected:'',showExpectedBeforeAnswer:false,promptSpec:{ru:'суға и тауға записаны у этих слов. Можно ли так с любым словом на у?',hint:'Класс записан у слова.'},translationSpec:{lemma:'су',lemmaRu:'вода',target:'куда',context:'су',contextRu:'вода'},feedbackRu:'Другие слова на у по одной букве не угадываем.'});
 for(const lemma of rows){
  addForm(lemma,['LOC'],'free.harmony.vowel_loc','vowel','LOC.vowel','vowel');
  addForm(lemma,['LOC'],'free.voice.loc_onset','onset','LOC.onset','onset');
  addForm(lemma,['LOC'],'free.voice.loc_build','full','LOC.full_form','full');
  const plural=formOf(lemma,['PL']);
  if(plural){
   const edge=plural.trace[0].edge;
   const group={vowel:['free.plural.group_vowel','vowel'],glide:['free.plural.group_yw','glide'],r:['free.plural.group_r','r'],l:['free.plural.group_l','l'],nasal:['free.plural.group_nasal','nasal'],voiced_fricative:['free.plural.group_z','z'],voiceless:['free.plural.group_voiceless','voiceless']}[edge];
   const step=plural.trace[0];
   const alt=seriesWrong(step.suffix);
   const wrong=alt?step.stem+(step.space?' ':'')+alt:null;
   if(group&&wrong&&wrong!==plural.word){
    const card=base(lemma,plural,group[0],group[1],'PL.group');
    const kept=choice(card,plural.word,[wrong],lemma.text+' — '+(lemma.gloss||'')+'. Несколько.','Конец зависит от края этого слова.','несколько',plural.word+' — несколько.');
    if(kept)cards.push(kept);
   }
   const vowelWrong=wrongWord(plural,'vowel');
   if(vowelWrong){
    const card=base(lemma,plural,'free.plural.vowel','vowel','PL.vowel');
    const kept=choice(card,plural.word,[vowelWrong],lemma.text+' — '+(lemma.gloss||'')+'. Несколько. Какая гласная в конце?','Ряд уже записан у слова.','несколько',plural.word+' — несколько.');
    if(kept)cards.push(kept);
   }
   const one=lemma.text;
   if(one!==plural.word){
    const card=base(lemma,plural,'free.plural.compare','compare','PL.compare');
    const kept=choice(card,plural.word,[one],lemma.text+' — '+(lemma.gloss||'')+'. Нужно несколько, не один.','Сначала смысл «несколько».','несколько',plural.word+' — несколько. '+one+' — один.');
    if(kept)cards.push(kept);
   }
  }
  for(const [blockId,seq,ru,subcase] of [['free.nasal.gen','GEN','чей или чего','full'],['free.nasal.acc','ACC','кого или что именно','full'],['free.nasal.abl','ABL','откуда','full'],['free.nasal.ins_with','INS','с кем','with'],['free.nasal.ins_tool','INS','чем','tool']]){
   const built=formOf(lemma,[seq]);if(!built)continue;
   if(blockId==='free.nasal.ins_with'&&!(lemma.gloss||'').includes('человек')&&lemma.text!=='адам'&&lemma.text!=='дос'&&lemma.text!=='бала')continue;
   if(blockId==='free.nasal.ins_tool'&&((lemma.gloss||'').includes('человек')||lemma.text==='адам'||lemma.text==='дос'||lemma.text==='бала'))continue;
   const card=base(lemma,built,blockId,subcase,'CASE.'+seq);
   const wrong=wrongWord(built,'onset')||wrongWord(built,'vowel');
   const kept=choice(card,built.word,wrong?[wrong]:[],lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'.','Сначала вопрос, потом конец.','ru'&&ru,built.word+' — '+ru+'.');
   if(kept)cards.push(kept);
  }
  const gen=formOf(lemma,['GEN']),acc=formOf(lemma,['ACC']);
  if(gen&&acc&&gen.word!==acc.word){
   const card=base(lemma,gen,'free.nasal.contrast','contrast','CASE.contrast');
   const kept=choice(card,gen.word,[acc.word],lemma.text+' — '+(lemma.gloss||'')+'. Нужно «чей или чего», не «кого именно».','Похожий конец, другой вопрос.','чей или чего',gen.word+' — чей. '+acc.word+' — кого именно.');
   if(kept)cards.push(kept);
   const group=base(lemma,gen,'free.nasal.groups','groups','CASE.groups');
   const keptGroup=choice(group,gen.word,[acc.word],lemma.text+' — '+(lemma.gloss||'')+'. Край один, вопрос другой.','Группа края не выбирает вопрос.','чей или чего',gen.word+' — чей.');
   if(keptGroup)cards.push(keptGroup);
  }
 }
 if(city)cards.push(meaningCard('pl:city','free.plural.meaning','several',city,'Нужно сказать не один город, а несколько. Какой смысл?','несколько','один','несколько'));
 const verbs=E.data.lemmas.filter(l=>l.split==='train'&&l.pos==='verb');
 const verbMap=[['free.verbs.negative',['NEG'],'не делать','neg'],['free.verbs.past',['PAST'],'уже сделал','past'],['free.verbs.participle',['PTCP_GAN'],'предмет через действие','ptcp'],['free.verbs.condition',['COND'],'если','cond'],['free.verbs.connected',['CVB_IP'],'добавочное действие','cvb'],['free.verbs.combined',['NEG','PAST'],'не сделал','combined']];
 for(const lemma of verbs){
  for(const [blockId,seq,ru,subcase] of verbMap){
   const built=formOf(lemma,seq);if(!built)continue;
   const card=base(lemma,built,blockId,subcase,'VERB.'+seq[0]);
   const wrong=wrongWord(built,'vowel')||wrongWord(built,'onset');
   const kept=choice(card,built.word,wrong?[wrong]:[],lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'.','Один шаг глагола.','ru'&&ru,built.word+' — '+ru+'.');
   if(kept)cards.push(kept);
  }
  const past=formOf(lemma,['PAST']),person=formOf(lemma,['PAST','AGR_SHORT_1SG']);
  if(past&&person&&past.word!==person.word){
   const card=base(lemma,person,'free.verbs.short_person','person','VERB.person');
   const kept=choice(card,person.word,[past.word],lemma.text+' — '+(lemma.gloss||'')+'. Нужно «я уже сделал», не просто «уже сделал».','Лицо добавляется к уже сказанному.','я',person.word+' — я. '+past.word+' — без лица.');
   if(kept)cards.push(kept);
  }
  const stem=formOf(lemma,['CVB_IP']);
  if(stem&&stem.trace.some(step=>step.changed)){
   const card=base(lemma,stem,'free.verbs.stem','stem','VERB.stem');
   const plain=stem.trace[0].before+stem.trace[0].suffix;
   if(plain!==stem.word){
    const kept=choice(card,stem.word,[plain],lemma.text+' — '+(lemma.gloss||'')+'. В добавочном действии у этого слова записана замена.','Не переноси замену на все слова.','добавочное действие',stem.word+' — записанная форма.');
    if(kept)cards.push(kept);
   }
  }
  for(const [blockId,seq,ru] of [['free.person.i_we',['COP_1SG'],'я'],['free.person.i_we',['COP_1PL'],'мы'],['free.person.you',['COP_2SG'],'ты'],['free.person.you',['COP_2POL'],'Вы'],['free.person.you_many',['COP_2PL'],'вы, несколько'],['free.person.question',['Q'],'вопрос']]){
   const built=formOf(lemma,seq);if(!built)continue;
   const sub=seq[0]==='COP_1SG'?'i':seq[0]==='COP_1PL'?'we':seq[0]==='Q'?'question':seq[0]==='COP_2PL'?'many':'you';
   const card=base(lemma,built,blockId,sub,'PERSON.'+seq[0]);
   card.cardId=blockId+':'+lemma.id+':'+sub;
   const wrong=wrongWord(built,'vowel');
   const kept=choice(card,built.word,wrong?[wrong]:[],lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'.','Это не «чей предмет».',ru,built.word+' — '+ru+'.');
   if(kept)cards.push(kept);
  }
 }
 const licensed=[
  ['v-кел','келген адам','пришедший человек','Келген адам — пришедший человек. Нужна форма, которая описывает человека, не «он пришёл».'],
  ['v-жаз','жазған сөз','написанное слово','Жазған сөз — написанное слово. Нужна форма, которая описывает слово, не «он написал».'],
  ['v-айт','айтқан сөз','сказанное слово','Айтқан сөз — сказанное слово. Нужна форма, которая описывает слово, не «он сказал».'],
  ['v-ойна','ойнаған бала','ребёнок, который играл','Ойнаған бала — ребёнок, который играл. Нужна форма, которая описывает ребёнка, не «он играл».']
 ];
 for(const [id,phrase,sense,prompt] of licensed){
  const lemma=verbs.find(l=>l.id===id);
  if(!lemma)continue;
  const built=formOf(lemma,['PTCP_GAN']);
  const past=formOf(lemma,['PAST']);
  if(!built||!past||built.word===past.word)continue;
  const card=base(lemma,built,'free.verbs.participle','attr','VERB.PTCP_GAN');
  const kept=choice(card,built.word,[past.word],prompt,'Это описание человека или предмета, не готовое «он сделал».',sense,phrase+' — '+sense+'. '+past.word+' — уже сделанное действие без этого описания.');
  if(kept)cards.push(kept);
 }
 const kel=verbs.find(l=>l.id==='v-кел');
 if(kel){
  const cvb=formOf(kel,['CVB_IP']);
  const past=formOf(kel,['PAST']);
  if(cvb&&past&&cvb.word!==past.word){
   const card=base(kel,cvb,'free.verbs.connected','sequence','VERB.CVB_IP');
   const kept=choice(card,cvb.word,[past.word],'Келіп айтты — придя, сказал. Келіп здесь шаг перед «сказал», не готовое «он пришёл».','Сначала один шаг, потом главное действие.','шаг перед «сказал»','келіп айтты — шаг перед «сказал». '+past.word+' — уже пришёл, без второго действия.');
   if(kept){
    // Queue spaces repeats by lemma. This construction is the only card, so its key is the phrase.
    kept.normalizedLemmaKey='келіп айтты';
    cards.push(kept);
   }
  }
 }
 const people=rows.filter(l=>l.predicate);
 for(const lemma of people){
  for(const [blockId,seq,ru,sub] of [['free.person.i_we',['COP_1SG'],'я','i'],['free.person.i_we',['COP_1PL'],'мы','we'],['free.person.you',['COP_2SG'],'ты','you'],['free.person.you',['COP_2POL'],'Вы','you'],['free.person.you_many',['COP_2PL'],'вы, несколько','many'],['free.person.question',['Q'],'вопрос','question']]){
   const built=formOf(lemma,seq);if(!built)continue;
   const card=base(lemma,built,blockId,sub,'PERSON.'+seq[0]);
   const poss=formOf(lemma,['POSS_1SG']);
   const wrong=poss&&poss.word!==built.word?poss.word:wrongWord(built,'vowel');
   const kept=choice(card,built.word,wrong?[wrong]:[],lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'. Не «мой».','Кто я и чья вещь — разные дела.',ru,built.word+' — '+ru+'.');
   if(kept&&seq[0]==='COP_1SG'&&poss&&poss.word!==built.word){
    const cmp=base(lemma,built,'free.person.compare','compare','PERSON.compare');
    const keptCmp=choice(cmp,built.word,[poss.word],lemma.text+' — '+(lemma.gloss||'')+'. Это «я», не «мой».','Не путай с «чей предмет».','я',built.word+' — я. '+poss.word+' — мой.');
    if(keptCmp)cards.push(keptCmp);
   }
   if(kept)cards.push(kept);
  }
 }
 for(const lemma of rows){
  const chainPairs=[['free.chains.poss_dat',['POSS_3','DAT'],['POSS_3','LOC'],'к его вещи','dat'],['free.chains.third_acc',['POSS_3','ACC'],['POSS_3','DAT'],'его вещь, именно эту','acc'],['free.chains.third_loc',['POSS_3','LOC'],['POSS_3','DAT'],'где его вещь','loc'],['free.chains.third_abl',['POSS_3','ABL'],['POSS_3','LOC'],'откуда его вещь','abl'],['free.chains.plural_poss',['PL','POSS_1PL'],['PL'],'наши, несколько','plural'],['free.chains.full',['PL','POSS_1PL','ABL'],['PL','POSS_1PL'],'из наших','full']];
  for(const [blockId,seq,alt,ru,subcase] of chainPairs){
   const built=formOf(lemma,seq),other=formOf(lemma,alt);
   if(!built||!other||built.word===other.word)continue;
   const card=base(lemma,built,blockId,subcase,'CHAIN.'+blockId);
   const kept=choice(card,built.word,[other.word],lemma.text+' — '+(lemma.gloss||'')+'. Нужно: '+ru+'. Смотри на уже собранное слово.','Следующий конец не от первого слова.',ru,built.word+' — '+ru+'. '+other.word+' — другой шаг.');
   if(kept)cards.push(kept);
  }
 }
}
let cache;
function all(){if(!cache)cache=build();return cache;}
function forBlock(blockId,subcase){return all().filter(card=>card.blockId===blockId&&(!subcase||card.subcase===subcase));}
function capacity(){
 const ids=[...new Set(all().map(c=>c.blockId))];
 return ids.map(id=>{
  const rows=all().filter(c=>c.blockId===id);
  const lemmas=[...new Set(rows.map(c=>c.normalizedLemmaKey))];
  return {blockId:id,cards:rows.length,uniqueLemmas:lemmas.length,target:id.startsWith('free.harmony.meaning')||id==='free.voice.direction_place'?6:12,shortfall:lemmas.length<(id.startsWith('free.harmony.meaning')||id==='free.voice.direction_place'?4:12)};
 });
}
function anchorsFor(headingId){return ANCHORS[headingId]||[];}
function edgeOf(word){
 const ch=String(word||'').slice(-1);
 if('аәеёоөұүуыіэ'.includes(ch))return 'vowel';
 if(ch==='й'||ch==='у')return 'glide';
 if(ch==='р')return 'r';
 if(ch==='л')return 'l';
 if('мнң'.includes(ch))return 'nasal';
 if(ch==='з'||ch==='ж')return 'z';
 if('пкқтсшфхцчщ'.includes(ch))return 'voiceless';
 return '';
}
function matches(row, sample, plain){
 const seq=(sample&&sample.sequence)||[];
 const id=row.blockId, sub=row.subcase||'';
 if(sample&&seq.length){
  if(id==='free.chains.poss_dat')return seq.includes('POSS_3')&&seq.includes('DAT');
  if(id==='free.chains.third_acc')return seq.includes('POSS_3')&&seq.includes('ACC');
  if(id==='free.chains.third_loc')return seq.includes('POSS_3')&&seq.includes('LOC');
  if(id==='free.chains.third_abl')return seq.includes('POSS_3')&&seq.includes('ABL');
  if(id==='free.chains.plural_poss')return seq.includes('PL')&&seq.some(x=>String(x).startsWith('POSS'));
  if(id==='free.chains.full')return seq.length>=3;
  if(id==='free.poss.my')return seq.includes('POSS_1SG');
  if(id==='free.poss.your')return seq.includes('POSS_2SG');
  if(id==='free.poss.our')return seq.includes('POSS_1PL');
  if(id==='free.poss.polite')return seq.includes('POSS_2POL');
  if(id==='free.poss.third')return seq.includes('POSS_3');
  if(id==='free.person.i_we'&&sub==='i')return seq.includes('COP_1SG');
  if(id==='free.person.i_we'&&sub==='we')return seq.includes('COP_1PL');
  if(id==='free.person.you')return seq.includes('COP_2SG')||seq.includes('COP_2POL');
  if(id==='free.person.you_many')return seq.includes('COP_2PL')||seq.includes('COP_2PL_POL');
  if(id.startsWith('free.plural.group_'))return edgeOf(sample.before)===sub;
  if(id==='free.plural.vowel')return edgeOf(sample.before)==='vowel';
 }
 const text=String(plain||'').toLocaleLowerCase('ru');
 const keys={
  'free.plural.vowel':['а, о','в добавке а','→ а'],
  'free.plural.group_r':['после р'],
  'free.plural.group_l':['после л'],
  'free.plural.group_nasal':['м, н','после м'],
  'free.plural.group_z':['з или ж','после з'],
  'free.plural.group_voiceless':['глухой конец','кітаптар'],
  'free.plural.group_vowel':['после глас'],
  'free.plural.group_yw':['й или у','после й'],
  'free.harmony.vowel_loc':['в добавке а','а, о, ұ'],
  'free.voice.loc_onset':['-да, -де','неглухой','т после'],
  'free.poss.my':['мой'],
  'free.poss.your':['твой'],
  'free.poss.our':['наш'],
  'free.poss.polite':['ваш'],
  'free.person.you':['«ты»'],
  'free.person.you_many':['несколько людей','сыңдар'],
  'free.chains.poss_dat':['к его'],
  'free.chains.third_acc':['его или её книгу'],
  'free.chains.third_loc':['в его или её'],
  'free.chains.third_abl':['от его']
 };
 return (keys[id]||[]).some(k=>text.includes(k));
}
function uniqueRows(rows){
 const out=[], seen=new Set();
 for(const row of rows){
  const key=row.blockId+'|'+(row.subcase||'');
  if(seen.has(key))continue;
  seen.add(key);
  out.push(row);
 }
 return out;
}
function forPart(headingId, sample, plain){
 const rows=anchorsFor(headingId);
 if(rows.length===1)return {primary:rows[0], extra:[]};
 if(rows.length>1){
  const hits=rows.filter(row=>matches(row, sample, plain));
  if(hits.length===1)return {primary:hits[0], extra:[]};
  if(hits.length>1)return {primary:null, extra:hits};
  return {primary:null, extra:[]};
 }
 const seq=(sample&&sample.sequence)||[];
 if(seq.length>=2){
  const hits=uniqueRows(Object.values(ANCHORS).flat()).filter(row=>matches(row, sample, ''));
  if(hits.length===1)return {primary:hits[0], extra:[]};
  if(hits.length>1)return {primary:null, extra:hits};
 }
 return {primary:null, extra:[]};
}
const api={ANCHORS,anchorsFor,forPart,forBlock,capacity,all};
if(node)module.exports=api;else root.FreePracticeContent=api;
})(typeof window!=='undefined'?window:globalThis);
