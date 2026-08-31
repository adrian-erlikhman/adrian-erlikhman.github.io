# -*- coding: utf-8 -*-
"""
Re-typesets the parts of resume.pdf that changed:

  page 1 : the CompLLM entry under RESEARCH (title line kept, bullets replaced)
  page 2 : the CompLLM spill lines at the top, then everything from the
           SELECTED TECHNICAL PROJECTS list down through AWARDS & HONORS,
           so that Safe Routes to School can be inserted in both.

Method: white out the affected bands with an overlay page, redraw on top with
the same DejaVu Serif faces, sizes, colours and baselines the document already
uses, then merge the overlay onto the original pages. Everything outside the
whited bands is untouched.

Usage:  python build_resume.py <path to resume.pdf>
"""
import io
import os
import sys

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

# ---------------------------------------------------------------- fonts ----
import matplotlib

FONTDIR = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf")
pdfmetrics.registerFont(TTFont("DVS", os.path.join(FONTDIR, "DejaVuSerif.ttf")))
pdfmetrics.registerFont(TTFont("DVS-B", os.path.join(FONTDIR, "DejaVuSerif-Bold.ttf")))
pdfmetrics.registerFont(TTFont("DVS-I", os.path.join(FONTDIR, "DejaVuSerif-Italic.ttf")))

R, B, I = "DVS", "DVS-B", "DVS-I"

# --------------------------------------------------------------- palette ---
INK = (0.08627451, 0.09411765, 0.11372549)
BLUE = (0.101960789, 0.23921569, 0.42745099)
RULE = (0.7804, 0.8039, 0.8392)

# --------------------------------------------------------------- metrics ---
LEFT_RULE = 33.4          # section rule x
RULE_W = 545.2            # section rule width
RIGHT = LEFT_RULE + RULE_W  # 578.6, right text margin

BODY = 8.067797           # body / entry size
SKILL = 7.491525          # technical-skills size
MARK = 5.19               # bullet marker size

# PR #23 removed the Mandala entry by re-showing page 1 as two clipped form
# XObjects, the lower one translated up by this much. Content authored below
# the cut therefore renders SHIFT points higher than its authored baseline.
SHIFT = 51.29999
P1_ERASE_TOP = 94.6 + SHIFT   # 145.9: under the CompLLM title, over its bullets


def wrap(runs, size, maxw):
    """Greedy-wrap a list of (font, text) runs. Run boundaries always fall on a
    space, so words never straddle two fonts. Returns a list of lines, each a
    list of (font, text) segments."""
    words = []                     # (font, word)
    for font, text in runs:
        for w in text.split(" "):
            if w:
                words.append((font, w))

    lines, cur, curw = [], [], 0.0
    for font, word in words:
        wpx = pdfmetrics.stringWidth(word, font, size)
        spx = pdfmetrics.stringWidth(" ", font, size) if cur else 0.0
        if cur and curw + spx + wpx > maxw:
            lines.append(cur)
            cur, curw = [(font, word)], wpx
        else:
            cur.append((font, (" " if cur else "") + word))
            curw += spx + wpx
    if cur:
        lines.append(cur)

    # merge adjacent same-font segments
    return [[(f, "".join(t for _, t in grp))
             for f, grp in _groupby(line)] for line in lines]


def _groupby(line):
    out = []
    for font, text in line:
        if out and out[-1][0] == font:
            out[-1][1].append((font, text))
        else:
            out.append((font, [(font, text)]))
    return out


def draw_line(c, x, y, line, size, colour=INK):
    c.setFillColorRGB(*colour)
    for font, text in line:
        c.setFont(font, size)
        c.drawString(x, y, text)
        x += pdfmetrics.stringWidth(text, font, size)


