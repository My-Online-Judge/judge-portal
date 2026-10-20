// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  getRoles: vi.fn(), remove: vi.fn(), getPermissions: vi.fn(), updatePermissions: vi.fn(), toast: vi.fn(),
}))

vi.mock('@/services/roleService', () => ({
  default: { getRoles: h.getRoles, remove: h.remove, updatePermissions: h.updatePermissions, create: vi.fn() },
}))
vi.mock('@/services/permissionService', () => ({ default: { getPermissions: h.getPermissions } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: h.toast }) }))

import AdminRolesPage from '../AdminRolesPage.vue'
import { useAuthStore } from '@/stores/auth'

const role = (id: string, name: string) => ({ id, name, description: '', permissions: [] })
let wrapper: VueWrapper | undefined

async function mountPage() {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 'me', permissions: ['role:create', 'role:update', 'role:delete'] } as never
  wrapper = mount(AdminRolesPage, { attachTo: document.body })
  await flushPromises()
}
const menuItems = () => [...document.body.querySelectorAll('[role="menuitem"]')].map((e) => e.textContent?.trim())
const menuItem = (t: string) =>
  [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === t) as HTMLElement
const bodyButton = (t: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t) as HTMLButtonElement | undefined
async function openMenu(name: string) {
  await wrapper!.get(`button[aria-label="Actions for ${name}"]`).trigger('click')
  await nextTick()
  await nextTick()
}

beforeEach(() => {
  h.getRoles.mockResolvedValue({ data: { data: [role('1', 'SYS_ROOT'), role('2', 'ADMIN'), role('3', 'USER'), role('4', 'EDITOR')] } })
  h.getPermissions.mockResolvedValue({ data: { data: [] } })
  h.remove.mockResolvedValue({})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('AdminRolesPage', () => {
  it('userRoleHasNoDelete', async () => {
    await mountPage()
    await openMenu('USER')
    expect(menuItems()).toEqual(['Permissions'])
  })

  it('lockedRolesShowBadge', async () => {
    await mountPage()
    expect(wrapper!.findAll('button[aria-label="Actions for SYS_ROOT"]')).toHaveLength(0)
    expect(wrapper!.findAll('button[aria-label="Actions for ADMIN"]')).toHaveLength(0)
    expect(wrapper!.text().match(/Locked/g)).toHaveLength(2)
    expect(wrapper!.text().match(/All, locked/g)).toHaveLength(2)
  })

  it('countThenSavingThenSaved', async () => {
    h.getPermissions.mockResolvedValue({ data: { data: [{ name: 'problem:create' }, { name: 'problem:update' }] } })
    let release!: () => void
    h.updatePermissions.mockReturnValue(new Promise<void>((r) => { release = r }))
    await mountPage()
    const editorRow = () => wrapper!.findAll('tbody tr').find((r) => r.text().includes('EDITOR'))!
    expect(editorRow().text()).toContain('0 of 2')

    await openMenu('EDITOR')
    menuItem('Permissions').click()
    await flushPromises()
    bodyButton('Save permissions')!.click()
    await flushPromises()
    expect(editorRow().text()).toContain('Saving…')

    release()
    await flushPromises()
    expect(editorRow().text()).toContain('Saved')
    expect(h.updatePermissions).toHaveBeenCalledTimes(1)
  })

  it('deleteAsksThenCalls', async () => {
    await mountPage()
    await openMenu('EDITOR')
    menuItem('Delete…').click()
    await flushPromises()
    expect(h.remove).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Delete role “EDITOR”?')
    const confirm = bodyButton('Delete role')!
    confirm.click()
    confirm.click()
    await flushPromises()
    expect(h.remove).toHaveBeenCalledTimes(1)
    expect(h.remove).toHaveBeenCalledWith('4')
  })

  it('roleInUseShowsErrorToast', async () => {
    h.remove.mockRejectedValue({ response: { data: { message: 'Role is assigned to users' } } })
    await mountPage()
    await openMenu('EDITOR')
    menuItem('Delete…').click()
    await flushPromises()
    bodyButton('Delete role')!.click()
    await flushPromises()
    expect(h.toast).toHaveBeenCalledWith(expect.any(String), 'error')
  })
})
