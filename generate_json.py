import os
import re
import json
import glob
import pypdf
from collections import Counter

# 1. Syllabus Units definition
UNITS = {
    1: "Discrete Structures and Optimization",
    2: "Computer System Architecture",
    3: "Programming Languages & Computer Graphics",
    4: "Database Management Systems (DBMS)",
    5: "System Software and Operating System",
    6: "Software Engineering",
    7: "Data Structures and Algorithms",
    8: "Theory of Computation and Compilers",
    9: "Data Communication and Computer Networks",
    10: "Artificial Intelligence (AI)"
}

# 2. File to friendly-name mapping
FILE_YEAR_MAP = {
    "UGC_Comp_Dec2018.pdf": "December 2018",
    "UGC_Comp_Dec2019.pdf": "December 2019",
    "UGC_Comp_Dec2022.pdf": "December 2022",
    "UGC_Comp_Dec2022_ShiftII.pdf": "December 2022 (Shift II)",
    "UGC_Comp_Dec2023.pdf": "December 2023",
    "UGC_Comp_Dec2024.pdf": "December 2024",
    "UGC_Comp_July2018.pdf": "July 2018",
    "UGC_Comp_June2019.pdf": "June 2019",
    "UGC_Comp_June2023.pdf": "June 2023",
    "UGC_Comp_June2024_Cancelled.pdf": "June 2024 (Cancelled)",
    "UGC_Comp_June2024_ReExam.pdf": "June 2024 (Re-Exam)",
    "UGC_Comp_June2025.pdf": "June 2025",
    "UGC_Comp_Nov2020.pdf": "November 2020",
    "UGC_Comp_Nov2021.pdf": "November 2021",
    "UGC_Comp_Sep2022.pdf": "September 2022"
}

# Ligature normalization dictionary for PDF text clean up
LIGATURE_MAP = {
    'ﬁ': 'fi',
    'ﬂ': 'fl',
    'ﬀ': 'ff',
    'ﬃ': 'ffi',
    'ﬄ': 'ffl'
}

def clean_ligatures(text):
    for lig, rep in LIGATURE_MAP.items():
        text = text.replace(lig, rep)
    return text

