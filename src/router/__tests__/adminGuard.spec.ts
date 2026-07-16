import { describe, it, expect } from 'vitest'
import { resolveAdminAccess } from '@/router/adminGuard'

const ctx = (isAuthenticated: boolean, perms: string[]) => ({
  isAuthenticated,
  hasPermission: (p: string) => perms.includes(p),
})

describe('resolveAdminAccess', () => {
  it('allows routes with no permission requirement', () => {
    expect(resolveAdminAccess({}, ctx(false, []))).toBe('allow')
  })
  it('redirects unauthenticated users to login', () => {
    expect(resolveAdminAccess({ permissions: ['user:read'] }, ctx(false, []))).toBe('login')
  })
  it('forbids authenticated users lacking every listed permission', () => {
    expect(resolveAdminAccess({ permissions: ['user:read'] }, ctx(true, ['role:read']))).toBe('forbidden')
  })
  it('allows when the user has any one listed permission', () => {
    expect(resolveAdminAccess({ permissions: ['user:read', 'role:read'] }, ctx(true, ['role:read']))).toBe('allow')
  })
})
