"use client"

import React, { useMemo, useState } from "react"
import { CheckCircle2, ChevronDown, Minus, Play, TrendingDown, TrendingUp } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useStudyMap } from "@/hooks/useStudyMap"
import { useSettings } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import type { Question, StudyCluster, StudyTopic } from "@/lib/types"
import { UNITS, unitById } from "@/lib/constants"
import { pct } from "@/lib/analytics"
import { buildRepsQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { Button, Panel, ProgressBar, Segmented } from "./ui"
import QuestionCard from "./QuestionCard"

type Tab = "priorities" | "clusters" | "mindset" | "formulas" | "plan"

const PRIORITY: Record<StudyTopic["priority"], string> = {
  Must: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  High: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Medium: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Low: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
}

const CLUSTER_TYPE: Record<StudyCluster["type"], string> = {
  "exact-repeat": "Exact repeat",
  "same-concept-variant": "Same concept",
  "same-formula": "Same formula"
}

const TREND_ICON = { rising: TrendingUp, steady: Minus, fading: TrendingDown }

export default function StudyPlan({ onStartQuiz }: { onStartQuiz: (config: QuizConfig) => void }) {
  const { questionMap } = useStudyData()
  const { units, loading } = useStudyMap()
  const { settings } = useSettings()
  const [unitId, setUnitId] = useState(1)
  const [tab, setTab] = useState<Tab>("priorities")
  const [openCluster, setOpenCluster] = useState<string | null>(null)

  const study = units.find(u => u.unit === unitId)
  const unit = unitById(unitId)

  const resolve = (ids: string[]) => ids.map(id => questionMap.get(id)).filter((q): q is Question => Boolean(q))

  // A cluster counts as learned once any question in it has been answered correctly
  const clusters = useMemo(
    () =>
      (study?.clusters ?? []).map(c => {
        const members = c.members.map(id => questionMap.get(id)).filter((q): q is Question => Boolean(q))
        return { ...c, questions: members, learned: members.some(q => q.isAnswered && q.isCorrect) }
      }),
    [study, questionMap]
  )
  const learned = clusters.filter(c => c.learned).length
  const skippable = clusters.reduce((n, c) => n + c.members.length - 1, 0)
  const topicClusters = (topic: string) => clusters.filter(c => c.topic === topic)

  const startReps = (title: string, ids: string[]) => onStartQuiz(buildRepsQuiz(title, resolve(ids), settings, unitId))

  const repIds = (list: typeof clusters) => list.map(c => c.representative)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Study plan</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Built from every past paper. Questions that test the same idea are grouped, so you solve one and skip the rest.
        </p>
      </div>

      <select
        value={unitId}
        onChange={e => setUnitId(Number(e.target.value))}
        className="lg:hidden w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        aria-label="Unit"
      >
        {UNITS.map(u => <option key={u.id} value={u.id}>{u.id}. {u.name}</option>)}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <nav className="hidden lg:block space-y-0.5 sticky top-4" aria-label="Units">
          {UNITS.map(u => (
            <button
              key={u.id}
              onClick={() => setUnitId(u.id)}
              aria-current={unitId === u.id ? "true" : undefined}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                unitId === u.id ? "bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-200 font-semibold" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
              )}
            >
              <span className="text-neutral-400 tabular-nums mr-1.5">{u.id}</span>{u.short}
            </button>
          ))}
        </nav>

        <div className="space-y-4 min-w-0">
          {loading || !study ? (
            <Panel className="p-8 text-center text-sm text-neutral-500">{loading ? "Loading study plan…" : "No analysis for this unit yet."}</Panel>
          ) : (
            <>
              <Panel className="p-5">
                <h2 className="text-lg font-semibold">{unit?.name}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <Stat label="Past questions" value={study.total_questions} />
                  <Stat label="Distinct ideas" value={clusters.length + study.singletons.length} />
                  <Stat label="Safe to skip" value={skippable} />
                  <Stat label="Ideas learned" value={`${learned}/${clusters.length}`} />
                </dl>
                <ProgressBar value={pct(learned, clusters.length)} className="mt-4 h-1.5" />
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" variant="primary" onClick={() => startReps(`${unit?.short}: key questions`, study.minimum_set)}>
                    <Play className="w-3.5 h-3.5" />
                    Practise the minimum set ({study.minimum_set.length})
                  </Button>
                </div>
              </Panel>

              <div className="overflow-x-auto">
                <Segmented
                  value={tab}
                  onChange={setTab}
                  ariaLabel="Section"
                  options={[
                    { value: "priorities", label: "Priorities" },
                    { value: "clusters", label: `Similar questions (${clusters.length})` },
                    { value: "mindset", label: "Examiner mindset" },
                    { value: "formulas", label: `Formulas (${study.formulas.length})` },
                    { value: "plan", label: "Learning plan" }
                  ]}
                />
              </div>

              {tab === "priorities" && (
                <div className="space-y-2">
                  {study.topics.map(t => {
                    const Trend = TREND_ICON[t.trend]
                    const tc = topicClusters(t.topic)
                    return (
                      <Panel key={t.topic} className="p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{t.topic}</span>
                          <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", PRIORITY[t.priority])}>{t.priority}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-500"><Trend className="w-3.5 h-3.5" />{t.trend}</span>
                          <span className="text-xs text-neutral-500 tabular-nums ml-auto">
                            {t.count} Qs, {t.papers} papers, {t.first_year} to {t.last_year}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.why}</p>
                        {t.what_to_study.length > 0 && (
                          <ul className="text-sm list-disc pl-5 space-y-0.5 text-neutral-700 dark:text-neutral-300">
                            {t.what_to_study.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        )}
                        {tc.length > 0 && (
                          <Button size="sm" variant="secondary" onClick={() => startReps(t.topic, repIds(tc))}>
                            <Play className="w-3.5 h-3.5" />
                            Practise {tc.length} key {tc.length === 1 ? "question" : "questions"}
                          </Button>
                        )}
                      </Panel>
                    )
                  })}
                </div>
              )}

              {tab === "clusters" && (
                <div className="space-y-2">
                  {clusters.map(c => {
                    const open = openCluster === c.id
                    const rep = questionMap.get(c.representative)
                    return (
                      <Panel key={c.id} className="overflow-hidden">
                        <button
                          onClick={() => setOpenCluster(open ? null : c.id)}
                          aria-expanded={open}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold">{c.title}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-600 dark:text-neutral-400">{CLUSTER_TYPE[c.type]}</span>
                              {c.learned && <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Learned</span>}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {c.topic}. {c.members.length} questions: do 1, skip {c.members.length - 1}
                            </div>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-neutral-400 transition-transform shrink-0", !open && "-rotate-90")} />
                        </button>
                        {open && (
                          <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/30 p-4 space-y-3">
                            <div className="text-sm space-y-1">
                              <p><span className="font-medium">How to solve: </span>{c.technique}</p>
                              <p><span className="font-medium">What changes: </span>{c.what_changes}</p>
                              <p className="text-neutral-500">{c.skip_note}</p>
                            </div>
                            {rep && <QuestionCard question={rep} source="weightage" compact header={<span className="font-medium text-brand-700 dark:text-brand-300">Do this one, {rep.year} Q{rep.q_num}</span>} />}
                            <details className="text-sm">
                              <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
                                {c.members.length - 1} similar questions you can skip
                              </summary>
                              <div className="mt-2 space-y-3">
                                {c.questions.filter(q => q.id !== c.representative).map(q => (
                                  <QuestionCard key={q.id} question={q} source="weightage" compact defaultCollapsed header={<span className="font-medium text-neutral-700 dark:text-neutral-300">{q.year}, Q{q.q_num}</span>} />
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </Panel>
                    )
                  })}
                </div>
              )}

              {tab === "mindset" && (
                <Panel className="p-5">
                  <ul className="space-y-2.5 text-sm list-disc pl-5 text-neutral-700 dark:text-neutral-300">
                    {study.examiner_mindset.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </Panel>
              )}

              {tab === "formulas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {study.formulas.map((f, i) => (
                    <Panel key={i} className="p-4 space-y-1.5">
                      <div className="text-sm font-semibold">{f.name}</div>
                      <div className="font-mono text-[13px] whitespace-pre-wrap rounded bg-neutral-100 dark:bg-neutral-800/60 px-2 py-1.5">{f.formula}</div>
                      {f.note && <p className="text-xs text-neutral-600 dark:text-neutral-400">{f.note}</p>}
                      <p className="text-[11px] text-neutral-500">Asked in {f.used_in.length} {f.used_in.length === 1 ? "question" : "questions"}</p>
                    </Panel>
                  ))}
                </div>
              )}

              {tab === "plan" && (
                <ol className="space-y-2">
                  {study.study_plan.map(s => (
                    <Panel key={s.step} className="p-4 flex gap-3">
                      <span className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-sm font-semibold flex items-center justify-center shrink-0">{s.step}</span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{s.focus}</span>
                          <span className="text-xs text-neutral-500 tabular-nums">about {s.hours} h</span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{s.do}</p>
                        <p className="text-xs text-neutral-500">{s.topics.join(", ")}</p>
                      </div>
                    </Panel>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
