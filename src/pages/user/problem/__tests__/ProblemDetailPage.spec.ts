// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render, onMounted, reactive, type Ref } from 'vue'

const h = vi.hoisted(() => ({
    isDesktop: null as unknown as Ref<boolean>,
    getProblemBySlug: vi.fn(),
    solveMounts: 0,
}))

vi.mock('@vueuse/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@vueuse/core')>()
    const { ref } = await import('vue')
    h.isDesktop = ref(true)
    return { ...actual, useMediaQuery: () => h.isDesktop }
})
vi.mock('vue-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('vue-router')>()),
    useRoute: () => reactive({ params: { slug: 'tong-tu-1-den-n' } }),
}))
vi.mock('@/services/problemService', () => ({ default: { getProblemBySlug: h.getProblemBySlug } }))
// The real SolvePane is stubbed below, but its import chain still reaches Monaco, which needs a real browser.
vi.mock('@/lib/monaco', () => ({}))

import ProblemDetailPage from '../ProblemDetailPage.vue'

// Stands in for the editor pane: it counts its mounts and holds typed text like Monaco does.
const SolvePane = defineComponent({
    name: 'SolvePane',
    props: { slug: String, submitBarTo: String },
    setup() {
        onMounted(() => h.solveMounts++)
        return () => render('textarea', { 'data-testid': 'editor' })
    },
})
const Slot = defineComponent({ setup: (_, { slots }) => () => render('div', slots.default?.()) })

let wrapper: VueWrapper | null = null

afterEach(() => {
    wrapper?.unmount()
    wrapper = null
})

describe('ProblemDetailPage', () => {
    it('editorSurvivesTheBreakpoint', async () => {
        h.isDesktop.value = true
        h.solveMounts = 0
        h.getProblemBySlug.mockResolvedValue({ data: { data: { slug: 'tong-tu-1-den-n', title: 'TỔNG TỪ 1 ĐẾN N' } } })
        wrapper = mount(ProblemDetailPage, {
            attachTo: document.body,
            global: {
                stubs: {
                    SolvePane,
                    StatementPane: true,
                    ProblemHeader: true,
                    RouterLink: true,
                    ResizablePanelGroup: Slot,
                    ResizablePanel: Slot,
                    ResizableHandle: true,
                },
            },
        })
        await flushPromises()

        const editor = document.querySelector<HTMLTextAreaElement>('[data-testid="editor"]')!
        expect(editor).not.toBeNull()
        editor.value = 'int main() {}'
        expect(wrapper.findComponent(SolvePane).props('submitBarTo')).toBeUndefined()

        // Below 900 px: the same pane moves into the Code view and renders its submit bar in the pinned bar.
        h.isDesktop.value = false
        await flushPromises()
        expect(h.solveMounts).toBe(1)
        expect(document.querySelectorAll('[data-testid="editor"]')).toHaveLength(1)
        expect(document.getElementById('problem-view-code')?.contains(editor)).toBe(true)
        expect(editor.value).toBe('int main() {}')
        expect(wrapper.findComponent(SolvePane).props('submitBarTo')).toBe('#problem-submit-bar')

        // And back.
        h.isDesktop.value = true
        await flushPromises()
        expect(h.solveMounts).toBe(1)
        expect(document.getElementById('problem-view-code')).toBeNull()
        expect(document.querySelector('[data-testid="editor"]')).toBe(editor)
        expect(editor.value).toBe('int main() {}')
    })
})
