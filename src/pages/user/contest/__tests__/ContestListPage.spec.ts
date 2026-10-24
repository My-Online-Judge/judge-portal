// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const h = vi.hoisted(() => ({
    list: vi.fn(),
    push: vi.fn(),
}))

vi.mock('vue-router', async () => {
    const { defineComponent, h: render } = await import('vue')
    // A plain anchor that, like the real one, takes the click over (preventDefault) and pushes by itself:
    // the row handler must not repeat that, so the mock leaves the push out and the spec counts the row's.
    const RouterLink = defineComponent({
        props: ['to'],
        setup: (p, { slots, attrs }) => () =>
            render('a', { ...attrs, href: p.to, onClick: (e: Event) => e.preventDefault() }, slots.default?.()),
    })
    return { useRouter: () => ({ push: h.push }), RouterLink }
})
vi.mock('@/services/contestService', () => ({ default: { list: h.list } }))

import { RouterLink } from 'vue-router'
import ContestListPage from '../ContestListPage.vue'

const NOW = Date.parse('2026-10-21T10:00:00Z')
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()
const summary = (slug: string, title: string, phase: 'RUNNING' | 'UPCOMING' | 'ENDED', over: Record<string, unknown> = {}) => ({
    slug,
    title,
    startsAt: at(phase === 'UPCOMING' ? 3_600_000 : -3_600_000),
    endsAt: at(phase === 'ENDED' ? -600_000 : 7_200_000),
    status: 'PUBLISHED',
    phase,
    problemCount: 3,
    ...over,
})
const payload = () => ({
    running: [summary('spring-cup', 'Spring cup', 'RUNNING'), summary('night-owl', 'Cuộc thi đêm', 'RUNNING')],
    upcoming: [summary('summer-open', 'Summer open', 'UPCOMING', { status: 'DRAFT' })],
    past: [summary('winter-1', 'Winter one', 'ENDED'), summary('winter-2', 'Winter two', 'ENDED')],
    serverTime: at(0),
})

let wrapper: VueWrapper | undefined
async function mountPage() {
    // PageHeader resolves RouterLink globally.
    wrapper = mount(ContestListPage, { attachTo: document.body, global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
}
const rows = () => wrapper!.findAll('tbody tr')
const rowOf = (slug: string) => rows().find((tr) => tr.get('a').attributes('href') === `/contests/${slug}`)!

beforeEach(() => {
    h.list.mockResolvedValue({ data: { data: payload() } })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
    window.getSelection()?.removeAllRanges()
})

describe('ContestListPage rows', () => {
    it('contestRowHasOneLinkToItsContest', async () => {
        await mountPage()
        expect(rows()).toHaveLength(5)
        for (const [i, slug] of ['spring-cup', 'night-owl', 'summer-open', 'winter-1', 'winter-2'].entries()) {
            const links = rows()[i]!.findAll('a')
            expect(links).toHaveLength(1)
            expect(links[0]!.attributes('href')!.endsWith(`/contests/${slug}`)).toBe(true)
        }
    })

    it('contestRowsDoNotNeedAPositionedRowForTheirLink', async () => {
        await mountPage()
        // WebKit ignores position: relative on a tr, so an ::after overlay on the link would resolve against the table wrapper.
        for (const tr of rows()) {
            expect(tr.classes()).not.toContain('relative')
            expect(tr.get('a').classes().some((c) => c.startsWith('after:'))).toBe(false)
        }
    })

    it('contestRowOpensOnAClickInAnyCell', async () => {
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
        await mountPage()
        const cell = rowOf('spring-cup').findAll('td')[1]!
        for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
            await cell.trigger('click', init)
        }
        expect(h.push).not.toHaveBeenCalled()
    })

    it('contestRowDoesNotRepeatTheLinksOwnNavigation', async () => {
        await mountPage()
        await rowOf('spring-cup').get('a').trigger('click')
        expect(h.push).not.toHaveBeenCalled()
    })

    it('contestRowDoesNotOpenWhileTextIsSelected', async () => {
        await mountPage()
        const cell = rowOf('winter-1').findAll('td')[0]!
        window.getSelection()!.selectAllChildren(cell.element)
        expect(window.getSelection()!.toString()).not.toBe('')
        await cell.trigger('click')
        expect(h.push).not.toHaveBeenCalled()
    })
})
