# Unit synthesis instructions
Input: analysis/unit_inputs/unit_<N>.json (all past-paper questions of unit N, 2018-2025, with tags, full text, options, answer, solution). Taxonomy topics: analysis/taxonomy.json[N].topics. Years in the data: July 2018, Dec 2018, June 2019, Dec 2019, Nov 2020, Nov 2021, Sep 2022, Dec 2022 (x2 shifts), June 2023, Dec 2023, June 2024 (x2 papers), Dec 2024, June 2025 (Paper 1 unit: 2023-2025 only). Treat the 2 shifts / 2 June-2024 papers as separate papers.
Read ALL questions in the unit (in chunks) and think like an exam-setter. Do not rely on tags alone; re-cluster by actually comparing question content.
Write analysis/units/unit_<N>.json (valid JSON) with exactly this shape:
{
 "unit": N, "name": "...", "total_questions": int, "papers_covered": int,
 "topics": [ {"topic": "<exact taxonomy string>", "count": int, "papers": int, "first_year": "...", "last_year": "...",
              "trend": "rising|steady|fading", "priority": "Must|High|Medium|Low", "why": "1-2 lines on why this priority",
              "what_to_study": ["concrete bullet", ...]} ],   // every taxonomy topic that has questions, sorted by priority then count
 "clusters": [ {"id": "u<N>c<k>", "title": "...", "type": "exact-repeat|same-concept-variant|same-formula",
                "topic": "<exact taxonomy string>", "technique": "how to solve this family in 1-3 lines",
                "what_changes": "what varies between members (numbers, wording, options...)",
                "representative": "<question id>", "members": ["<id>", ... incl. representative],
                "skip_note": "1 line: why the rest are safe to skip once the rep is mastered"} ],
 "singletons": ["<ids not in any cluster of >=2 questions>"],
 "examiner_mindset": ["5-10 sharp bullets: favourite formats, traps, distractor habits, number reuse, how difficulty is distributed, cross-unit overlaps, what he NEVER asks"],
 "formulas": [ {"name": "...", "formula": "...", "used_in": ["<ids>"], "note": "when/trap"} ],   // all formulas, rules and must-memorise facts that recur (aim 10-30)
 "study_plan": [ {"step": 1, "focus": "...", "topics": ["..."], "hours": float, "do": "what to do, incl. which cluster reps to solve"} ],
 "minimum_set": ["<ids: representatives + singletons-worth-doing that cover the unit>"]
}
Rules: every question id appears in exactly one cluster's members OR in singletons (a cluster needs >=2 members; the representative must be the cleanest, most instructive member, preferably from a recent paper). A question may NOT be in two clusters. Be accurate: base priority on actual counts/recency, not guesses (priority Must = >=10% of the unit or appears in >=60% of papers with rising/steady trend). Formulas must be correct.
Validate with a Python script (put scripts ONLY in your own new dir /private/tmp/claude-501/unit<N>_own/ because other agents share the scratchpad): all ids covered exactly once, all topic strings valid, reps in members, JSON valid. Fix until clean. Reply with only: unit, cluster count, singleton count, and any caveats.
