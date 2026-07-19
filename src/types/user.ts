import type { BaseModel } from './common'

// A role as it appears embedded in a user (id + name is all the UI needs).
export interface UserRole {
    id: string
    name: string
    description?: string
}

export interface UserResponse extends BaseModel {
    username: string
    name: string
    email: string
    status: number
    enabledMfa: boolean
    lastLogin: string
    avatar: string
    googleId: string
    roles: UserRole[]
    permissions: string[]
}

// User lifecycle states (mirror the server's UserStatus enum). Only ACTIVE may log in.
export const USER_STATUS = { ACTIVE: 1, DISABLED: 0, DELETED: 2 } as const

export interface UserListParams {
    page?: number
    size?: number
    search?: string
    status?: number
    roleId?: string
    createdFrom?: string
    createdTo?: string
}

export interface CreateUserPayload {
    username: string
    name: string
    email: string
    password: string
    status?: number
    roleIds?: string[]
}

export interface UpdateUserPayload {
    name?: string
    email?: string
    status?: number
}
