import React from "react"

// Figures cropped from the question papers are referenced as ![](/q/name.png) in question/option text.
// This renders the surrounding text as-is and swaps each reference for an <img>.
const IMAGE = /!\[([^\]]*)\]\((\/q\/[\w.-]+)\)/g

export default function InlineImages({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(IMAGE)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    // eslint-disable-next-line @next/next/no-img-element
    parts.push(<img key={m.index} src={m[2]} alt={m[1] || "Figure from the question paper"} className="block max-w-full h-auto my-1 rounded bg-white" />)
    last = m.index + m[0].length
  }
  if (last === 0) return <>{text}</>
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
