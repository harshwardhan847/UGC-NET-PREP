"use client"

import React from "react"
import { BarChart3, GitCompare, GraduationCap, Layers, LayoutDashboard, Library, Moon, PlayCircle, Settings, Sun } from "lucide-react"
import { useSettings } from "@/lib/settings"
import { useStudyData } from "@/hooks/useStudyData"
import { computeStreaks } from "@/lib/analytics"
import { cn } from "@/lib/utils"

export type View = "overview" | "practice" | "bank" | "swipe" | "weightage" | "repeats" | "settings"

export const VIEWS: View[] = ["overview", "practice", "bank", "swipe", "weightage", "repeats", "settings"]

const NAV: { view: View; label: string; short: string; icon: React.ElementType; group: "study" | "explore" }[] = [
  { view: "overview", label: "Overview", short: "Home", icon: LayoutDashboard, group: "study" },
  { view: "practice", label: "Practice", short: "Practice", icon: PlayCircle, group: "study" },
  { view: "bank", label: "Question bank", short: "Bank", icon: Library, group: "study" },
  { view: "swipe", label: "Swipe cards", short: "Swipe", icon: Layers, group: "study" },
  { view: "weightage", label: "Topic weightage", short: "Topics", icon: BarChart3, group: "explore" },
  { view: "repeats", label: "Repeated questions", short: "Repeats", icon: GitCompare, group: "explore" }
]

export function Sidebar({ active, onNavigate }: { active: View; onNavigate: (v: View) => void }) {
  const { settings, update, isDark } = useSettings()
  const { stats } = useStudyData()
  const streak = computeStreaks(stats?.daily ?? []).current

  const item = (n: (typeof NAV)[number] | { view: View; label: string; icon: React.ElementType }) => {
    const Icon = n.icon
    const isActive = active === n.view
    return (
      <button
        key={n.view}
        onClick={() => onNavigate(n.view)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors cursor-pointer",
          isActive
            ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold"
            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {n.label}
      </button>
    )
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0">
          <GraduationCap className="w-[18px] h-[18px]" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">UGC NET Study Hub</div>
          <div className="text-[11px] text-neutral-500">Computer Science &amp; Paper 1</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5" aria-label="Main">
        <div className="space-y-0.5">{NAV.filter(n => n.group === "study").map(item)}</div>
        <div className="space-y-0.5">
          <div className="px-3 pb-1 text-[11px] font-medium text-neutral-400">Explore the papers</div>
          {NAV.filter(n => n.group === "explore").map(item)}
        </div>
      </nav>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-0.5">
        {streak > 0 && (
          <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{streak}-day</span> streak. Keep it going.
          </div>
        )}
        {item({ view: "settings", label: "Settings", icon: Settings })}
        <button
          onClick={() => update({ theme: isDark ? "light" : "dark" })}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          title={settings.theme === "system" ? "Following system theme. Click to override." : "Toggle theme"}
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          {isDark ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  )
}

export function MobileHeader({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { isDark, update } = useSettings()
  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <GraduationCap className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold">UGC NET Study Hub</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => update({ theme: isDark ? "light" : "dark" })} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer" aria-label="Toggle theme">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button onClick={() => onNavigate("settings")} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer" aria-label="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

export function MobileTabBar({ active, onNavigate }: { active: View; onNavigate: (v: View) => void }) {
  return (
    <nav className="md:hidden grid grid-cols-6 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      {NAV.map(n => {
        const Icon = n.icon
        const isActive = active === n.view
        return (
          <button
            key={n.view}
            onClick={() => onNavigate(n.view)}
            aria-current={isActive ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] cursor-pointer", isActive ? "text-brand-600 dark:text-brand-400 font-semibold" : "text-neutral-500")}
          >
            <Icon className="w-5 h-5" />
            {n.short}
          </button>
        )
      })}
    </nav>
  )
}
