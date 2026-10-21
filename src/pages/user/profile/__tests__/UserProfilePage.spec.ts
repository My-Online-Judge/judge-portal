// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  getPublicProfile: vi.fn(),
  getPublicProfilesByIds: vi.fn(),
  getUserStats: vi.fn(),
  ensureFreshSession: vi.fn(),
  getMe: vi.fn(),
  calls: [] as string[],
  route: null as unknown as { params: Record<string, string> },
}))

vi.mock('vue-router', async () => {
  const { reactive: r } = await import('vue')
  h.route = r({ params: { username: 'alice' } as Record<string, string> })
  const RouterLink = defineComponent({
    props: ['to'],
    setup: (p, { slots }) => () => render('a', { href: typeof p.to === 'string' ? p.to : '' }, slots.default?.()),
  })
  return { useRoute: () => h.route, RouterLink }
})
vi.mock('@/services/userService', () => ({
  default: { getPublicProfile: h.getPublicProfile, getPublicProfilesByIds: h.getPublicProfilesByIds },
}))
vi.mock('@/services/submissionService', () => ({ default: { getUserStats: h.getUserStats } }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))
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

const mounted: VueWrapper[] = []
const mountView = () => {
  const w = mount(UserProfilePage, { global: { stubs: { SubmissionDetailDialog: DetailStub } } })
  mounted.push(w)
  return w
}
async function mountPage(viewerId: string | null) {
  setActivePinia(createPinia())
  if (viewerId) useAuthStore().user = { id: viewerId } as never
  const w = mountView()
  await flushPromises()
  return w
}

beforeEach(() => {
  vi.clearAllMocks()
  h.calls.length = 0
  h.route.params = { username: 'alice' }
  h.ensureFreshSession.mockImplementation(async () => void h.calls.push('fresh'))
  h.getPublicProfile.mockResolvedValue({ data: { data: profile } })
  h.getUserStats.mockImplementation(async () => {
    h.calls.push('stats')
    return { data: { data: stats() } }
  })
  // Nobody signed in unless a test says so.
  h.getMe.mockResolvedValue({ data: { data: null } })
})