# 3. Extensive keyword maps for classification
UNIT_RULES = {
    1: {
        "phrases": [
            "propositional logic", "predicate logic", "truth table", "equivalence relation", "hasse diagram", 
            "graph theory", "handshake lemma", "planar graph", "linear programming", "simplex method", 
            "recurrence relation", "generating function", "bayes theorem", "bayes' theorem", "hamiltonian", 
            "eulerian", "directed graph", "undirected graph", "isomorphic", "chromatic number", "poset", 
            "lattice", "boolean algebra", "group theory", "partial order", "equivalence class",
            "mathematical logic", "first order logic", "well ordered", "generating functions",
            "recurrence relations", "pert cpm", "critical path method", "transportation problem",
            "assignment problem", "set theory", "power set", "venn diagram", "truth values", "valid argument"
        ],
        "keywords": [
            "tautology", "propositional", "quantifier", "quantifiers", "poset", "posets", "lattice", "lattices",
            "isomorphism", "hamiltonian", "eulerian", "chromatic", "duality", "transportation", "simplex",
            "permutation", "permutations", "combination", "combinations", "probability", "bayes", "fuzzy",
            "contrapositive", "conjunction", "disjunction", "bijection", "injection", "surjection",
            "reflexive", "symmetric", "transitive", "transitivity", "reflexivity", "symmetrics", "cpm", "pert",
            "venn", "subsets", "subset"
        ]
    },
    2: {
        "phrases": [
            "k-map", "karnaugh map", "flip-flop", "multiplexer", "demultiplexer", "addressing mode", 
            "cache memory", "dma transfer", "direct memory access", "pipeline hazard", "instruction cycle", 
            "floating point", "2's complement", "excess-3", "gray code", "flynn's classification", 
            "register transfer", "micro-operation", "digital circuit", "full adder", "half adder", 
            "decoder circuit", "encoder circuit", "memory hierarchy", "cache mapping", "cache hit",
            "flip flop", "control unit", "instruction format", "program counter", "microprogrammed control",
            "associative memory", "virtual memory", "input output interface", "io interface", "bus grant",
            "subtraction is generally", "carry look ahead", "booth's algorithm", "booths algorithm"
        ],
        "keywords": [
            "jk", "mux", "demux", "counter", "counters", "register", "registers", "alu", "cisc", "risc", 
            "pipeline", "pipelines", "pipelining", "hazard", "hazards", "multiprocessor", "multiprocessors",
            "decoder", "decoders", "encoder", "encoders", "microprogram", "microprogrammed", "interrupt", 
            "interrupts", "microoperation", "microoperations", "subtraction", "adder", "adders", "gate", "gates",
            "booth", "opcode", "cache", "boolean", "instruction"
        ]
    },
    3: {
        "phrases": [
            "c program", "c++", "object-oriented", "virtual function", "pure virtual", "operator overloading", 
            "copy constructor", "multiple inheritance", "bresenham", "dda line", "2d transformation", 
            "3d transformation", "projection matrix", "cohen-sutherland", "clipping algorithm", "bezier curve", 
            "b-spline", "z-buffer", "gouraud shading", "phong shading", "hidden surface", "raster scan",
            "hidden surface removal", "midpoint circle", "viewing transformation", "method overloading",
            "method overriding", "constructor invoking", "base class", "derived class", "class template",
            "friend function", "object oriented"
        ],
        "keywords": [
            "oop", "inheritance", "polymorphism", "encapsulation", "destructor", "destructors", 
            "constructor", "constructors", "pointer", "pointers", "clipping", "raster", "pixel", "pixels", 
            "shading", "bresenham", "bezier", "spline", "viewport", "gouraud", "phong", "graphics",
            "translation", "scaling", "rotation", "reflection", "shear", "shearing", "java", "html", "css", "xml", "javascript"
        ]
    },
    4: {
        "phrases": [
            "relational model", "primary key", "foreign key", "candidate key", "relational algebra", 
            "sql query", "create table", "functional dependency", "database normalization", "bcnf", 
            "3nf", "2nf", "1nf", "transaction schedule", "conflict serializable", "2pl", "two-phase locking", 
            "nosql", "mongodb", "acid properties", "outer join", "natural join", "referential integrity",
            "lossless join", "dependency preserving", "query processing", "query optimization",
            "er diagram", "er model", "lossless decomposition", "multi valued dependency", "dbms", "rdbms"
        ],
        "keywords": [
            "database", "databases", "schema", "schemas", "tuple", "tuples", "attribute", "attributes", 
            "join", "joins", "sql", "serializability", "concurrency", "indexing", "nosql", "mongodb",
            "superkey", "dependency", "dependencies"
        ]
    },
    5: {
        "phrases": [
            "cpu scheduling", "round robin", "deadlock detection", "deadlock prevention", "banker's algorithm", 
            "page replacement", "thrashing", "disk scheduling", "c-scan", "system calls", "critical section", 
            "page table", "unix shell", "process synchronization", "dining philosophers", "readers-writers", 
            "producer-consumer", "critical region", "mutual exclusion", "address translation", "page fault",
            "bankers algorithm", "process state", "page size", "virtual address", "physical address",
            "frame size", "dirty bit", "demand paging"
        ],
        "keywords": [
            "semaphore", "semaphores", "mutex", "deadlock", "deadlocks", "paging", "segmentation", "tlb", 
            "sstf", "linux", "unix", "assembler", "linker", "loader", "operating", "kernel", "inode",
            "disk"
        ]
    },
    6: {
        "phrases": [
            "software engineering", "waterfall model", "spiral model", "agile scrum", "cleanroom", 
            "dfd", "use case diagram", "class diagram", "cohesion", "coupling", "cocomo", "function point", 
            "cyclomatic complexity", "software testing", "black-box", "white-box", "path testing", 
            "regression testing", "software metrics", "software requirements specification", "srs",
            "software configuration", "software maintenance", "extreme programming", "sdlc",
            "capability maturity model", "cmmi", "cleanroom software", "software quality", "object points"
        ],
        "keywords": [
            "agile", "scrum", "requirements", "cohesion", "coupling", "testing", "refactoring", "cmmi", 
            "validation", "verification", "cocomo", "sdlc"
        ]
    },
    7: {
        "phrases": [
            "time complexity", "big o", "space complexity", "asymptotic notation", "master theorem", 
            "binary search tree", "avl tree", "red-black tree", "max heap", "min heap", "merge sort", 
            "quicksort", "heapsort", "hash table", "binary search", "dijkstra", "kruskal", "prim's", 
            "bellman-ford", "floyd-warshall", "longest common subsequence", "fractional knapsack", 
            "huffman coding", "np-complete", "np-hard", "mst", "topological sort", "dynamic programming", 
            "greedy algorithm", "divide and conquer", "bfs", "dfs", "binary tree", "complete binary tree",
            "binary search tree", "recurrence equation", "asymptotic complexity"
        ],
        "keywords": [
            "complexity", "theta", "omega", "asymptotic", "stack", "stacks", "queue", "queues", "list", "lists", 
            "sorting", "hashing", "heap", "heaps", "bst", "searching", "backtracking", "knapsack", "huffman",
            "dijkstra", "kruskal", "prim", "warshall", "knapsack", "np", "tree", "node", "nodes", "substring", "substrings"
        ]
    },
    8: {
        "phrases": [
            "finite automata", "dfa", "nfa", "regular expression", "context-free grammar", "pda", 
            "pushdown automata", "turing machine", "halting problem", "chomsky hierarchy", "lexical analyzer", 
            "syntax-directed translation", "three-address code", "code optimization", "symbol table", 
            "shift-reduce parser", "lalr parser", "ll(1)", "lr(1)", "regular language", "pumping lemma", 
            "operator precedence", "intermediate code", "loop optimization", "lexical analysis",
            "pushdown automaton", "turing machines", "context free", "regular expression", "regular set",
            "unrestricted grammar", "syntax analyzer"
        ],
        "keywords": [
            "automaton", "automata", "decidability", "undecidable", "cfg", "parser", "parsers", "parsing", 
            "compiler", "compilers", "token", "tokens", "lex", "yacc", "grammar", "grammars", "sdt", "dag",
            "dfa", "nfa", "pda", "chomsky"
        ]
    },
    9: {
        "phrases": [
            "osi model", "tcp/ip", "nyquist theorem", "shannon capacity", "sliding window protocol", 
            "go-back-n", "selective repeat", "csma/cd", "csma/ca", "routing protocol", "distance vector", 
            "link state", "ip address", "ipv4", "ipv6", "subnet mask", "cidr", "tcp connection", 
            "udp packet", "cryptography", "rsa algorithm", "digital signature", "firewall", "ipsec",
            "data link layer", "physical layer", "transport layer", "application layer", "network layer",
            "session layer", "presentation layer", "error control", "flow control", "leaky bucket",
            "token bucket", "message digest", "public key", "private key", "diffie hellman"
        ],
        "keywords": [
            "ethernet", "routing", "subnetting", "tcp", "udp", "congestion", "networks", "network", 
            "aes", "des", "symmetric", "asymmetric", "cipher", "decryption", "encryption", "rsa",
            "cryptography", "firewall"
        ]
    },
    10: {
        "phrases": [
            "artificial intelligence", "heuristic search", "a* search", "ao* search", "minimax algorithm", 
            "alpha-beta pruning", "first-order logic", "expert systems", "fuzzy logic", "fuzzy set", 
            "membership function", "neural network", "backpropagation", "deep learning", 
            "natural language processing", "nlp", "machine learning", "k-means clustering", "decision tree", 
            "genetic algorithm", "state space", "knowledge representation", "propositional logic",
            "artificial neural", "membership functions", "alpha beta", "minimax", "first order logic",
            "resolution refutation", "predicate calculus"
        ],
        "keywords": [
            "ai", "heuristic", "minimax", "fol", "unification", "expert", "fuzzy", "ann", "perceptron", 
            "nlp", "clustering", "unsupervised", "supervised", "reinforcement", "agent", "agents"
        ]
    }
}

