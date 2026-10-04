"""Merge the Claude-transcribed questions in parsed/<paper>.txt into ugc_net_cs_pyqs.json.

parsed/<paper>.txt holds one block per question:

    ## <q_num>
    question text (any number of lines, ``` fences for code)
    §A option A
    §B option B   (an option may continue over several lines)
    §C option C
    §D option D

The PDF's own "Answer Key" page is the source of truth for the correct option (read with
pdftotext, which is exact for that page). For each question this replaces question, options and
answer, and keeps id / year / unit / solution from the existing record. Anything inconsistent is
reported instead of silently merged.

    python3 merge_parsed.py            # dry run: validate + report
    python3 merge_parsed.py --write    # also write ugc_net_cs_pyqs.json and quiz-app/src/data copy
"""
import json, os, re, subprocess, sys, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
# The PDF's own answer key is wrong for these; the worked solution (and a hand check) agrees on the value below.
# Dec 2018 Q15: MOV AL,153; NEG AL -> 01100111, CF=1, SF=0 (option D); the key page prints A.
ANSWER_OVERRIDES = {("UGC_Comp_Dec2018.pdf", 15): "D"}
OPT = re.compile(r"^§([A-D]) ?(.*)$")
HEAD = re.compile(r"^## (\d+)\s*$")


def pdf_for(paper):
    p = os.path.join(ROOT, paper)
    return p if os.path.exists(p) else os.path.join(ROOT, "paper_1", paper)


def parse_txt(path):
    qs, cur, opt = {}, None, None
    for line in open(path, encoding="utf-8").read().split("\n"):
        h = HEAD.match(line)
        if h:
            cur, opt = {"q": [], "o": {}}, None
            qs[int(h.group(1))] = cur
            continue
        if cur is None:
            continue
        m = OPT.match(line)
        if m:
            opt = m.group(1)
            cur["o"][opt] = [m.group(2)]
        elif opt:
            cur["o"][opt].append(line)
        else:
            cur["q"].append(line)
    out = {}
    for n, c in qs.items():
        out[n] = {
            "question": "\n".join(c["q"]).strip(),
            "options": {k: "\n".join(v).strip() for k, v in c["o"].items()},
        }
    return out


def answer_key_paper1(pdf):
    """General Paper 1 PDFs have no key page; the solutions open with "<n>. (<1-4>)"."""
    text = subprocess.run(["pdftotext", "-raw", pdf, "-"], capture_output=True, text=True).stdout
    key = {}
    for n, a in re.findall(r"(?m)^(\d+)\.\s*\(([1-4])\)", text):
        key.setdefault(int(n), "ABCD"[int(a) - 1])
    # a few solutions omit the full stop ("4 (2) Required ratio"); only fill gaps with that looser form
    for n, a in re.findall(r"(?m)^(\d+)\s+\(([1-4])\)", text):
        if 1 <= int(n) <= 50:
            key.setdefault(int(n), "ABCD"[int(a) - 1])
    return key


def answer_key(pdf):
    if "paper_1" in pdf:
        return answer_key_paper1(pdf)
    pages = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout).group(1))
    key = {}
    start = None
    for i in range(1, pages + 1):
        t = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), "-layout", pdf, "-"], capture_output=True, text=True).stdout
        if start is None and re.search(r"answer\s+key", t, re.I):
            start = i
        if start is not None:
            found = re.findall(r"Q\s*(\d+)\s*\(\s*([A-D])\s*\)", t)
            if not found and i > start:
                break
            for n, a in found:
                key.setdefault(int(n), a)
    return key


def main():
    write = "--write" in sys.argv
    data = json.load(open(os.path.join(ROOT, "ugc_net_cs_pyqs.json")))
    by_paper = {}
    for q in data:
        by_paper.setdefault(q["paper"], {})[q["q_num"]] = q
    problems, replaced, ans_changed = [], 0, []
    for paper, qs in sorted(by_paper.items()):
        txt = os.path.join(ROOT, "parsed", os.path.splitext(paper)[0].replace(" ", "_") + ".txt")
        if not os.path.exists(txt):
            print(f"-- {paper}: not parsed yet")
            continue
        parsed = parse_txt(txt)
        key = answer_key(pdf_for(paper))
        want = set(qs)
        if set(parsed) != want:
            problems.append(f"{paper}: question numbers differ; missing={sorted(want - set(parsed))} extra={sorted(set(parsed) - want)}")
        if set(key) != want:
            problems.append(f"{paper}: answer key covers {len(key)} of {len(want)} questions; missing={sorted(want - set(key))}")
        for n, p in sorted(parsed.items()):
            tag = f"{paper} Q{n}"
            if list(p["options"]) != list("ABCD") or not all(p["options"].values()):
                problems.append(f"{tag}: needs four non-empty options, got {list(p['options'])}")
            if len(p["question"]) < 8:
                problems.append(f"{tag}: question text too short")
            if re.search(r"PW Website|Android App|iOS App|UGC NET\s*$", p["question"] + " ".join(p["options"].values())):
                problems.append(f"{tag}: page footer/header junk in text")
            if n not in qs or n not in key:
                continue
            old = qs[n]
            if old["answer"] != key[n]:
                ans_changed.append(f"{tag}: existing {old['answer']!r} -> answer key {key[n]!r}")
            old["question"], old["options"], old["answer"] = p["question"], p["options"], ANSWER_OVERRIDES.get((paper, n), key[n])
            replaced += 1
    print(f"replaced {replaced} questions")
    for a in ans_changed:
        print("ANSWER", a)
    for p in problems:
        print("PROBLEM", p)
    if write and not problems:
        for target in (os.path.join(ROOT, "ugc_net_cs_pyqs.json"), os.path.join(ROOT, "quiz-app/src/data/ugc_net_cs_pyqs.json")):
            json.dump(data, open(target, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
        print("written")
    elif write:
        print("NOT written: fix the problems above first")


if __name__ == "__main__":
    main()
