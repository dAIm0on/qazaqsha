/* Design prefs only. Namespaced; does not touch course progress storage. */
(function(){
  const KEY='qazaqsha.design.v1';
  const seasons=['autumn','summer','spring'];
  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}
  }
  function save(next){
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  }
  function apply(prefs){
    const season=seasons.includes(prefs.season)?prefs.season:'autumn';
    document.documentElement.dataset.season=season;
    if(prefs.motion==='off')document.documentElement.dataset.motion='off';
    else document.documentElement.removeAttribute('data-motion');
    document.querySelectorAll('[data-season-pick]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.seasonPick===season));
    });
    const sel=document.getElementById('season-select');
    if(sel)sel.value=season;
    const motion=document.getElementById('motion-off');
    if(motion)motion.checked=prefs.motion==='off';
  }
  const prefs=load();
  if(!prefs.season)prefs.season='autumn';
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
    document.querySelectorAll('[data-season-pick]').forEach(b=>{
      b.addEventListener('click',()=>{
        prefs.season=b.dataset.seasonPick;
        save(prefs);apply(prefs);
      });
    });
    const sel=document.getElementById('season-select');
    if(sel)sel.addEventListener('change',()=>{prefs.season=sel.value;save(prefs);apply(prefs);});
    const motion=document.getElementById('motion-off');
    if(motion)motion.addEventListener('change',()=>{prefs.motion=motion.checked?'off':'system';save(prefs);apply(prefs);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
