import type { ToastOptions } from '@/composables/useToast'
import { TOAST_DURATIONS } from '@/composables/useToast'
import { verdictTitle } from '@/lib/verdict'
import { passedCount, sortTests } from '@/lib/verdictTiles'
import { SubmissionResult, type Submission } from '@/types/submission'

/** What the "Submitted" toast becomes once judging ends. The caller adds the View action. */
export function verdictToastPatch(sub: Submission): Partial<ToastOptions> {
    const rows = sub.details ?? []
    const firstFailed = sortTests(rows).find((r) => r.result !== SubmissionResult.SUCCESS)
    let description: string | undefined
    if (sub.status === SubmissionResult.COMPILE_ERROR) {
        description = 'See the compiler output below the editor.'
    } else if (rows.length > 0) {
        description = `${passedCount(rows)} of ${rows.length} tests passed`
        if (sub.status === SubmissionResult.SUCCESS) description += ` in ${sub.cpuTime} ms`
    }
    return {
        type: 'verdict',
        verdictStatus: sub.status,
        title: verdictTitle(sub.status, firstFailed?.name),
        description,
        duration: TOAST_DURATIONS.verdict,
    }
}
