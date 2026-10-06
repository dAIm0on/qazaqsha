// r7 X QA #58 item 3: no raw codes / empty substitutions on learner screens.
// Static part: labels for every contract error code, «Слабые места» without UNKNOWN / unlabeled codes, checkpoint names the chapter,
// chapter-title rewrite keeps case endings. Headless part: tools/learner-text-scan.mjs over Сегодня / Учёба / Тренажёры / Уроки (+ every lesson) /
// ДЗ (+ every lesson) / bank + words session / Экзамен on empty, UNKNOWN·10 and mid-chapter states, plus real old states from R7_SCAN_STATES
// (comma-separated paths; kept outside the repo — they are learner data).
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),{spawnSync}=require('child_process');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const app=read('app.js'),tutor=read('ai-tutor.js'),dash=read('dashboard.js'),adapter=read('explain-bank-adapter.js');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
// 1) labels
const codes=eval(read('ai-contract.js').match(/const ERROR_CODES=(\[[^\]]*\])/)[1]);
const li=tutor.indexOf(' function label('),lj=tutor.indexOf('\n }\n',li);
const label=new Function(tutor.slice(li,lj+3)+';return label;')();
const raw=codes.filter(c=>c!=='UNKNOWN'&&label(c)===c);
assert.deepEqual(raw,[],'unlabeled error codes: '+raw.join(', '));
for(const c of codes)assert.ok(!/[A-Z]{2,}_|_/.test(label(c))||c==='UNKNOWN','label looks like a code: '+c);
ok('every contract error code ('+(codes.length-1)+') has a Russian learner label');
// 2) «Слабые места»
const wi=tutor.indexOf(' function learnerWeak(');assert.ok(wi>0);
const lw=new Function('topWeak','label',tutor.slice(wi,tutor.indexOf('\n',wi))+';return learnerWeak;');
const rows=[{error_code:'UNKNOWN',count_recent:10},{error_code:'NOT_A_CODE',count_recent:9},{error_code:'PERSON_AFTER_POSS_MISSING',count_recent:4},{error_code:'',count_recent:3}];
assert.deepEqual(lw(()=>rows,label)().map(r=>r.error_code),['PERSON_AFTER_POSS_MISSING'],'UNKNOWN / unlabeled hidden');
assert.ok(/learnerWeak\(\)\.map\(w=>esc\(window\.AiTutor\.label\(w\.error_code\)\)\+' · '\+core\.ruCount\(/.test(dash),'dashboard renders the learner list with «N раз(а)»');
assert.ok(!/topWeak\(\)\.map\(w=>esc\(window\.AiTutor\.label/.test(dash),'raw topWeak list gone from Today');
assert.ok(/api=\{[^}]*learnerWeak/.test(tutor),'exported');
ok('«Слабые места» shows readable labels only (no «UNKNOWN · 10»), counts in words');
// 3) checkpoint
const ci=app.indexOf(' function chapterCheckpoint('),cj=app.indexOf(' function stepNow(');
const ctx={window:{GrammarPath:{lesson:id=>id==='3-1'?{chapters:[{id:'a',title:'Первая'},{id:'b',title:'Рычаг А: Собери прошедшее'},{id:'c',title:'Третья'}]}:null},ExplainBankUI:{chapterTitle:ch=>String(ch.title).replace(/^Рычаг [АAБB]:\s*/,'')}},box:{}};
vm.runInNewContext(app.slice(ci,cj)+'\nbox.f=chapterCheckpoint;',ctx);
assert.equal(ctx.box.f('3-1',{chapterId:'b',beat:4}),'Глава 2 из 3 · Собери прошедшее · шаг 5');
assert.equal(ctx.box.f('9-9',{chapterId:'x',beat:0}),'Теория · шаг 1','unknown chapter: no «Глава ·»');
assert.ok(!app.includes("'Глава · шаг '"),'old empty substitution gone');
assert.ok(app.includes('const checkpoint=p&&p.chapterId?chapterCheckpoint(lessonId,p):'),'Today card uses it');
ok('Today checkpoint: «Глава N из M · название · шаг K» instead of «Глава · шаг 5»');
// 4) chapter title rewrite keeps the case
const ai=adapter.indexOf(' function chapterTitle('),aj=adapter.indexOf(' function paras(');
const ct=new Function('TITLE_FIX',adapter.slice(ai,aj)+';return chapterTitle;')({});
assert.equal(ct({id:'x',title:'Склейка двух рычагов'}),'Склейка двух шагов');
assert.equal(ct({id:'x',title:'Рычаг А: Мягкий ряд'}),'Мягкий ряд');
assert.equal(ct({id:'x',title:'Без рычага'}),'Без шага');
assert.equal(ct({id:'x',title:'Рычаг и бирка'}),'Шаг и окончание');
ok('chapter titles: «рычаг» → «шаг» keeps the ending («двух шагов», not «двух шаг»)');
// 5) headless scan of every learner screen
const extra=String(process.env.R7_SCAN_STATES||'').split(',').map(s=>s.trim()).filter(s=>s&&fs.existsSync(s));
const r=spawnSync(process.execPath,[path.join(__dirname,'tools/learner-text-scan.mjs'),...extra],{encoding:'utf8',timeout:1500000});
process.stdout.write((r.stdout||'').split('\n').filter(l=>/learner-text-scan|^ - |SKIP/.test(l)).join('\n')+'\n');
if(r.status===3)console.log('SKIP headless learner scan (no browser here); static checks above still ran');
else{assert.equal(r.status,0,'learner-text-scan findings:\n'+(r.stdout||'')+(r.stderr||''));ok('headless scan: no UNKNOWN / undefined / null / NaN / codes / snake_case / «Глава ·» / « ·  · » on learner screens'+(extra.length?' (incl. '+extra.length+' real old states)':''));}
console.log('verify_r7_learner_text: '+passed+' checks passed');
