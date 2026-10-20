// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSidebarCollapse, SIDEBAR_KEY } from '@/composables/useSidebarCollapse'

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('useSidebarCollapse', () => {
    it('sidebarCollapsePersists', () => {
        expect(SIDEBAR_KEY).toBe('admin.sidebar')
        const first = useSidebarCollapse()
        expect(first.collapsed.value).toBe(false)

        first.toggle()
        expect(first.collapsed.value).toBe(true)
        expect(localStorage.getItem('admin.sidebar')).toBe('1')

        // A later visit reads the stored choice.
        const second = useSidebarCollapse()
        expect(second.collapsed.value).toBe(true)

        second.toggle()
        expect(second.collapsed.value).toBe(false)
        expect(localStorage.getItem('admin.sidebar')).toBe('0')
    })

    it('ignoresUnknownStoredValues', () => {
        localStorage.setItem('admin.sidebar', 'yes')
        expect(useSidebarCollapse().collapsed.value).toBe(false)
    })

    it('sidebarCollapseSurvivesStorageError', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })

        let state: ReturnType<typeof useSidebarCollapse> | undefined
        expect(() => {
            state = useSidebarCollapse()
        }).not.toThrow()
        expect(state!.collapsed.value).toBe(false)

        expect(() => state!.toggle()).not.toThrow()
        expect(state!.collapsed.value).toBe(true)
    })
})
