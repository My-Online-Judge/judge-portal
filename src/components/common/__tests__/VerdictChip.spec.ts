// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VerdictChip from '@/components/common/VerdictChip.vue'

describe('VerdictChip', () => {
    it('chipShowsCodeAndAccessibleName', () => {
        const w = mount(VerdictChip, { props: { status: -1 } })
        expect(w.text()).toContain('WA')
        expect(w.find('.sr-only').text()).toBe('Wrong answer')
        expect(w.classes()).toContain('v-wa')
        expect(w.attributes('title')).toBe('Wrong answer')
    })

    it('chipLabelReplacesSrName', () => {
        const w = mount(VerdictChip, { props: { status: -1, label: 'Wrong answer on test 7' } })
        expect(w.find('.full').text()).toBe('Wrong answer on test 7')
        expect(w.find('.sr-only').exists()).toBe(false)
    })

    it('judgingChipHasSpinner', () => {
        const w = mount(VerdictChip, { props: { status: 7 } })
        expect(w.find('[data-test="spinner"]').exists()).toBe(true)
        expect(w.find('svg').exists()).toBe(false)
    })

    it('unknownStatusRendersQuestionMark', () => {
        const w = mount(VerdictChip, { props: { status: 99 } })
        expect(w.text()).toContain('?')
        expect(w.find('.sr-only').text()).toBe('Unknown status')
    })

    it('appliesSize', () => {
        expect(mount(VerdictChip, { props: { status: 0, size: 'lg' } }).classes()).toContain('lg')
    })
})
