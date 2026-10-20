// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText, downloadUrl } from '@/lib/download'

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('downloadText', () => {
    it('revokesTheObjectUrlOnALaterTickNotSynchronously', () => {
        vi.useFakeTimers()
        URL.createObjectURL = vi.fn(() => 'blob:x')
        URL.revokeObjectURL = vi.fn()
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        downloadText('a.in', 'hi')

        expect(click).toHaveBeenCalledTimes(1)
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
        vi.runAllTimers()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
    })
})

describe('downloadUrl', () => {
    it('clicksADirectLinkWithoutABlob', () => {
        URL.createObjectURL = vi.fn(() => 'blob:x')
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        downloadUrl('/api/v1/problems/two-sum/export', 'two-sum.zip')

        expect(click).toHaveBeenCalledTimes(1)
        const clicked = click.mock.contexts[0] as HTMLAnchorElement
        expect(clicked.getAttribute('href')).toBe('/api/v1/problems/two-sum/export')
        expect(clicked.download).toBe('two-sum.zip')
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        // The temporary anchor does not stay in the page.
        expect(document.body.querySelector('a')).toBeNull()
    })
})
