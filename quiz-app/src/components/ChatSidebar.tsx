"use client"

import React, { useState, useEffect, useRef } from "react"
import { Send, HelpCircle, BookOpen, Calculator, RefreshCw, Bot, User } from "lucide-react"
import Markdown from "./Markdown"
import { Question } from "@/hooks/useQuizState"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatSidebarProps {
  currentQ: Question
}

export default function ChatSidebar({ currentQ }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset chat thread and show a welcome message whenever the question changes
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hello! I am your AI Computer Science tutor. I see you are looking at **Question ${currentQ.q_num}** from **${currentQ.year}** (under *${currentQ.unit_name}*). 

How can I help you? You can ask me to:
- Explain this concept in detail.
- Derivate any formulas used.
- Guide you through the solution step-by-step.`
      }
    ])
    setError(null)
  }, [currentQ])

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt) return

    if (!textToSend) setInput("") // Clear input if sent from text bar

    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: prompt
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            content: msg.content
          })),
          questionContext: currentQ
        })
      })

      if (!response.ok) {
        throw new Error("Tutor service is temporarily unavailable.")
      }

      const json = await response.json()
      
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          role: "assistant",
          content: json.reply
        }
      ])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while communicating with the AI tutor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0 bg-neutral-50 dark:bg-neutral-950">
        <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <div>
          <h3 className="font-bold text-sm">AI Study Assistant</h3>
          <span className="text-[9px] text-neutral-400 font-semibold uppercase">Question Contextual Tutor</span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold ${
              msg.role === "user" 
                ? "bg-neutral-100 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200" 
                : "bg-indigo-600 border-indigo-600 text-white"
            }`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            
            <div className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed font-medium shadow-2xs ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-none whitespace-pre-wrap"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200/50 dark:border-neutral-700/50"
            }`}>
              {msg.role === "user" ? (
                msg.content
              ) : (
                <Markdown content={msg.content} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-indigo-600 border border-indigo-600 text-white">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-1.5 font-semibold text-neutral-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              Tutor is typing...
            </div>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[11px] font-medium text-center">
            {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Templates */}
      {!loading && messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 space-y-1.5">
          <span className="text-[9px] font-bold text-neutral-400 uppercase block tracking-wider mb-1">Quick Prompts</span>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleSend("Explain this question and the correct answer.")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left text-[10px] font-bold text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-indigo-500" />
              Explain this question
            </button>
            <button
              onClick={() => handleSend("What are the key formulas or algorithms used here?")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left text-[10px] font-bold text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <Calculator className="w-3 h-3 text-indigo-500" />
              List key formulas
            </button>
            <button
              onClick={() => handleSend("Solve this question step-by-step.")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left text-[10px] font-bold text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-indigo-500" />
              Solve step-by-step
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-950">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask AI tutor anything..."
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  )
}
