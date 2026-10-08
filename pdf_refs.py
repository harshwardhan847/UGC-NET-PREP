"""Locate every question (and its worked solution) on the pages of its source PDF.

For each question this records the regions of the PDF it occupies, so the app can open the original
page with the question highlighted. Both paper families are typeset in two columns, read left
column then right column, page by page; a question runs from its own marker ("Q12" / "12.") to the
next question's marker, which may be further down, in the other column or on the next page.

Output (quiz-app/src/data/pdf_refs.json), keyed by question id:

    {"dec2018_q4": {"q": [[1, x0, y0, x1, y1], [1, ...]], "s": [[17, ...]]}}

Each region is [page (1-based), x0, y0, x1, y1] with coordinates as fractions of the page size,
origin at the top left. "q" is the question, "s" its worked solution and "p" the passage or table
it shares with its neighbours (comprehension questions only); each is left out when it could not
be located.

    python3 pdf_refs.py            # dry run: locate + report
    python3 pdf_refs.py --write    # also write quiz-app/src/data/pdf_refs.json
"""
import difflib, html, json, os, re, subprocess, sys, unicodedata
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
QUESTIONS = os.path.join(ROOT, "quiz-app", "src", "data", "ugc_net_cs_pyqs.json")
OUT = os.path.join(ROOT, "quiz-app", "src", "data", "pdf_refs.json")

WORD = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>')
PAGE = re.compile(r'<page width="([\d.]+)" height="([\d.]+)">')
# Running headers and footers: lines that are exactly one of these, or that contain one of the links
CHROME = re.compile(r"^(UGC NET|SET|GENERAL PAPER|\[.*\]|General Paper \[.*\].*)$|Android App|iOS App|PW Website|Clik Here|Discover More", re.I)
PAD = 4  # points of breathing room around each region
INK = bytes(v < 170 for v in range(256))  # darker than the faint "PW" watermark behind the text


def pdf_for(paper):
    p = os.path.join(ROOT, paper)
    return p if os.path.exists(p) else os.path.join(ROOT, "paper_1", paper)


def read_pages(pdf):
    out = subprocess.run(["pdftotext", "-bbox", pdf, "-"], capture_output=True, text=True).stdout
    pages = []
    for n, chunk in enumerate(out.split("<page ")[1:], 1):
        w, h = map(float, PAGE.match("<page " + chunk).groups())
        words = [(float(a), float(b), float(c), float(d), html.unescape(t)) for a, b, c, d, t in WORD.findall(chunk)]
        pages.append({"pdf": pdf, "n": n, "w": w, "h": h, "words": words})
    for pg in pages:
        find_chrome(pg)
    return pages


def find_chrome(page):
    """Mark the running header, footer and link banners; the body text is what lies between them."""
    h = page["h"]
    top, bottom, chrome = h * 0.03, h * 0.97, []
    lines = defaultdict(list)
    for wd in page["words"]:
        lines[(round(wd[1] / 3), wd[0] < page["w"] / 2)].append(wd)
    for ln in lines.values():
        ln.sort()
        if not CHROME.search(" ".join(w[4] for w in ln).strip()):
            continue
        y0, y1 = min(w[1] for w in ln), max(w[3] for w in ln)
        chrome.append((y0, y1))
        if y1 < h * 0.16:
            top = max(top, y1 + 2)
        elif y0 > h * 0.84:
            bottom = min(bottom, y0 - 2)
    page["top"], page["bottom"], page["chrome"] = top, bottom, chrome
    page["body"] = [w for w in page["words"] if top <= w[1] and w[3] <= bottom and not any(c0 <= w[1] <= c1 for c0, c1 in chrome)]


def body_words(page):
    return page["body"]


def ink_rows(page, x0, y0, x1, y1):
    """First and last rows of the box (in points) that carry ink, text or figure alike, or None.

    A row needs two dark pixels, so the hairline rule between columns doesn't count, and banners
    like "Clik Here To Discover More" are skipped.
    """
    if "ink" not in page:
        # one byte per point: a 72 dpi greyscale render, 1 where it is dark
        out = subprocess.run(["pdftoppm", "-gray", "-r", "72", "-f", str(page["n"]), "-l", str(page["n"]), page["pdf"]], capture_output=True).stdout
        m = re.match(rb"P5\s+(\d+)\s+(\d+)\s+255\s", out)
        w, h = int(m.group(1)), int(m.group(2))
        page["ink"] = (w, h, out[m.end():m.end() + w * h].translate(INK))
    w, h, ink = page["ink"]
    a, b = max(0, int(x0)), min(w, int(x1))
    rows = [y for y in range(max(0, int(y0)), min(h, int(y1)))
            if ink.count(1, y * w + a, y * w + b) >= 2 and not any(c0 - 8 <= y <= c1 + 8 for c0, c1 in page["chrome"])]
    return (rows[0], rows[-1] + 1) if rows else None


