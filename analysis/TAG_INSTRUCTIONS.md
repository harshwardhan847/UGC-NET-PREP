# Tagging instructions
Input: analysis/batches/<paper>.json (list of {id,q_num,question,options,answer,solution,current_unit}). `current_unit` is OFTEN WRONG; ignore it.
Taxonomy: analysis/taxonomy.json (unit id -> {name, topics[]}). Pick `unit` and `topic` from it EXACTLY (topic string must match a list entry verbatim). CS papers use units 1-10; General Paper files use only unit 11.
Read EVERY question yourself (cat the file in chunks of ~25 questions); do not use keyword heuristics. For passage-based questions (text starts "Passage (Qx-Qy)") tag by what the question actually tests.
Output: analysis/tags/<paper>.json = JSON list, one object per input question, same ids, with keys:
- id
- unit (int), topic (exact taxonomy string)
- subtopic: short free text, 2-5 words, specific (e.g. "Banker's algorithm safe sequence", "CIDR hosts per subnet")
- archetype: the reusable skill/question-type, 4-10 words, phrased so that two questions testing the same skill get near-identical wording (e.g. "count minimum spanning trees edges", "compute effective memory access time")
- format: one of recall | numerical | match-list | assertion-reason | statement-true-false | sequence-order | code-output | passage | multi-statement-combo
- formula: exact formula/rule needed, or "" if none
- key_fact: one line, the fact/answer logic the examiner is testing
- difficulty: 1 easy, 2 medium, 3 hard
Write the file with a Python script or heredoc via Bash, then validate: valid JSON, count equals input count, every id present, every unit/topic valid against taxonomy. Fix and re-validate until clean. Reply with only: paper name, count, and the number of questions whose unit differs from current_unit.
