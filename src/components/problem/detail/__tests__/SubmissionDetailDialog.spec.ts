// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SubmissionDetailDialog from '../SubmissionDetailDialog.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'

vi.mock('@/services/submissionService', () => ({ default: { getSubmissionById: vi.fn() } }))

const getById = vi.mocked(submissionService.getSubmissionById)
const sub = {
    id: 'abcdef123456', status: 0, result: 0, errorMessage: '', cpuTime: 12, memory: 2097152,
    language: { name: 'C++' },
    details: [{ name: '1', result: 0, cpuTime: 5, realTime: 5, memory: 1024, sample: false }],
} as unknown as Submission

let wrapper: VueWrapper | undefined
const mountIt = (props: Record<string, unknown> = {}) => {
    wrapper = mount(SubmissionDetailDialog, { attachTo: document.body, props: { open: true, submissionId: 'abcdef123456', ...props } })
    return wrapper
}

beforeEach(() => getById.mockReset())
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('SubmissionDetailDialog', () => {
    it('fetchesOnOpenAndShowsTiles', async () => {
        getById.mockResolvedValue({ data: { data: sub } } as never)
        mountIt()
        await flushPromises()
        expect(getById).toHaveBeenCalledWith('abcdef123456')
        expect(document.body.querySelector('[data-test="tile-1"]')).not.toBeNull()
        expect(document.body.textContent).toContain('C++')
        expect(document.body.textContent).toContain('12 ms')
        expect(document.body.textContent).toContain('2.0 MB')
    })

    it('errorShowsRetry', async () => {
        getById.mockRejectedValueOnce(new Error('boom'))
        mountIt()
        await flushPromises()
        expect(document.body.querySelector('[data-test^="tile-"]')).toBeNull()
        getById.mockResolvedValueOnce({ data: { data: sub } } as never)
        const retry = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Retry')
        expect(retry).toBeTruthy()
        retry!.click()
        await flushPromises()
        expect(getById).toHaveBeenCalledTimes(2)
        expect(document.body.querySelector('[data-test="tile-1"]')).not.toBeNull()
    })
})
