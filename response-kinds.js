/* r7 step 1 / Q6-B: runtime support for the approved block 3–4 mechanics in the r7 PROPOSED format.
   choice · tap-token · sort · word-bank · detect. Lessons 1–2 never get these kinds.
   Every one of them is SUPPORT evidence only: correct here never counts as independent input
   and never gives forward mastery (see knowledge.js / evidence-state.js).
   Payload lives in q.payload; q.fields stays [] so legacy fields code paths are no-ops.
   Answers are arrays of strings (stable IDs), never button indexes. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const KINDS=Object.freeze(['choice','tap-token','sort','word-bank','detect']);
 const BLOCKS=/^[34]-\d+$/; // Q6-B: new mechanics only in blocks 3–4
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const ID=/^[A-Za-z0-9_.:-]{1,80}$/;
 function fail(msg){throw Error('response kind: '+msg);}
 function isSupportKind(kind){return KINDS.includes(kind);}
 function allowedLesson(lessonId){return BLOCKS.test(String(lessonId||''));}
 function text(v,label,max=400){if(typeof v!=='string'||!v.trim())fail(label);return v.slice(0,max);}
 function ids(list,label,min=1,max=60){
   if(!Array.isArray(list)||list.length<min||list.length>max)fail(label);
   const out=list.map(x=>{if(typeof x!=='string'||!ID.test(x))fail(label+' id');return x;});
   if(new Set(out).size!==out.length)fail(label+' duplicate id');
   return out;
 }
 function entries(list,label,textKey='text',min=2,max=60){
   if(!Array.isArray(list)||list.length<min||list.length>max)fail(label);
   const out=list.map(x=>{if(!obj(x)||typeof x.id!=='string'||!ID.test(x.id))fail(label+' id');return {id:x.id,[textKey]:text(x[textKey],label+' '+textKey)};});
   if(new Set(out.map(x=>x.id)).size!==out.length)fail(label+' duplicate id');
   return out;
 }
 function within(list,known,label){for(const id of list)if(!known.has(id))fail(label+' unknown id '+id);}
 // Validate + normalize payload. Throws on anything outside the approved contract.
 function normalize(kind,payload){
   if(!isSupportKind(kind))fail('unknown kind');
   if(!obj(payload))fail('payload');
   if(kind==='choice'){
     const options=entries(payload.options,'choice.options');
     const accepted=ids(payload.accepted,'choice.accepted',1,options.length);
     within(accepted,new Set(options.map(o=>o.id)),'choice.accepted');
     const cardinality=payload.cardinality==null?accepted.length:Math.floor(Number(payload.cardinality));
     if(!(cardinality>=accepted.length&&cardinality<=options.length))fail('choice.cardinality');
     return {options,accepted,cardinality};
   }
   if(kind==='tap-token'){
     const tokens=entries(payload.tokens,'tap-token.tokens','text',2,120);
     const known=new Set(tokens.map(t=>t.id));
     if(!Array.isArray(payload.accepted)||!payload.accepted.length||payload.accepted.length>20)fail('tap-token.accepted');
     const accepted=payload.accepted.map(span=>{const s=ids(span,'tap-token.span',1,tokens.length);within(s,known,'tap-token.span');return s;});
     const cardinality=payload.cardinality==null?Math.max(...accepted.map(s=>s.length)):Math.floor(Number(payload.cardinality));
     if(!(cardinality>=1&&cardinality<=tokens.length&&accepted.every(s=>s.length<=cardinality)))fail('tap-token.cardinality');
     return {tokens,accepted,cardinality};
   }
   if(kind==='sort'){
     const items=entries(payload.items,'sort.items','text',2,40);
     const categories=entries(payload.categories,'sort.categories','label',2,10);
     if(!obj(payload.accepted))fail('sort.accepted');
     const cats=new Set(categories.map(c=>c.id)),accepted={};
     for(const it of items){const c=payload.accepted[it.id];if(!cats.has(c))fail('sort.accepted '+it.id);accepted[it.id]=c;}
     if(Object.keys(payload.accepted).length!==items.length)fail('sort.accepted extra');
     return {items,categories,accepted};
   }
   if(kind==='word-bank'){
     if(!Array.isArray(payload.pieces)||payload.pieces.length<2||payload.pieces.length>40)fail('word-bank.pieces');
     const pieces=payload.pieces.map(p=>{if(!obj(p)||typeof p.id!=='string'||!ID.test(p.id))fail('word-bank.piece id');const count=p.count==null?1:Math.floor(Number(p.count));if(!(count>=1&&count<=5))fail('word-bank.piece count');return {id:p.id,text:text(p.text,'word-bank.piece text',120),count};});
     if(new Set(pieces.map(p=>p.id)).size!==pieces.length)fail('word-bank.pieces duplicate id');
     const limit=new Map(pieces.map(p=>[p.id,p.count]));
     if(!Array.isArray(payload.accepted)||!payload.accepted.length||payload.accepted.length>20)fail('word-bank.accepted');
     const accepted=payload.accepted.map(seq=>{
       if(!Array.isArray(seq)||!seq.length||seq.length>40)fail('word-bank.sequence');
       const used=new Map();for(const id of seq){if(!limit.has(id))fail('word-bank.sequence unknown id '+id);used.set(id,(used.get(id)||0)+1);if(used.get(id)>limit.get(id))fail('word-bank.sequence over count '+id);}
       return seq.slice();
     });
     return {pieces,accepted};
   }
   // detect composite: verdict + broken step (only for wrong items; correct-control items need no step)
   if(!obj(payload.verdict)||!['correct','wrong'].includes(payload.verdict.accepted))fail('detect.verdict');
   const out={verdict:{accepted:payload.verdict.accepted},target:text(payload.target||'','detect.target',600)};
   if(out.verdict.accepted==='wrong'){
     if(!obj(payload.broken_step))fail('detect.broken_step');
     const options=entries(payload.broken_step.options,'detect.broken_step.options');
     const accepted=ids(payload.broken_step.accepted,'detect.broken_step.accepted',1,options.length);
     within(accepted,new Set(options.map(o=>o.id)),'detect.broken_step.accepted');
     out.broken_step={options,accepted};
   }else if(obj(payload.broken_step)){
     out.broken_step={options:entries(payload.broken_step.options,'detect.broken_step.options'),accepted:[]};
   }
   return out;
 }
 const set=a=>new Set(a);
 const sameSet=(a,b)=>{const A=set(a),B=set(b);return A.size===B.size&&[...A].every(x=>B.has(x));};
 function sortMap(answers){const m={};for(const a of answers||[]){const s=String(a),i=s.indexOf('=');if(i>0)m[s.slice(0,i)]=s.slice(i+1);}return m;}
 // Returns {correct, parts}. Partial parts are diagnostic only.
 function evaluate(q,answers){
   const p=q.payload,a=(answers||[]).map(String);
   if(q.kind==='choice'){
     const chosen=set(a);
     const parts=p.options.map(o=>chosen.has(o.id)===p.accepted.includes(o.id));
     return {correct:a.length<=p.cardinality&&sameSet(a,p.accepted),parts};
   }
   if(q.kind==='tap-token'){
     const ok=a.length<=p.cardinality&&p.accepted.some(span=>sameSet(a,span));
     return {correct:ok,parts:[ok]};
   }
   if(q.kind==='sort'){
     const m=sortMap(a),parts=p.items.map(it=>m[it.id]===p.accepted[it.id]);
     return {correct:parts.every(Boolean),parts};
   }
   if(q.kind==='word-bank'){
     const ok=p.accepted.some(seq=>seq.length===a.length&&seq.every((id,i)=>id===a[i]));
     return {correct:ok,parts:[ok]};
   }
   if(q.kind==='detect'){
     const verdict=(a.find(x=>x.startsWith('verdict:'))||'').slice(8),step=(a.find(x=>x.startsWith('step:'))||'').slice(5);
     const verdictOk=verdict===p.verdict.accepted;
     const stepOk=p.verdict.accepted==='correct'?true:!!(p.broken_step&&p.broken_step.accepted.includes(step));
     return {correct:verdictOk&&stepOk,parts:[verdictOk,stepOk]};
   }
   return {correct:false,parts:[]};
 }
 function missing(q,answers){
   const a=(answers||[]).map(String);
   if(q.kind==='sort'){const m=sortMap(a);return q.payload.items.some(it=>!m[it.id]);}
   if(q.kind==='detect'){const v=a.find(x=>x.startsWith('verdict:'));if(!v)return true;return v==='verdict:wrong'&&!!q.payload.broken_step&&!a.some(x=>x.startsWith('step:'));}
   return a.length===0;
 }
 function solutionText(q){
   const p=q.payload,by=(list,key='text')=>id=>{const x=list.find(e=>e.id===id);return x?x[key]:id;};
   if(q.kind==='choice')return p.accepted.map(by(p.options)).join(', ');
   if(q.kind==='tap-token')return p.accepted.map(s=>s.map(by(p.tokens)).join(' ')).join(' / ');
   if(q.kind==='sort')return p.items.map(it=>it.text+' → '+by(p.categories,'label')(p.accepted[it.id])).join('; ');
   if(q.kind==='word-bank')return p.accepted.map(s=>s.map(by(p.pieces)).join(' ')).join(' / ');
   if(q.kind==='detect')return p.verdict.accepted==='correct'?'Верно':'Есть ошибка: '+p.broken_step.accepted.map(by(p.broken_step.options)).join(', ');
   return '';
 }
// r7 2b QA B1: the learner's own answer in human words (never option/token/piece ids).
 function answerText(q,answers){
   const p=q&&q.payload,a=(answers||[]).map(String);if(!p)return '';
   const by=(list,key='text')=>id=>{const x=(list||[]).find(e=>e.id===id);return x?x[key]:'';};
   if(q.kind==='choice')return a.map(by(p.options)).filter(Boolean).join(', ');
   if(q.kind==='tap-token')return a.map(by(p.tokens)).filter(Boolean).join(' ');
   if(q.kind==='sort'){const m=sortMap(a);return p.items.filter(it=>m[it.id]).map(it=>{const c=by(p.categories,'label')(m[it.id]);return c?it.text+' → '+c:'';}).filter(Boolean).join('; ');}
   if(q.kind==='word-bank')return a.map(by(p.pieces)).filter(Boolean).join(' ');
   if(q.kind==='detect'){
     const v=(a.find(x=>x.startsWith('verdict:'))||'').slice(8),st=(a.find(x=>x.startsWith('step:'))||'').slice(5);
     const verdict=v==='correct'?'Верно':v==='wrong'?'Есть ошибка':'';
     const step=st&&p.broken_step?by(p.broken_step.options)(st):'';
     return verdict+(verdict&&step?': '+step:'');
   }
   return '';
 }
 function answerLead(q){return q.kind==='word-bank'?'Ты собрала':q.kind==='sort'?'Ты разложила':q.kind==='detect'?'Твой ответ':'Ты выбрала';}
 function payloadFingerprintSource(q){return JSON.stringify([q.kind,q.payload]);}
 // ---- browser renderer: one hidden input #rk-response holds the JSON answer array ----
 function chip(attrs,label,esc){return `<button type="button" class="chip" aria-pressed="false" ${attrs}>${esc(label)}</button>`;}
 function markup(q,esc){
   const p=q.payload,e=esc||(v=>String(v));
   const head=`<div class="fields rk" data-rk="${e(q.kind)}"><input id="rk-response" type="hidden" value="[]">`;
   if(q.kind==='choice')return head+`<div class="field-row"><span class="field-label">${e(p.cardinality>1?'Выбери '+p.cardinality:'Выбери один')}</span><div class="field-control tap-choices" role="group">${p.options.map(o=>chip(`data-rk-toggle="${e(o.id)}"`,o.text,e)).join('')}</div></div></div>`;
   if(q.kind==='tap-token')return head+`<div class="field-row"><span class="field-label">Отметь нужное</span><div class="field-control tap-choices" role="group" lang="kk">${p.tokens.map(t=>chip(`data-rk-toggle="${e(t.id)}"`,t.text,e)).join('')}</div></div></div>`;
   if(q.kind==='sort')return head+p.items.map(it=>`<div class="field-row"><span class="field-label" lang="kk">${e(it.text)}</span><div class="field-control tap-choices" role="group">${p.categories.map(c=>chip(`data-rk-sort="${e(it.id)}" data-rk-cat="${e(c.id)}"`,c.label,e)).join('')}</div></div>`).join('')+'</div>';
   if(q.kind==='word-bank')return head+`<div class="field-row"><span class="field-label">Собери</span><div class="field-control"><p class="rk-built" lang="kk" data-rk-built></p></div></div><div class="field-row"><span class="field-label">Кусочки</span><div class="field-control tap-choices" role="group" lang="kk">${p.pieces.map(x=>chip(`data-rk-piece="${e(x.id)}" data-rk-count="${x.count}"`,x.text+(x.count>1?' ×'+x.count:''),e)).join('')}<button type="button" class="text-button" data-rk-undo>Стереть</button></div></div></div>`;
   const steps=p.broken_step?`<div class="field-row"><span class="field-label">Какой шаг сломан?</span><div class="field-control tap-choices" role="group">${p.broken_step.options.map(o=>chip(`data-rk-step="${e(o.id)}"`,o.text,e)).join('')}</div></div>`:'';
   const target=p.target?`<div class="field-row"><span class="field-label">Проверь</span><div class="field-control"><p lang="kk" data-rk-target>${e(p.target)}</p></div></div>`:'';
   return head+target+`<div class="field-row"><span class="field-label">Решение</span><div class="field-control tap-choices" role="group">${chip('data-rk-verdict="correct"','Верно',e)}${chip('data-rk-verdict="wrong"','Есть ошибка',e)}</div></div>${steps}</div>`;
 }
 function read(q,doc){
   const el=(doc||root.document).getElementById('rk-response');
   try{const v=JSON.parse(el&&el.value||'[]');return Array.isArray(v)?v.map(String):[];}catch{return [];}
 }
 function paint(form,q){
   if(!form)return;
   const a=read(q,{getElementById:id=>form.querySelector('#'+id)}),m=sortMap(a);
   form.querySelectorAll('[data-rk-toggle]').forEach(b=>b.setAttribute('aria-pressed',a.includes(b.dataset.rkToggle)?'true':'false'));
   form.querySelectorAll('[data-rk-sort]').forEach(b=>b.setAttribute('aria-pressed',m[b.dataset.rkSort]===b.dataset.rkCat?'true':'false'));
   form.querySelectorAll('[data-rk-verdict]').forEach(b=>b.setAttribute('aria-pressed',a.includes('verdict:'+b.dataset.rkVerdict)?'true':'false'));
   form.querySelectorAll('[data-rk-step]').forEach(b=>b.setAttribute('aria-pressed',a.includes('step:'+b.dataset.rkStep)?'true':'false'));
   const built=form.querySelector('[data-rk-built]');
   if(built&&q.payload.pieces){const t=new Map(q.payload.pieces.map(x=>[x.id,x.text]));built.textContent=a.map(id=>t.get(id)||'').join(' ');}
 }
 function click(form,q,btn){
   if(!form||form.classList.contains('answered'))return false;
   const input=form.querySelector('#rk-response');if(!input)return false;
   let a=read(q,{getElementById:id=>form.querySelector('#'+id)});
   if(btn.dataset.rkToggle){
     const id=btn.dataset.rkToggle,limit=q.payload.cardinality||1;
     if(a.includes(id))a=a.filter(x=>x!==id);else if(limit===1)a=[id];else if(a.length<limit)a=[...a,id];
   }else if(btn.dataset.rkSort){
     const m=sortMap(a);m[btn.dataset.rkSort]=btn.dataset.rkCat;a=q.payload.items.filter(it=>m[it.id]).map(it=>it.id+'='+m[it.id]);
   }else if(btn.dataset.rkVerdict){
     a=['verdict:'+btn.dataset.rkVerdict,...(btn.dataset.rkVerdict==='wrong'?a.filter(x=>x.startsWith('step:')):[])];
   }else if(btn.dataset.rkStep){
     const v=a.find(x=>x.startsWith('verdict:'))||'verdict:wrong';a=[v==='verdict:correct'?'verdict:wrong':v,'step:'+btn.dataset.rkStep];
   }else if(btn.dataset.rkPiece){
     const id=btn.dataset.rkPiece,limit=Number(btn.dataset.rkCount)||1;if(a.filter(x=>x===id).length<limit)a=[...a,id];
   }else if(btn.hasAttribute('data-rk-undo')){a=a.slice(0,-1);}
   else return false;
   input.value=JSON.stringify(a);paint(form,q);
   return true;
 }
 function mark(form,q,result){
   if(!form)return;
   form.querySelectorAll('button').forEach(b=>{b.disabled=true;});
   const r=form.querySelector('.rk');if(r)r.setAttribute('data-rk-result',result&&result.correct?'correct':'incorrect');
 }
 const api={KINDS,isSupportKind,allowedLesson,normalize,evaluate,missing,solutionText,answerText,answerLead,payloadFingerprintSource,markup,read,paint,click,mark};
 if(node)module.exports=api;else root.ResponseKinds=api;
})(typeof window!=='undefined'?window:globalThis);
