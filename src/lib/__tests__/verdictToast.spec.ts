import { describe, it, expect } from 'vitest'
import { verdictToastPatch } from '@/lib/verdictToast'
import type { Submission, TestCaseResult } from '@/types/submission'

const row = (name: string, result: number): TestCaseResult => ({
    name, result, cpuTime: 1, realTime: 1, memory: 1, sample: false,
})
const sub = (status: number, details: TestCaseResult[] | null, cpuTime = 42): Submission =>
    ({ status, details, cpuTime }) as unknown as Submission

describe('verdictToastPatch', () => {
    it('AC counts passed tests and adds the time', () => {
        const p = verdictToastPatch(sub(0, [row('1', 0), row('2', 0)]))
        expect(p).toMatchObject({ type: 'verdict', verdictStatus: 0, title: 'Accepted', description: '2 of 2 tests passed in 42 ms', duration: 6000 })
    })
    it('WA names the first failed test in numeric order', () => {
        const p = verdictToastPatch(sub(-1, [row('10', -1), row('2', -1), row('1', 0)]))
        expect(p.title).toBe('Wrong answer on test 2')
        expect(p.description).toBe('1 of 3 tests passed')
    })
    it('CE points at the compiler output', () => {
        expect(verdictToastPatch(sub(-2, null)).description).toBe('See the compiler output below the editor.')
    })
    it('has no description without per-test details', () => {
        expect(verdictToastPatch(sub(5, null)).description).toBeUndefined()
    })
})
