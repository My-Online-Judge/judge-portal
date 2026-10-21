// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RichContent from '../RichContent.vue'

describe('RichContent', () => {
    it('htmlIsSanitisedBeforeMath', () => {
        const w = mount(RichContent, { props: { html: '<img src=x onerror=alert(1)> $y$' } })
        expect(w.html()).not.toContain('onerror')
        expect(w.find('.katex').exists()).toBe(true)
    })

    it('statementMathHasBothRenderings', () => {
        const w = mount(RichContent, { props: { html: '<p>Given $1 \\le n$</p>' } })
        // The visual rendering is hidden from screen readers, which read the MathML instead.
        expect(w.find('.katex-html[aria-hidden="true"]').exists()).toBe(true)
        expect(w.find('.katex-mathml math').exists()).toBe(true)
        expect(w.find('.katex-mathml annotation[encoding="application/x-tex"]').text()).toBe('1 \\le n')
    })

    it('rendersNothingForEmpty', () => {
        expect(mount(RichContent, { props: { html: null } }).text()).toBe('')
    })
})
