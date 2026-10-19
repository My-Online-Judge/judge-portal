import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../main.css'), 'utf8')

/** Parse `--name: value;` declarations of the first block opened by `selector`. */
function parseBlock(selector: RegExp): Map<string, string> {
  const m = selector.exec(css)
  if (!m) throw new Error(`block not found: ${selector}`)
  const start = css.indexOf('{', m.index) + 1
  const end = css.indexOf('}', start)
  const map = new Map<string, string>()
  const body = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '')
  for (const decl of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(decl[1]!, decl[2]!.trim())
  }
  return map
}

const root = parseBlock(/^:root\s*\{/m)
const dark = parseBlock(/^\.dark\s*\{/m)

describe('design tokens', () => {
  it('rootTokensMatchSpec', () => {
    expect(root.get('--primary')).toBe('oklch(0.53 0.19 262)')
    expect(root.get('--muted-foreground')).toBe('oklch(0.5 0.025 258)')
    expect(root.get('--card')).toBe('oklch(0.997 0.002 255)')
    expect(root.get('--link')).toBe('oklch(0.5 0.19 262)')
    expect(root.get('--v-ac')).toBe('oklch(0.72 0.16 150)')
    expect(root.get('--v-wa-ink')).toBe('oklch(0.48 0.18 27)')
    expect(root.get('--input')).toBe('oklch(0.85 0.012 258)')
  })

  it('darkTokensMatchSpec', () => {
    expect(dark.get('--primary')).toBe('oklch(0.62 0.18 262)')
    expect(dark.get('--link')).toBe('oklch(0.74 0.13 262)')
    expect(dark.get('--v-tle')).toBe('oklch(0.665 0.13 85)')
    expect(dark.get('--chip-mix')).toBe('20%')
  })

  it('everyColorTokenHasADarkValue', () => {
    const missing = [...root.entries()]
      .filter(([k, v]) => k !== '--radius' && !k.startsWith('--font-') && !v.startsWith('var('))
      .map(([k]) => k)
      .filter((k) => !dark.has(k))
    expect(missing).toEqual([])
  })

  it('noPureWhiteSurfaces', () => {
    const pure = [...root.entries()].filter(([, v]) => v === 'oklch(1 0 0)')
    expect(pure).toEqual([])
  })
})
