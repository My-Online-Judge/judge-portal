import { describe, it, expect } from 'vitest'
import { retryAfterSeconds } from '@/lib/retryAfter'

describe('retryAfterSeconds', () => {
    it('uses a positive integer as is', () => {
        expect(retryAfterSeconds('7')).toBe(7)
        expect(retryAfterSeconds(7)).toBe(7)
    })
    it('falls back for zero, negative, junk and missing values', () => {
        for (const v of ['0', '-3', 'abc', undefined, null, '']) expect(retryAfterSeconds(v)).toBe(10)
        expect(retryAfterSeconds('abc', 4)).toBe(4)
    })
    it('counts down to a future HTTP-date, rounded up', () => {
        const now = Date.parse('2026-10-20T10:00:00Z')
        const header = new Date(now + 7200).toUTCString()
        // toUTCString drops milliseconds: 7.2 s ahead becomes 7 s once truncated, so use an exact-second date.
        expect(retryAfterSeconds(new Date(now + 7000).toUTCString(), 10, now)).toBe(7)
        expect(retryAfterSeconds(header, 10, now - 200)).toBe(8)
    })
    it('falls back for an HTTP-date in the past', () => {
        const now = Date.parse('2026-10-20T10:00:00Z')
        expect(retryAfterSeconds(new Date(now - 5000).toUTCString(), 10, now)).toBe(10)
    })
})
