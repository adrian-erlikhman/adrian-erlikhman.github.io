/* Pinpoint — five clues reveal one at a time; name the category that connects them.
   The fewer clues you need, the better. */
(function () {
  const BANK = [
    { a: 'Types of pasta', items: ['Penne', 'Fusilli', 'Rigatoni', 'Farfalle', 'Spaghetti'] },
    { a: 'Planets', items: ['Neptune', 'Venus', 'Saturn', 'Mars', 'Jupiter'] },
    { a: 'Chess pieces', items: ['Rook', 'Bishop', 'Knight', 'Pawn', 'Queen'] },
    { a: 'Shades of blue', items: ['Navy', 'Teal', 'Cerulean', 'Cobalt', 'Azure'] },
    { a: 'Greek letters', items: ['Sigma', 'Delta', 'Omega', 'Theta', 'Lambda'] },
    { a: 'Board games', items: ['Risk', 'Clue', 'Sorry', 'Monopoly', 'Scrabble'] },
    { a: 'Citrus fruits', items: ['Lime', 'Pomelo', 'Tangerine', 'Grapefruit', 'Lemon'] },
    { a: 'Coffee drinks', items: ['Latte', 'Macchiato', 'Cortado', 'Americano', 'Espresso'] },
    { a: 'Card suits & poker', items: ['Flush', 'Spade', 'Straight', 'Diamond', 'Club'] },
    { a: 'Dog breeds', items: ['Beagle', 'Poodle', 'Boxer', 'Corgi', 'Dalmatian'] },
    { a: 'Musical instruments', items: ['Cello', 'Oboe', 'Timpani', 'Trombone', 'Harp'] },
    { a: 'Olympic sports', items: ['Fencing', 'Judo', 'Rowing', 'Archery', 'Diving'] },
    { a: 'Shakespeare plays', items: ['Othello', 'Macbeth', 'Hamlet', 'Tempest', 'Coriolanus'] },
    { a: 'Programming languages', items: ['Rust', 'Kotlin', 'Python', 'Haskell', 'Swift'] },
    { a: 'US state capitals', items: ['Boise', 'Albany', 'Salem', 'Austin', 'Pierre'] },
    { a: 'Elements on the periodic table', items: ['Xenon', 'Cobalt', 'Argon', 'Bismuth', 'Sodium'] },
    { a: 'Constellations', items: ['Orion', 'Lyra', 'Draco', 'Cygnus', 'Cassiopeia'] },
    { a: 'Types of clouds', items: ['Cirrus', 'Stratus', 'Cumulus', 'Nimbus', 'Altocumulus'] },
    { a: 'Herbs & spices', items: ['Basil', 'Cumin', 'Thyme', 'Saffron', 'Oregano'] },
    { a: 'Tennis Grand Slams & terms', items: ['Ace', 'Deuce', 'Volley', 'Wimbledon', 'Baseline'] },
    { a: 'Currencies', items: ['Yen', 'Peso', 'Franc', 'Rupee', 'Dinar'] },
    { a: 'Mythical creatures', items: ['Griffin', 'Kraken', 'Phoenix', 'Chimera', 'Basilisk'] },
    { a: 'Types of triangles & shapes', items: ['Scalene', 'Rhombus', 'Trapezoid', 'Isosceles', 'Hexagon'] },
    { a: 'Famous painters', items: ['Monet', 'Vermeer', 'Dali', 'Rembrandt', 'Kahlo'] },
    { a: 'Breeds of cat', items: ['Siamese', 'Persian', 'Sphynx', 'Bengal', 'Ragdoll'] },
    { a: 'Wind instruments', items: ['Flute', 'Clarinet', 'Bassoon', 'Piccolo', 'Saxophone'] },
    { a: 'Types of coffee roast & terms', items: ['Blonde', 'Robusta', 'Arabica', 'Crema', 'Barista'] },
    { a: 'Layers of the Earth', items: ['Crust', 'Mantle', 'Core', 'Lithosphere', 'Asthenosphere'] },
    { a: 'Vitamins', items: ['Biotin', 'Folate', 'Niacin', 'Thiamine', 'Riboflavin'] },
    { a: 'Famous rivers', items: ['Nile', 'Amazon', 'Danube', 'Ganges', 'Mekong'] },
    { a: 'Poker hands', items: ['Pair', 'Flush', 'Straight', 'Full house', 'Royal flush'] },
    { a: 'Units of measurement', items: ['Ohm', 'Joule', 'Watt', 'Pascal', 'Newton'] },
    { a: 'Ballet terms', items: ['Plié', 'Arabesque', 'Jeté', 'Pirouette', 'Fouetté'] },
    { a: 'Types of knots', items: ['Bowline', 'Clove hitch', 'Sheet bend', 'Reef', 'Figure eight'] },
    { a: 'Sushi & Japanese food', items: ['Nigiri', 'Maki', 'Sashimi', 'Tempura', 'Miso'] },
    { a: 'Weather phenomena', items: ['Hail', 'Sleet', 'Monsoon', 'Tornado', 'Drizzle'] },
    { a: 'Roman gods', items: ['Jupiter', 'Neptune', 'Mars', 'Venus', 'Mercury'] },
    { a: 'Font families', items: ['Helvetica', 'Garamond', 'Futura', 'Georgia', 'Baskerville'] },
    { a: 'Martial arts', items: ['Karate', 'Aikido', 'Muay Thai', 'Taekwondo', 'Capoeira'] },
    { a: 'Types of bread', items: ['Baguette', 'Ciabatta', 'Focaccia', 'Rye', 'Sourdough'] },
  ];

  function generate() {
    const puzzle = BANK[rnd(BANK.length)];
    const others = BANK.filter(x => x !== puzzle);
    shuffle(others);
    const options = shuffle([puzzle.a, others[0].a, others[1].a, others[2].a]);
    return { answer: puzzle.a, items: puzzle.items, options };
  }

  LG.games.pinpoint = {
    name: 'Pinpoint', key: 'pinpoint', emoji: '🎯',
    tagline: 'Trivia · category',
    blurb: 'Five clues drop one by one. Spot the hidden category as fast as you can — the sooner, the sweeter.',
    mount(stage) {
      let puzzle, shown, wrong, done, view, timer;

      view = buildGameView({
        key: 'pinpoint', emoji: '🎯', title: 'Pinpoint',
        subtitle: 'Clues reveal one at a time. Guess the category they all share — using as few as you can.',
        chips: [{ name: 'clue', k: 'Clue', ico: '🔎', value: '1 / 5' }, { name: 'time', k: 'Time', ico: '⏱' }],
        controls: [btn('New puzzle', () => newGame(), { class: 'primary', icon: '✦' }), btn('Reveal clue', () => reveal(), { icon: '👁' }), btn('Skip', () => skip(), { icon: '⏭' })],
        hint: 'Each wrong guess reveals another clue. Nail it on clue 1 for a perfect solve.',
      });
      view.root.dataset.key = 'pinpoint';
      timer = new Timer(view.timerEl);
      const board = view.board; board.classList.add('pinpoint');
      const cluesEl = el('div', { class: 'clues' });
      const optionsEl = el('div', { class: 'options' });
      board.appendChild(cluesEl); board.appendChild(optionsEl);
      stage.appendChild(view.root);

      newGame();

      function newGame() { puzzle = generate(); shown = 1; wrong = new Set(); done = false; view.setStatus(''); timer.reset(); timer.start(); render(); }
      function reveal() { if (done) return; if (shown < 5) { shown++; render(); } else toast('All five clues are showing'); }
      function skip() { Stats.skip('pinpoint'); toast('Answer: ' + puzzle.answer); newGame(); }

      function pick(opt) {
        if (done) return;
        if (opt === puzzle.answer) {
          done = true;
          render();
          finishWin(view, LG.games.pinpoint, timer, { title: 'Pinpointed!', sub: 'Guessed it from ' + shown + ' clue' + (shown > 1 ? 's' : '') + '.', onAgain: newGame });
        } else {
          wrong.add(opt);
          view.setStatus('Not quite — here’s another clue.', 'bad');
          if (shown < 5) shown++;
          render();
        }
      }

      function render() {
        view.setChip('clue', Math.min(shown, 5) + ' / 5');
        cluesEl.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          if (i < shown || done) {
            cluesEl.appendChild(el('div', { class: 'clue' }, el('span', { class: 'n' }, String(i + 1)), puzzle.items[i]));
          } else {
            cluesEl.appendChild(el('div', { class: 'clue locked' }, el('span', { class: 'n' }, '?'), 'Clue ' + (i + 1) + ' hidden'));
          }
        }
        optionsEl.innerHTML = '';
        for (const opt of puzzle.options) {
          const cls = 'opt' + (done && opt === puzzle.answer ? ' correct' : '') + (wrong.has(opt) ? ' wrong' : '');
          optionsEl.appendChild(el('button', { class: cls, disabled: wrong.has(opt) || done, onclick: () => pick(opt) }, opt));
        }
      }
    },
  };
})();
