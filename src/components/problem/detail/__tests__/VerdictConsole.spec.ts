// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VerdictConsole from '../VerdictConsole.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'

vi.mock('@/services/submissionService', () => ({ default: { getSubmissionById: vi.fn() } }))

const watchVerdict = vi.fn()
vi.mock('@/composables/useSubmissionStream', () => ({ useSubmissionStream: () => ({ watch: watchVerdict }) }))

const getById = vi.mocked(submissionService.getSubmissionById)
const base = { id: 'abcdef123456', errorMessage: '', cpuTime: 1, memory: 1 }
const pending = { ...base, status: 6, result: 6 } as unknown as Submission
const full = { ...base, status: 0, result: 0, details: [] } as unknown as Submission

beforeEach(() => {
    getById.mockReset()
    watchVerdict.mockReset()
})

describe('VerdictConsole', () => {
    it('fetchesDetailOnceWhenTerminalPayloadLacksDetails', async () => {
        getById.mockResolvedValue({ data: { data: full } } as never)
        const w = mount(VerdictConsole, { props: { submission: pending } })
        const lacking = { ...base, status: 0, result: 0 } as unknown as Submission
        watchVerdict.mock.calls[0][1](lacking)
        await flushPromises()
        expect(getById).toHaveBeenCalledTimes(1)
        expect(getById).toHaveBeenCalledWith('abcdef123456')
        expect(w.text()).toContain('AC')
    })

    it('emitsJudgedOnTerminalVerdict', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending } })
        expect(watchVerdict).toHaveBeenCalledWith('abcdef123456', expect.any(Function), expect.any(Function))
        watchVerdict.mock.calls[0][1](full)
        await flushPromises()
        expect(w.emitted('judged')).toHaveLength(1)
        expect(w.emitted('judged')![0]).toEqual([full])
        expect(getById).not.toHaveBeenCalled()
    })
})
