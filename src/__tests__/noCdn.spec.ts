// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// The portal must work on a LAN without internet: scripts, the editor and the fonts all come from our own nginx.
const ROOT = join(__dirname, '..', '..')
const SRC = join(ROOT, 'src')
const BANNED = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      // Specs name the hosts they ban.
      if (name === '__tests__') continue
      walk(full, out)
    } else out.push(full)
  }
  return out
}

describe('no CDN', () => {
  it('no file under src/ or index.html loads from a CDN', () => {
    const hits = [...walk(SRC), join(ROOT, 'index.html')].flatMap((full) => {
      const text = readFileSync(full, 'utf8')
      return BANNED.filter((host) => text.includes(host)).map((host) => `${relative(ROOT, full)}: ${host}`)
    })
    expect(hits, 'Bundle it from npm (monaco-editor, @fontsource/*) instead.').toEqual([])
  })
})
