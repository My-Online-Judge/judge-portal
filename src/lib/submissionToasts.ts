import { TOAST_DURATIONS, type ToastHandle } from '@/composables/useToast'

// The "Submitted" toast of each in-flight submission, by submission id. ProblemSubmit stores the
// handle; VerdictConsole takes it (and deletes the entry) when the verdict arrives.
export const submissionToasts = new Map<string, ToastHandle>()

/**
 * The console stopped watching before a verdict (it unmounted, or the stream gave up): hand the
 * toast back so it ends, and drop the entry. A no-op for an unknown id.
 */
export function releaseSubmissionToast(id: string): void {
    const handle = submissionToasts.get(id)
    if (!handle) return
    submissionToasts.delete(id)
    handle.update({
        type: 'info',
        title: 'Submitted',
        description: 'Still judging. Open Submissions to see the verdict.',
        action: undefined,
        duration: TOAST_DURATIONS.info,
    })
}
