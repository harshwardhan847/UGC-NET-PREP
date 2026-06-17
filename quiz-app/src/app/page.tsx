"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GraduationCap, ArrowLeft, Sun, Moon } from "lucide-react"
import { useQuizState } from "@/hooks/useQuizState"
import Dashboard from "@/components/Dashboard"
import QuizArena from "@/components/QuizArena"
import ChatSidebar from "@/components/ChatSidebar"
import ReinforcementPanel from "@/components/ReinforcementPanel"

export default function Home() {
  const quiz = useQuizState()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [sidebarWidth, setSidebarWidth] = useState<number>(380)
  const [isResizing, setIsResizing] = useState<boolean>(false)

  // Apply default dark mode on mount and handle laptop screen resizing
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark")
    }

    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarWidth(320)
      } else {
        setSidebarWidth(380)
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize() // check initial screen size

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
    if (typeof document !== "undefined") {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX
      const newWidth = Math.max(280, Math.min(window.innerWidth * 0.6, startWidth + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div className={`h-screen max-h-screen overflow-hidden flex flex-col ${theme === "dark" ? "dark bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-800"}`}>
      
      {/* Global Navbar */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">UGC NET CS Study Hub</h1>
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Reinforcement Learning Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {quiz.activeTab === "quiz" && (
            <button
              onClick={quiz.quitQuiz}
              className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit to Dashboard
            </button>
          )}
          
          <button
            onClick={toggleTheme}
            className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer text-neutral-500"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {quiz.activeTab === "dashboard" ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <Dashboard
                questions={quiz.questions}
                setQuizMode={quiz.setQuizMode}
                selectedUnit={quiz.selectedUnit}
                setSelectedUnit={quiz.setSelectedUnit}
                selectedPaper={quiz.selectedPaper}
                setSelectedPaper={quiz.setSelectedPaper}
                customNumQuestions={quiz.customNumQuestions}
                setCustomNumQuestions={quiz.setCustomNumQuestions}
                customTimeLimit={quiz.customTimeLimit}
                setCustomTimeLimit={quiz.setCustomTimeLimit}
                customSelectedUnits={quiz.customSelectedUnits}
                setCustomSelectedUnits={quiz.setCustomSelectedUnits}
                startQuiz={quiz.startQuiz}
                history={quiz.history}
                unitMastery={quiz.unitMastery}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex h-full overflow-hidden"
            >
              {/* Left Panel: Quiz Display */}
              <div className="flex-1 h-full overflow-hidden">
                <QuizArena
                  questions={quiz.activeQuestions}
                  currentIndex={quiz.currentIndex}
                  setCurrentIndex={quiz.setCurrentIndex}
                  selectedAnswers={quiz.selectedAnswers}
                  submittedAnswers={quiz.submittedAnswers}
                  selectAnswer={quiz.selectAnswer}
                  submitAnswer={quiz.submitAnswer}
                  isQuizFinished={quiz.isQuizFinished}
                  timeLeft={quiz.timeLeft}
                  finishQuiz={quiz.finishQuiz}
                  quitQuiz={quiz.quitQuiz}
                  isSidebarOpen={isSidebarOpen}
                  setIsSidebarOpen={setIsSidebarOpen}
                />
              </div>

              {/* Right Panel: Collapsible Side Assistant */}
              <AnimatePresence>
                {isSidebarOpen && (
                  <div className="relative h-full flex shrink-0 z-10">
                    {/* Drag Handle */}
                    <div
                      onMouseDown={handleMouseDown}
                      className="absolute top-0 -left-1 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20"
                      title="Drag to resize sidebar"
                    />
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: sidebarWidth, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                      className="h-full border-l border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-lg"
                    >
                      {quiz.isReinforcing && quiz.currentIncorrectQ ? (
                        <ReinforcementPanel
                          currentIncorrectQ={quiz.currentIncorrectQ}
                          userChoice={quiz.selectedAnswers[quiz.currentIncorrectQ.id]}
                          onComplete={() => {
                            quiz.setIsReinforcing(false)
                            quiz.setCurrentIncorrectQ(null)
                          }}
                        />
                      ) : (
                        <ChatSidebar 
                          currentQ={quiz.activeQuestions[quiz.currentIndex]} 
                        />
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
    </div>
  )
}
