"use client"

import React from "react"
import { reflowQuestion } from "@/lib/text"
import { cn } from "@/lib/utils"

// Question text in the reader's chosen typeface. Hard-wrapped prose is reflowed;
// ``` fenced snippets (C programs and the like) are shown as code blocks.
export default function QuestionText({ text, className, onClick }: { text: string; className?: string; onClick?: () => void }) {
  const parts = text.split(/```[a-z]*\n?/)
  return (
    <div onClick={onClick} className={cn("q-text space-y-3", className)}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="font-mono text-[13px] leading-relaxed bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 overflow-x-auto">
            {part.replace(/\n$/, "")}
          </pre>
        ) : part.trim() ? (
          <p key={i} className="whitespace-pre-wrap">{reflowQuestion(part.trim())}</p>
        ) : null
      )}
    </div>
  )
}