def bullets(c, items, y, x_mark, x_text, size, mark_dy, gap_between, gap_within,
            maxw=None, expect=None, label=""):
    """Draw ▪-marked bullets top-down from baseline y. Returns the next y."""
    maxw = maxw or (RIGHT - x_text)
    for n, runs in enumerate(items):
        lines = wrap(runs, size, maxw)
        if expect is not None and len(lines) != expect:
            sys.exit("layout: %s bullet %d wrapped to %d lines (wanted %d):\n  %r"
                     % (label, n + 1, len(lines), expect,
                        "".join(t for _, t in runs)[:150]))
        c.setFillColorRGB(*BLUE)
        c.setFont(R, MARK)
        c.drawString(x_mark, y + mark_dy, "▪")
        for li, line in enumerate(lines):
            draw_line(c, x_text, y, line, size)
            if li != len(lines) - 1:
                y -= gap_within
        y -= gap_between
    return y + gap_between


def heading(c, y, text, size=BODY):
    c.setFillColorRGB(*BLUE)
    c.setFont(B, size)
    c.drawString(33.19, y, text)
    c.setFillColorRGB(*RULE)
    c.rect(LEFT_RULE, y - 4.6, RULE_W, 0.6, stroke=0, fill=1)


# ================================================================ content ==
COMPLLM = [
    [(B, "Self-Attribution Is Not Self-Recognition: A Peer Baseline for LLM Judges"),
     (R, " — submitted to the NeurIPS 2026 Workshop on Judgment and Generative "
         "Evaluation (JUDGe); double-blind, non-archival.")],
    [(R, "Designed the corpus and the judging harness: five frontier models each answered 38 "
         "content-scaffolded prompts, then judged the same 190 anonymized responses under two "
         "elicitation formats, one a counterbalanced five-slot lineup.")],
    [(R, "Introduced a peer baseline for self-attribution and showed that self-recognition is "
         "bimodal rather than universal: Claude names itself on 86.8% of its own text against "
         "53.9% for its peers, while Grok falls below the 20% chance floor on itself.")],
    [(R, "Trained a stylometric classifier over 18 interpretable features with prompt-disjoint "
         "GroupKFold that recovers the true author at 86.3%, above every judge in the panel, so "
         "the identifying signal is in the text and most judges do not use it.")],
    [(R, "Showed the same features cannot predict which model a judge wrongly blames once "
         "authorship is controlled for, and that a single-text protocol reproduces the published "
         "near-chance result, so elicitation format drives the headline statistic.")],
]

PROJECTS = [
    [(B, "eDNAtlas"),
     (R, " — an interactive map that turns raw environmental DNA into a plain-language health "
         "score for coastal sites; standards-aligned (Darwin Core) and open by default.")],
    [(B, "Safe Routes to School (Los Angeles)"),
     (R, " — 3rd place, Code for Transportation (Young Coders’ Sphere); a walking and "
         "transit router scoring 431,599 street blocks on crime risk by hour, with A* routing "
         "client-side from a 5 MB packed graph.")],
    [(B, "Regime-Aware Portfolio Optimizer"),
     (R, " — Gaussian HMM regime detection combined with reinforcement-learning asset "
         "allocation and volatility-regime frameworks for dynamic, regime-adaptive portfolio "
         "management (validated on synthetic data).")],
    [(B, "LSTM Equity Forecaster"),
     (R, " — TensorFlow LSTM time-series model predicting short-term NYSE price movements "
         "from engineered rolling-window datasets; benchmarked against ARIMA and "
         "linear-regression baselines.")],
    [(B, "FinBERT Market-Sentiment Analyzer"),
     (R, " — FinBERT NLP pipeline classifying sentiment across financial news and social "
         "media, mapping aggregated signals to market events via time-series visualization.")],
    [(B, "Fraud-Detection System"),
     (R, " — Supervised Random Forest / Gradient Boosting pipeline for rare-event financial "
         "fraud detection with targeted feature engineering and precision-recall optimization.")],
    [(B, "Citadel Terminal (Correlation One)"),
     (R, " — Competitor; built and iterated an algorithmic tower-defense strategy "
         "(\"dunerscore\") with replay-based post-mortem analysis across multiple versions.")],
]

