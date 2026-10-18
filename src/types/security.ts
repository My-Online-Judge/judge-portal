export interface LoginAttempt {
    id: string
    username: string | null
    ip: string | null
    deviceHash: string | null
    userAgent: string | null
    success: boolean
    errorCode: string | null
    createdAt: string
}

export type BanType = 'IP' | 'DEVICE'

export interface AccessBan {
    id: string
    type: BanType
    value: string
    reason: string | null
    expiresAt: string | null
    createdBy: string | null
    createdAt: string
}

export interface AttemptListParams {
    page?: number
    size?: number
    ip?: string
    username?: string
    success?: boolean
    createdFrom?: string
    createdTo?: string
}

export interface CreateBanPayload {
    type: BanType
    value: string
    reason?: string
    /** hours; omit/null = permanent */
    durationHours?: number | null
}
