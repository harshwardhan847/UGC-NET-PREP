export interface UnitInfo {
  id: number
  name: string
  short: string
  desc: string
}

export const UNITS: UnitInfo[] = [
  { id: 1, name: "Discrete Structures and Optimization", short: "Discrete Structures", desc: "Sets, logic, graph theory, LPP" },
  { id: 2, name: "Computer System Architecture", short: "Architecture", desc: "Digital logic, CPU design, cache" },
  { id: 3, name: "Programming Languages & Computer Graphics", short: "Programming & Graphics", desc: "C, C++, OOP, 2D/3D transformations" },
  { id: 4, name: "Database Management Systems (DBMS)", short: "DBMS", desc: "Relational models, SQL, normalization" },
  { id: 5, name: "System Software and Operating System", short: "Operating Systems", desc: "Scheduling, memory management, deadlocks" },
  { id: 6, name: "Software Engineering", short: "Software Engineering", desc: "SDLC, software testing, estimations" },
  { id: 7, name: "Data Structures and Algorithms", short: "Data Structures & Algorithms", desc: "Complexity, trees, sorting, graph algorithms" },
  { id: 8, name: "Theory of Computation and Compilers", short: "TOC & Compilers", desc: "Automata, CFG, Turing machines, parsing" },
  { id: 9, name: "Data Communication and Computer Networks", short: "Networks", desc: "OSI, TCP/IP, IP routing, cryptography" },
  { id: 10, name: "Artificial Intelligence (AI)", short: "Artificial Intelligence", desc: "Neural networks, fuzzy logic, state search" },
  { id: 11, name: "General Paper 1", short: "Paper 1", desc: "Teaching, research, reasoning, ICT" }
]

export const CS_UNIT_IDS = UNITS.filter(u => u.id !== 11).map(u => u.id)
export const PAPER1_UNIT_ID = 11

export const unitById = (id: number) => UNITS.find(u => u.id === id)

// UGC NET awards 2 marks per question with no negative marking.
export const MARKS_PER_QUESTION = 2

export const getPaperFriendlyName = (fileName: string) => {
  if (fileName.includes("General Paper")) {
    return `Paper 1, ${fileName.replace(/\D/g, "")}`
  }
  return fileName
    .replace("UGC_Comp_", "")
    .replace(".pdf", "")
    .replace("Dec", "December ")
    .replace("June", "June ")
    .replace("July", "July ")
    .replace("Nov", "November ")
    .replace("Sep", "September ")
    .replace("_ShiftII", " (Shift II)")
    .replace("_Cancelled", " (Cancelled)")
    .replace("_ReExam", " (Re-exam)")
}

export const isPaper1 = (fileName: string) => fileName.includes("General Paper")

// Default mock timings: 1 hour for a 50-question Paper 1, 3 hours for a Paper 2 set.
// The launcher lets the user override this.
export const mockDurationMinutes = (questionCount: number) => (questionCount <= 50 ? 60 : 180)
