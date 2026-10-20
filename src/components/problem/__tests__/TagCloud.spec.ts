// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const tags = vi.hoisted(() => Array.from({ length: 25 }, (_, i) => ({ tag: `t${i}`, count: 25 - i })))
vi.mock('@/services/problemService', () => ({
    default: { getTags: vi.fn().mockResolvedValue({ data: { data: tags } }) },
}))

import TagCloud from '../TagCloud.vue'

describe('TagCloud', () => {
    it('shows top 20 from the API and emits select', async () => {
        const w = mount(TagCloud)
        await flushPromises()
        const buttons = w.findAll('button')
        expect(buttons).toHaveLength(20)
        await buttons[0].trigger('click')
        expect(w.emitted('select')?.[0]).toEqual(['t0'])
    })

    it('pressedTagShowsCheck', async () => {
        const w = mount(TagCloud, { props: { selected: 't1' } })
        await flushPromises()
        const buttons = w.findAll('button')
        expect(buttons[1].attributes('aria-pressed')).toBe('true')
        expect(buttons[1].find('svg').exists()).toBe(true)
        expect(buttons[0].attributes('aria-pressed')).toBe('false')
        expect(buttons[0].find('svg').exists()).toBe(false)
    })
})
