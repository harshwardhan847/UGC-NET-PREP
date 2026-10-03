"use client"

import React, { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Play } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useSettings } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import type { Question } from "@/lib/types"
import { UNITS, unitById } from "@/lib/constants"
import { pct } from "@/lib/analytics"
import { buildConceptQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { Button, Panel, ProgressBar } from "./ui"
import QuestionCard from "./QuestionCard"

type Importance = "critical" | "frequent" | "occasional"

const IMPORTANCE: Record<Importance, { label: string; className: string }> = {
  critical: { label: "Must do", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  frequent: { label: "Frequent", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  occasional: { label: "Occasional", className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400" }
}

const CONCEPT_PAGE = 5

export default function SyllabusWeightage({ onStartQuiz }: { onStartQuiz: (config: QuizConfig) => void }) {
  const { questions, stats } = useStudyData()
  const { settings } = useSettings()
  const [activeUnitId, setActiveUnitId] = useState<number>(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [shown, setShown] = useState(CONCEPT_PAGE)

  const unitQuestions = useMemo(() => questions.filter(q => q.unit === activeUnitId), [questions, activeUnitId])

  const concepts = useMemo(() => {
    const map = new Map<string, Question[]>()
    unitQuestions.forEach(q => map.set(q.conceptName, [...(map.get(q.conceptName) || []), q]))
    const total = unitQuestions.length
    return Array.from(map.entries())
      .map(([name, qs]) => {
        const share = pct(qs.length, total)
        const importance: Importance = share >= 20 ? "critical" : share >= 10 ? "frequent" : "occasional"
        const years = new Set(qs.map(q => q.year)).size
        return {
          name,
          questions: qs,
          share,
          years,
          importance,
          answered: qs.filter(q => q.isAnswered).length,
          correct: qs.filter(q => q.isAnswered && q.isCorrect).length
        }
      })
      .sort((a, b) => b.questions.length - a.questions.length)
  }, [unitQuestions])

  const maxCount = concepts[0]?.questions.length ?? 1
  const unit = unitById(activeUnitId)
  const unitStats = stats?.units[activeUnitId]

  const selectUnit = (id: number) => {
    setActiveUnitId(id)
    setExpanded(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Topic weightage</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">How often each concept has appeared in past papers, so you know where to spend your time.</p>
      </div>

      {/* Unit picker on small screens */}
      <select
        value={activeUnitId}
        onChange={e => selectUnit(Number(e.target.value))}
        className="lg:hidden w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        aria-label="Unit"
      >
        {UNITS.map(u => <option key={u.id} value={u.id}>{u.id}. {u.name}</option>)}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <nav className="hidden lg:block space-y-0.5 sticky top-4" aria-label="Units">
          {UNITS.map(u => {
            const s = stats?.units[u.id]
            return (
              <button
                key={u.id}
                onClick={() => selectUnit(u.id)}
                aria-current={activeUnitId === u.id ? "true" : undefined}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  activeUnitId === u.id ? "bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-200" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
                )}
              >
                <div className="flex justify-between items-baseline gap-2 text-sm">
                  <span className={cn("truncate", activeUnitId === u.id && "font-semibold")}>
                    <span className="text-neutral-400 tabular-nums mr-1.5">{u.id}</span>{u.short}
                  </span>
                  <span className="text-[11px] text-neutral-500 tabular-nums shrink-0">{s?.total ?? 0}</span>
                </div>
                <ProgressBar value={pct(s?.attempted ?? 0, s?.total ?? 0)} className="mt-1.5 h-1" />
              </button>
            )
          })}
        </nav>

        <div className="space-y-4 min-w-0">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold">{unit?.name}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{unit?.desc}</p>
            <dl className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <dt className="text-xs text-neutral-500">Questions seen</dt>
                <dd className="text-lg font-semibold tabular-nums">{unitStats?.attempted ?? 0}<span className="text-sm text-neutral-400 font-normal">/{unitStats?.total ?? unitQuestions.length}</span></dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Correct now</dt>
                <dd className="text-lg font-semibold tabular-nums">{unitStats?.mastered ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Accuracy</dt>
                <dd className="text-lg font-semibold tabular-nums">{unitStats && unitStats.attempts > 0 ? `${pct(unitStats.correct, unitStats.attempts)}%` : "–"}</dd>
              </div>
            </dl>
          </Panel>

          <div className="space-y-2">
            {concepts.map(c => {
              const isOpen = expanded === c.name
              return (
                <Panel key={c.name} className="overflow-hidden">
                  <button
                    onClick={() => {
                      setExpanded(isOpen ? null : c.name)
                      setShown(CONCEPT_PAGE)
                    }}
                    aria-expanded={isOpen}
                    className="w-full text-left px-4 py-3.5 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{c.name}</span>
                        <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", IMPORTANCE[c.importance].className)}>{IMPORTANCE[c.importance].label}</span>
                      </div>
                      {/* Bar length = share of this unit's past questions */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-sm h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.questions.length / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                          {c.questions.length} Qs, {c.share}% of unit, in {c.years} papers
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm tabular-nums">{c.answered}/{c.questions.length}</div>
                      <div className="text-[11px] text-neutral-500">{c.answered > 0 ? `${pct(c.correct, c.answered)}% correct` : "not started"}</div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-neutral-400 transition-transform shrink-0", !isOpen && "-rotate-90")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/30 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-neutral-500">Showing {Math.min(shown, c.questions.length)} of {c.questions.length}</span>
                            <Button size="sm" variant="primary" onClick={() => onStartQuiz(buildConceptQuiz(questions, activeUnitId, c.name, settings))}>
                              <Play className="w-3.5 h-3.5" />
                              Practise concept
                            </Button>
                          </div>
                          {c.questions.slice(0, shown).map(q => (
                            <QuestionCard key={q.id} question={q} source="weightage" compact />
                          ))}
                          {shown < c.questions.length && (
                            <div className="flex justify-center">
                              <Button size="sm" onClick={() => setShown(n => n + CONCEPT_PAGE)}>Show more</Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Panel>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
