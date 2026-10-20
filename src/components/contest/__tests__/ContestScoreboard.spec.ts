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
async function mountBoard() {
    wrapper = mount(ContestScoreboard, { props: { slug: 'spring-cup' }, global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
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

    it('unknownUserShowsTheIdPrefix', async () => {
        await mountBoard()
        const second = wrapper!.findAll('tbody tr')[1]!
        expect(second.text()).toContain('deadbeef')
        expect(second.text()).not.toContain(ANON_ID)
        expect(second.find('a').exists()).toBe(false)
    })

    it('aContestThatHasNotStartedShowsTheLabelsAndNoRows', async () => {
        h.scoreboard.mockResolvedValue({ data: { data: { labels: ['A', 'B'], rows: [] } } })
        const w = await mountBoard()
        expect(w.findAll('tbody tr')).toHaveLength(0)
        expect(w.text()).toContain('No one is on the scoreboard yet')
    })
})
