import { describe, it, expect, vi, afterEach } from 'vitest'
import { submissionToasts, releaseSubmissionToast, shouldShowTooFast } from '@/lib/submissionToasts'
import { __resetForTests, useToast, type ToastHandle } from '@/composables/useToast'

describe('releaseSubmissionToast', () => {
    it('updates the handle with the still-judging patch and removes the entry', () => {
        const handle = { id: 1, update: vi.fn(), dismiss: vi.fn() } as ToastHandle
        submissionToasts.set('s1', handle)
        releaseSubmissionToast('s1')
        expect(handle.update).toHaveBeenCalledWith({
            type: 'info',
            title: 'Submitted',
            description: 'Still judging. Open Submissions to see the verdict.',
            action: undefined,
            duration: 5000,
        })
        expect(submissionToasts.has('s1')).toBe(false)
        releaseSubmissionToast('s1')
        expect(handle.update).toHaveBeenCalledTimes(1)
    })
    it('is a no-op for an unknown id', () => {
        expect(() => releaseSubmissionToast('nope')).not.toThrow()
    })
})

describe('shouldShowTooFast', () => {
    afterEach(() => {
        __resetForTests()
        vi.useRealTimers()
    })

    it('showsOneWhenNoneWasMadeOrItIsGone', () => {
        expect(shouldShowTooFast(undefined, [])).toBe(true)
        expect(shouldShowTooFast(undefined, [{ id: 1, type: 'countdown' }])).toBe(true)
        expect(shouldShowTooFast(4, [{ id: 1, type: 'countdown' }])).toBe(true)
    })

    it('keepsTheLiveCountdownInsteadOfStacking', () => {
        expect(shouldShowTooFast(4, [{ id: 4, type: 'countdown' }])).toBe(false)
        // Once it has turned into "You can submit again", a new cooldown needs a new countdown.
        expect(shouldShowTooFast(4, [{ id: 4, type: 'success' }])).toBe(true)
    })

    it('followsTheEngine', () => {
        vi.useFakeTimers()
        __resetForTests()
        const { countdown, toasts } = useToast()
        const h = countdown('You are submitting too fast', { until: Date.now() + 3000 })
        expect(shouldShowTooFast(h.id, toasts.value)).toBe(false)
        vi.advanceTimersByTime(3000)
        expect(toasts.value[0]).toMatchObject({ id: h.id, type: 'success' })
        expect(shouldShowTooFast(h.id, toasts.value)).toBe(true)
        vi.advanceTimersByTime(1500)
        expect(toasts.value).toHaveLength(0)
        expect(shouldShowTooFast(h.id, toasts.value)).toBe(true)
    })
})
