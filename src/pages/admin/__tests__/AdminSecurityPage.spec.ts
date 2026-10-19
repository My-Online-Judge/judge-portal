// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  listAttempts: vi.fn(), listBans: vi.fn(), createBan: vi.fn(), deleteBan: vi.fn(), toast: vi.fn(),
}))

vi.mock('@/services/securityService', () => ({
  default: { listAttempts: h.listAttempts, listBans: h.listBans, createBan: h.createBan, deleteBan: h.deleteBan },
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: h.toast }) }))

import AdminSecurityPage from '../AdminSecurityPage.vue'
import { useAuthStore } from '@/stores/auth'

const pagination = (over = {}) => ({
  page: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false, hasPrev: false, ...over,
})
const attempt = { id: 'a1', username: 'mallory', ip: '203.0.113.7', deviceHash: 'dev-1', success: false, errorCode: 'BAD', createdAt: '2026-10-01T00:00:00Z' }
const ban = { id: 'b1', type: 'IP', value: '198.51.100.9', reason: null, expiresAt: null, createdBy: 'root' }

let wrapper: VueWrapper | undefined

async function mountPage() {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 'me', permissions: ['ban:create', 'ban:delete'] } as never
  wrapper = mount(AdminSecurityPage, { attachTo: document.body })
  await flushPromises()
}
const menuItem = (t: string) =>
  [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === t) as HTMLElement
const bodyButton = (t: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t) as HTMLButtonElement | undefined
async function openMenu(name: string) {
  await wrapper!.get(`button[aria-label="Actions for ${name}"]`).trigger('click')
  await nextTick()
  await nextTick()
}
const tabs = () => wrapper!.findAll('[role="tab"]')

beforeEach(() => {
  h.listAttempts.mockResolvedValue({ data: { data: [attempt], pagination: pagination() } })
  h.listBans.mockResolvedValue({ data: { data: [ban], pagination: pagination() } })
  h.createBan.mockResolvedValue({})
  h.deleteBan.mockResolvedValue({})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('AdminSecurityPage', () => {
  it('tabsAreKeyboardNavigable', async () => {
    await mountPage()
    expect(tabs()[0].attributes('aria-selected')).toBe('true')
    await tabs()[0].trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(tabs()[1].attributes('aria-selected')).toBe('true')
  })

  it('unbanAsksThenCalls', async () => {
    await mountPage()
    await tabs()[1].trigger('mousedown', { button: 0, ctrlKey: false })
    await tabs()[1].trigger('click')
    await flushPromises()
    await openMenu('198.51.100.9')
    menuItem('Unban…').click()
    await flushPromises()
    expect(h.deleteBan).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Remove ban on 198.51.100.9?')
    const confirm = bodyButton('Unban')!
    confirm.click()
    confirm.click()
    await flushPromises()
    expect(h.deleteBan).toHaveBeenCalledTimes(1)
    expect(h.deleteBan).toHaveBeenCalledWith('b1')
  })

  it('submitBanFetchesOnce', async () => {
    await mountPage()
    await openMenu('mallory')
    menuItem('Ban IP…').click()
    await flushPromises()
    const before = h.listBans.mock.calls.length
    bodyButton('Ban')!.click()
    await flushPromises()
    expect(h.createBan).toHaveBeenCalledTimes(1)
    expect(h.listBans.mock.calls.length - before).toBe(1)
  })

  it('cancelDisabledWhileSaving', async () => {
    let release!: () => void
    h.createBan.mockReturnValue(new Promise<void>((r) => { release = r }))
    await mountPage()
    await openMenu('mallory')
    menuItem('Ban IP…').click()
    await flushPromises()
    bodyButton('Ban')!.click()
    await flushPromises()
    expect(bodyButton('Cancel')!.disabled).toBe(true)
    release()
    await flushPromises()
  })
})
