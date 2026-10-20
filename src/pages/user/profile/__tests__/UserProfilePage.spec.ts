// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  getPublicProfile: vi.fn(),
  getUserStats: vi.fn(),
  ensureFreshSession: vi.fn(),
}))

vi.mock('vue-router', () => {
  const RouterLink = defineComponent({
    props: ['to'],
    setup: (p, { slots }) => () => render('a', { href: typeof p.to === 'string' ? p.to : '' }, slots.default?.()),
  })
  return { useRoute: () => ({ params: { username: 'alice' } }), RouterLink }
})
vi.mock('@/services/userService', () => ({ default: { getPublicProfile: h.getPublicProfile } }))
vi.mock('@/services/submissionService', () => ({ default: { getUserStats: h.getUserStats } }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/refreshSession')>()),
  ensureFreshSession: h.ensureFreshSession,
}))

import UserProfilePage from '../UserProfilePage.vue'
import { useAuthStore } from '@/stores/auth'

const profile = { id: 'u1', username: 'alice', name: 'Alice Tran', avatar: null, createdAt: '2026-03-05T10:00:00' }
const stats = (over = {}) => ({
  solvedCount: 1, attemptedCount: 2, submissionCount: 3, acceptedCount: 1,
  solvedProblems: ['sum'],
  recent: [{ id: 's1', problemSlug: 'sum', result: 0, language: 'C++17', createdAt: '2026-03-06T10:00:00' }],
  ...over,
})
const DetailStub = defineComponent({ props: ['open', 'submissionId'], setup: () => () => render('div', { 'data-test': 'detail' }) })

async function mountPage(viewerId: string | null) {
  setActivePinia(createPinia())
  if (viewerId) useAuthStore().user = { id: viewerId } as never
  const w = mount(UserProfilePage, { global: { stubs: { SubmissionDetailDialog: DetailStub } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  vi.clearAllMocks()
  h.ensureFreshSession.mockResolvedValue(undefined)
  h.getPublicProfile.mockResolvedValue({ data: { data: profile } })
  h.getUserStats.mockResolvedValue({ data: { data: stats() } })
})

describe('UserProfilePage', () => {
  it('showsTheHeaderAndTiles', async () => {
    const w = await mountPage(null)
    const text = w.text()
    expect(text).toContain('Alice Tran')
    expect(text).toContain('@alice')
    expect(text).toContain('Joined')
    expect(w.get('[data-test="tile-solved"]').text()).toContain('1')
    expect(w.get('[data-test="tile-attempted"]').text()).toContain('2')
    expect(w.get('[data-test="tile-acceptance"]').text()).toContain('33.3%')
    expect(w.get('a[href="/problems/sum"]').text()).toBe('sum')
    expect(h.getPublicProfile).toHaveBeenCalledWith('alice')
    expect(h.getUserStats).toHaveBeenCalledWith('u1')
  })

  it('zeroSubmissionsShowZeroPercent', async () => {
    h.getUserStats.mockResolvedValue({
      data: { data: stats({ solvedCount: 0, attemptedCount: 0, submissionCount: 0, acceptedCount: 0, solvedProblems: [], recent: [] }) },
    })
    const w = await mountPage(null)
    expect(w.get('[data-test="tile-acceptance"]').text()).toContain('0%')
    expect(w.get('[data-test="tile-acceptance"]').text()).not.toContain('NaN')
  })

  it('unknownUserShowsNotFound', async () => {
    h.getPublicProfile.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
    const w = await mountPage(null)
    expect(w.text()).toContain('User not found')
    expect(h.getUserStats).not.toHaveBeenCalled()
  })

  it('onlyTheOwnerCanOpenSubmissions', async () => {
    const other = await mountPage('someone-else')
    await other.get('tbody tr').trigger('click')
    expect(other.find('[data-test="detail"]').exists()).toBe(false)
    other.unmount()

    const owner = await mountPage('u1')
    expect(h.ensureFreshSession).toHaveBeenCalled()
    await owner.get('tbody tr').trigger('click')
    expect(owner.getComponent(DetailStub).props('open')).toBe(true)
    expect(owner.getComponent(DetailStub).props('submissionId')).toBe('s1')
  })
})
