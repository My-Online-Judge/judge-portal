import {
    Check,
    CircleDotDashed,
    CircleHelp,
    Clock,
    FileX,
    MemoryStick,
    ServerCrash,
    Timer,
    X,
    Zap,
    type LucideIcon,
} from 'lucide-vue-next'
import { SubmissionResult } from '@/types/submission'

export type VerdictTone = 'ac' | 'wa' | 'tle' | 'mle' | 're' | 'ce' | 'se' | 'pa' | 'pending' | 'judging'

export interface VerdictMeta {
    code: string
    name: string
    tone: VerdictTone
    // null means the verdict is shown with a spinner instead of an icon (Judging).
    icon: LucideIcon | null
}

const TABLE: Record<number, VerdictMeta> = {
    [SubmissionResult.SUCCESS]: { code: 'AC', name: 'Accepted', tone: 'ac', icon: Check },
    [SubmissionResult.WRONG_ANSWER]: { code: 'WA', name: 'Wrong answer', tone: 'wa', icon: X },
    [SubmissionResult.TIME_LIMIT_EXCEEDED]: { code: 'TLE', name: 'Time limit exceeded', tone: 'tle', icon: Timer },
    [SubmissionResult.REAL_TIME_LIMIT_EXCEEDED]: {
        code: 'TLE',
        name: 'Real time limit exceeded',
        tone: 'tle',
        icon: Timer,
    },
    [SubmissionResult.MEMORY_LIMIT_EXCEEDED]: {
        code: 'MLE',
        name: 'Memory limit exceeded',
        tone: 'mle',
        icon: MemoryStick,
    },
    [SubmissionResult.RUNTIME_ERROR]: { code: 'RE', name: 'Runtime error', tone: 're', icon: Zap },
    [SubmissionResult.COMPILE_ERROR]: { code: 'CE', name: 'Compile error', tone: 'ce', icon: FileX },
    [SubmissionResult.SYSTEM_ERROR]: { code: 'SE', name: 'System error', tone: 'se', icon: ServerCrash },
    [SubmissionResult.PARTIALLY_ACCEPTED]: {
        code: 'PA',
        name: 'Partially accepted',
        tone: 'pa',
        icon: CircleDotDashed,
    },
    [SubmissionResult.PENDING]: { code: 'Pending', name: 'Pending', tone: 'pending', icon: Clock },
    [SubmissionResult.JUDGING]: { code: 'Judging', name: 'Judging', tone: 'judging', icon: null },
}

const UNKNOWN: VerdictMeta = { code: '?', name: 'Unknown status', tone: 'pending', icon: CircleHelp }

export function verdictMeta(status: number): VerdictMeta {
    return TABLE[status] ?? UNKNOWN
}

const NAMES_THE_TEST = new Set<number>([
    SubmissionResult.WRONG_ANSWER,
    SubmissionResult.TIME_LIMIT_EXCEEDED,
    SubmissionResult.REAL_TIME_LIMIT_EXCEEDED,
    SubmissionResult.MEMORY_LIMIT_EXCEEDED,
    SubmissionResult.RUNTIME_ERROR,
])

export function verdictTitle(status: number, firstFailedTest?: string | null): string {
    const { name } = verdictMeta(status)
    return NAMES_THE_TEST.has(status) && firstFailedTest ? `${name} on test ${firstFailedTest}` : name
}
