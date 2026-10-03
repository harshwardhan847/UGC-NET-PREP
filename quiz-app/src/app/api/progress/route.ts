import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Export all study progress as JSON
export async function GET() {
  try {
    const [attempts, sessions, bookmarks] = await Promise.all([
      prisma.attempt.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.quizSession.findMany({ orderBy: { date: 'asc' } }),
      prisma.bookmark.findMany({ orderBy: { createdAt: 'asc' } })
    ])

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      attempts,
      sessions,
      bookmarks
    })
  } catch (error: any) {
    console.error("Error exporting progress:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Clear attempts and sessions. Bookmarks are kept unless ?bookmarks=true.
export async function DELETE(req: Request) {
  try {
    const includeBookmarks = new URL(req.url).searchParams.get('bookmarks') === 'true'
    await prisma.$transaction([
      prisma.attempt.deleteMany({}),
      prisma.quizSession.deleteMany({}),
      ...(includeBookmarks ? [prisma.bookmark.deleteMany({})] : [])
    ])
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error resetting progress:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
