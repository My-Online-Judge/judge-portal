import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCooldown } from '@/composables/useCooldown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCooldown', () => {
    it('starts inactive', () => {
        const cd = useCooldown()
        expect(cd.active.value).toBe(false)
        expect(cd.remaining.value).toBe(0)
    })

    it('counts down once per second and deactivates at zero', () => {
        const cd = useCooldown()
        cd.start(3)
        expect(cd.active.value).toBe(true)
        expect(cd.remaining.value).toBe(3)
        vi.advanceTimersByTime(1000)
        expect(cd.remaining.value).toBe(2)
        vi.advanceTimersByTime(2000)
        expect(cd.remaining.value).toBe(0)
        expect(cd.active.value).toBe(false)
    })

    it('restart replaces the previous countdown', () => {
        const cd = useCooldown()
        cd.start(30)
        cd.start(5)
        vi.advanceTimersByTime(5000)
        expect(cd.remaining.value).toBe(0)
        expect(cd.active.value).toBe(false)
    })

    it('non-positive input is a no-op', () => {
        const cd = useCooldown()
        cd.start(0)
        expect(cd.active.value).toBe(false)
    })
})
