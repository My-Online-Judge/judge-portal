// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h as vh, nextTick } from 'vue'
import CheckerCard from '../CheckerCard.vue'
import type { CheckerInfo } from '@/types/problem'

const svc = vi.hoisted(() => ({ getChecker: vi.fn(), uploadChecker: vi.fn(), removeChecker: vi.fn() }))
vi.mock('@/services/problemService', () => ({ default: svc }))
// The editor chunk is lazy; a stand-in that shows what it was given.
vi.mock('@/components/common/CodeEditor.vue', () => ({
    __esModule: true,
    default: defineComponent({
        props: ['modelValue', 'language', 'options'],
        setup: (p) => () => vh('div', { 'data-test': 'editor', 'data-lang': p.language, 'data-readonly': String(p.options?.readOnly) }, p.modelValue),
    }),
}))

const VERSION = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
const none: CheckerInfo = { spj: false, version: null, source: null }
const active: CheckerInfo = { spj: true, version: VERSION, source: 'int main() { return 0; }' }
const reply = (info: CheckerInfo) => ({ data: { data: info } })

let wrapper: VueWrapper | undefined
async function mountCard(info: CheckerInfo) {
    svc.getChecker.mockResolvedValue(reply(info))
    wrapper = mount(CheckerCard, { attachTo: document.body, props: { slug: 'sum' } })
    await flushPromises()
}
const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement
const fileInput = () => document.body.querySelector('input[type="file"]') as HTMLInputElement
async function pick(file: File) {
    Object.defineProperty(fileInput(), 'files', { configurable: true, value: [file] })
    fileInput().dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
}

beforeEach(() => Object.values(svc).forEach((m) => m.mockReset()))
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('CheckerCard', () => {
    it('noCheckerShowsUpload', async () => {
        await mountCard(none)
        expect(svc.getChecker).toHaveBeenCalledWith('sum')
        expect(document.body.textContent).toContain('No checker. Outputs are compared exactly.')
        expect(button('Upload checker')).toBeTruthy()
        expect(button('View source')).toBeUndefined()
        expect(button('Remove…')).toBeUndefined()
        expect(fileInput().accept).toBe('.cpp,.cc,.cxx')
    })

    it('anActiveCheckerShowsItsVersionAndTheOtherActions', async () => {
        await mountCard(active)
        expect(document.body.textContent).toContain('Checker active, version abcdef012345')
        expect(document.body.textContent).not.toContain('abcdef0123456')
        expect(button('Replace checker')).toBeTruthy()
        expect(button('View source')).toBeTruthy()
        expect(button('Remove…')).toBeTruthy()
    })

    it('uploadSendsTheFile', async () => {
        await mountCard(none)
        svc.uploadChecker.mockResolvedValue(reply({ spj: true, version: VERSION, source: null }))
        svc.getChecker.mockResolvedValue(reply(active))
        const file = new File(['int main(){}'], 'spj.cpp')
        await pick(file)
        expect(svc.uploadChecker).toHaveBeenCalledWith('sum', file)
        expect(document.body.textContent).toContain('Checker active, version abcdef012345')
    })

    it('oversizedFileIsRefusedClientSide', async () => {
        await mountCard(none)
        await pick(new File([new Uint8Array(65_537)], 'spj.cpp'))
        expect(svc.uploadChecker).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('A checker is at most 64 KiB')
    })

    it('aFileOfExactlyTheLimitIsSent', async () => {
        await mountCard(none)
        svc.uploadChecker.mockResolvedValue(reply(active))
        await pick(new File([new Uint8Array(65_536)], 'spj.cpp'))
        expect(svc.uploadChecker).toHaveBeenCalledTimes(1)
    })

    it('aNonCppFileIsRefusedClientSide', async () => {
        await mountCard(none)
        await pick(new File(['x'], 'spj.py'))
        expect(svc.uploadChecker).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('A checker is a .cpp, .cc or .cxx file')
    })

    it('viewSourceOpensAReadOnlyEditor', async () => {
        await mountCard(active)
        button('View source').click()
        await vi.waitFor(() => expect(document.body.querySelector('[data-test="editor"]')).not.toBeNull())
        const ed = document.body.querySelector('[data-test="editor"]') as HTMLElement
        expect(ed.dataset.lang).toBe('cpp')
        expect(ed.dataset.readonly).toBe('true')
        expect(ed.textContent).toBe('int main() { return 0; }')
    })

    it('removeConfirmsThenCalls', async () => {
        await mountCard(active)
        button('Remove…').click()
        await nextTick()
        expect(document.body.querySelector('[data-slot="confirm-icon"]')?.getAttribute('data-tone')).toBe('destructive')
        expect(svc.removeChecker).not.toHaveBeenCalled()
        svc.removeChecker.mockResolvedValue({ data: {} })
        svc.getChecker.mockResolvedValue(reply(none))
        button('Remove checker').click()
        await flushPromises()
        expect(svc.removeChecker).toHaveBeenCalledWith('sum')
        expect(document.body.textContent).toContain('No checker. Outputs are compared exactly.')
    })

    it('contractAndExampleAreShown', async () => {
        await mountCard(none)
        const text = document.body.textContent ?? ''
        expect(text).toContain('spj <input_file> <user_output_file>')
        expect(text).toContain('return a == b ? 0 : 1')
        expect(text).toContain('The expected output is not passed.')
        expect(text).toContain('A checker that does not compile makes every submission a System Error until it is fixed.')
    })
})
