/* Mini Sudoku — 6x6 grid, digits 1-6, each row/column/2x3 box has all six. */
(function () {
  const N = 6, BR = 2, BC = 3; // box = 2 rows x 3 cols
  const boxId = (r, c) => (Math.floor(r / BR) * (N / BC)) + Math.floor(c / BC);

  function solvedGrid() {
    const g = Array.from({ length: N }, () => new Array(N).fill(0));
    function ok(r, c, v) {
      for (let i = 0; i < N; i++) { if (g[r][i] === v || g[i][c] === v) return false; }
      const br = Math.floor(r / BR) * BR, bc = Math.floor(c / BC) * BC;
      for (let i = 0; i < BR; i++) for (let j = 0; j < BC; j++) if (g[br + i][bc + j] === v) return false;
      return true;
    }
    function fill(i) {
      if (i === N * N) return true;
      const r = (i / N) | 0, c = i % N;
      for (const v of shuffle([1, 2, 3, 4, 5, 6])) {
        if (ok(r, c, v)) { g[r][c] = v; if (fill(i + 1)) return true; g[r][c] = 0; }
      }
      return false;
    }
    fill(0);
    return g;
  }

  function countSolutions(g, limit) {
    const grid = g.map(r => r.slice());
    let count = 0;
    function ok(r, c, v) {
      for (let i = 0; i < N; i++) { if (grid[r][i] === v || grid[i][c] === v) return false; }
      const br = Math.floor(r / BR) * BR, bc = Math.floor(c / BC) * BC;
      for (let i = 0; i < BR; i++) for (let j = 0; j < BC; j++) if (grid[br + i][bc + j] === v) return false;
      return true;
    }
    function solve(i) {
      if (count >= limit) return;
      if (i === N * N) { count++; return; }
      const r = (i / N) | 0, c = i % N;
      if (grid[r][c]) { solve(i + 1); return; }
      for (let v = 1; v <= N; v++) if (ok(r, c, v)) { grid[r][c] = v; solve(i + 1); grid[r][c] = 0; }
    }
    solve(0);
    return count;
  }

  function generate(cluesTarget) {
    const sol = solvedGrid();
    const puz = sol.map(r => r.slice());
    const cells = shuffle(range(N * N));
    let filled = N * N;
    for (const idx of cells) {
      if (filled <= cluesTarget) break;
      const r = (idx / N) | 0, c = idx % N;
      const saved = puz[r][c];
      puz[r][c] = 0;
      if (countSolutions(puz, 2) === 1) filled--;
      else puz[r][c] = saved;
    }
    return { sol, puz };
  }

  const DIFF = { Easy: 18, Medium: 14, Hard: 11 };

  LG.games.sudoku = {
    name: 'Mini Sudoku', key: 'sudoku', emoji: '🔢',
    tagline: 'Logic · numbers',
    blurb: 'The classic, shrunk to 6×6. Every row, column and 2×3 box holds the digits 1 through 6.',
    mount(stage) {
      let puzzle, grid, given, sel = null, diff = 'Medium', history, view, timer, board;

      const diffSel = select(Object.keys(DIFF).map(d => ({ value: d, label: d })), (v) => { diff = v; newGame(); }, 'Medium');
      view = buildGameView({
        key: 'sudoku', emoji: '🔢', title: 'Mini Sudoku',
        subtitle: 'Fill the 6×6 grid so every row, column and 2×3 box contains 1 through 6.',
        chips: [{ name: 'time', k: 'Time', ico: '⏱' }],
        controls: [btn('New puzzle', () => newGame(), { class: 'primary', icon: '✦' }), diffSel, btn('Undo', () => undo(), { icon: '↶' }), btn('Hint', () => hint(), { icon: '💡' }), btn('Check', () => checkNow(), { icon: '✓' })],
        hint: 'Pick a cell, then tap a number (or use your keyboard). Matching digits and the cell’s row/column/box are highlighted.',
      });
      view.root.dataset.key = 'sudoku';
      board = view.board; timer = new Timer(view.timerEl);

      const pad = el('div', { class: 'pad' });
      for (let v = 1; v <= 6; v++) pad.appendChild(el('button', { onclick: () => enter(v) }, String(v)));
      pad.appendChild(el('button', { class: 'erase', onclick: () => enter(0) }, 'Erase'));
      view.root.appendChild(pad);
      stage.appendChild(view.root);

      window.addEventListener('keydown', keyHandler);
      newGame();

      function newGame() {
        puzzle = generate(DIFF[diff]);
        grid = puzzle.puz.map(r => r.slice());
        given = puzzle.puz.map(r => r.map(v => v !== 0));
        sel = null; history = [];
        view.setStatus(''); timer.reset(); timer.start(); render();
      }
      function pushHistory() { history.push(grid.map(r => r.slice())); if (history.length > 300) history.shift(); }
      function undo() { if (history.length) { grid = history.pop(); render(); } }

      function enter(v) {
        if (!sel) return;
        const [r, c] = sel;
        if (given[r][c]) return;
        pushHistory();
        grid[r][c] = v;
        render(); checkWin();
      }
      function keyHandler(e) {
        if (!sel) return;
        if (e.key >= '1' && e.key <= '6') enter(+e.key);
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enter(0);
        else if (e.key.startsWith('Arrow')) {
          let [r, c] = sel;
          if (e.key === 'ArrowUp') r = (r + N - 1) % N;
          if (e.key === 'ArrowDown') r = (r + 1) % N;
          if (e.key === 'ArrowLeft') c = (c + N - 1) % N;
          if (e.key === 'ArrowRight') c = (c + 1) % N;
          sel = [r, c]; render(); e.preventDefault();
        }
      }

      function hint() {
        const empties = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] !== puzzle.sol[r][c]) empties.push([r, c]);
        if (!empties.length) { toast('Grid’s already complete ✓'); return; }
        pushHistory();
        const [r, c] = empties[rnd(empties.length)];
        grid[r][c] = puzzle.sol[r][c]; sel = [r, c];
        toast('Filled one cell'); render(); checkWin();
      }

      function badCells() {
        const bad = Array.from({ length: N }, () => new Array(N).fill(false));
        const mark = (cells) => { const seen = {}; for (const [r, c] of cells) { const v = grid[r][c]; if (!v) continue; (seen[v] = seen[v] || []).push([r, c]); } for (const v in seen) if (seen[v].length > 1) for (const [r, c] of seen[v]) bad[r][c] = true; };
        for (let r = 0; r < N; r++) mark(range(N).map(c => [r, c]));
        for (let c = 0; c < N; c++) mark(range(N).map(r => [r, c]));
        for (let b = 0; b < N; b++) { const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (boxId(r, c) === b) cells.push([r, c]); mark(cells); }
        return bad;
      }
      function checkNow() {
        const bad = badCells(); let n = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bad[r][c]) n++;
        view.setStatus(n ? (n + ' cell' + (n > 1 ? 's' : '') + ' in conflict') : 'No conflicts so far 👍', n ? 'bad' : 'good');
        render();
      }
      function checkWin() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) return;
        const bad = badCells();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bad[r][c]) return;
        finishWin(view, LG.games.sudoku, timer, { onAgain: newGame });
      }

      function render() {
        const px = Math.min(60, Math.floor(Math.min(384, window.innerWidth - 60) / N));
        board.innerHTML = '';
        const bad = badCells();
        const selV = sel ? grid[sel[0]][sel[1]] : 0;
        const grd = el('div', { class: 'grid', style: { gridTemplateColumns: `repeat(${N}, ${px}px)` } });
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cls = ['cell'];
          if (given[r][c]) cls.push('fixed');
          if (sel) {
            const isSel = sel[0] === r && sel[1] === c;
            if (isSel) cls.push('sel');
            else if (selV && grid[r][c] === selV) cls.push('same');
            else if (sel[0] === r || sel[1] === c || boxId(sel[0], sel[1]) === boxId(r, c)) cls.push('peer');
          }
          if (bad[r][c]) cls.push('bad-cell');
          if ((c + 1) % BC === 0 && c !== N - 1) cls.push('box-r');
          if ((r + 1) % BR === 0 && r !== N - 1) cls.push('box-b');
          const cell = el('div', { class: cls.join(' '), style: { width: px + 'px', height: px + 'px' }, onclick: () => { sel = [r, c]; render(); } },
            grid[r][c] ? String(grid[r][c]) : '');
          grd.appendChild(cell);
        }
        board.appendChild(grd);
      }
    },
  };
})();
