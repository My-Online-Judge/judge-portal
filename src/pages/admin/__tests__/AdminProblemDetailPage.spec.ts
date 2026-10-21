// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    getProblemBySlug: vi.fn(),
    ensureFreshSession: vi.fn(),
    calls: [] as string[],
}))

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { slug: 'tong-tu-1-den-n' }, query: {} }),
    useRouter: () => ({ push: vi.fn() }),
    onBeforeRouteLeave: vi.fn(),
    RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('@/services/problemService', () => ({ default: { getProblemBySlug: h.getProblemBySlug } }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/refreshSession')>()),
    ensureFreshSession: h.ensureFreshSession,
}))
// The editors and cards are not under test, and their imports reach Tiptap and Monaco.
vi.mock('@/components/admin/problem/ProblemFormFields.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/admin/problem/CheckerCard.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/admin/problem/TestCaseManager.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/admin/editor/RichTextEditor.vue', () => ({ default: { template: '<div />' } }))

import ProblemDetailPage from '@/pages/admin/problem/ProblemDetailPage.vue'
import { useAuthStore } from '@/stores/auth'

let wrapper: VueWrapper | undefined

beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'admin', permissions: ['problem:read', 'problem:update'] } as never
    h.calls.length = 0
    h.getProblemBySlug.mockImplementation(async () => {
        h.calls.push('problem')
        return { data: { data: { problemSlug: 'tong-tu-1-den-n', title: 'TỔNG TỪ 1 ĐẾN N', status: 0, hardnessLevel: 1, tags: [] } } }
    })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.clearAllMocks()
})

describe('admin ProblemDetailPage', () => {
    it('aDraftIsReadOnlyOnceTheSessionIsFresh', async () => {
        // The access cookie lapsed after 15 idle minutes: an anonymous read of a draft (INACTIVE) problem is a 404.
        let fresh!: () => void
        h.ensureFreshSession.mockImplementation(
            () =>
                new Promise<void>((r) => {
                    fresh = () => {
                        h.calls.push('fresh')
                        r()
                    }
                }),
        )
        wrapper = shallowMount(ProblemDetailPage)
        await flushPromises()
        expect(h.getProblemBySlug).not.toHaveBeenCalled()

        fresh()
        await flushPromises()
        expect(h.calls).toEqual(['fresh', 'problem'])
        expect(h.getProblemBySlug).toHaveBeenCalledWith(expect.any(AbortSignal), 'tong-tu-1-den-n')
    })
})
