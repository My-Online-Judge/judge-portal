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

    it('rendersNothingForEmpty', () => {
        expect(mount(RichContent, { props: { html: null } }).text()).toBe('')
    })
})
