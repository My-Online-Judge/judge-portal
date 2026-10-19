import { describe, expect, it } from 'vitest'
import { resolveAdminAccess } from '../adminGuard'

const ctx = (isAuthenticated: boolean) => ({ isAuthenticated, hasPermission: () => false })

describe('resolveAdminAccess requiresAuth', () => {
  it("requiresAuth anonymous → 'login'", () => {
    expect(resolveAdminAccess({ requiresAuth: true }, ctx(false))).toBe('login')
  })
  it("requiresAuth authenticated → 'allow'", () => {
    expect(resolveAdminAccess({ requiresAuth: true }, ctx(true))).toBe('allow')
  })
  it("no meta → 'allow'", () => {
    expect(resolveAdminAccess({}, ctx(false))).toBe('allow')
  })
})
