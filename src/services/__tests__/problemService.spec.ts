import { describe, it, expect, vi } from 'vitest'
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
