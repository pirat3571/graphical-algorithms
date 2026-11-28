/* Обратная связь: ссылка внизу страницы и окно с «живой» неровной рамкой.
   Подключается автоматически из core.js. Сообщения уходят через Web3Forms. */
(function(){
  'use strict';

  /* ===== НАСТРОЙКА: Access Key из письма от Web3Forms ===== */
  const ACCESS_KEY = 'ec192624-7acd-4cc0-8f86-376ee82700d8';
  /* ===================================================================== */

  const ENDPOINT = 'https://api.web3forms.com/submit';
  const COOLDOWN = 30000, LAST_KEY = 'fb-last', MAXLEN = 2000, MINLEN = 5;
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const motionOff = () => document.documentElement.dataset.motion === 'off';
  const TYPES = [['bug', 'Ошибка'], ['idea', 'Идея'], ['other', 'Другое']];

  const CSS = `
.fb-foot{margin:24px 0 0;text-align:center;font-size:13.5px;color:var(--mut)}
:root .fb-link{border:0;background:none;box-shadow:none;padding:2px 0;min-height:0;font-size:inherit;color:var(--tx);text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;border-radius:4px}
:root .fb-link:hover:not(:disabled){color:var(--ac);border-color:transparent;box-shadow:none}
:root .fb-link::after{display:none}
html.fb-lock{overflow:hidden;padding-right:var(--fb-sbw,0px)}
.fb-ov{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45);opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s}
.fb-ov.on{opacity:1;visibility:visible}
.fb-panel{--fb-fill:#faf9f5;--fb-ring:#8f8663;position:relative;width:min(460px,100%);max-height:calc(100dvh - 32px);display:flex;color:var(--tx);transform:translateY(14px) scale(.92);transition:transform .45s cubic-bezier(.2,1.35,.4,1)}
.fb-ov.on .fb-panel{transform:none}
:root[data-theme="dark"] .fb-panel{--fb-fill:#1e2125;--fb-ring:#8fb0cc}
:root[data-theme="amoled"] .fb-panel{--fb-fill:#000;--fb-ring:#fff}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="amoled"]) .fb-panel{--fb-fill:#1e2125;--fb-ring:#8fb0cc}}
.fb-bg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 16px 36px rgba(0,0,0,.35))}
.fb-bg path{fill:var(--fb-fill);stroke:var(--fb-ring);stroke-width:2.2;stroke-linejoin:round;transition:fill .3s,stroke .3s}
.fb-in{position:relative;flex:1;min-width:0;padding:34px 34px 30px;overflow:auto;overscroll-behavior:contain}
.fb-in h2{margin:0 0 4px;font-size:19px}
.fb-in .fb-sub{margin:0 0 14px;color:var(--mut);font-size:13.5px;line-height:1.45}
.fb-kinds{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
.fb-kinds button{font-size:13.5px;padding:6px 11px}
.fb-in label.fb-l{display:block;font-size:13px;color:var(--mut);margin:10px 0 5px}
.fb-in textarea{width:100%;min-height:120px;max-height:40vh;resize:vertical;padding:9px 11px;font:inherit;font-size:16px;line-height:1.45;border:1px solid var(--bd);border-radius:9px;background:var(--bg);color:var(--tx)}
:root[data-theme="amoled"] .fb-in textarea{background:rgba(255,255,255,.05)}
.fb-in textarea:focus{outline:2px solid var(--acsoft);border-color:var(--ac)}
:root[data-theme="amoled"] .fb-in textarea:focus{border-color:#fff}
.fb-cnt{text-align:right;font-size:12px;color:var(--mut);margin-top:3px}
.fb-cnt.bad{color:var(--bad)}
.fb-row{display:flex;gap:9px;align-items:center;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.fb-st{margin-right:auto;font-size:13.5px;color:var(--mut);min-height:1.4em;flex:1 1 140px}
.fb-st.bad{color:var(--bad)}
.fb-trap{position:absolute!important;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}
.fb-done{text-align:center;padding:18px 0 6px}
.fb-done b{display:block;font-size:19px;margin-bottom:6px}
.fb-done p{margin:0 0 16px;color:var(--mut)}
@media (prefers-reduced-motion:reduce){.fb-ov,.fb-panel{transition:none}}
`;

  /* ---------- контур: скруглённый прямоугольник с мягкой неровностью по краю ---------- */
  function outline(w, h, r, har, t){
    r = Math.min(r, w / 2 - 1, h / 2 - 1);
    const sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2, per = 2 * sw + 2 * sh + 4 * arc, N = 150;
    let d = '';
    for(let i = 0; i < N; i++){
      let s = i / N * per, x, y, nx, ny, a;
      if(s < sw){ x = r + s; y = 0; nx = 0; ny = -1; }
      else if((s -= sw) < arc){ a = s / r; x = w - r + Math.sin(a) * r; y = r - Math.cos(a) * r; nx = Math.sin(a); ny = -Math.cos(a); }
      else if((s -= arc) < sh){ x = w; y = r + s; nx = 1; ny = 0; }
      else if((s -= sh) < arc){ a = s / r; x = w - r + Math.cos(a) * r; y = h - r + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a); }
      else if((s -= arc) < sw){ x = w - r - s; y = h; nx = 0; ny = 1; }
      else if((s -= sw) < arc){ a = s / r; x = r - Math.sin(a) * r; y = h - r + Math.cos(a) * r; nx = -Math.sin(a); ny = Math.cos(a); }
      else if((s -= arc) < sh){ x = 0; y = h - r - s; nx = -1; ny = 0; }
      else { s -= sh; a = s / r; x = r - Math.cos(a) * r; y = r - Math.sin(a) * r; nx = -Math.cos(a); ny = -Math.sin(a); }
      const th = i / N * TAU;
      let off = 0;
      for(const q of har) off += q.a * Math.sin(q.k * th + q.ph + t * q.sp);
      d += (i ? 'L' : 'M') + (x + nx * off).toFixed(1) + ' ' + (y + ny * off).toFixed(1);
    }
    return d + 'Z';
  }

  function init(){
    if(document.querySelector('.fb-ov')) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    /* ---------- ссылка внизу страницы ---------- */
    const main = document.querySelector('main') || document.body;
    const foot = document.createElement('p');
    foot.className = 'fb-foot';
    foot.innerHTML = 'Нашли ошибку или есть идея? <button type="button" class="fb-link">Написать</button>';
    const note = main.querySelector('footer.note');
    if(note) main.insertBefore(foot, note); else main.appendChild(foot);

    /* ---------- окно ---------- */
    const ov = document.createElement('div');
    ov.className = 'fb-ov';
    ov.innerHTML = `
      <div class="fb-panel" role="dialog" aria-modal="true" aria-labelledby="fb-t">
        <svg class="fb-bg" aria-hidden="true"><path/></svg>
        <div class="fb-in">
          <div class="fb-form">
            <h2 id="fb-t">Обратная связь</h2>
            <p class="fb-sub">Опечатка в тексте, ошибка в шаге алгоритма или идея для сайта. Страница подставится сама.</p>
            <div class="fb-kinds" role="group" aria-label="Тип сообщения">
              ${TYPES.map((t, i) => `<button type="button" class="tab${i ? '' : ' on'}" data-k="${t[0]}">${t[1]}</button>`).join('')}
            </div>
            <label class="fb-l" for="fb-msg">Сообщение</label>
            <textarea id="fb-msg" maxlength="${MAXLEN}" placeholder="Что случилось или что стоит добавить?"></textarea>
            <div class="fb-cnt"><span id="fb-n">0</span> / ${MAXLEN}</div>
            <label class="fb-l" for="fb-ct">Как с вами связаться (необязательно)</label>
            <input id="fb-ct" maxlength="120" autocomplete="off" placeholder="Почта или Telegram, если нужен ответ">
            <input type="checkbox" class="fb-trap" id="fb-bot" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="fb-row">
              <span class="fb-st" id="fb-st" aria-live="polite"></span>
              <button type="button" id="fb-x">Закрыть</button>
              <button type="button" class="p" id="fb-send">Отправить</button>
            </div>
          </div>
          <div class="fb-done" hidden>
            <b>Сообщение отправлено</b>
            <p>Спасибо, что написали.</p>
            <button type="button" class="p" id="fb-ok">Закрыть</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const $ = s => ov.querySelector(s);
    const panel = $('.fb-panel'), path = $('.fb-bg path');
    const msg = $('#fb-msg'), ct = $('#fb-ct'), cnt = $('#fb-n'), status = $('#fb-st'), send = $('#fb-send');
    const form = $('.fb-form'), done = $('.fb-done');
    let kind = 'bug', lastFocus = null, raf = 0, closeT = 0, doneT = 0, t0 = 0;

    /* ---------- живая рамка ---------- */
    const har = [[2, 3.2, .5], [3, 2.6, .7], [5, 1.8, 1.0], [7, 1.2, 1.3]].map(([k, a, sp]) => ({
      k, a: a * rnd(.8, 1.15), sp: sp * rnd(.8, 1.2) * (Math.random() < .5 ? -1 : 1), ph: rnd(0, TAU)
    }));
    const INSET = 8;
    function draw(t){
      const w = panel.offsetWidth - INSET * 2, h = panel.offsetHeight - INSET * 2;
      if(w < 60 || h < 60) return;
      path.setAttribute('transform', `translate(${INSET} ${INSET})`);
      path.setAttribute('d', outline(w, h, 26, har, t));
    }
    function loop(now){
      raf = 0;
      if(!ov.classList.contains('on') || motionOff()) return;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function startLoop(){
      cancelAnimationFrame(raf); raf = 0;
      draw(0);
      if(!motionOff()){ t0 = performance.now(); raf = requestAnimationFrame(loop); }
    }
    try{ new ResizeObserver(() => draw(raf ? (performance.now() - t0) / 1000 : 0)).observe(panel); }catch(e){}
    new MutationObserver(() => { if(ov.classList.contains('on')) startLoop(); })
      .observe(document.documentElement, {attributes:true, attributeFilter:['data-motion']});

    /* ---------- открытие и закрытие ---------- */
    function open(){
      clearTimeout(closeT); clearTimeout(doneT);
      lastFocus = document.activeElement;
      status.textContent = ''; status.className = 'fb-st';
      form.hidden = false; done.hidden = true;
      ov.style.display = '';
      const root = document.documentElement;
      root.style.setProperty('--fb-sbw', (window.innerWidth - root.clientWidth) + 'px');
      root.classList.add('fb-lock');
      ov.classList.add('on');
      startLoop();
      setTimeout(() => msg.focus(), 30);
    }
    function close(){
      clearTimeout(doneT);
      ov.classList.remove('on');
      document.documentElement.classList.remove('fb-lock');
      cancelAnimationFrame(raf); raf = 0;
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    }
    foot.querySelector('.fb-link').onclick = open;
    $('#fb-x').onclick = close;
    $('#fb-ok').onclick = close;
    ov.addEventListener('mousedown', e => { if(e.target === ov) close(); });

    /* клавиши внутри окна не должны листать шаги плеера и закрывать «карман» с кодом */
    panel.addEventListener('keydown', e => {
      e.stopPropagation();
      if(e.key === 'Escape'){ e.preventDefault(); close(); return; }
      if(e.key !== 'Tab') return;
      const f = Array.from(panel.querySelectorAll('button,input,textarea')).filter(x => !x.disabled && x.tabIndex >= 0 && x.offsetParent !== null);
      if(!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });

    $('.fb-kinds').addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if(!b) return;
      kind = b.dataset.k;
      ov.querySelectorAll('.fb-kinds .tab').forEach(x => x.classList.toggle('on', x === b));
    });
    msg.addEventListener('input', () => {
      cnt.textContent = msg.value.length;
      cnt.parentNode.classList.toggle('bad', msg.value.length >= MAXLEN);
    });

    /* ---------- отправка ---------- */
    const fail = t => { status.textContent = t; status.className = 'fb-st bad'; };
    send.onclick = async () => {
      const text = msg.value.trim(), contact = ct.value.trim();
      if($('#fb-bot').checked) return;
      if(text.length < MINLEN){ fail('Напишите хотя бы пару слов.'); msg.focus(); return; }
      if(!ACCESS_KEY || ACCESS_KEY.indexOf('ВСТАВЬТЕ') === 0){ fail('Не задан ключ Web3Forms в feedback.js.'); return; }
      let last = 0;
      try{ last = +localStorage.getItem(LAST_KEY) || 0; }catch(e){}
      const wait = COOLDOWN - (Date.now() - last);
      if(wait > 0){ fail(`Подождите ${Math.ceil(wait / 1000)} с перед следующей отправкой.`); return; }

      const label = (TYPES.find(t => t[0] === kind) || TYPES[0])[1];
      const body = {
        access_key: ACCESS_KEY,
        subject: `[${label}] ${document.title}`,
        from_name: 'Обратная связь сайта',
        message: text,
        contact: contact || '—',
        page: document.title,
        url: location.href,
        screen: `${window.innerWidth}×${window.innerHeight}`,
        theme: document.documentElement.dataset.theme || 'auto',
        botcheck: ''
      };
      if(/^\S+@\S+\.\S+$/.test(contact)) body.email = contact;

      send.disabled = true;
      status.className = 'fb-st'; status.textContent = 'Отправляем…';
      try{
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if(!res.ok || !data.success) throw new Error(data.message || ('HTTP ' + res.status));
        try{ localStorage.setItem(LAST_KEY, String(Date.now())); }catch(e){}
        msg.value = ''; cnt.textContent = '0';
        form.hidden = true; done.hidden = false;
        $('#fb-ok').focus();
        doneT = setTimeout(close, 3500);
      }catch(err){
        fail('Не получилось отправить. Проверьте соединение и повторите.');
        console.warn('feedback:', err);
      }finally{
        send.disabled = false;
      }
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
