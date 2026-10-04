"use client"

import React, { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, RotateCcw, StickyNote, XCircle } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { OPTION_KEYS, type AttemptSource, type OptionKey, type Question } from "@/lib/types"
import { getPaperFriendlyName } from "@/lib/constants"
import { cn } from "@/lib/utils"
import QuestionText from "./QuestionText"
import InlineImages from "./InlineImages"
import { Button } from "./ui"

export function BookmarkButton({ question, className, withLabel }: { question: Question; className?: string; withLabel?: boolean }) {
  const { toggleBookmark } = useStudyData()
  return (
    <button
      onClick={() => toggleBookmark(question.id)}
      aria-pressed={question.bookmarked}
      title={question.bookmarked ? "Remove bookmark" : "Bookmark this question"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-medium transition-colors cursor-pointer",
        question.bookmarked
          ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
        className
      )}
    >
      {question.bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {withLabel && <span>{question.bookmarked ? "Bookmarked" : "Bookmark"}</span>}
    </button>
  )
}

export function NoteEditor({ question, autoFocus }: { question: Question; autoFocus?: boolean }) {
  const { saveNote } = useStudyData()
  const [draft, setDraft] = useState(question.note)
  const [savedNote, setSavedNote] = useState(question.note)
  if (question.note !== savedNote) {
    setSavedNote(question.note)
    setDraft(question.note)
  }

  return (
    <textarea
      value={draft}
      autoFocus={autoFocus}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => draft !== question.note && saveNote(question.id, draft)}
      placeholder="Write a note: the trick, the formula, why you got it wrong…"
      rows={2}
      className="w-full text-sm px-3 py-2 rounded-lg border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-y"
    />
  )
}

export function OptionButton({
  optKey,
  text,
  state,
  onClick,
  disabled,
  compact
}: {
  optKey: OptionKey
  text: string
  state: "idle" | "selected" | "correct" | "wrong" | "dimmed"
  onClick?: () => void
  disabled?: boolean
  compact?: boolean
}) {
  const styles = {
    idle: "border-neutral-200 dark:border-neutral-800 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-500/5",
    selected: "border-brand-500 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-500",
    correct: "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    wrong: "border-rose-500 bg-rose-50 dark:bg-rose-500/10",
    dimmed: "border-neutral-200 dark:border-neutral-800 opacity-55"
  }[state]
  const badge = {
    idle: "border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300",
    selected: "bg-brand-600 text-white",
    correct: "bg-emerald-600 text-white",
    wrong: "bg-rose-600 text-white",
    dimmed: "border border-neutral-300 dark:border-neutral-700 text-neutral-500"
  }[state]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-start text-left rounded-xl border transition-colors",
        compact ? "gap-2.5 p-2.5" : "gap-3 p-3.5",
        !disabled && "cursor-pointer",
        disabled && "cursor-default",
        styles
      )}
    >
      <span className={cn("rounded-full flex items-center justify-center shrink-0 font-semibold font-sans", compact ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs mt-px", badge)}>
        {state === "correct" ? <CheckCircle2 className="w-3.5 h-3.5" /> : state === "wrong" ? <XCircle className="w-3.5 h-3.5" /> : optKey}
      </span>
      <span className={cn("q-option whitespace-pre-wrap", compact && "text-sm")}><InlineImages text={text} /></span>
    </button>
  )
}

interface QuestionCardProps {
  question: Question
  source: AttemptSource
  compact?: boolean
  header?: React.ReactNode
  defaultCollapsed?: boolean
  onInteract?: (questionId: string) => void
}

// A self-contained practice card: pick an option, check it, see the explanation, bookmark it.
export default function QuestionCard({ question, source, compact, header, defaultCollapsed, onInteract }: QuestionCardProps) {
  const { logAttempt } = useStudyData()
  const [selected, setSelected] = useState<OptionKey | null>(null)
  const [result, setResult] = useState<{ choice: string; isCorrect: boolean } | null>(
    question.isAnswered && question.userAnswer ? { choice: question.userAnswer, isCorrect: question.isCorrect } : null
  )
  const [showSolution, setShowSolution] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed))
  const openedAt = React.useRef<number | null>(null)

  const check = async () => {
    if (!selected) return
    onInteract?.(question.id)
    const seconds = openedAt.current ? Math.round((Date.now() - openedAt.current) / 1000) : undefined
    const isCorrect = selected === question.answer
    setResult({ choice: selected, isCorrect })
    setShowSolution(true)
    await logAttempt(question, selected, { source, timeSpent: seconds })
  }

  const retry = () => {
    setResult(null)
    setSelected(null)
    setShowSolution(false)
  }

  const optionState = (key: OptionKey) => {
    if (result) {
      if (key === question.answer) return "correct" as const
      if (key === result.choice) return "wrong" as const
      return "dimmed" as const
    }
    return selected === key ? ("selected" as const) : ("idle" as const)
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {header ?? (
            <>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{getPaperFriendlyName(question.paper)}</span>
              <span>Q{question.q_num}</span>
            </>
          )}
          {result && (
            <span className={cn("inline-flex items-center gap-1 font-medium", result.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {result.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {result.isCorrect ? "Correct" : "Incorrect"}
            </span>
          )}
        </div>
        <div className="flex items-center shrink-0" onClickCapture={() => onInteract?.(question.id)}>
          {question.bookmarked && (
            <button
              onClick={() => setEditingNote(v => !v)}
              title="Note"
              className={cn("p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer", question.note ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")}
            >
              <StickyNote className="w-4 h-4" />
            </button>
          )}
          <BookmarkButton question={question} />
          {defaultCollapsed !== undefined && (
            <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer" title={collapsed ? "Expand" : "Collapse"}>
              <ChevronDown className={cn("w-4 h-4 transition-transform", collapsed && "-rotate-90")} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <QuestionText
          text={question.question}
          onClick={() => collapsed && setCollapsed(false)}
          className={cn(compact && "text-[15px]", collapsed && "line-clamp-2 cursor-pointer [&>pre]:hidden")}
        />

        {(editingNote || (question.bookmarked && question.note)) && !collapsed && <NoteEditor question={question} autoFocus={editingNote && !question.note} />}

        {!collapsed && (
          <>
            <div className={cn("grid gap-2", !compact && "md:grid-cols-2")}>
              {OPTION_KEYS.map(key =>
                question.options[key] ? (
                  <OptionButton
                    key={key}
                    optKey={key}
                    text={question.options[key]}
                    state={optionState(key)}
                    disabled={Boolean(result)}
                    onClick={() => {
                      // Time on a card is measured from the first option you pick
                      if (openedAt.current === null) openedAt.current = Date.now()
                      setSelected(key)
                    }}
                    compact={compact}
                  />
                ) : null
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {!result ? (
                <Button size="sm" variant="primary" disabled={!selected} onClick={check}>
                  Check answer
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={retry}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try again
                </Button>
              )}
              {result && (
                <button onClick={() => setShowSolution(s => !s)} className="text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">
                  {showSolution ? "Hide explanation" : "Show explanation"}
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showSolution && result && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 p-3.5 text-sm leading-relaxed">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">Answer: option {question.answer}</div>
                    <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{question.solution || "No official explanation is available for this question."}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
