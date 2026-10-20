import { describe, it, expect } from 'vitest'
import { verdictMeta, verdictTitle } from '@/lib/verdict'

const rows: Array<[number, string, string, string]> = [
    [0, 'AC', 'Accepted', 'ac'],
    [-1, 'WA', 'Wrong answer', 'wa'],
    [1, 'TLE', 'Time limit exceeded', 'tle'],
    [2, 'TLE', 'Real time limit exceeded', 'tle'],
    [3, 'MLE', 'Memory limit exceeded', 'mle'],
    [4, 'RE', 'Runtime error', 're'],
    [-2, 'CE', 'Compile error', 'ce'],
    [5, 'SE', 'System error', 'se'],
    [8, 'PA', 'Partially accepted', 'pa'],
    [6, 'Pending', 'Pending', 'pending'],
    [7, 'Judging', 'Judging', 'judging'],
]

describe('verdictMeta', () => {
    it('verdictMetaCoversEveryStatus', () => {
        for (const [status, code, name, tone] of rows) {
            const m = verdictMeta(status)
            expect({ code: m.code, name: m.name, tone: m.tone }).toEqual({ code, name, tone })
        }
        expect(verdictMeta(7).icon).toBeNull()
        expect(verdictMeta(0).icon).not.toBeNull()
    })

    it('unknownStatusIsNeutral', () => {
        const m = verdictMeta(99)
        expect({ code: m.code, name: m.name, tone: m.tone }).toEqual({
            code: '?',
            name: 'Unknown status',
            tone: 'pending',
        })
        expect(m.icon).not.toBeNull()
    })
})

describe('verdictTitle', () => {
    it('verdictTitleNamesTheTest', () => {
        expect(verdictTitle(-1, '7')).toBe('Wrong answer on test 7')
        expect(verdictTitle(1, '3')).toBe('Time limit exceeded on test 3')
        expect(verdictTitle(0, '7')).toBe('Accepted')
        expect(verdictTitle(-1)).toBe('Wrong answer')
        expect(verdictTitle(-1, null)).toBe('Wrong answer')
    })
})
