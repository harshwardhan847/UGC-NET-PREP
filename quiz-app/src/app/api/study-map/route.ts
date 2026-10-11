import { NextResponse } from 'next/server'
import studyMap from '@/data/study_map.json'

// Per-unit priorities, similar-question clusters, formulas and study plan (see analysis/build_study_map.py).
// Per-question tags are merged into /api/questions instead, so they aren't repeated here.
export async function GET() {
  return NextResponse.json(studyMap.units)
}
