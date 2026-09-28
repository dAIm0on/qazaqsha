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
 'poss.77':[{blockId:'free.poss.compare',subcase:'owners',title:'Потренироваться'}]
};
function formOf(lemma,sequence){try{const built=E.form(lemma.id,sequence);return built&&built.word?built:null;}catch(e){return null;}}
function nouns(){return E.data.lemmas.filter(l=>l.split==='train'&&l.pos==='noun');}
function swap(suffix,kind){
 const map=kind==='vowel'?{а:'е',е:'а',ы:'і',і:'ы'}:{ғ:'қ',қ:'ғ',г:'к',к:'г'};
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
function base(lemma,built,blockId,subcase,skill){
 const step=built.trace[built.trace.length-1];
 return {cardId:blockId+':'+lemma.id+':'+subcase,blockId,subcase,targetSkillIds:[skill],prerequisiteBlockIds:[],lemmaId:lemma.id,normalizedLemmaKey:String(lemma.text).toLocaleLowerCase('kk'),split:'train',holdout:false,admissionStatus:'runtime_approved',engineWord:built.word,expected:built.word,promptSpec:{ru:'',hint:''},translationSpec:{lemma:lemma.text,lemmaRu:lemma.gloss||'',target:'',context:lemma.text,contextRu:lemma.gloss||''},exerciseType:'choose',options:[],answer:built.word,feedbackRu:'',showExpectedBeforeAnswer:false,changed:!!step.changed};
}
function choice(card,correct,wrongs,prompt,hint,target,feedback){
 const options=[correct].concat(wrongs).filter((x,i,a)=>x&&a.indexOf(x)===i);
 if(options.length<2||!options.includes(correct))return null;
 card.options=options;card.answer=correct;card.promptSpec={ru:prompt,hint};card.translationSpec.target=target;card.feedbackRu=feedback;return card;
}
function meaningCard(id,blockId,subcase,lemma,prompt,answer,other,target){
 return {cardId:id,blockId,subcase,targetSkillIds:['meaning'],prerequisiteBlockIds:[],lemmaId:lemma.id,normalizedLemmaKey:String(lemma.text).toLocaleLowerCase('kk'),split:'train',holdout:false,admissionStatus:'runtime_approved',exerciseType:'meaning',options:[answer,other].filter((x,i,a)=>a.indexOf(x)===i),answer,expected:'',showExpectedBeforeAnswer:false,promptSpec:{ru:prompt,hint:'Смысл решаем до окончания.'},translationSpec:{lemma:lemma.text,lemmaRu:lemma.gloss||'',target,context:lemma.text,contextRu:lemma.gloss||''},feedbackRu:answer==='куда'?'Сейчас человек ещё в пути: куда.':answer==='где'?'Сейчас человек уже на месте: где.':answer==='кому'?'Сейчас важно, кому это дают: кому.':'Смысл: '+answer+'.'};
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
 return cards;
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
const api={ANCHORS,anchorsFor,forBlock,capacity,all};
if(node)module.exports=api;else root.FreePracticeContent=api;
})(typeof window!=='undefined'?window:globalThis);
