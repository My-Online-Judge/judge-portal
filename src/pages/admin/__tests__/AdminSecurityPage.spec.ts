// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  listAttempts: vi.fn(), listBans: vi.fn(), createBan: vi.fn(), deleteBan: vi.fn(), deleteBanKeepalive: vi.fn(),
  toast: vi.fn(), undo: vi.fn(), error: vi.fn(),
}))

vi.mock('@/services/securityService', () => ({
  default: {
    listAttempts: h.listAttempts, listBans: h.listBans, createBan: h.createBan,
    deleteBan: h.deleteBan, deleteBanKeepalive: h.deleteBanKeepalive,
  },
}))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ triggerToast: h.toast, undo: h.undo, error: h.error }),
}))

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
type UndoOpts = { description?: string; commit: () => Promise<void>; onUndo: () => void; commitOnUnload?: () => void }
const undoOpts = () => h.undo.mock.calls[0][1] as UndoOpts
async function openBansTab() {
  await tabs()[1].trigger('mousedown', { button: 0, ctrlKey: false })
  await tabs()[1].trigger('click')
  await flushPromises()
}
const banRowShown = () => document.body.textContent?.includes('198.51.100.9') ?? false

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

  it('removeBanUsesUndoAndCommitsOnce', async () => {
    await mountPage()
    await openBansTab()
    await openMenu('198.51.100.9')
    menuItem('Remove ban').click()
    await flushPromises()
    // Optimistic: the row goes at once and nothing is sent until the window closes.
    expect(h.undo).toHaveBeenCalledTimes(1)
    expect(h.undo.mock.calls[0][0]).toBe('Ban removed')
    expect(h.deleteBan).not.toHaveBeenCalled()
    expect(banRowShown()).toBe(false)
    h.listBans.mockResolvedValue({ data: { data: [], pagination: pagination({ totalElements: 0 }) } })
    await undoOpts().commit()
    await flushPromises()
    expect(h.deleteBan).toHaveBeenCalledTimes(1)
    expect(h.deleteBan).toHaveBeenCalledWith('b1')
  })

  it('removeBanUnloadUsesKeepalive', async () => {
    await mountPage()
    await openBansTab()
    await openMenu('198.51.100.9')
    menuItem('Remove ban').click()
    await flushPromises()
    undoOpts().commitOnUnload!()
    expect(h.deleteBanKeepalive).toHaveBeenCalledTimes(1)
    expect(h.deleteBanKeepalive).toHaveBeenCalledWith('b1')
    expect(h.deleteBan).not.toHaveBeenCalled()
  })

  it('removeBanUndoRestoresRow', async () => {
    await mountPage()
    await openBansTab()
    await openMenu('198.51.100.9')
    menuItem('Remove ban').click()
    await flushPromises()
    expect(banRowShown()).toBe(false)
    undoOpts().onUndo()
    await flushPromises()
    expect(banRowShown()).toBe(true)
    expect(h.deleteBan).not.toHaveBeenCalled()
  })

  it('removeBanFailureRestoresRowWithErrorToast', async () => {
    h.deleteBan.mockRejectedValue(new Error('boom'))
    await mountPage()
    await openBansTab()
    await openMenu('198.51.100.9')
    menuItem('Remove ban').click()
    await flushPromises()
    await expect(undoOpts().commit()).resolves.toBeUndefined()
    await flushPromises()
    expect(banRowShown()).toBe(true)
    expect(h.error).toHaveBeenCalledWith("Couldn't remove the ban", expect.objectContaining({ action: expect.any(Object) }))
  })

  it('submitBanFetchesOnce', async () => {
    await mountPage()
    await openMenu('mallory')
    menuItem('Ban IP address…').click()
    await flushPromises()
    const before = h.listBans.mock.calls.length
    bodyButton('Ban IP address')!.click()
    await flushPromises()
    expect(h.createBan).toHaveBeenCalledTimes(1)
    expect(h.listBans.mock.calls.length - before).toBe(1)
  })

  it('cancelDisabledWhileSaving', async () => {
    let release!: () => void
    h.createBan.mockReturnValue(new Promise<void>((r) => { release = r }))
    await mountPage()
    await openMenu('mallory')
    menuItem('Ban IP address…').click()
    await flushPromises()
    bodyButton('Ban IP address')!.click()
    await flushPromises()
    expect(bodyButton('Cancel')!.disabled).toBe(true)
    release()
    await flushPromises()
  })
})
