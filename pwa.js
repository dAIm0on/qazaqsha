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
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
   const ready=()=>{status.textContent=reg.active?'Учебные материалы сохранены для работы без сети. Внешние оригиналы открываются с интернетом.':'Сохраняю учебные материалы для работы без сети…';};ready();
   const waiting=()=>{
     if(!reg.waiting)return;
     update.hidden=false;
     const panel=document.getElementById('installation-panel');if(panel)panel.open=true;
     status.textContent='Доступна новая версия. Прогресс этого окна Chrome не сотрётся. Нажми «Сохранить ответ и обновить приложение».';
     update.onclick=()=>{if(!window.dispatchEvent(new Event('qazaq-before-update',{cancelable:true}))){status.textContent='Сначала экспортируй прогресс: сохранить его в браузере не удалось.';return;}reg.waiting.postMessage({type:'ACTIVATE_UPDATE'});};
   };waiting();
   reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){ready();waiting();}if(worker.state==='redundant')status.textContent='Не удалось обновить офлайн-копию. Текущая версия остаётся доступна.';});});
   const check=()=>reg.update().catch(()=>{});
   check();
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
   setInterval(check,60*60*1000);
   navigator.serviceWorker.ready.then(()=>ready());
 }).catch(()=>{status.textContent='Офлайн-копию сохранить не удалось. Тренажёр работает при открытом сайте; экспортируй прогресс отдельно.';});
 let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;if(window.dispatchEvent(new Event('qazaq-before-update',{cancelable:true})))location.reload();else status.textContent='Обновление готово. Экспортируй прогресс перед перезагрузкой страницы.';}});
})();
