// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ProblemFormFields, { type ProblemFormValue } from '../ProblemFormFields.vue'

vi.mock('@/services/problemService', () => ({
    default: { getTags: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}))

const value = (over: Partial<ProblemFormValue> = {}): ProblemFormValue => ({
    title: 't', problemSlug: 's', subject: 'x', description: '', timeLimit: 1000, memoryLimit: 256,
    hardnessLevel: 1, inputDescription: '', outputDescription: '', sampleInput: '', sampleOutput: '',
    hint: '', status: 1, tags: [], ...over,
})

describe('ProblemFormFields preview', () => {
    it('previewToggleShowsTheRenderedStatement', async () => {
        const w = mount(ProblemFormFields, {
            props: { modelValue: value({ description: '<p>$x$</p>' }), mode: 'create' },
            global: { stubs: { RichTextEditor: true } },
        })
        await flushPromises()
        expect(w.find('.katex').exists()).toBe(false)
        await w.get('[aria-label="Preview statement"]').trigger('click')
        expect(w.find('.katex').exists()).toBe(true)
    })

    it('previewCoversInputOutputAndHint', async () => {
        const w = mount(ProblemFormFields, {
            props: {
                modelValue: value({ inputDescription: '<p>$a$</p>', outputDescription: '<p>$b$</p>', hint: '<p>$c$</p>' }),
                mode: 'create',
            },
            global: { stubs: { RichTextEditor: true } },
        })
        await flushPromises()
        await w.get('[aria-label="Preview statement"]').trigger('click')
        expect(w.findAll('.katex').length).toBe(3)
    })
})
