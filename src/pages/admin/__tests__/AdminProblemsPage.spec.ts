// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  getProblems: vi.fn(),
  rejudgeProblem: vi.fn(),
  toast: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  exportUrl: vi.fn((slug: string) => `/api/v1/problems/${slug}/export`),
  downloadUrl: vi.fn(),
  ensureFreshSession: vi.fn(),
  loading: vi.fn(),
  toastUpdate: vi.fn(),
  toastDismiss: vi.fn(),
}))

vi.mock('vue-router', async () => {
  const { defineComponent, h: render } = await import('vue')
  // The redesigned page renders row titles as RouterLinks; a plain anchor is enough here.
  const RouterLink = defineComponent({ props: ['to'], setup: (_, { slots }) => () => render('a', slots.default?.()) })
  return { useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ query: {}, path: '/admin/problems' }), RouterLink }
})
vi.mock('@/services/problemService', () => ({ default: { getProblems: h.getProblems, remove: vi.fn(), exportUrl: h.exportUrl } }))
vi.mock('@/lib/download', () => ({ downloadUrl: h.downloadUrl }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/refreshSession')>()),
  ensureFreshSession: h.ensureFreshSession,
}))
vi.mock('@/services/submissionService', () => ({ default: { rejudgeProblem: h.rejudgeProblem } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: h.toast, loading: h.loading, success: h.success, info: h.info }) }))

import AdminProblemsPage from '../AdminProblemsPage.vue'
import { useAuthStore } from '@/stores/auth'

const problem = { id: 'p1', title: 'Sum', problemSlug: 'sum', hardnessLevel: 1, status: 1, updatedAt: '2026-01-01T00:00:00' }
let wrapper: VueWrapper | undefined

async function mountPage(permissions: string[]) {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 'me', permissions } as never
  wrapper = mount(AdminProblemsPage, { attachTo: document.body })
  await flushPromises()
}
const menuItems = () => [...document.body.querySelectorAll('[role="menuitem"]')].map((e) => e.textContent?.trim())
const bodyButton = (t: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t) as HTMLButtonElement | undefined
async function openMenu() {
  await wrapper!.get('button[aria-label="Actions for Sum"]').trigger('click')
  await nextTick()
  await nextTick()
}

beforeEach(() => {
  h.getProblems.mockResolvedValue({ data: { data: [problem] } })
  h.ensureFreshSession.mockResolvedValue(undefined)
  h.loading.mockReturnValue({ id: 1, update: h.toastUpdate, dismiss: h.toastDismiss })
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('AdminProblemsPage rejudge', () => {
  it('rejudgeItemOnlyWithPermission', async () => {
    await mountPage([])
    await openMenu()
    expect(menuItems()).not.toContain('Rejudge…')
    wrapper!.unmount()
    document.body.innerHTML = ''
    await mountPage(['submission:rejudge'])
    await openMenu()
    expect(menuItems()).toContain('Rejudge…')
  })

  it('confirmCallsRejudgeProblemAndToastsTheCount', async () => {
    h.rejudgeProblem.mockResolvedValue({ data: { data: { queued: 12 } } })
    await mountPage(['submission:rejudge'])
    await openMenu()
    ;[...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === 'Rejudge…')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(h.rejudgeProblem).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Rejudge “Sum”?')
    bodyButton('Rejudge')!.click()
    await flushPromises()
    expect(h.rejudgeProblem).toHaveBeenCalledWith('sum')
    expect(h.success).toHaveBeenCalledWith('Queued 12 submissions', {
      description: 'The judge queue limits each run. Run it again later if there are more.',
    })
  })
})

describe('AdminProblemsPage export', () => {
  const exportItem = () =>
    [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === 'Export') as HTMLElement
  const selectExport = async () => {
    await openMenu()
    exportItem().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
  }

  it('exportStreamsThroughADirectLink', async () => {
    await mountPage(['problem:update'])
    await selectExport()
    expect(h.loading).toHaveBeenCalledWith('Preparing sum.zip')
    // A link skips the client's refresh-on-401, so the session is made fresh first.
    expect(h.ensureFreshSession).toHaveBeenCalled()
    expect(h.downloadUrl).toHaveBeenCalledWith('/api/v1/problems/sum/export', 'sum.zip')
    expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.downloadUrl.mock.invocationCallOrder[0]!)
    expect(h.toastUpdate).toHaveBeenCalledWith({ type: 'success', title: 'Download started', description: 'sum.zip' })
  })

  it('exportIgnoresASecondStartWhileRunning', async () => {
    let release!: () => void
    h.ensureFreshSession.mockReturnValue(new Promise<void>((r) => (release = r)))
    await mountPage(['problem:update'])
    await selectExport()
    await openMenu()
    expect(exportItem().hasAttribute('data-disabled')).toBe(true)
    exportItem().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    release()
    await flushPromises()
    expect(h.loading).toHaveBeenCalledTimes(1)
    expect(h.downloadUrl).toHaveBeenCalledTimes(1)
  })

  it('exportStopsWhenTheSessionEnded', async () => {
    await mountPage(['problem:update'])
    // A refused refresh logs the user out (and says so with its own toast).
    h.ensureFreshSession.mockImplementation(async () => {
      useAuthStore().user = null
    })
    await selectExport()
    expect(h.downloadUrl).not.toHaveBeenCalled()
    expect(h.toastDismiss).toHaveBeenCalled()
  })

  it('exportHiddenWithoutUpdatePermission', async () => {
    await mountPage([])
    await openMenu()
    expect(menuItems()).not.toContain('Export')
  })
})
