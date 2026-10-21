// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    listAll: vi.fn(),
    remove: vi.fn(),
    ensureFreshSession: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    const RouterLink = define({ props: ['to'], setup: (p, { slots }) => () => r('a', { href: p.to }, slots.default?.()) })
    return { RouterLink }
})
vi.mock('@/services/contestService', () => ({ default: { listAll: h.listAll, remove: h.remove } }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/refreshSession')>()),
    ensureFreshSession: h.ensureFreshSession,
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: h.success, error: h.error }) }))
vi.mock('@/components/admin/contest/ContestFormDialog.vue', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    return {
        default: define({
            name: 'ContestFormDialogStub',
            props: { open: Boolean, slug: { type: String, default: null } },
            emits: ['update:open', 'saved'],
            setup: () => () => r('div', { 'data-test': 'contest-dialog' }),
        }),
    }
})

import { RouterLink } from 'vue-router'
import AdminContestsPage from '../AdminContestsPage.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import { useAuthStore } from '@/stores/auth'

const contest = (slug: string, title: string, status: string, phase: string, problemCount = 3) => ({
    slug, title, status, phase, problemCount, startsAt: '2026-10-21T02:00:00Z', endsAt: '2026-10-21T04:00:00Z',
})
const running = contest('spring-cup', 'Spring cup', 'PUBLISHED', 'RUNNING')
const draft = contest('autumn-cup', 'Autumn cup', 'DRAFT', 'UPCOMING', 1)
const past = contest('summer-cup', 'Summer cup', 'PUBLISHED', 'ENDED', 26)

// The server's side of GET /contests/all: the rows it holds, sliced into the requested page.
let rows: ReturnType<typeof contest>[] = []
const serve = async (_signal: AbortSignal, params: { page?: number; size?: number; q?: string }) => {
    const page = params.page ?? 0
    const size = params.size ?? 20
    const q = params.q?.toLowerCase()
    const hits = q ? rows.filter((r) => r.slug.includes(q) || r.title.toLowerCase().includes(q)) : rows
    const totalPages = Math.ceil(hits.length / size)
    return {
        data: {
            data: hits.slice(page * size, (page + 1) * size),
            pagination: {
                page, size, totalElements: hits.length, totalPages,
                hasPrev: page > 0, hasNext: page + 1 < totalPages,
                prevPage: page > 0 ? page - 1 : null, nextPage: page + 1 < totalPages ? page + 1 : null,
            },
        },
    }
}
const many = (n: number) => Array.from({ length: n }, (_, i) => contest(`c-${i}`, `Contest ${i}`, 'DRAFT', 'UPCOMING'))