def next_on_line(page, wd):
    """Text of the word right after wd on the same line ("" at the end of a line)."""
    after = [w for w in page["words"] if abs(w[1] - wd[1]) < 3 and 0 <= w[0] - wd[2] < 30]
    return min(after)[4] if after else ""


# Marker tests: (page, word) -> question number, or None. Position is checked separately.

def cs_question(page, wd):
    m = re.fullmatch(r"Q(\d{1,3})", wd[4])
    return int(m.group(1)) if m else None


def cs_solution(page, wd):
    m = re.fullmatch(r"Q(\d{1,3})\.?", wd[4])
    return int(m.group(1)) if m and next_on_line(page, wd).lower().startswith("text") else None


def p1_question(page, wd):
    m = re.fullmatch(r"(\d{1,2})\.", wd[4])
    return int(m.group(1)) if m else None


def p1_solution(page, wd):
    # "12. (3) ..." -- a few leave out the full stop
    m = re.fullmatch(r"(\d{1,2})\.?", wd[4])
    return int(m.group(1)) if m and re.match(r"\([1-4]\)", next_on_line(page, wd)) else None


def find_markers(pages, page_range, test):
    """Question markers on these pages, in reading order, as (q_num, page, col, y).

    A marker has to start a line at the left edge of its column, which is where most candidates
    sit; that rules out numbers inside tables, lists and worked fractions.
    """
    cands = []
    for p in page_range:
        # left-column markers sit near 10% of the width, right-column ones near 50%
        mid = pages[p]["w"] * 0.3
        for wd in body_words(pages[p]):
            n = test(pages[p], wd)
            if n is not None:
                cands.append((n, p, int(wd[0] >= mid), wd[1], wd[0]))
    edge = [Counter(round(c[4]) for c in cands if c[2] == col).most_common(1) for col in (0, 1)]
    edge = [e[0][0] if e else None for e in edge]
    found = [c[:4] for c in cands if edge[c[2]] is not None and -3 <= c[4] - edge[c[2]] <= 8]
    found.sort(key=lambda m: (m[1], m[2], m[3]))
    return keep_increasing(found), edge


def keep_increasing(markers):
    """Longest run of markers whose numbers strictly increase in reading order (drops stray matches)."""
    n = len(markers)
    if not n:
        return []
    best, prev = [1] * n, [-1] * n
    for i in range(n):
        for j in range(i):
            if markers[j][0] < markers[i][0] and best[j] + 1 > best[i]:
                best[i], prev[i] = best[j] + 1, j
    i = max(range(n), key=lambda k: best[k])
    out = []
    while i != -1:
        out.append(markers[i])
        i = prev[i]
    return out[::-1]


def column_bounds(pages, page_range, edge):
    """x-extent of the left and right columns. The right one starts just before its markers."""
    words = [w for p in page_range for w in body_words(pages[p])]
    split = edge[1] - PAD
    left = min([w[0] for w in words if w[0] < split] + [edge[0]]) - PAD
    right = max(w[2] for w in words if w[0] >= split) + PAD
    return [(left, split - 1), (split, right)]


def last_text_y(page, x0, x1, y_from=-1.0):
    ys = [w[3] for w in body_words(page) if x0 <= w[0] < x1 and w[1] >= y_from]
    return max(ys) + PAD if ys else None


def section_end(pages, page_range, cols, after):
    """Position just below the last line of text in the section that comes after `after`."""
    for cp in reversed([q for q in page_range if q >= after[0]]):
        for cc in (1, 0):
            if (cp, cc) < after[:2]:
                continue
            y = last_text_y(pages[cp], *cols[cc], after[2] if (cp, cc) == after[:2] else -1)
            if y is not None:
                return (cp, cc, y)
    return (after[0], after[1], pages[after[0]]["bottom"])


