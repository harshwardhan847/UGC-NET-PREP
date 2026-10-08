"use client"

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"
import { ChevronDown, ChevronUp, ExternalLink, FileText, Highlighter, LoaderCircle, Lock, Minus, Plus, X } from "lucide-react"
import { useStudyData } from "@/hooks/useStudyData"
import { getPaperFriendlyName } from "@/lib/constants"
import { loadPaper, paperUrl } from "@/lib/pdf"
import type { PdfRegion, Question } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Segmented } from "./ui"

export type PdfView = "question" | "solution"

type MarkKind = "question" | "passage" | "solution"
interface Mark {
  region: PdfRegion
  kind: MarkKind
  label?: string
}

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const MAX_PAGE_WIDTH = 820 // page width at 100%, in CSS pixels
const MAX_CANVAS_PIXELS = 16_000_000 // Safari won't draw a larger canvas

const pct = (v: number) => `${v * 100}%`

interface PdfViewerProps {
  question: Question
  view: PdfView | null // which part of the paper is open; null when closed
  onViewChange: (view: PdfView | null) => void
  allowSolution: boolean // the worked solution gives the answer away
}

// The question as printed in its source paper: the page(s) it sits on, with the question
// (and any passage it shares) or its worked solution highlighted.
export default function PdfViewer({ question, view, onViewChange, allowSolution }: PdfViewerProps) {
  if (!question.pdf) return null
  return (
    <Dialog.Root open={view !== null} onOpenChange={open => !open && onViewChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          // Focus goes to the pages (see ViewerBody) so the arrow keys and space scroll the paper
          onOpenAutoFocus={e => e.preventDefault()}
          className="fixed z-50 inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100vw-48px)] sm:max-w-4xl sm:h-[calc(100dvh-48px)] flex flex-col bg-white dark:bg-neutral-900 sm:border border-neutral-200 dark:border-neutral-800 sm:rounded-2xl shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100"
        >
          {view && <ViewerBody key={question.id} question={question} view={view} onViewChange={onViewChange} allowSolution={allowSolution} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ViewerBody({ question, view, onViewChange, allowSolution }: PdfViewerProps & { view: PdfView }) {
  const { questions } = useStudyData()
  const source = question.pdf!
  const hasSolution = Boolean(source.s?.length)
  const tab: PdfView = view === "solution" && allowSolution && hasSolution ? "solution" : "question"

  const marks = useMemo<Mark[]>(() => {
    const list: Mark[] =
      tab === "solution"
        ? source.s!.map(region => ({ region, kind: "solution" }))
        : [...(source.p ?? []).map(region => ({ region, kind: "passage" as const })), ...source.q.map(region => ({ region, kind: "question" as const }))]
    // Tag the first box of each kind
    const seen = new Set<MarkKind>()
    return list.map(m => {
      if (seen.has(m.kind)) return m
      seen.add(m.kind)
      return { ...m, label: m.kind === "passage" ? "Passage" : m.kind === "solution" ? `Solution ${question.q_num}` : `Q${question.q_num}` }
    })
  }, [source, tab, question.q_num])
  const first = Math.min(...marks.map(m => m.region[0]))
  const last = Math.max(...marks.map(m => m.region[0]))

  // Before the answer is revealed, stay on the question pages: past them come the answer key and solutions
  const lastQuestionPage = useMemo(() => {
    let max = 0
    for (const q of questions) {
      if (q.paper !== question.paper || !q.pdf) continue
      for (const r of [...q.pdf.q, ...(q.pdf.p ?? [])]) max = Math.max(max, r[0])
    }
    return max
  }, [questions, question.paper])

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [aspect, setAspect] = useState(842 / 595) // page height / width; A4 until the paper loads
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [highlight, setHighlight] = useState(true)
  const [fitWidth, setFitWidth] = useState(0)
  const [extra, setExtra] = useState({ before: 0, after: 0 })
  const [extraTab, setExtraTab] = useState(tab)
  if (extraTab !== tab) {
    setExtraTab(tab)
    setExtra({ before: 0, after: 0 })
  }

  const scroller = useRef<HTMLDivElement>(null)
  const pageEls = useRef(new Map<number, HTMLDivElement>())

  useEffect(() => {
    scroller.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    let live = true
    loadPaper(question.paper)
      .then(async d => {
        const page = await d.getPage(first)
        const { width, height } = page.getViewport({ scale: 1 })
        if (!live) return
        setAspect(height / width)
        setDoc(d)
      })
      .catch(err => {
        console.error("Failed to open the paper", err)
        if (live) setError(err?.status === 404 ? "This paper's PDF isn't in the project folder." : "The paper couldn't be opened.")
      })
    return () => {
      live = false
    }
  }, [question.paper, first])

  // Pages are as wide as the panel allows, up to a comfortable reading width
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const observer = new ResizeObserver(() => setFitWidth(Math.max(0, Math.min(el.clientWidth - 32, MAX_PAGE_WIDTH))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const pageWidth = Math.round(fitWidth * zoom)

  const minPage = 1
  const maxPage = doc ? (allowSolution ? doc.numPages : Math.max(last, lastQuestionPage)) : last
  const from = Math.max(minPage, first - extra.before)
  const to = Math.min(maxPage, last + extra.after)
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i)

  // Bring the highlighted question into view when it opens, on switching tabs and after zooming
  useLayoutEffect(() => {
    const el = scroller.current
    const [page, x0, y0, , y1] = marks[0].region
    const pageEl = pageEls.current.get(page)
    if (!doc || !el || !pageEl || !pageWidth) return
    // A question that wraps to the top of the next column: show that part too, if it all fits
    const top = Math.min(...marks.filter(m => m.region[0] === page).map(m => m.region[2]))
    const y = (y1 - top) * pageEl.offsetHeight < el.clientHeight - 56 ? top : y0
    el.scrollTop = pageEl.offsetTop + y * pageEl.offsetHeight - 28
    el.scrollLeft = Math.max(0, pageEl.offsetLeft + x0 * pageEl.offsetWidth - 24)
  }, [doc, marks, pageWidth])

  const zoomBy = (step: number) => setZoom(z => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + step))])
  const pageLabel = first === last ? `Page ${first}` : `Pages ${first}–${last}`

  return (
    <div
      className="flex flex-col h-full min-h-0"
      onKeyDown={e => {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        if (e.key === "+" || e.key === "=") zoomBy(1)
        else if (e.key === "-") zoomBy(-1)
        else if (e.key === "0") setZoom(1)
        else return
        e.preventDefault()
      }}
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 h-14 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-sm font-semibold truncate">
            {getPaperFriendlyName(question.paper)}, Q{question.q_num}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {pageLabel} of the original paper
          </Dialog.Description>
        </div>
        <a
          href={paperUrl(question.paper, first)}
          target="_blank"
          rel="noreferrer"
          title={allowSolution ? "Open the whole paper in a new tab" : "Open the whole paper in a new tab (it includes the answer key)"}
          className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Full PDF</span>
        </a>
        <Dialog.Close className="p-2 -mr-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer" aria-label="Close">
          <X className="w-5 h-5" />
        </Dialog.Close>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        {allowSolution && hasSolution ? (
          <Segmented
            size="sm"
            ariaLabel="Part of the paper"
            value={tab}
            onChange={onViewChange}
            options={[
              { value: "question", label: "Question" },
              { value: "solution", label: "Solution" }
            ]}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">The worked solution opens once you answer</span>
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setHighlight(h => !h)}
            aria-pressed={highlight}
            title={highlight ? "Hide the highlight" : "Highlight the question"}
            className={cn(
              "p-1.5 rounded-lg cursor-pointer",
              highlight ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            )}
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1" />
          <button onClick={() => zoomBy(-1)} disabled={zoom === ZOOMS[0]} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-40 disabled:cursor-default" aria-label="Zoom out" title="Zoom out (−)">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(1)} className="w-12 text-xs tabular-nums font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer" title="Fit to width (0)">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1)} disabled={zoom === ZOOMS[ZOOMS.length - 1]} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-40 disabled:cursor-default" aria-label="Zoom in" title="Zoom in (+)">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scroller} tabIndex={-1} className="relative flex-1 min-h-0 overflow-auto bg-neutral-100 dark:bg-neutral-950 scrollbar-thin outline-none">
        {error ? (
          <div className="flex flex-col items-center justify-center text-center h-full px-6 gap-3">
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              The app reads the papers from the repository root and <code>paper_1/</code>. Set <code>PAPERS_DIR</code> if they live elsewhere.
            </p>
          </div>
        ) : !doc || !pageWidth ? (
          <div className="flex items-center justify-center h-full gap-2 text-sm text-neutral-500">
            <LoaderCircle className="w-4 h-4 animate-spin" /> Opening the paper…
          </div>
        ) : (
          <div className="w-max min-w-full px-4 py-4 space-y-4">
            {from > minPage && (
              <ExtendButton onClick={() => setExtra(x => ({ ...x, before: x.before + 1 }))}>
                <ChevronUp className="w-3.5 h-3.5" /> Show page {from - 1}
              </ExtendButton>
            )}
            {pages.map(n => (
              <PdfPage
                key={n}
                doc={doc}
                number={n}
                width={pageWidth}
                aspect={aspect}
                marks={highlight ? marks.filter(m => m.region[0] === n) : []}
                pageRef={el => {
                  if (el) pageEls.current.set(n, el)
                  else pageEls.current.delete(n)
                }}
              />
            ))}
            {to < maxPage && (
              <ExtendButton onClick={() => setExtra(x => ({ ...x, after: x.after + 1 }))}>
                <ChevronDown className="w-3.5 h-3.5" /> Show page {to + 1}
              </ExtendButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ExtendButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-brand-400 hover:text-brand-700 dark:hover:text-brand-300 cursor-pointer"
      >
        {children}
      </button>
    </div>
  )
}

function PdfPage({
  doc,
  number,
  width,
  aspect,
  marks,
  pageRef
}: {
  doc: PDFDocumentProxy
  number: number
  width: number
  aspect: number
  marks: Mark[]
  pageRef: (el: HTMLDivElement | null) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ratio, setRatio] = useState(aspect)
  const [rendered, setRendered] = useState(false)
  const maskId = `pdf-mask-${useId().replace(/[^\w-]/g, "")}`

  useEffect(() => {
    let live = true
    let task: RenderTask | null = null
    doc
      .getPage(number)
      .then(page => {
        if (!live) return
        const base = page.getViewport({ scale: 1 })
        const scale = width / base.width
        // Render at the screen's pixel density, within what the browser will draw
        const density = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_CANVAS_PIXELS / (width * base.height * scale)))
        const viewport = page.getViewport({ scale: scale * density })
        // Draw off-screen, then swap in, so zooming doesn't flash a blank page
        const off = document.createElement("canvas")
        off.width = Math.floor(viewport.width)
        off.height = Math.floor(viewport.height)
        setRatio(base.height / base.width)
        task = page.render({ canvas: off, viewport })
        return task.promise.then(() => {
          const el = canvas.current
          if (!live || !el) return
          el.width = off.width
          el.height = off.height
          el.getContext("2d")?.drawImage(off, 0, 0)
          setRendered(true)
        })
      })
      .catch(err => {
        if (err?.name !== "RenderingCancelledException") console.error(`Failed to draw page ${number}`, err)
      })
    return () => {
      live = false
      task?.cancel()
    }
  }, [doc, number, width])

  return (
    <div ref={pageRef} className="relative mx-auto bg-white shadow-md ring-1 ring-black/5" style={{ width, height: Math.round(width * ratio) }}>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" aria-label={`Page ${number}`} role="img" />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoaderCircle className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      )}
      {marks.length > 0 && (
        <>
          {/* Dim the rest of the page around the highlighted boxes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
            <defs>
              <mask id={maskId}>
                <rect width="1" height="1" fill="white" />
                {marks.map(({ region: [, x0, y0, x1, y1] }, i) => (
                  <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="black" />
                ))}
              </mask>
            </defs>
            <rect width="1" height="1" fill="#171717" fillOpacity={0.2} mask={`url(#${maskId})`} />
          </svg>
          {marks.map(({ region: [, x0, y0, x1, y1], kind, label }, i) => (
            <div
              key={i}
              className={cn(
                "absolute pointer-events-none rounded-[3px] border-2",
                kind === "passage" ? "border-dashed border-amber-500/80" : "border-brand-500/80"
              )}
              style={{ left: pct(x0), top: pct(y0), width: pct(x1 - x0), height: pct(y1 - y0) }}
            >
              {label && (
                // Top right: the line above usually ends short of it, so the tag rarely hides any text
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 -translate-y-full px-[0.5em] rounded-t-[0.5em] font-semibold leading-normal text-white whitespace-nowrap",
                    kind === "passage" ? "bg-amber-500" : "bg-brand-600"
                  )}
                  // sized with the page, so it stays small next to the text on a phone
                  style={{ fontSize: Math.max(8, Math.round(width * 0.013)) }}
                >
                  {label}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// Opens the question in its source paper; the worked solution is offered once allowSolution is set.
export function PdfButton({ question, allowSolution, withLabel, className }: { question: Question; allowSolution: boolean; withLabel?: boolean; className?: string }) {
  const [view, setView] = useState<PdfView | null>(null)
  if (!question.pdf) return null
  return (
    <>
      <button
        onClick={() => setView("question")}
        title="View in the original paper"
        aria-label="View in the original paper"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-medium transition-colors cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
          className
        )}
      >
        <FileText className="w-4 h-4" />
        {withLabel && <span>PDF</span>}
      </button>
      <PdfViewer question={question} view={view} onViewChange={setView} allowSolution={allowSolution} />
    </>
  )
}

// A text link straight to the worked solution in the source paper.
export function PdfSolutionLink({ question, className }: { question: Question; className?: string }) {
  const [view, setView] = useState<PdfView | null>(null)
  if (!question.pdf?.s?.length) return null
  return (
    <>
      <button onClick={() => setView("solution")} className={cn("inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline cursor-pointer", className)}>
        <FileText className="w-3.5 h-3.5" />
        Solution in the PDF
      </button>
      <PdfViewer question={question} view={view} onViewChange={setView} allowSolution />
    </>
  )
}
