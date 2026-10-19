// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ForbiddenPage from '../ForbiddenPage.vue'
import { useAuthStore } from '@/stores/auth'

describe('ForbiddenPage', () => {
    beforeEach(() => setActivePinia(createPinia()))

    it('forbiddenNamesTheUser', () => {
        const auth = useAuthStore()
        auth.user = { username: 'an.nguyen', name: 'An', email: 'a@b.c' } as never
        const w = mount(ForbiddenPage, {
            global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
        })
        expect(w.text()).toContain('signed in as an.nguyen')
        expect(w.text()).toContain("You don't have access to this page")
    })
})
