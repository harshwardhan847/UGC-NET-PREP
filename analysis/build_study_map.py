"""Merge analysis/tags + analysis/units into quiz-app/src/data/study_map.json and write corrected units back to the question JSONs."""
import json, glob, os, sys, collections
tax = json.load(open('analysis/taxonomy.json'))
tags = {}
for f in glob.glob('analysis/tags/*.json'):
    for t in json.load(open(f)): tags[t['id']] = t
errors = []
units, cluster_of, rep_of, topic_of = [], {}, set(), {}
for n in range(1, 12):
    p = f'analysis/units/unit_{n}.json'
    if not os.path.exists(p): errors.append(f'missing {p}'); continue
    u = json.load(open(p)); units.append(u)
    seen = {}
    for c in u['clusters']:
        if len(c['members']) < 2: errors.append(f"{c['id']} has <2 members")
        if c['representative'] not in c['members']: errors.append(f"{c['id']} rep not in members")
        if c['topic'] not in tax[str(n)]['topics']: errors.append(f"{c['id']} bad topic {c['topic']}")
        for m in c['members']:
            if m in seen: errors.append(f'{m} in {seen[m]} and {c["id"]}')
            seen[m] = c['id']; cluster_of[m] = c['id']; topic_of[m] = c['topic']  # the cluster's topic wins over the per-question tag
            if tags.get(m, {}).get('unit') != n: errors.append(f'{m} in unit {n} cluster but tagged unit {tags.get(m,{}).get("unit")}')
        rep_of.add(c['representative'])
    for s in u['singletons']:
        if s in seen: errors.append(f'{s} both singleton and clustered')
        seen[s] = None
    expect = {i for i, t in tags.items() if t['unit'] == n}
    if set(seen) != expect: errors.append(f'unit {n}: missing {sorted(expect-set(seen))[:5]} extra {sorted(set(seen)-expect)[:5]}')
    for t in u['topics']:
        if t['topic'] not in tax[str(n)]['topics']: errors.append(f"unit {n} bad topic {t['topic']}")
if errors:
    print('\n'.join(errors[:60])); print(len(errors), 'errors'); sys.exit(1)
out_tags = {i: {'unit': t['unit'], 'topic': topic_of.get(i, t['topic']), 'subtopic': t['subtopic'], 'archetype': t['archetype'], 'format': t['format'],
                'clusterId': cluster_of.get(i), 'isRep': i in rep_of} for i, t in tags.items()}
json.dump({'tags': out_tags, 'units': units}, open('quiz-app/src/data/study_map.json', 'w'), separators=(',', ':'))
for path in ('ugc_net_cs_pyqs.json', 'quiz-app/src/data/ugc_net_cs_pyqs.json'):
    d = json.load(open(path))
    for q in d:
        q['unit'] = tags[q['id']]['unit']; q['unit_name'] = tax[str(q['unit'])]['name']
    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
cnt = collections.Counter(t['unit'] for t in tags.values())
print('ok', len(out_tags), 'tags;', len(set(cluster_of.values())), 'clusters;', dict(sorted(cnt.items())))
