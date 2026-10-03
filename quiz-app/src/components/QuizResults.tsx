"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, Eye, Home, MinusCircle, RotateCcw, XCircle } from "lucide-react"
import type { QuizState } from "@/hooks/useQuizState"
import { useSettings } from "@/lib/settings"
import { MARKS_PER_QUESTION, unitById } from "@/lib/constants"
import { formatDuration, pct } from "@/lib/analytics"
import { buildListQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { Button, Panel, PanelHeader, ProgressBar } from "./ui"

export default function QuizResults({ quiz, onDone }: { quiz: QuizState; onDone: () => void }) {
  const { settings } = useSettings()
  const { config, questions, answers, timeSpent, elapsed, saving } = quiz

  const summary = useMemo(() => {
    const rows = questions.map((q, index) => {
      const choice = answers[q.id]
      const status = !choice ? "skipped" : choice === q.answer ? "correct" : "wrong"
      return { q, index, status, choice, time: timeSpent[q.id] || 0 }
    })
    const unitIds = Array.from(new Set(questions.map(q => q.unit))).sort((a, b) => a - b)
    const units = unitIds.map(id => {
      const inUnit = rows.filter(r => r.q.unit === id)
      return [id, { correct: inUnit.filter(r => r.status === "correct").length, total: inUnit.length }] as const
    })
    const correct = rows.filter(r => r.status === "correct").length
    const wrong = rows.filter(r => r.status === "wrong").length
    return { correct, wrong, skipped: rows.length - correct - wrong, rows, units }
  }, [questions, answers, timeSpent])

  if (!config) return null

  const total = questions.length
  const score = pct(summary.correct, total)
  const answered = summary.correct + summary.wrong
  // Retry what you got wrong; if nothing was wrong, the ones you left blank
  const wrongQs = summary.rows.filter(r => r.status === "wrong").map(r => r.q)
  const retryList = wrongQs.length > 0 ? wrongQs : summary.rows.filter(r => r.status === "skipped").map(r => r.q)
  const retryLabel = wrongQs.length > 0 ? `Redo ${wrongQs.length} incorrect` : `Try ${retryList.length} unanswered`
  const verdict = score >= 80 ? "Excellent work." : score >= 60 ? "Solid result." : score >= 40 ? "Getting there." : "Plenty to learn from here."

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <p className="text-sm text-neutral-500">{config.title}</p>
          <div className="text-6xl sm:text-7xl font-semibold tracking-tight tabular-nums">
            {summary.correct}
            <span className="text-neutral-300 dark:text-neutral-700">/{total}</span>
          </div>
          <p className="text-lg text-neutral-700 dark:text-neutral-300">
            {verdict} {score}% correct, {summary.correct * MARKS_PER_QUESTION} of {total * MARKS_PER_QUESTION} marks.
          </p>
          {saving && <p className="text-xs text-neutral-500">Saving to your history…</p>}
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => quiz.reviewAnswers(summary.rows.find(r => r.status !== "correct")?.index ?? 0)}>
            <Eye className="w-4 h-4" />
            Review answers
          </Button>
          {retryList.length > 0 && (
            <Button variant="secondary" onClick={() => quiz.startQuiz({ ...buildListQuiz(`Retry: ${config.title}`, retryList, settings, { count: retryList.length }), feedback: "instant" })}>
              <RotateCcw className="w-4 h-4" />
              {retryLabel}
            </Button>
          )}
          <Button variant="ghost" onClick={onDone}>
            <Home className="w-4 h-4" />
            Back to overview
          </Button>
        </div>

        <Panel className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
          <Metric icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Correct" value={summary.correct} />
          <Metric icon={<XCircle className="w-4 h-4 text-rose-600" />} label="Incorrect" value={summary.wrong} />
          <Metric icon={<MinusCircle className="w-4 h-4 text-neutral-400" />} label="Not answered" value={summary.skipped} />
          <Metric icon={<Clock className="w-4 h-4 text-neutral-400" />} label="Time taken" value={formatDuration(elapsed)} hint={answered > 0 ? `${Math.round(elapsed / Math.max(1, answered))}s per answer` : undefined} />
        </Panel>

        {summary.units.length > 1 && (
          <Panel>
            <PanelHeader title="By unit" />
            <div className="px-5 pb-4 space-y-2.5">
              {summary.units.map(([unitId, u]) => (
                <div key={unitId} className="grid grid-cols-[1fr_100px_52px] sm:grid-cols-[1fr_200px_60px] gap-3 items-center text-sm">
                  <span className="truncate">{unitById(unitId)?.short ?? `Unit ${unitId}`}</span>
                  <ProgressBar value={pct(u.correct, u.total)} tone={pct(u.correct, u.total) >= 70 ? "good" : "brand"} />
                  <span className="text-right tabular-nums text-neutral-600 dark:text-neutral-400">{u.correct}/{u.total}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <PanelHeader title="Question by question" description="Click any question to review it" />
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
            {summary.rows.map(r => (
              <li key={r.q.id}>
                <button onClick={() => quiz.reviewAnswers(r.index)} className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer">
                  <span className="w-7 text-xs tabular-nums text-neutral-400 shrink-0">{r.index + 1}</span>
                  {r.status === "correct" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Correct" />
                  ) : r.status === "wrong" ? (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" aria-label="Incorrect" />
                  ) : (
                    <MinusCircle className="w-4 h-4 text-neutral-400 shrink-0" aria-label="Not answered" />
                  )}
                  <span className="flex-1 min-w-0 text-sm truncate">{r.q.question.replace(/\s+/g, " ")}</span>
                  <span className={cn("text-xs tabular-nums shrink-0 w-14 text-right", r.time > 180 ? "text-amber-600 dark:text-amber-400" : "text-neutral-500")}>
                    {r.time > 0 ? formatDuration(r.time) : "–"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-xs text-neutral-500 flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[11px] text-neutral-500 mt-0.5">{hint}</div>}
    </div>
  )
}
