/* Tango — 6x6 grid of Suns/Moons. Equal per row/col, never 3 in a row, obey = and × edge signs. */
(function () {
  const N = 6, HALF = 3;

  // Generate a full valid solution (0=sun, 1=moon).
  function genSolution() {
    const g = Array.from({ length: N }, () => new Array(N).fill(-1));
    const rowCnt = Array.from({ length: N }, () => [0, 0]);
    const colCnt = Array.from({ length: N }, () => [0, 0]);
    function ok(r, c, v) {
      if (rowCnt[r][v] + 1 > HALF) return false;
      if (colCnt[c][v] + 1 > HALF) return false;
      if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) return false;
      if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false;
      return true;
    }
    function fill(i) {
      if (i === N * N) return true;
      const r = (i / N) | 0, c = i % N;
      for (const v of shuffle([0, 1])) {
        if (!ok(r, c, v)) continue;
        g[r][c] = v; rowCnt[r][v]++; colCnt[c][v]++;
        if (fill(i + 1)) return true;
        g[r][c] = -1; rowCnt[r][v]--; colCnt[c][v]--;
      }
      return false;
    }
    return fill(0) ? g : null;
  }

  // Solver: count solutions (up to `limit`) given fixed cells + edge constraints.
  function countSolutions(fixed, cons, limit) {
    const g = fixed.map(r => r.slice());
    const rowCnt = Array.from({ length: N }, () => [0, 0]);
    const colCnt = Array.from({ length: N }, () => [0, 0]);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] >= 0) { rowCnt[r][g[r][c]]++; colCnt[c][g[r][c]]++; }
    let count = 0;
    function consOk(r, c, v) {
      for (const k of cons) {
        let a, b;
        if (k.r1 === r && k.c1 === c) { a = v; b = g[k.r2][k.c2]; }
        else if (k.r2 === r && k.c2 === c) { a = v; b = g[k.r1][k.c1]; }
        else continue;
        if (b < 0) continue;
        if (k.eq && a !== b) return false;
        if (!k.eq && a === b) return false;
      }
      return true;
    }
    function ok(r, c, v) {
      if (rowCnt[r][v] + 1 > HALF) return false;
      if (colCnt[c][v] + 1 > HALF) return false;
      if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) return false;
      if (c >= 1 && c < N - 1 && g[r][c - 1] === v && g[r][c + 1] === v) return false;
      if (c < N - 2 && g[r][c + 1] === v && g[r][c + 2] === v) return false;
      if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false;
      if (r >= 1 && r < N - 1 && g[r - 1][c] === v && g[r + 1][c] === v) return false;
      if (r < N - 2 && g[r + 1][c] === v && g[r + 2][c] === v) return false;
      return consOk(r, c, v);
    }
    function solve(i) {
      if (count >= limit) return;
      if (i === N * N) { count++; return; }
      const r = (i / N) | 0, c = i % N;
      if (g[r][c] >= 0) { solve(i + 1); return; }
      for (const v of [0, 1]) {
        if (!ok(r, c, v)) continue;
        g[r][c] = v; rowCnt[r][v]++; colCnt[c][v]++;
        solve(i + 1);
        g[r][c] = -1; rowCnt[r][v]--; colCnt[c][v]--;
      }
    }
    solve(0);
    return count;
  }

  function generate() {
    const sol = genSolution();
    // all candidate edges between orthogonal neighbors
    const edges = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (c < N - 1) edges.push({ r1: r, c1: c, r2: r, c2: c + 1 });
      if (r < N - 1) edges.push({ r1: r, c1: c, r2: r + 1, c2: c });
    }
    shuffle(edges);
    const cons = [];
    const fixed = Array.from({ length: N }, () => new Array(N).fill(-1));

    // Add edge signs until the puzzle has a unique solution.
    for (const e of edges) {
      if (countSolutions(fixed, cons, 2) === 1) break;
      e.eq = sol[e.r1][e.c1] === sol[e.r2][e.c2];
      cons.push(e);
    }
    // If edges alone weren't enough, reveal a few cells too.
    const cellOrder = shuffle(range(N * N));
    let ci = 0;
    while (countSolutions(fixed, cons, 2) !== 1 && ci < cellOrder.length) {
      const idx = cellOrder[ci++]; const r = (idx / N) | 0, c = idx % N;
      fixed[r][c] = sol[r][c];
    }
    // Greedy minimize edges (drop any not needed for uniqueness).
    for (let i = cons.length - 1; i >= 0; i--) {
      const kept = cons.slice(0, i).concat(cons.slice(i + 1));
      if (countSolutions(fixed, kept, 2) === 1) cons.splice(i, 1);
    }
    return { sol, fixed, cons };
  }

  LG.games.tango = {
    name: 'Tango', key: 'tango', emoji: '🌗',
    tagline: 'Logic · balance',
    blurb: 'Fill the grid with suns and moons so every line stays balanced and no three ever sit in a row.',
    mount(stage) {
      let puzzle, grid, history, view, timer, board;

      view = buildGameView({
        key: 'tango', emoji: '🌗', title: 'Tango',
        subtitle: 'Fill each cell with a sun or moon. Three of each per row and column, never three alike in a line.',
        chips: [{ name: 'time', k: 'Time', ico: '⏱' }],
        controls: [btn('New puzzle', () => newGame(), { class: 'primary', icon: '✦' }), btn('Undo', () => undo(), { icon: '↶' }), btn('Hint', () => hint(), { icon: '💡' }), btn('Clear', () => clearAll(), { icon: '⌫' })],
        hint: '☀ and ☾ toggle by clicking. “=” between cells means they match; “×” means they differ.',
      });
      view.root.dataset.key = 'tango';
      board = view.board; timer = new Timer(view.timerEl);
      stage.appendChild(view.root);

      newGame();

      function newGame() {
        puzzle = generate();
        grid = puzzle.fixed.map(r => r.slice());
        history = [];
        view.setStatus(''); timer.reset(); timer.start(); render();
      }
      function isFixed(r, c) { return puzzle.fixed[r][c] >= 0; }
      function pushHistory() { history.push(grid.map(r => r.slice())); if (history.length > 200) history.shift(); }
      function undo() { if (history.length) { grid = history.pop(); render(); } }
      function clearAll() { pushHistory(); grid = puzzle.fixed.map(r => r.slice()); view.setStatus(''); render(); }

      function hint() {
        const empties = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] !== puzzle.sol[r][c]) empties.push([r, c]);
        if (!empties.length) { toast('Everything’s already placed ✓'); return; }
        pushHistory();
        const [r, c] = empties[rnd(empties.length)];
        grid[r][c] = puzzle.sol[r][c];
        toast('Filled one cell'); render(); checkWin();
      }

      function cycle(r, c) {
        if (isFixed(r, c)) return;
        pushHistory();
        grid[r][c] = grid[r][c] === -1 ? 0 : grid[r][c] === 0 ? 1 : -1;
        render(); checkWin();
      }

      function badCells() {
        const bad = Array.from({ length: N }, () => new Array(N).fill(false));
        // three in a row
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = grid[r][c]; if (v < 0) continue;
          if (c < N - 2 && grid[r][c + 1] === v && grid[r][c + 2] === v) bad[r][c] = bad[r][c + 1] = bad[r][c + 2] = true;
          if (r < N - 2 && grid[r + 1][c] === v && grid[r + 2][c] === v) bad[r][c] = bad[r + 1][c] = bad[r + 2][c] = true;
        }
        // counts over half
        for (let r = 0; r < N; r++) { const cnt = [0, 0]; for (let c = 0; c < N; c++) if (grid[r][c] >= 0) cnt[grid[r][c]]++; if (cnt[0] > HALF || cnt[1] > HALF) for (let c = 0; c < N; c++) if (grid[r][c] === (cnt[0] > HALF ? 0 : 1)) bad[r][c] = true; }
        for (let c = 0; c < N; c++) { const cnt = [0, 0]; for (let r = 0; r < N; r++) if (grid[r][c] >= 0) cnt[grid[r][c]]++; if (cnt[0] > HALF || cnt[1] > HALF) for (let r = 0; r < N; r++) if (grid[r][c] === (cnt[0] > HALF ? 0 : 1)) bad[r][c] = true; }
        // constraint violations
        for (const k of puzzle.cons) {
          const a = grid[k.r1][k.c1], b = grid[k.r2][k.c2];
          if (a < 0 || b < 0) continue;
          if ((k.eq && a !== b) || (!k.eq && a === b)) { bad[k.r1][k.c1] = bad[k.r2][k.c2] = true; }
        }
        return bad;
      }

      function checkWin() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] < 0) return;
        const bad = badCells();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bad[r][c]) return;
        finishWin(view, LG.games.tango, timer, { onAgain: newGame });
      }

      function render() {
        const px = Math.min(62, Math.floor(Math.min(410, window.innerWidth - 60) / N));
        board.innerHTML = '';
        const bad = badCells();
        const grd = el('div', { class: 'grid', style: { gridTemplateColumns: `repeat(${N}, ${px}px)`, position: 'relative' } });
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cls = ['cell'];
          if (isFixed(r, c)) cls.push('fixed');
          if (bad[r][c]) cls.push('bad-cell');
          const v = grid[r][c];
          if (v === 0) cls.push('sym-sun'); else if (v === 1) cls.push('sym-moon');
          const cell = el('div', { class: cls.join(' '), style: { width: px + 'px', height: px + 'px' }, onclick: () => cycle(r, c) },
            v >= 0 ? el('span', { class: 'sym' }, v === 0 ? '☀' : '☾') : '');
          grd.appendChild(cell);
        }
        for (const k of puzzle.cons) {
          const midR = (k.r1 + k.r2) / 2, midC = (k.c1 + k.c2) / 2;
          const badge = el('div', { class: 'con', text: k.eq ? '=' : '×',
            style: { left: (midC * px + px / 2 - 10) + 'px', top: (midR * px + px / 2 - 10) + 'px' } });
          grd.appendChild(badge);
        }
        board.appendChild(grd);
      }
    },
  };
})();
