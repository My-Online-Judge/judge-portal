// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({ watch: vi.fn(), stop: vi.fn(), stopAll: vi.fn(), list: vi.fn() }))
vi.mock('@/composables/useSubmissionStream', () => ({
    useSubmissionStream: () => ({ watch: h.watch, stop: h.stop, stopAll: h.stopAll }),
}))
vi.mock('@/services/submissionService', () => ({ default: { getSubmissionsByUserAndProblem: h.list } }))
vi.mock('@/services/authService', () => ({ default: { getMe: vi.fn(), logout: vi.fn() } }))

import ProblemSubmissions from '../ProblemSubmissions.vue'
import VerdictChip from '@/components/common/VerdictChip.vue'
import { useAuthStore } from '@/stores/auth'
import { SubmissionResult, type Submission } from '@/types/submission'

const row = (id: string, status: number, extra: Partial<Submission> = {}) =>
    ({
        id,
        status,
        result: status,
        createdAt: '2026-10-20T08:00:00Z',
        cpuTime: null,
        memory: null,
        language: { name: 'C++' },
        ...extra,
    }) as unknown as Submission

/** The next fetched page. */
const page = (rows: Submission[]) =>
    h.list.mockResolvedValueOnce({ data: { data: rows, pagination: { page: 0, size: 10, totalElements: rows.length, totalPages: 1 } } })

const mountList = async (props: Record<string, unknown> = {}) => {
    const w = mount(ProblemSubmissions, {
        props: { problemSlug: 'tong', ...props },
        global: { stubs: { LoginModal: true, SubmissionDetailDialog: true, PaginationFooter: true } },
    })
    await flushPromises()
    return w
}

const watchedIds = () => h.watch.mock.calls.map((c) => c[0])
const onVerdictFor = (id: string) => h.watch.mock.calls.find((c) => c[0] === id)![1] as (v: Submission) => void
const chips = (w: Awaited<ReturnType<typeof mountList>>) => w.findAllComponents(VerdictChip).map((c) => c.props('status'))

beforeEach(() => {
    vi.clearAllMocks()
    h.list.mockReset()
    setActivePinia(createPinia())
    useAuthStore().login({ id: 'u1', username: 'an', name: 'An', email: 'a@b.c', permissions: [] } as never)
})

describe('ProblemSubmissions', () => {
    it('opensAStreamForEveryNonTerminalHistoryRow', async () => {
        page([row('r1', SubmissionResult.PENDING), row('r2', SubmissionResult.SUCCESS), row('r3', SubmissionResult.JUDGING)])
        await mountList()
        expect(h.list).toHaveBeenCalledWith(expect.anything(), 'u1', 'tong', 0, 10)
        expect(watchedIds()).toEqual(['r1', 'r3'])
    })

    it('streamedVerdictReplacesTheRowStatus', async () => {
        page([row('r1', SubmissionResult.PENDING), row('r2', SubmissionResult.SUCCESS), row('r3', SubmissionResult.JUDGING)])
        const w = await mountList()
        expect(chips(w)).toEqual([SubmissionResult.PENDING, SubmissionResult.SUCCESS, SubmissionResult.JUDGING])

        onVerdictFor('r1')(row('r1', SubmissionResult.WRONG_ANSWER, { cpuTime: 12 }))
        await flushPromises()

        expect(chips(w)).toEqual([SubmissionResult.WRONG_ANSWER, SubmissionResult.SUCCESS, SubmissionResult.JUDGING])
        expect(w.text()).toContain('12 ms')
    })

    it('a new submission shows its streamed verdict', async () => {
        page([])
        const fresh = row('p1', SubmissionResult.PENDING)
        const w = await mountList({ pendingSubmission: fresh })
        expect(watchedIds()).toEqual(['p1'])
        expect(chips(w)).toEqual([SubmissionResult.PENDING])

        onVerdictFor('p1')(row('p1', SubmissionResult.SUCCESS))
        await flushPromises()
        expect(chips(w)).toEqual([SubmissionResult.SUCCESS])
    })

    it('stops watching history rows that leave the page, but not the new submission', async () => {
        page([row('r1', SubmissionResult.PENDING), row('r2', SubmissionResult.SUCCESS)])
        const w = await mountList({ pendingSubmission: row('p1', SubmissionResult.PENDING) })
        expect(watchedIds()).toEqual(['p1', 'r1'])

        page([row('r4', SubmissionResult.JUDGING)])
        w.findComponent({ name: 'PaginationFooter' }).vm.$emit('change-page', 1)
        await flushPromises()

        expect(h.list).toHaveBeenLastCalledWith(expect.anything(), 'u1', 'tong', 1, 10)
        expect(h.stop.mock.calls.map((c) => c[0])).toEqual(['r1'])
        expect(watchedIds()).toEqual(['p1', 'r1', 'r4'])
    })
})
