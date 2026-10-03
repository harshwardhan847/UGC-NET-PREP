"use client"

import React, { useMemo } from "react"
import { AlertCircle, Bookmark, CalendarClock, Clock, Flame, Library, Play, Target, TrendingDown, XCircle } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { useSettings } from "@/lib/settings"
import type { QuizConfig } from "@/hooks/useQuizState"
import { UNITS, unitById } from "@/lib/constants"
import { computeStreaks, dateKey, daysUntil, formatDuration, pct, relativeDay, addDays } from "@/lib/analytics"
import { buildConceptQuiz, buildListQuiz, buildSmartQuiz, buildUnitQuiz } from "@/lib/quizBuilders"
import { cn } from "@/lib/utils"
import { ActivityHeatmap, DailyBars, GoalRing } from "./charts"
import { Button, EmptyState, Panel, PanelHeader, ProgressBar } from "./ui"
import type { View } from "./AppNav"

interface OverviewProps {
  onStartQuiz: (config: QuizConfig) => void
  onNavigate: (view: View, bankStatus?: "mistakes" | "bookmarked") => void
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return "Burning the midnight oil"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const MODE_LABEL: Record<string, string> = {
  practice: "Unit practice",
  mock: "Mock paper",
  custom: "Custom quiz",
  smart: "Smart practice",
  review: "Review"
}

export default function Overview({ onStartQuiz, onNavigate }: OverviewProps) {
  const { questions, stats } = useStudyData()
  const { settings } = useSettings()

  const daily = useMemo(() => stats?.daily ?? [], [stats])
  const totals = stats?.totals
  const todayKey = dateKey(new Date())
  const today = daily.find(d => d.date === todayKey)
  const answeredToday = today?.attempts ?? 0
  const streak = useMemo(() => computeStreaks(daily), [daily])
  const examIn = daysUntil(settings.examDate)

  const last7 = useMemo(() => {
    const from = dateKey(addDays(new Date(), -6))
    const prevFrom = dateKey(addDays(new Date(), -13))
    const cur = daily.filter(d => d.date >= from)
    const prev = daily.filter(d => d.date >= prevFrom && d.date < from)
    const sum = (arr: typeof daily, k: "attempts" | "correct" | "time") => arr.reduce((s, d) => s + d[k], 0)
    return {
      attempts: sum(cur, "attempts"),
      accuracy: pct(sum(cur, "correct"), sum(cur, "attempts")),
      prevAccuracy: sum(prev, "attempts") > 0 ? pct(sum(prev, "correct"), sum(prev, "attempts")) : null,
      time: sum(cur, "time")
    }
  }, [daily])

  // Concepts answered at least 3 times, weakest first
  const weakConcepts = useMemo(
    () =>
      (stats?.concepts ?? [])
        .filter(c => c.attempts >= 3 && c.name !== "Other Core Topics")
        .map(c => ({ ...c, accuracy: c.correct / c.attempts }))
        .filter(c => c.accuracy < 0.7)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5),
    [stats]
  )

  const mistakes = useMemo(() => questions.filter(q => q.isAnswered && !q.isCorrect), [questions])
  const bookmarks = useMemo(() => questions.filter(q => q.bookmarked), [questions])
  const isNewUser = (totals?.attempts ?? 0) === 0

  const name = settings.displayName.trim()
  const remaining = Math.max(0, settings.dailyGoal - answeredToday)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight">
            {greeting()}{name ? `, ${name}` : ""}.
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {isNewUser
              ? "Answer your first question to start tracking your progress."
              : remaining > 0
                ? `${remaining} more question${remaining === 1 ? "" : "s"} to reach today's goal of ${settings.dailyGoal}.`
                : `Today's goal is done. ${answeredToday} questions answered.`}
          </p>
        </div>
        {examIn !== null && examIn >= 0 ? (
          <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-neutral-300 dark:border-neutral-700 px-3.5 py-1.5 text-sm">
            <CalendarClock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span><span className="font-semibold tabular-nums">{examIn}</span> {examIn === 1 ? "day" : "days"} to your exam</span>
          </div>
        ) : (
          <button onClick={() => onNavigate("settings")} className="self-start sm:self-auto text-sm text-brand-700 dark:text-brand-300 hover:underline cursor-pointer inline-flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" /> Set your exam date
          </button>
        )}
      </div>

