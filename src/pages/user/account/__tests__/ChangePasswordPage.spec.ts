// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'

const h = vi.hoisted(() => ({ change: vi.fn(), push: vi.fn(), logout: vi.fn() }))

vi.mock('@/services/userService', () => ({ default: { changeOwnPassword: h.change } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: h.push }) }))

import ChangePasswordPage from '../ChangePasswordPage.vue'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'

function apiError(status: number, message: string) {
  return new AxiosError('x', 'ERR', undefined, undefined, {
    status, data: { message }, statusText: '', headers: {}, config: {} as never,
  })
}

async function fill(w: ReturnType<typeof mount>, cur: string, next: string, confirm: string) {
  await w.get('#current-password').setValue(cur)
  await w.get('#new-password').setValue(next)
  await w.get('#confirm-password').setValue(confirm)
}

function mountPage() {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.logout = h.logout as never
  return mount(ChangePasswordPage)
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.change.mockResolvedValue(undefined)
    h.logout.mockResolvedValue(undefined)
  })

  it('submits current and new password', async () => {
    const w = mountPage()
    await fill(w, 'oldpass1', 'newpass12', 'newpass12')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(h.change).toHaveBeenCalledWith('oldpass1', 'newpass12')
  })

  it('after success, logs out and routes to ADMIN_LOGIN', async () => {
    const w = mountPage()
    await fill(w, 'oldpass1', 'newpass12', 'newpass12')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(h.logout).toHaveBeenCalledWith({ reload: false, notifyServer: false })
    expect(h.push).toHaveBeenCalledWith(ROUTE_PATH.ADMIN_LOGIN)
  })

  it('confirm mismatch shows an error and does not call the service', async () => {
    const w = mountPage()
    await fill(w, 'oldpass1', 'newpass12', 'different1')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(h.change).not.toHaveBeenCalled()
    expect(w.text()).toContain('do not match')
  })

  it('shows the API message on 401/400', async () => {
    h.change.mockRejectedValueOnce(apiError(401, 'Current password is incorrect'))
    const w = mountPage()
    await fill(w, 'wrong', 'newpass12', 'newpass12')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Current password is incorrect')
    expect(h.logout).not.toHaveBeenCalled()
  })
})
