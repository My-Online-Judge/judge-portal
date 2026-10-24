// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VerdictConsole from '../VerdictConsole.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'
import { submissionToasts } from '@/lib/submissionToasts'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'

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
        expect(w.text()).toContain('Accepted')
    })

    it('emitsJudgedOnTerminalVerdict', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending } })
        expect(watchVerdict).toHaveBeenCalledWith('abcdef123456', expect.any(Function), expect.any(Function), { priority: true })
        watchVerdict.mock.calls[0][1](full)
        await flushPromises()
        expect(w.emitted('judged')).toHaveLength(1)
        expect(w.emitted('judged')![0]).toEqual([full])
        expect(getById).not.toHaveBeenCalled()
    })

    it('viewShowsTheHiddenConsoleThenScrollsToIt', async () => {
        const update = vi.fn()
        submissionToasts.set(base.id, { id: 1, update, dismiss: vi.fn() })
        const showConsole = vi.fn()
        const w = mount(VerdictConsole, {
            props: { submission: pending },
            global: { provide: { [SHOW_CONSOLE as symbol]: showConsole } },
        })
        const scroll = vi.fn()
        ;(w.element as HTMLElement).scrollIntoView = scroll

        watchVerdict.mock.calls[0][1](full)
        await flushPromises()
        const view = update.mock.calls.at(-1)![0].action
        expect(view.label).toBe('View')
        await view.onClick()
        await flushPromises()

        expect(showConsole).toHaveBeenCalledOnce()
        expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
        expect(showConsole.mock.invocationCallOrder[0]).toBeLessThan(scroll.mock.invocationCallOrder[0]!)
    })

    it('verdictAfterUnmountHasNoViewAction', async () => {
        let resolve!: (v: unknown) => void
        getById.mockReturnValue(new Promise((res) => (resolve = res)) as never)
        const update = vi.fn()
        submissionToasts.set(base.id, { id: 1, update, dismiss: vi.fn() })
        const w = mount(VerdictConsole, { props: { submission: pending } })
        // The verdict lands without details, so the console fetches them, and the user leaves meanwhile.
        watchVerdict.mock.calls[0][1]({ ...base, status: 0, result: 0 } as unknown as Submission)
        w.unmount()
        resolve({ data: { data: full } })
        await flushPromises()
        const patch = update.mock.calls.at(-1)![0]
        expect(patch).toMatchObject({ type: 'verdict', verdictStatus: 0 })
        expect(patch).toHaveProperty('action', undefined)
    })
})
