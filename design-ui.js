/* Design prefs only. Namespaced; does not touch course progress storage. */
(function(){
  const KEY='qazaqsha.design.v1';
  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}
  }
  function save(next){
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  }
  function apply(prefs){
    document.documentElement.removeAttribute('data-season');
    if(prefs.motion==='off')document.documentElement.dataset.motion='off';
    else document.documentElement.removeAttribute('data-motion');
    const motion=document.getElementById('motion-off');
    if(motion)motion.checked=prefs.motion==='off';
  }
  const prefs=load();
  if(prefs.season){delete prefs.season;save(prefs);}
  apply(prefs);
  function bind(){
    const open=document.getElementById('design-settings');
    const dialog=document.getElementById('settings-dialog');
    if(open&&dialog){
      open.addEventListener('click',()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');});
      dialog.addEventListener('close',()=>open.focus());
      const close=document.getElementById('settings-close');
      if(close)close.addEventListener('click',()=>dialog.close?dialog.close():dialog.removeAttribute('open'));
    }
    const motion=document.getElementById('motion-off');
    if(motion)motion.addEventListener('change',()=>{prefs.motion=motion.checked?'off':'system';save(prefs);apply(prefs);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();

/* STEP10_LEARNER_UI
   Mobile black-box remediation for canonical section 2.
   Keeps internal source ids in data/issue logs, but removes them from learner-facing practice. */
(function(){
  'use strict';
  const SECTION2=/^2-[123]$/;
  const INTERNAL_PRACTICE_NOTE_RE=/LESSONS\s+FIX|canonical\s+practice|P2[123]-/i;
  const SOURCE_ITEM_RE=/\b(P2[123]-[A-ZА-Я]?\d+)\b/i;
  const STAGE_TITLE={
    1:'Разберись в форме',
    2:'Выбери по правилу',
    3:'Добавь окончание',
    4:'Собери форму',
    5:'Собери самостоятельно',
    6:'Найди и исправь ошибку',
    7:'Преобразуй форму',
    8:'Самостоятельное закрепление'
  };

  function canonicalQuestion(sourceItem){
    if(!sourceItem||!window.COURSE)return null;
    const key=String(sourceItem).toUpperCase();
    return (window.COURSE.questions||[]).find(q=>String(q&&q.source_item||'').toUpperCase()===key||String(q&&q.title||'').toUpperCase().includes(key))||null;
  }

  function sourceItemFromTitle(title){
    const m=String(title||'').match(SOURCE_ITEM_RE);
    return m?m[1].toUpperCase():'';
  }

  function stageNumber(title){
    const m=String(title||'').match(/^S([1-8])\b/i);
    return m?Number(m[1]):0;
  }

  function appendPair(node,left,translation,tail){
    node.replaceChildren();
    const kk=document.createElement('span');
    kk.lang='kk';kk.textContent=String(left||'').trim();
    const ru=document.createElement('em');
    ru.lang='ru';ru.textContent=String(translation||'').trim();
    node.append(kk,document.createTextNode(' — '),ru);
    if(tail)node.append(document.createTextNode(String(tail)));
  }

  function rewriteCanonicalStimulus(node,q,stage){
    if(!node||!q)return;
    const raw=String(q.stimulus||'').trim();
    if(!raw)return;

    // S2: separate the translation from the decision instruction so the Russian gloss is visibly italic.
    if(stage===2){
      const m=raw.match(/^(.+?)\s+—\s+(.+?)\s+заканчивается\s+на\s+([А-ЯӘҒҚҢӨҰҮҺІ])\.\s*Нужна\s+П,\s*Б\s+или\s+М\?$/iu);
      if(m){appendPair(node,m[1],m[2],`. Последний звук: ${m[3]}. Что выбираем — П, Б или М?`);return;}
    }

    // S3: do not hand the learner the Kazakh pronoun + base construction. Give the word and person; learner adds the ending.
    if(stage===3){
      const m=raw.match(/^(Мен|мен|Сен|сен|Сіз|сіз)\s*\+\s*([^—]+?)\s+—\s*(я|ты|Вы)\s*\+\s*([^.]*)\.\s*Впиши\s+только\s+окончание\.?$/u);
      if(m){
        const person=/^мен$/iu.test(m[1])?'я':/^сен$/iu.test(m[1])?'ты':'Вы';
        appendPair(node,m[2],m[4],`. Лицо: «${person}». Добавь окончание.`);return;
      }
    }

    // Simple vocabulary/example pair: the Kazakh item stays normal, the Russian translation is italic.
    const pair=raw.match(/^([^—\n]+?)\s+—\s+([^.—?]+)\.?$/u);
    if(pair&&!/на казахск/i.test(String(q.title||'')))appendPair(node,pair[1],pair[2],raw.endsWith('.')?'.':'');
  }

  function practiceKey(q){
    const raw=String(q&&q.stimulus||'').trim();
    const person=/\b(Мен|мен)\b|\bя\b/u.test(raw)?'я':/\b(Сен|сен)\b|\bты\b/u.test(raw)?'ты':/\b(Сіз|сіз)\b|\bВы\b/u.test(raw)?'вы':/\b(Біз|біз)\b|\bмы\b/u.test(raw)?'мы':/\b(Сендер|сендер|Сіздер|сіздер)\b/u.test(raw)?'вы-мн':/\b(Олар|олар)\b|\bони\b/u.test(raw)?'они':/\b(Ол|ол)\b|\bон\b|\bона\b/u.test(raw)?'он':'none';
    let lex=raw;
    if(raw.includes('+'))lex=raw.split('+')[1].split('—')[0];
    else if(raw.includes('—'))lex=raw.split('—')[0];
    lex=String(lex||'').replace(/[^A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі-]+/g,' ').trim().toLocaleLowerCase('kk');
    return {person,lex:lex||String(q&&q.id||'')};
  }

  function spreadStageIds(ids){
    const pool=(ids||[]).map((id,index)=>({id,index,q:(window.COURSE&&window.COURSE.questions||[]).find(q=>q&&q.id===id)}));
    const out=[];let lastPerson='',lastLex='';
    while(pool.length){
      let best=0,bestScore=-1;
      for(let i=0;i<pool.length;i++){
        const k=practiceKey(pool[i].q);
        let score=0;
        if(k.lex!==lastLex)score+=4;
        if(k.person!=='none'&&k.person!==lastPerson)score+=3;
        if(k.person==='none')score+=1;
        score-=pool[i].index/10000;
        if(score>bestScore){bestScore=score;best=i;}
      }
      const row=pool.splice(best,1)[0],k=practiceKey(row.q);
      out.push(row.id);lastLex=k.lex;if(k.person!=='none')lastPerson=k.person;
    }
    return out;
  }

  function installStageSpacing(){
    const cp=window.CourseProgress;
    if(!cp||typeof cp.registerStages!=='function'||cp.__section2BlackBoxSpacing)return;
    const original=cp.registerStages.bind(cp);
    cp.registerStages=function(lessonId,plans){
      if(!SECTION2.test(String(lessonId||'')))return original(lessonId,plans);
      const fixed=(plans||[]).map(p=>Object.assign({},p,{coreIds:spreadStageIds(p.coreIds||[])}));
      return original(lessonId,fixed);
    };
    cp.__section2BlackBoxSpacing=true;

    // A saved session can hydrate a V2 lesson before this late UI module loads. Refresh only stage metadata; never delete the saved queue.
    if(window.LessonV2Runtime){
      for(const id of ['2-1','2-2','2-3']){
        const p=window.LessonV2Runtime.byId&&window.LessonV2Runtime.byId(id);
        if(p&&window.LessonV2Runtime.stagePlans){
          try{cp.registerStages(id,window.LessonV2Runtime.stagePlans(p));}catch{}
        }
      }
    }
  }

  function buildPbmTable(pre){
    const lines=String(pre.textContent||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const start=lines.findIndex(line=>/Последний звук основы/i.test(line)&&line.includes('|'));
    if(start<0)return false;
    const rows=lines.slice(start).filter(line=>line.includes('|')).map(line=>line.split('|').map(s=>s.trim()));
    if(rows.length<4||!rows.slice(1).some(r=>/-бын/i.test(r[1]||'')||/-бін/i.test(r[2]||'')))return false;

    const frag=document.createDocumentFragment();
    const title=document.createElement('h3');
    title.className='path-pbm-title';
    title.textContent='Как выбрать П / Б / М для формы «я»';
    frag.append(title);

    const wrap=document.createElement('div');
    wrap.className='table-wrap path-pbm-wrap';
    const table=document.createElement('table');
    table.className='path-pbm-table';
    table.setAttribute('aria-label','Выбор П, Б или М в окончании формы я');
    const thead=document.createElement('thead'),hr=document.createElement('tr');
    for(const text of ['Последний звук основы','Выбираем','Твёрдый ряд','Мягкий ряд']){
      const th=document.createElement('th');th.scope='col';th.textContent=text;hr.append(th);
    }
    thead.append(hr);table.append(thead);
    const tbody=document.createElement('tbody');
    for(const row of rows.slice(1)){
      if(row.length<3)continue;
      const tr=document.createElement('tr');
      const initial=((row[1].match(/-([пбм])/iu)||[])[1]||'').toUpperCase();
      const vals=[row[0],initial,row[1],row[2]];
      vals.forEach((text,i)=>{
        const cell=document.createElement(i===0?'th':'td');
        if(i===0)cell.scope='row';
        if(i>=2)cell.lang='kk';
        cell.textContent=text;
        if(i===1)cell.className='path-pbm-choice';
        tr.append(cell);
      });
      tbody.append(tr);
    }
    table.append(tbody);wrap.append(table);frag.append(wrap);
    const note=document.createElement('p');
    note.className='small path-pbm-note';
    note.textContent='Шаг 1: последний звук → П, Б или М. Шаг 2: твёрдый или мягкий ряд → Ы или І.';
    frag.append(note);
    pre.replaceWith(frag);
    return true;
  }

  function convertDecisionTables(root){
    (root||document).querySelectorAll('pre.path-core-table').forEach(pre=>{if(!pre.dataset.pbmChecked){pre.dataset.pbmChecked='1';buildPbmTable(pre);}});
  }

  function enhancePractice(){
    const exercise=document.getElementById('exercise');
    if(!exercise)return;
    const title=exercise.querySelector('#question-title');
    if(!title)return;
    let source=exercise.dataset.canonicalSourceItem||sourceItemFromTitle(title.textContent);
    if(source)exercise.dataset.canonicalSourceItem=source;
    const q=canonicalQuestion(source);
    const rawTitle=q?String(q.title||''):String(title.textContent||'');
    const stage=stageNumber(rawTitle);
    if(source&&stage&&STAGE_TITLE[stage])title.textContent=STAGE_TITLE[stage];

    exercise.querySelectorAll('.question-note').forEach(note=>{
      if(INTERNAL_PRACTICE_NOTE_RE.test(String(note.textContent||'')))note.remove();
    });

    if(q){
      const stimulus=exercise.querySelector('.stimulus');
      rewriteCanonicalStimulus(stimulus,q,stage);
      const lessonId=String(q.lessonId||'');
      const rule=document.getElementById('rule-button');
      if(rule&&SECTION2.test(lessonId)&&!rule.hidden){
        rule.textContent='← К объяснению';
        rule.setAttribute('aria-label','Открыть объяснение правила этого задания');
      }
    }
  }

  function installStyles(){
    if(document.getElementById('step10-learner-ui-style'))return;
    const style=document.createElement('style');
    style.id='step10-learner-ui-style';
    style.textContent=`
      .path-pbm-title{margin:1rem 0 .55rem;font-size:1.05rem;line-height:1.3}
      .path-pbm-wrap{margin:.35rem 0 .5rem;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .path-pbm-table{width:100%;min-width:34rem;border-collapse:separate;border-spacing:0;font-size:.96rem;line-height:1.35}
      .path-pbm-table th,.path-pbm-table td{padding:.68rem .72rem;text-align:left;vertical-align:top;border-bottom:1px solid color-mix(in srgb,currentColor 16%,transparent)}
      .path-pbm-table thead th{font-weight:700;border-top:1px solid color-mix(in srgb,currentColor 16%,transparent)}
      .path-pbm-table th:first-child,.path-pbm-table td:first-child{border-left:1px solid color-mix(in srgb,currentColor 16%,transparent)}
      .path-pbm-table th:last-child,.path-pbm-table td:last-child{border-right:1px solid color-mix(in srgb,currentColor 16%,transparent)}
      .path-pbm-choice{font-size:1.15em;font-weight:800;text-align:center!important;white-space:nowrap}
      .path-pbm-note{margin-top:.45rem}
      @media(max-width:520px){
        .path-pbm-table{min-width:30rem;font-size:.9rem}
        .path-pbm-table th,.path-pbm-table td{padding:.58rem .55rem}
      }
    `;
    document.head.append(style);
  }

  function run(){installStyles();installStageSpacing();convertDecisionTables(document);enhancePractice();}
  const start=()=>{
    run();
    const observer=new MutationObserver(()=>run());
    observer.observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
