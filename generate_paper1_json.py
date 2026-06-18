import pypdf
import os
import re
import json

# Definitions
FILE_YEAR_MAP = {
    "NTA UGC General Paper 2023.pdf": "General Paper 2023",
    "NTA UGC General Paper 2024.pdf": "General Paper 2024",
    "NTA UGC General Paper 2025.pdf": "General Paper 2025"
}

pdf_dir = "paper_1"
files = {
    2023: ("NTA UGC General Paper 2023.pdf", 6),
    2024: ("NTA UGC General Paper 2024.pdf", 5),
    2025: ("NTA UGC General Paper 2025.pdf", 5)
}

# 1. Extract and process each paper
all_new_questions = []

for year, (filename, end_q_page) in files.items():
    path = os.path.join(pdf_dir, filename)
    print(f"Processing Paper 1: {filename}...")
    reader = pypdf.PdfReader(path)
    
    # Extract questions page by page
    q_pages = []
    for idx in range(1, end_q_page):
        text = reader.pages[idx].extract_text() or ''
        q_pages.append(text)
        
    all_qs = {}
    
    # Process text page by page to locate question blocks
    for page_idx, page_text in enumerate(q_pages):
        # clean ligatures
        page_text = page_text.replace('ﬁ', 'fi').replace('ﬂ', 'fl').replace('ﬀ', 'ff').replace('ﬃ', 'ffi').replace('ﬄ', 'ffl')
        
        # Clean headers/footers
        page_text = re.sub(r'^\s*\d+\s+UGC\s+NET\s+.*', '', page_text, flags=re.IGNORECASE)
        page_text = re.sub(r'^\s*[a-z]+\s+UGC\s+NET\s+.*', '', page_text, flags=re.IGNORECASE)
        page_text = re.sub(r'UGC\s+NET\s+\(PYQs\)\s+PW', '', page_text, flags=re.IGNORECASE)
        page_text = re.sub(r'General\s+Paper\s+\[.*?\]', '', page_text, flags=re.IGNORECASE)
        page_text = re.sub(r'Clik\s+Here\s+To\s+Discover\s+More', '', page_text, flags=re.IGNORECASE)
        page_text = re.sub(r'Android\s+App.*?Website', '', page_text, flags=re.DOTALL | re.IGNORECASE)
        page_text = re.sub(r'\|\s*\|\s*\|\s*', '', page_text)
        
        matches = []
        for m in re.finditer(r'(?:^|\n)(\d+)\.\s', page_text):
            q_num = int(m.group(1))
            if 1 <= q_num <= 50:
                matches.append((q_num, m.start(), m.end()))
                
        matches.sort(key=lambda x: x[1])
        
        for i, (q_num, start, end) in enumerate(matches):
            next_start = matches[i+1][1] if i + 1 < len(matches) else len(page_text)
            q_block = page_text[end:next_start].strip()
            all_qs[q_num] = q_block
            
    # Apply column-flow splits merges
    if year == 2024 and 12 in all_qs:
        continuation = "Choose the correct answer from the options given below:\n(1) (A) and (B) Only (2) (B) and (C) Only\n(3) (C) and (D) Only (4) (A) and (C) Only"
        all_qs[12] = all_qs[12] + "\n" + continuation
        
    if year == 2025 and 10 in all_qs:
        continuation = "Choose the correct answer from the options given below:\n(1) (A)-(I), (B)-(II), (C)-(IV), (D)-(III)\n(2) (A)-(III), (B)-(II), (C)-(IV), (D)-(I)\n(3) (A)-(II), (B)-(I), (C)-(IV), (D)-(III)\n(4) (A)-(III), (B)-(I), (C)-(IV), (D)-(II)"
        all_qs[10] = all_qs[10] + "\n" + continuation
        
    # Extract solutions and answer keys
    sol_text = ""
    for idx in range(end_q_page, len(reader.pages)):
        text = reader.pages[idx].extract_text() or ''
        sol_text += f"\n--- PAGE {idx+1} ---\n" + text
        
    sol_text = sol_text.replace('ﬁ', 'fi').replace('ﬂ', 'fl').replace('ﬀ', 'ff').replace('ﬃ', 'ffi').replace('ﬄ', 'ffl')
    
    sol_matches = []
    for m in re.finditer(r'(?:^|\n|\s)(\d+)\.?\s*\(([1-4])\)', sol_text):
        q_num = int(m.group(1))
        ans_num = int(m.group(2))
        if 1 <= q_num <= 50:
            sol_matches.append((q_num, ans_num, m.start(), m.end()))
            
    sol_matches.sort(key=lambda x: x[2])
    
    solutions = {}
    answers = {}
    for i, (q_num, ans_num, start, end) in enumerate(sol_matches):
        next_start = sol_matches[i+1][2] if i + 1 < len(sol_matches) else len(sol_text)
        sol_body = sol_text[end:next_start].strip()
        sol_body = re.sub(r'--- PAGE \d+ ---', '', sol_body)
        sol_body = re.sub(r'UGC\s+NET\s+\(PYQs\)\s+PW', '', sol_body, flags=re.IGNORECASE)
        sol_body = re.sub(r'General\s+Paper\s+\[.*?\]', '', sol_body, flags=re.IGNORECASE)
        sol_body = re.sub(r'Clik\s+Here\s+To\s+Discover\s+More', '', sol_body, flags=re.IGNORECASE)
        sol_body = re.sub(r'Android\s+App.*Website', '', sol_body, flags=re.DOTALL)
        sol_body = re.sub(r'\|\s*\|\s*\|\s*', '', sol_body)
        
        ans_letter = {1: 'A', 2: 'B', 3: 'C', 4: 'D'}[ans_num]
        answers[q_num] = ans_letter
        solutions[q_num] = sol_body.strip()
        
    # Build final list of questions
    for q_num in sorted(all_qs.keys()):
        q_block = all_qs[q_num]
        
        # backward match options
        opt_matches = list(re.finditer(r'\(([1-4])\)', q_block))
        opt4_match = None
        opt3_match = None
        opt2_match = None
        opt1_match = None
        found_opts = False
        
        for m in reversed(opt_matches):
            if m.group(1) == '4' and opt4_match is None:
                opt4_match = m
            elif m.group(1) == '3' and opt4_match is not None and opt3_match is None:
                opt3_match = m
            elif m.group(1) == '2' and opt3_match is not None and opt2_match is None:
                opt2_match = m
            elif m.group(1) == '1' and opt2_match is not None and opt1_match is None:
                opt1_match = m
                found_opts = True
                break
                
        if found_opts:
            question_body = q_block[:opt1_match.start()].strip()
            opt_a = q_block[opt1_match.end():opt2_match.start()].strip()
            opt_b = q_block[opt2_match.end():opt3_match.start()].strip()
            opt_c = q_block[opt3_match.end():opt4_match.start()].strip()
            opt_d = q_block[opt4_match.end():].strip()
            options = {"A": opt_a, "B": opt_b, "C": opt_c, "D": opt_d}
        else:
            question_body = q_block
            options = {"A": "", "B": "", "C": "", "D": ""}
            
        short_year = filename.replace("NTA UGC General Paper ", "").replace(".pdf", "")
        q_id = f"gp{short_year}_q{q_num}"
        
        all_new_questions.append({
            "id": q_id,
            "year": FILE_YEAR_MAP[filename],
            "paper": filename,
            "q_num": q_num,
            "question": question_body,
            "options": options,
            "answer": answers.get(q_num, ""),
            "solution": solutions.get(q_num, ""),
            "unit": 11,
            "unit_name": "General Paper 1"
        })
        
    print(f"Extracted: {filename} -> {len(all_qs)} questions, {len(answers)} answers, {len(solutions)} solutions.")

print(f"Total extracted Paper 1 questions: {len(all_new_questions)}")
assert len(all_new_questions) == 150, f"Expected 150 questions, got {len(all_new_questions)}"

# Load existing CS questions
cs_json_path = "ugc_net_cs_pyqs.json"
with open(cs_json_path, "r", encoding="utf-8") as f:
    all_questions = json.load(f)
    
print(f"Loaded existing CS questions: {len(all_questions)}")
assert len(all_questions) == 1500, f"Expected 1500 questions, got {len(all_questions)}"

# Merge
merged_questions = all_questions + all_new_questions
print(f"Merged total questions: {len(merged_questions)}")
assert len(merged_questions) == 1650, f"Expected 1650 questions, got {len(merged_questions)}"

# Save back to root
with open(cs_json_path, "w", encoding="utf-8") as f:
    json.dump(merged_questions, f, indent=2, ensure_ascii=False)
print(f"Saved merged questions to {cs_json_path}")

# Save to quiz-app copy
app_json_path = "quiz-app/src/data/ugc_net_cs_pyqs.json"
with open(app_json_path, "w", encoding="utf-8") as f:
    json.dump(merged_questions, f, indent=2, ensure_ascii=False)
print(f"Saved merged questions to {app_json_path}")
