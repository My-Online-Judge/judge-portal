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
    tag?: string
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
    tags?: string[]
}

export interface TagCount {
    tag: string
    count: number
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

export const getLevelInfo = (level: number): { text: string } => {
    switch (level) {
        case 1: return { text: 'Easy' }
        case 2: return { text: 'Medium' }
        case 3: return { text: 'Hard' }
        default: return { text: 'Unknown' }
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