LEADERSHIP = [
    [(B, "Jewish Student Union — President"),
     (R, " (2023–Present): lead a 50+ member club with weekly programming; coordinated a "
         "schoolwide Holocaust Remembrance assembly featuring a survivor in partnership with "
         "StandWithUs.")],
    [(B, "STEMsters — Founder & President"),
     (R, " (2022–Present): organized STEM volunteering for 30+ students across 4 elementary "
         "schools; designed hands-on coding, robotics, and engineering lessons for underserved "
         "youth.")],
    [(B, "Competitive Épée Fencing"),
     (R, " — USA Fencing A-rated; Team USA; Region 4 Champion; Top-8 Cadet Pan-American "
         "Championships (Bogotá); 3× All-American First Team; 3× All-Academic First "
         "Team. In active recruitment with MIT.")],
]

SKILLS = [
    (B, "Languages & Tools:"),
    (R, " Python, scikit-learn, TensorFlow / Keras, pandas, NumPy, SHAP, Git, Google Colab, "
        "LaTeX. "),
    (B, "ML & Statistics:"),
    (R, " supervised & unsupervised learning, NLP, time-series modeling, hidden Markov models, "
        "decision trees, hypothesis testing, cross-validation, feature engineering."),
]

AWARDS = [
    [(B, "eDNAtlas"),
     (R, " — 1st place, Decode the Ocean Hackathon (Lovable × United Nations), 2026.")],
    [(B, "Safe Routes to School"),
     (R, " — 3rd place, Code for Transportation (Young Coders’ Sphere), 2026.")],
    [(B, "Citadel Terminal (Correlation One)"),
     (R, " — finalist in the algorithmic-strategy competition.")],
    [(B, "Y Combinator Startup School"),
     (R, " — admitted at a sub-5% acceptance rate, with $30,000+ in partner credits.")],
    [(B, "JFEDLA Teen Innovation Grant"), (R, " — awarded to SafeJew, 2024.")],
    [(B, "LAUSD Student Innovation Challenge"),
     (R, " — invited presenter, $10,000 challenge.")],
    [(B, "USA Fencing"),
     (R, " — Team USA, Épée; U.S. No. 49 Junior and No. 78 Senior; Region 4 "
         "Champion; 3× All-American and 3× All-Academic First Team.")],
    [(B, "Class Rank 1 of 215"), (R, " — LACES, Class of 2027.")],
]


# ================================================================ overlay ==
def build_overlay():
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(612, 792))

    # ------------------------------------------------------------ page 1 --
    # PR #23 dropped the Mandala entry by re-showing the page as two clipped
    # form XObjects, the lower one lifted by SHIFT. So everything under the
    # RESEARCH heading now renders SHIFT points higher than it is authored.
    # Erase the old CompLLM bullets; the entry title line (device y 151.20)
    # stays.
    c.setFillColorRGB(1, 1, 1)
    c.rect(28, 0, 558, P1_ERASE_TOP, stroke=0, fill=1)

    # the freed space means all five bullets now fit on page 1
    y = 87.22 + SHIFT
    for runs in COMPLLM:
        lines = wrap(runs, BODY, RIGHT - 40.68)
        if len(lines) != 2:
            sys.exit("layout: CompLLM bullet wrapped to %d lines: %r"
                     % (len(lines), "".join(t for _, t in runs)[:120]))
        c.setFillColorRGB(*BLUE)
        c.setFont(R, MARK)
        c.drawString(33.19, y + 2.88, "▪")
        draw_line(c, 40.68, y, lines[0], BODY)
        draw_line(c, 40.68, y - 10.95, lines[1], BODY)
        y -= 12.68 + 10.95
    if y + 12.68 < 24:
        sys.exit("layout: CompLLM runs off the bottom of page 1 (y=%.1f)" % y)

    c.showPage()

    # ------------------------------------------------------------ page 2 --
    # erase the two old CompLLM spill lines at the very top; page 2 now opens
    # on the Legatum entry
    c.setFillColorRGB(1, 1, 1)
    c.rect(28, 766, 558, 26, stroke=0, fill=1)
    # erase from just under the SELECTED TECHNICAL PROJECTS heading downwards
    c.rect(28, 150, 558, 506, stroke=0, fill=1)

    # SELECTED TECHNICAL PROJECTS (heading itself is original, not redrawn)
    y = bullets(c, PROJECTS, 647.40, 33.19, 40.68, BODY, 3.46, 12.68, 10.95,
                expect=2, label="projects")

    # LEADERSHIP & ATHLETICS
    y -= 18.44
    heading(c, y, "LEADERSHIP & ATHLETICS")
    y = bullets(c, LEADERSHIP, y - 16.14, 33.19, 40.68, BODY, 3.46, 12.68, 10.95,
                expect=2, label="leadership")

    # TECHNICAL SKILLS
    y -= 18.44
    heading(c, y, "TECHNICAL SKILLS")
    y -= 15.56
    slines = wrap(SKILLS, SKILL, RIGHT - 33.19)
    if len(slines) != 3:
        sys.exit("layout: skills wrapped to %d lines" % len(slines))
    for line in slines:
        draw_line(c, 33.19, y, line, SKILL)
        y -= 9.80

    # AWARDS & HONORS
    y -= 16.20
    heading(c, y, "AWARDS & HONORS")
    y = bullets(c, AWARDS, y - 16.00, 33.19, 40.68, BODY, 3.40, 13.20, 11.00,
                label="awards")
    if y < 60:
        sys.exit("layout: awards run off the bottom of page 2 (y=%.1f)" % y)
    print("page 2 ends at y = %.1f" % y)

    c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


