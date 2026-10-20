import { describe, it, expect, vi, beforeEach } from 'vitest'
import securityService from '@/services/securityService'

const { get, post, del } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post, delete: del },
    API_BASE_URL: 'http://api.test/v1',
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

describe('deleteBanKeepalive', () => {
    it('deleteBanKeepaliveUsesFetchKeepalive', () => {
        const fetchMock = vi.fn(() => Promise.resolve(new Response(null)))
        vi.stubGlobal('fetch', fetchMock)
        try {
            securityService.deleteBanKeepalive('b1')
            expect(fetchMock).toHaveBeenCalledWith('http://api.test/v1/security/bans/b1', {
                method: 'DELETE',
                credentials: 'include',
                keepalive: true,
            })
            const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
            expect(init.body).toBeUndefined()
            expect(del).not.toHaveBeenCalled()
        } finally {
            vi.unstubAllGlobals()
        }
    })
})
