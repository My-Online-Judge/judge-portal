/**
 * Seconds to wait from a `Retry-After` header: a positive integer is used as is, an HTTP-date in
 * the future counts down to that date, anything else gives `fallback`.
 */
export function retryAfterSeconds(header: unknown, fallback = 10, now = Date.now()): number {
    const raw = typeof header === 'number' ? String(header) : header
    if (typeof raw !== 'string') return fallback
    const text = raw.trim()
    if (/^\d+$/.test(text)) {
        const n = Number(text)
        return n > 0 ? n : fallback
    }
    const at = Date.parse(text)
    if (Number.isFinite(at) && at > now) return Math.ceil((at - now) / 1000)
    return fallback
}
