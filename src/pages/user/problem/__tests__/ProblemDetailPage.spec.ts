// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as render, onMounted, type Ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    isDesktop: null as unknown as Ref<boolean>,
    getProblemBySlug: vi.fn(),
    getContest: vi.fn(),
    getContestProblem: vi.fn(),
    solveMounts: 0,
    route: null as unknown as { params: Record<string, string> },
    getMe: vi.fn(),
}))

vi.mock('@vueuse/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@vueuse/core')>()
    const { ref } = await import('vue')
    h.isDesktop = ref(true)
    return { ...actual, useMediaQuery: () => h.isDesktop }
})
vi.mock('vue-router', async (importOriginal) => {
    const { reactive: r } = await import('vue')
    h.route = r({ params: { slug: 'tong-tu-1-den-n' } as Record<string, string> })
    return { ...(await importOriginal<typeof import('vue-router')>()), useRoute: () => h.route }
})
vi.mock('@/services/problemService', () => ({ default: { getProblemBySlug: h.getProblemBySlug } }))
vi.mock('@/services/contestService', () => ({ default: { get: h.getContest, getProblem: h.getContestProblem } }))
vi.mock('@/services/authService', () => ({ default: { getMe: h.getMe, logout: vi.fn() } }))
// The real SolvePane is stubbed below, but its import chain still reaches Monaco, which needs a real browser.
vi.mock('@/lib/monaco', () => ({}))

import ProblemDetailPage from '../ProblemDetailPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

// Stands in for the editor pane: it counts its mounts and holds typed text like Monaco does.
const SolvePane = defineComponent({
    name: 'SolvePane',
    props: { slug: String, submitBarTo: String, contestSlug: String, disabledReason: String },
    emits: ['success', 'judged', 'contest-not-running'],
    setup() {
        onMounted(() => h.solveMounts++)
        return () => render('textarea', { 'data-testid': 'editor' })
    },
})
const Slot = defineComponent({ setup: (_, { slots }) => () => render('div', slots.default?.()) })

let wrapper: VueWrapper | null = null

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.clearAllMocks()
    vi.restoreAllMocks()
})

