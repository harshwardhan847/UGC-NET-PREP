"use client"

import React, { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Clock, Eraser, FileText, Flag, Grid3x3, Keyboard, MessageSquare,
  Pause, Play, Sparkles, X
} from "lucide-react"
import type { QuizState } from "@/hooks/useQuizState"
import { useSettings } from "@/lib/settings"
import { useStudyData } from "@/hooks/useStudyData"
import { formatClock } from "@/lib/analytics"
import { getPaperFriendlyName } from "@/lib/constants"
import { OPTION_KEYS, type OptionKey, type Question } from "@/lib/types"
import { cn } from "@/lib/utils"
import QuestionText from "./QuestionText"
import { BookmarkButton, NoteEditor, OptionButton } from "./QuestionCard"
import PdfViewer, { type PdfView } from "./PdfViewer"
import { Button, ConfirmDialog, Kbd, Modal } from "./ui"

interface QuizArenaProps {
  quiz: QuizState
  tutorOpen: boolean
  setTutorOpen: (open: boolean) => void
  onRequestQuit: () => void
}

type PaletteStatus = "new" | "visited" | "answered" | "skipped" | "correct" | "wrong" | "unanswered"

const PALETTE_STYLES: Record<PaletteStatus, string> = {
  new: "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300",
  visited: "border border-neutral-400 dark:border-neutral-500 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
  skipped: "border border-dashed border-amber-500 text-amber-700 dark:text-amber-400",
  answered: "bg-brand-600 text-white",
  correct: "bg-emerald-600 text-white",
  wrong: "bg-rose-600 text-white",
  unanswered: "border border-neutral-300 dark:border-neutral-700 text-neutral-400"
}

const SHORTCUTS: [string, string][] = [
  ["1 – 4", "Choose option A – D"],
  ["Enter", "Check answer / save and go to next"],
  ["← →", "Previous / next question"],
  ["S", "Skip question"],
  ["M", "Mark for review"],
  ["B", "Bookmark"],
  ["O", "View in the original paper"],
  ["G", "Show question palette"],
  ["T", "Open AI tutor"],
  ["P", "Pause timer"],
  ["?", "Show these shortcuts"]
]

