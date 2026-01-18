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
    data: T
    errors?: Record<string, string>
    timestamp: string
    pagination?: Pagination
}
