// Shared display helpers for problem rows across the admin console
// (dashboard "Recent activity", the Problems page and the problem page).

// Relative "time ago" from an ISO timestamp, degrading to a short date past a week.
export const relativeTime = (iso?: string): string => {
    if (!iso) return '-'
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return '-'
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
