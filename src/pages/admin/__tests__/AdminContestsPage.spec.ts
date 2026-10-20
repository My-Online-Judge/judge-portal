// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    list: vi.fn(),
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
vi.mock('@/services/contestService', () => ({ default: { list: h.list, remove: h.remove } }))
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
import { useAuthStore } from '@/stores/auth'

const contest = (slug: string, title: string, status: string, phase: string, problemCount = 3) => ({
    slug, title, status, phase, problemCount, startsAt: '2026-10-21T02:00:00Z', endsAt: '2026-10-21T04:00:00Z',
})
const running = contest('spring-cup', 'Spring cup', 'PUBLISHED', 'RUNNING')
const draft = contest('autumn-cup', 'Autumn cup', 'DRAFT', 'UPCOMING', 1)
const past = contest('summer-cup', 'Summer cup', 'PUBLISHED', 'ENDED', 26)
const answer = (over: Record<string, unknown> = {}) => ({
    data: { data: { running: [running], upcoming: [draft], past: [past], serverTime: '2026-10-21T03:00:00Z', ...over } },
})

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
    h.list.mockImplementation(async () => answer())
    h.remove.mockResolvedValue({})
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('AdminContestsPage', () => {
    it('listsDraftsAndPublished', async () => {
        await mountPage()
        // Drafts come only with a valid token (the list is public and lenient): refresh first.
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.list.mock.invocationCallOrder[0]!)
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
        expect(wrapper!.text()).not.toContain('Showing the')
    })

    it('saysSoWhenTheListIsCapped', async () => {
        const many = Array.from({ length: 50 }, (_, i) => contest(`old-${i}`, `Old ${i}`, 'PUBLISHED', 'ENDED'))
        h.list.mockImplementation(async () => answer({ past: many }))
        await mountPage()
        expect(wrapper!.text()).toContain('Showing the 50 most recently ended contests. Older ones are not listed.')
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
        expect(h.list).toHaveBeenCalledTimes(2)
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
        expect(h.list).toHaveBeenCalledTimes(2)
    })

    it('conflictToastsTheApiMessage', async () => {
        const message = 'This contest has started: its problems and start time are locked and it cannot be deleted'
        h.remove.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message } } })
        await mountPage()
        // A published contest that has started: the way out is to set it to Draft.
        await askToDelete('Spring cup')
        button('Delete contest')!.click()
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith(message, { description: 'Set it to Draft first to delete it.' })

        // Any other refusal: the API's message alone.
        h.error.mockClear()
        await askToDelete('Autumn cup')
        button('Delete contest')!.click()
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith(message, {})
    })

    it('aFailedListOffersARetry', async () => {
        h.list.mockRejectedValueOnce(new Error('Network Error'))
        await mountPage()
        expect(wrapper!.text()).toContain("Couldn't load this list")
        button('Retry')!.click()
        await flushPromises()
        expect(h.list).toHaveBeenCalledTimes(2)
        expect(wrapper!.text()).toContain('Spring cup')
    })
})