def span(pages, cols, start, end):
    """Regions covering everything in reading order from position start up to end.

    A position is (page index, column, y); a span crossing a column or page break is split there.
    """
    segs = []
    (cp, cc, cy), (ep, ecol, ey) = start, end
    while (cp, cc) <= (ep, ecol):
        pg = pages[cp]
        y0 = max(cy, pg["top"])
        y1 = min(ey if (cp, cc) == (ep, ecol) else pg["bottom"], pg["bottom"])
        x0, x1 = cols[cc]
        # hug the ink: no blank band at the foot of a column, or at the head of one it continues into
        rows = ink_rows(pg, x0, y0, x1, y1) if y1 - y0 > 8 else None
        if rows:
            if cy < 0:
                y0 = max(y0, rows[0] - PAD)
            y1 = min(y1, rows[1] + PAD)
            segs.append([cp + 1, *(round(v, 4) for v in (x0 / pg["w"], y0 / pg["h"], x1 / pg["w"], y1 / pg["h"]))])
        cp, cc = (cp, 1) if cc == 0 else (cp + 1, 0)
        cy = -1.0
    return segs


def tokens(text):
    return [t for t in (re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKC", w).lower()) for w in text.split()) if t]


def reading_order(pages, page_range, cols):
    """Body words of the section as (page, col, y0, y1, x0, token, text), in reading order."""
    out = []
    for p in page_range:
        for wd in body_words(pages[p]):
            col = next((c for c, (x0, x1) in enumerate(cols) if x0 <= wd[0] < x1), None)
            tok = tokens(wd[4])
            if col is not None and tok:
                out.append((p, col, wd[1], wd[3], wd[0], tok[0], wd[4]))
    out.sort(key=lambda w: (w[0], w[1], round(w[2] / 3), w[4]))
    return out


def find_text(stream, toks, lo, hi):
    """Index in stream[lo:hi] where the token sequence toks best begins, or None if it is not there."""
    want, best = "".join(toks), (0.0, None)
    for i in range(lo, max(lo, hi - len(toks) + 1)):
        got = "".join(w[5] for w in stream[i:i + len(toks)])
        r = difflib.SequenceMatcher(None, want, got, autojunk=False).ratio()
        if r > best[0]:
            best = (r, i)
    return best[1] if best[0] >= 0.75 else None


def passage_bounds(stream, markers, group, passage):
    """(start, end, printed_before_a) for a passage shared by questions a..b, or None.

    Usually the passage is printed just before question a; sometimes it follows the "Qa" marker.
    """
    a = group[0]
    at = {n: (p, col, y) for n, p, col, y in markers}
    if a not in at:
        return None
    pos = lambda w: (w[0], w[1], w[2])
    idx = lambda key: next((i for i, w in enumerate(stream) if pos(w) >= key), len(stream))
    lo = idx(at[a - 1]) + 1 if a - 1 in at else 0
    hi = idx(at[a + 1]) if a + 1 in at else len(stream)
    toks = tokens(re.sub(r"\[[^\]]*\]", " ", passage))
    i = find_text(stream, toks[:8], lo, hi)
    if i is None:
        return None
    # take in a "Directions (36-40): Read the passage..." heading printed just above it
    for k in range(i - 1, max(lo, i - 40) - 1, -1):
        if re.fullmatch(r"\(([A-D]|[1-4])\)", stream[k][6]):
            break
        if stream[k][6].lower().startswith("direction"):
            i = k
            break
    start = pos(stream[i])
    if start < at[a]:
        return (start[0], start[1], start[2] - PAD), (at[a][0], at[a][1], at[a][2] - PAD), True
    j = find_text(stream, toks[-8:], i, hi)
    if j is None:
        return None
    last = stream[min(j + len(toks[-8:]) - 1, len(stream) - 1)]
    return (at[a][0], at[a][1], at[a][2] - PAD), (last[0], last[1], last[3] + PAD), False


def regions(pages, page_range, test, groups=()):
    """Regions per question number, plus per passage group (keyed by the group's first number).

    Each question runs from its marker to the next marker in reading order, or to the start of a
    passage printed between them.
    """
    markers, edge = find_markers(pages, page_range, test)
    cols = column_bounds(pages, page_range, edge)
    stream = reading_order(pages, page_range, cols)
    passages, cuts = {}, []
    for group, text in groups:
        b = passage_bounds(stream, markers, group, text)
        if b is None:
            print(f"    passage for Q{group[0]}-Q{group[-1]} not found")
            continue
        start, end, before = b
        passages[group[0]] = span(pages, cols, start, end)
        if before:
            # printed ahead of its first question, so the question before it stops there
            cuts.append(start)
    bounds = sorted([(p, col, y - PAD) for _, p, col, y in markers] + cuts)
    out = {}
    for n, p, col, y in markers:
        start = (p, col, y - PAD)
        later = [b for b in bounds if b > start]
        end = later[0] if later else section_end(pages, page_range, cols, start)
        out[n] = span(pages, cols, start, end)
    return out, passages


def first_page(pages, test, start=0):
    for i in range(start, len(pages)):
        if any(test(pages[i], wd) == 1 for wd in body_words(pages[i])):
            return i
    return None


def sections(paper, pages):
    """(page range, marker test) for the questions and for the worked solutions."""
    if "General Paper" in paper:
        # questions, then solutions that open with "1. (2) ..."; the "Solutions" heading is an image in some
        sols = first_page(pages, p1_solution, 1)
        q, s = (range(1, sols), p1_question), (range(sols, len(pages)), p1_solution)
    else:
        # questions, an "Answer Key" (whose "Q12 (C)" entries must not count), then "Q12 Text Solution:"
        text = [" ".join(w[4] for w in pg["words"]) for pg in pages]
        key = next(i for i, t in enumerate(text) if re.search(r"\bAnswer\s+Key\b", t, re.I))
        sols = first_page(pages, cs_solution, key)
        q, s = (range(0, key), cs_question), (range(sols, len(pages)), cs_solution)
    # cover/back pages at a different size carry no questions
    size = (pages[q[0][-1]]["w"], pages[q[0][-1]]["h"])
    return [([p for p in rng if (pages[p]["w"], pages[p]["h"]) == size], test) for rng, test in (q, s)]


PASSAGE = re.compile(r"^(?:Passage|Comprehension)\s*\(Q(\d+)\s*-\s*Q?(\d+)\)\s*:?\s*")


def passage_groups(qs):
    """[(question numbers, passage text)] for questions that share a passage.

    The data stores the passage at the start of each question's text, labelled "Passage (Q91-Q95):".
    """
    groups = defaultdict(list)
    for q in qs:
        m = PASSAGE.match(q["question"])
        if m:
            groups[(int(m.group(1)), int(m.group(2)))].append(q["question"][m.end():])
    out = []
    for (a, b), texts in sorted(groups.items()):
        # the passage is what every question in the group starts with
        shared = os.path.commonprefix(texts) if len(texts) > 1 else texts[0].rsplit("\n", 1)[0]
        out.append((list(range(a, b + 1)), shared))
    return out


def locate(paper, qs):
    """{"q": {q_num: regions}, "s": {q_num: regions}, "p": {q_num: passage regions}}."""
    pages = read_pages(pdf_for(paper))
    (q_range, q_test), (s_range, s_test) = sections(paper, pages)
    groups = passage_groups(qs)
    questions, passages = regions(pages, q_range, q_test, groups)
    solutions, _ = regions(pages, s_range, s_test)
    shared = {n: passages[g[0]] for g, _ in groups if g[0] in passages for n in g}
    return {"q": questions, "s": solutions, "p": shared}


def main():
    write = "--write" in sys.argv
    questions = json.load(open(QUESTIONS, encoding="utf-8"))
    by_paper = defaultdict(list)
    for q in questions:
        by_paper[q["paper"]].append(q)

    refs, gaps = {}, 0
    for paper, qs in sorted(by_paper.items()):
        found = locate(paper, qs)
        nums = [q["q_num"] for q in qs]
        for q in qs:
            ref = {k: found[k][q["q_num"]] for k in ("p", "q", "s") if found[k].get(q["q_num"])}
            if ref:
                refs[q["id"]] = ref
        missing = {k: [n for n in nums if not found[k].get(n)] for k in ("q", "s")}
        gaps += sum(map(len, missing.values()))
        note = "".join(f"  no {'question' if k == 'q' else 'solution'}: {v}" for k, v in missing.items() if v)
        print(f"{paper:<34} questions {len(nums) - len(missing['q']):3d}/{len(nums)}  solutions {len(nums) - len(missing['s']):3d}/{len(nums)}{note}")

    print(f"\n{len(refs)}/{len(questions)} questions linked to their PDF, {gaps} question/solution regions not found")
    if write:
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(refs, f, separators=(",", ":"))
            f.write("\n")
        print(f"wrote {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
