// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h as render } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const h = vi.hoisted(() => ({ list: vi.fn(), push: vi.fn() }))
vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    const RouterLink = define({ props: ['to'], setup: (p, { slots }) => () => r('a', { href: p.to }, slots.default?.()) })
    return { RouterLink, useRouter: () => ({ push: h.push }) }
})
vi.mock('@/services/contestService', () => ({ default: { list: h.list } }))
// The action column is its own component (EnrollmentAction.spec): here a button that reports a change.
vi.mock('@/components/contest/EnrollmentAction.vue', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    return {
        default: define({
            name: 'EnrollmentActionStub',
            props: ['contest', 'size', 'primary'],
            emits: ['changed'],
            setup: (p, { emit }) => () =>
                r('button', { 'data-test': 'action', onClick: () => emit('changed', { enrolled: true, enrolledCount: 1 }) }, 'act'),
        }),
    }
})

import ContestListPage from '@/pages/user/contest/ContestListPage.vue'

const NOW = Date.parse('2026-10-21T10:00:00Z')
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()
const summary = (over: Record<string, unknown> = {}) => ({
    slug: 'spring-cup',
    title: 'Spring cup',
    startsAt: at(3_600_000),
    endsAt: at(7_200_000),
    status: 'PUBLISHED',
    phase: 'UPCOMING',
    problemCount: 3,
    enrollment: 'REQUIRED',
    enrolledCount: 24,
    enrolled: false,
    ...over,
})
const list = (over: Record<string, unknown> = {}) => ({
    data: { data: { running: [], upcoming: [], past: [], serverTime: at(0), ...over } },
})

let wrapper: VueWrapper | undefined
const mountPage = async () => {
    wrapper = mount(ContestListPage, {
        global: { stubs: { ContestCountdown: defineComponent({ setup: () => () => render('span', 'soon') }) } },
    })
    await flushPromises()
    return wrapper
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    h.list.mockReset()
})
afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
})

describe('ContestListPage', () => {
    it('rowsShowTheKindAndTheCount', async () => {
        h.list.mockResolvedValue(list({
            upcoming: [summary()],
            running: [summary({ slug: 'open-cup', title: 'Open cup', phase: 'RUNNING', enrollment: 'OPEN', enrolledCount: 0, startsAt: at(-600_000) })],
        }))
        const w = await mountPage()
        expect(w.text()).toContain('Registration required · 24 registered')
        expect(w.text()).toContain('Open to everyone')
        expect(w.text()).not.toContain('You are registered')
    })

    it('aRegisteredContestSaysSo', async () => {
        h.list.mockResolvedValue(list({ upcoming: [summary({ enrolled: true })] }))
        const w = await mountPage()
        expect(w.text()).toContain('You are registered')
    })

    it('emptySectionsStay', async () => {
        h.list.mockResolvedValue(list({ past: [summary({ phase: 'ENDED', startsAt: at(-7_200_000), endsAt: at(-3_600_000) })] }))
        const w = await mountPage()
        expect(w.text()).toContain('No running contests')
        expect(w.text()).toContain('No upcoming contests')
        expect(w.text()).not.toContain('No past contests yet')
    })

    it('anActionChangeReloadsTheList', async () => {
        h.list.mockResolvedValue(list({ upcoming: [summary()] }))
        const w = await mountPage()
        expect(h.list).toHaveBeenCalledTimes(1)
        await w.find('[data-test="action"]').trigger('click')
        await flushPromises()
        expect(h.list).toHaveBeenCalledTimes(2)
    })
})
