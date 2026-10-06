#!/usr/bin/env node
/**
 * r7 Step 3: cold-start learner walk of OPEN lessons 1-1…4-2 on a host.
 * Usage: node tools/step3-learner-run.mjs [--host URL] [--out DIR]
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
let host='https://qazaqsha.pages.dev';
let outDir='/workspace/r7/step3/out';
for(let i=0;i<args.length;i++){
  if(args[i]==='--host')host=args[++i];
  else if(args[i]==='--out')outDir=args[++i];
}
fs.mkdirSync(outDir,{recursive:true});
const PW=process.env.PLAYWRIGHT_CORE||'/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.js';
const CHROME=process.env.CHROME||'/usr/bin/google-chrome';
const {chromium}=(await import(pathToFileURL(PW).href)).default;

const OPEN=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2'];
const AUTHOR=/Статус:\s*разжёвано|Файл дыр|\.md\b|Исходник|Drive\.google|Mastery\s*D\b/i;
const RAW=/\bUNKNOWN\b|\berror_key\b|\bundefined\b|\bNaN\b|\[object Object\]/;
const findings=[];
const log=(lvl,msg,extra)=>{const row={lvl,msg,...(extra||{})};findings.push(row);console.log(lvl.toUpperCase(),msg,extra?JSON.stringify(extra):'');};

const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await context.addInitScript(()=>{try{localStorage.clear();sessionStorage.clear();}catch{}});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e.message||e)));

await page.goto(host.replace(/\/?$/,'/') ,{waitUntil:'networkidle',timeout:90000}).catch(()=>page.goto(host,{waitUntil:'load'}));
await page.waitForFunction(()=>window.QazaqShell&&window.LessonRegistry&&window.LessonV2Runtime&&window.ProgressStore,{timeout:90000});

const gate=await page.evaluate(()=>{
  const ids=window.LessonRegistry.ids();
  return {
    ids,
    has51:ids.includes('5-1'),
    ensure51:window.LessonV2Runtime.ensure('5-1'),
    sw:null
  };
});
const sw=await page.evaluate(async()=>((await (await fetch('/sw.js',{cache:'no-store'})).text()).match(/CACHE='([^']+)'/)||[])[1]);
log(gate.has51||gate.ensure51!==null?'fail':'ok','gate 5-1',{has51:gate.has51,ensure:gate.ensure51,sw,open:gate.ids});

async function shot(name){
  const p=path.join(outDir,name+'.png');
  await page.screenshot({path:p,fullPage:true});
  return p;
}

async function openLesson(id){
  await page.evaluate(()=>window.QazaqShell.show('learn'));
  await page.waitForTimeout(400);
  const clicked=await page.evaluate(id=>{
    const chip=document.querySelector(`[data-learn-les="${id}"]`)||document.querySelector(`[data-course="${id}"]`);
    if(chip){chip.click();return 'chip';}
    // fallback continue if hub already on lesson
    const go=document.getElementById('learn-continue');
    if(go){go.click();return 'continue';}
    return null;
  },id);
  await page.waitForTimeout(900);
  // Prefer path surface
  const view=await page.evaluate(()=>document.body.dataset.view);
  if(view!=='path'){
    await page.evaluate(id=>{
      if(window.QazaqShell&&window.LessonV2Runtime)window.LessonV2Runtime.ensure(id);
      // click «Теория» / path if present
      const a=[...document.querySelectorAll('button,a')].find(el=>/теори|глав|путь|урок/i.test(el.textContent||''));
      if(a)a.click();
    },id);
    await page.waitForTimeout(700);
  }
  return {clicked,view:await page.evaluate(()=>document.body.dataset.view)};
}

async function pathText(){
  return page.evaluate(()=>{
    const root=document.getElementById('path-view')||document.querySelector('.path-view')||document.querySelector('main');
    return (root&&root.innerText)||'';
  });
}

for(const id of OPEN){
  pageErrors.length=0;
  let info;
  try{
    info=await openLesson(id);
    const text=await pathText();
    const author=text.match(AUTHOR);
    const raw=text.match(RAW);
    if(author)log('fail','author/meta on path '+id,{hit:author[0],view:info.view});
    else if(raw)log('fail','raw token on path '+id,{hit:raw[0]});
    else log('ok','path '+id,{view:info.view,clicked:info.clicked,len:text.length});
    if(id==='1-1'||id==='3-1'||id==='4-2')await shot('path-'+id);

    // Try practice button from learn hub
    await page.evaluate(()=>window.QazaqShell.show('learn'));
    await page.waitForTimeout(300);
    const prac=await page.evaluate(id=>{
      sessionStorage.setItem('qazaqsha-hub-lesson',id);
      const btn=document.getElementById('learn-practice')||[...document.querySelectorAll('button')].find(b=>/практик/i.test(b.textContent||''));
      if(btn){btn.click();return true;}
      return false;
    },id);
    await page.waitForTimeout(900);
    const pview=await page.evaluate(()=>({
      view:document.body.dataset.view,
      form:!!document.getElementById('answer-form'),
      title:(document.getElementById('question-title')||{}).textContent||'',
      body:(document.getElementById('practice-view')||document.body).innerText||''
    }));
    if(AUTHOR.test(pview.body))log('fail','author on practice '+id,{hit:pview.body.match(AUTHOR)[0]});
    else if(pview.view==='practice'&&pview.form)log('ok','practice '+id,{title:pview.title.slice(0,80)});
    else log('warn','practice not entered '+id,pview);

    // Homework open
    await page.evaluate(()=>window.QazaqShell.show('learn'));
    await page.waitForTimeout(300);
    const hw=await page.evaluate(id=>{
      sessionStorage.setItem('qazaqsha-hub-lesson',id);
      const btn=document.getElementById('learn-homework')||[...document.querySelectorAll('button')].find(b=>/домаш/i.test(b.textContent||''));
      if(btn){btn.click();return true;}
      return false;
    },id);
    await page.waitForTimeout(800);
    const hview=await page.evaluate(()=>({
      view:document.body.dataset.view,
      text:((document.getElementById('homework-view')||document.body).innerText||'').slice(0,300)
    }));
    if(hw&&hview.view==='homework')log('ok','homework '+id,{snip:hview.text.slice(0,100).replace(/\s+/g,' ')});
    else log('warn','homework not entered '+id,hview);

    if(pageErrors.length)log('fail','pageerror '+id,{err:pageErrors.slice(0,2)});
  }catch(e){
    log('fail','exception '+id,{err:String(e.message||e)});
  }
}

// Final gate again
const gate2=await page.evaluate(()=>({has51:window.LessonRegistry.ids().includes('5-1'),ensure:window.LessonV2Runtime.ensure('5-1')}));
log(gate2.has51||gate2.ensure!==null?'fail':'ok','gate 5-1 end',gate2);

await browser.close();

const fails=findings.filter(f=>f.lvl==='fail');
const warns=findings.filter(f=>f.lvl==='warn');
const report={host,sw,open:OPEN,fails:fails.length,warns:warns.length,findings,generated_at:new Date().toISOString()};
fs.writeFileSync(path.join(outDir,'findings.json'),JSON.stringify(report,null,2));
const md=[
  '# Step 3 learner run',
  '',
  `- host: ${host}`,
  `- SW: ${sw}`,
  `- fails: ${fails.length}, warns: ${warns.length}`,
  '',
  '## Findings',
  ...findings.map(f=>`- **${f.lvl}**: ${f.msg}`+(f.hit?` (\`${f.hit}\`)`:'')),
  '',
  '## Canon notes',
  '- Full G/H manual PASS = NOT_RUN in this automated pass.',
  '- 5-1 must stay draft/hidden.',
].join('\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),md);
console.log('WROTE',outDir,'fails',fails.length,'warns',warns.length);
process.exit(fails.length?1:0);
