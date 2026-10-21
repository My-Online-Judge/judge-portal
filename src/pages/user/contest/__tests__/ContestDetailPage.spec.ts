// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    get: vi.fn(),
    ensureFreshSession: vi.fn(),
    getMe: vi.fn(),
    calls: [] as string[],
}))

vi.mock('vue-router', async () => {
    const { reactive } = await import('vue')
    const route = reactive({ params: { slug: 'spring-cup' } })
    const RouterLink = defineComponent({
        props: ['to'],
        setup: (p, { slots }) => () => render('a', { href: p.to }, slots.default?.()),
    })
    return { useRoute: () => route, RouterLink }
})
vi.mock('@/services/contestService', () => ({ default: { get: h.get, scoreboard: vi.fn() } }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/refreshSession')>()),
    ensureFreshSession: h.ensureFreshSession,
}))

import { RouterLink, useRoute } from 'vue-router'
import ContestDetailPage from '../ContestDetailPage.vue'

const ScoreboardStub = defineComponent({
    name: 'ContestScoreboard',
    props: ['slug', 'phase', 'endsAt', 'offsetMs'],
    setup: () => () => render('div', { 'data-test': 'scoreboard' }),
})

const NOW = Date.parse('2026-10-21T10:00:00Z')
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()
const detail = (over: Record<string, unknown> = {}) => ({
    slug: 'spring-cup',
    title: 'Spring cup',
    description: 'Three problems, two hours.',
    startsAt: at(-600_000),
    endsAt: at(6_600_000),
    status: 'PUBLISHED',
    phase: 'RUNNING',
    problems: [
        { label: 'A', problemSlug: 'sum', title: 'Tổng hai số' },
        { label: 'B', problemSlug: 'max', title: 'Số lớn nhất' },
        { label: 'C', problemSlug: 'gcd', title: 'Ước chung' },
    ],
    myProgress: { A: { solved: true, attempts: 1 }, B: { solved: false, attempts: 2 } },
    serverTime: at(0),
    ...over,
})

