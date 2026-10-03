export type OptionKey = "A" | "B" | "C" | "D"
export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"]

export interface Question {
  id: string
  year: string
  paper: string
  q_num: number
  question: string
  options: Record<OptionKey, string>
  answer: string
  solution: string
  unit: number
  unit_name: string
  conceptName: string
  // Progress, from the latest attempt
  isAnswered: boolean
  isCorrect: boolean
  userAnswer: string | null
  lastAttemptAt: string | null
  attemptCount: number
  // Bookmark
  bookmarked: boolean
  note: string
}

export type AttemptSource = "quiz" | "swipe" | "weightage" | "repeats" | "bank"

export type QuizMode = "practice" | "mock" | "custom" | "smart" | "review"

export interface SessionSummary {
  id: string
  date: string
  mode: QuizMode
  title: string | null
  unit: number | null
  unitName: string | null
  paper: string | null
  score: number
  total: number
  duration: number | null
}

export interface DailyActivity {
  date: string // YYYY-MM-DD, server local time
  attempts: number
  correct: number
  time: number // seconds
}

export interface UnitStats {
  total: number
  attempted: number // unique questions attempted
  mastered: number // unique questions whose latest attempt is correct
  attempts: number
  correct: number
}

export interface ConceptStats {
  unit: number
  name: string
  total: number
  attempts: number
  correct: number
}

export interface Stats {
  totals: {
    questions: number
    attempted: number
    mastered: number
    mistakes: number
    attempts: number
    correct: number
    sessions: number
    time: number
    bookmarks: number
  }
  daily: DailyActivity[]
  units: Record<number, UnitStats>
  concepts: ConceptStats[]
  history: SessionSummary[]
}
