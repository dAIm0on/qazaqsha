#!/usr/bin/env node
// r7 X QA item 3: scan every learner screen for raw codes and empty substitutions.
// Screens: Сегодня (all panels open), Учёба, Тренажёры, Уроки + each lesson page, ДЗ + each lesson's homework, a bank session, Экзамен.
// States: empty, mid-chapter (3-1 «шаг 5»), AI-tutor store with UNKNOWN · 10 (the QA case) and every extra state file given
// as an argument (real old exported / localStorage states). Exit 0 = clean, 1 = findings, 3 = no headless browser (skip).
// Usage: node tools/learner-text-scan.mjs [--host URL] [--width 390] [state.json ...]
import fs from 'fs';import path from 'path';import http from 'http';import {fileURLToPath,pathToFileURL} from 'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);let host=null,width=390;const files=[];
for(let i=0;i<args.length;i++){if(args[i]==='--host')host=args[++i];else if(args[i]==='--width')width=+args[++i];else files.push(args[i]);}
const PW=process.env.PLAYWRIGHT_CORE||'/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.js';
const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
if(!fs.existsSync(PW)||!fs.existsSync(CHROME)){console.log('SKIP headless scan: no playwright-core / chrome');process.exit(3);}
const {chromium}=(await import(pathToFileURL(PW).href)).default;
export const PATTERNS=[
 ['raw UNKNOWN',/\bUNKNOWN\b/],['undefined',/\bundefined\b/],['null',/\bnull\b/],['NaN',/\bNaN\b/],['[object Object]',/\[object Object\]/],
 ['skill code',/\bSKILL_/],['error_key',/error_key/],['CODE_NAME',/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/],['snake_case',/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/],
 ['template',/\$\{/],['«Глава ·»',/Глава\s*·/],['« ·  · »',/·\s*·/],
 ['empty number',/(?:^|[\s(])(?:Глава|Урок|Шаг|шаг|из)\s*·|Глава\s+из\b|(?:Глава|Урок|шаг)\s+из\s+(?:\D|$)/m],['dangling ·',/·[ \t]*$|^[ \t]*·/m],
 ['cut word after «шаг» rewrite',/\b(?:двух|трёх|нескольких|всех)\s+шаг\b/]
];
let server=null;
if(!host){
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));host='http://127.0.0.1:'+server.address().port+'/';
}
const AI_UNKNOWN={v:1,errors:{UNKNOWN:{error_code:'UNKNOWN',rule_id:'',lesson_id:'',count_total:10,count_recent:10,last_seen:Date.now(),last_exercise_ids:[]},
 PERSON_AFTER_POSS_MISSING:{error_code:'PERSON_AFTER_POSS_MISSING',count_total:4,count_recent:4,last_seen:Date.now(),last_exercise_ids:[]},
 PLURAL_HARMONY_AE:{error_code:'PLURAL_HARMONY_AE',count_total:2,count_recent:0,last_seen:Date.now(),last_exercise_ids:[]}},recent:[]};