export default function QuizArena({ quiz, tutorOpen, setTutorOpen, onRequestQuit }: QuizArenaProps) {
  const { settings } = useSettings()
  const { toggleBookmark } = useStudyData()
  const { config, questions, currentQ, currentIndex, answers, checked, skipped, marked, visited, phase, isInstant, isFinished } = quiz
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [timerHidden, setTimerHidden] = useState(!settings.showTimer)
  const [noteOpen, setNoteOpen] = useState(false)
  const [pdfView, setPdfView] = useState<PdfView | null>(null)

  const [noteIndex, setNoteIndex] = useState(currentIndex)
  if (noteIndex !== currentIndex) {
    setNoteIndex(currentIndex)
    setNoteOpen(false)
  }

  const answeredCount = useMemo(() => questions.filter(q => answers[q.id]).length, [questions, answers])
  const unanswered = questions.length - answeredCount
  const markedCount = Object.keys(marked).length
  const canPause = config?.mode !== "mock" && phase === "running"

  const statusOf = (q: Question): PaletteStatus => {
    const choice = answers[q.id]
    if (isFinished || checked[q.id]) {
      if (!choice) return "unanswered"
      return choice === q.answer ? "correct" : "wrong"
    }
    if (choice) return "answered"
    if (skipped[q.id]) return "skipped"
    if (visited[q.id]) return "visited"
    return "new"
  }

  const requestFinish = () => {
    if (unanswered > 0 || markedCount > 0) setConfirmFinish(true)
    else quiz.finishQuiz()
  }

  const isRevealed = currentQ ? isFinished || Boolean(checked[currentQ.id]) : false

  const primaryAction = () => {
    if (!currentQ || phase !== "running") return
    if (isInstant && answers[currentQ.id] && !checked[currentQ.id]) quiz.submitAnswer(currentQ.id)
    else if (currentIndex < questions.length - 1) quiz.goNext()
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts || !currentQ) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      const optionIndex = ["1", "2", "3", "4"].indexOf(key)
      if (optionIndex >= 0 && phase === "running" && !quiz.paused) {
        const opt = OPTION_KEYS[optionIndex]
        if (currentQ.options[opt]) quiz.selectAnswer(currentQ.id, opt)
      } else if (key === "enter") {
        if (phase === "running" && !quiz.paused) primaryAction()
      } else if (key === "arrowright") quiz.goNext()
      else if (key === "arrowleft") quiz.goPrev()
      else if (key === "s" && phase === "running") quiz.skipQuestion(currentQ.id)
      else if (key === "m" && phase === "running") quiz.toggleMarked(currentQ.id)
      else if (key === "b") toggleBookmark(currentQ.id)
      else if (key === "o" && currentQ.pdf && !quiz.paused) setPdfView("question")
      else if (key === "g") setPaletteOpen(o => !o)
      else if (key === "t") setTutorOpen(!tutorOpen)
      else if (key === "p" && canPause) quiz.setPaused(!quiz.paused)
      else if (key === "?") setHelpOpen(true)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (!config || !currentQ) return <div className="p-8 text-center text-neutral-500">Loading questions…</div>

  const choice = answers[currentQ.id]
  const result = checked[currentQ.id]
  const isCorrectNow = choice === currentQ.answer

  const optionState = (key: OptionKey) => {
    if (isRevealed) {
      if (key === currentQ.answer) return "correct" as const
      if (key === choice) return "wrong" as const
      return "dimmed" as const
    }
    return choice === key ? ("selected" as const) : ("idle" as const)
  }

  const progress = isFinished ? 100 : (answeredCount / questions.length) * 100
  const lowTime = quiz.timeLeft !== null && quiz.timeLeft < 120 && phase === "running"

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Top bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-14">
          <button onClick={onRequestQuit} className="p-2 -ml-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer" title="Leave quiz" aria-label="Leave quiz">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{config.title}</div>
            <div className="text-xs text-neutral-500 truncate">
              {phase === "review" ? "Reviewing answers" : `${answeredCount} of ${questions.length} answered`}
              {markedCount > 0 && phase === "running" && `, ${markedCount} marked`}
            </div>
          </div>

          {phase === "running" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimerHidden(h => !h)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm tabular-nums font-medium cursor-pointer",
                  lowTime ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
                title={timerHidden ? "Show timer" : "Hide timer"}
              >
                <Clock className="w-4 h-4" />
                {timerHidden && !lowTime ? <span className="text-neutral-400">Show</span> : formatClock(quiz.timeLeft ?? quiz.elapsed)}
              </button>
              {canPause && (
                <button onClick={() => quiz.setPaused(!quiz.paused)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer" title={quiz.paused ? "Resume" : "Pause"} aria-label={quiz.paused ? "Resume" : "Pause"}>
                  {quiz.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setPaletteOpen(o => !o)}
            className={cn("p-2 rounded-lg cursor-pointer", paletteOpen ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
            title="Question palette (G)"
            aria-label="Question palette"
            aria-expanded={paletteOpen}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTutorOpen(!tutorOpen)}
            className={cn("p-2 sm:px-3 rounded-lg inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer", tutorOpen ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
            title="AI tutor (T)"
            aria-label="AI tutor"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden lg:inline">Tutor</span>
          </button>
          {phase === "running" ? (
            <Button variant="primary" size="sm" onClick={requestFinish} className="ml-1">
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit quiz</span>
            </Button>
          ) : phase === "review" ? (
            <Button variant="primary" size="sm" onClick={quiz.showResults} className="ml-1">
              Results
            </Button>
          ) : null}
        </div>
        <div className="h-0.5 bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full bg-brand-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Palette */}
        <AnimatePresence initial={false}>
          {paletteOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
              <div className="px-3 sm:px-5 py-4 max-h-[40vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5 max-w-4xl">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => quiz.setCurrentIndex(i)}
                      aria-label={`Question ${i + 1}: ${statusOf(q)}${marked[q.id] ? ", marked for review" : ""}`}
                      aria-current={i === currentIndex ? "true" : undefined}
                      className={cn(
                        "relative h-9 rounded-lg text-xs font-semibold tabular-nums cursor-pointer transition-transform hover:scale-105",
                        PALETTE_STYLES[statusOf(q)],
                        i === currentIndex && "ring-2 ring-offset-2 ring-brand-500 ring-offset-white dark:ring-offset-neutral-900"
                      )}
                    >
                      {i + 1}
                      {marked[q.id] && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900" />}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-neutral-500">
                  {(isFinished || isInstant
                    ? ([["correct", "Correct"], ["wrong", "Incorrect"], ...(isInstant && !isFinished ? [["answered", "Answered, not checked"]] : [["unanswered", "Not answered"]])] as [PaletteStatus, string][])
                    : ([["answered", "Answered"], ["visited", "Seen"], ["skipped", "Skipped"], ["new", "Not seen"]] as [PaletteStatus, string][])
                  ).map(([s, label]) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className={cn("w-3.5 h-3.5 rounded", PALETTE_STYLES[s])} />
                      {label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Marked for review</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto relative">
        <div className={cn("max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5", quiz.paused && "blur-md select-none pointer-events-none")}>
          <motion.div key={currentQ.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Question {currentIndex + 1} <span className="font-normal text-neutral-500">of {questions.length}</span>
                </div>
                <div>
                  {getPaperFriendlyName(currentQ.paper)}, Q{currentQ.q_num}
                  <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">|</span>
                  {currentQ.conceptName !== "Other Core Topics" ? currentQ.conceptName : currentQ.unit_name}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 -mr-1.5">
                {phase === "running" && (
                  <button
                    onClick={() => quiz.toggleMarked(currentQ.id)}
                    aria-pressed={Boolean(marked[currentQ.id])}
                    title="Mark for review (M)"
                    className={cn("inline-flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-medium cursor-pointer", marked[currentQ.id] ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                  >
                    <Flag className="w-4 h-4" />
                    <span className="hidden sm:inline">{marked[currentQ.id] ? "Marked" : "Mark"}</span>
                  </button>
                )}
                <BookmarkButton question={currentQ} withLabel className="[&>span]:hidden sm:[&>span]:inline" />
                {currentQ.pdf && (
                  <button
                    onClick={() => setPdfView("question")}
                    title="View in the original paper (O)"
                    className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-medium cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                )}
              </div>
            </div>

            <QuestionText text={currentQ.question} className="text-neutral-900 dark:text-neutral-100" />

            {(noteOpen || (currentQ.bookmarked && currentQ.note)) && <NoteEditor question={currentQ} autoFocus={noteOpen && !currentQ.note} />}
            {currentQ.bookmarked && !currentQ.note && !noteOpen && (
              <button onClick={() => setNoteOpen(true)} className="text-xs text-amber-700 dark:text-amber-400 hover:underline cursor-pointer">
                Add a note to this bookmark
              </button>
            )}

            <div className="space-y-2.5">
              {OPTION_KEYS.map(key =>
                currentQ.options[key] ? (
                  <OptionButton
                    key={key}
                    optKey={key}
                    text={currentQ.options[key]}
                    state={optionState(key)}
                    disabled={isRevealed || phase !== "running"}
                    onClick={() => quiz.selectAnswer(currentQ.id, key)}
                  />
                ) : null
              )}
            </div>

            {/* Actions */}
            {phase === "running" && !result && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => quiz.skipQuestion(currentQ.id)} disabled={currentIndex === questions.length - 1 && !choice}>
                    Skip
                  </Button>
                  {!isInstant && choice && (
                    <Button variant="ghost" size="sm" onClick={() => quiz.clearAnswer(currentQ.id)}>
                      <Eraser className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
                {isInstant ? (
                  <Button variant="primary" onClick={() => quiz.submitAnswer(currentQ.id)} disabled={!choice}>
                    <Check className="w-4 h-4" />
                    Check answer
                  </Button>
                ) : currentIndex < questions.length - 1 ? (
                  <Button variant="primary" onClick={quiz.goNext}>
                    {choice ? "Save and next" : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="primary" onClick={requestFinish}>
                    Submit quiz
                  </Button>
                )}
              </div>
            )}

            {/* Explanation */}
            <AnimatePresence initial={false}>
              {isRevealed && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                        !choice
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          : isCorrectNow
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
                      )}
                    >
                      <span>
                        {!choice ? `Not answered. The answer is ${currentQ.answer}.` : isCorrectNow ? "Correct." : `Incorrect. You chose ${choice}, the answer is ${currentQ.answer}.`}
                      </span>
                      {choice && !isCorrectNow && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            quiz.setReinforce({ question: currentQ, userChoice: choice })
                            setTutorOpen(true)
                          }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                          Explain my mistake
                        </Button>
                      )}
                    </div>
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" /> Explanation
                        </div>
                        {currentQ.pdf?.s && (
                          <button onClick={() => setPdfView("solution")} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">
                            <FileText className="w-3.5 h-3.5" />
                            Solution in the PDF
                          </button>
                        )}
                      </div>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                        {currentQ.solution || "No official explanation is available for this question. Ask the AI tutor to work through it."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {quiz.paused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl px-8 py-6 text-center space-y-3">
              <Pause className="w-6 h-6 mx-auto text-neutral-400" />
              <div className="text-sm font-semibold">Quiz paused</div>
              <Button variant="primary" onClick={() => quiz.setPaused(false)}>
                <Play className="w-4 h-4" /> Resume
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-3 sm:px-5 h-14 flex items-center justify-between shrink-0">
        <Button variant="secondary" size="sm" onClick={quiz.goPrev} disabled={currentIndex === 0}>
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>
        {settings.keyboardShortcuts && (
          <button onClick={() => setHelpOpen(true)} className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer">
            <Keyboard className="w-4 h-4" />
            Shortcuts <Kbd>?</Kbd>
          </button>
        )}
        <Button variant="secondary" size="sm" onClick={quiz.goNext} disabled={currentIndex === questions.length - 1}>
          Next
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <Modal open={helpOpen} onOpenChange={setHelpOpen} title="Keyboard shortcuts">
        <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {SHORTCUTS.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-2 text-sm">
              <dt className="text-neutral-600 dark:text-neutral-400">{label}</dt>
              <dd><Kbd>{k}</Kbd></dd>
            </div>
          ))}
        </dl>
      </Modal>

      <PdfViewer question={currentQ} view={pdfView} onViewChange={setPdfView} allowSolution={isRevealed} />

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Submit this quiz?"
        description={
          <>
            {unanswered > 0 && <>You have <strong>{unanswered}</strong> unanswered question{unanswered === 1 ? "" : "s"}. </>}
            {markedCount > 0 && <><strong>{markedCount}</strong> question{markedCount === 1 ? " is" : "s are"} marked for review. </>}
            Unanswered questions count as zero and aren&apos;t saved to your history.
          </>
        }
        confirmLabel="Submit quiz"
        cancelLabel="Keep going"
        onConfirm={quiz.finishQuiz}
      />
    </div>
  )
}
