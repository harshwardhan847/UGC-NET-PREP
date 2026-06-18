import { useState, useEffect, useCallback, useRef } from "react"
import rawQuestions from "@/data/ugc_net_cs_pyqs.json"

const UNITS: { [key: number]: string } = {
  1: "Discrete Structures and Optimization",
  2: "Computer System Architecture",
  3: "Programming Languages & Computer Graphics",
  4: "Database Management Systems (DBMS)",
  5: "System Software and Operating System",
  6: "Software Engineering",
  7: "Data Structures and Algorithms",
  8: "Theory of Computation and Compilers",
  9: "Data Communication and Computer Networks",
  10: "Artificial Intelligence (AI)",
  11: "General Paper 1"
}

// Type definitions
export interface Question {
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
}

export interface QuizSession {
  id: string
  date: string
  mode: "practice" | "mock" | "custom"
  unit?: number
  unitName?: string
  score: number
  total: number
  incorrectIds: string[]
}

export interface MasteryRecord {
  correct: number
  attempts: number
}

export interface UnitMastery {
  [unitId: number]: MasteryRecord
}

export const useQuizState = () => {
  const [questions] = useState<Question[]>(rawQuestions as Question[])
  
  // Dashboard & Navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "quiz">("dashboard")
  
  // Quiz Configuration state
  const [quizMode, setQuizMode] = useState<"practice" | "mock" | "custom" | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null)
  
  const [customNumQuestions, setCustomNumQuestions] = useState<number>(20)
  const [customTimeLimit, setCustomTimeLimit] = useState<number>(30) // in minutes
  const [customSelectedUnits, setCustomSelectedUnits] = useState<number[]>([])
  
  // Running Quiz state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: string]: string }>({})
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [qId: string]: boolean }>({})
  const [skippedQuestions, setSkippedQuestions] = useState<{ [qId: string]: boolean }>({})
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false)
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false)
  
  // Reinforcement Mode state
  // Indicates if the reinforcement learning sub-session is active for the current question
  const [isReinforcing, setIsReinforcing] = useState<boolean>(false)
  const [currentIncorrectQ, setCurrentIncorrectQ] = useState<Question | null>(null)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0) // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Statistics and History
  const [history, setHistory] = useState<QuizSession[]>([])
  const [unitMastery, setUnitMastery] = useState<UnitMastery>({})

  // Load history & mastery on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedHistory = localStorage.getItem("ugc_net_quiz_history")
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory)
          setHistory(parsed)
          recalculateMastery(parsed)
        } catch (e) {
          console.error("Failed to parse history", e)
        }
      }
    }
  }, [])

  // Recalculate Unit-wise Mastery based on history
  const recalculateMastery = (sessions: QuizSession[]) => {
    const mastery: UnitMastery = {}
    
    // Initialize units
    for (let u = 1; u <= 11; u++) {
      mastery[u] = { correct: 0, attempts: 0 }
    }
    
    // Process each session
    sessions.forEach(session => {
      // In practice mode, we can attribute all attempts to the selected unit
      if (session.mode === "practice" && session.unit) {
        if (mastery[session.unit]) {
          mastery[session.unit].attempts += session.total
          mastery[session.unit].correct += session.score
        }
      } else {
        // For mock/custom, we don't have per-question mapping saved in history directly,
        // so we will also map historical per-question correctness if needed.
        // For simplicity, we calculate based on practice sessions or we can trace back.
        // Let's increment based on session info:
        if (session.unit && mastery[session.unit]) {
          mastery[session.unit].attempts += session.total
          mastery[session.unit].correct += session.score
        }
      }
    });
    
    setUnitMastery(mastery)
  }

  // Update mastery manually when a question is submitted
  const recordQuestionAttempt = useCallback((unitId: number, isCorrect: boolean) => {
    setUnitMastery(prev => {
      const current = prev[unitId] || { correct: 0, attempts: 0 }
      const updated = {
        ...prev,
        [unitId]: {
          attempts: current.attempts + 1,
          correct: current.correct + (isCorrect ? 1 : 0)
        }
      }
      return updated
    })
  }, [])

  // Timer loop
  useEffect(() => {
    if (isQuizActive && timeLeft > 0 && !isQuizFinished) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isQuizActive && !isQuizFinished) {
      finishQuiz()
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isQuizActive, timeLeft, isQuizFinished])

  // Start Quiz based on configuration
  const startQuiz = () => {
    let selectedQs: Question[] = []
    let duration = 0 // in seconds
    
    if (quizMode === "practice" && selectedUnit !== null) {
      // Get all questions in the selected unit
      selectedQs = questions.filter(q => q.unit === selectedUnit)
      // Shuffle them
      selectedQs = [...selectedQs].sort(() => 0.5 - Math.random()).slice(0, 20) // Default 20 for practice
      duration = 20 * 90 // 90 seconds per question
    } 
    else if (quizMode === "mock" && selectedPaper !== null) {
      // Filter by paper filename
      selectedQs = questions.filter(q => q.paper === selectedPaper)
      // Sort by question number to preserve paper flow
      selectedQs = [...selectedQs].sort((a, b) => a.q_num - b.q_num)
      duration = selectedQs.length === 50 ? 60 * 60 : 180 * 60 // 1 hour for Paper 1, 3 hours for CS
    } 
    else if (quizMode === "custom") {
      // Custom filtering
      const targetUnits = customSelectedUnits.length > 0 ? customSelectedUnits : Array.from({ length: 10 }, (_, i) => i + 1)
      
      selectedQs = questions.filter(q => targetUnits.includes(q.unit))
      // Shuffle and slice
      selectedQs = [...selectedQs].sort(() => 0.5 - Math.random()).slice(0, customNumQuestions)
      duration = customTimeLimit * 60
    }
    
    if (selectedQs.length === 0) {
      alert("No questions found matching criteria.")
      return
    }
    
    setActiveQuestions(selectedQs)
    setCurrentIndex(0)
    setSelectedAnswers({})
    setSubmittedAnswers({})
    setSkippedQuestions({})
    setTimeLeft(duration)
    setIsQuizActive(true)
    setIsQuizFinished(false)
    setIsReinforcing(false)
    setCurrentIncorrectQ(null)
    setActiveTab("quiz")
  }

  // Answer Selection
  const selectAnswer = (qId: string, option: string) => {
    if (submittedAnswers[qId] || isQuizFinished) return
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }))
  }

  // Submit Answer
  const submitAnswer = (qId: string) => {
    if (submittedAnswers[qId] || isQuizFinished) return
    const userAns = selectedAnswers[qId]
    if (!userAns) return
    
    const question = activeQuestions.find(q => q.id === qId)
    if (!question) return
    
    const isCorrect = userAns === question.answer
    
    setSubmittedAnswers(prev => ({ ...prev, [qId]: true }))
    recordQuestionAttempt(question.unit, isCorrect)
    
    // Remove from skipped list if submitted
    setSkippedQuestions(prev => {
      const updated = { ...prev }
      delete updated[qId]
      return updated
    })
    
    // If incorrect, trigger reinforcement mode
    if (!isCorrect) {
      setCurrentIncorrectQ(question)
      setIsReinforcing(true)
    }
  }

  // Skip Question
  const skipQuestion = (qId: string) => {
    setSkippedQuestions(prev => ({ ...prev, [qId]: true }))
    setCurrentIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))
  }

  // Finish Quiz
  const finishQuiz = () => {
    setIsQuizActive(false)
    setIsQuizFinished(true)
    
    if (timerRef.current) clearTimeout(timerRef.current)
    
    // Calculate final score
    let correctCount = 0
    const incorrectIds: string[] = []
    
    activeQuestions.forEach(q => {
      const userAns = selectedAnswers[q.id]
      if (userAns === q.answer) {
        correctCount++
      } else {
        incorrectIds.push(q.id)
      }
    })
    
    // Create new session record
    const newSession: QuizSession = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      mode: quizMode || "practice",
      score: correctCount,
      total: activeQuestions.length,
      incorrectIds
    }
    
    if (quizMode === "practice" && selectedUnit !== null) {
      newSession.unit = selectedUnit
      newSession.unitName = UNITS[selectedUnit]
    }
    
    const updatedHistory = [newSession, ...history]
    setHistory(updatedHistory)
    localStorage.setItem("ugc_net_quiz_history", JSON.stringify(updatedHistory))
    recalculateMastery(updatedHistory)
  }

  // Reset/Quit Quiz
  const quitQuiz = () => {
    setIsQuizActive(false)
    setIsQuizFinished(false)
    setActiveQuestions([])
    setSelectedAnswers({})
    setSubmittedAnswers({})
    setSkippedQuestions({})
    setCurrentIndex(0)
    setIsReinforcing(false)
    setCurrentIncorrectQ(null)
    setActiveTab("dashboard")
    setQuizMode(null)
  }

  return {
    questions,
    activeTab,
    setActiveTab,
    
    // Config states & handlers
    quizMode,
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
    
    // Quiz runtime state
    activeQuestions,
    currentIndex,
    setCurrentIndex,
    selectedAnswers,
    submittedAnswers,
    skippedQuestions,
    selectAnswer,
    submitAnswer,
    skipQuestion,
    isQuizActive,
    isQuizFinished,
    timeLeft,
    finishQuiz,
    quitQuiz,
    
    // Reinforcement state
    isReinforcing,
    setIsReinforcing,
    currentIncorrectQ,
    setCurrentIncorrectQ,
    
    // Stats & History
    history,
    unitMastery,
    recordQuestionAttempt
  }
}
