// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SubmissionDetailDialog from '../SubmissionDetailDialog.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'

const h = vi.hoisted(() => ({ fail: undefined as undefined | ((e: Error) => void) }))
vi.mock('@/services/submissionService', () => ({ default: { getSubmissionById: vi.fn(), rejudge: vi.fn() } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: vi.fn() }) }))
// The editor chunk stays pending until the test makes it fail.
vi.mock('@/components/common/CodeEditor.vue', () => new Promise((_, reject) => (h.fail = reject)))

const sub = {
  id: 'abcdef123456', status: 0, result: 0, errorMessage: '', cpuTime: 12, memory: 2097152,
  language: { name: 'C++', editorFormat: 'cpp' }, sourceCode: 'int main() {}', details: [],
} as unknown as Submission

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('SubmissionDetailDialog editor', () => {
  it('showsASkeletonWhileTheEditorLoadsAndAnErrorIfItCannot', async () => {
    setActivePinia(createPinia())
    vi.mocked(submissionService.getSubmissionById).mockResolvedValue({ data: { data: sub } } as never)
    wrapper = mount(SubmissionDetailDialog, {
      attachTo: document.body,
      props: { open: true, submissionId: 'abcdef123456', showSource: true },
    })
    await flushPromises()
    expect(document.body.querySelector('[data-test="editor-loading"]')).not.toBeNull()
    expect(document.body.querySelector('[data-test="editor-failed"]')).toBeNull()

    h.fail!(new Error('Failed to fetch dynamically imported module'))
    await flushPromises()
    expect(document.body.querySelector('[data-test="editor-loading"]')).toBeNull()
    expect(document.body.textContent).toContain('Could not load the editor')
  })
})
