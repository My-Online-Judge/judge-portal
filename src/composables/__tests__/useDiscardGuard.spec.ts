// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

type Guard = (to: unknown) => unknown
let guard: Guard
const push = vi.fn(() => Promise.resolve())

vi.mock('vue-router', () => ({
    onBeforeRouteLeave: (g: Guard) => {
        guard = g
    },
    useRouter: () => ({ push }),
}))

import { useDiscardGuard } from '@/composables/useDiscardGuard'

const mounted: Array<{ unmount: () => void }> = []

function setup(dirty: { value: boolean }) {
    let api!: ReturnType<typeof useDiscardGuard>
    const wrapper = mount(
        defineComponent({
            setup() {
                api = useDiscardGuard(() => dirty.value)
                return () => h('div')
            },
        }),
    )
    mounted.push(wrapper)
    return { api, wrapper }
}

const to = { fullPath: '/admin/problems' }

beforeEach(() => push.mockClear())
afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
})

describe('useDiscardGuard', () => {
    it('cleanFormLeavesFreely', () => {
        const { api } = setup({ value: false })
        expect(guard(to)).toBe(true)
        expect(api.confirmOpen.value).toBe(false)
    })

    it('dirtyFormBlocksAndOpensDialog', () => {
        const { api } = setup({ value: true })
        expect(guard(to)).toBe(false)
        expect(api.confirmOpen.value).toBe(true)
        api.cancelLeave()
        expect(api.confirmOpen.value).toBe(false)
        expect(push).not.toHaveBeenCalled()
    })

    it('confirmLeaveNavigatesToPending', async () => {
        const { api } = setup({ value: true })
        guard(to)
        api.confirmLeave()
        expect(api.confirmOpen.value).toBe(false)
        expect(push).toHaveBeenCalledWith('/admin/problems')
        // the re-navigation passes through the guard once
        expect(guard(to)).toBe(true)
        await Promise.resolve()
        await Promise.resolve()
        expect(guard(to)).toBe(false)
    })

    it('beforeUnloadSetOnlyWhenDirty', () => {
        const dirty = { value: false }
        const { wrapper } = setup(dirty)
        const clean = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(clean)
        expect(clean.defaultPrevented).toBe(false)
        dirty.value = true
        const d = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(d)
        expect(d.defaultPrevented).toBe(true)
        wrapper.unmount()
        const after = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(after)
        expect(after.defaultPrevented).toBe(false)
    })
})
