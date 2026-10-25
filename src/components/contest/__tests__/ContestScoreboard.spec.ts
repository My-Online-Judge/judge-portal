// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'

const h = vi.hoisted(() => ({ scoreboard: vi.fn() }))
vi.mock('@/services/contestService', () => ({ default: { scoreboard: h.scoreboard } }))

import ContestScoreboard from '../ContestScoreboard.vue'

const RouterLink = defineComponent({
    props: ['to'],
    setup: (p, { slots }) => () => render('a', { href: p.to }, slots.default?.()),
})

const ANON_ID = 'deadbeef-1111-2222-3333-444455556666'
const board = {
    labels: ['A', 'B', 'C'],
    rows: [
        {
            rank: 1,
            user: { id: 'a1a1a1a1-0000-0000-0000-000000000000', username: 'alice', name: 'Alice Tran' },
            solved: 1,
            penalty: 55,
            problems: {
                A: { solved: true, attempts: 3, minutes: 15 },
                B: { solved: false, attempts: 2, minutes: null },
            },
        },
        {
            rank: 2,
            user: { id: ANON_ID, username: null, name: null },
            solved: 1,
            penalty: 70,
            problems: { C: { solved: true, attempts: 1, minutes: 70 } },
        },
    ],
}

let wrapper: VueWrapper | undefined
async function mountBoard(phase = 'RUNNING', more: Record<string, unknown> = {}) {
    wrapper = mount(ContestScoreboard, { props: { slug: 'spring-cup', phase, ...more }, global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
}
// Faking again is a no-op while the setTimeout-only fake of beforeEach is installed.
const fakeTheClockToo = () => {
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
}
const cell = (row: number, label: string) => wrapper!.findAll('tbody tr')[row]!.get(`td[data-label="${label}"]`)
// What a sighted reader sees in a cell; screen readers get a sentence instead.
const shown = (row: number, label: string) => cell(row, label).find('[aria-hidden="true"]').text()

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    h.scoreboard.mockResolvedValue({ data: { data: board } })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('ContestScoreboard', () => {
    it('pollsEvery15Seconds', async () => {
        await mountBoard()
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
        expect(h.scoreboard).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup')
        await vi.advanceTimersByTimeAsync(14_999)
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(h.scoreboard).toHaveBeenCalledTimes(2)
        await vi.advanceTimersByTimeAsync(15_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(3)
    })

    it('pausesWhileTheTabIsHiddenAndReadsAgainWhenShown', async () => {
        let state: DocumentVisibilityState = 'visible'
        const spy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
        const turn = (next: DocumentVisibilityState) => {
            state = next
            document.dispatchEvent(new Event('visibilitychange'))
        }
        try {
            await mountBoard()
            expect(h.scoreboard).toHaveBeenCalledTimes(1)
            turn('hidden')
            await vi.advanceTimersByTimeAsync(120_000)
            expect(h.scoreboard).toHaveBeenCalledTimes(1)

            // Shown again: read at once, then every 15 s as before.
            turn('visible')
            await flushPromises()
            expect(h.scoreboard).toHaveBeenCalledTimes(2)
            await vi.advanceTimersByTimeAsync(15_000)
            expect(h.scoreboard).toHaveBeenCalledTimes(3)

            // A read that is in flight when the tab hides schedules nothing after it.
            let answerIt!: (v: unknown) => void
            h.scoreboard.mockImplementationOnce(() => new Promise((resolve) => (answerIt = resolve)))
            await vi.advanceTimersByTimeAsync(15_000)
            expect(h.scoreboard).toHaveBeenCalledTimes(4)
            turn('hidden')
            answerIt({ data: { data: board } })
            await vi.advanceTimersByTimeAsync(120_000)
            expect(h.scoreboard).toHaveBeenCalledTimes(4)
        } finally {
            spy.mockRestore()
        }
    })

    it('stopsListeningOnUnmount', async () => {
        await mountBoard()
        wrapper!.unmount()
        wrapper = undefined
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.advanceTimersByTimeAsync(60_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
    })

    it('stopsPollingOnUnmount', async () => {
        await mountBoard()
        wrapper!.unmount()
        wrapper = undefined
        await vi.advanceTimersByTimeAsync(60_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
    })

    it('rendersCells', async () => {
        await mountBoard()
        // Solved on the third try at minute 15: "+2" over "15".
        expect(shown(0, 'A')).toMatch(/^\+2\s*15$/)
        expect(cell(0, 'A').get('.sr-only').text()).toBe('Solved at minute 15 after 2 wrong tries')
        // Two wrong tries: "-2", with an ASCII hyphen-minus.
        expect(shown(0, 'B')).toBe('-2')
        expect(cell(0, 'B').get('.sr-only').text()).toBe('2 wrong tries, not solved')
        // Nothing tried: an empty cell.
        expect(cell(0, 'C').text()).toBe('')
        // First try: a bare "+".
        expect(shown(1, 'C')).toMatch(/^\+\s*70$/)
        expect(cell(1, 'C').get('.sr-only').text()).toBe('Solved at minute 70')
        const first = wrapper!.findAll('tbody tr')[0]!
        expect(first.text()).toContain('alice')
        expect(first.get('td[data-col="solved"]').text()).toBe('1')
        expect(first.get('td[data-col="penalty"]').text()).toBe('55')
        expect(first.get('a').attributes('href')).toBe('/u/alice')
    })

    it('rankAndContestantStayInViewWhenTheTableScrolls', async () => {
        const w = await mountBoard()
        const [rank, user] = w.findAll('thead th')
        const first = w.findAll('tbody tr')[0]!
        for (const el of [rank!, first.get('td[data-col="rank"]')]) expect(el.classes()).toEqual(expect.arrayContaining(['sticky', 'left-0']))
        for (const el of [user!, first.get('td[data-col="user"]')]) expect(el.classes()).toEqual(expect.arrayContaining(['sticky', 'left-16']))
        // Body cells cover what scrolls under them.
        expect(first.get('td[data-col="rank"]').classes()).toContain('bg-card')
        expect(first.get('td[data-col="user"]').classes()).toContain('bg-card')
    })

    it('unknownUserShowsContestantAndTheIdPrefix', async () => {
        await mountBoard()
        const second = wrapper!.findAll('tbody tr')[1]!
        expect(second.get('td[data-col="user"]').text()).toBe('Contestant deadbeef')
        expect(second.text()).not.toContain(ANON_ID)
        expect(second.find('a').exists()).toBe(false)
    })

    it('aUserWithoutAPublicUsernameShowsTheNameAndLinksByIdNeverTheEmail', async () => {
        const GOOGLE_ID = 'b2b2b2b2-0000-0000-0000-000000000000'
        h.scoreboard.mockResolvedValue({
            data: {
                data: {
                    labels: ['A'],
                    rows: [
                        // Identity answers null for a Google account, whose username is its email address.
                        { rank: 1, user: { id: GOOGLE_ID, username: null, name: 'Bình Lê' }, solved: 0, penalty: 0, problems: {} },
                        // An email that still arrives (an older identity) is never shown or linked.
                        { rank: 2, user: { id: ANON_ID, username: 'cuong@gmail.com', name: 'Cường' }, solved: 0, penalty: 0, problems: {} },
                    ],
                },
            },
        })
        const w = await mountBoard()
        const [first, second] = w.findAll('tbody tr')
        expect(first!.get('td[data-col="user"]').text()).toBe('Bình Lê')
        expect(first!.get('a').attributes('href')).toBe(`/u/id/${GOOGLE_ID}`)
        expect(second!.get('td[data-col="user"]').text()).toBe('Cường')
        expect(second!.get('a').attributes('href')).toBe(`/u/id/${ANON_ID}`)
        expect(w.html()).not.toContain('@')
    })

    it('aContestThatHasNotStartedShowsTheLabelsAndIsReadOnce', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: { labels: ['A', 'B'], rows: [] } } })
        const w = await mountBoard('UPCOMING')
        expect(w.findAll('thead th').map((th) => th.text()).slice(-2)).toEqual(['A', 'B'])
        const only = w.findAll('tbody tr')
        expect(only).toHaveLength(1)
        expect(only[0]!.get('td').attributes('colspan')).toBe('6')
        expect(only[0]!.text()).toBe('The scoreboard fills in once the contest starts.')
        await vi.advanceTimersByTimeAsync(60_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
    })

    it('aRunningBoardWithNoRowsKeepsTheLabels', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: { labels: ['A', 'B'], rows: [] } } })
        const w = await mountBoard()
        expect(w.findAll('thead th').map((th) => th.text()).slice(-2)).toEqual(['A', 'B'])
        expect(w.get('tbody').text()).toContain('No one is on the scoreboard yet')
    })

    it('theStartOfTheContestStartsThePolling', async () => {
        const w = await mountBoard('UPCOMING')
        await w.setProps({ phase: 'RUNNING' })
        await flushPromises()
        expect(h.scoreboard).toHaveBeenCalledTimes(2)
        await vi.advanceTimersByTimeAsync(15_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(3)
    })

    it('anEndedBoardKeepsPollingForAGracePeriodThenIsFinal', async () => {
        const w = await mountBoard()
        await w.setProps({ phase: 'ENDED' })
        await flushPromises()
        expect(h.scoreboard).toHaveBeenCalledTimes(2)
        // Verdicts judged just after the end still reach the board: 2 minutes at the same 15 s cadence.
        await vi.advanceTimersByTimeAsync(120_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(2 + 8)
        await vi.advanceTimersByTimeAsync(120_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(2 + 8)
        wrapper!.unmount()

        // Opened after the end: read once.
        h.scoreboard.mockClear()
        await mountBoard('ENDED')
        await vi.advanceTimersByTimeAsync(120_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(1)
    })

    it('stopsPollingTwoMinutesAfterTheEndEvenIfThePhaseNeverChanged', async () => {
        // The page could not read the contest again at the end, so the phase it passes is still RUNNING.
        fakeTheClockToo()
        const now = Date.now()
        // The server's clock is 1 s ahead of this one.
        await mountBoard('RUNNING', { endsAt: new Date(now - 60_000).toISOString(), offsetMs: 1_000 })
        await vi.advanceTimersByTimeAsync(45_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(4)
        // The grace ends at 59 s here (60 s by the server): the read at 60 s is the last one.
        await vi.advanceTimersByTimeAsync(15_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(5)
        await vi.advanceTimersByTimeAsync(600_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(5)
    })

    it('aRunningBoardBeforeTheEndKeepsPolling', async () => {
        fakeTheClockToo()
        await mountBoard('RUNNING', { endsAt: new Date(Date.now() + 3_600_000).toISOString(), offsetMs: 0 })
        await vi.advanceTimersByTimeAsync(600_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(41)
    })

    it('theGracePeriodPausesWhileTheTabIsHidden', async () => {
        const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
        try {
            const w = await mountBoard()
            await w.setProps({ phase: 'ENDED' })
            await flushPromises()
            vis.mockReturnValue('hidden')
            document.dispatchEvent(new Event('visibilitychange'))
            h.scoreboard.mockClear()
            await vi.advanceTimersByTimeAsync(120_000)
            expect(h.scoreboard).not.toHaveBeenCalled()
        } finally {
            vis.mockRestore()
        }
    })

    it('aBackgroundPollShowsNoRefreshBar', async () => {
        const w = await mountBoard()
        h.scoreboard.mockImplementationOnce(() => new Promise(() => {}))
        await vi.advanceTimersByTimeAsync(15_000)
        expect(h.scoreboard).toHaveBeenCalledTimes(2)
        expect(w.find('[role="progressbar"]').exists()).toBe(false)
        expect(w.find('[aria-busy="true"]').exists()).toBe(false)
    })

    // ---- the redesign (contest enrollment design §5.3) ------------------------------------------------------------

    const bigBoard = {
        labels: ['A', 'B', 'C'],
        rows: [
            { rank: 1, user: { id: 'a1a1a1a1-0000-0000-0000-000000000000', username: 'alice', name: 'Alice Tran' }, solved: 2, penalty: 85,
              problems: { A: { solved: true, attempts: 1, minutes: 15 }, C: { solved: true, attempts: 2, minutes: 50 } } },
            { rank: 2, user: { id: 'b2b2b2b2-0000-0000-0000-000000000000', username: 'bob', name: null }, solved: 1, penalty: 30,
              problems: { A: { solved: true, attempts: 1, minutes: 30 }, B: { solved: false, attempts: 1, minutes: null } } },
            { rank: 3, user: { id: 'c3c3c3c3-0000-0000-0000-000000000000', username: 'carol', name: null }, solved: 0, penalty: 0, problems: {} },
        ],
    }

    it('firstSolvesAreMarkedOncePerProblem', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const w = await mountBoard()
        const firsts = w.findAll('td[data-first="true"]').map((td) => `${td.element.closest('tr')!.querySelector('td[data-col="user"] a')!.textContent!.trim()}-${td.attributes('data-label')}`)
        expect(firsts).toEqual(['alice-A', 'alice-C'])
    })

    it('theViewersRowIsCurrentAndMyRowScrollsToIt', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const scrolled = vi.fn()
        Element.prototype.scrollIntoView = scrolled
        const w = await mountBoard('RUNNING', { viewerId: 'b2b2b2b2-0000-0000-0000-000000000000' })
        const rows = w.findAll('tbody tr')
        expect(rows[1]!.attributes('aria-current')).toBe('true')
        expect(rows[0]!.attributes('aria-current')).toBeUndefined()
        const mine = w.get('[data-test="my-row"]')
        expect(mine.attributes('disabled')).toBeUndefined()
        await mine.trigger('click')
        expect(scrolled).toHaveBeenCalledOnce()
    })

    it('myRowIsDisabledWithoutARow', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const w = await mountBoard('RUNNING', { viewerId: 'zzzzzzzz-0000-0000-0000-000000000000' })
        expect(w.get('[data-test="my-row"]').attributes('disabled')).toBeDefined()
    })

    it('zeroRowsRenderAfterTheRankedOnes', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const w = await mountBoard()
        const ranks = w.findAll('tbody tr').map((tr) => tr.get('td[data-col="rank"]').text())
        expect(ranks).toEqual(['1', '2', '—'])
    })

    it('searchFiltersRows', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const w = await mountBoard()
        await w.get('input[aria-label="Find a contestant"]').setValue('ALI')
        const users = w.findAll('tbody tr').map((tr) => tr.get('td[data-col="user"] a').text())
        expect(users).toEqual(['alice'])
    })

    it('theStatusLineShowsTheAge', async () => {
        fakeTheClockToo()
        vi.setSystemTime(new Date('2026-10-21T10:00:00Z'))
        const w = await mountBoard()
        expect(w.get('[data-test="board-status"]').text()).toMatch(/Live · updated 0s ago/)
        vi.advanceTimersByTime(12_000)
        await flushPromises()
        expect(w.get('[data-test="board-status"]').text()).toMatch(/Live · updated 12s ago/)
    })

    it('anEndedBoardSaysFinalStandings', async () => {
        const w = await mountBoard('ENDED', { endsAt: new Date(Date.now() - 10 * 60_000).toISOString() })
        expect(w.get('[data-test="board-status"]').text()).toContain('Final standings')
    })

    it('labelsLinkToProblemsOnlyWhenAllowed', async () => {
        const allowed = await mountBoard('RUNNING', { canOpenProblems: true })
        expect(allowed.get('thead a[href="/contests/spring-cup/problems/A"]').exists()).toBe(true)
        allowed.unmount()
        wrapper = undefined
        const hidden = await mountBoard('RUNNING', { canOpenProblems: false })
        expect(hidden.find('thead a').exists()).toBe(false)
    })

    it('theSummaryLineCountsContestantsAndSolvers', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: bigBoard } })
        const w = await mountBoard()
        const summary = w.get('[data-test="board-summary"]').text()
        expect(summary).toContain('3 contestants')
        expect(summary).toContain('2 solved at least one')
        expect(summary).toContain('first solve: A by alice at 15')
    })
})
