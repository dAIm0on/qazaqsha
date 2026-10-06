/* r7: golden = progress.migrate/merge of the PRE-r7 build on the fixtures.
   git archive 8d6b032 | tar -x -C /tmp/base && node tools/r7-progress-goldens.cjs /tmp/base qa/fixtures/progress-r7 */
const path=require('path'),fs=require('fs');
const base=path.resolve(process.argv[2]),dir=path.resolve(process.argv[3]);
const P=require(path.join(base,'progress.js'));
const NOW=Date.UTC(2026,9,6,7,0,0);
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
const out={base_commit:'8d6b032b1629900f43cc19d5dc01985a8b343d93',now:NOW,migrate:{},merge:{}};
const names=fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&!f.startsWith('_')).map(f=>f.replace(/\.json$/,''));
for(const n of names){const raw=JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'));const m=P.migrate(raw,NOW);delete m.evidence;out.migrate[n]=stable(JSON.parse(JSON.stringify(m)));}
const a=P.migrate(JSON.parse(fs.readFileSync(path.join(dir,'schema4-early-learner.json'),'utf8')),NOW);
const b=P.migrate(JSON.parse(fs.readFileSync(path.join(dir,'schema7-lesson-4-2-homework.json'),'utf8')),NOW);
const m=P.merge(a,b);delete m.evidence;out.merge['schema4+schema7']=stable(JSON.parse(JSON.stringify(m)));
fs.writeFileSync(path.join(dir,'_golden-base-8d6b032.json'),JSON.stringify(out)+'\n');
console.log('golden',names);
