import type { TestCaseResult } from '@/types/submission'
import { verdictMeta } from '@/lib/verdict'

export const DISPLAY_MAX_CHARS = 16384
export const DISPLAY_MAX_LINES = 200

export const tileLabel = (result: number): string => verdictMeta(result).code

const NUMERIC = /^\d+$/

export function sortTests(rows: TestCaseResult[]): TestCaseResult[] {
    return [...rows].sort((a, b) => {
        const an = NUMERIC.test(a.name)
        const bn = NUMERIC.test(b.name)
        if (an && bn) return Number(a.name) - Number(b.name)
        if (an) return -1
        if (bn) return 1
        return a.name.localeCompare(b.name)
    })
}

/** The first test that did not pass, hidden or not; when all passed, the first sample (or the first test). */
export function firstFailingOrSample(rows: TestCaseResult[]): string | null {
    const sorted = sortTests(rows)
    return (sorted.find((r) => r.result !== 0) ?? sorted.find((r) => r.sample) ?? sorted[0])?.name ?? null
}

export const passedCount = (rows: TestCaseResult[]): number => rows.filter((r) => r.result === 0).length

export function clipForDisplay(text: string): { shown: string; clipped: boolean; totalChars: number } {
    const totalChars = text.length
    let shown = text.length > DISPLAY_MAX_CHARS ? text.slice(0, DISPLAY_MAX_CHARS) : text
    const lines = shown.split('\n')
    if (lines.length > DISPLAY_MAX_LINES) shown = lines.slice(0, DISPLAY_MAX_LINES).join('\n')
    return { shown, clipped: shown.length < totalChars, totalChars }
}

const normalizeLines = (text: string): string[] => {
    const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''))
    while (lines.length && lines[lines.length - 1] === '') lines.pop()
    return lines
}

/** 1-based number of the first line where the two outputs differ, or null when they match. */
export function firstDiffLine(expected: string, actual: string): number | null {
    const e = normalizeLines(expected)
    const a = normalizeLines(actual)
    const n = Math.max(e.length, a.length)
    for (let i = 0; i < n; i++) if (e[i] !== a[i]) return i + 1
    return null
}
