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