// The route is shared: a page left mounted would load again when the next test resets it.
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

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

  it('aHardLoadAsTheOwnerWaitsForTheSessionAndShowsTheOwnerView', async () => {
    // Right after a reload nobody is known yet: the header's /auth/me is still on its way.
    const me = deferred<unknown>()
    h.getMe.mockReturnValue(me.promise)
    setActivePinia(createPinia())
    const w = mountView()
    await flushPromises()
    expect(h.getUserStats).not.toHaveBeenCalled()

    me.resolve({ data: { data: { id: 'u1', username: 'alice', permissions: [] } } })
    await flushPromises()

    // The session is made fresh before the stats leave, so they come back with the owner's view.
    expect(h.calls).toEqual(['fresh', 'stats'])
    expect(h.getPublicProfile).toHaveBeenCalledTimes(1)
    await w.get('tbody tr').trigger('click')
    expect(w.getComponent(DetailStub).props('open')).toBe(true)
  })

  it('signingInOrOutOnThePageReadsTheStatsAgain', async () => {
    const w = await mountPage(null)
    expect(h.getUserStats).toHaveBeenCalledTimes(1)
    expect(h.ensureFreshSession).not.toHaveBeenCalled()

    useAuthStore().user = { id: 'u1' } as never
    await flushPromises()
    expect(h.getUserStats).toHaveBeenCalledTimes(2)
    expect(h.calls.slice(-2)).toEqual(['fresh', 'stats'])
    await w.get('tbody tr').trigger('click')
    expect(w.getComponent(DetailStub).props('open')).toBe(true)

    useAuthStore().user = null
    await flushPromises()
    expect(h.getUserStats).toHaveBeenCalledTimes(3)
    expect(w.find('[data-test="detail"]').exists()).toBe(false)
  })

  it('showsLoadingFirst', async () => {
    const pending = deferred<unknown>()
    h.getPublicProfile.mockReturnValue(pending.promise)
    const w = await mountPage(null)
    expect(w.findComponent({ name: 'Loading' }).exists()).toBe(true)
    pending.resolve({ data: { data: profile } })
    await flushPromises()
    expect(w.text()).toContain('Alice Tran')
  })

  it('aRouteChangeDropsTheOlderAnswer', async () => {
    const alice = deferred<unknown>()
    h.getPublicProfile.mockImplementation((name: string) =>
      name === 'alice' ? alice.promise : Promise.resolve({ data: { data: { ...profile, id: 'u2', username: 'bob', name: 'Bob Le' } } }),
    )
    const w = await mountPage(null)
    h.route.params.username = 'bob'
    await flushPromises()
    alice.resolve({ data: { data: profile } })
    await flushPromises()
    expect(w.text()).toContain('Bob Le')
    expect(w.text()).not.toContain('Alice Tran')
  })

  it('aFailureShowsRetry', async () => {
    h.getPublicProfile.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })
    const w = await mountPage(null)
    expect(w.text()).toContain('Could not load this profile')
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Alice Tran')
  })

  it('aStatsNotFoundIsAnErrorNotAMissingUser', async () => {
    h.getUserStats.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
    const w = await mountPage(null)
    expect(w.text()).not.toContain('User not found')
    expect(w.text()).toContain('Could not load this profile')
  })

  it('theThreeTilesKeepTheirBordersOnPhones', async () => {
    const w = await mountPage(null)
    const strip = w.get('[data-test="tile-solved"]').element.parentElement!
    expect(strip.className).toContain('grid-cols-3')
    // The 2-by-2 phone rule would give the third tile a top border and no left one.
    expect(strip.className).not.toContain('nth-child(n+3)')
  })

  describe('without a public username', () => {
    // A Google account: identity answers its username (its email address) as null, and the profile is keyed by id.
    const GOOGLE = { id: 'g1', username: null, name: 'Bình Lê', avatar: null, createdAt: '2026-03-05T10:00:00' }

    it('theIdRouteReadsTheProfileByIdAndShowsNoHandle', async () => {
      h.route.params = { id: 'g1' }
      h.getPublicProfilesByIds.mockResolvedValue({ data: { data: [GOOGLE] } })
      const w = await mountPage(null)
      expect(h.getPublicProfilesByIds).toHaveBeenCalledWith(['g1'])
      expect(h.getPublicProfile).not.toHaveBeenCalled()
      expect(h.getUserStats).toHaveBeenCalledWith('g1')
      expect(w.text()).toContain('Bình Lê')
      expect(w.text()).toContain('Joined')
      expect(w.text()).not.toContain('@')
    })

    it('anUnknownIdIsNotFound', async () => {
      h.route.params = { id: 'nobody' }
      h.getPublicProfilesByIds.mockResolvedValue({ data: { data: [] } })
      const w = await mountPage(null)
      expect(w.text()).toContain('User not found')
      expect(h.getUserStats).not.toHaveBeenCalled()
    })

    it('anEmailInTheAddressIsNeverEchoed', async () => {
      h.route.params = { username: 'binh@gmail.com' }
      h.getPublicProfile.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
      const w = await mountPage(null)
      expect(w.text()).toContain('User not found')
      expect(w.text()).not.toContain('binh@gmail.com')
    })

    it('anEmailShapedUsernameThatStillArrivesIsNotShown', async () => {
      h.getPublicProfile.mockResolvedValue({ data: { data: { ...profile, username: 'alice@gmail.com' } } })
      const w = await mountPage(null)
      expect(w.text()).toContain('Alice Tran')
      expect(w.html()).not.toContain('alice@gmail.com')
    })
  })

  it('aProfileRendersNoImageAtAll', async () => {
    // An older identity still sends a Google photo URL: the page shows initials and never asks that host for anything.
    h.getPublicProfile.mockResolvedValue({
      data: { data: { ...profile, avatar: 'https://lh3.googleusercontent.com/a/photo' } },
    })
    const w = await mountPage(null)
    expect(w.text()).toContain('Alice Tran')
    expect(w.find('img').exists()).toBe(false)
    expect(w.html()).not.toContain('googleusercontent')
  })

  it('initialsComeFromTheName', async () => {
    h.getPublicProfile.mockResolvedValue({ data: { data: { ...profile, username: 'le_thanh_tuan', name: 'Lê Thanh Tuấn' } } })
    const w = await mountPage(null)
    expect(w.get('header').text()).toContain('LT')
    expect(w.get('header').text()).toContain('@le_thanh_tuan')
  })

  it('theOwnerCanOpenASubmissionFromTheKeyboard', async () => {
    const other = await mountPage('someone-else')
    expect(other.find('tbody button').exists()).toBe(false)
    other.unmount()

    const owner = await mountPage('u1')
    const open = owner.get('tbody button')
    expect(open.attributes('type')).toBe('button')
    await open.trigger('click')
    expect(owner.getComponent(DetailStub).props('open')).toBe(true)
  })
})
