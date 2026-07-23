import { describe, it, expect, vi } from 'vitest'
import { buildProblemFormData } from '@/services/problemService'
import axiosClient from '@/api/axiosClient'
import problemService from '@/services/problemService'
import type { CreateProblemPayload } from '@/types/problem'

vi.mock('@/api/axiosClient', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

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

describe('problemService import/export', () => {
    it('importProblem posts multipart with the file and slugOverride param', async () => {
        vi.mocked(axiosClient.post).mockResolvedValue({ data: {} })
        const file = new File(['pkg'], 'pkg.zip', { type: 'application/zip' })

        await problemService.importProblem(file, 'new-slug')

        const [url, body, config] = vi.mocked(axiosClient.post).mock.calls[0]
        expect(url).toBe('/problems/import')
        expect((body as FormData).get('file')).toBe(file)
        expect(config?.params).toEqual({ slugOverride: 'new-slug' })
    })

    it('importProblem omits params when no slugOverride', async () => {
        vi.mocked(axiosClient.post).mockResolvedValue({ data: {} })
        await problemService.importProblem(new File(['p'], 'p.zip'))
        const [, , config] = vi.mocked(axiosClient.post).mock.calls[1]
        expect(config?.params).toBeUndefined()
    })

    it('exportProblem requests a blob', async () => {
        vi.mocked(axiosClient.get).mockResolvedValue({ data: new Blob() })
        await problemService.exportProblem('a-plus-b')
        const [url, config] = vi.mocked(axiosClient.get).mock.calls[0]
        expect(url).toBe('/problems/a-plus-b/export')
        expect(config?.responseType).toBe('blob')
    })
})
