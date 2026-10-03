"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion"
import { 
  X, Check, ArrowRight, RefreshCw, AlertTriangle, 
  Sparkles, Eye, EyeOff 
} from "lucide-react"
import Markdown from "./Markdown"
import { BookmarkButton } from "./QuestionCard"
import { useStudyData } from "@/hooks/useStudyData"
import { useSettings } from "@/lib/settings"
import { UNITS } from "@/lib/constants"
import { secondsSince, shuffle } from "@/lib/analytics"
import { OPTION_KEYS, type Question } from "@/lib/types"

export default function SwipeQuiz() {
  const { questions: allQuestions, loading: storeLoading, logAttempt } = useStudyData()
  const { settings } = useSettings()
  const [selectedUnit, setSelectedUnit] = useState<number | "all">("all")
  const [questions, setQuestions] = useState<Question[]>([])
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, skipped: 0 })
  const cardShownAt = useRef(0)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  
  // Attempt status for the active card
  const [isAnswered, setIsAnswered] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)
  
  // AI Gap analysis for incorrect answers
  const [fetchingReinforce, setFetchingReinforce] = useState<boolean>(false)
  const [gapAnalysis, setGapAnalysis] = useState<string | null>(null)
  const [lesson, setLesson] = useState<string | null>(null)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false)
  
  // Framer Motion controls & values
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.6, 1, 1, 1, 0.6])
  const controls = useAnimation()

  // The live question when available, so bookmark state stays current
  const currentQ = questions[currentIndex]
    ? allQuestions.find(q => q.id === questions[currentIndex].id) ?? questions[currentIndex]
    : undefined

  const resetCardState = () => {
    setSelectedOption(null)
    setIsAnswered(false)
    setIsCorrect(false)
    setGapAnalysis(null)
    setLesson(null)
    x.set(0)
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 })
  }

  // Build a shuffled pile of questions not yet answered correctly. The pile is a snapshot,
  // so cards don't disappear from under you as you answer them.
  const allRef = useRef(allQuestions)
  useEffect(() => {
    allRef.current = allQuestions
  }, [allQuestions])

  const loadQuestions = useCallback(() => {
    const pile = allRef.current.filter(q => !(q.isAnswered && q.isCorrect) && (selectedUnit === "all" || q.unit === selectedUnit))
    setQuestions(shuffle(pile))
    setCurrentIndex(0)
    setSessionStats({ correct: 0, wrong: 0, skipped: 0 })
    resetCardState()
    cardShownAt.current = Date.now()
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetCardState only touches stable motion values
  }, [selectedUnit])

  useEffect(() => {
    if (!storeLoading) loadQuestions()
  }, [loadQuestions, storeLoading])

  // Handle Swipe Left (Skip)
  const swipeLeft = async () => {
    setSessionStats(s => ({ ...s, skipped: s.skipped + 1 }))
    await controls.start({ x: -400, opacity: 0, rotate: -15, transition: { duration: 0.2 } })
    nextQuestion()
  }

  // Handle Swipe Right (Verify / Submit)
  const swipeRight = async () => {
    if (!selectedOption || !currentQ) {
      // Snap back if no option selected
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } })
      return
    }

    const correct = selectedOption === currentQ.answer
    setIsCorrect(correct)
    setIsAnswered(true)

    setSessionStats(s => (correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }))
    logAttempt(currentQ, selectedOption, { source: "swipe", timeSpent: secondsSince(cardShownAt.current) })

    if (correct) {
      // Correct answer: Fly off to the right!
      await controls.start({ x: 400, opacity: 0, rotate: 15, transition: { duration: 0.2 } })
      nextQuestion()
    } else {
      // Incorrect answer: Snap back and let user manually request AI lesson
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 200, damping: 18 } })
    }
  }

  const fetchReinforceContent = async () => {
    if (!currentQ || !selectedOption) return
    setFetchingReinforce(true)
    try {
      const res = await fetch("/api/reinforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionContext: currentQ,
          userChoice: selectedOption
        })
      })
      if (res.ok) {
        const data = await res.json()
        setGapAnalysis(data.gapAnalysis)
        setLesson(data.explanation)
      }
    } catch (err) {
      console.error("Failed to load reinforcement", err)
    } finally {
      setFetchingReinforce(false)
    }
  }

  const nextQuestion = () => {
    cardShownAt.current = Date.now()
    setCurrentIndex(prev => prev + 1)
    setSelectedOption(null)
    setIsAnswered(false)
    setIsCorrect(false)
    setGapAnalysis(null)
    setLesson(null)
    // Reset motion value and controls back to center for the next card
    x.set(0)
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 })
  }

  // Handle Drag end
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 120
    if (info.offset.x < -threshold) {
      swipeLeft()
    } else if (info.offset.x > threshold) {
      if (selectedOption) {
        swipeRight()
      } else {
        // Snap back and warn/flash
        controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } })
      }
    } else {
      // Snap back
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } })
    }
  }

  // Automatically swipe right on correct option selection (optional fluid flow)
  const handleOptionSelect = (opt: string) => {
    if (isAnswered) return
    setSelectedOption(opt)
  }

  // Keyboard: 1-4 pick, Enter / right arrow verify, left arrow skip
  useEffect(() => {
    if (!settings.keyboardShortcuts || !currentQ || loading) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = ["1", "2", "3", "4"].indexOf(e.key)
      if (idx >= 0 && !isAnswered) {
        const opt = OPTION_KEYS[idx]
        if (currentQ.options[opt]) handleOptionSelect(opt)
      } else if ((e.key === "Enter" || e.key === "ArrowRight") && !isAnswered) {
        swipeRight()
      } else if ((e.key === "Enter" || e.key === "ArrowRight") && isAnswered) {
        nextQuestion()
      } else if (e.key === "ArrowLeft" && !isAnswered) {
        swipeLeft()
      } else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 p-2 sm:p-4 md:p-6 overflow-hidden">
      
      {/* Top filter select & Header controls */}
      {!isFocusMode ? (
        <div className="max-w-md mx-auto w-full mb-3 sm:mb-6 shrink-0 flex items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Select Syllabus Focus Area
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-2xs text-neutral-800 dark:text-neutral-200"
            >
              <option value="all">All Units (Mixed Pile)</option>
              {UNITS.map(unit => (
                <option key={unit.id} value={unit.id}>Unit {unit.id}: {unit.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsFocusMode(true)}
            className="mt-5 px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs text-neutral-600 dark:text-neutral-350 transition-colors"
            title="Enable Focus Mode"
          >
            <Eye className="w-4 h-4 text-brand-500" />
            <span className="hidden sm:inline">Focus Mode</span>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm mx-auto flex justify-end mb-2 shrink-0">
          <button
            onClick={() => setIsFocusMode(false)}
            className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs text-brand-600 dark:text-brand-400 transition-colors"
            title="Exit Focus Mode"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Exit Focus
          </button>
        </div>
      )}

      {/* Main card deck frame */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[360px] max-h-[640px] w-full">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-xs font-semibold">Preparing card stack...</span>
          </div>
        ) : !currentQ ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center max-w-sm w-full space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold">Stack Completed!</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-semibold">
              You&apos;ve swiped through all available unsolved questions in this category. Correctly answered questions have been recorded and removed from this pile.
            </p>
            <button
              onClick={loadQuestions}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset & Reload Pile
            </button>
          </motion.div>
        ) : (
          <div className="relative w-full max-w-sm h-full flex flex-col items-center justify-center">
            
            {/* Background pile card */}
            {currentIndex + 1 < questions.length && (
              <div 
                className={`absolute inset-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-md opacity-40 scale-95 translate-y-3 sm:translate-y-6 select-none pointer-events-none z-0 ${
                  isFocusMode 
                    ? "h-[calc(100vh-160px)] sm:h-[480px] md:h-[520px]" 
                    : "h-[calc(100vh-270px)] sm:h-[460px] md:h-[500px]"
                }`}
              >
                <div className="w-12 h-3 bg-neutral-200 dark:bg-neutral-850 rounded mb-4" />
                <div className="space-y-2">
                  <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-850 rounded" />
                  <div className="w-5/6 h-4 bg-neutral-200 dark:bg-neutral-850 rounded" />
                </div>
              </div>
            )}

            {/* Active Card */}
            <motion.div
              drag={!isAnswered ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              style={{ x, rotate, opacity }}
              animate={controls}
              onDragEnd={handleDragEnd}
              className={`absolute inset-0 bg-white dark:bg-neutral-900 border rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden z-10 transition-colors duration-200 ${
                isFocusMode 
                  ? "h-[calc(100vh-160px)] sm:h-[480px] md:h-[520px]" 
                  : "h-[calc(100vh-270px)] sm:h-[460px] md:h-[500px]"
              } ${
                !isAnswered 
                  ? "border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing" 
                  : isCorrect
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-rose-500 bg-rose-50/10"
              }`}
            >
              
              {/* Card Header */}
              <div className="px-4 py-2.5 sm:px-5 sm:py-3.5 border-b border-neutral-150 dark:border-neutral-850 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950 shrink-0">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-550 tracking-wider">
                  {currentQ.year} • Q{currentQ.q_num}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase bg-brand-500/10 px-2 py-0.5 rounded">
                    Unit {currentQ.unit}
                  </span>
                  <BookmarkButton question={currentQ} />
                </span>
              </div>

              {/* Card Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 select-text">
                <p className="text-[9px] sm:text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block tracking-wider uppercase mb-0.5">
                  {currentQ.unit_name}
                </p>
                <div className="text-xs sm:text-[13px] leading-relaxed font-semibold text-neutral-800 dark:text-neutral-100">
                  <Markdown content={currentQ.question} />
                </div>

                {/* Options */}
                {!isAnswered ? (
                  <div className="space-y-2 pt-1.5 sm:pt-2">
                    {(Object.keys(currentQ.options) as Array<"A" | "B" | "C" | "D">).map(optKey => {
                      const optText = currentQ.options[optKey]
                      if (!optText) return null
                      const isSelected = selectedOption === optKey

                      return (
                        <button
                          key={optKey}
                          onClick={() => handleOptionSelect(optKey)}
                          className={`w-full flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left text-[11px] sm:text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 font-bold"
                              : "border-neutral-250 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-350 font-medium"
                          }`}
                        >
                          <span className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0 ${
                            isSelected ? "bg-brand-600 border-brand-600 text-white" : "border-neutral-350 dark:border-neutral-700"
                          }`}>
                            {optKey}
                          </span>
                          <span className="leading-snug">{optText}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  // Solution & AI lesson block on wrong answer
                  <div className="space-y-3 sm:space-y-4 pt-2 border-t border-neutral-150 dark:border-neutral-850">
                    <div className="flex items-center gap-1.5 text-rose-650 dark:text-rose-450 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> Incorrect Selection.
                    </div>
                    <div className="text-[11px] sm:text-xs bg-neutral-100 dark:bg-neutral-950 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-850">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        Correct Answer is Option {currentQ.answer}:
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-semibold">
                        {currentQ.options[currentQ.answer as keyof typeof currentQ.options]}
                      </p>
                    </div>

                    {!fetchingReinforce && !gapAnalysis && !lesson ? (
                      <button
                        onClick={fetchReinforceContent}
                        className="w-full py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-750 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-200" />
                        Explain Concept Gap with AI
                      </button>
                    ) : fetchingReinforce ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-neutral-400 font-semibold bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-850 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
                        AI Tutor is analyzing your conceptual gap...
                      </div>
                    ) : (
                      (gapAnalysis || lesson) && (
                        <div className="space-y-2.5 sm:space-y-3">
                          {gapAnalysis && (
                            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 sm:p-3.5">
                              <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block mb-0.5">Conceptual Gap</span>
                              <p className="text-[10.5px] sm:text-[11px] text-neutral-600 dark:text-neutral-350 leading-relaxed italic font-semibold">&ldquo;{gapAnalysis}&rdquo;</p>
                            </div>
                          )}
                          {lesson && (
                            <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl p-3 sm:p-3.5">
                              <span className="text-[9px] sm:text-[10px] font-bold text-brand-650 dark:text-brand-400 uppercase tracking-wider block mb-0.5">Study Guide</span>
                              <div className="text-[10.5px] sm:text-[11px] leading-relaxed">
                                <Markdown content={lesson} />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="px-4 py-2.5 sm:px-5 sm:py-3.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-150 dark:border-neutral-850 flex items-center justify-between shrink-0">
                {!isAnswered ? (
                  <>
                    <button
                      onClick={swipeLeft}
                      className="px-3 py-2 border border-neutral-350 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-350 text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      title="Skip question"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      Skip Card
                    </button>
                    <button
                      onClick={swipeRight}
                      disabled={!selectedOption}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 text-white rounded-xl text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      Verify
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Next Question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Session tally & tips */}
      {!isFocusMode && !loading && currentIndex < questions.length && (
        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-3 sm:mt-4 shrink-0 space-y-1">
          <div className="tabular-nums">
            Card {currentIndex + 1} of {questions.length}
            <span className="mx-2 text-neutral-300 dark:text-neutral-700">|</span>
            <span className="text-emerald-700 dark:text-emerald-400">{sessionStats.correct} right</span>,{" "}
            <span className="text-rose-700 dark:text-rose-400">{sessionStats.wrong} wrong</span>, {sessionStats.skipped} skipped
          </div>
          <div className="hidden sm:block">
            Swipe left to skip. Pick an option, then swipe right to check.
            {settings.keyboardShortcuts && " Keys: 1–4 to pick, → to check, ← to skip."}
          </div>
        </div>
      )}
    </div>
  )
}
