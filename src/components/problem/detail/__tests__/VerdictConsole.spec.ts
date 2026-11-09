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
        expect(watchVerdict).toHaveBeenCalledWith('abcdef123456', expect.any(Function), expect.any(Function),
            expect.objectContaining({ priority: true, onStarted: expect.any(Function), onProgress: expect.any(Function) }))
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

    // --- the live ladder ---

    const opts = (call = 0) => watchVerdict.mock.calls[call][3] as { onStarted: () => void; onProgress: (p: unknown) => void }
    const tiles = (w: ReturnType<typeof mount>) => w.findAll('.tile')

    it('theLadderWaitsThenRunsThenFillsTestByTest', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending } })
        expect(w.get('[data-test="live-title"]').text()).toBe('Waiting in the queue…')
        expect(tiles(w)).toHaveLength(12)
        expect(tiles(w).every((t) => t.classes('v-pending'))).toBe(true)
        expect(w.find('[data-test="live-count"]').exists()).toBe(false)

        opts().onStarted()
        await flushPromises()
        expect(w.get('[data-test="live-title"]').text()).toBe('Running tests…')
        expect(tiles(w).every((t) => t.classes('running'))).toBe(true)

        opts().onProgress({ testCase: '2', result: 0, total: 5 })
        opts().onProgress({ testCase: '1', result: -1, total: 5 })
        opts().onProgress({ testCase: '2', result: 0, total: 5 }) // a failover reports a test again: counted once
        await flushPromises()
        const all = tiles(w)
        expect(all).toHaveLength(5) // the judge's own count
        expect(all[0].classes()).toEqual(expect.arrayContaining(['tile', 'live', 'v-wa']))
        expect(all[1].classes()).toEqual(expect.arrayContaining(['tile', 'live', 'v-ac', 'pass']))
        expect(all[2].classes('running')).toBe(true)
        expect(w.get('[data-test="live-count"]').text().replace(/\s+/g, ' ')).toBe('2 / 5 judged')
        expect(w.find('.ghost-tiles').exists()).toBe(false) // the sweep stops once a test is in

        watchVerdict.mock.calls[0][1]({ ...full, details: [] })
        await flushPromises()
        expect(w.text()).toContain('Accepted')
    })

    it('theLadderTakesTheLastVerdictsCountUntilTheJudgeSaysOtherwise', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending, expectedCount: 7 } })
        expect(tiles(w)).toHaveLength(7)
        opts().onProgress({ testCase: '9', result: 0 }) // beyond the hint, no total: the ladder grows to fit
        await flushPromises()
        expect(tiles(w)).toHaveLength(8)
        expect(tiles(w).at(-1)!.text()).toBe('9')
    })

    it('aNewSubmissionStartsAFreshLadder', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending } })
        opts().onStarted()
        opts().onProgress({ testCase: '1', result: 0, total: 3 })
        await flushPromises()
        expect(tiles(w)).toHaveLength(3)
        await w.setProps({ submission: { ...pending, id: 'ffffffff0000' } })
        expect(w.get('[data-test="live-title"]').text()).toBe('Waiting in the queue…')
        expect(tiles(w)).toHaveLength(12)
        // Late events of the first submission change nothing.
        opts(0).onProgress({ testCase: '2', result: 0, total: 3 })
        await flushPromises()
        expect(tiles(w)).toHaveLength(12)
    })

    it('aStreamThatGivesUpOffersSubmissionsAndARefresh', async () => {
        const w = mount(VerdictConsole, { props: { submission: pending } })
        watchVerdict.mock.calls[0][2]() // onGiveUp
        await flushPromises()
        expect(w.get('[data-test="stalled"]').text()).toContain('No verdict yet')
        await w.get('[data-test="check-submissions"]').trigger('click')
        expect(w.emitted('check-submissions')).toHaveLength(1)

        await w.get('[data-test="refresh"]').trigger('click')
        expect(watchVerdict).toHaveBeenCalledTimes(2)
        expect(watchVerdict.mock.calls[1][0]).toBe('abcdef123456')
        expect(w.find('[data-test="stalled"]').exists()).toBe(false)
        expect(w.get('[data-test="live-title"]').text()).toBe('Waiting in the queue…')

        watchVerdict.mock.calls[1][1]({ ...full, details: [] })
        await flushPromises()
        expect(w.text()).toContain('Accepted')
    })
})
