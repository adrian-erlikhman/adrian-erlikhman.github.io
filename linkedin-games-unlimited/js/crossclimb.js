/* Crossclimb — solve each clue, then stack the words so every neighbor differs by one letter. */
(function () {
  // Each ladder: consecutive words differ by exactly one letter (validated at runtime).
  const LADDERS = [
    [['BAT', 'Flying mammal'], ['CAT', 'Feline pet'], ['COT', 'Small folding bed'], ['COG', 'Tooth on a gear'], ['DOG', 'Loyal companion']],
    [['WARM', 'Gently hot'], ['WARD', 'Hospital section'], ['WORD', 'Unit of language'], ['CORD', 'Thick string'], ['CARD', 'Ace or king']],
    [['HEAD', 'Top of the body'], ['HEAL', 'Recover from injury'], ['HEAT', 'Warmth'], ['HEAP', 'Big untidy pile'], ['REAP', 'Harvest a crop']],
    [['SLOW', 'Not fast'], ['SLOT', 'Machine opening'], ['SHOT', 'Attempt, or a photo'], ['SHOP', 'Place to buy things'], ['STOP', 'Come to a halt']],
    [['RAIN', 'Wet weather'], ['MAIN', 'Most important'], ['MAID', 'Household helper'], ['LAID', 'Placed down'], ['LAIR', 'Animal’s den']],
    [['FIRE', 'Flames'], ['HIRE', 'Take on staff'], ['HERE', 'In this place'], ['HERD', 'Group of cattle'], ['HARD', 'Not soft']],
    [['BOOK', 'You read it'], ['LOOK', 'Take a glance'], ['LOCK', 'Keeps a door shut'], ['LICK', 'Use your tongue'], ['LICE', 'Tiny hair pests']],
    [['SAND', 'Beach grains'], ['BAND', 'Music group'], ['BEND', 'Curve in the road'], ['BOND', '007, or a link'], ['FOND', 'Affectionate']],
    [['TREE', 'Trunk and leaves'], ['FREE', 'No cost'], ['FRET', 'Worry'], ['FEET', 'You stand on them'], ['FELT', 'Soft craft fabric']],
    [['MOON', 'Night-sky orb'], ['MOOD', 'Emotional state'], ['GOOD', 'Not bad'], ['GOLD', 'Precious metal'], ['COLD', 'Chilly']],
    [['STAR', 'Twinkles at night'], ['STAY', 'Remain'], ['SLAY', 'Defeat dramatically'], ['PLAY', 'Have fun, or a drama'], ['PRAY', 'Speak to a deity']],
    [['WIND', 'Moving air'], ['WINE', 'Grape drink'], ['VINE', 'Climbing plant'], ['VANE', 'Weather ___'], ['CANE', 'Walking stick']],
    [['FISH', 'Swims with gills'], ['WISH', 'Hope for'], ['WASH', 'Clean with water'], ['CASH', 'Notes and coins'], ['CASE', 'Container, or a lawsuit']],
    [['DARK', 'Without light'], ['DART', 'Thrown at a board'], ['CART', 'Shopping trolley'], ['CARE', 'Look after'], ['CORE', 'Center of an apple']],
  ];

  const diffOne = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d === 1; };
  const validLadder = (L) => { for (let i = 0; i < L.length - 1; i++) if (!diffOne(L[i][0], L[i + 1][0])) return false; return true; };
  const VALID = LADDERS.filter(validLadder);

  function generate() {
    const L = VALID[rnd(VALID.length)];
    const words = L.map(x => x[0]), clues = L.map(x => x[1]);
    const n = words.length;
    let order = range(n);
    const ident = order.join(''), rev = order.slice().reverse().join('');
    for (let t = 0; t < 50; t++) { shuffle(order); const s = order.join(''); if (s !== ident && s !== rev) break; }
    return { words, clues, n, len: words[0].length, order };
  }

  LG.games.crossclimb = {
    name: 'Crossclimb', key: 'crossclimb', emoji: '🪜',
    tagline: 'Words · ladder',
    blurb: 'Solve each clue, then stack the answers so every word is just one letter away from its neighbor.',
    mount(stage) {
      let puzzle, typed, order, view, timer, ladderEl, dragFrom = -1;

      view = buildGameView({
        key: 'crossclimb', emoji: '🪜', title: 'Crossclimb',
        subtitle: 'Answer every clue, then reorder the rungs so each word changes just one letter from the one above.',
        chips: [{ name: 'time', k: 'Time', ico: '⏱' }],
        controls: [btn('New puzzle', () => newGame(), { class: 'primary', icon: '✦' }), btn('Hint', () => hint(), { icon: '💡' }), btn('Clear', () => clearAll(), { icon: '⌫' })],
        hint: 'Type each answer into its tiles. Then drag a rung — or use ▲ ▼ — until every neighbor differs by exactly one letter.',
      });
      view.root.dataset.key = 'crossclimb';
      timer = new Timer(view.timerEl);
      const board = view.board; board.classList.add('crossclimb');
      ladderEl = el('div', { class: 'ladder' });
      board.appendChild(ladderEl);
      stage.appendChild(view.root);

      newGame();

      function newGame() {
        puzzle = generate();
        typed = puzzle.words.map(() => []);
        order = puzzle.order.slice();
        view.setStatus(''); timer.reset(); timer.start(); render();
      }
      function clearAll() { typed = puzzle.words.map(() => []); render(); }
      function solvedRung(orig) { return typed[orig].join('') === puzzle.words[orig]; }

      function hint() {
        const unsolved = range(puzzle.n).filter(o => !solvedRung(o));
        if (unsolved.length) { const o = unsolved[rnd(unsolved.length)]; typed[o] = puzzle.words[o].split(''); toast('Solved a clue'); render(); checkWin(); return; }
        // all solved — fix the order
        order = range(puzzle.n); toast('Snapped the ladder into order'); render(); checkWin();
      }

      function move(pos, dir) {
        const np = pos + dir; if (np < 0 || np >= puzzle.n) return;
        [order[pos], order[np]] = [order[np], order[pos]];
        render(); checkWin();
      }

      function orderValid() { for (let i = 0; i < puzzle.n - 1; i++) if (!diffOne(puzzle.words[order[i]], puzzle.words[order[i + 1]])) return false; return true; }

      function checkWin() {
        for (let o = 0; o < puzzle.n; o++) if (!solvedRung(o)) return;
        if (!orderValid()) { view.setStatus('All solved — now line up the ladder ▲▼', ''); return; }
        finishWin(view, LG.games.crossclimb, timer, { title: 'Climbed it!', onAgain: newGame });
      }

      function render() {
        ladderEl.innerHTML = '';
        order.forEach((orig, pos) => {
          const rung = el('div', { class: 'rung' + (solvedRung(orig) ? ' solved-rung' : '') });
          rung.addEventListener('dragover', (e) => { if (dragFrom < 0) return; e.preventDefault(); rung.classList.add('dragover'); });
          rung.addEventListener('dragleave', () => rung.classList.remove('dragover'));
          rung.addEventListener('drop', (e) => { e.preventDefault(); rung.classList.remove('dragover'); if (dragFrom >= 0 && dragFrom !== pos) { const [m] = order.splice(dragFrom, 1); order.splice(pos, 0, m); render(); checkWin(); } });
          const handle = el('div', { class: 'mv-col', draggable: 'true', title: 'Drag to reorder' });
          handle.addEventListener('dragstart', (e) => { dragFrom = pos; rung.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(pos)); });
          handle.addEventListener('dragend', () => { dragFrom = -1; rung.classList.remove('dragging'); [...ladderEl.children].forEach(x => x.classList.remove('dragover')); });
          handle.appendChild(el('button', { class: 'mv', disabled: pos === 0, onclick: () => move(pos, -1) }, '▲'));
          handle.appendChild(el('button', { class: 'mv', disabled: pos === puzzle.n - 1, onclick: () => move(pos, 1) }, '▼'));
          const tiles = el('div', { class: 'tiles' });
          for (let p = 0; p < puzzle.len; p++) {
            const inp = el('input', { maxlength: 1, value: typed[orig][p] || '', inputmode: 'latin', autocomplete: 'off' });
            if (typed[orig][p]) inp.classList.toggle('good', solvedRung(orig));
            inp.addEventListener('input', () => {
              const ch = (inp.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(-1)) || '';
              inp.value = ch; typed[orig][p] = ch;
              if (ch && p < puzzle.len - 1) { const nx = inp.nextElementSibling; if (nx) nx.focus(); }
              const solved = solvedRung(orig);
              rung.classList.toggle('solved-rung', solved);
              tiles.querySelectorAll('input').forEach(x => x.classList.toggle('good', solved));
              checkWin();
            });
            inp.addEventListener('keydown', (e) => {
              if (e.key === 'Backspace' && !inp.value && p > 0) { e.preventDefault(); const pv = inp.previousElementSibling; if (pv) { pv.focus(); pv.value = ''; typed[orig][p - 1] = ''; rung.classList.remove('solved-rung'); tiles.querySelectorAll('input').forEach(x => x.classList.remove('good')); } }
            });
            tiles.appendChild(inp);
          }
          rung.appendChild(handle);
          rung.appendChild(el('div', { class: 'clue-text' }, (pos + 1) + '. ' + puzzle.clues[orig]));
          rung.appendChild(tiles);
          ladderEl.appendChild(rung);
        });
      }
    },
  };
})();
