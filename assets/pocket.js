/* Общий выезжающий блок с кодом: TreeSite.mountPocket(cfg). Подключать после core.js. */
(function(){
  'use strict';
  const TS = window.TreeSite;
  const CSS_EXTRA = ':root[data-theme="amoled"] .pocket button.pocket-tab{background:#fff;border-color:#fff;color:#000;box-shadow:-4px 4px 14px rgba(255,255,255,.12)}:root[data-theme="amoled"] .pocket button.pocket-tab:hover{filter:brightness(.92)}:root .pocket button.pocket-tab{overflow:hidden;white-space:nowrap;transition:height .32s cubic-bezier(.2,.8,.2,1),filter .15s}@media (prefers-reduced-motion:reduce){:root .pocket button.pocket-tab{transition:none}}';
  const CSS = "/* \u00ab\u041a\u0430\u0440\u043c\u0430\u043d\u00bb \u0441 \u043a\u043e\u0434\u043e\u043c: \u0432\u044b\u0435\u0437\u0436\u0430\u0435\u0442 \u0441\u043f\u0440\u0430\u0432\u0430, \u043f\u043e\u0432\u0435\u0440\u0445 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b, \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0441\u0434\u0432\u0438\u0433\u0430\u0435\u0442 */\n.pocket{\n  --kw:#7a4a70;--ty:#2f6f73;--cm:#8a8576;--nm:#9a6a14;\n  position:fixed;top:0;right:0;bottom:0;z-index:60;\n  width:min(600px,94vw);\n  display:flex;flex-direction:column;\n  background:var(--bg);color:var(--tx);\n  border-left:1px solid var(--bd);box-shadow:-12px 0 36px rgba(0,0,0,.18);\n  transform:translateX(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1);\n  padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) 0;\n  will-change:transform;\n}\n.pocket.open{transform:none}\n/* \u043d\u0430 \u0448\u0438\u0440\u043e\u043a\u0438\u0445 \u044d\u043a\u0440\u0430\u043d\u0430\u0445 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0441\u0434\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044f \u0432\u043b\u0435\u0432\u043e \u043d\u0430 \u0448\u0438\u0440\u0438\u043d\u0443 \u043a\u0430\u0440\u043c\u0430\u043d\u0430; \u043d\u0430 \u0443\u0437\u043a\u0438\u0445 \u043a\u0430\u0440\u043c\u0430\u043d \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043f\u043e\u0432\u0435\u0440\u0445 */\nbody{transition:padding-right .28s cubic-bezier(.2,.8,.2,1)}\n@media (min-width:1100px){body.pocket-open{padding-right:600px}}\n:root[data-theme=\"dark\"] .pocket,:root[data-theme=\"amoled\"] .pocket{--kw:#cf9fc0;--ty:#7fc0c4;--cm:#8f8a7c;--nm:#e0b060}\n@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]) .pocket{--kw:#cf9fc0;--ty:#7fc0c4;--cm:#8f8a7c;--nm:#e0b060}}\n:root .pocket button.pocket-tab{\n  position:absolute;left:-42px;top:min(38%,320px);\n  width:42px;padding:16px 0;border:1px solid var(--ac);border-right:0;\n  border-radius:12px 0 0 12px;background:var(--ac);color:var(--onac,#fff);\n  font:600 14px/1 ui-monospace,SFMono-Regular,Consolas,monospace;\n  writing-mode:vertical-rl;transform:none;\n  cursor:pointer;box-shadow:-4px 4px 14px rgba(0,0,0,.18);\n}\n:root .pocket button.pocket-tab:hover{filter:brightness(1.08)}\n.pocket-head{display:flex;align-items:flex-start;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--bd)}\n.pocket-head h2{margin:0;font-size:16px}\n.pocket-head p{margin:3px 0 0;font-size:12.5px;color:var(--mut);line-height:1.45}\n.pocket-x{margin-left:auto;flex:none;padding:4px 10px;position:static}\n.pocket-scroll{flex:1;overflow:auto;padding:10px 0 18px;overscroll-behavior:contain}\n.code{margin:0;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;min-width:max-content;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:default}\n.code *{-webkit-user-select:none;user-select:none}\n.code .ln{display:block;padding:0 16px 0 0;border-left:3px solid transparent}\n.code .no{display:inline-block;width:38px;padding-right:12px;text-align:right;color:var(--mut);opacity:.6;user-select:none}\n.code .ln.on{background:var(--acsoft);border-left-color:var(--ac)}\n.code .ln.on .no{opacity:1;color:var(--ac)}\n.code .ln.on.fresh{animation:lnin .35s ease backwards;animation-delay:calc(var(--i) * 110ms)}\n@keyframes lnin{from{background:transparent;border-left-color:transparent}}\n.code .k{color:var(--kw)}.code .t{color:var(--ty)}.code .c{color:var(--cm);font-style:italic}.code .n{color:var(--nm)}\n.pocket-foot{padding:9px 16px;border-top:1px solid var(--bd);font-size:12.5px;color:var(--mut);line-height:1.5}\n.pocket-foot b{color:var(--tx)}\n@media (prefers-reduced-motion:reduce){.pocket,body{transition:none}.code .ln.on.fresh{animation:none}}\n";
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = /(\/\*.*?\*\/)|\b(void|int|if|else|struct|return|sizeof|for|while|double|char|long|const|break)\b|\b(vertex|malloc|NULL|ceil|floor|log2|fabs|ldexp|putchar)\b|(-?\b\d+\b)/g;
  function paint(src){
    let out = '', last = 0, m;
    re.lastIndex = 0;
    while((m = re.exec(src))){
      out += esc(src.slice(last, m.index));
      out += `<span class="${m[1] ? 'c' : m[2] ? 'k' : m[3] ? 't' : 'n'}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }
  /* Выезжающий блок с кодом. cfg: {key, title, desc, foot, tab, code:[[строка, 'теги через пробел'], ...]} */
  TS.mountPocket = function(cfg){
    const st = document.createElement('style');
    st.textContent = CSS + CSS_EXTRA;
    document.head.appendChild(st);
    const pocket = document.createElement('aside');
    pocket.className = 'pocket';
    pocket.setAttribute('aria-label', 'Код алгоритма');
    pocket.innerHTML = `<button class="pocket-tab" type="button" aria-expanded="false" title="Показать код">${cfg.tab || '{ } посмотреть код'}</button>
      <div style="display:flex;flex-direction:column;min-height:0;height:100%">
        <div class="pocket-head"><div><h2>${cfg.title}</h2><p>${cfg.desc || ''}</p></div><button class="pocket-x" type="button" aria-label="Закрыть код">✕</button></div>
        <div class="pocket-scroll"><pre class="code"></pre></div>
        <div class="pocket-foot">${cfg.foot || ''}</div>
      </div>`;
    document.body.appendChild(pocket);
    const pre = pocket.querySelector('.code'), scroll = pocket.querySelector('.pocket-scroll'), tab = pocket.querySelector('.pocket-tab');
    let lines = [];
    function setCode(code, o){
      if(!code){ pocket.style.display = 'none'; document.body.classList.remove('pocket-open'); return; }
      pocket.style.display = '';
      o = o || {};
      if(o.title) pocket.querySelector('.pocket-head h2').innerHTML = o.title;
      if(o.desc !== undefined) pocket.querySelector('.pocket-head p').innerHTML = o.desc;
      if(o.foot !== undefined) pocket.querySelector('.pocket-foot').innerHTML = o.foot;
      pre.innerHTML = code.map((l, i) =>
        `<span class="ln" data-t=" ${l[1]} "><span class="no">${i + 1}</span>${paint(l[0])}\n</span>`).join('');
      lines = Array.from(pre.children);
      scroll.scrollTop = 0;
      document.body.classList.toggle('pocket-open', pocket.classList.contains('open'));
    }
    setCode(cfg.code);
    const hit = (el, set) => el.dataset.t.trim().split(' ').some(t => t && set.has(t));
    ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(ev => pre.addEventListener(ev, e => e.preventDefault()));

    function show(tags){
      const set = new Set(tags || []);
      let k = 0;
      lines.forEach(el => { el.classList.remove('on', 'fresh'); if(hit(el, set)) el.style.setProperty('--i', k++); });
      void pre.offsetWidth;
      lines.forEach(el => { if(hit(el, set)) el.classList.add('on', 'fresh'); });
      const on = lines.filter(el => el.classList.contains('on'));
      if(on.length && pocket.classList.contains('open')){
        const top = on[0].offsetTop, last = on[on.length - 1];
        const bottom = last.offsetTop + last.offsetHeight, h = scroll.clientHeight;
        let target = (top + bottom) / 2 - h / 2;
        if(bottom - top > h - 60) target = bottom - h + 80;
        scroll.scrollTo({top: Math.max(0, target), behavior: 'smooth'});
      }
    }
    /* плавное изменение высоты вкладки при смене надписи */
    function setLabel(text, instant){
      if(tab.textContent === text) return;
      const h0 = tab.offsetHeight;
      tab.textContent = text;
      if(instant || !h0 || pocket.style.display === 'none'){ tab.style.height = ''; return; }
      tab.style.height = 'auto';
      const h1 = tab.offsetHeight;
      tab.style.height = h0 + 'px';
      void tab.offsetHeight;
      tab.style.height = h1 + 'px';
    }
    function setOpen(v, instant){
      pocket.classList.toggle('open', v);
      document.body.classList.toggle('pocket-open', v && pocket.style.display !== 'none');
      tab.setAttribute('aria-expanded', String(v));
      tab.title = v ? 'Скрыть код' : 'Показать код';
      setLabel(v ? '{ } убрать код' : (cfg.tab || '{ } посмотреть код'), instant);
      try{ localStorage.setItem(cfg.key || 'codeOpen', v ? '1' : '0'); }catch(e){}
    }
    tab.onclick = () => setOpen(!pocket.classList.contains('open'));
    pocket.querySelector('.pocket-x').onclick = () => setOpen(false);
    document.addEventListener('keydown', e => { if(e.key === 'Escape') setOpen(false); });
    try{ if(localStorage.getItem(cfg.key || 'codeOpen') === '1') setOpen(true, true); }catch(e){}
    return {show, setOpen, setCode};
  };
})();