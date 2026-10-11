"""Group all tagged questions by corrected unit -> analysis/unit_inputs/unit_<n>.json (full question text + tags)."""
import json, glob, os
os.makedirs('analysis/unit_inputs', exist_ok=True)
src = {q['id']: q for q in json.load(open('quiz-app/src/data/ugc_net_cs_pyqs.json'))}
by = {}
for f in glob.glob('analysis/tags/*.json'):
    for t in json.load(open(f)):
        q = src[t['id']]
        by.setdefault(t['unit'], []).append({
            'id': t['id'], 'year': q['year'], 'topic': t['topic'], 'subtopic': t['subtopic'], 'archetype': t['archetype'],
            'format': t['format'], 'formula': t['formula'], 'key_fact': t['key_fact'], 'difficulty': t['difficulty'],
            'question': q['question'][:900], 'options': q['options'], 'answer': q['answer'], 'solution': (q['solution'] or '')[:500]})
for u, rows in sorted(by.items()):
    rows.sort(key=lambda r: (r['topic'], r['archetype']))
    json.dump(rows, open(f'analysis/unit_inputs/unit_{u}.json', 'w'))
    print(u, len(rows), os.path.getsize(f'analysis/unit_inputs/unit_{u}.json') // 1024, 'KB')
