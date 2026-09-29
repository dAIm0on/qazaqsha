#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');

const id=String(process.argv[2]||'').trim();
const title=process.argv.slice(3).join(' ').trim()||'Новый урок';
if(!/^\d+-\d+$/.test(id)){
  console.error('Usage: node tools/scaffold-lesson.cjs 4-2 "Название урока"');
  process.exit(2);
}
const root=path.resolve(__dirname,'..'),dir=path.join(root,'lessons',id);
if(fs.existsSync(path.join(dir,'lesson.json'))||fs.existsSync(path.join(dir,'lesson.template.json'))){
  console.error('Lesson scaffold already exists:',dir);process.exit(3);
}
fs.mkdirSync(dir,{recursive:true});
const sourceTemplate={
  lesson_id:id,
  sources:[
    {id:'school-method',role:'SCHOOL_NORM',title:id+' методичка.pdf',url:'REPLACE_WITH_HTTPS_URL'},
    {id:'school-exercises',role:'SCHOOL_NORM',title:id+' упражнения.pdf',url:'REPLACE_WITH_HTTPS_URL'},
    {id:'school-homework',role:'SCHOOL_NORM',title:id+' домашняя работа.pdf',url:'REPLACE_WITH_HTTPS_URL'}
  ]
};
const lessonTemplate={
  schema_version:2,lesson_id:id,content_revision:id+'.r1',title:'Урок '+id.replace('-', '–')+' · '+title,label:id.replace('-', '–'),name:title,status:'draft',release:{approved:false,preview_head:'',preview_url:'',approved_at:'',note:''},
  prerequisites:{lessons:[],skills_required:[],skills_review:[]},
  scope:{allowed:['REPLACE_WITH_SKILL'],blocked_future:[]},
  rules:[{id:'v2:'+id+':rule-1',title:'REPLACE'}],
  theory:[{
    id:'theory:'+id+':rule-1',rule_id:'v2:'+id+':rule-1',title:'REPLACE',meaning:'REPLACE',
    fullExplanation:'REPLACE_WITH_FULL_BEGINNER_EXPLANATION',shortHint:'REPLACE',
    decisionSteps:['REPLACE'],examples:[{kazakh:'REPLACE',translation:'REPLACE'}],
    contrastExamples:[],limitations:[],commonConfusions:[],source_refs:['school-method'],
    checks:[{id:'check:'+id+':rule-1',type:'one_prod',prompt:'REPLACE',answers:['REPLACE'],error_key:'rule-1'}]
  }],
  vocabulary:[],original_exercises:[],generated_questions:[],practice_generators:[],corrections:[],migrations:[],
  stages:[{id:'stage:'+id+':final',title:'Финальная проверка',kind:'checkpoint',core_ids:['REPLACE_WITH_3_OR_MORE_QUESTION_IDS'],required_independent_ids:['REPLACE_WITH_REQUIRED_ID'],rule_ids:['v2:'+id+':rule-1'],min_independent_ratio:0.75,max_presentations:16,final:true}],
  homework:{title:'Домашняя работа '+id.replace('-', '–'),source_items:[{id:'hw:'+id+':source:1',number:'1',text:'REPLACE',source_ref:'school-homework'}],word_ids:[],exercise_ids:[],external_tasks:[],checklist:['method','exercises','words']}
};
fs.writeFileSync(path.join(dir,'sources.template.json'),JSON.stringify(sourceTemplate,null,2)+'\n');
fs.writeFileSync(path.join(dir,'lesson.template.json'),JSON.stringify(lessonTemplate,null,2)+'\n');
fs.writeFileSync(path.join(dir,'corrections.template.json'),JSON.stringify({lesson_id:id,corrections:[]},null,2)+'\n');
fs.writeFileSync(path.join(dir,'qa-fixtures.template.json'),JSON.stringify({lesson_id:id,known_bad:[],learner_errors:[],blocked_future:[]},null,2)+'\n');
console.log('LESSON_SCAFFOLD_OK',dir);
console.log('Fill templates, rename *.template.json to sources.json / lesson.json / corrections.json / qa-fixtures.json, then run compiler + verifier.');
