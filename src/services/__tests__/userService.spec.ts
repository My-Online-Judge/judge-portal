import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the mock fns must be created via vi.hoisted.
const { get, post, put, patch, del } = vi.hoisted(() => ({
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    del: vi.fn(() => Promise.resolve({ data: {} })),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post, put, patch, delete: del },
}))

import userService from '@/services/userService'

beforeEach(() => vi.clearAllMocks())

describe('userService', () => {
    it('list -> GET /users with params', () => {
        userService.list(undefined, { page: 1, search: 'a', status: 1 })
        expect(get).toHaveBeenCalledWith('/users', { params: { page: 1, search: 'a', status: 1 }, signal: undefined })
    })

    it('get -> GET /users/{id}', () => {
        const sig = new AbortController().signal
        userService.get(sig, 'u1')
        expect(get).toHaveBeenCalledWith('/users/u1', { signal: sig })
    })

    it('create -> POST /users', () => {
        const payload = { username: 'a', name: 'A', email: 'a@b.io', password: 'Passw0rd1' }
        userService.create(payload)
        expect(post).toHaveBeenCalledWith('/users', payload)
    })

    it('update -> PUT /users/{id}', () => {
        userService.update('u1', { name: 'X' })
        expect(put).toHaveBeenCalledWith('/users/u1', { name: 'X' })
    })

    it('updateStatus -> PATCH /users/{id}/status', () => {
        userService.updateStatus('u1', 0)
        expect(patch).toHaveBeenCalledWith('/users/u1/status', { status: 0 })
    })

    it('updateRoles -> PUT /users/{id}/roles', () => {
        userService.updateRoles('u1', ['r1', 'r2'])
        expect(put).toHaveBeenCalledWith('/users/u1/roles', { roleIds: ['r1', 'r2'] })
    })

    it('resetPassword -> POST /users/{id}/reset-password', () => {
        userService.resetPassword('u1', 'NewPass12')
        expect(post).toHaveBeenCalledWith('/users/u1/reset-password', { newPassword: 'NewPass12' })
    })

    it('remove -> DELETE /users/{id}', () => {
        userService.remove('u1')
        expect(del).toHaveBeenCalledWith('/users/u1')
    })
})
