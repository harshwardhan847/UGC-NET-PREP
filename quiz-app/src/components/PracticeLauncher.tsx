"use client"

import React, { useMemo, useState } from "react"
import { Bookmark, BookOpen, FileText, Play, SlidersHorizontal, Sparkles, XCircle } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useSettings, type FeedbackMode } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import { CS_UNIT_IDS, PAPER1_UNIT_ID, UNITS, getPaperFriendlyName, isPaper1, mockDurationMinutes } from "@/lib/constants"
import { formatDuration, pct, shuffle } from "@/lib/analytics"
import { buildListQuiz, buildMockQuiz, buildSmartQuiz, buildUnitQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { Button, Chip, Panel, ProgressBar, Segmented, Switch } from "./ui"

type LaunchMode = "smart" | "unit" | "mock" | "custom"
type StatusFilter = "any" | "new" | "mistakes" | "bookmarked"
type Scope = "cs" | "p1" | "both"

const MODES: { id: LaunchMode; title: string; desc: string; icon: React.ElementType }[] = [
  { id: "smart", title: "Smart practice", desc: "Mixes your recent mistakes, unseen questions and your weakest units.", icon: Sparkles },
  { id: "unit", title: "By unit", desc: "Drill one syllabus unit at a time.", icon: BookOpen },
  { id: "mock", title: "Full mock paper", desc: "Sit a past paper in order, against the clock.", icon: FileText },
  { id: "custom", title: "Build your own", desc: "Pick units, years, status, length and timing.", icon: SlidersHorizontal }
]

const SCOPE_UNITS: Record<Scope, number[]> = {
  cs: CS_UNIT_IDS,
  p1: [PAPER1_UNIT_ID],
  both: [...CS_UNIT_IDS, PAPER1_UNIT_ID]
}

export default function PracticeLauncher({ onStartQuiz }: { onStartQuiz: (config: QuizConfig) => void }) {
  const { questions, stats } = useStudyData()
  const { settings } = useSettings()

  const [mode, setMode] = useState<LaunchMode>("smart")
  const [count, setCount] = useState(settings.practiceCount)
  const [secondsPerQ, setSecondsPerQ] = useState(settings.secondsPerQuestion)
  const [feedback, setFeedback] = useState<FeedbackMode>(settings.feedbackMode)
  const [scope, setScope] = useState<Scope>("cs")

  const [unitId, setUnitId] = useState<number | null>(null)
  const [onlyNew, setOnlyNew] = useState(false)

  const [paper, setPaper] = useState<string | null>(null)
  const [mockMinutes, setMockMinutes] = useState<number | null>(null)
  const [mockFeedback, setMockFeedback] = useState<FeedbackMode>(settings.mockFeedbackMode)

  const [customUnits, setCustomUnits] = useState<number[]>([])
  const [customPapers, setCustomPapers] = useState<string[]>([])
  const [status, setStatus] = useState<StatusFilter>("any")

  const papers = useMemo(() => {
    const map = new Map<string, { count: number; year: string }>()
    questions.forEach(q => {
      const p = map.get(q.paper) || { count: 0, year: q.year }
      p.count += 1
      map.set(q.paper, p)
    })
    const sortKey = (name: string) => {
      const year = Number((name.match(/\d{4}/) || ["0"])[0])
      return year
    }
    return Array.from(map.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => sortKey(b.name) - sortKey(a.name) || a.name.localeCompare(b.name))
  }, [questions])

  const bestByPaper = useMemo(() => {
    const best = new Map<string, number>()
    stats?.history.forEach(s => {
      if (s.mode === "mock" && s.paper) best.set(s.paper, Math.max(best.get(s.paper) ?? 0, pct(s.score, s.total)))
    })
    return best
  }, [stats])

  const mistakes = useMemo(() => questions.filter(q => q.isAnswered && !q.isCorrect), [questions])
  const bookmarks = useMemo(() => questions.filter(q => q.bookmarked), [questions])

  const customPool = useMemo(() => {
    return questions.filter(q => {
      if (customUnits.length > 0 && !customUnits.includes(q.unit)) return false
      if (customPapers.length > 0 && !customPapers.includes(q.paper)) return false
      if (status === "new" && q.isAnswered) return false
      if (status === "mistakes" && !(q.isAnswered && !q.isCorrect)) return false
      if (status === "bookmarked" && !q.bookmarked) return false
      return true
    })
  }, [questions, customUnits, customPapers, status])

  const localSettings = { ...settings, practiceCount: count, secondsPerQuestion: secondsPerQ, feedbackMode: feedback }

  // Summary + builder for the current selection
  const plan = ((): { summary: string; available: number; build: (() => QuizConfig) | null } => {
    if (mode === "smart") {
      const pool = questions.filter(q => SCOPE_UNITS[scope].includes(q.unit))
      const n = Math.min(count, pool.length)
      return { summary: `${n} questions`, available: pool.length, build: () => buildSmartQuiz(questions, stats, localSettings, SCOPE_UNITS[scope]) }
    }
    if (mode === "unit") {
      if (unitId === null) return { summary: "Choose a unit", available: 0, build: null }
      const pool = questions.filter(q => q.unit === unitId && (!onlyNew || !q.isAnswered))
      const n = Math.min(count, pool.length)
      return { summary: `${n} questions`, available: pool.length, build: pool.length ? () => buildUnitQuiz(questions, unitId, localSettings, { onlyNew }) : null }
    }
    if (mode === "mock") {
      if (!paper) return { summary: "Choose a paper", available: 0, build: null }
      const n = papers.find(p => p.name === paper)?.count ?? 0
      const minutes = mockMinutes ?? mockDurationMinutes(n)
      return {
        summary: `${n} questions, ${formatDuration(minutes * 60)}`,
        available: n,
        build: () => ({ ...buildMockQuiz(questions, paper, settings, minutes), feedback: mockFeedback })
      }
    }
    const n = Math.min(count, customPool.length)
    return {
      summary: `${n} questions`,
      available: customPool.length,
      build: customPool.length
        ? () => ({ ...buildListQuiz("Custom quiz", shuffle(customPool), localSettings, { count, mode: "custom" }) })
        : null
    }
  })()

  const timeSummary = mode === "mock" ? "" : secondsPerQ === 0 ? ", untimed" : `, ${formatDuration(Math.min(count, plan.available) * secondsPerQ)}`
  const feedbackSummary = (mode === "mock" ? mockFeedback : feedback) === "instant" ? "answers shown as you go" : "answers shown at the end"

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Choose how you want to practise, adjust the details, then start.</p>
      </div>

      {/* Quick review */}
      {(mistakes.length > 0 || bookmarks.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {mistakes.length > 0 && (
            <Button variant="secondary" onClick={() => onStartQuiz(buildListQuiz("Mistakes review", mistakes, settings))}>
              <XCircle className="w-4 h-4 text-rose-500" />
              Redo {Math.min(mistakes.length, settings.practiceCount)} of {mistakes.length} mistakes
            </Button>
          )}
          {bookmarks.length > 0 && (
            <Button variant="secondary" onClick={() => onStartQuiz(buildListQuiz("Bookmarks", bookmarks, settings))}>
              <Bookmark className="w-4 h-4 text-amber-500" />
              Practise {bookmarks.length} bookmarked
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Mode list */}
        <div role="tablist" aria-label="Practice mode" className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {MODES.map(m => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.id)}
                className={cn(
                  "text-left rounded-xl border p-3.5 transition-colors cursor-pointer",
                  active
                    ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 ring-1 ring-brand-500"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className={cn("w-4 h-4", active ? "text-brand-600 dark:text-brand-400" : "text-neutral-400")} />
                  {m.title}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">{m.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Configuration */}
        <Panel className="overflow-hidden">
          <div className="p-5 space-y-6">
            {mode === "smart" && (
              <Field label="Question pool">
                <Segmented
                  value={scope}
                  onChange={setScope}
                  ariaLabel="Question pool"
                  options={[
                    { value: "cs", label: "Paper 2: CS" },
                    { value: "p1", label: "Paper 1" },
                    { value: "both", label: "Both" }
                  ]}
                />
              </Field>
            )}

            {mode === "unit" && (
              <Field label="Unit">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {UNITS.map(u => {
                    const s = stats?.units[u.id]
                    const coverage = pct(s?.attempted ?? 0, s?.total ?? 0)
                    const accuracy = s && s.attempts > 0 ? pct(s.correct, s.attempts) : null
                    return (
                      <button
                        key={u.id}
                        onClick={() => setUnitId(u.id)}
                        aria-pressed={unitId === u.id}
                        className={cn(
                          "text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer",
                          unitId === u.id ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-500/10" : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            <span className="text-neutral-400 tabular-nums mr-1.5">{u.id}</span>
                            {u.short}
                          </span>
                          <span className="text-xs tabular-nums text-neutral-500 shrink-0">{accuracy !== null ? `${accuracy}% correct` : `${s?.total ?? 0} Qs`}</span>
                        </div>
                        <ProgressBar value={coverage} className="mt-2 h-1" />
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3">
                  <Switch id="only-new" checked={onlyNew} onChange={setOnlyNew} label="Only questions I haven't answered" />
                </div>
              </Field>
            )}

            {mode === "mock" && (
              <>
                <Field label="Paper">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
                    {papers.map(p => {
                      const best = bestByPaper.get(p.name)
                      return (
                        <button
                          key={p.name}
                          onClick={() => {
                            setPaper(p.name)
                            setMockMinutes(null)
                          }}
                          aria-pressed={paper === p.name}
                          className={cn(
                            "text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2",
                            paper === p.name ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-500/10" : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium truncate">{getPaperFriendlyName(p.name)}</span>
                            <span className="block text-xs text-neutral-500">
                              {isPaper1(p.name) ? "Paper 1" : "Paper 2"}, {p.count} questions
                            </span>
                          </span>
                          {best !== undefined && <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300 shrink-0">Best {best}%</span>}
                        </button>
                      )
                    })}
                  </div>
                </Field>
                {paper && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Field label={`Time limit: ${mockMinutes ?? mockDurationMinutes(plan.available)} minutes`}>
                      <input
                        type="range"
                        min={15}
                        max={240}
                        step={15}
                        value={mockMinutes ?? mockDurationMinutes(plan.available)}
                        onChange={e => setMockMinutes(Number(e.target.value))}
                        className="w-full accent-brand-600"
                      />
                    </Field>
                    <Field label="Feedback">
                      <FeedbackPicker value={mockFeedback} onChange={setMockFeedback} />
                    </Field>
                  </div>
                )}
              </>
            )}

            {mode === "custom" && (
              <>
                <Field label="Units" hint={customUnits.length === 0 ? "All units" : `${customUnits.length} selected`}>
                  <div className="flex flex-wrap gap-2">
                    {UNITS.map(u => (
                      <Chip key={u.id} active={customUnits.includes(u.id)} onClick={() => setCustomUnits(toggle(customUnits, u.id))}>
                        {u.short}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Papers" hint={customPapers.length === 0 ? "All papers" : `${customPapers.length} selected`}>
                  <div className="flex flex-wrap gap-2">
                    {papers.map(p => (
                      <Chip key={p.name} active={customPapers.includes(p.name)} onClick={() => setCustomPapers(toggle(customPapers, p.name))}>
                        {getPaperFriendlyName(p.name)}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Include">
                  <Segmented
                    value={status}
                    onChange={setStatus}
                    ariaLabel="Question status"
                    className="flex-wrap"
                    options={[
                      { value: "any", label: "All" },
                      { value: "new", label: "Unanswered" },
                      { value: "mistakes", label: "My mistakes" },
                      { value: "bookmarked", label: "Bookmarked" }
                    ]}
                  />
                </Field>
              </>
            )}

            {mode !== "mock" && (
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label={`Questions: ${count}`}>
                  <input type="range" min={5} max={100} step={5} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-brand-600" />
                </Field>
                <Field label={secondsPerQ === 0 ? "Timer: off" : `Timer: ${secondsPerQ}s per question`}>
                  <input type="range" min={0} max={240} step={15} value={secondsPerQ} onChange={e => setSecondsPerQ(Number(e.target.value))} className="w-full accent-brand-600" />
                </Field>
                <Field label="Feedback">
                  <FeedbackPicker value={feedback} onChange={setFeedback} />
                </Field>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {plan.build ? (
                <>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{plan.summary}</span>
                  {timeSummary}, {feedbackSummary}
                  {mode !== "mock" && plan.available < count && plan.available > 0 && <span className="block text-xs mt-0.5">Only {plan.available} questions match.</span>}
                </>
              ) : mode === "custom" ? (
                "No questions match these filters."
              ) : (
                plan.summary
              )}
            </div>
            <Button variant="primary" size="lg" disabled={!plan.build} onClick={() => plan.build && onStartQuiz(plan.build())}>
              <Play className="w-4 h-4" />
              Start quiz
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function FeedbackPicker({ value, onChange }: { value: FeedbackMode; onChange: (v: FeedbackMode) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      ariaLabel="Feedback"
      options={[
        { value: "instant", label: "After each question", title: "Check each answer and see the explanation right away" },
        { value: "exam", label: "At the end", title: "Like the real exam: answers revealed after you submit" }
      ]}
    />
  )
}
