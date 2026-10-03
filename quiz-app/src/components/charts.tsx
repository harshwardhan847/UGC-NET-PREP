"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { addDays, dateKey, pct, formatDuration } from "@/lib/analytics"
import type { DailyActivity } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TooltipState {
  x: number
  y: number
  content: React.ReactNode
}

function Tooltip({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full -mt-2 whitespace-nowrap rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </div>
  )
}

const formatDayLabel = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })

// Sequential ramp in the accent hue: more answered → stronger. Level 0 is "no activity".
const HEAT_LEVELS = [
  "bg-neutral-200/80 dark:bg-neutral-800",
  "bg-brand-200 dark:bg-brand-900",
  "bg-brand-400 dark:bg-brand-700",
  "bg-brand-600 dark:bg-brand-500",
  "bg-brand-800 dark:bg-brand-300"
]

const heatLevel = (attempts: number, goal: number) => {
  if (attempts <= 0) return 0
  const ratio = attempts / Math.max(1, goal)
  if (ratio < 0.34) return 1
  if (ratio < 0.67) return 2
  if (ratio < 1) return 3
  return 4
}

const CELL = 13
const GAP = 3
const DAY_LABEL_WIDTH = 32

// Shows as many weeks as fit the panel (between 18 and 53), most recent on the right.
export function ActivityHeatmap({ daily, goal }: { daily: DailyActivity[]; goal: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<TooltipState | null>(null)
  const [weeks, setWeeks] = useState(26)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width - DAY_LABEL_WIDTH + GAP) / (CELL + GAP))
      setWeeks(Math.max(18, Math.min(53, fit)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { columns, monthLabels } = useMemo(() => {
    const byDate = new Map(daily.map(d => [d.date, d]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Weeks start on Monday; the last column holds the current week
    const mondayOffset = (today.getDay() + 6) % 7
    const start = addDays(today, -mondayOffset - (weeks - 1) * 7)

    const cols: { key: string; day: DailyActivity | undefined; future: boolean }[][] = []
    const labels: { index: number; label: string }[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d)
        const key = dateKey(date)
        col.push({ key, day: byDate.get(key), future: date > today })
        if (d === 0 && date.getMonth() !== lastMonth) {
          // Skip a label that would collide with the previous one (e.g. a partial first month)
          const prev = labels[labels.length - 1]
          if (prev && w - prev.index < 3) labels.pop()
          labels.push({ index: w, label: date.toLocaleDateString([], { month: "short" }) })
          lastMonth = date.getMonth()
        }
      }
      cols.push(col)
    }
    return { columns: cols, monthLabels: labels }
  }, [daily, weeks])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [columns])

  const showTip = (e: React.MouseEvent | React.FocusEvent, key: string, day: DailyActivity | undefined) => {
    const wrap = wrapRef.current?.getBoundingClientRect()
    const cell = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (!wrap) return
    setTip({
      x: cell.left - wrap.left + cell.width / 2,
      y: cell.top - wrap.top,
      content: (
        <span>
          <span className="font-semibold">{formatDayLabel(key)}</span>
          <span className="opacity-80">
            {day && day.attempts > 0
              ? `: ${day.attempts} answered, ${pct(day.correct, day.attempts)}% correct`
              : ": no practice"}
          </span>
        </span>
      )
    })
  }

  return (
    <div ref={wrapRef} className="relative">
      <div ref={scrollRef} className="overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-2 w-max">
          <div className="flex flex-col pt-5 text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0" style={{ gap: GAP, width: DAY_LABEL_WIDTH - 8 }}>
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>{d}</span>
            ))}
          </div>
          <div>
            <div className="relative h-5 text-[10px] text-neutral-500 dark:text-neutral-400">
              {monthLabels.map(m => (
                <span key={m.index} className="absolute top-0" style={{ left: m.index * (CELL + GAP) }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }} onMouseLeave={() => setTip(null)}>
              {columns.map((col, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                  {col.map(({ key, day, future }) => (
                    <div
                      key={key}
                      tabIndex={future ? -1 : 0}
                      aria-label={`${formatDayLabel(key)}: ${day?.attempts || 0} answered`}
                      onMouseEnter={e => !future && showTip(e, key, day)}
                      onFocus={e => !future && showTip(e, key, day)}
                      onBlur={() => setTip(null)}
                      className={cn("rounded-[3px] outline-offset-1", future ? "bg-transparent" : HEAT_LEVELS[heatLevel(day?.attempts || 0, goal)])}
                      style={{ width: CELL, height: CELL }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <span>Less</span>
        {HEAT_LEVELS.map((cls, i) => (
          <span key={i} className={cn("rounded-[3px]", cls)} style={{ width: 11, height: 11 }} />
        ))}
        <span>Goal met</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}

// Stacked correct / incorrect answers per day, with the daily goal as a reference line.
export function DailyBars({ daily, goal, days = 14 }: { daily: DailyActivity[]; goal: number; days?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<TooltipState | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const series = useMemo(() => {
    const byDate = new Map(daily.map(d => [d.date, d]))
    const today = new Date()
    return Array.from({ length: days }, (_, i) => {
      const key = dateKey(addDays(today, i - days + 1))
      const d = byDate.get(key)
      return { key, attempts: d?.attempts || 0, correct: d?.correct || 0, time: d?.time || 0 }
    })
  }, [daily, days])

  const rawMax = Math.max(goal, ...series.map(s => s.attempts), 1)
  const step = rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : rawMax <= 60 ? 10 : rawMax <= 150 ? 25 : 50
  const max = Math.ceil(rawMax / step) * step
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  const H = 160

  const showTip = (e: React.MouseEvent | React.FocusEvent, s: (typeof series)[number]) => {
    const wrap = wrapRef.current?.getBoundingClientRect()
    const col = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (!wrap) return
    setHovered(s.key)
    setTip({
      x: col.left - wrap.left + col.width / 2,
      y: Math.max(8, col.bottom - wrap.top - (s.attempts / max) * H - 8),
      content: s.attempts > 0 ? (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{formatDayLabel(s.key)}</span>
          <span>{s.correct} correct, {s.attempts - s.correct} incorrect</span>
          <span className="opacity-75">{pct(s.correct, s.attempts)}% accuracy{s.time > 0 ? `, ${formatDuration(s.time)}` : ""}</span>
        </span>
      ) : (
        <span><span className="font-semibold">{formatDayLabel(s.key)}</span>: no practice</span>
      )
    })
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-4 mb-3 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Correct</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 dark:bg-rose-500" />Incorrect</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-neutral-400" />Daily goal</span>
      </div>
      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative w-6 shrink-0 text-[10px] text-neutral-500 dark:text-neutral-400" style={{ height: H }}>
          {ticks.map(t => (
            <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: H - (t / max) * H }}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          {/* gridlines */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: H }}>
            {ticks.map(t => (
              <div key={t} className="absolute inset-x-0 border-t border-neutral-200/80 dark:border-neutral-800" style={{ top: H - (t / max) * H }} />
            ))}
            <div className="absolute inset-x-0 border-t-2 border-dashed border-neutral-400/80 dark:border-neutral-500" style={{ top: H - (goal / max) * H }} />
          </div>
          <div className="relative flex items-end gap-[2px] sm:gap-1" style={{ height: H }} onMouseLeave={() => { setTip(null); setHovered(null) }}>
            {series.map(s => {
              const correctH = (s.correct / max) * H
              const wrongH = ((s.attempts - s.correct) / max) * H
              return (
                <div
                  key={s.key}
                  tabIndex={0}
                  aria-label={`${formatDayLabel(s.key)}: ${s.correct} correct, ${s.attempts - s.correct} incorrect`}
                  onMouseEnter={e => showTip(e, s)}
                  onFocus={e => showTip(e, s)}
                  onBlur={() => { setTip(null); setHovered(null) }}
                  className={cn("flex-1 h-full flex flex-col justify-end items-center rounded-md transition-colors", hovered === s.key && "bg-neutral-100 dark:bg-neutral-800/60")}
                >
                  <div className="w-full max-w-[22px] flex flex-col gap-[2px]">
                    {wrongH > 0 && <div className="w-full bg-rose-400 dark:bg-rose-500 rounded-t-[4px]" style={{ height: Math.max(2, wrongH - 1) }} />}
                    {correctH > 0 && <div className={cn("w-full bg-emerald-500", wrongH > 0 ? "" : "rounded-t-[4px]")} style={{ height: Math.max(2, correctH - 1) }} />}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-[2px] sm:gap-1 mt-1.5">
            {series.map((s, i) => (
              <span key={s.key} className="flex-1 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                {i === series.length - 1 ? "Today" : i % 2 === (series.length - 1) % 2 ? new Date(`${s.key}T00:00:00`).toLocaleDateString([], { day: "numeric" }) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}

// Circular progress for the daily goal
export function GoalRing({ value, goal, size = 88 }: { value: number; goal: number; size?: number }) {
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, value / Math.max(1, goal))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} of ${goal} questions today`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-neutral-800" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={cn("transition-[stroke-dashoffset] duration-700", ratio >= 1 ? "stroke-emerald-500" : "stroke-brand-500")}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-current text-lg font-semibold">{value}</text>
      <text x="50%" y="67%" textAnchor="middle" dominantBaseline="middle" className="fill-neutral-500 text-[10px]">of {goal}</text>
    </svg>
  )
}
