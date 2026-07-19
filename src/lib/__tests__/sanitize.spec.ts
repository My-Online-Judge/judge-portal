import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitize'

// Note: the actual HTML-stripping is DOMPurify's job and needs a DOM, which this
// repo's node-based test env does not provide. These tests cover our own guard
// logic — the nullish handling that lets callers pass optional fields directly.
describe('sanitizeHtml', () => {
    it('returns empty string for nullish or empty input', () => {
        expect(sanitizeHtml('')).toBe('')
        expect(sanitizeHtml(null)).toBe('')
        expect(sanitizeHtml(undefined)).toBe('')
    })
})
