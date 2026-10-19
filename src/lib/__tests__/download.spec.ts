// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from '@/lib/download'

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
