"""Validate analysis/tags/*.json against batches + taxonomy; print per-paper unit distribution."""
import json, glob, os, collections, sys
tax = json.load(open('analysis/taxonomy.json'))
bad = 0; allids = {}
for bf in sorted(glob.glob('analysis/batches/*.json')):
    name = os.path.basename(bf)
    tf = f'analysis/tags/{name}'
    if not os.path.exists(tf):
        print('MISSING', name); bad += 1; continue
    ids = [q['id'] for q in json.load(open(bf))]
    tags = json.load(open(tf))
    got = [t['id'] for t in tags]
    if sorted(ids) != sorted(got): print('ID MISMATCH', name, len(ids), len(got)); bad += 1
    for t in tags:
        u = str(t.get('unit'))
        if u not in tax or t.get('topic') not in tax[u]['topics']:
            print('BAD UNIT/TOPIC', name, t['id'], t.get('unit'), t.get('topic')); bad += 1
        allids[t['id']] = t
    c = collections.Counter(t['unit'] for t in tags)
    print(f'{name[:-5]:32s}', ' '.join(f'{k}:{c[k]}' for k in sorted(c)))
print('tagged', len(allids), 'problems', bad)
sys.exit(1 if bad else 0)
