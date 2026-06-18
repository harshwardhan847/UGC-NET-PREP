"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  GitCompare, CheckCircle2, XCircle, ChevronDown, 
  ChevronRight, Award, HelpCircle, Info
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
  unit?: number
  unit_name?: string
  isAnswered?: boolean
  isCorrect?: boolean
  userAnswer?: string | null
}

interface DuplicateGroup {
  group_id: number
  unit: number
  unit_name: string
  questions: Question[]
}

interface RepeatedQuestionsProps {
  onAttemptLogged: () => void // Callback to refresh global stats
}

export default function RepeatedQuestions({ onAttemptLogged }: RepeatedQuestionsProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  
  // Interactive testing state
  const [selectedOptions, setSelectedOptions] = useState<{ [qId: string]: string }>({})
  const [attemptedQs, setAttemptedQs] = useState<{ [qId: string]: { isAnswered: boolean; isCorrect: boolean; userAnswer: string } }>({})
  const [revealedSolutions, setRevealedSolutions] = useState<{ [qId: string]: boolean }>({})

  // Fetch enriched duplicate groups from database
  const fetchDuplicates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/duplicates")
      if (res.ok) {
        const data = await res.json()
        setDuplicateGroups(data)
        
        // Initialize attempts dictionary
        const attemptsMap: typeof attemptedQs = {}
        const optionsMap: typeof selectedOptions = {}
        
        data.forEach((group: DuplicateGroup) => {
          group.questions.forEach((q: Question) => {
            if (q.isAnswered) {
              attemptsMap[q.id] = {
                isAnswered: true,
                isCorrect: q.isCorrect || false,
                userAnswer: q.userAnswer || ""
              }
              optionsMap[q.id] = q.userAnswer || ""
            }
          })
        })
        setAttemptedQs(attemptsMap)
        setSelectedOptions(optionsMap)
      }
    } catch (err) {
      console.error("Failed to fetch duplicates", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  // Submit attempt to SQLite
  const handleAnswerSubmit = async (qId: string) => {
    const userChoice = selectedOptions[qId]
    if (!userChoice) return

    // Find question
    let question: Question | undefined
    for (const group of duplicateGroups) {
      question = group.questions.find(q => q.id === qId)
      if (question) break
    }
    if (!question) return

    const isCorrect = userChoice === question.answer

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qId,
          userAnswer: userChoice,
          isCorrect
        })
      })

      if (res.ok) {
        setAttemptedQs(prev => ({
          ...prev,
          [qId]: { isAnswered: true, isCorrect, userAnswer: userChoice }
        }))
        setRevealedSolutions(prev => ({ ...prev, [qId]: true }))
        onAttemptLogged()
      }
    } catch (err) {
      console.error("Failed to submit attempt", err)
    }
  }

  const activeGroup = duplicateGroups.find(g => g.group_id === activeGroupId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto px-4 py-8">
      {/* Left Repeat list navigation */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight px-2 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-indigo-500" />
          Repeating Clusters
        </h2>
        
        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center text-neutral-500 text-xs">
            Loading groups...
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
            {duplicateGroups.map(group => {
              // Summarize repeating concepts
              const firstQ = group.questions[0]?.question || ""
              const summary = firstQ.substring(0, 40) + "..."
              
              // Count completed questions in this group
              const solvedCount = group.questions.filter(q => attemptedQs[q.id]?.isAnswered).length

              return (
                <button
                  key={group.group_id}
                  onClick={() => setActiveGroupId(group.group_id)}
                  className={`w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-all cursor-pointer ${
                    activeGroupId === group.group_id 
                      ? "bg-indigo-600/10 border-l-3 border-indigo-500 text-indigo-400 font-semibold"
                      : "hover:bg-neutral-850/50 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="truncate max-w-[170px]">Cluster #{group.group_id}</span>
                    <span className="text-[9px] bg-neutral-850 text-neutral-400 px-1.5 py-0.5 rounded font-normal">
                      {group.questions.length} cycles
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate leading-snug">
                    {group.unit_name.split(" (")[0]}
                  </div>
                  <div className="text-[10px] text-neutral-600 italic truncate max-w-[240px]">
                    "{summary}"
                  </div>
                  
                  {solvedCount > 0 && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-500/80 font-bold self-end mt-1">
                      <CheckCircle2 className="w-3 h-3" /> {solvedCount}/{group.questions.length} solved
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right Comparison Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {activeGroup ? (
          <div className="flex flex-col gap-6">
            {/* Group Header */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xs">
              <h1 className="text-lg font-bold tracking-tight text-neutral-200">
                Repeated Question Cluster #{activeGroup.group_id}
              </h1>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                These questions share the exact same conceptual formula/structure across papers, often with changed variables.
              </p>
              <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider mt-3 bg-indigo-500/5 px-3 py-1.5 rounded-lg border border-indigo-500/10">
                Syllabus Area: {activeGroup.unit_name}
              </div>
            </div>

            {/* Side-by-side comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeGroup.questions.map((q, idx) => {
                const attempt = attemptedQs[q.id]
                const hasSubmitted = attempt?.isAnswered
                const isCorrect = attempt?.isCorrect
                const showSol = revealedSolutions[q.id]

                return (
                  <div 
                    key={q.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 relative"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center text-[10px] border-b border-neutral-850 pb-2">
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/10 px-2 py-0.5 rounded font-bold">
                        {q.year} (Q.{q.q_num})
                      </span>
                      <span className="text-neutral-500 font-semibold">{q.id}</span>
                    </div>

                    {/* Question text */}
                    <p className="text-xs text-neutral-200 whitespace-pre-line leading-relaxed flex-1">
                      {q.question}
                    </p>

                    {/* Options list */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      {[
                        { label: "A", text: q.options.A },
                        { label: "B", text: q.options.B },
                        { label: "C", text: q.options.C },
                        { label: "D", text: q.options.D }
                      ].map(opt => {
                        if (!opt.text) return null
                        
                        const isSelected = selectedOptions[q.id] === opt.label
                        const isCorrectChoice = opt.label === q.answer
                        const wasUserAnswer = attempt?.userAnswer === opt.label

                        let optionStyle = "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-850 text-neutral-400 cursor-pointer"
                        if (isSelected && !hasSubmitted) {
                          optionStyle = "border-indigo-500 bg-indigo-500/10 text-indigo-300 cursor-pointer"
                        } else if (hasSubmitted) {
                          if (isCorrectChoice) {
                            optionStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          } else if (wasUserAnswer && !isCorrect) {
                            optionStyle = "border-red-500/50 bg-red-500/10 text-red-400"
                          } else {
                            optionStyle = "border-neutral-850 bg-neutral-900/10 text-neutral-500 opacity-60"
                          }
                        }

                        return (
                          <button
                            key={opt.label}
                            disabled={hasSubmitted}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [q.id]: opt.label }))}
                            className={`w-full text-left p-2.5 rounded-lg border text-[11px] flex items-start gap-2.5 transition-all ${optionStyle}`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                              isSelected && !hasSubmitted 
                                ? "bg-indigo-500 text-white" 
                                : hasSubmitted && isCorrectChoice 
                                  ? "bg-emerald-500 text-white" 
                                  : hasSubmitted && wasUserAnswer && !isCorrect 
                                    ? "bg-red-500 text-white" 
                                    : "bg-neutral-850 text-neutral-400"
                            }`}>
                              {opt.label}
                            </span>
                            <span className="leading-snug">{opt.text}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Actions and toggle */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-850">
                      {!hasSubmitted ? (
                        <button
                          onClick={() => handleAnswerSubmit(q.id)}
                          disabled={!selectedOptions[q.id]}
                          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-[10px] font-semibold text-white transition-colors cursor-pointer"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {isCorrect ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 font-bold">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )}
                        </div>
                      )}

                      {hasSubmitted && (
                        <button
                          onClick={() => setRevealedSolutions(prev => ({ ...prev, [q.id]: !showSol }))}
                          className="text-[10px] text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
                        >
                          {showSol ? "Hide Solution" : "View Explanation"}
                        </button>
                      )}
                    </div>

                    {/* Solution panel */}
                    <AnimatePresence>
                      {showSol && hasSubmitted && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-neutral-950 p-3.5 border border-neutral-850 rounded-lg text-[11px] text-neutral-400 flex flex-col gap-1.5 mt-2 leading-relaxed overflow-hidden"
                        >
                          <div className="text-[10px] font-bold text-emerald-400">
                            Correct Option: {q.answer}
                          </div>
                          <p className="whitespace-pre-line text-neutral-350">{q.solution || "No explanation provided."}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            Select a repeating question cluster from the left panel.
          </div>
        )}
      </div>
    </div>
  )
}
