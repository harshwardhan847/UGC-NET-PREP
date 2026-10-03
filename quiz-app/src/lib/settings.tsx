"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { MotionConfig } from "framer-motion"

export type ThemeSetting = "system" | "light" | "dark"
export type Accent = "indigo" | "blue" | "teal" | "violet" | "rose" | "orange"
export type QuestionFont = "serif" | "sans" | "mono"
export type QuestionSize = "sm" | "md" | "lg" | "xl"
export type FeedbackMode = "instant" | "exam"

export interface Settings {
  // Appearance
  theme: ThemeSetting
  accent: Accent
  questionFont: QuestionFont
  questionSize: QuestionSize
  reduceMotion: boolean
  // Study plan
  displayName: string
  examDate: string // YYYY-MM-DD, empty when unset
  dailyGoal: number
  // Quiz behaviour
  practiceCount: number
  secondsPerQuestion: number // 0 = untimed
  feedbackMode: FeedbackMode // practice, smart, custom and review quizzes
  mockFeedbackMode: FeedbackMode // full paper mocks
  autoAdvance: boolean
  aiReinforcement: boolean
  tutorOpenByDefault: boolean
  showTimer: boolean
  keyboardShortcuts: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: "indigo",
  questionFont: "serif",
  questionSize: "md",
  reduceMotion: false,
  displayName: "",
  examDate: "",
  dailyGoal: 30,
  practiceCount: 20,
  secondsPerQuestion: 90,
  feedbackMode: "instant",
  mockFeedbackMode: "exam",
  autoAdvance: false,
  aiReinforcement: true,
  tutorOpenByDefault: true,
  showTimer: true,
  keyboardShortcuts: true
}

export const SETTINGS_STORAGE_KEY = "ugcnet.settings.v1"

// Runs before hydration (inlined in <head>) so the first paint already has the right theme.
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${SETTINGS_STORAGE_KEY}")||"{}");var t=s.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.dataset.accent=s.accent||"indigo";r.dataset.qfont=s.questionFont||"serif";r.dataset.qsize=s.questionSize||"md";}catch(e){}})();`

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
  isDark: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const readStored = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // Storage blocked or corrupt: fall back to defaults
  }
  return DEFAULT_SETTINGS
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    // localStorage is only readable after hydration, so stored settings are applied here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(readStored())
    setLoaded(true)
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const isDark = settings.theme === "dark" || (settings.theme === "system" && systemDark)

  // Reflect appearance settings on <html>
  useEffect(() => {
    if (!loaded) return
    const root = document.documentElement
    root.classList.toggle("dark", isDark)
    root.style.colorScheme = isDark ? "dark" : "light"
    root.dataset.accent = settings.accent
    root.dataset.qfont = settings.questionFont
    root.dataset.qsize = settings.questionSize
  }, [loaded, isDark, settings.accent, settings.questionFont, settings.questionSize])

  const persist = (next: Settings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore: settings just won't survive a reload
    }
  }

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    persist(DEFAULT_SETTINGS)
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, reset, isDark }}>
      <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>{children}</MotionConfig>
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>")
  return ctx
}
