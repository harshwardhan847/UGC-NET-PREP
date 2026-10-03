"""Audit ugc_net_cs_pyqs.json: flag suspect questions and render the PDF pages they sit on.

Writes work/<paper-id>/{flags.json,pNN.png} so an LLM (vision) can verify/fix only flagged items.
"""
import json, re, os, subprocess, sys, glob
import pypdf

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(ROOT, "work")
GARBLE = re.compile(r"[¯ |]|\b\d{5,}\b|[≤≥⋅∨∧⇒⇔∑∫√]\s*[≤≥⋅∨∧⇒⇔]")

def pdf_path(q):
    p = os.path.join(ROOT, q["paper"])
    return p if os.path.exists(p) else os.path.join(ROOT, "paper_1", q["paper"])

def flags(q, img_pages):
    f, o = [], q["options"]
    if not q["answer"]: f.append("no_answer")
    if any(not o.get(k, "").strip() for k in "ABCD"): f.append("empty_option")
    if len(q["question"]) < 15: f.append("short_question")
    if re.search(r"\(\s*[A-D1-4]\s*\)", q["question"]): f.append("option_marker_in_question")
    allopt = " ".join(o.values())
    if re.search(r"\(\s*[A-D1-4]\s*\)|PW|Clik|Android", allopt): f.append("dirty_option")
    if any(len(v) > 200 for v in o.values()): f.append("long_option")
    if re.search(r"PAGE \d|UGC NET|Android|Clik", q["question"] + q["solution"]): f.append("junk_text")
    if not q["solution"].strip(): f.append("no_solution")
    if GARBLE.search(q["question"] + allopt): f.append("garbled_math")
    if len(set(v.strip() for v in o.values())) < 4 and all(o.values()): f.append("duplicate_options")
    m = re.match(r"\s*Option\s*([A-D])\s*is\s*Correct", q["solution"], re.I)
    if m and m.group(1).upper() != q["answer"]: f.append("answer_vs_solution_mismatch")
    if q.get("_page") in img_pages: f.append("page_has_image")
    return f

def main():
    data = json.load(open(os.path.join(ROOT, "ugc_net_cs_pyqs.json")))
    by_paper = {}
    for q in data: by_paper.setdefault(q["paper"], []).append(q)
    os.makedirs(WORK, exist_ok=True)
    summary = {}
    for paper, qs in by_paper.items():
        path = pdf_path(qs[0])
        reader = pypdf.PdfReader(path)
        # question pages = everything before the Answer Key page
        key = next((i for i, p in enumerate(reader.pages) if re.search(r"answer\s+key", (p.extract_text() or "").lower())), len(reader.pages))
        page_of = {}
        for i in range(key):
            for n in re.findall(r"\bQ(\d+)\b", reader.pages[i].extract_text() or ""):
                page_of.setdefault(int(n), i + 1)
        img = subprocess.run(["pdfimages", "-list", path], capture_output=True, text=True).stdout.splitlines()[2:]
        rows = [l.split() for l in img if l.strip() and l.split()[2] == "image"]
        pages_of_obj = {}
        for r in rows: pages_of_obj.setdefault(r[9], set()).add(r[0])
        img_pages = {int(r[0]) for r in rows if len(pages_of_obj[r[9]]) == 1 and int(r[3]) > 40}
        out = {}
        for q in qs:
            q["_page"] = page_of.get(q["q_num"])
            fl = flags(q, img_pages)
            if fl: out[q["q_num"]] = {"page": q["_page"], "flags": fl}
        pid = os.path.splitext(paper)[0].replace(" ", "_")
        d = os.path.join(WORK, pid); os.makedirs(d, exist_ok=True)
        pages = sorted({v["page"] for v in out.values() if v["page"]}) or list(range(1, key + 1))
        for p in pages:
            subprocess.run(["pdftoppm", "-f", str(p), "-l", str(p), "-r", "110", "-png", "-singlefile", path, os.path.join(d, f"p{p:02d}")], capture_output=True)
        json.dump({"pdf": path, "key_page": key + 1, "flagged": out}, open(os.path.join(d, "flags.json"), "w"), indent=1)
        summary[pid] = (len(out), len(pages))
    for k, v in sorted(summary.items()): print(f"{k}: {v[0]} flagged, {v[1]} pages")
    print("total flagged:", sum(v[0] for v in summary.values()))

if __name__ == "__main__":
    main()
