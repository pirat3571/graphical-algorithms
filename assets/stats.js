/* Анонимная статистика: посещения и нажатия на кнопки «Построить», «Пример», клики по рекламе.
   Сайт статический (GitHub Pages), поэтому считает внешний сервис.
   Пустые значения: ничего не отправляется и ничего не загружается. Введённый текст никуда не передаётся. */
(function(){
  'use strict';
  var CONFIG = {
    goatcounter: 'pirat3571',   /* код сайта на goatcounter.com, например 'mysite' (адрес mysite.goatcounter.com) */
  };

  var LIMIT_MS = 5 * 60 * 1000;       /* одно и то же событие считается не чаще раза в 5 минут */
 
  var TS = window.TreeSite || (window.TreeSite = {});
  var page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  var queue = [], gcReady = false, typed = false, mem = {};
 
  function real(v){ return v && !/^__.*__$/.test(v) ? v : ''; }
  var code = real(CONFIG.goatcounter), host = real(CONFIG.allowedHost), dev = false;
 
  /* проверка у себя: в консоли браузера выполнить  localStorage.statsCode = 'код сайта'  и обновить страницу */
  if(!code){
    try{ code = localStorage.getItem('statsCode') || ''; dev = !!code; }catch(e){}
  }
  if(code && host && !dev && location.hostname !== host) code = '';   /* чужой адрес: не считаем */
 
  function loadScript(src, attrs, onload){
    var s = document.createElement('script');
    s.async = true; s.src = src;
    for(var k in attrs) s.setAttribute(k, attrs[k]);
    if(onload) s.onload = onload;
    document.head.appendChild(s);
  }
  if(code){
    window.goatcounter = window.goatcounter || {};
    if(dev) window.goatcounter.allow_local = true;
    loadScript('https://gc.zgo.at/count.js',
      {'data-goatcounter': 'https://' + code + '.goatcounter.com/count'},
      function(){ gcReady = true; queue.splice(0).forEach(send); });
  }
 
  function send(name){
    try{ window.goatcounter.count({path: 'event/' + name, title: name, event: true}); }catch(e){}
  }
  /* не чаще одного раза за LIMIT_MS на браузер и на событие */
  function allowed(name){
    var now = Date.now(), store = null, last;
    try{ store = JSON.parse(localStorage.getItem('statsLast') || '{}'); last = store[name] || 0; }
    catch(e){ store = null; last = mem[name] || 0; }
    if(now - last < LIMIT_MS) return false;
    if(store){ store[name] = now; try{ localStorage.setItem('statsLast', JSON.stringify(store)); }catch(e){} }
    else mem[name] = now;
    return true;
  }
  TS.track = function(name){
    if(!code || !allowed(name)) return;
    if(gcReady) send(name); else queue.push(name);
  };
 
  /* пользователь печатал сам: событие input от клавиатуры (программная подстановка его не вызывает) */
  document.addEventListener('input', function(e){
    var t = e.target;
    if(e.isTrusted && t && t.matches && t.matches('input[type=text],input:not([type])')) typed = true;
  });
  function built(){
    TS.track('build/' + page);
    if(typed) TS.track('build-custom/' + page);
    typed = false;
  }
  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    if(e.target.closest('#go')) built();
    else if(e.target.closest('#ex')) TS.track('example/' + page);
    else if(e.target.closest('.ad-card')) TS.track('ad-click');
    else if(e.target.closest('.ad-x')) TS.track('ad-close');
  });
  document.addEventListener('keydown', function(e){
    var t = e.target;
    if(e.key === 'Enter' && t && t.matches && t.matches('input') && t.type !== 'checkbox' && document.getElementById('go')) built();
  });
})();