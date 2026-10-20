// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    submit: vi.fn(),
    triggerToast: vi.fn(),
    errorToast: vi.fn(),
    loading: vi.fn(),
}))

vi.mock('@/services/submissionService', () => ({ default: { submit: h.submit } }))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({
        toasts: ref([]),
        triggerToast: h.triggerToast,
        loading: h.loading,
        error: h.errorToast,
        countdown: vi.fn(() => ({ id: 2, update: vi.fn(), dismiss: vi.fn() })),
    }),
}))
// Monaco needs a real browser: a textarea stands in for the editor.
vi.mock('@/components/common/CodeEditor.vue', async () => {
    const { defineComponent, h: render } = await import('vue')
    return {
        default: defineComponent({
            props: { modelValue: String },
            emits: ['update:modelValue', 'mount'],
            setup: (p, { emit }) => () =>
                render('textarea', {
                    'data-test': 'editor',
                    value: p.modelValue,
                    onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLTextAreaElement).value),
                }),
        }),
    }
})

import ProblemSubmit from '../ProblemSubmit.vue'
import { useAuthStore } from '@/stores/auth'

const cpp = { id: 'l1', name: 'C++17', identifier: 'cpp17' }
let wrapper: VueWrapper | undefined

async function mountSubmit(props: Record<string, unknown> = {}) {
    setActivePinia(createPinia())
    useAuthStore().isAuthenticated = true
    wrapper = mount(ProblemSubmit, {
        attachTo: document.body,
        props: { languages: [cpp], problemSlug: 'sum', ...props },
        global: { stubs: { LoginModal: true, ConfirmDialog: true } },
    })
    await flushPromises()
    return wrapper
}

async function typeCode(code: string) {
    await wrapper!.get('[data-test="editor"]').setValue(code)
}

const submitButton = () => wrapper!.findAll('button').find((b) => b.text().startsWith('Submit'))!

beforeEach(() => {
    h.loading.mockReturnValue({ id: 1, update: vi.fn(), dismiss: vi.fn() })
    h.submit.mockResolvedValue({ data: { data: { id: 's1', status: 6 } } })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('ProblemSubmit', () => {
    it('submitSendsContestSlugWhenGiven', async () => {
        await mountSubmit({ contestSlug: 'spring-cup' })
        await typeCode('int main() {}')
        await submitButton().trigger('click')
        await flushPromises()
        expect(h.submit).toHaveBeenCalledWith({
            problemSlug: 'sum',
            languageIdentifier: 'cpp17',
            sourceCode: 'int main() {}',
            contestSlug: 'spring-cup',
        })
    })

    it('withoutAContestSlugTheRequestHasNone', async () => {
        await mountSubmit()
        await typeCode('int main() {}')
        await submitButton().trigger('click')
        await flushPromises()
        expect(h.submit).toHaveBeenCalledTimes(1)
        expect(h.submit.mock.calls[0]![0]).not.toHaveProperty('contestSlug')
    })

    it('disabledReasonDisablesSubmitAndShowsTheText', async () => {
        const reason = 'This problem opens for practice when an admin makes it public.'
        const w = await mountSubmit({ disabledReason: reason })
        await typeCode('int main() {}')
        expect(w.text()).toContain(reason)
        expect(submitButton().attributes('disabled')).toBeDefined()
        // The shortcut does nothing either.
        ;(w.vm as unknown as { submit: () => void }).submit()
        await flushPromises()
        expect(h.submit).not.toHaveBeenCalled()
    })

    it('aContestThatStoppedRunningSaysSoAndAsksTheParentToReload', async () => {
        h.submit.mockRejectedValue({
            isAxiosError: true,
            response: { status: 400, headers: {}, data: { status: 400, message: 'Contest is not running' } },
        })
        const w = await mountSubmit({ contestSlug: 'spring-cup' })
        await typeCode('int main() {}')
        await submitButton().trigger('click')
        await flushPromises()
        expect(h.errorToast).toHaveBeenCalledWith('Contest is not running', {
            description: 'Your code is still in the editor. Submit again to practice.',
        })
        expect(w.emitted('contest-not-running')).toHaveLength(1)
        // The code stays, so a practice submit is one click away.
        expect((w.get('[data-test="editor"]').element as HTMLTextAreaElement).value).toBe('int main() {}')
    })
})
