// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TagInput from '../TagInput.vue'

const mk = (modelValue: string[] = [], suggestions: string[] = []) =>
    mount(TagInput, { props: { modelValue, suggestions } })

const lastEmit = (w: ReturnType<typeof mk>) => {
    const e = w.emitted('update:modelValue')
    return e ? e[e.length - 1][0] : undefined
}

describe('TagInput', () => {
    it('enterAddsTag', async () => {
        const w = mk(['dp'])
        const input = w.find('input')
        await input.setValue('Greedy')
        await input.trigger('keydown', { key: 'Enter' })
        expect(lastEmit(w)).toEqual(['dp', 'greedy'])
    })

    it('ignoresEnterWhileComposing', async () => {
        const w = mk(['dp'])
        const input = w.find('input')
        await input.setValue('くらす')
        await input.trigger('keydown', { key: 'Enter', isComposing: true })
        await input.trigger('keydown', { key: ',', isComposing: true })
        expect(w.emitted('update:modelValue')).toBeUndefined()
    })

    it('commaAddsTag', async () => {
        const w = mk()
        const input = w.find('input')
        await input.setValue('math')
        await input.trigger('keydown', { key: ',' })
        expect(lastEmit(w)).toEqual(['math'])
    })

    it('duplicateIgnored', async () => {
        const w = mk(['dp'])
        const input = w.find('input')
        await input.setValue('DP')
        await input.trigger('keydown', { key: 'Enter' })
        expect(lastEmit(w)).toBeUndefined()
        expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('invalidShowsError', async () => {
        const w = mk()
        const input = w.find('input')
        await input.setValue('bad tag')
        await input.trigger('keydown', { key: 'Enter' })
        expect(lastEmit(w)).toBeUndefined()
        expect(w.find('[role="alert"]').exists()).toBe(true)
    })

    it('maxTenDisablesInput', () => {
        const w = mk(Array.from({ length: 10 }, (_, i) => `t${i}`))
        expect(w.find('input').attributes('disabled')).toBeDefined()
    })

    it('backspaceRemovesLast', async () => {
        const w = mk(['a', 'b'])
        await w.find('input').trigger('keydown', { key: 'Backspace' })
        expect(lastEmit(w)).toEqual(['a'])
    })

    it('clicking a suggestion adds it', async () => {
        const w = mk([], ['graphs', 'greedy'])
        const input = w.find('input')
        await input.setValue('gr')
        await input.trigger('focus')
        const opts = w.findAll('[data-testid="tag-suggestion"]')
        expect(opts).toHaveLength(2)
        await opts[0].trigger('mousedown')
        expect(lastEmit(w)).toEqual(['graphs'])
    })
})
