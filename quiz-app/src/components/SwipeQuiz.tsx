"use client"

import React, { useState, useEffect } from "react"
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion"
import { 
  X, Check, ArrowRight, RefreshCw, AlertTriangle, 
  Sparkles 
} from "lucide-react"

interface Question {
  id: string
  year: string
  paper: string
  q_num: number
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  answer: string
  solution: string
  unit: number
  unit_name: string
  conceptName: string
}

const UNITS = [
  { id: 1, name: "Discrete Structures and Optimization" },
  { id: 2, name: "Computer System Architecture" },
  { id: 3, name: "Programming Languages & Computer Graphics" },
  { id: 4, name: "Database Management Systems (DBMS)" },
  { id: 5, name: "System Software and Operating System" },
  { id: 6, name: "Software Engineering" },
  { id: 7, name: "Data Structures and Algorithms" },
  { id: 8, name: "Theory of Computation and Compilers" },
  { id: 9, name: "Data Communication and Computer Networks" },
  { id: 10, name: "Artificial Intelligence (AI)" },
  { id: 11, name: "General Paper 1" }
]

export default function SwipeQuiz() {
  const [selectedUnit, setSelectedUnit] = useState<number | "all">("all")
  const [questions, setQuestions] = useState<Question[]>([])
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
  
  // Framer Motion controls & values
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.6, 1, 1, 1, 0.6])
  const controls = useAnimation()

  const currentQ = questions[currentIndex]

  // Load unsolved questions
  const loadQuestions = async () => {
    setLoading(true)
    try {
      let url = "/api/questions?unsolved=true"
      if (selectedUnit !== "all") {
        url += `&unit=${selectedUnit}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        // Shuffle the loaded cards
        const shuffled = data.sort(() => 0.5 - Math.random())
        setQuestions(shuffled)
        setCurrentIndex(0)
        resetCardState()
      }
    } catch (err) {
      console.error("Failed to load cards", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [selectedUnit])

  const resetCardState = () => {
    setSelectedOption(null)
    setIsAnswered(false)
    setIsCorrect(false)
    setGapAnalysis(null)
    setLesson(null)
    x.set(0)
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 })
  }

  // Handle Swipe Left (Skip)
  const swipeLeft = async () => {
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

    // Post attempt to SQLite
    try {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQ.id,
          userAnswer: selectedOption,
          isCorrect: correct
        })
      })
    } catch (err) {
      console.error("Failed to post attempt", err)
    }

    if (correct) {
      // Correct answer: Fly off to the right!
      await controls.start({ x: 400, opacity: 0, rotate: 15, transition: { duration: 0.2 } })
      nextQuestion()
    } else {
      // Incorrect answer: Snap back and show AI lesson & reinforcement content
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 200, damping: 18 } })
      fetchReinforceContent()
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

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 p-4 md:p-6 overflow-hidden">
      
      {/* Top filter select */}
      <div className="max-w-md mx-auto w-full mb-6 shrink-0">
        <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 text-center md:text-left">
          Select Syllabus Focus Area
        </label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs text-neutral-800 dark:text-neutral-200"
        >
          <option value="all">All Units (Mixed Pile)</option>
          {UNITS.map(unit => (
            <option key={unit.id} value={unit.id}>Unit {unit.id}: {unit.name}</option>
          ))}
        </select>
      </div>

      {/* Main card deck frame */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[380px] max-h-[620px] w-full">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold">Preparing card stack...</span>
          </div>
        ) : currentIndex >= questions.length ? (
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
              You've swiped through all available unsolved questions in this category. Correctly answered questions have been recorded and removed from this pile.
            </p>
            <button
              onClick={loadQuestions}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                className="absolute inset-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-md opacity-40 scale-95 translate-y-6 select-none pointer-events-none z-0"
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
              className={`absolute inset-0 bg-white dark:bg-neutral-900 border rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden z-10 transition-colors duration-200 h-[460px] md:h-[500px] ${
                !isAnswered 
                  ? "border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing" 
                  : isCorrect
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-rose-500 bg-rose-50/10"
              }`}
            >
              
              {/* Card Header */}
              <div className="px-5 py-3.5 border-b border-neutral-150 dark:border-neutral-850 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950 shrink-0">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-550 tracking-wider">
                  {currentQ.year} • Q{currentQ.q_num}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded">
                  Unit {currentQ.unit}
                </span>
              </div>

              {/* Card Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
                <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block tracking-wider uppercase mb-1">
                  {currentQ.unit_name}
                </p>
                <div className="text-xs md:text-sm leading-relaxed font-semibold text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">
                  {currentQ.question}
                </div>

                {/* Options */}
                {!isAnswered ? (
                  <div className="space-y-2 pt-2">
                    {(Object.keys(currentQ.options) as Array<"A" | "B" | "C" | "D">).map(optKey => {
                      const optText = currentQ.options[optKey]
                      if (!optText) return null
                      const isSelected = selectedOption === optKey

                      return (
                        <button
                          key={optKey}
                          onClick={() => handleOptionSelect(optKey)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-bold"
                              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-350 font-medium"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-300 dark:border-neutral-700"
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
                  <div className="space-y-4 pt-2 border-t border-neutral-150 dark:border-neutral-850">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-450 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> Incorrect Selection.
                    </div>
                    <div className="text-xs bg-neutral-100 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-850">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                        Correct Answer is Option {currentQ.answer}:
                      </div>
                      <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-semibold">
                        {currentQ.options[currentQ.answer as keyof typeof currentQ.options]}
                      </p>
                    </div>

                    {fetchingReinforce ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-neutral-400 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        Tutor gap analysis...
                      </div>
                    ) : (
                      (gapAnalysis || lesson) && (
                        <div className="space-y-3">
                          {gapAnalysis && (
                            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block mb-1">Conceptual Gap</span>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-350 leading-relaxed italic font-semibold">"{gapAnalysis}"</p>
                            </div>
                          )}
                          {lesson && (
                            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3.5">
                              <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block mb-1">Study Guide</span>
                              <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium whitespace-pre-line">{lesson}</p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-150 dark:border-neutral-850 flex items-center justify-between shrink-0">
                {!isAnswered ? (
                  <>
                    <button
                      onClick={swipeLeft}
                      className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      title="Skip question"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      Skip Card
                    </button>
                    <button
                      onClick={swipeRight}
                      disabled={!selectedOption}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      Verify
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
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

      {/* Swipe Tips */}
      {!loading && currentIndex < questions.length && (
        <div className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider mt-4 shrink-0 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Swipe Left to Skip • Select option & Swipe Right/Verify to submit</span>
        </div>
      )}
    </div>
  )
}
