// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Monaco needs a real browser; the editor itself is stubbed below.
vi.mock('@/lib/monaco', () => ({}))

import SolvePane from '../SolvePane.vue'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'
import { useLanguageStore } from '@/stores/language'
import { useAuthStore } from '@/stores/auth'

const h = vi.hoisted(() => ({
    run: vi.fn(),
    loadCode: vi.fn(),
    source: { sourceCode: 'int main() {}', languageIdentifier: 'cpp17' },
}))

const ProblemSubmit = defineComponent({
    name: 'ProblemSubmit',
    emits: ['success', 'contest-not-running'],
    setup: (_, { expose }) => {
        expose({ submit: vi.fn(), loadCode: h.loadCode, source: () => h.source })
        return () => render('div')
    },
})
const TestcasesPanel = defineComponent({
    name: 'TestcasesPanel',
    setup: (_, { expose }) => {
        expose({ run: h.run, running: false })
        return () => render('div')
    },
})
const ProblemSubmissions = defineComponent({
    name: 'ProblemSubmissions',
    emits: ['consumed', 'count', 'load', 'newest'],
    setup: () => () => render('div'),
})
const Slot = defineComponent({ setup: (_, { slots }) => () => render('div', slots.default?.()) })

let wrapper: VueWrapper | undefined
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

const mountPane = async (showPane = vi.fn()) => {
    setActivePinia(createPinia())
    vi.spyOn(useLanguageStore(), 'fetchLanguages').mockResolvedValue(undefined as never)
    useAuthStore().isAuthenticated = true
    wrapper = mount(SolvePane, {
        attachTo: document.body,
        props: { slug: 'sum' },
        global: {
            provide: { [SHOW_CONSOLE as symbol]: showPane },
            stubs: {
                ProblemSubmit,
                TestcasesPanel,
                VerdictConsole: true,
                ProblemSubmissions,
                ResizablePanelGroup: Slot,
                ResizablePanel: Slot,
                WorkspaceHandle: true,
            },
        },
    })
    await flushPromises()
    return wrapper
}

const selected = (w: VueWrapper, name: string) =>
    w.get(`[data-test="console-tab-${name}"]`).attributes('aria-selected')

describe('SolvePane', () => {
    it('aSubmitBringsTheResultTabForward', async () => {
        const showPane = vi.fn()
        const w = await mountPane(showPane)
        // Reka's tabs select on mousedown.
        await w.get('[data-test="console-tab-submissions"]').trigger('mousedown', { button: 0 })
        expect(selected(w, 'submissions')).toBe('true')

        w.findComponent(ProblemSubmit).vm.$emit('success', { id: 's1', status: 6 })
        await flushPromises()

        expect(selected(w, 'result')).toBe('true')
        // On a phone the page shows the Code view, so the result is in sight.
        expect(showPane).toHaveBeenCalledOnce()
    })

    it('runSendsTheEditorsCodeToTheTestcasesAndShowsThem', async () => {
        const w = await mountPane()
        await w.get('[data-test="console-tab-result"]').trigger('mousedown', { button: 0 })
        await w.get('[data-test="run"]').trigger('click')
        await flushPromises()
        expect(h.run).toHaveBeenCalledWith(h.source)
        expect(selected(w, 'testcases')).toBe('true')
    })

    it('theSubmissionsTabCountsAndLoadsCodeBack', async () => {
        const w = await mountPane()
        const list = w.findComponent(ProblemSubmissions)
        list.vm.$emit('count', 4)
        await flushPromises()
        expect(w.get('[data-test="submission-count"]').text()).toBe('4')

        list.vm.$emit('load', { id: 's9', sourceCode: 'print(1)', language: { identifier: 'py3' } })
        expect(h.loadCode).toHaveBeenCalledWith('print(1)', 'py3')
    })
})
