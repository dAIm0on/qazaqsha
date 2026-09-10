(function(root){
 'use strict';
 const core=typeof module!=='undefined'&&module.exports?require('./core.js'):root.TrainerCore;
 const labels={plural_initial_consonant:'Начало окончания: Л / Д / Т',vowel_harmony:'Гласная окончания: А / Е',plural_after_numeral:'После количества окончание множественного числа не нужно',number_order:'Порядок разрядов',number_confusion:'Перепутано число',letter_confusion:'Различие букв',lexical_retrieval:'Вспоминание слова',unclassified:'Нужно сверить весь ответ'};
 function classify(expected,actual,q={},field={}){
   const e=core.normalize(expected,field.kind),a=core.normalize(actual,field.kind);if(e===a)return [];
   const out=[],suffix=/[лдт][ае]р$/u;
   if((q.ruleIds||[]).includes('quantity')||q.skill_type==='plural_suppression'){
     const stripped=a.split(' ').map(s=>suffix.test(s)?s.slice(0,-3):s).join(' ');
     if(stripped===e&&a!==e)out.push('plural_after_numeral');
   }
   if(suffix.test(e)&&suffix.test(a)&&e.slice(0,-3)===a.slice(0,-3)){
     if(e.at(-3)!==a.at(-3))out.push('plural_initial_consonant');
     if(e.at(-2)!==a.at(-2))out.push('vowel_harmony');
   }
   if(['а','е'].includes(e)&&['а','е'].includes(a))out.push('vowel_harmony');
   if(['л','д','т'].includes(e)&&['л','д','т'].includes(a))out.push('plural_initial_consonant');
   if(!out.length&&q.topic==='numbers')out.push(e.split(' ').sort().join(' ')===a.split(' ').sort().join(' ')?'number_order':'number_confusion');
   if(!out.length&&e.length===a.length){const diff=[...e].map((c,i)=>[c,a[i]]).filter(([x,y])=>x!==y);if(diff.length===1&&['ыі','ұү','кқ','гғ','нң','аә','оө','иі'].some(pair=>diff[0].every(x=>pair.includes(x))))out.push('letter_confusion');}
   return out.length?out:[q.topic==='vocab'?'lexical_retrieval':'unclassified'];
 }
 function diagnose(q,answers,result,at){
   if(q.kind!=='fields')return [];
   return q.fields.flatMap((f,i)=>result.parts[i]?[]:classify(f.answers[0],answers[i],q,f).map(error_type=>({expected_answer:f.answers[0],actual_answer:String(answers[i]||''),error_type,timestamp:at,field:i,card_id:q.id})));
 }
 const api={classify,diagnose,labels};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ErrorDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
