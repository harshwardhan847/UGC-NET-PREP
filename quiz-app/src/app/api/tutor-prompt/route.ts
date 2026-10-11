import { NextRequest, NextResponse } from 'next/server'
import tutorPrompts from '@/data/tutor_prompts.json'

// Paste-ready AI tutor prompt for a unit (see analysis/build_prompts.py). "compact" fits a Custom GPT's 8,000
// character limit; "full" has everything. Served on demand so the copy button doesn't bloat the page.
const PROMPTS = tutorPrompts as unknown as Record<string, { compact: string; full: string }>

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const unit = searchParams.get('unit') ?? ''
  const version = searchParams.get('version') === 'full' ? 'full' : 'compact'
  const prompt = PROMPTS[unit]?.[version]
  if (!prompt) return NextResponse.json({ error: 'Unknown unit' }, { status: 404 })
  return new NextResponse(prompt, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
