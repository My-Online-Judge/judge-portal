import type { TestCaseResult } from '@/types/submission'

export const DISPLAY_MAX_CHARS = 16384
export const DISPLAY_MAX_LINES = 200

const LABELS: Record<number, string> = { 0: '✓', [-1]: 'WA', 1: 'TLE', 2: 'TLE', 3: 'MLE', 4: 'RE', 5: 'SE' }
const NAMES: Record<number, string> = {
    0: 'Accepted',
    [-1]: 'Wrong Answer',
    1: 'Time Limit Exceeded',
    2: 'Time Limit Exceeded',
    3: 'Memory Limit Exceeded',
    4: 'Runtime Error',
    5: 'System Error',
}

export const tileLabel = (result: number): string => LABELS[result] ?? '?'
export const resultName = (result: number): string => NAMES[result] ?? 'Unknown'

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

export function defaultSelection(rows: TestCaseResult[]): string | null {
    const samples = sortTests(rows).filter((r) => r.sample)
    return (samples.find((r) => r.result !== 0) ?? samples[0])?.name ?? null
}

export const passedCount = (rows: TestCaseResult[]): number => rows.filter((r) => r.result === 0).length

export function clipForDisplay(text: string): { shown: string; clipped: boolean; totalChars: number } {
    const totalChars = text.length
    let shown = text.length > DISPLAY_MAX_CHARS ? text.slice(0, DISPLAY_MAX_CHARS) : text
    const lines = shown.split('\n')
    if (lines.length > DISPLAY_MAX_LINES) shown = lines.slice(0, DISPLAY_MAX_LINES).join('\n')
    return { shown, clipped: shown.length < totalChars, totalChars }
}
