import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Saves a finished quiz. `attempts` are answers not yet logged (exam-mode quizzes);
// `linkAttemptIds` are attempts already logged during the quiz (instant-feedback mode)
// that should be attached to this session instead of being written twice.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, title, unit, unitName, paper, score, total, duration, attempts = [], linkAttemptIds = [] } = body

    if (!mode || score === undefined || total === undefined) {
      return NextResponse.json({ error: "Missing required fields: mode, score and total" }, { status: 400 })
    }

    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.quizSession.create({
        data: {
          mode,
          title: title || null,
          unit: unit ? parseInt(unit) : null,
          unitName: unitName || null,
          paper: paper || null,
          score,
          total,
          duration: typeof duration === "number" ? Math.round(duration) : null
        }
      })

      if (attempts.length > 0) {
        await tx.attempt.createMany({
          data: attempts.map((att: any) => ({
            questionId: att.questionId,
            userAnswer: att.userAnswer,
            isCorrect: Boolean(att.isCorrect),
            timeSpent: typeof att.timeSpent === "number" ? Math.round(att.timeSpent) : null,
            source: "quiz",
            sessionId: createdSession.id
          }))
        })
      }

      if (linkAttemptIds.length > 0) {
        await tx.attempt.updateMany({
          where: { id: { in: linkAttemptIds } },
          data: { sessionId: createdSession.id }
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
