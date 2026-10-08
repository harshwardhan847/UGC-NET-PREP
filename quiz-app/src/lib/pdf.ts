import type { PDFDocumentProxy } from "pdfjs-dist"

// The source question papers, served by /api/papers/[file]
export const paperUrl = (paper: string, page?: number) =>
  `/api/papers/${encodeURIComponent(paper)}${page ? `#page=${page}` : ""}`

let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null
const papers = new Map<string, Promise<PDFDocumentProxy>>()

// pdf.js is only loaded once someone opens a paper
function loadPdfjs() {
  pdfjs ??= import("pdfjs-dist")
    .then(lib => {
      // One worker parses every paper; the bundler emits it as a file of its own
      lib.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })
      return lib
    })
    .catch(err => {
      pdfjs = null
      throw err
    })
  return pdfjs
}

// Each paper is downloaded and parsed once per visit, then shared by every viewer
export function loadPaper(paper: string) {
  let doc = papers.get(paper)
  if (!doc) {
    doc = loadPdfjs().then(lib => lib.getDocument({ url: paperUrl(paper) }).promise)
    doc.catch(() => papers.delete(paper)) // so a failed download can be retried
    papers.set(paper, doc)
  }
  return doc
}
