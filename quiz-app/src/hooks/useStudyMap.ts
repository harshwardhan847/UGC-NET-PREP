"use client"

import { useEffect, useState } from "react"
import type { StudyUnit } from "@/lib/types"

// The study map is static, so it's fetched once and shared by every view that needs it.
let cache: StudyUnit[] | null = null
let pending: Promise<StudyUnit[]> | null = null

const load = () => {
  pending ??= fetch("/api/study-map")
    .then(res => (res.ok ? (res.json() as Promise<StudyUnit[]>) : []))
    .then(data => (cache = data))
  return pending
}

export const useStudyMap = () => {
  const [units, setUnits] = useState<StudyUnit[] | null>(cache)
  useEffect(() => {
    if (cache) return
    load().then(setUnits).catch(err => console.error("Failed to load study map", err))
  }, [])
  return { units: units ?? [], loading: units === null }
}
