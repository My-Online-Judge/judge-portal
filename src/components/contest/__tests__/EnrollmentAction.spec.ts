// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h as render, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import EnrollmentAction from '@/components/contest/EnrollmentAction.vue'

const h = vi.hoisted(() => ({
    enroll: vi.fn(),
    withdraw: vi.fn(),
    request: vi.fn(),
    error: vi.fn(),
    user: { value: null as null | { id: string } },
}))
vi.mock('@/services/contestService', () => ({ default: { enroll: h.enroll, withdraw: h.withdraw } }))
vi.mock('@/composables/useLoginPrompt', () => ({ useLoginPrompt: () => ({ open: ref(false), request: h.request }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.error, success: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ get user() { return h.user.value } }) }))
// The component imports RouterLink itself: a stub that renders the target, no router needed.
vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    const RouterLink = define({ props: ['to'], setup: (p, { slots }) => () => r('a', { href: p.to }, slots.default?.()) })
    return { RouterLink }
})
// The confirm dialog: a button that confirms, shown while open.
const ConfirmDialog = defineComponent({
    props: ['open', 'title', 'description', 'confirmLabel', 'tone'],
    emits: ['update:open', 'confirm'],
    setup: (p, { emit }) => () =>
        p.open ? render('button', { 'data-test': 'confirm', onClick: () => emit('confirm') }, 'confirm') : null,
})

const contest = (over: Record<string, unknown> = {}) => ({
    slug: 'spring-cup',
    phase: 'UPCOMING',
    status: 'PUBLISHED',
    enrollment: 'REQUIRED',
    enrolled: false,
    ...over,
})

let wrapper: VueWrapper | undefined
const mountAction = (props: Record<string, unknown>) => {
    wrapper = mount(EnrollmentAction, {
        props,
        global: { stubs: { ConfirmDialog } },
    })
    return wrapper
}

beforeEach(() => {
    h.user.value = { id: 'u-1' }
    h.enroll.mockReset().mockResolvedValue({ data: { data: { enrolled: true, enrolledCount: 25 } } })
    h.withdraw.mockReset().mockResolvedValue({ data: { data: { enrolled: false, enrolledCount: 24 } } })
    h.request.mockReset()
})
afterEach(() => wrapper?.unmount())

describe('EnrollmentAction', () => {
    it('anonymousRequiredAsksToLogIn', async () => {
        h.user.value = null
        const w = mountAction({ contest: contest() })
        const button = w.find('button')
        expect(button.text()).toBe('Log in to register')
        await button.trigger('click')
        expect(h.request).toHaveBeenCalledOnce()
        expect(h.enroll).not.toHaveBeenCalled()
    })

    it('registerCallsEnrollAndEmits', async () => {
        const w = mountAction({ contest: contest(), primary: true })
        const button = w.find('button')
        expect(button.text()).toBe('Register')
        await button.trigger('click')
        await flushPromises()
        expect(h.enroll).toHaveBeenCalledWith('spring-cup')
        expect(w.emitted('changed')?.[0]).toEqual([{ enrolled: true, enrolledCount: 25 }])
    })

    it('withdrawConfirmsThenCallsWithdraw', async () => {
        const w = mountAction({ contest: contest({ enrolled: true }) })
        expect(w.text()).toContain('Registered')
        const withdraw = w.findAll('button').find((b) => b.text() === 'Withdraw')
        expect(withdraw).toBeDefined()
        await withdraw!.trigger('click')
        expect(h.withdraw).not.toHaveBeenCalled()
        await w.find('[data-test="confirm"]').trigger('click')
        await flushPromises()
        expect(h.withdraw).toHaveBeenCalledWith('spring-cup')
        expect(w.emitted('changed')?.[0]).toEqual([{ enrolled: false, enrolledCount: 24 }])
    })

    it('enrolledRunningShowsEnter', () => {
        const w = mountAction({ contest: contest({ phase: 'RUNNING', enrolled: true, problems: [{ label: 'A' }] }) })
        expect(w.text()).toContain('Registered')
        const enter = w.findAll('a').find((a) => a.text() === 'Enter')
        expect(enter?.attributes('href')).toBe('/contests/spring-cup/problems/A')
        expect(w.findAll('button').map((b) => b.text())).not.toContain('Withdraw')
    })

    it('pastShowsStandings', () => {
        const w = mountAction({ contest: contest({ phase: 'ENDED', enrollment: 'OPEN' }) })
        const link = w.find('a')
        expect(link.text()).toBe('Standings')
        expect(link.attributes('href')).toBe('/contests/spring-cup?tab=standings')
    })

    it('openUpcomingRendersNothing', () => {
        const w = mountAction({ contest: contest({ enrollment: 'OPEN' }) })
        expect(w.findAll('button')).toHaveLength(0)
        expect(w.findAll('a')).toHaveLength(0)
    })

    it('openRunningShowsEnter', () => {
        const w = mountAction({ contest: contest({ phase: 'RUNNING', enrollment: 'OPEN' }) })
        expect(w.find('a').text()).toBe('Enter')
        expect(w.find('a').attributes('href')).toBe('/contests/spring-cup')
    })

    it('aRefusedRegistrationIsToasted', async () => {
        h.enroll.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'ENROLLMENT_CLOSED', message: 'Registration for this contest is closed' } } })
        const w = mountAction({ contest: contest() })
        await w.find('button').trigger('click')
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith('Registration for this contest is closed')
        expect(w.emitted('changed')).toBeUndefined()
    })
})
