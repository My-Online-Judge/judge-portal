import { afterEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/axiosClient', () => ({ default: { post: h.post, put: h.put, delete: h.delete } }))

import contestService from '@/services/contestService'
import type { ContestPayload } from '@/types/contest'

const body: ContestPayload = {
    title: 'Spring cup', description: '', startsAt: '2026-10-21T02:00:00Z', endsAt: '2026-10-21T04:00:00Z', status: 'DRAFT',
}

afterEach(() => vi.clearAllMocks())

describe('contestService admin calls', () => {
    it('createPostsTheBody', () => {
        contestService.create({ ...body, slug: 'spring-cup', problemSlugs: ['sum'] })
        expect(h.post).toHaveBeenCalledWith('/contests', { ...body, slug: 'spring-cup', problemSlugs: ['sum'] })
    })

    it('updatePutsToTheEncodedSlug', () => {
        contestService.update('spring cup', body)
        expect(h.put).toHaveBeenCalledWith('/contests/spring%20cup', body)
    })

    it('removeDeletesTheEncodedSlug', () => {
        contestService.remove('spring-cup')
        expect(h.delete).toHaveBeenCalledWith('/contests/spring-cup')
    })
})
