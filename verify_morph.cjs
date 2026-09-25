'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./morph-engine'),S=require('./morph-state'),P=require('./progress'),Core=require('./core'),gold=require('./morph-gold.json');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name);}
test('147 independent golden pairs, including exceptions and chains',()=>{for(const g of gold)assert.equal(E.form(g.lemmaId,g.sequence).word,g.expected,JSON.stringify(g));});
test('Every admitted allomorph has an explicit golden witness',()=>{const seen={};for(const g of gold)for(const t of E.form(g.lemmaId,g.sequence).trace)(seen[t.morpheme]??=new Set()).add(t.suffix);for(const f of Object.values(E.data.families))for(const v of f.variants)assert.ok(seen[f.id]?.has(v),f.id+':'+v);});
test('Source IDs, lexical split, IDs, answers, unique options, full chains',()=>{
 const bank=E.bank();assert.equal(new Set(bank.map(x=>x.id)).size,bank.length);assert.equal(new Set(E.data.lemmas.map(l=>l.text)).size,E.data.lemmas.length);
 for(const i of bank){assert.equal(new Set(i.options).size,i.options.length);assert.equal(i.options.filter(x=>x===i.expected).length,1);assert.equal(E.form(i.lemmaId,i.sequence).word,i.expected);for(const s of i.sources)assert.ok(E.data.sources[s]);for(let k=1;k<i.trace.length;k++)assert.equal(i.trace[k].before,i.trace[k-1].after);}
});
test('No broad last-letter generator and no illegal chain',()=>{
 for(const [lemma,seq] of [['unknown',['PL']],['n-бала',['PL','PL']],['n-бала',['DAT','POSS_3']],['n-бала',['POSS_3','PL']],['n-бала',['GEN','DAT']],['n-бала',['NEG']],['v-кел',['POSS_3']],['v-кел',['NEG','CVB_IP']],['v-кел',['AGR_SHORT_1SG']],['n-бала',['INS','Q']],['n-көше',['COP_1SG']]])assert.throws(()=>E.form(lemma,seq));
});
test('Contrasts preserve family-specific nasal environments',()=>{
 const f=id=>E.form('n-адам',[id]).word;assert.deepEqual(['GEN','ACC','ABL','COP_1SG','COP_1PL','Q','INS'].map(f),['адамның','адамды','адамнан','адаммын','адамбыз','адам ба','адаммен']);
});
test('No unconditional stem voicing or syncope',()=>{assert.equal(E.form('n-ат',['POSS_1SG']).word,'атым');assert.equal(E.form('n-орын',['LOC']).word,'орында');assert.equal(E.form('n-орын',['POSS_3']).word,'орны');assert.equal(E.form('v-жап',['PAST']).word,'жапты');});
test('Error dimensions do not collapse into wrong',()=>{
 const x=E.itemFor('n-кітап',['PL']);assert.deepEqual(E.errors(x,'кітаптер'),['HARMONY']);assert.deepEqual(E.errors(x,'кітапдар'),['ONSET_CLASS']);assert.deepEqual(E.errors(x,'кітапдер'),['ONSET_CLASS','HARMONY']);assert.deepEqual(E.errors(E.itemFor('n-кітап',['POSS_1SG']),'кітапым'),['STEM_CHANGE']);assert.deepEqual(E.errors(E.itemFor('n-кітап',['POSS_3','DAT']),'кітабыға'),['MORPH_STATE']);assert.deepEqual(E.errors(x,'КІТАПТАР'),[]);
});
test('Sessions reproducible, varied, and hold out complete lemmas',()=>{
 for(const level of E.data.levels.map(x=>x.id))for(let seed=1;seed<=10;seed++){
  const a=E.createSession({level,seed}),b=E.createSession({level,seed});assert.deepEqual(a.queue,b.queue);assert.equal(new Set(a.queue.map(q=>E.getItem(q.id).lemmaId)).size,a.queue.length);
 }
 const a=E.createSession({mode:'transfer',level:'mixed',seed:5}),seen=a.queue.map(q=>E.getItem(q.id).lemmaId),b=E.createSession({mode:'transfer',level:'mixed',seed:5,knownLemmas:seen});assert.ok(b.queue.every(q=>!seen.includes(E.getItem(q.id).lemmaId)));assert.throws(()=>E.createSession({mode:'transfer',knownLemmas:E.data.lemmas.map(l=>l.id)}));
});
test('Answer, refresh feedback, idempotency, cursor and complete',()=>{
 let m=S.putSession(S.empty(),E.createSession({seed:1,responseMode:'input'}));m=S.putSession(m,{...m.session,draft:'черновик'});assert.equal(S.migrate(JSON.parse(JSON.stringify(m))).session.draft,'черновик');
 while(!m.session.complete){const q=E.getItem(m.session.queue[m.session.cursor].id),r=E.answer(m.session,q.expected,1100);const a=S.accept(m,r);assert.ok(a.accepted);assert.equal(S.accept(a.state,r).accepted,false);m=S.migrate(JSON.parse(JSON.stringify(a.state)));assert.equal(m.session.phase,'feedback');m=S.putSession(m,E.next(m.session));}
 assert.equal(m.events.length,10);assert.equal(E.answer(m.session,'x'),null);assert.equal(E.summary(m.events).accuracy,100);
});
test('Old state, export/import and cloud merge preserve old FSRS and resume',()=>{
 let p=P.migrate({schema:6,records:{legacy:Core.updateRecord({},true,false,1700000000000)},learning:{lessonId:'1-1'},courseProgress:{}},1700000000000);const before=JSON.stringify({records:p.records,course:p.courseProgress});p.morphTrainer=S.putSession(p.morphTrainer,E.createSession({seed:2}));
 const text=P.serialize(p),round=P.validate(text,new Set(['legacy'])).state;assert.equal(JSON.stringify({records:round.records,course:round.courseProgress}),before);assert.equal(round.morphTrainer.session.id,p.morphTrainer.session.id);
 const remote=P.migrate(round);remote.morphTrainer.session=null;const merged=P.merge(round,remote);assert.equal(merged.morphTrainer.session.id,round.morphTrainer.session.id);assert.deepEqual(merged.records,round.records);assert.deepEqual(merged.courseProgress,round.courseProgress);
});
test('Merge events converges; exposure survives capped history; corruption isolated',()=>{
 let a=S.putSession(S.empty(),E.createSession({seed:4}));a=S.accept(a,E.answer(a.session,'x',null)).state;const b=JSON.parse(JSON.stringify(a));b.session=null;assert.equal(S.merge(a,b).events.length,1);assert.deepEqual(S.merge(a,b).exposed,S.merge(b,a).exposed);const damaged=P.migrate({schema:7,records:{ok:{seen:1}},morphTrainer:{version:999}});assert.ok(damaged.records.ok);assert.ok(damaged.morphTrainer.recovery);assert.equal(S.migrate({...a,session:{...a.session,dataVersion:'old'}}).session,null);
});
test('Full browser script order loads with shared morphology state',()=>{
 const html=fs.readFileSync('index.html','utf8'),s={console,localStorage:{getItem(){return null;}}};s.window=s;s.globalThis=s;
 // Exercise the same dependency ordering as the browser, without a DOM or network.
 for(const name of ['config.js','fsrs-vendor.js','scheduler.js','core.js','package-schema.js','course-progress.js','morph-data.js','morph-engine.js','morph-state.js','progress.js'])vm.runInNewContext(fs.readFileSync(name,'utf8'),s,{filename:name});
 assert.equal(s.window.ProgressStore.empty().morphTrainer.version,1);assert.ok(html.indexOf('morph-state.js')<html.indexOf('src="progress.js"'));
});
test('SW cache contains all module assets and actual existing files',()=>{
 const text=fs.readFileSync('sw.js','utf8'),a=JSON.parse(text.match(/ASSETS=(\[[^;]+\]);/)[1]);for(const f of ['morph-data.js','morph-engine.js','morph-state.js','morph-ui.js','morph.css'])assert.ok(a.includes(f));for(const f of a)assert.ok(fs.existsSync(f),f);
});
test('No audio or pseudoword achievement without reviewed data',()=>{assert.equal(E.data.audio.length,0);assert.equal(E.data.pseudowords.length,0);assert.equal(E.createSession().modality,'text');});
test('Transfer UI hides immediate synthesis and chain prompt does not claim third person',()=>{assert.ok(fs.readFileSync('morph-ui.js','utf8').includes("feedback+(transfer?'':"));assert.ok(!E.itemFor('v-кел',['PAST','AGR_SHORT_1SG']).operation.includes('3-е лицо'));});
console.log('MORPH_OK',n,'checks;',E.bank().length,'items;',gold.length,'gold pairs');
