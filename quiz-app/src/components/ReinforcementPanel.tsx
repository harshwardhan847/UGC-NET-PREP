"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Question } from "@/hooks/useQuizState"
import { HelpCircle, CheckCircle, AlertCircle, RefreshCw, GraduationCap, ArrowRight } from "lucide-react"
import Markdown from "./Markdown"

interface ReinforcementPanelProps {
  currentIncorrectQ: Question
  userChoice: string
  onComplete: () => void
}

interface ReinforceData {
  gapAnalysis: string
  explanation: string
  reinforcementQuestion: {
    question: string
    options: {
      A: string
      B: string
      C: string
      D: string
    }
    answer: string
    explanation: string
  }
}

export default function ReinforcementPanel({
  currentIncorrectQ,
  userChoice,
  onComplete
}: ReinforcementPanelProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReinforceData | null>(null)
  
  const [selectedSubAnswer, setSelectedSubAnswer] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)

  // Fetch reinforcement question on mount
  useEffect(() => {
    const fetchReinforcement = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/reinforce", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            questionContext: currentIncorrectQ,
            userChoice: userChoice
          })
        })
        
        if (!response.ok) {
          throw new Error("Failed to load reinforcement data.")
        }
        
        const json = await response.json()
        setData(json)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "An error occurred while contacting the AI tutor.")
      } finally {
        setLoading(false)
      }
    }

    fetchReinforcement()
  }, [currentIncorrectQ, userChoice])

  const handleSubSubmit = () => {
    if (!data || !selectedSubAnswer) return
    const correct = selectedSubAnswer === data.reinforcementQuestion.answer
    setIsCorrect(correct)
    setIsSubmitted(true)
  }

  const handleRetry = () => {
    setSelectedSubAnswer(null)
    setIsSubmitted(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 h-full">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <h4 className="font-semibold text-sm">AI Tutor is analyzing your answer...</h4>
        <p className="text-xs text-neutral-400 max-w-[200px]">
          Identifying conceptual gaps and preparing a reinforcement sub-question.
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-3 h-full flex flex-col justify-center items-center">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <h4 className="font-semibold text-sm">Failed to connect to AI Tutor</h4>
        <p className="text-xs text-neutral-400">{error || "Ensure your GEMINI_API_KEY is configured in .env.local"}</p>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Skip & Return to Quiz
        </button>
      </div>
    )
  }

  const { gapAnalysis, explanation, reinforcementQuestion } = data

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      
      {/* Header */}
      <div className="bg-indigo-600 text-white px-5 py-4 shrink-0 flex items-center gap-2 shadow-sm">
        <GraduationCap className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold text-sm">AI Reinforcement Tutor</h3>
          <span className="text-[10px] text-indigo-100 uppercase tracking-wider font-semibold">Active Study Plan</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Gap Analysis Box */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Concept Gap Identified</span>
          <p className="text-xs leading-relaxed font-semibold italic text-neutral-600 dark:text-neutral-300">
            "{gapAnalysis}"
          </p>
        </div>

        {/* Concept Lesson */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Short Concept Lesson</span>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-2xs text-xs leading-relaxed font-medium">
            <Markdown content={explanation} />
          </div>
        </div>

        {/* Reinforcement Question */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            Reinforcement Question
          </div>
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="text-xs font-semibold leading-relaxed">
              <Markdown content={reinforcementQuestion.question} />
            </div>

            {/* Options list */}
            <div className="space-y-2">
              {(Object.keys(reinforcementQuestion.options) as Array<"A" | "B" | "C" | "D">).map(optKey => {
                const optText = reinforcementQuestion.options[optKey]
                if (!optText) return null

                const isSelected = selectedSubAnswer === optKey
                
                let optBg = "bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100"
                let optBorder = "border-neutral-200 dark:border-neutral-800"

                if (isSubmitted) {
                  if (optKey === reinforcementQuestion.answer) {
                    optBg = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                    optBorder = "border-emerald-500"
                  } else if (isSelected) {
                    optBg = "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"
                    optBorder = "border-rose-500"
                  } else {
                    optBg = "opacity-50"
                  }
                } else if (isSelected) {
                  optBg = "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300"
                  optBorder = "border-indigo-600"
                }

                return (
                  <button
                    key={optKey}
                    onClick={() => !isSubmitted && setSelectedSubAnswer(optKey)}
                    disabled={isSubmitted}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left text-xs transition-all ${optBg} ${optBorder}`}
                  >
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 font-bold text-[10px] ${
                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-300 dark:border-neutral-700"
                    }`}>
                      {optKey}
                    </span>
                    <span className="leading-relaxed font-semibold">{optText}</span>
                  </button>
                )
              })}
            </div>

            {/* Result display */}
            {isSubmitted && (
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] leading-relaxed">
                {isCorrect ? (
                  <div className="space-y-2">
                    <span className="flex items-center gap-1 font-bold text-emerald-600">
                      <CheckCircle className="w-4 h-4 shrink-0" /> Well Done! Correct Answer.
                    </span>
                    <div className="text-neutral-500 dark:text-neutral-400">
                      <Markdown content={reinforcementQuestion.explanation} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="flex items-center gap-1 font-bold text-rose-600">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Incorrect. Try again!
                    </span>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Take a look at the concept lesson above and rethink.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer controls */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex justify-end">
        {isSubmitted && !isCorrect ? (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        ) : isSubmitted && isCorrect ? (
          <button
            onClick={onComplete}
            className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            Mastered! Resume Test
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubSubmit}
            disabled={!selectedSubAnswer}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Verify Sub-Answer
          </button>
        )}
      </div>

    </div>
  )
}
