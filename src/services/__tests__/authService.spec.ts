import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the mock fns must be created via vi.hoisted.
const { get, post } = vi.hoisted(() => ({
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post },
}))

import authService from '@/services/authService'

beforeEach(() => vi.clearAllMocks())

describe('authService', () => {
    it('refresh -> POST /auth/refresh', () => {
        authService.refresh()
        expect(post).toHaveBeenCalledWith('/auth/refresh')
    })

    it('getMe -> GET /auth/me', () => {
        authService.getMe()
        expect(get).toHaveBeenCalledWith('/auth/me')
    })
})
