// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, AxiosHeaders } from 'axios'

const h = vi.hoisted(() => ({
    watched: new Map<string, { onVerdict: (v: unknown) => void; onGiveUp?: () => void }>(),
    watchCalls: [] as string[],
    stopped: [] as string[],
    search: vi.fn(),
    rejudge: vi.fn(),
    rejudgeProblem: vi.fn(),
    toast: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
}))

vi.mock('vue-router', async () => {
    const { defineComponent: define, h: r } = await import('vue')
    const RouterLink = define({ props: ['to'], setup: (_, { slots }) => () => r('a', slots.default?.()) })
    return { useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ query: {}, path: '/admin/submissions' }), RouterLink }
})
vi.mock('@/services/submissionService', () => ({
    default: { search: h.search, rejudge: h.rejudge, rejudgeProblem: h.rejudgeProblem },
}))
vi.mock('@/composables/useSubmissionStream', () => ({
    useSubmissionStream: () => ({
        watch: (id: string, onVerdict: (v: unknown) => void, onGiveUp?: () => void) => {
            h.watchCalls.push(id)
            h.watched.set(id, { onVerdict, onGiveUp })
        },
        stop: (id: string) => {
            h.watched.delete(id)
            h.stopped.push(id)
        },
        stopAll: vi.fn(),
    }),
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: h.toast, error: h.error, success: h.success, info: h.info }) }))
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
    vi.useRealTimers()
    h.watched.clear()
    h.watchCalls.length = 0
    h.stopped.length = 0
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

    it('aUserWithoutAPublicUsernameIsContestantAndTheIdStart', async () => {
        // Identity answers a Google account's username (its email address) as null; an older one may still send it.
        h.search.mockResolvedValue({
            data: {
                data: [
                    { ...row, id: 's2', userId: 'abcdef12-0000-0000-0000-000000000000', username: null },
                    { ...row, id: 's3', userId: 'fedcba98-0000-0000-0000-000000000000', username: 'binh@gmail.com' },
                    { ...row, id: 's4', userId: null, username: null },
                ],
                pagination,
            },
        })
        await mountPage()
        const users = [...document.body.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[1]!.textContent!.trim())
        expect(users).toEqual(['Contestant abcdef12', 'Contestant fedcba98', '-'])
        expect(document.body.textContent).not.toContain('binh@gmail.com')
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

    it('aFilterTypedJustBeforeLeavingDoesNotLoadAfterwards', async () => {
        vi.useFakeTimers()
        await mountPage()
        await type('input[aria-label="Filter by username"]', 'bob')
        const before = h.search.mock.calls.length
        wrapper!.unmount()
        wrapper = undefined
        await vi.advanceTimersByTimeAsync(1000)
        expect(h.search).toHaveBeenCalledTimes(before)
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
        expect(h.success).toHaveBeenCalledWith('Queued 12 submissions', {
            description: 'The judge queue limits each run. Run it again later if there are more.',
        })
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

    describe('a row that is still being judged', () => {
        const judging = { ...row, status: 7, cpuTime: null, memory: null }
        beforeEach(() => {
            h.search.mockResolvedValue({ data: { data: [judging], pagination } })
        })

        it('isWatchedAndPatchedWhenItsVerdictArrives', async () => {
            await mountPage()
            expect([...h.watched.keys()]).toEqual([row.id])
            expect(document.body.textContent).toContain('Judging')
            const callsBefore = h.search.mock.calls.length
            h.watched.get(row.id)!.onVerdict({ status: 0, cpuTime: 30, memory: 4194304 })
            await flushPromises()
            expect(document.body.textContent).toContain('Accepted')
            // No list reload and no spinner for a patch.
            expect(h.search.mock.calls.length).toBe(callsBefore)
            // The row is terminal now, so Rejudge is available again.
            await openMenu()
            expect(menuItem('Rejudge…')!.getAttribute('aria-disabled')).not.toBe('true')
            expect(menuItem('Rejudge…')!.hasAttribute('data-disabled')).toBe(false)
        })

        it('aGivenUpWatchRefreshesTheListQuietly', async () => {
            await mountPage()
            h.search.mockResolvedValue({ data: { data: [{ ...judging, status: -1 }], pagination } })
            h.watched.get(row.id)!.onGiveUp!()
            await flushPromises()
            expect(h.search).toHaveBeenCalledTimes(2)
            expect(document.body.textContent).toContain('Wrong answer')
        })

        it('closingTheDetailDialogReloadsTheList', async () => {
            await mountPage()
            await pickMenu('View')
            const dialog = wrapper!.findComponent({ name: 'SubmissionDetailDialogStub' })
            expect(dialog.props('open')).toBe(true)
            h.search.mockResolvedValue({ data: { data: [{ ...judging, status: 0 }], pagination } })
            dialog.vm.$emit('update:open', false)
            await flushPromises()
            expect(h.search).toHaveBeenCalledTimes(2)
        })
    })

    describe('many rows still being judged', () => {
        // Ten rows queued by a problem rejudge, newest first.
        const pending = (n: number, status = 6) =>
            Array.from({ length: n }, (_, i) => ({ ...row, id: `p${i}-0000000`, status, cpuTime: null, memory: null }))
        const answer = (list: unknown[]) => ({ data: { data: list, pagination } })
        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
            // A fresh object per answer, as axios gives.
            h.search.mockImplementation(async () => answer(pending(10)))
        })

        it('watchesAtMostFourRowsAndRefreshesTheListForTheRest', async () => {
            await mountPage()
            expect([...h.watched.keys()]).toEqual(['p0-0000000', 'p1-0000000', 'p2-0000000', 'p3-0000000'])
            expect(h.search).toHaveBeenCalledTimes(1)

            // One list read instead of a poll per row: 5 s, then 10 s, 20 s, and 30 s from then on.
            await vi.advanceTimersByTimeAsync(4999)
            expect(h.search).toHaveBeenCalledTimes(1)
            await vi.advanceTimersByTimeAsync(1)
            expect(h.search).toHaveBeenCalledTimes(2)
            await vi.advanceTimersByTimeAsync(10_000)
            expect(h.search).toHaveBeenCalledTimes(3)
            await vi.advanceTimersByTimeAsync(20_000)
            expect(h.search).toHaveBeenCalledTimes(4)
            await vi.advanceTimersByTimeAsync(30_000)
            expect(h.search).toHaveBeenCalledTimes(5)
            await vi.advanceTimersByTimeAsync(30_000)
            expect(h.search).toHaveBeenCalledTimes(6)
            // Still the same four streams.
            expect(h.watchCalls).toHaveLength(4)
        })

        it('aFinishedWatchHandsItsSlotToTheNextRow', async () => {
            await mountPage()
            h.watched.get('p0-0000000')!.onVerdict({ status: 0, cpuTime: 1, memory: 1 })
            await flushPromises()
            expect(h.watchCalls).toEqual(['p0-0000000', 'p1-0000000', 'p2-0000000', 'p3-0000000', 'p4-0000000'])
        })

        it('theListRefreshStopsOnceEveryRowIsFinished', async () => {
            await mountPage()
            h.search.mockImplementation(async () => answer(pending(10, -1)))
            await vi.advanceTimersByTimeAsync(5000)
            expect(h.search).toHaveBeenCalledTimes(2)
            await vi.advanceTimersByTimeAsync(600_000)
            expect(h.search).toHaveBeenCalledTimes(2)
        })

        it('theListRefreshStopsAfterTenMinutes', async () => {
            await mountPage()
            await vi.advanceTimersByTimeAsync(600_000)
            const calls = h.search.mock.calls.length
            // 5 + 10 + 20, then every 30 s, and nothing scheduled past ten minutes.
            expect(calls).toBe(1 + 3 + Math.floor((600_000 - 35_000) / 30_000))
            await vi.advanceTimersByTimeAsync(600_000)
            expect(h.search).toHaveBeenCalledTimes(calls)
        })

        it('leavingThePageStopsTheListRefresh', async () => {
            await mountPage()
            wrapper!.unmount()
            wrapper = undefined
            await vi.advanceTimersByTimeAsync(60_000)
            expect(h.search).toHaveBeenCalledTimes(1)
        })

        it('leavingWhileARefreshIsInFlightAbortsItAndStartsNothing', async () => {
            await mountPage()
            let answerIt!: (v: unknown) => void
            let signal: AbortSignal | undefined
            h.search.mockImplementation((s: AbortSignal) => {
                signal = s
                return new Promise((resolve) => (answerIt = resolve))
            })
            await vi.advanceTimersByTimeAsync(5000)
            expect(h.search).toHaveBeenCalledTimes(2)

            wrapper!.unmount()
            wrapper = undefined
            expect(signal!.aborted).toBe(true)
            // The answer arrives anyway, with the four watched rows finished: nothing may take their slots.
            answerIt(answer(pending(10).map((r, i) => (i < 4 ? { ...r, status: 0 } : r))))
            await flushPromises()
            expect(h.watchCalls).toHaveLength(4)
            await vi.advanceTimersByTimeAsync(600_000)
            expect(h.search).toHaveBeenCalledTimes(2)
        })
    })

    it('aRowThatGaveUpIsNotWatchedAgain', async () => {
        const stuck = { ...row, status: 6, cpuTime: null, memory: null }
        h.search.mockImplementation(async () => ({ data: { data: [stuck], pagination } }))
        await mountPage()
        expect(h.watchCalls).toEqual([row.id])
        // The watch ends without a verdict (judge down): the list is read again and the row is still pending.
        h.watched.get(row.id)!.onGiveUp!()
        await flushPromises()
        expect(h.search).toHaveBeenCalledTimes(2)
        expect(h.watchCalls).toEqual([row.id])
        // An explicit reload (here: the next page) may try it again.
        wrapper!.findComponent({ name: 'PaginationFooter' }).vm.$emit('change-page', 0)
        await flushPromises()
        expect(h.watchCalls).toEqual([row.id, row.id])
    })

    describe('a quiet refresh', () => {
        const stuck = { ...row, status: 6, cpuTime: null, memory: null }
        beforeEach(() => {
            h.search.mockResolvedValue({ data: { data: [stuck], pagination } })
        })

        it('keepsTheFiltersOfTheLastLoad', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
            await mountPage()
            // A username is typed; its debounced reload has not run when the watch gives up.
            await type('input[aria-label="Filter by username"]', 'bob')
            h.watched.get(row.id)!.onGiveUp!()
            await flushPromises()
            expect(h.search).toHaveBeenCalledTimes(2)
            expect(h.search).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 0, size: 20 })
        })

        it('clearsAnEarlierError', async () => {
            await mountPage()
            h.search.mockRejectedValueOnce(new Error('down'))
            wrapper!.findComponent({ name: 'PaginationFooter' }).vm.$emit('change-page', 1)
            await flushPromises()
            expect(document.body.textContent).toContain("Couldn't refresh")
            h.watched.get(row.id)!.onGiveUp!()
            await flushPromises()
            expect(h.search).toHaveBeenLastCalledWith(expect.any(AbortSignal), { page: 1, size: 20 })
            expect(document.body.textContent).not.toContain("Couldn't refresh")
        })
    })

    it('aTerminalRowIsNotWatched', async () => {
        await mountPage()
        expect(h.watched.size).toBe(0)
    })

    it('rejudgingAProblemWithNothingFinishedSaysSo', async () => {
        h.rejudgeProblem.mockResolvedValue({ data: { data: { queued: 0 } } })
        await mountPage()
        bodyButton('Rejudge problem…')!.click()
        await flushPromises()
        await wrapper!.findComponent({ name: 'ProblemPickerStub' }).vm.$emit('update:modelValue', 'two-sum')
        await nextTick()
        bodyButton('Rejudge')!.click()
        await flushPromises()
        expect(h.info).toHaveBeenCalledWith('No finished submissions to rejudge')
        expect(h.success).not.toHaveBeenCalled()
    })
})
