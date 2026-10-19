// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  remove: vi.fn(),
  getRoles: vi.fn(),
}))

vi.mock('@/services/userService', () => ({
  default: { list: h.list, update: h.update, updateStatus: h.updateStatus, remove: h.remove },
}))
vi.mock('@/services/roleService', () => ({ default: { getRoles: h.getRoles } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: vi.fn() }) }))

import AdminUsersPage from '../AdminUsersPage.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import { useAuthStore } from '@/stores/auth'

const user = {
  id: 'u2', username: 'bob', name: 'Bob', email: 'bob@x.io', status: 1,
  roles: [], createdAt: '2026-01-01T00:00:00Z',
}
const pagination = { page: 0, size: 10, totalElements: 25, totalPages: 3, hasPrev: false, hasNext: true, prevPage: null, nextPage: 1 }

let wrapper: VueWrapper | undefined

async function mountPage() {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.user = { id: 'me', permissions: ['user:create', 'user:update', 'user:delete'] } as never
  wrapper = mount(AdminUsersPage, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

const bodyButton = (text: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined
const menuItem = (text: string) =>
  [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === text) as HTMLElement | undefined

async function pickMenu(text: string) {
  await wrapper!.get('button[aria-label="Actions for Bob"]').trigger('click')
  await nextTick()
  await nextTick()
  menuItem(text)!.click()
  await flushPromises()
}

beforeEach(() => {
  h.list.mockResolvedValue({ data: { data: [user], pagination } })
  h.getRoles.mockResolvedValue({ data: { data: [] } })
  h.updateStatus.mockResolvedValue({})
  h.update.mockResolvedValue({})
  h.remove.mockResolvedValue({})
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('AdminUsersPage', () => {
  it('disableAsksThenCallsOnce', async () => {
    await mountPage()
    await pickMenu('Disable…')
    expect(h.updateStatus).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Disable user “bob”?')
    const confirm = bodyButton('Disable')!
    confirm.click()
    confirm.click()
    await flushPromises()
    expect(h.updateStatus).toHaveBeenCalledTimes(1)
    expect(h.updateStatus).toHaveBeenCalledWith('u2', 0)
  })

  it('editStatusToDisabledAsks', async () => {
    await mountPage()
    await pickMenu('Edit')
    // Flip the status select to Disabled through the component state.
    const vm = wrapper!.vm as unknown as { $: { setupState: { editForm: { status: string } } } }
    vm.$.setupState.editForm.status = '0'
    await nextTick()
    bodyButton('Save')!.click()
    await flushPromises()
    expect(h.update).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Disable user “bob”?')
    bodyButton('Disable')!.click()
    await flushPromises()
    expect(h.update).toHaveBeenCalledTimes(1)
    expect(h.update.mock.calls[0][1]).toMatchObject({ status: 0 })
  })

  it('deleteAsksThenCallsOnce', async () => {
    await mountPage()
    await pickMenu('Delete…')
    expect(h.remove).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Delete user “bob”?')
    const confirm = bodyButton('Delete')!
    confirm.click()
    confirm.click()
    await flushPromises()
    expect(h.remove).toHaveBeenCalledTimes(1)
    expect(h.remove).toHaveBeenCalledWith('u2')
  })

  it('usesPaginationFooter', async () => {
    await mountPage()
    const footer = wrapper!.findComponent(PaginationFooter)
    expect(footer.exists()).toBe(true)
    h.list.mockClear()
    footer.vm.$emit('change-page', 1)
    await flushPromises()
    expect(h.list.mock.calls[0][1]).toMatchObject({ page: 1, size: 10 })
    footer.vm.$emit('update:size', 20)
    await flushPromises()
    expect(h.list.mock.calls[1][1]).toMatchObject({ page: 0, size: 20 })
  })
})
