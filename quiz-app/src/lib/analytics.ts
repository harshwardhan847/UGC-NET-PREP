import type { DailyActivity, Question, Stats } from "./types"

export const dateKey = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const addDays = (d: Date, n: number) => {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export const secondsSince = (timestampMs: number) => Math.round((Date.now() - timestampMs) / 1000)

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

// Current streak counts today if active, otherwise continues from yesterday
// (so the streak isn't shown as broken before the user has studied today).
export const computeStreaks = (daily: DailyActivity[]) => {
  const active = new Set(daily.filter(d => d.attempts > 0).map(d => d.date))
  const today = new Date()
  let cursor = active.has(dateKey(today)) ? today : addDays(today, -1)
  let current = 0
  while (active.has(dateKey(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  const sorted = Array.from(active).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const key of sorted) {
    run = prev && dateKey(addDays(new Date(`${prev}T00:00:00`), 1)) === key ? run + 1 : 1
    best = Math.max(best, run)
    prev = key
  }

  return { current, best, activeToday: active.has(dateKey(today)) }
}

export const daysUntil = (isoDate: string) => {
  if (!isoDate) return null
  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = m.toString().padStart(2, "0")
  const ss = sec.toString().padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const relativeDay = (iso: string) => {
  const d = new Date(iso)
  const diff = Math.round((new Date(dateKey(new Date())).getTime() - new Date(dateKey(d)).getTime()) / 86_400_000)
  if (diff === 0) return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  if (diff === 1) return "Yesterday"
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
}

export const shuffle = <T,>(items: T[]) => {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Smart practice: prioritise questions you got wrong last time, then unseen questions
// from your weakest units, then a small share of already-mastered questions for retention.
export const pickSmartQuestions = (questions: Question[], stats: Stats | null, count: number) => {
  const unitAccuracy = (unit: number) => {
    const u = stats?.units[unit]
    if (!u || u.attempts < 3) return 0.5
    return u.correct / u.attempts
  }

  const scored = questions.map(q => {
    let score: number
    if (q.isAnswered && !q.isCorrect) score = 3
    else if (!q.isAnswered) score = 1 + (1 - unitAccuracy(q.unit))
    else score = 0.3
    return { q, score: score + Math.random() }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, count).map(s => s.q)
}
