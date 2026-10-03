"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { AttemptSource, Question, Stats } from "@/lib/types"

interface LogAttemptOptions {
  source: AttemptSource
  timeSpent?: number
}

interface StudyDataValue {
  questions: Question[]
  questionMap: Map<string, Question>
  stats: Stats | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshStats: () => Promise<void>
  logAttempt: (question: Question, userAnswer: string, opts: LogAttemptOptions) => Promise<{ attemptId: string | null; isCorrect: boolean }>
  applyAttemptsLocally: (results: { questionId: string; userAnswer: string; isCorrect: boolean }[]) => void
  toggleBookmark: (questionId: string) => Promise<void>
  saveNote: (questionId: string, note: string) => Promise<void>
}

const StudyDataContext = createContext<StudyDataValue | null>(null)

export function StudyDataProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats")
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error("Failed to load stats", err)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [qRes] = await Promise.all([fetch("/api/questions"), refreshStats()])
      if (!qRes.ok) throw new Error(`Question bank request failed (${qRes.status})`)
      setQuestions(await qRes.json())
      setError(null)
    } catch (err: any) {
      console.error("Failed to load data from SQLite database", err)
      setError(err.message || "Could not load the question bank.")
    } finally {
      setLoading(false)
    }
  }, [refreshStats])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    refresh()
  }, [refresh])

  // Coalesce stat refreshes when several answers are logged in quick succession
  const scheduleStatsRefresh = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current)
    statsTimer.current = setTimeout(refreshStats, 800)
  }, [refreshStats])

  const applyAttemptsLocally = useCallback<StudyDataValue["applyAttemptsLocally"]>(results => {
    const byId = new Map(results.map(r => [r.questionId, r]))
    const now = new Date().toISOString()
    setQuestions(prev => prev.map(q => {
      const r = byId.get(q.id)
      if (!r) return q
      return {
        ...q,
        isAnswered: true,
        isCorrect: r.isCorrect,
        userAnswer: r.userAnswer,
        lastAttemptAt: now,
        attemptCount: q.attemptCount + 1
      }
    }))
    scheduleStatsRefresh()
  }, [scheduleStatsRefresh])

  const logAttempt = useCallback<StudyDataValue["logAttempt"]>(async (question, userAnswer, opts) => {
    const isCorrect = userAnswer === question.answer
    applyAttemptsLocally([{ questionId: question.id, userAnswer, isCorrect }])
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          userAnswer,
          isCorrect,
          timeSpent: opts.timeSpent,
          source: opts.source
        })
      })
      if (res.ok) {
        const created = await res.json()
        return { attemptId: created.id as string, isCorrect }
      }
    } catch (err) {
      console.error("Failed to log attempt", err)
    }
    return { attemptId: null, isCorrect }
  }, [applyAttemptsLocally])

  const setBookmarkLocally = (questionId: string, patch: Partial<Pick<Question, "bookmarked" | "note">>) => {
    setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...patch } : q)))
  }

  const toggleBookmark = useCallback(async (questionId: string) => {
    const current = questions.find(q => q.id === questionId)
    if (!current) return
    const next = !current.bookmarked
    setBookmarkLocally(questionId, next ? { bookmarked: true } : { bookmarked: false, note: "" })
    try {
      const res = next
        ? await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId })
          })
        : await fetch(`/api/bookmarks?questionId=${encodeURIComponent(questionId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Bookmark request failed")
      scheduleStatsRefresh()
    } catch (err) {
      console.error("Failed to update bookmark", err)
      setBookmarkLocally(questionId, { bookmarked: current.bookmarked, note: current.note })
    }
  }, [questions, scheduleStatsRefresh])

  const saveNote = useCallback(async (questionId: string, note: string) => {
    setBookmarkLocally(questionId, { bookmarked: true, note })
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, note })
      })
      scheduleStatsRefresh()
    } catch (err) {
      console.error("Failed to save note", err)
    }
  }, [scheduleStatsRefresh])

  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const value: StudyDataValue = {
    questions,
    questionMap,
    stats,
    loading,
    error,
    refresh,
    refreshStats,
    logAttempt,
    applyAttemptsLocally,
    toggleBookmark,
    saveNote
  }

  return <StudyDataContext.Provider value={value}>{children}</StudyDataContext.Provider>
}

export const useStudyData = () => {
  const ctx = useContext(StudyDataContext)
  if (!ctx) throw new Error("useStudyData must be used inside <StudyDataProvider>")
  return ctx
}
