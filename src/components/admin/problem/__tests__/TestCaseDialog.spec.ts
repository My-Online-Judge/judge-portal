// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TestCaseDialog from '../TestCaseDialog.vue'

let wrapper: VueWrapper | undefined

function mountDialog(props: Record<string, unknown> = {}) {
    wrapper = mount(TestCaseDialog, {
        attachTo: document.body,
        props: { open: true, mode: 'edit', initial: { input: '1 2', output: '3' }, ...props },
    })
    return wrapper
}

const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement
const area = (id: string) => document.body.querySelector(`#${id}`) as HTMLTextAreaElement

async function type(el: HTMLTextAreaElement, value: string) {
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
}

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('TestCaseDialog', () => {
    it('oversizedShowsFilePickers', async () => {
        mountDialog({ oversized: true, initial: null })
        await nextTick()
        expect(document.body.querySelector('textarea')).toBeNull()
        expect(document.body.querySelectorAll('input[type="file"]')).toHaveLength(2)
        expect(document.body.textContent).toContain('Too large to edit here')
    })

    it('dirtyCloseAsksToDiscard', async () => {
        const w = mountDialog()
        await nextTick()
        await type(area('tc-input'), '9 9')
        button('Cancel').click()
        await nextTick()
        expect(document.body.textContent).toContain('Discard unsaved changes?')
        expect(w.emitted('update:open')).toBeUndefined()
        button('Discard').click()
        await nextTick()
        expect(w.emitted('update:open')).toEqual([[false]])
    })

    it('cleanCloseDoesNotAsk', async () => {
        const w = mountDialog()
        await nextTick()
        button('Cancel').click()
        await nextTick()
        expect(document.body.textContent).not.toContain('Discard unsaved changes?')
        expect(w.emitted('update:open')).toEqual([[false]])
    })

    it('saveEmitsBlobs', async () => {
        const w = mountDialog()
        await nextTick()
        await type(area('tc-input'), '4 5')
        await type(area('tc-output'), '9')
        button('Save').click()
        await nextTick()
        const [payload] = w.emitted('save')![0] as [{ input: Blob; output: Blob }]
        expect(payload.input).toBeInstanceOf(Blob)
        expect(await payload.input.text()).toBe('4 5')
        expect(await payload.output.text()).toBe('9')
    })

    it('pickerLabelsDependOnMode', async () => {
        mountDialog({ mode: 'add', initial: null })
        await nextTick()
        button('Upload files instead').click()
        await nextTick()
        expect(document.body.textContent).toContain('Input file (.in)')
        expect(document.body.textContent).toContain('Expected output file (.out)')
        expect(document.body.textContent).not.toContain('Replace .in')
        // the <Label for> still points at a real control
        expect(document.body.querySelector('label[for="tc-input"]')).not.toBeNull()
        expect(document.body.querySelector('input#tc-input[type="file"]')).not.toBeNull()
        wrapper?.unmount()
        document.body.innerHTML = ''
        mountDialog({ oversized: true, initial: null })
        await nextTick()
        expect(document.body.textContent).toContain('Replace .in')
        expect(document.body.textContent).not.toContain('Contestants judge against')
    })

    it('addCanSwitchToFilePickers', async () => {
        const w = mountDialog({ mode: 'add', initial: null })
        await nextTick()
        expect(document.body.querySelector('textarea')).not.toBeNull()
        button('Upload files instead').click()
        await nextTick()
        expect(document.body.querySelector('textarea')).toBeNull()
        const files = [...document.body.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
        expect(files).toHaveLength(2)
        expect(document.body.textContent).toContain('Choose the input and expected output files.')
        const pick = (el: HTMLInputElement, f: File) => {
            Object.defineProperty(el, 'files', { value: [f], configurable: true })
            el.dispatchEvent(new Event('change', { bubbles: true }))
        }
        pick(files[0], new File(['big in'], 'a.in'))
        pick(files[1], new File(['big out'], 'a.out'))
        await nextTick()
        button('Save').click()
        await nextTick()
        const [payload] = w.emitted('save')![0] as [{ input: Blob; output: Blob }]
        expect(await payload.input.text()).toBe('big in')
        expect(await payload.output.text()).toBe('big out')
    })
})
