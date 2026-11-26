/* Общий движок: парсинг, раскладка и рисование деревьев, пошаговый плеер. */
(function(){
  'use strict';
  const TS = window.TreeSite = {};

  TS.$ = id => document.getElementById(id);
  TS.esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  TS.randLetters = function(n, o){
    o = o || {};
    if(Array.isArray(n)) n = n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1));
    const pool = String(o.pool || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('');
    for(let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n).join(o.sep || '');
  };
  TS.fmtBal = b => b > 0 ? '+' + b : b < 0 ? '−' + (-b) : '0';

  TS.height = function height(n){
    return n ? 1 + Math.max(height(n.l), height(n.r)) : 0;
  };
  TS.balance = function balance(n){
    return n ? TS.height(n.r) - TS.height(n.l) : 0;
  };
  TS.clone = function clone(n){
    if(!n) return null;
    const c = {id:n.id, d:n.d, l:TS.clone(n.l), r:TS.clone(n.r)};
    if(n.b !== undefined) c.b = n.b;
    return c;
  };
  TS.cloneB = function cloneB(n){
    if(!n) return null;
    return {id:n.id, keys:n.keys.slice(), ch:n.ch.map(TS.cloneB)};
  };
  TS.parseKeys = function(raw, max){
    max = max || 24;
    const chars = [...String(raw)].filter(c => !/[\s,;]/.test(c));
    const seen = new Set(), keys = [];
    let dups = 0;
    for(const c of chars){
      if(seen.has(c)){ dups++; continue; }
      seen.add(c);
      keys.push(c);
      if(keys.length >= max) break;
    }
    return {keys, dups, total:chars.length};
  };
  TS.mkGen = function(){
    let i = 0;
    return d => ({id:++i, d, l:null, r:null});
  };
  TS.weightedCost = function(root, weights){
    let cost = 0;
    (function walk(n, d){
      if(!n) return;
      cost += (weights[n.d] || 0) * (d + 1);
      walk(n.l, d + 1); walk(n.r, d + 1);
    })(root, 0);
    return cost;
  };
  TS.avgDepth = function(root){
    let sum = 0, count = 0;
    (function walk(n, d){
      if(!n) return;
      sum += d; count++;
      walk(n.l, d + 1); walk(n.r, d + 1);
    })(root, 0);
    return count ? sum / count : 0;
  };

  /* ---------- Раскладка двоичного дерева ---------- */
  TS.layoutBinary = function(root, gap, lvl){
    gap = gap || 52; lvl = lvl || 76;
    let x = 0, depth = 0;
    const pos = {};
    (function walk(n, d){
      if(!n) return;
      walk(n.l, d + 1);
      pos[n.id] = {x:x++, d};
      if(d > depth) depth = d;
      walk(n.r, d + 1);
    })(root, 0);
    return {pos, count:x, depth, gap, lvl};
  };

  /* ---------- Рисование двоичного дерева ---------- */
  TS.renderBinary = function(el, snap, opts){
    opts = opts || {};
    const t = snap.tree;
    if(!t){ el.innerHTML = '<div class="empty">Дерево пусто</div>'; return; }
    const gap = opts.gap || 52, lvl = opts.level || 76, R = 19;
    const L = TS.layoutBinary(t, gap, lvl);
    const innerW = (L.count - 1) * gap;
    /* подпись стоит над узлом по центру: у крайних узлов даём запас по бокам, чтобы длинные слова не обрезались */
    const tagLen = Math.max.apply(null, [0].concat(Object.values(snap.tags || {}).map(t => String(t).length)));
    const padX = Math.max(35, Math.ceil(8 + tagLen * 4.2));
    const W = Math.max(innerW + padX * 2, 300);
    const H = L.depth * lvl + 92;
    const ox = (W - innerW) / 2;
    const X = id => ox + L.pos[id].x * gap;
    const Y = id => 42 + L.pos[id].d * lvl;

    const bad = new Set(Array.isArray(snap.bad) ? snap.bad : (snap.bad !== undefined && snap.bad !== null ? [snap.bad] : []));
    const tags = snap.tags || {};
    const path = new Set(snap.path || []);
    const showBal = opts.showBal !== undefined ? opts.showBal : !!snap.showBal;
    const weightMap = opts.weightMap || null;
    let edges = '', nodes = '';

    (function walk(n){
      if(!n) return;
      [n.l, n.r].forEach(c => {
        if(c) edges += `<line x1="${X(n.id)}" y1="${Y(n.id)}" x2="${X(c.id)}" y2="${Y(c.id)}" stroke="var(--mut)" stroke-width="1.4" opacity=".75"/>`;
        walk(c);
      });
    })(t);

    (function walk(n){
      if(!n) return;
      walk(n.l); walk(n.r);
      const cx = X(n.id), cy = Y(n.id);
      let fill = 'var(--node)', stroke = 'var(--bd)', sw = 1.5, col = 'var(--tx)';
      if(bad.has(n.id)){ fill = 'var(--bad)'; stroke = 'var(--bad)'; col = '#fff'; }
      else if(n.id === snap.newId){ fill = 'var(--ok)'; stroke = 'var(--ok)'; col = '#fff'; }
      if(path.has(n.id)){ stroke = 'var(--ac)'; sw = 3; }
      if(tags[n.id]){ stroke = 'var(--ac)'; sw = 3.5; }
      nodes += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      nodes += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="16" font-weight="600" fill="${col}">${TS.esc(n.d)}</text>`;
      let sub = null, subCol = 'var(--mut)';
      if(weightMap && weightMap[n.d] !== undefined) sub = 'w=' + weightMap[n.d];
      else if(showBal){
        const b = TS.balance(n);
        sub = 'bal ' + TS.fmtBal(b);
        if(Math.abs(b) > 1) subCol = 'var(--bad)';
      }
      if(sub !== null) nodes += `<text x="${cx}" y="${cy + 35}" text-anchor="middle" font-size="12" fill="${subCol}">${TS.esc(sub)}</text>`;
      if(tags[n.id]) nodes += `<text x="${cx}" y="${cy - R - 7}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ac)" stroke="var(--card)" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${TS.esc(tags[n.id])}</text>`;
    })(t);

    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">${edges}${nodes}</svg>`;
  };

  /* ---------- Полоска ключей ---------- */
  TS.strip = function(items, o){
    o = o || {};
    const lo = o.lo === undefined ? -1 : o.lo;
    const hi = o.hi === undefined ? -1 : o.hi;
    const mid = o.mid === undefined ? -1 : o.mid;
    const done = o.done ? new Set(o.done) : null;
    let h = '<div class="strip' + (o.cls ? ' ' + o.cls : '') + '">';
    items.forEach((it, i) => {
      const key = (it && typeof it === 'object') ? it.k : it;
      const sub = (it && typeof it === 'object') ? it.w : (o.index ? i : null);
      let cls = 'chip';
      if(lo >= 0 && (i < lo || i > hi)) cls += ' off';
      if(i === mid) cls += ' mid';
      if(done && done.has(i)) cls += ' done';
      h += `<span class="${cls}"><b>${TS.esc(key)}</b>${sub !== null && sub !== undefined ? `<i>${TS.esc(sub)}</i>` : ''}</span>`;
    });
    return h + '</div>';
  };

  /* ---------- B-дерево ---------- */
  TS.layoutBTree = function(root, cellW, gap){
    cellW = cellW || 42;
    gap = gap === undefined ? 10 : gap;   /* минимальный зазор между соседними страницами, px */
    function measure(n){
      const w = Math.max(n.keys.length * cellW + 16, 54);
      let sum = 0;
      n.ch.forEach((c, i) => { measure(c); sum += c._sub + (i ? gap : 0); });
      n._w = w;
      n._sub = Math.max(w, sum);
      return n._sub;
    }
    measure(root);
    let maxDepth = 0;
    function place(n, left, depth){
      n._cx = left + n._sub / 2;
      n._d = depth;
      if(depth > maxDepth) maxDepth = depth;
      let sum = 0;
      n.ch.forEach((c, i) => { sum += c._sub + (i ? gap : 0); });
      let cx = left + (n._sub - sum) / 2;
      n.ch.forEach(c => { place(c, cx, depth + 1); cx += c._sub + gap; });
    }
    place(root, 0, 0);
    return {maxDepth, width:root._sub};
  };

  TS.renderBTree = function(el, snap, opts){
    opts = opts || {};
    const dots = !!opts.dots;   /* вместо перегородок — точки-указатели: • А • В • */
    const t = snap.tree;
    if(!t){ el.innerHTML = '<div class="empty">Дерево пусто</div>'; return; }
    const CELL = dots ? 44 : 42, PAD = 8, NH = 42, LEVEL = 86;
    const L = TS.layoutBTree(t, CELL);
    const W = Math.max(L.width + 44, 320);
    const H = L.maxDepth * LEVEL + 76;
    const ox = (W - L.width) / 2;
    const nodesHl = new Set(snap.nodes || []);
    const bad = new Set(snap.bad || []);
    let edges = '', nodes = '';

    (function walk(n){
      const w = n.keys.length * CELL + PAD * 2;
      const x = n._cx + ox, y = 22 + n._d * LEVEL;
      n.ch.forEach((c, i) => {
        const cw = c.keys.length * CELL + PAD * 2;
        const cx = c._cx + ox, cy = 22 + c._d * LEVEL;
        const x1 = x - w / 2 + PAD + i * CELL;
        if(dots){
          /* стрелка выходит из точки-указателя и приходит в середину верхней грани потомка */
          const y1 = y + NH / 2;
          const dx = cx - x1, dy = cy - y1, len = Math.hypot(dx, dy) || 1;
          edges += `<line x1="${x1}" y1="${y1}" x2="${cx - dx / len * 2}" y2="${cy - dy / len * 2}" stroke="var(--tx)" stroke-width="1.1" marker-end="url(#bah)"/>`;
        } else edges += `<line x1="${x1}" y1="${y + NH}" x2="${cx}" y2="${cy}" stroke="var(--mut)" stroke-width="1.4" opacity=".75"/>`;
        walk(c);
      });
    })(t);

    (function walk(n){
      const w = n.keys.length * CELL + PAD * 2;
      const x = n._cx + ox, y = 22 + n._d * LEVEL;
      const isBad = bad.has(n.id), isHl = nodesHl.has(n.id);
      nodes += `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${NH}" rx="8" fill="${isBad ? 'var(--bad)' : 'var(--node)'}" stroke="${isBad ? 'var(--bad)' : isHl ? 'var(--ac)' : 'var(--bd)'}" stroke-width="${isBad || isHl ? 3 : 1.3}"/>`;
      n.keys.forEach((k, j) => {
        const cellX = x - w / 2 + PAD + j * CELL;
        const keyHl = n.id === snap.hiNode && k === snap.hiKey;
        if(keyHl) nodes += dots
          ? `<rect x="${cellX + 9}" y="${y + 5}" width="${CELL - 18}" height="${NH - 10}" rx="6" fill="var(--ok)"/>`
          : `<rect x="${cellX}" y="${y + 3}" width="${CELL}" height="${NH - 6}" rx="6" fill="var(--ok)"/>`;
        nodes += `<text x="${cellX + CELL / 2}" y="${y + NH / 2 + 5}" text-anchor="middle" font-size="15" font-weight="600" fill="${keyHl || isBad ? '#fff' : 'var(--tx)'}">${TS.esc(k)}</text>`;
        if(dots){
          if(j === 0) nodes += `<circle cx="${cellX}" cy="${y + NH / 2}" r="2.6" fill="${isBad ? '#fff' : 'var(--tx)'}"/>`;
          nodes += `<circle cx="${cellX + CELL}" cy="${y + NH / 2}" r="2.6" fill="${isBad ? '#fff' : 'var(--tx)'}"/>`;
        } else if(j < n.keys.length - 1) nodes += `<line x1="${cellX + CELL}" y1="${y + 8}" x2="${cellX + CELL}" y2="${y + NH - 8}" stroke="var(--bd)" stroke-width="1"/>`;
      });
      n.ch.forEach(walk);
    })(t);

    const defs = dots ? '<defs><marker id="bah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="var(--tx)" stroke-width="1.3"/></marker></defs>' : '';
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">${defs}${dots ? nodes + edges : edges + nodes}</svg>`;
  };

  /* ---------- Таблица динамического программирования ---------- */
  TS.renderDPTable = function(el, o){
    const keys = o.keys, C = o.C, R = o.R, n = o.n;
    let h = '<div class="table-wrap"><table class="dp"><thead><tr><th>i\\j</th>';
    for(let j = 0; j < n; j++) h += `<th>${j}</th>`;
    h += '</tr></thead><tbody>';
    for(let i = 0; i < n; i++){
      h += `<tr><th>${i}</th>`;
      for(let j = 0; j < n; j++){
        if(i <= j){
          const v = C[i][j];
          const cur = o.cur && o.cur[0] === i && o.cur[1] === j;
          const cls = cur ? ' class="cur"' : (v !== null && v !== undefined ? ' class="done"' : '');
          h += `<td${cls}>${v !== null && v !== undefined ? `<b>${v}</b><i>${TS.esc(keys[R[i][j]])}</i>` : ''}</td>`;
        } else {
          h += '<td class="na">·</td>';
        }
      }
      h += '</tr>';
    }
    h += '</tbody></table></div>';
    el.innerHTML = h;
  };

  /* ---------- Пошаговый плеер ---------- */
  TS.mountPlayer = function(mount, opts){
    opts = opts || {};
    mount.innerHTML = `
      <div class="card stage">
        <div class="row controls">
          <button type="button" data-act="rs" title="В начало" aria-label="В начало">⏮</button>
          <button type="button" data-act="pv">← Назад</button>
          <button type="button" data-act="nx" class="p">Дальше →</button>
          <button type="button" data-act="pl">▶ Авто</button>
          <span class="counter meta"></span>
        </div>
        <input type="range" class="scrub" min="0" max="0" value="0" step="1" aria-label="Номер шага">
        <div class="canvas"></div>
        ${opts.legend ? `<div class="legend">${opts.legend}</div>` : ''}
      </div>
      <div class="card explain">
        <div class="step-title" aria-live="polite"></div>
        <div class="step-text"></div>
      </div>`;
    const q = sel => mount.querySelector(sel);
    const canvas = q('.canvas'), title = q('.step-title'), text = q('.step-text');
    const counter = q('.counter'), range = q('.scrub');
    const bRs = q('[data-act="rs"]'), bPv = q('[data-act="pv"]'), bNx = q('[data-act="nx"]'), bPl = q('[data-act="pl"]');
    let steps = [], cur = 0, timer = null;

    const api = {
      setSteps(s){ steps = s || []; cur = 0; stop(); draw(); },
      go, reset(){ go(0); },
      redraw: draw,
      stop,
      get index(){ return cur; },
      get total(){ return steps.length; },
      get step(){ return steps[cur]; }
    };

    function stop(){
      if(timer){ clearInterval(timer); timer = null; }
      bPl.textContent = '▶ Авто';
    }
    function go(n){
      cur = Math.max(0, Math.min(steps.length - 1, n));
      draw();
    }
    function draw(){
      if(!steps.length){ canvas.innerHTML = ''; title.textContent = ''; text.textContent = ''; counter.textContent = ''; return; }
      cur = Math.max(0, Math.min(cur, steps.length - 1));
      const s = steps[cur];
      title.innerHTML = s.title || '';
      text.innerHTML = s.text || '';
      counter.textContent = `Шаг ${cur + 1} / ${steps.length}`;
      range.max = String(Math.max(0, steps.length - 1));
      range.value = String(cur);
      bRs.disabled = bPv.disabled = cur === 0;
      bNx.disabled = cur === steps.length - 1;
      bRs.disabled = bPv.disabled = cur === 0;
      canvas.innerHTML = '';
      if(opts.render) opts.render(canvas, s, api);
      if(opts.onStep) opts.onStep(s, api);
      requestAnimationFrame(() => {
        const extra = canvas.scrollWidth - canvas.clientWidth;
        if(extra > 8) canvas.scrollLeft = extra / 2;
      });
    }

    bRs.onclick = () => { stop(); go(0); };
    bPv.onclick = () => { stop(); go(cur - 1); };
    bNx.onclick = () => { stop(); go(cur + 1); };
    range.oninput = () => { stop(); go(+range.value); };
    bPl.onclick = () => {
      if(timer){ stop(); return; }
      if(cur >= steps.length - 1) cur = 0;
      bPl.textContent = '⏸ Пауза';
      draw();
      timer = setInterval(() => {
        if(cur >= steps.length - 1){ stop(); return; }
        go(cur + 1);
      }, opts.autoplay || 1700);
    };
    /* стрелки ← и → листают шаги всегда, а не только при фокусе на ползунке */
    document.addEventListener('keydown', e => {
      if(e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const t = e.target || {}, tag = t.tagName || '';
      if(t.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if(tag === 'INPUT' && t.type !== 'checkbox') return;   /* в полях ввода и на самом ползунке стрелки работают сами */
      if(t.closest && t.closest('.dd')) return;
      e.preventDefault();
      stop();
      go(cur + (e.key === 'ArrowRight' ? 1 : -1));
    });
    return api;
  };

  /* ---------- Поля с числом: свои кнопки − и + вместо стрелок браузера ---------- */
  TS.enhanceNumbers = function(root){
    (root || document).querySelectorAll('input[type=number]').forEach(inp => {
      if(inp.parentNode.classList.contains('num')) return;
      const w = document.createElement('div');
      w.className = 'num';
      inp.parentNode.insertBefore(w, inp);
      const mk = (t, d, label) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = t; b.tabIndex = -1;
        b.setAttribute('aria-label', label);
        b.onclick = () => {
          try{ if(d > 0) inp.stepUp(); else inp.stepDown(); }catch(e){}
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          inp.dispatchEvent(new Event('change', {bubbles:true}));
        };
        return b;
      };
      w.appendChild(mk('−', -1, 'Меньше'));
      w.appendChild(inp);
      w.appendChild(mk('+', 1, 'Больше'));
    });
  };
  TS.enhanceNumbers();

  /* ---------- Выпадающие списки: свой вид вместо системного ---------- */
  TS.enhanceSelects = function(root){
    (root || document).querySelectorAll('select').forEach(sel => {
      if(sel.dataset.dd) return;
      sel.dataset.dd = '1';
      const wrap = document.createElement('div');
      wrap.className = 'dd';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('dd-native');
      sel.tabIndex = -1;
      sel.setAttribute('aria-hidden', 'true');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'dd-btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      const list = document.createElement('ul');
      list.className = 'dd-list';
      list.setAttribute('role', 'listbox');
      wrap.appendChild(btn); wrap.appendChild(list);
      const label = sel.id ? document.querySelector('label[for="' + sel.id + '"]') : null;
      if(label){
        if(!label.id) label.id = sel.id + '-lbl';
        btn.setAttribute('aria-labelledby', label.id);
        label.addEventListener('click', e => { e.preventDefault(); btn.focus(); });
      }
      let act = -1;
      const card = () => wrap.closest('.card');
      const isOpen = () => wrap.classList.contains('open');
      function sync(){
        const i = sel.selectedIndex, o = sel.options[i];
        btn.innerHTML = '<span></span><i class="dd-chev"></i>';
        btn.firstChild.textContent = o ? o.textContent : '';
        Array.from(list.children).forEach((li, k) => {
          li.classList.toggle('sel', k === i);
          li.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
      }
      function mark(i){
        act = Math.max(0, Math.min(list.children.length - 1, i));
        Array.from(list.children).forEach((li, k) => li.classList.toggle('act', k === act));
        const li = list.children[act];
        if(!li) return;
        if(li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 4;
        else if(li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 4;
      }
      function open(){
        if(isOpen()) return;
        wrap.classList.remove('up');
        wrap.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        const c = card(); if(c) c.classList.add('dd-up');
        const r = btn.getBoundingClientRect();
        if(r.bottom + list.offsetHeight + 12 > window.innerHeight && r.top > list.offsetHeight + 12) wrap.classList.add('up');
        mark(sel.selectedIndex);
      }
      function close(){
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        const c = card(); if(c) c.classList.remove('dd-up');
      }
      function pick(i){
        if(i < 0 || i >= sel.options.length) return;
        const changed = sel.selectedIndex !== i;
        sel.selectedIndex = i;
        sync(); close(); btn.focus();
        if(changed){
          sel.dispatchEvent(new Event('input', {bubbles:true}));
          sel.dispatchEvent(new Event('change', {bubbles:true}));
        }
      }
      Array.from(sel.options).forEach((o, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.textContent = o.textContent;
        li.dataset.i = i;
        list.appendChild(li);
      });
      sync();
      sel.addEventListener('change', sync);
      btn.addEventListener('click', () => { if(isOpen()) close(); else open(); });
      btn.addEventListener('keydown', e => {
        const k = e.key;
        if(k === 'ArrowDown' || k === 'ArrowUp'){
          e.preventDefault();
          if(!isOpen()) open(); else mark(act + (k === 'ArrowDown' ? 1 : -1));
        } else if(k === 'Home' && isOpen()){ e.preventDefault(); mark(0); }
        else if(k === 'End' && isOpen()){ e.preventDefault(); mark(list.children.length - 1); }
        else if((k === 'Enter' || k === ' ') && isOpen()){ e.preventDefault(); pick(act); }
        else if(k === 'Escape' && isOpen()){ e.preventDefault(); e.stopPropagation(); close(); }
        else if(k === 'Tab') close();
      });
      btn.addEventListener('keyup', e => { if(e.key === ' ') e.preventDefault(); });
      list.addEventListener('mousedown', e => e.preventDefault());
      list.addEventListener('mousemove', e => {
        const li = e.target.closest('li');
        if(li && +li.dataset.i !== act) mark(+li.dataset.i);
      });
      list.addEventListener('click', e => {
        const li = e.target.closest('li');
        if(li) pick(+li.dataset.i);
      });
      wrap.addEventListener('focusout', e => { if(!wrap.contains(e.relatedTarget)) close(); });
      document.addEventListener('mousedown', e => { if(!wrap.contains(e.target)) close(); });
    });
  };
  TS.enhanceSelects();

  /* ---------- Тема и режим анимаций: плавающий переключатель ---------- */
  TS.motionOff = () => document.documentElement.dataset.motion === 'off';
  TS.initTheme = (function(){
    const KEY = 'tree-theme', MKEY = 'tree-motion', NS = 'http://www.w3.org/2000/svg';
    const THEMES = [
      {id:'light',  name:'Светлая', fill:'#faf9f5', ring:'#8f8663', splash:['#3f5f7d', '#3f7a4e', '#7a5470', '#b98a2a']},
      {id:'dark',   name:'Тёмная',  fill:'#1e2125', ring:'#8fb0cc', splash:['#8fb0cc', '#4b8f5d', '#c093b3', '#d9b266']},
      {id:'amoled', name:'AMOLED',  fill:'#000000', ring:'#ffffff', splash:['#ffffff', '#7aa2ff', '#4cc27f', '#a98cff']}
    ];
    const INK = {light:'#2a2925', dark:'#e4e7eb', amoled:'#ffffff'};
    const ICON = {
      light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
      amoled:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>'
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const isOff = TS.motionOff;

    /* ---- клякса: радиальный контур с мягкими лепестками, обводка идёт по всей форме ---- */
    function Splat(svg, R, nSpike, aMin, aMax, wMin, wMax){
      const sp = Array.from({length:nSpike}, (_, k) => ({
        a:(k + rnd(-.35, .35)) / nSpike * 2 * Math.PI, amp:R * rnd(aMin, aMax), w:rnd(wMin || .09, wMax || .17),
        ph:rnd(0, 6.28), sp:rnd(.7, 1.5), dr:rnd(-.3, .3)
      }));
      const har = [2, 3, 5].map(n => ({n, a:R * rnd(.035, .07) * (n === 5 ? .7 : 1), sp:rnd(.7, 1.3) * (Math.random() < .5 ? -1 : 1), ph:rnd(0, 6.28)}));
      const path = svg.querySelector('path');
      const N = 112, TAU = Math.PI * 2;
      this.update = (t, boost) => {
        let d = '';
        for(let i = 0; i < N; i++){
          const th = i / N * TAU;
          let r = R;
          for(const h of har) r += h.a * Math.sin(h.n * th + h.ph + t * h.sp);
          for(const s of sp){
            let dd = th - (s.a + s.dr * Math.sin(t * .5 + s.ph));
            dd -= TAU * Math.round(dd / TAU);
            r += s.amp * boost * (.65 + .35 * Math.sin(t * s.sp + s.ph)) * Math.exp(-dd * dd / (2 * s.w * s.w));
          }
          d += (i ? 'L' : 'M') + (Math.cos(th) * r).toFixed(1) + ' ' + (Math.sin(th) * r).toFixed(1);
        }
        path.setAttribute('d', d + 'Z');
      };
      /* режим без анимаций: обычный статичный круг */
      this.circle = () => path.setAttribute('d', `M${R} 0A${R} ${R} 0 1 0 ${-R} 0A${R} ${R} 0 1 0 ${R} 0Z`);
    }

    /* ---- брызги ---- */
    const G = 1500;   /* «гравитация», px/с² */
    const blobRadius = () => {
      const r = () => Math.round(rnd(36, 64));
      return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
    };

    /* капля по баллистической траектории: вытягивается вдоль скорости, после приземления тает */
    function drop(layer, color, x0, y0, vx, vy, size, delay){
      const dy = rnd(40, 230);
      const T = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
      const el = document.createElement('i');
      el.style.cssText = `width:${size}px;height:${size}px;left:${-size / 2}px;top:${-size / 2}px;background:${color};border-radius:50% 50% 50% 50% / 34% 34% 66% 66%`;
      layer.appendChild(el);
      const N = 16, frames = [], tail = 500, total = T * 1000 + tail;
      let end = '';
      for(let k = 0; k <= N; k++){
        const f = k / N, t = f * T;
        const x = x0 + vx * t, y = y0 + vy * t + .5 * G * t * t;
        const vyc = vy + G * t, sp = Math.hypot(vx, vyc);
        const ang = Math.atan2(vyc, vx) * 180 / Math.PI - 90;
        const st = 1 + Math.min(.9, sp / 1100);
        const sc = (k === 0 ? .45 : 1) * (1 - .45 * Math.pow(f, 3));
        frames.push({
          transform:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scale(${(sc / Math.sqrt(st)).toFixed(3)},${(sc * st).toFixed(3)})`,
          opacity:1, offset:f * T * 1000 / total
        });
        if(k === N) end = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scale(${(sc * .5 / Math.sqrt(st)).toFixed(3)},${(sc * .5).toFixed(3)})`;
      }
      frames.push({transform:end, opacity:0, offset:1});
      el.animate(frames, {duration:total, delay, easing:'linear', fill:'both'});
      return {x:x0 + vx * T, y:y0 + vy * T + .5 * G * T * T, T};
    }

    /* пятно-клякса со щупальцами: шлёпается, растекается, стекает вниз и тает */
    function stain(plain, goo, color, x, y, delay){
      const size = rnd(70, 110);
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '-50 -50 100 100');
      svg.style.cssText = `width:${size}px;height:${size}px;left:${-size / 2}px;top:${-size / 2}px`;
      svg.innerHTML = `<path fill="${color}"/>`;
      new Splat(svg, 20, rnd(8, 11) | 0, .7, 1.25).update(rnd(0, 20), 1);
      plain.appendChild(svg);
      const rot = rnd(0, 360);
      const P = (dy, sx, sy) => `translate(${x}px,${y + dy}px) rotate(${rot}deg) scale(${sx},${sy})`;
      svg.animate([
        {transform:P(0, 0, 0), opacity:1},
        {transform:P(0, 1.3, .55), opacity:1, offset:.14},
        {transform:P(0, .95, 1.05), opacity:1, offset:.28},
        {transform:P(10, 1, 1), opacity:.9, offset:.55},
        {transform:P(34, .6, 1.5), opacity:0}
      ], {duration:1800, delay, easing:'cubic-bezier(.2,.8,.3,1)', fill:'both'});
      for(let k = 0; k < 3; k++){
        const a = rnd(-150, -30) * Math.PI / 180, s = rnd(260, 520);
        drop(goo, color, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(8, 11), delay);
      }
    }

    function splash(theme, x, y){
      if(isOff()) return;
      const layer = document.createElement('div');
      layer.className = 'tsw-fx';
      const plain = document.createElement('div');
      plain.className = 'tsw-fx2';
      document.body.appendChild(layer);
      document.body.appendChild(plain);
      const pal = theme.splash;
      const burst = document.createElement('i');
      burst.style.cssText = `width:36px;height:36px;left:-18px;top:-18px;background:${pal[0]};border-radius:${blobRadius()}`;
      layer.appendChild(burst);
      burst.animate([
        {transform:`translate(${x}px,${y}px) scale(.3) rotate(0deg)`, opacity:1},
        {transform:`translate(${x}px,${y}px) scale(1.9,1.5) rotate(40deg)`, opacity:1, offset:.35},
        {transform:`translate(${x}px,${y}px) scale(.2) rotate(90deg)`, opacity:0}
      ], {duration:650, easing:'cubic-bezier(.2,.8,.3,1)', fill:'both'});
      for(let k = 0; k < 22; k++){
        const a = rnd(-105, 12) * Math.PI / 180, s = rnd(520, 1150);
        drop(layer, pal[k % pal.length], x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(8, 15), rnd(0, 140));
      }
      for(let k = 0; k < 5; k++){
        const a = rnd(-100, 0) * Math.PI / 180, s = rnd(700, 1250);
        const d = rnd(0, 120), color = pal[(k + 1) % pal.length];
        const end = drop(layer, color, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(13, 18), d);
        stain(plain, layer, color, end.x, end.y, d + end.T * 1000);
      }
      [layer, plain].forEach(l => l.animate([{opacity:1}, {opacity:0}], {duration:700, delay:3100, easing:'ease-in', fill:'forwards'}));
      setTimeout(() => { layer.remove(); plain.remove(); }, 3850);
    }

    return function(){
      const root = document.documentElement;
      const get = id => THEMES.find(t => t.id === id) || THEMES[0];
      const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

      /* сохранённые настройки; без них режим «без анимаций» включается, если так просит система */
      try{ const saved = localStorage.getItem(KEY); if(THEMES.some(t => t.id === saved)) root.dataset.theme = saved; }catch(e){}
      let sm = null;
      try{ sm = localStorage.getItem(MKEY); }catch(e){}
      root.dataset.motion = (sm ? sm === 'off' : matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'off' : 'on';

      /* SVG-фильтр «gooey» для летящих капель */
      const defs = document.createElement('div');
      defs.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="tsw-goo2" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs></svg>';
      document.body.appendChild(defs.firstChild);

      const SVG = '<svg class="sp" viewBox="-36 -36 72 72" aria-hidden="true"><path/></svg>';
      const MOTION_SLOT = `<div class="tsw-slot" style="--up:244;--dl:165ms"><button type="button" class="tsw-m" aria-label="Режим без анимаций" aria-pressed="false"><svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="15"/><path class="st" d="M17 8c.8 5 3.2 7.4 8 9-4.8 1.6-7.2 4-8 9-.8-5-3.2-7.4-8-9 4.8-1.6 7.2-4 8-9z"/><path class="sl" d="M9 25L25 9"/></svg><span class="lbl"></span></button></div>`;
      const box = document.createElement('div');
      box.className = 'tsw';
      box.innerHTML = `<button type="button" class="tsw-main" aria-haspopup="true" aria-expanded="false" aria-label="Тема оформления">${SVG}<span class="ic"></span></button>`
        + THEMES.map((t, i) => `<div class="tsw-slot" style="--up:${64 + i * 56};--dl:${i * 55}ms"><button type="button" class="tsw-d" data-t="${t.id}" aria-label="${t.name}" style="--f:${t.fill};--r:${t.ring}">${SVG}<span class="lbl">${t.name}</span></button></div>`).join('')
        + MOTION_SLOT;
      document.body.appendChild(box);
      const main = box.querySelector('.tsw-main');
      const icon = main.querySelector('.ic');
      const drops = Array.from(box.querySelectorAll('.tsw-d'));
      const mbtn = box.querySelector('.tsw-m');

      function paint(){
        const th = current(), T = get(th);
        icon.innerHTML = ICON[th];
        box.style.setProperty('--mf', T.fill);
        box.style.setProperty('--mr', T.ring);
        box.style.setProperty('--mi', INK[th]);
        drops.forEach(d => d.setAttribute('aria-pressed', String(d.dataset.t === th)));
      }
      function paintMotion(){
        const off = isOff();
        mbtn.setAttribute('aria-pressed', String(off));
        mbtn.querySelector('.lbl').textContent = off ? 'У меня СДВГ' : 'У меня нет СДВГ';
      }

      /* ---- открытие/закрытие ---- */
      let closeT = 0, liveUntil = 0;
      const open = v => {
        clearTimeout(closeT);
        box.classList.toggle('open', v);
        main.setAttribute('aria-expanded', String(v));
        if(!v) liveUntil = performance.now() + 1500;
      };
      box.addEventListener('pointerenter', e => { if(e.pointerType === 'mouse') open(true); });
      box.addEventListener('pointerleave', e => { if(e.pointerType === 'mouse'){ clearTimeout(closeT); closeT = setTimeout(() => open(false), 220); } });
      main.addEventListener('click', () => open(!box.classList.contains('open')));
      box.addEventListener('focusin', () => open(true));
      box.addEventListener('focusout', e => { if(!box.contains(e.relatedTarget)) open(false); });
      document.addEventListener('pointerdown', e => { if(!box.contains(e.target)) open(false); });
      document.addEventListener('keydown', e => { if(e.key === 'Escape') open(false); });

      /* ---- желе: клякса остаётся на месте и мягко пульсирует по размеру ---- */
      const jel = [{trig:main, splat:new Splat(main.querySelector('svg'), 19, 10, .06, .12, .50, .85), S:1.05, mouseOnly:true}]
        .concat(drops.map(d => ({trig:d, splat:new Splat(d.querySelector('svg'), 15, 10, .13, .16, .62, .92), S:1.18})));
      jel.forEach(it => { Object.assign(it, {s:1, vs:0, hover:false}); it.trig.style.scale = '1'; });
      const near = (a, b, e) => Math.abs(a - b) < e;

      function hover(it, v){
        if(it.hover === v || isOff()) return;
        it.hover = v;
        it.vs += v ? 1.3 : -.9;
      }
      jel.forEach(it => {
        const own = e => !it.mouseOnly || e.pointerType === 'mouse';
        it.trig.addEventListener('pointerenter', e => { if(own(e)) hover(it, true); });
        it.trig.addEventListener('pointerleave', () => hover(it, false));
        it.trig.addEventListener('focus', () => hover(it, true));
        it.trig.addEventListener('blur', () => hover(it, false));
      });

      let raf = 0, last = 0;
      function loop(now){
        if(isOff()){ raf = 0; return; }
        const dt = Math.min(.033, (now - last) / 1000 || .016); last = now;
        const t = now / 1000;
        const live = box.classList.contains('open') || now < liveUntil;
        jel.forEach((it, i) => {
          const tg = it.hover ? it.S : 1;
          it.vs += (-200 * (it.s - tg) - 6 * it.vs) * dt;  it.s += it.vs * dt;
          if(!it.hover && near(it.s, 1, .002) && near(it.vs, 0, .01)){ it.s = 1; it.vs = 0; it.trig.style.scale = '1'; }
          else it.trig.style.scale = it.s.toFixed(4);
          if(i === 0 || live) it.splat.update(t, 1 + Math.max(0, it.s - 1) * .5);
        });
        raf = requestAnimationFrame(loop);
      }
      /* включает или выключает всё движение: живые кляксы или статичные круги */
      function applyMotion(){
        paintMotion();
        if(isOff()){
          cancelAnimationFrame(raf); raf = 0;
          jel.forEach(it => { Object.assign(it, {s:1, vs:0, hover:false}); it.trig.style.scale = '1'; it.splat.circle(); });
        } else if(!raf){ last = performance.now(); raf = requestAnimationFrame(loop); }
      }
      mbtn.addEventListener('click', () => {
        const off = !isOff();
        root.dataset.motion = off ? 'off' : 'on';
        try{ localStorage.setItem(MKEY, off ? 'off' : 'on'); }catch(e){}
        applyMotion();
      });

      /* ---- выбор темы ---- */
      drops.forEach(d => d.addEventListener('click', () => {
        const theme = get(d.dataset.t);
        const r = d.getBoundingClientRect();
        root.dataset.theme = theme.id;
        try{ localStorage.setItem(KEY, theme.id); }catch(e){}
        paint();
        splash(theme, r.left + r.width / 2, r.top + r.height / 2);
        open(false);
      }));

      paint();
      applyMotion();
      new MutationObserver(paint).observe(root, {attributes:true, attributeFilter:['data-theme']});
    };
  })();
  TS.initTheme();

  /* ---------- Позиция курсора для подсветки краёв стекла ---------- */
  TS.initGlassCursor = function(){
    if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const root = document.documentElement;
    const SEL = '.card,details,.meter-box,.hero,.tile,.topbar .back,button';
    const R = 300;
    let els = null, lit = new Set(), px = -1e4, py = -1e4, raf = 0;
    /* список элементов кэшируем: пересобираем только при изменении DOM */
    new MutationObserver(() => { els = null; }).observe(document.body, {childList:true, subtree:true});
    function clear(){
      lit.forEach(el => { el.style.removeProperty('--gx'); el.style.removeProperty('--gy'); });
      lit.clear();
    }
    function apply(){
      raf = 0;
      if(root.dataset.theme !== 'amoled' || root.dataset.motion === 'off'){ clear(); return; }
      if(!els) els = Array.from(document.querySelectorAll(SEL));
      const next = new Set();
      for(const el of els){
        const r = el.getBoundingClientRect();
        if(r.bottom < py - R || r.top > py + R || r.right < px - R || r.left > px + R) continue;
        el.style.setProperty('--gx', px + 'px');
        el.style.setProperty('--gy', py + 'px');
        next.add(el);
      }
      lit.forEach(el => { if(!next.has(el)){ el.style.removeProperty('--gx'); el.style.removeProperty('--gy'); } });
      lit = next;
    }
    window.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if(!raf) raf = requestAnimationFrame(apply);
    }, {passive:true});
    root.addEventListener('mouseleave', () => { px = py = -1e4; if(!raf) raf = requestAnimationFrame(apply); });
  };
  TS.initGlassCursor();

  /* ---------- Общая отрисовка шага с полоской ---------- */
  TS.drawBinaryStep = function(canvas, step, opts){
    canvas.classList.toggle('compact', !step.tree);
    canvas.innerHTML = (step.strip || '') + '<div class="tree-host"></div>';
    TS.renderBinary(canvas.querySelector('.tree-host'), step, opts);
  };

  /* ---------- Liquid glass: SVG-фильтр преломления под размер каждого hero ---------- */
  TS.initLiquidGlass = function(){
    function mapDataUrl(w, h){
      const RAD = Math.max(24, Math.round(Math.min(w, h) * .3));
      const RING = Math.max(26, Math.round(Math.min(w, h) * .22));
      const rr = (x, a, b, ww, hh, r) => {
        x.beginPath();
        if(x.roundRect){ x.roundRect(a, b, ww, hh, r); return; }
        x.rect(a, b, ww, hh);
      };
      /* карта смещения: центр нейтрален, у краёв градиенты (красный — X, зелёный — Y) */
      const grad = document.createElement('canvas');
      grad.width = w; grad.height = h;
      const g = grad.getContext('2d');
      const gx = g.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, '#000'); gx.addColorStop(1, '#f00');
      g.fillStyle = gx; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'screen';
      const gy = g.createLinearGradient(0, 0, 0, h);
      gy.addColorStop(0, '#000'); gy.addColorStop(1, '#0f0');
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
      const mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      const m = mask.getContext('2d');
      m.filter = 'blur(' + Math.round(RING * .6) + 'px)';
      m.fillStyle = '#fff';
      rr(m, 0, 0, w, h, RAD); m.fill();
      m.globalCompositeOperation = 'destination-out';
      m.filter = 'blur(' + Math.round(RING * .45) + 'px)';
      rr(m, RING, RING, w - 2 * RING, h - 2 * RING, Math.max(0, RAD - RING)); m.fill();
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, 0, 0);
      const base = document.createElement('canvas');
      base.width = w; base.height = h;
      const bx = base.getContext('2d');
      bx.fillStyle = 'rgb(128,128,128)';
      bx.fillRect(0, 0, w, h);
      bx.drawImage(grad, 0, 0);
      return base.toDataURL();
    }

    let host = null;
    function build(){
      try{
        if(host){ host.remove(); host = null; }
        document.querySelectorAll('.hero').forEach(el => { el.style.backdropFilter = ''; el.style.webkitBackdropFilter = ''; });
        /* фильтр преломления дорогой: нужен только в AMOLED и только с мышью */
        if(document.documentElement.dataset.theme !== 'amoled' || document.documentElement.dataset.motion === 'off' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const NS = 'http://www.w3.org/2000/svg';
        host = document.createElementNS(NS, 'svg');
        host.setAttribute('width', '0');
        host.setAttribute('height', '0');
        host.style.position = 'absolute';
        document.querySelectorAll('.hero').forEach((el, k) => {
          const w = Math.max(60, Math.round(el.offsetWidth));
          const h = Math.max(60, Math.round(el.offsetHeight));
          const filter = document.createElementNS(NS, 'filter');
          const id = 'lgFilter' + k;
          filter.setAttribute('id', id);
          filter.setAttribute('filterUnits', 'userSpaceOnUse');
          filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
          filter.setAttribute('x', '0');
          filter.setAttribute('y', '0');
          filter.setAttribute('width', w);
          filter.setAttribute('height', h);
          const url = mapDataUrl(w, h);
          const feImage = document.createElementNS(NS, 'feImage');
          feImage.setAttribute('href', url);
          feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
          feImage.setAttribute('x', '0');
          feImage.setAttribute('y', '0');
          feImage.setAttribute('width', w);
          feImage.setAttribute('height', h);
          feImage.setAttribute('preserveAspectRatio', 'none');
          feImage.setAttribute('result', 'map');
          const feDisp = document.createElementNS(NS, 'feDisplacementMap');
          feDisp.setAttribute('in', 'SourceGraphic');
          feDisp.setAttribute('in2', 'map');
          feDisp.setAttribute('scale', '48');
          feDisp.setAttribute('xChannelSelector', 'R');
          feDisp.setAttribute('yChannelSelector', 'G');
          filter.appendChild(feImage);
          filter.appendChild(feDisp);
          host.appendChild(filter);
          const bf = 'blur(3px) saturate(170%) url(#' + id + ')';
          el.style.backdropFilter = bf;
          el.style.webkitBackdropFilter = bf;
        });
        document.body.appendChild(host);
      }catch(e){}
    }
    build();
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(build, 250);
    });
    new MutationObserver(() => { clearTimeout(rt); rt = setTimeout(build, 50); })
      .observe(document.documentElement, {attributes:true, attributeFilter:['data-theme', 'data-motion']});
  };
  TS.initLiquidGlass();

  /* ---------- Динамический фон из частиц ---------- */
  TS.initParticles = function(){
    const canvas = document.createElement('canvas');
    canvas.id = 'particleBg';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    let W = 0, H = 0, palette = [], amoled = false, activeN = 0, MINFRAME = 0;
    function readPalette(){
      amoled = document.documentElement.dataset.theme === 'amoled';
      /* в AMOLED под стеклом пересчитывается размытие каждый кадр — облегчаем: 30 к/с и меньше частиц */
      MINFRAME = amoled ? 15 : 0;
      activeN = typeof parts !== 'undefined' ? (amoled ? Math.min(parts.length, 60) : parts.length) : 0;
      if(canvas.width) resize();
      if(amoled){
        palette = ['#ffffff', '#ffffff', '#ffffff', '#ffffff'];
        return;
      }
      const cs = getComputedStyle(document.documentElement);
      palette = ['--ac', '--ok', '--vio', '--warn'].map(v => cs.getPropertyValue(v).trim());
    }
    function resize(){
      const dpr = Math.min(amoled ? 1.5 : 2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const parts = [];
    readPalette();
    resize();
    window.addEventListener('resize', resize);
    new MutationObserver(readPalette).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readPalette); }catch(e){}

    const COUNT = Math.max(36, Math.min(110, Math.round(W * H / 16000)));
    for(let i = 0; i < COUNT; i++){
      parts.push({
        x:Math.random() * W, y:Math.random() * H,
        vx:(Math.random() - .5) * .4, vy:(Math.random() - .5) * .4,
        r:1.3 + Math.random() * 1.9,
        ci:(Math.random() * 4) | 0,
        a:.16 + Math.random() * .3,
        k:.8 + Math.random() * .5,
        in:false
      });
    }

    activeN = amoled ? Math.min(parts.length, 60) : parts.length;
    let mx = -1e4, my = -1e4;
    window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, {passive:true});
    /* на сенсорных экранах mouseleave не срабатывает: сбрасываем позицию, когда палец оторван */
    const release = e => { if(!e || e.pointerType !== 'mouse'){ mx = -1e4; my = -1e4; } };
    window.addEventListener('pointerup', release, {passive:true});
    window.addEventListener('pointercancel', release, {passive:true});
    window.addEventListener('touchend', () => { mx = -1e4; my = -1e4; }, {passive:true});
    window.addEventListener('touchcancel', () => { mx = -1e4; my = -1e4; }, {passive:true});
    document.documentElement.addEventListener('mouseleave', () => { mx = -1e4; my = -1e4; });

    /* Магнитное поле: внутри радиуса — пружина к центру курсора с демпфированием
       и лёгким броуновским дрожанием. При выходе из поля частица получает
       дополнительный случайный импульс, который затухает за 1–2 секунды. */
    const MAGNET = 80, K = .014, DAMP = .085, WANDER = .03, DRAG = .968, MAXV = 18, JITTER = .04, BOOST = 2.5;

    let last = performance.now();
    let running = false;
    function frame(t){
      if(document.documentElement.dataset.motion === 'off'){ ctx.clearRect(0, 0, W, H); running = false; return; }
      if(t - last < MINFRAME){ requestAnimationFrame(frame); return; }
      const dt = Math.min(2.5, Math.max(.2, (t - last) / 16.667));
      last = t;

      ctx.clearRect(0, 0, W, H);
      for(let pi = 0; pi < activeN; pi++){
        const p = parts[pi];
        const dx = mx - p.x, dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        const inField = d2 < MAGNET * MAGNET;
        let dmp;
        if(inField){
          p.vx += dx * K * p.k * dt + (Math.random() - .5) * JITTER * dt;
          p.vy += dy * K * p.k * dt + (Math.random() - .5) * JITTER * dt;
          dmp = Math.pow(1 - DAMP, dt);
        } else {
          if(p.in){
            /* отпускание: дополнительный рывок в случайную сторону —
               вперёд частицу несёт скорость, набранная при погоне за курсором */
            const ang = Math.random() * Math.PI * 2;
            const imp = BOOST + Math.random() * 3;
            p.vx += Math.cos(ang) * imp;
            p.vy += Math.sin(ang) * imp;
          }
          p.vx += (Math.random() - .5) * WANDER * dt;
          p.vy += (Math.random() - .5) * WANDER * dt;
          dmp = Math.pow(DRAG, dt);
        }
        p.in = inField;
        p.vx *= dmp; p.vy *= dmp;
        const sp = Math.hypot(p.vx, p.vy);
        if(sp > MAXV){ p.vx *= MAXV / sp; p.vy *= MAXV / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if(p.x < -12) p.x = W + 12; else if(p.x > W + 12) p.x = -12;
        if(p.y < -12) p.y = H + 12; else if(p.y > H + 12) p.y = -12;

        ctx.globalAlpha = Math.min(.9, p.a + Math.min(.3, sp * .02));
        ctx.fillStyle = palette[p.ci] || '#3b6fe0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    function startParticles(){
      if(running || document.documentElement.dataset.motion === 'off') return;
      running = true; last = performance.now();
      requestAnimationFrame(frame);
    }
    startParticles();
    new MutationObserver(startParticles).observe(document.documentElement, {attributes:true, attributeFilter:['data-motion']});
    TS._particles = parts;
  };
  TS.initParticles();
})();