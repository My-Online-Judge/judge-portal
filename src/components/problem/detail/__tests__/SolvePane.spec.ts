// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Monaco needs a real browser; the editor itself is stubbed below.
vi.mock('@/lib/monaco', () => ({}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ triggerToast: h.triggerToast, undo: h.undo }),
}))

import SolvePane from '../SolvePane.vue'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'
import { useLanguageStore } from '@/stores/language'
import { useAuthStore } from '@/stores/auth'

const h = vi.hoisted(() => ({
    run: vi.fn(),
    loadCode: vi.fn(),
    source: { sourceCode: 'int main() {}', languageIdentifier: 'cpp17' },
    triggerToast: vi.fn(),
    undo: vi.fn(),
    resize: vi.fn(),
    size: 40,
}))

const ProblemSubmit = defineComponent({
    name: 'ProblemSubmit',
    props: { actionsTo: String, focused: Boolean },
    emits: ['success', 'contest-not-running', 'toggle-focus'],
    setup: (_, { expose }) => {
        expose({ submit: vi.fn(), loadCode: h.loadCode, source: () => h.source })
        return () => render('div')
    },
})
// Reka's panel API, as the console panel's template ref reaches it.
const Panel = defineComponent({
    setup: (_, { slots, expose }) => {
        expose({ resize: h.resize, getSize: () => h.size, collapse: vi.fn(), expand: vi.fn() })
        return () => render('div', slots.default?.())
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

const mountPane = async (showPane = vi.fn(), props: Record<string, unknown> = {}) => {
    setActivePinia(createPinia())
    vi.spyOn(useLanguageStore(), 'fetchLanguages').mockResolvedValue(undefined as never)
    useAuthStore().isAuthenticated = true
    h.size = 40
    wrapper = mount(SolvePane, {
        attachTo: document.body,
        props: { slug: 'sum', ...props },
        global: {
            provide: { [SHOW_CONSOLE as symbol]: showPane },
            stubs: {
                ProblemSubmit,
                TestcasesPanel,
                VerdictConsole: true,
                ProblemSubmissions,
                ResizablePanelGroup: Slot,
                ResizablePanel: Panel,
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

    it('loadingCodeOverAnEditorWithCodeOffersUndo', async () => {
        const w = await mountPane()
        w.findComponent(ProblemSubmissions).vm.$emit('load', { id: 's9', sourceCode: 'print(1)', language: { identifier: 'py3' } })
        expect(h.undo).toHaveBeenCalledWith('Code loaded into the editor', expect.objectContaining({ onUndo: expect.any(Function) }))
        expect(h.triggerToast).not.toHaveBeenCalled()
        h.undo.mock.calls[0][1].onUndo()
        expect(h.loadCode).toHaveBeenLastCalledWith('int main() {}', 'cpp17')
    })

    it('loadingCodeIntoAnEmptyEditorNeedsNoUndo', async () => {
        h.source = { sourceCode: '  \n', languageIdentifier: 'cpp17' }
        try {
            const w = await mountPane()
            w.findComponent(ProblemSubmissions).vm.$emit('load', { id: 's9', sourceCode: 'print(1)', language: { identifier: 'py3' } })
            expect(h.undo).not.toHaveBeenCalled()
            expect(h.triggerToast).toHaveBeenCalledWith('Code loaded into the editor', 'success')
        } finally {
            h.source = { sourceCode: 'int main() {}', languageIdentifier: 'cpp17' }
        }
    })

    it('aSubmitGrowsTheConsoleForTheLadderButNeverShrinksIt', async () => {
        const w = await mountPane()
        w.findComponent(ProblemSubmit).vm.$emit('success', { id: 's1', status: 6 })
        await flushPromises()
        expect(h.resize).toHaveBeenCalledWith(55)

        h.resize.mockClear()
        h.size = 70 // the reader already gave the console more
        w.findComponent(ProblemSubmit).vm.$emit('success', { id: 's2', status: 6 })
        await flushPromises()
        expect(h.resize).not.toHaveBeenCalled()
    })

    it('onAPhoneASubmitLeavesTheSplitAlone', async () => {
        const w = await mountPane(vi.fn(), { view: 'code' })
        w.findComponent(ProblemSubmit).vm.$emit('success', { id: 's1', status: 6 })
        await flushPromises()
        expect(h.resize).not.toHaveBeenCalled()
    })

    it('judgingIsReportedToThePageWhileThisPanesSubmissionRuns', async () => {
        const w = await mountPane()
        w.findComponent(ProblemSubmit).vm.$emit('success', { id: 's1', status: 6 })
        await flushPromises()
        expect(w.emitted('judging')?.at(-1)).toEqual([true])
        w.findComponent({ name: 'VerdictConsole' }).vm.$emit('judged', { id: 's1', status: 0, details: [] })
        await flushPromises()
        expect(w.emitted('judging')?.at(-1)).toEqual([false])
    })

    it('aStalledConsoleCanOpenTheSubmissionsTab', async () => {
        const w = await mountPane()
        w.findComponent({ name: 'VerdictConsole' }).vm.$emit('check-submissions')
        await flushPromises()
        expect(selected(w, 'submissions')).toBe('true')
    })

    it('focusModeFillsTheWindowKeepsRunInsideAndLeavesOnEscape', async () => {
        const target = document.createElement('div')
        target.id = 'actions'
        document.body.appendChild(target)
        const w = await mountPane(vi.fn(), { actionsTo: '#actions' })
        expect(target.querySelector('[data-test="run"]')).not.toBeNull()
        // The pane's root is behind a template comment, so the layer is found by its own mark.
        const layer = () => w.find('[data-focused="true"]')
        expect(layer().exists()).toBe(false)

        w.findComponent(ProblemSubmit).vm.$emit('toggle-focus')
        await flushPromises()
        expect(layer().classes()).toContain('fixed')
        expect(w.findComponent(ProblemSubmit).props('focused')).toBe(true)
        // Run (and Submit, through actionsTo) move into the pane, where the layer does not cover them.
        expect(w.findComponent(ProblemSubmit).props('actionsTo')).toBe('#solve-focus-actions')
        expect(w.find('#solve-focus-actions [data-test="run"]').exists()).toBe(true)
        expect(target.querySelector('[data-test="run"]')).toBeNull()
        expect(document.documentElement.classList.contains('overflow-hidden')).toBe(true)

        // Escape inside an open menu is the menu's; the next one leaves.
        const menu = document.createElement('div')
        menu.setAttribute('role', 'listbox')
        document.body.appendChild(menu)
        menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()
        expect(layer().exists()).toBe(true)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()
        expect(layer().exists()).toBe(false)
        expect(w.findComponent(ProblemSubmit).props('actionsTo')).toBe('#actions')
        expect(document.documentElement.classList.contains('overflow-hidden')).toBe(false)
        expect(target.querySelector('[data-test="run"]')).not.toBeNull()
    })
})
