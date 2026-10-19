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
  undo: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/services/userService', () => ({
  default: { list: h.list, update: h.update, updateStatus: h.updateStatus, remove: h.remove },
}))
vi.mock('@/services/roleService', () => ({ default: { getRoles: h.getRoles } }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ triggerToast: vi.fn(), undo: h.undo, error: h.error }),
}))

import AdminUsersPage from '../AdminUsersPage.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import { useAuthStore } from '@/stores/auth'

type UndoOpts = { description?: string; commit: () => Promise<void>; onUndo: () => void }
const undoOpts = () => h.undo.mock.calls[0][1] as UndoOpts
const statusCell = () => wrapper!.findAll('tbody tr')[0]!.findAll('td')[3]!.text()

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
  it('disableUsesUndoAndCommitsOnce', async () => {
    await mountPage()
    await pickMenu('Disable')
    // Optimistic: the row reads Disabled at once, and nothing is sent until the window closes.
    expect(h.undo).toHaveBeenCalledTimes(1)
    expect(h.undo.mock.calls[0][0]).toBe('User disabled')
    expect(h.updateStatus).not.toHaveBeenCalled()
    expect(statusCell()).toContain('Disabled')
    // The window closes: the status change goes out once, then the list reloads.
    h.list.mockResolvedValue({ data: { data: [{ ...user, status: 0 }], pagination } })
    await undoOpts().commit()
    await flushPromises()
    expect(h.updateStatus).toHaveBeenCalledTimes(1)
    expect(h.updateStatus).toHaveBeenCalledWith('u2', 0)
    expect(statusCell()).toContain('Disabled')
  })

  it('disableUndoRestoresRow', async () => {
    await mountPage()
    await pickMenu('Disable')
    expect(statusCell()).toContain('Disabled')
    undoOpts().onUndo()
    await nextTick()
    expect(statusCell()).toContain('Active')
    expect(h.updateStatus).not.toHaveBeenCalled()
  })

  it('disableFailureRestoresRowWithErrorToast', async () => {
    h.updateStatus.mockRejectedValue(new Error('boom'))
    await mountPage()
    await pickMenu('Disable')
    await expect(undoOpts().commit()).resolves.toBeUndefined()
    await flushPromises()
    expect(statusCell()).toContain('Active')
    expect(h.error).toHaveBeenCalledWith("Couldn't disable the user", expect.objectContaining({ action: expect.any(Object) }))
  })

  it('editStatusToDisabledAsks', async () => {
    await mountPage()
    await pickMenu('Edit')
    // Flip the status select to Disabled through the component state.
    const vm = wrapper!.vm as unknown as { $: { setupState: { editForm: { status: string } } } }
    vm.$.setupState.editForm.status = '0'
    await nextTick()
    bodyButton('Save user')!.click()
    await flushPromises()
    expect(h.update).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Disable user “bob”?')
    bodyButton('Disable user')!.click()
    await flushPromises()
    expect(h.update).toHaveBeenCalledTimes(1)
    expect(h.update.mock.calls[0][1]).toMatchObject({ status: 0 })
  })

  it('deleteAsksThenCallsOnce', async () => {
    await mountPage()
    await pickMenu('Delete…')
    expect(h.remove).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Delete user “bob”?')
    const confirm = bodyButton('Delete user')!
    confirm.click()
    confirm.click()
    await flushPromises()
    expect(h.remove).toHaveBeenCalledTimes(1)
    expect(h.remove).toHaveBeenCalledWith('u2')
  })

  it('protectedAccountHasOneDisabledItem', async () => {
    h.list.mockResolvedValue({
      data: { data: [{ ...user, id: 'root', name: 'Root', roles: [{ id: 'r0', name: 'SYS_ROOT' }] }], pagination },
    })
    await mountPage()
    expect(statusCell()).toContain('Protected')
    await wrapper!.get('button[aria-label="Actions for Root"]').trigger('click')
    await nextTick()
    await nextTick()
    const items = [...document.body.querySelectorAll('[role="menuitem"]')]
    expect(items).toHaveLength(1)
    expect(items[0]!.hasAttribute('data-disabled')).toBe(true)
    expect(items[0]!.getAttribute('aria-label')).toContain('Protected system account')
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
