import { promises as fs } from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'

// The source question papers live at the repo root (Paper 2) and in paper_1/ (General Paper 1).
// PAPERS_DIR overrides the root when the app runs from somewhere else.
const ROOT = process.env.PAPERS_DIR || path.resolve(process.cwd(), '..')
const DIRS = [ROOT, path.join(ROOT, 'paper_1')]

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/papers/[file]'>) {
  const { file } = await ctx.params
  let name = file
  try {
    name = decodeURIComponent(file)
  } catch {
    return new Response('Not found', { status: 404 })
  }
  // Only a bare PDF file name, so nothing outside the paper folders can be read
  if (path.basename(name) !== name || !/\.pdf$/i.test(name)) {
    return new Response('Not found', { status: 404 })
  }

  for (const dir of DIRS) {
    try {
      const data = await fs.readFile(path.join(dir, name))
      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${name.replace(/"/g, '')}"`,
          'Cache-Control': 'private, max-age=86400'
        }
      })
    } catch {
      // not in this folder; try the next one
    }
  }
  return new Response('Not found', { status: 404 })
}
