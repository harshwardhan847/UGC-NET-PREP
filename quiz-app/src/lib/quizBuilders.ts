import type { QuizConfig } from "@/hooks/useQuizState"
import type { Settings } from "./settings"
import type { Question, Stats } from "./types"
import { CS_UNIT_IDS, getPaperFriendlyName, mockDurationMinutes, unitById } from "./constants"
import { pickSmartQuestions, shuffle } from "./analytics"

const practiceTime = (settings: Settings, count: number) => settings.secondsPerQuestion * count

export const buildSmartQuiz = (questions: Question[], stats: Stats | null, settings: Settings, unitIds: number[] = CS_UNIT_IDS): QuizConfig => {
  const pool = questions.filter(q => unitIds.includes(q.unit))
  const picked = shuffle(pickSmartQuestions(pool, stats, settings.practiceCount))
  return {
    mode: "smart",
    title: "Smart practice",
    questions: picked,
    timeLimit: practiceTime(settings, picked.length),
    feedback: settings.feedbackMode
  }
}

export const buildUnitQuiz = (questions: Question[], unitId: number, settings: Settings, opts: { count?: number; onlyNew?: boolean } = {}): QuizConfig => {
  const count = opts.count ?? settings.practiceCount
  let pool = questions.filter(q => q.unit === unitId)
  if (opts.onlyNew) pool = pool.filter(q => !q.isAnswered)
  const picked = shuffle(pool).slice(0, count)
  const unit = unitById(unitId)
  return {
    mode: "practice",
    title: unit?.short ?? `Unit ${unitId}`,
    questions: picked,
    timeLimit: practiceTime(settings, picked.length),
    feedback: settings.feedbackMode,
    unit: unitId,
    unitName: unit?.name ?? null
  }
}

export const buildConceptQuiz = (questions: Question[], unitId: number, concept: string, settings: Settings): QuizConfig => {
  const pool = questions.filter(q => q.unit === unitId && q.conceptName === concept)
  // Mistakes first, then unseen, then the rest
  const rank = (q: Question) => (q.isAnswered && !q.isCorrect ? 0 : !q.isAnswered ? 1 : 2)
  const picked = shuffle(pool).sort((a, b) => rank(a) - rank(b)).slice(0, settings.practiceCount)
  return {
    mode: "practice",
    title: concept,
    questions: shuffle(picked),
    timeLimit: practiceTime(settings, picked.length),
    feedback: settings.feedbackMode,
    unit: unitId,
    unitName: unitById(unitId)?.name ?? null
  }
}

export const buildListQuiz = (title: string, list: Question[], settings: Settings, opts: { count?: number; mode?: QuizConfig["mode"] } = {}): QuizConfig => {
  const picked = shuffle(list).slice(0, opts.count ?? settings.practiceCount)
  return {
    mode: opts.mode ?? "review",
    title,
    questions: picked,
    timeLimit: practiceTime(settings, picked.length),
    feedback: settings.feedbackMode
  }
}

export const buildMockQuiz = (questions: Question[], paper: string, settings: Settings, minutes?: number): QuizConfig => {
  const picked = questions.filter(q => q.paper === paper).sort((a, b) => a.q_num - b.q_num)
  return {
    mode: "mock",
    title: getPaperFriendlyName(paper),
    questions: picked,
    timeLimit: (minutes ?? mockDurationMinutes(picked.length)) * 60,
    feedback: settings.mockFeedbackMode,
    paper
  }
}