function stateOf(raw){ // accepts a localStorage state, an export file or a baseline dump {first:{storage:{...}}}
 if(!raw||typeof raw!=='object')return null;
 if(raw.records||raw.schema)return raw;
 for(const k of ['first','second'])if(raw[k]){const st=raw[k].storage||raw[k].localStorage||raw[k];const v=st&&st['qazaq-kris-course-v1'];if(v)return typeof v==='string'?JSON.parse(v):v;}
 return null;
}
const cases=[{name:'empty',state:null,ai:null},{name:'ai-unknown',state:null,ai:AI_UNKNOWN},{name:'mid-chapter-3-1',state:null,ai:AI_UNKNOWN,mid:'3-1'}];
for(const f of files){try{const s=stateOf(JSON.parse(fs.readFileSync(f,'utf8')));if(s)cases.push({name:path.basename(f),state:s,ai:AI_UNKNOWN,mid:'3-1'});else console.log('skip (no state):',f);}catch(e){console.log('skip',f,e.message);}}
const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--disable-dev-shm-usage']});
const findings=[];let screens=0;
async function boot(c,seed){
 const ctx=await browser.newContext({viewport:{width,height:width<500?844:900},serviceWorkers:'block'});
 await ctx.addInitScript(([s,ai])=>{if(sessionStorage.getItem('scan-seeded'))return;sessionStorage.setItem('scan-seeded','1');localStorage.clear();if(s)localStorage.setItem('qazaq-kris-course-v1',JSON.stringify(s));if(ai)localStorage.setItem('qazaqsha.aiTutor.v1',JSON.stringify(ai));},[seed,c.ai]);
 const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto(host,{waitUntil:'load'});await page.waitForFunction(()=>window.QazaqShell&&window.LessonV2Runtime,{timeout:30000});await page.waitForTimeout(500);
 return {ctx,page,errs};
}
const visibleText=page=>page.evaluate(()=>{document.querySelectorAll('main details').forEach(d=>d.open=true);const sec=[...document.querySelectorAll('main > section')].find(s=>!s.hidden);return sec?sec.innerText:'';});
function expect(c,screen,text,re,what){if(!re.test(text))findings.push({state:c.name,screen,pattern:'missing: '+what,hit:'',context:text.slice(0,160).replace(/\s+/g,' ')});}
function check(c,screen,text){screens++;for(const [name,re] of PATTERNS){const m=text.match(re);if(m){const at=text.indexOf(m[0]);findings.push({state:c.name,screen,pattern:name,hit:m[0],context:text.slice(Math.max(0,at-60),at+60).replace(/\s+/g,' ')});}}}
for(const c of cases){
 let seed=c.state;
 if(c.mid){ // put the course pointer in the middle of chapter 2 of the lesson (Today «Продолжить урок · Глава … · шаг 5»)
  const probe=await boot(c,c.state);
  seed=await probe.page.evaluate(id=>{const les=window.GrammarPath.lesson(id);const ch=les.chapters[1]||les.chapters[0];const s=JSON.parse(localStorage.getItem('qazaq-kris-course-v1')||'null')||{};
   s.courseProgress=s.courseProgress||{};s.courseProgress.lessons=s.courseProgress.lessons||{};const lp=s.courseProgress.lessons[id]||{};lp.status=lp.status&&lp.status!=='not_started'?lp.status:'in_progress';lp.path={...(lp.path||{}),chapterId:ch.id,beat:4};s.courseProgress.lessons[id]=lp;s.courseProgress.resumePointer={lessonId:id,surface:'path'};return s;},c.mid).catch(()=>c.state);
  await probe.ctx.close();
 }
 const {ctx,page,errs}=await boot(c,seed);
 const show=async v=>{await page.evaluate(v=>window.QazaqShell.show(v),v);await page.waitForTimeout(350);return visibleText(page);};
 for(const v of ['today','learn','personal','path','homework','exam']){const t=await show(v);check(c,v,t);
  if(v==='today'&&c.ai)expect(c,v,t,/Нет окончания лица после притяжательного · 4 раза/,'readable weak spot «… · 4 раза» (UNKNOWN hidden)');
  if(v==='today'&&c.mid&&!c.state)expect(c,v,t,/Глава \d+ из \d+ · [^\n·]+ · шаг 5/,'checkpoint «Глава N из M · название · шаг 5»');}
 // each homework lesson page
 const hw=await page.evaluate(()=>{window.QazaqShell.show('homework');return [...document.querySelectorAll('[data-hw-lesson]')].map(b=>b.dataset.hwLesson);});
 for(const id of [...new Set(hw)]){await show('homework');await page.evaluate(id=>{const b=document.querySelector(`[data-hw-lesson="${id}"]`);b&&b.click();},id);await page.waitForTimeout(300);check(c,'homework '+id,await visibleText(page));}
 // each lesson page (picker «Начать»)
 await show('today');const lessons=await page.evaluate(()=>{const b=document.querySelector('[data-picker-open]');b&&b.click();return [...document.querySelectorAll('[data-action^="lesson-start:"]')].map(x=>x.dataset.action.slice(13));});
 for(const id of lessons){await page.evaluate(async id=>{window.QazaqShell.show('today');await new Promise(r=>setTimeout(r,200));const p=document.querySelector('[data-picker-open]');p&&p.click();await new Promise(r=>setTimeout(r,150));const b=document.querySelector(`[data-action="lesson-start:${id}"]`);b&&b.click();await new Promise(r=>setTimeout(r,500));},id);check(c,'lesson '+id,await visibleText(page));check(c,'today after '+id,await show('today'));check(c,'learn after '+id,await show('learn'));}
 // a bank session and a words session of the current lesson (Учёба tracks)
 for(const sel of ['[data-track^="b34-track-"]','[data-track^="hw-words-"]']){await show('learn');const ok=await page.evaluate(sel=>{const b=document.querySelector(sel);if(b){b.click();return b.dataset.track;}return null;},sel);await page.waitForTimeout(600);if(ok)check(c,'session '+ok,await visibleText(page));}
 if(errs.length)findings.push({state:c.name,screen:'pageerror',pattern:'pageerror',hit:errs[0],context:''});
 await ctx.close();
}
await browser.close();if(server)server.close();
console.log('learner-text-scan: '+cases.length+' states, '+screens+' screens, '+findings.length+' findings');
for(const f of findings)console.log(' -',f.state,'|',f.screen,'|',f.pattern,'|',JSON.stringify(f.hit),'|',f.context);
process.exit(findings.length?1:0);
