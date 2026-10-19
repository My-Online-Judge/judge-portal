import { describe, it, expect, vi, beforeEach } from 'vitest'
import testCaseService from '@/services/testCaseService'

const { get, post, put, patch, del } = vi.hoisted(() => ({
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(),
}))

vi.mock('@/api/axiosClient', () => ({
    default: { get, post, put, patch, delete: del },
}))

beforeEach(() => {
    for (const m of [get, post, put, patch, del]) m.mockReset().mockResolvedValue({ data: {} })
})

describe('testCaseService', () => {
    it('updateSendsMultipartPut', async () => {
        await testCaseService.updateTestCase('sum', 'tc1', new Blob(['1 2']), new Blob(['3']))
        const [url, body, config] = put.mock.calls[0]
        expect(url).toBe('/problems/sum/test-cases/tc1')
        expect(body).toBeInstanceOf(FormData)
        expect([...(body as FormData).keys()]).toEqual(['input', 'output'])
        expect(await ((body as FormData).get('input') as Blob).text()).toBe('1 2')
        expect(await ((body as FormData).get('output') as Blob).text()).toBe('3')
        expect(config.headers['Content-Type']).toBe('multipart/form-data')
    })

    it('setSampleSendsPatch', async () => {
        await testCaseService.setSample('sum', 'tc1', true)
        expect(patch).toHaveBeenCalledWith('/problems/sum/test-cases/tc1', { sample: true })
    })

    it('getTestCaseHitsTheItemRoute', async () => {
        await testCaseService.getTestCase('sum', 'tc1')
        expect(get).toHaveBeenCalledWith('/problems/sum/test-cases/tc1')
    })
})
