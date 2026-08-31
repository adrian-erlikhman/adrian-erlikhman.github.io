# Project memory — adrian-erlikhman.github.io

Personal portfolio site (single-page `index.html`), served via GitHub Pages at
the custom domain **adrianerlikhman.is-a.dev** (see `CNAME`). `resume.pdf` is the
résumé linked from the site.

## USA Fencing — current standings (keep in sync between site + resume)
- **U.S. Junior (U20): No. 49** — current national ranking
- **U.S. Senior: No. 78** — current national ranking
- U.S. Cadet (U17): peak No. 17
- Épée · **A26 rating** · Region 4 No. 1 · Team USA
- Public record: https://fencingtracker.com/p/100253463/Adrian-Erlikhman
- Update in two places when these change:
  - Site: `index.html`, `.fence-meta` chips (Fencing section, id currently `[06]`).
  - Résumé: `tools/build_resume.py` → the `USA Fencing` entry in the `AWARDS`
    list, then regenerate (see below).

## Résumé generation
- `resume.pdf` is patched in place by `tools/build_resume.py`:
  `python tools/build_resume.py resume.pdf`. Needs `reportlab` + `pypdf`; the
  DejaVu Serif faces come from the ones matplotlib ships (`mpl-data/fonts/ttf`).
- **It is idempotent.** It always redraws from the `COMPLLM` / `PROJECTS` /
  `LEADERSHIP` / `SKILLS` / `AWARDS` constants at the top of the file, so
  re-running is safe. Edit those constants; never hand-edit the PDF.
- Page 2 is patched by white-boxing two bands (the CompLLM spill lines at the
  top, and everything from the SELECTED TECHNICAL PROJECTS list down through
  AWARDS & HONORS), **stripping the stale text out of the content stream** so
  nothing hidden survives in the text layer, then redrawing.
- Page 1 needs more care. PR #23 removed the Mandala entry by showing one shared
  `/fullpage` form **twice** — clipped to y ≥ 181 unshifted, and to y ≤ 129.7
  lifted by 51.3 — so the band between the cuts falls away. It renders right but
  puts every glyph in the content twice, and text extraction read both copies
  interleaved, which made the file useless to a resume parser. The script now
  rebuilds page 1 as two forms (`/srTop`, `/srBot`) that each carry only the
  text they show. **Anything below the RESEARCH heading renders 51.3 pt higher
  than its authored baseline** — that is what `SHIFT` is for.
- Layout is asserted, not hoped for: a bullet that does not wrap to exactly two
  lines aborts the build, as does a page-1 form shift that is not 51.3. Keep
  replacement text within the same line count.
- Render with `pypdfium2` and re-run `pdftotext` before committing — check both
  that it looks right and that the text layer reads in order with no doubling.

## Deploy workflow
- Develop on branch `claude/migrate-github-io-dev-domain-kw4o17`.
- Per change: commit → push → open a **draft** PR → mark ready → squash-merge
  into `main` → resync the branch to `origin/main` with `--force-with-lease`.

## Site structure (section indices in `index.html`)
`[01]` Who · `[02]` Experience · `[03]` Research · `[04]` Achievements
(id=`record`; sub-cards: Competitions & Awards / Founding & Leadership /
Craft & Mastery) · `[05]` Projects · `[06]` Fencing · `[07]` Contact ·
`[08]` Off the clock.
- Two flagship `.dist-flag` banners open Achievements: eDNAtlas (1st, Decode the
  Ocean) and Safe Routes to School (3rd, Code for Transportation). Both also
  have a Projects card — eDNAtlas at P.06, Safe Routes at P.07 — and are
  intentionally **not** in Experience.
- The Safe Routes banner uses the `.df-multi` variant (a `div`, not an `a`) so it
  can carry two links. The second is a `.df-soon` placeholder waiting on the
  Young Coders' Sphere write-up; swap it for a real `<a>` when that is posted.
