import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_KEY = 'theme'

const QUERY = '(prefers-color-scheme: dark)'

export function readMode(raw: string | null): ThemeMode {
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

export function resolveDark(mode: ThemeMode, prefersDark: boolean): boolean {
    return mode === 'system' ? prefersDark : mode === 'dark'
}

const mode = ref<ThemeMode>('system')
const prefersDark = ref(false)
const isDark = computed(() => resolveDark(mode.value, prefersDark.value))

let initialized = false
let media: MediaQueryList | null = null

const onOsChange = (e: { matches: boolean }) => {
    prefersDark.value = e.matches
    apply()
}

function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
}

function init() {
    initialized = true
    try {
        mode.value = readMode(localStorage.getItem(THEME_KEY))
    } catch {
        mode.value = 'system'
    }
    try {
        media?.removeEventListener('change', onOsChange)
        media = window.matchMedia(QUERY)
        prefersDark.value = media.matches
        media.addEventListener('change', onOsChange)
    } catch {
        media = null
        prefersDark.value = false
    }
    apply()
}

function setMode(next: ThemeMode) {
    if (!initialized) init()
    mode.value = next
    try {
        localStorage.setItem(THEME_KEY, next)
    } catch {
        // storage blocked: the choice still applies for this page view
    }
    apply()
}

export function useTheme(): {
    mode: Readonly<Ref<ThemeMode>>
    isDark: ComputedRef<boolean>
    setMode(m: ThemeMode): void
} {
    if (!initialized) init()
    return { mode: readonly(mode), isDark, setMode }
}

export function __resetThemeForTests() {
    media?.removeEventListener('change', onOsChange)
    media = null
    initialized = false
    mode.value = 'system'
    prefersDark.value = false
}