const stubs = {
    SolvePane,
    StatementPane: true,
    ProblemHeader: true,
    RouterLink: true,
    ResizablePanelGroup: Slot,
    ResizablePanel: Slot,
    ResizableHandle: true,
}

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

    describe('in a contest', () => {
        const problem = { problemSlug: 'tong-hai-so', title: 'Tổng hai số', status: 1 }
        const contest = (phase: string, status = 'PUBLISHED') => ({
            slug: 'spring-cup', title: 'Spring cup', phase, status, problems: [], myProgress: {},
            startsAt: '2026-10-21T09:00:00Z', endsAt: '2026-10-21T11:00:00Z', serverTime: '2026-10-21T10:00:00Z',
        })
        const mountContestPage = async ({ signedIn = true } = {}) => {
            h.isDesktop.value = true
            h.route.params = { contestSlug: 'spring-cup', label: 'A' }
            if (signedIn) useAuthStore().user = { id: 'me', permissions: [] } as never
            wrapper = mount(ProblemDetailPage, { attachTo: document.body, global: { stubs } })
            await flushPromises()
            return wrapper
        }
        const PRACTICE = 'Practice: this contest has ended, so submissions do not count.'

        afterEach(() => {
            h.route.params = { slug: 'tong-tu-1-den-n' }
            useLoginPrompt().open.value = false
        })

        it('aSignedOutVisitorGetsTheLoginDialogAndThenTheProblem', async () => {
            h.getMe.mockRejectedValue({ response: { status: 401 } })
            vi.spyOn(console, 'error').mockImplementation(() => {})
            h.getContest.mockResolvedValue({ data: { data: contest('RUNNING') } })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            const w = await mountContestPage({ signedIn: false })
            // The header's login dialog, not the admin console's sign-in page; the problem is not asked for (a 401).
            expect(useLoginPrompt().open.value).toBe(true)
            expect(h.getContestProblem).not.toHaveBeenCalled()
            expect(w.text()).toContain('Log in to open this problem')
            expect(w.findComponent(SolvePane).exists()).toBe(false)

            useAuthStore().user = { id: 'me', permissions: [] } as never
            await flushPromises()
            expect(h.getContestProblem).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup', 'A')
            expect(w.findComponent(SolvePane).props('contestSlug')).toBe('spring-cup')
        })

        it('aRunningContestSubmitsWithItsSlug', async () => {
            h.getContest.mockResolvedValue({ data: { data: contest('RUNNING') } })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            const w = await mountContestPage()
            expect(h.getContest).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup')
            expect(h.getContestProblem).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup', 'A')
            expect(h.getProblemBySlug).not.toHaveBeenCalled()
            const pane = w.findComponent(SolvePane)
            expect(pane.props('contestSlug')).toBe('spring-cup')
            // The editor and the submissions list work on the problem's own slug.
            expect(pane.props('slug')).toBe('tong-hai-so')
            expect(pane.props('disabledReason')).toBeUndefined()
            expect(w.text()).not.toContain(PRACTICE)
        })

        it('aDraftInItsWindowIsAPreviewThatSubmitsWithoutTheContest', async () => {
            // Only an editor sees a draft; the judge takes contest submissions for a published contest only.
            h.getContest.mockResolvedValue({ data: { data: contest('RUNNING', 'DRAFT') } })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            const w = await mountContestPage()
            expect(w.findComponent(SolvePane).props('contestSlug')).toBeUndefined()
            expect(w.text()).toContain('Preview: this contest is a draft, so submissions do not count.')
        })

        it('aProblemTheContestDoesNotShowIsNotAvailable', async () => {
            h.getContest.mockResolvedValue({ data: { data: contest('UPCOMING') } })
            h.getContestProblem.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
            const w = await mountContestPage()
            expect(w.text()).toContain('This problem is not available')
            expect(w.text()).not.toContain('Please try again')
        })

        it('aContestThatIsNotThereIsNotAvailableEither', async () => {
            h.getContest.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
            h.getContestProblem.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
            const w = await mountContestPage()
            expect(w.text()).toContain('This problem is not available')
        })

        it('aNetworkFailureStillSaysTryAgain', async () => {
            h.getContest.mockResolvedValue({ data: { data: contest('RUNNING') } })
            h.getContestProblem.mockRejectedValue(new Error('Network Error'))
            const w = await mountContestPage()
            expect(w.text()).toContain("Couldn't load this problem. Please try again.")
            expect(w.text()).not.toContain('This problem is not available')
        })

        it('leavingAbortsTheContestRead', async () => {
            let signal: AbortSignal | undefined
            h.getContest.mockImplementation((s: AbortSignal) => {
                signal = s
                return new Promise(() => {})
            })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            await mountContestPage()
            wrapper!.unmount()
            wrapper = null
            expect(signal!.aborted).toBe(true)
        })

        it('anEndedContestIsPracticeWithABanner', async () => {
            h.getContest.mockResolvedValue({ data: { data: contest('ENDED') } })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            const w = await mountContestPage()
            expect(w.text()).toContain(PRACTICE)
            expect(w.findComponent(SolvePane).props('contestSlug')).toBeUndefined()
            expect(w.findComponent(SolvePane).props('disabledReason')).toBeUndefined()
        })

        it('anInactiveProblemCannotBePractisedAfterTheEnd', async () => {
            h.getContest.mockResolvedValue({ data: { data: contest('ENDED') } })
            h.getContestProblem.mockResolvedValue({ data: { data: { ...problem, status: 0 } } })
            const w = await mountContestPage()
            expect(w.findComponent(SolvePane).props('disabledReason')).toBe(
                'This problem opens for practice when an admin makes it public.',
            )
        })

        it('aContestThatEndsWhileOpenSwitchesToPractice', async () => {
            h.getContest.mockResolvedValueOnce({ data: { data: contest('RUNNING') } })
            h.getContestProblem.mockResolvedValue({ data: { data: problem } })
            const w = await mountContestPage()
            const editor = document.querySelector<HTMLTextAreaElement>('[data-testid="editor"]')!
            editor.value = 'int main() {}'

            h.getContest.mockResolvedValueOnce({ data: { data: contest('ENDED') } })
            w.findComponent(SolvePane).vm.$emit('contest-not-running')
            await flushPromises()

            expect(h.getContest).toHaveBeenCalledTimes(2)
            expect(w.text()).toContain(PRACTICE)
            expect(w.findComponent(SolvePane).props('contestSlug')).toBeUndefined()
            // Same editor, same code: only the submit mode changed.
            expect(document.querySelector('[data-testid="editor"]')).toBe(editor)
            expect(editor.value).toBe('int main() {}')
        })
    })
})
