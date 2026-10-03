import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { questionId, userAnswer, isCorrect, timeSpent, source } = body

    if (!questionId || !userAnswer) {
      return NextResponse.json({ error: "Missing required fields: questionId and userAnswer" }, { status: 400 })
    }

    const attempt = await prisma.attempt.create({
      data: {
        questionId,
        userAnswer,
        isCorrect: Boolean(isCorrect),
        timeSpent: typeof timeSpent === "number" ? Math.max(0, Math.round(timeSpent)) : null,
        source: typeof source === "string" ? source : null
      }
    })

    return NextResponse.json(attempt)
  } catch (error: any) {
    console.error("Error creating attempt:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
