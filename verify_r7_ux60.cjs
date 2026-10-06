// r7 ux60: browser Back from «Сборник» → «Выбрать занятие»; lesson list status from courseProgress.
const fs=require('fs'),assert=require('assert'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const app=read('app.js'),learn=read('learning.js');
let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
const slice=(src,from,to)=>{const i=src.indexOf(from);assert.ok(i>=0,'missing '+from);const j=src.indexOf(to,i+from.length);assert.ok(j>i,'missing end '+to);return src.slice(i,j);};
{
  const sv=slice(app,' function showView(next){',' function shellTab(next){');
  assert.ok(sv.includes("history.replaceState(Object.assign({},history.state||{},{qzView:next}),'');"),'showView tags the current history entry');
  const logo=slice(app,"const brandLink=document.querySelector('a.brand');"," $('#pause-session').onclick");
  assert.ok(logo.includes("history.pushState({qzView:'today'},'');"),'logo pushState');
  assert.ok(!logo.includes('history.replaceState'),'logo no longer replaceState+pushState (that left a no-op Back)');
  const sl=slice(app,' function startLesson(id,step=learningState.steps[id]||0,opts){',' function startContrast(pair){');
  assert.ok(sl.includes("if(view==='learn')try{history.pushState({qzView:'practice'},'');}catch{}"),'«Сборник» / track from Учёба pushes practice so Back → learn');
  const pop=slice(app,"window.addEventListener('popstate',ev=>{"," $('#pause-session').onclick");
  assert.ok(pop.includes("showView(v);save();")&&pop.includes("showView('learn')"),'popstate restores the screen');
}
ok('#1 history: showView keeps qzView in sync; logo one pushState; Сборник from Учёба → Back to «Выбрать занятие»');
{
  const p=slice(learn,' function progressOf(lessonId){',' function currentId(){');
  assert.ok(p.includes('api.progress?api.progress():{}')&&p.includes("lp.status==='in_progress'"),'status from courseProgress.lessons, not live gp.lessonId');
  assert.ok(p.includes('lp.practiceSession')&&p.includes('lp.path&&lp.path.chapterId'),'practice / path count as started');
  assert.ok(!/started:done>0\|\|\(gp\.lessonId===lessonId&&gp\.chapterId\)/.test(p),'old gp-only started gone');
  assert.ok(learn.includes("pr.status==='completed'||pr.all?'Пройден'"),'completed → «Пройден»');
}
ok('#2 lesson list: choosing 3-1 no longer makes 4-2 «Не начат»; real progress → «В процессе» / «Пройден»');
console.log('verify_r7_ux60: '+passed+' checks passed');
