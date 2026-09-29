/* Deterministic written-form engine for ауыспалы осы/келер шақ practice. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const VOWELS=new Set([...'аәеёиіоөұүуыэюя']);
 const VOICELESS=new Set([...'кқпстфхһцшщ']);
 const B_GROUP=new Set([...'мнңжз']);
 const PERSON={
   '1sg':{subject:'мен',back:'мын',front:'мін'},
   '1pl':{subject:'біз',back:'мыз',front:'міз'},
   '2sg':{subject:'сен',back:'сың',front:'сің'},
   '2pl':{subject:'сендер',back:'сыңдар',front:'сіңдер'},
   '2pol':{subject:'сіз',back:'сыз',front:'сіз'},
   '2polpl':{subject:'сіздер',back:'сыздар',front:'сіздер'},
   '3':{subject:'ол / олар',back:'ды',front:'ді'}
 };
 function front(x){return x&&x.harmony==='front';}
 function linker(x){const last=[...x.stem.toLowerCase()].at(-1);return VOWELS.has(last)?'й':(front(x)?'е':'а');}
 function negativeParticle(x){
   const last=[...(x.negative_stem||x.stem).toLowerCase()].at(-1);
   const vowel=front(x)?'е':'а';
   if(VOICELESS.has(last)||['б','в','г','д'].includes(last))return 'п'+vowel;
   if(B_GROUP.has(last))return 'б'+vowel;
   return 'м'+vowel;
 }
 function suffix(x,person){const p=PERSON[person];if(!p)throw Error('Unknown person '+person);return front(x)?p.front:p.back;}
 function form(x,person,polarity){
   if(!x||!x.stem)throw Error('Bad lexeme');
   if(polarity==='negative')return (x.negative_stem||x.stem)+negativeParticle(x)+'й'+suffix(x,person);
   return x.stem+linker(x)+suffix(x,person);
 }
 function slug(v){return String(v||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');}
 function qid(lessonId,generatorId,lexemeId,person,polarity){
   return 'gen:'+lessonId+':'+slug(generatorId)+':'+slug(lexemeId)+':'+person+':'+polarity;
 }
 function explanation(x,person,polarity){
   const f=form(x,person,polarity),sub=PERSON[person].subject;
   if(polarity==='negative')return x.lemma+' → '+(x.negative_stem||x.stem)+' + '+negativeParticle(x)+' + й + '+suffix(x,person)+' → '+f+'.';
   return x.lemma+' → '+x.stem+' + '+linker(x)+' + '+suffix(x,person)+' → '+f+'.';
 }
 function expand(lessonId,g){
   const out=[];
   for(const x of g.lexemes||[])for(const person of g.persons||[])for(const polarity of g.polarities||[]){
     const answer=form(x,person,polarity),sub=PERSON[person]&&PERSON[person].subject||person;
     const ruleIds=polarity==='negative'?['v2:'+lessonId+':negative','v2:'+lessonId+':person']:['v2:'+lessonId+':linker','v2:'+lessonId+':person'];
     if((x.negative_stem||x.stem)!==x.stem&&!ruleIds.includes('v2:'+lessonId+':alternation'))ruleIds.push('v2:'+lessonId+':alternation');
     const skillBindings=ruleIds.map(ruleId=>({item_id:'rule:'+ruleId,skill_type:'application',field:0,facet:null}));
     out.push({
       id:qid(lessonId,g.id,x.id,person,polarity),origin:'generated',topic:'verbs',kind:'fields',
       title:polarity==='negative'?'Собери отрицательную форму':'Собери форму',
       stimulus:sub+' + '+x.lemma+' — '+x.translation,
       fields:[{label:'Ответ',kind:'text',answers:[answer]}],
       explanation:explanation(x,person,polarity),lessonId,
       ruleIds,skillBindings,
       generator:{generator_id:g.id,lexeme_id:x.id,person,polarity},
       item_type:'prod'
     });
   }
   return out;
 }
 const api={PERSON,linker,negativeParticle,suffix,form,qid,expand};
 if(node)module.exports=api;else root.NonpastEngine=api;
})(typeof window!=='undefined'?window:globalThis);