      {/* Today strip */}
      <Panel className="p-5 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex items-center gap-5">
          <GoalRing value={answeredToday} goal={settings.dailyGoal} />
          <div className="space-y-2.5">
            <div>
              <div className="text-sm font-semibold">Today&apos;s goal</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {today ? `${pct(today.correct, today.attempts)}% correct so far` : "Nothing answered yet today"}
              </div>
            </div>
            <Button variant="primary" onClick={() => onStartQuiz(buildSmartQuiz(questions, stats, settings))} disabled={questions.length === 0}>
              <Play className="w-4 h-4" />
              Start smart practice
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
          <Stat icon={<Flame className="w-4 h-4" />} label="Day streak" value={String(streak.current)} hint={streak.best > 0 ? `Best: ${streak.best} days` : "Practice daily to build it"} />
          <Stat
            icon={<Target className="w-4 h-4" />}
            label="Accuracy, last 7 days"
            value={last7.attempts > 0 ? `${last7.accuracy}%` : "–"}
            hint={
              last7.prevAccuracy !== null && last7.attempts > 0
                ? `${last7.accuracy - last7.prevAccuracy >= 0 ? "+" : ""}${last7.accuracy - last7.prevAccuracy} pts vs previous week`
                : `${totals ? pct(totals.correct, totals.attempts) : 0}% all time`
            }
          />
          <Stat
            icon={<Library className="w-4 h-4" />}
            label="Question bank covered"
            value={`${pct(totals?.attempted ?? 0, totals?.questions ?? 0)}%`}
            hint={`${totals?.attempted ?? 0} of ${totals?.questions ?? questions.length} seen`}
          />
          <Stat icon={<Clock className="w-4 h-4" />} label="Study time, 7 days" value={last7.time > 0 ? formatDuration(last7.time) : "–"} hint={`${last7.attempts} questions this week`} />
        </dl>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity */}
        <Panel className="lg:col-span-2 min-w-0">
          <PanelHeader title="Practice activity" description="Questions answered per day. Hover a square for details." />
          <div className="px-5 pb-5">
            <ActivityHeatmap daily={daily} goal={settings.dailyGoal} />
          </div>
        </Panel>

        {/* Next steps */}
        <Panel>
          <PanelHeader title="Focus next" description="Where extra practice will pay off most" />
          <div className="px-3 pb-3 space-y-1">
            <ActionRow
              icon={<XCircle className="w-4 h-4 text-rose-500" />}
              title="Review mistakes"
              detail={mistakes.length > 0 ? `${mistakes.length} to redo` : "Nothing to redo yet"}
              disabled={mistakes.length === 0}
              onPractice={() => onStartQuiz(buildListQuiz("Mistakes review", mistakes, settings))}
              onBrowse={() => onNavigate("bank", "mistakes")}
            />
            <ActionRow
              icon={<Bookmark className="w-4 h-4 text-amber-500" />}
              title="Bookmarked questions"
              detail={bookmarks.length > 0 ? `${bookmarks.length} saved` : "Save questions to revisit them here"}
              disabled={bookmarks.length === 0}
              onPractice={() => onStartQuiz(buildListQuiz("Bookmarks", bookmarks, settings))}
              onBrowse={() => onNavigate("bank", "bookmarked")}
            />
            {weakConcepts.length > 0 && (
              <div className="pt-3 px-2">
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" /> Weakest concepts
                </div>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {weakConcepts.map(c => (
                    <li key={`${c.unit}-${c.name}`}>
                      <button
                        onClick={() => onStartQuiz(buildConceptQuiz(questions, c.unit, c.name, settings))}
                        className="w-full flex items-center justify-between gap-3 py-2 text-left group cursor-pointer"
                        title="Practise this concept"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm truncate group-hover:text-brand-700 dark:group-hover:text-brand-300">{c.name}</span>
                          <span className="block text-[11px] text-neutral-500">{unitById(c.unit)?.short}</span>
                        </span>
                        <span className="text-sm tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">{Math.round(c.accuracy * 100)}%</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weakConcepts.length === 0 && !isNewUser && (
              <p className="px-2 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Weak concepts appear here once you&apos;ve answered a few questions on a topic and scored under 70%.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Panel className="lg:col-span-2 min-w-0">
          <PanelHeader title="Last 14 days" description="Correct and incorrect answers per day" />
          <div className="px-5 pb-5">
            <DailyBars daily={daily} goal={settings.dailyGoal} />
          </div>
        </Panel>

        {/* Unit mastery */}
        <Panel className="lg:col-span-3 min-w-0">
          <PanelHeader title="Syllabus mastery" description="Bar shows how much of each unit you've covered. Click a unit to practise it." />
          <div className="px-2 pb-3">
            <div className="hidden sm:grid grid-cols-[1fr_120px_56px_64px] gap-3 px-3 pb-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>Unit</span>
              <span>Covered</span>
              <span className="text-right">Seen</span>
              <span className="text-right">Accuracy</span>
            </div>
            {UNITS.map(unit => {
              const u = stats?.units[unit.id]
              const coverage = pct(u?.attempted ?? 0, u?.total ?? 0)
              const accuracy = u && u.attempts > 0 ? pct(u.correct, u.attempts) : null
              const tone = accuracy === null ? null : accuracy >= 70 ? "good" : accuracy >= 50 ? "ok" : "weak"
              return (
                <button
                  key={unit.id}
                  onClick={() => onStartQuiz(buildUnitQuiz(questions, unit.id, settings))}
                  className="w-full grid grid-cols-[1fr_56px_64px] sm:grid-cols-[1fr_120px_56px_64px] gap-3 items-center px-3 py-2 rounded-lg text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                  title={`Practise ${unit.name}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm truncate">
                      <span className="text-neutral-400 tabular-nums mr-2">{unit.id}</span>
                      {unit.short}
                    </span>
                    <ProgressBar value={coverage} className="sm:hidden mt-1.5" />
                  </span>
                  <ProgressBar value={coverage} className="hidden sm:block" />
                  <span className="text-right text-xs tabular-nums text-neutral-500">{u?.attempted ?? 0}/{u?.total ?? 0}</span>
                  <span className="text-right text-sm tabular-nums inline-flex items-center justify-end gap-1.5">
                    {tone && (
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full", tone === "good" ? "bg-emerald-500" : tone === "ok" ? "bg-amber-500" : "bg-rose-500")}
                        aria-hidden
                      />
                    )}
                    {accuracy === null ? <span className="text-neutral-400">–</span> : `${accuracy}%`}
                  </span>
                </button>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Sessions */}
      <Panel>
        <PanelHeader title="Recent quizzes" />
        {(stats?.history.length ?? 0) === 0 ? (
          <EmptyState icon={<AlertCircle className="w-5 h-5" />} title="No finished quizzes yet">
            Finish a quiz and your score, time and mode show up here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-neutral-500 dark:text-neutral-400 border-y border-neutral-100 dark:border-neutral-800">
                  <th className="font-medium px-5 py-2">Quiz</th>
                  <th className="font-medium px-3 py-2 hidden sm:table-cell">When</th>
                  <th className="font-medium px-3 py-2 hidden md:table-cell">Time taken</th>
                  <th className="font-medium px-3 py-2 text-right">Score</th>
                  <th className="font-medium px-5 py-2 text-right w-32 hidden sm:table-cell">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats!.history.slice(0, 8).map(s => {
                  const p = pct(s.score, s.total)
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium truncate max-w-[220px] sm:max-w-xs">{s.title || s.unitName || MODE_LABEL[s.mode] || s.mode}</div>
                        <div className="text-xs text-neutral-500">{MODE_LABEL[s.mode] ?? s.mode}<span className="sm:hidden">, {relativeDay(s.date)}</span></div>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400 hidden sm:table-cell whitespace-nowrap">{relativeDay(s.date)}</td>
                      <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400 hidden md:table-cell">{s.duration ? formatDuration(s.duration) : "–"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                        <span className="font-semibold">{s.score}</span>
                        <span className="text-neutral-500">/{s.total}</span>
                      </td>
                      <td className="px-5 py-2.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2 justify-end">
                          <ProgressBar value={p} className="w-16" tone={p >= 70 ? "good" : "brand"} />
                          <span className="tabular-nums text-xs w-9 text-right">{p}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 px-4 py-3.5">
      <dt className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </dt>
      <dd className="text-xl font-semibold tabular-nums mt-1">{value}</dd>
      <dd className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{hint}</dd>
    </div>
  )
}

function ActionRow({ icon, title, detail, onPractice, onBrowse, disabled }: { icon: React.ReactNode; title: string; detail: string; onPractice: () => void; onBrowse: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{detail}</div>
      </div>
      {!disabled && (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onBrowse}>View</Button>
          <Button size="sm" variant="secondary" onClick={onPractice}>Practise</Button>
        </div>
      )}
    </div>
  )
}
