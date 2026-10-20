import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildProblemFormData } from '@/services/problemService'
import type { CreateProblemPayload } from '@/types/problem'

const dto: CreateProblemPayload = {
    title: 'T', subject: 'S', timeLimit: 1000, memoryLimit: 256, hardnessLevel: 1,
    problemSlug: 'demo-slug', inputDescription: 'i', outputDescription: 'o',
    sampleInput: '1 2', sampleOutput: '3',
}

describe('buildProblemFormData', () => {
    it('puts the dto JSON under "data" and the file under "file"', async () => {
        const file = new File(['tc'], 'cases.zip', { type: 'application/zip' })
        const fd = buildProblemFormData(dto, file)
        const data = fd.get('data') as Blob
        expect(data).toBeInstanceOf(Blob)
        expect(JSON.parse(await data.text())).toMatchObject({ title: 'T', problemSlug: 'demo-slug' })
        expect((fd.get('file') as File).name).toBe('cases.zip')
    })
})

describe('deleteKeepalive', () => {
    it('deleteKeepaliveUsesFetchKeepalive', async () => {
        const { default: problemService } = await import('@/services/problemService')
        const { API_ROUTES } = await import('@/constants/apiPath')
        const { API_BASE_URL } = await import('@/api/axiosClient')
        const fetchMock = vi.fn(() => Promise.resolve(new Response(null)))
        vi.stubGlobal('fetch', fetchMock)
        try {
            problemService.deleteKeepalive('demo-slug')
            expect(fetchMock).toHaveBeenCalledWith(API_BASE_URL + API_ROUTES.PROBLEMS.DETAIL('demo-slug'), {
                method: 'DELETE',
                credentials: 'include',
                keepalive: true,
            })
        } finally {
            vi.unstubAllGlobals()
        }
    })
})

describe('package import and export', () => {
    const post = vi.fn()
    const get = vi.fn()
    const load = async () => {
        vi.resetModules()
        vi.doMock('@/api/axiosClient', () => ({ default: { post, get }, API_BASE_URL: '/api/v1' }))
        return (await import('@/services/problemService')).default
    }
    const zip = () => new File(['PK'], 'two-sum.zip', { type: 'application/zip' })

    beforeEach(() => {
        post.mockReset().mockResolvedValue({ data: {} })
        get.mockReset().mockResolvedValue({ data: new Blob(['PK']) })
    })
    afterEach(() => vi.doUnmock('@/api/axiosClient'))

    it('importSendsFileAndOverride', async () => {
        const svc = await load()
        const file = zip()
        await svc.importPackage(file, 'copy-1')
        const [url, body] = post.mock.calls[0] as [string, FormData, object]
        expect(url).toBe('/problems/import')
        expect(body.get('file')).toBe(file)
        expect(body.get('slugOverride')).toBe('copy-1')
    })

    it('importPassesTheAbortSignal', async () => {
        const svc = await load()
        const controller = new AbortController()
        await svc.importPackage(zip(), undefined, controller.signal)
        expect(post.mock.calls[0]![2]).toMatchObject({ signal: controller.signal })
    })

    it('importOmitsABlankOverride', async () => {
        const svc = await load()
        await svc.importPackage(zip(), '  ')
        await svc.importPackage(zip())
        for (const call of post.mock.calls) expect((call[1] as FormData).has('slugOverride')).toBe(false)
    })

    it('exportIsADirectLinkToTheApi', async () => {
        const svc = await load()
        expect(svc.exportUrl('two-sum')).toBe('/api/v1/problems/two-sum/export')
        expect(get).not.toHaveBeenCalled()
    })

    it('uploadsUseTheLongTimeout', async () => {
        const svc = await load()
        await svc.importPackage(zip())
        expect(post.mock.calls[0]![2]).toMatchObject({ timeout: 120_000 })
    })
})
