import { isAxiosError } from 'axios'

// Seconds to wait before submitting again after the API pushed back (429 too fast, 503 judge busy,
// which carry Retry-After; the API is same-origin so the browser can read it), else null.
export function retryAfterSeconds(err: unknown, fallback: number): number | null {
    if (!isAxiosError(err)) return null
    const status = err.response?.status
    if (status !== 429 && status !== 503) return null
    const ra = Number(err.response?.headers?.['retry-after'])
    return Number.isFinite(ra) && ra > 0 ? ra : fallback
}
