import { describe, it, expect, vi } from 'vitest'
import { submissionToasts, releaseSubmissionToast } from '@/lib/submissionToasts'
import type { ToastHandle } from '@/composables/useToast'

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
