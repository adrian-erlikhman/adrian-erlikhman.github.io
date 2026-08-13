/* Zip — draw one path that fills every cell and passes through the numbers 1..k in order.
   Walls (barriers) between some cells keep puzzles sparse yet uniquely solvable. */
(function () {
  const edgeKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;

  // Build a Hamiltonian path on an R x C grid (Warnsdorff heuristic + backtracking).
  function hamiltonian(R, C) {
    const total = R * C;
    const nb = (i) => {
      const r = (i / C) | 0, c = i % C, out = [];
      if (r > 0) out.push(i - C); if (r < R - 1) out.push(i + C);
      if (c > 0) out.push(i - 1); if (c < C - 1) out.push(i + 1);
      return out;
    };
    for (let attempt = 0; attempt < 60; attempt++) {
      const start = rnd(total);
      const visited = new Array(total).fill(false);
      const path = [];
      visited[start] = true; path.push(start);
      let steps = 0; const cap = total * total * 8;
      const deg = (i) => { let d = 0; for (const n of nb(i)) if (!visited[n]) d++; return d; };
      function go(cur) {
        if (steps++ > cap) return false;
        if (path.length === total) return true;
        const cands = nb(cur).filter(n => !visited[n]);
        cands.sort((a, b) => deg(a) - deg(b) || (Math.random() < 0.5 ? -1 : 1));
        for (const n of cands) {
          visited[n] = true; path.push(n);
          if (go(n)) return true;
          visited[n] = false; path.pop();
        }
        return false;
      }
      if (go(start)) return path;
    }
    return null;
  }

  // Count solutions (up to limit) given numbers + walls, with a node cap.
  function countSolutions(R, C, checkAt, walls, limit) {
    const total = R * C;
    const numAt = new Array(total).fill(0);
    let k = 0, start = -1;
    for (const cell in checkAt) { const v = checkAt[cell]; numAt[cell] = v; if (v > k) k = v; if (v === 1) start = +cell; }
    const nb = (i) => {
      const r = (i / C) | 0, c = i % C, o = [];
      if (r > 0) o.push(i - C); if (r < R - 1) o.push(i + C);
      if (c > 0) o.push(i - 1); if (c < C - 1) o.push(i + 1);
      return o.filter(n => !walls.has(edgeKey(i, n)));
    };
    const visited = new Array(total).fill(false);
    const seen = new Uint8Array(total);
    let count = 0, nodes = 0; const CAP = 300000; let capped = false;
    // All unvisited cells must stay reachable from the current cell (dead-end prune).
    function connected(cur, unvisitedCount) {
      seen.fill(0); seen[cur] = 1; let reach = 0; const stack = [cur];
      while (stack.length) { const x = stack.pop(); for (const n of nb(x)) { if (!visited[n] && !seen[n]) { seen[n] = 1; reach++; stack.push(n); } } }
      return reach === unvisitedCount;
    }
    visited[start] = true;
    (function dfs(cur, len, nextNum) {
      if (count >= limit || capped) return;
      if (nodes++ > CAP) { capped = true; return; }
      if (len === total) { if (nextNum > k) count++; return; }
      if (!connected(cur, total - len)) return;
      for (const n of nb(cur)) {
        if (visited[n]) continue;
        const num = numAt[n];
        if (num && num !== nextNum) continue;
        visited[n] = true;
        dfs(n, len + 1, num ? nextNum + 1 : nextNum);
        visited[n] = false;
      }
    })(start, 1, 2);
    return capped ? 99 : count;
  }

  function generate(R, C) {
    let path = null;
    for (let i = 0; i < 8 && !path; i++) path = hamiltonian(R, C);
    if (!path) { R = C = 6; path = hamiltonian(R, C); }
    const total = R * C;

    // Sparse numbers spread evenly along the path (endpoints always numbered).
    // Larger boards get a few extra to keep the solver — and the solve — tractable.
    const K = Math.max(4, Math.min(12, Math.round(total / 5.5) + (R >= 7 ? 3 : 0)));
    const checkAt = {};
    for (let i = 0; i < K; i++) {
      const pos = Math.round(i * (total - 1) / (K - 1));
      checkAt[path[pos]] = i + 1;
    }

    // Edges used by the solution path — never wall these.
    const pathEdges = new Set();
    for (let i = 0; i < path.length - 1; i++) pathEdges.add(edgeKey(path[i], path[i + 1]));

    // All non-path adjacent edges are candidate walls (walling them can't block the solution).
    const candidates = [];
    for (let i = 0; i < total; i++) {
      const r = (i / C) | 0, c = i % C;
      if (c < C - 1 && !pathEdges.has(edgeKey(i, i + 1))) candidates.push([i, i + 1]);
      if (r < R - 1 && !pathEdges.has(edgeKey(i, i + C))) candidates.push([i, i + C]);
    }
    shuffle(candidates);

    // Add walls until the puzzle is uniquely solvable.
    const walls = new Set();
    for (const [a, b] of candidates) {
      if (countSolutions(R, C, checkAt, walls, 2) === 1) break;
      walls.add(edgeKey(a, b));
    }
    return { R, C, path, checkAt, k: K, walls };
  }

  LG.games.zip = {
    name: 'Zip', key: 'zip', emoji: '➰',
    tagline: 'Path · one line',
    blurb: 'Trace a single unbroken line that visits every cell and hits the numbers in order — mind the walls.',
    mount(stage) {
      let puzzle, R = 6, C = 6, path, drawing = false, view, timer, board;

      const sizeSel = select([5, 6, 7].map(n => ({ value: n, label: n + '×' + n })), (v) => { R = C = +v; newGame(); }, 6);
      view = buildGameView({
        key: 'zip', emoji: '➰', title: 'Zip',
        subtitle: 'Draw one line that fills every cell and connects the numbers in order. Bars are walls you can’t cross.',
        chips: [{ name: 'progress', k: 'Filled', ico: '▦', value: '0' }, { name: 'time', k: 'Time', ico: '⏱' }],
        controls: [btn('New puzzle', () => newGame(), { class: 'primary', icon: '✦' }), sizeSel, btn('Undo', () => back(), { icon: '↶' }), btn('Clear', () => clearPath(), { icon: '⌫' })],
        hint: 'Start on 1 and drag through neighbors; drag back to erase. On desktop you can also click cell-by-cell.',
      });
      view.root.dataset.key = 'zip';
      board = view.board; timer = new Timer(view.timerEl);
      stage.appendChild(view.root);

      newGame();

      function progress() { view.setChip('progress', path.length + '/' + (R * C)); }
      function newGame() { puzzle = generate(R, C); R = puzzle.R; C = puzzle.C; path = []; view.setStatus(''); timer.reset(); timer.start(); render(); }
      function startCell() { for (const cell in puzzle.checkAt) if (puzzle.checkAt[cell] === 1) return +cell; return 0; }
      function clearPath() { path = []; view.setStatus(''); render(); }
      function back() { if (path.length) { path.pop(); render(); } }

      function adj(a, b) { const ar = (a / C) | 0, ac = a % C, br = (b / C) | 0, bc = b % C; return Math.abs(ar - br) + Math.abs(ac - bc) === 1; }
      function walled(a, b) { return puzzle.walls.has(edgeKey(a, b)); }

      function tryAdd(cell) {
        if (path.length === 0) { if (cell === startCell()) { path.push(cell); render(); } return; }
        const last = path[path.length - 1];
        if (path.length >= 2 && cell === path[path.length - 2]) { path.pop(); render(); return; }
        if (path.includes(cell)) return;
        if (adj(cell, last) && !walled(cell, last)) { path.push(cell); render(); check(); }
      }

      function cellFromEvent(e) {
        const t = (e.target && e.target.closest) ? e.target.closest('.cell') : null;
        if (!t || t.dataset.i == null) return -1;
        return +t.dataset.i;
      }

      function check() {
        if (path.length !== R * C) return;
        let expect = 1;
        for (const cell of path) { const num = puzzle.checkAt[cell]; if (num) { if (num !== expect) return; expect++; } }
        if (expect !== puzzle.k + 1) return;
        finishWin(view, LG.games.zip, timer, { onAgain: newGame });
      }

      function render() {
        const px = Math.min(66, Math.floor(Math.min(430, window.innerWidth - 60) / C));
        board.innerHTML = '';
        const grd = el('div', { class: 'grid', style: { gridTemplateColumns: `repeat(${C}, ${px}px)`, position: 'relative' } });
        const inPath = new Set(path);
        const activeEnd = path[path.length - 1];
        for (let i = 0; i < R * C; i++) {
          const num = puzzle.checkAt[i];
          const cls = 'cell' + (inPath.has(i) && !num ? ' on' : '');
          const cell = el('div', { class: cls, 'data-i': i, style: { width: px + 'px', height: px + 'px' } });
          if (num) cell.appendChild(el('div', { class: 'num' + (i === activeEnd ? ' active' : ''), text: String(num) }));
          grd.appendChild(cell);
        }
        // path overlay
        if (path.length > 1) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'path-layer');
          svg.setAttribute('width', C * px); svg.setAttribute('height', R * px);
          svg.style.inset = '0';
          const pts = path.map(i => { const r = (i / C) | 0, c = i % C; return (c * px + px / 2) + ',' + (r * px + px / 2); }).join(' ');
          const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          pl.setAttribute('points', pts);
          pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', 'var(--accent)');
          pl.setAttribute('stroke-width', Math.max(8, px * 0.34));
          pl.setAttribute('stroke-linejoin', 'round'); pl.setAttribute('stroke-linecap', 'round');
          pl.setAttribute('opacity', '0.85');
          svg.appendChild(pl); grd.appendChild(svg);
        }
        // walls
        const t = Math.max(4, Math.round(px * 0.09));
        for (const key of puzzle.walls) {
          const [a, b] = key.split('-').map(Number);
          const ar = (a / C) | 0, ac = a % C;
          const w = el('div', { class: 'wall' });
          if (b === a + 1) { // vertical bar between columns ac and ac+1
            Object.assign(w.style, { left: ((ac + 1) * px - t / 2) + 'px', top: (ar * px) + 'px', width: t + 'px', height: px + 'px' });
          } else { // horizontal bar between rows ar and ar+1
            Object.assign(w.style, { left: (ac * px) + 'px', top: ((ar + 1) * px - t / 2) + 'px', width: px + 'px', height: t + 'px' });
          }
          grd.appendChild(w);
        }
        board.appendChild(grd);

        grd.addEventListener('pointerdown', (e) => {
          const cell = cellFromEvent(e); if (cell < 0) return;
          e.preventDefault();
          if (path.includes(cell)) { path = path.slice(0, path.indexOf(cell) + 1); render(); }
          else tryAdd(cell);
          drawing = true;
        });
        grd.addEventListener('pointermove', (e) => {
          if (!drawing) return;
          const cell = cellFromEvent(e); if (cell < 0) return;
          tryAdd(cell);
        });
        progress();
      }
      window.addEventListener('pointerup', () => { drawing = false; });
    },
  };
})();
