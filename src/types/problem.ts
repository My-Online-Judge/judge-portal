import type { BaseModel, BaseSearchParams } from '@/types/common'

export interface Problem extends BaseModel {
    title: string
    subject: string
    description: string
    timeLimit: number
    memoryLimit: number
    hardnessLevel: number
    problemSlug: string
    sampleInput: string
    sampleOutput: string
    inputDescription: string
    outputDescription: string
    hint: string
    status: number
    totalSubmission: number
    acceptedSubmission: number
    statisticInfo?: Record<string, any>
}

export interface ProblemSearchParams extends BaseSearchParams {
    status?: 'ACTIVE' | 'INACTIVE'
}

export enum SubmissionStatus {
    WRONG_ANSWER = -1,
    SUCCESS = 0,
    TIME_LIMIT_EXCEEDED = 1,
    REAL_TIME_LIMIT_EXCEEDED = 2,
    MEMORY_LIMIT_EXCEEDED = 3,
    RUNTIME_ERROR = 4,
    SYSTEM_ERROR = 5
}

export const STATUS_CONFIG = {
    [SubmissionStatus.SUCCESS]: { label: 'AC', color: '#10b981', fullName: 'Accepted' }, // Emerald 500
    [SubmissionStatus.WRONG_ANSWER]: { label: 'WA', color: '#ef4444', fullName: 'Wrong Answer' }, // Red 500
    [SubmissionStatus.TIME_LIMIT_EXCEEDED]: { label: 'TLE', color: '#f97316', fullName: 'Time Limit Exceeded' }, // Orange 500
    [SubmissionStatus.REAL_TIME_LIMIT_EXCEEDED]: { label: 'TLE', color: '#f97316', fullName: 'Time Limit Exceeded' }, // Orange 500
    [SubmissionStatus.MEMORY_LIMIT_EXCEEDED]: { label: 'MLE', color: '#eab308', fullName: 'Memory Limit Exceeded' }, // Yellow 500
    [SubmissionStatus.RUNTIME_ERROR]: { label: 'RE', color: '#ea580c', fullName: 'Runtime Error' }, // Orange 600
    [SubmissionStatus.SYSTEM_ERROR]: { label: 'SE', color: '#6b7280', fullName: 'System Error' } // Gray 500
}

export const getLevelInfo = (level: number): { text: string, class: string } => {
    switch (level) {
        case 1: return { text: 'Easy', class: 'bg-emerald-500 hover:bg-emerald-600 text-white' }
        case 2: return { text: 'Medium', class: 'bg-amber-500 hover:bg-amber-600 text-white' }
        case 3: return { text: 'Hard', class: 'bg-rose-500 hover:bg-rose-600 text-white' }
        default: return { text: 'Unknown', class: 'bg-slate-500 hover:bg-slate-600 text-white' }
    }
}
