const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const JSON_PATH = path.join(__dirname, '../src/data/ugc_net_cs_pyqs.json');

// Definitions of Units
const UNITS = {
  1: "Discrete Structures and Optimization",
  2: "Computer System Architecture",
  3: "Programming Languages & Computer Graphics",
  4: "Database Management Systems (DBMS)",
  5: "System Software and Operating System",
  6: "Software Engineering",
  7: "Data Structures and Algorithms",
  8: "Theory of Computation and Compilers",
  9: "Data Communication and Computer Networks",
  10: "Artificial Intelligence (AI)",
  11: "General Paper 1"
};

// Granular concept mapping rules for classification
const CONCEPT_RULES = {
  1: {
    "Graph Theory": [
      "graph", "graphs", "planar", "euler", "hamilton", "chromatic", "handshake", "isomorphic", 
      "bipartite", "complete graph", "vertex", "vertices", "edge", "edges", "degree", "tree", "trees",
      "clique", "connectivity", "matching"
    ],
    "Mathematical Logic & Tautologies": [
      "logic", "propositional", "predicate", "tautology", "first order", "wff", "valid argument", 
      "truth table", "statement", "quantifier", "quantifiers", "negation", "implication", "converse", 
      "contrapositive", "equivalence", "satisfiability", "inference"
    ],
    "Set Theory & Relations": [
      "set", "sets", "relation", "relations", "equivalence relation", "equivalence class", "power set", 
      "venn", "reflexive", "symmetric", "transitive", "transitivity", "cartesian product", "subset", 
      "subsets", "bijection", "injection", "surjection", "one-to-one", "onto", "function", "functions"
    ],
    "Lattices, Posets & Boolean Algebra": [
      "hasse", "poset", "posets", "lattice", "lattices", "partial order", "distributive", "complemented", 
      "boolean algebra", "atoms", "join", "meet"
    ],
    "Combinatorics & Counting": [
      "permutation", "permutations", "combination", "combinations", "pigeonhole", "factorial", 
      "counting", "inclusion-exclusion", "binomial coefficient"
    ],
    "Group Theory & Abstract Algebra": [
      "group", "groups", "subgroup", "subgroups", "abelian", "cyclic", "order of group", "monoid", 
      "semigroup", "isomorphism", "homomorphism", "coset", "cosets"
    ],
    "Linear Programming & Optimization": [
      "linear programming", "simplex", "duality", "transportation", "assignment", "lpp", 
      "objective function", "constraints", "feasible region"
    ],
    "Probability & Bayes Theorem": [
      "probability", "bayes", "random variable", "conditional probability", "expectation", "variance", 
      "distribution", "coin", "coins", "dice", "cards"
    ],
    "Fuzzy Sets & Logic": [
      "fuzzy", "membership function", "alpha cut", "fuzzy set", "fuzzy relation"
    ],
    "PERT & CPM": [
      "pert", "cpm", "critical path", "float", "slack", "earliest start", "latest start"
    ]
  },
  2: {
    "Boolean Minimization & K-Maps": [
      "k-map", "karnaugh", "boolean expression", "implicant", "minimization", "sop", "pos", 
      "sum of products", "product of sums", "simplify", "logic gate", "logic gates", "nand", "nor", 
      "xor", "xnor", "and gate", "or gate", "not gate"
    ],
    "Combinational Circuits": [
      "multiplexer", "demultiplexer", "mux", "demux", "adder", "adders", "full adder", "half adder", 
      "decoder", "decoders", "encoder", "encoders", "carry look ahead"
    ],
    "Sequential Circuits & Flip-Flops": [
      "flip-flop", "flip flop", "flipflops", "jk", "sr", "d flip", "t flip", "counter", "counters", 
      "register", "registers", "shift register", "ripple counter", "synchronous counter"
    ],
    "Addressing Modes": [
      "addressing mode", "addressing modes", "indirect addressing", "relative addressing", 
      "index addressing", "immediate addressing", "register addressing", "direct addressing"
    ],
    "Cache Memory & Mapping": [
      "cache", "cache mapping", "direct mapping", "associative mapping", "set-associative", 
      "hit ratio", "miss ratio", "cache hit", "cache miss", "lru cache"
    ],
    "Pipelining & Hazards": [
      "pipeline", "pipelining", "hazard", "hazards", "speedup", "stalls", "branch prediction", 
      "data hazard", "control hazard", "structural hazard"
    ],
    "DMA & I/O Data Transfer": [
      "dma", "direct memory access", "interrupt", "interrupts", "i/o interface", "programmed i/o", 
      "bus grant", "bus arbitration", "daisy chaining"
    ],
    "Number System & Representations": [
      "complement", "2's complement", "1's complement", "floating point", "ieee 754", "excess-3", 
      "gray code", "binary", "hexadecimal", "octal", "base 10"
    ],
    "CPU Organization & Control Unit": [
      "register transfer", "micro-operation", "micro-operations", "control unit", "program counter", 
      "microprogrammed", "hardwired", "instruction cycle", "alu", "cisc", "risc", "accumulator", 
      "stack organization"
    ],
    "Arithmetic Algorithms": [
      "booth's", "booths", "multiplication algorithm", "restoring division", "non-restoring"
    ]
  },
  3: {
    "C & C++ Programming": [
      "c program", "c++", "pointer", "pointers", "structure", "union", "recursion", "array", 
      "arrays", "scope", "storage class", "parameter passing", "call by value", "call by reference", 
      "printf", "scanf"
    ],
    "Object-Oriented Programming (OOP)": [
      "object-oriented", "object oriented", "oop", "virtual function", "pure virtual", "overloading", 
      "overriding", "copy constructor", "inheritance", "constructor", "destructor", "polymorphism", 
      "encapsulation", "friend function", "class templates", "access specifier", "java", "classes", 
      "objects"
    ],
    "Line & Circle Drawing Algorithms": [
      "bresenham", "dda", "midpoint circle", "line drawing", "raster scan", "random scan"
    ],
    "2D & 3D Transformations": [
      "transformation", "transformations", "projection", "projections", "translation", "scaling", 
      "rotation", "reflection", "shear", "shearing", "homogeneous coordinates", "matrix representation"
    ],
    "Clipping Algorithms": [
      "cohen-sutherland", "clipping", "sutherland-hodgman", "polygon clipping", "line clipping"
    ],
    "Curves & Surfaces": [
      "bezier", "spline", "curves", "control points", "b-spline"
    ],
    "Visible Surface & Shading": [
      "z-buffer", "gouraud", "phong", "hidden surface", "depth buffer", "back face", "shading", 
      "illumination", "ambient", "specular", "diffuse"
    ],
    "Web Technologies & Markup": [
      "html", "css", "xml", "javascript", "servlet", "jsp", "asp", "web server"
    ]
  },
  4: {
    "Relational Model & Relational Algebra": [
      "relational algebra", "relational calculus", "tuple relational", "domain relational", 
      "selection", "projection", "join", "outer join", "natural join", "division operator", 
      "relational model", "cartesian product"
    ],
    "SQL Queries & Commands": [
      "sql", "select", "insert", "update", "delete", "create table", "group by", "having", 
      "nested query", "subquery", "aggregate function"
    ],
    "Normalization & Functional Dependencies": [
      "functional dependency", "functional dependencies", "normalization", "candidate key", 
      "superkey", "primary key", "foreign key", "1nf", "2nf", "3nf", "bcnf", "4nf", "5nf", 
      "lossless decomposition", "dependency preserving", "lossless join", "closure of attribute", 
      "minimal cover"
    ],
    "Transactions & Concurrency Control": [
      "transaction", "transactions", "schedule", "schedules", "serializable", "serializability", 
      "conflict", "view serializable", "2pl", "two-phase locking", "acid", "deadlock", "timestamp ordering", 
      "recovery", "wal", "checkpoints"
    ],
    "Indexing & File Structures": [
      "indexing", "b tree", "b+ tree", "dense index", "sparse index", "primary index", "clustering index", 
      "secondary index", "hashing in dbms"
    ],
    "ER Model & Schema Design": [
      "er diagram", "er model", "entity set", "relationship set", "participation", "cardinality", 
      "weak entity", "attributes"
    ]
  },
  5: {
    "CPU Scheduling": [
      "cpu scheduling", "scheduling", "round robin", "fcfs", "sjf", "srtf", "priority scheduling", 
      "gantt chart", "waiting time", "turnaround time", "response time", "multilevel queue"
    ],
    "Deadlocks": [
      "deadlock", "deadlocks", "banker's", "bankers", "resource allocation graph", "safe state", 
      "deadlock prevention", "deadlock avoidance", "deadlock detection", "mutual exclusion", 
      "hold and wait", "no preemption", "circular wait"
    ],
    "Page Replacement Algorithms": [
      "page replacement", "fifo", "lru", "optimal", "belady's", "beladys", "page fault", "page faults", 
      "thrashing"
    ],
    "Memory Management & Paging": [
      "memory management", "page table", "virtual address", "physical address", "address translation", 
      "tlb", "segmentation", "demand paging", "dirty bit", "fragmentation", "frames", "pages", 
      "swapping"
    ],
    "Process Synchronization & Semaphores": [
      "critical section", "synchronization", "semaphore", "semaphores", "mutex", "dining philosophers", 
      "readers-writers", "producer-consumer", "test-and-set", "bounded buffer"
    ],
    "Disk Scheduling": [
      "disk scheduling", "sstf", "scan", "c-scan", "look", "c-look", "disk head", "seek time"
    ],
    "File Systems": [
      "inode", "file allocation", "directory structure", "file system", "unix file", "fat"
    ],
    "System Software & Operating System Basics": [
      "assembler", "linker", "loader", "macro processor", "compiler vs interpreter", "system call", 
      "system calls", "kernel", "shell", "unix", "linux", "monolithic", "microkernel"
    ]
  },
  6: {
    "Software Process Models": [
      "waterfall", "spiral", "agile", "scrum", "extreme programming", "prototyping", "rad", "v-model", 
      "process model", "incremental model"
    ],
    "Software Metrics & COCOMO": [
      "cocomo", "function point", "software metrics", "effort estimation", "object points", "loc", 
      "lines of code", "kloc", "development time", "person-months"
    ],
    "Software Testing": [
      "testing", "black-box", "white-box", "cyclomatic complexity", "basis path", "integration testing", 
      "regression testing", "boundary value", "equivalence partitioning", "alpha testing", "beta testing", 
      "validation", "verification"
    ],
    "Software Design, Coupling & Cohesion": [
      "cohesion", "coupling", "functional cohesion", "stamp coupling", "data coupling", "control coupling", 
      "software design", "modularity", "information hiding"
    ],
    "UML & Requirements Engineering": [
      "dfd", "use case", "class diagram", "sequence diagram", "uml", "srs", "requirements", "data dictionary"
    ],
    "Software Quality & Maintenance": [
      "maintenance", "capability maturity model", "cmmi", "software quality", "iso 9126", "reliability", 
      "configuration management"
    ]
  },
  7: {
    "Complexity Analysis": [
      "time complexity", "space complexity", "asymptotic", "big o", "theta", "omega", "master theorem", 
      "recurrence equation", "recurrence relation", "algorithm complexity"
    ],
    "Searching & Sorting": [
      "sorting", "merge sort", "quicksort", "heapsort", "bubble sort", "insertion sort", "selection sort", 
      "binary search", "hashing", "hash table", "collision", "linear probing", "quadratic probing", 
      "double hashing", "chaining"
    ],
    "Graph Algorithms": [
      "dijkstra", "kruskal", "prim", "bellman-ford", "floyd-warshall", "topological sort", "bfs", "dfs", 
      "mst", "minimum spanning tree", "shortest path", "single source", "all pairs"
    ],
    "Algorithm Design Paradigms": [
      "dynamic programming", "longest common subsequence", "knapsack", "greedy", "divide and conquer", 
      "matrix chain", "huffman", "backtracking", "branch and bound", "optimal binary search tree"
    ],
    "Data Structures (Stack, Queue, List)": [
      "stack", "stacks", "queue", "queues", "linked list", "circular queue", "dequeue", "array representation", 
      "push", "pop", "enqueue", "dequeue"
    ],
    "Trees & Heaps": [
      "binary tree", "binary search tree", "avl", "red-black", "max heap", "min heap", "bst", "heapify", 
      "rotation", "tree traversal", "inorder", "preorder", "postorder", "height"
    ],
    "Complexity Classes (NP)": [
      "np-complete", "np-hard", "p class", "np class", "vertex cover", "clique problem", "sat", 
      "reducibility", "polynomial time"
    ]
  },
  8: {
    "Finite Automata & Regular Languages": [
      "finite automata", "dfa", "nfa", "regular expression", "regular language", "regular grammar", 
      "pumping lemma", "closure properties", "equivalence of dfa", "minimization of dfa", "mealy", "moore"
    ],
    "Context-Free Languages & Pushdown Automata": [
      "context-free", "context free", "cfg", "pda", "pushdown", "ambiguous", "chomsky normal", "gnf", 
      "cnf", "greibach", "derivation tree", "parse tree"
    ],
    "Turing Machines & Decidability": [
      "turing machine", "halting problem", "undecidable", "decidability", "chomsky hierarchy", 
      "recursive enumerable", "recursive language", "unrestricted grammar", "diagonalization", "post correspondence"
    ],
    "Lexical Analysis & Parsing": [
      "compiler", "compilers", "lexical", "parser", "parsers", "parsing", "shift-reduce", "lalr", 
      "ll(1)", "lr(1)", "operator precedence", "recursive descent", "first and follow", "yacc", "lex", 
      "handle pruning"
    ],
    "Syntax-Directed Translation (SDT)": [
      "syntax-directed", "sdt", "s-attributed", "l-attributed", "synthesized", "inherited attribute"
    ],
    "Code Generation & Optimization": [
      "three-address", "optimization", "loop optimization", "symbol table", "dag", "quadruples", 
      "triples", "intermediate code", "register allocation", "code generation"
    ]
  },
  9: {
    "OSI & TCP/IP Reference Models": [
      "osi model", "tcp/ip", "data link layer", "physical layer", "transport layer", "network layer", 
      "application layer", "layer", "layers"
    ],
    "Data Link Layer & Error Control": [
      "sliding window", "go-back-n", "selective repeat", "csma/cd", "csma/ca", "error control", 
      "flow control", "crc", "hamming code", "stop and wait", "framing", "parity"
    ],
    "IP Addressing & CIDR Subnetting": [
      "ip address", "ipv4", "ipv6", "subnet", "cidr", "subnetting", "classful", "classless", 
      "mask", "gateway", "loopback"
    ],
    "Routing Protocols": [
      "routing", "distance vector", "link state", "ospf", "bgp", "rip", "packet switching", 
      "virtual circuit"
    ],
    "Transport Layer & TCP/UDP": [
      "tcp", "udp", "connection", "port", "ports", "congestion control", "leaky bucket", 
      "token bucket", "handshake", "socket", "window size"
    ],
    "Cryptography & Network Security": [
      "cryptography", "rsa", "digital signature", "firewall", "ipsec", "message digest", 
      "public key", "private key", "diffie hellman", "aes", "des", "symmetric", "asymmetric", 
      "encryption", "decryption", "hash function", "authentication"
    ],
    "Transmission & Physical Layer": [
      "nyquist", "shannon", "baud", "modulation", "pcm", "multiplexing", "bandwidth", 
      "fiber optic", "coaxial", "propagation delay"
    ]
  },
  10: {
    "Heuristic Search & Algorithms": [
      "heuristic", "a* search", "ao* search", "minimax", "alpha-beta", "state space", "best first", 
      "search space", "genetic algorithm", "hill climbing"
    ],
    "Knowledge Representation & Logic": [
      "first-order", "first order", "predicate", "expert system", "expert systems", "resolution", 
      "unification", "clause", "horn clause", "semantic net", "conceptual dependency", "prolog"
    ],
    "Fuzzy Logic & Sets": [
      "fuzzy", "membership function", "membership functions", "fuzzy set", "fuzzy relation", 
      "defuzzification"
    ],
    "Neural Networks & Deep Learning": [
      "neural network", "backpropagation", "perceptron", "artificial neural", "activation function", 
      "weights", "deep learning"
    ],
    "Machine Learning & Pattern Recognition": [
      "machine learning", "k-means", "clustering", "decision tree", "supervised", "unsupervised", 
      "reinforcement", "naive bayes", "svm"
    ],
    "Natural Language Processing": [
      "nlp", "natural language", "parsing in nlp", "grammar rules"
    ]
  },
  11: {
    "Teaching Aptitude": [
      "teaching", "teacher", "learner", "evaluation", "formative", "summative", "pedagogy", "swayam", 
      "classroom"
    ],
    "Research Aptitude": [
      "research", "thesis", "hypothesis", "sampling", "variables", "ethics", "qualitative", 
      "quantitative", "bibliography"
    ],
    "Reading Comprehension": [
      "comprehension", "passage", "read the passage"
    ],
    "Communication": [
      "communication", "barriers", "verbal", "non-verbal", "mass media"
    ],
    "Mathematical Reasoning": [
      "series", "percentage", "profit", "loss", "ratio", "proportion", "interest", "average", 
      "distance", "speed", "work", "time"
    ],
    "Logical Reasoning": [
      "syllogism", "venn diagram", "pramana", "fallacy", "square of opposition", "validity", 
      "deductive", "inductive"
    ],
    "Data Interpretation": [
      "table", "chart", "bar chart", "pie chart", "graph interpretation"
    ],
    "Information & Communication Technology (ICT)": [
      "ict", "ram", "rom", "email", "internet", "intranet", "binary conversion", "byte", 
      "kilobyte"
    ],
    "People, Development & Environment": [
      "pollution", "environment", "sustainable", "millennium", "climate", "hazard", "renewable", 
      "ozone", "greenhouse"
    ],
    "Higher Education System": [
      "education", "university", "ugc", "ancient", "professional", "governance", "policy", 
      "heci"
    ]
  }
};

