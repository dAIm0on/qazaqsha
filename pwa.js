(function(){
 'use strict';
 const status=document.getElementById('offline-status'),install=document.getElementById('install-app'),update=document.getElementById('update-app');
 if(window.PORTABLE_EXPORT||location.protocol==='file:'){status.textContent='Этот HTML уже содержит весь тренажёр. Храни файл вместе с резервной копией прогресса. Для установки на главный экран открой веб-версию.';return;}
 let prompt=null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false;});
 install.onclick=async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;install.hidden=true;};
 window.addEventListener('appinstalled',()=>{install.hidden=true;status.textContent='Приложение добавлено на главный экран.';});
 if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
 if(!('serviceWorker' in navigator)||!window.isSecureContext){status.textContent='В этом браузере офлайн-копия недоступна. Можно скачать полный HTML из папки с исходниками.';return;}
 const SAVED='Учебные материалы сохранены для работы без сети. Внешние оригиналы открываются с интернетом.';
 const SAVING='Сохраняю учебные материалы для работы без сети…';
 const PENDING='Новая версия уже активирована. Эта вкладка не перезагружена, чтобы не потерять активный ввод. Нажми «Сохранить ответ и обновить приложение», когда будет удобно.';
 const AVAILABLE='Доступна новая версия. Эта вкладка не будет перезагружена сама. Нажми «Сохранить ответ и обновить приложение», когда будет удобно.';
 const BLOCKED='Обновление не применено: сохранить активные данные в браузере не удалось. Экспортируй прогресс перед перезагрузкой.';
 let controllerKnown=!!navigator.serviceWorker.controller,reloadRequested=false,reloadIssued=false,pendingUi=false;
 function beforeUpdate(){
  if(window.dispatchEvent(new Event('qazaq-before-update',{cancelable:true})))return true;
  status.textContent=BLOCKED;
  return false;
 }
 function reloadOnce(){if(reloadIssued)return;reloadIssued=true;location.reload();}
 function showPending(){
  pendingUi=true;
  update.hidden=false;
  update.disabled=false;
  status.textContent=PENDING;
  update.onclick=()=>{if(reloadRequested)return;if(!beforeUpdate())return;reloadRequested=true;update.disabled=true;reloadOnce();};
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!controllerKnown){
   controllerKnown=true;
   pendingUi=false;
   update.hidden=true;
   status.textContent=SAVED;
   return;
  }
  if(reloadRequested){reloadOnce();return;}
  showPending();
 });
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  const ready=()=>{if(pendingUi)return;status.textContent=reg.active?SAVED:SAVING;};
  const waiting=()=>{
   if(!reg.waiting)return;
   pendingUi=true;
   update.hidden=false;
   update.disabled=false;
   status.textContent=AVAILABLE;
   update.onclick=()=>{
    if(reloadRequested)return;
    if(!beforeUpdate())return;
    reloadRequested=true;
    update.disabled=true;
    status.textContent='Активные данные сохранены. Включаю новую версию…';
    const worker=reg.waiting;
    if(worker)worker.postMessage({type:'ACTIVATE_UPDATE'});
    else reloadOnce();
   };
  };
  ready();
  waiting();
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;
   worker?.addEventListener('statechange',()=>{
    if(worker.state==='installed'){ready();waiting();}
    if(worker.state==='redundant'&&!reg.waiting){pendingUi=false;update.hidden=true;update.disabled=false;ready();}
   });
  });
  const check=()=>reg.update().catch(()=>{});
  check();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  setInterval(check,60*60*1000);
  navigator.serviceWorker.ready.then(()=>ready());
 }).catch(()=>{pendingUi=false;status.textContent='Офлайн-копию сохранить не удалось. Тренажёр работает при открытом сайте; экспортируй прогресс отдельно.';});
})();
