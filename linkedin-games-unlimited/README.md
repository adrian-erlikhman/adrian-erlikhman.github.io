# Games Unlimited

Unlimited practice versions of the LinkedIn daily games, in a polished hub you can play forever.
Every logic puzzle is freshly generated **with a guaranteed unique solution** — no daily limit.

Not affiliated with LinkedIn; built for practice.

**Live:** https://adrian-erlikhman.github.io/linkedin-games-unlimited/

## Games

| Game | Rules |
|------|-------|
| **♛ Queens** | One queen per row, column and color region — none touching, not even diagonally. Tap for ✕, double-tap for a queen. Sizes 7×7–10×10. |
| **🌗 Tango** | Fill a 6×6 grid with suns/moons. Three of each per line, never three alike in a row. `=` matches, `×` differs. |
| **➰ Zip** | Draw one line filling every cell, hitting the numbers in order. Walls block you. Sizes 5×5–7×7. |
| **🔢 Mini Sudoku** | 6×6 with 2×3 boxes, digits 1–6. Easy / Medium / Hard, with peer + match highlighting. |
| **🎯 Pinpoint** | Five clues reveal one at a time — name the category they share in as few as possible. |
| **🪜 Crossclimb** | Solve each clue, then reorder the words so every rung is one letter from its neighbor. |

Each game has fresh puzzles, a timer, undo/hint where it makes sense, conflict highlighting, a win celebration, and **local stats** (games solved, best time, streak) shown on the home cards. Light/dark theme is remembered.

## Run locally

Double-click `index.html`, or serve it:

```bash
python -m http.server 3210
```

Then open http://127.0.0.1:3210 .

## How puzzles are generated

The four logic games build a valid solution first, then guarantee uniqueness:

- **Queens** — a valid placement seeds contiguous color regions; a repair loop finds any alternate solution and reassigns a boundary cell to kill it until the solution is unique.
- **Tango** — a full valid grid, then `=`/`×` edge signs (plus a few givens if needed) added until exactly one solution remains, then minimized.
- **Zip** — a random Hamiltonian path; sparse numbered checkpoints along it, then walls on non-path edges until the path is forced. A connectivity-pruned solver keeps it fast.
- **Sudoku** — a full grid, dug out one cell at a time while a solver confirms the puzzle stays uniquely solvable.

**Pinpoint** and **Crossclimb** are content-based (a bank of ~40 categories and 14 word ladders), shuffled for variety.

## Files

```
index.html      shell + app bar
styles.css      full design system (light + dark)
js/util.js      helpers, timer, stats, win overlay, toast, game registry
js/queens.js    js/tango.js  js/zip.js  js/sudoku.js   generators + UI
js/pinpoint.js  js/crossclimb.js                        content games
js/app.js       home hub + router + theme
```

Pure vanilla JS, no dependencies, no build step.
