import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import duplicatesData from '@/data/duplicates.json'

export async function GET() {
  try {
    // Extract all question IDs from the duplicates list
    const qIds: string[] = []
    duplicatesData.forEach((group: any) => {
      group.questions.forEach((q: any) => {
        qIds.push(q.id)
      })
    })

    // Fetch the latest attempts for all these questions from the database
    const attempts = await prisma.attempt.findMany({
      where: {
        questionId: { in: qIds }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Create a map of questionId -> latest attempt
    const attemptMap = new Map<string, typeof attempts[0]>()
    attempts.forEach(att => {
      if (!attemptMap.has(att.questionId)) {
        attemptMap.set(att.questionId, att)
      }
    })

    // Enrich duplicates questions with their database attempt status
    const enrichedDuplicates = duplicatesData.map((group: any) => {
      return {
        ...group,
        questions: group.questions.map((q: any) => {
          const lastAttempt = attemptMap.get(q.id) || null
          return {
            ...q,
            isAnswered: lastAttempt !== null,
            isCorrect: lastAttempt ? lastAttempt.isCorrect : false,
            userAnswer: lastAttempt ? lastAttempt.userAnswer : null
          }
        })
      }
    })

    return NextResponse.json(enrichedDuplicates)
  } catch (error: any) {
    console.error("Error fetching duplicates:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
