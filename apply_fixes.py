"""Merge LLM-verified corrections (work/<paper>/fixes.json) into ugc_net_cs_pyqs.json.

Validates each fix (4 non-empty options A-D, answer in A-D) before applying, and mirrors the
result to quiz-app/src/data/ugc_net_cs_pyqs.json. Unmatched/invalid fixes are reported, not applied.
"""
import json, glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
JUNK = re.compile(r"PAGE \d|\bUGC NET\b|Clik|Android App")

def main():
    path = os.path.join(ROOT, "ugc_net_cs_pyqs.json")
    data = json.load(open(path))
    idx = {(os.path.splitext(q["paper"])[0].replace(" ", "_"), q["q_num"]): q for q in data}
    applied = rejected = 0
    for fp in sorted(glob.glob(os.path.join(ROOT, "work", "*", "fixes.json"))):
        pid = os.path.basename(os.path.dirname(fp))
        for num, fx in json.load(open(fp)).items():
            q = idx.get((pid, int(num)))
            opts = fx.get("options", {})
            ok = q and fx.get("question", "").strip() and list(opts) == list("ABCD") and all(str(v).strip() for v in opts.values())
            ok = ok and not JUNK.search(fx["question"] + " ".join(opts.values())) and fx.get("answer", q and q["answer"]) in list("ABCD")
            if not ok:
                print("REJECT", pid, num); rejected += 1; continue
            q["question"] = fx["question"].strip()
            q["options"] = {k: str(opts[k]).strip() for k in "ABCD"}
            if fx.get("answer"): q["answer"] = fx["answer"]
            applied += 1
    for target in (path, os.path.join(ROOT, "quiz-app/src/data/ugc_net_cs_pyqs.json")):
        json.dump(data, open(target, "w"), indent=2, ensure_ascii=False)
    empty = sum(1 for q in data if any(not q["options"][k].strip() for k in "ABCD"))
    noans = sum(1 for q in data if q["answer"] not in list("ABCD"))
    print(f"applied={applied} rejected={rejected} total={len(data)} still_empty_options={empty} bad_answers={noans}")

if __name__ == "__main__":
    main()