def clean_page(text):
    # Remove header
    text = re.sub(r'^\s*UGC\s+NET\s*', '', text, flags=re.IGNORECASE)
    # Remove footer (Android App iOS App PW Website)
    text = re.sub(r'Android\s+App.*?Website', '', text, flags=re.DOTALL | re.IGNORECASE)
    # Remove vertical bar footers
    text = re.sub(r'\|\s*\|\s*\|\s*', '', text)
    # Clean ligatures
    text = clean_ligatures(text)
    return text.strip()

def classify_question(question_text, options_text, solution_text):
    combined = f"{question_text} {options_text} {solution_text}".lower()
    normalized = re.sub(r'[^a-z0-9\s]', ' ', combined)
    
    scores = {unit: 0 for unit in UNITS}
    
    for unit, rules in UNIT_RULES.items():
        # Score phrases
        for phrase in rules["phrases"]:
            if re.search(r'\b' + re.escape(phrase.lower()) + r'\b', normalized):
                scores[unit] += 12
                
        # Score keywords
        for keyword in rules["keywords"]:
            if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', normalized):
                scores[unit] += 3
                
    # Fine-tuning overrides to avoid overlap errors
    if 'sql' in normalized or 'relational algebra' in normalized:
        scores[4] += 30
    if 'k-map' in normalized or 'flip flop' in normalized or 'multiplexer' in normalized:
        scores[2] += 30
    if 'c++' in normalized or 'bresenham' in normalized or 'opengl' in normalized:
        scores[3] += 30
    if 'deadlock' in normalized and ('process' in normalized or 'scheduling' in normalized):
        scores[5] += 20
    if 'waterfall' in normalized or 'cocomo' in normalized or 'software testing' in normalized:
        scores[6] += 30
    if 'turing machine' in normalized or 'cfg' in normalized or 'dfa' in normalized:
        scores[8] += 30
    if 'tcp' in normalized or 'ip address' in normalized or 'routing' in normalized:
        scores[9] += 30
    if 'fuzzy' in normalized or 'neural network' in normalized or 'heuristic' in normalized:
        scores[10] += 30
        
    best_unit = max(scores, key=scores.get)
    if scores[best_unit] == 0:
        return 1
    return best_unit

