// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({ getMe: vi.fn() }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import Header from '../Header.vue'

const mountHeader = async (permissions: string[]) => {
    setActivePinia(createPinia())
    h.getMe.mockResolvedValue({
        data: { data: { username: 'alice', name: 'An Nguyen', email: 'a@b.c', permissions } },
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

    it('has Problems but no Home or Contests', async () => {
        const w = await mountHeader([])
        const links = w.findAll('nav a').map((a) => a.text())
        expect(links).toContain('Problems')
        expect(links).not.toContain('Home')
        expect(links).not.toContain('Contests')
    })

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
})
