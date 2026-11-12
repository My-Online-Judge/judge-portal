// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDraft, writeDraft } from '../codeDraft'

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('codeDraft', () => {
    it('keepsTheCodeAndItsLanguagePerProblem', () => {
        expect(writeDraft('u1', 'sum', 'cpp17', 'int main() {}', 1000)).toBe(true)
        expect(readDraft('u1', 'sum')).toEqual({ languageIdentifier: 'cpp17', code: 'int main() {}', savedAt: 1000 })
        expect(readDraft('u1', 'other')).toBeNull()
    })
    it('anotherAccountDoesNotSeeTheDraft', () => {
        writeDraft('u1', 'sum', 'cpp17', 'mine')
        expect(readDraft('u2', 'sum')).toBeNull()
        expect(readDraft(null, 'sum')).toBeNull()
        expect(readDraft('u1', 'sum')?.code).toBe('mine')
    })
    it('codeTypedSignedOutGoesToWhoeverSignsIn', () => {
        // Submit while signed out asks to sign in, and the sign-in comes back to the problem: the code must still be there.
        writeDraft(null, 'sum', 'cpp17', 'typed as a guest')
        expect(readDraft('u1', 'sum')?.code).toBe('typed as a guest')
        expect(readDraft(null, 'sum')).toBeNull()
        expect(readDraft('u2', 'sum')).toBeNull()
    })
    it('anAccountsOwnDraftWinsOverAGuestOne', () => {
        writeDraft('u1', 'sum', 'cpp17', 'mine')
        writeDraft(null, 'sum', 'cpp17', 'guest')
        expect(readDraft('u1', 'sum')?.code).toBe('mine')
        expect(readDraft(null, 'sum')?.code).toBe('guest')
    })
    it('forgetsTheUnscopedDraftOfEarlierVersions', () => {
        // Before drafts had an owner, every account of this browser shared oj:draft:<slug>.
        localStorage.setItem('oj:draft:sum', JSON.stringify({ code: 'someone else', languageIdentifier: 'cpp17', savedAt: 1 }))
        expect(readDraft('u1', 'sum')).toBeNull()
        expect(localStorage.getItem('oj:draft:sum')).toBeNull()
    })
    it('blankCodeForgetsTheDraft', () => {
        writeDraft('u1', 'sum', 'cpp17', 'x')
        expect(writeDraft('u1', 'sum', 'cpp17', '  \n')).toBe(false)
        expect(readDraft('u1', 'sum')).toBeNull()
    })
    it('aBrokenEntryReadsAsNoDraft', () => {
        localStorage.setItem('oj:draft:u1:sum', '{not json')
        expect(readDraft('u1', 'sum')).toBeNull()
        localStorage.setItem('oj:draft:u1:sum', JSON.stringify({ code: 1 }))
        expect(readDraft('u1', 'sum')).toBeNull()
    })
    it('storageThatThrowsMeansNoDraft', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })
        expect(writeDraft('u1', 'sum', 'cpp17', 'x')).toBe(false)
    })
})
