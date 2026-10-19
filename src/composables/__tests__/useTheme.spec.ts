// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

type Listener = (e: { matches: boolean }) => void

let osDark = false
let listeners: Listener[] = []

function stubMatchMedia() {
    window.matchMedia = vi.fn().mockImplementation(() => ({
        get matches() {
            return osDark
        },
        addEventListener: (_: string, cb: Listener) => listeners.push(cb),
        removeEventListener: (_: string, cb: Listener) => {
            listeners = listeners.filter((l) => l !== cb)
        },
    })) as unknown as typeof window.matchMedia
}

async function load() {
    const mod = await import('@/composables/useTheme')
    mod.__resetThemeForTests()
    return mod
}

beforeEach(() => {
    osDark = false
    listeners = []
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    stubMatchMedia()
})

describe('useTheme', () => {
    it('readModeFallsBackToSystem', async () => {
        const { readMode } = await load()
        expect(readMode(null)).toBe('system')
        expect(readMode('blue')).toBe('system')
        expect(readMode('dark')).toBe('dark')
        expect(readMode('light')).toBe('light')
    })

    it('resolveDarkTable', async () => {
        const { resolveDark } = await load()
        expect(resolveDark('system', true)).toBe(true)
        expect(resolveDark('system', false)).toBe(false)
        expect(resolveDark('light', true)).toBe(false)
        expect(resolveDark('dark', false)).toBe(true)
    })

    it('setModePersistsAndTogglesClass', async () => {
        const { useTheme } = await load()
        const t = useTheme()
        t.setMode('dark')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(localStorage.getItem('theme')).toBe('dark')
        t.setMode('system')
        expect(document.documentElement.classList.contains('dark')).toBe(false)
        expect(localStorage.getItem('theme')).toBe('system')
        expect(t.mode.value).toBe('system')
    })

    it('systemModeFollowsOsChange', async () => {
        const { useTheme } = await load()
        const t = useTheme()
        t.setMode('system')
        osDark = true
        listeners.forEach((l) => l({ matches: true }))
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(t.isDark.value).toBe(true)
    })

    it('ignoresOsChangeInExplicitMode', async () => {
        const { useTheme } = await load()
        const t = useTheme()
        t.setMode('light')
        osDark = true
        listeners.forEach((l) => l({ matches: true }))
        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
})
