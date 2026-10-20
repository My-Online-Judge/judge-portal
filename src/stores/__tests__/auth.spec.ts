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
  beforeEach(async () => {
    setActivePinia(createPinia())
    const authService = (await import('@/services/authService')).default as any
    authService.getMe.mockReset()
  })

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

  it('ensureLoaded calls fetchUser only once across concurrent calls', async () => {
    const authService = (await import('@/services/authService')).default as any
    authService.getMe.mockResolvedValue({ data: { data: { username: 'a', permissions: [] } } })
    const store = useAuthStore()
    await Promise.all([store.ensureLoaded(), store.ensureLoaded()])
    await store.ensureLoaded()
    expect(authService.getMe).toHaveBeenCalledTimes(1)
  })

  it('ensureLoaded asks once for a signed-out visitor, and again only after a login', async () => {
    const authService = (await import('@/services/authService')).default as any
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    authService.getMe.mockRejectedValue({ response: { status: 401 } })
    const store = useAuthStore()

    await store.ensureLoaded()
    await store.ensureLoaded()
    expect(authService.getMe).toHaveBeenCalledTimes(1)
    expect(store.user).toBeNull()

    // Signed in, then out: the logout is the answer, so nothing is asked.
    store.login(userWith([]))
    await store.logout({ reload: false, notifyServer: false })
    await store.ensureLoaded()
    expect(authService.getMe).toHaveBeenCalledTimes(1)
    quiet.mockRestore()
  })

  it('ensureLoaded retries fetchUser after a failed attempt', async () => {
    const authService = (await import('@/services/authService')).default as any
    vi.stubGlobal('document', { cookie: '' })
    authService.getMe
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ data: { data: { username: 'a', permissions: [] } } })

    const store = useAuthStore()

    await store.ensureLoaded()
    expect(store.user).toBeNull()

    await store.ensureLoaded()
    expect(authService.getMe).toHaveBeenCalledTimes(2)
    expect(store.user).not.toBeNull()

    vi.unstubAllGlobals()
  })
})
