import { describe, it, expect } from 'vitest'
import { shouldAnnounceSessionExpiry, sessionExpiredLoginTarget } from '@/api/sessionExpired'

describe('shouldAnnounceSessionExpiry', () => {
    it('is true only for a visitor who was signed in', () => {
        expect(shouldAnnounceSessionExpiry(true)).toBe(true)
        expect(shouldAnnounceSessionExpiry(false)).toBe(false)
    })
})

describe('sessionExpiredLoginTarget', () => {
    it('sends admin routes to the admin login with a redirect', () => {
        expect(sessionExpiredLoginTarget('/admin/problems?page=2')).toEqual({
            path: '/admin/login',
            query: { redirect: '/admin/problems?page=2' },
        })
    })
    it('uses the login prompt elsewhere', () => {
        expect(sessionExpiredLoginTarget('/problems/a')).toBeNull()
        expect(sessionExpiredLoginTarget('/administrator')).toBeNull()
    })
})
