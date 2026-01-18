import type { BaseModel } from '@/types/common'
import type { Language } from '@/types/language'

export interface SubmissionRequest {
    sourceCode: string
    languageIdentifier: string
    problemSlug: string
}

export interface JudgeResult {
    cpu_time: number
    real_time: number
    memory: number
    signal: number
    exit_code: number
    error: number
    result: number
    test_case: string
    output_md5: string
    output: string
}

export interface Submission extends BaseModel {
    userId: number
    sourceCode: string
    status: number
    result: number
    errorMessage: string
    cpuTime: number
    memory: number
    details: JudgeResult[]
    language: Language
    problemSlug: string
}

export enum SubmissionResult {
    WRONG_ANSWER = -1,
    SUCCESS = 0,
    TIME_LIMIT_EXCEEDED = 1,
    REAL_TIME_LIMIT_EXCEEDED = 2,
    MEMORY_LIMIT_EXCEEDED = 3,
    RUNTIME_ERROR = 4,
    SYSTEM_ERROR = 5,
}

export const getSubmissionStatus = (status: number): string => {
    const map: Record<number, string> = {
        [SubmissionResult.SUCCESS]: 'AC',
        [SubmissionResult.WRONG_ANSWER]: 'WA',
        [SubmissionResult.TIME_LIMIT_EXCEEDED]: 'TLE',
        [SubmissionResult.REAL_TIME_LIMIT_EXCEEDED]: 'TLE',
        [SubmissionResult.MEMORY_LIMIT_EXCEEDED]: 'MLE',
        [SubmissionResult.RUNTIME_ERROR]: 'RE',
        [SubmissionResult.SYSTEM_ERROR]: 'SE',
    }
    return map[status] || 'Unknown'
}
