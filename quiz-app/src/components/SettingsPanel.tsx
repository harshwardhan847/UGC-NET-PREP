"use client"

import React, { useState } from "react"
import { Check, Download, RotateCcw, Trash2 } from "lucide-react"
import { useSettings, type Accent } from "@/lib/settings"
import { useStudyData } from "@/hooks/useStudyData"
import { cn } from "@/lib/utils"
import { Button, ConfirmDialog, Panel, PanelHeader, Segmented, Switch } from "./ui"

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "indigo", label: "Indigo", swatch: "oklch(51.1% 0.262 276.966)" },
  { id: "blue", label: "Blue", swatch: "oklch(54.6% 0.245 262.881)" },
  { id: "teal", label: "Teal", swatch: "oklch(60% 0.118 184.704)" },
  { id: "violet", label: "Violet", swatch: "oklch(54.1% 0.281 293.009)" },
  { id: "rose", label: "Rose", swatch: "oklch(58.6% 0.253 17.585)" },
  { id: "orange", label: "Orange", swatch: "oklch(64.6% 0.222 41.116)" }
]

const inputClass =
  "h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"

export default function SettingsPanel() {
  const { settings, update, reset } = useSettings()
  const { refresh, stats } = useStudyData()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSettingsReset, setConfirmSettingsReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const exportProgress = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/progress")
      if (!res.ok) throw new Error()
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ugc-net-progress-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage("Progress exported.")
    } catch {
      setMessage("Export failed. Check that the dev server is running and try again.")
    } finally {
      setBusy(false)
    }
  }

  const resetProgress = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/progress", { method: "DELETE" })
      if (!res.ok) throw new Error()
      await refresh()
      setMessage("Progress cleared. Your bookmarks and notes were kept.")
    } catch {
      setMessage("Reset failed. Nothing was deleted.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Changes save automatically on this device.</p>
      </div>

      <Panel>
        <PanelHeader title="Appearance" />
        <div className="px-5 pb-5 space-y-5">
          <Row label="Theme">
            <Segmented
              value={settings.theme}
              onChange={theme => update({ theme })}
              ariaLabel="Theme"
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" }
              ]}
            />
          </Row>
          <Row label="Accent colour">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={settings.accent === a.id}
                  title={a.label}
                  onClick={() => update({ accent: a.id })}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 transition-shadow",
                    settings.accent === a.id ? "ring-2 ring-neutral-900 dark:ring-white" : "hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-600"
                  )}
                  style={{ background: a.swatch }}
                >
                  {settings.accent === a.id && <Check className="w-4 h-4 text-white" />}
                  <span className="sr-only">{a.label}</span>
                </button>
              ))}
            </div>
          </Row>
          <Row label="Question typeface">
            <Segmented
              value={settings.questionFont}
              onChange={questionFont => update({ questionFont })}
              ariaLabel="Question typeface"
              options={[
                { value: "serif", label: <span className="font-serif">Serif</span> },
                { value: "sans", label: <span className="font-sans">Sans</span> },
                { value: "mono", label: <span className="font-mono text-[13px]">Mono</span> }
              ]}
            />
          </Row>
          <Row label="Question text size">
            <Segmented
              value={settings.questionSize}
              onChange={questionSize => update({ questionSize })}
              ariaLabel="Question text size"
              options={[
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
                { value: "xl", label: "XL" }
              ]}
            />
          </Row>
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
            <div className="text-xs text-neutral-500 mb-2">Preview</div>
            <p className="q-text">Which of the following page replacement algorithms suffers from Belady&apos;s anomaly?</p>
            <p className="q-option mt-2 text-neutral-600 dark:text-neutral-400">(A) FIFO&nbsp;&nbsp; (B) LRU&nbsp;&nbsp; (C) Optimal&nbsp;&nbsp; (D) LFU</p>
          </div>
          <Switch id="reduce-motion" checked={settings.reduceMotion} onChange={reduceMotion => update({ reduceMotion })} label="Reduce motion" description="Turn off card and panel animations." />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Study plan" description="Used for your daily goal, streak and exam countdown on the overview." />
        <div className="px-5 pb-5 space-y-4">
          <Row label="Your name">
            <input className={cn(inputClass, "w-full sm:w-56")} value={settings.displayName} onChange={e => update({ displayName: e.target.value })} placeholder="Optional" maxLength={40} />
          </Row>
          <Row label="Exam date">
            <div className="flex items-center gap-2">
              <input type="date" className={inputClass} value={settings.examDate} onChange={e => update({ examDate: e.target.value })} />
              {settings.examDate && (
                <Button size="sm" variant="ghost" onClick={() => update({ examDate: "" })}>Clear</Button>
              )}
            </div>
          </Row>
          <Row label={`Daily goal: ${settings.dailyGoal} questions`}>
            <input type="range" min={5} max={150} step={5} value={settings.dailyGoal} onChange={e => update({ dailyGoal: Number(e.target.value) })} className="w-full sm:w-56 accent-brand-600" />
          </Row>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Quizzes" description="Defaults for new quizzes. You can still change them on the Practice page." />
        <div className="px-5 pb-3">
          <div className="space-y-4 pb-2">
            <Row label={`Questions per quiz: ${settings.practiceCount}`}>
              <input type="range" min={5} max={100} step={5} value={settings.practiceCount} onChange={e => update({ practiceCount: Number(e.target.value) })} className="w-full sm:w-56 accent-brand-600" />
            </Row>
            <Row label={settings.secondsPerQuestion === 0 ? "Timer: off" : `Timer: ${settings.secondsPerQuestion}s per question`}>
              <input type="range" min={0} max={240} step={15} value={settings.secondsPerQuestion} onChange={e => update({ secondsPerQuestion: Number(e.target.value) })} className="w-full sm:w-56 accent-brand-600" />
            </Row>
            <Row label="Practice feedback">
              <Segmented
                value={settings.feedbackMode}
                onChange={feedbackMode => update({ feedbackMode })}
                ariaLabel="Practice feedback"
                options={[
                  { value: "instant", label: "After each question" },
                  { value: "exam", label: "At the end" }
                ]}
              />
            </Row>
            <Row label="Mock paper feedback">
              <Segmented
                value={settings.mockFeedbackMode}
                onChange={mockFeedbackMode => update({ mockFeedbackMode })}
                ariaLabel="Mock paper feedback"
                options={[
                  { value: "instant", label: "After each question" },
                  { value: "exam", label: "At the end" }
                ]}
              />
            </Row>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
            <Switch id="auto-advance" checked={settings.autoAdvance} onChange={autoAdvance => update({ autoAdvance })} label="Move on after a correct answer" description="Goes to the next question automatically when you get one right." />
            <Switch id="ai-reinforce" checked={settings.aiReinforcement} onChange={aiReinforcement => update({ aiReinforcement })} label="AI drill on wrong answers" description="When you get a question wrong, the tutor explains the gap and gives you a simpler follow-up question. Needs a Gemini API key." />
            <Switch id="tutor-open" checked={settings.tutorOpenByDefault} onChange={tutorOpenByDefault => update({ tutorOpenByDefault })} label="Open the AI tutor panel when a quiz starts" description="On small screens the tutor always starts closed." />
            <Switch id="show-timer" checked={settings.showTimer} onChange={showTimer => update({ showTimer })} label="Show the timer" description="When off, the timer is hidden until the last two minutes." />
            <Switch id="shortcuts" checked={settings.keyboardShortcuts} onChange={keyboardShortcuts => update({ keyboardShortcuts })} label="Keyboard shortcuts" description="1–4 to answer, Enter to check, arrow keys to move. Press ? in a quiz for the full list." />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Your data" description={stats ? `${stats.totals.attempts.toLocaleString()} answers, ${stats.totals.sessions} quizzes and ${stats.totals.bookmarks} bookmarks are stored in the local database.` : undefined} />
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button onClick={exportProgress} disabled={busy}>
            <Download className="w-4 h-4" />
            Export progress
          </Button>
          <Button onClick={() => setConfirmSettingsReset(true)}>
            <RotateCcw className="w-4 h-4" />
            Restore default settings
          </Button>
          <Button variant="ghost" className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setConfirmReset(true)} disabled={busy}>
            <Trash2 className="w-4 h-4" />
            Clear progress
          </Button>
        </div>
        {message && <p className="px-5 pb-4 -mt-2 text-sm text-neutral-600 dark:text-neutral-400" role="status">{message}</p>}
      </Panel>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Clear all progress?"
        description="This permanently deletes every answer and quiz in your history, including your streak and mastery stats. Bookmarks and notes are kept. Export your progress first if you might want it back."
        confirmLabel="Clear progress"
        destructive
        onConfirm={resetProgress}
      />
      <ConfirmDialog
        open={confirmSettingsReset}
        onOpenChange={setConfirmSettingsReset}
        title="Restore default settings?"
        description="Theme, accent, quiz defaults and your study plan go back to their defaults. Your progress isn't affected."
        confirmLabel="Restore defaults"
        onConfirm={reset}
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}
