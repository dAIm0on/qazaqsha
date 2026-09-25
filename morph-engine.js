(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports,D=node?require('./morph-data.js'):root.MorphData;
const norm=s=>String(s??'').normalize('NFC').toLocaleLowerCase('kk').trim().replace(/\s+/g,' ');
const V='аәеоөұүыі', backV='аоұы',frontV='әеөүі', voiceless='пфкқтсшщхһцчбвгд';
const lemmaMap=new Map(D.lemmas.map(l=>[l.id,l]));
function edge(s,override){if(override)return override;const c=norm(s).at(-1);if(V.includes(c))return 'vowel';if('йуию'.includes(c))return 'glide';if(c==='р')return 'r';if(c==='л')return 'l';if('мнң'.includes(c))return 'nasal';if('зж'.includes(c))return 'voiced_fricative';if(voiceless.includes(c))return 'voiceless';throw Error('Unknown phonemic edge');}
function harmonic(s,h){return s.replace(/A/g,h==='front'?'е':'а').replace(/I/g,h==='front'?'і':'ы').replace(/G/g,h==='front'?'г':'ғ').replace(/K/g,h==='front'?'к':'қ');}
function reject(message){throw Error(message);}
function initial(id,e){
 if(id==='PL')return ['vowel','glide','r'].includes(e)?'л':e==='voiceless'?'т':'д';
 if(id==='GEN')return ['vowel','nasal'].includes(e)?'н':e==='voiceless'?'т':'д';
 if(id==='ACC')return e==='vowel'?'н':e==='voiceless'?'т':'д';
 if(id==='ABL')return e==='nasal'?'н':e==='voiceless'?'т':'д';
 if(['Q','NEG','COP_1PL'].includes(id))return ['nasal','voiced_fricative'].includes(e)?'б':e==='voiceless'?'п':'м';
 if(['INS','COP_1SG'].includes(id))return e==='voiced_fricative'?'б':e==='voiceless'?'п':'м';
 return e==='voiceless'?'т':'д';
}
const cases=['GEN','DAT','ACC','LOC','ABL','INS'];
function form(lemmaId,sequence){
 const l=lemmaMap.get(lemmaId);if(!l||!Array.isArray(sequence)||!sequence.length||sequence.length>5)reject('Unlicensed input');
 let word=l.text,h=l.harmony,plural=false,poss=null,kase=null,cop=false,q=false,neg=false,verbForm=null;const trace=[];
 for(const id of sequence){
  if(!D.families[id])reject('Unknown morpheme');
  const before=word,e=edge(word,trace.length?null:l.edgeOverride),v=e==='vowel',vl=e==='voiceless';let suffix='',space=false,stem=word;
  if(q)reject('Nothing follows Q in this bank');
  if(id==='PL'){
   if(l.pos!=='noun'||plural||poss||kase||cop)reject('PL order');
   suffix=initial(id,e)+'Aр';plural=true;
  }else if(id.startsWith('POSS_')){
   if(l.pos!=='noun'||poss||kase||cop)reject('POSS order');
   const parts={POSS_1SG:v?'м':'Iм',POSS_2SG:v?'ң':'Iң',POSS_1PL:v?'мIз':'IмIз',POSS_2POL:v?'ңIз':'IңIз',POSS_3:v?'сI':'I'};
   suffix=parts[id];poss=id;
  }else if(cases.includes(id)){
   if(l.pos!=='noun'||kase||cop)reject('CASE order');
   if(id==='DAT')suffix=poss==='POSS_3'?'нA':['POSS_1SG','POSS_2SG'].includes(poss)?'A':(vl?'K':'G')+'A';
   else if(id==='ACC')suffix=poss==='POSS_3'?'н':initial(id,e)+'I';
   else if(id==='LOC')suffix=poss==='POSS_3'?'ндA':initial(id,e)+'A';
   else if(id==='ABL')suffix=(poss==='POSS_3'?'н':initial(id,e))+'Aн';
   else if(id==='GEN')suffix=initial(id,e)+'Iң';
   else suffix=initial(id,e)+'ен';
   kase=id;
  }else if(id.startsWith('COP_')){
   if(l.pos!=='noun'||!l.predicate||cop||kase)reject('Predicate context not licensed');
   const parts={COP_1SG:initial(id,e)+'Iн',COP_1PL:initial(id,e)+'Iз',COP_2SG:'сIң',COP_2POL:'сIз',COP_2PL:'сIңдAр',COP_2PL_POL:'сIздAр'};suffix=parts[id];cop=true;
  }else if(id==='Q'){
   if(l.pos!=='noun'||kase)reject('Q context not licensed');
   suffix=initial(id,e)+'A';space=true;q=true;
  }else if(id==='NEG'){
   if(l.pos!=='verb'||neg||verbForm)reject('NEG order');
   suffix=initial(id,e)+'A';neg=true;
  }else if(['PAST','PTCP_GAN','COND','CVB_IP'].includes(id)){
   if(l.pos!=='verb'||verbForm)reject('Verb form order');
   if(id==='CVB_IP'&&neg)reject('Negative converb needs a different construction');
   suffix=id==='PAST'?(vl?'т':'д')+'I':id==='PTCP_GAN'?(vl?'K':'G')+'Aн':id==='COND'?'сA':v?'п':'Iп';verbForm=id;
  }else if(id.startsWith('AGR_SHORT_')){
   if(l.pos!=='verb'||!['PAST','COND'].includes(verbForm)||cop)reject('Short agreement context');
   suffix={AGR_SHORT_1SG:'м',AGR_SHORT_1PL:'K',AGR_SHORT_2SG:'ң',AGR_SHORT_2POL:'ңIз'}[id];cop=true;
  }else reject('Unsupported construction');
  suffix=harmonic(suffix,h);
  if(!trace.length&&V.includes(suffix[0])&&l.vowelStem)stem=l.vowelStem;
  word=stem+(space?' ':'')+suffix;
  trace.push({before,stem,morpheme:id,suffix,after:word,edge:e,harmony:h,poss,kase,changed:stem!==before,space});
  if(id==='INS')h='front';
 }
 return {word,trace,lemma:l};
}
const op={PL:'множественное число',GEN:'родительный: «чего / кого?»',DAT:'дательный: «кому / чему / куда?»',ACC:'винительный: определённый объект',LOC:'местный: «где / у кого?»',ABL:'исходный: «от / из»',INS:'творительный: «с / посредством»',POSS_1SG:'принадлежит мне',POSS_2SG:'принадлежит тебе',POSS_1PL:'принадлежит нам',POSS_2POL:'принадлежит Вам (сіз)',POSS_3:'принадлежит ему / ей',COP_1SG:'сказуемое при мен: я',COP_1PL:'сказуемое при біз: мы',COP_2SG:'сказуемое при сен: ты',COP_2POL:'сказуемое при сіз: Вы',COP_2PL:'сказуемое при сендер: вы',COP_2PL_POL:'сказуемое при сіздер: вы',Q:'вопросительная частица «ли?»',NEG:'отрицание: не делай (сен)',PAST:'прошедшее время, 3-е лицо',PTCP_GAN:'причастие на -ған/-ген/-қан/-кен',COND:'условная форма «если…»',CVB_IP:'соединительное деепричастие на -(ы/і)п',AGR_SHORT_1SG:'короткое личное окончание: я',AGR_SHORT_1PL:'короткое личное окончание: мы',AGR_SHORT_2SG:'короткое личное окончание: ты',AGR_SHORT_2POL:'короткое личное окончание: Вы (сіз)'};
function pattern(s){return s.replace(/[ае]/g,'A').replace(/[ыі]/g,'I').replace(/[қк]/g,'K').replace(/[ғг]/g,'G');}
function errors(item,response){
 const a=norm(response),ex=norm(item.expected);if(a===ex)return [];
 const t=item.trace.at(-1),out=[];
 if(a===norm(t.before+(t.space?' ':'')+t.suffix)&&t.changed)return ['STEM_CHANGE'];
 if(a.startsWith(norm(t.stem))){
  const tail=a.slice(norm(t.stem).length).trim();
  if(pattern(tail)===pattern(t.suffix)&&tail!==t.suffix)out.push('HARMONY');
  else if(t.poss==='POSS_3'&&['DAT','ACC','LOC','ABL'].includes(t.morpheme)&&D.families[t.morpheme].variants.includes(tail))out.push('MORPH_STATE');
  else if(tail.length===t.suffix.length&&pattern(tail.slice(1))===pattern(t.suffix.slice(1))){
   if(pattern(tail[0])!==pattern(t.suffix[0]))out.push('ONSET_CLASS');
   if(tail.slice(1)!==t.suffix.slice(1))out.push('HARMONY');
  }
  else if(t.poss==='POSS_3'&&['DAT','ACC','LOC','ABL'].includes(t.morpheme))out.push('MORPH_STATE');
 }
 if(!out.length&&pattern(a)===pattern(ex))out.push('HARMONY');
 if(!out.length)out.push('OTHER_FORM');return out;
}
function reason(item,codes=[]){
 const t=item.trace.at(-1),label={vowel:'гласный',glide:'й/у (согласный край)',r:'р',l:'л',nasal:'м/н/ң',voiced_fricative:'з/ж',voiceless:'глухой край'}[t.edge];
 if(t.changed||codes.includes('STEM_CHANGE'))return 'Перед гласным эта основа меняется: '+t.before+' → '+t.stem+' + '+t.suffix+'. Это свойство проверенного слова.';
 if(t.poss==='POSS_3'&&['DAT','ACC','LOC','ABL'].includes(t.morpheme))return 'После принадлежности третьему лицу у этой падежной формы особый вариант: -'+t.suffix+'.';
 if(['POSS_1SG','POSS_2SG'].includes(t.poss)&&t.morpheme==='DAT')return 'После этой притяжательной формы дательный присоединяет только -'+t.suffix+'.';
 if(t.morpheme==='INS')return 'Здесь выбирается м/б/п, а гласный в -мен/-бен/-пен остаётся е.';
 return 'Текущий край: '+label+'; ряд '+(t.harmony==='front'?'передний (мягкий)':'задний (твёрдый)')+'. Для этой формы: -'+t.suffix+'.';
}
function itemFor(lemmaId,sequence,level='mixed'){
 const f=form(lemmaId,sequence),id='morph:v1:'+lemmaId+':'+sequence.join('.'),t=f.trace.at(-1),variants=D.families[t.morpheme].variants;
 const candidates=[...new Set(variants.map(s=>t.stem+(t.space?' ':'')+s).filter(s=>s!==f.word))];
 const target=D.levels.find(x=>x.id===level)?.choice;
 const matching=candidates.filter(c=>target==='harmony'?pattern(c)===pattern(f.word):target==='onset'?c.slice(-t.suffix.length+1)===f.word.slice(-t.suffix.length+1):true);
 let options=[f.word,...(matching.length?matching:candidates).slice(0,target?1:3)];
 if(t.changed&&!target)options=[f.word,t.before+t.suffix,...options.slice(1,3)];
 const sequenceLabel=sequence.map(x=>x==='PAST'&&sequence.some(y=>y.startsWith('AGR_SHORT_'))?'прошедшее время':op[x]).join(' → ');
 return {id,lemmaId,stem:f.lemma.text,gloss:f.lemma.gloss,sequence,operation:sequenceLabel,expected:f.word,trace:f.trace,options:[...new Set(options)],level,split:f.lemma.split,sources:[...new Set(sequence.flatMap(x=>D.families[x].sources))]};
}
let cached,byId;
function bank(){
 if(cached)return cached;const items=[];
 for(const l of D.lemmas){
  if(l.pos==='noun'){
   for(const id of Object.keys(D.families).filter(x=>x==='PL'||cases.includes(x)||x.startsWith('POSS_')||x.startsWith('COP_')||x==='Q')){
    if(id.startsWith('COP_')&&!l.predicate)continue;
    items.push(itemFor(l.id,[id]));
   }
   for(const seq of [['PL','POSS_1PL','ABL'],['PL','POSS_3','LOC'],['POSS_3','DAT'],['POSS_3','ACC'],['POSS_3','LOC'],['POSS_3','ABL'],['POSS_1SG','DAT'],['POSS_2SG','DAT'],['POSS_2POL','DAT'],['POSS_1PL','DAT']])items.push(itemFor(l.id,seq,'chains'));
   if(l.predicate)for(const seq of [['POSS_2SG','COP_1SG'],['COP_1PL','Q'],['POSS_1SG','COP_2SG']])items.push(itemFor(l.id,seq,'chains'));
  }else{
   for(const id of ['NEG','PAST','PTCP_GAN','COND','CVB_IP'])items.push(itemFor(l.id,[id],'verbs'));
   for(const base of ['PAST','COND'])for(const agr of ['AGR_SHORT_1SG','AGR_SHORT_1PL','AGR_SHORT_2SG','AGR_SHORT_2POL'])items.push(itemFor(l.id,[base,agr],'verbs'));
   for(const seq of [['NEG','PAST'],['NEG','PTCP_GAN'],['NEG','COND','AGR_SHORT_1SG']])items.push(itemFor(l.id,seq,'verbs'));
  }
 }
 cached=items;byId=new Map(items.map(i=>[i.id,i]));return items;
}
const getItem=id=>{bank();return byId.get(id);};
function seeded(seed){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function shuffle(a,random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function eligible(item,level){if(level==='mixed')return true;if(level==='chains')return item.level==='chains';if(level==='verbs')return item.level==='verbs';const spec=D.levels.find(x=>x.id===level);return item.sequence.length===1&&spec?.families.includes(item.sequence[0]);}
function createSession({level='harmony',mode='learn',responseMode='choice',seed=Date.now(),events=[],records={},limit=10,knownLemmas=[]}={}){
 if(!D.levels.some(x=>x.id===level)||!['learn','transfer'].includes(mode)||!['choice','input'].includes(responseMode))reject('Invalid session settings');
 const rng=seeded(seed),seen=new Set([...events.map(e=>e.lemmaId),...knownLemmas]);
 let pool=bank().filter(i=>eligible(i,level)&&i.split===(mode==='transfer'?'transfer':'train')&&(mode!=='transfer'||!seen.has(i.lemmaId)));
 pool=shuffle(pool,rng);
 if(mode==='learn'){
  const misses=new Map();for(const e of events.slice(-60))if(!e.correct&&!e.hinted)misses.set(e.sequence?.at(-1)+':'+e.contextClasses?.at(-1),(misses.get(e.sequence?.at(-1)+':'+e.contextClasses?.at(-1))||0)+1);
  const now=Date.now();pool.sort((a,b)=>{
   const priority=i=>(records[i.id]?.next_review<=now?4:0)+(misses.get(i.sequence.at(-1)+':'+i.trace.at(-1).edge)||0);
   return priority(b)-priority(a);
  });
 }
 const picked=[],used=new Set(),counts={};for(const i of pool){const fam=i.sequence.at(-1);if(used.has(i.lemmaId)||(level==='mixed'&&(counts[fam]||0)>=3))continue;picked.push(i);used.add(i.lemmaId);counts[fam]=(counts[fam]||0)+1;if(picked.length>=limit)break;}
 if(!picked.length)reject(mode==='transfer'?'Нет новых проверочных основ для этого режима.':'Нет допущенных заданий.');
 const sid='morph-'+seed+'-'+Math.floor(Math.random()*1e9);
 return {id:sid,version:1,dataVersion:D.version,level,mode,responseMode,modality:'text',queue:picked.map(i=>({id:i.id,options:shuffle(itemFor(i.lemmaId,i.sequence,level).options,rng)})),cursor:0,phase:'question',draft:'',hinted:false,result:null,startedAt:Date.now(),updatedAt:Date.now(),results:[],complete:false};
}
function answer(session,response,ms=null,at=Date.now()){
 if(!session||session.phase!=='question'||session.complete)return null;
 const item=getItem(session.queue[session.cursor]?.id);if(!item)reject('Unknown saved item');
 const correct=norm(response)===norm(item.expected),codes=errors(item,response);
 const event={eventId:session.id+':'+session.cursor,itemId:item.id,lemmaId:item.lemmaId,sequence:item.sequence,contextClasses:item.trace.map(t=>t.edge),level:session.level,mode:session.mode,modality:session.modality,responseMode:session.responseMode,response:String(response).slice(0,200),expected:item.expected,correct,hinted:session.hinted,errorCodes:codes,responseTime:Number.isFinite(ms)&&ms>=0?ms:null,at,dataVersion:D.version,transfer:session.mode==='transfer',audioAssetId:null};
 return {event,session:{...session,phase:'feedback',draft:String(response).slice(0,200),result:event,results:[...session.results,event],updatedAt:at}};
}
function next(session){if(!session||session.phase!=='feedback')return session;const cursor=session.cursor+1,complete=cursor>=session.queue.length;return {...session,cursor,phase:complete?'complete':'question',complete,draft:'',hinted:false,result:null,updatedAt:Date.now()};}
function summary(events){const scored=events.filter(e=>!e.hinted),n=scored.length,correct=scored.filter(e=>e.correct).length,times=scored.filter(e=>e.correct&&Number.isFinite(e.responseTime)).map(e=>e.responseTime).sort((a,b)=>a-b);return {n,correct,accuracy:n?Math.round(100*correct/n):null,uniqueLemmas:new Set(scored.map(e=>e.lemmaId)).size,medianMs:times.length?times[Math.floor(times.length/2)]:null};}
const api={data:D,edge,form,itemFor,bank,getItem,createSession,answer,next,summary,errors,reason,norm,eligible,pattern};if(node)module.exports=api;else root.MorphEngine=api;
})(typeof window!=='undefined'?window:globalThis);
