import type { BaseModel } from './common'

export interface Role {
    id: number
    name: string
    description: string
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
    roles: Role[]
}
