/* Email login + Firestore progress. No-op until FIREBASE_CONFIG is set. */
(function(){
  'use strict';
  const P=window.ProgressStore;
  const cfg=window.FIREBASE_CONFIG;
  const api={configured:!!(cfg&&cfg.apiKey&&cfg.projectId), user:null, ready:false};
  let db=null, auth=null, pushTimer=null, lastHash='';
  function hash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h);}
  function payload(state){
    const copy=JSON.parse(P.serialize(state));
    copy.session=null;
    if(Array.isArray(copy.events)&&copy.events.length>2500)copy.events=copy.events.slice(-2500);
    return copy;
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Не загрузился '+src));document.head.append(s);
    });
  }
  async function init(){
    if(!api.configured){api.ready=true;return api;}
    const v='10.14.1';
    await loadScript('https://www.gstatic.com/firebasejs/'+v+'/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/'+v+'/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/'+v+'/firebase-firestore-compat.js');
    firebase.initializeApp(cfg);
    auth=firebase.auth();db=firebase.firestore();
    auth.onAuthStateChanged(u=>{api.user=u?{uid:u.uid,email:u.email||''}:null;window.dispatchEvent(new CustomEvent('qazaq-cloud-user',{detail:api.user}));});
    api.ready=true;return api;
  }
  api.start=init;
  api.register=async(email,password)=>{
    if(!auth)throw Error('Облако ещё не подключено.');
    await auth.createUserWithEmailAndPassword(email,password);
  };
  api.login=async(email,password)=>{
    if(!auth)throw Error('Облако ещё не подключено.');
    await auth.signInWithEmailAndPassword(email,password);
  };
  api.logout=async()=>{if(auth)await auth.signOut();};
  api.pull=async()=>{
    if(!api.user||!db)return null;
    const snap=await db.collection('users').doc(api.user.uid).get();
    if(!snap.exists)return null;
    const data=snap.data();
    if(!data||!data.progress)return null;
    return P.migrate(typeof data.progress==='string'?JSON.parse(data.progress):data.progress);
  };
  api.push=async(state)=>{
    if(!api.user||!db)return;
    const body=payload(state), raw=JSON.stringify(body), h=hash(raw);
    if(h===lastHash)return;lastHash=h;
    await db.collection('users').doc(api.user.uid).set({
      email:api.user.email, updated_at:Date.now(), progress:body
    },{merge:true});
  };
  api.pushSoon=(state)=>{
    if(!api.user)return;
    clearTimeout(pushTimer);pushTimer=setTimeout(()=>api.push(state).catch(()=>{}),1800);
  };
  window.QazaqCloud=api;
})();
