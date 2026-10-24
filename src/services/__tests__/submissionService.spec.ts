import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Run (Run code design §5): the server holds the request open for up to 45 s, longer than the client's 10 s default.
describe('run', () => {
    const post = vi.fn()
    const get = vi.fn()
    const load = async () => {
        vi.resetModules()
        vi.doMock('@/api/axiosClient', () => ({ default: { post, get }, API_BASE_URL: '/api/v1' }))
        return (await import('@/services/submissionService')).default
    }

    beforeEach(() => {
        post.mockReset().mockResolvedValue({ data: {} })
    })
    afterEach(() => vi.doUnmock('@/api/axiosClient'))

    it('runPostsTheCasesWithItsOwnTimeout', async () => {
        const svc = await load()
        await svc.run({
            problemSlug: 'a-plus-b',
            languageIdentifier: 'cpp',
            sourceCode: 'int main(){}',
            cases: [{ input: '1 2\n', expectedOutput: '3\n' }],
        })
        const [url, body, config] = post.mock.calls[0] as [string, unknown, { timeout: number }]
        expect(url).toBe('/submissions/run')
        expect(body).toMatchObject({ problemSlug: 'a-plus-b', cases: [{ input: '1 2\n', expectedOutput: '3\n' }] })
        expect(config).toMatchObject({ timeout: 60_000 })
    })
})
