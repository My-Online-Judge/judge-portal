import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the mock fns must be created via vi.hoisted.
const { get, post, refreshSession } = vi.hoisted(() => ({
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    refreshSession: vi.fn(() => Promise.resolve({ data: {} })),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post },
    refreshSession,
}))

import authService from '@/services/authService'

beforeEach(() => vi.clearAllMocks())

describe('authService', () => {
    it('refresh -> the shared refreshSession, never a POST of its own', () => {
        const flight = refreshSession()
        refreshSession.mockClear()
        refreshSession.mockReturnValueOnce(flight)
        expect(authService.refresh()).toBe(flight)
        expect(refreshSession).toHaveBeenCalledTimes(1)
        expect(post).not.toHaveBeenCalled()
    })

    it('getMe -> GET /auth/me', () => {
        authService.getMe()
        expect(get).toHaveBeenCalledWith('/auth/me')
    })
})
