// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, AxiosHeaders } from 'axios'

const h = vi.hoisted(() => ({
    search: vi.fn(),
    rejudge: vi.fn(),
    rejudgeProblem: vi.fn(),
    toast: vi.fn(),
    error: vi.fn(),
}))

vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    const RouterLink = define({ props: ['to'], setup: (_, { slots }) => () => r('a', slots.default?.()) })
    return { useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ query: {}, path: '/admin/submissions' }), RouterLink }
})
vi.mock('@/services/submissionService', () => ({
    default: { search: h.search, rejudge: h.rejudge, rejudgeProblem: h.rejudgeProblem },
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: h.toast, error: h.error }) }))
// The real dialog loads the submission and Monaco; only the props the page passes matter here.
vi.mock('@/components/problem/detail/SubmissionDetailDialog.vue', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    // __esModule: the page loads this dialog through defineAsyncComponent, which unwraps `default` only from a module.
    return {
        __esModule: true,
        default: define({
            name: 'SubmissionDetailDialogStub',
            props: { open: Boolean, submissionId: String, showSource: Boolean },
            setup: () => () => r('div', { 'data-test': 'detail-dialog' }),
        }),
    }
})
vi.mock('@/components/admin/ProblemPicker.vue', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    return {
        default: define({
            name: 'ProblemPickerStub',
            props: { modelValue: String },
            emits: ['update:modelValue'],
            setup: () => () => r('div', { 'data-test': 'problem-picker' }),
        }),
    }
})

import { RouterLink } from 'vue-router'
import AdminSubmissionsPage from '../AdminSubmissionsPage.vue'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth'

const row = {
    id: 's1abcdef99', createdAt: '2026-10-20T10:00:00', userId: 'u1', username: 'alice', problemSlug: 'two-sum',
    language: 'C++', status: -1, cpuTime: 12, memory: 2097152,
}
const pagination = { page: 0, size: 20, totalElements: 1, totalPages: 1, hasPrev: false, hasNext: false, prevPage: null, nextPage: null }

let wrapper: VueWrapper | undefined

async function mountPage(permissions = ['submission:read_any', 'submission:rejudge']) {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'me', permissions } as never
    // PageHeader resolves RouterLink globally.
    wrapper = mount(AdminSubmissionsPage, { attachTo: document.body, global: { components: { RouterLink } } })
    await flushPromises()
    return wrapper
}
const bodyButton = (t: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t) as HTMLButtonElement | undefined
const menuItem = (t: string) =>
    [...document.body.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.trim() === t) as HTMLElement | undefined
async function openMenu() {
    await wrapper!.get('button[aria-label="Actions for submission #s1abcdef"]').trigger('click')
    await nextTick()
    await nextTick()
}
async function pickMenu(t: string) {
    await openMenu()
    menuItem(t)!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
}
async function type(selector: string, value: string) {
    const el = document.body.querySelector(selector) as HTMLInputElement
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
}
const queueFull = () =>
    new AxiosError('x', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 503,
        statusText: '',
        headers: { 'retry-after': '30' },
        config: { headers: new AxiosHeaders() },
        data: { message: 'The judge is busy, try again in a moment' },
    })

