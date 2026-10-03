"use client"

import React, { useDeferredValue, useMemo, useState } from "react"
import { Play, Search, SearchX, X } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useSettings } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import { UNITS, getPaperFriendlyName } from "@/lib/constants"
import { buildListQuiz } from "@/lib/quizBuilders"
import { Button, EmptyState, Segmented } from "./ui"
import QuestionCard from "./QuestionCard"

export type BankStatus = "all" | "new" | "correct" | "mistakes" | "bookmarked"

const PAGE_SIZE = 20

const selectClass =
  "h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer max-w-full"

export default function QuestionBank({ initialStatus = "all", onStartQuiz }: { initialStatus?: BankStatus; onStartQuiz: (config: QuizConfig) => void }) {
  const { questions, loading } = useStudyData()
  const { settings } = useSettings()

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [status, setStatus] = useState<BankStatus>(initialStatus)
  const [unit, setUnit] = useState<number | "all">("all")
  const [concept, setConcept] = useState<string>("all")
  const [paper, setPaper] = useState<string>("all")
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Cards you've answered or (un)bookmarked stay in the list until the filters change,
  // so a card doesn't vanish the moment it stops matching "Unanswered" or "Bookmarked".
  const [pinned, setPinned] = useState<Set<string>>(() => new Set())
  const pin = (id: string) => setPinned(prev => (prev.has(id) ? prev : new Set(prev).add(id)))

  // Any filter change starts the list from the top
  const resetList = () => {
    setVisible(PAGE_SIZE)
    setPinned(new Set())
  }
  const changeQuery = (v: string) => { setQuery(v); resetList() }
  const changeStatus = (v: BankStatus) => { setStatus(v); resetList() }
  const changeUnit = (v: number | "all") => { setUnit(v); setConcept("all"); resetList() }
  const changeConcept = (v: string) => { setConcept(v); resetList() }
  const changePaper = (v: string) => { setPaper(v); resetList() }

  const papers = useMemo(() => Array.from(new Set(questions.map(q => q.paper))).sort(), [questions])
  const concepts = useMemo(
    () => (unit === "all" ? [] : Array.from(new Set(questions.filter(q => q.unit === unit).map(q => q.conceptName))).sort()),
    [questions, unit]
  )

  const counts = useMemo(() => ({
    all: questions.length,
    new: questions.filter(q => !q.isAnswered).length,
    correct: questions.filter(q => q.isAnswered && q.isCorrect).length,
    mistakes: questions.filter(q => q.isAnswered && !q.isCorrect).length,
    bookmarked: questions.filter(q => q.bookmarked).length
  }), [questions])

  const filtered = useMemo(() => {
    const terms = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return questions.filter(q => {
      const keep = pinned.has(q.id)
      if (status === "new" && q.isAnswered && !keep) return false
      if (status === "correct" && !(q.isAnswered && q.isCorrect) && !keep) return false
      if (status === "mistakes" && !(q.isAnswered && !q.isCorrect) && !keep) return false
      if (status === "bookmarked" && !q.bookmarked && !keep) return false
      if (unit !== "all" && q.unit !== unit) return false
      if (concept !== "all" && q.conceptName !== concept) return false
      if (paper !== "all" && q.paper !== paper) return false
      if (terms.length > 0) {
        const hay = `${q.question} ${q.options.A} ${q.options.B} ${q.options.C} ${q.options.D} ${q.conceptName} ${q.note}`.toLowerCase()
        if (!terms.every(t => hay.includes(t))) return false
      }
      return true
    })
  }, [questions, deferredQuery, status, unit, concept, paper, pinned])


  const hasFilters = query || status !== "all" || unit !== "all" || paper !== "all"
  const clearFilters = () => {
    setQuery("")
    setStatus("all")
    setUnit("all")
    setConcept("all")
    setPaper("all")
    resetList()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question bank</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Search all {questions.length.toLocaleString()} past-paper questions, review mistakes and keep notes on bookmarks.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[var(--background)]/95 backdrop-blur border-b border-neutral-200/70 dark:border-neutral-800/70">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={e => changeQuery(e.target.value)}
            placeholder="Search questions, options, concepts or your notes"
            className="w-full h-10 pl-9 pr-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          {query && (
            <button onClick={() => changeQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={status}
            onChange={changeStatus}
            ariaLabel="Status"
            className="flex-wrap"
            options={[
              { value: "all", label: `All` },
              { value: "new", label: `Unanswered ${counts.new}` },
              { value: "mistakes", label: `Mistakes ${counts.mistakes}` },
              { value: "correct", label: `Correct ${counts.correct}` },
              { value: "bookmarked", label: `Bookmarked ${counts.bookmarked}` }
            ]}
          />
          <select value={unit} onChange={e => changeUnit(e.target.value === "all" ? "all" : Number(e.target.value))} className={selectClass} aria-label="Unit">
            <option value="all">All units</option>
            {UNITS.map(u => (
              <option key={u.id} value={u.id}>{u.id}. {u.short}</option>
            ))}
          </select>
          {concepts.length > 1 && (
            <select value={concept} onChange={e => changeConcept(e.target.value)} className={selectClass} aria-label="Concept">
              <option value="all">All concepts</option>
              {concepts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={paper} onChange={e => changePaper(e.target.value)} className={selectClass} aria-label="Paper">
            <option value="all">All papers</option>
            {papers.map(p => <option key={p} value={p}>{getPaperFriendlyName(p)}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">{filtered.length.toLocaleString()}</span> {filtered.length === 1 ? "question" : "questions"}
            {hasFilters && (
              <button onClick={clearFilters} className="ml-2 text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">Clear filters</button>
            )}
          </span>
          <Button size="sm" variant="primary" disabled={filtered.length === 0} onClick={() => onStartQuiz(buildListQuiz(statusTitle(status), filtered, settings, { mode: status === "mistakes" || status === "bookmarked" ? "review" : "custom" }))}>
            <Play className="w-3.5 h-3.5" />
            Practise {Math.min(filtered.length, settings.practiceCount)}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="w-5 h-5" />}
          title={status === "bookmarked" && !query ? "No bookmarks yet" : status === "mistakes" && !query ? "No mistakes to review" : "No questions match"}
          action={hasFilters ? <Button size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        >
          {status === "bookmarked" && !query
            ? "Use the bookmark icon on any question to save it here, with your own notes."
            : status === "mistakes" && !query
              ? "Questions you answer incorrectly show up here so you can redo them."
              : "Try a shorter search or remove a filter."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visible).map(q => (
            <QuestionCard key={q.id} question={q} source="bank" defaultCollapsed onInteract={pin} />
          ))}
          {visible < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button onClick={() => setVisible(v => v + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, filtered.length - visible)} more</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const statusTitle = (status: BankStatus) =>
  ({ all: "Question bank", new: "Unanswered questions", correct: "Revision", mistakes: "Mistakes review", bookmarked: "Bookmarks" })[status]
