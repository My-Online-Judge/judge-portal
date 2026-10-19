// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ForbiddenPage from '../ForbiddenPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

const mountPage = () =>
    mount(ForbiddenPage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('ForbiddenPage', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        useLoginPrompt().open.value = false
    })

    it('forbiddenNamesTheUser', () => {
        const auth = useAuthStore()
        auth.user = { username: 'an.nguyen', name: 'An', email: 'a@b.c' } as never
        const w = mountPage()
        expect(w.text()).toContain('signed in as an.nguyen')
        expect(w.text()).toContain("You don't have access to this page")
    })

    it('"Log in as someone else" logs out without reload, then opens the login prompt', async () => {
        const auth = useAuthStore()
        auth.user = { username: 'an.nguyen', name: 'An', email: 'a@b.c' } as never
        const prompt = useLoginPrompt()
        const order: string[] = []
        const logout = vi.fn(async () => {
            order.push(`logout(open=${prompt.open.value})`)
        })
        auth.logout = logout as never
        const w = mountPage()
        const btn = w.findAll('button').find((b) => b.text() === 'Log in as someone else')!
        await btn.trigger('click')
        await flushPromises()
        expect(logout).toHaveBeenCalledWith({ reload: false })
        expect(order).toEqual(['logout(open=false)'])
        expect(prompt.open.value).toBe(true)
    })

    it('signedOutVisitorGetsLogInWithoutLogout', async () => {
        const auth = useAuthStore()
        const logout = vi.fn(async () => {})
        auth.logout = logout as never
        const prompt = useLoginPrompt()
        const w = mountPage()
        expect(w.text()).toContain("You're not signed in. Log in with an account that has access.")
        expect(w.text()).not.toContain('signed in as')
        const labels = w.findAll('button').map((b) => b.text())
        expect(labels).toContain('Log in')
        expect(labels).not.toContain('Log in as someone else')
        await w.findAll('button').find((b) => b.text() === 'Log in')!.trigger('click')
        await flushPromises()
        expect(prompt.open.value).toBe(true)
        expect(logout).not.toHaveBeenCalled()
    })
})
