"use client"

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"
import { StudyDataProvider, useStudyData } from "@/hooks/useStudyData"
import { useQuizState, type QuizConfig } from "@/hooks/useQuizState"
import { useSettings } from "@/lib/settings"
import { MobileHeader, MobileTabBar, Sidebar, VIEWS, type View } from "@/components/AppNav"
import Overview from "@/components/Overview"
import PracticeLauncher from "@/components/PracticeLauncher"
import QuestionBank, { type BankStatus } from "@/components/QuestionBank"
import QuizArena from "@/components/QuizArena"
import QuizResults from "@/components/QuizResults"
import ChatSidebar from "@/components/ChatSidebar"
import ReinforcementPanel from "@/components/ReinforcementPanel"
import SyllabusWeightage from "@/components/SyllabusWeightage"
import RepeatedQuestions from "@/components/RepeatedQuestions"
import SwipeQuiz from "@/components/SwipeQuiz"
import SettingsPanel from "@/components/SettingsPanel"
import { ConfirmDialog } from "@/components/ui"

export default function Home() {
  return (
    <StudyDataProvider>
      <StudyApp />
    </StudyDataProvider>
  )
}

const WIDE_QUERY = "(min-width: 1024px)"
const isWide = () => typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches

// Desktop shows the tutor as a side panel, smaller screens as a drawer. Only one is mounted,
// so the tutor never makes duplicate AI requests.
const useIsWide = () =>
  useSyncExternalStore(
    onChange => {
      const mq = window.matchMedia(WIDE_QUERY)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    isWide,
    () => true
  )

function StudyApp() {
  const quiz = useQuizState()
  const { settings } = useSettings()
  const { loading, error, questions } = useStudyData()
  const wide = useIsWide()

  const [view, setView] = useState<View>("overview")
  const [bankStatus, setBankStatus] = useState<BankStatus>("all")
  const [tutorOpen, setTutorOpen] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(380)
  const [isResizing, setIsResizing] = useState(false)

  // Views live in the URL hash so refresh and the back button work
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "") as View
      setView(VIEWS.includes(hash) ? hash : "overview")
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  const navigate = useCallback((next: View, status?: "mistakes" | "bookmarked") => {
    if (next === "bank") setBankStatus(status ?? "all")
    if (window.location.hash !== `#${next}`) window.location.hash = next
    else setView(next)
  }, [])

  useEffect(() => {
    const onResize = () => setSidebarWidth(w => Math.min(w, Math.max(320, window.innerWidth * 0.45)))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Open the tutor when a wrong answer triggers the AI drill. On small screens the drawer
  // would cover the question, so there it waits for "Explain my mistake" or the Tutor button.
  const [seenReinforce, setSeenReinforce] = useState(quiz.reinforce)
  if (quiz.reinforce !== seenReinforce) {
    setSeenReinforce(quiz.reinforce)
    if (quiz.reinforce && wide) setTutorOpen(true)
  }

  const startQuiz = useCallback((config: QuizConfig) => {
    if (quiz.startQuiz(config)) setTutorOpen(settings.tutorOpenByDefault && isWide())
  }, [quiz, settings.tutorOpenByDefault])

  const leaveQuiz = () => {
    const answered = Object.keys(quiz.answers).length
    if (quiz.phase === "running" && answered > 0) setConfirmQuit(true)
    else quiz.quitQuiz()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (ev: MouseEvent) => setSidebarWidth(Math.max(300, Math.min(window.innerWidth * 0.6, startWidth + startX - ev.clientX)))
    const onUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  // ---------- Quiz (focus layout, no app navigation) ----------
  if (quiz.phase !== "idle" && quiz.currentQ) {
    const tutor = quiz.reinforce ? (
      <ReinforcementPanel
        key={quiz.reinforce.question.id}
        currentIncorrectQ={quiz.reinforce.question}
        userChoice={quiz.reinforce.userChoice}
        onComplete={() => quiz.setReinforce(null)}
      />
    ) : (
      <ChatSidebar key={quiz.currentQ.id} currentQ={quiz.currentQ} />
    )

    return (
      <div className="h-dvh flex overflow-hidden bg-[var(--background)] text-neutral-900 dark:text-neutral-100">
        <main className="flex-1 min-w-0 h-full">
          {quiz.phase === "results" ? (
            <QuizResults
              quiz={quiz}
              onDone={() => {
                quiz.quitQuiz()
                navigate("overview")
              }}
            />
          ) : (
            <QuizArena quiz={quiz} tutorOpen={tutorOpen} setTutorOpen={setTutorOpen} onRequestQuit={leaveQuiz} />
          )}
        </main>

        {quiz.phase !== "results" && (
          <>
            {/* Desktop: resizable side panel */}
            <AnimatePresence initial={false}>
              {tutorOpen && wide && (
                <motion.aside
                  key="tutor"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: sidebarWidth, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
                  className="relative h-full shrink-0 border-l border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  aria-label="AI tutor"
                >
                  <div
                    onMouseDown={handleMouseDown}
                    className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500/40 active:bg-brand-500 transition-colors z-20"
                    title="Drag to resize"
                  />
                  <div className="h-full" style={{ width: sidebarWidth }}>{tutor}</div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Small screens: slide-over drawer */}
            <AnimatePresence>
              {tutorOpen && !wide && (
                <motion.div key="tutor-mobile" className="fixed inset-0 z-40 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="absolute inset-0 bg-black/40" onClick={() => setTutorOpen(false)} />
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 340, damping: 34 }}
                    className="relative w-full sm:w-[420px] h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
                  >
                    <button
                      onClick={() => setTutorOpen(false)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/80 dark:bg-neutral-900/80 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      aria-label="Close tutor"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-h-0">{tutor}</div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <ConfirmDialog
          open={confirmQuit}
          onOpenChange={setConfirmQuit}
          title="Leave this quiz?"
          description={
            quiz.isInstant
              ? "Answers you've already checked are saved. This quiz won't appear in your quiz history."
              : "Your answers haven't been submitted yet and will be lost. Submit the quiz to save your score."
          }
          confirmLabel="Leave quiz"
          cancelLabel="Keep going"
          destructive
          onConfirm={quiz.quitQuiz}
        />
      </div>
    )
  }

  // ---------- App shell ----------
  let content: React.ReactNode
  if (loading) {
    content = (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-sm">Loading your question bank…</span>
      </div>
    )
  } else if (error || questions.length === 0) {
    content = (
      <div className="max-w-md mx-auto px-6 py-16 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
        <h1 className="text-lg font-semibold">The question bank is empty or unavailable</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {error ? `${error}. ` : ""}Run <code className="font-mono text-[13px] px-1 rounded bg-neutral-200 dark:bg-neutral-800">npx prisma migrate dev</code> and{" "}
          <code className="font-mono text-[13px] px-1 rounded bg-neutral-200 dark:bg-neutral-800">node prisma/seed.js</code> in the quiz-app folder, then reload.
        </p>
      </div>
    )
  } else {
    content = {
      overview: <Overview onStartQuiz={startQuiz} onNavigate={navigate} />,
      practice: <PracticeLauncher onStartQuiz={startQuiz} />,
      bank: <QuestionBank key={bankStatus} initialStatus={bankStatus} onStartQuiz={startQuiz} />,
      swipe: <SwipeQuiz />,
      weightage: <SyllabusWeightage onStartQuiz={startQuiz} />,
      repeats: <RepeatedQuestions onStartQuiz={startQuiz} />,
      settings: <SettingsPanel />
    }[view]
  }

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--background)] text-neutral-900 dark:text-neutral-100">
      <Sidebar active={view} onNavigate={navigate} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader onNavigate={navigate} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={view === "swipe" ? "h-full" : "min-h-full"}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
        <MobileTabBar active={view} onNavigate={navigate} />
      </div>
    </div>
  )
}
