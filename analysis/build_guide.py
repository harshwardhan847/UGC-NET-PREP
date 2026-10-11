"""Build analysis/study_guide.html (self-contained) from quiz-app/src/data/study_map.json."""
import json, glob, collections
m = json.load(open('quiz-app/src/data/study_map.json'))
src = {q['id']: q for q in json.load(open('quiz-app/src/data/ugc_net_cs_pyqs.json'))}
tags = [t for f in glob.glob('analysis/tags/*.json') for t in json.load(open(f))]
fmt = collections.Counter(t['format'] for t in tags)
diff = collections.Counter(t['difficulty'] for t in tags)
cs_papers = len({q['paper'] for q in src.values() if q['unit'] != 11})

units = []
need = set()
for u in m['units']:
    need.update(c['representative'] for c in u['clusters'])
    need.update(x for c in u['clusters'] for x in c['members'])
    units.append({
        'unit': u['unit'], 'name': u['name'], 'total': u['total_questions'], 'papers': u['papers_covered'],
        'topics': u['topics'], 'clusters': u['clusters'], 'singletons': len(u['singletons']),
        'mindset': u['examiner_mindset'], 'formulas': u['formulas'], 'plan': u['study_plan'], 'minset': len(u['minimum_set'])})
def trim(s, n): s = ' '.join(s.split()); return s if len(s) <= n else s[:n - 1] + '…'
Q = {}
for i in need:
    q = src[i]; Q[i] = {'y': q['year'].replace('December', 'Dec').replace('November', 'Nov').replace('September', 'Sep').replace('General Paper', 'Paper 1'), 'n': q['q_num']}
for u in m['units']:
    for c in u['clusters']:
        q = src[c['representative']]
        Q[c['representative']].update({'q': trim(q['question'], 520), 'o': {k: trim(v, 110) for k, v in q['options'].items()}, 'a': q['answer']})
meta = {'total': 1650, 'papers': cs_papers, 'fmt': dict(fmt), 'diff': dict(diff),
        'skippable': sum(len(c['members']) - 1 for u in m['units'] for c in u['clusters']), 'minset': sum(len(u['minimum_set']) for u in m['units'])}
data = json.dumps({'meta': meta, 'units': units, 'q': Q}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = open('analysis/study_guide_template.html').read().replace('/*DATA*/', 'const DATA = ' + data + ';')
open('analysis/study_guide.html', 'w').write(html)
print(len(html) // 1024, 'KB')
