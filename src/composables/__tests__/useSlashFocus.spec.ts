// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useSlashFocus } from '../useSlashFocus'

const press = (target: Element | Document, init: KeyboardEventInit = {}) => {
    const e = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true, ...init })
    target.dispatchEvent(e)
    return e
}

const setup = () => {
    const search = document.createElement('input')
    document.body.append(search)
    const Host = defineComponent({
        setup() {
            useSlashFocus(ref(search))
            return () => h('div')
        },
    })
    return { search, wrapper: mount(Host) }
}

afterEach(() => { document.body.innerHTML = '' })

describe('useSlashFocus', () => {
    it('focuses the input from the page body and prevents the default', () => {
        const { search, wrapper } = setup()
        const e = press(document.body)
        expect(document.activeElement).toBe(search)
        expect(e.defaultPrevented).toBe(true)
        wrapper.unmount()
    })

    it('ignores "/" typed in another input, textarea or contenteditable', () => {
        const { search, wrapper } = setup()
        const other = document.createElement('input')
        const area = document.createElement('textarea')
        const editable = document.createElement('div')
        editable.contentEditable = 'true'
        // jsdom does not compute isContentEditable from the attribute
        Object.defineProperty(editable, 'isContentEditable', { value: true })
        document.body.append(other, area, editable)
        for (const el of [other, area, editable]) {
            const e = press(el)
            expect(e.defaultPrevented).toBe(false)
        }
        expect(document.activeElement).not.toBe(search)
        wrapper.unmount()
    })

    it('ignores "/" with Ctrl, Meta or Alt held', () => {
        const { search, wrapper } = setup()
        for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
            const e = press(document.body, mod)
            expect(e.defaultPrevented).toBe(false)
        }
        expect(document.activeElement).not.toBe(search)
        wrapper.unmount()
    })

    it('removes the listener on unmount', () => {
        const { search, wrapper } = setup()
        wrapper.unmount()
        const e = press(document.body)
        expect(e.defaultPrevented).toBe(false)
        expect(document.activeElement).not.toBe(search)
    })
})
