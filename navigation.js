(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const VERSION=1;
 const ID_RE=/^[a-z0-9][a-z0-9._-]{0,40}$/i;
 const BAD=new Set(['__proto__','prototype','constructor']);
 const SECTIONS=['today','review','vocabulary','learn','morph','personal','practice','homework','path','exam','rules','materials'];

 function cleanId(value){
   const s=String(value==null?'':value);
   if(!ID_RE.test(s)||BAD.has(s))return null;
   return s;
 }
 function route(name,view,href,extra){
   const out={name:name,view:view,href:href,context:{},session:false,hub:false,sessionKey:null};
   if(extra){
     if(extra.context)out.context=extra.context;
     if(extra.session)out.session=true;
     if(extra.hub)out.hub=true;
     if(extra.sessionKey)out.sessionKey=extra.sessionKey;
   }
   return out;
 }
 function withQuery(href,ctx,keys){
   const params=new URLSearchParams();
   for(const key of keys)if(ctx&&ctx[key])params.set(key,ctx[key]);
   const text=params.toString();
   return text?href+'?'+text:href;
 }
 function lessonHome(){return route('lesson','today','#/lesson');}
 function practicesHome(){return route('practices','personal','#/practices');}
 function readyHome(){return route('ready','today','#/ready',{hub:true});}

 function parse(hash){
   let raw=String(hash||'');
   if(raw.charAt(0)==='#')raw=raw.slice(1);
   if(!raw)return {kind:'none'};
   if(raw.charAt(0)!=='/')return {kind:'anchor',anchor:raw.split('?')[0]};
   const cut=raw.indexOf('?');
   const path=(cut>=0?raw.slice(0,cut):raw).replace(/\/+$/,'')||'/';
   const params=new URLSearchParams(cut>=0?raw.slice(cut+1):'');
   const ctx={};
   ['lesson','article','kind','id','filter'].forEach(function(key){
     const value=params.get(key);
     if(value==null||value==='')return;
     if(key==='filter'&&value==='weak'){ctx.filter='weak';return;}
     const id=cleanId(value);
     if(id)ctx[key]=id;
   });
   const homework=path.match(/^\/ready\/homework\/([^/]+)(\/session)?$/);
   let found=null;
   if(path==='/lesson')found=lessonHome();
   else if(path==='/lesson/theory')found=route('theory','path',withQuery('#/lesson/theory',ctx,['lesson']),{context:{lesson:ctx.lesson||null}});
   else if(path==='/words')found=route('words','practice','#/words',{session:true,sessionKey:'vocab:must'});
   else if(path==='/practice')found=route('practice','practice',withQuery('#/practice',ctx,['lesson']),{session:true,context:{lesson:ctx.lesson||null},sessionKey:ctx.lesson?('course:'+ctx.lesson):null});
   else if(path==='/morph')found=route('morph','morph','#/morph');
   else if(path==='/lessons')found=route('lessons','learn','#/lessons');
   else if(path==='/practices/letters')found=route('letters','personal','#/practices/letters');
   else if(path==='/practices/numbers')found=route('practices-numbers','personal','#/practices/numbers');
   else if(path==='/practices/session')found=route('extra','practice',withQuery('#/practices/session',ctx,['kind','id']),{session:true,context:{kind:ctx.kind||null,id:ctx.id||null}});
   else if(path==='/practices')found=practicesHome();
   else if(path==='/ready')found=readyHome();
   else if(homework){
     const id=cleanId(decodeURIComponent(homework[1]));
     if(!id)return {kind:'unknown',href:'#'+raw};
     if(homework[2])found=route('homework-session','practice','#/ready/homework/'+id+'/session',{session:true,context:{id:id}});
     else found=route('homework','homework','#/ready/homework/'+id,{context:{id:id}});
   }
   else if(path==='/ready/exam')found=route('exam','exam','#/ready/exam');
   else if(path==='/ready/exam/session')found=route('exam-session','practice','#/ready/exam/session',{session:true});
   else if(path==='/ready/preexam')found=route('preexam','practice','#/ready/preexam',{session:true});
   else if(path==='/library')found=route('library','today','#/library',{hub:true});
   else if(path==='/rules')found=route('rules','rules',withQuery('#/rules',ctx,['lesson','article']),{context:{lesson:ctx.lesson||null,article:ctx.article||null}});
   else if(path==='/dict')found=route('dict','vocabulary',withQuery('#/dict',ctx,['filter','lesson']),{context:{filter:ctx.filter||null,lesson:ctx.lesson||null}});
   else if(path==='/materials')found=route('materials','materials','#/materials');
   else if(path==='/results')found=route('results','review','#/results');
   else if(path==='/settings')found=route('settings','today','#/settings',{hub:true});
   else return {kind:'unknown',href:'#'+raw};
   if(found.context){
     Object.keys(found.context).forEach(function(key){if(found.context[key]==null)delete found.context[key];});
   }
   return {kind:'route',route:found};
 }
 function classify(hash){return parse(hash);}
 function parentOf(item){
   const name=item&&item.name;
   if(name==='words'||name==='practice'||name==='theory')return lessonHome();
   if(name==='extra'||name==='letters'||name==='practices-numbers')return practicesHome();
   if(name==='homework'||name==='homework-session'||name==='exam'||name==='exam-session'||name==='preexam')return readyHome();
   return lessonHome();
 }
 function sameRoute(a,b){return !!(a&&b&&a.href===b.href);}
 function legacyRoute(view,rt){
   const runtime=rt||{};
   if(view==='today')return lessonHome();
   if(view==='learn')return route('lessons','learn','#/lessons');
   if(view==='path'){
     const ctx={};
     if(runtime.grammarLesson)ctx.lesson=cleanId(runtime.grammarLesson);
     return route('theory','path',withQuery('#/lesson/theory',ctx,['lesson']),{context:ctx});
   }
   if(view==='morph')return route('morph','morph','#/morph');
   if(view==='personal'){
     if(runtime.numbers)return route('practices-numbers','personal','#/practices/numbers');
     if(runtime.letters)return route('letters','personal','#/practices/letters');
     return practicesHome();
   }
   if(view==='review')return route('results','review','#/results');
   if(view==='vocabulary')return route('dict','vocabulary',withQuery('#/dict',runtime.dictContext||{},['filter','lesson']),{context:runtime.dictContext||{}});
   if(view==='materials')return route('materials','materials','#/materials');
   if(view==='rules')return route('rules','rules',withQuery('#/rules',runtime.rulesContext||{},['lesson','article']),{context:runtime.rulesContext||{}});
   if(view==='homework'){
     const id=cleanId(runtime.hwLesson)||cleanId(runtime.courseBlock);
     if(!id)return readyHome();
     return route('homework','homework','#/ready/homework/'+id,{context:{id:id},sessionKey:runtime.launchKey||null});
   }
   if(view==='exam')return route('exam','exam','#/ready/exam');
   if(view==='practice')return practiceRoute(runtime);
   return lessonHome();
 }
 function practiceRoute(runtime){
   const mode=runtime.mode||'';
   const launch=runtime.launchKey||'';
   if(mode==='words'&&(runtime.vocabRole==='must'||runtime.trainerReturn==='vocab:must'||launch==='vocab:must')){
     return route('words','practice','#/words',{session:true,sessionKey:'vocab:must'});
   }
   if(mode==='homework'){
     const id=cleanId(runtime.hwLesson)||cleanId(runtime.courseBlock);
     if(!id)return readyHome();
     return route('homework-session','practice','#/ready/homework/'+id+'/session',{session:true,context:{id:id},sessionKey:launch||null});
   }
   if(mode==='exam')return route('exam-session','practice','#/ready/exam/session',{session:true,sessionKey:launch||null});
   if(mode==='preexam'||String(launch).indexOf('preexam:')===0)return route('preexam','practice','#/ready/preexam',{session:true,sessionKey:launch||null});
   if(runtime.trainerReturn||mode==='numbers'||(mode==='words'&&runtime.trainerReturn!=='vocab:must')){
     const ctx={kind:cleanId(mode)||'extra'};
     const id=cleanId(runtime.activeLesson)||cleanId(String(launch).split(':').pop());
     if(id)ctx.id=id;
     return route('extra','practice',withQuery('#/practices/session',ctx,['kind','id']),{session:true,context:ctx,sessionKey:launch||null});
   }
   if(mode==='lesson'||mode==='voluntary'){
     const ctx={kind:mode==='voluntary'?'voluntary':'lesson'};
     const id=cleanId(runtime.activeLesson);
     if(id)ctx.id=id;
     return route('extra','practice',withQuery('#/practices/session',ctx,['kind','id']),{session:true,context:ctx,sessionKey:launch||null});
   }
   const ctx={};
   const lesson=cleanId(runtime.courseBlock)||cleanId(runtime.grammarLesson);
   if(lesson)ctx.lesson=lesson;
   return route('practice','practice',withQuery('#/practice',ctx,['lesson']),{session:true,context:ctx,sessionKey:launch||null});
 }
 function sectionPlan(ids,view){
   const list=Array.isArray(ids)?ids.filter(function(id){return typeof id==='string'&&id;}).slice():[];
   if(!list.length)return [];
   const want=String(view||'today')+'-view';
   const shown=list.indexOf(want)>=0?want:(list.indexOf('today-view')>=0?'today-view':list[0]);
   return [shown];
 }
 function slim(item){
   if(!item)return null;
   return {name:item.name,view:item.view,href:item.href,context:item.context||{},session:!!item.session,hub:!!item.hub,sessionKey:item.sessionKey||null};
 }
 function packState(prev,item,qzView){
   const base={};
   const drop={queue:1,draft:1,practiceIds:1,answers:1,snapshot:1};
   if(prev&&typeof prev==='object'){
     Object.keys(prev).forEach(function(key){
       if(drop[key]||key==='qzNav'||key==='qzView')return;
       base[key]=prev[key];
     });
   }
   const origin=item.origin?slim(item.origin):null;
   base.qzView=qzView||item.view;
   base.qzNav={version:VERSION,route:item.href,name:item.name,context:item.context||{},origin:origin,originAdjacent:!!item.originAdjacent,sessionKey:item.sessionKey||null};
   return base;
 }

 let entries=[];
 let index=-1;
 let pushCount=0;
 let lastApplied='';
 let applying=false;
 let pendingIndex=null;
 let applyFn=null;
 const claimedFlag=typeof WeakSet==='function'?new WeakSet():null;

 function current(){return index>=0?entries[index]:null;}
 function stack(){return entries.slice(0,index+1).map(slim);}
 function write(method,state,href){
   lastApplied=href;
   try{root.history[method](state,'',href);}catch(e){try{root.history[method](state,'');}catch(e2){}}
   try{if(root.location&&root.location.hash!==href)root.location.hash=href;}catch(e){}
 }
 function adjacentOriginFromState(state,item){
   const qz=state&&state.qzNav;
   if(!qz||qz.originAdjacent!==true||qz.route!==item.href||!qz.origin||typeof qz.origin.href!=='string')return null;
   const parsed=parse(qz.origin.href);
   if(parsed.kind!=='route'||parsed.route.href===item.href)return null;
   return slim(parsed.route);
 }
 function commit(info){
   notice(false);
   const source=info&&info.source||'user';
   const parsed=info&&info.route?{kind:'route',route:info.route}:(info&&info.href?parse(info.href):null);
   const item=slim(parsed&&parsed.route?parsed.route:legacyRoute(info&&info.view,info&&info.runtime));
   const bootOrigin=source==='boot'&&index<0?adjacentOriginFromState(root.history&&root.history.state,item):null;
   const prev=current()||bootOrigin;
   let origin=prev&&prev.origin?slim(prev.origin):null;
   if(!prev||!sameRoute(prev,item))origin=prev?slim(prev):origin;
   if(item.session&&(!origin||origin.href===item.href))origin=slim(parentOf(item));
   if(!item.session&&origin&&origin.href===item.href)origin=prev&&prev.origin?slim(prev.origin):null;
   item.origin=origin;
   const same=!!(prev&&prev.href===item.href);
   item.originAdjacent=bootOrigin?true:(!same&&prev&&origin&&prev.href===origin.href?true:!!(same&&prev&&prev.originAdjacent));
   const state=packState(root.history&&root.history.state,item,item.view);
   let href=item.href;
   if(source==='boot'){
     const live=root.location?String(root.location.hash||''):'';
     if(parse(live).kind==='anchor')href=live;
   }
   if(source==='user'&&!same){
     entries=entries.slice(0,index+1);
     entries.push(item);
     index=entries.length-1;
     pushCount+=1;
     write('pushState',state,href);
     return {pushed:true,href:item.href,route:item};
   }
   if(index<0&&bootOrigin){entries=[bootOrigin,item];index=1;}
   else if(index<0){entries=[item];index=0;}
   else entries[index]=item;
   write('replaceState',state,href);
   return {pushed:false,href:item.href,route:item};
 }
 function mark(ev){
   if(!ev)return;
   try{ev._qzClaimed=true;}catch(e){}
   if(claimedFlag){try{claimedFlag.add(ev);}catch(e){}}
   if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
 }
 function claimed(ev){
   if(!ev)return false;
   if(ev._qzClaimed)return true;
   if(claimedFlag){try{return claimedFlag.has(ev);}catch(e){}}
   return false;
 }
 function destinationHref(ev){
   const state=ev&&ev.state;
   if(state&&state.qzNav&&typeof state.qzNav.route==='string')return state.qzNav.route;
   const hash=root.location?String(root.location.hash||''):'';
   const parsed=parse(hash);
   if(parsed.kind==='route')return parsed.route.href;
   return hash;
 }
 function onPop(ev){
   if(applying){
     mark(ev);
     if(pendingIndex!=null&&entries[pendingIndex])index=pendingIndex;
     pendingIndex=null;
     const item=current();
     applying=false;
     if(item){
       lastApplied=item.href;
       if(applyFn)applyFn(item,'history');
       else{
         const packed=packState(ev&&ev.state,item,item.view);
         try{root.history.replaceState(packed,'',item.href);}catch(e){}
         try{if(root.location&&root.location.hash!==item.href)root.location.hash=item.href;}catch(e){}
       }
     }
     return true;
   }
   const state=ev&&ev.state||null;
   const hash=root.location?String(root.location.hash||''):'';
   const parsed=parse(hash);
   const href=destinationHref(ev);
   const cur=current();
   const prev=index>0?entries[index-1]:null;
   if(state&&state.qzView&&!state.qzNav){
     mark(ev);
     const item=slim(legacyRoute(state.qzView));
     const prior=current();
     item.origin=prior&&prior.origin?slim(prior.origin):slim(parentOf(item));
     if(item.session&&(!item.origin||item.origin.href===item.href))item.origin=slim(parentOf(item));
     if(prev&&prev.view===item.view){index-=1;entries[index]=item;}
     else if(index<0){entries=[item];index=0;}
     else{entries=entries.slice(0,index+1);entries.push(item);index=entries.length-1;}
     lastApplied=item.href;
     const packed=packState(state,item,item.view);
     try{root.history.replaceState(packed,'',item.href);}catch(e){}
     try{if(root.location&&root.location.hash!==item.href)root.location.hash=item.href;}catch(e){}
     if(applyFn)applyFn(item,'history');
     return true;
   }
   if(state&&(state.nav2||state.fs2)){
     if(cur&&prev&&cur.href!==href&&prev.href===href){
       mark(ev);
       index-=1;
       lastApplied=href;
       if(applyFn)applyFn(current(),'history');
       return true;
     }
     if(!(state.qzNav&&state.qzNav.route)||(cur&&cur.href===href))return false;
   }
   if(state&&state.qzNav&&cur&&cur.view==='morph'&&cur.href===href)return false;
   if(state&&state.qzNav&&cur&&cur.href===href){mark(ev);lastApplied=href;return true;}
   if(parsed.kind==='anchor'){mark(ev);lastApplied=href;return true;}
   if(parsed.kind==='unknown'){
     mark(ev);
     const lesson=slim(lessonHome());
     const prev=current();
     lesson.origin=prev?slim(prev):null;
     if(!prev||prev.href!==lesson.href){
       entries=entries.slice(0,index+1);
       entries.push(lesson);
       index=entries.length-1;
     }else entries[index]=lesson;
     const packed=packState(state,lesson,lesson.view);
     write('replaceState',packed,lesson.href);
     if(applyFn)applyFn(current(),'history');
     notice(true);
     return true;
   }
   mark(ev);
   if(index>0&&entries[index-1]&&entries[index-1].href===href)index-=1;
   else if(entries[index+1]&&entries[index+1].href===href)index+=1;
   else if(parsed.kind==='route'){
     const item=slim(parsed.route);
     const prev=current();
     item.origin=prev&&prev.origin?slim(prev.origin):slim(parentOf(item));
     entries=entries.slice(0,index+1);
     entries.push(item);
     index=entries.length-1;
   }
   lastApplied=href;
   if(applyFn&&current())applyFn(current(),'history');
   return true;
 }
 function onHash(){
   const hash=root.location?String(root.location.hash||''):'';
   if(!hash||hash===lastApplied)return;
   const parsed=parse(hash);
   if(parsed.kind==='anchor'||parsed.kind==='none')return;
   if(parsed.kind==='unknown'){
     commit({view:'today',source:'boot',route:lessonHome()});
     notice(true);
     return;
   }
   commit({view:parsed.route.view,source:'history',route:parsed.route});
   if(applyFn)applyFn(current(),'history');
 }
 function pauseReturn(){
   const cur=current();
   const origin=cur&&cur.origin;
   const prev=index>0?entries[index-1]:null;
   if(prev&&origin&&prev.href===origin.href)return {how:'back'};
   const target=origin?slim(origin):slim(parentOf(cur));
   return {how:origin?'push':'replace',route:target,view:target.view};
 }
 function isNoopHistory(name){
   const fn=root.history&&root.history[name];
   if(typeof fn!=='function')return true;
   let src='';
   try{src=Function.prototype.toString.call(fn);}catch(e){return false;}
   src=src.replace(/\s+/g,'');
   return src===name+'(){}'||src==='function'+name+'(){}'||src==='function(){}'||src==='()=>{}';
 }
 function settleSync(item){
   lastApplied=item.href;
   try{if(root.location&&root.location.hash!==item.href)root.location.hash=item.href;}catch(e){}
   if(applyFn)applyFn(item,'history');
 }
 function goBack(){
   if(index<=0)return false;
   if(isNoopHistory('back')){
     index-=1;
     settleSync(current());
     return true;
   }
   applying=true;
   pendingIndex=index-1;
   const prevApplied=lastApplied;
   lastApplied=entries[pendingIndex].href;
   try{root.history.back();}catch(e){applying=false;pendingIndex=null;lastApplied=prevApplied;return false;}
   return true;
 }
 function goForward(){
   if(index>=entries.length-1)return false;
   if(isNoopHistory('forward')){
     index+=1;
     settleSync(current());
     return true;
   }
   applying=true;
   pendingIndex=index+1;
   const prevApplied=lastApplied;
   lastApplied=entries[pendingIndex].href;
   try{root.history.forward();}catch(e){applying=false;pendingIndex=null;lastApplied=prevApplied;return false;}
   return true;
 }
 function bind(fn){applyFn=fn;}
 function notice(on){
   try{
     const el=root.document&&root.document.getElementById&&root.document.getElementById('route-note');
     if(!el)return;
     el.hidden=!on;
     el.textContent=on?'Такого адреса нет. Открыт урок.':'';
   }catch(e){}
 }
 function resetTrace(){entries=[];index=-1;pushCount=0;lastApplied='';applying=false;pendingIndex=null;}

 const api={VERSION:VERSION,SECTIONS:SECTIONS,parse:parse,classify:classify,parentOf:parentOf,sameRoute:sameRoute,legacyRoute:legacyRoute,lessonHome:lessonHome,sectionPlan:sectionPlan,packState:packState,commit:commit,pauseReturn:pauseReturn,onPop:onPop,onHash:onHash,claimed:claimed,bind:bind,goBack:goBack,goForward:goForward,stack:stack,notice:notice,resetTrace:resetTrace,cleanId:cleanId};
 Object.defineProperty(api,'pushCount',{get:function(){return pushCount;}});
 if(node)module.exports=api;
 if(root&&root.window){
   root.QazaqNav=api;
   if(root.addEventListener){
     root.addEventListener('popstate',onPop,true);
     root.addEventListener('hashchange',onHash);
   }
 }
})(typeof window!=='undefined'?window:globalThis);
