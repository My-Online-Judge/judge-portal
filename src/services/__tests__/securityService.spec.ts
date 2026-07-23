import { describe, it, expect, vi, beforeEach } from 'vitest'
import securityService from '@/services/securityService'

const { get, post, del } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post, delete: del },
}))

beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: {} })
    post.mockReset().mockResolvedValue({ data: {} })
    del.mockReset().mockResolvedValue({ data: {} })
})

describe('securityService', () => {
    it('listAttempts passes params + signal', async () => {
        const ctrl = new AbortController()
        await securityService.listAttempts(ctrl.signal, { page: 1, ip: '1.2.3.4', success: false })
        expect(get).toHaveBeenCalledWith('/security/attempts', {
            params: { page: 1, ip: '1.2.3.4', success: false },
            signal: ctrl.signal,
        })
    })

    it('listBans hits /security/bans', async () => {
        await securityService.listBans(undefined, { page: 0, size: 20 })
        expect(get).toHaveBeenCalledWith('/security/bans', { params: { page: 0, size: 20 }, signal: undefined })
    })

    it('createBan posts the payload', async () => {
        await securityService.createBan({ type: 'IP', value: '1.2.3.4', reason: 'spam', durationHours: 24 })
        expect(post).toHaveBeenCalledWith('/security/bans', {
            type: 'IP',
            value: '1.2.3.4',
            reason: 'spam',
            durationHours: 24,
        })
    })

    it('deleteBan targets the id', async () => {
        await securityService.deleteBan('b-1')
        expect(del).toHaveBeenCalledWith('/security/bans/b-1')
    })
})
