import { describe, expect, it } from 'vitest'
import { clipForDisplay, defaultSelection, passedCount, sortTests, tileLabel } from '../verdictTiles'
import type { TestCaseResult } from '@/types/submission'

const row = (name: string, result = 0, sample = false): TestCaseResult => ({
    name, result, sample, cpuTime: 1, realTime: 1, memory: 1,
})

describe('verdictTiles', () => {
    it('labelMapping', () => {
        const m: [number, string][] = [[0, '✓'], [-1, 'WA'], [1, 'TLE'], [2, 'TLE'], [3, 'MLE'], [4, 'RE'], [5, 'SE'], [9, '?']]
        for (const [c, l] of m) expect(tileLabel(c)).toBe(l)
    })
    it('sortsNumerically', () => {
        const names = sortTests(['10', 'b', '2', 'a', '1'].map((n) => row(n))).map((r) => r.name)
        expect(names).toEqual(['1', '2', '10', 'a', 'b'])
    })
    it('defaultSelectionPrefersFailingSample', () => {
        expect(defaultSelection([row('1', 0, true), row('2', -1, true), row('3', -1, false)])).toBe('2')
    })
    it('defaultSelectionFallsBackToFirstSample', () => {
        expect(defaultSelection([row('3', 0, false), row('2', 0, true), row('1', 0, true)])).toBe('1')
    })
    it('noSampleNoSelection', () => {
        expect(defaultSelection([row('1', -1, false)])).toBeNull()
    })
    it('clipsAt16384', () => {
        const r = clipForDisplay('a'.repeat(20000))
        expect(r.shown.length).toBe(16384)
        expect(r.clipped).toBe(true)
        expect(r.totalChars).toBe(20000)
        expect(clipForDisplay('abc').clipped).toBe(false)
    })
    it('clipsAt200Lines', () => {
        const text = Array.from({ length: 300 }, (_, i) => `l${i}`).join('\n')
        const r = clipForDisplay(text)
        expect(r.shown.split('\n')).toHaveLength(200)
        expect(r.clipped).toBe(true)
    })
    it('passedCount', () => {
        expect(passedCount([row('1', 0), row('2', -1)])).toBe(1)
    })
})
