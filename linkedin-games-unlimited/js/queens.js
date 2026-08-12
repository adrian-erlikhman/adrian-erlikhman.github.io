/* Queens — place N queens: one per row, column and color region, none touching (incl. diagonally). */
(function () {
  const PALETTE = [
    '#f7a1a1', '#f7d488', '#a8e6a1', '#a1d2f7', '#c9a1f7', '#f7b0d8',
    '#f0c39b', '#9be7d8', '#c7d98f', '#e5a8c0', '#a8b6f0', '#e0cf8f'
  ];

  // 1. Random valid queen placement: permutation with |col[r+1]-col[r]| >= 2.
  function genPlacement(N) {
    for (let attempt = 0; attempt < 4000; attempt++) {
      const col = new Array(N).fill(-1);
      const used = new Array(N).fill(false);
      if (place(0)) return col;
      function place(r) {
        if (r === N) return true;
        const cols = shuffle(range(N));
        for (const c of cols) {
          if (used[c]) continue;
          if (r > 0 && Math.abs(c - col[r - 1]) < 2) continue;
          col[r] = c; used[c] = true;
          if (place(r + 1)) return true;
          used[c] = false; col[r] = -1;
        }
        return false;
      }
    }
    return null;
  }

  // 2. Grow contiguous color regions, one seeded at each queen cell, until board is covered.
  function growRegions(N, col) {
    const region = Array.from({ length: N }, () => new Array(N).fill(-1));
    const frontier = []; // {r,c,id}
    for (let r = 0; r < N; r++) {
      region[r][col[r]] = r;
      frontier.push({ r, c: col[r], id: r });
    }
    let remaining = N * N - N;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (remaining > 0 && frontier.length) {
      const i = rnd(frontier.length);
      const { r, c, id } = frontier[i];
      const opts = shuffle(dirs.slice()).map(([dr, dc]) => [r + dr, c + dc])
        .filter(([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && region[nr][nc] === -1);
      if (!opts.length) { frontier.splice(i, 1); continue; }
      const [nr, nc] = opts[0];
      region[nr][nc] = id;
      frontier.push({ r: nr, c: nc, id });
      remaining--;
    }
    return region;
  }

  // Count solutions (up to 2) for uniqueness. one queen/row, unique col, unique region, no diagonal-adjacent.
  function countSolutions(N, region, limit) {
    let count = 0;
    const usedCol = new Array(N).fill(false);
    const usedReg = new Array(N).fill(false);
    let prevCol = -99;
    (function solve(r, prev) {
      if (count >= limit) return;
      if (r === N) { count++; return; }
      for (let c = 0; c < N; c++) {
        if (usedCol[c]) continue;
        if (r > 0 && Math.abs(c - prev) < 2) continue;
        const id = region[r][c];
        if (usedReg[id]) continue;
        usedCol[c] = true; usedReg[id] = true;
        solve(r + 1, c);
        usedCol[c] = false; usedReg[id] = false;
      }
    })(0, -99);
    return count;
  }

  // Enumerate up to `limit` full solutions (as column vectors).
  function solutions(N, region, limit) {
    const sols = [];
    const usedCol = new Array(N).fill(false);
    const usedReg = new Array(N).fill(false);
    const cur = new Array(N);
    (function solve(r, prev) {
      if (sols.length >= limit) return;
      if (r === N) { sols.push(cur.slice()); return; }
      for (let c = 0; c < N; c++) {
        if (usedCol[c]) continue;
        if (r > 0 && Math.abs(c - prev) < 2) continue;
        const id = region[r][c];
        if (usedReg[id]) continue;
        usedCol[c] = true; usedReg[id] = true; cur[r] = c;
        solve(r + 1, c);
        usedCol[c] = false; usedReg[id] = false;
      }
    })(0, -99);
    return sols;
  }

  function regionConnected(N, region, id) {
    let s = -1;
    for (let r = 0; r < N && s < 0; r++) for (let c = 0; c < N; c++) if (region[r][c] === id) { s = r * N + c; break; }
    if (s < 0) return false;
    const seen = new Set([s]); const st = [s];
    let total = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (region[r][c] === id) total++;
    while (st.length) {
      const x = st.pop(); const r = (x / N) | 0, c = x % N;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || region[nr][nc] !== id) continue;
        const k = nr * N + nc;
        if (!seen.has(k)) { seen.add(k); st.push(k); }
      }
    }
    return seen.size === total;
  }

  // Break alternate solutions: move a boundary cell that is a queen in the alternate
  // (but not the intended) solution into a neighbouring region. That leaves the intended
  // solution valid while making the alternate put two queens in one region.
  function refine(N, col, region) {
    const target = col.join(',');
    for (let iter = 0; iter < 1500; iter++) {
      const sols = solutions(N, region, 2);
      if (sols.length < 2) return true;
      const alt = sols[0].join(',') === target ? sols[1] : sols[0];
      const cands = [];
      for (let r = 0; r < N; r++) if (alt[r] !== col[r]) cands.push([r, alt[r]]);
      shuffle(cands);
      let moved = false;
      for (const [r, cc] of cands) {
        const A = region[r][cc];
        const neigh = [[-1, 0], [1, 0], [0, -1], [0, 1]]
          .map(([dr, dc]) => [r + dr, cc + dc])
          .filter(([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && region[nr][nc] !== A);
        shuffle(neigh);
        for (const [nr, nc] of neigh) {
          const B = region[nr][nc];
          region[r][cc] = B;
          if (regionConnected(N, region, A)) { moved = true; break; }
          region[r][cc] = A; // revert
        }
        if (moved) break;
      }
      if (!moved) return false;
    }
    return solutions(N, region, 2).length < 2;
  }

  function generate(N) {
    for (let attempt = 0; attempt < 250; attempt++) {
      const col = genPlacement(N);
      if (!col) continue;
      const region = growRegions(N, col);
      if (refine(N, col, region) && countSolutions(N, region, 2) === 1) return { N, col, region };
    }
    // fallback: accept a possibly non-unique board rather than fail
    const col = genPlacement(N);
    return { N, col, region: growRegions(N, col) };
  }

  LG.games.queens = {
    name: 'Queens', key: 'queens', emoji: '♛',
    tagline: 'Logic · placement',
    blurb: 'Place one crown per row, column and color region — with none of them touching, not even at a corner.',
    mount(stage) {
      let puzzle, N = 8, marks, history, view, timer, board;

      function build() {
        const sizeSel = select([7, 8, 9, 10].map(n => ({ value: n, label: n + '×' + n })), (v) => { N = +v; newGame(); }, N);
        view = buildGameView({
          key: 'queens', emoji: '♛', title: 'Queens',
          subtitle: 'One queen per row, per column, and per color region. No two may touch — not even diagonally.',
          chips: [{ name: 'time', k: 'Time', ico: '⏱' }],
          controls: [btn('New', () => newGame(), { class: 'primary', icon: '✦' }), sizeSel, btn('Undo', () => undo(), { icon: '↶' }), btn('Hint', () => hint(), { icon: '💡' }), btn('Clear', () => clearMarks(), { icon: '⌫' })],
          hint: 'Tap a cell once to mark ✕ (where a queen can’t go), twice to place a queen. Thick borders separate color regions.',
        });
        view.root.dataset.key = 'queens';
        board = view.board; timer = new Timer(view.timerEl);
        stage.appendChild(view.root);
      }
      build();
      newGame();

      function newGame() {
        puzzle = generate(N);
        marks = Array.from({ length: N }, () => new Array(N).fill(0)); // 0 empty, 1 x, 2 queen
        history = [];
        view.setStatus('');
        timer.reset(); timer.start();
        render();
      }

      function pushHistory() { history.push(marks.map(r => r.slice())); if (history.length > 200) history.shift(); }
      function undo() { if (!history.length) return; marks = history.pop(); render(); }
      function clearMarks() { pushHistory(); marks = Array.from({ length: N }, () => new Array(N).fill(0)); view.setStatus(''); render(); }

      function hint() {
        const missing = [];
        for (let r = 0; r < N; r++) if (marks[r][puzzle.col[r]] !== 2) missing.push(r);
        if (!missing.length) { toast('Every queen is already placed 👑'); return; }
        pushHistory();
        const r = missing[rnd(missing.length)];
        for (let c = 0; c < N; c++) if (marks[r][c] === 2) marks[r][c] = 0;
        marks[r][puzzle.col[r]] = 2;
        toast('Revealed a queen');
        render(); checkWin();
      }

      function cycle(r, c) {
        pushHistory();
        marks[r][c] = (marks[r][c] + 1) % 3;
        render();
        checkWin();
      }

      function conflicts() {
        const bad = Array.from({ length: N }, () => new Array(N).fill(false));
        const qs = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (marks[r][c] === 2) qs.push([r, c]);
        const rowCount = {}, colCount = {}, regCount = {};
        for (const [r, c] of qs) {
          rowCount[r] = (rowCount[r] || 0) + 1;
          colCount[c] = (colCount[c] || 0) + 1;
          const id = puzzle.region[r][c];
          regCount[id] = (regCount[id] || 0) + 1;
        }
        for (const [r, c] of qs) {
          if (rowCount[r] > 1 || colCount[c] > 1 || regCount[puzzle.region[r][c]] > 1) bad[r][c] = true;
          for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && marks[nr][nc] === 2) bad[r][c] = true;
          }
        }
        return { bad, count: qs.length };
      }

      function checkWin() {
        const { bad, count } = conflicts();
        if (count !== N) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bad[r][c]) return;
        finishWin(view, LG.games.queens, timer, { onAgain: newGame });
      }

      function render() {
        const px = Math.min(64, Math.floor(Math.min(460, window.innerWidth - 60) / N));
        board.style.setProperty('--n', N);
        board.innerHTML = '';
        const grid = el('div', { class: 'grid', style: { gridTemplateColumns: `repeat(${N}, ${px}px)` } });
        const { bad } = conflicts();
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const id = puzzle.region[r][c];
            const cls = ['cell'];
            if (bad[r][c]) cls.push('bad-cell');
            if (r === 0 || puzzle.region[r - 1][c] !== id) cls.push('rb-top');
            if (r === N - 1 || puzzle.region[r + 1][c] !== id) cls.push('rb-bottom');
            if (c === 0 || puzzle.region[r][c - 1] !== id) cls.push('rb-left');
            if (c === N - 1 || puzzle.region[r][c + 1] !== id) cls.push('rb-right');
            const cell = el('div', {
              class: cls.join(' '),
              style: { width: px + 'px', height: px + 'px', background: PALETTE[id % PALETTE.length] },
              onclick: () => cycle(r, c),
            });
            if (marks[r][c] === 1) cell.appendChild(el('span', { class: 'mark', text: '✕' }));
            else if (marks[r][c] === 2) cell.appendChild(el('span', { class: 'q', text: '♛' }));
            grid.appendChild(cell);
          }
        }
        board.appendChild(grid);
      }
    },
  };
})();
