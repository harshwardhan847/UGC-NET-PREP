import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Create a bookmark or update its note
export async function POST(req: NextRequest) {
  try {
    const { questionId, note } = await req.json()
    if (!questionId) {
      return NextResponse.json({ error: "Missing required field: questionId" }, { status: 400 })
    }

    const bookmark = await prisma.bookmark.upsert({
      where: { questionId },
      create: { questionId, note: typeof note === "string" ? note : "" },
      update: typeof note === "string" ? { note } : {}
    })

    return NextResponse.json(bookmark)
  } catch (error: any) {
    console.error("Error saving bookmark:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const questionId = new URL(req.url).searchParams.get('questionId')
    if (!questionId) {
      return NextResponse.json({ error: "Missing required query param: questionId" }, { status: 400 })
    }

    await prisma.bookmark.deleteMany({ where: { questionId } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error removing bookmark:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
