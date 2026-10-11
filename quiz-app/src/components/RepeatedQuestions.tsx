"use client"

import React, { useMemo, useState } from "react"
import { CheckCircle2, Info, Play } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useStudyMap } from "@/hooks/useStudyMap"
import { useSettings } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import type { Question, StudyCluster } from "@/lib/types"
import { UNITS, unitById } from "@/lib/constants"
import { buildListQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { Button, Panel } from "./ui"
import QuestionCard from "./QuestionCard"

interface DuplicateGroup {
  id: string
  unit: number
  title: string
  type: StudyCluster["type"]
  technique: string
  whatChanges: string
  rep: string
  questions: Question[]
}

const TYPE_LABEL: Record<StudyCluster["type"], string> = {
  "exact-repeat": "Exact repeat",
  "same-concept-variant": "Same concept",
  "same-formula": "Same formula"
}

export default function RepeatedQuestions({ onStartQuiz }: { onStartQuiz: (config: QuizConfig) => void }) {
  const { questionMap } = useStudyData()
  const { units, loading } = useStudyMap()
  const { settings } = useSettings()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [unitFilter, setUnitFilter] = useState<number | "all">("all")

  // Every cluster of questions testing the same idea, resolved from the shared store so progress stays in sync
  const groups = useMemo<DuplicateGroup[]>(
    () =>
      units
        .flatMap(u => u.clusters.map(c => ({ unit: u.unit, c })))
        .map(({ unit, c }) => ({
          id: c.id,
          unit,
          title: c.title,
          type: c.type,
          technique: c.technique,
          whatChanges: c.what_changes,
          rep: c.representative,
          questions: c.members.map(id => questionMap.get(id)).filter((q): q is Question => Boolean(q))
        }))
        .filter(g => g.questions.length > 1)
        .sort((a, b) => b.questions.length - a.questions.length),
    [units, questionMap]
  )

  const visibleGroups = groups.filter(g => unitFilter === "all" || g.unit === unitFilter)
  const unitsWithGroups = UNITS.filter(u => groups.some(g => g.unit === u.id))
  const active = visibleGroups.find(g => g.id === pickedId) ?? visibleGroups[0]
  const activeId = active?.id ?? null
  const totalRepeatQs = groups.reduce((n, g) => n + g.questions.length, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Repeated questions</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {groups.length > 0 ? `${groups.length} question patterns that came back across papers, ${totalRepeatQs} questions in all.` : "Question patterns that came back across papers."}
          </p>
        </div>
        {groups.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => onStartQuiz(buildListQuiz("Repeated questions", visibleGroups.flatMap(g => g.questions), settings, { mode: "custom" }))}
          >
            <Play className="w-4 h-4" />
            Practise repeats
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        <div className="space-y-2 lg:sticky lg:top-4">
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
            aria-label="Filter by unit"
          >
            <option value="all">All units</option>
            {unitsWithGroups.map(u => <option key={u.id} value={u.id}>{u.short}</option>)}
          </select>
          <Panel className="p-1.5 max-h-[45vh] lg:max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-6 text-center text-sm text-neutral-500">Loading clusters…</div>
            ) : (
              visibleGroups.map(g => {
                const solved = g.questions.filter(q => q.isAnswered && q.isCorrect).length
                return (
                  <button
                    key={g.id}
                    onClick={() => setPickedId(g.id)}
                    aria-current={activeId === g.id ? "true" : undefined}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      activeId === g.id ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-neutral-500">{unitById(g.unit)?.short}</span>
                      <span className="text-neutral-500 tabular-nums">
                        {solved === g.questions.length ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Done</span>
                        ) : (
                          `${g.questions.length}× asked, ${TYPE_LABEL[g.type]}`
                        )}
                      </span>
                    </div>
                    <div className={cn("text-sm mt-0.5 line-clamp-2", activeId === g.id ? "text-brand-900 dark:text-brand-100 font-medium" : "text-neutral-700 dark:text-neutral-300")}>
                      {g.title}
                    </div>
                  </button>
                )
              })
            )}
          </Panel>
        </div>

        <div className="space-y-4 min-w-0">
          {active ? (
            <>
              <Panel className="p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <div className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">
                  <p>
                    {active.questions.length} questions test the same idea. Solve the first one and skip the rest. Asked in {active.questions.map(q => q.year).join(", ")}.
                  </p>
                  <p className="mt-1"><span className="font-medium">How to solve: </span>{active.technique}</p>
                  <p className="mt-1"><span className="font-medium">What changes: </span>{active.whatChanges}</p>
                </div>
                <Button size="sm" variant="primary" onClick={() => onStartQuiz(buildListQuiz("Repeat cluster", active.questions, settings, { mode: "custom" }))}>
                  Practise
                </Button>
              </Panel>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                {[...active.questions].sort((a, b) => Number(b.id === active.rep) - Number(a.id === active.rep)).map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    source="repeats"
                    compact
                    header={<span className="font-medium text-neutral-700 dark:text-neutral-300">{q.id === active.rep ? "Do this one: " : ""}{q.year}, Q{q.q_num}</span>}
                  />
                ))}
              </div>
            </>
          ) : (
            !loading && <div className="text-center py-12 text-neutral-500 text-sm">Choose a cluster on the left.</div>
          )}
        </div>
      </div>
    </div>
  )
}
