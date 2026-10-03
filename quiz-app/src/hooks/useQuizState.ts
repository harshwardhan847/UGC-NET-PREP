import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStudyData } from "./useStudyData"
import { useSettings, type FeedbackMode } from "@/lib/settings"
import type { OptionKey, Question, QuizMode } from "@/lib/types"

export interface QuizConfig {
  mode: QuizMode
  title: string
  questions: Question[]
  timeLimit: number // seconds; 0 = untimed
  feedback: FeedbackMode
  unit?: number | null
  unitName?: string | null
  paper?: string | null
}

export type QuizPhase = "idle" | "running" | "results" | "review"

export interface CheckedAnswer {
  isCorrect: boolean
  attemptId: string | null
}

export interface ReinforceTarget {
  question: Question
  userChoice: string
}

type Flags = Record<string, true>

export const useQuizState = () => {
  const { logAttempt, applyAttemptsLocally, refreshStats } = useStudyData()
  const { settings } = useSettings()

  const [config, setConfig] = useState<QuizConfig | null>(null)
  const [phase, setPhase] = useState<QuizPhase>("idle")
  const [currentIndex, setCurrentIndexRaw] = useState(0)
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({})
  const [checked, setChecked] = useState<Record<string, CheckedAnswer>>({})
  const [skipped, setSkipped] = useState<Flags>({})
  const [marked, setMarked] = useState<Flags>({})
  const [visited, setVisited] = useState<Flags>({})
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reinforce, setReinforce] = useState<ReinforceTarget | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const questions = useMemo(() => config?.questions ?? [], [config])
  const currentQ = questions[currentIndex] as Question | undefined
  const isInstant = config?.feedback === "instant"
  const isFinished = phase === "results" || phase === "review"
  const timeLeft = config && config.timeLimit > 0 ? Math.max(0, config.timeLimit - elapsed) : null

  // Record that the question at `index` has been opened (for the palette's "seen" state)
  const markVisited = useCallback((list: Question[], index: number) => {
    const q = list[index]
    if (q) setVisited(prev => (prev[q.id] ? prev : { ...prev, [q.id]: true }))
  }, [])

  const setCurrentIndex = useCallback((index: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    const next = Math.max(0, Math.min(index, questions.length - 1))
    setCurrentIndexRaw(next)
    markVisited(questions, next)
  }, [questions, markVisited])

  // One-second clock: overall elapsed time plus time on the current question
  useEffect(() => {
    if (phase !== "running" || paused || !currentQ) return
    const qId = currentQ.id
    const id = setInterval(() => {
      setElapsed(e => e + 1)
      setTimeSpent(prev => ({ ...prev, [qId]: (prev[qId] || 0) + 1 }))
    }, 1000)
    return () => clearInterval(id)
  }, [phase, paused, currentQ])

  const startQuiz = useCallback((next: QuizConfig) => {
    if (next.questions.length === 0) return false
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setConfig(next)
    setCurrentIndexRaw(0)
    setAnswers({})
    setChecked({})
    setSkipped({})
    setMarked({})
    setVisited(next.questions[0] ? { [next.questions[0].id]: true } : {})
    setTimeSpent({})
    setElapsed(0)
    setPaused(false)
    setReinforce(null)
    setPhase("running")
    return true
  }, [])

  const selectAnswer = useCallback((qId: string, option: OptionKey) => {
    if (phase !== "running" || checked[qId]) return
    setAnswers(prev => ({ ...prev, [qId]: option }))
    setSkipped(prev => {
      if (!prev[qId]) return prev
      const rest = { ...prev }
      delete rest[qId]
      return rest
    })
  }, [phase, checked])

  const clearAnswer = useCallback((qId: string) => {
    if (phase !== "running" || checked[qId]) return
    setAnswers(prev => {
      const rest = { ...prev }
      delete rest[qId]
      return rest
    })
  }, [phase, checked])

  const goNext = useCallback(() => setCurrentIndex(currentIndex + 1), [currentIndex, setCurrentIndex])
  const goPrev = useCallback(() => setCurrentIndex(currentIndex - 1), [currentIndex, setCurrentIndex])

  // Instant-feedback check of one answer: logs it immediately
  const submitAnswer = useCallback(async (qId: string) => {
    if (phase !== "running" || checked[qId]) return
    const question = questions.find(q => q.id === qId)
    const choice = answers[qId]
    if (!question || !choice) return

    const isCorrect = choice === question.answer
    setChecked(prev => ({ ...prev, [qId]: { isCorrect, attemptId: null } }))

    if (!isCorrect && settings.aiReinforcement) {
      setReinforce({ question, userChoice: choice })
    }
    if (isCorrect && settings.autoAdvance && currentIndex < questions.length - 1) {
      advanceTimer.current = setTimeout(() => setCurrentIndex(currentIndex + 1), 900)
    }

    const { attemptId } = await logAttempt(question, choice, { source: "quiz", timeSpent: timeSpent[qId] })
    setChecked(prev => ({ ...prev, [qId]: { isCorrect, attemptId } }))
  }, [phase, checked, questions, answers, settings.aiReinforcement, settings.autoAdvance, currentIndex, setCurrentIndex, logAttempt, timeSpent])

  const skipQuestion = useCallback((qId: string) => {
    if (!answers[qId] && !checked[qId]) setSkipped(prev => ({ ...prev, [qId]: true }))
    goNext()
  }, [answers, checked, goNext])

  const toggleMarked = useCallback((qId: string) => {
    setMarked(prev => {
      if (prev[qId]) {
        const rest = { ...prev }
        delete rest[qId]
        return rest
      }
      return { ...prev, [qId]: true }
    })
  }, [])

  const finishQuiz = useCallback(async () => {
    if (!config || phase !== "running") return
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setPhase("results")
    setPaused(false)
    setSaving(true)

    let score = 0
    const newAttempts: { questionId: string; userAnswer: string; isCorrect: boolean; timeSpent?: number }[] = []
    const linkAttemptIds: string[] = []

    questions.forEach(q => {
      const choice = answers[q.id]
      if (!choice) return // Unanswered questions are not logged as attempts
      const isCorrect = choice === q.answer
      if (isCorrect) score += 1
      const prior = checked[q.id]
      if (prior) {
        if (prior.attemptId) linkAttemptIds.push(prior.attemptId)
      } else {
        newAttempts.push({ questionId: q.id, userAnswer: choice, isCorrect, timeSpent: timeSpent[q.id] })
      }
    })

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: config.mode,
          title: config.title,
          unit: config.unit ?? null,
          unitName: config.unitName ?? null,
          paper: config.paper ?? null,
          score,
          total: questions.length,
          duration: elapsed,
          attempts: newAttempts,
          linkAttemptIds
        })
      })
      if (newAttempts.length > 0) applyAttemptsLocally(newAttempts)
      else await refreshStats()
    } catch (err) {
      console.error("Failed to save quiz session", err)
    } finally {
      setSaving(false)
    }
  }, [config, phase, questions, answers, checked, timeSpent, elapsed, applyAttemptsLocally, refreshStats])

  // Auto-submit when time runs out
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the clock reaching zero
    if (phase === "running" && timeLeft === 0) finishQuiz()
  }, [phase, timeLeft, finishQuiz])

  const reviewAnswers = useCallback((index = 0) => {
    setCurrentIndex(index)
    setPhase("review")
  }, [setCurrentIndex])

  const showResults = useCallback(() => setPhase("results"), [])

  const quitQuiz = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setConfig(null)
    setPhase("idle")
    setReinforce(null)
    setPaused(false)
  }, [])

  return {
    config,
    phase,
    questions,
    currentQ,
    currentIndex,
    setCurrentIndex,
    goNext,
    goPrev,
    answers,
    checked,
    skipped,
    marked,
    visited,
    timeSpent,
    elapsed,
    timeLeft,
    paused,
    setPaused,
    saving,
    isInstant,
    isFinished,
    startQuiz,
    selectAnswer,
    clearAnswer,
    submitAnswer,
    skipQuestion,
    toggleMarked,
    finishQuiz,
    reviewAnswers,
    showResults,
    quitQuiz,
    reinforce,
    setReinforce
  }
}

export type QuizState = ReturnType<typeof useQuizState>