# ======================================================= strip old text ====
# Painting white over the old text hides it on screen but leaves it in the
# text layer, where a resume parser would still read it. So the text-showing
# operators inside each erased band are removed from the page's own content
# stream before the overlay is merged on top.

def _mul(a, b):
    return (a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
            a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
            a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5])


IDENT = (1, 0, 0, 1, 0, 0)
SHOW = (b"Tj", b"TJ", b"'", b'"')


def filter_ops(operations, bands):
    """Drop every BT..ET block whose baseline falls inside one of `bands`
    (a list of (y_low, y_high) in the stream's own coordinate space).
    Returns (kept operations, number of blocks dropped)."""
    out, ctm, stack = [], IDENT, []
    block, in_block, blk_y = [], False, None
    tm = tlm = IDENT
    leading = 0.0
    dropped = 0

    for operands, op in operations:
        if op == b"BT":
            in_block, block, blk_y = True, [(operands, op)], None
            tm = tlm = IDENT
            continue
        if in_block:
            block.append((operands, op))
            if op == b"Tm":
                tm = tlm = tuple(float(v) for v in operands)
            elif op in (b"Td", b"TD"):
                tx, ty = float(operands[0]), float(operands[1])
                if op == b"TD":
                    leading = -ty
                tlm = _mul((1, 0, 0, 1, tx, ty), tlm)
                tm = tlm
            elif op == b"TL":
                leading = float(operands[0])
            elif op == b"T*":
                tlm = _mul((1, 0, 0, 1, 0, -leading), tlm)
                tm = tlm
            elif op in SHOW and blk_y is None:
                blk_y = _mul(tm, ctm)[5]
            elif op == b"ET":
                in_block = False
                if blk_y is not None and any(lo <= blk_y <= hi for lo, hi in bands):
                    dropped += 1
                else:
                    out.extend(block)
            continue

        if op == b"q":
            stack.append(ctm)
        elif op == b"Q":
            ctm = stack.pop() if stack else IDENT
        elif op == b"cm":
            ctm = _mul(tuple(float(v) for v in operands), ctm)
        out.append((operands, op))

    return out, dropped


def strip_page(page, writer, bands):
    """Strip text from a page whose content stream holds the text directly."""
    from pypdf.generic import ContentStream

    cs = ContentStream(page.get_contents(), writer)
    cs.operations, dropped = filter_ops(cs.operations, bands)
    page.replace_contents(cs)
    return dropped


