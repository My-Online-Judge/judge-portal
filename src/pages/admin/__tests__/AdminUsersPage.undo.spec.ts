// @vitest-environment jsdom
// The disable undo window against the real toast engine (the other spec mocks it).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  updateStatusKeepalive: vi.fn(),
  remove: vi.fn(),
  getRoles: vi.fn(),
}))

vi.mock('@/services/userService', () => ({
  default: {
    list: h.list, update: h.update, updateStatus: h.updateStatus,
    updateStatusKeepalive: h.updateStatusKeepalive, remove: h.remove,
  },
}))
vi.mock('@/services/roleService', () => ({ default: { getRoles: h.getRoles } }))

import AdminUsersPage from '../AdminUsersPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast, __resetForTests } from '@/composables/useToast'

const user = {
  id: 'u2', username: 'bob', name: 'Bob', email: 'bob@x.io', status: 1,
  roles: [], createdAt: '2026-01-01T00:00:00Z',
}
const pagination = { page: 0, size: 10, totalElements: 1, totalPages: 1, hasPrev: false, hasNext: false, prevPage: null, nextPage: null }

let wrapper: VueWrapper | undefined

async function mountPage() {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 'me', permissions: ['user:update', 'user:delete'] } as never
  wrapper = mount(AdminUsersPage, { attachTo: document.body })
  await flushPromises()
}

const menuItem = (text: string) =>
  [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === text) as HTMLElement | undefined

async function pickMenu(text: string) {
  await wrapper!.get('button[aria-label="Actions for Bob"]').trigger('click')
  await nextTick()
  await nextTick()
  menuItem(text)!.click()
  await flushPromises()
}

const statusCell = () => wrapper!.findAll('tbody tr')[0]!.findAll('td')[3]!.text()
const toastTitles = () => useToast().toasts.value.map((t) => t.title)
const disabledCalls = () => h.updateStatus.mock.calls.filter((c) => c[1] === 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  __resetForTests()
  h.list.mockResolvedValue({ data: { data: [user], pagination } })
  h.getRoles.mockResolvedValue({ data: { data: [] } })
  h.updateStatus.mockResolvedValue({})
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  __resetForTests()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('AdminUsersPage disable window', () => {
  it('enableDuringWindowCancelsTheDisable', async () => {
    await mountPage()
    await pickMenu('Disable')
    expect(statusCell()).toContain('Disabled')
    expect(toastTitles()).toContain('User disabled')

    // The row now offers Enable: choosing it is the same as pressing Undo.
    await pickMenu('Enable')
    expect(toastTitles()).not.toContain('User disabled')
    expect(toastTitles()).toContain('User enabled')
    expect(statusCell()).toContain('Active')

    vi.advanceTimersByTime(9000)
    await flushPromises()
    expect(disabledCalls()).toHaveLength(0)
    expect(h.updateStatus).not.toHaveBeenCalled()
    expect(statusCell()).toContain('Active')
  })

  it('editDuringWindowCancelsTheDisable', async () => {
    await mountPage()
    await pickMenu('Disable')
    await pickMenu('Edit')
    const vm = wrapper!.vm as unknown as { $: { setupState: { editForm: { status: string } } } }
    expect(vm.$.setupState.editForm.status).toBe('1')
    expect(toastTitles()).not.toContain('User disabled')
    expect(statusCell()).toContain('Active')

    vi.advanceTimersByTime(9000)
    await flushPromises()
    expect(disabledCalls()).toHaveLength(0)
  })

  it('windowEndingSendsTheDisableOnce', async () => {
    await mountPage()
    await pickMenu('Disable')
    h.list.mockResolvedValue({ data: { data: [{ ...user, status: 0 }], pagination } })
    vi.advanceTimersByTime(9000)
    await flushPromises()
    expect(h.updateStatus).toHaveBeenCalledTimes(1)
    expect(h.updateStatus).toHaveBeenCalledWith('u2', 0)
    expect(statusCell()).toContain('Disabled')
  })

  it('pagehideInsideWindowUsesKeepalive', async () => {
    await mountPage()
    await pickMenu('Disable')
    window.dispatchEvent(new Event('pagehide'))
    expect(h.updateStatusKeepalive).toHaveBeenCalledTimes(1)
    expect(h.updateStatusKeepalive).toHaveBeenCalledWith('u2', 0)
    expect(h.updateStatus).not.toHaveBeenCalled()
  })
})
