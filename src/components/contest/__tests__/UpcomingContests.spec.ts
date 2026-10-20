// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'

const h = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/services/contestService', () => ({ default: { list: h.list } }))

import UpcomingContests from '../UpcomingContests.vue'

const RouterLink = defineComponent({
    props: ['to'],
    setup: (p, { slots }) => () => render('a', { href: p.to }, slots.default?.()),
})

const NOW = Date.parse('2026-10-21T10:00:00Z')
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()
const contest = (slug: string, phase: string, startsIn: number, length = 7_200_000) => ({
    slug,
    title: `Contest ${slug}`,
    startsAt: at(startsIn),
    endsAt: at(startsIn + length),
    status: 'PUBLISHED',
    phase,
    problemCount: 3,
})

let wrapper: VueWrapper | undefined
async function mountCard() {
    wrapper = mount(UpcomingContests, { global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('UpcomingContests', () => {
    it('showsAtMostThreeRunningFirst', async () => {
        h.list.mockResolvedValue({
            data: {
                data: {
                    running: [contest('live-cup', 'RUNNING', -600_000)],
                    upcoming: [
                        contest('next-1', 'UPCOMING', 3_723_000),
                        contest('next-2', 'UPCOMING', 93_784_000),
                        contest('next-3', 'UPCOMING', 200_000_000),
                    ],
                    past: [contest('old', 'ENDED', -90_000_000)],
                    serverTime: at(0),
                },
            },
        })
        const w = await mountCard()
        expect(w.text()).toContain('Upcoming contests')
        const items = w.findAll('li')
        expect(items).toHaveLength(3)
        expect(items.map((li) => li.get('a').attributes('href'))).toEqual([
            '/contests/live-cup',
            '/contests/next-1',
            '/contests/next-2',
        ])
        expect(items[0]!.text()).toContain('Live')
        expect(items[0]!.text()).toContain('Ends in')
        expect(items[1]!.text()).not.toContain('Live')
        expect(items[1]!.text()).toContain('Starts in 01:02:03')
        expect(items[2]!.text()).toContain('Starts in 1d 02:03:04')
    })

    it('isHiddenWhenThereIsNothingToShow', async () => {
        h.list.mockResolvedValue({
            data: { data: { running: [], upcoming: [], past: [contest('old', 'ENDED', -90_000_000)], serverTime: at(0) } },
        })
        const w = await mountCard()
        expect(w.find('section').exists()).toBe(false)
        expect(w.text()).toBe('')
    })

    it('isHiddenWhenTheListFails', async () => {
        h.list.mockRejectedValue(new Error('down'))
        const w = await mountCard()
        expect(w.text()).toBe('')
    })
})
