/* Evidence and remediation use received questions only; neither changes FSRS weights. */
(function(){
 'use strict';
 const cfg=window.TRAINER_CONFIG;
 function retention(state,now=Date.now(),days=30){
   const cutoff=now-days*86400000,seen=new Map(),samples=[];
   for(const e of [...state.events].filter(e=>e.type==='answer').sort((a,b)=>a.at-b.at))for(const s of e.skills||[]){
     if(!s.skill_id)continue;
     const previous=seen.get(s.skill_id)??s.previous_answer_at;
     seen.set(s.skill_id,e.at);
     // Old exports without precise prior observation times remain available, but are not guessed.
     if(e.at<cutoff||e.at>now||!Number.isFinite(previous)||previous<=0||e.at-previous<cfg.analytics.retentionGapMs)continue;
     if(['recognition','visual_recognition','word_to_digit'].includes(s.skill_type))continue;
     samples.push({skill_id:s.skill_id,at:e.at,success:s.independent===true&&!e.hinted,gap_ms:e.at-previous});
   }
   const correct=samples.filter(s=>s.success).length;
   return {total:samples.length,correct,percent:samples.length?Math.round(100*correct/samples.length):null,samples};
 }
 const remedies={
   vowel_harmony:{skill:'harmony',title:'Разберём А / Е',explanation:'Смотри на последний слог. Задний слог → А; передний → Е. Кі-тап → А, жі-гіт → Е. Сейчас выбираем только гласную.'},
   plural_initial_consonant:{skill:'initial_consonant',title:'Разберём Л / Д / Т',explanation:'Смотри на последнюю букву: гласная, Р, Й, У → Л; Л, М, Н, Ң, Ж, З → Д; глухие и Б, В, Г, Д → Т. Кітап: П → Т. Адам: М → Д.'},
   plural_after_numeral:{skill:'plural_suppression',title:'Количество уже указано',explanation:'После числа окончание множественного числа не нужно: екі кітап. Без числа: кітаптар. То же правило курса применяется после көп, аз, қанша и неше.'}
 };
 function suggestions(state,questions){
   return Object.entries(remedies).flatMap(([type,remedy])=>{
     const skill=state.skills['rule:plural::'+remedy.skill];
     if((skill?.correct_streak||0)>=cfg.remediation.cleanToResolve)return [];
     const errors=state.errors.filter(e=>e.error_type===type&&e.timestamp>(skill?.last_correct||0)).slice(-cfg.remediation.historyWindow);
     const distinct=new Set(errors.map(e=>e.timestamp+':'+e.card_id));
     if(distinct.size<cfg.remediation.threshold)return [];
     const original=questions.find(q=>q.id===errors.at(-1).card_id);
     const isolated=questions.filter(q=>q.id.startsWith('facet-'+remedy.skill+'-')||remedy.skill==='plural_suppression'&&q.kind==='fields'&&!q.contextOnly&&q.ruleIds?.includes('quantity'));
     const ordered=isolated.filter(q=>q.id!==original?.id).sort((a,b)=>Number(!(state.records[a.id]?.seen||a.vocabIds?.some(id=>window.CURRICULUM.known(window.CURRICULUM.words.find(w=>w.id===id),state))))-Number(!(state.records[b.id]?.seen||b.vocabIds?.some(id=>window.CURRICULUM.known(window.CURRICULUM.words.find(w=>w.id===id),state)))));
     const ids=ordered.slice(0,cfg.remediation.exerciseCount).map(q=>q.id);
     if(ids.length<cfg.session.minIntervening)return [];
     if(original&&!ids.includes(original.id))ids.push(original.id);
     return [{type,...remedy,ids}];
   });
 }
 function weakSpots(state,questions,now=Date.now()){
   return window.Homework?window.Homework.weakSpots(state,questions,now):[];
 }
 window.LearningSupport={retention,suggestions,weakSpots,remedies};
})();
