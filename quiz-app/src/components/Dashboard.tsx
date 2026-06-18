"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Award, Settings, Clock, CheckCircle2, ChevronRight, BarChart3, HelpCircle } from "lucide-react"
import { Question } from "@/hooks/useQuizState"

interface DashboardProps {
  questions: Question[]
  setQuizMode: (mode: "practice" | "mock" | "custom" | null) => void
  selectedUnit: number | null
  setSelectedUnit: (unit: number | null) => void
  selectedPaper: string | null
  setSelectedPaper: (paper: string | null) => void
  customNumQuestions: number
  setCustomNumQuestions: (num: number) => void
  customTimeLimit: number
  setCustomTimeLimit: (limit: number) => void
  customSelectedUnits: number[]
  setCustomSelectedUnits: (units: number[]) => void
  startQuiz: () => void
  history: any[]
  unitMastery: any
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
  { id: 10, name: "Artificial Intelligence (AI)", desc: "Neural networks, fuzzy logic, state search" }
]

export default function Dashboard({
  questions,
  setQuizMode,
  selectedUnit,
  setSelectedUnit,
  selectedPaper,
  setSelectedPaper,
  customNumQuestions,
  setCustomNumQuestions,
  customTimeLimit,
  setCustomTimeLimit,
  customSelectedUnits,
  setCustomSelectedUnits,
  startQuiz,
  history,
  unitMastery
}: DashboardProps) {
  const [activeModeTab, setActiveModeTab] = useState<"practice" | "mock" | "custom">("practice")

  // Extract unique papers for Mock Test
  const uniquePapers = Array.from(new Set(questions.map(q => q.paper))).sort();
  const getPaperFriendlyName = (fileName: string) => {
    if (fileName.includes("General Paper")) {
      return fileName.replace(".pdf", "")
    }
    return fileName
      .replace("UGC_Comp_", "")
      .replace(".pdf", "")
      .replace("Dec", "December ")
      .replace("June", "June ")
      .replace("July", "July ")
      .replace("Nov", "November ")
      .replace("Sep", "September ")
      .replace("ShiftII", " (Shift II)")
      .replace("Cancelled", " (Cancelled)")
      .replace("ReExam", " (Re-Exam)")
  }

  // Calculate generic stats
  const totalQuestionsSeen = history.reduce((sum, item) => sum + item.total, 0)
  const averageScore = history.length > 0 
    ? Math.round((history.reduce((sum, item) => sum + (item.score / item.total), 0) / history.length) * 100)
    : 0

  const toggleCustomUnit = (unitId: number) => {
    if (customSelectedUnits.includes(unitId)) {
      setCustomSelectedUnits(customSelectedUnits.filter(id => id !== unitId))
    } else {
      setCustomSelectedUnits([...customSelectedUnits, unitId])
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-neutral-800 dark:text-neutral-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            UGC NET CS Prep Portal
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Practice previous year questions with context-aware AI reinforcement.
          </p>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-sm font-medium">Attempted Questions</span>
            <HelpCircle className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold">{totalQuestionsSeen}</div>
          <p className="text-xs text-neutral-500 mt-1">Across all practice modes</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-sm font-medium">Average Score</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">{averageScore}%</div>
          <p className="text-xs text-neutral-500 mt-1">Average correctness rate</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-sm font-medium">Sessions Logged</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold">{history.length}</div>
          <p className="text-xs text-neutral-500 mt-1">Completed quiz runs</p>
        </motion.div>
      </div>

      {/* Main Grid: Quiz Setup vs Mastery Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Quiz Configuration */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Mode Tab Headers */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-1">
              <button
                onClick={() => { setActiveModeTab("practice"); setQuizMode("practice"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeModeTab === "practice" 
                    ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Unit Practice
              </button>
              <button
                onClick={() => { setActiveModeTab("mock"); setQuizMode("mock"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeModeTab === "mock" 
                    ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <Award className="w-4 h-4" />
                Mock Exam
              </button>
              <button
                onClick={() => { setActiveModeTab("custom"); setQuizMode("custom"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeModeTab === "custom" 
                    ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <Settings className="w-4 h-4" />
                Custom Quiz
              </button>
            </div>

            {/* Mode Content */}
            <div className="p-6">
              {activeModeTab === "practice" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Practice by Syllabus Unit</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Choose one of the ten syllabus areas. We'll generate a 20-question custom quiz focused on this topic.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {UNITS.map(unit => {
                      const mastery = unitMastery[unit.id] || { correct: 0, attempts: 0 }
                      const scorePercentage = mastery.attempts > 0 
                        ? Math.round((mastery.correct / mastery.attempts) * 100) 
                        : null

                      return (
                        <button
                          key={unit.id}
                          onClick={() => { setQuizMode("practice"); setSelectedUnit(unit.id); }}
                          className={`flex items-center justify-between text-left p-4 rounded-xl border transition-all ${
                            selectedUnit === unit.id
                              ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <span className="text-xs font-semibold text-neutral-400">Unit {unit.id}</span>
                            <h4 className="text-sm font-semibold truncate max-w-[200px] md:max-w-none">{unit.name}</h4>
                            <p className="text-xs text-neutral-500 truncate">{unit.desc}</p>
                          </div>
                          {scorePercentage !== null && (
                            <div className="text-right shrink-0">
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{scorePercentage}%</span>
                              <div className="text-[10px] text-neutral-400">{mastery.attempts} att.</div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeModeTab === "mock" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Full Mock Test</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Simulate a real exam session. Select a previous year question paper. Contains 100 questions with a 3-hour timer.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {uniquePapers.map(paper => {
                      const qCount = questions.filter(q => q.paper === paper).length
                      const timeLimit = qCount === 50 ? 60 : 180
                      return (
                        <button
                          key={paper}
                          onClick={() => { setQuizMode("mock"); setSelectedPaper(paper); }}
                          className={`flex items-center gap-3 text-left p-4 rounded-xl border transition-all ${
                            selectedPaper === paper
                              ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20"
                              : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                          }`}
                        >
                          <Clock className="w-5 h-5 text-neutral-400 shrink-0" />
                          <div>
                            <h4 className="text-sm font-semibold">{getPaperFriendlyName(paper)}</h4>
                            <p className="text-xs text-neutral-500">{qCount} questions • {timeLimit} Mins</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeModeTab === "custom" && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold mb-1">Create Custom Exam</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Filter questions across specific units, select question counts, and set a custom time limit.
                  </p>

                  {/* Question Count & Time Limit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                        Number of Questions: <span className="font-semibold text-neutral-800 dark:text-neutral-100">{customNumQuestions}</span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={customNumQuestions}
                        onChange={(e) => setCustomNumQuestions(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                        Time Limit: <span className="font-semibold text-neutral-800 dark:text-neutral-100">{customTimeLimit} Mins</span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="180"
                        step="5"
                        value={customTimeLimit}
                        onChange={(e) => setCustomTimeLimit(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Target Units */}
                  <div>
                    <span className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                      Target Units (Empty selects all):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                      {UNITS.map(unit => (
                        <button
                          type="button"
                          key={unit.id}
                          onClick={() => toggleCustomUnit(unit.id)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg border transition-colors ${
                            customSelectedUnits.includes(unit.id)
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          }`}
                        >
                          <span className="font-semibold">Unit {unit.id}:</span>
                          <span className="truncate">{unit.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Start Trigger */}
              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={startQuiz}
                  disabled={
                    (activeModeTab === "practice" && selectedUnit === null) ||
                    (activeModeTab === "mock" && selectedPaper === null)
                  }
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Launch Quiz Session
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: History & Mastery list */}
        <div className="space-y-6">
          {/* Unit-wise Mastery Statistics */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Syllabus Mastery
            </h3>
            <div className="space-y-3">
              {UNITS.map(unit => {
                const mastery = unitMastery[unit.id] || { correct: 0, attempts: 0 }
                const scorePercentage = mastery.attempts > 0 
                  ? Math.round((mastery.correct / mastery.attempts) * 100) 
                  : 0

                return (
                  <div key={unit.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="truncate max-w-[200px]" title={unit.name}>
                        U{unit.id}: {unit.name}
                      </span>
                      <span>{scorePercentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          scorePercentage > 75 
                            ? "bg-emerald-500" 
                            : scorePercentage > 50 
                            ? "bg-indigo-500" 
                            : scorePercentage > 0 
                            ? "bg-amber-500" 
                            : "bg-neutral-200 dark:bg-neutral-700"
                        }`}
                        style={{ width: `${scorePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historical sessions */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              Past Quizzes
            </h3>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  No previous sessions. Launch a quiz to start tracking!
                </div>
              ) : (
                history.map(session => (
                  <div key={session.id} className="p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-400 capitalize">{session.mode} Mode</div>
                      <div className="text-xs font-semibold mt-0.5 truncate max-w-[150px]">
                        {session.unitName || "Multi-subject"}
                      </div>
                      <div className="text-[10px] text-neutral-400">{session.date}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {session.score} / {session.total}
                      </span>
                      <div className="text-[10px] text-neutral-400">
                        {Math.round((session.score / session.total) * 100)}% correct
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
