import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/authService', () => ({
  default: { getMe: vi.fn(), logout: vi.fn() },
}))

import { useAuthStore } from '@/stores/auth'
import type { UserResponse } from '@/types/user'

const userWith = (permissions: string[]) =>
  ({ username: 'u@example.com', permissions } as unknown as UserResponse)

describe('auth store hasPermission', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('is false when unauthenticated', () => {
    const store = useAuthStore()
    expect(store.hasPermission('problem:create')).toBe(false)
  })

  it('reflects the logged-in user permissions', () => {
    const store = useAuthStore()
    store.login(userWith(['problem:create', 'problem:delete']))
    expect(store.hasPermission('problem:create')).toBe(true)
    expect(store.hasPermission('role:read')).toBe(false)
  })
})
