import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, unit, unitName, score, total, attempts } = body

    if (!mode || score === undefined || total === undefined || !attempts) {
      return NextResponse.json({ error: "Missing required fields: mode, score, total, and attempts" }, { status: 400 })
    }

    // Save session and associated attempts atomically
    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.quizSession.create({
        data: {
          mode,
          unit: unit ? parseInt(unit) : null,
          unitName: unitName || null,
          score,
          total
        }
      })

      if (attempts.length > 0) {
        await tx.attempt.createMany({
          data: attempts.map((att: any) => ({
            questionId: att.questionId,
            userAnswer: att.userAnswer,
            isCorrect: att.isCorrect,
            sessionId: createdSession.id
          }))
        })
      }

      return createdSession
    })

    return NextResponse.json(session)
  } catch (error: any) {
    console.error("Error creating quiz session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
