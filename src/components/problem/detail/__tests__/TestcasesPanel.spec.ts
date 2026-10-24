// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const h = vi.hoisted(() => ({ run: vi.fn(), errorToast: vi.fn() }))
vi.mock('@/services/submissionService', () => ({ default: { run: h.run } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.errorToast }) }))

import TestcasesPanel from '../TestcasesPanel.vue'

let wrapper: VueWrapper | undefined
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.clearAllMocks()
})

const mountPanel = () => {
    wrapper = mount(TestcasesPanel, {
        attachTo: document.body,
        props: { problemSlug: 'chia-hai-tap', sampleInput: '4\n1 6 11 5', sampleOutput: '1' },
    })
    return wrapper
}
const source = { sourceCode: 'int main() {}', languageIdentifier: 'cpp17' }
const run = (w: VueWrapper) => (w.vm as unknown as { run: (s: typeof source) => Promise<void> }).run(source)

describe('TestcasesPanel', () => {
    it('startsWithTheSampleReadOnly', () => {
        const w = mountPanel()
        const input = w.get('[data-test="case-input"]').element as HTMLTextAreaElement
        expect(input.value).toBe('4\n1 6 11 5')
        expect(input.readOnly).toBe(true)
        expect(w.text()).toContain('Run your code to see what it prints.')
    })

    it('runSendsEveryCaseAndShowsEachResult', async () => {
        const w = mountPanel()
        await w.get('[data-test="add-case"]').trigger('click')
        await w.get('[data-test="case-input"]').setValue('2\n3 3')
        h.run.mockResolvedValue({
            data: { data: { cases: [
                { result: 0, output: '1\n', cpuTime: 0, memory: 1 },
                { result: 0, output: '0\n', cpuTime: 1, memory: 1 },
            ] } },
        })
        await run(w)
        await flushPromises()
        expect(h.run).toHaveBeenCalledWith({
            problemSlug: 'chia-hai-tap',
            languageIdentifier: 'cpp17',
            sourceCode: 'int main() {}',
            cases: [{ input: '4\n1 6 11 5', expectedOutput: '1' }, { input: '2\n3 3' }],
        })
        // The custom case stays selected: it ran, with nothing to compare.
        expect(w.get('[data-test="case-outcome"]').text()).toContain('Ran in 1 ms')
        await w.get('[data-test="case-1"]').trigger('click')
        expect(w.get('[data-test="case-outcome"]').text()).toContain('Passed in 0 ms')
        expect(w.get('[data-test="case-output"]').text()).toBe('1')
    })

    it('aFailedCaseOpensWithItsMessage', async () => {
        const w = mountPanel()
        h.run.mockResolvedValue({
            data: { data: { cases: [{ result: 4, output: '', cpuTime: 2, memory: 1, errorMessage: 'Segmentation fault' }] } },
        })
        await run(w)
        await flushPromises()
        expect(w.get('[data-test="case-outcome"]').text()).toContain('Runtime error')
        expect(w.get('[data-test="run-error"]').text()).toBe('Segmentation fault')
    })

    it('aServerWithoutRunSaysSoInPlace', async () => {
        const w = mountPanel()
        h.run.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } })
        await run(w)
        await flushPromises()
        expect(w.text()).toContain("Run isn't available on this server yet.")
        expect(h.errorToast).not.toHaveBeenCalled()
    })
})
