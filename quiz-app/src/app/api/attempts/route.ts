import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { questionId, userAnswer, isCorrect } = body

    if (!questionId || !userAnswer) {
      return NextResponse.json({ error: "Missing required fields: questionId and userAnswer" }, { status: 400 })
    }

    const attempt = await prisma.attempt.create({
      data: {
        questionId,
        userAnswer,
        isCorrect
      }
    })

    return NextResponse.json(attempt)
  } catch (error: any) {
    console.error("Error creating attempt:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