function classifyQuestion(q, unitId) {
  const rules = CONCEPT_RULES[unitId];
  if (!rules) return "Other Core Topics";

  const textToSearch = (
    q.question + ' ' + (q.solution || '') + ' ' + Object.values(q.options || {}).join(' ')
  ).toLowerCase();

  const matchedConcepts = [];
  for (const [conceptName, triggers] of Object.entries(rules)) {
    for (const trigger of triggers) {
      // Create a regex to match word boundaries
      const regex = new RegExp('\\b' + trigger.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
      if (regex.test(textToSearch)) {
        matchedConcepts.push(conceptName);
        break; // Count once per concept group
      }
    }
  }

  if (matchedConcepts.length > 0) {
    // Return the first matched concept name
    return matchedConcepts[0];
  }

  return "Other Core Topics";
}

async function main() {
  console.log("Seeding database...");
  
  // Read raw questions JSON
  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const questions = JSON.parse(rawData);

  console.log(`Read ${questions.length} questions from JSON.`);

  // Clean existing questions
  await prisma.attempt.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.question.deleteMany();

  console.log("Cleared existing records.");

  const questionsToCreate = [];

  for (const q of questions) {
    // Determine unit
    let unitId = q.unit;
    if (!unitId) {
      // Match unit name
      for (const [uid, name] of Object.entries(UNITS)) {
        if (name === q.unit_name) {
          unitId = parseInt(uid);
          break;
        }
      }
    }
    if (!unitId) {
      unitId = 11; // Default to general paper 1
    }

    const conceptName = classifyQuestion(q, unitId);

    questionsToCreate.push({
      id: q.id,
      year: q.year,
      paper: q.paper,
      q_num: q.q_num,
      question: q.question,
      optionA: q.options.A || "",
      optionB: q.options.B || "",
      optionC: q.options.C || "",
      optionD: q.options.D || "",
      answer: q.answer,
      solution: q.solution || "",
      unit: unitId,
      unitName: UNITS[unitId],
      conceptName: conceptName
    });
  }

  console.log("Inserting questions into database...");

  // Write in batches of 100 to avoid limits and verify progress
  const batchSize = 100;
  for (let i = 0; i < questionsToCreate.length; i += batchSize) {
    const batch = questionsToCreate.slice(i, i + batchSize);
    await prisma.question.createMany({
      data: batch
    });
    console.log(`Inserted ${i + batch.length}/${questionsToCreate.length} questions.`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
