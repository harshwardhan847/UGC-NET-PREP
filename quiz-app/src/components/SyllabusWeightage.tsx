"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BookOpen, Award, CheckCircle2, XCircle, ChevronDown, 
  ChevronRight, Search, Trophy, Percent, HelpCircle, GraduationCap
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
  isAnswered?: boolean
  isCorrect?: boolean
  userAnswer?: string | null
}

interface UnitStats {
  correct: number
  attempts: number
  total: number
}

interface SyllabusWeightageProps {
  onAttemptLogged: () => void // Callback to refresh global stats
}

const UNITS = [
  { id: 1, name: "Discrete Structures and Optimization", desc: "Sets, logic, graph theory, LPP" },
  { id: 2, name: "Computer System Architecture", desc: "Digital logic, CPU design, cache" },
  { id: 3, name: "Programming Languages & Graphics", desc: "C, C++, OOP, 2D/3D transformations" },
  { id: 4, name: "Database Management Systems (DBMS)", desc: "Relational models, SQL, normalization" },
  { id: 5, name: "System Software & Operating System", desc: "Scheduling, memory management, deadlocks" },
  { id: 6, name: "Software Engineering", desc: "SDLC, software testing, estimations" },
  { id: 7, name: "Data Structures and Algorithms", desc: "Complexity, trees, sorting, graph algorithms" },
  { id: 8, name: "Theory of Computation & Compilers", desc: "Automata, CFG, Turing machine, parsing" },
  { id: 9, name: "Data Communication & Networks", desc: "OSI, TCP/IP, IP routing, cryptography" },
  { id: 10, name: "Artificial Intelligence (AI)", desc: "Neural networks, fuzzy logic, state search" },
  { id: 11, name: "General Paper 1", desc: "Teaching, research, logic, reasoning" }
]

