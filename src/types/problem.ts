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
    tags?: string[]
    statisticInfo?: Record<string, unknown>
}

export interface ProblemSearchParams extends BaseSearchParams {
    status?: 'ACTIVE' | 'INACTIVE'
    hardnessLevel?: number
}

export interface UpdateProblemPayload {
    title: string
    subject: string
    description?: string
    timeLimit: number
    memoryLimit: number
    hardnessLevel: number
    inputDescription: string
    outputDescription: string
    sampleInput: string
    sampleOutput: string
    hint?: string
    status?: number
}

export interface CreateProblemPayload extends UpdateProblemPayload {
    problemSlug: string
}

export enum SubmissionStatus {
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
    PARTIALLY_ACCEPTED = 8
}

export const STATUS_CONFIG = {
    [SubmissionStatus.SUCCESS]: { label: 'AC', color: '#10b981', fullName: 'Accepted' }, // Emerald 500
    [SubmissionStatus.WRONG_ANSWER]: { label: 'WA', color: '#ef4444', fullName: 'Wrong Answer' }, // Red 500
    [SubmissionStatus.COMPILE_ERROR]: { label: 'CE', color: '#8b5cf6', fullName: 'Compile Error' }, // Violet 500
    [SubmissionStatus.TIME_LIMIT_EXCEEDED]: { label: 'TLE', color: '#f97316', fullName: 'Time Limit Exceeded' }, // Orange 500
    [SubmissionStatus.REAL_TIME_LIMIT_EXCEEDED]: { label: 'TLE', color: '#f97316', fullName: 'Time Limit Exceeded' }, // Orange 500
    [SubmissionStatus.MEMORY_LIMIT_EXCEEDED]: { label: 'MLE', color: '#eab308', fullName: 'Memory Limit Exceeded' }, // Yellow 500
    [SubmissionStatus.RUNTIME_ERROR]: { label: 'RE', color: '#ea580c', fullName: 'Runtime Error' }, // Orange 600
    [SubmissionStatus.SYSTEM_ERROR]: { label: 'SE', color: '#6b7280', fullName: 'System Error' }, // Gray 500
    [SubmissionStatus.PARTIALLY_ACCEPTED]: { label: 'PA', color: '#14b8a6', fullName: 'Partially Accepted' }, // Teal 500
    [SubmissionStatus.PENDING]: { label: 'Pending', color: '#94a3b8', fullName: 'Pending' }, // Slate 400
    [SubmissionStatus.JUDGING]: { label: 'Judging', color: '#3b82f6', fullName: 'Judging' } // Blue 500
}

export const getLevelInfo = (level: number): { text: string, class: string } => {
    switch (level) {
        case 1: return { text: 'Easy', class: 'bg-[#EAF3EA] text-[#356635]' }
        case 2: return { text: 'Medium', class: 'bg-[#FBF2D8] text-[#8A5A00]' }
        case 3: return { text: 'Hard', class: 'bg-[#FBEBEC] text-[#9E2F2D]' }
        default: return { text: 'Unknown', class: 'bg-[#F0EFEC] text-[#6B6862]' }
    }
}

export const difficultyToHardness = (difficulty: string): number | undefined => {
    switch (difficulty) {
        case 'easy': return 1
        case 'medium': return 2
        case 'hard': return 3
        default: return undefined // 'all' or unknown → no filter
    }
}
