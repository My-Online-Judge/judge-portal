import { describe, it, expect, vi, beforeEach } from 'vitest'
import testCaseService from '@/services/testCaseService'
import { summaryFixture } from './testCaseFixtures'

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

    it('addImportAndSetSampleResolveToTestCaseSummaryBodies', async () => {
        const row = summaryFixture()
        post.mockResolvedValueOnce({ data: { data: row } }).mockResolvedValueOnce({ data: { data: [row] } })
        patch.mockResolvedValueOnce({ data: { data: row } })

        const added = await testCaseService.addTestCase('sum', new Blob(['1 2']), new Blob(['3']))
        const imported = await testCaseService.importTestCases('sum', new File(['z'], 'a.zip'))
        const toggled = await testCaseService.setSample('sum', row.id, true)

        expect(added.data.data?.inputPreview).toBe('1 2\n')
        expect(imported.data.data?.[0]?.outputSize).toBe(2)
        expect(toggled.data.data?.sample).toBe(true)
        expect(post.mock.calls[1][0]).toBe('/problems/sum/test-cases/import')
    })

    it('getTestCaseHitsTheItemRoute', async () => {
        await testCaseService.getTestCase('sum', 'tc1')
        expect(get).toHaveBeenCalledWith('/problems/sum/test-cases/tc1')
    })
})
