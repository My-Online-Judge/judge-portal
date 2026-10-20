// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ importPackage: vi.fn() }))
vi.mock('@/services/problemService', () => ({ default: { importPackage: h.importPackage } }))

import ImportPackageDialog from '../ImportPackageDialog.vue'

let wrapper: VueWrapper | undefined
const mountDialog = () => {
    wrapper = mount(ImportPackageDialog, { attachTo: document.body, props: { open: true } })
    return wrapper
}
const submit = () => [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Import') as HTMLButtonElement
const fileInput = () => document.body.querySelector('input[type="file"]') as HTMLInputElement
const slugInput = () => document.body.querySelector('#import-slug') as HTMLInputElement

async function pick(name = 'two-sum.zip') {
    const file = new File(['PK'], name, { type: 'application/zip' })
    Object.defineProperty(fileInput(), 'files', { configurable: true, value: [file] })
    fileInput().dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    return file
}
async function typeSlug(value: string) {
    slugInput().value = value
    slugInput().dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
}
const failWith = (status: number, message: string) =>
    Object.assign(new Error('x'), { isAxiosError: true, response: { status, data: { message } } })

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('ImportPackageDialog', () => {
    it('submitDisabledWithoutAFile', async () => {
        mountDialog()
        await nextTick()
        expect(fileInput().accept).toBe('.zip')
        expect(submit().disabled).toBe(true)
        await pick()
        expect(submit().disabled).toBe(false)
    })

    it('invalidOverrideBlocksSubmit', async () => {
        mountDialog()
        await nextTick()
        await pick()
        await typeSlug('not a slug!')
        expect(submit().disabled).toBe(true)
        expect(document.body.textContent).toContain('Use letters, numbers and hyphens only.')
        await typeSlug('ok-slug')
        expect(submit().disabled).toBe(false)
    })

    it('conflictShowsTheSlugHint', async () => {
        h.importPackage.mockRejectedValue(failWith(409, 'Slug exists'))
        mountDialog()
        await nextTick()
        await pick()
        submit().click()
        await flushPromises()
        expect(document.body.textContent).toContain('A problem with this slug already exists. Set a different slug.')
    })

    it('aBadPackageShowsTheApiMessage', async () => {
        h.importPackage.mockRejectedValue(failWith(400, 'Package has no test cases'))
        mountDialog()
        await nextTick()
        await pick()
        submit().click()
        await flushPromises()
        expect(document.body.textContent).toContain('Package has no test cases')
    })

    it('successEmitsImported', async () => {
        const problem = { id: 'p1', problemSlug: 'two-sum-copy', title: 'Two sum' }
        h.importPackage.mockResolvedValue({ data: { data: problem } })
        const w = mountDialog()
        await nextTick()
        const file = await pick()
        await typeSlug('two-sum-copy')
        submit().click()
        await flushPromises()
        expect(h.importPackage).toHaveBeenCalledWith(file, 'two-sum-copy')
        expect(w.emitted('imported')![0]).toEqual([problem])
        expect(w.emitted('update:open')![0]).toEqual([false])
    })
})
