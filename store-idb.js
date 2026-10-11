/* Storage P0 (11.10.2026). iPhone Safari gives localStorage 5 MB, and a string with any Cyrillic letter costs 2 bytes per
   character there: about 2.6 million characters for the whole progress. IndexedDB (much larger quota) keeps:
   - "state": a mirror of the full progress written after every save (the newer copy wins on the next load);
   - "archive:<key>:<time>": backup copies moved out of localStorage to free space. Nothing is deleted. */
(function(root){
 'use strict';
 const DB='qazaq-store',KV='kv',DAY=864e5;
 const idb=root.indexedDB||null;
 let dbp=null;
 function open(){
   if(!idb)return Promise.reject(Error('IndexedDB unavailable'));
   if(!dbp)dbp=new Promise((resolve,reject)=>{
     let req;try{req=idb.open(DB,1);}catch(error){reject(error);return;}
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(KV))req.result.createObjectStore(KV);};
     req.onsuccess=()=>resolve(req.result);
     req.onerror=()=>reject(req.error||Error('IndexedDB open failed'));
   }).catch(error=>{dbp=null;throw error;});
   return dbp;
 }
 function run(mode,fn){
   return open().then(db=>new Promise((resolve,reject)=>{
     const tx=db.transaction(KV,mode),store=tx.objectStore(KV);let out;
     const req=fn(store);if(req)req.onsuccess=()=>{out=req.result;};
     tx.oncomplete=()=>resolve(out);
     tx.onerror=()=>reject(tx.error||Error('IndexedDB write failed'));
     tx.onabort=()=>reject(tx.error||Error('IndexedDB write aborted'));
   }));
 }
 const put=(key,value)=>run('readwrite',s=>s.put(value,key));
 const get=key=>run('readonly',s=>s.get(key));
 const keys=()=>run('readonly',s=>s.getAllKeys());
 // A stored progress string starts with {"saved_at":<ms>,... (app.js stamp()). Older writers have no stamp: 0.
 function savedAtOf(raw){const m=/^\{"saved_at":(\d+)/.exec(String(raw||'').slice(0,40));return m?Number(m[1]):0;}
 // Last learning activity in a state object: the newest event time.
 function activityOf(state){let t=0;for(const e of (state&&state.events)||[])if(e&&Number(e.at)>t)t=Number(e.at);return t;}
 // ---- mirror: coalesced, the latest string wins; flush() waits for it
 let pending=null,timer=null,writing=null,okAt=0,lastError=null;
 function writeLoop(){
   writing=(async()=>{
     try{
       while(pending){const job=pending;pending=null;await put('state',job);okAt=Math.max(okAt,job.saved_at);lastError=null;}
     }catch(error){lastError=error;throw error;}
     finally{writing=null;}
   })();
   return writing;
 }
 function mirror(raw,activity,delay){
   if(!idb)return Promise.reject(Error('IndexedDB unavailable'));
   pending={raw:String(raw),saved_at:savedAtOf(raw),activity:Number(activity)||0};
   clearTimeout(timer);
   if(delay>0){
     return new Promise((resolve,reject)=>{timer=setTimeout(()=>{timer=null;flush().then(resolve,reject);},delay);});
   }
   return flush();
 }
 function flush(){
   clearTimeout(timer);timer=null;
   if(writing)return writing.then(()=>pending?writeLoop():undefined);
   return pending?writeLoop():Promise.resolve();
 }
 const mirrored=savedAt=>okAt>=savedAt&&savedAt>0;
 const readMirror=()=>get('state').then(r=>r&&typeof r.raw==='string'?r:null);
 // ---- archive: never deleted; the localStorage key is removed only after IndexedDB confirmed the write
 function archive(name,raw){const at=Date.now();return put('archive:'+name+':'+at,{name,raw:String(raw),at});}
 async function moveToArchive(storage,names){
   const moved=[];
   for(const name of names){
     let raw=null;try{raw=storage.getItem(name);}catch{}
     if(raw==null)continue;
     await archive(name,raw);
     const back=await latestArchive([name]);
     if(back!==raw)throw Error('archive check failed for '+name);
     try{storage.removeItem(name);}catch{}
     moved.push(name);
   }
   return moved;
 }
 async function latestArchive(names){
   const all=(await keys())||[];
   for(const name of names){
     const mine=all.filter(k=>typeof k==='string'&&k.startsWith('archive:'+name+':')).sort((a,b)=>Number(b.split(':').pop())-Number(a.split(':').pop()));
     if(mine.length){const r=await get(mine[0]);if(r&&typeof r.raw==='string')return r.raw;}
   }
   return null;
 }
 /* Answer events older than `days`: drop skills[].fsrs_log / fsrs_state. They are written (scheduler.js, knowledge.js)
    and never read; everything the app reads from an event stays. Returns the number of events changed. */
 function compactEvents(state,now,days){
   const edge=(Number(now)||Date.now())-(Number(days)||14)*DAY;let n=0;
   for(const e of (state&&state.events)||[]){
     if(!e||!(Number(e.at)<edge)||!Array.isArray(e.skills))continue;
     let hit=false;
     for(const s of e.skills)if(s&&typeof s==='object'&&('fsrs_log' in s||'fsrs_state' in s)){delete s.fsrs_log;delete s.fsrs_state;hit=true;}
     if(hit)n++;
   }
   return n;
 }
 function countCompactable(state,now,days){
   const edge=(Number(now)||Date.now())-(Number(days)||14)*DAY;let n=0;
   for(const e of (state&&state.events)||[])if(e&&Number(e.at)<edge&&Array.isArray(e.skills)&&e.skills.some(s=>s&&typeof s==='object'&&('fsrs_log' in s||'fsrs_state' in s)))n++;
   return n;
 }
 const api={available:!!idb,savedAtOf,activityOf,mirror,flush,mirrored,readMirror,archive,moveToArchive,latestArchive,compactEvents,countCompactable,lastError:()=>lastError};
 root.QazaqStore=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
