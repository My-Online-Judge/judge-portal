// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = join(__dirname, '..')
const MAIN_CSS = join('assets', 'main.css')
const HEX_ALLOWLIST = [join('components', 'auth', 'GoogleMark.vue')]

interface SrcFile {
  rel: string
  text: string
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue
      walk(full, out)
    } else out.push(full)
  }
  return out
}

const files: SrcFile[] = walk(SRC)
  .map((full) => ({ full, rel: relative(SRC, full) }))
  .filter(({ rel }) => /\.(vue|ts)$/.test(rel) || rel === MAIN_CSS)
  .filter(({ rel }) => rel !== MAIN_CSS)
  .map(({ full, rel }) => ({ rel, text: readFileSync(full, 'utf8') }))

const vueFiles = files.filter((f) => f.rel.endsWith('.vue'))
const libFiles = files.filter((f) => f.rel.startsWith(`lib${sep}`))

interface Hit {
  where: string
}

/** Scan `text` line by line; `offset` is the 0-based line the text starts at. */
function scan(file: SrcFile, text: string, offset: number, re: RegExp): Hit[] {
  const hits: Hit[] = []
  text.split('\n').forEach((line, i) => {
    if (re.test(line)) hits.push({ where: `src/${file.rel}:${offset + i + 1}: ${line.trim().slice(0, 120)}` })
  })
  return hits
}

function templateOf(file: SrcFile): { text: string; offset: number } | null {
  const m = /<template[^>]*>/.exec(file.text)
  if (!m) return null
  const start = m.index + m[0].length
  const end = file.text.lastIndexOf('</template>')
  if (end < start) return null
  return { text: file.text.slice(start, end), offset: file.text.slice(0, start).split('\n').length - 1 }
}

function expectNoHits(hits: Hit[], fix: string) {
  expect(hits.map((h) => h.where), fix).toEqual([])
}

describe('design guard', () => {
  it('no em or en dash in .vue templates', () => {
    const hits = vueFiles.flatMap((f) => {
      const t = templateOf(f)
      return t ? scan(f, t.text, t.offset, /[—–]/) : []
    })
    expectNoHits(hits, 'Use "-" for ranges and empty values, or rewrite the sentence.')
  })

  it('no em or en dash in src/lib', () => {
    const hits = libFiles.flatMap((f) => scan(f, f.text, 0, /[—–]/))
    expectNoHits(hits, 'Use "-" in lib strings and comments.')
  })

  it('no middle dot separator in .vue templates', () => {
    const hits = vueFiles.flatMap((f) => {
      const t = templateOf(f)
      return t ? scan(f, t.text, t.offset, /·/) : []
    })
    expectNoHits(hits, 'Use hairline separators, commas or sentences instead of a middle dot.')
  })

  it('no uppercase with tracking-* in the same line', () => {
    const hits = files.flatMap((f) =>
      scan(f, f.text, 0, /(?<![-\w])uppercase(?![-\w])/).filter((h) => /tracking-/.test(h.where)),
    )
    expectNoHits(hits, 'Labels use sentence case; drop "uppercase tracking-*".')
  })

  it('no hex colour literals outside main.css', () => {
    const hits = files
      .filter((f) => !HEX_ALLOWLIST.includes(f.rel))
      .flatMap((f) => scan(f, f.text, 0, /#[0-9a-fA-F]{6}\b/))
    expectNoHits(hits, 'Use a colour token (bg-primary, var(--success) ...).')
  })

  it('no raw palette classes', () => {
    const re = /\b(bg|text|border)-(emerald|rose|amber|blue|red|green|yellow|orange|violet|slate|gray|zinc)-\d{2,3}\b/
    expectNoHits(files.flatMap((f) => scan(f, f.text, 0, re)), 'Use token classes, not palette classes.')
  })

  it('no numeric font weights and no per-component stroke-width', () => {
    const hits = files.flatMap((f) => scan(f, f.text, 0, /font-\[\d|:stroke-width=|\sstroke-width=/))
    expectNoHits(hits, 'Use font-normal|medium|semibold|bold; stroke width is set once in main.css.')
  })

  it('no placeholder href="#"', () => {
    expectNoHits(vueFiles.flatMap((f) => scan(f, f.text, 0, /href="#"/)), 'Use a real route or a button.')
  })
})