export default function SyllabusWeightage({ onAttemptLogged }: SyllabusWeightageProps) {
  const [activeUnitId, setActiveUnitId] = useState<number>(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [unitMastery, setUnitMastery] = useState<{ [unitId: number]: UnitStats }>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null)
  
  // Interactive testing state
  const [selectedOptions, setSelectedOptions] = useState<{ [qId: string]: string }>({})
  const [attemptedQs, setAttemptedQs] = useState<{ [qId: string]: { isAnswered: boolean; isCorrect: boolean; userAnswer: string } }>({})
  const [revealedSolutions, setRevealedSolutions] = useState<{ [qId: string]: boolean }>({})

  // Fetch unit-wise mastery stats
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats")
      if (res.ok) {
        const data = await res.json()
        setUnitMastery(data.unitMastery)
      }
    } catch (err) {
      console.error("Failed to fetch stats", err)
    }
  }

  // Fetch questions for active unit
  const fetchQuestions = async (unitId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/questions?unit=${unitId}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data)
        
        // Initialize attempts dictionary from database records
        const attemptsMap: typeof attemptedQs = {}
        const optionsMap: typeof selectedOptions = {}
        data.forEach((q: Question) => {
          if (q.isAnswered) {
            attemptsMap[q.id] = {
              isAnswered: true,
              isCorrect: q.isCorrect || false,
              userAnswer: q.userAnswer || ""
            }
            optionsMap[q.id] = q.userAnswer || ""
          }
        })
        setAttemptedQs(attemptsMap)
        setSelectedOptions(optionsMap)
      }
    } catch (err) {
      console.error("Failed to fetch questions", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchQuestions(activeUnitId)
    setExpandedConcept(null)
  }, [activeUnitId])

  // Group questions by conceptName
  const conceptsMap = React.useMemo(() => {
    const map = new Map<string, Question[]>()
    questions.forEach(q => {
      const list = map.get(q.conceptName) || []
      list.push(q)
      map.set(q.conceptName, list)
    })
    return map
  }, [questions])

  // Compute concepts list sorted by size/frequency
  const sortedConcepts = React.useMemo(() => {
    const list: { name: string; count: number; percentage: number; importance: string; questions: Question[] }[] = []
    const totalQ = questions.length
    
    conceptsMap.forEach((qList, name) => {
      const percentage = totalQ > 0 ? Math.round((qList.length / totalQ) * 100) : 0
      
      let importance = "Less Frequently Repeated"
      if (percentage >= 20) {
        importance = "Must-Do / Critical"
      } else if (percentage >= 10) {
        importance = "Frequently Repeated"
      }

      list.push({
        name,
        count: qList.length,
        percentage,
        importance,
        questions: qList
      })
    })

    // Sort: Must-Do first, then count descending
    return list.sort((a, b) => {
      const weight = { "Must-Do / Critical": 3, "Frequently Repeated": 2, "Less Frequently Repeated": 1 }
      const diff = (weight[b.importance as keyof typeof weight] || 0) - (weight[a.importance as keyof typeof weight] || 0)
      if (diff !== 0) return diff
      return b.count - a.count
    })
  }, [conceptsMap, questions])

  // Submit attempt to SQLite
  const handleAnswerSubmit = async (qId: string) => {
    const userChoice = selectedOptions[qId]
    if (!userChoice) return

    const question = questions.find(q => q.id === qId)
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
        
        // Refresh statistics
        fetchStats()
        onAttemptLogged()
      }
    } catch (err) {
      console.error("Failed to submit attempt", err)
    }
  }

  const getBadgeClass = (importance: string) => {
    if (importance === "Must-Do / Critical") {
      return "bg-red-500/10 text-red-400 border border-red-500/20"
    } else if (importance === "Frequently Repeated") {
      return "bg-purple-500/10 text-purple-400 border border-purple-500/20"
    }
    return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto px-4 py-8">
      {/* Left Units Navigation */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight px-2 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          Syllabus Units
        </h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex flex-col gap-1">
          {UNITS.map(unit => {
            const stats = unitMastery[unit.id] || { correct: 0, attempts: 0, total: 0 }
            const completionPct = stats.total > 0 
              ? Math.min(100, Math.round((stats.attempts / stats.total) * 100))
              : 0

            return (
              <button
                key={unit.id}
                onClick={() => setActiveUnitId(unit.id)}
                className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-all cursor-pointer ${
                  activeUnitId === unit.id 
                    ? "bg-indigo-600/10 border-l-3 border-indigo-500 text-indigo-400 font-semibold"
                    : "hover:bg-neutral-850/50 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="truncate max-w-[200px]">Unit {unit.id}: {unit.name.split(" &")[0]}</span>
                  <span className="text-[10px] text-neutral-500">{stats.total} Qs</span>
                </div>
                {/* Progress bar */}
                {stats.total > 0 && (
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full ${completionPct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Concepts & Questions Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Active Unit Header */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xs">
          <h1 className="text-xl font-bold tracking-tight">
            Unit {activeUnitId}: {UNITS.find(u => u.id === activeUnitId)?.name}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {UNITS.find(u => u.id === activeUnitId)?.desc}
          </p>
          
          {/* Unit mastery banner */}
          {unitMastery[activeUnitId] && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-800 text-center text-xs">
              <div>
                <span className="text-neutral-500">Solved / Total</span>
                <p className="text-sm font-bold mt-1 text-neutral-200">
                  {unitMastery[activeUnitId].attempts} / {unitMastery[activeUnitId].total}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Correct answers</span>
                <p className="text-sm font-bold mt-1 text-emerald-400">
                  {unitMastery[activeUnitId].correct}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Mastery Level</span>
                <p className="text-sm font-bold mt-1 text-indigo-400">
                  {unitMastery[activeUnitId].attempts > 0 
                    ? `${Math.round((unitMastery[activeUnitId].correct / unitMastery[activeUnitId].attempts) * 100)}%`
                    : "0%"
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Concepts Card List */}
        {loading ? (
          <div className="text-center py-12 text-neutral-500 text-sm">
            Loading concepts and weights...
          </div>
        ) : sortedConcepts.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No concepts classified for this unit.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedConcepts.map((concept, idx) => {
              const isOpen = expandedConcept === concept.name
              
              // Count answered questions in this concept
              const answeredInConcept = concept.questions.filter(q => attemptedQs[q.id]?.isAnswered).length
              const correctInConcept = concept.questions.filter(q => attemptedQs[q.id]?.isCorrect).length

              return (
                <div 
                  key={concept.name}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xs"
                >
                  {/* Concept Header */}
                  <div 
                    onClick={() => setExpandedConcept(isOpen ? null : concept.name)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-neutral-850 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                        {concept.name}
                        {answeredInConcept > 0 && (
                          <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 font-normal">
                            {answeredInConcept}/{concept.questions.length} Solved
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                        <span>Occurrence: <strong>{concept.count} Qs</strong> ({concept.percentage}%)</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${getBadgeClass(concept.importance)}`}>
                        {concept.importance.split(" ")[0]}
                      </span>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
                    </div>
                  </div>

                  {/* Concept Content (Collapsible Question List) */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-neutral-800 bg-neutral-950/40 p-4 flex flex-col gap-4 overflow-hidden"
                      >
                        <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                          Concept Practice Questions
                        </h3>

                        {concept.questions.slice(0, 5).map(q => {
                          const attempt = attemptedQs[q.id]
                          const hasSubmitted = attempt?.isAnswered
                          const isCorrect = attempt?.isCorrect
                          const optionA = q.options.A
                          const optionB = q.options.B
                          const optionC = q.options.C
                          const optionD = q.options.D
                          const showSol = revealedSolutions[q.id]

                          return (
                            <div key={q.id} className="bg-neutral-900 border border-neutral-800/80 rounded-lg p-4 flex flex-col gap-3">
                              {/* Question header */}
                              <div className="flex justify-between items-center text-[10px] text-neutral-500 border-b border-neutral-850 pb-2">
                                <span className="font-semibold">Q.{q.q_num} ({q.year})</span>
                                <span className="text-neutral-400 font-medium bg-neutral-800 px-2 py-0.5 rounded">{q.paper.replace(".pdf", "")}</span>
                              </div>
                              
                              {/* Question body */}
                              <p className="text-xs text-neutral-200 whitespace-pre-line leading-relaxed">{q.question}</p>

                              {/* Question Options */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                {[
                                  { label: "A", text: optionA },
                                  { label: "B", text: optionB },
                                  { label: "C", text: optionC },
                                  { label: "D", text: optionD }
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
                                      className={`w-full text-left p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${optionStyle}`}
                                    >
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                        isSelected && !hasSubmitted 
                                          ? "bg-indigo-500 text-white" 
                                          : hasSubmitted && isCorrectChoice 
                                            ? "bg-emerald-500 text-white" 
                                            : hasSubmitted && wasUserAnswer && !isCorrect 
                                              ? "bg-red-500 text-white" 
                                              : "bg-neutral-800 text-neutral-300"
                                      }`}>
                                        {opt.label}
                                      </span>
                                      <span className="leading-snug">{opt.text}</span>
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3 justify-between items-center mt-2 border-t border-neutral-850 pt-3">
                                {!hasSubmitted ? (
                                  <button
                                    onClick={() => handleAnswerSubmit(q.id)}
                                    disabled={!selectedOptions[q.id]}
                                    className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-semibold text-white transition-colors cursor-pointer"
                                  >
                                    Submit Answer
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    {isCorrect ? (
                                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <CheckCircle2 className="w-4 h-4" /> Correct
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-400 font-bold">
                                        <XCircle className="w-4 h-4" /> Incorrect
                                      </span>
                                    )}
                                  </div>
                                )}

                                {hasSubmitted && (
                                  <button
                                    onClick={() => setRevealedSolutions(prev => ({ ...prev, [q.id]: !showSol }))}
                                    className="text-xs text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
                                  >
                                    {showSol ? "Hide Solution" : "View Explanation"}
                                  </button>
                                )}
                              </div>

                              {/* Solution Panel */}
                              <AnimatePresence>
                                {showSol && hasSubmitted && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-neutral-950 p-4 border border-neutral-850 rounded-lg text-xs text-neutral-400 flex flex-col gap-2 mt-2 leading-relaxed overflow-hidden"
                                  >
                                    <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                      Correct Option: {q.answer}
                                    </div>
                                    <p className="whitespace-pre-line text-neutral-300 font-medium">{q.solution || "No explanation provided."}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                        {concept.questions.length > 5 && (
                          <div className="text-[11px] text-neutral-500 text-center italic mt-1">
                            Showing top 5 representative questions. Access full mock/practice exams to solve more.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