let wrapper: VueWrapper | undefined
async function mountPage(permissions = ['contest:create', 'contest:update', 'contest:delete']) {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'me', permissions } as never
    wrapper = mount(AdminContestsPage, { attachTo: document.body, global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
}
const row = (title: string) => wrapper!.findAll('tbody tr').find((tr) => tr.text().includes(title))!
const cells = (title: string) => row(title).findAll('td').map((td) => td.text().replace(/\s+/g, ' ').trim())
const button = (name: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined
const menuItems = () => [...document.body.querySelectorAll('[role="menuitem"]')].map((e) => e.textContent?.trim())
const menuItem = (t: string) =>
    [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === t) as HTMLElement
async function next() {
    const nextButton = wrapper!.findAll('button').find((b) => b.text() === 'Next')!
    await nextButton.trigger('click')
    await flushPromises()
}
async function openMenu(title: string) {
    await wrapper!.get(`button[aria-label="Actions for ${title}"]`).trigger('click')
    await nextTick()
    await nextTick()
}
async function askToDelete(title: string) {
    await openMenu(title)
    menuItem('Delete…').click()
    await flushPromises()
}

beforeEach(() => {
    h.ensureFreshSession.mockResolvedValue(undefined)
    rows = [running, draft, past]
    h.listAll.mockImplementation(serve)
    h.remove.mockImplementation(async (slug: string) => {
        rows = rows.filter((r) => r.slug !== slug)
        return {}
    })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    // The debounce tests fake setTimeout; a failed assertion must not leave it faked for the next test.
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('AdminContestsPage', () => {
    it('listsDraftsAndPublished', async () => {
        await mountPage()
        // The endpoint needs a valid token, so the session is refreshed first.
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.listAll.mock.invocationCallOrder[0]!)
        expect(wrapper!.findAll('thead th').map((th) => th.text())).toEqual(
            ['Title', 'Status', 'Phase', 'Starts', 'Ends', 'Problems', 'Actions'],
        )
        expect(wrapper!.findAll('tbody tr').map((tr) => tr.find('td').text())).toEqual([
            'Spring cupspring-cup', 'Autumn cupautumn-cup', 'Summer cupsummer-cup',
        ])
        expect(cells('Spring cup').slice(1, 3)).toEqual(['Published', 'Running'])
        expect(cells('Autumn cup').slice(1, 3)).toEqual(['Draft', 'Upcoming'])
        expect(cells('Summer cup').slice(1, 3)).toEqual(['Published', 'Ended'])
        expect(cells('Summer cup')[5]).toBe('26')
        // The title opens the contest's public page.
        expect(row('Autumn cup').get('a').attributes('href')).toBe('/contests/autumn-cup')
        expect(button('New contest')).toBeTruthy()
    })

    it('listsThePageFromTheAdminEndpoint', async () => {
        await mountPage()
        expect(h.listAll).toHaveBeenCalledTimes(1)
        expect(h.listAll).toHaveBeenCalledWith(expect.any(AbortSignal), { page: 0, size: 20 })
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.listAll.mock.invocationCallOrder[0]!)
    })

    it('pagesThroughEveryContest', async () => {
        rows = many(55)
        await mountPage()
        expect(wrapper!.findAll('tbody tr')).toHaveLength(20)
        expect(wrapper!.text()).toContain('Page 1 of 3')
        await next()
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 1, size: 20 })
        expect(wrapper!.text()).toContain('Page 2 of 3')
        await next()
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 2, size: 20 })
        expect(wrapper!.findAll('tbody tr')).toHaveLength(15)
        expect(wrapper!.find('td').text()).toContain('Contest 40')
    })

    it('aNewPageSizeReturnsToTheFirstPage', async () => {
        rows = many(55)
        await mountPage()
        await next()
        wrapper!.findComponent(PaginationFooter).vm.$emit('update:size', 50)
        await flushPromises()
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 0, size: 50 })
    })

    it('searchResetsToPageOne', async () => {
        rows = many(55)
        await mountPage()
        await next()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        const input = wrapper!.get('input[type="search"]')
        expect(input.attributes('placeholder')).toBe('Search slug or title')
        expect(input.attributes('aria-label')).toBe('Search contests')
        h.listAll.mockClear()
        await input.setValue('Contest 4')
        // Typing alone asks for nothing: the search waits 300 ms for more keys.
        vi.advanceTimersByTime(299)
        expect(h.listAll).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        vi.useRealTimers()
        await flushPromises()
        expect(h.listAll).toHaveBeenCalledTimes(1)
        expect(h.listAll).toHaveBeenCalledWith(expect.any(AbortSignal), { page: 0, size: 20, q: 'Contest 4' })
        expect(wrapper!.findAll('tbody tr').map((tr) => tr.find('td').text())).toEqual([
            'Contest 4c-4', 'Contest 40c-40', 'Contest 41c-41', 'Contest 42c-42', 'Contest 43c-43',
            'Contest 44c-44', 'Contest 45c-45', 'Contest 46c-46', 'Contest 47c-47', 'Contest 48c-48', 'Contest 49c-49',
        ])
    })

    it('aSearchWithNoHitsSaysSo', async () => {
        await mountPage()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        await wrapper!.get('input[type="search"]').setValue('zzz')
        vi.advanceTimersByTime(300)
        vi.useRealTimers()
        await flushPromises()
        expect(wrapper!.findAll('tbody tr')).toHaveLength(0)
        expect(wrapper!.text()).toContain('“zzz”')
        expect(wrapper!.text()).not.toContain('No contests yet')
    })

    it('noCapNoteAnyMore', async () => {
        rows = many(120)
        await mountPage()
        expect(wrapper!.text()).not.toContain('Showing the')
        expect(wrapper!.text()).not.toContain('not listed')
    })

    it('aDeleteOnTheLastRowOfTheLastPageStepsBack', async () => {
        rows = many(41)
        await mountPage()
        await next()
        await next()
        expect(wrapper!.findAll('tbody tr')).toHaveLength(1)
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 2, size: 20 })
        await askToDelete('Contest 40')
        button('Delete contest')!.click()
        await flushPromises()
        expect(h.remove).toHaveBeenCalledWith('c-40')
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 1, size: 20 })
        expect(wrapper!.findAll('tbody tr')).toHaveLength(20)
    })

    it('aDeleteOnAMiddleRowReloadsTheSamePage', async () => {
        rows = many(41)
        await mountPage()
        await next()
        await askToDelete('Contest 25')
        button('Delete contest')!.click()
        await flushPromises()
        expect(h.listAll).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 1, size: 20 })
    })

    it('menuItemsFollowThePermissions', async () => {
        await mountPage(['contest:update'])
        expect(button('New contest')).toBeUndefined()
        await openMenu('Autumn cup')
        expect(menuItems()).toEqual(['Edit'])
    })

    it('editOpensTheDialogAndASaveReloads', async () => {
        await mountPage()
        await openMenu('Autumn cup')
        menuItem('Edit').click()
        await flushPromises()
        const dialog = wrapper!.findComponent({ name: 'ContestFormDialogStub' })
        expect(dialog.props()).toEqual({ open: true, slug: 'autumn-cup' })
        dialog.vm.$emit('saved', { ...draft, title: 'Autumn cup 2026' })
        await flushPromises()
        expect(h.success).toHaveBeenCalledWith('Contest saved')
        expect(h.listAll).toHaveBeenCalledTimes(2)
    })

    it('newContestOpensAnEmptyDialog', async () => {
        await mountPage()
        button('New contest')!.click()
        await flushPromises()
        expect(wrapper!.findComponent({ name: 'ContestFormDialogStub' }).props()).toEqual({ open: true, slug: null })
    })

    it('deleteConfirmsThenCalls', async () => {
        await mountPage()
        await askToDelete('Autumn cup')
        expect(h.remove).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('Delete contest “Autumn cup”?')
        expect(document.body.querySelector('[data-slot="confirm-icon"]')!.getAttribute('data-tone')).toBe('destructive')
        const confirm = button('Delete contest')!
        confirm.click()
        confirm.click()
        await flushPromises()
        expect(h.remove).toHaveBeenCalledTimes(1)
        expect(h.remove).toHaveBeenCalledWith('autumn-cup')
        expect(h.success).toHaveBeenCalledWith('Contest deleted', { description: '“Autumn cup”' })
        expect(h.listAll).toHaveBeenCalledTimes(2)
    })

    it('deleteOfAStartedPublishedContestIsDisabledWithGuidance', async () => {
        await mountPage()
        for (const title of ['Spring cup', 'Summer cup']) {
            await openMenu(title)
            const item = menuItem('Delete…')
            expect(item.getAttribute('aria-label')).toBe('Delete…. Set it to Draft first, then delete')
            expect(item.hasAttribute('data-disabled')).toBe(true)
            item.click()
            await flushPromises()
            expect(document.body.textContent).not.toContain('Delete contest “')
            expect(h.remove).not.toHaveBeenCalled()
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
            await nextTick()
        }
    })

    it('aDraftsPhaseIsNotShownAsLive', async () => {
        rows = [contest('d', 'Open draft', 'DRAFT', 'RUNNING')]
        await mountPage()
        const phase = row('Open draft').findAll('td')[2]!
        expect(phase.classes()).not.toContain('text-success-ink')
    })

    it('aDraftCanBeDeleted', async () => {
        await mountPage()
        await openMenu('Autumn cup')
        expect(menuItem('Delete…').hasAttribute('data-disabled')).toBe(false)
    })

    it('conflictToastsTheApiMessageWithTheHintForAStaleRow', async () => {
        const message = 'This contest has started: its problems and start time are locked and it cannot be deleted'
        h.remove.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message } } })
        await mountPage()
        // The row said Draft; the contest was published and started since.
        await askToDelete('Autumn cup')
        button('Delete contest')!.click()
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith(message, { description: 'Set it to Draft first to delete it.' })
    })

    it('aFailedListOffersARetry', async () => {
        h.listAll.mockRejectedValueOnce(new Error('Network Error'))
        await mountPage()
        expect(wrapper!.text()).toContain("Couldn't load this list")
        button('Retry')!.click()
        await flushPromises()
        expect(h.listAll).toHaveBeenCalledTimes(2)
        expect(wrapper!.text()).toContain('Spring cup')
    })
})