CUT_TOP = 181.0       # fzFrm0 shows the page above this, unshifted
CUT_BOT = 129.70001   # fzFrm1 shows the page below this, lifted by SHIFT


def rebuild_page1(page, writer):
    """PR #23 dropped the Mandala entry by showing one shared `/fullpage` form
    twice — clipped to y >= CUT_TOP at identity, and to y <= CUT_BOT lifted by
    SHIFT — so the band between the two cuts falls away. It renders correctly,
    but every glyph on the page is in the content twice, and text extraction
    reads both copies interleaved, which wrecks the file for a resume parser.

    Rebuild it as two forms that each carry only the text they actually show:
    one above the cut, one below. Paths are left in both (the BBox clips them),
    so the section rules stay exactly where they were. The old CompLLM bullets
    are dropped from both; the overlay redraws them."""
    from pypdf.generic import (ArrayObject, ContentStream, DecodedStreamObject,
                               NameObject, NumberObject)

    xobjects = page["/Resources"]["/XObject"].get_object()
    BIG = 1e6

    if "/srTop" in xobjects and "/srBot" in xobjects:
        # already rebuilt by an earlier run; re-split from our own forms so the
        # script stays idempotent
        src = xobjects["/srTop"].get_object()
        resources = src.raw_get("/Resources")
        top_ops = ContentStream(src, writer).operations
        bot_ops = ContentStream(xobjects["/srBot"].get_object(), writer).operations
        n_top = n_bot = 0
    else:
        frm1 = xobjects["/fzFrm1"].get_object()
        ty = float(frm1["/Matrix"][5])
        if abs(ty - SHIFT) > 0.01:
            sys.exit("page 1: form shift is %.3f, expected %.3f — the page layout "
                     "changed and the baselines in this script no longer apply"
                     % (ty, SHIFT))
        inner = frm1["/Resources"]["/XObject"]["/fullpage"].get_object()
        resources = inner.raw_get("/Resources")
        ops = ContentStream(inner, writer).operations
        top_ops, n_top = filter_ops(ops, [(-BIG, CUT_TOP)])
        bot_ops, n_bot = filter_ops(ops, [(CUT_BOT, BIG), (-BIG, 94.6)])

    def form(operations):
        cs = ContentStream(None, writer)
        cs.operations = operations
        obj = DecodedStreamObject()
        obj.set_data(cs.get_data())
        obj[NameObject("/Type")] = NameObject("/XObject")
        obj[NameObject("/Subtype")] = NameObject("/Form")
        obj[NameObject("/BBox")] = ArrayObject(
            [NumberObject(0), NumberObject(0), NumberObject(612), NumberObject(792)])
        obj[NameObject("/Resources")] = resources
        return writer._add_object(obj)

    xobjects[NameObject("/srTop")] = form(top_ops)
    xobjects[NameObject("/srBot")] = form(bot_ops)

    content = DecodedStreamObject()
    content.set_data(
        b"q 0 %f 612 %f re W n /srTop Do Q\n"
        b"q 1 0 0 1 0 %f cm 0 0 612 %f re W n /srBot Do Q\n"
        % (CUT_TOP, 792 - CUT_TOP, SHIFT, CUT_BOT))
    page[NameObject("/Contents")] = writer._add_object(content)
    return n_top, n_bot


def main(path):
    overlay = build_overlay()
    w = PdfWriter(clone_from=path)

    n_top, n_bot = rebuild_page1(w.pages[0], w)
    print("page 1: rebuilt as two single-copy forms (dropped %d / %d blocks)"
          % (n_top, n_bot))
    w.pages[0].merge_page(overlay.pages[0])

    n = strip_page(w.pages[1], w, [(766, 792), (150, 656)])
    print("page 2: dropped %d stale text blocks" % n)
    w.pages[1].merge_page(overlay.pages[1])

    with open(path, "wb") as fh:
        w.write(fh)
    print("wrote", path)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "resume.pdf")
