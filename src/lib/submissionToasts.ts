import type { ToastHandle } from '@/composables/useToast'

// The "Submitted" toast of each in-flight submission, by submission id. ProblemSubmit stores the
// handle; VerdictConsole takes it (and deletes the entry) when the verdict arrives.
export const submissionToasts = new Map<string, ToastHandle>()
