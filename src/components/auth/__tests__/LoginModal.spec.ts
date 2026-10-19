// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ getGoogleAuthUrl: vi.fn() }))
vi.mock('@/services/authService', () => ({ default: { getGoogleAuthUrl: h.getGoogleAuthUrl } }))

import LoginModal from '../LoginModal.vue'

const googleButton = () =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Google') && !b.textContent.includes('New here')) as HTMLButtonElement

afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('LoginModal', () => {
    it('shows the inline alert when Google sign-in cannot start', async () => {
        h.getGoogleAuthUrl.mockRejectedValue(new Error('down'))
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const w = mount(LoginModal, { props: { open: true }, attachTo: document.body })
        await flushPromises()
        googleButton().click()
        await flushPromises()
        const alert = document.body.querySelector('[role=alert]')
        expect(alert?.textContent).toContain("Couldn't start Google sign-in. Try again.")
        expect(googleButton().disabled).toBe(false)
        w.unmount()
    })

    it('shows "Opening Google…" and disables the button while redirecting', async () => {
        h.getGoogleAuthUrl.mockReturnValue(new Promise(() => {}))
        const w = mount(LoginModal, { props: { open: true }, attachTo: document.body })
        await flushPromises()
        googleButton().click()
        await flushPromises()
        const btn = googleButton()
        expect(btn.textContent).toContain('Opening Google…')
        expect(btn.disabled).toBe(true)
        expect(btn.getAttribute('aria-busy')).toBe('true')
        w.unmount()
    })
})
