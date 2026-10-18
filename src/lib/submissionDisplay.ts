import { SubmissionResult } from '@/types/submission'

// Muted pastel status chips (warm-monochrome palette) — semantic color only,
// square-ish, uppercase, tracked. Shared by the submissions table and the
// solve-pane verdict console so a verdict looks identical wherever it appears.
export const STATUS_CHIP_BASE =
    'rounded-md border-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide'

export const getStatusChipClass = (status: number): string => {
    switch (status) {
        case SubmissionResult.SUCCESS:
            return `${STATUS_CHIP_BASE} bg-[#EAF3EA] text-[#356635]`
        case SubmissionResult.WRONG_ANSWER:
            return `${STATUS_CHIP_BASE} bg-[#FBEBEC] text-[#9E2F2D]`
        case SubmissionResult.COMPILE_ERROR:
            return `${STATUS_CHIP_BASE} bg-[#F1EDF9] text-[#5B3E9F]`
        case SubmissionResult.PARTIALLY_ACCEPTED:
            return `${STATUS_CHIP_BASE} bg-[#E6F1F0] text-[#2C6E68]`
        case SubmissionResult.TIME_LIMIT_EXCEEDED:
        case SubmissionResult.REAL_TIME_LIMIT_EXCEEDED:
        case SubmissionResult.MEMORY_LIMIT_EXCEEDED:
            return `${STATUS_CHIP_BASE} bg-[#FBF2D8] text-[#8A5A00]`
        case SubmissionResult.RUNTIME_ERROR:
        case SubmissionResult.SYSTEM_ERROR:
            return `${STATUS_CHIP_BASE} bg-[#FBEADF] text-[#9A4A1F]`
        default:
            return `${STATUS_CHIP_BASE} bg-[#F0EFEC] text-[#6B6862]`
    }
}
