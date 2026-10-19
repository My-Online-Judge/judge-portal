import type { BaseModel } from '@/types/common'
import type { Language } from '@/types/language'

export interface SubmissionRequest {
    sourceCode: string
    languageIdentifier: string
    problemSlug: string
}

export interface TestCaseResult {
    name: string
    result: number
    cpuTime: number | null
    realTime: number | null
    memory: number | null
    sample: boolean
    // Present only for sample (open) rows; hidden rows never carry them.
    input?: string | null
    expectedOutput?: string | null
    actualOutput?: string | null
}

export interface Submission extends BaseModel {
    userId: number
    sourceCode: string
    status: number
    result: number
    errorMessage: string
    cpuTime: number
    memory: number
    details: TestCaseResult[] | null
    language: Language
    problemSlug: string
}

export enum SubmissionResult {
    COMPILE_ERROR = -2,
    WRONG_ANSWER = -1,
    SUCCESS = 0,
    TIME_LIMIT_EXCEEDED = 1,
    REAL_TIME_LIMIT_EXCEEDED = 2,
    MEMORY_LIMIT_EXCEEDED = 3,
    RUNTIME_ERROR = 4,
    SYSTEM_ERROR = 5,
    PENDING = 6,
    JUDGING = 7,
    PARTIALLY_ACCEPTED = 8,
}

export const getSubmissionStatus = (status: number): string => {
    const map: Record<number, string> = {
        [SubmissionResult.COMPILE_ERROR]: 'CE',
        [SubmissionResult.WRONG_ANSWER]: 'WA',
        [SubmissionResult.SUCCESS]: 'AC',
        [SubmissionResult.TIME_LIMIT_EXCEEDED]: 'TLE',
        [SubmissionResult.REAL_TIME_LIMIT_EXCEEDED]: 'TLE',
        [SubmissionResult.MEMORY_LIMIT_EXCEEDED]: 'MLE',
        [SubmissionResult.RUNTIME_ERROR]: 'RE',
        [SubmissionResult.SYSTEM_ERROR]: 'SE',
        [SubmissionResult.PENDING]: 'Pending',
        [SubmissionResult.JUDGING]: 'Judging',
        [SubmissionResult.PARTIALLY_ACCEPTED]: 'PA',
    }
    return map[status] || 'Unknown'
}

export const isTerminalStatus = (status: number): boolean =>
    status !== SubmissionResult.PENDING && status !== SubmissionResult.JUDGING
