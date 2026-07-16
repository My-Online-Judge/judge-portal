import { getLevelInfo } from '@/types/problem'

// Shared display helpers for problem rows across the admin console
// (dashboard "Recent problems" + the Problems management page). Keeping
// them in one place makes the two tables read like one system.

// Short mono ID from the real UUID: "#" + first 6 hex chars.
export const shortId = (id: string): string =>
    `#${(id ?? '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '------'}`

// Difficulty: reuse the existing hardnessLevel↔label mapping (1→easy, 2→medium, 3→hard).
export const difficultyLabel = (level: number): string => getLevelInfo(level).text.toLowerCase()

// Status: active (1) → ok/emerald; otherwise → warn/amber.
export const statusLabel = (status: number): string => (status === 1 ? 'Active' : 'Inactive')
export const statusDotClass = (status: number): string => (status === 1 ? 'bg-ok' : 'bg-warn')

// Relative "time ago" from an ISO timestamp, degrading to a short date past a week.
export const relativeTime = (iso?: string): string => {
    if (!iso) return '—'
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return '—'
    const seconds = Math.max(Math.round((Date.now() - then) / 1000), 0)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days}d`
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
