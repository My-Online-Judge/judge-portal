// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { CanceledError } from 'axios'
import JSZip from 'jszip'

const h = vi.hoisted(() => ({ importPackage: vi.fn(), getProblemBySlug: vi.fn(), ensureFreshSession: vi.fn() }))
vi.mock('@/services/problemService', () => ({
    default: { importPackage: h.importPackage, getProblemBySlug: h.getProblemBySlug },
}))
vi.mock('@/api/refreshSession', () => ({ ensureFreshSession: h.ensureFreshSession }))

import ImportPackageDialog from '../ImportPackageDialog.vue'

let wrapper: VueWrapper | undefined
const mountDialog = () => {
    wrapper = mount(ImportPackageDialog, { attachTo: document.body, props: { open: true } })
    return wrapper
}
const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement
const submit = () => button('Import')
const fileInput = () => document.body.querySelector('input[type="file"]') as HTMLInputElement
const slugInput = () => document.body.querySelector('#import-slug') as HTMLInputElement

async function pickFile(file: File) {
    Object.defineProperty(fileInput(), 'files', { configurable: true, value: [file] })
    fileInput().dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    return file
}
const pick = (name = 'two-sum.zip') => pickFile(new File(['PK'], name, { type: 'application/zip' }))
async function typeSlug(value: string) {
    slugInput().value = value
    slugInput().dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
}
const failWith = (status: number, message: string) =>
    Object.assign(new Error('x'), { isAxiosError: true, response: { status, data: { message } } })
// A timeout or a dropped connection: axios gives no response.
const noResponse = (code = 'ECONNABORTED') => Object.assign(new Error('timeout'), { isAxiosError: true, code })
const problem = { id: 'p1', problemSlug: 'two-sum-copy', title: 'Two sum' }
const SLUG_TAKEN = 'A problem with this slug already exists. Set a different slug.'
// Without an override the dialog reads the slug from the zip first, which takes a few macrotasks.
const waitForText = (text: string) => vi.waitFor(() => expect(document.body.textContent).toContain(text))

async function packageZip(slug: string): Promise<File> {
    const zip = new JSZip()
    zip.file('two-sum/problem.json', JSON.stringify({ schemaVersion: 1, problem: { problemSlug: slug, title: 'Two sum' } }))
    zip.file('two-sum/testcases/1.in', '1 2')
    zip.file('two-sum/testcases/1.out', '3')
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    return new File([bytes as BlobPart], `${slug}.zip`, { type: 'application/zip' })
}

