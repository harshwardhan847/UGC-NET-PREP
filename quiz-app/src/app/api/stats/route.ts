import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const totalQuestions = await prisma.question.count()
    const totalSessions = await prisma.quizSession.count()
    
    // Total attempts
    const totalAttempts = await prisma.attempt.count()
    const correctAttempts = await prisma.attempt.count({
      where: { isCorrect: true }
    })
    
    const averageScore = totalAttempts > 0 
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0

    // Unique questions attempted
    const uniqueAttempted = await prisma.question.count({
      where: {
        attempts: {
          some: {}
        }
      }
    })

    // Calculate unit mastery
    const questionsByUnit = await prisma.question.groupBy({
      by: ['unit'],
      _count: { id: true }
    })

    // Fetch attempts grouped by question's unit
    const attempts = await prisma.attempt.findMany({
      include: {
        question: {
          select: { unit: true }
        }
      }
    })

    const unitStats: { [unitId: number]: { correct: number; attempts: number; total: number } } = {}
    
    // Initialize units 1 to 11
    for (let u = 1; u <= 11; u++) {
      unitStats[u] = { correct: 0, attempts: 0, total: 0 }
    }

    questionsByUnit.forEach(qGroup => {
      if (unitStats[qGroup.unit]) {
        unitStats[qGroup.unit].total = qGroup._count.id
      }
    })

    attempts.forEach(att => {
      const uId = att.question.unit
      if (unitStats[uId]) {
        unitStats[uId].attempts += 1
        if (att.isCorrect) {
          unitStats[uId].correct += 1
        }
      }
    })

    // Get recent quiz sessions
    const sessions = await prisma.quizSession.findMany({
      orderBy: { date: 'desc' },
      take: 15
    })

    return NextResponse.json({
      totalQuestions,
      totalAttempted: uniqueAttempted,
      averageScore,
      totalSessions,
      unitMastery: unitStats,
      history: sessions.map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        mode: s.mode,
        unit: s.unit,
        unitName: s.unitName,
        score: s.score,
        total: s.total
      }))
    })
  } catch (error: any) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