beforeEach(() => {
    h.search.mockResolvedValue({ data: { data: [row], pagination } })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('AdminSubmissionsPage', () => {
    it('loadsTheFirstPageWithSize20', async () => {
        await mountPage()
        expect(h.search).toHaveBeenCalledTimes(1)
        expect(h.search).toHaveBeenCalledWith(expect.any(AbortSignal), { page: 0, size: 20 })
        expect(document.body.textContent).toContain('alice')
        expect(document.body.textContent).toContain('two-sum')
        expect(document.body.textContent).toContain('12 ms')
        expect(document.body.textContent).toContain('2.0 MB')
    })

    it('filtersAreSentToTheApi', async () => {
        await mountPage()
        await type('input[aria-label="Filter by problem slug"]', 'two-sum')
        await type('input[aria-label="Filter by username"]', 'alice')
        // The result filter is the page's first Select (the pager has one too).
        await wrapper!.findAllComponents(Select)[0]!.vm.$emit('update:modelValue', '-1')
        await type('#sub-from', '2026-10-01')
        await type('#sub-to', '2026-10-20')
        await vi.waitFor(() =>
            expect(h.search).toHaveBeenLastCalledWith(expect.any(AbortSignal), {
                page: 0,
                size: 20,
                problemSlug: 'two-sum',
                username: 'alice',
                result: -1,
                from: '2026-10-01',
                to: '2026-10-20',
            }),
        )
    })

    it('viewOpensTheDialogWithSource', async () => {
        await mountPage()
        await pickMenu('View')
        const dialog = wrapper!.findComponent({ name: 'SubmissionDetailDialogStub' })
        expect(dialog.exists()).toBe(true)
        expect(dialog.props()).toMatchObject({ open: true, submissionId: row.id, showSource: true })
    })

    it('rejudgeConfirmsThenCalls', async () => {
        h.rejudge.mockResolvedValue({ data: {} })
        await mountPage()
        await pickMenu('Rejudge…')
        expect(h.rejudge).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('Rejudge submission “#s1abcdef”?')
        bodyButton('Rejudge')!.click()
        await flushPromises()
        expect(h.rejudge).toHaveBeenCalledWith(row.id)
        expect(h.toast).toHaveBeenCalledWith('Submission queued for judging', 'success')
        expect(h.search).toHaveBeenCalledTimes(2)
    })

    it('rejudgeHiddenWithoutPermission', async () => {
        await mountPage(['submission:read_any'])
        expect(bodyButton('Rejudge problem…')).toBeUndefined()
        await openMenu()
        expect(menuItem('View')).toBeTruthy()
        expect(menuItem('Rejudge…')).toBeUndefined()
    })

    it('rejudgeDisabledWhileJudging', async () => {
        h.search.mockResolvedValue({ data: { data: [{ ...row, status: 7 }], pagination } })
        await mountPage()
        await openMenu()
        expect(menuItem('Rejudge…')!.hasAttribute('data-disabled')).toBe(true)
    })

    it('rejudgeProblemSendsSlugAndResult', async () => {
        h.rejudgeProblem.mockResolvedValue({ data: { data: { queued: 12 } } })
        await mountPage()
        bodyButton('Rejudge problem…')!.click()
        await flushPromises()
        expect(document.body.textContent).toContain(
            'Rejudges up to the 500 newest finished submissions of this problem, as many as the judge queue has room for.',
        )
        // Confirming without a problem asks for one.
        bodyButton('Rejudge')!.click()
        await flushPromises()
        expect(h.rejudgeProblem).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('Choose a problem.')

        await wrapper!.findComponent({ name: 'ProblemPickerStub' }).vm.$emit('update:modelValue', 'two-sum')
        // The dialog's result Select renders after the filter's and the pager's.
        await wrapper!.findAllComponents(Select).at(-1)!.vm.$emit('update:modelValue', '-1')
        await nextTick()
        expect(document.body.textContent).toContain('Rejudge “two-sum”?')
        bodyButton('Rejudge')!.click()
        await flushPromises()
        expect(h.rejudgeProblem).toHaveBeenCalledWith('two-sum', -1)
        expect(h.toast).toHaveBeenCalledWith('Queued 12 submissions', 'success')
        expect(h.search).toHaveBeenCalledTimes(2)
    })

    it('queueFullShowsTheApiMessage', async () => {
        h.rejudge.mockRejectedValue(queueFull())
        await mountPage()
        await pickMenu('Rejudge…')
        bodyButton('Rejudge')!.click()
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith('The judge is busy, try again in a moment', { description: 'Try again in 30 s.' })
        expect(h.toast).not.toHaveBeenCalledWith('Submission queued for judging', 'success')
    })
})