def process_file(pf):
    print(f"Processing: {pf}...")
    reader = pypdf.PdfReader(pf)
    
    # 1. Answer Key page detection
    ans_key_page = -1
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        if re.search(r'\banswer\s+key\b', text.lower()) and ans_key_page == -1:
            ans_key_page = i
            break
            
    # 2. Hints/Solutions page detection
    hints_page = -1
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        if re.search(r'hints\s*(?:&\s*)?solutions', text.lower()) and i > ans_key_page:
            hints_page = i
            break
            
    if ans_key_page == -1 or hints_page == -1:
        print(f"ERROR: {pf} is missing Answer Key or Hints/Solutions markers.")
        return []
        
    # 3. Extract and parse Answers (pre-clean with ligature mapping)
    ans_text = ''
    for i in range(ans_key_page, hints_page):
        ans_text += clean_ligatures(reader.pages[i].extract_text() or '')
    answers = {}
    for num, ans in re.findall(r'Q(\d+)\s*\(([A-D])\)', ans_text):
        answers[int(num)] = ans
        
    # 4. Extract and parse Solutions
    sol_text = ''
    for i in range(hints_page, len(reader.pages)):
        page_text = clean_ligatures(reader.pages[i].extract_text() or '')
        sol_text += f"\n--- PAGE {i+1} ---\n" + page_text
        
    sol_positions = []
    for m in re.finditer(r'\bQ(\d+)\.?\s*Text\s*Solution', sol_text, re.IGNORECASE):
        sol_positions.append((int(m.group(1)), m.start(), m.end()))
    sol_positions.sort()
    
    solutions = {}
    for idx, (q_num, start, end) in enumerate(sol_positions):
        next_start = sol_positions[idx+1][1] if idx+1 < len(sol_positions) else len(sol_text)
        raw_sol = sol_text[end:next_start].strip()
        raw_sol = re.sub(r'--- PAGE \d+ ---', '', raw_sol)
        raw_sol = re.sub(r'Android App.*Website', '', raw_sol, flags=re.DOTALL)
        raw_sol = re.sub(r'\|\s*\|\s*\|\s*', '', raw_sol)
        raw_sol = re.sub(r'^\s*:\s*', '', raw_sol)
        solutions[q_num] = raw_sol.strip()
        
    # 5. Extract and parse Questions
    cleaned_q_pages = []
    for i in range(ans_key_page):
        p_text = reader.pages[i].extract_text() or ''
        cleaned_q_pages.append(clean_page(p_text))
    questions_text = '\n'.join(cleaned_q_pages)
    
    q_positions = []
    for q_num in range(1, 101):
        pattern = rf'\bQ{q_num}\b|\bQ{q_num}(?=[A-Za-z])|\bQ{q_num}\n'
        match = re.search(pattern, questions_text)
        if not match:
            match = re.search(rf'Q{q_num}', questions_text)
        if match:
            q_positions.append((q_num, match.start(), match.end()))
    q_positions.sort()
    
    file_questions = []
    for idx, (q_num, start, end) in enumerate(q_positions):
        next_start = q_positions[idx+1][1] if idx+1 < len(q_positions) else len(questions_text)
        raw_q_block = questions_text[end:next_start].strip()
        
        # Backward match options
        matches = list(re.finditer(r'\(([A-D])\)', raw_q_block))
        
        d_match = None
        c_match = None
        b_match = None
        a_match = None
        found_opts = False
        
        for m in reversed(matches):
            if m.group(1) == 'D' and d_match is None:
                d_match = m
            elif m.group(1) == 'C' and d_match is not None and c_match is None:
                c_match = m
            elif m.group(1) == 'B' and c_match is not None and b_match is None:
                b_match = m
            elif m.group(1) == 'A' and b_match is not None and a_match is None:
                a_match = m
                found_opts = True
                break
                
        if found_opts:
            question_body = raw_q_block[:a_match.start()].strip()
            opt_a = raw_q_block[a_match.end():b_match.start()].strip()
            opt_b = raw_q_block[b_match.end():c_match.start()].strip()
            opt_c = raw_q_block[c_match.end():d_match.start()].strip()
            opt_d = raw_q_block[d_match.end():].strip()
            options = {"A": opt_a, "B": opt_b, "C": opt_c, "D": opt_d}
        else:
            # Fallback if parsing failed
            question_body = raw_q_block
            options = {"A": "", "B": "", "C": "", "D": ""}
            
        ans = answers.get(q_num, "")
        sol = solutions.get(q_num, "")
        
        # Categorize
        unit_id = classify_question(question_body, f"{opt_a} {opt_b} {opt_c} {opt_d}" if found_opts else "", sol)
        
        # Create user-friendly ID
        short_year = pf.replace("UGC_Comp_", "").replace(".pdf", "").lower()
        q_id = f"{short_year}_q{q_num}"
        
        file_questions.append({
            "id": q_id,
            "year": FILE_YEAR_MAP[pf],
            "paper": pf,
            "q_num": q_num,
            "question": question_body,
            "options": options,
            "answer": ans,
            "solution": sol,
            "unit": unit_id,
            "unit_name": UNITS[unit_id]
        })
        
    print(f"  Extracted: {len(file_questions)} Qs, Options: {sum(1 for q in file_questions if q['options']['A'] != '')}, Answers: {len(answers)}, Solutions: {len(solutions)}")
    return file_questions

def main():
    pdf_files = sorted(glob.glob("UGC_Comp_*.pdf"))
    all_questions = []
    
    for pf in pdf_files:
        all_questions.extend(process_file(pf))
        
    print(f"\nTotal questions collected: {len(all_questions)}")
    
    # Validation checks
    assert len(all_questions) == 1500, f"Expected 1500 questions, got {len(all_questions)}"
    
    # Save to JSON
    output_path = "ugc_net_cs_pyqs.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved to {output_path}")
    
    # Print statistics
    unit_counts = Counter(q["unit"] for q in all_questions)
    print("\n--- Unit Distribution Summary ---")
    for unit_id in sorted(UNITS.keys()):
        count = unit_counts.get(unit_id, 0)
        percentage = (count / len(all_questions)) * 100
        print(f"Unit {unit_id:2d} ({UNITS[unit_id]:<45}): {count:3d} questions ({percentage:.2f}%)")

if __name__ == "__main__":
    main()
