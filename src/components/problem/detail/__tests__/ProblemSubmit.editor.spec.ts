// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({ fail: undefined as undefined | ((e: Error) => void) }))
vi.mock('@/services/submissionService', () => ({ default: { submit: vi.fn() } }))
// The Monaco chunk (3.7 MB) stays pending until the test makes it fail.
vi.mock('@/components/common/CodeEditor.vue', () => new Promise((_, reject) => (h.fail = reject)))

import ProblemSubmit from '../ProblemSubmit.vue'

let wrapper: VueWrapper | undefined
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('ProblemSubmit editor', () => {
    it('rendersAroundASkeletonWhileTheEditorChunkLoadsAndSaysSoIfItCannot', async () => {
        setActivePinia(createPinia())
        wrapper = mount(ProblemSubmit, {
            attachTo: document.body,
            props: { languages: [{ id: 'l1', name: 'C++17', identifier: 'cpp17' }], problemSlug: 'sum' },
            global: { stubs: { LoginModal: true, ConfirmDialog: true } },
        })
        await flushPromises()
        // The pane and its submit bar are there before Monaco: the page (and its statement) does not wait for it.
        const skeleton = document.body.querySelector<HTMLElement>('[data-test="editor-loading"]')
        expect(skeleton).not.toBeNull()
        expect(skeleton!.style.height).toBe('100%')
        expect([...document.body.querySelectorAll('button')].some((b) => b.textContent?.includes('Log in'))).toBe(true)

        // Vue logs the failed loader; the page shows the notice instead.
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        h.fail!(new Error('Failed to fetch dynamically imported module'))
        await flushPromises()
        expect(warn).toHaveBeenCalled()
        warn.mockRestore()
        error.mockRestore()
        expect(document.body.querySelector('[data-test="editor-loading"]')).toBeNull()
        expect(document.body.textContent).toContain('Could not load the editor')
    })
})
