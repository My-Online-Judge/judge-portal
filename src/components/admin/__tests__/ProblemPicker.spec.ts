// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ getProblems: vi.fn(), ensureFreshSession: vi.fn() }))
vi.mock('@/services/problemService', () => ({ default: { getProblems: h.getProblems } }))
vi.mock('@/api/refreshSession', () => ({ ensureFreshSession: h.ensureFreshSession }))

import ProblemPicker from '../ProblemPicker.vue'

const problems = [
    { id: 'p1', title: 'Two sum', problemSlug: 'two-sum', status: 1 },
    { id: 'p2', title: 'Two pointers', problemSlug: 'two-pointers', status: 0 },
]
let wrapper: VueWrapper | undefined

const mountPicker = (props: Record<string, unknown> = {}) => {
    wrapper = mount(ProblemPicker, { attachTo: document.body, props: { modelValue: null, ...props } })
    return wrapper
}
const option = (slug: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(slug)) as HTMLButtonElement | undefined

beforeEach(() => {
    // Only the debounce timer is faked: flushPromises still needs a real setImmediate.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    h.ensureFreshSession.mockResolvedValue(undefined)
    h.getProblems.mockResolvedValue({ data: { data: problems } })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('ProblemPicker', () => {
    it('searchesAfter300msAndEmitsTheSlug', async () => {
        const w = mountPicker()
        await flushPromises()
        h.getProblems.mockClear()
        h.ensureFreshSession.mockClear()

        const input = document.body.querySelector('input[aria-label="Search problems"]') as HTMLInputElement
        input.value = 'two'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await nextTick()
        vi.advanceTimersByTime(299)
        await flushPromises()
        expect(h.getProblems).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        await flushPromises()
        expect(h.getProblems).toHaveBeenCalledWith(expect.any(AbortSignal), { search: 'two', size: 20 })
        // The session is made fresh before the list is read, so INACTIVE problems are listed.
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.getProblems.mock.invocationCallOrder[0]!)
        expect(document.body.textContent).toContain('Two sum')

        option('two-sum')!.click()
        await nextTick()
        expect(w.emitted('update:modelValue')).toEqual([['two-sum']])
    })

    it('excludedSlugsAreNotListed', async () => {
        mountPicker({ excludeSlugs: ['two-sum'] })
        await flushPromises()
        expect(option('two-sum')).toBeUndefined()
        expect(option('two-pointers')).toBeTruthy()
    })

    it('placeholderPromisesOnlyTitleSearch', async () => {
        mountPicker()
        await flushPromises()
        const input = document.body.querySelector('input[aria-label="Search problems"]') as HTMLInputElement
        expect(input.placeholder).toBe('Search title')
    })
})