beforeEach(() => {
    h.ensureFreshSession.mockResolvedValue(undefined)
    // By default the slug is free.
    h.getProblemBySlug.mockRejectedValue(failWith(404, 'Not found'))
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.resetAllMocks()
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
        await waitForText(SLUG_TAKEN)
    })

    it('aBadPackageShowsTheApiMessage', async () => {
        h.importPackage.mockRejectedValue(failWith(400, 'Package has no test cases'))
        mountDialog()
        await nextTick()
        await pick()
        submit().click()
        await waitForText('Package has no test cases')
    })

    it('successEmitsImported', async () => {
        h.importPackage.mockResolvedValue({ data: { data: problem } })
        const w = mountDialog()
        await nextTick()
        const file = await pick()
        await typeSlug('two-sum-copy')
        submit().click()
        await flushPromises()
        expect(h.importPackage).toHaveBeenCalledWith(file, 'two-sum-copy', expect.any(AbortSignal))
        expect(w.emitted('imported')![0]).toEqual([problem])
        expect(w.emitted('update:open')![0]).toEqual([false])
    })

    it('showsTheSizeLimitAndRefusesALargerFile', async () => {
        mountDialog()
        await nextTick()
        expect(document.body.textContent).toContain('up to 50 MB')
        const big = new File(['PK'], 'big.zip', { type: 'application/zip' })
        Object.defineProperty(big, 'size', { value: 50 * 1024 * 1024 + 1 })
        await pickFile(big)
        expect(document.body.textContent).toContain('This file is larger than 50 MB.')
        expect(submit().disabled).toBe(true)
        submit().click()
        await flushPromises()
        expect(h.importPackage).not.toHaveBeenCalled()
    })

    it('cancelWhileUploadingAbortsAndCloses', async () => {
        let signal: AbortSignal | undefined
        h.importPackage.mockImplementation(
            (_file: File, _slug: string, s: AbortSignal) =>
                new Promise((_, reject) => {
                    signal = s
                    s.addEventListener('abort', () => reject(new CanceledError()))
                }),
        )
        const w = mountDialog()
        await nextTick()
        await pick()
        submit().click()
        await vi.waitFor(() => expect(h.importPackage).toHaveBeenCalled())
        expect(signal?.aborted).toBe(false)
        expect(button('Cancel').disabled).toBe(false)
        button('Cancel').click()
        await flushPromises()
        expect(signal?.aborted).toBe(true)
        expect(w.emitted('update:open')![0]).toEqual([false])
        expect(document.body.querySelector('[role="alert"]')).toBeNull()
    })

    it('aTakenSlugIsReportedWithoutUploading', async () => {
        h.getProblemBySlug.mockResolvedValue({ data: { data: problem } })
        mountDialog()
        await nextTick()
        await pick()
        await typeSlug('two-sum-copy')
        submit().click()
        await flushPromises()
        expect(h.ensureFreshSession).toHaveBeenCalled()
        expect(h.getProblemBySlug).toHaveBeenCalledWith(expect.any(AbortSignal), 'two-sum-copy')
        expect(h.importPackage).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain(SLUG_TAKEN)
    })

    it('theSlugComesFromThePackageWithoutAnOverride', async () => {
        h.getProblemBySlug.mockResolvedValue({ data: { data: { ...problem, problemSlug: 'two-sum' } } })
        mountDialog()
        await nextTick()
        await pickFile(await packageZip('two-sum'))
        submit().click()
        await waitForText(SLUG_TAKEN)
        expect(h.getProblemBySlug).toHaveBeenCalledWith(expect.any(AbortSignal), 'two-sum')
        expect(h.importPackage).not.toHaveBeenCalled()
    })

    it('aLostResponseAfterTheServerCreatedTheProblemReportsItCreated', async () => {
        h.getProblemBySlug
            .mockRejectedValueOnce(failWith(404, 'Not found'))
            .mockResolvedValueOnce({ data: { data: problem } })
        h.importPackage.mockRejectedValue(noResponse())
        const w = mountDialog()
        await nextTick()
        await pick()
        await typeSlug('two-sum-copy')
        submit().click()
        await flushPromises()
        expect(h.getProblemBySlug).toHaveBeenCalledTimes(2)
        expect(w.emitted('imported')![0]).toEqual([problem])
        expect(w.emitted('update:open')![0]).toEqual([false])
    })

    it('aLostResponseWithNoProblemReportsFailure', async () => {
        h.importPackage.mockRejectedValue(noResponse('ERR_NETWORK'))
        const w = mountDialog()
        await nextTick()
        await pick()
        await typeSlug('two-sum-copy')
        submit().click()
        await flushPromises()
        expect(h.getProblemBySlug).toHaveBeenCalledTimes(2)
        expect(w.emitted('imported')).toBeUndefined()
        expect(document.body.textContent).toContain('Could not import the package. Check your connection and try again.')
    })

    it('aLostResponseWithAnUnknownSlugSaysCheckTheList', async () => {
        h.importPackage.mockRejectedValue(noResponse())
        mountDialog()
        await nextTick()
        // Not a readable zip and no override: the slug is unknown, so nothing can be looked up.
        await pick()
        submit().click()
        await waitForText('The import may have completed. Check the problems list before retrying.')
        expect(h.getProblemBySlug).not.toHaveBeenCalled()
    })
})
