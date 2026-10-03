import { NextResponse } from 'next/server'
import duplicatesData from '@/data/duplicates.json'

// Groups of near-identical questions across papers. Progress for each question
// comes from /api/questions on the client.
export async function GET() {
  return NextResponse.json(duplicatesData)
}
