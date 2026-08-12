/* Shared helpers + game registry. Loaded first. */
window.LG = { games: {}, order: ['queens', 'tango', 'zip', 'sudoku', 'pinpoint', 'crossclimb'] };

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) n.style.setProperty(sk, v[sk]); else n.style[sk] = v[sk]; } }
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const range = (n) => Array.from({ length: n }, (_, i) => i);
function fmtTime(ms) { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

class Timer {
  constructor(node) { this.node = node; this.ms = 0; this.t0 = 0; this.iv = null; }
  start() { this.stop(); this.t0 = performance.now() - this.ms; this.iv = setInterval(() => this.tick(), 250); this.tick(); }
  tick() { this.ms = performance.now() - this.t0; if (this.node) this.node.textContent = fmtTime(this.ms); }
  stop() { if (this.iv) { clearInterval(this.iv); this.iv = null; } }
  reset() { this.stop(); this.ms = 0; if (this.node) this.node.textContent = '0:00'; }
}

/* ---------- buttons / selects ---------- */
function btn(label, onClick, opts = {}) {
  const kids = [];
  if (opts.icon) kids.push(el('span', { class: 'bi' }, opts.icon));
  kids.push(label);
  return el('button', { class: 'btn ' + (opts.class || ''), onclick: onClick }, ...kids);
}
function select(options, onChange, current) {
  const s = el('select', { class: 'sel', onchange: (e) => onChange(e.target.value) });
  for (const o of options) { const opt = el('option', { value: o.value }, o.label); if (String(o.value) === String(current)) opt.selected = true; s.appendChild(opt); }
  return s;
}

/* ---------- game view scaffold ---------- */
/* opts: { key, title, emoji, subtitle, controls:[nodes], hint, chips:[{k,ico,node}] }
   returns { root, board, boardWrap, setStatus, timerEl, chip(name) } */
function buildGameView(opts) {
  document.documentElement.style.setProperty('--c', `var(--q-${opts.key})`);
  const timerEl = el('span', { text: '0:00' });
  const status = el('div', { class: 'status' });
  const board = el('div', { class: 'board ' + opts.key });
  const boardWrap = el('div', { class: 'board-wrap' }, board);

  const chipEls = {};
  const chips = (opts.chips || []).map(c => {
    const val = el('span', {}, c.value != null ? c.value : (c.name === 'time' ? timerEl : ''));
    if (c.name === 'time') val.appendChild(timerEl);
    chipEls[c.name] = val;
    return el('div', { class: 'chip' }, c.ico ? el('span', { class: 'ico' }, c.ico) : null, el('span', { class: 'k' }, c.k), val);
  });

  const root = el('div', { class: 'game' },
    el('div', { class: 'game-head' },
      el('div', { class: 'badge' }, el('span', { class: 'em' }, opts.emoji), opts.title),
      opts.subtitle ? el('p', {}, opts.subtitle) : null),
    chips.length ? el('div', { class: 'hud' }, ...chips) : null,
    el('div', { class: 'controls' }, ...opts.controls),
    status,
    boardWrap,
    opts.hint ? el('p', { class: 'hint' }, opts.hint) : null
  );

  return {
    root, board, boardWrap, timerEl,
    setStatus: (t, cls) => { status.textContent = t || ''; status.className = 'status ' + (cls || ''); },
    setChip: (name, v) => { if (chipEls[name]) chipEls[name].textContent = v; },
  };
}

/* ---------- stats (localStorage) ---------- */
const Stats = {
  _key: 'lgu-stats-v2',
  all() { try { return JSON.parse(localStorage.getItem(this._key)) || {}; } catch (e) { return {}; } },
  get(game) { return this.all()[game] || { played: 0, solved: 0, best: null, streak: 0 }; },
  record(game, timeMs) {
    const data = this.all(); const g = data[game] || { played: 0, solved: 0, best: null, streak: 0 };
    g.played++; g.solved++; g.streak++;
    if (timeMs != null && (g.best == null || timeMs < g.best)) { g.best = timeMs; g.newBest = true; } else g.newBest = false;
    data[game] = g; try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) {}
    return g;
  },
  skip(game) { const data = this.all(); const g = data[game] || { played: 0, solved: 0, best: null, streak: 0 }; g.streak = 0; data[game] = g; try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) {} },
};

/* ---------- confetti ---------- */
function confetti() {
  const colors = ['#7c4dff', '#f0932b', '#17b890', '#3b82f6', '#ef4d6b', '#6366f1'];
  const wrap = el('div', { class: 'confetti' });
  for (let i = 0; i < 120; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[rnd(colors.length)];
    p.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.width = (6 + rnd(6)) + 'px';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3600);
}

/* ---------- toast ---------- */
function toast(msg, ms = 1900) {
  let host = document.querySelector('.toast-host');
  if (!host) { host = el('div', { class: 'toast-host' }); document.body.appendChild(host); }
  const t = el('div', { class: 'toast' }, msg);
  host.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms);
}

/* ---------- win overlay ---------- */
/* opts: { key, emoji, title, sub, stats:[{v,l}], onAgain } */
function celebrate(opts) {
  confetti();
  document.documentElement.style.setProperty('--c', `var(--q-${opts.key})`);
  const back = el('div', { class: 'overlay' });
  const close = () => back.remove();
  const card = el('div', { class: 'win-card' },
    el('div', { class: 'medal' }, opts.emoji || '🏆'),
    el('h2', {}, opts.title || 'Solved!'),
    opts.sub ? el('p', { class: 'sub' }, opts.sub) : null,
    opts.stats && opts.stats.length ? el('div', { class: 'win-stats' },
      ...opts.stats.map(s => el('div', { class: 's' }, el('div', { class: 'v' }, s.v), el('div', { class: 'l' }, s.l)))) : null,
    el('div', { class: 'win-actions' },
      btn('Menu', () => { close(); window.LG.home(); }, { class: 'ghost', icon: '←' }),
      btn('Play again', () => { close(); opts.onAgain && opts.onAgain(); }, { class: 'primary', icon: '↻' }))
  );
  back.appendChild(card);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);
}

/* Standard win finisher: records stats, shows overlay. extraStats optional. */
function finishWin(view, game, timer, opts = {}) {
  timer.stop();
  const g = Stats.record(game.key, timer.ms);
  view.setStatus('Solved in ' + fmtTime(timer.ms) + ' 🎉', 'good');
  const stats = [{ v: fmtTime(timer.ms), l: 'Time' }];
  if (g.best != null) stats.push({ v: fmtTime(g.best), l: g.newBest ? 'New best!' : 'Best' });
  stats.push({ v: g.streak, l: 'Streak' });
  celebrate({ key: game.key, emoji: game.emoji, title: opts.title || 'Solved!', sub: opts.sub || (g.newBest ? 'A new personal best 🔥' : 'Nicely done.'), stats, onAgain: opts.onAgain });
}
