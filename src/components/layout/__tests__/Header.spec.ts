// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({ getMe: vi.fn() }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import Header from '../Header.vue'

const mountHeader = async (permissions: string[], username = 'alice') => {
    setActivePinia(createPinia())
    h.getMe.mockResolvedValue({
        data: { data: { id: 'u-1', username, name: 'An Nguyen', email: 'a@b.c', permissions } },
    })
    const w = mount(Header, {
        global: {
            stubs: {
                RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
                LoginModal: true,
                DropdownMenuContent: { template: '<div><slot /></div>' },
                DropdownMenuItem: { template: '<div role="menuitem"><slot /></div>' },
                ThemeMenu: true,
                MobileNav: true,
            },
        },
    })
    await flushPromises()
    return w
}

describe('Header nav', () => {
    beforeEach(() => vi.clearAllMocks())

    it('has Problems and Contests but no Home', async () => {
        const w = await mountHeader([])
        const links = w.findAll('nav a')
        expect(links.map((a) => a.text())).toEqual(['Problems', 'Contests'])
        expect(links[1]!.attributes('href')).toBe('/contests')
    })

    it.each(['submission:read_any', 'contest:create', 'contest:update', 'contest:delete'])(
        'showsAdminFor %s',
        async (permission) => {
            const w = await mountHeader([permission])
            expect(w.findAll('nav a').map((a) => a.text())).toContain('Admin')
        },
    )

    it('shows Admin only with an admin permission', async () => {
        const plain = await mountHeader(['problem:read'])
        expect(plain.findAll('nav a').map((a) => a.text())).not.toContain('Admin')
        const admin = await mountHeader(['user:read'])
        expect(admin.findAll('nav a').map((a) => a.text())).toContain('Admin')
    })

    it('profileIsTheFirstAccountMenuItem', async () => {
        const w = await mountHeader([])
        const items = w.findAll('[role="menuitem"]')
        expect(items[0]!.text()).toBe('Profile')
        expect(items[0]!.get('a').attributes('href')).toBe('/u/alice')
        expect(items[1]!.text()).toBe('Change password')
        expect(items.at(-1)!.text()).toBe('Log out')
    })

    it('aGoogleUsersProfileLinkIsKeyedByIdNotTheEmail', async () => {
        // A Google account's username is its email address: it must never go in a URL.
        const w = await mountHeader([], 'an.nguyen@gmail.com')
        const profile = w.findAll('[role="menuitem"]')[0]!
        expect(profile.get('a').attributes('href')).toBe('/u/id/u-1')
    })
})