let wrapper: VueWrapper | undefined
async function mountPage(signedIn = true) {
    setActivePinia(createPinia())
    h.getMe.mockResolvedValue({ data: { data: signedIn ? { id: 'u1', username: 'alice', permissions: [] } : null } })
    wrapper = mount(ContestDetailPage, {
        attachTo: document.body,
        // PageHeader resolves RouterLink globally.
        global: { components: { RouterLink }, stubs: { ContestScoreboard: ScoreboardStub } },
    })
    await flushPromises()
    return wrapper
}
const row = (label: string) => wrapper!.findAll('tbody tr').find((tr) => tr.get('td').text() === label)!

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    h.calls.length = 0
    h.ensureFreshSession.mockImplementation(async () => void h.calls.push('fresh'))
    h.get.mockImplementation(async () => {
        h.calls.push('get')
        return { data: { data: detail() } }
    })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('ContestDetailPage', () => {
    it('upcomingShowsACountdownAndNoProblems', async () => {
        h.get.mockResolvedValue({
            data: { data: detail({ phase: 'UPCOMING', startsAt: at(93_784_000), endsAt: at(100_984_000), problems: [], myProgress: {} }) },
        })
        const w = await mountPage()
        expect(w.text()).toContain('Spring cup')
        expect(w.text()).toContain('Starts in')
        expect(w.text()).toContain('1d 02:03:04')
        expect(w.findAll('tbody tr')).toHaveLength(0)
        expect(w.text()).toContain('Problems appear when the contest starts.')
    })

    it('runningListsProblemsWithMyStatus', async () => {
        const w = await mountPage()
        expect(w.text()).toContain('Ends in')
        expect(w.text()).toContain('01:50:00')
        // A: solved, shown as an icon with screen-reader text.
        expect(row('A').find('svg').exists()).toBe(true)
        expect(row('A').get('.sr-only').text()).toBe('Solved')
        expect(row('B').text()).toContain('2 tries')
        expect(row('C').text()).not.toContain('tries')
        expect(row('C').text()).not.toContain('Solved')
    })

    it('problemLinksPointToTheContestProblemRoute', async () => {
        await mountPage()
        const link = row('A').get('a')
        expect(link.attributes('href')).toBe('/contests/spring-cup/problems/A')
        expect(link.text()).toBe('Tổng hai số')
    })

    it('anEndedContestSaysEnded', async () => {
        h.get.mockResolvedValue({
            data: { data: detail({ phase: 'ENDED', startsAt: at(-7_800_000), endsAt: at(-600_000) }) },
        })
        const w = await mountPage()
        expect(w.text()).toContain('Ended')
        expect(w.text()).not.toContain('Ends in')
        // The problems stay readable as an archive.
        expect(row('A').get('a').attributes('href')).toBe('/contests/spring-cup/problems/A')
    })

    it('waitsForTheSessionAndFreshensItBeforeReadingMyProgress', async () => {
        await mountPage()
        expect(h.calls).toEqual(['fresh', 'get'])
    })

    it('anonymousVisitorsDoNotRefresh', async () => {
        await mountPage(false)
        expect(h.ensureFreshSession).not.toHaveBeenCalled()
        expect(h.get).toHaveBeenCalledTimes(1)
    })

    it('theScoreboardTabMountsTheBoardOnlyWhileActive', async () => {
        const w = await mountPage()
        expect(w.find('[data-test="scoreboard"]').exists()).toBe(false)
        const tab = (name: string) => w.findAll('[role="tab"]').find((t) => t.text() === name)!
        await tab('Scoreboard').trigger('mousedown', { button: 0 })
        await flushPromises()
        expect(w.getComponent(ScoreboardStub).props('slug')).toBe('spring-cup')
        expect(w.getComponent(ScoreboardStub).props('phase')).toBe('RUNNING')
        await tab('Problems').trigger('mousedown', { button: 0 })
        await flushPromises()
        expect(w.find('[data-test="scoreboard"]').exists()).toBe(false)
    })

    describe('at the end of the countdown', () => {
        const network = async () => {
            throw Object.assign(new Error('Network Error'), { isAxiosError: true })
        }
        // Each answer carries the server's clock at the time it is read, as the real one does.
        const answer = (over: Record<string, unknown>) => async () => ({
            data: { data: detail({ ...over, serverTime: new Date(Date.now()).toISOString() }) },
        })
        const endsSoon = answer({ endsAt: at(5_000) })
        const ended = answer({ phase: 'ENDED', startsAt: at(-7_195_000), endsAt: at(5_000) })
        // The countdown ticks each second; a read at its end is a few promise hops away.
        const advance = async (ms: number) => {
            await vi.advanceTimersByTimeAsync(ms)
            await flushPromises()
        }
        beforeEach(() => {
            // Faking again is a no-op while the outer Date-only fake is installed.
            vi.useRealTimers()
            vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
            vi.setSystemTime(NOW)
        })
        // Answers queued for one test must not reach the next.
        afterEach(() => h.get.mockReset())

        it('aFailedReadIsRetriedWithBackoffUntilThePhaseChanges', async () => {
            h.get.mockImplementationOnce(endsSoon).mockImplementationOnce(network).mockImplementationOnce(network)
                .mockImplementation(ended)
            const w = await mountPage()
            expect(w.text()).toContain('Ends in')

            await advance(5_000) // the countdown ends: the read fails
            expect(h.get).toHaveBeenCalledTimes(2)
            expect(w.text()).toContain('Ends in')
            await advance(5_000) // 5 s later: fails again
            expect(h.get).toHaveBeenCalledTimes(3)
            await advance(9_999)
            expect(h.get).toHaveBeenCalledTimes(3)
            await advance(1) // 10 s later: the contest has ended
            expect(h.get).toHaveBeenCalledTimes(4)
            expect(w.text()).toContain('Ended')
            expect(w.text()).not.toContain('Ends in')

            await advance(600_000)
            expect(h.get).toHaveBeenCalledTimes(4)
        })

        it('aServerThatStillSaysRunningIsAskedAgainToo', async () => {
            // The browser's clock (corrected by the server's) got there a moment before the server did.
            h.get.mockImplementationOnce(endsSoon).mockImplementationOnce(endsSoon).mockImplementation(ended)
            const w = await mountPage()
            await advance(5_000)
            expect(h.get).toHaveBeenCalledTimes(2)
            await advance(5_000)
            expect(h.get).toHaveBeenCalledTimes(3)
            expect(w.text()).toContain('Ended')
        })

        it('theRetriesStopAfterTheLastDelay', async () => {
            h.get.mockImplementationOnce(endsSoon).mockImplementation(network)
            const w = await mountPage()
            await advance(3_600_000)
            // The read at the end, then six retries (5, 10, 20, 30, 30 and 30 s apart).
            expect(h.get).toHaveBeenCalledTimes(8)
            // What was shown stays.
            expect(w.text()).toContain('Spring cup')
        })

        it('leavingThePageStopsTheRetries', async () => {
            h.get.mockImplementationOnce(endsSoon).mockImplementation(network)
            await mountPage()
            await advance(5_000)
            expect(h.get).toHaveBeenCalledTimes(2)
            wrapper!.unmount()
            wrapper = undefined
            await advance(600_000)
            expect(h.get).toHaveBeenCalledTimes(2)
        })

        it('theScoreboardKnowsWhenTheContestEnds', async () => {
            const w = await mountPage()
            const tab = w.findAll('[role="tab"]').find((t) => t.text() === 'Scoreboard')!
            await tab.trigger('mousedown', { button: 0 })
            await flushPromises()
            expect(w.getComponent(ScoreboardStub).props('endsAt')).toBe(detail().endsAt)
            expect(w.getComponent(ScoreboardStub).props('offsetMs')).toBe(0)
        })
    })

    it('anUnknownContestSaysNotFound', async () => {
        h.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
        const w = await mountPage()
        expect(w.text()).toContain('Contest not found')
    })

    it('theReservedSlugAllSaysNotFoundWithoutReadingTheManagersList', async () => {
        const route = useRoute() as unknown as { params: { slug: string } }
        route.params.slug = 'all'
        try {
            const w = await mountPage()
            expect(w.text()).toContain('Contest not found')
            expect(h.get).not.toHaveBeenCalled()
            expect(h.ensureFreshSession).not.toHaveBeenCalled()
        } finally {
            route.params.slug = 'spring-cup'
        }
    })
})
