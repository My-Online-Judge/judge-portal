// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h as render } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({ list: vi.fn(), push: vi.fn() }))
vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    // A plain anchor that, like the real one, takes the click over (preventDefault) and pushes by itself:
    // the row handler must not repeat that, so the mock leaves the push out and the spec counts the row's.
    const RouterLink = define({
        props: ['to'],
        setup: (p, { slots, attrs }) => () =>
            r('a', { ...attrs, href: p.to, onClick: (e: Event) => e.preventDefault() }, slots.default?.()),
    })
    return { RouterLink, useRouter: () => ({ push: h.push }) }
})
vi.mock('@/services/authService', () => ({ default: { getMe: vi.fn(), logout: vi.fn() } }))
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

import { RouterLink } from 'vue-router'
import ContestListPage from '@/pages/user/contest/ContestListPage.vue'
import { useAuthStore } from '@/stores/auth'

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

// Five rows over the three sections, for the row-click tests.
const rowsPayload = () => list({
    running: [
        summary({ slug: 'spring-cup', title: 'Spring cup', phase: 'RUNNING', startsAt: at(-3_600_000) }),
        summary({ slug: 'night-owl', title: 'Cuộc thi đêm', phase: 'RUNNING', startsAt: at(-3_600_000) }),
    ],
    upcoming: [summary({ slug: 'summer-open', title: 'Summer open', status: 'DRAFT' })],
    past: [
        summary({ slug: 'winter-1', title: 'Winter one', phase: 'ENDED', startsAt: at(-3_600_000), endsAt: at(-600_000) }),
        summary({ slug: 'winter-2', title: 'Winter two', phase: 'ENDED', startsAt: at(-3_600_000), endsAt: at(-600_000) }),
    ],
})

let wrapper: VueWrapper | undefined
const mountPage = async () => {
    setActivePinia(createPinia())
    wrapper = mount(ContestListPage, {
        attachTo: document.body,
        global: {
            components: { RouterLink },
            stubs: { ContestCountdown: defineComponent({ setup: () => () => render('span', 'soon') }) },
        },
    })
    await flushPromises()
    return wrapper
}
const rows = () => wrapper!.findAll('tbody tr')
const rowOf = (slug: string) => rows().find((tr) => tr.get('a').attributes('href') === `/contests/${slug}`)!

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    h.list.mockReset()
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
    window.getSelection()?.removeAllRanges()
})

describe('ContestListPage', () => {
    it('rowsShowTheKindAndTheCount', async () => {
        h.list.mockResolvedValue(list({
            upcoming: [summary()],
            running: [summary({ slug: 'open-cup', title: 'Open cup', phase: 'RUNNING', enrollment: 'OPEN', enrolledCount: 0, startsAt: at(-600_000) })],
        }))
        const w = await mountPage()
        expect(w.text()).toContain('Registration required, 24 registered')
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

    it('signingInReloadsTheList', async () => {
        // "Log in to register" signs the viewer in on this page: the rows must learn whether they are registered.
        h.list.mockResolvedValue(list({ upcoming: [summary()] }))
        await mountPage()
        expect(h.list).toHaveBeenCalledTimes(1)
        useAuthStore().user = { id: 'u1', username: 'alice', permissions: [] } as never
        await flushPromises()
        expect(h.list).toHaveBeenCalledTimes(2)
    })

    it('anActionChangeReloadsTheList', async () => {
        h.list.mockResolvedValue(list({ upcoming: [summary()] }))
        const w = await mountPage()
        expect(h.list).toHaveBeenCalledTimes(1)
        await w.find('[data-test="action"]').trigger('click')
        await flushPromises()
        expect(h.list).toHaveBeenCalledTimes(2)
    })

    // ---- rows: the whole row opens the contest, the title link stays its one link -------------------------------

    it('contestRowHasOneLinkToItsContest', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        expect(rows()).toHaveLength(5)
        for (const [i, slug] of ['spring-cup', 'night-owl', 'summer-open', 'winter-1', 'winter-2'].entries()) {
            const links = rows()[i]!.findAll('a')
            expect(links).toHaveLength(1)
            expect(links[0]!.attributes('href')!.endsWith(`/contests/${slug}`)).toBe(true)
        }
    })

    it('contestRowsDoNotNeedAPositionedRowForTheirLink', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        // WebKit ignores position: relative on a tr, so an ::after overlay on the link would resolve against the table wrapper.
        for (const tr of rows()) {
            expect(tr.classes()).not.toContain('relative')
            expect(tr.get('a').classes().some((c) => c.startsWith('after:'))).toBe(false)
        }
    })

    it('contestRowOpensOnAClickInAnyCell', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        // A cell that is not the link: the status column of the second running contest.
        await rowOf('night-owl').findAll('td')[1]!.trigger('click')
        expect(h.push).toHaveBeenCalledTimes(1)
        expect(h.push).toHaveBeenCalledWith('/contests/night-owl')

        // The last row of the last section opens its own contest, not its section's.
        await rowOf('winter-2').findAll('td')[0]!.trigger('click')
        expect(h.push).toHaveBeenLastCalledWith('/contests/winter-2')
        await rowOf('spring-cup').trigger('click')
        expect(h.push).toHaveBeenLastCalledWith('/contests/spring-cup')
        expect(h.push).toHaveBeenCalledTimes(3)
    })

    it('contestRowLeavesModifiedAndNonPrimaryClicksAlone', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        const cell = rowOf('spring-cup').findAll('td')[1]!
        for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
            await cell.trigger('click', init)
        }
        expect(h.push).not.toHaveBeenCalled()
    })

    it('contestRowDoesNotRepeatTheLinksOwnNavigation', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        await rowOf('spring-cup').get('a').trigger('click')
        expect(h.push).not.toHaveBeenCalled()
        // The action column is the row's second control: its click is its own too.
        await rowOf('spring-cup').get('[data-test="action"]').trigger('click')
        await flushPromises()
        expect(h.push).not.toHaveBeenCalled()
    })

    it('contestRowDoesNotOpenWhileTextIsSelected', async () => {
        h.list.mockResolvedValue(rowsPayload())
        await mountPage()
        const cell = rowOf('winter-1').findAll('td')[0]!
        window.getSelection()!.selectAllChildren(cell.element)
        expect(window.getSelection()!.toString()).not.toBe('')
        await cell.trigger('click')
        expect(h.push).not.toHaveBeenCalled()
    })
})
