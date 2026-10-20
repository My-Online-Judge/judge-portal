// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SubmissionDetailDialog from '../SubmissionDetailDialog.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'
import { AxiosError, AxiosHeaders } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/services/submissionService', () => ({ default: { getSubmissionById: vi.fn(), rejudge: vi.fn() } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ triggerToast: toast }) }))

const getById = vi.mocked(submissionService.getSubmissionById)
const rejudge = vi.mocked(submissionService.rejudge)
const grant = (permissions: string[]) => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'me', permissions } as never
}
const rejudgeBtn = () => document.body.querySelector('[data-test="rejudge"]') as HTMLButtonElement | null
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

beforeEach(() => {
    getById.mockReset()
    rejudge.mockReset()
    toast.mockReset()
    grant([])
})
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

    it('rejudgeButtonForPermittedUsersOnFinishedSubmissions', async () => {
        getById.mockResolvedValue({ data: { data: sub } } as never)
        mountIt()
        await flushPromises()
        expect(rejudgeBtn()).toBeNull()
        wrapper!.unmount()
        grant(['submission:rejudge'])
        mountIt()
        await flushPromises()
        expect(rejudgeBtn()).not.toBeNull()
        wrapper!.unmount()
        getById.mockResolvedValue({ data: { data: { ...sub, status: 6 } } } as never)
        mountIt()
        await flushPromises()
        expect(rejudgeBtn()).toBeNull()
    })

    it('rejudgeCallsTheServiceAndReloads', async () => {
        grant(['submission:rejudge'])
        getById.mockResolvedValue({ data: { data: sub } } as never)
        rejudge.mockResolvedValue({} as never)
        mountIt()
        await flushPromises()
        rejudgeBtn()!.click()
        await flushPromises()
        expect(rejudge).toHaveBeenCalledWith('abcdef123456')
        expect(toast).toHaveBeenCalledWith('Rejudge queued', 'success')
        expect(getById).toHaveBeenCalledTimes(2)
    })

    it('aConflictOrBusyJudgeToastsTheApiMessage', async () => {
        grant(['submission:rejudge'])
        getById.mockResolvedValue({ data: { data: sub } } as never)
        rejudge.mockRejectedValue(new AxiosError('x', 'ERR', undefined, undefined, { status: 503, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { message: 'The judge is busy, try again in a moment' } }))
        mountIt()
        await flushPromises()
        rejudgeBtn()!.click()
        await flushPromises()
        expect(toast).toHaveBeenCalledWith('The judge is busy, try again in a moment', 'error')
    })
})
