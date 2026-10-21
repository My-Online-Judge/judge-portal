// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import DOMPurify from 'dompurify'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
    it('returns empty string for nullish or empty input', () => {
        expect(sanitizeHtml('')).toBe('')
        expect(sanitizeHtml(null)).toBe('')
        expect(sanitizeHtml(undefined)).toBe('')
    })

    it('imagesSendNoReferrer', () => {
        const doc = new DOMParser().parseFromString(sanitizeHtml('<p><img src="https://example.com/p.gif" alt="p"></p>'), 'text/html')
        expect(doc.querySelector('img')?.getAttribute('referrerpolicy')).toBe('no-referrer')
        expect(doc.querySelector('img')?.getAttribute('src')).toBe('https://example.com/p.gif')
    })

    it('anAuthorsReferrerPolicyIsReplaced', () => {
        const out = sanitizeHtml('<img src="https://example.com/p.gif" referrerpolicy="unsafe-url">')
        expect(out).toContain('referrerpolicy="no-referrer"')
        expect(out).not.toContain('unsafe-url')
    })

    it('theImageHookIsGoneAfterTheCall', () => {
        sanitizeHtml('<img src="https://example.com/p.gif">')
        expect(DOMPurify.sanitize('<img src="https://example.com/p.gif">')).not.toContain('referrerpolicy')
    })

    it('theImageHookIsGoneWhenSanitisingThrows', () => {
        const spy = vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
            throw new Error('boom')
        })
        try {
            expect(() => sanitizeHtml('<img src="https://example.com/p.gif">')).toThrow('boom')
        } finally {
            spy.mockRestore()
        }
        expect(DOMPurify.sanitize('<img src="https://example.com/p.gif">')).not.toContain('referrerpolicy')
    })
})
