export interface BaseModel {
    id: string
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
}

export interface BaseSearchParams {
    page?: number
    size?: number
    search?: string
}

export interface Pagination {
    page: number
    size: number
    totalElements: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
    prevPage: number | null
    nextPage: number | null
}

export interface ApiResponse<T> {
    status: number
    message: string
    /** On an error answer from oj-common 0.8.1 or later: its ErrorCode name, e.g. CONTEST_NOT_RUNNING. */
    code?: string
    data: T
    errors?: Record<string, string>
    timestamp: string
    pagination?: Pagination
}
