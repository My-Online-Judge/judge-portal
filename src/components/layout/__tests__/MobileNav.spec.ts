// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ListChecks, ShieldCheck } from 'lucide-vue-next'

const h = vi.hoisted(() => ({ getMe: vi.fn() }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))

import MobileNav from '../MobileNav.vue'
import Header from '../Header.vue'

const Blank = { render: () => null }
const ITEMS = [
    { to: '/problems', label: 'Problems', icon: ListChecks },
    { to: '/admin', label: 'Admin', icon: ShieldCheck },
]

let router: Router
let wrapper: VueWrapper | null = null

const sheet = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Navigation"]')
const sheetLabels = () => [...(sheet()?.querySelectorAll('nav a') ?? [])].map((a) => a.textContent?.trim())

/** A window.matchMedia whose min-width queries follow `resize`, firing `change` like a browser. */
function fakeViewport(width: number) {
    const lists: { min: number; listeners: Set<(e: { matches: boolean }) => void> }[] = []
    const matchMedia = (query: string) => {
        const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
        const entry = { min, listeners: new Set<(e: { matches: boolean }) => void>() }
        lists.push(entry)
        return {
            media: query,
            get matches() {
                return width >= min
            },
            addEventListener: (_: string, l: (e: { matches: boolean }) => void) => entry.listeners.add(l),
            removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => entry.listeners.delete(l),
        }
    }
    vi.stubGlobal('matchMedia', matchMedia)
    return {
        resize(next: number) {
            width = next
            for (const { min, listeners } of lists) listeners.forEach((l) => l({ matches: width >= min }))
        },
    }
}

const mountWithRouter = async <T>(component: T, props: Record<string, unknown> = {}) => {
    wrapper = mount(component as never, {
        props,
        attachTo: document.body,
        global: { plugins: [router], stubs: { LoginModal: true, ThemeMenu: true } },
    })
    await flushPromises()
    return wrapper
}

describe('MobileNav', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        setActivePinia(createPinia())
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/problems', component: Blank },
                { path: '/contests', component: Blank },
                { path: '/admin', component: Blank },
            ],
        })
        await router.push('/problems')
        await router.isReady()
    })

    afterEach(() => {
        wrapper?.unmount()
        wrapper = null
        vi.unstubAllGlobals()
    })

    it('hamburgerIsHiddenFromMd', async () => {
        const w = await mountWithRouter(MobileNav, { items: ITEMS })
        const button = w.get('button[aria-label="Open menu"]')
        expect(button.classes()).toContain('md:hidden')
        expect(sheet()).toBeNull()
    })

    it('opensASheetWithTheSameLinks', async () => {
        h.getMe.mockResolvedValue({
            data: { data: { username: 'an.nguyen', name: 'An Nguyen', email: 'a@b.c', permissions: ['user:read'] } },
        })
        const w = await mountWithRouter(Header)
        const desktop = w.findAll('nav[aria-label="Main"] a').map((a) => a.text())
        expect(desktop).toEqual(['Problems', 'Contests', 'Admin'])

        await w.get('button[aria-label="Open menu"]').trigger('click')
        await flushPromises()

        expect(sheet()).not.toBeNull()
        expect(sheetLabels()).toEqual(desktop)
    })

    it('theContestsLinkGoesToContests', async () => {
        h.getMe.mockResolvedValue({ data: { data: { username: 'an.nguyen', name: 'An Nguyen', email: 'a@b.c', permissions: [] } } })
        const w = await mountWithRouter(Header)
        await w.get('button[aria-label="Open menu"]').trigger('click')
        await flushPromises()
        const link = [...(sheet()?.querySelectorAll('nav a') ?? [])].find((a) => a.textContent?.trim() === 'Contests')
        expect(link?.getAttribute('href')).toBe('/contests')
    })

    it('closesOnNavigation', async () => {
        const w = await mountWithRouter(MobileNav, { items: ITEMS })
        await w.get('button[aria-label="Open menu"]').trigger('click')
        await flushPromises()
        expect(sheet()).not.toBeNull()

        await router.push('/admin')
        await flushPromises()

        expect(sheet()).toBeNull()
    })

    it('closesWhenTheViewportReachesMd', async () => {
        const viewport = fakeViewport(375)
        const w = await mountWithRouter(MobileNav, { items: ITEMS })
        await w.get('button[aria-label="Open menu"]').trigger('click')
        await flushPromises()
        expect(sheet()).not.toBeNull()

        viewport.resize(600) // still below md: the sheet stays
        await flushPromises()
        expect(sheet()).not.toBeNull()

        // From md the desktop nav shows; an open sheet would be a second "Main" navigation landmark.
        viewport.resize(1024)
        await flushPromises()
        expect(sheet()).toBeNull()
        expect(document.querySelectorAll('nav[aria-label="Main"]')).toHaveLength(0)
    })
})
