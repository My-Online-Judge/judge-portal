import { afterEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/api/axiosClient', () => ({ default: { get: h.get, post: h.post, put: h.put, delete: h.delete } }))

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

    it('listAllGetsThePagedAdminEndpoint', () => {
        const signal = new AbortController().signal
        contestService.listAll(signal, { page: 2, size: 20, q: 'cup' })
        expect(h.get).toHaveBeenCalledWith('/contests/all', { signal, params: { page: 2, size: 20, q: 'cup' } })
    })
})

// Registration (contest enrollment design §4.3).
describe('contestService registration calls', () => {
    it('enrollPostsTheSlug', () => {
        contestService.enroll('spring cup')
        expect(h.post).toHaveBeenCalledWith('/contests/spring%20cup/enroll')
    })
    it('withdrawDeletes', () => {
        contestService.withdraw('spring-cup')
        expect(h.delete).toHaveBeenCalledWith('/contests/spring-cup/enroll')
    })
    it('participantsPassParams', () => {
        const signal = new AbortController().signal
        contestService.participants(signal, 'spring-cup', { page: 1, size: 100, q: 'ali' })
        expect(h.get).toHaveBeenCalledWith('/contests/spring-cup/enrollments', { signal, params: { page: 1, size: 100, q: 'ali' } })
    })
    it('removeParticipantDeletesTheUser', () => {
        contestService.removeParticipant('spring-cup', 'u-1')
        expect(h.delete).toHaveBeenCalledWith('/contests/spring-cup/enrollments/u-1')
    })
})
