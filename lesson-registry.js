/* One read-only course registry: legacy lessons + compiled Lesson Package v2 metadata. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 function legacy(){
   const b=node?null:root.ExplainBankUI;
   return b&&Array.isArray(b.COURSE)?b.COURSE.map(x=>Object.assign({kind:'legacy'},x)):[];
 }
 function v2Rows(){
   const rows=node?[]:(root.LESSON_V2_COMPILED||[]);
   return rows.map(x=>({id:x.lesson_id,label:x.label||x.lesson_id.replace('-','–'),name:x.name||x.title,rules:(x.rules||[]).map(r=>r.id),kind:'v2',content_revision:x.content_revision,status:x.status||'draft'}));
 }
 function course(){
   const map=new Map();
   for(const x of [...legacy(),...v2Rows()])map.set(x.id,x);
   return [...map.values()].sort((a,b)=>{
     const p=s=>String(s).split('-').map(Number),aa=p(a.id),bb=p(b.id);
     return (aa[0]-bb[0])||(aa[1]-bb[1]);
   });
 }
 function ids(){return course().map(x=>x.id);}
 function byId(id){return course().find(x=>x.id===id)||null;}
 function isV2(id){return byId(id)?.kind==='v2';}
 const api={course,ids,byId,isV2};
 if(node)module.exports=api;else root.LessonRegistry=api;
})(typeof window!=='undefined'?window:globalThis);
