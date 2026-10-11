import type { QuizConfig } from "@/hooks/useQuizState"
import type { Settings } from "./settings"
import type { Question, Stats } from "./types"
import { CS_UNIT_IDS, getPaperFriendlyName, mockDurationMinutes, unitById } from "./constants"
import { pickSmartQuestions, shuffle } from "./analytics"

// One question per cluster of questions that test the same idea. A cluster you already got right is
// skipped, and one you got wrong keeps those mistakes. Falls back to the full pool if that leaves nothing.
export const dedupeByCluster = (pool: Question[]): Question[] => {
  const clusters = new Map<string, Question[]>()
  const out: Question[] = []
  for (const q of pool) {
    if (!q.clusterId) out.push(q)
    else clusters.set(q.clusterId, [...(clusters.get(q.clusterId) ?? []), q])
  }
  for (const members of clusters.values()) {
    const wrong = members.filter(q => q.isAnswered && !q.isCorrect)
    if (wrong.length > 0) out.push(...wrong)
    else if (!members.some(q => q.isAnswered && q.isCorrect)) out.push(members.find(q => q.isRep) ?? members[0])
  }
  return out.length > 0 ? out : pool
}

const withSkip = (pool: Question[], settings: Settings) => (settings.skipSimilar ? dedupeByCluster(pool) : pool)

const practiceTime = (settings: Settings, count: number) => settings.secondsPerQuestion * count

export const buildSmartQuiz = (questions: Question[], stats: Stats | null, settings: Settings, unitIds: number[] = CS_UNIT_IDS): QuizConfig => {
  const pool = withSkip(questions.filter(q => unitIds.includes(q.unit)), settings)
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
  pool = withSkip(pool, settings)
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
  const pool = withSkip(questions.filter(q => q.unit === unitId && q.conceptName === concept), settings)
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

// Study plan: the representative of every cluster, plus questions that belong to no cluster, for one topic or a whole unit
export const buildRepsQuiz = (title: string, list: Question[], settings: Settings, unitId?: number): QuizConfig => {
  const reps = list.filter(q => !q.clusterId || q.isRep)
  const picked = shuffle(reps.length > 0 ? reps : list).slice(0, settings.practiceCount)
  const unit = unitId ? unitById(unitId) : undefined
  return {
    mode: "practice",
    title,
    questions: picked,
    timeLimit: practiceTime(settings, picked.length),
    feedback: settings.feedbackMode,
    unit: unitId ?? null,
    unitName: unit?.name ?? null
  }
}
