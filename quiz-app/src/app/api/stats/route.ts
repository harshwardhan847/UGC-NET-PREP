import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ConceptStats, DailyActivity, Stats, UnitStats } from '@/lib/types'

const localDateKey = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET() {
  try {
    const [questions, attempts, sessions, sessionCount, bookmarkCount] = await Promise.all([
      prisma.question.findMany({ select: { id: true, unit: true, conceptName: true } }),
      prisma.attempt.findMany({
        select: { questionId: true, isCorrect: true, createdAt: true, timeSpent: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.quizSession.findMany({ orderBy: { date: 'desc' }, take: 30 }),
      prisma.quizSession.count(),
      prisma.bookmark.count()
    ])

    const questionInfo = new Map(questions.map(q => [q.id, q]))

    const units: Record<number, UnitStats> = {}
    for (let u = 1; u <= 11; u++) {
      units[u] = { total: 0, attempted: 0, mastered: 0, attempts: 0, correct: 0 }
    }
    const concepts = new Map<string, ConceptStats>()
    const conceptKey = (unit: number, name: string) => `${unit}::${name}`

    questions.forEach(q => {
      if (units[q.unit]) units[q.unit].total += 1
      const key = conceptKey(q.unit, q.conceptName)
      const c = concepts.get(key) || { unit: q.unit, name: q.conceptName, total: 0, attempts: 0, correct: 0 }
      c.total += 1
      concepts.set(key, c)
    })

    const daily = new Map<string, DailyActivity>()
    const latestByQuestion = new Map<string, boolean>()
    let correct = 0
    let time = 0

    // Attempts are in ascending order, so the last write per question is its latest result
    attempts.forEach(att => {
      const q = questionInfo.get(att.questionId)
      if (!q) return
      if (att.isCorrect) correct += 1
      time += att.timeSpent || 0
      latestByQuestion.set(att.questionId, att.isCorrect)

      if (units[q.unit]) {
        units[q.unit].attempts += 1
        if (att.isCorrect) units[q.unit].correct += 1
      }
      const c = concepts.get(conceptKey(q.unit, q.conceptName))
      if (c) {
        c.attempts += 1
        if (att.isCorrect) c.correct += 1
      }

      const key = localDateKey(att.createdAt)
      const day = daily.get(key) || { date: key, attempts: 0, correct: 0, time: 0 }
      day.attempts += 1
      if (att.isCorrect) day.correct += 1
      day.time += att.timeSpent || 0
      daily.set(key, day)
    })

    let mastered = 0
    let mistakes = 0
    latestByQuestion.forEach((isCorrect, qId) => {
      const q = questionInfo.get(qId)
      if (!q || !units[q.unit]) return
      units[q.unit].attempted += 1
      if (isCorrect) {
        units[q.unit].mastered += 1
        mastered += 1
      } else {
        mistakes += 1
      }
    })

    const stats: Stats = {
      totals: {
        questions: questions.length,
        attempted: latestByQuestion.size,
        mastered,
        mistakes,
        attempts: attempts.length,
        correct,
        sessions: sessionCount,
        time,
        bookmarks: bookmarkCount
      },
      daily: Array.from(daily.values()),
      units,
      concepts: Array.from(concepts.values()),
      history: sessions.map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        mode: s.mode as Stats['history'][number]['mode'],
        title: s.title,
        unit: s.unit,
        unitName: s.unitName,
        paper: s.paper,
        score: s.score,
        total: s.total,
        duration: s.duration
      }))
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
