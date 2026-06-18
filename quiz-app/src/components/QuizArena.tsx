"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, X, BookOpen, Clock, AlertTriangle, MessageSquare, LogOut } from "lucide-react"
import { Question } from "@/hooks/useQuizState"

interface QuizArenaProps {
  questions: Question[]
  currentIndex: number
  setCurrentIndex: (index: number) => void
  selectedAnswers: { [qId: string]: string }
  submittedAnswers: { [qId: string]: boolean }
  skippedQuestions: { [qId: string]: boolean }
  selectAnswer: (qId: string, option: string) => void
  submitAnswer: (qId: string) => void
  skipQuestion: (qId: string) => void
  isQuizFinished: boolean
  timeLeft: number
  finishQuiz: () => void
  quitQuiz: () => void
  
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
}

export default function QuizArena({
  questions,
  currentIndex,
  setCurrentIndex,
  selectedAnswers,
  submittedAnswers,
  skippedQuestions,
  selectAnswer,
  submitAnswer,
  skipQuestion,
  isQuizFinished,
  timeLeft,
  finishQuiz,
  quitQuiz,
  isSidebarOpen,
  setIsSidebarOpen
}: QuizArenaProps) {
  const currentQ = questions[currentIndex]

  // Formats timer into HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  if (!currentQ) return <div className="p-8 text-center">Loading questions...</div>

  const userSelection = selectedAnswers[currentQ.id]
  const isSubmitted = submittedAnswers[currentQ.id] || isQuizFinished
  const isCorrect = userSelection === currentQ.answer

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100">
      
      {/* Top Header Panel */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={quitQuiz} 
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Quit Session"
          >
            <LogOut className="w-5 h-5 text-neutral-500" />
          </button>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              {currentQ.year} • Q{currentQ.q_num}
            </span>
            <h2 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {currentQ.unit_name}
            </h2>
          </div>
        </div>

        {/* Timer & Finish button */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
            timeLeft < 120 
              ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400 animate-pulse"
              : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          }`}>
            <Clock className="w-4 h-4 shrink-0" />
            {formatTime(timeLeft)}
          </div>

          {!isQuizFinished && (
            <button
              onClick={finishQuiz}
              className="px-4 py-1.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Finish Exam
            </button>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSidebarOpen 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/50" 
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50"
            }`}
            title="Toggle AI Side Panel"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs font-semibold hidden md:inline">AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Main Question Display Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Question card */}
          <motion.div 
            key={currentQ.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center text-xs font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
                {skippedQuestions[currentQ.id] && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-450 text-[10px] font-bold rounded-md">
                    Skipped
                  </span>
                )}
              </div>
              <span className="text-indigo-600 dark:text-indigo-400">UNIT {currentQ.unit}</span>
            </div>

            {/* Question body */}
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
              {currentQ.question}
            </div>

            {/* Options list */}
            <div className="space-y-3 pt-2">
              {(Object.keys(currentQ.options) as Array<"A" | "B" | "C" | "D">).map(optKey => {
                const optText = currentQ.options[optKey]
                if (!optText) return null

                const isSelected = userSelection === optKey
                
                // Color codes after submit
                let optBgClass = "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-950"
                let optBorderClass = "border-neutral-200 dark:border-neutral-800"
                let optTextClass = ""

                if (isSubmitted) {
                  if (optKey === currentQ.answer) {
                    // Correct option (highlight green always)
                    optBgClass = "bg-emerald-50/50 dark:bg-emerald-950/20"
                    optBorderClass = "border-emerald-500 dark:border-emerald-800"
                    optTextClass = "text-emerald-800 dark:text-emerald-300"
                  } else if (isSelected) {
                    // Incorrect selected option
                    optBgClass = "bg-rose-50/50 dark:bg-rose-950/20"
                    optBorderClass = "border-rose-500 dark:border-rose-800"
                    optTextClass = "text-rose-800 dark:text-rose-300"
                  } else {
                    optBgClass = "bg-neutral-50/50 dark:bg-neutral-950/30 opacity-60"
                  }
                } else if (isSelected) {
                  // Currently selected
                  optBgClass = "bg-indigo-50/50 dark:bg-indigo-950/20"
                  optBorderClass = "border-indigo-600 dark:border-indigo-400"
                  optTextClass = "text-indigo-800 dark:text-indigo-300"
                }

                return (
                  <button
                    key={optKey}
                    onClick={() => selectAnswer(currentQ.id, optKey)}
                    disabled={isSubmitted}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${optBgClass} ${optBorderClass} ${optTextClass} disabled:cursor-not-allowed`}
                  >
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                      isSubmitted && optKey === currentQ.answer 
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isSubmitted && isSelected
                        ? "bg-rose-500 border-rose-500 text-white"
                        : isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-neutral-300 dark:border-neutral-700"
                    }`}>
                      {isSubmitted && optKey === currentQ.answer ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isSubmitted && isSelected ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        optKey
                      )}
                    </span>
                    <span className="text-sm font-medium leading-relaxed">{optText}</span>
                  </button>
                )
              })}
            </div>

            {/* Action panel (Submit / Feedback) */}
            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
              <div>
                {isSubmitted ? (
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                        <Check className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400 font-semibold">
                    Select an option and submit to verify.
                  </span>
                )}
              </div>

              {!isSubmitted && (
                <div className="flex gap-2">
                  <button
                    onClick={() => skipQuestion(currentQ.id)}
                    className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Skip Question
                  </button>
                  <button
                    onClick={() => submitAnswer(currentQ.id)}
                    disabled={!userSelection}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Submit Answer
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Explanation panel (only after submission) */}
          <AnimatePresence>
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    EXPLANATION & SOLUTION
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {currentQ.solution || "No official explanation is available for this question."}
                  </div>
                  
                  {!isCorrect && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mt-4 text-xs leading-relaxed">
                      <span className="font-bold text-indigo-800 dark:text-indigo-300 block mb-1">
                        💡 Incorrect Answer - AI Reinforcement Active
                      </span>
                      Your AI Tutor in the right sidebar has loaded a personalized concept review. Answer the simpler sub-question in the sidebar to test your understanding before continuing!
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 flex justify-between shrink-0 shadow-sm">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
          disabled={currentIndex === questions.length - 1}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      
    </div>
  )
}
