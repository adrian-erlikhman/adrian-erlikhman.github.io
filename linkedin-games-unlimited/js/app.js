/* Router: home hub + game views, theme, deep-link via #hash. */
(function () {
  const stage = document.getElementById('stage');
  const appbar = document.getElementById('appbar');
  const backBtn = document.getElementById('backBtn');
  const brand = document.getElementById('brand');

  function fmtBest(g) { return g.best != null ? fmtTime(g.best) : '—'; }

  function renderHome() {
    appbar.classList.remove('in-game');
    document.documentElement.style.removeProperty('--c');
    stage.innerHTML = '';
    const cards = LG.order.filter(k => LG.games[k]).map(key => {
      const g = LG.games[key]; const s = Stats.get(key);
      return el('button', { class: 'card', style: { '--c': `var(--q-${key})` }, onclick: () => open(key) },
        el('div', { class: 'top' },
          el('div', { class: 'tile' }, g.emoji),
          el('div', {},
            el('h3', {}, g.name),
            el('div', { class: 'tagline' }, g.tagline))),
        el('p', { class: 'blurb' }, g.blurb),
        el('div', { class: 'foot' },
          el('span', { class: 'stat' }, s.solved ? el('span', {}, el('b', {}, String(s.solved)), ' solved · best ', el('b', {}, fmtBest(s))) : 'Not played yet'),
          el('span', { class: 'play' }, 'Play', el('span', { class: 'arrow' }, '→'))));
    });
    stage.appendChild(el('div', { class: 'home' },
      el('div', { class: 'hero' },
        el('div', { class: 'eyebrow' }, el('span', { class: 'dot' }), 'Unlimited practice · always a fresh puzzle'),
        el('h1', {}, 'Master the ', el('span', { class: 'grad' }, 'LinkedIn games')),
        el('p', {}, 'Every one of the daily puzzles, regenerated on demand with a guaranteed solution. No waiting for tomorrow — practice until it clicks.')),
      el('div', { class: 'card-grid' }, ...cards)));
  }

  function open(key) {
    if (!LG.games[key]) return renderHome();
    appbar.classList.add('in-game');
    stage.innerHTML = '';
    try { history.replaceState(null, '', '#' + key); } catch (e) {}
    try { localStorage.setItem('lgu-last', key); } catch (e) {}
    LG.games[key].mount(stage);
  }

  LG.home = function () { try { history.replaceState(null, '', '#'); } catch (e) {} renderHome(); };
  backBtn.addEventListener('click', LG.home);
  brand.addEventListener('click', LG.home);

  // theme
  const root = document.documentElement;
  function applyTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('lgu-theme', t); } catch (e) {} }
  let theme = 'light';
  try { theme = localStorage.getItem('lgu-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
  applyTheme(theme);
  document.getElementById('themeToggle').addEventListener('click', () => applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  // initial route
  const hash = (location.hash || '').replace('#', '');
  if (LG.games[hash]) open(hash); else renderHome();
  window.addEventListener('hashchange', () => {
    const h = (location.hash || '').replace('#', '');
    if (LG.games[h]) { if (!appbar.classList.contains('in-game') || stage.querySelector('.game')?.dataset.key !== h) open(h); }
    else renderHome();
  });
})();
