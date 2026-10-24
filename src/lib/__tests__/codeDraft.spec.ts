// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDraft, writeDraft } from '../codeDraft'

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('codeDraft', () => {
    it('keepsTheCodeAndItsLanguagePerProblem', () => {
        expect(writeDraft('sum', 'cpp17', 'int main() {}', 1000)).toBe(true)
        expect(readDraft('sum')).toEqual({ languageIdentifier: 'cpp17', code: 'int main() {}', savedAt: 1000 })
        expect(readDraft('other')).toBeNull()
    })
    it('blankCodeForgetsTheDraft', () => {
        writeDraft('sum', 'cpp17', 'x')
        expect(writeDraft('sum', 'cpp17', '  \n')).toBe(false)
        expect(readDraft('sum')).toBeNull()
    })
    it('aBrokenEntryReadsAsNoDraft', () => {
        localStorage.setItem('oj:draft:sum', '{not json')
        expect(readDraft('sum')).toBeNull()
        localStorage.setItem('oj:draft:sum', JSON.stringify({ code: 1 }))
        expect(readDraft('sum')).toBeNull()
    })
    it('storageThatThrowsMeansNoDraft', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })
        expect(writeDraft('sum', 'cpp17', 'x')).toBe(false)
    })
})
