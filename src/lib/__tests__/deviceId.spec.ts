import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDeviceId } from '@/lib/deviceId'

// The vitest environment is 'node' (no DOM), so provide a minimal in-memory
// localStorage. A fresh one per test keeps them isolated.
function mockLocalStorage() {
    const store = new Map<string, string>()
    return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
    }
}

beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage())
})

describe('getDeviceId', () => {
    it('generates a value and persists it to localStorage', () => {
        const id = getDeviceId()
        expect(id).toBeTruthy()
        expect(localStorage.getItem('deviceId')).toBe(id)
    })

    it('returns the same value on subsequent calls', () => {
        const first = getDeviceId()
        const second = getDeviceId()
        expect(second).toBe(first)
    })

    it('returns a pre-seeded value unchanged', () => {
        localStorage.setItem('deviceId', 'seeded-123')
        expect(getDeviceId()).toBe('seeded-123')
    })
})
