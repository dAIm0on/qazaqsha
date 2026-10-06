/* r7 ux63: HG-19 «Перед экзаменом» + HG-20 BatylBol admission (lesson 3-3). */
(function(root){
'use strict';
const SECTIONS=[
  'ряд слова','классы букв','множественное ТАР/ДАР/ЛАР','когда множественное не ставится','числа до миллиона',
  'личные мен/сен/сіз','личные біз/сендер/сіздер','ол/олар — ноль','вопросительные частицы','порядковые + личное',
  'притяжательные менің/сенің/сіздің/оның','закон края','бар/жоқ/емес','порядок «много → чьё»',
  'притяжательные біздің/сендердің/сіздердің/олардың','чтения одной формы','комбинация личных и притяжательных',
  'два одинаковых хвоста','емес в комбинации'
];
const TRAINERS=[
  {id:'bb:zvuki',label:'Zvuki',url:'https://batylbol.kz/test/Zvuki.html'},
  {id:'bb:mnozh',label:'MnozhChislo',url:'https://batylbol.kz/test/MnozhChislo.html'},
  {id:'bb:chis',label:'Chislitielniye',url:'https://batylbol.kz/test/Chislitielniye.html'},
  {id:'bb:lich-ed',label:'LichnyeEdChislo',url:'https://batylbol.kz/test/LichnyeEdChislo.html'},
  {id:'bb:lich-12',label:'LichnyeLitso1-2',url:'https://batylbol.kz/test/LichnyeLitso1-2.html'},
  {id:'bb:lichnye',label:'Lichnye',url:'https://batylbol.kz/test/Lichnye.html'},
  {id:'bb:vopros',label:'VoprositelnyeChastitsy',url:'https://batylbol.kz/test/VoprositelnyeChastitsy.html'},
  {id:'bb:prit-ed',label:'PrityazhatelnyeEd',url:'https://batylbol.kz/test/PrityazhatelnyeEd.html'},
  {id:'bb:prit-mn',label:'PrityazhatelnyeMn',url:'https://batylbol.kz/test/PrityazhatelnyeMn.html'},
  {id:'bb:bar',label:'BarZhokEmes',url:'https://batylbol.kz/test/BarZhokEmes.html'},
  {id:'bb:combo',label:'KombinaciyaLichnyhIPrityazhatelnih',url:'https://batylbol.kz/test/KombinaciyaLichnyhIPrityazhatelnih.html'},
  {id:'bb:combo2',label:'ComboLichPrityazh',url:'https://batylbol.kz/test/ComboLichPrityazh.html'}
];
function ensure(state){
  if(!state.preExam||typeof state.preExam!=='object')state.preExam={trainers:Object.create(null),updatedAt:0};
  if(!state.preExam.trainers)state.preExam.trainers=Object.create(null);
  return state.preExam;
}
function doneCount(state){
  const pe=ensure(state); let n=0;
  for(const t of TRAINERS)if(pe.trainers[t.id])n++;
  return n;
}
function markTrainer(state,id,on){
  const pe=ensure(state); pe.trainers[id]=!!on; pe.updatedAt=Date.now();
}
function panelHtml(state,esc){
  const n=doneCount(state),total=TRAINERS.length;
  const rows=TRAINERS.map(t=>{
    const on=!!(state.preExam&&state.preExam.trainers&&state.preExam.trainers[t.id]);
    return `<label class="preexam-trainer"><input type="checkbox" data-bb="${esc(t.id)}" ${on?'checked':''}/> <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.label)}</a></label>`;
  }).join('');
  const secs=SECTIONS.map((s,i)=>`<li><span class="small">${i+1}.</span> ${esc(s)}</li>`).join('');
  return `<div class="panel preexam-panel" data-preexam="1">
    <h2>Перед экзаменом</h2>
    <p class="small">HG-19: прогон ${SECTIONS.length} разделов 1-1…3-3 вперемешку. Не балл — подготовка к письменному экзамену.</p>
    <div class="lesson-actions"><button type="button" class="primary-button" data-preexam-start>Начать прогон</button></div>
    <details class="preexam-map"><summary>19 разделов карты</summary><ol class="preexam-sections">${secs}</ol></details>
    <h3>Тренажёры BatylBol: ${n} из ${total}</h3>
    <p class="small">HG-20: школьный допуск — отметить выполненные онлайн-тренажёры.</p>
    <div class="preexam-trainers">${rows}</div>
  </div>`;
}
function bind(root,api){
  if(!root)return;
  const start=root.querySelector('[data-preexam-start]');
  if(start)start.onclick=()=>api&&api.startPreExam&&api.startPreExam();
  root.querySelectorAll('[data-bb]').forEach(inp=>{
    inp.onchange=()=>{
      if(!api||!api.progress)return;
      const st=api.progress();
      markTrainer(st,inp.dataset.bb,inp.checked);
      if(api.save)api.save();
      if(api.renderLearn)api.renderLearn();
    };
  });
}
const LESSONS=['1-1','1-2','1-3','2-1','2-2','2-3','3-1','3-2','3-3'];
function pickQueue(size){
  const qs=(root.COURSE&&root.COURSE.questions)||[];
  const pool=qs.filter(q=>q&&LESSONS.includes(String(q.lessonId||''))&&q.topic!=='meta');
  // interleave by lesson
  const by=Object.create(null);
  for(const q of pool){(by[q.lessonId]=by[q.lessonId]||[]).push(q);}
  const out=[]; const keys=LESSONS.filter(id=>by[id]&&by[id].length);
  let i=0;
  while(out.length<size && keys.length){
    const id=keys[i%keys.length];
    const arr=by[id];
    if(!arr||!arr.length){keys.splice(i%keys.length,1);continue;}
    const j=Math.floor(Math.random()*arr.length);
    out.push(arr.splice(j,1)[0].id);
    if(!arr.length)keys.splice(keys.indexOf(id),1);
    else i++;
  }
  return out;
}
root.PreExam={SECTIONS,TRAINERS,ensure,doneCount,markTrainer,panelHtml,bind,pickQueue,LESSONS};
})(window);
