// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import UnsavedChangesBar from '../UnsavedChangesBar.vue'

let wrapper: VueWrapper | undefined

const pressSave = (init: KeyboardEventInit = { ctrlKey: true }) => {
    const e = new KeyboardEvent('keydown', { key: 's', cancelable: true, bubbles: true, ...init })
    window.dispatchEvent(e)
    return e
}

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('UnsavedChangesBar', () => {
    it('unsavedBarCtrlSSaves', async () => {
        wrapper = mount(UnsavedChangesBar, { attachTo: document.body, props: { dirty: true } })

        const ctrl = pressSave()
        expect(wrapper.emitted('save')).toHaveLength(1)
        expect(ctrl.defaultPrevented).toBe(true)

        const cmd = pressSave({ metaKey: true })
        expect(wrapper.emitted('save')).toHaveLength(2)
        expect(cmd.defaultPrevented).toBe(true)

        await wrapper.setProps({ dirty: false })
        const clean = pressSave()
        expect(wrapper.emitted('save')).toHaveLength(2)
        expect(clean.defaultPrevented).toBe(false)
    })

    it('plainSDoesNothing', () => {
        wrapper = mount(UnsavedChangesBar, { attachTo: document.body, props: { dirty: true } })
        const e = pressSave({})
        expect(wrapper.emitted('save')).toBeUndefined()
        expect(e.defaultPrevented).toBe(false)
    })

    it('stopsListeningWhenUnmounted', () => {
        wrapper = mount(UnsavedChangesBar, { attachTo: document.body, props: { dirty: true } })
        wrapper.unmount()
        wrapper = undefined
        // No listener is left behind, so the browser keeps its own Ctrl+S.
        expect(pressSave().defaultPrevented).toBe(false)
    })

    it('rendersSummaryAndButtons', async () => {
        wrapper = mount(UnsavedChangesBar, {
            attachTo: document.body,
            props: { dirty: true, summary: 'in the statement' },
        })
        const region = wrapper.get('[role="region"]')
        expect(region.attributes('aria-label')).toBe('Unsaved changes')
        expect(region.text()).toContain('Unsaved changes')
        expect(region.text()).toContain('in the statement')

        const buttons = wrapper.findAll('button')
        const discard = buttons.find((b) => b.text() === 'Discard')!
        const save = buttons.find((b) => b.text().startsWith('Save changes'))!
        await discard.trigger('click')
        await save.trigger('click')
        expect(wrapper.emitted('discard')).toHaveLength(1)
        expect(wrapper.emitted('save')).toHaveLength(1)

        await wrapper.setProps({ saving: true })
        expect(wrapper.findAll('button').find((b) => b.text().startsWith('Save changes'))!.attributes('aria-busy')).toBe('true')
    })

    it('hiddenWhenClean', () => {
        wrapper = mount(UnsavedChangesBar, { attachTo: document.body, props: { dirty: false } })
        expect(wrapper.find('[role="region"]').exists()).toBe(false)
    })
})
