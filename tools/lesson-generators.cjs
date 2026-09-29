'use strict';
const Nonpast=require('../nonpast-engine.js');

const plugins={
  nonpast(lessonId,generator){
    return Nonpast.expand(lessonId,generator);
  }
};

function expand(lesson){
  const out=[],seen=new Set();
  for(const g of lesson.practice_generators||[]){
    const fn=plugins[g.kind];
    if(!fn)throw Error('Lesson generator plugin not found: '+g.kind);
    for(const q of fn(lesson.lesson_id,g)||[]){
      if(!q||typeof q.id!=='string')throw Error('Generator '+g.id+' returned question without id');
      if(seen.has(q.id))throw Error('Generator duplicate question id '+q.id);
      seen.add(q.id);out.push(q);
    }
  }
  return out;
}

module.exports={expand,plugins};
