"""Write one paste-ready tutor prompt per unit to analysis/prompts/ (kept under ChatGPT's 8000-character Custom GPT limit)."""
import json
LIMIT = 8000
m = json.load(open('quiz-app/src/data/study_map.json'))
SHORT = {1:'Discrete Structures',2:'Computer System Architecture',3:'Programming & Graphics',4:'DBMS',5:'Operating Systems',6:'Software Engineering',7:'Data Structures & Algorithms',8:'TOC & Compilers',9:'Networks',10:'Artificial Intelligence',11:'General Paper 1'}
def one(s): return ' '.join(str(s).split())

def cut(s, n): s = one(s); return s if len(s) <= n else s[:n - 1].rstrip() + '…'

# level 0 = everything; higher levels shorten each section until the prompt fits
CAPS = [dict(focus=3, fw=10**6, nt=10**6, nm=10**6, nf=10**6, ndo=10**6, notes=True),
        dict(focus=2, fw=200, nt=220, nm=230, nf=170, ndo=170, notes=False),
        dict(focus=2, fw=140, nt=160, nm=170, nf=130, ndo=120, notes=False),
        dict(focus=1, fw=110, nt=120, nm=130, nf=100, ndo=90, notes=False),
        dict(focus=0, fw=100, nt=70, nm=110, nf=80, ndo=60, notes=False)]

def build(u, nclusters, lv):
    c = CAPS[lv]
    paper = 'UGC NET General Paper 1' if u['unit'] == 11 else 'UGC NET Computer Science (Paper 2)'
    L = [f"You are my personal tutor for {paper}, Unit {u['unit']}: {u['name']}.",
         "", "HOW TO TEACH",
         "- Teach from the exam's point of view: what past papers asked, not the whole textbook.",
         "- Exam: 4-option MCQs, 2 marks each, no negative marking.",
         "- For practice, give ONE exam-style MCQ at a time (options A-D), wait for my answer, say right or wrong, show the shortest working, and name the trick or trap.",
         "- Start easy, raise difficulty after two right in a row, and revisit my mistakes later.",
         "- Use the QUESTION FAMILIES below as templates, but change the numbers and wording each time, as the exam does.",
         "- If a past-paper answer key looks wrong, say so and show your working. Never guess silently.",
         "- Commands: /quiz <topic>, /explain <topic>, /formulas, /plan, /mistakes (drill what I got wrong), /mock (10 mixed questions).",
         "", f"DATA: {u['total_questions']} past questions across {u['papers_covered']} papers.",
         "", "TOPIC PRIORITY (questions asked, trend)"]
    for t in u['topics']:
        foc = '; '.join(one(x) for x in t['what_to_study'][:c['focus']])
        L.append(cut(f"- {t['topic']} [{t['priority']}]: {t['count']} Qs, {t['papers']}/{u['papers_covered']} papers, {t['trend']}" + (f". Focus: {foc}" if foc else ''), c['nt'] + 60))
    L += ["", "HOW THE EXAMINER THINKS"] + [cut('- ' + x, c['nm']) for x in u['examiner_mindset']]
    L += ["", "FORMULAS AND FACTS"]
    for f in u['formulas']:
        note = f" ({one(f['note'])})" if c['notes'] and f.get('note') else ''
        L.append(cut(f"- {f['name']}: {f['formula']}", c['nf'] + 40) + note)
    L += ["", "STUDY ORDER"] + [f"{x['step']}. {cut(x['focus'], 80)} (~{x['hours']} h): {cut(x['do'], c['ndo'])}" for x in u['study_plan']]
    cl = sorted(u['clusters'], key=lambda k: -len(k['members']))[:nclusters]
    if cl:
        L += ["", "QUESTION FAMILIES (most repeated first; each is a question type the exam keeps reusing)"]
        L += [f"- {one(k['title'])} ({len(k['members'])}x): {cut(k['technique'], c['fw'])}" for k in cl]
    return '\n'.join(L)

prompts = {}
for u in m['units']:
    name = f"unit_{u['unit']:02d}_{SHORT[u['unit']].replace(' ', '_').replace('&', 'and')}.txt"
    open('analysis/prompts/full/' + name, 'w').write(build(u, len(u['clusters']), 0) + '\n')
    for lv in range(1, len(CAPS)):
        n = len(u['clusters'])
        while n > 0 and len(build(u, n, lv)) > LIMIT: n -= 1
        if n >= min(12, len(u['clusters'])) or lv == len(CAPS) - 1: break
    txt = build(u, n, lv)
    open('analysis/prompts/compact/' + name, 'w').write(txt + '\n')
    prompts[u['unit']] = {'compact': txt, 'full': build(u, len(u['clusters']), 0)}
    print(u['unit'], 'full', len(build(u, len(u['clusters']), 0)), '| compact', len(txt), f'(level {lv}, {n}/{len(u["clusters"])} families)', 'OVER' if len(txt) > LIMIT else '')

# The app serves these from /api/tutor-prompt for the copy buttons on the Study plan page
json.dump(prompts, open('quiz-app/src/data/tutor_prompts.json', 'w'), ensure_ascii=False)
