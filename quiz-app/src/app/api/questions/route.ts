import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const unitParam = searchParams.get('unit')
    const paperParam = searchParams.get('paper')
    const conceptParam = searchParams.get('concept')
    const queryParam = searchParams.get('q')

    const where: any = {}

    if (unitParam) {
      where.unit = parseInt(unitParam)
    }
    if (paperParam) {
      where.paper = paperParam
    }
    if (conceptParam) {
      where.conceptName = conceptParam
    }
    if (queryParam) {
      where.OR = [
        { question: { contains: queryParam } },
        { solution: { contains: queryParam } },
        { optionA: { contains: queryParam } },
        { optionB: { contains: queryParam } },
        { optionC: { contains: queryParam } },
        { optionD: { contains: queryParam } },
      ]
    }

    // Fetch questions including their attempts
    const questions = await prisma.question.findMany({
      where,
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    // Format options back to nested structure and add attempt summary
    const formatted = questions.map(q => {
      const lastAttempt = q.attempts[0] || null
      return {
        id: q.id,
        year: q.year,
        paper: q.paper,
        q_num: q.q_num,
        question: q.question,
        options: {
          A: q.optionA,
          B: q.optionB,
          C: q.optionC,
          D: q.optionD
        },
        answer: q.answer,
        solution: q.solution,
        unit: q.unit,
        unit_name: q.unitName,
        conceptName: q.conceptName,
        isAnswered: lastAttempt !== null,
        isCorrect: lastAttempt ? lastAttempt.isCorrect : false,
        userAnswer: lastAttempt ? lastAttempt.userAnswer : null
      }
    })

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
