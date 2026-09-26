'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),P=require('./morph-teaching-practice');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
const ui=fs.readFileSync('morph-ui.js','utf8');

test('Train and transfer lemmas do not overlap',()=>{
 const train=new Set(E.data.lemmas.filter(l=>l.split==='train').map(l=>l.id));
 const transfer=E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id);
 assert.equal(transfer.some(id=>train.has(id)),false);
 assert.ok(transfer.length>0&&train.size>0);
});
test('Teaching plans and examples do not use transfer lemmas',()=>{
 const transfer=new Set(E.data.lemmas.filter(l=>l.split==='transfer').map(l=>l.id));
 for(const row of [...P.stage7GuidedPlan(),...P.stage8GuidedPlan()])assert.equal(transfer.has(row.lemmaId),false,row.lemmaId);
 const named=P.stage10ContaminatedLemmas().filter(id=>transfer.has(id));
 const session=E.createSession({mode:'transfer',level:'harmony',seed:3,knownLemmas:P.stage10ContaminatedLemmas()});
 assert.equal(session.queue.some(q=>named.includes(E.getItem(q.id).lemmaId)),false);
});
test('Strong transfer claim needs 40 items, two approaches, both sides and the Wilson bound',()=>{
 assert.equal(P.stage10StrongClaim({correct:36,total:40,approaches:2,sides:2}).pass,false);
 assert.equal(P.stage10StrongClaim({correct:37,total:40,approaches:2,sides:2}).pass,true);
 assert.equal(P.stage10StrongClaim({correct:39,total:39,approaches:2,sides:2}).status,'мало данных');
 assert.equal(P.stage10StrongClaim({correct:40,total:40,approaches:1,sides:2}).status,'мало данных');
 assert.equal(P.stage10StrongClaim({correct:40,total:40,approaches:2,sides:1}).status,'мало данных');
 assert.ok(P.stage10WilsonLower(37,40)>=0.8);
 assert.ok(P.stage10WilsonLower(36,40)<0.8);
});
test('One transfer block stays a narrow incomplete claim and does not update FSRS',()=>{
 const before=JSON.stringify({seen:1});
 const session=E.createSession({mode:'transfer',level:'person',seed:2,responseMode:'input'});
 assert.equal(session.hinted,false);
 assert.equal(E.reveal(session).hint,false);
 assert.equal(E.reveal({...session,phase:'feedback'}).expected,false);
 assert.ok(session.transferNote.includes('только вопрос'));
 assert.equal(ui.includes('COP полностью проверен'),false);
 assert.equal(ui.includes('person transfer mastered'),false);
 const claim=P.stage10StrongFromEvents(session.queue.map((q,i)=>({eventId:session.id+':'+i,lemmaId:E.getItem(q.id).lemmaId,sequence:E.getItem(q.id).sequence,correct:true,transfer:true,hinted:false,modality:'text',at:i+1})));
 assert.equal(claim.pass,false);assert.equal(claim.status,'мало данных');
 assert.equal(S.scheduleUpdate({transfer:true,mode:'transfer',correct:true,responseMode:'input',at:10}),null);
 assert.equal(JSON.stringify({seen:1}),before);
});
test('Same-session success is not retention and a delayed review is',()=>{
 const same=[{eventId:'s:0',itemId:'a',lemmaId:'n-a',at:1000,hinted:false,modality:'text',mode:'learn',correct:true},{eventId:'s:1',itemId:'a',lemmaId:'n-a',at:2000,hinted:false,modality:'text',mode:'learn',correct:true}];
 assert.equal(P.stage10Retention(same).count,0);
 const later=[{eventId:'old:0',itemId:'a',lemmaId:'n-a',at:1000,hinted:false,modality:'text',mode:'transfer',transfer:true,correct:true},{eventId:'new:0',itemId:'a',lemmaId:'n-a',at:1000+P.STAGE10_DELAY,hinted:false,modality:'text',mode:'learn',correct:true}];
 assert.equal(P.stage10Retention(later).count,1);
 assert.equal(P.stage10Retention(later).label,'есть отложенная проверка');
});
test('Exposed transfer lemma is not offered again as new',()=>{
 const first=E.createSession({mode:'transfer',level:'harmony',seed:8});
 const seen=first.queue.map(q=>E.getItem(q.id).lemmaId);
 const second=E.createSession({mode:'transfer',level:'harmony',seed:8,knownLemmas:seen});
 assert.equal(second.queue.some(q=>seen.includes(E.getItem(q.id).lemmaId)),false);
 const saved=S.putSession(S.empty(),first);
 assert.ok(seen.every(id=>saved.exposed.includes(id)));
 const merged=S.merge(saved,{version:1,events:[],exposed:[],session:null});
 assert.ok(seen.every(id=>merged.exposed.includes(id)));
});
test('Short bank copy and delayed feedback stay in the transfer UI',()=>{
 assert.equal(P.STAGE10_SHORT_BANK,'Недостаточно новых основ для полной проверки этого поднавыка.');
 assert.equal(P.STAGE10_SHORT_BANK,'Недостаточно новых основ для полной проверки этого поднавыка.');
 assert.ok(ui.includes('STAGE10_SHORT_BANK'));
 assert.ok(ui.includes('Проверены новые реальные основы'));
 assert.ok(ui.includes('Удержание:'));
 assert.equal(ui.includes('максимальное обобщение и не удержание'),true);
 new vm.Script(ui);
 assert.equal(E.bank().length,2231);
 assert.equal(E.writtenRelease.audioPlayback,false);
});
function fakeElement(tag){
 const node={tag,id:'',attrs:{},children:[],dataset:{},listeners:{},value:'',disabled:false};
 node.setAttribute=(k,v)=>{node.attrs[k]=String(v);if(k.startsWith('data-')){const key=k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());node.dataset[key]=String(v);}};
 node.addEventListener=(type,fn)=>{(node.listeners[type]||(node.listeners[type]=[])).push(fn);};
 node.querySelectorAll=sel=>{const out=[];const walk=n=>{if(selMatch(n,sel))out.push(n);for(const c of n.children||[])walk(c);};walk(node);return out;};
 node.querySelector=sel=>node.querySelectorAll(sel)[0]||null;
 node.click=()=>{(node.listeners.click||[]).forEach(fn=>fn({preventDefault(){},target:node}));};
 node.focus=()=>{};node.setSelectionRange=()=>{};
 Object.defineProperty(node,'innerHTML',{set(html){node.lastHtml=String(html);node.children=parseHtml(html);},get(){return node.lastHtml||'';}});
 Object.defineProperty(node,'onclick',{set(fn){node.listeners.click=fn?[fn]:[];},get(){return (node.listeners.click||[])[0]||null;}});
 Object.defineProperty(node,'oninput',{set(fn){node.listeners.input=fn?[fn]:[];},get(){return null;}});
 return node;
}
function selMatch(node,sel){
 if(sel.startsWith('#'))return node.id===sel.slice(1)||node.attrs.id===sel.slice(1);
 if(sel.startsWith('[')&&sel.endsWith(']')){const body=sel.slice(1,-1);if(body.includes('=')){const [k,v]=body.split('=');return node.attrs[k]===v.replace(/^"|"$/g,'');}return Object.prototype.hasOwnProperty.call(node.attrs,body);}
 return node.tag===sel;
}
function parseHtml(html){
 const root=fakeElement('fragment');const stack=[root];const re=/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g;let m;
 while((m=re.exec(html))){
  const closing=m[0].startsWith('</'),name=m[1].toLowerCase();
  if(closing){if(stack.length>1)stack.pop();continue;}
  const node=fakeElement(name);const attrRe=/([:@a-zA-Z_][:@a-zA-Z0-9-]*)(?:="([^"]*)"|='([^']*)')?/g;let a;
  while((a=attrRe.exec(m[2]||''))){const key=a[1],val=a[2]!=null?a[2]:(a[3]!=null?a[3]:'');if(key==='id')node.id=val;node.setAttribute(key,val);}
  stack[stack.length-1].children.push(node);
  if(!['input','br','img','meta','link','hr'].includes(name)&&!m[0].endsWith('/>'))stack.push(node);
 }
 return root.children;
}
function bootUi(){
 const host=fakeElement('div');host.id='morph-content';
 const body=fakeElement('body');
 const document={hidden:false,body,addEventListener(){},getElementById(id){return id==='morph-content'?host:null;}};
 const sandbox={console,Date,Math,JSON,Object,Array,String,Number,Boolean,Error,RegExp,Set,Map,parseInt,isNaN,performance:{now:()=>1},addEventListener(){},removeEventListener(){}};
 sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.document=document;
 vm.createContext(sandbox);
 for(const file of ['morph-data.js','morph-engine.js','morph-state.js','morph-teaching-data.js','morph-teaching-practice.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});
 let raw=sandbox.MorphState.empty();
 sandbox.MorphBridge={
  read(){return {module:sandbox.MorphState.migrate(raw),records:{},knownLemmas:[]};},
  session(v){raw=sandbox.MorphState.putSession(raw,v);return true;},
  teaching(e){const applied=sandbox.MorphState.recordTeaching(raw,e);if(!applied.accepted)return false;raw=applied.state;return true;},
  teachingResume(v){raw=sandbox.MorphState.putTeachingResume(raw,v);return true;},
  chain(v){raw=sandbox.MorphState.putChain(raw,v);return true;},
  answer(result){const applied=sandbox.MorphState.accept(raw,result);if(!applied.accepted)return false;raw=applied.state;return true;}
 };
 sandbox.QazaqShell={show(name){body.dataset.view=name;if(name==='morph')sandbox.MorphTrainer.render();}};
 sandbox.PersonalTrainers={openCatalog(){}};
 vm.runInContext(fs.readFileSync('morph-ui.js','utf8'),sandbox,{filename:'morph-ui.js'});
 return {sandbox,host,raw:()=>raw};
}
test('Person-transfer Next does not throw, and a missing repair id does not count as success',()=>{
 assert.ok(ui.includes('function onPracticeNext'));
 assert.ok(ui.includes('if(!source||!repair||!source.id||!repair.id'));
 assert.ok(ui.includes('if(!view||!chain.id||!view.lemmaId)'));
 const person=bootUi();
 person.sandbox.QazaqShell.show('morph');
 const level=person.host.querySelector('#morph-level');
 assert.ok(level,'level select');
 level.value='person';(level.listeners.change||[]).forEach(fn=>fn({target:level}));
 person.host.querySelector('[data-morph-transfer]').click();
 const answer=person.host.querySelector('[data-morph-answer]');
 assert.ok(answer,'person choice');
 answer.click();
 assert.equal(person.raw().session.phase,'feedback');
 person.host.querySelector('[data-morph-next]').click();
 assert.equal(person.raw().session.cursor,1);
 assert.equal(person.raw().session.phase,'question');
 assert.equal(person.host.lastHtml.includes('data-morph-question-pending'),false);
 const broken=bootUi();
 const made=broken.sandbox.MorphEngine.createSession({level:'mixed',mode:'learn',responseMode:'choice',seed:4});
 const wrong=broken.sandbox.MorphEngine.answer(made,'не-та-форма');
 wrong.event.itemId='no-such-item';wrong.session.result.itemId='no-such-item';wrong.event.correct=false;wrong.session.result.correct=false;
 broken.sandbox.MorphBridge.session(wrong.session);
 broken.sandbox.QazaqShell.show('morph');
 const before=broken.raw().session.cursor;
 broken.host.querySelector('[data-morph-next]').click();
 assert.equal(broken.raw().session.cursor,before);
 assert.equal(broken.raw().session.phase,'feedback');
 assert.equal(broken.raw().teaching.resume,null);
 assert.ok(broken.host.lastHtml.includes('Вопрос ещё не готов'));
});
console.log('MORPH_STAGE10_OK',n,'checks');
