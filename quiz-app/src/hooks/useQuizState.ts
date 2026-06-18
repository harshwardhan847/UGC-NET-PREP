import { useState, useEffect, useCallback, useRef } from "react"

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
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  
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

  // Load questions, history & mastery from SQLite DB
  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch questions
      const qRes = await fetch("/api/questions")
      if (qRes.ok) {
        const qData = await qRes.json()
        setQuestions(qData)
      }
      
      // Fetch stats & history
      const sRes = await fetch("/api/stats")
      if (sRes.ok) {
        const sData = await sRes.json()
        setHistory(sData.history)
        
        // Map unit mastery stats
        const mastery: UnitMastery = {}
        for (let u = 1; u <= 11; u++) {
          const m = sData.unitMastery[u] || { correct: 0, attempts: 0, total: 0 }
          mastery[u] = { correct: m.correct, attempts: m.attempts }
        }
        setUnitMastery(mastery)
      }
    } catch (err) {
      console.error("Failed to load data from SQLite database", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

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

  // Submit Answer to database and update local state
  const submitAnswer = async (qId: string) => {
    if (submittedAnswers[qId] || isQuizFinished) return
    const userAns = selectedAnswers[qId]
    if (!userAns) return
    
    const question = activeQuestions.find(q => q.id === qId)
    if (!question) return
    
    const isCorrect = userAns === question.answer
    
    setSubmittedAnswers(prev => ({ ...prev, [qId]: true }))
    recordQuestionAttempt(question.unit, isCorrect)
    
    // Log single attempt to SQLite database
    try {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qId,
          userAnswer: userAns,
          isCorrect
        })
      })
    } catch (err) {
      console.error("Failed to submit attempt to DB", err)
    }
    
    // Update local question list state
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, isAnswered: true, isCorrect, userAnswer: userAns }
      }
      return q
    }))

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

  // Finish Quiz, submit session and attempts, and reload stats
  const finishQuiz = async () => {
    setIsQuizActive(false)
    setIsQuizFinished(true)
    
    if (timerRef.current) clearTimeout(timerRef.current)
    
    // Calculate final score
    let correctCount = 0
    const attemptsToSubmit: { questionId: string; userAnswer: string; isCorrect: boolean }[] = []
    
    activeQuestions.forEach(q => {
      const userAns = selectedAnswers[q.id] || ""
      const isCorrect = userAns === q.answer
      if (isCorrect) {
        correctCount++
      }
      attemptsToSubmit.push({
        questionId: q.id,
        userAnswer: userAns,
        isCorrect
      })
    })
    
    // Submit session to SQLite
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: quizMode || "practice",
          unit: quizMode === "practice" ? selectedUnit : null,
          unitName: quizMode === "practice" && selectedUnit !== null ? UNITS[selectedUnit] : null,
          score: correctCount,
          total: activeQuestions.length,
          attempts: attemptsToSubmit
        })
      })
      
      // Refresh global state from DB
      await refreshData()
    } catch (err) {
      console.error("Failed to save quiz session", err)
    }
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
    recordQuestionAttempt,
    refreshData,
    loading
  }
}
